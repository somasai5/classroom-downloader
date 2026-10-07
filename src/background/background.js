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
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resolve(id);
    });
  });
}

// Background Worker fetches using Chrome elevated permissions & session cookies
async function fetchAttachmentBase64(url) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to fetch file: ' + res.status + ' ' + res.statusText);
  }
  const buffer = await res.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return { base64, size: bytes.byteLength };
}

function sanitize(str) {
  if (!str) return 'Untitled';
  return str.replace(/[\\/:*?"<>|]/g, '_').trim();
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
