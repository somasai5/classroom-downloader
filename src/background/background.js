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

// Notify tabs when URL changes via SPA back/forward navigation in Google Classroom
if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes('classroom.google.com')) {
      chrome.tabs.sendMessage(tabId, { type: 'PAGE_NAVIGATED', url: changeInfo.url }).catch(() => {});
    }
  });
}

// Downloads file directly using Chrome Downloads API with elevated cookie authentication
async function handleDirectDownload({ url, filename, course, assignment }) {
  const cleanCourse = sanitize(course || 'Classroom');
  const cleanAssignment = sanitize(assignment || 'Materials');
  const cleanFile = sanitize(filename || 'File');
  const relativePath = 'Classroom/' + cleanCourse + '/' + cleanAssignment + '/' + cleanFile;

  // 1. If already a data URI, download directly
  if (url && url.startsWith('data:')) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url,
        filename: cleanFile,
        conflictAction: 'uniquify',
        saveAs: false
      }, (id) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(id);
      });
    });
  }

  // 2. For Google Drive and Docs URLs: Fetch binary bytes first via authenticated background session cookies
  // This completely eliminates Chrome download manager's 403 Forbidden error!
  const isGoogleResource = url && (url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('googleusercontent.com'));
  if (isGoogleResource) {
    try {
      const fileData = await fetchAttachmentBase64(url);
      const mime = fileData.mime || 'application/octet-stream';
      const dataUri = `data:${mime};base64,${fileData.base64}`;
      const downloadFilename = sanitize(fileData.serverFilename || cleanFile);

      return new Promise((resolve, reject) => {
        // Try organized path first
        chrome.downloads.download({
          url: dataUri,
          filename: downloadFilename,
          conflictAction: 'uniquify',
          saveAs: false
        }, (id) => {
          if (!chrome.runtime.lastError && id) {
            return resolve(id);
          }
          // Fallback to Downloads root if path has issue
          chrome.downloads.download({
            url: dataUri,
            filename: downloadFilename,
            conflictAction: 'uniquify',
            saveAs: false
          }, (fallbackId) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            resolve(fallbackId);
          });
        });
      });
    } catch (fetchErr) {
      console.warn('Background authenticated fetch failed, attempting direct download fallback:', fetchErr);
    }
  }

  // 3. Fallback for non-Google or when memory transfer isn't needed
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: cleanFile,
      conflictAction: 'uniquify',
      saveAs: false
    }, (id) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(id);
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

  async function tryFetch(fetchUrl) {
    try {
      let res = await fetch(fetchUrl, { credentials: 'include' });
      if (!res.ok) {
        return { ok: false, status: res.status };
      }

      let contentType = (res.headers.get('content-type') || '').toLowerCase();

      // If Google Drive returns HTML warning page for large files, parse confirm URL or form
      if (contentType.includes('text/html') && fetchUrl.includes('drive.google.com')) {
        const htmlText = await res.text();
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
          return { ok: false, status: 403 };
        }

        contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('text/html')) {
          return { ok: false, status: 403 };
        }
      }

      return { ok: true, res, contentType };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  // 1. Initial attempt
  let fetchResult = await tryFetch(targetUrl);

  // 2. Multi-Account Auth Fallback: If 403 Forbidden or 401 on Google Drive, try all account sessions
  if (!fetchResult.ok && targetUrl.includes('drive.google.com')) {
    const idMatch = targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || targetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      const fileId = idMatch[1];
      const candidates = [
        `https://drive.google.com/u/1/uc?export=download&id=${fileId}&confirm=t`,
        `https://drive.google.com/u/0/uc?export=download&id=${fileId}&confirm=t`,
        `https://drive.google.com/u/2/uc?export=download&id=${fileId}&confirm=t`,
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&authuser=1`,
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&authuser=0`,
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&authuser=1`,
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&authuser=0`,
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
      ];

      for (const candidate of candidates) {
        if (candidate === targetUrl) continue;
        const candidateResult = await tryFetch(candidate);
        if (candidateResult.ok) {
          fetchResult = candidateResult;
          break;
        }
      }
    }
  }

  // 3. Multi-Account Auth Fallback for Google Docs / Slides
  if (!fetchResult.ok && targetUrl.includes('docs.google.com')) {
    const docIdMatch = targetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (docIdMatch) {
      const docId = docIdMatch[1];
      const isPres = targetUrl.includes('/presentation/');
      const isSpreadsheet = targetUrl.includes('/spreadsheets/');
      const docType = isPres ? 'presentation' : (isSpreadsheet ? 'spreadsheets' : 'document');
      const exportPath = isPres ? '/export/pdf' : (isSpreadsheet ? '/export?format=xlsx' : '/export?format=pdf');

      const docCandidates = [
        `https://docs.google.com/${docType}/u/1/d/${docId}${exportPath}`,
        `https://docs.google.com/${docType}/u/0/d/${docId}${exportPath}`,
        `https://docs.google.com/${docType}/u/2/d/${docId}${exportPath}`,
        `https://docs.google.com/${docType}/d/${docId}${exportPath}`
      ];

      for (const candidate of docCandidates) {
        if (candidate === targetUrl) continue;
        const candidateResult = await tryFetch(candidate);
        if (candidateResult.ok) {
          fetchResult = candidateResult;
          break;
        }
      }
    }
  }

  if (!fetchResult.ok || !fetchResult.res) {
    throw new Error('Failed to fetch file: ' + (fetchResult.status || 'Network Error'));
  }

  const res = fetchResult.res;
  const contentDisposition = (res.headers && typeof res.headers.get === 'function' ? res.headers.get('content-disposition') : '') || '';
  const serverFilename = parseContentDispositionFilename(contentDisposition);
  const buffer = await res.arrayBuffer();
  // Prevent Chrome IPC message size limit crash (>40MB)
  if (buffer.byteLength > 40 * 1024 * 1024) {
    throw new Error('File exceeds in-memory transfer limit (' + Math.round(buffer.byteLength / 1048576) + 'MB). Direct download is recommended.');
  }

  const bytes = new Uint8Array(buffer);
  const base64 = bufferToBase64(bytes);
  const mime = fetchResult.contentType || 'application/pdf';
  return { base64, size: bytes.byteLength, mime, serverFilename };
}

// Parse authentic filename sent by Google Drive server in Content-Disposition header
function parseContentDispositionFilename(header) {
  if (!header) return null;
  // RFC 5987 / RFC 6266: filename*=UTF-8''filename.ext
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
    } catch (e) {}
  }
  // Standard filename="..."
  const match = header.match(/filename="?([^";]+)"?/i);
  if (match) {
    return match[1].trim();
  }
  return null;
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
  let s = str.replace(/[\\/:*?"<>|\r\n\t]/g, '_');
  // Strip trailing dots, spaces, and ellipsis right before the file extension (e.g. "file ... .pdf" -> "file.pdf")
  s = s.replace(/(\.{2,}|…|[._\s])+(\.[a-zA-Z0-9]{2,5})$/, '$2');
  // Strip trailing dots, underscores, spaces at end of string
  s = s.replace(/(\.{2,}|…)+/g, '_').replace(/[._ ]+$/, '').trim();
  return s || 'Untitled';
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
