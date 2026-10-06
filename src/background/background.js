// Classroom Suite - Background Service Worker (Manifest V3)
// 100% Client-Side - Zero Servers, Zero API Keys

const DEFAULT_SETTINGS = {
  downloadMode: 'zip', // 'zip' | 'folder' | 'direct'
  folderStructure: '{course}/{topic}/{assignment}/{filename}',
  docsExportFormat: 'pdf', // 'pdf' | 'docx'
  slidesExportFormat: 'pdf', // 'pdf' | 'pptx'
  sheetsExportFormat: 'xlsx', // 'xlsx' | 'pdf'
  notifyOnComplete: true,
  autoSkipDuplicates: true
};

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['settings', 'stats', 'downloadHistory']);
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
  if (!existing.downloadHistory) {
    await chrome.storage.local.set({ downloadHistory: {} });
  }
  console.log('Classroom Suite initialized successfully.');
});

// Listen for messages from Content Script and Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_FILE') {
    handleDirectDownload(message.payload)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'DOWNLOAD_ZIP_BLOB') {
    handleZipDownload(message.payload)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'FETCH_ATTACHMENT_BUFFER') {
    fetchAttachmentBuffer(message.payload.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_APP_STATE') {
    chrome.storage.local.get(['settings', 'stats', 'downloadHistory']).then(data => {
      sendResponse({ success: true, data });
    });
    return true;
  }

  if (message.type === 'UPDATE_STATS') {
    updateStats(message.payload).then(() => sendResponse({ success: true }));
    return true;
  }
});

// Download a single file or array of files via chrome.downloads API
async function handleDirectDownload({ url, filename, course, topic, assignment }) {
  const { settings } = await chrome.storage.local.get(['settings']);
  const config = { ...DEFAULT_SETTINGS, ...settings };

  let finalFilename = filename;
  if (config.downloadMode === 'folder') {
    const cleanCourse = sanitizePath(course || 'General');
    const cleanTopic = sanitizePath(topic || 'Uncategorized');
    const cleanAssignment = sanitizePath(assignment || 'Materials');
    const cleanFile = sanitizePath(filename);
    finalFilename = `Classroom/${cleanCourse}/${cleanTopic}/${cleanAssignment}/${cleanFile}`;
  }

  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: finalFilename,
      conflictAction: 'uniquify',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve({ downloadId, filename: finalFilename });
    });
  });
}

// Download a bundled ZIP via Data URL or Blob URL
async function handleZipDownload({ dataUrl, filename, byteLength, fileCount }) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: dataUrl,
      filename: sanitizePath(filename || 'Classroom_Materials.zip'),
      conflictAction: 'uniquify',
      saveAs: false
    }, async (downloadId) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      // Update stats
      await updateStats({
        filesAdded: fileCount || 1,
        bytesAdded: byteLength || 0,
        zipsAdded: 1
      });
      resolve({ downloadId, filename });
    });
  });
}

// Fetch binary buffer from Google Classroom / Drive using active session cookies
async function fetchAttachmentBuffer(url) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include' // Uses browser's logged-in Google session
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch attachment (${response.status} ${response.statusText})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  // Convert arrayBuffer to base64 for message passing
  const base64 = bufferToBase64(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  return { base64, contentType, byteLength: arrayBuffer.byteLength };
}

// Helper to convert ArrayBuffer to Base64 safely
function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Sanitize filename to avoid invalid OS characters
function sanitizePath(str) {
  if (!str) return 'Untitled';
  return str.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// Increment local stats in chrome.storage.local
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
