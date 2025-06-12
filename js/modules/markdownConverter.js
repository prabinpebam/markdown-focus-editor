/**
 * Markdown Converter
 * Handles conversion between Markdown, standard HTML, and editor-specific HTML
 */

const markdownConverter = {
    /**
     * Converts markdown syntax to editor-specific HTML
     * @param {string} markdown - Raw markdown content
     * @returns {string} Editor-compatible HTML
     */
    markdownToEditorHtml(markdown) {
        if (!markdown) return '';
        
        // Check if this is just a simple inline formatted text without block elements
        if (!markdown.includes('\n') && this.containsOnlyInlineMarkdown(markdown)) {
            return this._processInlineOnlyMarkdown(markdown);
        }
        
        // Normalize line endings
        let content = markdown.replace(/\r\n/g, '\n');
        
        // Split into lines to process block-level elements
        const lines = content.split('\n');
        const processedLines = [];
        
        // Track if we're in a list and its type
        let inList = false;
        let listType = null;
        let listItems = [];
        let listIndentLevel = 0;
        
        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Heading - convert to editor format with span marker
            const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                // Close any open list
                if (inList) {
                    processedLines.push(this._constructList(listItems, listType));
                    inList = false;
                    listItems = [];
                }
                
                const level = headingMatch[1].length;
                const text = headingMatch[2];
                processedLines.push(`<h${level}><span class="heading-marker" contenteditable="false">${headingMatch[1]}</span>\u200B${text}</h${level}>`);
                continue;
            }
            
            // Unordered list item
            const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
            if (ulMatch) {
                const indentLevel = Math.floor(ulMatch[1].length / 2); // Each indent level is 2 spaces
                const markerType = ulMatch[2];
                const itemContent = ulMatch[3];
                
                // If we're starting a new list or the indent level changed
                if (!inList || listType !== 'ul' || listIndentLevel !== indentLevel) {
                    if (inList) {
                        processedLines.push(this._constructList(listItems, listType));
                        listItems = [];
                    }
                    inList = true;
                    listType = 'ul';
                    listIndentLevel = indentLevel;
                }
                
                listItems.push({ content: itemContent, level: indentLevel });
                continue;
            }
            
            // Ordered list item
            const olMatch = line.match(/^(\s*)(\d+\.)\s+(.*)$/);
            if (olMatch) {
                const indentLevel = Math.floor(olMatch[1].length / 2); // Each indent level is 2 spaces
                const marker = olMatch[2];
                const itemContent = olMatch[3];
                
                // If we're starting a new list or the indent level changed
                if (!inList || listType !== 'ol' || listIndentLevel !== indentLevel) {
                    if (inList) {
                        processedLines.push(this._constructList(listItems, listType));
                        listItems = [];
                    }
                    inList = true;
                    listType = 'ol';
                    listIndentLevel = indentLevel;
                }
                
                listItems.push({ content: itemContent, level: indentLevel });
                continue;
            }
            
            // If this line is not a list item but we're in a list, close the list
            if (inList && line.trim() !== '') {
                processedLines.push(this._constructList(listItems, listType));
                inList = false;
                listItems = [];
            }
            
            // Process inline styles for non-list, non-heading lines
            if (line.trim() !== '') {
                // Bold
                let processedLine = line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
                // Italic
                processedLine = processedLine.replace(/\*([^*]+)\*/g, '<i>$1</i>');
                // Strikethrough
                processedLine = processedLine.replace(/~~([^~]+)~~/g, '<s>$1</s>');
                
                processedLines.push(`<div>${processedLine}</div>`);
            } else if (line.trim() === '' && !inList) {
                // Empty line not in a list
                processedLines.push('<div><br></div>');
            }
        }
        
        // Close any open list
        if (inList) {
            processedLines.push(this._constructList(listItems, listType));
        }
        
        return processedLines.join('');
    },
    
    /**
     * Helper function to construct nested lists with proper indentation
     * @param {Array} items - List of items with content and level
     * @param {string} listType - 'ul' or 'ol'
     * @returns {string} HTML for nested list
     */
    _constructList(items, listType) {
        if (items.length === 0) return '';
        
        // Build a nested structure based on indent levels
        const rootList = document.createElement(listType);
        let currentLevel = 0;
        let currentList = rootList;
        let listStack = [rootList];
        
        for (const item of items) {
            // Create a new list item
            const li = document.createElement('li');
            li.textContent = item.content;
            
            // If indent level increased, create a new sublist
            if (item.level > currentLevel) {
                const diff = item.level - currentLevel;
                for (let i = 0; i < diff; i++) {
                    const newList = document.createElement(listType);
                    // Get the last list item in the current list
                    const lastLi = currentList.lastChild;
                    if (lastLi) {
                        lastLi.appendChild(newList);
                    } else {
                        currentList.appendChild(newList);
                    }
                    currentList = newList;
                    listStack.push(newList);
                }
            } 
            // If indent level decreased, go back up the stack
            else if (item.level < currentLevel) {
                const diff = currentLevel - item.level;
                for (let i = 0; i < diff; i++) {
                    listStack.pop();
                }
                currentList = listStack[listStack.length - 1];
            }
            
            currentList.appendChild(li);
            currentLevel = item.level;
        }
        
        // Convert the DOM structure to HTML string
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(rootList);
        return tempDiv.innerHTML;
    },
    
    /**
     * Converts standard HTML to markdown syntax
     * @param {string} html - Standard HTML content
     * @returns {string} Markdown content
     */
    htmlToMarkdown(html) {
        // Create a temporary element to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Process the DOM structure recursively
        return this._processNodeToMarkdown(tempDiv);
    },
    
    /**
     * Recursive helper to convert HTML nodes to markdown
     * @param {Node} node - DOM node to process
     * @param {Array} context - Parent context information
     * @param {number} listIndent - Indentation level for lists
     * @returns {string} Markdown representation
     */
    _processNodeToMarkdown(node, context = [], listIndent = 0) {
        let result = '';
        
        // Handle node based on type
        if (node.nodeType === Node.TEXT_NODE) {
            result = node.textContent;
        } 
        else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.nodeName.toLowerCase();
            
            // Process children content first for use in wrappers
            let childContent = '';
            for (const child of node.childNodes) {
                childContent += this._processNodeToMarkdown(child, [...context, tagName], listIndent);
            }
            
            // Apply appropriate markdown based on tag
            switch (tagName) {
                case 'h1': result = `# ${childContent}\n\n`; break;
                case 'h2': result = `## ${childContent}\n\n`; break;
                case 'h3': result = `### ${childContent}\n\n`; break;
                case 'h4': result = `#### ${childContent}\n\n`; break;
                case 'h5': result = `##### ${childContent}\n\n`; break;
                case 'h6': result = `###### ${childContent}\n\n`; break;
                case 'p': result = `${childContent}\n\n`; break;
                case 'strong':
                case 'b': result = `**${childContent}**`; break;
                case 'em':
                case 'i': result = `*${childContent}*`; break;
                case 'u': result = `<u>${childContent}</u>`; break;
                case 'strike':
                case 's':
                case 'del': result = `~~${childContent}~~`; break;
                case 'a': result = `[${childContent}](${node.getAttribute('href') || ''})`; break;
                case 'img': result = `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})`; break;
                case 'code': result = `\`${childContent}\``; break;
                case 'pre': result = `\`\`\`\n${childContent}\n\`\`\``; break;
                case 'ul': 
                case 'ol': {
                    // Increase indentation for nested lists
                    const nestedIndent = listIndent + 1;
                    const items = Array.from(node.children).map(li => {
                        const indent = ' '.repeat(nestedIndent * 2);
                        if (tagName === 'ol') {
                            // For ordered lists, find the index of the list item
                            let index = 1;
                            let sibling = li.previousElementSibling;
                            while (sibling) {
                                if (sibling.nodeName.toLowerCase() === 'li') index++;
                                sibling = sibling.previousElementSibling;
                            }
                            return `${indent}${index}. ${this._processNodeToMarkdown(li, [...context, 'li'], nestedIndent).trim()}`;
                        } else {
                            return `${indent}- ${this._processNodeToMarkdown(li, [...context, 'li'], nestedIndent).trim()}`;
                        }
                    }).join('\n');
                    result = `\n${items}\n\n`;
                    break;
                }
                case 'li': {
                    // Skip the list marker as it's handled in the parent UL/OL element
                    if (context.includes('ul') || context.includes('ol')) {
                        result = childContent;
                    } else {
                        result = `- ${childContent}\n`;
                    }
                    break;
                }
                case 'blockquote': result = `> ${childContent.replace(/\n/g, '\n> ')}\n\n`; break;
                case 'hr': result = `---\n\n`; break;
                case 'br': result = `\n`; break;
                case 'div': result = `${childContent}\n`; break;
                default: result = childContent;
            }
        }
        
        return result;
    },
    
    /**
     * Converts editor-specific HTML to standard markdown syntax
     * @param {string} editorHtml - Editor HTML content
     * @returns {string} Standard markdown content
     */
    editorHtmlToMarkdown(editorHtml) {
        // Create a temporary element to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editorHtml;
        
        // Process each block-level element
        const markdown = [];
        
        for (const node of tempDiv.childNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.nodeName.toLowerCase();
                
                // Handle heading elements with marker spans
                if (/^h[1-6]$/.test(tagName)) {
                    const level = parseInt(tagName.slice(1));
                    const markerSpan = node.querySelector('.heading-marker');
                    
                    // Get the text content excluding the heading marker span
                    let headingText = node.textContent;
                    if (markerSpan) {
                        headingText = headingText.replace(markerSpan.textContent, '');
                    }
                    
                    // Remove zero-width space
                    headingText = headingText.replace(/\u200B/g, '');
                    
                    // Create the markdown heading
                    markdown.push(`${'#'.repeat(level)} ${headingText.trim()}`);
                }
                // Handle list elements
                else if (tagName === 'ul' || tagName === 'ol') {
                    markdown.push(this._processEditorList(node));
                }
                // Handle normal divs and paragraphs
                else if (tagName === 'div' || tagName === 'p') {
                    let content = this._processEditorInlineContent(node);
                    
                    // Only add if there's actual content (not just a <br>)
                    if (content.trim() !== '') {
                        markdown.push(content);
                    } else if (node.querySelector('br')) {
                        markdown.push(''); // Empty line
                    }
                }
                else {
                    // Any other element, try to extract inline content
                    markdown.push(this._processEditorInlineContent(node));
                }
            }
        }
        
        return markdown.join('\n\n');
    },
    
    /**
     * Processes editor list elements into proper markdown
     * @param {Element} listElement - The UL or OL element
     * @param {number} indentLevel - Current indentation level
     * @returns {string} Markdown list representation
     */
    _processEditorList(listElement, indentLevel = 0) {
        const tagName = listElement.nodeName.toLowerCase();
        const isOrdered = tagName === 'ol';
        const listItems = [];
        
        // Process each list item
        let itemIndex = 1;
        for (const li of listElement.children) {
            if (li.nodeName.toLowerCase() === 'li') {
                const indent = ' '.repeat(indentLevel * 2);
                const marker = isOrdered ? `${itemIndex}.` : '-';
                
                // Process inline content without special editor elements
                let itemContent = '';
                for (const child of li.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        itemContent += child.textContent;
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        const childTag = child.nodeName.toLowerCase();
                        if (childTag === 'ul' || childTag === 'ol') {
                            // Handle nested list separately
                            itemContent += '\n' + this._processEditorList(child, indentLevel + 1);
                        } else {
                            // Process inline formatting
                            itemContent += this._processEditorInlineContent(child);
                        }
                    }
                }
                
                // Add this item to the list
                const nestedListPattern = /\n(\s+)[-*+0-9.]/;
                if (nestedListPattern.test(itemContent)) {
                    // If item contains a nested list, handle spacing carefully
                    listItems.push(`${indent}${marker} ${itemContent.split('\n')[0]}`);
                    // Append the rest of the content which should be the nested list
                    const restLines = itemContent.split('\n').slice(1).join('\n');
                    if (restLines.trim()) {
                        listItems.push(restLines);
                    }
                } else {
                    listItems.push(`${indent}${marker} ${itemContent.trim()}`);
                }
                
                itemIndex++;
            }
        }
        
        return listItems.join('\n');
    },
    
    /**
     * Processes editor inline content, handling special formatting
     * @param {Element} element - Element to process
     * @returns {string} Markdown formatted content
     */
    _processEditorInlineContent(element) {
        let result = '';
        
        // Process each child node
        for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                // Clean up zero-width spaces
                result += child.textContent.replace(/\u200B/g, '');
            } 
            else if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.nodeName.toLowerCase();
                
                switch(tagName) {
                    case 'b':
                    case 'strong':
                        result += `**${this._processEditorInlineContent(child)}**`;
                        break;
                    case 'i':
                    case 'em':
                        result += `*${this._processEditorInlineContent(child)}*`;
                        break;
                    case 's':
                    case 'strike':
                    case 'del':
                        result += `~~${this._processEditorInlineContent(child)}~~`;
                        break;
                    case 'a':
                        const href = child.getAttribute('href') || '';
                        result += `[${this._processEditorInlineContent(child)}](${href})`;
                        break;
                    case 'code':
                        result += `\`${this._processEditorInlineContent(child)}\``;
                        break;
                    case 'br':
                        result += '\n';
                        break;
                    case 'span':
                        // Skip heading marker spans
                        if (!child.classList.contains('heading-marker')) {
                            result += this._processEditorInlineContent(child);
                        }
                        break;
                    default:
                        // For other elements, just get content
                        result += this._processEditorInlineContent(child);
                }
            }
        }
        
        return result;
    },
    
    /**
     * Checks if text content contains Markdown syntax
     * @param {string} content - The text content to check
     * @returns {boolean} True if markdown syntax is detected
     */
    containsMarkdownSyntax(content) {
        // Test for common Markdown patterns
        const markdownPatterns = [
            /^#+\s+/m,                     // Headers
            /\*\*.*\*\*/,                  // Bold
            /\*.*\*/,                      // Italic
            /^>\s+/m,                      // Blockquotes
            /^-\s+/m,                      // Unordered lists
            /^[0-9]+\.\s+/m,               // Ordered lists
            /\[.*\]\(.*\)/,                // Links
            /!\[.*\]\(.*\)/,               // Images
            /^```[\s\S]*?```/m,            // Code blocks
            /`.*`/,                        // Inline code
            /^---+$/m,                     // Horizontal rules
            /~~.*~~/                       // Strikethrough
        ];
        
        // Return true if any pattern matches
        return markdownPatterns.some(pattern => pattern.test(content));
    },
    
    /**
     * Checks if text contains only inline Markdown syntax (no block elements)
     * @param {string} content - The text content to check
     * @returns {boolean} True if only inline markdown is detected
     */
    containsOnlyInlineMarkdown(content) {
        // Check for block-level patterns that would indicate complex markdown
        const blockPatterns = [
            /^#{1,6}\s+/m,             // Headers
            /^>\s+/m,                  // Blockquotes
            /^-\s+/m,                  // Unordered lists
            /^[0-9]+\.\s+/m,           // Ordered lists
            /^```[\s\S]*?```/m,        // Code blocks
            /^\|\s+.*\s+\|/m,          // Tables
            /^---+$/m,                 // Horizontal rules
            /\n\n/                     // Multiple paragraphs (double line breaks)
        ];
        
        // If any block pattern matches, it's not just inline markdown
        const hasBlockElements = blockPatterns.some(pattern => pattern.test(content));
        
        // Only check for inline patterns if no block patterns were found
        if (!hasBlockElements) {
            // Check if there's at least one inline pattern
            const inlinePatterns = [
                /\*\*.*\*\*/,          // Bold
                /\*.*\*/,              // Italic
                /~~.*~~/,              // Strikethrough
                /`.*`/,                // Inline code
                /\[.*\]\(.*\)/,        // Links
                /!\[.*\]\(.*\)/        // Images
            ];
            
            return inlinePatterns.some(pattern => pattern.test(content));
        }
        
        return false;
    },
    
    /**
     * Process markdown that contains only inline formatting
     * @param {string} markdown - Inline markdown content
     * @returns {string} Processed HTML for inline content
     */
    _processInlineOnlyMarkdown(markdown) {
        // Check for exact pattern matches first
        const italicMatch = markdown.match(/^\*([^*]+)\*$/);
        const boldMatch = markdown.match(/^\*\*([^*]+)\*\*$/);
        const strikeMatch = markdown.match(/^~~([^~]+)~~$/);
        
        // Handle exact matches with clean tags
        if (italicMatch) {
            return `<i>${italicMatch[1]}</i>`;
        } else if (boldMatch) {
            return `<b>${boldMatch[1]}</b>`;
        } else if (strikeMatch) {
            return `<s>${strikeMatch[1]}</s>`;
        }
        
        // Process other inline styles
        let processedContent = markdown;
        
        // Bold
        processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
        
        // Italic
        processedContent = processedContent.replace(/\*([^*]+)\*/g, '<i>$1</i>');
        
        // Strikethrough
        processedContent = processedContent.replace(/~~([^~]+)~~/g, '<s>$1</s>');
        
        // Add zero-width space after the last inline element if there isn't one
        if (!/\u200B$/.test(processedContent)) {
            processedContent = processedContent.replace(/<\/(b|i|s)>(?![\s\S]*<\/(b|i|s)>)/g, '$&\u200B');
        }
        
        // Only wrap in a div if not already wrapped in an HTML tag
        if (!/^<[a-z]+[^>]*>.*<\/[a-z]+>$/i.test(processedContent)) {
            return `<div>${processedContent}</div>`;
        }
        
        return processedContent;
    },
};

export default markdownConverter;
