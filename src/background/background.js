// Classroom Suite - Background Service Worker (Manifest V3)
// 100% Client-Side - Zero Servers, Zero API Keys

const DEFAULT_SETTINGS = {
  downloadMode: 'zip',
  docsExportFormat: 'pdf',
  slidesExportFormat: 'pdf',
  sheetsExportFormat: 'xlsx'
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['settings', 'stats']);
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!existing.stats) {
    await chrome.storage.local.set({
      stats: {
        totalFilesDownloaded: 0,
        totalBytesDownloaded: 0,
        totalZipsCreated: 0,
        lastActive: Date.now()
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_FILE') {
    handleDirectDownload(message.payload)
      .then(res => sendResponse({ success: true, res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'FETCH_ATTACHMENT_BASE64') {
    fetchAttachmentBase64(message.payload.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'UPDATE_STATS') {
    updateStats(message.payload).then(() => sendResponse({ success: true }));
    return true;
  }
});

// Downloads file directly using Chrome Downloads API
async function handleDirectDownload({ url, filename, course, assignment }) {
  const cleanCourse = sanitize(course || 'Classroom');
  const cleanAssignment = sanitize(assignment || 'Materials');
  const cleanFile = sanitize(filename || 'File');
  const path = 'Classroom/' + cleanCourse + '/' + cleanAssignment + '/' + cleanFile;

  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: path,
      conflictAction: 'uniquify',
      saveAs: false
    }, (id) => {
      if (chrome.runtime.lastError) {
        // Fallback: download directly with just the clean file name
        chrome.downloads.download({
          url: url,
          filename: cleanFile,
          conflictAction: 'uniquify',
          saveAs: false
        }, (fallbackId) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          resolve(fallbackId);
        });
      } else {
        resolve(id);
      }
    });
  });
}

// Background Worker fetches using Chrome elevated permissions & session cookies
async function fetchAttachmentBase64(url) {
  let targetUrl = url;
  // Automatically append confirmation bypass for Google Drive files
  if (targetUrl.includes('drive.google.com/uc?') && !targetUrl.includes('confirm=')) {
    targetUrl += '&confirm=t';
  }

  let res = await fetch(targetUrl, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to fetch file: ' + res.status + ' ' + res.statusText);
  }

  let contentType = (res.headers.get('content-type') || '').toLowerCase();

  // If Google Drive returns HTML warning page for large files, parse confirm URL or form
  if (contentType.includes('text/html') && targetUrl.includes('drive.google.com')) {
    const htmlText = await res.text();
    // 1. Look for confirm link or token
    const confirmMatch = htmlText.match(/href="(\/uc\?export=download[^"]+)"/i) ||
                         htmlText.match(/href="([^"]+confirm=[^"]+)"/i);
    const actionMatch = htmlText.match(/action="([^"]+)"/i);

    if (confirmMatch) {
      let confirmUrl = confirmMatch[1].replace(/&amp;/g, '&');
      if (confirmUrl.startsWith('/')) confirmUrl = 'https://drive.google.com' + confirmUrl;
      res = await fetch(confirmUrl, { credentials: 'include' });
    } else if (actionMatch) {
      let formUrl = actionMatch[1].replace(/&amp;/g, '&');
      if (formUrl.startsWith('/')) formUrl = 'https://drive.google.com' + formUrl;

      // Extract hidden inputs from Drive warning form
      const formParams = new URLSearchParams();
      const inputRegex = /<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"/gi;
      let match;
      while ((match = inputRegex.exec(htmlText)) !== null) {
        formParams.append(match[1], match[2]);
      }
      if (!formParams.has('confirm')) formParams.append('confirm', 't');

      const fullUrl = formUrl + (formUrl.includes('?') ? '&' : '?') + formParams.toString();
      res = await fetch(fullUrl, { credentials: 'include' });
    } else {
      throw new Error('Google Drive file requires manual confirmation. Please use Direct Download.');
    }

    contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      throw new Error('Google Drive returned HTML warning page instead of file stream.');
    }
  }

  const buffer = await res.arrayBuffer();
  // Prevent Chrome IPC message size limit crash (>40MB)
  if (buffer.byteLength > 40 * 1024 * 1024) {
    throw new Error('File exceeds in-memory ZIP transfer limit (' + Math.round(buffer.byteLength / 1048576) + 'MB). Direct download is recommended.');
  }

  const bytes = new Uint8Array(buffer);
  const base64 = bufferToBase64(bytes);
  return { base64, size: bytes.byteLength };
}

// Fast chunked base64 encoding (100x faster than single-char concatenation)
function bufferToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
  }
  return btoa(binary);
}

function sanitize(str) {
  if (!str) return 'Untitled';
  // Strip invalid characters and trailing dots/underscores/spaces for Windows compatibility
  return str.replace(/[\\/:*?"<>|]/g, '_').replace(/[._ ]+$/, '').trim() || 'Untitled';
}

async function updateStats({ filesAdded = 0, bytesAdded = 0, zipsAdded = 0 }) {
  const { stats } = await chrome.storage.local.get(['stats']);
  const current = stats || {
    totalFilesDownloaded: 0,
    totalBytesDownloaded: 0,
    totalZipsCreated: 0,
    lastActive: Date.now()
  };
  current.totalFilesDownloaded += filesAdded;
  current.totalBytesDownloaded += bytesAdded;
  current.totalZipsCreated += zipsAdded;
  current.lastActive = Date.now();
  await chrome.storage.local.set({ stats: current });
}
