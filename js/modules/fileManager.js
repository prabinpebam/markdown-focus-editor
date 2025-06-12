// import utils from './utils.js'; // If utils are needed for other things
import documentStore from './documentStore.js'; // For importing MD as new doc
import editor from './editor.js'; // To update editor content

const fileManager = {
    init() {
        this.editorEl = document.getElementById('editor');
        
        // The main open/save buttons are now handled by toolbar.js and modalManager.js
        // The #file-input is also likely handled by modalManager for specific import types.

        // Optional: Keep drag-and-drop on editor for individual .md files (imports as new doc)
        if (this.editorEl) {
            this.editorEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Add visual cue if desired
            });
            this.editorEl.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file && (file.type === 'text/markdown' || file.type === 'text/plain' || file.name.endsWith('.md'))) {
                    this.importDroppedMdFile(file);
                } else if (file && file.type === 'application/json' && file.name.includes('MD-focus-editor-backup')) {
                    // Optionally, if a backup is dropped on editor, open the modal and pass the file to it
                    // For now, this is handled by modal's own drag-drop.
                    alert('Please drop backup files onto the "Open Document" modal.');
                }
            });
        }
        console.log('[FileManager] Initialized. MD drag-drop on editor enabled.');
    },

    importDroppedMdFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let name = file.name.replace(/\.(md|txt)$/i, '');
            name = name || 'Dropped Document';
            
            // Create a new document in the store
            const newDoc = documentStore.createNewDocument(name, content);
            
            // Load this new document into the editor
            if (editor.editorEl) {
                editor.editorEl.innerHTML = newDoc.content;
                localStorage.setItem('currentDocId', newDoc.id);
                if(editor.undoManager) editor.undoManager.recordInitialState();
                if(editor.focusMode) editor.focusMode.updateFocusIfActive();
                alert(`Document "${newDoc.name}" imported from dropped file and is now active.`);
            }
        };
        reader.readAsText(file);
    }

    // Old saveFile, openFile, readFile methods are removed as their primary
    // functionality is now part of documentStore and modalManager.
};

export default fileManager;
