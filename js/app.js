import editor from './modules/editor.js';
import toolbar from './modules/toolbar.js';
import fileManager from './modules/fileManager.js';
import theme from './modules/theme.js';
import storage from './modules/storage.js';
import utils from './modules/utils.js';
import undoManager from './modules/undoManager.js'; // Correctly import default
import inlineStyleManager from './modules/inlineStyleManager.js'; // Import new manager
import focusMode from './modules/focusMode.js'; // Import focus mode module

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM content loaded, initializing modules');
    
    // Initialize editor functionality (handles caret, markdown formatting & focus mode)
    editor.init();
    console.log('[App] Editor initialized');

    // Set up toolbar events for file operations, font sizing, theme toggle & fullscreen handling
    toolbar.init();
    console.log('[App] Toolbar initialized');

    // Wire up file saving, opening and drag-and-drop file support
    fileManager.init();
    console.log('[App] FileManager initialized');

    // Toggle and apply light/dark themes based on settings
    theme.init();
    console.log('[App] Theme initialized');

    // Initialize UndoManager and make it available to the editor instance
    undoManager.init(editor);
    editor.undoManager = undoManager; // Make undoManager accessible from editor instance
    console.log('[App] UndoManager initialized and linked to editor');

    // Initialize InlineStyleManager
    inlineStyleManager.init(editor); // Pass editor instance
    editor.inlineStyleManager = inlineStyleManager; // Make it accessible from editor instance
    console.log('[App] InlineStyleManager initialized and linked to editor');
    
    // Initialize FocusMode
    focusMode.init(editor); // Pass editor instance
    editor.focusMode = focusMode; // Make it accessible from editor instance
    console.log('[App] FocusMode initialized and linked to editor');

    // Load persisted settings such as theme, font size, focus state, etc.
    storage.loadSettings(); // Should ideally be called after editor and other modules are ready
    console.log('[App] Settings loaded from storage');

    // After content is loaded by storage.loadSettings(), record the initial state.
    // This assumes storage.loadSettings() synchronously updates editor.editorEl.innerHTML
    // If it's asynchronous, this call needs to be after the async operation completes.
    editor.undoManager.recordInitialState(); 
    console.log('[App] Initial editor state recorded for undo system');
    
    console.log('[App] Initialization complete');
});