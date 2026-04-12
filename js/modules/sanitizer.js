/**
 * Lightweight HTML sanitizer for the Markdown Focus Editor.
 * Strips all tags and attributes not in the allowlist.
 * 
 * This is NOT a DOMPurify replacement for general-purpose use.
 * It's scoped to this editor's known element vocabulary.
 */

const ALLOWED_TAGS = new Set([
    'div', 'p', 'br', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'b', 'strong', 'i', 'em', 's',
    'blockquote',
    'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'hr', 'input', 'img',
]);

const ALLOWED_ATTRS = new Set([
    'class', 'contenteditable', 'data-language', 'data-align',
    'href', 'title', 'type', 'checked',
    'spellcheck', 'style',
    'src', 'alt',
]);

/**
 * Sanitize an HTML string by parsing it and removing disallowed elements/attributes.
 * @param {string} html - Untrusted HTML string
 * @returns {string} Sanitized HTML string
 */
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    sanitizeNode(doc.body);
    
    return doc.body.innerHTML;
}

/**
 * Recursively sanitize a DOM node in-place.
 * @param {Node} node
 */
function sanitizeNode(node) {
    const children = Array.from(node.childNodes);
    
    for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = child.tagName.toLowerCase();
            
            // Remove disallowed elements entirely (including their children for dangerous ones)
            if (tagName === 'script' || tagName === 'style' || tagName === 'iframe' || 
                tagName === 'object' || tagName === 'embed' || tagName === 'link') {
                child.remove();
                continue;
            }
            
            // For other disallowed tags, unwrap (keep children, remove the tag)
            if (!ALLOWED_TAGS.has(tagName)) {
                while (child.firstChild) {
                    node.insertBefore(child.firstChild, child);
                }
                child.remove();
                continue;
            }
            
            // Remove disallowed attributes (including event handlers)
            const attrs = Array.from(child.attributes);
            for (const attr of attrs) {
                if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
                    child.removeAttribute(attr.name);
                }
                // Extra safety: remove any attribute starting with "on" (event handlers)
                if (attr.name.toLowerCase().startsWith('on')) {
                    child.removeAttribute(attr.name);
                }
            }
            
            // Recurse into children
            sanitizeNode(child);
        }
        // Text nodes and comment nodes are kept as-is (text is safe)
    }
}

export default { sanitizeHtml, ALLOWED_TAGS, ALLOWED_ATTRS };
