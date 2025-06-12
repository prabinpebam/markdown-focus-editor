/**
 * Modal Manager
 * Handles the document modal system including open/close and event listeners
 */

import documentStore from './documentStore.js';
import editor from './editor.js';

const modalManager = {
    modalElement: null,
    overlayElement: null,
    closeButton: null,
    gridElement: null,
    docCountElement: null,
    storageTextElement: null,
    progressBarElement: null,
    exportButton: null,
    importButton: null,
    importMdButton: null,
    jsonBackupInput: null,
    mdFileInput: null,

    init() {
        console.log('[ModalManager] Initializing...');
        
        this.modalElement = document.getElementById('openDocumentModal');
        this.overlayElement = document.getElementById('document-modal-overlay');
        this.closeButton = document.getElementById('close-document-modal');
        this.gridElement = document.getElementById('document-grid');
        this.docCountElement = document.getElementById('doc-count')?.querySelector('span');
        this.storageTextElement = document.getElementById('storage-text');
        this.progressBarElement = document.getElementById('storage-progress-bar');
        this.exportButton = document.getElementById('export-documents-backup');
        this.importButton = document.getElementById('import-backup');
        this.importMdButton = document.getElementById('import-md-doc');
        this.jsonBackupInput = document.getElementById('json-backup-input');
        this.mdFileInput = document.getElementById('md-file-input');

        console.log('[ModalManager] Modal elements found:', {
            modal: !!this.modalElement,
            overlay: !!this.overlayElement,
            closeButton: !!this.closeButton,
            grid: !!this.gridElement
        });

        if (!this.modalElement || !this.overlayElement || !this.closeButton || !this.gridElement) {
            console.error('[ModalManager] Required modal elements not found!');
            return;
        }

        this.setupEventListeners();
        console.log('[ModalManager] Initialized successfully');
    },

    setupEventListeners() {
        // Close modal events
        this.overlayElement.addEventListener('click', () => {
            console.log('[ModalManager] Overlay clicked');
            this.closeModal();
        });
        
        this.closeButton.addEventListener('click', () => {
            console.log('[ModalManager] Close button clicked');
            this.closeModal();
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalElement.classList.contains('active')) {
                console.log('[ModalManager] Escape key pressed');
                this.closeModal();
            }
        });

        // Button events
        if (this.exportButton) {
            this.exportButton.addEventListener('click', () => this.handleExport());
        }
        
        if (this.importButton && this.jsonBackupInput) {
            this.importButton.addEventListener('click', () => this.jsonBackupInput.click());
            this.jsonBackupInput.addEventListener('change', (e) => this.handleJsonBackupImport(e));
        }
        
        if (this.importMdButton && this.mdFileInput) {
            this.importMdButton.addEventListener('click', () => this.mdFileInput.click());
            this.mdFileInput.addEventListener('change', (e) => this.handleMdFileImport(e));
        }

        console.log('[ModalManager] Event listeners set up');
    },

    openModal() {
        console.log('[ModalManager] Opening modal');
        if (!this.modalElement || !this.overlayElement) {
            console.error('[ModalManager] Modal elements not available');
            return;
        }

        this.renderDocumentGrid();
        this.updateFooterInfo();
        
        // Add CSS for modal display
        this.modalElement.style.display = 'block';
        this.overlayElement.style.display = 'block';
        
        this.modalElement.classList.add('active');
        this.overlayElement.classList.add('active');
        console.log('[ModalManager] Modal opened successfully');
    },

    closeModal() {
        console.log('[ModalManager] Closing modal');
        if (!this.modalElement || !this.overlayElement) {
            return;
        }

        this.modalElement.classList.remove('active');
        this.overlayElement.classList.remove('active');
        
        // Hide modal
        this.modalElement.style.display = 'none';
        this.overlayElement.style.display = 'none';
        
        console.log('[ModalManager] Modal closed');
    },

    updateFooterInfo() {
        const usage = documentStore.getStorageUsage();
        if (this.docCountElement) {
            this.docCountElement.textContent = usage.totalDocs;
        }
        if (this.storageTextElement) {
            const percentage = ((usage.sizeInBytes / (5 * 1024 * 1024)) * 100).toFixed(1);
            this.storageTextElement.textContent = `${usage.sizeInKB} KB used (${percentage}% of 5MB)`;
        }
        if (this.progressBarElement) {
            const percentage = Math.min(100, (usage.sizeInBytes / (5 * 1024 * 1024)) * 100);
            this.progressBarElement.style.width = `${percentage}%`;
        }
    },

    renderDocumentGrid(highlightedIds = []) {
        if (!this.gridElement) return;
        this.gridElement.innerHTML = '';
        
        const docs = documentStore.getAllDocuments().sort((a, b) => 
            new Date(b.lastEdited) - new Date(a.lastEdited)
        );

        if (docs.length === 0) {
            this.gridElement.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No documents yet. Create your first document!</p>';
            return;
        }

        // Add grid styling
        this.gridElement.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
        `;

        docs.forEach(doc => this.createDocumentThumbnail(doc, highlightedIds.includes(doc.id)));
    },

    createDocumentThumbnail(doc, isHighlighted = false) {
        const thumb = document.createElement('div');
        thumb.className = 'document-thumbnail';
        if (isHighlighted) {
            thumb.classList.add('newly-imported');
        }
        thumb.dataset.docId = doc.id;

        // Title
        const title = document.createElement('h3');
        title.textContent = doc.name || 'Untitled Document';
        title.style.cssText = `
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #333;
        `;
        thumb.appendChild(title);

        // Date
        const date = document.createElement('p');
        date.style.cssText = `
            margin: 0 0 12px 0;
            font-size: 12px;
            color: #666;
        `;
        if (doc.lastEdited) {
            const editDate = new Date(doc.lastEdited);
            date.textContent = `Last edited: ${editDate.toLocaleDateString()} at ${editDate.toLocaleTimeString()}`;
        } else {
            date.textContent = 'No edit date';
        }
        thumb.appendChild(date);

        // Preview
        const preview = document.createElement('div');
        preview.style.cssText = `
            margin: 0;
            font-size: 13px;
            color: #666;
            line-height: 1.4;
            height: 80px;
            overflow: hidden;
            background: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #eee;
        `;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = doc.content || '';
        const previewText = tempDiv.textContent.trim();
        preview.textContent = previewText.substring(0, 200) + (previewText.length > 200 ? '...' : '');
        thumb.appendChild(preview);
        
        // Delete button
        const deleteIcon = document.createElement('button');
        deleteIcon.innerHTML = '×';
        deleteIcon.title = 'Delete document';
        deleteIcon.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(255, 0, 0, 0.8);
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: none;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        `;
        deleteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleDeleteDocument(doc.id, doc.name);
        });
        thumb.appendChild(deleteIcon);

        // Thumbnail styling
        thumb.style.cssText = `
            position: relative;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            background: white;
            transition: all 0.2s ease;
            min-height: 180px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        // Hover effects
        thumb.addEventListener('mouseenter', () => {
            thumb.style.borderColor = '#007cba';
            thumb.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            deleteIcon.style.display = 'flex';
        });
        
        thumb.addEventListener('mouseleave', () => {
            thumb.style.borderColor = '#e1e5e9';
            thumb.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            deleteIcon.style.display = 'none';
        });

        // Load document on click
        thumb.addEventListener('click', () => this.handleLoadDocument(doc.id));
        
        this.gridElement.appendChild(thumb);
    },

    handleLoadDocument(docId) {
        console.log('[ModalManager] Loading document:', docId);
        const doc = documentStore.getDocumentById(docId);
        if (doc && editor.editorEl) {
            editor.editorEl.innerHTML = doc.content;
            localStorage.setItem('currentDocId', docId);
            
            if (editor.undoManager) {
                setTimeout(() => {
                    editor.undoManager.recordInitialState();
                }, 50);
            }
            if (editor.focusMode) {
                editor.focusMode.updateFocusIfActive();
            }
            
            console.log(`[ModalManager] Loaded document: ${doc.name}`);
            this.closeModal();
        } else {
            console.error(`[ModalManager] Failed to load document: ${docId}`);
        }
    },

    handleDeleteDocument(docId, docName) {
        if (confirm(`Are you sure you want to delete "${docName}"? This cannot be undone.`)) {
            const success = documentStore.deleteDocument(docId);
            if (success) {
                this.renderDocumentGrid();
                this.updateFooterInfo();
                
                // If deleted doc was current, clear it
                if (localStorage.getItem('currentDocId') === docId) {
                    localStorage.removeItem('currentDocId');
                }
                console.log(`[ModalManager] Deleted document: ${docName}`);
            }
        }
    },

    handleExport() {
        const docs = documentStore.getAllDocuments();
        if (docs.length === 0) {
            alert('No documents to export.');
            return;
        }
        
        const jsonData = JSON.stringify(docs, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        a.download = `MD-focus-editor-backup-${timestamp}.json`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[ModalManager] Documents exported');
    },

    handleJsonBackupImport(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedDocs = JSON.parse(e.target.result);
                    if (Array.isArray(importedDocs)) {
                        importedDocs.forEach(doc => {
                            if (!documentStore.getDocumentById(doc.id)) {
                                documentStore.saveDocument(doc);
                            }
                        });
                        this.renderDocumentGrid();
                        this.updateFooterInfo();
                        alert(`Successfully imported ${importedDocs.length} documents.`);
                    } else {
                        alert('Invalid backup file format.');
                    }
                } catch (err) {
                    alert('Error reading backup file: ' + err.message);
                }
            };
            reader.readAsText(file);
        }
        event.target.value = null;
    },

    handleMdFileImport(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                let name = file.name.replace(/\.(md|txt|html)$/i, '') || 'Imported Document';
                
                const newDoc = documentStore.createNewDocument(name, content);
                this.renderDocumentGrid([newDoc.id]);
                this.updateFooterInfo();
                alert(`Document "${name}" imported successfully!`);
            };
            reader.readAsText(file);
        }
        event.target.value = null;
    }
};

export default modalManager;
