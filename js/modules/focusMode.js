import storage from './storage.js';

const focusMode = {
    isActive: false,
    editor: null,
    editorEl: null,
    overlay: null,
    
    init(editor) {
        this.editor = editor;
        this.editorEl = editor.editorEl;
        console.log('[FocusMode] Initialized with editor instance');
        
        // Create overlay for focus mode
        this.overlay = document.createElement('div');
        this.overlay.id = 'focus-overlay';
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.zIndex = '2';
        
        // Insert overlay after the editor
        this.editorEl.parentNode.insertBefore(this.overlay, this.editorEl.nextSibling);
        
        // Initialize focus toggle button
        const focusToggle = document.getElementById('focus-toggle');
        if (focusToggle) {
            focusToggle.addEventListener('change', () => {
                this.toggleFocus(focusToggle.checked);
            });
            
            // Set initial state based on storage
            const focusEnabled = localStorage.getItem('focusEnabled');
            if (focusEnabled !== null) {
                this.isActive = (focusEnabled === 'true');
                focusToggle.checked = this.isActive;
                console.log(`[FocusMode] Initial state set from storage: ${this.isActive ? 'active' : 'inactive'}`);
                this.applyFocusVisibility();
            }
        }
        
        // Initialize event listeners to update focus when caret moves
        this.editorEl.addEventListener('input', () => this.updateFocusIfActive());
        this.editorEl.addEventListener('click', () => this.updateFocusIfActive());
        this.editorEl.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                this.updateFocusIfActive();
            }
        });
        document.addEventListener('selectionchange', () => this.updateFocusIfActive());
        window.addEventListener('resize', () => this.updateFocusIfActive());
        document.fonts?.ready.then(() => this.updateFocusIfActive());
    },
    
    toggleFocus(isEnabled) {
        this.isActive = isEnabled;
        storage.saveSettings('focusEnabled', isEnabled);
        console.log(`[FocusMode] Focus mode ${isEnabled ? 'enabled' : 'disabled'}`);
        this.applyFocusVisibility();
    },
    
    updateFocusIfActive() {
        if (this.isActive) {
            this.applyFocusVisibility();
        }
    },
    
    getVisualLines() {
        // Get the caret position
        const selection = window.getSelection();
        if (!selection.rangeCount) return [];

        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        
        // Get the rect of the caret position
        const caretRect = range.getClientRects()[0];
        if (!caretRect) return [];
        
        // Find active visual line based on Y position
        const caretY = caretRect.top;
        const editorStyles = window.getComputedStyle(this.editorEl);
        const lineHeight = parseInt(editorStyles.lineHeight) || parseInt(editorStyles.fontSize) * 1.5;
        
        // Increase the tolerance to better detect lines
        const tolerance = lineHeight * 0.75;
        
        // Find all the lines by Y position
        const allLinePositions = new Map(); // Map of Y position -> array of rects
        
        // Find all text nodes in the editor
        const textNodes = [];
        const walker = document.createTreeWalker(this.editorEl, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const textNode = walker.currentNode;
            const text = textNode.nodeValue;
            
            // Skip empty text nodes
            if (!text.trim()) continue;
            
            // Get the range for the entire text node
            const nodeRange = document.createRange();
            nodeRange.selectNodeContents(textNode);
            
            // Check all characters to determine line boundaries
            for (let i = 0; i < text.length; i++) {
                const charRange = document.createRange();
                charRange.setStart(textNode, i);
                charRange.setEnd(textNode, i + 1);
                
                const rects = charRange.getClientRects();
                if (rects.length > 0) {
                    const rect = rects[0];
                    const roundedTop = Math.round(rect.top / tolerance) * tolerance;
                    
                    if (!allLinePositions.has(roundedTop)) {
                        allLinePositions.set(roundedTop, []);
                    }
                    
                    allLinePositions.get(roundedTop).push({
                        rect: rect,
                        node: textNode,
                        startOffset: i,
                        endOffset: i + 1
                    });
                }
            }
        }
        
        // Convert the map to an array of lines sorted by Y position
        const allLines = Array.from(allLinePositions.entries())
            .map(([yPos, rects]) => ({ 
                yPos, 
                rects,
                distance: Math.abs(yPos - caretY) 
            }))
            .sort((a, b) => a.yPos - b.yPos);

        // Find the current line (closest to caret)
        const currentLineIndex = allLines.findIndex(line => 
            Math.abs(line.yPos - caretY) < tolerance);
        
        if (currentLineIndex === -1) return [];
        
        // Get current line and adjacent lines
        const result = [];
        
        // Current line
        const currentLine = allLines[currentLineIndex];
        result.push(this.createVisualLine(currentLine.rects, 'current'));
        
        // Line above
        if (currentLineIndex > 0) {
            const aboveLine = allLines[currentLineIndex - 1];
            result.push(this.createVisualLine(aboveLine.rects, 'above'));
        }
        
        // Line below
        if (currentLineIndex < allLines.length - 1) {
            const belowLine = allLines[currentLineIndex + 1];
            result.push(this.createVisualLine(belowLine.rects, 'below'));
        }
        
        return result;
    },
    
    createVisualLine(rects, type) {
        if (!rects.length) return null;
        
        // Sort rects from left to right
        rects.sort((a, b) => a.rect.left - b.rect.left);
        
        // Calculate the position and dimensions
        const firstRect = rects[0].rect;
        const lastRect = rects[rects.length - 1].rect;
        const top = firstRect.top;
        const left = firstRect.left;
        const width = lastRect.right - firstRect.left;
        const height = firstRect.height;
        
        // Create Range that spans the entire line
        const lineRange = document.createRange();
        lineRange.setStart(rects[0].node, rects[0].startOffset);
        lineRange.setEnd(rects[rects.length - 1].node, rects[rects.length - 1].endOffset);
        
        return {
            top: top,
            left: left,
            width: width,
            height: height,
            range: lineRange,
            type: type
        };
    },
    
    applyFocusVisibility() {
        if (!this.isActive) {
            // Reset the editor and hide overlay
            this.editorEl.style.opacity = '';
            this.overlay.innerHTML = '';
            return;
        }
        
        // Set editor to dim state
        this.editorEl.style.opacity = '0.3';
        
        // Clear previous overlay content
        this.overlay.innerHTML = '';
        
        // Get exact editor dimensions and position
        const editorRect = this.editorEl.getBoundingClientRect();
        const parentRect = this.editorEl.parentNode.getBoundingClientRect();
        
        // Set overlay position to match editor
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = `${editorRect.top - parentRect.top}px`;
        this.overlay.style.left = `${editorRect.left - parentRect.left}px`;
        this.overlay.style.width = `${editorRect.width}px`;
        this.overlay.style.height = `${editorRect.height}px`;
        this.overlay.style.padding = getComputedStyle(this.editorEl).padding;
        
        // Get visual lines
        const visualLines = this.getVisualLines();
        
        // Debug info
        console.log('[FocusMode] Visual lines detected:', visualLines.map(line => line.type));
        
        // Calculate the extra width needed for heading markers (8ch)
        const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const extraWidth = 8 * fontSize; // 8ch worth of space
        
        // Render each line
        visualLines.forEach(lineInfo => {
            if (!lineInfo) return;
            
            // Create highlight background element
            const highlight = document.createElement('div');
            highlight.className = `overlay-line line-highlight line-${lineInfo.type}`;
            
            // Position with extended width to cover heading markers
            highlight.style.position = 'absolute';
            highlight.style.top = `${lineInfo.top - editorRect.top}px`;
            highlight.style.left = `${-extraWidth}px`; // Start before the editor content
            highlight.style.width = `${lineInfo.width + extraWidth}px`; // Extend width to include markers
            highlight.style.height = `${lineInfo.height}px`;
            
            if (lineInfo.type === 'current') {
                highlight.classList.add('focus-line');
            }
            
            this.overlay.appendChild(highlight);
            
            // Clone the contents of the range for text display
            if (lineInfo.range) {
                try {
                    const contents = lineInfo.range.cloneContents();
                    
                    // Create a container for the full text content
                    const textContainer = document.createElement('div');
                    textContainer.className = `line-text line-${lineInfo.type}`;
                    textContainer.appendChild(contents);
                    
                    textContainer.style.position = 'absolute';
                    textContainer.style.top = `${lineInfo.top - editorRect.top}px`;
                    textContainer.style.left = `${lineInfo.left - editorRect.left}px`;
                    
                    // Copy styles from the source nodes
                    const parentNodes = new Set();
                    let node = lineInfo.range.startContainer;
                    while (node && node !== this.editorEl) {
                        parentNodes.add(node.nodeType === 3 ? node.parentNode : node);
                        node = node.parentNode;
                    }
                    
                    // Apply all parent styles that might affect text rendering
                    parentNodes.forEach(parentNode => {
                        if (parentNode && parentNode.nodeType === 1) {  // Element node
                            const style = window.getComputedStyle(parentNode);
                            textContainer.style.fontFamily = style.fontFamily || textContainer.style.fontFamily;
                            textContainer.style.fontSize = style.fontSize || textContainer.style.fontSize;
                            textContainer.style.fontWeight = style.fontWeight || textContainer.style.fontWeight;
                            textContainer.style.fontStyle = style.fontStyle || textContainer.style.fontStyle;
                            textContainer.style.lineHeight = style.lineHeight || textContainer.style.lineHeight;
                            textContainer.style.letterSpacing = style.letterSpacing || textContainer.style.letterSpacing;
                            textContainer.style.textDecoration = style.textDecoration || textContainer.style.textDecoration;
                            textContainer.style.color = style.color || textContainer.style.color;
                        }
                    });
                    
                    this.overlay.appendChild(textContainer);
                } catch (e) {
                    console.error("[FocusMode] Error cloning range contents:", e);
                }
            }
        });
    }
};

export default focusMode;
