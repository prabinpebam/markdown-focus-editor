/**
 * Modal Manager
 * Handles the document modal system including open/close and event listeners
 */

import documentStore from './documentStore.js';
import editor from './editor.js';

const modalManager = {
    init() {
        // Cache DOM elements
        this.modal = document.getElementById('openDocumentModal');
        this.modalOverlay = document.getElementById('document-modal-overlay');
        this.closeBtn = document.getElementById('close-document-modal');
        this.documentGrid = document.getElementById('document-grid');
        this.docCountEl = document.getElementById('doc-count').querySelector('span');
        this.storageProgressBar = document.getElementById('storage-progress-bar');
        this.storageTextEl = document.getElementById('storage-text');
        
        // Import document elements
        this.importMdBtn = document.getElementById('import-md-doc');
        this.mdFileInput = document.getElementById('md-file-input');
        
        // Backup elements
        this.exportBackupBtn = document.getElementById('export-documents-backup');
        this.importBackupBtn = document.getElementById('import-backup');
        this.jsonBackupInput = document.getElementById('json-backup-input');
        
        // Add toolbar open button handler - make sure it exists
        document.addEventListener('openDocumentModal', () => {
            this.openModal();
        });
        
        // Add keyboard shortcut (Ctrl+O)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.openModal();
            }
        });
        
        // Ensure DOM elements exist before adding event listeners
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', () => this.closeModal());
        }
        
        // Import md button
        if (this.importMdBtn) {
            this.importMdBtn.addEventListener('click', () => {
                if (this.mdFileInput) {
                    this.mdFileInput.click();
                }
            });
        }
        
        if (this.mdFileInput) {
            this.mdFileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.importSingleDocument(e.target.files[0]);
                }
            });
        }
        
        // Export backup button
        if (this.exportBackupBtn) {
            this.exportBackupBtn.addEventListener('click', () => {
                this.exportDocumentsBackup();
            });
        }
        
        // Import backup button
        if (this.importBackupBtn) {
            this.importBackupBtn.addEventListener('click', () => {
                if (this.jsonBackupInput) {
                    this.jsonBackupInput.click();
                }
            });
        }
        
        if (this.jsonBackupInput) {
            this.jsonBackupInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.importBackup(e.target.files[0]);
                }
            });
        }
        
        // Add drag and drop for document import
        this.setupDragAndDrop();
        
        console.log('[ModalManager] Initialized');
    },
    
    /**
     * Opens the document modal and refreshes its content
     */
    openModal() {
        this.modalOverlay.style.display = 'block';
        this.modal.style.display = 'flex';
        this.refreshModalContent();
    },
    
    /**
     * Closes the document modal
     */
    closeModal() {
        this.modalOverlay.style.display = 'none';
        this.modal.style.display = 'none';
    },
    
    /**
     * Checks if the modal is currently open
     * @returns {boolean} True if modal is open
     */
    isModalOpen() {
        return this.modal.style.display === 'flex';
    },
    
    /**
     * Refreshes all content in the modal (documents and storage info)
     */
    refreshModalContent() {
        this.loadDocuments();
        this.updateStorageInfo();
    },
    
    /**
     * Loads and displays all documents as thumbnails in the grid
     */
    loadDocuments() {
        const docs = documentStore.getAllDocuments();
        this.documentGrid.innerHTML = '';
        
        if (docs.length === 0) {
            this.documentGrid.innerHTML = '<p>No documents yet. Create a new document or import one.</p>';
            return;
        }
        
        docs.forEach(doc => {
            const thumbnail = this.createDocumentThumbnail(doc);
            this.documentGrid.appendChild(thumbnail);
        });
    },
    
    /**
     * Creates a thumbnail element for a document
     * @param {Object} doc - The document object
     * @returns {HTMLElement} The document thumbnail element
     */
    createDocumentThumbnail(doc) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'document-thumbnail';
        thumbnail.dataset.id = doc.id;
        
        const formattedDate = new Date(doc.lastEditedAt).toLocaleString();
        
        // Prepare a plain text preview (strip HTML/Markdown)
        const previewText = doc.content
            .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
            .substring(0, 250); // Limit length
        
        thumbnail.innerHTML = `
            <div class="thumbnail-header">
                <div class="doc-title-container">
                    <h3 class="doc-title">${doc.name}</h3>
                </div>
                <div class="thumbnail-actions">
                    <button class="export-doc-btn" title="Export as Markdown">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </button>
                    <button class="delete-doc-btn" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <p class="last-edited">Last edited: ${formattedDate}</p>
            <div class="doc-preview">${previewText}</div>
        `;
        
        // Event listeners for the thumbnail
        thumbnail.addEventListener('click', (e) => {
            if (!e.target.closest('.thumbnail-actions') && !e.target.closest('.doc-title')) {
                this.loadDocumentIntoEditor(doc.id);
            }
        });
        
        // Event listener for document title edit
        const titleEl = thumbnail.querySelector('.doc-title');
        titleEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showTitleEditPopover(titleEl, doc.id);
        });
        
        // Event listener for export button
        const exportBtn = thumbnail.querySelector('.export-doc-btn');
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exportSingleDocument(doc);
        });
        
        // Event listener for delete button
        const deleteBtn = thumbnail.querySelector('.delete-doc-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteDocument(doc.id);
        });
        
        return thumbnail;
    },
    
    /**
     * Shows a popover for editing document title
     * @param {HTMLElement} titleEl - The title element
     * @param {string} docId - Document ID
     */
    showTitleEditPopover(titleEl, docId) {
        // Create popover if it doesn't exist
        let popover = document.querySelector('.title-edit-popover');
        if (!popover) {
            popover = document.createElement('div');
            popover.className = 'title-edit-popover';
            popover.innerHTML = `
                <input type="text" class="title-edit-input">
                <button class="title-save-btn">✓</button>
            `;
            document.body.appendChild(popover);
        }
        
        // Position popover over the title
        const rect = titleEl.getBoundingClientRect();
        popover.style.top = `${rect.top - 2}px`;
        popover.style.left = `${rect.left - 2}px`;
        popover.style.width = `${rect.width + 40}px`; // Extra width for the button
        popover.style.display = 'flex';
        
        // Set current value
        const input = popover.querySelector('.title-edit-input');
        input.value = titleEl.textContent;
        input.focus();
        input.select();
        
        // Save button handler
        const saveBtn = popover.querySelector('.title-save-btn');
        const saveHandler = () => {
            const newTitle = input.value.trim();
            if (newTitle) {
                titleEl.textContent = newTitle;
                documentStore.updateDocumentTitle(docId, newTitle);
                closePopover();
            }
        };
        
        // Setup event listeners for the popover
        saveBtn.addEventListener('click', saveHandler);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveHandler();
            } else if (e.key === 'Escape') {
                closePopover();
            }
        });
        
        // Close popover when clicking outside
        const closePopover = () => {
            popover.style.display = 'none';
            document.removeEventListener('click', outsideClickHandler);
        };
        
        const outsideClickHandler = (e) => {
            if (!popover.contains(e.target) && e.target !== titleEl) {
                closePopover();
            }
        };
        
        // Add the click handler after a short delay to avoid
        // the current click event triggering it immediately
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
        }, 10);
    },
    
    /**
     * Loads a document into the editor and closes the modal
     * @param {string} docId - Document ID to load
     */
    loadDocumentIntoEditor(docId) {
        const doc = documentStore.getDocumentById(docId);
        if (doc) {
            editor.editorEl.innerHTML = doc.content;
            // Store current document ID in editor or localStorage for future reference
            localStorage.setItem('currentDocId', docId);
            this.closeModal();
            
            // Re-initialize undo/redo history for the new document
            if (editor.undoManager) {
                editor.undoManager.clearHistory();
                editor.undoManager.recordInitialState();
            }
        }
    },
    
    /**
     * Exports a single document as a Markdown file
     * @param {Object} doc - Document to export
     */
    exportSingleDocument(doc) {
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Create a safe filename based on document title
        const safeFilename = doc.name.replace(/[^\w\s]/gi, '_').replace(/\s+/g, '_');
        a.download = `${safeFilename}.md`;
        
        a.click();
        URL.revokeObjectURL(url);
    },
    
    /**
     * Displays a confirmation dialog for document deletion
     * @param {string} docId - Document ID to delete
     */
    confirmDeleteDocument(docId) {
        const confirmed = confirm('Are you sure you want to delete this document?');
        if (confirmed) {
            const deleted = documentStore.deleteDocument(docId);
            if (deleted) {
                // Remove the thumbnail from DOM
                const thumbnail = this.documentGrid.querySelector(`[data-id="${docId}"]`);
                if (thumbnail) {
                    thumbnail.remove();
                }
                
                // Update storage info
                this.updateStorageInfo();
                
                // If deleted document was active, clear the current ID
                if (localStorage.getItem('currentDocId') === docId) {
                    localStorage.removeItem('currentDocId');
                }
            }
        }
    },
    
    /**
     * Updates storage usage information in the modal footer
     */
    updateStorageInfo() {
        const docs = documentStore.getAllDocuments();
        
        // Update document count
        this.docCountEl.textContent = docs.length;
        
        // Calculate storage usage
        const docsJson = JSON.stringify(docs);
        const storageSize = new Blob([docsJson]).size;
        
        // Format size as KB/MB
        let sizeText = '';
        if (storageSize < 1024) {
            sizeText = `${storageSize} bytes`;
        } else if (storageSize < 1048576) {  // 1024 * 1024
            sizeText = `${(storageSize / 1024).toFixed(1)} KB`;
        } else {
            sizeText = `${(storageSize / 1048576).toFixed(1)} MB`;
        }
        
        // Calculate percentage of 5MB limit (localStorage typically has 5MB limit)
        const maxSize = 5 * 1048576;  // 5MB in bytes
        const percentage = Math.min(100, (storageSize / maxSize) * 100);
        
        // Update the progress bar and text
        this.storageProgressBar.style.width = `${percentage}%`;
        this.storageTextEl.textContent = `${sizeText} used (${percentage.toFixed(1)}% of 5MB)`;
    },
    
    /**
     * Imports a single document (Markdown or HTML)
     * @param {File} file - The file to import
     */
    importSingleDocument(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            // Create a new document in the store
            const doc = documentStore.createDocument({
                name: file.name,
                content: content,
                lastEditedAt: new Date().toISOString()
            });
            
            // Refresh the modal to show the new document
            this.refreshModalContent();
            
            // Optionally, load the document into the editor immediately
            this.loadDocumentIntoEditor(doc.id);
        };
        
        // Read the file as text
        reader.readAsText(file);
    },
    
    /**
     * Exports all documents as a backup (JSON file)
     */
    exportDocumentsBackup() {
        const docs = documentStore.getAllDocuments();
        const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Create a timestamped filename for the backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `backup-${timestamp}.json`;
        
        a.click();
        URL.revokeObjectURL(url);
    },
    
    /**
     * Imports a backup file (JSON) and restores documents
     * @param {File} file - The backup file to import
     */
    importBackup(file) {
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                // Parse JSON
                const importedData = JSON.parse(event.target.result);
                
                // Validate structure (basic validation)
                if (!Array.isArray(importedData)) {
                    throw new Error('Invalid backup format: Expected an array of documents');
                }
                
                // Process imported documents
                this.processImportedDocuments(importedData);
                
            } catch (error) {
                console.error('Error processing backup file:', error);
                alert('Failed to import backup. The file may be corrupted or in an invalid format.');
            }
        };
        
        reader.onerror = (error) => {
            console.error('Error reading backup file:', error);
            alert('Failed to read backup file. Please try again.');
        };
        
        // Read the file as text
        reader.readAsText(file);
    },
    
    /**
     * Creates the import status toolbar for conflict resolution
     */
    createImportStatusToolbar() {
        // Remove any existing toolbar first
        this.clearImportStatusUI();
        
        // Create the toolbar
        this.importStatusToolbar = document.createElement('div');
        this.importStatusToolbar.className = 'import-status-toolbar';
        this.importStatusToolbar.style.display = 'flex';
        
        // Add to the modal before the footer
        const modalFooter = this.modalEl.querySelector('.modal-footer');
        this.modalEl.insertBefore(this.importStatusToolbar, modalFooter);
    },
    
    /**
     * Clears any import status UI elements
     */
    clearImportStatusUI() {
        if (this.importStatusToolbar) {
            this.importStatusToolbar.remove();
            this.importStatusToolbar = null;
        }
        
        // Remove any conflict overlays or highlight borders
        const highlightedDocs = this.documentGridEl.querySelectorAll('.imported-doc, .conflict-doc');
        highlightedDocs.forEach(el => {
            el.classList.remove('imported-doc', 'conflict-doc');
            const overlay = el.querySelector('.conflict-overlay');
            if (overlay) overlay.remove();
        });
    },
    
    /**
     * Imports an MD file as a new document
     * @param {File} file - The file to import
     */
    importMdFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const content = event.target.result;
            
            // Create a new document
            const newDoc = new documentStore.Document(
                null, // generate ID
                file.name.replace(/\.\w+$/, ''), // Use filename without extension as name
                content,
                null, // generated timestamps
                null  // generated timestamps
            );
            
            // Save the document
            documentStore.saveDocument(newDoc);
            
            // Refresh the document list
            this.loadDocuments();
            
            // Update storage info
            this.updateStorageInfo();
        };
        
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            alert('Failed to read file. Please try again.');
        };
        
        reader.readAsText(file);
    },
    
    /**
     * Process imported documents from a backup
     * @param {Array} importedDocs - The imported document array
     */
    processImportedDocuments(importedDocs) {
        // Get current documents for comparison
        const currentDocs = documentStore.getAllDocuments();
        const currentDocIds = currentDocs.map(doc => doc.id);
        
        // Statistics for status toolbar
        const stats = {
            imported: 0,
            conflicting: 0
        };
        
        // Create the import status toolbar
        this.createImportStatusToolbar();
        
        // Clear any previous highlights
        this.clearImportStatusUI();
        
        // Process each imported document
        importedDocs.forEach(importedDoc => {
            // Check if this document ID already exists
            const hasConflict = currentDocIds.includes(importedDoc.id);
            
            if (hasConflict) {
                // Handle conflict
                stats.conflicting++;
                this.handleDocumentConflict(importedDoc, currentDocs.find(doc => doc.id === importedDoc.id));
            } else {
                // No conflict, add as new document
                const newDoc = new documentStore.Document(
                    importedDoc.id,
                    importedDoc.name,
                    importedDoc.content,
                    importedDoc.createdAt,
                    importedDoc.lastEditedAt
                );
                
                documentStore.saveDocument(newDoc);
                stats.imported++;
            }
        });
        
        // Update the UI
        this.loadDocuments();
        this.updateStorageInfo();
        this.highlightImportedDocuments(importedDocs, stats);
    },
    
    /**
     * Highlight imported documents in the UI
     * @param {Array} importedDocs - The imported document array
     * @param {Object} stats - Import statistics
     */
    highlightImportedDocuments(importedDocs, stats) {
        // Update the import status toolbar
        this.updateImportStatusToolbar(stats);
        
        // Find and highlight all imported documents
        const allDocThumbnails = this.documentGridEl.querySelectorAll('.document-thumbnail');
        
        allDocThumbnails.forEach(thumbnail => {
            const docId = thumbnail.dataset.docId;
            const importedDoc = importedDocs.find(doc => doc.id === docId);
            
            if (importedDoc) {
                // Check if this is a conflict
                const isConflict = thumbnail.querySelector('.conflict-overlay') !== null;
                
                if (isConflict) {
                    thumbnail.classList.add('conflict-doc');
                } else {
                    thumbnail.classList.add('imported-doc');
                }
            }
        });
    },
    
    /**
     * Update the import status toolbar with statistics
     * @param {Object} stats - Import statistics
     */
    updateImportStatusToolbar(stats) {
        if (!this.importStatusToolbar) return;
        
        this.importStatusToolbar.innerHTML = `
            <div class="import-status-info">
                <div>Docs imported: ${stats.imported}</div>
                <div>Conflicting: ${stats.conflicting}</div>
            </div>
            ${stats.conflicting > 0 ? `
            <div class="import-status-actions">
                <span>${stats.conflicting} conflicting docs:</span>
                <button class="keep-all-btn" title="Replace all conflicting docs with imported versions">Keep all imported</button>
                <button class="discard-all-btn" title="Keep all current versions">Discard all imported</button>
            </div>` : ''}
        `;
        
        // Add event handlers for bulk actions
        if (stats.conflicting > 0) {
            const keepAllBtn = this.importStatusToolbar.querySelector('.keep-all-btn');
            const discardAllBtn = this.importStatusToolbar.querySelector('.discard-all-btn');
            
            keepAllBtn.addEventListener('click', () => this.resolveAllConflicts('imported'));
            discardAllBtn.addEventListener('click', () => this.resolveAllConflicts('current'));
        }
    },
    
    /**
     * Handle a document conflict
     * @param {Object} importedDoc - The imported document
     * @param {Object} currentDoc - The current document with the same ID
     */
    handleDocumentConflict(importedDoc, currentDoc) {
        // Find the thumbnail for this document (may need to wait for UI update)
        setTimeout(() => {
            const thumbnail = this.documentGridEl.querySelector(`.document-thumbnail[data-doc-id="${currentDoc.id}"]`);
            if (!thumbnail) return;
            
            // Add conflict class
            thumbnail.classList.add('conflict-doc');
            
            // Format dates for display
            const importedDate = new Date(importedDoc.lastEditedAt).toLocaleString();
            const currentDate = new Date(currentDoc.lastEditedAt).toLocaleString();
            
            // Create conflict overlay
            const overlay = document.createElement('div');
            overlay.className = 'conflict-overlay';
            overlay.innerHTML = `
                <button class="keep-current-btn">Keep current: ${currentDate}</button>
                <button class="keep-imported-btn">Keep imported: ${importedDate}</button>
            `;
            
            // Add event handlers
            overlay.querySelector('.keep-current-btn').addEventListener('click', () => {
                this.resolveConflict(currentDoc.id, 'current', importedDoc);
            });
            
            overlay.querySelector('.keep-imported-btn').addEventListener('click', () => {
                this.resolveConflict(currentDoc.id, 'imported', importedDoc);
            });
            
            // Add overlay to thumbnail
            thumbnail.appendChild(overlay);
        }, 100); // Short delay to ensure thumbnail exists
    },
    
    /**
     * Resolve a single document conflict
     * @param {string} docId - Document ID
     * @param {string} keepVersion - Which version to keep ('current' or 'imported')
     * @param {Object} importedDoc - The imported document
     */
    resolveConflict(docId, keepVersion, importedDoc) {
        const thumbnail = this.documentGridEl.querySelector(`.document-thumbnail[data-doc-id="${docId}"]`);
        if (!thumbnail) return;
        
        if (keepVersion === 'imported') {
            // Save the imported version
            documentStore.saveDocument({
                id: importedDoc.id,
                name: importedDoc.name,
                content: importedDoc.content,
                createdAt: importedDoc.createdAt,
                lastEditedAt: importedDoc.lastEditedAt
            });
        }
        
        // Update UI
        thumbnail.classList.remove('conflict-doc');
        thumbnail.classList.add('imported-doc');
        
        // Remove conflict overlay
        const overlay = thumbnail.querySelector('.conflict-overlay');
        if (overlay) overlay.remove();
        
        // Update stats in toolbar
        const conflictingCount = this.documentGridEl.querySelectorAll('.conflict-doc').length;
        const stats = {
            imported: this.documentGridEl.querySelectorAll('.imported-doc').length,
            conflicting: conflictingCount
        };
        this.updateImportStatusToolbar(stats);
        
        // If no more conflicts, remove the toolbar after a delay
        if (conflictingCount === 0) {
            setTimeout(() => {
                if (this.importStatusToolbar && this.documentGridEl.querySelectorAll('.conflict-doc').length === 0) {
                    this.importStatusToolbar.style.opacity = '0';
                    setTimeout(() => this.clearImportStatusUI(), 500);
                }
            }, 1500);
        }
    },
    
    /**
     * Resolve all conflicts at once
     * @param {string} keepVersion - Which version to keep ('current' or 'imported')
     */
    resolveAllConflicts(keepVersion) {
        if (confirm(`Are you sure you want to ${keepVersion === 'imported' ? 'replace all conflicting documents with imported versions' : 'keep all current versions and discard imported conflicts'}?`)) {
            // Get all conflict thumbnails
            const conflictThumbnails = this.documentGridEl.querySelectorAll('.conflict-doc');
            
            conflictThumbnails.forEach(thumbnail => {
                const docId = thumbnail.dataset.docId;
                const overlay = thumbnail.querySelector('.conflict-overlay');
                
                if (keepVersion === 'imported') {
                    // Simulate a click on the "Keep imported" button
                    overlay.querySelector('.keep-imported-btn').click();
                } else {
                    // Simulate a click on the "Keep current" button
                    overlay.querySelector('.keep-current-btn').click();
                }
            });
        }
    },

    /**
     * Sets up drag and drop functionality for document import
     */
    setupDragAndDrop() {
        this.modal.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.modal.classList.add('drag-over');
        });
        
        this.modal.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.modal.classList.remove('drag-over');
        });
        
        this.modal.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.modal.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length) {
                // Only import the first file for now
                const file = files[0];
                if (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.html')) {
                    this.importSingleDocument(file);
                } else if (file.name.endsWith('.json')) {
                    this.importBackup(file);
                } else {
                    alert('Unsupported file type. Please import a Markdown (.md) or JSON backup file.');
                }
            }
        });
    }
};

export default modalManager;
