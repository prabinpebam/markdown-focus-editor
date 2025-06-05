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
