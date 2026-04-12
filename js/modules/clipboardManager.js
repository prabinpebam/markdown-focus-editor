/**
 * ClipboardManager
 * 
 * Handles both COPY and PASTE for the editor.
 * 
 * ARCHITECTURE:
 * 
 *   COPY (Ctrl+C / Ctrl+X):
 *     DOM selection → editorHtmlToMarkdown() → clipboard text/plain
 *     DOM selection → clean HTML (no markers, no ZWSPs) → clipboard text/html
 *   
 *   PASTE (Ctrl+V):
 *     clipboard text/plain (if markdown) → markdownToEditorHtml() → insert
 *     clipboard text/html (external) → htmlToMarkdown() → markdownToEditorHtml() → insert
 *     clipboard text/plain (if plain) → insert as text
 * 
 * PRINCIPLE: Markdown is the canonical interchange format.
 *   - Copy always produces valid markdown in text/plain
 *   - Paste always consumes markdown as the normalization layer
 *   - HTML is used only as a rendering convenience, never as source of truth
 */

import markdownConverter from './markdownConverter.js';
import sanitizer from './sanitizer.js';

const clipboardManager = {
    editor: null,

    init(editorInstance) {
        this.editor = editorInstance;
        const editorEl = this.editor.editorEl;
        if (!editorEl) return;

        // Custom copy: produce clean markdown + clean HTML
        editorEl.addEventListener('copy', (e) => this.handleCopy(e));
        editorEl.addEventListener('cut', (e) => this.handleCut(e));

        // Custom paste: consume markdown or HTML → normalize → insert
        editorEl.addEventListener('paste', (e) => this.handlePaste(e));

        console.log('[ClipboardManager] Initialized');
    },

    // ────────────────────────────────────────────────────────────
    //  COPY
    // ────────────────────────────────────────────────────────────

    handleCopy(e) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return; // Nothing selected

        e.preventDefault();

        // Get the selected HTML fragment
        const range = sel.getRangeAt(0);
        const fragment = range.cloneContents();

        // Build a temporary container with the fragment
        const container = document.createElement('div');
        container.appendChild(fragment);

        // 1. Convert editor HTML → clean markdown (text/plain)
        const markdown = this._fragmentToMarkdown(container);

        // 2. Convert editor HTML → clean HTML (no marker spans, no ZWSPs)
        const cleanHtml = this._fragmentToCleanHtml(container);

        // Set both formats on the clipboard
        e.clipboardData.setData('text/plain', markdown);
        e.clipboardData.setData('text/html', cleanHtml);

        console.log('[ClipboardManager] Copy:', { 
            markdownLen: markdown.length,
            htmlLen: cleanHtml.length,
            markdown: markdown.substring(0, 200)
        });
    },

    handleCut(e) {
        // Cut = copy + delete selection
        this.handleCopy(e);
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
            document.execCommand('delete');
            if (this.editor.undoManager) {
                this.editor.undoManager.handleCustomChange('cut');
            }
        }
    },

    /**
     * Convert a DOM fragment (from selection) to clean markdown.
     * Handles heading markers, ZWSPs, inline styles, lists.
     */
    _fragmentToMarkdown(container) {
        const lines = [];

        for (const node of container.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.replace(/\u200B/g, '');
                if (text.trim()) lines.push(text);
                continue;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) continue;

            const tag = node.tagName.toLowerCase();

            // Headings
            if (/^h[1-6]$/.test(tag)) {
                const level = parseInt(tag[1]);
                const text = this._extractTextContent(node);
                lines.push('#'.repeat(level) + ' ' + text);
            }
            // Lists
            else if (tag === 'ul' || tag === 'ol') {
                lines.push(this._listToMarkdown(node, 0));
            }
            // Block elements (div, p)
            else if (tag === 'div' || tag === 'p') {
                const text = this._inlineToMarkdown(node);
                if (text.trim() || node.querySelector('br')) {
                    lines.push(text);
                }
            }
            // Inline elements at top level (partial selection)
            else if (['b', 'strong', 'i', 'em', 's', 'del'].includes(tag)) {
                lines.push(this._inlineToMarkdown(node));
            }
            else {
                const text = this._extractTextContent(node);
                if (text.trim()) lines.push(text);
            }
        }

        return lines.join('\n');
    },

    /**
     * Extract text content from a node, stripping marker spans and ZWSPs.
     */
    _extractTextContent(node) {
        let text = '';
        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                text += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                // Skip heading marker spans
                if (child.classList && child.classList.contains('heading-marker')) {
                    continue;
                }
                text += this._extractTextContent(child);
            }
        }
        return text.replace(/\u200B/g, '').trim();
    },

    /**
     * Convert inline content of a node to markdown.
     * Handles <b>, <i>, <s>, nested combinations.
     */
    _inlineToMarkdown(node) {
        let result = '';
        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent.replace(/\u200B/g, '');
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = child.tagName.toLowerCase();
                // Skip marker spans
                if (child.classList && child.classList.contains('heading-marker')) {
                    continue;
                }
                const inner = this._inlineToMarkdown(child);
                switch (tag) {
                    case 'b': case 'strong': result += `**${inner}**`; break;
                    case 'i': case 'em':     result += `*${inner}*`; break;
                    case 's': case 'del':    result += `~~${inner}~~`; break;
                    case 'a': result += `[${inner}](${child.getAttribute('href') || ''})`; break;
                    case 'br': result += '\n'; break;
                    default: result += inner;
                }
            }
        }
        return result;
    },

    /**
     * Convert a <ul> or <ol> element to markdown list text.
     */
    _listToMarkdown(listEl, indent) {
        const tag = listEl.tagName.toLowerCase();
        const isOrdered = tag === 'ol';
        const lines = [];
        let index = 1;

        for (const child of listEl.children) {
            if (child.tagName.toLowerCase() !== 'li') continue;

            const prefix = ' '.repeat(indent * 2) + (isOrdered ? `${index}.` : '-');
            
            // Collect text and nested lists separately
            let itemText = '';
            const nestedLists = [];
            for (const liChild of child.childNodes) {
                if (liChild.nodeType === Node.TEXT_NODE) {
                    itemText += liChild.textContent.replace(/\u200B/g, '');
                } else if (liChild.nodeType === Node.ELEMENT_NODE) {
                    const lt = liChild.tagName.toLowerCase();
                    if (lt === 'ul' || lt === 'ol') {
                        nestedLists.push(liChild);
                    } else {
                        itemText += this._inlineToMarkdown(liChild);
                    }
                }
            }

            lines.push(`${prefix} ${itemText.trim()}`);
            for (const nested of nestedLists) {
                lines.push(this._listToMarkdown(nested, indent + 1));
            }
            index++;
        }

        return lines.join('\n');
    },

    /**
     * Convert a DOM fragment to clean HTML (no marker spans, no ZWSPs, no contenteditable attrs).
     */
    _fragmentToCleanHtml(container) {
        const clone = container.cloneNode(true);

        // Remove all heading marker spans
        for (const marker of clone.querySelectorAll('.heading-marker')) {
            marker.remove();
        }

        // Remove contenteditable attributes
        for (const el of clone.querySelectorAll('[contenteditable]')) {
            el.removeAttribute('contenteditable');
        }

        // Strip ZWSPs from all text nodes
        const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
        let textNode;
        while (textNode = walker.nextNode()) {
            if (textNode.textContent.includes('\u200B')) {
                textNode.textContent = textNode.textContent.replace(/\u200B/g, '');
            }
        }

        // Remove empty text nodes that resulted from ZWSP stripping
        const emptyNodes = [];
        const walker2 = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
        while (textNode = walker2.nextNode()) {
            if (textNode.textContent === '') emptyNodes.push(textNode);
        }
        for (const n of emptyNodes) n.remove();

        return clone.innerHTML;
    },

    // ────────────────────────────────────────────────────────────
    //  PASTE
    // ────────────────────────────────────────────────────────────

    handlePaste(e) {
        e.preventDefault();

        const clipboardData = e.clipboardData || window.clipboardData;
        const htmlContent = clipboardData.getData('text/html');
        const textContent = clipboardData.getData('text/plain');

        if (htmlContent && htmlContent.trim()) {
            // External HTML → normalize through markdown
            this._pasteHtml(htmlContent);
        } else if (textContent) {
            // Plain text — could be markdown or plain
            this._pasteText(textContent);
        }

        // Record undo state
        if (this.editor && this.editor.undoManager) {
            setTimeout(() => {
                this.editor.undoManager.handleCustomChange('paste');
                if (this.editor.focusMode) {
                    this.editor.focusMode.updateFocusIfActive();
                }
            }, 10);
        }
    },

    /**
     * Paste HTML from external source.
     * Pipeline: HTML → Markdown → Editor HTML → sanitize → insert
     */
    _pasteHtml(html) {
        // Strip any Chrome-injected <meta> and <!--StartFragment--> wrappers
        html = html.replace(/<!--StartFragment-->|<!--EndFragment-->/g, '');
        html = html.replace(/<meta[^>]*>/gi, '');

        // Convert to markdown (normalizes all external formatting)
        const markdown = markdownConverter.htmlToMarkdown(html);
        
        // Convert markdown to editor-specific HTML
        const editorHtml = markdownConverter.markdownToEditorHtml(markdown);
        
        // Sanitize and insert
        this._insertHtml(sanitizer.sanitizeHtml(editorHtml));
    },

    /**
     * Paste plain text (which may contain markdown syntax).
     * Pipeline: detect markdown → convert if needed → insert
     */
    _pasteText(text) {
        // Check if the text contains any markdown syntax
        if (markdownConverter.containsMarkdownSyntax(text)) {
            // Has markdown → convert to editor HTML
            const editorHtml = markdownConverter.markdownToEditorHtml(text);
            this._insertHtml(sanitizer.sanitizeHtml(editorHtml));
        } else {
            // Pure plain text → insert as text nodes in <div> blocks
            this._insertPlainText(text);
        }
    },

    /**
     * Insert HTML content at the current cursor position.
     * Uses DocumentFragment for clean DOM insertion.
     */
    _insertHtml(html) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        range.deleteContents();

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const fragment = document.createDocumentFragment();
        let lastNode = null;
        while (temp.firstChild) {
            lastNode = temp.firstChild;
            fragment.appendChild(lastNode);
        }

        range.insertNode(fragment);

        // Move cursor to end of inserted content
        if (lastNode) {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    },

    /**
     * Insert plain text, splitting on newlines into <div> blocks.
     */
    _insertPlainText(text) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        range.deleteContents();

        const lines = text.split('\n');
        const fragment = document.createDocumentFragment();
        let lastNode = null;

        if (lines.length === 1) {
            // Single line — insert as text node inline
            lastNode = document.createTextNode(lines[0]);
            fragment.appendChild(lastNode);
        } else {
            // Multi-line — each line becomes a <div>
            for (const line of lines) {
                const div = document.createElement('div');
                if (line.trim() === '') {
                    div.appendChild(document.createElement('br'));
                } else {
                    div.textContent = line;
                }
                fragment.appendChild(div);
                lastNode = div;
            }
        }

        range.insertNode(fragment);

        if (lastNode) {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    },
};

export default clipboardManager;
