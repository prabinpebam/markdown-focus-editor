import storage from './storage.js';
import documentStore from './documentStore.js';
import editor from './editor.js';
import theme from './theme.js';
import sanitizer from './sanitizer.js';
import markdownConverter from './markdownConverter.js';

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
                this.handleSave(true);
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

    handleSave(showIndicator = false) {
        console.log('[Toolbar] Save triggered.');
        const currentDocId = localStorage.getItem('currentDocId');
        const content = this.editorEl ? this.editorEl.innerHTML : '';

        if (currentDocId) {
            const currentDoc = documentStore.getDocumentById(currentDocId);
            if (currentDoc) {
                documentStore.updateDocument(currentDocId, { content: content });
                // Download as .md file
                this.downloadAsMarkdown(currentDoc.name || 'Untitled');
            } else {
                this.promptAndSaveNewDocument(content);
            }
        } else {
            this.promptAndSaveNewDocument(content);
        }
        if (showIndicator) this.playSaveAnimation();
    },

    /**
     * Download the current editor content as a clean .md file.
     * Converts editor HTML to standard markdown — no ZWSPs, no marker spans, no HTML tags.
     */
    downloadAsMarkdown(filename) {
        if (!this.editorEl) return;

        // Convert editor HTML to clean markdown
        const markdown = markdownConverter.editorHtmlToMarkdown(this.editorEl.innerHTML);

        // Sanitize filename for OS
        const safeName = filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
        const fullName = safeName.endsWith('.md') ? safeName : safeName + '.md';

        // Create and trigger download
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fullName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`[Toolbar] Downloaded "${fullName}" (${markdown.length} chars)`);
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
    },

    createNewDocument() {
        console.log('[Toolbar] Creating new document via button');
        
        let docName = prompt("Enter a name for the new document:", "New Document");
        if (docName === null) return; // User cancelled
        docName = docName.trim() || "New Document";

        const newDoc = documentStore.createNewDocument(docName, '<div><br></div>');
        
        if (this.editorEl) {
            this.editorEl.innerHTML = sanitizer.sanitizeHtml(newDoc.content);
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
        const currentSize = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--base-font') || '16', 10
        );
        const newSize = Math.max(8, Math.min(48, currentSize + delta));
        this.setFontSize(newSize);
    },

    setFontSize(size) {
        // Set --base-font CSS variable so ALL text scales relative to it,
        // including headings (h1–h6 use calc(var(--base-font) * multiplier))
        document.documentElement.style.setProperty('--base-font', `${size}px`);
        storage.saveSettings('fontSize', size.toString());
        console.log(`[Toolbar] Font size set to ${size}px (via --base-font)`);
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

    playSaveAnimation() {
        if (this._saveAnimating) return;
        this._saveAnimating = true;

        const dot = this.toolbarActivatorDot;
        if (!dot) { this._saveAnimating = false; return; }

        const ring = dot.querySelector('.save-progress-ring');
        const bar = dot.querySelector('.save-progress-bar');
        const checkmark = dot.querySelector('.save-checkmark');
        if (!ring || !bar || !checkmark) { this._saveAnimating = false; return; }

        // Determine contrast color based on theme
        const isDark = document.body.classList.contains('dark-theme');
        const contrastColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

        const circumference = 97.4; // 2 * π * 15.5

        // Phase 1 (0–200ms): Remove fill, expand dot to hover size, border color transitions
        dot.style.transition = 'width 0.2s ease-out, height 0.2s ease-out, background-color 0.15s ease, border-color 0.2s ease';
        dot.style.backgroundColor = 'transparent';
        dot.style.borderColor = 'red';
        // Small delay to let fill removal register, then expand
        requestAnimationFrame(() => {
            dot.style.width = '30px';
            dot.style.height = '30px';
            dot.style.borderColor = contrastColor;
        });

        // Phase 2 (200ms): Show progress ring and animate it
        setTimeout(() => {
            ring.style.opacity = '1';
            bar.style.stroke = '#2196F3';
            bar.style.transition = 'stroke-dashoffset 0.4s ease-out';
            bar.setAttribute('stroke-dashoffset', '0');
        }, 200);

        // Phase 3 (600ms): Progress complete → turn green, show checkmark
        setTimeout(() => {
            bar.style.transition = 'stroke 0.15s ease';
            bar.style.stroke = '#4CAF50';
            dot.style.backgroundColor = 'rgba(76,175,80,0.15)';
            checkmark.style.stroke = '#4CAF50';
            checkmark.style.opacity = '1';
        }, 600);

        // Phase 4 (1000ms): Hold complete state visible

        // Phase 5 (1500ms): Animate back to resting state
        setTimeout(() => {
            // Reset checkmark and ring
            checkmark.style.opacity = '0';
            checkmark.style.stroke = 'transparent';
            ring.style.opacity = '0';

            // Shrink dot back to resting state
            dot.style.transition = 'width 0.25s ease-in, height 0.25s ease-in, background-color 0.25s ease, border-color 0.25s ease';
            dot.style.width = '10px';
            dot.style.height = '10px';
            dot.style.backgroundColor = 'red';
            dot.style.borderColor = 'red';

            // Reset SVG state after transition completes
            setTimeout(() => {
                bar.style.transition = 'none';
                bar.setAttribute('stroke-dashoffset', circumference.toString());
                bar.style.stroke = '#2196F3';
                // Clear all inline styles so CSS hover rules work again
                dot.style.transition = '';
                dot.style.width = '';
                dot.style.height = '';
                dot.style.backgroundColor = '';
                dot.style.borderColor = '';
                this._saveAnimating = false;
            }, 300);
        }, 1500);
    }
};

export default toolbar;
