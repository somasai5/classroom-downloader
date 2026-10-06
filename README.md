# 🚀 Classroom Suite - Google Classroom Quick Downloader & Smart Organizer

A powerful, **100% client-side** browser extension for Google Classroom that bundles lecture notes, slides, problem sets, and attached links in one click into clean, structured `.zip` packages or organized local folders.

---

## 🌟 Key Features

- **1-Click Batch .ZIP Bundler:** Automatically downloads and zips all assignment attachments in memory without flooding your Downloads folder.
- **Selective "Quick Pick" Modal:** Filter materials by type (PDFs, Slides, Google Docs, Web Links) with download size gauges.
- **Smart Changelog & Diff Badges:** Visually flags posts marked as `Edited`, letting you see what instructions or materials were updated.
- **Google Drive / Docs Converter:** Direct 1-click export of Google Slides & Docs to PDF, PPTX, or DOCX.
- **Offline Notes Exporter:** Automatically generates a `README_Notes.txt` / Study summary inside every downloaded `.zip`.
- **🛡️ 100% Client-Side Privacy:**
  - **Zero Servers:** No backend servers, databases, or third-party web requests.
  - **Zero API Keys:** Works natively using your existing Google session cookies.
  - **Zero Telemetry:** No analytics or data collection.

---

## 📁 Project Structure

```text
classroom-downloader/
├── src/
│   ├── manifest.json         # Manifest V3 configuration
│   ├── background/
│   │   └── background.js     # Background service worker (downloads & stats)
│   ├── content/
│   │   ├── content.js        # DOM scraper, link resolver, zip bundler
│   │   ├── ui.js             # Modal generator, quick pick, diff viewer
│   │   └── styles.css        # Glassmorphism UI styling
│   ├── popup/
│   │   ├── popup.html        # Extension popup dashboard
│   │   ├── popup.js          # Preferences & metrics controller
│   │   └── popup.css         # Popup styles
│   ├── lib/
│   │   └── jszip.min.js      # Bundled client-side ZIP library
│   └── icons/
│       └── icon.svg          # Extension icon
└── test/
    └── test_classroom.html   # Standalone sandbox test page
```

---

## 🛠️ How to Install in Your Browser

### Chrome / Brave / Edge / Arc / Opera (Chromium):
1. Open your browser and navigate to:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `src/` directory:
   `C:\Users\somas\.gemini\antigravity-ide\scratch\classroom-downloader\src`
5. Navigate to [Google Classroom](https://classroom.google.com) or open `test/test_classroom.html` in your browser.

---

## 🧪 Testing Locally
You can test the UI, modal filtering, and ZIP engine without logging into Google Classroom:
1. Double-click or open [test_classroom.html](file:///C:/Users/somas/.gemini/antigravity-ide/scratch/classroom-downloader/test/test_classroom.html) in Chrome/Edge.
2. Observe the injected **`[ Download All (.zip) ]`**, **`[ Select Files ]`**, and **`[ 🕒 Edited ]`** buttons in action!
