/**
 * blockquoteManager.js — Handles blockquote creation, editing, and keyboard behavior.
 * 
 * Input trigger: Type "> " at the start of a <div> to create a blockquote.
 * Enter inside blockquote: creates new <div> inside same blockquote.
 * Enter on empty blockquote line: exits blockquote.
 * Backspace at start of blockquote line: unwraps from blockquote.
 */

const blockquoteManager = {
    editor: null,

    // Matches "> " at start of text (with optional nesting ">>" etc.)
    quoteRegex: /^(>{1,5})\s(.*)$/,

    init(editorInstance) {
        this.editor = editorInstance;
        console.log('[BlockquoteManager] Initialized');
    },

    /**
     * Attempts to transform a DIV into a blockquote if it matches "> " syntax.
     * Called from editor.attemptBlockTransformations().
     * @param {Element} blockNode - The DIV block to check
     * @param {string} textContent - The text content of the block
     * @returns {boolean} - True if transformation occurred
     */
    tryTransformToBlockquote(blockNode, textContent) {
        if (!this.editor || blockNode.tagName !== 'DIV') return false;

        const match = textContent.match(this.quoteRegex);
        if (!match) return false;

        const depth = match[1].length; // Number of > characters
        const content = match[2] || '';

        // Record undo state
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeBlockquote');
        }

        // Build nested blockquote structure
        let outerQuote = document.createElement('blockquote');
        let innermost = outerQuote;

        for (let i = 1; i < depth; i++) {
            const nested = document.createElement('blockquote');
            innermost.appendChild(nested);
            innermost = nested;
        }

        // Create content div inside the innermost blockquote
        const contentDiv = document.createElement('div');
        if (content.trim()) {
            contentDiv.textContent = content;
        } else {
            contentDiv.innerHTML = '<br>';
        }
        innermost.appendChild(contentDiv);

        // Replace the original div with the blockquote
        blockNode.replaceWith(outerQuote);

        // Place caret inside the content div
        this._placeCaretInDiv(contentDiv, content.length);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('createBlockquote');
        }

        console.log(`[BlockquoteManager] Created blockquote (depth ${depth}) with content: "${content.substring(0, 30)}"`);
        return true;
    },

    /**
     * Handles Enter key press inside a blockquote.
     * Returns true if handled (prevents default behavior).
     * @param {Event} e - The keydown event
     * @param {Element} blockquote - The closest blockquote ancestor
     * @returns {boolean} - True if handled
     */
    handleEnter(e, blockquote) {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return false;

        // Find the current div inside the blockquote
        let currentDiv = sel.anchorNode;
        while (currentDiv && currentDiv.tagName !== 'DIV' && currentDiv !== blockquote) {
            currentDiv = currentDiv.parentNode;
        }

        if (!currentDiv || currentDiv === blockquote) {
            // Caret is directly in blockquote text (no div wrapper) — wrap it
            currentDiv = blockquote;
        }

        // Check if the current line is empty
        const isEmpty = !currentDiv.textContent.trim() && 
                        (currentDiv.innerHTML.trim() === '<br>' || currentDiv.innerHTML.trim() === '');

        if (isEmpty) {
            // Empty line inside blockquote → exit blockquote
            e.preventDefault();
            this._exitBlockquote(blockquote, currentDiv);
            return true;
        }

        // Non-empty line → create new div inside same blockquote
        e.preventDefault();

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeQuoteEnter');
        }

        // Split text at caret if in the middle
        const range = sel.getRangeAt(0);
        const newDiv = document.createElement('div');

        // Extract content after caret
        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEndAfter(currentDiv.lastChild || currentDiv);
        const afterFragment = afterRange.extractContents();

        if (afterFragment.textContent.trim() || afterFragment.querySelector('*')) {
            newDiv.appendChild(afterFragment);
        } else {
            newDiv.innerHTML = '<br>';
        }

        // Insert new div after current div, inside the blockquote
        if (currentDiv.nextSibling) {
            currentDiv.parentNode.insertBefore(newDiv, currentDiv.nextSibling);
        } else {
            currentDiv.parentNode.appendChild(newDiv);
        }

        // If current div is now empty, add <br>
        if (!currentDiv.textContent.trim() && !currentDiv.querySelector('br')) {
            currentDiv.innerHTML = '<br>';
        }

        // Place caret at start of new div
        this._placeCaretInDiv(newDiv, 0);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('quoteEnterNewLine');
        }

        return true;
    },

    /**
     * Handles Backspace at the start of a blockquote line.
     * @param {Event} e - The keydown event
     * @param {Element} blockquote - The closest blockquote ancestor
     * @returns {boolean} - True if handled
     */
    handleBackspace(e, blockquote) {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode || !sel.isCollapsed) return false;

        // Check if caret is at the very start of a div inside the blockquote
        const range = sel.getRangeAt(0);
        let currentDiv = sel.anchorNode;
        while (currentDiv && currentDiv.tagName !== 'DIV' && currentDiv !== blockquote) {
            currentDiv = currentDiv.parentNode;
        }

        if (!currentDiv || currentDiv === blockquote) return false;

        // Check if caret is at position 0
        const isAtStart = this._isCaretAtStartOfNode(range, currentDiv);
        if (!isAtStart) return false;

        e.preventDefault();
        this._unwrapFromBlockquote(blockquote, currentDiv);
        return true;
    },

    /**
     * Exit a blockquote — create a new <div> after the blockquote and move caret there.
     */
    _exitBlockquote(blockquote, emptyDiv) {
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeQuoteExit');
        }

        // Remove the empty div from the blockquote
        if (emptyDiv && emptyDiv.parentNode) {
            emptyDiv.remove();
        }

        // If blockquote is now empty, remove it entirely
        const topQuote = this._getTopBlockquote(blockquote);

        // Clean up empty nested blockquotes
        this._cleanEmptyBlockquotes(topQuote);

        // Create new div after the top-level blockquote
        const newDiv = document.createElement('div');
        newDiv.innerHTML = '<br>';

        if (topQuote.parentNode) {
            topQuote.parentNode.insertBefore(newDiv, topQuote.nextSibling);
        }

        // If the top blockquote is now empty, remove it
        if (!topQuote.querySelector('div') && !topQuote.textContent.trim()) {
            topQuote.remove();
        }

        this._placeCaretInDiv(newDiv, 0);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('quoteExit');
        }

        console.log('[BlockquoteManager] Exited blockquote');
    },

    /**
     * Unwrap a div from its blockquote — promote it to a sibling after the blockquote.
     */
    _unwrapFromBlockquote(blockquote, div) {
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeQuoteUnwrap');
        }

        const topQuote = this._getTopBlockquote(blockquote);

        // Check if there's a nested blockquote (reduce nesting)
        if (blockquote.parentNode && blockquote.parentNode.tagName === 'BLOCKQUOTE') {
            // Nested — move div up to parent blockquote
            const parentQuote = blockquote.parentNode;
            parentQuote.insertBefore(div, blockquote);

            // If inner blockquote is now empty, remove it
            if (!blockquote.querySelector('div') && !blockquote.textContent.trim()) {
                blockquote.remove();
            }
        } else {
            // Top-level — move div out of blockquote entirely
            topQuote.parentNode.insertBefore(div, topQuote);

            // If blockquote is now empty, remove it
            if (!topQuote.querySelector('div') && !topQuote.textContent.trim()) {
                topQuote.remove();
            }
        }

        // Place caret at start of the unwrapped div
        this._placeCaretInDiv(div, 0);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('quoteUnwrap');
        }

        console.log('[BlockquoteManager] Unwrapped div from blockquote');
    },

    /**
     * Get the outermost blockquote ancestor (stops at editor element).
     */
    _getTopBlockquote(node) {
        let top = node;
        while (top.parentNode && top.parentNode.tagName === 'BLOCKQUOTE') {
            top = top.parentNode;
        }
        return top;
    },

    /**
     * Remove empty nested blockquotes recursively.
     */
    _cleanEmptyBlockquotes(node) {
        if (!node) return;
        const nestedQuotes = node.querySelectorAll('blockquote');
        for (const q of nestedQuotes) {
            if (!q.querySelector('div') && !q.textContent.trim()) {
                q.remove();
            }
        }
    },

    /**
     * Check if caret is at the very start of a node.
     */
    _isCaretAtStartOfNode(range, node) {
        if (range.startOffset !== 0) {
            // Check if all content before caret is ZWSP or empty
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
                const before = range.startContainer.textContent.substring(0, range.startOffset);
                if (before.replace(/\u200B/g, '').length > 0) return false;
            } else {
                return false;
            }
        }

        // Walk up from range.startContainer to node — all must be first children
        let current = range.startContainer;
        while (current && current !== node) {
            if (current !== current.parentNode.firstChild) return false;
            current = current.parentNode;
        }
        return current === node;
    },

    /**
     * Place caret inside a div at a specific offset.
     */
    _placeCaretInDiv(div, offset) {
        const sel = window.getSelection();
        const rng = document.createRange();

        let targetNode = div.firstChild;
        if (!targetNode) {
            targetNode = document.createTextNode('');
            div.appendChild(targetNode);
        }

        if (targetNode.nodeType === Node.TEXT_NODE) {
            const pos = Math.min(offset, targetNode.textContent.length);
            rng.setStart(targetNode, pos);
        } else {
            rng.setStart(div, 0);
        }

        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);
    },

    /**
     * Post-action cleanup: detect orphan blockquotes created by browser on Enter.
     * Similar to headingManager.checkAndRevertBrokenHeadings.
     */
    checkAndFixBlockquotes() {
        if (!this.editor || !this.editor.editorEl) return false;
        // Blockquotes don't have the same orphan problem as headings —
        // the browser doesn't clone <blockquote> on Enter the way it clones <h1>.
        // So this is a no-op for now, but the hook is here for future use.
        return false;
    },
};

export default blockquoteManager;
