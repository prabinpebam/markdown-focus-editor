import storage from './storage.js'; // Import storage module
import listManager from './listManager.js'; // Import listManager

const editor = {
    init() {
        this.editorEl = document.getElementById('editor');
        if (!this.editorEl) return;
        
        this.editorEl.focus();

        this.caretInput = document.getElementById('caret-pos');
        this.devToggle = document.getElementById('dev-toggle');
        this.isSelecting = false;

        this.preDomSnapshot = null;
        this.lastLogTrigger = null;

        // Bind 'this' for methods called directly or indirectly by event listeners
        this.boundHandleInputFormatting = this.handleInputFormatting.bind(this);
        this.boundHandlePotentialPostActionFormatting = this.handlePotentialPostActionFormatting.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleEnterKeydown = this.handleEnterKeydown.bind(this);


        this.editorEl.addEventListener('keydown', this.boundHandleKeyDown);
        this.editorEl.addEventListener('mousedown', this.boundHandleMouseDown);
        document.addEventListener('mouseup',  this.boundHandleMouseUp); // document, not editorEl
        this.editorEl.addEventListener('keyup', this.boundHandleKeyUp);
        
        this.editorEl.addEventListener('input', () => {
            // Arrow function here maintains 'this' from init()
            if (this.isSelecting) return; 
            if (!this.lastLogTrigger) {
                this.lastLogTrigger = 'input';
            }
            this.boundHandleInputFormatting(); // Call the bound version
        });

        this.editorEl.addEventListener('click', this.boundHandleClick);
        
        this.editorEl.addEventListener('keydown', this.boundHandleEnterKeydown);

        if (this.caretInput){
            this.caretInput.addEventListener('change', () => { // Arrow function for simple lexical 'this'
                const max   = this.editorEl.innerText.length;
                let   pos   = parseInt(this.caretInput.value,10);
                if (isNaN(pos) || pos < 0) pos = 0;
                if (pos > max) pos = max;
                this.caretInput.value = pos;
                this.restoreCaret(pos);
            });
        }
        listManager.init(this);
    },

    // Define the event handling logic as separate methods
    handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === 'Backspace') {
            this.preDomSnapshot = this.editorEl.innerHTML;
            this.lastLogTrigger = e.key;
        }

        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
            const listItem = sel.anchorNode.closest ? sel.anchorNode.closest('li') : null;
            if (listItem) { 
                if (e.key === 'Tab') {
                    e.preventDefault(); 
                    if (e.shiftKey) {
                        listManager.handleShiftTab(listItem);
                    } else {
                        listManager.handleTab(listItem);
                    }
                    this.updateCaretDisplayAndSave(); 
                    return; 
                }
            }
        }
        // For shift, ctrl+a, arrows - part of the original combined keydown
        if (e.shiftKey) {
            this.isSelecting = true;
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            this.isSelecting = true;
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            this.isSelecting = true; 
        }
    },

    handleMouseDown() {
        this.preDomSnapshot = this.editorEl.innerHTML;
        this.lastLogTrigger = 'click';
        this.isSelecting = true; 
    },

    handleMouseUp() {
        if (window.getSelection().isCollapsed) {
            this.isSelecting = false;
        }
    },

    handleKeyUp(e) {
        if (window.getSelection().isCollapsed) {
            this.isSelecting = false;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.shiftKey) {
            this.updateCaretDisplayAndSave(); 
            return;
        }
        this.boundHandlePotentialPostActionFormatting(); // Call bound version
    },
    
    handleClick() {
        // This logic was in the original click listener
        if (this.isSelecting && !window.getSelection().isCollapsed) {
            return;
        }
        this.isSelecting = false; 
        this.boundHandlePotentialPostActionFormatting(); // Call bound version
    },

    handleEnterKeydown(e) {
        // This was the second keydown listener specifically for Enter
        if (e.key === 'Enter') {
            this.preEnterDOM = this.editorEl.innerHTML; 
        }
    },


    handleInputFormatting() { // 'this' is now guaranteed to be the editor object
        if (this.isSelecting) return; 
        if (this.devToggle && !this.devToggle.checked) {
            this.updateCaretDisplayAndSave(); 
            return;
        }

        setTimeout(() => { // Arrow function inherits 'this' from handleInputFormatting
            let absCaretPos = this.getAbsoluteCaretPosition();
            const sel = window.getSelection();
            let blockToProcess = null;

            if (sel && sel.anchorNode) {
                blockToProcess = sel.anchorNode;
                while (blockToProcess && blockToProcess.parentNode !== this.editorEl) {
                    blockToProcess = blockToProcess.parentNode;
                }
                if (blockToProcess === this.editorEl) blockToProcess = sel.anchorNode.childNodes[sel.anchorOffset] || sel.anchorNode.lastChild;
            }
            
            let transformationOccurred = false;
            if (blockToProcess && blockToProcess.parentNode === this.editorEl) { 
                 // Line 151 (approx)
                 transformationOccurred = this.attemptBlockTransformations(blockToProcess, sel.anchorNode, sel.anchorOffset);
            }

            if (transformationOccurred) {
                absCaretPos = this.getAbsoluteCaretPosition(); 
            }
            
            this.applyFocusAndSave(absCaretPos, transformationOccurred); 
            this.lastLogTrigger = null;
        }, 0); 
    },
    
    handlePotentialPostActionFormatting() { // 'this' is now guaranteed to be the editor object
        if (this.isSelecting) return;
         if (this.devToggle && !this.devToggle.checked) {
            this.updateCaretDisplayAndSave();
            return;
        }

        setTimeout(() => { // Arrow function inherits 'this' from handlePotentialPostActionFormatting
            let absCaretPos = this.getAbsoluteCaretPosition();
            let transformationOccurred = false;

            const headingReverted = this.revertBrokenHeading();
            if (headingReverted) {
                absCaretPos = this.getAbsoluteCaretPosition();
                transformationOccurred = true;
            }
            
            this.applyFocusAndSave(absCaretPos, transformationOccurred); 

            this.preDomSnapshot = null;
            this.lastLogTrigger = null;
        }, 0); 
    },

    // Helper for common tasks after transformations or actions
    applyFocusAndSave(absCaretPos, transformationOccurred) {
        const focusToggle = document.getElementById('focus-toggle');
        if (focusToggle && focusToggle.checked) {
            const text = this.editorEl.innerText;
            const focusRange = this.calculateFocusRange(text, absCaretPos);
            this.applyFocusFormatting(focusRange);
        }
        
        if (transformationOccurred) {
            this.restoreCaret(absCaretPos);
        }
        // Always update display and save, even if caret wasn't explicitly restored by us
        this.updateCaretDisplayAndSave();
    },
    
    updateCaretDisplayAndSave() {
        if (this.caretInput) {
            this.caretInput.value = Math.min(this.getAbsoluteCaretPosition(), 999);
        }
        if (this.editorEl) {
            storage.saveSettings('lastContent', this.editorEl.innerHTML);
        }
    },

    /**
     * Attempts to transform the current block if it matches heading or list syntax.
     * @param {Node} blockNode - The block element (e.g., DIV) to check.
     * @param {Node} originalAnchorNode - The original anchor node of the selection.
     * @param {Number} originalAnchorOffset - The original anchor offset of the selection.
     * @returns {boolean} True if a transformation occurred.
     */
    attemptBlockTransformations(blockNode, originalAnchorNode, originalAnchorOffset) {
        if (!blockNode || blockNode.nodeType !== Node.ELEMENT_NODE) return false;

        // Only attempt to transform DIVs for now
        if (blockNode.tagName !== 'DIV') return false;

        const textNode = blockNode.firstChild; // Assuming simple structure: DIV -> TextNode
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return false;
        
        const textContent = textNode.textContent;

        // Try Heading Transformation
        const headingMatch = textContent.match(/^(#{1,6})(?: |\u200B|\u00A0|\u2002|\u2003|\u2009)(.*)$/);
        if (headingMatch) {
            return this.transformToHeading(blockNode, headingMatch, textNode, originalAnchorOffset);
        }

        // Try List Transformation
        const ulMatch = textContent.match(listManager.ulMarkerRegex);
        if (ulMatch) {
            return listManager.convertBlockToList(blockNode, ulMatch, 'ul');
        }

        const olMatch = textContent.match(listManager.olMarkerRegex);
        if (olMatch) {
            return listManager.convertBlockToList(blockNode, olMatch, 'ol');
        }
        
        return false; // No transformation
    },

    /**
     * Transforms a DIV block into a heading element.
     * @param {Node} divBlock - The DIV element to transform.
     * @param {RegExpMatchArray} match - The regex match for heading syntax.
     * @param {Node} originalTextNode - The text node within the div that contained the match.
     * @param {Number} originalAnchorOffset - The caret offset within the originalTextNode.
     * @returns {boolean} True if transformation was successful.
     */
    transformToHeading(divBlock, match, originalTextNode, originalAnchorOffset) {
        const level = match[1].length;
        const rawBody = match[2];
        const hBodyContent = '\u200B' + rawBody; // Prepend ZWSP

        const h = document.createElement(`h${level}`);
        const markerSpan = document.createElement('span');
        markerSpan.className = 'heading-marker';
        markerSpan.textContent = match[1]; // Hashes
        markerSpan.contentEditable = false;

        const hTextNode = document.createTextNode(hBodyContent);
        h.append(markerSpan, hTextNode);

        divBlock.replaceWith(h);
        console.log(`[DOM Render] Transformed DIV to H${level}.`);

        // Set caret position
        const sel = window.getSelection();
        if (sel) {
            // Calculate offset relative to the start of the raw body content
            const matchedMarkerAndSpaceLength = match[1].length + 1; // e.g., "## " is length 3
            let caretOffsetInRawBody = originalAnchorOffset - matchedMarkerAndSpaceLength;
            caretOffsetInRawBody = Math.max(0, caretOffsetInRawBody);

            let newOffsetInHTextNode = 1 + caretOffsetInRawBody; // 1 for ZWSP
            newOffsetInHTextNode = Math.min(newOffsetInHTextNode, hTextNode.data.length);
            newOffsetInHTextNode = Math.max(0, newOffsetInHTextNode);

            try {
                const rng = document.createRange();
                rng.setStart(hTextNode, newOffsetInHTextNode);
                rng.collapse(true);
                sel.removeAllRanges();
                sel.addRange(rng);
            } catch (e) {
                h.focus(); // Fallback
            }
        }
        return true;
    },
    
    getBlocks() {
        return Array.from(this.editorEl.children); 
    },

    getAbsoluteCaretPosition() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return 0;

        let block = sel.anchorNode;
        while (block && block.parentNode !== this.editorEl) block = block.parentNode;

        let offset = 0;
        for (const el of this.getBlocks()) {
            if (el === block) {
                if (sel.anchorNode === this.editorEl) {
                    let childOffset = 0;
                    for (let i = 0; i < sel.anchorOffset; i++) {
                        if (this.editorEl.childNodes[i].innerText) {
                             childOffset += this.editorEl.childNodes[i].innerText.length +1;
                        } else if (this.editorEl.childNodes[i].textContent){ 
                             childOffset += this.editorEl.childNodes[i].textContent.length +1;
                        } else {
                             childOffset +=1; 
                        }
                    }
                    offset += childOffset;
                } else if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
                     offset += sel.anchorOffset;
                } else if (sel.anchorNode.nodeType === Node.ELEMENT_NODE) {
                         let tempOffset = 0;
                        for(let i=0; i < sel.anchorOffset; i++){
                            if(sel.anchorNode.childNodes[i] && sel.anchorNode.childNodes[i].innerText){
                                tempOffset += sel.anchorNode.childNodes[i].innerText.length;
                            } else if (sel.anchorNode.childNodes[i] && sel.anchorNode.childNodes[i].textContent){
                                tempOffset += sel.anchorNode.childNodes[i].textContent.length;
                            } else {
                                tempOffset +=1; 
                            }
                        }
                        offset += tempOffset;
                }
                break;
            }
            offset += el.innerText.length + 1; 
        }
        return offset;
    },

    restoreCaret(abs) {
        const blocks = this.getBlocks();
        let run = 0, target = null, inner = 0;

        for (const el of blocks) {
            const len = el.innerText.length; 
            if (run + len + 1 > abs) {
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
                if (this.editorEl.children.length === 0) {
                    const div = document.createElement('div');
                    const br = document.createElement('br'); 
                    div.appendChild(br);
                    this.editorEl.appendChild(div);
                    target = div;
                    inner = 0;
                } else {
                     return 0; 
                }
            }
        }

        const findText = n => { 
            if (n.nodeType === Node.TEXT_NODE &&
                (!n.parentNode || !n.parentNode.classList.contains('heading-marker'))) return n;
            if (n.childNodes) { 
                for (const c of n.childNodes) {
                    if (c.nodeType === Node.TEXT_NODE && 
                        (!c.parentNode || !c.parentNode.classList.contains('heading-marker'))) return c;
                }
                for (const c of n.childNodes) {
                     if (c.nodeType === Node.ELEMENT_NODE && c.classList.contains('heading-marker')) continue;
                    const t = findText(c); 
                    if (t) return t;
                }
            }
            return null;
        };
        
        let tn = findText(target); 

        if (!tn) {
            if (target.tagName === 'DIV' || target.tagName === 'LI' || /^H[1-6]$/.test(target.tagName)) {
                let contentHost = target;
                if (/^H[1-6]$/.test(target.tagName) && target.querySelector('.heading-marker')) {
                    contentHost = target.lastChild.nodeType === Node.TEXT_NODE ? target.lastChild : target;
                }

                if (!contentHost.firstChild || contentHost.firstChild.nodeType !== Node.TEXT_NODE || contentHost.firstChild.classList?.contains('heading-marker')) {
                    tn = document.createTextNode('\u200B');
                    if (contentHost.lastChild && contentHost.lastChild.nodeType === Node.ELEMENT_NODE && contentHost.lastChild.classList.contains('heading-marker')) {
                         target.appendChild(tn); 
                    } else if (contentHost.firstChild && contentHost.firstChild.nodeType === Node.ELEMENT_NODE && contentHost.firstChild.classList.contains('heading-marker')) {
                         contentHost.insertBefore(tn, contentHost.firstChild.nextSibling);
                    }
                    else {
                         contentHost.insertBefore(tn, contentHost.firstChild); 
                    }
                    inner = Math.min(inner, tn.data.length); 
                } else if (contentHost.firstChild.nodeType === Node.TEXT_NODE) {
                    tn = contentHost.firstChild; 
                }
            }
            if (!tn) { 
                 if (target) target.focus();
                 return 0; 
            }
        }


        let caretPos = inner;
        
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
            if(target) target.focus(); 
        }
        
        let effectiveAbsPos = run; 
        const marker = target.querySelector('.heading-marker');
        const markerLen = marker ? marker.innerText.length : 0;
        effectiveAbsPos += markerLen;
        const startsWithZWSP = tn.data.startsWith('\u200B');
        if (startsWithZWSP) {
            effectiveAbsPos += Math.max(0, caretPos - 1);
        } else {
            effectiveAbsPos += caretPos;
        }
        return effectiveAbsPos;
    },

    applyFocusFormatting(focusRange) {
        const blocks = this.getBlocks();
        let run = 0;
        for (const el of blocks) {
            const len = el.innerText.length;
            const inRange =
                run + len >= focusRange.start &&   
                run <= focusRange.end;
            el.style.opacity = inRange ? '0.9' : '0.3';
            run += len + 1;                        
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
            const broken = !n ||
                           (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BR') ||
                           (isTextNode && n.data.charCodeAt(0) !== 0x200B && n.data.length > 0) || 
                           (isTextNode && n.data.length === 0 && h.childNodes.length <=1 ); 

            if (broken) {
                const body = isTextNode ? n.data.replace(/^[\u200B]/, '') : '';
                
                const div = document.createElement('div');
                div.textContent = marker.textContent + body; 
                h.replaceWith(div);
                console.log(`[DOM Render] Reverted H${h.tagName.substring(1)} to DIV.`);
                reverted = true;

                const tn = div.firstChild; 
                if (tn && tn.nodeType === Node.TEXT_NODE) {
                    const sel = window.getSelection();
                    const rng = document.createRange();
                    let caretPosInDiv = marker.textContent.length;
                    caretPosInDiv = Math.min(caretPosInDiv, tn.data.length); 

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
