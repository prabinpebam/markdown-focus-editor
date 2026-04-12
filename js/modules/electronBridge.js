/**
 * electronBridge.js — Renderer-side Electron IPC integration.
 * Only active when running inside Electron (window.electronAPI exists).
 * In web mode, this module exports no-ops.
 */

import editor from './editor.js';
import markdownConverter from './markdownConverter.js';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

let autoSaveTimer = null;
let currentFilePath = null;

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
        // Only on the drag region, not on buttons
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
      currentFilePath = data.path;
      const editorEl = document.getElementById('editor');
      if (editorEl) {
        // Convert markdown to editor HTML
        const html = markdownConverter.markdownToEditorHtml(data.content);
        editorEl.innerHTML = html;

        // Record for undo
        if (editor.undoManager) {
          editor.undoManager.recordInitialState();
        }
      }
      console.log(`[ElectronBridge] File opened: ${data.name}`);
    });

    // File error notification
    api.on('file-error', (data) => {
      console.error(`[ElectronBridge] File error (${data.action}):`, data.message);
    });

    // External file change
    api.on('file-external-change', (data) => {
      if (data.type === 'deleted') {
        console.warn('[ElectronBridge] File deleted externally');
        // Title bar will show (deleted) via main process
      } else if (data.type === 'modified') {
        // For now, just log. Could show a notification to reload.
        console.log('[ElectronBridge] File modified externally');
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
      clearTimeout(autoSaveTimer);

      // Show unsaved indicator
      window.electronAPI.send('title-bar-unsaved', true);

      autoSaveTimer = setTimeout(async () => {
        const filePath = await window.electronAPI.invoke('file:getPath');
        if (filePath) {
          const content = this._getMarkdownContent();
          if (content !== null) {
            await window.electronAPI.invoke('file:save', filePath, content);
            window.electronAPI.send('title-bar-unsaved', false);
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
    }, true); // Use capture phase to intercept before web handlers
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

  async _handleSave() {
    const api = window.electronAPI;
    let filePath = await api.invoke('file:getPath');

    if (!filePath) {
      // Untitled → trigger Save As
      filePath = await api.invoke('dialog:saveFile');
      if (!filePath) return; // User cancelled
    }

    const content = this._getMarkdownContent();
    if (content !== null) {
      await api.invoke('file:save', filePath, content);
      api.send('title-bar-unsaved', false);
    }
  },

  async _handleSaveAs() {
    const api = window.electronAPI;
    const filePath = await api.invoke('dialog:saveFile');
    if (!filePath) return;

    const content = this._getMarkdownContent();
    if (content !== null) {
      await api.invoke('file:save', filePath, content);
      api.send('title-bar-unsaved', false);
    }
  },

  async _handleNew() {
    const api = window.electronAPI;

    // Auto-save current file first
    const currentPath = await api.invoke('file:getPath');
    if (currentPath) {
      const content = this._getMarkdownContent();
      if (content !== null) {
        await api.invoke('file:save', currentPath, content);
      }
    }

    // Clear editor
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.innerHTML = '<div><br></div>';
      if (editor.undoManager) {
        editor.undoManager.recordInitialState();
      }
    }

    // Reset title
    currentFilePath = null;
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
    } else if (state === 'deleted') {
      titleBar.classList.add('deleted');
    }

    // Unsaved dot
    if (unsavedDot) {
      if (state === 'unsaved') {
        unsavedDot.classList.remove('hidden');
      } else {
        unsavedDot.classList.add('hidden');
      }
    }
  },

  _getMarkdownContent() {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return null;
    return markdownConverter.editorHtmlToMarkdown(editorEl.innerHTML);
  },
};

export default electronBridge;
