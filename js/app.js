import editor from './modules/editor.js';
import toolbar from './modules/toolbar.js';
import fileManager from './modules/fileManager.js';
import theme from './modules/theme.js';
import storage from './modules/storage.js';
import utils from './modules/utils.js';
import undoManager from './modules/undoManager.js'; // Import undoManager

document.addEventListener('DOMContentLoaded', () => {
    // Initialize editor functionality (handles caret, markdown formatting & focus mode)
    editor.init();
    undoManager.init(editor); // Initialize undoManager with editor instance

    // Set up toolbar events for file operations, font sizing, theme toggle & fullscreen handling
    toolbar.init();           // toolbar now handles font-size buttons

    // Wire up file saving, opening and drag-and-drop file support
    fileManager.init();

    // Toggle and apply light/dark themes based on settings
    theme.init();

    // Load persisted settings such as theme, font size, focus state, etc.
    storage.loadSettings();
});