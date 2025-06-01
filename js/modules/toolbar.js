import storage from './storage.js';
import editor from './editor.js';

const toolbar = {
    toolbarElement: null, // This is the #toolbar div which morphs
    // toolbarActivatorDot: null, // Not directly manipulated by JS for its primary animation
    isToolbarActive: false,

    init() {
        this.toolbarElement = document.getElementById('toolbar');
        // this.toolbarActivatorDot = document.getElementById('toolbar-activator-dot'); // If needed

        this.increaseFontButton = document.getElementById('increase-font');
        this.decreaseFontButton = document.getElementById('decrease-font');
        this.baseFontSize = 16; // Default base font size

        if (this.toolbarElement) {
            this.toolbarElement.addEventListener('click', (event) => {
                // If the toolbar is not active, a click on it should open it.
                if (!this.isToolbarActive) {
                    // Check if the click is on the toolbarElement itself (the 30x30 area)
                    // and not on one of its children that might become visible later.
                    // Since buttons are hidden when not active, this mainly ensures the 30x30 area is clicked.
                    if (event.target === this.toolbarElement || event.target === this.toolbarElement.querySelector('#toolbar-activator-dot')) {
                        event.stopPropagation(); 
                        this.openToolbar();
                    }
                }
                // If toolbar is active, clicks on buttons inside are handled by their own listeners.
                // Clicks on the padding of the active toolbar should not close it here.
            });
        }

        if (this.increaseFontButton) {
            this.increaseFontButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent toolbar from closing if it's open
                this.changeFontSize(2);
            });
        }
        if (this.decreaseFontButton) {
            this.decreaseFontButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent toolbar from closing if it's open
                this.changeFontSize(-2);
            });
        }
        // Add stopPropagation to other toolbar button/control event listeners if needed

        document.addEventListener('click', (event) => {
            if (this.isToolbarActive && this.toolbarElement) {
                // If toolbar is active and click is outside the toolbar element
                if (!this.toolbarElement.contains(event.target)) {
                    this.closeToolbar();
                }
            }
        });
    },

    openToolbar() {
        if (this.toolbarElement && !this.isToolbarActive) {
            this.toolbarElement.classList.add('is-toolbar-active');
            this.isToolbarActive = true;
        }
    },

    closeToolbar() {
        if (this.toolbarElement && this.isToolbarActive) {
            this.toolbarElement.classList.remove('is-toolbar-active');
            this.isToolbarActive = false;
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
    }
};

export default toolbar;
