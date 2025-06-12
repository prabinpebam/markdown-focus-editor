const DOC_STORAGE_KEY = 'markdownFocusEditorDocs';

/**
 * Generates a unique ID based on timestamp and a random suffix.
 * @returns {string} A unique identifier.
 */
function generateUniqueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a document title from its content.
 * Extracts the first 100 characters of text content, stripping leading/trailing whitespace and newlines.
 * @param {string} content - The document content.
 * @returns {string} The generated title.
 */
function generateTitleFromContent(content) {
    if (!content || typeof content !== 'string') {
        return 'Untitled Document';
    }
    // Basic stripping of HTML/Markdown for preview might be too complex here.
    // For now, just take plain text. A more sophisticated approach might involve a lightweight parser.
    const textContent = content.replace(/<\/?[^>]+(>|$)/g, "").trim(); // Basic HTML tag stripping
    const firstLine = textContent.split('\n')[0];
    return firstLine.substring(0, 100) || 'Untitled Document';
}

/**
 * Retrieves all documents from localStorage.
 * @returns {Document[]} An array of Document objects.
 */
function getDocuments() {
    const docsJson = localStorage.getItem(DOC_STORAGE_KEY);
    return docsJson ? JSON.parse(docsJson) : [];
}

/**
 * Saves all documents to localStorage.
 * @param {Document[]} docsArray - An array of Document objects.
 */
function _saveAllDocumentsToStorage(docsArray) {
    localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(docsArray));
}

/**
 * Retrieves a single document by its ID.
 * @param {string} id - The ID of the document.
 * @returns {Document|null} The Document object or null if not found.
 */
function getDocumentById(id) {
    const docs = getDocuments();
    return docs.find(doc => doc.id === id) || null;
}

/**
 * Saves a document (adds if new, updates if existing).
 * Updates lastEditedAt. If new, sets createdAt.
 * If docObject.name is not provided or is based on old content,
 * it re-runs generateTitleFromContent if it's a new document or content changed significantly
 * and the title wasn't manually set.
 * @param {object} docData - Object containing document data ({ id, name, content }).
 * @returns {Document} The saved/updated Document object.
 */
function saveDocument(docData) {
    let docs = getDocuments();
    const now = new Date().toISOString();
    let existingDoc = docData.id ? docs.find(d => d.id === docData.id) : null;

    if (existingDoc) {
        // Update existing document
        existingDoc.content = docData.content !== undefined ? docData.content : existingDoc.content;
        // Only update name if provided, otherwise keep existing.
        // If content changed and name was auto-generated, it might need re-evaluation,
        // but for simplicity, manual name changes are preferred via updateDocumentTitle.
        if (docData.name !== undefined) {
            existingDoc.name = docData.name;
        }
        existingDoc.lastEditedAt = now;
    } else {
        // Add new document
        const newId = docData.id || generateUniqueId();
        const newName = docData.name || generateTitleFromContent(docData.content || '');
        const newDoc = {
            id: newId,
            name: newName,
            content: docData.content || '',
            createdAt: now,
            lastEdited: now,
        };
        docs.push(newDoc);
        existingDoc = newDoc; // to return the newly created doc
    }

    _saveAllDocumentsToStorage(docs);
    return existingDoc; // Return the saved or updated document instance
}

/**
 * Updates the title of a specific document.
 * @param {string} id - The ID of the document to update.
 * @param {string} newTitle - The new title for the document.
 * @returns {Document|null} The updated Document object or null if not found.
 */
function updateDocumentTitle(id, newTitle) {
    let docs = getDocuments();
    const docIndex = docs.findIndex(doc => doc.id === id);

    if (docIndex > -1 && newTitle && typeof newTitle === 'string') {
        docs[docIndex].name = newTitle.trim();
        docs[docIndex].lastEditedAt = new Date().toISOString();
        _saveAllDocumentsToStorage(docs);
        return docs[docIndex];
    }
    return null;
}

/**
 * Deletes a document by its ID.
 * @param {string} id - The ID of the document to delete.
 * @returns {boolean} True if deletion was successful, false otherwise.
 */
function deleteDocument(id) {
    let docs = getDocuments();
    const initialLength = docs.length;
    docs = docs.filter(doc => doc.id !== id);

    if (docs.length < initialLength) {
        _saveAllDocumentsToStorage(docs);
        return true;
    }
    return false;
}

/**
 * Gets the current storage usage in bytes and percent
 * @returns {Object} {bytes: number, percent: number}
 */
function getStorageUsage() {
    const docsJson = localStorage.getItem(DOC_STORAGE_KEY);
    const sizeInBytes = docsJson ? new TextEncoder().encode(docsJson).length : 0;
    const totalDocs = docsJson ? JSON.parse(docsJson).length : 0;
    return {
        sizeInBytes: sizeInBytes,
        totalDocs: totalDocs,
        sizeInKB: (sizeInBytes / 1024).toFixed(2),
        sizeInMB: (sizeInBytes / (1024 * 1024)).toFixed(2),
    };
}

/**
 * Imports documents from an external source.
 * @param {Array} importedDocs - Array of documents to import.
 * @param {Function} [conflictResolver] - Optional conflict resolution function.
 * @returns {Object} Result of the import operation.
 */
