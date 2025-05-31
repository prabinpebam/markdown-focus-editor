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

    handleTab(listItemElement, originalAnchorNode, originalAnchorOffset) { // Added parameters
        if (!this.editor || !listItemElement) {
            console.log('[handleTab] Aborted: No editor or listItemElement.');
            return;
        }
        console.log('[handleTab] Processing LI: "' + listItemElement.textContent.trim().substring(0, 50) + 
                    '" with original caret: Node:', originalAnchorNode, 'Offset:', originalAnchorOffset);

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
            // Verify the new parent of listItemElement
            console.log('[handleTab Case 2] listItemElement new parent is: <' + (listItemElement.parentNode ? listItemElement.parentNode.tagName : 'null') + 
                        '>. Expected parent (targetList) was: <' + targetList.tagName + '>.');
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
                console.log('[handleTab setTimeout] Attempting to restore caret for LI: "' + listItemElement.textContent.trim().substring(0,50) + '"');

                try {
                    let caretRestoredToOriginal = false;
                    if (originalAnchorNode && listItemElement.contains(originalAnchorNode)) {
                        // Check if originalAnchorNode can accept the offset
                        if (originalAnchorNode.nodeType === Node.TEXT_NODE || 
                            (originalAnchorNode.nodeType === Node.ELEMENT_NODE && originalAnchorOffset <= originalAnchorNode.childNodes.length)) {
                            
                            // Validate offset for text nodes
                            if (originalAnchorNode.nodeType === Node.TEXT_NODE && originalAnchorOffset > originalAnchorNode.nodeValue.length) {
                                console.log('[handleTab setTimeout] Original anchorOffset exceeds text node length. Falling back.');
                            } else {
                                rng.setStart(originalAnchorNode, originalAnchorOffset);
                                caretRestoredToOriginal = true;
                                console.log('[handleTab setTimeout] Caret RESTORED to original position in Node:', originalAnchorNode, 'Offset:', originalAnchorOffset);
                            }
                        } else {
                            console.log('[handleTab setTimeout] Original anchorNode type/offset invalid for setStart. Falling back.');
                        }
                    } else {
                        console.log('[handleTab setTimeout] Original anchorNode not found in listItemElement or invalid. Falling back.');
                    }

                    if (!caretRestoredToOriginal) {
                        // Fallback: Place caret at the beginning of the listItemElement
                        let targetNodeForFallback = listItemElement.firstChild;
                        if (!targetNodeForFallback || targetNodeForFallback.nodeType !== Node.TEXT_NODE) {
                            const newTextNode = document.createTextNode('');
                            if (targetNodeForFallback) { // If firstChild exists but isn't text (e.g. <br>)
                                listItemElement.insertBefore(newTextNode, targetNodeForFallback);
                            } else { // If listItemElement is completely empty
                                listItemElement.appendChild(newTextNode);
                            }
                            targetNodeForFallback = newTextNode;
                        }
                        rng.setStart(targetNodeForFallback, 0);
                        console.log('[handleTab setTimeout] Caret set to FALLBACK position (start of LI) in Node:', targetNodeForFallback);
                    }
                    
                    rng.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(rng);
                    // console.log('[handleTab setTimeout] Final caret set. Node parent:', sel.anchorNode.parentNode ? sel.anchorNode.parentNode.tagName : 'null');
                    
                } catch (e) {
                    console.error("[handleTab setTimeout] Error setting caret:", e, "Attempting focus on LI.");
                    listItemElement.focus(); // General fallback
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
