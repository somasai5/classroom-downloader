// Classroom Suite - Injected UI Components & Modals
// 100% Client-Side

window.ClassroomUI = {
  // Render Action Bar for a Classroom Post
  createActionBar(data, onDownloadAll, onQuickPick, onViewDiff) {
    const container = document.createElement('div');
    container.className = 'cqd-action-container';
    container.setAttribute('data-cqd-post-id', data.id);

    // Download All Button
    const btnDownloadAll = document.createElement('button');
    btnDownloadAll.className = 'cqd-btn cqd-btn-primary';
    btnDownloadAll.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download All (.zip)</span>
      <span class="cqd-badge-count">${data.attachments.length}</span>
    `;
    btnDownloadAll.onclick = (e) => {
      e.stopPropagation();
      onDownloadAll(data, btnDownloadAll);
    };

    // Select Files (Quick Pick) Button
    const btnQuickPick = document.createElement('button');
    btnQuickPick.className = 'cqd-btn cqd-btn-secondary';
    btnQuickPick.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 11 12 14 22 4"></polyline>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
      <span>Select Files</span>
    `;
    btnQuickPick.onclick = (e) => {
      e.stopPropagation();
      onQuickPick(data);
    };

    container.appendChild(btnDownloadAll);
    container.appendChild(btnQuickPick);

    // If post was modified, show "Updated" badge & Diff button
    if (data.isUpdated) {
      const badge = document.createElement('span');
      badge.className = 'cqd-badge cqd-badge-updated';
      badge.innerHTML = `?? Edited`;
      badge.style.cursor = 'pointer';
      badge.title = 'Click to see what changed';
      badge.onclick = (e) => {
        e.stopPropagation();
        onViewDiff(data);
      };
      container.appendChild(badge);
    }

    if (data.isDownloaded) {
      const badge = document.createElement('span');
      badge.className = 'cqd-badge cqd-badge-downloaded';
      badge.innerHTML = `? Saved`;
      container.appendChild(badge);
    }

    return container;
  },

  // Modal for Quick Pick & Selective Downloads
  showQuickPickModal(data, onConfirm) {
    this.closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'cqd-modal-overlay';
    overlay.id = 'cqd-active-modal';

    const card = document.createElement('div');
    card.className = 'cqd-modal-card';

    // Header
    card.innerHTML = `
      <div class="cqd-modal-header">
        <div class="cqd-modal-title">
          <span>??</span>
          <span>Select Files: <b>${this.escapeHtml(data.title || 'Assignment')}</b></span>
        </div>
        <button id="cqd-close-btn" style="background:none; border:none; font-size:18px; cursor:pointer; color:#64748b;">?</button>
      </div>
      <div class="cqd-modal-body">
        <div style="display:flex; gap:8px; margin-bottom:12px; align-items:center; flex-wrap: wrap;">
          <span style="font-size:12px; color:#64748b; font-weight:600;">Filter:</span>
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="all" style="padding:4px 8px; font-size:11px;">All (${data.attachments.length})</button>
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="pdf" style="padding:4px 8px; font-size:11px;">PDFs</button>
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="doc" style="padding:4px 8px; font-size:11px;">Docs / Slides</button>
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="link" style="padding:4px 8px; font-size:11px;">Links</button>
          <div style="margin-left:auto; display:flex; gap:6px;">
            <button id="cqd-select-all" class="cqd-btn cqd-btn-secondary" style="padding:4px 8px; font-size:11px;">Select All</button>
            <button id="cqd-deselect-all" class="cqd-btn cqd-btn-secondary" style="padding:4px 8px; font-size:11px;">Deselect All</button>
          </div>
        </div>
        <div class="cqd-file-list" id="cqd-modal-file-list"></div>
      </div>
      <div class="cqd-modal-footer">
        <div style="font-size:13px; color:#475569;">
          Selected: <b id="cqd-selected-count">${data.attachments.length}</b> / ${data.attachments.length} files
        </div>
        <div style="display:flex; gap:8px;">
          <button id="cqd-modal-cancel" class="cqd-btn cqd-btn-secondary">Cancel</button>
          <button id="cqd-modal-download-zip" class="cqd-btn cqd-btn-primary">Download Selected (.ZIP)</button>
        </div>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const fileListEl = card.querySelector('#cqd-modal-file-list');
    const selectedCountEl = card.querySelector('#cqd-selected-count');

    // Populate Files with Checkboxes
    data.attachments.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'cqd-file-item';
      item.setAttribute('data-ext', file.extension || 'other');

      const icon = this.getFileIcon(file.extension);

      item.innerHTML = `
        <label>
          <input type="checkbox" class="cqd-file-check" data-index="${index}" checked style="accent-color: #4f46e5; width:17px; height:17px; cursor:pointer;" />
          <span class="cqd-file-icon">${icon}</span>
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; font-weight:500;" title="${this.escapeHtml(file.title)}">${this.escapeHtml(file.title)}</span>
          <span class="cqd-file-meta">${file.typeLabel || file.extension.toUpperCase()}</span>
        </label>
      `;
      fileListEl.appendChild(item);
    });

    const updateCount = () => {
      const checked = card.querySelectorAll('.cqd-file-check:checked').length;
      selectedCountEl.textContent = checked;
      card.querySelector('#cqd-modal-download-zip').disabled = (checked === 0);
    };

    // Select / Deselect All
    card.querySelector('#cqd-select-all').onclick = () => {
      card.querySelectorAll('.cqd-file-check').forEach(chk => chk.checked = true);
      updateCount();
    };

    card.querySelector('#cqd-deselect-all').onclick = () => {
      card.querySelectorAll('.cqd-file-check').forEach(chk => chk.checked = false);
      updateCount();
    };

    // Filter Buttons
    card.querySelectorAll('.cqd-filter-btn').forEach(btn => {
      btn.onclick = () => {
        const filter = btn.getAttribute('data-filter');
        card.querySelectorAll('.cqd-file-item').forEach(item => {
          const ext = item.getAttribute('data-ext');
          let match = true;
          if (filter === 'pdf') match = ext === 'pdf';
          if (filter === 'doc') match = ['doc', 'docx', 'gdoc', 'gslides', 'pptx', 'ppt'].includes(ext);
          if (filter === 'link') match = ext === 'link' || ext === 'url';
          item.style.display = match ? 'flex' : 'none';
        });
      };
    });

    card.querySelectorAll('.cqd-file-check').forEach(chk => {
      chk.onchange = updateCount;
    });

    // Close & Action Handlers
    card.querySelector('#cqd-close-btn').onclick = () => this.closeModal();
    card.querySelector('#cqd-modal-cancel').onclick = () => this.closeModal();

    card.querySelector('#cqd-modal-download-zip').onclick = () => {
      const selectedIndices = Array.from(card.querySelectorAll('.cqd-file-check:checked'))
        .map(el => parseInt(el.getAttribute('data-index'), 10));
      const selectedFiles = selectedIndices.map(i => data.attachments[i]);
      if (selectedFiles.length === 0) return;
      this.closeModal();
      onConfirm(data, selectedFiles);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeModal();
    };
  },

  // Modal for Post Diffs / Edit History
  showDiffModal(data) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'cqd-modal-overlay';
    overlay.id = 'cqd-active-modal';

    const card = document.createElement('div');
    card.className = 'cqd-modal-card';
    card.innerHTML = `
      <div class="cqd-modal-header">
        <div class="cqd-modal-title">
          <span>??</span>
          <span>Update History: <b>${this.escapeHtml(data.title || 'Assignment')}</b></span>
        </div>
        <button id="cqd-close-btn" style="background:none; border:none; font-size:18px; cursor:pointer; color:#64748b;">?</button>
      </div>
      <div class="cqd-modal-body">
        <p style="font-size:13px; color:#475569; margin-bottom:12px;">
          This post was edited after its initial publication.
        </p>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:13px; line-height:1.5;">
          <b>Current Details:</b>
          <div style="margin-top:6px; color:#334155;">${this.escapeHtml(data.description || 'No instruction text provided.')}</div>
        </div>
      </div>
      <div class="cqd-modal-footer">
        <div></div>
        <button id="cqd-diff-close" class="cqd-btn cqd-btn-primary">Got it</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    card.querySelector('#cqd-close-btn').onclick = () => this.closeModal();
    card.querySelector('#cqd-diff-close').onclick = () => this.closeModal();
  },

  // Floating Bottom Selection Bar (when user selects files across multiple posts)
  renderFloatingTray(selectedCount, onDownload, onClear) {
    let tray = document.getElementById('cqd-floating-tray');
    if (selectedCount === 0) {
      if (tray) tray.remove();
      return;
    }

    if (!tray) {
      tray = document.createElement('div');
      tray.id = 'cqd-floating-tray';
      tray.className = 'cqd-floating-tray';
      document.body.appendChild(tray);
    }

    tray.innerHTML = `
      <span>?? <b>${selectedCount}</b> file${selectedCount > 1 ? 's' : ''} selected</span>
      <div style="display:flex; gap:8px;">
        <button id="cqd-tray-download" class="cqd-btn cqd-btn-primary" style="padding:6px 14px;">Download Selected (.ZIP)</button>
        <button id="cqd-tray-clear" class="cqd-btn cqd-btn-secondary" style="background:rgba(255,255,255,0.15); color:#fff !important; border:none; padding:6px 10px;">Clear</button>
      </div>
    `;

    tray.querySelector('#cqd-tray-download').onclick = onDownload;
    tray.querySelector('#cqd-tray-clear').onclick = onClear;
  },

  closeModal() {
    const existing = document.getElementById('cqd-active-modal');
    if (existing) existing.remove();
  },

  getFileIcon(ext) {
    switch (ext) {
      case 'pdf': return '??';
      case 'doc':
      case 'docx':
      case 'gdoc': return '??';
      case 'ppt':
      case 'pptx':
      case 'gslides': return '??';
      case 'xls':
      case 'xlsx':
      case 'gsheet': return '??';
      case 'zip':
      case 'rar':
      case '7z': return '???';
      case 'jpg':
      case 'png':
      case 'gif': return '???';
      case 'mp4':
      case 'mov': return '??';
      case 'link':
      case 'url': return '??';
      default: return '??';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
  }
};
