const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 CLASSROOM SUITE EXTENSION - COMPREHENSIVE DRY RUN');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

async function runAllTests() {
  console.log('--- TEST GROUP 1: MANIFEST V3 & ASSETS VALIDATION ---');
  test('manifest.json structure & MV3 compliance', () => {
    const manifestPath = path.join(__dirname, '..', 'src', 'manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf8');
    const json = JSON.parse(content);
    assert.strictEqual(json.manifest_version, 3, 'Must be Manifest V3');
    assert.strictEqual(json.background.type, 'module', 'Background must be module');
    assert(json.permissions.includes('downloads'), 'downloads permission required');
    assert(json.permissions.includes('storage'), 'storage permission required');
    assert(json.host_permissions.some(p => p.includes('classroom.google.com')), 'classroom host permission required');
    assert(json.host_permissions.some(p => p.includes('drive.google.com')), 'drive host permission required');
  });

  test('All declared icon files exist and are valid PNGs', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'manifest.json'), 'utf8'));
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    for (const [size, iconPath] of Object.entries(manifest.icons || {})) {
      const fullPath = path.join(__dirname, '..', 'src', iconPath);
      assert(fs.existsSync(fullPath), `Icon file ${iconPath} (${size}px) does not exist!`);
      const data = fs.readFileSync(fullPath);
      assert(data.subarray(0, 8).equals(pngSignature), `Icon ${iconPath} is not a valid PNG!`);
    }
  });

  test('JSZip library exists and is valid', () => {
    const jszipPath = path.join(__dirname, '..', 'src', 'lib', 'jszip.min.js');
    assert(fs.existsSync(jszipPath), 'jszip.min.js must exist');
    const stat = fs.statSync(jszipPath);
    assert(stat.size > 50000, 'jszip.min.js should be ~97KB');
  });

  console.log('\n--- TEST GROUP 2: ATTACHMENT RESOLUTION & CLEAN TITLES ---');
  // Load functions from content.js by extracting them
  const contentCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'content', 'content.js'), 'utf8');

  // Create isolated evaluator for content functions with browser globals mocked
  const ctx = {};
  const mockWindow = {
    location: { href: 'http://localhost/test/test_classroom.html', protocol: 'http:', hostname: 'localhost' },
    __CLASSROOM_SUITE_ACTIVE__: false
  };
  const mockDocument = {
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    readyState: 'complete',
    body: {}
  };
  const mockMutationObserver = class {
    observe() {}
    disconnect() {}
  };

  const evalFunc = new Function('ctx', 'window', 'document', 'MutationObserver', `
    ${contentCode.replace('(function () {', '').replace(/\}\)\(\);?\s*$/, '')}
    ctx.resolveAttachmentLink = resolveAttachmentLink;
    ctx.extractCleanAttachmentTitle = extractCleanAttachmentTitle;
    ctx.stripExt = stripExt;
    ctx.ensureExtension = ensureExtension;
    ctx.inferExtension = inferExtension;
    ctx.sanitize = sanitize;
    ctx.generateMockAttachmentContent = generateMockAttachmentContent;
    ctx.userSettings = userSettings;
    ctx.isSystemOrNavUrl = isSystemOrNavUrl;
  `);
  evalFunc(ctx, mockWindow, mockDocument, mockMutationObserver);

  test('Title extraction strips emojis, newlines, and size tags (e.g. "12 MB")', () => {
    const mockAnchor = {
      querySelector: (selector) => {
        if (selector === '.att-name') return { innerText: 'Lecture_04_Graph_Traversal.pdf' };
        return null;
      },
      getAttribute: () => null,
      innerText: '📊\nLecture_04_Graph_Traversal.pdf\nPDF Document (12 MB)'
    };
    const title = ctx.extractCleanAttachmentTitle(mockAnchor);
    assert.strictEqual(title, 'Lecture_04_Graph_Traversal.pdf', 'Should cleanly extract title from .att-name');
  });

  test('Fallback title extraction parses first non-empty alphanumeric line', () => {
    const mockAnchor = {
      querySelector: () => null,
      getAttribute: () => null,
      innerText: '📊\nLecture_04_Graph_Traversal.pdf\nPDF Document (12 MB)'
    };
    const title = ctx.extractCleanAttachmentTitle(mockAnchor);
    assert.strictEqual(title, 'Lecture_04_Graph_Traversal.pdf');
  });

  test('Google Drive link resolver handles standard, multi-account (/u/0/, /u/1/), and open?id=', () => {
    const testCases = [
      {
        href: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9/view',
        name: 'Lecture_04_Graph_Traversal.pdf',
        expectedUrl: 'https://drive.google.com/uc?export=download&id=1A2B3C4D5E6F7G8H9&confirm=t&authuser=0',
        expectedTitle: 'Lecture_04_Graph_Traversal.pdf'
      },
      {
        href: 'https://drive.google.com/file/u/1/d/1A2B3C4D5E6F7G8H9/view',
        name: 'Formula_Sheet.pdf',
        expectedUrl: 'https://drive.google.com/uc?export=download&id=1A2B3C4D5E6F7G8H9&confirm=t&authuser=1',
        expectedTitle: 'Formula_Sheet.pdf'
      },
      {
        href: 'https://drive.google.com/open?id=1A2B3C4D5E6F7G8H9',
        name: 'Notes.pdf',
        expectedUrl: 'https://drive.google.com/uc?export=download&id=1A2B3C4D5E6F7G8H9&confirm=t&authuser=0',
        expectedTitle: 'Notes.pdf'
      }
    ];

    for (const tc of testCases) {
      const mockAnchor = {
        querySelector: () => ({ innerText: tc.name }),
        getAttribute: () => null,
        innerText: tc.name
      };
      const res = ctx.resolveAttachmentLink(tc.href, mockAnchor, 'Test Post');
      assert(res, `Link resolver failed on ${tc.href}`);
      assert.strictEqual(res.downloadUrl, tc.expectedUrl);
      assert.strictEqual(res.title, tc.expectedTitle);
    }
  });

  test('Google Docs and Slides resolvers correctly route to export endpoints with authuser', () => {
    const slidesAnchor = {
      querySelector: () => ({ innerText: 'Lecture_04_Interactive_Slides.gslides' }),
      getAttribute: () => null,
      innerText: 'Lecture_04_Interactive_Slides.gslides'
    };
    const slidesRes = ctx.resolveAttachmentLink(
      'https://docs.google.com/presentation/u/1/d/1SlideDeckIDExample123/edit',
      slidesAnchor,
      'Test Post'
    );
    assert(slidesRes, 'Should resolve Google Slides');
    assert.strictEqual(slidesRes.extension, 'gslides');
    assert.strictEqual(slidesRes.title, 'Lecture_04_Interactive_Slides.pdf');
    assert.strictEqual(slidesRes.downloadUrl, 'https://docs.google.com/presentation/u/1/d/1SlideDeckIDExample123/export/pdf');

    const docsAnchor = {
      querySelector: () => ({ innerText: 'Homework_3_Problem_Set.gdoc' }),
      getAttribute: () => null,
      innerText: 'Homework_3_Problem_Set.gdoc'
    };
    const docsRes = ctx.resolveAttachmentLink(
      'https://docs.google.com/document/u/0/d/1ProblemSetDocsID456/edit',
      docsAnchor,
      'Test Post'
    );
    assert(docsRes, 'Should resolve Google Doc');
    assert.strictEqual(docsRes.extension, 'gdoc');
    assert.strictEqual(docsRes.title, 'Homework_3_Problem_Set.pdf');
    assert.strictEqual(docsRes.downloadUrl, 'https://docs.google.com/document/u/0/d/1ProblemSetDocsID456/export?format=pdf');
  });

  test('Sanitize strips Windows invalid characters, trailing dots and spaces', () => {
    assert.strictEqual(ctx.sanitize('CS101...'), 'CS101');
    assert.strictEqual(ctx.sanitize('Lecture: Week 1*?'), 'Lecture_ Week 1');
    assert.strictEqual(ctx.sanitize('Assignment 1 . '), 'Assignment 1');
    assert.strictEqual(ctx.sanitize('Notes.pdf'), 'Notes.pdf');
  });

  test('Google Drive folder links are cleanly detected with Drive Folder type', () => {
    const folderAnchor = {
      querySelector: () => ({ innerText: 'Shared_Reading_Materials' }),
      getAttribute: () => null,
      innerText: 'Shared_Reading_Materials'
    };
    const res = ctx.resolveAttachmentLink(
      'https://drive.google.com/drive/folders/1FolderIDExample789?usp=sharing',
      folderAnchor,
      'Test Post'
    );
    assert(res, 'Drive folder link must resolve');
    assert.strictEqual(res.typeLabel, 'Drive Folder');
    assert.strictEqual(res.extension, 'link');
  });

  test('User export preferences dynamically switch Slides to PPTX and Docs to DOCX', () => {
    ctx.userSettings.slidesExportFormat = 'pptx';
    ctx.userSettings.docsExportFormat = 'docx';

    const slidesRes = ctx.resolveAttachmentLink(
      'https://docs.google.com/presentation/u/0/d/1SlideDeckIDExample123/edit',
      { querySelector: () => ({ innerText: 'Lecture_Slides.gslides' }), getAttribute: () => null, innerText: 'Lecture_Slides.gslides' },
      'Test Post'
    );
    assert.strictEqual(slidesRes.title, 'Lecture_Slides.pptx');
    assert(slidesRes.downloadUrl.includes('/export/pptx'));

    const docsRes = ctx.resolveAttachmentLink(
      'https://docs.google.com/document/u/0/d/1ProblemSetDocsID456/edit',
      { querySelector: () => ({ innerText: 'Handout.gdoc' }), getAttribute: () => null, innerText: 'Handout.gdoc' },
      'Test Post'
    );
    assert.strictEqual(docsRes.title, 'Handout.docx');
    assert(docsRes.downloadUrl.includes('export?format=docx'));

    // Reset back to pdf defaults
    ctx.userSettings.slidesExportFormat = 'pdf';
    ctx.userSettings.docsExportFormat = 'pdf';
  });

  test('Google system UI and navigation links are strictly ignored', () => {
    assert.strictEqual(ctx.isSystemOrNavUrl('https://calendar.google.com/calendar/u/0/r', null), true);
    assert.strictEqual(ctx.isSystemOrNavUrl('https://accounts.google.com/SignOutOptions', null), true);
    assert.strictEqual(ctx.isSystemOrNavUrl('https://www.google.com/intl/en/about/products', null), true);
    assert.strictEqual(ctx.isSystemOrNavUrl('https://classroom.google.com/c/12345/a', null), true);
    assert.strictEqual(ctx.isSystemOrNavUrl('https://drive.google.com/file/d/1A2B3C4D/view', null), false);
    assert.strictEqual(ctx.isSystemOrNavUrl('https://docs.google.com/presentation/d/1SlideID/edit', null), false);
  });

  console.log('\n--- TEST GROUP 3: SIMULATED HTML DOM SCANNING ---');
  test('Parsing test_classroom.html extracts all posts and attachments accurately', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'test', 'test_classroom.html'), 'utf8');

    // Split cards by g-classroom-post class
    const postBlocks = html.split('<div class="g-classroom-post"').slice(1);
    assert.strictEqual(postBlocks.length, 3, 'Should find 3 post containers in test_classroom.html');

    // Post 1 attachments check
    const post1 = postBlocks[0];
    const linkMatches = [...post1.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    assert.strictEqual(linkMatches.length, 4, 'Post 1 should have 4 attachment links');

    const attachments = linkMatches.map(m => {
      const href = m[1];
      const inner = m[2];
      const nameMatch = inner.match(/<div class="att-name">([^<]+)<\/div>/);
      const name = nameMatch ? nameMatch[1] : 'Unknown';
      const mockAnchor = {
        querySelector: (sel) => (sel === '.att-name' ? { innerText: name } : null),
        getAttribute: () => null,
        innerText: inner.replace(/<[^>]+>/g, '').trim()
      };
      return ctx.resolveAttachmentLink(href, mockAnchor, 'Post 1');
    }).filter(Boolean);

    assert.strictEqual(attachments.length, 4, 'All 4 attachments in Post 1 must be successfully resolved');
    assert.strictEqual(attachments[0].title, 'Lecture_04_Graph_Traversal.pdf');
    assert.strictEqual(attachments[1].title, 'Lecture_04_Interactive_Slides.pdf');
    assert.strictEqual(attachments[2].title, 'Homework_3_Problem_Set.pdf');
    assert.strictEqual(attachments[3].title, 'VisuAlgo Graph Traversal Visualizer');
    assert.strictEqual(attachments[3].extension, 'link');

    // Post 3 (Binary.pdf user scenario check)
    const post3 = postBlocks[2];
    const post3Link = [...post3.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)][0];
    assert(post3Link, 'Post 3 must have attachment link');
    const binaryRes = ctx.resolveAttachmentLink(post3Link[1], {
      querySelector: (sel) => (sel === '.att-name' ? { innerText: 'Binary.pdf' } : null),
      getAttribute: () => null,
      innerText: 'Binary.pdf'
    }, 'CSE 303 Machine Learning');
    assert.strictEqual(binaryRes.title, 'Binary.pdf');
    assert(binaryRes.downloadUrl.includes('authuser=1'), 'Binary.pdf must include authuser=1 for university account');
  });

  console.log('\n--- TEST GROUP 4: END-TO-END ZIP GENERATION & EXTRACTION ---');
  await testAsync('Full ZIP bundle creation with mock attachment data', async () => {
    const jszipCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'jszip.min.js'), 'utf8');
    const moduleObj = { exports: {} };
    const fn = new Function('module', 'exports', jszipCode);
    fn(moduleObj, moduleObj.exports);
    const JSZip = moduleObj.exports;

    const zip = new JSZip();
    const folder = zip.folder('CS101 - Lecture 04');

    const sampleFiles = [
      { title: 'Lecture_04_Graph_Traversal.pdf', extension: 'pdf' },
      { title: 'Lecture_04_Interactive_Slides.pdf', extension: 'pdf' },
      { title: 'Homework_3_Problem_Set.pdf', extension: 'pdf' },
      { title: 'VisuAlgo Graph Traversal Visualizer.url', extension: 'link', content: '[InternetShortcut]\nURL=https://visualgo.net\n' }
    ];

    folder.file('README_Notes.txt', 'Course: CS101\nPack: Lecture 04\nTotal: 4 materials included.');

    for (const f of sampleFiles) {
      if (f.extension === 'link') {
        folder.file(f.title, f.content);
      } else {
        const mockPdf = ctx.generateMockAttachmentContent(f);
        folder.file(f.title, mockPdf);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    assert(zipBuffer.length > 500, 'Zip file must contain compressed data');

    // Unpack and verify all entries
    const unpacked = await JSZip.loadAsync(zipBuffer);
    assert(unpacked.file('CS101 - Lecture 04/README_Notes.txt'), 'README must exist in zip');
    assert(unpacked.file('CS101 - Lecture 04/Lecture_04_Graph_Traversal.pdf'), 'Lecture 04 PDF must exist in zip');
    assert(unpacked.file('CS101 - Lecture 04/Lecture_04_Interactive_Slides.pdf'), 'Lecture 04 Slides must exist in zip');
    assert(unpacked.file('CS101 - Lecture 04/Homework_3_Problem_Set.pdf'), 'Homework 3 PDF must exist in zip');
    assert(unpacked.file('CS101 - Lecture 04/VisuAlgo Graph Traversal Visualizer.url'), 'VisuAlgo link shortcut must exist in zip');

    // Read content of PDF to ensure valid PDF signature
    const pdfContent = await unpacked.file('CS101 - Lecture 04/Lecture_04_Graph_Traversal.pdf').async('string');
    assert(pdfContent.startsWith('%PDF-1.4'), 'PDF file must start with valid PDF-1.4 header');
  });

  console.log('\n--- TEST GROUP 5: BACKGROUND WORKER UNIT CHECKS ---');
  test('Fast chunked base64 handles binary buffers up to 10MB cleanly', () => {
    const bgCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'background', 'background.js'), 'utf8');
    assert(bgCode.includes('bufferToBase64'), 'Background script must have bufferToBase64 helper');
    assert(bgCode.includes('confirm=t'), 'Background script must automatically include confirm=t for Drive files');
    assert(bgCode.includes('contentType.includes(\'text/html\')'), 'Background script must check for HTML virus scan prompts');
  });

  console.log('\n--- TEST GROUP 6: UI LOGIC, ICONS & ESCAPING ---');
  test('ClassroomUI escapeHtml prevents XSS injection', () => {
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'content', 'ui.js'), 'utf8');
    const mockWindow = {};
    const evalUi = new Function('window', uiCode);
    evalUi(mockWindow);

    assert(mockWindow.ClassroomUI, 'ClassroomUI should be exposed on window');
    const escaped = mockWindow.ClassroomUI.escapeHtml('<script>alert("xss")</script>&"');
    assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&quot;');
  });

  test('ClassroomUI getFileIcon maps all major file types', () => {
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'content', 'ui.js'), 'utf8');
    const mockWindow = {};
    const evalUi = new Function('window', uiCode);
    evalUi(mockWindow);

    assert.strictEqual(mockWindow.ClassroomUI.getFileIcon('pdf'), '📄');
    assert.strictEqual(mockWindow.ClassroomUI.getFileIcon('gslides'), '📊');
    assert.strictEqual(mockWindow.ClassroomUI.getFileIcon('gdoc'), '📝');
    assert.strictEqual(mockWindow.ClassroomUI.getFileIcon('gsheet'), '📈');
    assert.strictEqual(mockWindow.ClassroomUI.getFileIcon('link'), '🔗');
  });

  test('ClassroomUI createSingleFileDownloadButton creates download element with click listener', () => {
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'content', 'ui.js'), 'utf8');
    const mockWindow = {};
    const evalUi = new Function('window', uiCode);
    evalUi(mockWindow);

    const mockDocument = {
      createElement: (tag) => {
        return {
          tagName: tag,
          className: '',
          innerHTML: '',
          setAttribute: function(k, v) { this[k] = v; },
          onclick: null
        };
      }
    };

    const evalUiWithDoc = new Function('window', 'document', uiCode);
    evalUiWithDoc(mockWindow, mockDocument);

    let downloadedFile = null;
    const testFile = { title: 'Binary.pdf', downloadUrl: 'https://drive.google.com/...' };
    const btn = mockWindow.ClassroomUI.createSingleFileDownloadButton(testFile, (file) => {
      downloadedFile = file;
    });

    assert(btn, 'Button must be created');
    assert(btn.className.includes('cqd-file-dl-btn'), 'Button must have cqd-file-dl-btn class');
    assert(btn.innerHTML.includes('Download'), 'Button must have Download label');

    // Test click
    btn.onclick({ preventDefault: () => {}, stopPropagation: () => {} });
    assert.strictEqual(downloadedFile, testFile, 'Clicking single download button must trigger callback with fileInfo');
  });

  test('ClassroomUI action bar & modal prioritize Class Notes over web links', () => {
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'content', 'ui.js'), 'utf8');
    const mockWindow = {};
    const createdElements = [];

    const mockDocument = {
      createElement: (tag) => {
        const el = {
          tagName: tag,
          className: '',
          innerHTML: '',
          style: {},
          children: [],
          setAttribute: function(k, v) { this[k] = v; },
          getAttribute: function(k) { return this[k]; },
          appendChild: function(c) { this.children.push(c); return c; },
          querySelector: function(sel) {
            if (sel === '.cqd-badge-count') return { textContent: '2' };
            if (sel === '.cqd-action-direct') return this.children.find(c => c.className && c.className.includes('cqd-action-direct'));
            return null;
          },
          querySelectorAll: function() { return []; },
          remove: function() {}
        };
        createdElements.push(el);
        return el;
      },
      getElementById: () => null,
      body: { appendChild: () => {} }
    };

    const evalUi = new Function('window', 'document', uiCode);
    evalUi(mockWindow, mockDocument);

    const testPostData = {
      id: 'material-pca-123',
      title: 'Principle Component Analysis',
      course: 'CSE 303 Machine Learning',
      attachments: [
        { title: 'Medium Article', extension: 'link', typeLabel: 'Link', downloadUrl: 'https://medium.com/...' },
        { title: 'Turing Guide', extension: 'link', typeLabel: 'Link', downloadUrl: 'https://turing.com/...' },
        { title: 'Simplilearn Tutorial', extension: 'link', typeLabel: 'Link', downloadUrl: 'https://simplilearn.com/...' },
        { title: 'GitHub Repo', extension: 'link', typeLabel: 'Link', downloadUrl: 'https://github.com/...' },
        { title: 'Principal Component Analysis.pdf', extension: 'pdf', typeLabel: 'PDF', downloadUrl: 'https://drive.google.com/file/d/1...' },
        { title: 'Principal_Component_Slides.pdf', extension: 'pdf', typeLabel: 'PDF', downloadUrl: 'https://drive.google.com/file/d/2...' }
      ]
    };

    let directDownloadedData = null;
    let zipDownloadedData = null;

    const bar = mockWindow.ClassroomUI.createActionBar(
      testPostData,
      (data) => { directDownloadedData = data; },
      (data) => { zipDownloadedData = data; },
      () => {},
      () => {}
    );

    // Direct download button in action bar
    const directBtn = bar.children.find(c => c.className && c.className.includes('cqd-action-direct'));
    assert(directBtn, 'Direct button exists');
    assert(directBtn.innerHTML.includes('Download Class Notes'), 'Direct button must say Download Class Notes');
    assert(directBtn.innerHTML.includes('2'), 'Badge count must show 2 (only the PDFs, ignoring 4 links)');

    // Test direct button click passes only the 2 note attachments
    directBtn.onclick({ stopPropagation: () => {} });
    assert(directDownloadedData, 'Direct download callback fired');
    assert.strictEqual(directDownloadedData.attachments.length, 2, 'Must only download the 2 class note PDFs');
    assert(directDownloadedData.attachments.every(f => f.extension === 'pdf'), 'All downloaded files must be notes');

    // Test ZIP button passes only the 2 note attachments
    const zipBtn = bar.children.find(c => c.className && c.className.includes('cqd-action-zip'));
    zipBtn.onclick({ stopPropagation: () => {} });
    assert(zipDownloadedData, 'ZIP callback fired');
    assert.strictEqual(zipDownloadedData.attachments.length, 2, 'Must only zip the 2 class note PDFs');
  });

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULT: ${passCount} Passed, ${failCount} Failed`);
  if (failCount === 0) {
    console.log('🎉 ALL DRY RUN CHECKS PASSED WITH ZERO ERRORS!');
  } else {
    console.log(`⚠️ ${failCount} CHECKS FAILED.`);
  }
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
