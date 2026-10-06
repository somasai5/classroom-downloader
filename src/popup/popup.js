// Classroom Suite - Popup Controller
// 100% Client-Side State Management

document.addEventListener('DOMContentLoaded', async () => {
  const statFilesEl = document.getElementById('stat-files');
  const statZipsEl = document.getElementById('stat-zips');
  const statSizeEl = document.getElementById('stat-size');

  const downloadModeSelect = document.getElementById('download-mode');
  const slidesFormatSelect = document.getElementById('slides-format');
  const docsFormatSelect = document.getElementById('docs-format');

  const btnOpenClassroom = document.getElementById('btn-open-classroom');
  const btnResetStats = document.getElementById('btn-reset-stats');

  // Load Saved Stats & Settings
  const { stats, settings } = await chrome.storage.local.get(['stats', 'settings']);

  if (stats) {
    statFilesEl.textContent = stats.totalFilesDownloaded || 0;
    statZipsEl.textContent = stats.totalZipsCreated || 0;
    const mb = ((stats.totalBytesDownloaded || 0) / (1024 * 1024)).toFixed(1);
    statSizeEl.textContent = `${mb} MB`;
  }

  if (settings) {
    if (settings.downloadMode) downloadModeSelect.value = settings.downloadMode;
    if (settings.slidesExportFormat) slidesFormatSelect.value = settings.slidesExportFormat;
    if (settings.docsExportFormat) docsFormatSelect.value = settings.docsExportFormat;
  }

  // Save Settings Changes Instantly
  const saveSettings = async () => {
    const updated = {
      downloadMode: downloadModeSelect.value,
      slidesExportFormat: slidesFormatSelect.value,
      docsExportFormat: docsFormatSelect.value
    };
    const current = await chrome.storage.local.get(['settings']);
    await chrome.storage.local.set({ settings: { ...current.settings, ...updated } });
  };

  downloadModeSelect.onchange = saveSettings;
  slidesFormatSelect.onchange = saveSettings;
  docsFormatSelect.onchange = saveSettings;

  // Open Classroom Tab
  btnOpenClassroom.onclick = () => {
    chrome.tabs.create({ url: 'https://classroom.google.com' });
  };

  // Reset Stats
  btnResetStats.onclick = async () => {
    if (confirm('Reset local download statistics?')) {
      const emptyStats = {
        totalFilesDownloaded: 0,
        totalBytesDownloaded: 0,
        totalZipsCreated: 0,
        lastActive: Date.now()
      };
      await chrome.storage.local.set({ stats: emptyStats });
      statFilesEl.textContent = '0';
      statZipsEl.textContent = '0';
      statSizeEl.textContent = '0 MB';
    }
  };
});
