import utils from './utils.js';

const fileManager = {
    init() {
        this.editorEl = document.getElementById('editor');
        const saveBtn = document.getElementById('save');
        const openBtn = document.getElementById('open-file');
        const fileInput = document.getElementById('file-input');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', this.saveFile.bind(this));
        }
        // REMOVE OR MODIFY THIS CODE if it exists:
        // We don't want fileManager to handle the open-file button clicks anymore
        // since toolbar.js now handles it to open the documents modal instead
        
        // Find any code like this and remove it:
        /*
        const openFileBtn = document.getElementById('open-file');
        if (openFileBtn) {
            openFileBtn.addEventListener('click', (e) => {
                // Code that opens file dialog
                // ...
            });
        }
        */
        
        // Also check for Ctrl+O handlers that open system dialogs:
        /*
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                // Code that opens file dialog
                // ...
            }
        });
        */
        
        // Instead, if we want fileManager to respond to file open events,
        // listen for the custom event from modalManager:
        document.addEventListener('loadDocument', (event) => {
            const doc = event.detail.document;
            if (doc && doc.content) {
                // Handle loading the document content here
                // This will be triggered by modalManager when a document is selected
            }
        });
        
        // Optional: implement drag-and-drop on editor
        this.editorEl.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        this.editorEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
                this.readFile(file);
            }
        });
    },
    saveFile() {
        const content = this.editorEl.innerText;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.md';
        a.click();
        URL.revokeObjectURL(url);
    },
    openFile(event) {
        const file = event.target.files[0];
        if (file) this.readFile(file);
    },
    readFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.editorEl.innerText = e.target.result;
        };
        reader.readAsText(file);
    }
};

export default fileManager;
