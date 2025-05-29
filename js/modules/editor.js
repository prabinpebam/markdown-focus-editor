const editor = {
    init() {
        this.editorEl = document.getElementById('editor');
        if (!this.editorEl) return;
        this.editorEl.focus();                     // focus on page-load

        this.caretInput = document.getElementById('caret-pos'); // ← NEW
        this.devToggle = document.getElementById('dev-toggle');   // ← NEW
        this.isSelecting = false;                          // ← NEW FLAG

        /* ── DOM-snapshot triggers ─────────────────────────────────────── */
        this.preDomSnapshot = null;                              // single snapshot store

        // Enter key → snapshot before browser inserts newline
        this.editorEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this.preDomSnapshot = this.editorEl.innerHTML;
            }
        });

        // Mouse click → snapshot at mousedown (before caret moves)
        this.editorEl.addEventListener('mousedown', () => {
            this.preDomSnapshot = this.editorEl.innerHTML;
        });

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

        /* ── caret-field change → move caret ─────────────────────────── */
        if (this.caretInput){
            this.caretInput.addEventListener('change', () => {
                const max   = this.editorEl.innerText.length;
                let   pos   = parseInt(this.caretInput.value,10);
                if (isNaN(pos) || pos < 0) pos = 0;
                if (pos > max) pos = max;
                this.caretInput.value = pos;
                this.restoreCaret(pos);            // jump caret
            });
        }
    },

    formatContent() {
        if (this.isSelecting) return;
        if (this.devToggle && !this.devToggle.checked) return;
        setTimeout(() => {
            const absCaretPos = this.getAbsoluteCaretPosition();

            if (this.preDomSnapshot) {
                console.log(`DOM BEFORE render [caret=${absCaretPos}]:`, this.preDomSnapshot);
            }

            this.processNode(this.editorEl);           // ← no more cleanZeroWidthSpace()

            const focusToggle = document.getElementById('focus-toggle');
            if (focusToggle && focusToggle.checked) {
                const text = this.editorEl.innerText;
                const focusRange = this.calculateFocusRange(text, absCaretPos);
                this.applyFocusFormatting(focusRange);
            }

            if (this.preDomSnapshot) {
                console.log(`DOM AFTER  render  [caret=${this.getAbsoluteCaretPosition()}]:`,
                            this.editorEl.innerHTML);
                this.preDomSnapshot = null;
            }

            this.restoreCaret(absCaretPos);
            if (this.caretInput) {
                this.caretInput.value = Math.min(this.getAbsoluteCaretPosition(), 999);
            }
        }, 10);
    },
    /* util: all top-level blocks (div, h1-h6 …) */
    getBlocks() {
        return Array.from(this.editorEl.children); // direct children only
    },

    /* absolute caret index – just rely on innerText (includes “# ”) */
    getAbsoluteCaretPosition() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return 0;

        let block = sel.anchorNode;
        while (block && block.parentNode !== this.editorEl) block = block.parentNode;

        let offset = 0;
        for (const el of this.getBlocks()) {
            if (el === block) {
                if (sel.anchorNode.nodeType === Node.TEXT_NODE) offset += sel.anchorOffset;
                break;
            }
            offset += el.innerText.length + 1; // newline after each block
        }
        return offset;
    },

    /* restore caret – lands after the marker span */
    restoreCaret(abs) {
        const blocks = this.getBlocks();
        let run = 0, target = null, inner = 0;

        for (const el of blocks) {
            const len = el.innerText.length;
            if (run + len + 1 > abs) {              // caret belongs here
                inner  = abs - run;
                target = el;
                break;
            }
            run += len + 1;
        }
        if (!target) return 0;

        const marker     = target.querySelector('.heading-marker');
        const markerLen  = marker ? marker.innerText.length : 0;
        const caretLocal = Math.max(inner - markerLen, 0);   // offset in text node

        const findText = n => {
            if (n.nodeType === Node.TEXT_NODE &&
                !n.parentNode.classList.contains('heading-marker')) return n;
            for (const c of n.childNodes) {
                const t = findText(c);
                if (t) return t;
            }
            return null;
        };
        const tn = findText(target);
        if (!tn) return 0;

        // Skip the leading ZWSP (\u200B) if present
        const startsWithZWSP = tn.data.charCodeAt(0) === 0x200B;
        const caretPos = startsWithZWSP ? Math.min(caretLocal + 1, tn.data.length)
                                        : Math.min(caretLocal,     tn.data.length);

        const sel = window.getSelection();
        const rng = document.createRange();
        rng.setStart(tn, caretPos);
        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);
        return caretPos + markerLen;
    },

    /* header detection – replaces paragraph <div> with semantic <hX>  */
    processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // skip blanks, text inside existing headings, or inside the marker
            if (
                !node.textContent.trim() ||
                /^h[1-6]$/i.test(node.parentNode.tagName) ||
                node.parentNode.classList.contains('heading-marker')
            ) return;

            const m = node.textContent.match(/^(#{1,6})\s?(.*)$/); // hashes + optional rest
            if (m) {
                /* locate the top-level block (<div>) that holds the text node */
                let block = node.parentNode;
                while (block && block.parentNode !== this.editorEl) block = block.parentNode;
                if (!block) return;

                const level   = m[1].length;          // 1–6
                const rawBody = m[2] || '';           // may be empty or already have text
                const body    = '\u200B' + rawBody;   // always start with ZWSP

                const h = document.createElement(`h${level}`);

                const marker = document.createElement('span');
                marker.className   = 'heading-marker';
                marker.textContent = m[1];            // hash marks only, no space

                h.append(marker, body);
                block.replaceWith(h);
                return;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (const child of Array.from(node.childNodes)) this.processNode(child);
        }
    },
    // Focus-mode formatting – NON-destructive
    applyFocusFormatting(focusRange) {
        const blocks = this.getBlocks();
        let run = 0;
        for (const el of blocks) {
            const len = el.innerText.length;
            const inRange =
                run + len >= focusRange.start &&   // overlaps focus range
                run <= focusRange.end;
            el.style.opacity = inRange ? '0.9' : '0.3';
            run += len + 1;                        // +1 for virtual newline
        }
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
