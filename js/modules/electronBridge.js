/**
 * electronBridge.js — Renderer-side Electron IPC integration.
 * Only active when running inside Electron (window.electronAPI exists).
 * In web mode, this module exports no-ops.
 */

import editor from './editor.js';
import markdownConverter from './markdownConverter.js';
import toolbar from './toolbar.js';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

let autoSaveTimer = null;
let autoSaveDisabled = false; // Disabled for read-only files
let saveToastTimer = null;

const electronBridge = {
  isElectron,

  init() {
    if (!isElectron) return;

    // Show the title bar
    const titleBar = document.getElementById('title-bar');
    if (titleBar) {
      titleBar.style.display = 'flex';
      document.body.classList.add('has-title-bar');
    }

    this._setupWindowControls();
    this._setupIpcListeners();
    this._setupAutoSave();
    this._setupKeyboardShortcuts();
    this._setupDragDrop();
    this._setupFullscreenListener();

    console.log('[ElectronBridge] Initialized');
  },

  _setupWindowControls() {
    const api = window.electronAPI;

    document.getElementById('btn-minimize')?.addEventListener('click', () => {
      api.send('window-minimize');
    });

    document.getElementById('btn-maximize')?.addEventListener('click', () => {
      api.send('window-maximize');
    });

    document.getElementById('btn-close')?.addEventListener('click', () => {
      api.send('window-close');
    });

    // Double-click title bar to toggle maximize
    const titleBar = document.getElementById('title-bar');
    if (titleBar) {
      titleBar.addEventListener('dblclick', (e) => {
        if (e.target === titleBar || e.target.id === 'title-left' || e.target.id === 'title-text') {
          api.send('window-maximize');
        }
      });
    }
  },

  _setupIpcListeners() {
    const api = window.electronAPI;

    // File opened from main process (Ctrl+O, CLI, recent file)
    api.on('file-opened', (data) => {
      const editorEl = document.getElementById('editor');
      if (editorEl) {
        const html = markdownConverter.markdownToEditorHtml(data.content);
        editorEl.innerHTML = html;

        if (editor.undoManager) {
          editor.undoManager.recordInitialState();
        }
      }
      // Set full path tooltip
      const titleText = document.getElementById('title-text');
      if (titleText) {
        titleText.title = data.path || '';
      }
      // Handle read-only files
      if (data.readOnly) {
        autoSaveDisabled = true;
        this._showNotificationBar(
          `${data.name} is read-only. Use Save As to save changes.`,
          [{ label: 'Save As…', action: () => this._handleSaveAs() },
           { label: 'Dismiss', action: () => this._hideNotificationBar() }]
        );
      } else {
        // Re-enable auto-save for new file
        autoSaveDisabled = false;
        this._hideNotificationBar();
      }
      console.log(`[ElectronBridge] File opened: ${data.name}`);
    });

    // File saved confirmation — handled by toolbar dot animation, no toast needed
    api.on('file-saved', (data) => {
      console.log(`[ElectronBridge] File saved: ${data.name}`);
    });

    // File error notification
    api.on('file-error', (data) => {
      console.error(`[ElectronBridge] File error (${data.action}):`, data.message);

      if (data.code === 'READONLY') {
        autoSaveDisabled = true;
        this._showNotificationBar(
          data.message,
          [{ label: 'Save As…', action: () => this._handleSaveAs() },
           { label: 'Dismiss', action: () => this._hideNotificationBar() }]
        );
      } else if (data.code === 'DISK_FULL') {
        this._showNotificationBar(
          data.message,
          [{ label: 'Save As…', action: () => this._handleSaveAs() },
           { label: 'Dismiss', action: () => this._hideNotificationBar() }]
        );
      } else if (data.code === 'NOT_FOUND') {
        this._showNotificationBar(
          data.message,
          [{ label: 'Dismiss', action: () => this._hideNotificationBar() }]
        );
      } else {
        this._showNotificationBar(
          data.message,
          [{ label: 'Dismiss', action: () => this._hideNotificationBar() }]
        );
      }
    });

    // External file change
    api.on('file-external-change', (data) => {
      if (data.type === 'deleted') {
        this._showNotificationBar(
          'File was deleted externally.',
          [{ label: 'Save As…', action: () => this._handleSaveAs() },
           { label: 'Dismiss', action: () => this._hideNotificationBar() }]
        );
      } else if (data.type === 'modified') {
        this._showNotificationBar(
          'File was modified externally.',
          [{ label: 'Reload', action: async () => {
              await api.invoke('file:reload');
              this._hideNotificationBar();
            }},
           { label: 'Ignore', action: () => this._hideNotificationBar() }]
        );
      }
    });

    // Title bar update from main process
    api.on('title-bar-update', (data) => {
      this._updateTitleBar(data.filename, data.state);
    });

    // Main process requesting content for save-on-close
    api.on('request-content-for-save', () => {
      const content = this._getMarkdownContent();
      if (content !== null) {
        api.send('save-content', content);
      }
    });
  },

  _setupAutoSave() {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return;

    editorEl.addEventListener('input', () => {
      if (autoSaveDisabled) return;

      clearTimeout(autoSaveTimer);

      // Show unsaved indicator
      window.electronAPI.send('title-bar-unsaved', true);

      autoSaveTimer = setTimeout(async () => {
        const filePath = await window.electronAPI.invoke('file:getPath');
        if (filePath) {
          const content = this._getMarkdownContent();
          if (content !== null) {
            const saved = await window.electronAPI.invoke('file:save', filePath, content);
            if (saved) {
              window.electronAPI.send('title-bar-unsaved', false);
            }
          }
        }
      }, 500);
    });
  },

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      if (!isElectron) return;

      const api = window.electronAPI;

      // Ctrl+O — Open file
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        e.stopPropagation();
        await api.invoke('dialog:openFile');
        return;
      }

      // Ctrl+S — Save
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        await this._handleSave();
        return;
      }

      // Ctrl+Shift+S — Save As
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        await this._handleSaveAs();
        return;
      }

      // Ctrl+N — New file
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        await this._handleNew();
        return;
      }
    }, true); // Capture phase
  },

  _setupDragDrop() {
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')) {
          const text = await file.text();
          const editorEl = document.getElementById('editor');
          if (editorEl) {
            const html = markdownConverter.markdownToEditorHtml(text);
            editorEl.innerHTML = html;
            if (editor.undoManager) {
              editor.undoManager.recordInitialState();
            }
          }
        }
      }
    });
  },

  _setupFullscreenListener() {
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        document.body.classList.add('fullscreen');
      } else {
        document.body.classList.remove('fullscreen');
      }
    });

    // Also handle F11 fullscreen via Electron
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F11' && isElectron) {
        document.body.classList.toggle('fullscreen');
      }
    });
  },

  async _handleSave() {
    const api = window.electronAPI;
    let filePath = await api.invoke('file:getPath');

    if (!filePath) {
      filePath = await api.invoke('dialog:saveFile');
      if (!filePath) return;
    }

    const content = this._getMarkdownContent();
    if (content !== null) {
      const saved = await api.invoke('file:save', filePath, content);
      if (saved) {
        api.send('title-bar-unsaved', false);
        toolbar.playSaveAnimation();
      }
    }
  },

  async _handleSaveAs() {
    const api = window.electronAPI;
    const filePath = await api.invoke('dialog:saveFile');
    if (!filePath) return;

    const content = this._getMarkdownContent();
    if (content !== null) {
      const saved = await api.invoke('file:save', filePath, content);
      if (saved) {
        api.send('title-bar-unsaved', false);
        autoSaveDisabled = false; // Re-enable auto-save for new location
        this._hideNotificationBar();
      }
    }
  },

  async _handleNew() {
    const api = window.electronAPI;

    // Auto-save current file first
    const currentPath = await api.invoke('file:getPath');
    if (currentPath && !autoSaveDisabled) {
      const content = this._getMarkdownContent();
      if (content !== null) {
        await api.invoke('file:save', currentPath, content);
      }
    }

    // Tell main to reset file path
    await api.invoke('file:newFile');

    // Clear editor
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.innerHTML = '<div><br></div>';
      if (editor.undoManager) {
        editor.undoManager.recordInitialState();
      }
    }

    autoSaveDisabled = false;
    this._hideNotificationBar();
  },

  _updateTitleBar(filename, state) {
    const titleBar = document.getElementById('title-bar');
    const titleText = document.getElementById('title-text');
    const unsavedDot = document.getElementById('title-unsaved-dot');
    if (!titleBar || !titleText) return;

    titleText.textContent = filename || 'Untitled';

    // Reset state classes
    titleBar.classList.remove('untitled', 'deleted', 'readonly');

    if (state === 'untitled') {
      titleBar.classList.add('untitled');
      titleText.title = '';
    } else if (state === 'deleted') {
      titleBar.classList.add('deleted');
    } else if (state === 'readonly') {
      titleBar.classList.add('readonly');
    }

    // Unsaved dot
    if (unsavedDot) {
      if (state === 'unsaved') {
        unsavedDot.classList.remove('hidden');
      } else {
        unsavedDot.classList.add('hidden');
      }
    }

    // Set tooltip with full path (will be set when file-opened fires)
    // Full path comes through file-opened data, stored via title attribute
  },

  // ── Notification Bar ──

  _showNotificationBar(message, buttons) {
    const bar = document.getElementById('notification-bar');
    const textEl = document.getElementById('notification-text');
    const actionsEl = document.getElementById('notification-actions');
    if (!bar || !textEl || !actionsEl) return;

    textEl.textContent = message;
    actionsEl.innerHTML = '';

    for (const btn of buttons) {
      const button = document.createElement('button');
      button.textContent = btn.label;
      button.addEventListener('click', btn.action);
      actionsEl.appendChild(button);
    }

    bar.style.display = 'flex';
    document.body.classList.add('has-notification-bar');
  },

  _hideNotificationBar() {
    const bar = document.getElementById('notification-bar');
    if (bar) {
      bar.style.display = 'none';
      document.body.classList.remove('has-notification-bar');
    }
  },

  // ── Save Toast ──

  _showSaveToast(message) {
    const toast = document.getElementById('save-toast');
    if (!toast) return;

    clearTimeout(saveToastTimer);
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('visible');

    saveToastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.classList.add('hidden'), 200);
    }, 2000);
  },

  _getMarkdownContent() {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return null;
    return markdownConverter.editorHtmlToMarkdown(editorEl.innerHTML);
  },
};

export default electronBridge;