function importDocuments(importedDocs, conflictResolver = (existing, imported) => imported) {
    // Basic import, more complex conflict UI needed in modalManager
    let currentDocs = getDocuments();
    let newDocsAddedCount = 0;
    let conflictedDocs = [];

    importedDocs.forEach(importedDoc => {
        const existingDocIndex = currentDocs.findIndex(d => d.id === importedDoc.id);
        if (existingDocIndex > -1) {
            // Conflict: For now, just an example. Real resolution will be UI driven.
            // Store for UI resolution
            conflictedDocs.push({ existing: currentDocs[existingDocIndex], imported: importedDoc });
            // Simple strategy: replace (can be changed by conflictResolver)
            // currentDocs[existingDocIndex] = conflictResolver(currentDocs[existingDocIndex], importedDoc);
        } else {
            currentDocs.push(importedDoc);
            newDocsAddedCount++;
        }
    });
    // saveDocuments(currentDocs); // Save will happen after UI resolution
    console.log(`[DocumentStore] Import processed. New: ${newDocsAddedCount}, Conflicts: ${conflictedDocs.length}`);
    return { currentDocs, newDocsAddedCount, conflictedDocs }; // Return for modalManager to handle UI
}

/**
 * Saves documents after import or conflict resolution.
 * @param {Array} docsToSave - Array of document objects to save.
 */
function saveImportedDocuments(docsToSave) {
    _saveAllDocumentsToStorage(docsToSave);
    console.log('[DocumentStore] Saved documents after import/conflict resolution.');
}

const documentStore = {
    getAllDocuments() {
        return getDocuments();
    },

    getDocuments() {
        return getDocuments();
    },

    getDocumentById(id) {
        const docs = getDocuments();
        return docs.find(doc => doc.id === id) || null;
    },

    createNewDocument(name = 'Untitled Document', content = '<div><br></div>') {
        const docs = getDocuments();
        const now = new Date().toISOString();
        const newDoc = {
            id: generateUniqueId(),
            name: name,
            createdAt: now,
            lastEdited: now,
            content: content,
        };
        docs.push(newDoc);
        _saveAllDocumentsToStorage(docs);
        localStorage.setItem('currentDocId', newDoc.id);
        console.log('[DocumentStore] Created new document:', newDoc.id, newDoc.name);
        return newDoc;
    },

    updateDocument(id, updatedProps) {
        let docs = getDocuments();
        const docIndex = docs.findIndex(doc => doc.id === id);
        if (docIndex > -1) {
            docs[docIndex] = { ...docs[docIndex], ...updatedProps, lastEdited: new Date().toISOString() };
            _saveAllDocumentsToStorage(docs);
            console.log('[DocumentStore] Updated document:', id);
            return docs[docIndex];
        }
        console.warn('[DocumentStore] Update failed: Document not found', id);
        return null;
    },

    saveDocument(docToSave) {
        if (!docToSave) {
            console.warn('[DocumentStore] Save failed: Invalid document data');
            return null;
        }
        
        // If no ID, create new document
        if (!docToSave.id) {
            return this.createNewDocument(docToSave.name, docToSave.content);
        }
        
        // Otherwise update existing
        return this.updateDocument(docToSave.id, { name: docToSave.name, content: docToSave.content });
    },

    deleteDocument(id) {
        let docs = getDocuments();
        const initialLength = docs.length;
        docs = docs.filter(doc => doc.id !== id);
        if (docs.length < initialLength) {
            _saveAllDocumentsToStorage(docs);
            console.log('[DocumentStore] Deleted document:', id);
            if (localStorage.getItem('currentDocId') === id) {
                localStorage.removeItem('currentDocId');
            }
            return true;
        }
        console.warn('[DocumentStore] Delete failed: Document not found', id);
        return false;
    },

    getStorageUsage() {
        const docsJson = localStorage.getItem(DOC_STORAGE_KEY);
        const sizeInBytes = docsJson ? new TextEncoder().encode(docsJson).length : 0;
        const totalDocs = docsJson ? JSON.parse(docsJson).length : 0;
        return {
            sizeInBytes: sizeInBytes,
            totalDocs: totalDocs,
            sizeInKB: (sizeInBytes / 1024).toFixed(2),
            sizeInMB: (sizeInBytes / (1024 * 1024)).toFixed(2),
        };
    },

    importDocuments(importedDocs, conflictResolver = (existing, imported) => imported) {
        let currentDocs = getDocuments();
        let newDocsAddedCount = 0;
        let conflictedDocs = [];

        importedDocs.forEach(importedDoc => {
            const existingDocIndex = currentDocs.findIndex(d => d.id === importedDoc.id);
            if (existingDocIndex > -1) {
                conflictedDocs.push({ existing: currentDocs[existingDocIndex], imported: importedDoc });
            } else {
                currentDocs.push(importedDoc);
                newDocsAddedCount++;
            }
        });
        
        console.log(`[DocumentStore] Import processed. New: ${newDocsAddedCount}, Conflicts: ${conflictedDocs.length}`);
        return { currentDocs, newDocsAddedCount, conflictedDocs };
    },
    
    saveImportedDocuments(docsToSave) {
        _saveAllDocumentsToStorage(docsToSave);
        console.log('[DocumentStore] Saved documents after import/conflict resolution.');
    }
};

export default documentStore;
