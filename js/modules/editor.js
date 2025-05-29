const editor = {
    init() {
        this.editorEl = document.getElementById('editor');
        if (!this.editorEl) return;

        this.devToggle = document.getElementById('dev-toggle');   // ← NEW
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

        /* ── Enter logging ───────────────────────────────────────────── */
        this.preEnterDOM = null;
        this.editorEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this.preEnterDOM = this.editorEl.innerHTML;   // snapshot before browser change
            }
        });
    },

    formatContent() {
        if (this.isSelecting) return;
        if (this.devToggle && !this.devToggle.checked) return;
        setTimeout(() => {
            const absCaretPos = this.getAbsoluteCaretPosition();

            /* log DOM + caret before render (only on Enter) */
            if (this.preEnterDOM !== null) {
                console.log(`DOM BEFORE render (Enter) [caret=${absCaretPos}]:`, this.preEnterDOM);
            }

            this.processNode(this.editorEl);

            const focusToggle = document.getElementById('focus-toggle');
            if (focusToggle && focusToggle.checked) {
                const text = this.editorEl.innerText;
                const focusRange = this.calculateFocusRange(text, absCaretPos);
                this.applyFocusFormatting(focusRange);
            }

            /* log DOM + caret after render (only on Enter) */
            if (this.preEnterDOM !== null) {
                console.log(`DOM AFTER  render (Enter)  [caret=${this.getAbsoluteCaretPosition()}]:`, this.editorEl.innerHTML);
                this.preEnterDOM = null;
            }

            this.restoreCaret(absCaretPos);
        }, 10);
    },
    /* util: all top-level blocks (div, h1-h6 …) */
    getBlocks() {
        return Array.from(this.editorEl.children);   // direct children only
    },

    /* NEW – compute absolute caret index */
    getAbsoluteCaretPosition() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return 0;

        // Ascend to the direct child of #editor that contains the caret
        let block = sel.anchorNode;
        while (block && block.parentNode !== this.editorEl) block = block.parentNode;

        const blocks = this.getBlocks();
        let offset = 0;
        for (const el of blocks) {
            if (el === block) {
                if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
                    offset += sel.anchorOffset;
                }
                break;
            }
            offset += el.innerText.length + 1;       // count newline per block
        }
        return offset;
    },

    // Restore caret given absolute index (works for div & heading blocks)
    restoreCaret(abs) {
        const blocks = this.getBlocks();
        let run = 0, target = null, innerOff = 0;

        for (const el of blocks) {
            const len = el.innerText.length;
            if (run + len + 1 > abs) {      // caret is inside this block
                innerOff = abs - run;
                target   = el;
                break;
            }
            run += len + 1;                 // newline per block
        }
        if (!target) return 0;

        /* locate first text node in target */
        function firstText(n) {
            if (n.nodeType === Node.TEXT_NODE) return n;
            for (const c of n.childNodes) {
                const t = firstText(c);
                if (t) return t;
            }
            return null;
        }
        const tn = firstText(target);
        if (!tn) return 0;

        const sel = window.getSelection();
        const rng = document.createRange();
        rng.setStart(tn, Math.min(innerOff, tn.textContent.length));
        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);
        return innerOff;
    },

    // Process blocks – header detection now replaces wrapper block (div) with <hX>
    processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (!node.textContent.trim() || /^h[1-6]$/i.test(node.parentNode.tagName)) return;

            const m = node.textContent.match(/^(#{1,6})\s+(.*)$/);
            if (m) {
                const lvl = m[1].length;
                const block = node.parentNode;
                while (block && block.parentNode !== this.editorEl) block = block.parentNode;
                if (!block) return;

                const h = document.createElement(`h${lvl}`);
                h.textContent = m[0];                      // keep "# "
                block.replaceWith(h);
                console.log(`DOM before header transform [caret=${this.getAbsoluteCaretPosition()}]:`, this.editorEl.innerHTML);
                return;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (const c of Array.from(node.childNodes)) this.processNode(c);
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
