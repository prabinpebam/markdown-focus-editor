const listManager = {
    editor: null, // To be set by editor.js

    init(editorInstance) {
        this.editor = editorInstance;
        // console.log('listManager initialized');
    },

    // Regex for UL and OL markers
    // Group 1: Leading whitespace (for potential indentation later)
    // Group 2: Marker itself (e.g., "-", "*", "+", "1.")
    // Group 3: Text content after the marker and a space
    ulMarkerRegex: /^(\s*)([-*+])\s+(.*)/,
    olMarkerRegex: /^(\s*)(\d+\.)\s+(.*)/,

    /**
     * Converts a given block element (typically a DIV) into a list (UL or OL).
     * @param {Node} blockNode - The block element to convert (e.g., a DIV).
     * @param {RegExpMatchArray} match - The regex match object from ulMarkerRegex or olMarkerRegex.
     * @param {string} listType - 'ul' or 'ol'.
     * @returns {boolean} - True if transformation occurred, false otherwise.
     */
    convertBlockToList(blockNode, match, listType) {
        if (!this.editor || !blockNode || !match || !listType) return false;

        const itemText = match[3] || ''; 
        // const leadingSpace = match[1] || ''; // Not used yet, but captured

        const listElement = document.createElement(listType);
        const listItemElement = document.createElement('li');
        
        // Prepend ZWSP to ensure caret can be placed at the very beginning if itemText is empty
        // and to provide a non-empty text node.
        const newTextContent = '\u200B' + itemText;
        const listItemTextNode = document.createTextNode(newTextContent);
        listItemElement.appendChild(listItemTextNode);
        listElement.appendChild(listItemElement);

        blockNode.replaceWith(listElement);
        console.log(`[DOM Render] Converted block to <${listType}> list.`);

        try {
            const sel = window.getSelection();
            const rng = document.createRange();
            // Place caret at the end of the text within the new LI
            rng.setStart(listItemTextNode, listItemTextNode.data.length);
            rng.collapse(true);
            sel.removeAllRanges();
            sel.addRange(rng);
        } catch (e) {
            // console.error("[Log] listManager: Error setting caret in new list item", e);
            listItemElement.focus(); 
        }
        return true;
    },

    handleTab(listItemElement) {
        if (!this.editor || !listItemElement) return;
        // console.log('[Log] listManager: handleTab called for LI:', listItemElement.textContent.substring(0,20));
        // TODO: Implement indentation logic
        // If DOM is changed: console.log('[DOM Render] List item indented.');
        this.editor.editorEl.focus(); // Ensure editor retains focus
    },

    handleShiftTab(listItemElement) {
        if (!this.editor || !listItemElement) return;
        // console.log('[Log] listManager: handleShiftTab called for LI:', listItemElement.textContent.substring(0,20));
        // TODO: Implement outdentation logic
        // If DOM is changed: console.log('[DOM Render] List item outdented/transformed.');
        this.editor.editorEl.focus(); // Ensure editor retains focus
    }
};

export default listManager;
