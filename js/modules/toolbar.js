import storage from './storage.js';
import documentStore from './documentStore.js';
import editor from './editor.js';
import theme from './theme.js';

const toolbar = {
    editorEl: null,
    saveBtn: null,
    openBtn: null,
    newDocBtn: null,
    increaseFontBtn: null,
    decreaseFontBtn: null,
    toggleThemeBtn: null,
    fullscreenBtn: null,
    toolbarElement: null,
    toolbarActivatorDot: null,
    isExpanded: false,

    init() {
        console.log('[Toolbar] Initializing...');
        
        this.editorEl = document.getElementById('editor');
        this.toolbarElement = document.getElementById('toolbar');
        this.toolbarActivatorDot = document.getElementById('toolbar-activator-dot');
        this.saveBtn = document.getElementById('save');
        this.openBtn = document.getElementById('open-file');
        this.newDocBtn = document.getElementById('new-document');
        this.increaseFontBtn = document.getElementById('increase-font');
        this.decreaseFontBtn = document.getElementById('decrease-font');
        this.toggleThemeBtn = document.getElementById('toggle-theme');
        this.fullscreenBtn = document.getElementById('fullscreen');

        // Setup toolbar expansion/collapse
        this.setupToolbarToggle();

        // Bind event listeners
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.handleSave());
            console.log('[Toolbar] Save button listener added');
        }
        
        if (this.openBtn) {
            this.openBtn.addEventListener('click', () => {
                console.log('[Toolbar] Open button clicked');
                this.handleOpen();
            });
            console.log('[Toolbar] Open button listener added');
        }
        
        if (this.newDocBtn) {
            this.newDocBtn.addEventListener('click', () => this.createNewDocument());
            console.log('[Toolbar] New document button listener added');
        }
        
        if (this.increaseFontBtn) {
            this.increaseFontBtn.addEventListener('click', () => this.adjustFontSize(2));
        }
        
        if (this.decreaseFontBtn) {
            this.decreaseFontBtn.addEventListener('click', () => this.adjustFontSize(-2));
        }
        
        if (this.toggleThemeBtn) {
            this.toggleThemeBtn.addEventListener('click', () => this.handleThemeToggle());
        }
        
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('[Toolbar] Initialized successfully');
    },

    setupToolbarToggle() {
        if (!this.toolbarElement) {
            console.error('[Toolbar] Toolbar element not found');
            return;
        }

        // Click on toolbar to toggle expansion
        this.toolbarElement.addEventListener('click', (e) => {
            // Don't toggle if clicking on buttons or their children
            if (e.target.closest('button') || e.target.closest('label') || e.target.closest('input')) {
                return;
            }
            
            console.log('[Toolbar] Toolbar clicked, toggling expansion');
            this.toggleToolbar();
        });

        // Close toolbar when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isExpanded && !this.toolbarElement.contains(e.target)) {
                console.log('[Toolbar] Clicked outside, collapsing toolbar');
                this.collapseToolbar();
            }
        });

        // Initial state - collapsed (CSS handles this by default)
        this.isExpanded = false;
    },

    toggleToolbar() {
        if (this.isExpanded) {
            this.collapseToolbar();
        } else {
            this.expandToolbar();
        }
    },

    expandToolbar() {
        if (!this.toolbarElement) return;
        
        // Use the CSS class that's already defined
        this.toolbarElement.classList.add('is-toolbar-active');
        this.isExpanded = true;
        console.log('[Toolbar] Toolbar expanded');
    },

    collapseToolbar() {
        if (!this.toolbarElement) return;
        
        // Remove the CSS class to collapse
        this.toolbarElement.classList.remove('is-toolbar-active');
        this.isExpanded = false;
        console.log('[Toolbar] Toolbar collapsed');
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Save - Ctrl+S
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                console.log('[Toolbar] Ctrl+S pressed');
                this.handleSave();
                return;
            }
            
            // New Document - Ctrl+N
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                console.log('[Toolbar] Ctrl+N pressed');
                this.createNewDocument();
                return;
            }
            
            // Save As - Ctrl+Shift+S
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                console.log('[Toolbar] Ctrl+Shift+S pressed');
                this.promptAndSaveNewDocument(this.editorEl ? this.editorEl.innerHTML : '');
                return;
            }
        });
        console.log('[Toolbar] Keyboard shortcuts set up');
    },

    handleOpen() {
        console.log('[Toolbar] handleOpen called');
        // Import modalManager dynamically to avoid circular dependency
        import('./modalManager.js').then(module => {
            const modalManager = module.default;
            if (modalManager && modalManager.openModal) {
                console.log('[Toolbar] Opening modal via modalManager');
                modalManager.openModal();
            } else {
                console.error('[Toolbar] ModalManager not available or openModal method missing');
            }
        }).catch(err => {
            console.error('[Toolbar] Error importing modalManager:', err);
        });
    },

    handleSave() {
        console.log('[Toolbar] Save button clicked.');
        const currentDocId = localStorage.getItem('currentDocId');
        const content = this.editorEl ? this.editorEl.innerHTML : '';

        if (currentDocId) {
            const currentDoc = documentStore.getDocumentById(currentDocId);
            if (currentDoc) {
                documentStore.updateDocument(currentDocId, { content: content });
                this.showSaveNotification(`Document "${currentDoc.name}" saved.`);
            } else {
                this.promptAndSaveNewDocument(content);
            }
        } else {
            this.promptAndSaveNewDocument(content);
        }
    },
    
    promptAndSaveNewDocument(content) {
        let docName = prompt("Enter a name for your new document:", "Untitled Document");
        if (docName === null) return; // User cancelled
        docName = docName.trim() || "Untitled Document";
        
        const newDoc = documentStore.createNewDocument(docName, content);
        localStorage.setItem('currentDocId', newDoc.id);
        if (editor.undoManager) {
            setTimeout(() => {
                editor.undoManager.recordInitialState();
            }, 50);
        }
        this.showSaveNotification(`Document "${newDoc.name}" saved.`);
    },

    createNewDocument() {
        console.log('[Toolbar] Creating new document via button');
        
        let docName = prompt("Enter a name for the new document:", "New Document");
        if (docName === null) return; // User cancelled
        docName = docName.trim() || "New Document";

        const newDoc = documentStore.createNewDocument(docName, '<div><br></div>');
        
        if (this.editorEl) {
            this.editorEl.innerHTML = newDoc.content;
            this.editorEl.focus();
        }
        
        localStorage.setItem('currentDocId', newDoc.id);
        
        if (editor.undoManager) {
            editor.undoManager.clearHistory();
            setTimeout(() => {
                if (editor.undoManager && editor.editorEl) {
                    editor.undoManager.recordInitialState();
                    console.log('[Toolbar] Initial state recorded for new document');
                }
            }, 50);
        }
        
        console.log(`[Toolbar] New document "${newDoc.name}" created and activated.`);
        
        if (editor.focusMode) {
            editor.focusMode.updateFocusIfActive();
        }
    },
    
    adjustFontSize(delta) {
        if (!this.editorEl) return;
        const currentSize = parseInt(window.getComputedStyle(this.editorEl).fontSize, 10);
        const newSize = Math.max(8, currentSize + delta);
        this.setFontSize(newSize);
    },

    setFontSize(size) {
        if (this.editorEl) {
            this.editorEl.style.fontSize = `${size}px`;
            storage.saveSettings('fontSize', size.toString());
            console.log(`[Toolbar] Font size set to ${size}px`);
        }
    },

    handleThemeToggle() {
        if (theme && theme.toggleTheme) {
            theme.toggleTheme();
        } else {
            console.error('[Toolbar] Theme module not available');
        }
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    },

    showSaveNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
};

export default toolbar;
