const listManager = {
    editor: null, // To be set by editor.js

    init(editorInstance) {
        this.editor = editorInstance;
        console.log('[ListManager] Initialized with editor instance');
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
        console.log(`[ListManager] Converted block to <${listType}> list with content: "${itemText.substring(0, 30)}${itemText.length > 30 ? '...' : ''}"`);

        // After successful DOM change:
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange(`create${listType.toUpperCase()}List`);
        }

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
            let targetNestingList = previousSibling.querySelector(':scope > ul, :scope > ol'); 
            
            if (targetNestingList) {
                console.log('[handleTab] Found existing subList in previousLI: <' + targetNestingList.tagName + '>');
            } else {
                console.log('[handleTab] No existing subList in previousLI. Creating new one: <' + parentList.tagName + '>');
                targetNestingList = document.createElement(parentList.tagName); 
                previousSibling.appendChild(targetNestingList);
                console.log('[handleTab] New subList created and appended to previousLI.');
            }
            
            console.log('[handleTab] Attempting to move LI: "' + listItemElement.textContent.trim().substring(0,50) + 
                        '" into subList of LI: "' + previousSibling.textContent.trim().substring(0,50) + '"');

            // Check if the listItemElement itself has a sub-list
            const ownSubListOfListItemElement = listItemElement.querySelector(':scope > ul, :scope > ol');

            // Move the listItemElement itself into the targetNestingList
            targetNestingList.appendChild(listItemElement);

            if (ownSubListOfListItemElement) {
                console.log('[handleTab] listItemElement has its own sub-list. Flattening its children into targetNestingList.');
                // If it had its own sub-list, move its children to become siblings of listItemElement
                // in the targetNestingList
                while (ownSubListOfListItemElement.firstChild) {
                    targetNestingList.appendChild(ownSubListOfListItemElement.firstChild);
                }
                // Remove the now-empty ownSubListOfListItemElement from listItemElement
                listItemElement.removeChild(ownSubListOfListItemElement);
                console.log('[handleTab] Removed empty original sub-list from listItemElement.');
            }
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
            // After successful DOM change:
            if (this.editor.undoManager) {
                this.editor.undoManager.handleCustomChange('listIndent');
            }
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

    handleShiftTab(listItemElement, originalAnchorNode, originalAnchorOffset) {
        if (!this.editor || !listItemElement) {
            console.log('[handleShiftTab] Aborted: No editor or listItemElement.');
            return;
        }
        console.log('[handleShiftTab] Processing LI: "' + listItemElement.textContent.trim().substring(0, 50) +
                    '" with original caret: Node:', originalAnchorNode, 'Offset:', originalAnchorOffset);

        const currentList = listItemElement.parentNode;
        if (!currentList || (currentList.tagName !== 'UL' && currentList.tagName !== 'OL')) {
            console.log('[handleShiftTab] Aborted: listItemElement has no valid UL/OL parentList. Parent:', currentList);
            return;
        }
        console.log('[handleShiftTab] Current list is:', currentList.tagName, currentList);

        const parentOfCurrentList = currentList.parentNode;
        console.log('[handleShiftTab] Parent of current list is:', parentOfCurrentList ? parentOfCurrentList.tagName : 'null', parentOfCurrentList);

        let outdented = false;
        let targetElementForCaret = listItemElement; // Default to current LI

        // const isFirstItemInCurrentList = !listItemElement.previousElementSibling; // Not strictly needed for the revised logic below
        // const isLastItemInCurrentList = !listItemElement.nextElementSibling; // Not strictly needed for the revised logic below

        // Collect following siblings *before* moving listItemElement or modifying currentList structure around it.
        const followingSiblingsInCurrentList = [];
        let nextSib = listItemElement.nextElementSibling;
        while (nextSib) {
            followingSiblingsInCurrentList.push(nextSib);
            nextSib = nextSib.nextElementSibling;
        }
        // Detach these followers from currentList now. They will be re-homed later.
        followingSiblingsInCurrentList.forEach(sib => currentList.removeChild(sib));


        // Scenario 1: Outdent from a list nested under an LI (standard nesting)
        // Structure: grandParentList (UL/OL) > parentLI (LI) > currentList (UL/OL) > listItemElement (LI)
        if (parentOfCurrentList && parentOfCurrentList.tagName === 'LI') {
            const parentLI = parentOfCurrentList;
            const grandParentList = parentLI.parentNode;

            if (grandParentList && (grandParentList.tagName === 'UL' || grandParentList.tagName === 'OL')) {
                console.log('[handleShiftTab] Case 1: Outdenting from LI-nested list. Grandparent list is:', grandParentList.tagName);
                
                // Move listItemElement to be a sibling after parentLI.
                // This applies whether it's the first, middle, or last item in currentList.
                grandParentList.insertBefore(listItemElement, parentLI.nextSibling);
                outdented = true;
                
                // If there were following siblings, they form a new sub-list under the (now outdented) listItemElement.
                if (followingSiblingsInCurrentList.length > 0) {
                    const newListForFollowing = document.createElement(currentList.tagName); // e.g. <ul>
                    followingSiblingsInCurrentList.forEach(sib => newListForFollowing.appendChild(sib));
                    listItemElement.appendChild(newListForFollowing);
                    console.log('[handleShiftTab Case 1] Appended new sub-list for following items to the outdented item.');
                }
                
                // After moving listItemElement and its followers (if any),
                // if currentList (which was inside parentLI) is now empty, remove it.
                // currentList becomes empty if listItemElement was its only child, or if it was the first child
                // and all its original content (the item itself and its followers) have been moved out.
                if (currentList.children.length === 0) { 
                    console.log('[handleShiftTab Case 1] Original currentList (in parentLI) is empty after operations, removing it.');
                    parentLI.removeChild(currentList);
                }
                // If listItemElement was NOT the first item, currentList still contains preceding items and should not be removed.
                // The currentList.children.length === 0 check correctly handles this.
            } else {
                console.log('[handleShiftTab Case 1] Cannot outdent further (grandparent is not a list or does not exist).');
            }
        }
        // Scenario 2: Outdent from a list directly nested under another list (not an LI)
        // Structure: greatGrandParent (any) > parentList (UL/OL) > currentList (UL/OL) > listItemElement (LI)
        else if (parentOfCurrentList && (parentOfCurrentList.tagName === 'UL' || parentOfCurrentList.tagName === 'OL')) {
            const parentList = parentOfCurrentList;
            console.log('[handleShiftTab] Case 2: Outdenting from list-nested list. Target parent list is:', parentList.tagName);

            if (isFirstItemInCurrentList && isLastItemInCurrentList) { // Only item
                console.log('[handleShiftTab Case 2] Item is only child of currentList.');
                parentList.insertBefore(listItemElement, currentList.nextSibling); // Move item up
                parentList.removeChild(currentList); // Remove now-empty currentList
                outdented = true;
            } else if (isFirstItemInCurrentList) {
                console.log('[handleShiftTab Case 2] Item is first child.');
                parentList.insertBefore(listItemElement, currentList); // Move item up, before currentList
                outdented = true;
            } else { // Middle or Last item
                console.log('[handleShiftTab Case 2] Item is middle or last child.');
                parentList.insertBefore(listItemElement, currentList.nextSibling); // Move item up, after currentList
                outdented = true;
            }
            
            // Handle followingSiblings for Case 2
            if (outdented && followingSiblingsInCurrentList.length > 0) {
                // Create a new list for following items, make it a sibling to the outdented listItemElement,
                // and also a sibling to the original currentList (which now contains preceding items).
                const newListForFollowing = document.createElement(currentList.tagName);
                followingSiblingsInCurrentList.forEach(sib => newListForFollowing.appendChild(sib));
                parentList.insertBefore(newListForFollowing, listItemElement.nextSibling);
                console.log('[handleShiftTab Case 2] Created new list for following items.');
            }
            
            // If currentList (where listItemElement came from) is now empty, remove it.
            if (currentList.children.length === 0 && parentList.contains(currentList)) {
                 console.log('[handleShiftTab Case 2] Original currentList is empty, removing it.');
                parentList.removeChild(currentList);
            }

        }
        // Scenario 3: Outdent from a top-level list (convert to DIV)
        else if (parentOfCurrentList && parentOfCurrentList === this.editor.editorEl) {
             console.log('[handleShiftTab] Case 3: Attempting to outdent from a top-level list (convert to DIV).');
            // This case needs to be fully fleshed out according to tech-detail.md rules for splitting lists
            // For now, a simplified conversion:
            if (currentList.children.length === 1) { // Only item in the list
                const div = document.createElement('div');
                while(listItemElement.firstChild) { div.appendChild(listItemElement.firstChild); }
                currentList.replaceWith(div);
                targetElementForCaret = div;
                outdented = true;
            } else if (isFirstItemInCurrentList) {
                const div = document.createElement('div');
                while(listItemElement.firstChild) { div.appendChild(listItemElement.firstChild); }
                currentList.parentNode.insertBefore(div, currentList);
                listItemElement.remove();
                targetElementForCaret = div;
                outdented = true;
            } else if (isLastItemInCurrentList) {
                 const div = document.createElement('div');
                while(listItemElement.firstChild) { div.appendChild(listItemElement.firstChild); }
                currentList.parentNode.insertBefore(div, currentList.nextSibling);
                listItemElement.remove();
                targetElementForCaret = div;
                outdented = true;
            } else { // Middle item - requires splitting the list
                console.log('[handleShiftTab Case 3] Middle item outdent to DIV - requires list splitting (complex).');
                // Placeholder: convert to div and place after currentList for now
                const div = document.createElement('div');
                while(listItemElement.firstChild) { div.appendChild(listItemElement.firstChild); }
                currentList.parentNode.insertBefore(div, currentList.nextSibling); // Simple placement
                listItemElement.remove();
                targetElementForCaret = div;
                outdented = true;
                // Proper split would involve creating a new list for items after this one.
            }
            // Note: followingSiblingsInCurrentList are not explicitly handled here for DIV conversion yet.
            // The current logic for DIV conversion is simplified.
        } else {
            console.log('[handleShiftTab] Cannot outdent: Unhandled scenario or already at highest level relative to direct parent. Parent of current list:', parentOfCurrentList ? parentOfCurrentList.tagName : 'null');
            // Re-attach followers if no outdent operation happened, to restore currentList state.
            if (followingSiblingsInCurrentList.length > 0) {
                // Re-attach to the original listItemElement's original position if it wasn't moved
                // This part might need care if listItemElement itself was not moved.
                // For now, assume if we reach here, listItemElement is still in currentList.
                let anchor = listItemElement; // This is wrong if listItemElement was removed.
                                            // This else block is for when NO outdent operation happened.
                followingSiblingsInCurrentList.reverse().forEach(sib => { // Insert in correct order
                    currentList.insertBefore(sib, anchor.nextSibling);
                    anchor = sib; // This is not quite right for restoring order.
                                  // Simpler: just append them back if no outdented.
                });
                 // Correct re-attachment if no outdent occurred:
                 // listItemElement is still in currentList. Append followers after it.
                 let lastAppended = listItemElement;
                 followingSiblingsInCurrentList.forEach(sib => {
                     currentList.insertBefore(sib, lastAppended.nextSibling);
                     lastAppended = sib;
                 });

                console.log('[handleShiftTab] Re-attached followers as no outdent occurred.');
            }
        }


        if (outdented) {
            console.log('[DOM Render] List item outdented. Moved LI/DIV successfully.');
            // After successful DOM change:
            if (this.editor.undoManager) {
                this.editor.undoManager.handleCustomChange('listOutdent');
            }
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel) {
                    console.error('[handleShiftTab setTimeout] Aborted: No selection object.');
                    return;
                }
                const rng = document.createRange();
                console.log('[handleShiftTab setTimeout] Attempting to restore caret for element: "' + targetElementForCaret.textContent.trim().substring(0, 50) + '"');
                
                try {
                    let caretRestoredToOriginal = false;
                    // Ensure originalAnchorNode is still valid and contained within the targetElementForCaret
                    if (originalAnchorNode && targetElementForCaret.contains(originalAnchorNode)) {
                        // Check if originalAnchorNode can accept the offset
                        if (originalAnchorNode.nodeType === Node.TEXT_NODE || 
                            (originalAnchorNode.nodeType === Node.ELEMENT_NODE && originalAnchorOffset <= originalAnchorNode.childNodes.length)) {
                            
                            // Validate offset for text nodes
                            if (originalAnchorNode.nodeType === Node.TEXT_NODE && originalAnchorOffset > originalAnchorNode.nodeValue.length) {
                                console.log('[handleShiftTab setTimeout] Original anchorOffset exceeds text node length. Falling back.');
                            } else {
                                rng.setStart(originalAnchorNode, originalAnchorOffset);
                                caretRestoredToOriginal = true;
                                console.log('[handleShiftTab setTimeout] Caret RESTORED to original position in Node:', originalAnchorNode, 'Offset:', originalAnchorOffset);
                            }
                        } else {
                            console.log('[handleShiftTab setTimeout] Original anchorNode type/offset invalid for setStart. Falling back.');
                        }
                    } else {
                        console.log('[handleShiftTab setTimeout] Original anchorNode not found in targetElementForCaret or invalid. Falling back.');
                    }

                    if (!caretRestoredToOriginal) {
                        let fallbackNode = targetElementForCaret.firstChild;
                        // Enhanced fallback logic to find a suitable node for caret
                        if (!fallbackNode) { // Element is completely empty
                            const newTextNode = document.createTextNode('');
                            targetElementForCaret.appendChild(newTextNode);
                            fallbackNode = newTextNode;
                        } else if (fallbackNode.nodeType !== Node.TEXT_NODE) {
                            // If firstChild is not text, try to find any text node or place at start of first element
                            let foundText = false;
                            for (const child of Array.from(targetElementForCaret.childNodes)) {
                                if (child.nodeType === Node.TEXT_NODE) {
                                    fallbackNode = child;
                                    foundText = true;
                                    break;
                                } else if (child.nodeType === Node.ELEMENT_NODE && !foundText) {
                                    // If no text node found yet, keep first element as potential fallback
                                    fallbackNode = child; 
                                }
                            }
                            if (!foundText && fallbackNode.nodeType === Node.ELEMENT_NODE) {
                                // If still no text node, and fallback is an element, try to go deeper or add text
                                let deepChild = fallbackNode.firstChild;
                                while(deepChild && deepChild.nodeType !== Node.TEXT_NODE && deepChild.firstChild) {
                                    deepChild = deepChild.firstChild;
                                }
                                if (deepChild && deepChild.nodeType === Node.TEXT_NODE) {
                                    fallbackNode = deepChild;
                                } else { // Prepend a text node to the element or targetElementForCaret
                                    const newTextNode = document.createTextNode('');
                                    (fallbackNode.nodeType === Node.ELEMENT_NODE ? fallbackNode : targetElementForCaret).insertBefore(newTextNode, (fallbackNode.nodeType === Node.ELEMENT_NODE ? fallbackNode.firstChild : fallbackNode));
                                    fallbackNode = newTextNode;
                                }
                            } else if (!foundText && fallbackNode.nodeType !== Node.TEXT_NODE) {
                                // If still not a text node (e.g. comment), create one
                                const newTextNode = document.createTextNode('');
                                targetElementForCaret.insertBefore(newTextNode, fallbackNode);
                                fallbackNode = newTextNode;
                            }
                        }
                        
                        // Final check for fallbackNode type
                        if (fallbackNode.nodeType === Node.TEXT_NODE) {
                           rng.setStart(fallbackNode, 0);
                        } else if (fallbackNode.nodeType === Node.ELEMENT_NODE) {
                           rng.setStart(fallbackNode, 0); // Place at start of element
                        } else { // Absolute fallback if node is still unsuitable
                            const newTextNode = document.createTextNode('');
                            targetElementForCaret.innerHTML = ''; 
                            targetElementForCaret.appendChild(newTextNode);
                            fallbackNode = newTextNode;
                            rng.setStart(fallbackNode, 0);
                        }
                        console.log('[handleShiftTab setTimeout] Caret set to FALLBACK position in Node:', fallbackNode, 'Type:', fallbackNode.nodeType);
                    }

                    rng.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(rng);

                } catch (e) {
                    console.error("[handleShiftTab setTimeout] Error setting caret:", e, "Attempting focus on element.");
                    targetElementForCaret.focus();
                }
            }, 0);
        }
    }
}; // This closes the 'listManager' object

export default listManager;
