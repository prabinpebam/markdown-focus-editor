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
        const currentDocId = localStorage.getItem('currentDocId');
        if (currentDocId) {
            const doc = documentStore.getDocumentById(currentDocId);
            if (doc && editorEl) {
                editorEl.innerHTML = doc.content;
                console.log(`[Storage] Loaded document with ID: ${currentDocId}`);
            } else {
                // If document not found, clear the currentDocId
                localStorage.removeItem('currentDocId');
                // Load last unsaved content as fallback
                const lastContent = localStorage.getItem('lastContent');
                if (lastContent && editorEl) {
                    editorEl.innerHTML = lastContent;
                    console.log(`[Storage] Loaded fallback content (${lastContent.length} chars)`);
                }
            }
        } else {
            // No current document, load last saved content
            const lastContent = localStorage.getItem('lastContent');
            if (lastContent && editorEl) {
                editorEl.innerHTML = lastContent;
                console.log(`[Storage] Loaded content (${lastContent.length} chars)`);
            }
        }
        // Note: editor.undoManager.recordInitialState(); in app.js handles initial undo state.
    },

    saveSettings(key, value) {
        localStorage.setItem(key, value);
        console.log(`[Storage] Saved setting: ${key} = ${key === 'lastContent' ? `(${value.length} chars)` : value}`);
        
        // If saving content and we have a current document ID, update the document
        if (key === 'lastContent' && localStorage.getItem('currentDocId')) {
            const docId = localStorage.getItem('currentDocId');
            const doc = documentStore.getDocumentById(docId);
            if (doc) {
                doc.content = value;
                documentStore.saveDocument(doc);
                console.log(`[Storage] Updated document ID: ${docId} with new content`);
            }
        }
    }
};

export default storage;
