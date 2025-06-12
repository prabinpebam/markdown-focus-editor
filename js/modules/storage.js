import editor from './editor.js';
import theme from './theme.js';
import toolbar from './toolbar.js';
import documentStore from './documentStore.js';

const storage = {
    loadSettings() {
        console.log('[Storage] Loading settings from localStorage');
        const editorEl = document.getElementById('editor'); // Get editor element once

        // Load and apply theme
        const themePref = localStorage.getItem('theme') || 'light'; // Default to 'light' string
        theme.applyTheme(themePref);
        console.log(`[Storage] Applied theme: ${themePref}`);

        // Load and apply font family
        const fontFamily = localStorage.getItem('fontFamily');
        if (fontFamily && editorEl) {
            editorEl.style.fontFamily = fontFamily;
            console.log(`[Storage] Applied font family: ${fontFamily}`);
        }

        // Load and apply font size (use toolbar's method for consistency)
        const fontSize = localStorage.getItem('fontSize'); // This will be a string e.g. "16"
        if (fontSize && toolbar.setFontSize) {
            toolbar.setFontSize(parseInt(fontSize, 10)); // Ensure it's a number
            console.log(`[Storage] Applied font size: ${fontSize}px`);
        }

        // Load and set focus mode toggle
        const focusEnabled = localStorage.getItem('focusEnabled'); // String "true" or "false"
        const focusToggle = document.getElementById('focus-toggle');
        if (focusToggle && focusEnabled !== null) {
            focusToggle.checked = (focusEnabled === 'true');
            console.log(`[Storage] Set focus toggle: ${focusEnabled}`);
            // The focusMode module will handle applying the focus effect after initialization
        }

        // Check if there's a current document ID
        let currentDocId = localStorage.getItem('currentDocId');
        let docToLoad = null;

        if (currentDocId) {
            docToLoad = documentStore.getDocumentById(currentDocId);
            if (docToLoad) {
                console.log(`[Storage] Found current document by ID: ${currentDocId}`);
            } else {
                console.warn(`[Storage] Current document ID ${currentDocId} not found in store. Clearing.`);
                localStorage.removeItem('currentDocId');
                currentDocId = null; // Ensure it's null for fallback logic
            }
        }

        if (docToLoad && editorEl) {
            editorEl.innerHTML = docToLoad.content;
        } else {
            // Fallback: No current valid doc, or no currentDocId at all
            const allDocs = documentStore.getAllDocuments();
            if (allDocs.length > 0) {
                // Load the most recently edited document if no specific currentDocId or if it was invalid
                const mostRecentDoc = allDocs.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited))[0];
                if (mostRecentDoc && editorEl) {
                    editorEl.innerHTML = mostRecentDoc.content;
                    localStorage.setItem('currentDocId', mostRecentDoc.id);
                    console.log(`[Storage] Loaded most recent document: ${mostRecentDoc.id}`);
                }
            } else {
                // No documents in store, load lastContent if any, or default to blank
                const lastContent = localStorage.getItem('lastContent'); // Legacy fallback
                if (lastContent && editorEl) {
                    editorEl.innerHTML = lastContent;
                    console.log(`[Storage] Loaded legacy lastContent (${lastContent.length} chars)`);
                } else if (editorEl && editorEl.innerHTML.trim() === '') { // Only if editor is truly empty
                    // If truly no content and no docs, create a first default document
                    const firstDoc = documentStore.createNewDocument('My First Document', '<div>Welcome! Start typing here.<br></div>');
                    editorEl.innerHTML = firstDoc.content;
                     localStorage.setItem('currentDocId', firstDoc.id); // Already set by createNewDocument
                    console.log('[Storage] Created and loaded first default document.');
                }
            }
        }
        // Note: editor.undoManager.recordInitialState(); in app.js handles initial undo state.
    },

    saveSettings(key, value) {
        localStorage.setItem(key, value);
        // console.log(`[Storage] Saved setting: ${key} = ${key === 'lastContent' ? `(${value.length} chars)` : value}`);
        
        // If saving content (which editor.js calls 'lastContent'), update the current document
        if (key === 'lastContent') {
            const currentDocId = localStorage.getItem('currentDocId');
            if (currentDocId) {
                const success = documentStore.updateDocument(currentDocId, { content: value });
                if (success) {
                    // console.log(`[Storage] Updated document ID: ${currentDocId} with new content`);
                } else {
                    // console.warn(`[Storage] Failed to update document ID: ${currentDocId}. It might have been deleted.`);
                    // Potentially create a new doc with this content if currentDocId is invalid
                }
            } else {
                // No current document ID - this content is "unsaved" or belongs to a new unsaved doc.
                // The main "Save" button logic in toolbar should handle creating a new doc if needed.
                // For auto-save, this 'lastContent' key acts as a buffer for unsaved work if no doc is active.
                console.log('[Storage] Content saved to lastContent (no active document).');
            }
        }
    }
};

export default storage;
