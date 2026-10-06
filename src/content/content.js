// Classroom Suite - Content Script
// 100% Client-Side Engine for Google Classroom (Classwork & Stream)

(function () {
  'use strict';

  console.log('Classroom Suite content script active.');

  let courseTitle = 'Google_Classroom';
  const processedPosts = new WeakSet();

  // Initialize and observe DOM
  function init() {
    extractCourseTitle();
    scanAndInject();

    // Observe dynamic loading (infinite scroll & topic expand)
    const observer = new MutationObserver((mutations) => {
      extractCourseTitle();
      scanAndInject();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Extract Course Name from Header
  function extractCourseTitle() {
    const titleEl = document.querySelector('h1') || 
                    document.querySelector('[data-course-id] h1') ||
                    document.querySelector('.YVvGBb') ||
                    document.querySelector('.wFjd2c');
    if (titleEl && titleEl.innerText.trim()) {
      courseTitle = titleEl.innerText.trim();
    }
  }

  // Scan Classroom DOM for assignment & material containers
  function scanAndInject() {
    // Selectors for Google Classroom assignment cards (Classwork & Stream) + Mock test cards
    const postSelectors = [
      '[data-stream-item-id]',
      '[jscontroller="A2Lzbe"]',
      '.VBEdtc-Wvd9cc',
      '.ySjX5d',
      '.onkcGd',
      '.g-classroom-post',
      '[role="listitem"]'
    ];

    const elements = document.querySelectorAll(postSelectors.join(','));

    elements.forEach((postEl) => {
      if (processedPosts.has(postEl)) return;

      const postData = parsePostData(postEl);
      if (postData && postData.attachments.length > 0) {
        processedPosts.add(postEl);
        injectActionBar(postEl, postData);
      }
    });
  }

  // Parse assignment metadata and attachments from a DOM element
  function parsePostData(el) {
    const titleEl = el.querySelector('h2') || 
                    el.querySelector('h3') || 
                    el.querySelector('.asQXV') || 
                    el.querySelector('.A65qq') ||
                    el.querySelector('.post-title');
    const title = titleEl ? titleEl.innerText.trim() : 'Classroom_Material';

    // Check if edited/updated
    const isUpdated = el.innerText.includes('Edited') || 
                      el.innerText.includes('edited') || 
                      el.querySelector('.t7Wzhe') !== null ||
                      el.hasAttribute('data-edited');

    // Extract instructions / description text
    const descEl = el.querySelector('.tL92xf') || 
                   el.querySelector('.nfnrId') || 
                   el.querySelector('.post-description');
    const description = descEl ? descEl.innerText.trim() : '';

    // Extract attachments (links, files, drive items)
    const attachments = [];
    const linkElements = el.querySelectorAll('a[href]');

    linkElements.forEach((a) => {
      const href = a.href;
      if (!href) return;

      const fileInfo = resolveAttachmentLink(href, a);
      if (fileInfo) {
        // Prevent duplicate link entries in the same post
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

  // Convert Classroom/Drive URLs into direct download or export URLs
  function resolveAttachmentLink(href, anchorEl) {
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
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
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
        downloadUrl: `https://docs.google.com/document/d/${docId}/export?format=pdf`
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
        downloadUrl: `https://docs.google.com/presentation/d/${slideId}/export/pdf`
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
        downloadUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`
      };
    }

    // 5. Direct file links (PDFs, PPT, Images, ZIP)
    const directExtMatch = href.match(/\.(pdf|docx?|pptx?|xlsx?|zip|rar|png|jpe?g|mp4)(\?|$)/i);
    if (directExtMatch) {
      const ext = directExtMatch[1].toLowerCase();
      return {
        id: href,
        title: ensureExtension(text, ext),
        extension: ext,
        typeLabel: ext.toUpperCase(),
        downloadUrl: href
      };
    }

    // 6. External resource or test attachment
    if (href.startsWith('http') && !href.includes('classroom.google.com/u/')) {
      return {
        id: href,
        title: text || 'Resource_Link',
        extension: 'link',
        typeLabel: 'Link',
        downloadUrl: href
      };
    }

    return null;
  }

  // Inject action buttons into the post header or footer
  function injectActionBar(postEl, postData) {
    const actionBar = window.ClassroomUI.createActionBar(
      postData,
      handleDownloadAllZip,
      handleQuickPick,
      handleViewDiff
    );

    // Try finding the best container inside the post
    const targetContainer = postEl.querySelector('.Q814ie') || 
                            postEl.querySelector('.A65qq') || 
                            postEl.querySelector('.post-header') ||
                            postEl;

    targetContainer.insertAdjacentElement('afterend', actionBar);
  }

  // Action: Download All files into a structured client-side .ZIP
  async function handleDownloadAllZip(data, btnElement) {
    if (!window.JSZip) {
      alert('Classroom Suite: Packaging engine initializing. Please try again in a moment.');
      return;
    }

    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<span>⏳ Packaging (0/${data.attachments.length})...</span>`;

    try {
      const zip = new window.JSZip();
      const folderName = sanitize(data.title || 'Materials');
      const folder = zip.folder(folderName);

      // Add a clean study notes overview.txt inside the ZIP
      const overviewContent = `=========================================
Course: ${data.course}
Assignment: ${data.title}
Downloaded with: Classroom Suite (100% Client-Side)
=========================================

Instructions:
${data.description || 'No instructions provided.'}

Files Included:
${data.attachments.map((att, i) => `${i + 1}. ${att.title} (${att.typeLabel})`).join('\n')}
`;
      folder.file('README_Notes.txt', overviewContent);

      let fetchedCount = 0;

      // Fetch each attachment using active credentials
      for (const file of data.attachments) {
        btnElement.innerHTML = `<span>⏳ Fetching ${fetchedCount + 1}/${data.attachments.length}...</span>`;
        
        try {
          if (file.extension === 'link') {
            // For web links, create a desktop shortcut file (.url)
            const urlContent = `[InternetShortcut]\nURL=${file.downloadUrl}\n`;
            folder.file(`${sanitize(file.title)}.url`, urlContent);
          } else {
            const resp = await fetch(file.downloadUrl, { credentials: 'include' });
            if (resp.ok) {
              const blob = await resp.blob();
              folder.file(sanitize(file.title), blob);
            } else {
              console.warn(`Could not fetch ${file.title}, status: ${resp.status}`);
            }
          }
        } catch (err) {
          console.error(`Error downloading ${file.title}:`, err);
        }
        fetchedCount++;
      }

      btnElement.innerHTML = `<span>⚡ Compressing ZIP...</span>`;

      // Generate ZIP blob in memory
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Save via Data URL or Blob Link
      const zipFilename = `${sanitize(data.course)} - ${sanitize(data.title)}.zip`;
      triggerBlobDownload(zipBlob, zipFilename);

      // Update button state
      btnElement.innerHTML = `<span>✓ Saved (${data.attachments.length} files)</span>`;
      btnElement.classList.remove('cqd-btn-primary');
      btnElement.classList.add('cqd-btn-secondary');

      // Update storage stats
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
      alert('Classroom Suite: Error creating ZIP package. Please try selective download.');
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
    }
  }

  // Action: Open Quick Pick Selective Modal
  function handleQuickPick(data) {
    window.ClassroomUI.showQuickPickModal(data, (postData, selectedFiles) => {
      const customData = { ...postData, attachments: selectedFiles };
      const btn = document.querySelector(`[data-cqd-post-id="${data.id}"] .cqd-btn-primary`);
      handleDownloadAllZip(customData, btn || document.createElement('button'));
    });
  }

  // Action: Show Diff Changelog Modal
  function handleViewDiff(data) {
    window.ClassroomUI.showDiffModal(data);
  }

  // Trigger browser download for a Blob
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

  // Helpers
  function sanitize(str) {
    if (!str) return 'Material';
    return str.replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  function inferExtension(filename) {
    const match = filename.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : null;
  }

  function ensureExtension(filename, ext) {
    if (!filename) return `file.${ext}`;
    if (filename.toLowerCase().endsWith(`.${ext}`)) return filename;
    return `${filename}.${ext}`;
  }

  // Start extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
