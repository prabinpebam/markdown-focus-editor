const STORAGE_KEY = 'markdownDocs';

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
 * Represents a document.
 * @class
 * @param {string} id - Unique ID.
 * @param {string} name - Document name/title.
 * @param {string} content - Markdown content.
 * @param {string} [createdAt] - ISO date string of creation.
 * @param {string} [lastEditedAt] - ISO date string of last edit.
 */
class Document {
    constructor(id, name, content, createdAt, lastEditedAt) {
        this.id = id || generateUniqueId();
        this.content = content || '';
        this.name = name || generateTitleFromContent(this.content);
        const now = new Date().toISOString();
        this.createdAt = createdAt || now;
        this.lastEditedAt = lastEditedAt || now;
    }
}

/**
 * Retrieves all documents from localStorage.
 * @returns {Document[]} An array of Document objects.
 */
function getAllDocuments() {
    const docsJson = localStorage.getItem(STORAGE_KEY);
    if (docsJson) {
        const docsArray = JSON.parse(docsJson);
        return docsArray.map(doc => new Document(doc.id, doc.name, doc.content, doc.createdAt, doc.lastEditedAt));
    }
    return [];
}

/**
 * Saves all documents to localStorage.
 * @param {Document[]} docsArray - An array of Document objects.
 */
function _saveAllDocumentsToStorage(docsArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docsArray));
}

/**
 * Retrieves a single document by its ID.
 * @param {string} id - The ID of the document.
 * @returns {Document|null} The Document object or null if not found.
 */
function getDocumentById(id) {
    const docs = getAllDocuments();
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
    let docs = getAllDocuments();
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
        const newDoc = new Document(newId, newName, docData.content || '', now, now);
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
    let docs = getAllDocuments();
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
    let docs = getAllDocuments();
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
    const docs = getAllDocuments();
    const docsJson = JSON.stringify(docs);
    const storageSize = new Blob([docsJson]).size;
    
    // Calculate percentage of 5MB limit (localStorage typical limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = Math.min(100, (storageSize / maxSize) * 100);
    
    return {
        bytes: storageSize,
        percent: percentage
    };
}

export default {
    Document, // Exporting class for potential type checking or direct instantiation if needed
    generateUniqueId,
    generateTitleFromContent,
    getAllDocuments,
    getDocumentById,
    saveDocument,
    updateDocumentTitle,
    deleteDocument,
    getStorageUsage // Add new utility function
};
