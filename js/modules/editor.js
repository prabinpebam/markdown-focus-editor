import storage from './storage.js'; // Import storage module

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
        this.lastLogTrigger = null;                              // To store 'Enter', 'Backspace', or 'click'

        // Enter key or Backspace → snapshot before browser default action
        this.editorEl.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === 'Backspace') {
                this.preDomSnapshot = this.editorEl.innerHTML;
                this.lastLogTrigger = e.key; // Store the key that triggered the log
            }
        });

        // Mouse click → snapshot at mousedown (before caret moves)
        this.editorEl.addEventListener('mousedown', () => {
            this.preDomSnapshot = this.editorEl.innerHTML;
            this.lastLogTrigger = 'click'; // Store 'click' as the trigger
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
        this.editorEl.addEventListener('input', () => {
            if (!this.lastLogTrigger) { // Set if not already set by a more specific event like keydown
                this.lastLogTrigger = 'input';
            }
            this.formatContent();
        });
        this.editorEl.addEventListener('click', () => {
            // Click also triggers mousedown which sets lastLogTrigger.
            // If we want click to be distinct for formatContent:
            // this.lastLogTrigger = 'click_format'; // Or just let mousedown's 'click' be used.
            this.formatContent();
        });
        this.editorEl.addEventListener('keyup', (e) => { // Add 'e' parameter to access event details
            // Prevent formatting if only an arrow key was pressed (without Shift)
            // as 'isSelecting' would have been set to false by the other keyup listener.
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.shiftKey) {
                // If it was just an arrow key for caret movement,
                // the other keyup listener has already set isSelecting = false.
                return; 
            }

            // Keyup might follow a keydown that set lastLogTrigger.
            // If not (e.g. some special keys, or if keydown didn't set it),
            // we could set a generic 'keyup' trigger.
            // However, 'input' event is generally preferred for content changes.
            if (!this.lastLogTrigger && ! (event.key === 'Enter' || event.key === 'Backspace')) {
                 // Avoid overwriting specific triggers if keyup is for Enter/Backspace
                 // and preDomSnapshot was taken.
            }
            this.formatContent();
        });

        /* ── Enter logging ───────────────────────────────────────────── */
        // This preEnterDOM seems redundant if preDomSnapshot handles Enter,
        // but we'll leave it as per current structure unless asked to remove.
        this.preEnterDOM = null; 
        this.editorEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this.preEnterDOM = this.editorEl.innerHTML; // snapshot before browser change
                // If Enter also needs to be logged specifically via this, ensure lastLogTrigger is set
                // this.lastLogTrigger = e.key; // This would overwrite if Enter is handled by both listeners
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
        // console.log('[Log] formatContent triggered.'); // Reduced verbosity, can be re-enabled if needed
        setTimeout(() => {
            let absCaretPos = this.getAbsoluteCaretPosition();
            const triggerType = this.lastLogTrigger || 'unknown_event'; // More specific default

            if (this.preDomSnapshot) {
                const visiblePreSnapshot = this.preDomSnapshot.replace(/\u200B/g, '[ZWSP]');
                console.log(`[Log] DOM BEFORE (Trigger: ${triggerType}) [Caret @ ${absCaretPos}]:`, visiblePreSnapshot);
            } else {
                // Only log this if it's a trigger type that *should* have had a preDomSnapshot, or for general insight
                // if (triggerType === 'Enter' || triggerType === 'Backspace' || triggerType === 'click') {
                //    console.warn(`[Log] formatContent (Trigger: ${triggerType}) [Caret @ ${absCaretPos}] - Expected preDomSnapshot, but it was null.`);
                // } else {
                //    console.log(`[Log] formatContent (Trigger: ${triggerType}) [Caret @ ${absCaretPos}] - No preDomSnapshot (expected for this trigger type).`);
                // }
            }

            // Store selection details before potential DOM modification by processNode
            const sel = window.getSelection();
            const originalAnchorNode = sel.anchorNode;
            const originalAnchorOffset = sel.anchorOffset;

            const transformedByProcessNode = this.processNode(this.editorEl, originalAnchorNode, originalAnchorOffset);

            if (transformedByProcessNode) {
                // If processNode transformed and set the caret, update absCaretPos
                // as the DOM structure and caret position might have changed.
                absCaretPos = this.getAbsoluteCaretPosition();
            }

            const headingReverted = this.revertBrokenHeading();

            if (headingReverted) {
                // revertBrokenHeading also sets the caret, so update absCaretPos.
                const newCaretPosAfterRevert = this.getAbsoluteCaretPosition();
                // console.log(`[Log] Heading reverted. Caret moved from ${absCaretPos} to ${newCaretPosAfterRevert}.`); // Optional: if more detail needed
                absCaretPos = newCaretPosAfterRevert; // Update absCaretPos to the position set by revertBrokenHeading
            }

            const focusToggle = document.getElementById('focus-toggle');
            if (focusToggle && focusToggle.checked) {
                const text = this.editorEl.innerText;
                const focusRange = this.calculateFocusRange(text, absCaretPos);
                this.applyFocusFormatting(focusRange);
            }

            if (this.preDomSnapshot) {
                const visiblePostSnapshot = this.editorEl.innerHTML.replace(/\u200B/g, '[ZWSP]');
                console.log(`[Log] DOM AFTER (Trigger: ${triggerType}) [Caret will be restored to ${absCaretPos}, currently @ ${this.getAbsoluteCaretPosition()}]:`,
                            visiblePostSnapshot);
                this.preDomSnapshot = null;
            }
            this.lastLogTrigger = null; // Reset after use

            this.restoreCaret(absCaretPos);
            if (this.caretInput) {
                this.caretInput.value = Math.min(this.getAbsoluteCaretPosition(), 999);
            }
            
            // Save content to local storage immediately after all processing
            if (this.editorEl) {
                storage.saveSettings('lastContent', this.editorEl.innerHTML);
            }
            // console.log('[Log] formatContent finished.'); // Reduced verbosity
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
            // Use innerText for block length calculation to be consistent with getAbsoluteCaretPosition
            const len = el.innerText.length; 
            if (run + len + 1 > abs) {              // caret belongs here
                inner  = abs - run;
                target = el;
                break;
            }
            run += len + 1;
        }
        
        if (!target) {
            if (blocks.length > 0) {
                target = blocks[blocks.length - 1];
                inner = target.innerText.length; 
            } else { 
                this.editorEl.focus();
                return 0; 
            }
        }

        // 'inner' is now sel.anchorOffset within the content text node of the 'target' block.
        // For example, if target is <h2><span class="marker">##</span>\u200BText</h2>,
        // and caret was at \u200BTe|xt, then inner would be 3.

        const findText = n => { 
            if (n.nodeType === Node.TEXT_NODE &&
                (!n.parentNode || !n.parentNode.classList.contains('heading-marker'))) return n;
            if (n.childNodes) { 
                for (const c of n.childNodes) {
                    const t = findText(c);
                    if (t) return t;
                }
            }
            return null;
        };

        const tn = findText(target); 
        if (!tn) {
            if (target) target.focus();
            return 0;
        }

        // 'inner' is the desired offset within the text node 'tn'.
        // No complex mapping with markerLen or caretLocal is needed here if 'inner'
        // directly comes from sel.anchorOffset of the content text node.
        let caretPos = inner;
        
        // Ensure caretPos is within the bounds of the text node's data.
        caretPos = Math.min(caretPos, tn.data.length);
        caretPos = Math.max(0, caretPos); 

        const sel = window.getSelection();
        const rng = document.createRange();
        try {
            rng.setStart(tn, caretPos);
            rng.collapse(true);
            sel.removeAllRanges();
            sel.addRange(rng);
        } catch (e) {
            console.error("Error setting caret in restoreCaret:", e, {tnData: tn.data, caretPos, inner, abs});
            if(target) target.focus(); // Fallback
        }
        
        // Calculate the effective absolute position for return.
        // This part is for informational return value, not critical for the fix itself.
        let effectiveAbsPos = run; // Length of preceding blocks
        const marker = target.querySelector('.heading-marker');
        const markerLen = marker ? marker.innerText.length : 0;
        // Add marker length (from innerText)
        effectiveAbsPos += markerLen;
        // Add caret position within the visible part of the content text node
        const startsWithZWSP = tn.data.startsWith('\u200B');
        if (startsWithZWSP) {
            effectiveAbsPos += Math.max(0, caretPos - 1);
        } else {
            effectiveAbsPos += caretPos;
        }
        return effectiveAbsPos;
    },

    /* header detection – replaces paragraph <div> with semantic <hX>  */
    processNode(node, originalAnchorNode, originalAnchorOffset) { // Pass original selection
        if (node.nodeType === Node.TEXT_NODE) {
            const textContentForLog = node.textContent
                .replace(/\u200B/g, '[ZWSP]')
                .replace(/\u00A0/g, '[NBSP]')
                .replace(/\u2002/g, '[ENSP]')
                .replace(/\u2003/g, '[EMSP]')
                .replace(/\u2009/g, '[THSP]');
            if (
                !node.textContent.trim() ||
                /^h[1-6]$/i.test(node.parentNode.tagName) ||
                node.parentNode.classList.contains('heading-marker')
            ) {
                // Optional: Log why it was skipped if node.textContent starts with #
                // if (node.textContent.startsWith('#')) {
                //     console.log(`[Log] processNode: Skipped processing for potential heading "${textContentForLog}" due to guard conditions.`);
                // }
                return;
            }

            // Match "#" followed by: regular space, ZWSP, NBSP, ENSP, EMSP, or THSP
            const m = node.textContent.match(/^(#{1,6})(?: |\u200B|\u00A0|\u2002|\u2003|\u2009)(.*)$/);
            if (m) {
                console.log(`[Log] processNode: Matched heading syntax in textContent: "${textContentForLog}"`);
                /* locate the top-level block (<div>) that holds the text node */
                let block = node.parentNode;
                while (block && block.parentNode !== this.editorEl) block = block.parentNode;
                if (!block || block === this.editorEl) return false; // Ensure it's a child block, not the editor itself

                const level   = m[1].length;
                const rawBody = m[2];              // may be empty
                const hBodyContent = '\u200B' + rawBody; // Prepend ZWSP

                const h       = document.createElement(`h${level}`);
                const marker  = document.createElement('span');
                marker.className = 'heading-marker';
                marker.textContent = m[1];             // only the hashes
                marker.contentEditable = false; // Make the marker non-editable

                const hTextNode = document.createTextNode(hBodyContent);
                h.append(marker, hTextNode);
                
                const selectionWasInBlock = block.contains(originalAnchorNode);

                block.replaceWith(h);
                console.log(`[Log] processNode: Replaced <div> with <h${level}>.`);

                // Set caret position carefully in the new heading
                const currentSel = window.getSelection();
                if (currentSel && selectionWasInBlock && originalAnchorNode === node) {
                    // Caret was in the specific text node that got transformed
                    const matchedMarkerAndSpaceLength = m[1].length + 1; // e.g., "## " is length 3
                    
                    // Calculate offset relative to the start of the raw body content
                    let caretOffsetInRawBody = originalAnchorOffset - matchedMarkerAndSpaceLength;
                    caretOffsetInRawBody = Math.max(0, caretOffsetInRawBody); // Ensure non-negative

                    // New offset in hTextNode is 1 (for ZWSP) + offset in rawBody
                    let newOffsetInHTextNode = 1 + caretOffsetInRawBody;
                    
                    // Ensure newOffset is within the bounds of the new text node's length
                    newOffsetInHTextNode = Math.min(newOffsetInHTextNode, hTextNode.data.length);
                    // Ensure it's at least 0 (should be at least 1 due to ZWSP if hTextNode.data.length > 0)
                    newOffsetInHTextNode = Math.max(0, newOffsetInHTextNode); 


                    try {
                        const rng = document.createRange();
                        rng.setStart(hTextNode, newOffsetInHTextNode);
                        rng.collapse(true);
                        currentSel.removeAllRanges();
                        currentSel.addRange(rng);
                        // console.log(`[Log] processNode: Caret set in new H node at offset ${newOffsetInHTextNode} (in "${hTextNode.data.replace(/\u200B/g, '[ZWSP]')}")`);
                    } catch (e) {
                        console.error("[Log] processNode: Error setting caret in new H node", e, { textNodeData: hTextNode.data, offset: newOffsetInHTextNode });
                        h.focus(); // Fallback focus
                    }
                } else if (currentSel && selectionWasInBlock) {
                    // Caret was in the block, but not the specific text node, or originalAnchorNode is no longer relevant.
                    // Default to placing caret at the beginning of the user-editable text in the new heading (after ZWSP).
                    try {
                        const rng = document.createRange();
                        // Ensure hTextNode has content, place after ZWSP (offset 1) or at 0 if empty (should not happen due to ZWSP)
                        const offset = hTextNode.data.length > 0 ? 1 : 0;
                        rng.setStart(hTextNode, Math.min(offset, hTextNode.data.length));
                        rng.collapse(true);
                        currentSel.removeAllRanges();
                        currentSel.addRange(rng);
                        // console.log(`[Log] processNode: Caret set to default in new H node (offset ${Math.min(offset, hTextNode.data.length)})`);
                    } catch (e) {
                        console.error("[Log] processNode: Error setting default caret in new H node", e);
                        h.focus(); // Fallback focus
                    }
                }
                // If selection was not in the block, the browser should attempt to preserve it relative to other content.
                
                return true; // Indicate transformation occurred
            } else if (node.textContent.match(/^\s*#{1,6}/)) { // Starts with optional spaces then #
                console.log(`[Log] processNode: Potential heading prefix found but NO MATCH for full heading syntax: "${textContentForLog}"`);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (const child of Array.from(node.childNodes)) {
                // Pass original selection info down for recursive calls
                if (this.processNode(child, originalAnchorNode, originalAnchorOffset)) return true;
            }
        }
        return false; // No transformation in this node or its children
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
    },

    /* revert <hX> back to <div> if ZWSP was deleted with Backspace */
    revertBrokenHeading() {
        let reverted = false;
        for (const h of this.editorEl.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
            const marker = h.querySelector('.heading-marker');
            if (!marker) continue;

            let n = marker.nextSibling;
            while (n && n.nodeType !== Node.TEXT_NODE && n.tagName !== 'BR') {
                n = n.nextSibling;
            }

            const isTextNode = n && n.nodeType === Node.TEXT_NODE;
            const currentTextContentForLog = isTextNode ? n.data.replace(/\u200B/g, '[ZWSP]') : (n ? n.tagName : 'null');
            const broken = !n ||
                           (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BR') ||
                           (isTextNode && n.data.charCodeAt(0) !== 0x200B);

            if (broken) {
                console.log(`[Log] revertBrokenHeading: Detected broken heading <${h.tagName}>. Next sibling content: "${currentTextContentForLog}". Reverting to <div>.`);
                // If original text node existed, get its data (strip leading ZWSP if it was there but somehow broken logic missed it)
                const body = isTextNode ? n.data.replace(/^[\u200B]/, '') : '';
                
                const div = document.createElement('div');
                // Content is just the hashes plus whatever body text remained. NO extra space added here.
                // E.g., "#" or "#remainingText"
                div.textContent = marker.textContent + body; 
                h.replaceWith(div);
                reverted = true;
                const divContentForLog = div.textContent.replace(/\u200B/g, '[ZWSP]');
                console.log(`[Log] revertBrokenHeading: Reverted to <div> with content: "${divContentForLog}". Caret set after marker.`);

                const tn = div.firstChild; // Should be the text node we just created
                if (tn && tn.nodeType === Node.TEXT_NODE) {
                    const sel = window.getSelection();
                    const rng = document.createRange();
                    // Set caret position to be immediately after the hash marks.
                    // If user types a space next, it will become e.g. "# " which then triggers heading creation.
                    // If user types a char, it will be e.g. "#char", not a heading.
                    let caretPosInDiv = marker.textContent.length;
                    caretPosInDiv = Math.min(caretPosInDiv, tn.data.length); // Ensure within bounds

                    rng.setStart(tn, caretPosInDiv); 
                    rng.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(rng);
                }
            }
        }
        return reverted;
    },
};

export default editor;
