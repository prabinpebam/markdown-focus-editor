const inlineStyleManager = {
    editor: null,

    patterns: [
        // Order is important: bolditalic must be checked before bold or italic
        { name: 'bolditalic', regex: /(\*\*\*)([^\s*])/, htmlTag: '<b><i>', mdMarker: '***' },
        { name: 'bolditalic_u', regex: /(___)([^\s_])/, htmlTag: '<b><i>', mdMarker: '___' },
        { name: 'bold', regex: /(\*\*)([^\s*])/, htmlTag: '<b>', mdMarker: '**' },
        { name: 'bold_u', regex: /(__)([^\s_])/, htmlTag: '<b>', mdMarker: '__' },
        { name: 'italic', regex: /(\*)([^\s*])/, htmlTag: '<i>', mdMarker: '*' },
        { name: 'italic_u', regex: /(_)([^\s_])/, htmlTag: '<i>', mdMarker: '_' },
        { name: 'strikethrough', regex: /(~~)([^\s~])/, htmlTag: '<s>', mdMarker: '~~' }
    ],

    init(editorInstance) {
        this.editor = editorInstance;
        console.log('[InlineStyleManager] Initialized with editor instance');
    },

    checkAndApplyInlineStyles(textNode, offset) {
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            return false;
        }

        const originalTextContentOfNode = textNode.nodeValue || '';
        console.log(`[InlineStyleManager] Checking for patterns at offset ${offset} in text: "${originalTextContentOfNode.substring(Math.max(0, offset-10), offset+1)}"`);

        for (const pattern of this.patterns) {
            const lookBehindLength = pattern.mdMarker.length + 1; // e.g., "**a" is 3 chars
            if (offset >= lookBehindLength) {
                const relevantTextForMatch = originalTextContentOfNode.substring(offset - lookBehindLength, offset);
                const match = relevantTextForMatch.match(new RegExp(`^${pattern.regex.source}`));


                if (match && match[1] === pattern.mdMarker && match[2]) {
                    console.log(`[InlineStyleManager] Potential match for ${pattern.name}. Relevant text: "${relevantTextForMatch}"`);
                    console.log(`[InlineStyleManager] Match details: full="${match[0]}", marker="${match[1]}", char="${match[2]}"`);

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
                    console.log(`[InlineStyleManager] Applied ${pattern.name} style to character "${match[2]}"`);
                    return true; // Important: process only one pattern match per input
                }
            }
        }

        // ── Inline code: `text` ──
        // Detect closing backtick — search backwards for opening backtick
        if (offset >= 3 && originalTextContentOfNode.charAt(offset - 1) === '`') {
            const textBefore = originalTextContentOfNode.substring(0, offset - 1);
            const openIdx = textBefore.lastIndexOf('`');
            if (openIdx >= 0 && openIdx < offset - 2) {
                // Found `...` pair — content is between the two backticks
                const codeContent = textBefore.substring(openIdx + 1);
                if (codeContent.length > 0) {
                    console.log(`[InlineStyleManager] Inline code match: \`${codeContent}\``);

                    const codeEl = document.createElement('code');
                    codeEl.textContent = codeContent;

                    const textBeforeBacktick = originalTextContentOfNode.substring(0, openIdx);
                    const textAfterClosing = originalTextContentOfNode.substring(offset);

                    const zwsp = document.createTextNode('\u200B');
                    const fragment = document.createDocumentFragment();
                    if (textBeforeBacktick) fragment.appendChild(document.createTextNode(textBeforeBacktick));
                    fragment.appendChild(codeEl);
                    fragment.appendChild(zwsp);
                    if (textAfterClosing) fragment.appendChild(document.createTextNode(textAfterClosing));

                    const parent = textNode.parentNode;
                    if (!parent) return false;
                    parent.replaceChild(fragment, textNode);

                    // Place caret after ZWSP
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.setStartAfter(zwsp);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);

                    if (this.editor && this.editor.undoManager) {
                        this.editor.undoManager.handleCustomChange('inlineCode');
                    }
                    console.log('[InlineStyleManager] Applied inline code');
                    return true;
                }
            }
        }

        // ── Image: ![alt](url) ──
        // Detect closing ) preceded by ![alt](url) pattern
        if (offset >= 6 && originalTextContentOfNode.charAt(offset - 1) === ')') {
            const textBefore = originalTextContentOfNode.substring(0, offset);
            const imgMatch = textBefore.match(/!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imgMatch) {
                const altText = imgMatch[1];
                const imgUrl = imgMatch[2];
                console.log(`[InlineStyleManager] Image match: ![${altText}](${imgUrl})`);

                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = altText;
                img.title = altText || imgUrl;
                img.setAttribute('contenteditable', 'false');

                const matchStart = textBefore.lastIndexOf(imgMatch[0]);
                const textBeforeImg = originalTextContentOfNode.substring(0, matchStart);
                const textAfterImg = originalTextContentOfNode.substring(offset);

                const zwsp = document.createTextNode('\u200B');
                const fragment = document.createDocumentFragment();
                if (textBeforeImg) fragment.appendChild(document.createTextNode(textBeforeImg));
                fragment.appendChild(img);
                fragment.appendChild(zwsp);
                if (textAfterImg) fragment.appendChild(document.createTextNode(textAfterImg));

                const parent = textNode.parentNode;
                if (!parent) return false;
                parent.replaceChild(fragment, textNode);

                const sel = window.getSelection();
                const range = document.createRange();
                range.setStartAfter(zwsp);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);

                if (this.editor && this.editor.undoManager) {
                    this.editor.undoManager.handleCustomChange('inlineImage');
                }
                console.log('[InlineStyleManager] Applied image');
                return true;
            }
        }

        // ── Link: [text](url) ──
        // Detect closing ) — search backwards for the full [text](url) pattern
        if (offset >= 5 && originalTextContentOfNode.charAt(offset - 1) === ')') {
            const textBefore = originalTextContentOfNode.substring(0, offset);
            const linkMatch = textBefore.match(/\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                const linkText = linkMatch[1];
                const linkUrl = linkMatch[2];
                console.log(`[InlineStyleManager] Link match: [${linkText}](${linkUrl})`);

                const anchor = document.createElement('a');
                anchor.href = linkUrl;
                anchor.textContent = linkText;
                anchor.title = linkUrl;
                anchor.setAttribute('contenteditable', 'false');

                const matchStart = textBefore.lastIndexOf(linkMatch[0]);
                const textBeforeLink = originalTextContentOfNode.substring(0, matchStart);
                const textAfterLink = originalTextContentOfNode.substring(offset);

                const zwsp = document.createTextNode('\u200B');
                const fragment = document.createDocumentFragment();
                if (textBeforeLink) fragment.appendChild(document.createTextNode(textBeforeLink));
                fragment.appendChild(anchor);
                fragment.appendChild(zwsp);
                if (textAfterLink) fragment.appendChild(document.createTextNode(textAfterLink));

                const parent = textNode.parentNode;
                if (!parent) return false;
                parent.replaceChild(fragment, textNode);

                // Place caret after ZWSP
                const sel = window.getSelection();
                const range = document.createRange();
                range.setStartAfter(zwsp);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);

                if (this.editor && this.editor.undoManager) {
                    this.editor.undoManager.handleCustomChange('inlineLink');
                }
                console.log('[InlineStyleManager] Applied link');
                return true;
            }
        }

        // ── Autolink: bare URL detection ──
        // Detect URLs when a space is typed after them (the space is the trigger char)
        if (offset >= 9 && originalTextContentOfNode.charAt(offset - 1) === ' ') {
            const textBefore = originalTextContentOfNode.substring(0, offset - 1); // exclude the space
            const urlMatch = textBefore.match(/(https?:\/\/[^\s<>"']+)$/);
            if (urlMatch) {
                const url = urlMatch[1];
                console.log(`[InlineStyleManager] Autolink match: ${url}`);

                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.textContent = url;
                anchor.title = url;
                anchor.setAttribute('contenteditable', 'false');

                const matchStart = textBefore.lastIndexOf(url);
                const textBeforeUrl = originalTextContentOfNode.substring(0, matchStart);
                const textAfterUrl = originalTextContentOfNode.substring(offset); // includes everything after space

                const zwsp = document.createTextNode('\u200B');
                const spaceNode = document.createTextNode(' ');
                const fragment = document.createDocumentFragment();
                if (textBeforeUrl) fragment.appendChild(document.createTextNode(textBeforeUrl));
                fragment.appendChild(anchor);
                fragment.appendChild(zwsp);
                fragment.appendChild(spaceNode);
                if (textAfterUrl) fragment.appendChild(document.createTextNode(textAfterUrl));

                const parent = textNode.parentNode;
                if (!parent) return false;
                parent.replaceChild(fragment, textNode);

                const sel = window.getSelection();
                const range = document.createRange();
                range.setStartAfter(spaceNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);

                if (this.editor && this.editor.undoManager) {
                    this.editor.undoManager.handleCustomChange('autolink');
                }
                console.log('[InlineStyleManager] Applied autolink');
                return true;
            }
        }

        return false;
    },

};

export default inlineStyleManager;
