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
            return; 
        }

        const previousListItem = listItemElement.previousElementSibling;

        if (previousListItem && previousListItem.tagName === 'LI') {
            let subList = previousListItem.querySelector(':scope > ul, :scope > ol'); 

            if (!subList) {
                subList = document.createElement(parentList.tagName); 
                previousListItem.appendChild(subList);
            }

            subList.appendChild(listItemElement);
            console.log('[DOM Render] List item indented.');

            // Defer caret placement to allow DOM to settle
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel) return; 
                const rng = document.createRange();

                try {
                    // 1. Ensure the element that was moved is focused.
                    listItemElement.focus();

                    // 2. Set the selection to the start of the listItemElement.
                    // The browser will find the first valid position.
                    rng.setStart(listItemElement, 0); // Offset 0 means before the first child.
                    rng.collapse(true);

                    sel.removeAllRanges();
                    sel.addRange(rng);

                    // Log the state AFTER setting the caret
                    console.log('[handleTab Caret POST-SET] sel.anchorNode:', sel.anchorNode, 'Offset:', sel.anchorOffset);
                    if (sel.anchorNode) {
                        const parentOfAnchor = sel.anchorNode.parentNode;
                        console.log('[handleTab Caret POST-SET] sel.anchorNode.parentNode:', parentOfAnchor);
                        if (parentOfAnchor && parentOfAnchor.closest) {
                            console.log('[handleTab Caret POST-SET] sel.anchorNode.parentNode.closest("li"):', parentOfAnchor.closest('li'));
                        }
                        // Also check closest on anchorNode itself if it's an element
                        if (sel.anchorNode.closest) {
                             console.log('[handleTab Caret POST-SET] sel.anchorNode.closest("li"):', sel.anchorNode.closest('li'));
                        }
                    }


                } catch (e) {
                    console.error("Error setting caret in handleTab (setTimeout):", e);
                    // Fallback: ensure the element still tries to get focus.
                    listItemElement.focus();
                }
            }, 0); 
            
        } else {
            // Cannot indent further this way.
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
