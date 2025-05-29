const editor = {
    init() {
        this.editorEl = document.getElementById('editor');
        if (!this.editorEl) return;

        this.isSelecting = false;                          // ← NEW FLAG

        // --- selection tracking (mouse) ---
        this.editorEl.addEventListener('mousedown', () =>  this.isSelecting = true);
        document.addEventListener('mouseup',  () => {      // outside releases, too
            if (window.getSelection().isCollapsed) this.isSelecting = false;
        });

        // --- selection tracking (keyboard: Shift + arrows etc.) ---
        this.editorEl.addEventListener('keydown',  e => {
            if (e.shiftKey) this.isSelecting = true;
        });
        this.editorEl.addEventListener('keyup',    () => {
            if (window.getSelection().isCollapsed) this.isSelecting = false;
        });

        // editor change events
        this.editorEl.addEventListener('input',  this.formatContent.bind(this));
        this.editorEl.addEventListener('click',  this.formatContent.bind(this));
        this.editorEl.addEventListener('keyup',  this.formatContent.bind(this));
    },

    formatContent() {
        if (this.isSelecting) return;             // ← skip while user is selecting
        setTimeout(() => {
            // Step 1: Capture the absolute caret position from the current DOM.
            const absCaretPos = this.getAbsoluteCaretPosition();
            
            // Step 2: Instead of replacing innerHTML wholesale, process in-place.
            // This preserves the DOM structure created by the browser (e.g. div+br from Enter).
            this.processNode(this.editorEl);
            
            // (Optional) If focus mode is enabled, you could run additional formatting.
            const focusToggle = document.getElementById('focus-toggle');
            if (focusToggle && focusToggle.checked) {
                const text = this.editorEl.innerText;
                const focusRange = this.calculateFocusRange(text, absCaretPos);
                // In a robust solution, update only text nodes covering focusRange.
                this.applyFocusFormatting(focusRange);
            }
            
            // Step 3: Restore the caret position based on the new DOM.
            const newAbsPos = this.getAbsoluteCaretPosition();
            this.restoreCaret(absCaretPos);
        }, 10);
    },
    // Helper function: Compute absolute caret position from the current DOM.
    getAbsoluteCaretPosition() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) {
            return 0;
        }
        // Find the paragraph (div) element that contains the caret.
        let para = sel.anchorNode;
        while (para && para.parentNode !== this.editorEl) {
            para = para.parentNode;
        }
        const paragraphs = Array.from(this.editorEl.querySelectorAll('div'));
        let absOffset = 0;
        for (let i = 0; i < paragraphs.length; i++) {
            if (paragraphs[i] === para) {
                // For the active paragraph, add the caret offset within its text.
                if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
                    absOffset += sel.anchorOffset;
                }
                break;
            } else {
                // For previous paragraphs, add their text length plus one for the newline.
                absOffset += paragraphs[i].innerText.length + 1;
            }
        }
        return absOffset;
    },
    // Process the DOM in-place to add formatting spans without replacing the whole innerHTML.
    processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Example: only process text nodes that start with header markdown.
            // Do not process if the text node is empty (e.g. the one injected by <br>).
            const text = node.textContent;
            if (text.trim() === "") return;
            let newNode = null;
            // Check for header patterns (only simple headers as an example).
            if (/^#{1}\s/.test(text)) {
                newNode = document.createElement("span");
                newNode.classList.add("header", "header-1");
                newNode.textContent = text.replace(/^#\s/, "");
            } else if (/^#{2}\s/.test(text)) {
                newNode = document.createElement("span");
                newNode.classList.add("header", "header-2");
                newNode.textContent = text.replace(/^##\s/, "");
            } else if (/^#{3}\s/.test(text)) {
                newNode = document.createElement("span");
                newNode.classList.add("header", "header-3");
                newNode.textContent = text.replace(/^###\s/, "");
            }
            // ...add additional patterns as needed...
            if (newNode) {
                node.parentNode.replaceChild(newNode, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Do not process browser-inserted elements (like DIV or BR) if they were not created for formatting.
            // Process child nodes recursively.
            for (let child of Array.from(node.childNodes)) {
                this.processNode(child);
            }
        }
    },
    // Focus formatting function (simple example).
    applyFocusFormatting(focusRange) {
        const fullText = this.editorEl.innerText;
        const before = fullText.substring(0, focusRange.start);
        const focusText = fullText.substring(focusRange.start, focusRange.end);
        const after = fullText.substring(focusRange.end);
        // For a simple solution, update innerHTML with spans only for focus sections;
        // In a robust implementation, update only the needed nodes.
        this.editorEl.innerHTML =
            `<span style="opacity:0.3;">${before}</span>` +
            `<span style="opacity:0.9;">${focusText}</span>` +
            `<span style="opacity:0.3;">${after}</span>`;
    },
    // UPDATED: Restore caret position based on the absolute index,
    // treating each paragraph's text plus a one‑character separator (newline) in between.
    restoreCaret(originalOffset) {
        const paragraphs = Array.from(this.editorEl.querySelectorAll('div'));
        let runningLength = 0;
        let targetNode = null, targetOffset = 0;
        for (let p of paragraphs) {
            const pText = p.innerText;
            const pLen = pText.length;
            // If adding this paragraph (plus a newline) would surpass the target,
            // then the caret is somewhere in this paragraph.
            if (runningLength + pLen + 1 > originalOffset) {
                targetOffset = originalOffset - runningLength;
                // Find a text node inside p.
                function getFirstTextNode(node) {
                    if (node.nodeType === Node.TEXT_NODE) return node;
                    for (let child of Array.from(node.childNodes)) {
                        const found = getFirstTextNode(child);
                        if (found) return found;
                    }
                    return null;
                }
                targetNode = getFirstTextNode(p);
                break;
            } else {
                runningLength += pLen + 1; // +1 for the newline that separates paragraphs.
            }
        }
        const sel = window.getSelection();
        if (targetNode) {
            const newRange = document.createRange();
            newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent.length));
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            return targetOffset;
        }
        return 0;
    },
    calculateFocusRange(text, caretPos) {
        const terminatorRegex = /[.!?…]/;
        let start = 0, end = text.length;
        let count = 0;
        for (let i = caretPos - 1; i >= 0; i--) {
            if (terminatorRegex.test(text.charAt(i))) {
                count++;
                if (count === 2) {
                    start = i + 1;
                    break;
                }
            }
        }
        count = 0;
        for (let i = caretPos; i < text.length; i++) {
            if (terminatorRegex.test(text.charAt(i))) {
                count++;
                if (count === 2) {
                    end = i + 1;
                    break;
                }
            }
        }
        return { start, end };
    }
};

export default editor;
