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
        if (!this.editor || !listItemElement) return;

        const parentList = listItemElement.parentNode;
        if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) {
            return; // Not a valid list structure
        }

        const previousListItem = listItemElement.previousElementSibling;

        if (previousListItem && previousListItem.tagName === 'LI') {
            // We can indent: move listItemElement into a sublist of previousListItem
            let subList = previousListItem.querySelector('ul, ol');

            if (!subList) {
                // Previous LI doesn't have a sublist, create one
                subList = document.createElement(parentList.tagName); // UL or OL, same as parent
                previousListItem.appendChild(subList);
            }

            // Move the current listItemElement into the subList
            subList.appendChild(listItemElement);
            console.log('[DOM Render] List item indented.');

            // Set caret at the beginning of the (now indented) listItemElement's text
            try {
                const sel = window.getSelection();
                const rng = document.createRange();
                let firstTextNode = null;
                
                // Find the first text node in the listItemElement, or create one if empty
                if (listItemElement.firstChild && listItemElement.firstChild.nodeType === Node.TEXT_NODE) {
                    firstTextNode = listItemElement.firstChild;
                } else if (listItemElement.firstChild && listItemElement.firstChild.childNodes.length > 0 && listItemElement.firstChild.childNodes[0].nodeType === Node.TEXT_NODE) {
                    // Handles cases where content might be wrapped, e.g. by browser
                    firstTextNode = listItemElement.firstChild.childNodes[0];
                } else { // LI is empty or has no initial text node (e.g. just <br>)
                    // Clear content and add an empty text node for caret
                    listItemElement.innerHTML = ''; // Clear any <br> etc.
                    firstTextNode = document.createTextNode('');
                    listItemElement.appendChild(firstTextNode);
                }

                rng.setStart(firstTextNode, 0);
                rng.collapse(true);
                sel.removeAllRanges();
                sel.addRange(rng);
            } catch (e) {
                listItemElement.focus(); // Fallback
            }
            
            // Notify editor that DOM changed and caret needs to be updated for display/saving
            // The editor's keydown handler already calls updateCaretDisplayAndSave after listManager calls.
            // However, if listManager itself needs to trigger a save or full caret recalculation:
            // this.editor.applyFocusAndSave(this.editor.getAbsoluteCaretPosition(), true);
            // For now, the existing updateCaretDisplayAndSave in editor.js keydown should suffice.

        } else {
            // Cannot indent: it's the first item in its list, or previous sibling isn't an LI.
            // console.log('[Log] listManager: Cannot indent further.');
        }
    },

    handleShiftTab(listItemElement) {
        if (!this.editor || !listItemElement) return;
        // console.log('[Log] listManager: handleShiftTab called for LI:', listItemElement.textContent.substring(0,20));
        // No DOM change, no focus change. True no-op for now.
        // If DOM is changed in future: console.log('[DOM Render] List item outdented/transformed.');
    }
};

export default listManager;
