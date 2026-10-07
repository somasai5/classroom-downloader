// Classroom Suite - Content Script
// 100% Client-Side Engine for Google Classroom

(function () {
  'use strict';

  console.log('Classroom Suite active.');

  let courseTitle = 'Google_Classroom';
  const processedContainers = new WeakSet();

  function init() {
    extractCourseTitle();
    scanAndInject();
    injectMasterBar();

    const observer = new MutationObserver(() => {
      extractCourseTitle();
      scanAndInject();
      injectMasterBar();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function extractCourseTitle() {
    const titleEl = document.querySelector('h1') || 
                    document.querySelector('[data-course-id] h1') ||
                    document.querySelector('.YVvGBb') ||
                    document.querySelector('.wFjd2c') ||
                    document.querySelector('.A65qq');
    if (titleEl && titleEl.innerText.trim()) {
      courseTitle = titleEl.innerText.trim();
    }
  }

  function injectMasterBar() {
    if (window.ClassroomUI) {
      window.ClassroomUI.renderMasterFloatingBar(
        handleDownloadAllPageMaterials,
        handleSelectAllPageMaterials
      );
    }
  }

  function scanAndInject() {
    // Scan all possible Classroom card containers and mock sandbox posts
    const postSelectors = [
      '[data-stream-item-id]',
      '[jscontroller="A2Lzbe"]',
      '.VBEdtc-Wvd9cc',
      '.ySjX5d',
      '.onkcGd',
      '.g-classroom-post',
      '[role="listitem"]',
      '.asQXV',
      '.j70DUc'
    ];

    const elements = document.querySelectorAll(postSelectors.join(','));

    elements.forEach((postEl) => {
      if (processedContainers.has(postEl)) return;

      const postData = parsePostData(postEl);
      if (postData && postData.attachments.length > 0) {
        processedContainers.add(postEl);
        injectActionBar(postEl, postData);
      }
    });
  }

  function parsePostData(el) {
    const titleEl = el.querySelector('h2') || 
                    el.querySelector('h3') || 
                    el.querySelector('.asQXV') || 
                    el.querySelector('.A65qq') ||
                    el.querySelector('.post-title');
    const title = titleEl ? titleEl.innerText.trim() : 'Classroom_Material';

    const isUpdated = el.innerText.includes('Edited') || 
                      el.innerText.includes('edited') || 
                      el.querySelector('.t7Wzhe') !== null ||
                      el.hasAttribute('data-edited');

    const descEl = el.querySelector('.tL92xf') || 
                   el.querySelector('.nfnrId') || 
                   el.querySelector('.post-description');
    const description = descEl ? descEl.innerText.trim() : '';

    const attachments = [];
    const linkElements = el.querySelectorAll('a[href]');

    linkElements.forEach((a) => {
      const href = a.href;
      if (!href) return;

      const fileInfo = resolveAttachmentLink(href, a, title);
      if (fileInfo) {
        if (!attachments.some(att => att.downloadUrl === fileInfo.downloadUrl)) {
          attachments.push(fileInfo);
        }
      }
    });

    if (attachments.length === 0) return null;

    return {
      id: el.getAttribute('data-stream-item-id') || Math.random().toString(36).substring(2, 9),
      title: title,
      course: courseTitle,
      description: description,
      isUpdated: isUpdated,
      isDownloaded: false,
      attachments: attachments
    };
  }

  function resolveAttachmentLink(href, anchorEl, postTitle) {
    const text = anchorEl.innerText.trim() || 'Attachment';

    // 1. Google Drive File
    const driveMatch = href.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      const ext = inferExtension(text) || 'pdf';
      return {
        id: fileId,
        title: ensureExtension(text, ext),
        extension: ext,
        typeLabel: 'Drive File',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
        assignment: postTitle
      };
    }

    // 2. Google Docs
    const docsMatch = href.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      const docId = docsMatch[1];
      return {
        id: docId,
        title: ensureExtension(text, 'pdf'),
        extension: 'gdoc',
        typeLabel: 'Google Doc',
        downloadUrl: 'https://docs.google.com/document/d/' + docId + '/export?format=pdf',
        assignment: postTitle
      };
    }

    // 3. Google Slides
    const slidesMatch = href.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch) {
      const slideId = slidesMatch[1];
      return {
        id: slideId,
        title: ensureExtension(text, 'pdf'),
        extension: 'gslides',
        typeLabel: 'Google Slides',
        downloadUrl: 'https://docs.google.com/presentation/d/' + slideId + '/export/pdf',
        assignment: postTitle
      };
    }

    // 4. Google Sheets
    const sheetsMatch = href.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) {
      const sheetId = sheetsMatch[1];
      return {
        id: sheetId,
        title: ensureExtension(text, 'xlsx'),
        extension: 'gsheet',
        typeLabel: 'Google Sheet',
        downloadUrl: 'https://docs.google.com/spreadsheets/d/' + sheetId + '/export?format=xlsx',
        assignment: postTitle
      };
    }

    // 5. Direct file extensions
    const directExtMatch = href.match(/\.(pdf|docx?|pptx?|xlsx?|zip|rar|png|jpe?g|mp4)(\?|$)/i);
    if (directExtMatch) {
      const ext = directExtMatch[1].toLowerCase();
      return {
        id: href,
        title: ensureExtension(text, ext),
        extension: ext,
        typeLabel: ext.toUpperCase(),
        downloadUrl: href,
        assignment: postTitle
      };
    }

    // 6. External link
    if (href.startsWith('http') && !href.includes('classroom.google.com/u/')) {
      return {
        id: href,
        title: text || 'Resource_Link',
        extension: 'link',
        typeLabel: 'Link',
        downloadUrl: href,
        assignment: postTitle
      };
    }

    return null;
  }

  function injectActionBar(postEl, postData) {
    const actionBar = window.ClassroomUI.createActionBar(
      postData,
      handleDownloadAllZip,
      handleQuickPick,
      handleViewDiff
    );

    const targetContainer = postEl.querySelector('.Q814ie') || 
                            postEl.querySelector('.A65qq') || 
                            postEl.querySelector('.post-header') ||
                            postEl;

    targetContainer.insertAdjacentElement('afterend', actionBar);
  }

  // Scan and gather all attachments on the entire page
  function getAllPageAttachments() {
    const allFiles = [];
    document.querySelectorAll('a[href]').forEach((a) => {
      const fileInfo = resolveAttachmentLink(a.href, a, 'Course Materials');
      if (fileInfo && !allFiles.some(f => f.downloadUrl === fileInfo.downloadUrl)) {
        allFiles.push(fileInfo);
      }
    });
    return allFiles;
  }

  async function handleDownloadAllPageMaterials() {
    const files = getAllPageAttachments();
    if (files.length === 0) {
      alert('Classroom Suite: No downloadable attachments detected on this page yet. Please scroll or expand class topics.');
      return;
    }

    const btn = document.getElementById('cqd-master-download-all');
    const masterData = {
      course: courseTitle,
      title: 'Complete_Class_Materials',
      description: 'All attachments gathered from ' + courseTitle,
      attachments: files
    };

    await handleDownloadAllZip(masterData, btn || document.createElement('button'));
  }

  function handleSelectAllPageMaterials() {
    const files = getAllPageAttachments();
    if (files.length === 0) {
      alert('Classroom Suite: No attachments found on current view.');
      return;
    }

    const masterData = {
      course: courseTitle,
      title: 'Class_Materials_Selective',
      description: 'Select files from entire classwork',
      attachments: files
    };

    window.ClassroomUI.showQuickPickModal(masterData, (postData, selectedFiles) => {
      const customData = Object.assign({}, postData, { attachments: selectedFiles });
      const btn = document.getElementById('cqd-master-download-all');
      handleDownloadAllZip(customData, btn || document.createElement('button'));
    });
  }

  // Download ZIP using Background fetcher or direct blob
  async function handleDownloadAllZip(data, btnElement) {
    if (!window.JSZip) {
      alert('Classroom Suite: ZIP compression library loading. Please try again.');
      return;
    }

    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<span>⏳ Packaging (0/' + data.attachments.length + ')...</span>';

    try {
      const zip = new window.JSZip();
      const folderName = sanitize(data.title || 'Materials');
      const folder = zip.folder(folderName);

      const overviewContent = 'Course: ' + data.course + '\n' +
        'Pack: ' + data.title + '\n' +
        'Downloaded with: Classroom Suite (100% Client-Side)\n\n' +
        'Files Included:\n' +
        data.attachments.map((att, i) => (i + 1) + '. ' + att.title + ' (' + att.typeLabel + ')').join('\n');

      folder.file('README_Notes.txt', overviewContent);

      let fetchedCount = 0;

      for (const file of data.attachments) {
        btnElement.innerHTML = '<span>⏳ Fetching ' + (fetchedCount + 1) + '/' + data.attachments.length + '...</span>';
        
        try {
          if (file.extension === 'link') {
            const urlContent = '[InternetShortcut]\nURL=' + file.downloadUrl + '\n';
            folder.file(sanitize(file.title) + '.url', urlContent);
          } else {
            // Fetch via background worker or direct fetch
            const bgResponse = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                type: 'FETCH_ATTACHMENT_BASE64',
                payload: { url: file.downloadUrl }
              }, resolve);
            });

            if (bgResponse && bgResponse.success && bgResponse.data) {
              folder.file(sanitize(file.title), bgResponse.data.base64, { base64: true });
            } else {
              // Direct fetch fallback
              const resp = await fetch(file.downloadUrl, { credentials: 'include' });
              if (resp.ok) {
                const blob = await resp.blob();
                folder.file(sanitize(file.title), blob);
              }
            }
          }
        } catch (err) {
          console.error('Fetch error for ' + file.title, err);
        }
        fetchedCount++;
      }

      btnElement.innerHTML = '<span>⚡ Compressing ZIP...</span>';

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipFilename = sanitize(data.course) + ' - ' + sanitize(data.title) + '.zip';
      triggerBlobDownload(zipBlob, zipFilename);

      btnElement.innerHTML = '<span>✓ Saved (' + data.attachments.length + ' files)</span>';
      btnElement.classList.remove('cqd-btn-primary');
      btnElement.classList.add('cqd-btn-secondary');

      chrome.runtime.sendMessage({
        type: 'UPDATE_STATS',
        payload: {
          filesAdded: data.attachments.length,
          bytesAdded: zipBlob.size,
          zipsAdded: 1
        }
      });

    } catch (error) {
      console.error('Failed to bundle materials:', error);
      alert('Classroom Suite: Error creating ZIP. Try downloading directly or refresh.');
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
    }
  }

  function handleQuickPick(data) {
    window.ClassroomUI.showQuickPickModal(data, (postData, selectedFiles) => {
      const customData = Object.assign({}, postData, { attachments: selectedFiles });
      const btn = document.querySelector('[data-cqd-post-id="' + data.id + '"] .cqd-btn-primary');
      handleDownloadAllZip(customData, btn || document.createElement('button'));
    });
  }

  function handleViewDiff(data) {
    window.ClassroomUI.showDiffModal(data);
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  function sanitize(str) {
    if (!str) return 'Material';
    return str.replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  function inferExtension(filename) {
    const match = filename.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : null;
  }

  function ensureExtension(filename, ext) {
    if (!filename) return 'file.' + ext;
    if (filename.toLowerCase().endsWith('.' + ext)) return filename;
    return filename + '.' + ext;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
