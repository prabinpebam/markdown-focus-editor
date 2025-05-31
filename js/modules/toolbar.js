import storage from './storage.js';
import fileManager from './fileManager.js';
import theme from './theme.js'; // Assuming theme.js handles actual theme toggling logic

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
    },

    changeFontSize(delta) {
        if (!this.editorEl) return;
        let currentSize = parseFloat(getComputedStyle(this.editorEl).fontSize);
        let newSize = Math.max(8, Math.min(48, currentSize + delta)); // Clamp between 8px and 48px
        this.editorEl.style.fontSize = newSize + 'px';
        storage.saveSettings('fontSize', newSize);
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
