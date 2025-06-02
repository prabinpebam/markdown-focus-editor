const inlineStyleManager = {
    editor: null,

    patterns: [
        // Order is important: bolditalic must be checked before bold or italic
        { name: 'bolditalic', regex: /(\*\*\*)([^\s*])/, htmlTag: '<b><i>', mdMarker: '***' },
        { name: 'bold', regex: /(\*\*)([^\s*])/, htmlTag: '<b>', mdMarker: '**' },
        { name: 'italic', regex: /(\*)([^\s*])/, htmlTag: '<i>', mdMarker: '*' },
        { name: 'strikethrough', regex: /(~~)([^\s~])/, htmlTag: '<s>', mdMarker: '~~' }
    ],

    init(editorInstance) {
        this.editor = editorInstance;
    },

    checkAndApplyInlineStyles(textNode, offset) {
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            return false;
        }

        const originalTextContentOfNode = textNode.nodeValue || '';

        for (const pattern of this.patterns) {
            const lookBehindLength = pattern.mdMarker.length + 1; // e.g., "**a" is 3 chars
            if (offset >= lookBehindLength) {
                const relevantTextForMatch = originalTextContentOfNode.substring(offset - lookBehindLength, offset);
                const match = relevantTextForMatch.match(new RegExp(`^${pattern.regex.source}`));


                if (match && match[1] === pattern.mdMarker && match[2]) {
                    console.log(`[InlineStyle] Potential match for ${pattern.name}. Relevant text: "${relevantTextForMatch}"`);
                    console.log(`[InlineStyle] Match details: full="${match[0]}", marker="${match[1]}", char="${match[2]}"`);

                    const charTyped = match[2];
                    const parentBefore = textNode.parentNode;
                    const grandParentBefore = parentBefore ? parentBefore.parentNode : null;
                    const editorRoot = this.editor.editorEl;

                    const parentOuterHTMLBefore = parentBefore ? parentBefore.outerHTML : 'No parent';
                    console.log('[InlineStyle] DOM before transformation (parent.outerHTML):', parentOuterHTMLBefore);
                    console.log('[InlineStyle] textNode.nodeValue before:', originalTextContentOfNode);


                    let styleElement;
                    if (pattern.name === 'bolditalic') {
                        const b = document.createElement('b');
                        const i = document.createElement('i');
                        i.textContent = charTyped;
                        b.appendChild(i);
                        styleElement = b; // The <b> element is the main one to insert
                    } else {
                        // e.g. <b> from pattern.htmlTag '<b>'
                        styleElement = document.createElement(pattern.htmlTag.substring(1, pattern.htmlTag.length - 1));
                        styleElement.textContent = charTyped;
                    }
                    
                    const textInNodeBeforeMarker = originalTextContentOfNode.substring(0, offset - lookBehindLength);
                    const textInNodeAfterTypedChar = originalTextContentOfNode.substring(offset);
                    const styleTagNames = ['B', 'I', 'S'];
                    const zwspNode = document.createTextNode('\u200B'); // Zero-Width Space

                    if (parentBefore && styleTagNames.includes(parentBefore.tagName) && grandParentBefore && editorRoot.contains(grandParentBefore)) {
                        console.log(`[InlineStyle] Breaking out of parent <${parentBefore.tagName}>.`);
                        // Update the content of the original textNode's parent (e.g. <i>)
                        // It should now only contain the text that was *before* the matched markdown sequence.
                        parentBefore.textContent = textInNodeBeforeMarker; // This effectively replaces textNode

                        // If the parent style tag (e.g. <i>) becomes empty after update, remove it.
                        if (parentBefore.textContent.length === 0) {
                             // Check if it's truly empty or just contains an empty text node
                            if (!parentBefore.hasChildNodes() || (parentBefore.childNodes.length === 1 && parentBefore.firstChild.nodeType === Node.TEXT_NODE && parentBefore.firstChild.nodeValue === '')) {
                                console.log(`[InlineStyle] Parent <${parentBefore.tagName}> became empty, removing it.`);
                                grandParentBefore.removeChild(parentBefore);
                            }
                        }

                        const breakOutFragment = document.createDocumentFragment();
                        breakOutFragment.appendChild(styleElement); 
                        breakOutFragment.appendChild(zwspNode.cloneNode()); // Add ZWSP after the style element
                        if (textInNodeAfterTypedChar) {
                            breakOutFragment.appendChild(document.createTextNode(textInNodeAfterTypedChar));
                        }
                        
                        // Insert the new structure after the original parent style element (if it still exists)
                        // or at the previous position of the parent if it was removed.
                        const insertionPoint = parentBefore.isConnected ? parentBefore.nextSibling : null; // Determine correct insertion point
                        grandParentBefore.insertBefore(breakOutFragment, insertionPoint);
                    
                    } else { // Not breaking out, standard replacement
                        const inlineFragment = document.createDocumentFragment();
                        if (textInNodeBeforeMarker) {
                            inlineFragment.appendChild(document.createTextNode(textInNodeBeforeMarker));
                        }
                        inlineFragment.appendChild(styleElement); 
                        inlineFragment.appendChild(zwspNode.cloneNode()); // Add ZWSP after the style element
                        if (textInNodeAfterTypedChar) {
                            inlineFragment.appendChild(document.createTextNode(textInNodeAfterTypedChar));
                        }
                        
                        if (!parentBefore) {
                             console.error('[InlineStyle] Error: textNode has no parent for inline replacement.');
                             return false;
                        }
                        parentBefore.replaceChild(inlineFragment, textNode);
                    }

                    const sel = window.getSelection();
                    const range = document.createRange();
                    let targetTextNodeForCaret;
                    if (pattern.name === 'bolditalic') {
                        targetTextNodeForCaret = styleElement.firstChild.firstChild; // b > i > textNode
                    } else {
                        targetTextNodeForCaret = styleElement.firstChild; // e.g., b > textNode
                    }

                    if (targetTextNodeForCaret && targetTextNodeForCaret.nodeType === Node.TEXT_NODE) {
                        range.setStart(targetTextNodeForCaret, 1); 
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else {
                        console.warn('[InlineStyle] Could not find target text node for caret in styled element.');
                        styleElement.focus(); 
                    }
                    
                    const finalParentHTML = parentBefore && parentBefore.isConnected ? parentBefore.outerHTML : (grandParentBefore && grandParentBefore.isConnected ? grandParentBefore.outerHTML : "Parent/Grandparent disconnected or not applicable");
                    console.log('[InlineStyle] DOM after transformation (relevant parent.outerHTML):', finalParentHTML);

                    if (this.editor.undoManager) {
                        this.editor.undoManager.handleCustomChange(`inline_${pattern.name}`);
                    }
                    console.log(`[InlineStyle] Applied ${pattern.name} (HTML only).`);
                    return true; // Important: process only one pattern match per input
                }
            }
        }
        return false;
    },

};

export default inlineStyleManager;
