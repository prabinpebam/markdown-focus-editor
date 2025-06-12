import editor from './modules/editor.js';
import toolbar from './modules/toolbar.js';
import fileManager from './modules/fileManager.js';
import theme from './modules/theme.js';
import storage from './modules/storage.js';
import utils from './modules/utils.js';
import undoManager from './modules/undoManager.js'; // Correctly import default
import inlineStyleManager from './modules/inlineStyleManager.js'; // Import new manager
import focusMode from './modules/focusMode.js'; // Import focus mode module
import documentStore from './modules/documentStore.js'; // Ensure this is imported
import modalManager from './modules/modalManager.js'; // Ensure this is imported

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM content loaded, initializing modules');
    
    // Initialize document store early, as other modules might depend on it.
    // documentStore itself doesn't have an init(), it's an object literal.
    // So, just by importing it, it's "available".

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

    // Initialize the document modal manager
    modalManager.init(); // Ensure modalManager is initialized
    console.log('[App] ModalManager initialized');

    // Load persisted settings such as theme, font size, focus state, etc.
    storage.loadSettings(); // Should ideally be called after editor and other modules are ready
    console.log('[App] Settings loaded from storage');

    // After content is loaded by storage.loadSettings(), record the initial state.
    // This assumes storage.loadSettings() synchronously updates editor.editorEl.innerHTML
    // If it's asynchronous, this call needs to be after the async operation completes.
    setTimeout(() => {
        if (editor.undoManager && editor.editorEl) {
            editor.undoManager.recordInitialState(); 
            console.log('[App] Initial editor state recorded for undo system');
        } else {
            console.error('[App] Cannot record initial state - undoManager or editorEl missing');
        }
    }, 100);
    
    console.log('[App] Initialization complete');
});

// Consolidated keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+O - Open document modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        console.log('[App] Ctrl+O pressed - opening modal');
        // Import modalManager dynamically to avoid circular dependency
        import('./modules/modalManager.js').then(module => {
            const modalManager = module.default;
            if (modalManager && modalManager.openModal) {
                modalManager.openModal();
            } else {
                console.error('[App] ModalManager not available');
            }
        }).catch(err => {
            console.error('[App] Error importing modalManager:', err);
        });
        return;
    }
    
    // Note: Other shortcuts (Ctrl+S, Ctrl+N, etc.) are handled in toolbar.js
    // to avoid conflicts and ensure proper module encapsulation
});