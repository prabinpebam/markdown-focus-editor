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

        // Track if we're in a fenced code block
        let inCodeBlock = false;
        let codeBlockLang = '';
        let codeBlockLines = [];

        // Track if we're collecting blockquote lines
        let inBlockquote = false;
        let blockquoteLines = [];
        
        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // ── Fenced code block handling ──
            if (line.trim().startsWith('```')) {
                if (!inCodeBlock) {
                    // Opening fence
                    if (inList) {
                        processedLines.push(this._constructList(listItems, listType));
                        inList = false; listItems = [];
                    }
                    if (inBlockquote) {
                        processedLines.push(this._constructBlockquote(blockquoteLines));
                        inBlockquote = false; blockquoteLines = [];
                    }
                    inCodeBlock = true;
                    codeBlockLang = line.trim().substring(3).trim() || 'plaintext';
                    codeBlockLines = [];
                    continue;
                } else {
                    // Closing fence
                    inCodeBlock = false;
                    const escapedCode = codeBlockLines.join('\n')
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    processedLines.push(
                        `<div class="code-block" data-language="${codeBlockLang}" contenteditable="false">` +
                        `<div class="code-block-header" contenteditable="false"><span class="code-language">${codeBlockLang}</span></div>` +
                        `<pre class="code-block-content" contenteditable="true" spellcheck="false"><code class="language-${codeBlockLang}">${escapedCode}\n</code></pre>` +
                        `</div>`
                    );
                    continue;
                }
            }

            if (inCodeBlock) {
                codeBlockLines.push(line);
                continue;
            }

            // ── Blockquote handling ──
            // Match: "> text", ">text", ">" (bare), and "   > text" (indented)
            const quoteMatch = line.match(/^\s*(>{1,5})\s?(.*)$/);
            if (quoteMatch) {
                if (inList) {
                    processedLines.push(this._constructList(listItems, listType));
                    inList = false; listItems = [];
                }
                if (!inBlockquote) inBlockquote = true;
                blockquoteLines.push({ depth: quoteMatch[1].length, text: quoteMatch[2] || '' });
                continue;
            }

            // Close blockquote if we were in one
            if (inBlockquote) {
                processedLines.push(this._constructBlockquote(blockquoteLines));
                inBlockquote = false;
                blockquoteLines = [];
            }
            
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
                const text = this._processInlineMarkdown(headingMatch[2]);
                processedLines.push(`<h${level}><span class="heading-marker" contenteditable="false">${headingMatch[1]}</span>\u200B${text}</h${level}>`);
                continue;
            }

            // Horizontal rule (---, ***, ___)
            if (/^[-*_]{3,}\s*$/.test(line.trim())) {
                if (inList) {
                    processedLines.push(this._constructList(listItems, listType));
                    inList = false; listItems = [];
                }
                processedLines.push('<hr>');
                continue;
            }
            
            // Unordered list item
            const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
            if (ulMatch) {
                const indentLevel = Math.floor(ulMatch[1].length / 2); // Each indent level is 2 spaces
                const markerType = ulMatch[2];
                const itemContent = ulMatch[3];
                
                // If we're starting a new list or switching list type
                if (!inList || listType !== 'ul') {
                    if (inList) {
                        processedLines.push(this._constructList(listItems, listType));
                        listItems = [];
                    }
                    inList = true;
                    listType = 'ul';
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
                
                // If we're starting a new list or switching list type
                if (!inList || listType !== 'ol') {
                    if (inList) {
                        processedLines.push(this._constructList(listItems, listType));
                        listItems = [];
                    }
                    inList = true;
                    listType = 'ol';
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

            // ── Table detection ──
            // Check if this line + next line form a table header + separator
            const tableHeaderMatch = /^\|(.+\|)+\s*$/.test(line);
            if (tableHeaderMatch && i + 1 < lines.length && /^\|(\s*:?-+:?\s*\|)+\s*$/.test(lines[i + 1])) {
                // Collect all table lines
                const tableLines = [line, lines[i + 1]];
                let j = i + 2;
                while (j < lines.length && /^\|(.+\|)+\s*$/.test(lines[j])) {
                    tableLines.push(lines[j]);
                    j++;
                }
                processedLines.push(this._constructTableFromMarkdown(tableLines));
                i = j - 1; // Skip processed lines
                continue;
            }
            
            // Process inline styles for non-list, non-heading lines
            if (line.trim() !== '') {
                let processedLine = this._processInlineMarkdown(line);
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

        // Close any open blockquote
        if (inBlockquote) {
            processedLines.push(this._constructBlockquote(blockquoteLines));
        }

        // Close any unclosed code block
        if (inCodeBlock) {
            const escapedCode = codeBlockLines.join('\n')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            processedLines.push(
                `<div class="code-block" data-language="${codeBlockLang}" contenteditable="false">` +
                `<div class="code-block-header" contenteditable="false"><span class="code-language">${codeBlockLang}</span></div>` +
                `<pre class="code-block-content" contenteditable="true" spellcheck="false"><code class="language-${codeBlockLang}">${escapedCode}\n</code></pre>` +
                `</div>`
            );
        }
        
        return processedLines.join('');
    },

    /**
     * Construct a blockquote from collected lines.
     * @param {Array} lines - Array of {depth, text}
     * @returns {string} - HTML string
     */
    _constructBlockquote(lines) {
        if (lines.length === 0) return '';

        let html = '<blockquote>';
        let currentDepth = 1;

        for (const line of lines) {
            // Open nested blockquotes as needed
            while (currentDepth < line.depth) {
                html += '<blockquote>';
                currentDepth++;
            }
            // Close nested blockquotes as needed
            while (currentDepth > line.depth) {
                html += '</blockquote>';
                currentDepth--;
            }

            // Process inline styles in the line
            let processed = this._processInlineMarkdown(line.text);

            html += `<div>${processed || '<br>'}</div>`;
        }

        // Close all remaining open blockquotes
        while (currentDepth > 0) {
            html += '</blockquote>';
            currentDepth--;
        }

        return html;
    },

    /**
     * Process inline markdown syntax in a single line of text.
     * Handles: inline code, links, bold, italic, strikethrough
     * @param {string} line - Raw text line
     * @returns {string} HTML string
     */
    _processInlineMarkdown(line) {
        if (!line) return '';
        let result = line;
        // Character escapes: \* \[ \\ etc. — replace with placeholder, restore after
        const escapes = [];
        result = result.replace(/\\([\\`*_{}\[\]()#+\-.!~>|])/g, (match, char) => {
            escapes.push(char);
            return `\x00ESC${escapes.length - 1}\x00`;
        });
        // Inline code (must come first — content inside backticks should not be processed)
        result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Images ![alt](url)
        result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" title="$1" contenteditable="false">');
        // Links [text](url)
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" title="$2" contenteditable="false">$1</a>');
        // Bold (asterisks and underscores)
        result = result.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
        result = result.replace(/__([^_]+)__/g, '<b>$1</b>');
        // Italic (asterisks and underscores)
        result = result.replace(/\*([^*]+)\*/g, '<i>$1</i>');
        result = result.replace(/\b_([^_]+)_\b/g, '<i>$1</i>');
        // Strikethrough
        result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');
        // Autolinks: bare URLs
        result = result.replace(/(^|[\s(])(https?:\/\/[^\s<>"')\]]+)/g, '$1<a href="$2" title="$2" contenteditable="false">$2</a>');
        // Restore escaped characters
        result = result.replace(/\x00ESC(\d+)\x00/g, (match, idx) => escapes[parseInt(idx)]);
        return result;
    },
    
    /**
     * Construct a table from markdown lines.
     * @param {string[]} tableLines - Array of pipe-separated lines [header, separator, ...data]
     * @returns {string} HTML table-block string
     */
    _constructTableFromMarkdown(tableLines) {
        if (tableLines.length < 2) return '';

        const parseCells = line => line.split('|').map(s => s.trim()).filter(s => s.length > 0);

        const headers = parseCells(tableLines[0]);
        const sepCells = parseCells(tableLines[1]);

        // Parse alignments
        const alignments = sepCells.map(cell => {
            const left = cell.startsWith(':');
            const right = cell.endsWith(':');
            if (left && right) return 'center';
            if (right) return 'right';
            return 'left';
        });

        // Build header HTML
        let html = '<div class="table-block"><table><thead><tr>';
        headers.forEach((h, i) => {
            const align = alignments[i] || 'left';
            const escaped = h.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += `<th data-align="${align}" style="text-align:${align}">${escaped}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Build data rows
        for (let r = 2; r < tableLines.length; r++) {
            const cells = parseCells(tableLines[r]);
            html += '<tr>';
            headers.forEach((_, i) => {
                const text = (cells[i] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const align = alignments[i] || 'left';
                html += `<td style="text-align:${align}">${text || '<br>'}</td>`;
            });
            html += '</tr>';
        }

        html += '</tbody></table></div>';
        return html;
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

            // Check for task list syntax: [ ] or [x]
            let content = item.content;
            const taskMatch = content.match(/^\[( |x)\]\s*(.*)/i);
            if (taskMatch && listType === 'ul') {
                li.classList.add('task-list-item');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                const checked = taskMatch[1].toLowerCase() === 'x';
                if (checked) {
                    checkbox.setAttribute('checked', 'checked');
                    checkbox.checked = true;
                }
                checkbox.classList.add('task-checkbox');
                checkbox.setAttribute('contenteditable', 'false');
                li.appendChild(checkbox);
                content = taskMatch[2] || '';
            }

            // Process inline markdown in list item content
            const processed = this._processInlineMarkdown(content);
            if (processed !== content) {
                // Contains HTML — use innerHTML
                const span = document.createElement('span');
                span.innerHTML = processed;
                while (span.firstChild) li.appendChild(span.firstChild);
            } else {
                li.appendChild(document.createTextNode(content));
            }
            
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
                // Handle horizontal rule
                else if (tagName === 'hr') {
                    markdown.push('---');
                }
                // Handle blockquote elements
                else if (tagName === 'blockquote') {
                    markdown.push(this._processEditorBlockquote(node, 1));
                }
                // Handle code block elements
                else if (node.classList && node.classList.contains('code-block')) {
                    const lang = node.getAttribute('data-language') || 'plaintext';
                    const code = node.querySelector('code');
                    let codeText = code ? code.textContent : '';
                    // Remove trailing newline that we add for display
                    if (codeText.endsWith('\n')) codeText = codeText.slice(0, -1);
                    markdown.push('```' + lang + '\n' + codeText + '\n```');
                }
                // Handle table elements
                else if (node.classList && node.classList.contains('table-block')) {
                    markdown.push(this._processEditorTable(node));
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
                let marker = isOrdered ? `${itemIndex}.` : '-';

                // Check for task list item
                const isTask = li.classList.contains('task-list-item');
                const checkbox = li.querySelector('input.task-checkbox');
                let taskPrefix = '';
                if (isTask && checkbox) {
                    taskPrefix = checkbox.checked ? '[x] ' : '[ ] ';
                }
                
                // Process inline content without special editor elements
                let itemContent = '';
                for (const child of li.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        // Skip whitespace-only text nodes (from formatted HTML)
                        const text = child.textContent.replace(/\n\s*/g, ' ').trim();
                        if (text) itemContent += text;
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        const childTag = child.nodeName.toLowerCase();
                        if (childTag === 'ul' || childTag === 'ol') {
                            itemContent += '\n' + this._processEditorList(child, indentLevel + 1);
                        } else if (childTag === 'input' && child.classList.contains('task-checkbox')) {
                            // Skip checkbox — already handled via taskPrefix
                        } else {
                            itemContent += this._processEditorInlineContent(child);
                        }
                    }
                }
                
                // Add this item to the list
                const nestedListPattern = /\n(\s+)[-*+0-9.]/;
                if (nestedListPattern.test(itemContent)) {
                    listItems.push(`${indent}${marker} ${taskPrefix}${itemContent.split('\n')[0]}`);
                    const restLines = itemContent.split('\n').slice(1).join('\n');
                    if (restLines.trim()) {
                        listItems.push(restLines);
                    }
                } else {
                    listItems.push(`${indent}${marker} ${taskPrefix}${itemContent.trim()}`);
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
            /\*\*.*\*\*/,                  // Bold (asterisks)
            /__.*__/,                      // Bold (underscores)
            /\*.*\*/,                      // Italic (asterisks)
            /\b_[^_]+_\b/,                // Italic (underscores)
            /^\s*>\s?/m,                   // Blockquotes (including bare > and indented >)
            /^-\s+/m,                      // Unordered lists
            /^[0-9]+\.\s+/m,               // Ordered lists
            /\[.*\]\(.*\)/,                // Links
            /!\[.*\]\(.*\)/,               // Images
            /^```[\s\S]*?```/m,            // Code blocks
            /`.*`/,                        // Inline code
            /^---+$/m,                     // Horizontal rules
            /~~.*~~/,                      // Strikethrough
            /^\|.+\|\s*$/m,               // Tables (pipe-separated rows)
            /https?:\/\/\S+/,              // Autolinks (bare URLs)
            /\\[\\`*_{}\[\]()#+\-.!~>|]/,  // Character escapes
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
                /\*\*.*\*\*/,          // Bold (asterisks)
                /__.*__/,              // Bold (underscores)
                /\*.*\*/,              // Italic (asterisks)
                /\b_.*_\b/,            // Italic (underscores)
                /~~.*~~/,              // Strikethrough
                /`.*`/,                // Inline code
                /\[.*\]\(.*\)/,        // Links
                /!\[.*\]\(.*\)/,       // Images
                /https?:\/\/\S+/,      // Autolinks
                /\\[\\`*_{}\[\]()#+\-.!~>|]/, // Escaped characters
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
        // Use the shared inline processor
        let processedContent = this._processInlineMarkdown(markdown);
        
        // Add zero-width space after the last inline element if there isn't one
        if (!/\u200B$/.test(processedContent)) {
            processedContent = processedContent.replace(/<\/(b|i|s|code|a)>(?![\s\S]*<\/(b|i|s|code|a)>)/g, '$&\u200B');
        }
        
        // Only wrap in a div if not already wrapped in an HTML tag
        if (!/^<[a-z]+[^>]*>.*<\/[a-z]+>$/i.test(processedContent)) {
            return `<div>${processedContent}</div>`;
        }
        
        return processedContent;
    },

    /**
     * Convert an editor blockquote element to markdown.
     * @param {Element} blockquote - The <blockquote> element
     * @param {number} depth - Current nesting depth (1 = top level)
     * @returns {string} Markdown with > prefixes
     */
    _processEditorBlockquote(blockquote, depth) {
        const prefix = '>'.repeat(depth) + ' ';
        const lines = [];

        for (const child of blockquote.childNodes) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                if (child.tagName === 'BLOCKQUOTE') {
                    // Nested blockquote
                    lines.push(this._processEditorBlockquote(child, depth + 1));
                } else if (child.tagName === 'DIV' || child.tagName === 'P') {
                    const content = this._processEditorInlineContent(child);
                    lines.push(prefix + (content.trim() || ''));
                } else {
                    const content = this._processEditorInlineContent(child);
                    if (content.trim()) lines.push(prefix + content.trim());
                }
            } else if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                lines.push(prefix + child.textContent.trim());
            }
        }

        return lines.join('\n');
    },

    /**
     * Convert an editor table block to GFM markdown table.
     * @param {Element} tableBlock - The .table-block element
     * @returns {string} Markdown table
     */
    _processEditorTable(tableBlock) {
        const table = tableBlock.querySelector('table');
        if (!table) return '';

        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // Extract header cells
        const headers = [];
        const alignments = [];
        if (thead) {
            const headerRow = thead.querySelector('tr');
            if (headerRow) {
                for (const th of headerRow.children) {
                    headers.push(th.textContent.trim() || '');
                    alignments.push(th.getAttribute('data-align') || th.style.textAlign || 'left');
                }
            }
        }

        if (headers.length === 0) return '';

        // Extract body rows
        const bodyRows = [];
        if (tbody) {
            for (const tr of tbody.querySelectorAll('tr')) {
                const cells = [];
                for (const td of tr.children) {
                    cells.push(td.textContent.trim() || '');
                }
                bodyRows.push(cells);
            }
        }

        // Calculate column widths for neat output
        const colWidths = headers.map((h, i) => {
            let maxW = h.length;
            for (const row of bodyRows) {
                if (row[i]) maxW = Math.max(maxW, row[i].length);
            }
            return Math.max(maxW, 3); // Minimum 3 for ---
        });

        // Build header row
        const headerLine = '| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |';

        // Build separator row with alignment
        const sepLine = '| ' + alignments.map((a, i) => {
            const w = colWidths[i];
            if (a === 'center') return ':' + '-'.repeat(w - 2) + ':';
            if (a === 'right') return '-'.repeat(w - 1) + ':';
            return '-'.repeat(w);
        }).join(' | ') + ' |';

        // Build data rows
        const dataLines = bodyRows.map(row => {
            const cells = headers.map((_, i) => {
                const cell = row[i] || '';
                return cell.padEnd(colWidths[i]);
            });
            return '| ' + cells.join(' | ') + ' |';
        });

        return [headerLine, sepLine, ...dataLines].join('\n');
    },
};

export default markdownConverter;
