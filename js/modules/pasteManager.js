/**
 * PasteManager
 * Handles paste events, detects content type, and formats content appropriately
 */

import markdownConverter from './markdownConverter.js';

const pasteManager = {
    editor: null,

    init(editorInstance) {
        this.editor = editorInstance;
        this.setupPasteHandler();
        console.log('[PasteManager] Initialized with editor instance');
    },

    /**
     * Sets up paste event handler
     */
    setupPasteHandler() {
        const editorEl = this.editor.editorEl;
        if (!editorEl) return;
        
        editorEl.addEventListener('paste', (e) => {
            e.preventDefault(); // Prevent default paste behavior
            
            // Get clipboard content and determine type
            const clipboardData = e.clipboardData || window.clipboardData;
            const htmlContent = clipboardData.getData('text/html');
            const textContent = clipboardData.getData('text/plain');
            
            console.log('[PASTE] Raw clipboard content:', {
                html: htmlContent ? (htmlContent.length > 500 ? htmlContent.substring(0, 500) + '...' : htmlContent) : 'none',
                text: textContent ? (textContent.length > 500 ? textContent.substring(0, 500) + '...' : textContent) : 'none'
            });
            
            // Process the pasted content
            if (htmlContent) {
                this.handleHtmlPaste(htmlContent);
            } else if (textContent) {
                this.handleTextPaste(textContent);
            }
            
            // Track document change
            this.notifyDocumentChanged();
        });
    },

    /**
     * Handles HTML content pasting
     * @param {string} htmlContent - The HTML content to paste
     */
    handleHtmlPaste(htmlContent) {
        console.log('[PASTE HTML] Processing HTML content of length:', htmlContent.length);
        
        // 1. Convert HTML to standard Markdown
        const markdown = markdownConverter.htmlToMarkdown(htmlContent);
        console.log('[PASTE HTML] Converted to Markdown:', 
            markdown.length > 500 ? markdown.substring(0, 500) + '...' : markdown);
        
        // 2. Convert standard Markdown to editor-specific HTML
        const editorHtml = markdownConverter.markdownToEditorHtml(markdown);
        console.log('[PASTE HTML] Converted to editor HTML:', 
            editorHtml.length > 500 ? editorHtml.substring(0, 500) + '...' : editorHtml);
        
        // 3. Insert the formatted content
        this.insertHtmlAtCursor(editorHtml);
    },

    /**
     * Handles plain text content pasting
     * @param {string} textContent - The plain text content to paste
     */
    handleTextPaste(textContent) {
        console.log('[PASTE TEXT] Processing plain text of length:', textContent.length);
        console.log('[PASTE TEXT] Content:', textContent);
        
        // First check for common inline markdown patterns
        const italicMatch = textContent.match(/^\*([^*]+)\*$/);
        const boldMatch = textContent.match(/^\*\*([^*]+)\*\*$/);
        const strikeMatch = textContent.match(/^~~([^~]+)~~$/);
        
        if (italicMatch) {
            // Insert clean italic tag with content and ZWSP
            const content = italicMatch[1];
            console.log('[PASTE TEXT] Detected italic pattern, content:', content);
            
            // Debug: Add a custom attribute to track the element
            const htmlToInsert = `<i data-paste-id="debug-${Date.now()}">
            ${content}</i>\u200B`;
            console.log('[PASTE TEXT] Inserting HTML for italic with tracker:', htmlToInsert);
            document.execCommand('insertHTML', false, htmlToInsert);
            
            // Check immediate result
            setTimeout(() => {
                const trackedEl = document.querySelector('[data-paste-id]');
                console.log('[PASTE TEXT] Element immediately after paste:', 
                    trackedEl ? trackedEl.outerHTML : 'Not found');
                
                // Log what's in the DOM after paste
                console.log('[PASTE TEXT] DOM after italic insertion:', 
                    this.logSelectionContext());
            }, 0);
            
            // Check after a longer delay to see if something changes it
            setTimeout(() => {
                const trackedEl = document.querySelector('[data-paste-id]');
                console.log('[PASTE TEXT] Element after delay:', 
                    trackedEl ? trackedEl.outerHTML : 'Not found or transformed');
            }, 50);
            
            return;
        } else if (boldMatch) {
            // Insert clean bold tag with content and ZWSP
            const content = boldMatch[1];
            console.log('[PASTE TEXT] Detected bold pattern, content:', content);
            const htmlToInsert = `<b>${content}</b>\u200B`;
            console.log('[PASTE TEXT] Inserting HTML for bold:', htmlToInsert);
            document.execCommand('insertHTML', false, htmlToInsert);
            
            // Log what's in the DOM after paste
            setTimeout(() => {
                console.log('[PASTE TEXT] DOM after bold insertion:', 
                    this.logSelectionContext());
            }, 10);
            return;
        } else if (strikeMatch) {
            // Insert clean strikethrough tag with content and ZWSP
            const content = strikeMatch[1];
            console.log('[PASTE TEXT] Detected strikethrough pattern, content:', content);
            const htmlToInsert = `<s>${content}</s>\u200B`;
            console.log('[PASTE TEXT] Inserting HTML for strikethrough:', htmlToInsert);
            document.execCommand('insertHTML', false, htmlToInsert);
            
            // Log what's in the DOM after paste
            setTimeout(() => {
                console.log('[PASTE TEXT] DOM after strikethrough insertion:', 
                    this.logSelectionContext());
            }, 10);
            return;
        } else if (markdownConverter.containsMarkdownSyntax(textContent)) {
            console.log('[PASTE TEXT] Detected Markdown syntax');
            
            // Check if we need to add the containsOnlyInlineMarkdown function
            let isSimpleInline = false;
            if (typeof markdownConverter.containsOnlyInlineMarkdown === 'function') {
                isSimpleInline = markdownConverter.containsOnlyInlineMarkdown(textContent);
                console.log('[PASTE TEXT] Contains only inline Markdown:', isSimpleInline);
            } else {
                console.log('[PASTE TEXT] containsOnlyInlineMarkdown function not available');
            }
            
            // If it contains Markdown syntax, convert it to editor-compatible HTML
            const editorHtml = markdownConverter.markdownToEditorHtml(textContent);
            console.log('[PASTE TEXT] Converted to editor HTML:', 
                editorHtml.length > 500 ? editorHtml.substring(0, 500) + '...' : editorHtml);
            
            // For simple inline content, use cleaner insertion approach
            if (isSimpleInline) {
                this.insertCleanInlineContent(editorHtml);
            } else {
                this.insertHtmlAtCursor(editorHtml);
            }
            
            // Log what's in the DOM after paste
            setTimeout(() => {
                console.log('[PASTE TEXT] DOM after markdown insertion:', 
                    this.logSelectionContext());
            }, 20);
        } else {
            // Just insert plain text
            console.log('[PASTE TEXT] No Markdown detected, inserting as plain text');
            this.insertTextAtCursor(textContent);
            
            // Log what's in the DOM after paste
            setTimeout(() => {
                console.log('[PASTE TEXT] DOM after plain text insertion:', 
                    this.logSelectionContext());
            }, 10);
        }
    },

    /**
     * Inserts clean inline content without extra styling or attributes
     * @param {string} html - HTML content to insert
     */
    insertCleanInlineContent(html) {
        console.log('[PASTE INSERT] Inserting clean inline content:', html);
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Extract the clean inline elements
        let cleanHtml = '';
        const element = tempDiv.querySelector('b, i, s');
        
        if (element) {
            const tagName = element.tagName.toLowerCase();
            const content = element.textContent;
            cleanHtml = `<${tagName}>${content}</${tagName}>\u200B`;
        } else {
            // If no supported tag found, just use the content without formatting
            cleanHtml = tempDiv.textContent + '\u200B';
        }
        
        console.log('[PASTE INSERT] Final clean inline HTML being inserted:', cleanHtml);
        
        // Insert clean HTML
        document.execCommand('insertHTML', false, cleanHtml);
        
        // Process the content for proper formatting
        if (this.editor && typeof this.editor.processContent === 'function') {
            setTimeout(() => {
                this.editor.processContent();
            }, 10);
        }
    },

    /**
     * Inserts HTML content at cursor position
     * @param {string} html - HTML content to insert
     */
    insertHtmlAtCursor(html) {
        console.log('[PASTE INSERT] Inserting HTML at cursor, length:', html.length);
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Log DOM structure before insertion
        console.log('[PASTE INSERT] DOM structure about to be inserted:', this.logDomStructure(tempDiv));
        
        // Create a document fragment from the HTML
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
        
        // Insert the fragment and move cursor to the end
        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Process the content for proper formatting
        if (this.editor && typeof this.editor.processContent === 'function') {
            setTimeout(() => {
                this.editor.processContent();
                console.log('[PASTE INSERT] Editor content after processing:', 
                    this.editor.editorEl.innerHTML.length > 500 ? 
                    this.editor.editorEl.innerHTML.substring(0, 500) + '...' : 
                    this.editor.editorEl.innerHTML);
            }, 10);
        }
    },

    /**
     * Create a simplified representation of DOM structure for logging
     * @param {Node} node - The node to analyze
     * @param {number} depth - Current depth level
     * @returns {string} Text representation of DOM structure
     */
    logDomStructure(node, depth = 0) {
        if (!node) return '';
        
        const indent = '  '.repeat(depth);
        let result = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                result += `${indent}"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n`;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            result += `${indent}<${node.tagName.toLowerCase()}`;
            
            // Add class attribute if present
            if (node.className) {
                result += ` class="${node.className}"`;
            }
            
            result += '>\n';
            
            // Process children
            for (let i = 0; i < node.childNodes.length; i++) {
                result += this.logDomStructure(node.childNodes[i], depth + 1);
            }
            
            // Only add closing tag for non-empty elements
            if (node.childNodes.length > 0) {
                result += `${indent}</${node.tagName.toLowerCase()}>\n`;
            }
        }
        
        return result;
    },

    /**
     * Inserts plain text at cursor position
     * @param {string} text - Text to insert
     */
    insertTextAtCursor(text) {
        console.log('[PASTE INSERT] Inserting plain text at cursor, length:', text.length);
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(text);
        
        range.deleteContents();
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
    },

    /**
     * Inserts inline formatted content at cursor position
     * @param {string} html - HTML content to insert
     */
    insertFormattedInlineContent(html) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Extract just the basic inline element without any extra attributes
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Look for simple inline elements (b, i, s)
        const inlineElement = tempDiv.querySelector('b, i, s');
        let contentToInsert = '';
        
        if (inlineElement) {
            const tagName = inlineElement.tagName.toLowerCase();
            const content = inlineElement.textContent;
            contentToInsert = `<${tagName}>${content}</${tagName}>\u200B`;
        } else {
            // Fall back to simplified content
            contentToInsert = tempDiv.textContent + '\u200B';
        }
        
        // Insert at current position using execCommand
        document.execCommand('insertHTML', false, contentToInsert);
        
        // Process content
        if (this.editor && typeof this.editor.processContent === 'function') {
            setTimeout(() => this.editor.processContent(), 10);
        }
    },

    /**
     * Notifies that document content has changed
     */
    notifyDocumentChanged() {
        const currentDocId = localStorage.getItem('currentDocId');
        if (currentDocId && this.editor.editorEl) {
            setTimeout(() => {
                const documentStore = this.editor.documentStore;
                if (documentStore) {
                    const doc = documentStore.getDocumentById(currentDocId);
                    if (doc) {
                        documentStore.saveDocument({
                            ...doc,
                            content: this.editor.editorEl.innerHTML,
                            lastEditedAt: new Date().toISOString()
                        });
                    }
                }
            }, 100);
        }
    },

    /**
     * Logs the DOM context around the current selection
     * @returns {string} Description of the current selection context
     */
    logSelectionContext() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return "No selection";
        
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        let contextNode = container;
        // If it's a text node, get its parent for better context
        if (container.nodeType === Node.TEXT_NODE) {
            contextNode = container.parentNode;
        }
        
        // Build context information
        let result = '';
        
        // Parent context
        if (contextNode.parentNode) {
            result += `Parent: <${contextNode.parentNode.nodeName.toLowerCase()}>\n`;
        }
        
        // Current node
        result += `Current: <${contextNode.nodeName.toLowerCase()}`;
        if (contextNode.className) {
            result += ` class="${contextNode.className}"`;
        }
        result += '>\n';
        
        // Show HTML content
        if (contextNode.outerHTML) {
            const html = contextNode.outerHTML;
            result += `HTML: ${html.length > 500 ? html.substring(0, 500) + '...' : html}\n`;
        } else {
            // For text nodes
            result += `Text: ${contextNode.textContent}\n`;
        }
        
        // Show selection details
        result += `Selection: anchorNode=${selection.anchorNode?.nodeName || 'null'}, ` +
                  `offset=${selection.anchorOffset}, ` +
                  `focusNode=${selection.focusNode?.nodeName || 'null'}, ` +
                  `offset=${selection.focusOffset}\n`;
                  
        return result;
    },
};

export default pasteManager;
