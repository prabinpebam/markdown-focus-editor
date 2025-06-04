// Focus Mode module that handles the highlighting of the current line in the editor

const focusMode = {
    editor: null,
    editorEl: null,
    editorWrapper: null,
    focusToggle: null,
    maskBase: null,
    focusLine: null,
    isFocusMode: false,

    init(editorInstance) {
        // Store reference to the editor instance, not just the DOM element
        this.editor = editorInstance;
        this.editorEl = document.getElementById('editor');
        this.editorWrapper = document.querySelector('.editor-wrapper');
        this.focusToggle = document.getElementById('focus-toggle');
        this.maskBase = document.getElementById('mask-base');
        this.focusLine = document.getElementById('focus-line');
        
        // Set up event listeners
        if (this.focusToggle) {
            this.focusToggle.addEventListener('change', this.toggleFocusMode.bind(this));
        }
        
        // Only attach event listeners if editorEl is a valid DOM element
        if (this.editorEl) {
            this.editorEl.addEventListener('input', this.updateFocusIfActive.bind(this));
            this.editorEl.addEventListener('click', this.updateFocusIfActive.bind(this));
            this.editorEl.addEventListener('keyup', this.handleKeyUp.bind(this));
        } else {
            console.error('[FocusMode] Editor element not found');
            return this; // Return early to prevent further errors
        }
        
        document.addEventListener('selectionchange', this.updateFocusIfActive.bind(this));
        window.addEventListener('resize', this.updateMaskDimensions.bind(this));
        
        // Initial setup
        this.updateMaskDimensions();
        
        // Set initial state based on toggle position
        if (this.focusToggle && this.focusToggle.checked) {
            this.toggleFocusMode({ target: { checked: true } });
        }

        console.log('[FocusMode] Initialized with editor instance');
        return this;
    },

    toggleFocusMode(event) {
        this.isFocusMode = event.target.checked;
        
        if (this.isFocusMode) {
            // Update dimensions before applying mask
            this.updateMaskDimensions();
            // Apply the mask to the editor wrapper instead of the editor
            this.editorWrapper.style.maskImage = 'url(#focusMask)';
            this.editorWrapper.style.webkitMaskImage = 'url(#focusMask)';
        } else {
            this.editorWrapper.style.maskImage = 'none';
            this.editorWrapper.style.webkitMaskImage = 'none';
        }

        this.updateFocusIfActive();
    },

    handleKeyUp(e) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            this.updateFocusIfActive();
        }
    },

    updateMaskDimensions() {
        const svgDefs = document.querySelector('.svg-defs');
        if (!svgDefs || !this.editorWrapper) return;
        
        // Set explicit dimensions on SVG
        svgDefs.setAttribute('width', window.innerWidth);
        svgDefs.setAttribute('height', window.innerHeight);
        svgDefs.style.width = window.innerWidth + 'px';
        svgDefs.style.height = window.innerHeight + 'px';
        
        // Set mask base dimensions to cover the entire editor area
        if (this.maskBase) {
            this.maskBase.setAttribute('width', window.innerWidth);
            this.maskBase.setAttribute('height', Math.max(
                window.innerHeight, 
                this.editorWrapper.scrollHeight
            ));
        }
        
        this.updateFocusIfActive();
    },

    updateFocusIfActive() {
        if (!this.isFocusMode) return;
        this.updateFocusLine();
    },

    updateFocusLine() {
        if (!this.isFocusMode || !this.focusLine) return;
        
        // Get selection and range
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        
        // Get the rect of the caret position
        const caretRect = range.getClientRects()[0];
        if (!caretRect) return;
        
        // Calculate line position based on caret Y position
        const wrapperRect = this.editorWrapper.getBoundingClientRect();
        const caretY = caretRect.top;
        
        // Get computed line height for the editor
        const editorStyles = window.getComputedStyle(this.editorEl);
        const lineHeight = parseInt(editorStyles.lineHeight) || parseInt(editorStyles.fontSize) * 1.5;
        
        // Define tolerance for grouping characters into the same visual line
        const tolerance = lineHeight * 0.5;
        
        // Find the visual line at the caret position
        const visualLine = this.findVisualLineAtY(caretY, tolerance);
        
        if (visualLine) {
            // Calculate position relative to wrapper for Y, but use full viewport width
            const wrapperLeftOffset = wrapperRect.left;
            const x = -wrapperLeftOffset; // Negative offset to start at the left edge of viewport
            const y = visualLine.top - wrapperRect.top + this.editorWrapper.scrollTop;
            const width = window.innerWidth; // Use full viewport width
            const height = visualLine.height;
            
            // Update focus line
            this.focusLine.setAttribute('x', x);
            this.focusLine.setAttribute('y', y);
            this.focusLine.setAttribute('width', width);
            this.focusLine.setAttribute('height', height);
        } else {
            // Fallback: use the caret position to estimate line with full viewport width
            const lineHeight = parseInt(getComputedStyle(this.editorEl).lineHeight) || 24;
            
            const wrapperLeftOffset = wrapperRect.left;
            const x = -wrapperLeftOffset; // Negative offset to start at left edge of viewport
            const y = caretRect.top - wrapperRect.top - lineHeight/4 + this.editorWrapper.scrollTop;
            const width = window.innerWidth; // Use full viewport width
            const height = lineHeight;
            
            // Update focus line
            this.focusLine.setAttribute('x', x);
            this.focusLine.setAttribute('y', y);
            this.focusLine.setAttribute('width', width);
            this.focusLine.setAttribute('height', height);
        }
    },

    findVisualLineAtY(targetY, tolerance) {
        const editorRect = this.editorEl.getBoundingClientRect();
        
        // Group characters by Y position to identify visual lines
        const visualLinesByY = new Map();
        
        // Process all text nodes in the editor
        const walker = document.createTreeWalker(this.editorEl, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const textNode = walker.currentNode;
            const text = textNode.nodeValue;
            
            // Skip empty text nodes
            if (!text.trim()) continue;
            
            // Sample characters to identify line breaks
            // For long text nodes, we sample every few characters to improve performance
            const step = Math.max(1, Math.floor(text.length / 20));
            
            for (let i = 0; i < text.length; i += step) {
                const charRange = document.createRange();
                charRange.setStart(textNode, i);
                charRange.setEnd(textNode, Math.min(i + 1, text.length));
                
                const rects = charRange.getClientRects();
                if (rects.length > 0) {
                    const rect = rects[0];
                    // Round Y position to group similar positions
                    const roundedTop = Math.round(rect.top / tolerance) * tolerance;
                    
                    if (!visualLinesByY.has(roundedTop)) {
                        visualLinesByY.set(roundedTop, {
                            top: rect.top,
                            height: rect.height,
                            rects: [rect]
                        });
                    } else {
                        const line = visualLinesByY.get(roundedTop);
                        line.rects.push(rect);
                        // Update height to maximum of all rects in this line
                        line.height = Math.max(line.height, rect.height);
                    }
                }
            }
        }
        
        // Find the line containing the target Y position
        let bestLine = null;
        let minDistance = Infinity;
        
        for (const [roundedY, line] of visualLinesByY.entries()) {
            const distance = Math.abs(line.top - targetY);
            if (distance < tolerance && distance < minDistance) {
                bestLine = line;
                minDistance = distance;
            }
        }
        
        return bestLine;
    }
};

export default focusMode;
