/**
 * codeBlockManager.js — Handles fenced code block creation, editing, and keyboard behavior.
 *
 * Input trigger: Type ``` (optionally followed by a language name) and press space/enter
 * to create a code block. All markdown triggers are disabled inside code blocks.
 * Tab inserts 2 spaces. Escape exits the code block.
 */

import syntaxHighlighter from './syntaxHighlighter.js';

const codeBlockManager = {
    editor: null,
    _highlightTimer: null,

    // Matches ``` with optional language identifier
    codeBlockRegex: /^```(\w*)$/,

    // Language alias resolution
    languageAliases: {
        js: 'javascript', ts: 'typescript', py: 'python',
        rb: 'ruby', rs: 'rust', sh: 'bash', shell: 'bash',
        yml: 'yaml', md: 'markdown', cs: 'csharp',
        'c#': 'csharp', 'c++': 'cpp', text: 'plaintext', txt: 'plaintext',
    },

    supportedLanguages: [
        'javascript', 'typescript', 'python', 'html', 'css', 'json',
        'markdown', 'bash', 'sql', 'c', 'cpp', 'csharp', 'java',
        'rust', 'go', 'ruby', 'php', 'yaml', 'xml', 'plaintext',
    ],

    init(editorInstance) {
        this.editor = editorInstance;
        console.log('[CodeBlockManager] Initialized');
    },

    /**
     * Resolve a language alias to its canonical name.
     */
    resolveLanguage(alias) {
        if (!alias) return 'plaintext';
        const lower = alias.toLowerCase();
        if (this.supportedLanguages.includes(lower)) return lower;
        return this.languageAliases[lower] || 'plaintext';
    },

    /**
     * Attempts to transform a DIV into a code block if it matches ``` syntax.
     * Called from editor.attemptBlockTransformations().
     * @param {Element} blockNode - The DIV block to check
     * @param {string} textContent - The text content of the block
     * @returns {boolean} - True if transformation occurred
     */
    tryTransformToCodeBlock(blockNode, textContent) {
        if (!this.editor || blockNode.tagName !== 'DIV') return false;

        const match = textContent.match(this.codeBlockRegex);
        if (!match) return false;

        const language = this.resolveLanguage(match[1]);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeCodeBlock');
        }

        // Create code block DOM structure
        const codeBlock = this._createCodeBlockElement(language);

        // Replace the original div
        blockNode.replaceWith(codeBlock);

        // Place caret inside the <pre><code>
        const code = codeBlock.querySelector('code');
        if (code) {
            const sel = window.getSelection();
            const rng = document.createRange();
            rng.setStart(code, 0);
            rng.collapse(true);
            sel.removeAllRanges();
            sel.addRange(rng);

            // Initial highlight (will be a no-op for empty block)
            this._scheduleHighlight(codeBlock);
        }

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('createCodeBlock');
        }

        console.log(`[CodeBlockManager] Created code block (${language})`);
        return true;
    },

    /**
     * Create the code block DOM element.
     */
    _createCodeBlockElement(language) {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block';
        wrapper.setAttribute('data-language', language);
        wrapper.setAttribute('contenteditable', 'false');

        // Header with language label
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.setAttribute('contenteditable', 'false');

        const langSpan = document.createElement('span');
        langSpan.className = 'code-language';
        langSpan.textContent = language;
        header.appendChild(langSpan);

        // Pre/code area
        const pre = document.createElement('pre');
        pre.className = 'code-block-content';
        pre.setAttribute('contenteditable', 'true');
        pre.setAttribute('spellcheck', 'false');

        const code = document.createElement('code');
        code.className = `language-${language}`;
        code.textContent = '\n'; // Start with empty line
        pre.appendChild(code);

        wrapper.appendChild(header);
        wrapper.appendChild(pre);

        return wrapper;
    },

    /**
     * Check if the caret is currently inside a code block.
     * @returns {Element|null} - The .code-block element, or null
     */
    getActiveCodeBlock() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return null;

        let node = sel.anchorNode;
        while (node && node !== this.editor?.editorEl) {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('code-block')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    },

    /**
     * Handle keydown events when caret is inside a code block.
     * Returns true if the event was handled (caller should not process further).
     * @param {KeyboardEvent} e
     * @param {Element} codeBlock - The .code-block element
     * @returns {boolean}
     */
    handleKeyDown(e, codeBlock) {
        const code = codeBlock.querySelector('code');
        if (!code) return false;

        // Escape — exit code block
        if (e.key === 'Escape') {
            e.preventDefault();
            this._exitCodeBlock(codeBlock);
            return true;
        }

        // Tab — insert 2 spaces
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertText', false, '  ');
            return true;
        }

        // Shift+Tab — remove up to 2 leading spaces on current line
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            this._outdentCurrentLine(code);
            return true;
        }

        // Enter — insert newline (prevent browser from creating <div>)
        if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertText', false, '\n');
            return true;
        }

        // Backspace — if code block is empty, delete it
        if (e.key === 'Backspace') {
            const text = code.textContent;
            if (!text || text === '\n' || text.trim() === '') {
                e.preventDefault();
                this._deleteCodeBlock(codeBlock);
                return true;
            }
        }

        // All other keys — allow default behavior (typing inside <pre><code>)
        // But suppress all block/inline transformations via the caller checking getActiveCodeBlock()
        return false;
    },

    /**
     * Handle input event inside a code block — re-highlight with debounce.
     * @param {Element} codeBlock
     */
    handleInput(codeBlock) {
        this._scheduleHighlight(codeBlock);
    },

    /**
     * Schedule a debounced re-highlight for a code block (300ms).
     */
    _scheduleHighlight(codeBlock) {
        clearTimeout(this._highlightTimer);
        this._highlightTimer = setTimeout(() => {
            const code = codeBlock.querySelector('code');
            const language = codeBlock.getAttribute('data-language') || 'plaintext';
            if (code) {
                syntaxHighlighter.highlight(code, language);
            }
        }, 300);
    },

    /**
     * Exit code block — create new <div> after the code block and place caret there.
     */
    _exitCodeBlock(codeBlock) {
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeCodeBlockExit');
        }

        const newDiv = document.createElement('div');
        newDiv.innerHTML = '<br>';
        codeBlock.parentNode.insertBefore(newDiv, codeBlock.nextSibling);

        // Place caret in the new div
        const sel = window.getSelection();
        const rng = document.createRange();
        rng.setStart(newDiv, 0);
        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('codeBlockExit');
        }

        console.log('[CodeBlockManager] Exited code block');
    },

    /**
     * Delete an empty code block and place caret in adjacent block.
     */
    _deleteCodeBlock(codeBlock) {
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeCodeBlockDelete');
        }

        const prev = codeBlock.previousElementSibling;
        const next = codeBlock.nextElementSibling;
        codeBlock.remove();

        // Place caret in previous or next block, or create new empty div
        let target = prev || next;
        if (!target) {
            target = document.createElement('div');
            target.innerHTML = '<br>';
            this.editor.editorEl.appendChild(target);
        }

        const sel = window.getSelection();
        const rng = document.createRange();
        if (target.lastChild && target.lastChild.nodeType === Node.TEXT_NODE) {
            rng.setStart(target.lastChild, target.lastChild.textContent.length);
        } else {
            rng.setStart(target, 0);
        }
        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('codeBlockDelete');
        }

        console.log('[CodeBlockManager] Deleted empty code block');
    },

    /**
     * Remove up to 2 leading spaces from the current line in a code element.
     */
    _outdentCurrentLine(code) {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return;

        const range = sel.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType !== Node.TEXT_NODE) return;

        const fullText = textNode.textContent;
        const caretPos = range.startOffset;

        // Find start of current line
        let lineStart = fullText.lastIndexOf('\n', caretPos - 1) + 1;

        // Count leading spaces (up to 2)
        let spacesToRemove = 0;
        for (let i = lineStart; i < lineStart + 2 && i < fullText.length; i++) {
            if (fullText[i] === ' ') spacesToRemove++;
            else break;
        }

        if (spacesToRemove > 0) {
            const before = fullText.substring(0, lineStart);
            const after = fullText.substring(lineStart + spacesToRemove);
            textNode.textContent = before + after;

            // Adjust caret position
            const newPos = Math.max(lineStart, caretPos - spacesToRemove);
            const newRange = document.createRange();
            newRange.setStart(textNode, newPos);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    },

    /**
     * Highlight all code blocks in the editor (e.g. after paste or load).
     */
    highlightAll() {
        if (!this.editor || !this.editor.editorEl) return;
        const blocks = this.editor.editorEl.querySelectorAll('.code-block');
        for (const block of blocks) {
            const code = block.querySelector('code');
            const language = block.getAttribute('data-language') || 'plaintext';
            if (code && code.textContent.trim()) {
                syntaxHighlighter.highlight(code, language);
            }
        }
    },
};

export default codeBlockManager;
