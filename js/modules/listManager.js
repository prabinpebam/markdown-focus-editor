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

        const listElement = document.createElement(listType);
        const listItemElement = document.createElement('li');
        
        const listItemTextNode = document.createTextNode(itemText);
        listItemElement.appendChild(listItemTextNode);
        listElement.appendChild(listItemElement);

        blockNode.replaceWith(listElement);
        console.log(`[DOM Render] Converted block to <${listType}> list.`);

        try {
            const sel = window.getSelection();
            const rng = document.createRange();
            
            rng.setStart(listItemTextNode, listItemTextNode.data.length); 
            rng.collapse(true);
            sel.removeAllRanges();
            sel.addRange(rng);
        } catch (e) {
            listItemElement.focus(); 
        }
        return true;
    },

    handleTab(listItemElement) {
        if (!this.editor || !listItemElement) {
            console.log('[handleTab] Aborted: No editor or listItemElement.');
            return;
        }
        console.log('[handleTab] Processing LI: "' + listItemElement.textContent.trim().substring(0, 50) + '..."');

        const parentList = listItemElement.parentNode;
        if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) {
            console.log('[handleTab] Aborted: listItemElement has no valid UL/OL parentList. Parent:', parentList);
            return; 
        }
        console.log('[handleTab] ParentList is:', parentList.tagName);

        const previousSibling = listItemElement.previousElementSibling;
        if (previousSibling) {
            console.log('[handleTab] Found previousElementSibling: <' + previousSibling.tagName + '> "' + previousSibling.textContent.trim().substring(0, 50) + '..."');
        } else {
            console.log('[handleTab] No previousElementSibling found for LI: "' + listItemElement.textContent.trim().substring(0, 50) + '..."');
        }

        let indented = false;

        if (previousSibling && previousSibling.tagName === 'LI') {
            // Case 1: Previous sibling is an LI. Indent under it.
            console.log('[handleTab] Case 1: Previous sibling is an LI. Attempting to indent under it.');
            let subList = previousSibling.querySelector(':scope > ul, :scope > ol'); 
            
            if (subList) {
                console.log('[handleTab] Found existing subList in previousLI: <' + subList.tagName + '>');
            } else {
                console.log('[handleTab] No existing subList in previousLI. Creating new one: <' + parentList.tagName + '>');
                subList = document.createElement(parentList.tagName); 
                previousSibling.appendChild(subList);
                console.log('[handleTab] New subList created and appended to previousLI.');
            }
            
            console.log('[handleTab] Attempting to move LI: "' + listItemElement.textContent.trim().substring(0,50) + 
                        '" into subList of LI: "' + previousSibling.textContent.trim().substring(0,50) + '"');
            subList.appendChild(listItemElement);
            indented = true;
            
        } else if (previousSibling && (previousSibling.tagName === 'UL' || previousSibling.tagName === 'OL')) {
            // Case 2: Previous sibling is a UL or OL. Move current LI into it.
            console.log('[handleTab] Case 2: Previous sibling is a List (' + previousSibling.tagName + '). Attempting to move LI into it.');
            const targetList = previousSibling;
            targetList.appendChild(listItemElement);
            indented = true;
        } else {
            console.log('[handleTab] No valid previous LI sibling or sibling List found. Cannot indent this item using current logic.');
        }

        if (indented) {
            console.log('[DOM Render] List item indented. Moved LI successfully.');
            // Defer caret placement to allow DOM to settle
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel) {
                    console.error('[handleTab setTimeout] Aborted: No selection object.');
                    return; 
                }
                const rng = document.createRange();
                console.log('[handleTab setTimeout] Setting caret for LI: "' + listItemElement.textContent.trim().substring(0,50) + '"');

                try {
                    let targetNodeForCaret = listItemElement.firstChild;

                    if (!targetNodeForCaret || targetNodeForCaret.nodeType !== Node.TEXT_NODE) {
                        console.log('[handleTab setTimeout] First child not a text node or null. Ensuring text node exists.');
                        const newTextNode = document.createTextNode('');
                        if (targetNodeForCaret) { 
                            listItemElement.insertBefore(newTextNode, targetNodeForCaret);
                        } else { 
                            listItemElement.appendChild(newTextNode);
                        }
                        targetNodeForCaret = newTextNode;
                        console.log('[handleTab setTimeout] Created/prepended new text node for caret.');
                    }
                    
                    rng.setStart(targetNodeForCaret, 0);
                    rng.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(rng);
                    console.log('[handleTab setTimeout] Caret set in node:', targetNodeForCaret, 'at offset 0. Node parent:', targetNodeForCaret.parentNode ? targetNodeForCaret.parentNode.tagName : 'null');
                    
                } catch (e) {
                    console.error("[handleTab setTimeout] Error setting caret:", e, "Attempting focus on LI.");
                    listItemElement.focus();
                }
            }, 0); 
        } // This closes the 'if (indented)' block
    }, // This closes the 'handleTab' method

    handleShiftTab(listItemElement) {
        if (!this.editor || !listItemElement) return;
        // console.log('[Log] listManager: handleShiftTab called for LI:', listItemElement.textContent.substring(0,20));
        // No DOM change, no focus change. True no-op for now.
        // If DOM is changed in future: console.log('[DOM Render] List item outdented/transformed.');
    }
}; // This closes the 'listManager' object

export default listManager;
