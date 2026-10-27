# 🎓 Classroom Suite - Google Classroom Quick Downloader & Organizer

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen.svg)](#-privacy--security-guarantee)
[![Tests Passing](https://img.shields.io/badge/Tests-22%2F22%20Passing-success.svg)](test/dry_run_test.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A powerful, **100% client-side** browser extension for Google Classroom that bundles lecture notes, slides, assignments, and attached documents in one click into clean, structured `.zip` packages or direct organized downloads.

---

## 🏆 Project Achievements & Milestones

- **🎓 Master Floating Toolbar**: Sleek, minimizable floating control bar displaying live attachment counts (`⬇ Download Class Notes (N)`, `📦 .ZIP`, `⚡ Select`, `⚡ Expand`).
- **🔄 Real-Time SPA Navigation & bfcache Engine**: Seamlessly updates detected file counts, attachment buttons, and the toolbar across Google Classroom views (Stream ⇄ Classwork ⇄ Assignment Details) and browser Back/Forward navigation using a dedicated **MAIN world route interceptor** (`route_interceptor.js`).
- **⚡ 1-Click Attachment & Inline Link Downloads**: Injects fast 1-click download buttons on individual attachment cards as well as inline Drive/Docs/Sheets/Slides text links inside assignment descriptions.
- **👁️ Visibility-Aware DOM Filtering (`isElementVisible`)**: Eliminates stale or phantom files by detecting hidden Classroom views (`[aria-hidden="true"]`, `[style*="display: none"]`, detached nodes), guaranteeing that only active visible notes are gathered.
- **🛡️ 100% Zero-403 Google Cookie Streaming**: Completely bypasses Chrome's `403 Forbidden` Drive error by fetching binary files via elevated background session cookies and streaming them directly into memory.
- **🧹 Clean Stream Experience**: Automatically removes redundant post-level action bars so the Classroom feed remains pristine, focused, and uncluttered.
- **🧪 Comprehensive Test Suite**: 22 automated dry-run unit and integration tests passing with 0 failures (`test/dry_run_test.js`).

---

## 🌟 Key Features

| Feature | Description |
| :--- | :--- |
| **1-Click Batch .ZIP Bundler** | Gathers and bundles all visible course attachments into an organized `.zip` file with study summaries. |
| **Direct Notes Downloader** | Downloads notes directly to your local drive organized by course and assignment name. |
| **Selective Quick-Pick Modal** | Checkbox modal allowing students to preview, filter, and pick specific materials to download. |
| **Google Drive & Docs Converter** | Instant 1-click export of Google Docs and Slides to PDF, PPTX, or DOCX based on user preferences. |
| **Auto-Expander (`⚡ Expand`)** | Automatically expands collapsed stream posts and accordions to reveal all hidden attachments. |
| **Persistent Minimization** | Minimizes toolbar to a compact, non-intrusive badge when not in use. |

---

## 🔒 Privacy & Security Guarantee

- **Zero Servers**: No backend servers, databases, or third-party web endpoints.
- **Zero API Keys**: Runs 100% client-side using native Google session cookies.
- **Zero Telemetry**: No analytics, user tracking, or data harvesting. All processing happens entirely inside your browser.

---

## 📁 Architecture & File Structure

```text
classroom-downloader/
├── src/
│   ├── manifest.json              # Manifest V3 extension configuration
│   ├── background/
│   │   └── background.js          # Background service worker (cookie streaming & direct downloads)
│   ├── content/
│   │   ├── content.js             # Core scraper, active visibility engine, downloader
│   │   ├── route_interceptor.js   # MAIN world SPA pushState/replaceState interceptor
│   │   ├── ui.js                  # Floating toolbar, 1-click buttons, selective modal
│   │   └── styles.css             # Glassmorphism styling and animations
│   ├── popup/
│   │   ├── popup.html             # Extension dashboard popup
│   │   ├── popup.js               # Settings & metrics controller
│   │   └── popup.css              # Popup styling
│   ├── lib/
│   │   └── jszip.min.js           # Client-side in-memory ZIP engine
│   └── icons/                     # Extension icons (16px, 32px, 48px, 128px)
├── test/
│   ├── dry_run_test.js            # Comprehensive 22-test automated validation suite
│   └── test_classroom.html        # Standalone mock Classroom sandbox page
└── classroom-downloader.zip       # Pre-packaged ready-to-distribute release archive
```

---

## 🛠️ How to Install in Your Browser

### Chrome / Brave / Edge / Arc / Opera (Chromium):
1. Download or clone this repository, or use the pre-packaged `classroom-downloader.zip`.
2. Open your browser and go to `chrome://extensions` (or `edge://extensions`).
3. Turn ON **Developer mode** (top-right corner).
4. Click **Load unpacked**.
5. Select the `src/` folder:
   ```text
   c:\Users\somas\OneDrive\Desktop\classroom-downloader\src
   ```
6. Open [Google Classroom](https://classroom.google.com) — the **Classroom Suite** toolbar and 1-click download buttons will be active!

---

## 🧪 Running Automated Tests

Run the comprehensive 22-step automated dry-run test suite:

```bash
node test/dry_run_test.js
```

**Expected output:**
```text
====================================================
📊 FINAL RESULT: 22 Passed, 0 Failed
🎉 ALL DRY RUN CHECKS PASSED WITH ZERO ERRORS!
====================================================
```

---

## 📄 License

This project is licensed under the MIT License - free to use, modify, and distribute.
