import storage from './storage.js';
import editor from './editor.js';

const toolbar = {
    toolbarElement: null, // This is the main #toolbar div which is the activator
    // toolbarActivatorDot: null, // Not directly manipulated by JS for its primary animation
    // toolbarContent: null, // Buttons are direct children of toolbarElement now
    isToolbarActive: false,

    init() {
        this.toolbarElement = document.getElementById('toolbar'); 
        // this.toolbarContent = document.getElementById('toolbar'); // Redundant, toolbarElement is the container

        this.increaseFontButton = document.getElementById('increase-font');
        this.decreaseFontButton = document.getElementById('decrease-font');
        this.fullscreenButton = document.getElementById('fullscreen');
        this.baseFontSize = 16;

        if (this.toolbarElement) {
            this.toolbarElement.addEventListener('click', (event) => {
                // If the toolbar is NOT active, a click on it should open it.
                if (!this.isToolbarActive) {
                    // Check if the click was directly on the toolbarElement (the activator area)
                    // or on the dot (which has pointer-events: none, so click goes to parent).
                    // This condition ensures that if somehow a button inside was clicked while
                    // isToolbarActive is false (which shouldn't happen due to CSS), it doesn't open.
                    // A simpler check: if it's not active, any click on it should try to open.
                    event.stopPropagation(); // Important to prevent immediate close by document listener
                    this.openToolbar();
                }
                // If the toolbar IS active, clicks on its children (buttons) should be handled by their own
                // listeners. Clicks on the toolbar's padding area (if any) should not close it.
                // The closing is handled by the document click listener for clicks *outside*.
            });
        }

        if (this.increaseFontButton) {
            this.increaseFontButton.addEventListener('click', () => this.changeFontSize(2));
        }
        if (this.decreaseFontButton) {
            this.decreaseFontButton.addEventListener('click', () => this.changeFontSize(-2));
        }
        if (this.fullscreenButton) { // Add event listener for fullscreen
            this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        }

        document.addEventListener('click', (event) => {
            if (this.isToolbarActive && this.toolbarElement) {
                // If toolbar is active and click is outside the toolbarElement
                if (!this.toolbarElement.contains(event.target)) {
                    this.closeToolbar();
                }
            }
        });

        // Listen for fullscreen changes to update button state
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('MSFullscreenChange', () => this.updateFullscreenButton());
    },

    openToolbar() {
        if (this.toolbarElement && !this.isToolbarActive) {
            this.toolbarElement.classList.add('is-toolbar-active');
            this.isToolbarActive = true;
            // console.log('Toolbar opened');
        }
    },

    closeToolbar() {
        if (this.toolbarElement && this.isToolbarActive) {
            this.toolbarElement.classList.remove('is-toolbar-active');
            this.isToolbarActive = false;
            // console.log('Toolbar closed');
        }
    },

    toggleFullscreen() {
        if (!document.fullscreenElement &&
            !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { // Standard, Firefox, Chrome/Safari/Opera, IE/Edge
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (document.documentElement.msRequestFullscreen) { /* IE/Edge */
                document.documentElement.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
        }
        // The updateFullscreenButton method will be called by the 'fullscreenchange' event
    },

    updateFullscreenButton() {
        if (!this.fullscreenButton || !this.fullscreenButton.querySelector('img')) return;

        const img = this.fullscreenButton.querySelector('img');
        if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            img.src = 'images/fullscreen-exit.svg'; // Assume you have an exit icon
            img.alt = 'Exit Fullscreen';
            this.fullscreenButton.title = 'Exit Fullscreen';
        } else {
            img.src = 'images/fullscreen.svg';
            img.alt = 'Toggle Fullscreen';
            this.fullscreenButton.title = 'Toggle Fullscreen';
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
