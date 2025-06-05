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
        thumbnail.dataset.docId = doc.id;
        
        const formattedDate = new Date(doc.lastEditedAt).toLocaleString();
        
        // Prepare a plain text preview (strip HTML/Markdown)
        const previewText = doc.content
            .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
            .replace(/^#+\s/gm, '') // Remove heading markers
            .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers
            .replace(/\*(.+?)\*/g, '$1') // Remove italic markers
            .replace(/~~(.+?)~~/g, '$1') // Remove strikethrough markers
            .substring(0, 300); // Limit length
        
        thumbnail.innerHTML = `
            <div class="thumbnail-header">
                <div class="doc-title-container">
                    <h3 class="doc-title">${doc.name}</h3>
                </div>
                <div class="thumbnail-actions">
                    <button class="export-doc-btn" title="Export as Markdown">📄</button>
                    <button class="delete-doc-btn" title="Delete">🗑️</button>
                </div>
            </div>
            <p class="last-edited">Last edited: ${formattedDate}</p>
            <div class="doc-preview">${previewText}</div>
        `;
        
        // Event listener for clicking the thumbnail
        thumbnail.addEventListener('click', (e) => {
            // Only load document if not clicking buttons or title
            if (!e.target.closest('.thumbnail-actions') && 
                !e.target.classList.contains('doc-title')) {
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
        if (!this.titleEditPopover) {
            this.titleEditPopover = document.createElement('div');
            this.titleEditPopover.className = 'title-edit-popover';
            document.body.appendChild(this.titleEditPopover);
        }
        
        // Position popover over the title
        const rect = titleEl.getBoundingClientRect();
        this.titleEditPopover.style.top = `${rect.top}px`;
        this.titleEditPopover.style.left = `${rect.left}px`;
        this.titleEditPopover.style.width = `${rect.width + 40}px`; // Extra width for button
        
        // Update popover content
        this.titleEditPopover.innerHTML = `
            <input type="text" class="title-edit-input" value="${titleEl.textContent}">
            <button class="title-save-btn">✓</button>
        `;
        
        // Show popover
        this.titleEditPopover.style.display = 'flex';
        
        // Store the document ID in the popover
        this.titleEditPopover.dataset.docId = docId;
        
        // Focus and select all text
        const input = this.titleEditPopover.querySelector('.title-edit-input');
        input.focus();
        input.select();
        
        // Set up save button handler
        const saveBtn = this.titleEditPopover.querySelector('.title-save-btn');
        saveBtn.addEventListener('click', () => this.saveTitleEdit());
        
        // Set up keyboard handlers
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveTitleEdit();
            } else if (e.key === 'Escape') {
                this.closeTitleEditPopover();
            }
        });
        
        // Close when clicking outside
        const outsideClickHandler = (e) => {
            if (!this.titleEditPopover.contains(e.target) && e.target !== titleEl) {
                this.closeTitleEditPopover();
                document.removeEventListener('click', outsideClickHandler);
            }
        };
        
        // Add the click handler after a delay to avoid the current click triggering it
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
        }, 10);
    },
    
    /**
     * Saves the title edit
     */
    saveTitleEdit() {
        if (!this.titleEditPopover) return;
        
        const input = this.titleEditPopover.querySelector('.title-edit-input');
        const docId = this.titleEditPopover.dataset.docId;
        
        if (input && docId) {
            const newTitle = input.value.trim();
            
            if (newTitle) {
                // Update the document title
                documentStore.updateDocumentTitle(docId, newTitle);
                
                // Update the title in the UI
                const titleEl = document.querySelector(`.document-thumbnail[data-doc-id="${docId}"] .doc-title`);
                if (titleEl) {
                    titleEl.textContent = newTitle;
                }
            }
        }
        
        this.closeTitleEditPopover();
    },
    
    /**
     * Closes the title edit popover
     */
    closeTitleEditPopover() {
        if (this.titleEditPopover) {
            this.titleEditPopover.style.display = 'none';
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
        const safeFilename = doc.name.replace(/[^\w\s]/gi, '_').replace(/\s+/g, '_').toLowerCase();
        a.download = `${safeFilename}.md`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    /**
     * Confirms deletion of a document
     * @param {string} docId - Document ID to delete
     */
    confirmDeleteDocument(docId) {
        const confirmed = confirm('Are you sure you want to delete this document?');
        if (confirmed) {
            // Delete from storage
            const deleted = documentStore.deleteDocument(docId);
            
            if (deleted) {
                // Remove from UI
                const thumbnail = document.querySelector(`.document-thumbnail[data-doc-id="${docId}"]`);
                if (thumbnail) {
                    thumbnail.remove();
                }
                
                // Update storage info
                this.updateStorageInfo();
                
                // If current document was deleted, clear the ID
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
            
            // Create a new document using the Document constructor and saveDocument method
            // instead of the non-existent createDocument method
            const now = new Date().toISOString();
            const newDoc = new documentStore.Document(
                null, // generate a new ID
                file.name.replace(/\.\w+$/, ''), // Use filename without extension as name
                content,
                now, // creation time
                now  // last edited time
            );
            
            // Save the document
            const doc = documentStore.saveDocument(newDoc);
            
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
                
                // Validate structure
                if (!Array.isArray(importedData)) {
                    throw new Error('Invalid backup format: Expected an array of documents');
                }
                
                // Make sure modal is open to show the import status
                if (!this.isModalOpen()) {
                    this.openModal();
                }
                
                // Store temporarily for conflict resolution
                this.storeImportedDocsTemporarily(importedData);
                
                // Add a short delay to ensure modal is fully rendered
                setTimeout(() => {
                    this.processImportedDocuments(importedData);
                }, 100);
                
            } catch (error) {
                console.error('Error processing backup file:', error);
                alert('Failed to import backup: ' + error.message);
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
     * Process imported documents from a backup
     * @param {Array} importedDocs - The imported document array
     */
    processImportedDocuments(importedDocs) {
        try {
            if (!Array.isArray(importedDocs) || importedDocs.length === 0) {
                console.warn('No valid documents found in the import file');
                alert('No valid documents found in the import file.');
                return;
            }
            
            // Replace the check for ensureModalReady() with a direct check for the modal
            if (!this.modal || !document.body.contains(this.modal)) {
                console.error('Modal is not initialized or not in the DOM');
                alert('Cannot import: The document modal is not ready.');
                return;
            }

            // Get current documents for comparison
            const currentDocs = documentStore.getAllDocuments();
            const currentDocIds = currentDocs.map(doc => doc.id);
            
            // Statistics for status toolbar
            const stats = {
                imported: 0,
                conflicting: 0
            };
            
            // Create and show the import status toolbar
            this.createImportStatusToolbar();
            
            // Clear any previous highlights
            this.clearImportStatusUI();
            
            // Process each imported document
            importedDocs.forEach(importedDoc => {
                // Validate the document has required fields
                if (!importedDoc.id || typeof importedDoc.content === 'undefined') {
                    console.warn('Skipping invalid document in import');
                    return;
                }
                
                // Check if this document ID already exists
                const hasConflict = currentDocIds.includes(importedDoc.id);
                
                if (hasConflict) {
                    // Handle conflict
                    stats.conflicting++;
                    this.handleDocumentConflict(importedDoc, currentDocs.find(doc => doc.id === importedDoc.id));
                } else {
                    // No conflict, add as new document
                    try {
                        const newDoc = new documentStore.Document(
                            importedDoc.id,
                            importedDoc.name,
                            importedDoc.content,
                            importedDoc.createdAt,
                            importedDoc.lastEditedAt
                        );
                        
                        documentStore.saveDocument(newDoc);
                        stats.imported++;
                    } catch (error) {
                        console.error('Error importing document:', error);
                    }
                }
            });
            
            // Update the UI
            this.loadDocuments();
            this.updateStorageInfo();
            
            // Highlight newly imported docs and update conflict UI
            this.highlightImportedDocuments(importedDocs, stats);
            
            console.log(`Import completed: ${stats.imported} imported, ${stats.conflicting} conflicts`);
        } catch (error) {
            console.error('Error processing imported documents:', error);
            alert('Error processing imported documents. See console for details.');
        }
    },
    
    /**
     * Creates the import status toolbar for conflict resolution
     */
    createImportStatusToolbar() {
        // Remove any existing toolbar first
        this.clearImportStatusUI();
        
        // Check if modal exists - using this.modal instead of this.modalEl
        if (!this.modal) {
            console.error('Modal element not found');
            return;
        }
        
        // Create the toolbar
        this.importStatusToolbar = document.createElement('div');
        this.importStatusToolbar.className = 'import-status-toolbar';
        
        // Find the modal footer - ensure modal exists first
        const modalFooter = this.modal.querySelector('.modal-footer');
        
        if (!modalFooter) {
            console.error('Modal footer not found');
            // Insert at the end of the modal as fallback
            this.modal.appendChild(this.importStatusToolbar);
        } else {
            // Insert before the footer
            this.modal.insertBefore(this.importStatusToolbar, modalFooter);
        }
    },
    
    /**
     * Clears any import status UI elements
     */
    clearImportStatusUI() {
        if (this.importStatusToolbar) {
            // Make sure the element still exists in the DOM
            if (this.importStatusToolbar.parentNode) {
                this.importStatusToolbar.parentNode.removeChild(this.importStatusToolbar);
            }
            this.importStatusToolbar = null;
        }
        
        // Remove any conflict overlays or highlight borders
        // Use document.querySelectorAll to make sure we're searching in the entire document
        const highlightedDocs = document.querySelectorAll('.imported-doc, .conflict-doc');
        highlightedDocs.forEach(el => {
            el.classList.remove('imported-doc', 'conflict-doc');
            const overlay = el.querySelector('.conflict-overlay');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
    },
    
    /**
     * Highlight imported documents in the UI
     * @param {Array} importedDocs - The imported document array
     * @param {Object} stats - Import statistics
     */
    highlightImportedDocuments(importedDocs, stats) {
        // Ensure import status toolbar is updated
        this.updateImportStatusToolbar(stats);
        
        // Find and highlight all imported documents
        const allDocThumbnails = document.querySelectorAll('.document-thumbnail');
        
        allDocThumbnails.forEach(thumbnail => {
            const docId = thumbnail.dataset.docId;
            const importedDoc = importedDocs.find(doc => doc.id === docId);
            
            if (importedDoc) {
                // Check if this is a conflict
                if (thumbnail.querySelector('.conflict-overlay')) {
                    thumbnail.classList.add('conflict-doc');
                } else {
                    thumbnail.classList.add('imported-doc');
                }
            }
        });
    },
    
    /**
     * Handle a document conflict
     * @param {Object} importedDoc - The imported document
     * @param {Object} currentDoc - The current document with the same ID
     */
    handleDocumentConflict(importedDoc, currentDoc) {
        // Find the thumbnail for this document
        setTimeout(() => {
            const thumbnail = document.querySelector(`.document-thumbnail[data-doc-id="${currentDoc.id}"]`);
            if (!thumbnail) return;
            
            // Add conflict class
            thumbnail.classList.add('conflict-doc');
            
            // Format dates for better readability
            const importedDate = new Date(importedDoc.lastEditedAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const currentDate = new Date(currentDoc.lastEditedAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Create conflict overlay
            const overlay = document.createElement('div');
            overlay.className = 'conflict-overlay';
            overlay.innerHTML = `
                <button class="keep-current-btn">Keep current<br>${currentDate}</button>
                <button class="keep-imported-btn">Keep imported<br>${importedDate}</button>
            `;
            
            // Add event handlers
            const keepCurrentBtn = overlay.querySelector('.keep-current-btn');
            keepCurrentBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent document selection
                this.resolveConflict(currentDoc.id, 'current', importedDoc);
            });
            
            const keepImportedBtn = overlay.querySelector('.keep-imported-btn');
            keepImportedBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent document selection
                this.resolveConflict(currentDoc.id, 'imported', importedDoc);
            });
            
            // Add overlay to thumbnail
            thumbnail.appendChild(overlay);
        }, 100); // Short delay to ensure thumbnail exists after loadDocuments()
    },
    
    /**
     * Update the import status toolbar with statistics
     * @param {Object} stats - Import statistics
     */
    updateImportStatusToolbar(stats) {
        if (!this.importStatusToolbar) return;
        
        this.importStatusToolbar.innerHTML = `
            <div class="import-status-info">
                <div>Documents imported: ${stats.imported}</div>
                <div>Conflicts: ${stats.conflicting}</div>
            </div>
            ${stats.conflicting > 0 ? `
            <div class="import-status-actions">
                <span>${stats.conflicting} conflicting ${stats.conflicting === 1 ? 'doc' : 'docs'}:</span>
                <button class="keep-all-btn" title="Replace all conflicting docs with imported versions">Keep all imported</button>
                <button class="discard-all-btn" title="Keep all current versions">Discard all imported</button>
            </div>` : ''}
        `;
        
        // Add event handlers for bulk actions if there are conflicts
        if (stats.conflicting > 0) {
            const keepAllBtn = this.importStatusToolbar.querySelector('.keep-all-btn');
            const discardAllBtn = this.importStatusToolbar.querySelector('.discard-all-btn');
            
            if (keepAllBtn) {
                keepAllBtn.addEventListener('click', () => this.resolveAllConflicts('imported'));
            }
            
            if (discardAllBtn) {
                discardAllBtn.addEventListener('click', () => this.resolveAllConflicts('current'));
            }
        }
    },
    
    /**
     * Resolve a single document conflict
     * @param {string} docId - Document ID
     * @param {string} keepVersion - Which version to keep ('current' or 'imported')
     * @param {Object} importedDoc - The imported document (needed if keeping imported)
     */
    resolveConflict(docId, keepVersion, importedDoc) {
        const thumbnail = document.querySelector(`.document-thumbnail[data-doc-id="${docId}"]`);
        if (!thumbnail) return;
        
        let updatedDoc = null;
        
        if (keepVersion === 'imported' && importedDoc) {
            // Save the imported version, replacing the current one
            updatedDoc = documentStore.saveDocument({
                id: importedDoc.id,
                name: importedDoc.name,
                content: importedDoc.content,
                createdAt: importedDoc.createdAt,
                lastEditedAt: importedDoc.lastEditedAt
            });
            
            // Update the editor if this is the current document
            this.updateOpenDocumentIfNeeded(docId, importedDoc);
            
            // Also update the thumbnail preview text
            const previewEl = thumbnail.querySelector('.doc-preview');
            if (previewEl) {
                // Create a clean preview text
                const previewText = importedDoc.content
                    .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
                    .replace(/^#+\s/gm, '') // Remove heading markers
                    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers
                    .replace(/\*(.+?)\*/g, '$1') // Remove italic markers
                    .replace(/~~(.+?)~~/g, '$1') // Remove strikethrough markers
                    .substring(0, 300); // Limit length
                
            previewEl.innerHTML = previewText;
            }
            
            // Update the title if it changed
            const titleEl = thumbnail.querySelector('.doc-title');
            if (titleEl && importedDoc.name) {
                titleEl.textContent = importedDoc.name;
            }
            
            // Update the last edited date
            const lastEditedEl = thumbnail.querySelector('.last-edited');
            if (lastEditedEl && importedDoc.lastEditedAt) {
                const formattedDate = new Date(importedDoc.lastEditedAt).toLocaleString();
                lastEditedEl.textContent = `Last edited: ${formattedDate}`;
            }
        }
        
        // Update UI
        thumbnail.classList.remove('conflict-doc');
        thumbnail.classList.add('imported-doc');
        
        // Remove conflict overlay
        const overlay = thumbnail.querySelector('.conflict-overlay');
        if (overlay) overlay.remove();
        
        // Update stats in toolbar
        const conflictingCount = document.querySelectorAll('.conflict-doc').length;
        const importedCount = document.querySelectorAll('.imported-doc').length;
        
        const stats = {
            imported: importedCount,
            conflicting: conflictingCount
        };
        
        this.updateImportStatusToolbar(stats);
        
        // If no more conflicts, consider removing the toolbar after a delay
        if (conflictingCount === 0) {
            setTimeout(() => {
                if (this.importStatusToolbar && document.querySelectorAll('.conflict-doc').length === 0) {
                    // Fade out animation if desired
                    this.importStatusToolbar.style.opacity = '0';
                    this.importStatusToolbar.style.transition = 'opacity 0.5s ease';
                    
                    // Remove after animation completes
                    setTimeout(() => {
                        if (this.importStatusToolbar && this.importStatusToolbar.parentNode) {
                            this.importStatusToolbar.parentNode.removeChild(this.importStatusToolbar);
                            this.importStatusToolbar = null;
                        }
                    }, 500);
                }
            }, 2000); // Show resolved state for 2 seconds before removing
        }
    },
    
    /**
     * Resolve all conflicts at once
     * @param {string} keepVersion - Which version to keep ('current' or 'imported')
     */
    resolveAllConflicts(keepVersion) {
        const confirmMessage = keepVersion === 'imported' 
            ? 'Replace all conflicting documents with imported versions?' 
            : 'Keep all current versions and discard imported conflicts?';
            
        if (confirm(confirmMessage)) {
            // Get all conflict thumbnails
            const conflictThumbnails = document.querySelectorAll('.conflict-doc');
            
            // Get all imported docs to find the matching ones
            const importedDocsJson = localStorage.getItem('tempImportedDocs');
            if (!importedDocsJson) {
                console.error('Could not find imported docs data');
                return;
            }
            
            const importedDocs = JSON.parse(importedDocsJson);
            
            // Process each conflict
            conflictThumbnails.forEach(thumbnail => {
                const docId = thumbnail.dataset.docId;
                const importedDoc = importedDocs.find(doc => doc.id === docId);
                
                if (docId && importedDoc) {
                    this.resolveConflict(docId, keepVersion, importedDoc);
                }
            });
            
            console.log(`Bulk resolution complete. Action: keep ${keepVersion} versions`);
        }
    },
    
    /**
     * Temporarily store imported docs in localStorage to use for conflict resolution
     * @param {Array} importedDocs - Array of imported documents
     */
    storeImportedDocsTemporarily(importedDocs) {
        // Store in localStorage temporarily to access during conflict resolution
        localStorage.setItem('tempImportedDocs', JSON.stringify(importedDocs));
        
        // Set a cleanup timeout
        setTimeout(() => {
            localStorage.removeItem('tempImportedDocs');
        }, 30 * 60 * 1000); // Remove after 30 minutes
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
    },
    
    /**
     * Loads a document into the editor
     * @param {string} docId - Document ID
     */
    loadDocumentIntoEditor(docId) {
        const doc = documentStore.getDocumentById(docId);
        if (!doc) {
            console.error(`Document with ID ${docId} not found`);
            return;
        }
        
        // Set as current document
        localStorage.setItem('currentDocId', doc.id);
        
        // Emit a custom event that the editor can listen for
        const loadEvent = new CustomEvent('loadDocument', {
            detail: { document: doc }
        });
        document.dispatchEvent(loadEvent);
        
        console.log(`Loading document: ${doc.name} (${doc.id})`);
        
        // Update the editor content directly if needed
        const editorEl = document.getElementById('editor');
        if (editorEl) {
            editorEl.innerHTML = doc.content;
            
            // If editor module is available through window, perform any necessary updates
            if (window.editor && typeof window.editor.processContent === 'function') {
                window.editor.processContent();
            }
            
            // If undoManager is available, record the initial state
            if (window.editor && window.editor.undoManager) {
                window.editor.undoManager.recordInitialState();
            }
        }
        
        // Close the modal
        this.closeModal();
    },
    
    /**
     * Updates the editor content if the imported document is the currently active one
     * @param {string} docId - Document ID that was updated
     * @param {Object} updatedDoc - The updated document object
     */
    updateOpenDocumentIfNeeded(docId, updatedDoc) {
        // Check if this is the currently open document
        const currentDocId = localStorage.getItem('currentDocId');
        
        if (currentDocId === docId) {
            console.log('Updating currently open document with imported content');
            
            // Update the editor content
            const editorEl = document.getElementById('editor');
            if (editorEl) {
                editorEl.innerHTML = updatedDoc.content;
                
                // If editor module is available, process the content
                if (window.editor && typeof window.editor.processContent === 'function') {
                    window.editor.processContent();
                }
                
                // If undoManager is available, record the new state
                if (window.editor && window.editor.undoManager) {
                    window.editor.undoManager.recordInitialState();
                }
            }
            
            // Dispatch an event to notify other components
            const updateEvent = new CustomEvent('documentUpdated', {
                detail: { document: updatedDoc }
            });
            document.dispatchEvent(updateEvent);
        }
    },
};

export default modalManager;
