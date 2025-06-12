const headingManager = {
    editor: null, // To be set by editor.js

    init(editorInstance) {
        this.editor = editorInstance;
        console.log('[HeadingManager] Initialized with editor instance');
    },

    // Regex for heading markers - more flexible to catch "# " followed by anything
    // Group 1: Hash markers (e.g., "#", "##")
    // Group 2: Text content after the marker and space (optional)
    headingRegex: /^(#{1,6}) (.*)$/,

    /**
     * Attempts to transform a block node (typically a DIV) to a heading if it matches heading syntax.
     * @param {Node} blockNode - The block element to potentially transform.
     * @param {string} textContent - The text content of the blockNode.
     * @param {Node} originalAnchorNode - The original anchor node of the selection.
     * @param {number} originalAnchorOffset - The original anchor offset of the selection.
     * @returns {boolean} - True if transformation occurred, false otherwise.
     */
    tryTransformToHeading(blockNode, textContent, originalAnchorNode, originalAnchorOffset) {
        console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - CALLED with blockNode:', blockNode, 'tagName:', blockNode?.tagName);
        console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - textContent:', JSON.stringify(textContent));
        console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - originalAnchorNode:', originalAnchorNode, 'originalAnchorOffset:', originalAnchorOffset);
        
        if (!this.editor || blockNode.tagName !== 'DIV') {
            console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - EARLY RETURN: editor or tagName check failed. editor:', this.editor, 'tagName:', blockNode.tagName);
            return false;
        }

        const headingMatch = textContent.match(this.headingRegex);
        console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - headingRegex:', this.headingRegex);
        console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - headingMatch:', headingMatch);
        
        if (headingMatch) {
            console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - MATCH FOUND! Groups:', headingMatch);
            
            // Determine the text node for caret positioning. This logic might need to be robust.
            // It assumes originalAnchorNode is a text node within blockNode or blockNode.firstChild is.
            let textNodeForCaret = (originalAnchorNode && originalAnchorNode.nodeType === Node.TEXT_NODE && blockNode.contains(originalAnchorNode)) 
                                   ? originalAnchorNode 
                                   : (blockNode.firstChild && blockNode.firstChild.nodeType === Node.TEXT_NODE ? blockNode.firstChild : null);
            
            console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - textNodeForCaret:', textNodeForCaret);
            
            // If no suitable text node is found directly, and the block is simple (e.g. div with just text),
            // we might need to create one or ensure one exists if blockNode.firstChild isn't text.
            // For now, this relies on a fairly direct text node presence.
            if (textNodeForCaret) {
                 return this.transformToHeadingElement(blockNode, headingMatch, textNodeForCaret, originalAnchorOffset);
            }
            // If no textNodeForCaret, it implies a more complex structure or an edge case.
            // Consider a scenario where the div is empty and user types "# test".
            // In that case, originalAnchorNode might be the div itself.
            // The current logic in editor.js's handleInputFormatting seems to find a blockToProcess.
            // Let's assume for now textNodeForCaret will be valid if a heading match occurs in a simple div.
            console.warn('[headingManager] Could not find a suitable text node for caret placement during heading transformation.');
            return false; 
        } else {
            console.log('[CURSOR-LOG] HeadingManager.tryTransformToHeading - NO MATCH with regex');
        }
        return false;
    },

    /**
     * Transforms a DIV block into an Hx element.
     * @param {Node} divBlock - The DIV element to transform.
     * @param {RegExpMatchArray} match - The regex match object from headingRegex.
     * @param {Node} textNodeBeingEdited - The text node within the div where editing occurred.
     * @param {number} caretOffsetInTextNode - The caret's offset within textNodeBeingEdited.
     * @returns {boolean} - True if transformation occurred.
     */
    transformToHeadingElement(divBlock, match, textNodeBeingEdited, caretOffsetInTextNode) {
        console.log('[CURSOR-LOG] HeadingManager.transformToHeadingElement - START - caretOffsetInTextNode:', caretOffsetInTextNode);
        
        const level = match[1].length;
        // Group 2 contains the content after the marker and space.
        // Ensure rawBody is an empty string if match[2] is undefined (e.g. if (.*) matches nothing).
        const rawBody = match[2] || ''; 
        const hBodyContent = '\u200B' + rawBody; // Prepend ZWSP

        const h = document.createElement(`h${level}`);
        const markerSpan = document.createElement('span');
        markerSpan.className = 'heading-marker';
        markerSpan.textContent = match[1]; 
        markerSpan.contentEditable = false;

        const hTextNode = document.createTextNode(hBodyContent);
        h.append(markerSpan, hTextNode);

        divBlock.replaceWith(h);
        console.log(`[HeadingManager] Transformed DIV to H${level} with content: "${rawBody.substring(0, 30)}${rawBody.length > 30 ? '...' : ''}"`);

        // After successful DOM change:
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange(`createH${level}`);
        }

        const sel = window.getSelection();
        if (sel) {
            // Calculate the length of the typed markdown prefix (e.g., "# " is 2 chars)
            const matchedMarkerAndSpaceLength = match[1].length + 1; // +1 for the space
            
            // Adjust caretOffsetInTextNode relative to the start of the raw body content
            let caretOffsetInRawBody = caretOffsetInTextNode - matchedMarkerAndSpaceLength;
            caretOffsetInRawBody = Math.max(0, caretOffsetInRawBody); // Ensure non-negative

            // New offset in hTextNode will be 1 (for ZWSP) + caretOffsetInRawBody
            let newOffsetInHTextNode = 1 + caretOffsetInRawBody; 
            newOffsetInHTextNode = Math.min(newOffsetInHTextNode, hTextNode.data.length); // Clamp to hTextNode length
            newOffsetInHTextNode = Math.max(1, newOffsetInHTextNode); // Ensure at least 1 (after ZWSP)

            console.log('[CURSOR-LOG] HeadingManager.transformToHeadingElement - CALCULATION:');
            console.log('  matchedMarkerAndSpaceLength:', matchedMarkerAndSpaceLength);
            console.log('  caretOffsetInRawBody:', caretOffsetInRawBody);
            console.log('  newOffsetInHTextNode:', newOffsetInHTextNode);
            console.log('  hTextNode.data.length:', hTextNode.data.length);
            console.log('  hTextNode.data:', JSON.stringify(hTextNode.data));

            try {
                const rng = document.createRange();
                rng.setStart(hTextNode, newOffsetInHTextNode);
                rng.collapse(true);
                sel.removeAllRanges();
                sel.addRange(rng);
                
                console.log('[CURSOR-LOG] HeadingManager.transformToHeadingElement - CURSOR SET - Target:', hTextNode, 'Offset:', newOffsetInHTextNode);
                
                // Verify the cursor position was actually set
                setTimeout(() => {
                    const verifySelection = window.getSelection();
                    if (verifySelection && verifySelection.anchorNode) {
                        console.log('[CURSOR-LOG] HeadingManager.transformToHeadingElement - VERIFY (after 0ms) - AnchorNode:', verifySelection.anchorNode, 'Offset:', verifySelection.anchorOffset);
                    }
                }, 0);
                
            } catch (e) {
                console.error('[CURSOR-LOG] HeadingManager.transformToHeadingElement - ERROR setting caret:', e);
                h.focus(); // Fallback focus
            }
        }
        return true;
    },

    checkAndRevertBrokenHeadings() {
        if (!this.editor || !this.editor.editorEl) return false;
        let reverted = false;
        for (const h of this.editor.editorEl.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
            const marker = h.querySelector('.heading-marker');
            // If no marker, it's not a heading we manage, or it's severely broken. Skip.
            if (!marker) continue;

            // Find the first node after the marker. This should be a text node starting with ZWSP.
            let n = marker.nextSibling;
            // Skip any non-text, non-BR nodes (though ideally there shouldn't be any complex structures here)
            while (n && n.nodeType !== Node.TEXT_NODE && n.tagName !== 'BR') {
                n = n.nextSibling;
            }

            const isTextNode = n && n.nodeType === Node.TEXT_NODE;
            
            // Determine if the heading is "broken"
            const broken = !n || // No node after marker
                           (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BR') || // BR immediately after marker
                           (isTextNode && n.data.charCodeAt(0) !== 0x200B && n.data.length > 0) || // Text node doesn't start with ZWSP (and is not empty)
                           (isTextNode && n.data.length === 0 && h.childNodes.length <=1 ); // Text node is empty, and it's the only thing after marker (or marker itself is last)


            if (broken) {
                console.log('[CURSOR-LOG] HeadingManager.checkAndRevertBrokenHeadings - REVERTING heading:', h.tagName);
                
                // Reconstruct the original text content (marker + body, removing ZWSP if present)
                const body = isTextNode ? n.data.replace(/^[\u200B]/, '') : '';
                
                const div = document.createElement('div');
                div.textContent = marker.textContent + body; 
                h.replaceWith(div);
                console.log(`[HeadingManager] Reverted H${h.tagName.substring(1)} to DIV with content: "${body.substring(0, 30)}${body.length > 30 ? '...' : ''}"`);
                reverted = true;

                // After successful DOM change:
                if (this.editor.undoManager) {
                    this.editor.undoManager.handleCustomChange(`revertH${h.tagName.substring(1)}`);
                }

                // Attempt to place caret after the marker text in the new div
                const tn = div.firstChild; // Should be the combined text node
                if (tn && tn.nodeType === Node.TEXT_NODE) {
                    const sel = window.getSelection();
                    const rng = document.createRange();
                    let caretPosInDiv = marker.textContent.length; // Position after the hash characters
                    // Ensure caret position is within the bounds of the new text node
                    caretPosInDiv = Math.min(caretPosInDiv, tn.data.length); 

                    rng.setStart(tn, caretPosInDiv); 
                    rng.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(rng);
                    
                    console.log('[CURSOR-LOG] HeadingManager.checkAndRevertBrokenHeadings - CURSOR SET - Target:', tn, 'Offset:', caretPosInDiv);
                }
            }
        }
        return reverted;
    }
};

export default headingManager;
