// Classroom Suite - Injected UI & Modals
window.ClassroomUI = {
  // Create a 1-click download button for every individual attachment card
  createSingleFileDownloadButton(fileInfo, onDownload) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cqd-file-dl-btn';
    btn.setAttribute('data-cqd-download', 'true');
    btn.title = 'Direct Download: ' + fileInfo.title;
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download</span>
    `;
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onDownload(fileInfo, btn);
    };
    return btn;
  },

  // Inject the floating master control bar
  renderMasterFloatingBar(onDownloadAllDirect, onDownloadAllZip, onSelectAllPage, onExpandAll) {
    let bar = document.getElementById('cqd-master-floating-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'cqd-master-floating-bar';
      bar.className = 'cqd-master-bar';
      bar.innerHTML = `
        <div class="cqd-master-brand" id="cqd-master-brand-pill" title="Click to expand/minimize">
          <span style="font-size:16px;">🎓</span>
          <span><b>Classroom Suite</b></span>
          <span id="cqd-master-count" class="cqd-master-count-badge">0 files</span>
        </div>
        <div class="cqd-master-full-controls" style="display:flex; align-items:center; gap:8px;">
          <button id="cqd-master-download-direct" class="cqd-btn cqd-btn-primary" style="padding:6px 14px; font-size:12px;">
            ⬇ Download All Files
          </button>
          <button id="cqd-master-download-zip" class="cqd-btn cqd-btn-secondary" style="padding:6px 10px; font-size:12px;">
            📦 .ZIP
          </button>
          <button id="cqd-master-scan" class="cqd-btn cqd-btn-secondary" style="padding:6px 10px; font-size:12px;">
            ⚡ Select
          </button>
          <button id="cqd-master-expand" class="cqd-btn cqd-btn-secondary" style="padding:6px 10px; font-size:12px;" title="Auto-expand all posts to load attachments">
            ⚡ Expand
          </button>
          <button id="cqd-master-toggle" class="cqd-bar-toggle-btn" title="Minimize toolbar">✕</button>
        </div>
      `;
      document.body.appendChild(bar);

      bar.querySelector('#cqd-master-download-direct').onclick = onDownloadAllDirect;
      bar.querySelector('#cqd-master-download-zip').onclick = onDownloadAllZip;
      bar.querySelector('#cqd-master-scan').onclick = onSelectAllPage;
      if (onExpandAll && bar.querySelector('#cqd-master-expand')) {
        bar.querySelector('#cqd-master-expand').onclick = onExpandAll;
      }

      const toggleBtn = bar.querySelector('#cqd-master-toggle');
      const brandPill = bar.querySelector('#cqd-master-brand-pill');

      const toggleMinimize = (e) => {
        if (e) e.stopPropagation();
        bar.classList.toggle('cqd-minimized');
        const isMin = bar.classList.contains('cqd-minimized');
        if (toggleBtn) toggleBtn.textContent = isMin ? '↗' : '✕';
        if (toggleBtn) toggleBtn.title = isMin ? 'Expand toolbar' : 'Minimize toolbar';
      };

      toggleBtn.onclick = toggleMinimize;
      brandPill.onclick = () => {
        if (bar.classList.contains('cqd-minimized')) {
          toggleMinimize();
        }
      };
    }
  },

  updateMasterBar(count, isNotes = false) {
    const countEl = document.getElementById('cqd-master-count');
    if (countEl) {
      const unit = isNotes ? 'note' : 'file';
      countEl.textContent = `${count} ${unit}${count === 1 ? '' : 's'}`;
      countEl.style.display = count > 0 ? 'inline-block' : 'none';
    }
    const directBtn = document.getElementById('cqd-master-download-direct');
    if (directBtn && !directBtn.disabled) {
      const label = isNotes ? 'Download Class Notes' : 'Download All Files';
      directBtn.innerHTML = count > 0 ? `⬇ ${label} (${count})` : `⬇ ${label}`;
    }
  },

  createActionBar(data, onDownloadDirect, onDownloadZip, onQuickPick, onViewDiff) {
    const container = document.createElement('div');
    container.className = 'cqd-action-container';
    container.setAttribute('data-cqd-post-id', data.id);

    const noteFiles = (data.attachments || []).filter(f => f.extension !== 'link');
    const hasNotes = noteFiles.length > 0;
    const dlCount = hasNotes ? noteFiles.length : data.attachments.length;
    const dlLabel = hasNotes ? 'Download Class Notes' : 'Download Files';

    const btnDownloadDirect = document.createElement('button');
    btnDownloadDirect.className = 'cqd-btn cqd-btn-primary cqd-action-direct';
    btnDownloadDirect.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>${dlLabel}</span>
      <span class="cqd-badge-count">${dlCount}</span>
    `;
    btnDownloadDirect.title = hasNotes ? 'Download ' + noteFiles.length + ' class notes directly' : 'Download all files directly';
    btnDownloadDirect.onclick = (e) => {
      e.stopPropagation();
      const targetData = hasNotes ? Object.assign({}, data, { attachments: noteFiles }) : data;
      onDownloadDirect(targetData, btnDownloadDirect);
    };

    const btnDownloadZip = document.createElement('button');
    btnDownloadZip.className = 'cqd-btn cqd-btn-secondary cqd-action-zip';
    btnDownloadZip.innerHTML = `
      <span>📦 .ZIP</span>
    `;
    btnDownloadZip.title = hasNotes ? 'Download ' + noteFiles.length + ' class notes as .zip archive' : 'Download bundle as .zip archive';
    btnDownloadZip.onclick = (e) => {
      e.stopPropagation();
      const targetData = hasNotes ? Object.assign({}, data, { attachments: noteFiles }) : data;
      onDownloadZip(targetData, btnDownloadZip);
    };

    const btnQuickPick = document.createElement('button');
    btnQuickPick.className = 'cqd-btn cqd-btn-secondary';
    btnQuickPick.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 11 12 14 22 4"></polyline>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
      <span>Select</span>
    `;
    btnQuickPick.onclick = (e) => {
      e.stopPropagation();
      onQuickPick(data);
    };

    container.appendChild(btnDownloadDirect);
    container.appendChild(btnDownloadZip);
    container.appendChild(btnQuickPick);

    if (data.isUpdated) {
      const badge = document.createElement('span');
      badge.className = 'cqd-badge cqd-badge-updated';
      badge.innerHTML = '🕒 Edited';
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
      badge.innerHTML = '✓ Saved';
      container.appendChild(badge);
    }

    return container;
  },

  showQuickPickModal(data, onConfirmDirect, onConfirmZip, onSingleDownload) {
    this.closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'cqd-modal-overlay';
    overlay.id = 'cqd-active-modal';

    const card = document.createElement('div');
    card.className = 'cqd-modal-card';

    const noteFiles = (data.attachments || []).filter(f => f.extension !== 'link');
    const pdfCount = (data.attachments || []).filter(f => f.extension === 'pdf').length;
    const docCount = (data.attachments || []).filter(f => ['doc', 'docx', 'gdoc', 'gslides', 'pptx', 'ppt', 'gsheet', 'xlsx', 'xls', 'csv'].includes(f.extension)).length;
    const linkCount = (data.attachments || []).filter(f => f.extension === 'link' || f.extension === 'url').length;
    const hasNotes = noteFiles.length > 0;
    const initialSelectedCount = hasNotes ? noteFiles.length : data.attachments.length;

    card.innerHTML = `
      <div class="cqd-modal-header">
        <div class="cqd-modal-title">
          <span>📦</span>
          <span>Select Files: <b>${this.escapeHtml(data.title || 'Assignment')}</b></span>
        </div>
        <button id="cqd-close-btn" style="background:none; border:none; font-size:18px; cursor:pointer; color:#64748b;">✕</button>
      </div>
      <div class="cqd-modal-body">
        <div style="display:flex; gap:8px; margin-bottom:12px; align-items:center; flex-wrap: wrap;">
          <span style="font-size:12px; color:#64748b; font-weight:600;">Filter:</span>
          ${hasNotes ? `<button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="notes" style="padding:4px 8px; font-size:11px; background:#e0e7ff; border-color:#6366f1; color:#3730a3; font-weight:600;">Class Notes (${noteFiles.length})</button>` : ''}
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="all" style="padding:4px 8px; font-size:11px; ${hasNotes ? '' : 'background:#e0e7ff; border-color:#6366f1; color:#3730a3; font-weight:600;'}">All (${data.attachments.length})</button>
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="pdf" style="padding:4px 8px; font-size:11px;">PDFs (${pdfCount})</button>
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="doc" style="padding:4px 8px; font-size:11px;">Docs / Slides (${docCount})</button>
          <button class="cqd-btn cqd-btn-secondary cqd-filter-btn" data-filter="link" style="padding:4px 8px; font-size:11px;">Links (${linkCount})</button>
          <div style="margin-left:auto; display:flex; gap:6px;">
            <button id="cqd-select-all" class="cqd-btn cqd-btn-secondary" style="padding:4px 8px; font-size:11px;">Select All</button>
            <button id="cqd-deselect-all" class="cqd-btn cqd-btn-secondary" style="padding:4px 8px; font-size:11px;">Deselect All</button>
          </div>
        </div>
        <div class="cqd-file-list" id="cqd-modal-file-list"></div>
      </div>
      <div class="cqd-modal-footer">
        <div style="font-size:13px; color:#475569;">
          Selected: <b id="cqd-selected-count">${initialSelectedCount}</b> / ${data.attachments.length} files
        </div>
        <div style="display:flex; gap:8px;">
          <button id="cqd-modal-cancel" class="cqd-btn cqd-btn-secondary">Cancel</button>
          <button id="cqd-modal-download-direct" class="cqd-btn cqd-btn-primary">⬇ Download Files</button>
          <button id="cqd-modal-download-zip" class="cqd-btn cqd-btn-secondary">📦 As .ZIP</button>
        </div>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const fileListEl = card.querySelector('#cqd-modal-file-list');
    const selectedCountEl = card.querySelector('#cqd-selected-count');

    data.attachments.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'cqd-file-item';
      item.setAttribute('data-ext', file.extension || 'other');
      const isNote = file.extension !== 'link';
      item.setAttribute('data-is-note', isNote ? 'true' : 'false');
      const icon = this.getFileIcon(file.extension);

      // Pre-select real class notes by default; keep web links unchecked if class notes exist
      const isChecked = hasNotes ? isNote : true;

      item.innerHTML = `
        <label style="display:flex; align-items:center; gap:10px; flex:1; cursor:pointer;">
          <input type="checkbox" class="cqd-file-check" data-index="${index}" ${isChecked ? 'checked' : ''} style="accent-color: #4f46e5; width:17px; height:17px; cursor:pointer;" />
          <span class="cqd-file-icon">${icon}</span>
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; font-weight:500;" title="${this.escapeHtml(file.title)}">${this.escapeHtml(file.title)}</span>
          <span class="cqd-file-meta">${file.typeLabel || file.extension.toUpperCase()}</span>
        </label>
        <button type="button" class="cqd-btn cqd-btn-secondary cqd-item-dl-btn" data-index="${index}" style="padding: 3px 8px; font-size: 11px; margin-left: 8px;">
          ⬇ Save
        </button>
      `;
      fileListEl.appendChild(item);

      const dlSingleBtn = item.querySelector('.cqd-item-dl-btn');
      if (dlSingleBtn && onSingleDownload) {
        dlSingleBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          onSingleDownload(file, dlSingleBtn);
        };
      }
    });

    const updateCount = () => {
      const checked = card.querySelectorAll('.cqd-file-check:checked').length;
      selectedCountEl.textContent = checked;
      const disabled = (checked === 0);
      card.querySelector('#cqd-modal-download-direct').disabled = disabled;
      card.querySelector('#cqd-modal-download-zip').disabled = disabled;
    };

    card.querySelector('#cqd-select-all').onclick = () => {
      card.querySelectorAll('.cqd-file-check').forEach(chk => chk.checked = true);
      updateCount();
    };

    card.querySelector('#cqd-deselect-all').onclick = () => {
      card.querySelectorAll('.cqd-file-check').forEach(chk => chk.checked = false);
      updateCount();
    };

    card.querySelectorAll('.cqd-filter-btn').forEach(btn => {
      btn.onclick = () => {
        card.querySelectorAll('.cqd-filter-btn').forEach(b => {
          b.style.background = '#ffffff';
          b.style.borderColor = '#d1d5db';
          b.style.color = '#374151';
          b.style.fontWeight = 'normal';
        });
        btn.style.background = '#e0e7ff';
        btn.style.borderColor = '#6366f1';
        btn.style.color = '#3730a3';
        btn.style.fontWeight = '600';

        const filter = btn.getAttribute('data-filter');
        card.querySelectorAll('.cqd-file-item').forEach(item => {
          const ext = (item.getAttribute('data-ext') || '').toLowerCase();
          const isNote = item.getAttribute('data-is-note') === 'true';
          let match = true;
          if (filter === 'notes') match = isNote;
          if (filter === 'pdf') match = ext === 'pdf';
          if (filter === 'doc') match = ['doc', 'docx', 'gdoc', 'gslides', 'pptx', 'ppt', 'gsheet', 'xlsx', 'xls', 'csv'].includes(ext);
          if (filter === 'link') match = ext === 'link' || ext === 'url';
          item.style.display = match ? 'flex' : 'none';
        });
      };
    });

    card.querySelectorAll('.cqd-file-check').forEach(chk => {
      chk.onchange = updateCount;
    });

    card.querySelector('#cqd-close-btn').onclick = () => this.closeModal();
    card.querySelector('#cqd-modal-cancel').onclick = () => this.closeModal();

    card.querySelector('#cqd-modal-download-direct').onclick = () => {
      const selectedIndices = Array.from(card.querySelectorAll('.cqd-file-check:checked'))
        .map(el => parseInt(el.getAttribute('data-index'), 10));
      const selectedFiles = selectedIndices.map(i => data.attachments[i]);
      if (selectedFiles.length === 0) return;
      this.closeModal();
      if (onConfirmDirect) onConfirmDirect(data, selectedFiles);
    };

    card.querySelector('#cqd-modal-download-zip').onclick = () => {
      const selectedIndices = Array.from(card.querySelectorAll('.cqd-file-check:checked'))
        .map(el => parseInt(el.getAttribute('data-index'), 10));
      const selectedFiles = selectedIndices.map(i => data.attachments[i]);
      if (selectedFiles.length === 0) return;
      this.closeModal();
      if (onConfirmZip) onConfirmZip(data, selectedFiles);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeModal();
    };
  },

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
          <span>🕒</span>
          <span>Update History: <b>${this.escapeHtml(data.title || 'Assignment')}</b></span>
        </div>
        <button id="cqd-close-btn" style="background:none; border:none; font-size:18px; cursor:pointer; color:#64748b;">✕</button>
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
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeModal();
    };
  },

  closeModal() {
    const existing = document.getElementById('cqd-active-modal');
    if (existing) existing.remove();
  },

  getFileIcon(ext) {
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx':
      case 'gdoc': return '📝';
      case 'ppt':
      case 'pptx':
      case 'gslides': return '📊';
      case 'xls':
      case 'xlsx':
      case 'gsheet': return '📈';
      case 'zip':
      case 'rar':
      case '7z': return '🗄️';
      case 'jpg':
      case 'png':
      case 'gif': return '🖼️';
      case 'mp4':
      case 'mov': return '🎥';
      case 'link':
      case 'url': return '🔗';
      default: return '📁';
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
