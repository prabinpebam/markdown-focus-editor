import storage from './storage.js';
import fileManager from './fileManager.js';
import theme from './theme.js'; // Assuming theme.js handles actual theme toggling logic
import editor from './editor.js'; // Assuming editor.js might be needed for font size application

const toolbar = {
    init() {
        this.toolbarEl = document.getElementById('toolbar');
        this.hamburgerEl = document.getElementById('hamburger');
        this.saveButton = document.getElementById('save');
        this.openFileButton = document.getElementById('open-file');
        this.fileInput = document.getElementById('file-input');
        this.increaseFontButton = document.getElementById('increase-font');
        this.decreaseFontButton = document.getElementById('decrease-font');
        this.toggleThemeButton = document.getElementById('toggle-theme');
        this.fullscreenButton = document.getElementById('fullscreen');
        this.focusToggle = document.getElementById('focus-toggle');
        this.editorEl = document.getElementById('editor'); // Needed for font size changes
        this.baseFontSize = 16; // Default base font size

        // Hamburger menu toggle
        if (this.hamburgerEl && this.toolbarEl) {
            this.hamburgerEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from immediately closing via document listener
                this.toolbarEl.classList.toggle('visible');
                this.hamburgerEl.classList.toggle('active');
            });

            // Close toolbar if clicking outside
            document.addEventListener('click', (e) => {
                if (this.toolbarEl.classList.contains('visible') && !this.toolbarEl.contains(e.target) && e.target !== this.hamburgerEl) {
                    this.toolbarEl.classList.remove('visible');
                    this.hamburgerEl.classList.remove('active');
                }
            });
        }

        // Save button
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => fileManager.saveFile());
        }

        // Open file button
        if (this.openFileButton && this.fileInput) {
            this.openFileButton.addEventListener('click', () => this.fileInput.click());
            this.fileInput.addEventListener('change', (event) => fileManager.handleFileOpen(event));
        }
        
        // Font size controls
        if (this.increaseFontButton) {
            this.increaseFontButton.addEventListener('click', () => this.changeFontSize(2));
        }
        if (this.decreaseFontButton) {
            this.decreaseFontButton.addEventListener('click', () => this.changeFontSize(-2));
        }

        // Theme toggle
        if (this.toggleThemeButton) {
            this.toggleThemeButton.addEventListener('click', () => theme.toggleTheme());
        }

        // Fullscreen toggle
        if (this.fullscreenButton) {
            this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        }

        // Focus mode toggle
        if (this.focusToggle) {
            this.focusToggle.addEventListener('change', (e) => {
                storage.saveSettings('focusEnabled', e.target.checked);
                // The editor module itself will react to this change if it needs to re-apply formatting
                // For now, we assume editor.formatContent() or similar will pick up the state.
                // Or, if editor needs to be explicitly told:
                // editor.setFocusMode(e.target.checked); 
            });
        }

        // Add event listener to document to hide toolbar when clicking outside
        document.addEventListener('click', (event) => {
            if (this.toolbarEl && this.toolbarEl.classList.contains('visible')) {
                // Check if the click is outside the toolbar and not on the hamburger button
                if (!this.toolbarEl.contains(event.target) && event.target !== this.hamburgerEl) {
                    this.hideToolbar();
                }
            }
        });
    },

    toggleToolbar() {
        if (this.toolbarEl) {
            this.toolbarEl.classList.toggle('visible');
            this.hamburgerEl.classList.toggle('active');
        }
    },

    hideToolbar() {
        if (this.toolbarEl) {
            this.toolbarEl.classList.remove('visible');
            this.hamburgerEl.classList.remove('active');
        }
    },

    changeFontSize(delta) {
        let currentSize = parseInt(getComputedStyle(document.body).getPropertyValue('--base-font'), 10) || this.baseFontSize;
        let newSize = currentSize + delta;
        newSize = Math.max(8, Math.min(newSize, 48)); // Clamp between 8px and 48px
        this.setFontSize(newSize);
    },

    setFontSize(size) {
        document.body.style.setProperty('--base-font', `${size}px`);
        this.baseFontSize = size; // Update internal tracking
        storage.saveSettings('fontSize', size);
        // If editor element directly uses font-size, update it too
        if (editor.editorEl) {
            // This might be redundant if editor's CSS inherits --base-font,
            // but explicit set ensures it if editor has its own specific font-size rule.
            // editor.editorEl.style.fontSize = `${size}px`;
        }
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                // alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
};

export default toolbar;
