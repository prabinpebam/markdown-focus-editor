import storage from './storage.js';
import listManager from './listManager.js';
import headingManager from './headingManager.js'; // Import headingManager

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
        // Ensure these methods exist on the 'editor' object.
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
        document.addEventListener('mouseup',  this.boundHandleMouseUp);
        this.editorEl.addEventListener('keyup', this.boundHandleKeyUp);
        
        this.editorEl.addEventListener('input', () => {
            if (this.isSelecting) return; 
            if (!this.lastLogTrigger) {
                this.lastLogTrigger = 'input';
            }
            this.boundHandleInputFormatting();
        });

        this.editorEl.addEventListener('click', this.boundHandleClick);
        
        this.editorEl.addEventListener('keydown', this.boundHandleEnterKeydown); // Handles preEnterDOM snapshot

        if (this.caretInput){
            this.caretInput.addEventListener('change', () => {
                const max   = this.editorEl.innerText.length;
                let   pos   = parseInt(this.caretInput.value,10);
                if (isNaN(pos) || pos < 0) pos = 0;
                if (pos > max) pos = max;
                this.caretInput.value = pos;
                this.restoreCaret(pos);
            });
        }
        listManager.init(this);
        headingManager.init(this); // Initialize headingManager
    },

    handleKeyDown(e) {
        // Undo/Redo handling
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) { // Ctrl+Shift+Z or Cmd+Shift+Z for redo
                // console.log('[Editor] Redo attempt');
                if (this.undoManager) this.undoManager.redo();
            } else { // Ctrl+Z or Cmd+Z for undo
                // console.log('[Editor] Undo attempt');
                if (this.undoManager) this.undoManager.undo();
            }
            return; // Stop further processing for undo/redo
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { // Ctrl+Y for redo (common on Windows)
            e.preventDefault();
            // console.log('[Editor] Redo attempt (Ctrl+Y)');
            if (this.undoManager) this.undoManager.redo();
            return; // Stop further processing for redo
        }


        if (e.key === 'Enter' || e.key === 'Backspace') {
            this.preDomSnapshot = this.editorEl.innerHTML;
            this.lastLogTrigger = e.key;
        }

        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
            let listItem = null; // Initialize listItem

            if (e.key === 'Tab') {
                console.log('[Tab Key Global] Editor focused. Preventing default.');
                console.log('[Tab Key Debug] sel.anchorNode:', sel.anchorNode, 'Type:', sel.anchorNode.nodeType, 'Name:', sel.anchorNode.nodeName);
                console.log('[Tab Key Debug] sel.anchorOffset:', sel.anchorOffset);
                const parentOfAnchor = sel.anchorNode.parentNode;
                console.log('[Tab Key Debug] sel.anchorNode.parentNode:', parentOfAnchor);
                
                const closestLiCheck = sel.anchorNode.closest ? sel.anchorNode.closest('li') : null;
                console.log('[Tab Key Debug] Result of sel.anchorNode.closest("li"):', closestLiCheck);

                if (closestLiCheck) {
                    listItem = closestLiCheck;
                } else if (parentOfAnchor && parentOfAnchor.nodeName === 'LI') {
                    // Fallback: If closest fails, but direct parent is LI (e.g. anchorNode is a text node directly in LI)
                    listItem = parentOfAnchor;
                    console.log('[Tab Key Debug] closest("li") failed, but parentNode is LI. Using parentNode as listItem.');
                }
                console.log('[Tab Key Debug] Final determined listItem:', listItem);
            } else {
                // For keys other than Tab, use the standard closest check
                listItem = sel.anchorNode.closest ? sel.anchorNode.closest('li') : null;
            }
            
            if (e.key === 'Tab' && this.editorEl.contains(document.activeElement)) {
                e.preventDefault(); 

                if (listItem) { 
                    const currentAnchorNode = sel.anchorNode;
                    const currentAnchorOffset = sel.anchorOffset;
                    let operationPerformed = false;
                    
                    if (e.shiftKey) {
                        console.log('[Shift+Tab Key] Context is LI.'); // Specific log for Shift+Tab
                        console.log('[Shift+Tab Key] Captured for restore: Node:', currentAnchorNode, 'Offset:', currentAnchorOffset);
                        console.log('[Shift+Tab Key] Calling listManager.handleShiftTab.');
                        listManager.handleShiftTab(listItem, currentAnchorNode, currentAnchorOffset); 
                        // listManager.handleShiftTab should call undoManager if it makes a change
                    } else {
                        console.log('[Tab Key] Context is LI.');
                        console.log('[Tab Key] Captured for restore: Node:', currentAnchorNode, 'Offset:', currentAnchorOffset);
                        console.log('[Tab Key] Calling listManager.handleTab.');
                        listManager.handleTab(listItem, currentAnchorNode, currentAnchorOffset);
                        // listManager.handleTab should call undoManager if it makes a change
                    }
                    // No direct call to undoManager here; sub-modules handle it.
                    this.updateCaretDisplayAndSave(); 
                    return; 
                } else {
                    // This log will now also apply to Shift+Tab if not in an LI context
                    console.log(`[${e.shiftKey ? 'Shift+Tab' : 'Tab'} Key] Context is NOT LI (e.g., div, hX). Key does nothing custom yet.`);
                }
            }
        }
        
        // For other keys (Shift, Ctrl+A, Arrows, etc.)
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
        this.boundHandlePotentialPostActionFormatting();
    },
    
    handleClick() {
        if (this.isSelecting && !window.getSelection().isCollapsed) {
            return;
        }
        this.isSelecting = false; 
        this.boundHandlePotentialPostActionFormatting();
    },

    handleEnterKeydown(e) {
        if (e.key === 'Enter') {
            this.preEnterDOM = this.editorEl.innerHTML; 
        }
    },

    handleInputFormatting() {
        if (this.isSelecting) return; 
        if (this.devToggle && !this.devToggle.checked) {
            this.updateCaretDisplayAndSave(); 
            return;
        }

        // Record state BEFORE potential transformation if input is likely to cause one
        // This is tricky because simple typing shouldn't spam history.
        // A better place might be *after* a transformation is confirmed.
        // if (this.undoManager) this.undoManager.recordState('beforeInputFormattingAttempt');


        setTimeout(() => {
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
                 transformationOccurred = this.attemptBlockTransformations(blockToProcess, sel.anchorNode, sel.anchorOffset);
                 // If transformationOccurred, the specific transforming function should have called undoManager.
            }

            if (transformationOccurred) {
                absCaretPos = this.getAbsoluteCaretPosition(); 
                // The call to recordState should happen inside attemptBlockTransformations or its sub-functions
            } else {
                // If no transformation, but it was a significant input (e.g. space, punctuation), maybe record.
                // This needs careful thought to avoid too many history states.
                // For now, only record on explicit transformations.
            }
            
            this.applyFocusAndSave(absCaretPos, transformationOccurred); 
            this.lastLogTrigger = null;
        }, 0); 
    },
    
    handlePotentialPostActionFormatting() {
        if (this.isSelecting) return;
         if (this.devToggle && !this.devToggle.checked) {
            this.updateCaretDisplayAndSave();
            return;
        }

        setTimeout(() => {
            let absCaretPos = this.getAbsoluteCaretPosition();
            let transformationOccurred = false;

            const headingReverted = headingManager.checkAndRevertBrokenHeadings();
            if (headingReverted) {
                // headingManager.checkAndRevertBrokenHeadings should call undoManager if it reverts
                absCaretPos = this.getAbsoluteCaretPosition();
                transformationOccurred = true;
            }
            
            this.applyFocusAndSave(absCaretPos, transformationOccurred); 

            this.preDomSnapshot = null;
            this.lastLogTrigger = null;
        }, 0); 
    },

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
        this.updateCaretDisplayAndSave();
    },
    
    updateCaretDisplayAndSave() {
        if (this.caretInput) {
            // Ensure getAbsoluteCaretPosition is robust before updating
            try {
                this.caretInput.value = Math.min(this.getAbsoluteCaretPosition(), 999);
            } catch (e) {
                // Silently fail or log minimally if caret position can't be determined
            }
        }
        if (this.editorEl) {
            storage.saveSettings('lastContent', this.editorEl.innerHTML);
        }
    },

    attemptBlockTransformations(blockNode, originalAnchorNode, originalAnchorOffset) {
        if (!blockNode || blockNode.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Only attempt transformations on DIVs for now
        if (blockNode.tagName !== 'DIV') {
            return false;
        }

        const textContent = blockNode.textContent;
        
        // Try heading transformation first
        let transformed = headingManager.tryTransformToHeading(blockNode, textContent, originalAnchorNode, originalAnchorOffset);
        // headingManager.tryTransformToHeading should call undoManager if successful
        if (transformed) {
            return true;
        }

        // Try list transformation if heading transformation didn't occur
        const ulMatch = textContent.match(listManager.ulMarkerRegex);
        if (ulMatch) {
            // listManager.convertBlockToList should call undoManager if successful
            return listManager.convertBlockToList(blockNode, ulMatch, 'ul');
        }

        const olMatch = textContent.match(listManager.olMarkerRegex);
        if (olMatch) {
            // listManager.convertBlockToList should call undoManager if successful
            return listManager.convertBlockToList(blockNode, olMatch, 'ol');
        }
        
        return false; // No transformation occurred
    },

    // transformToHeading method is now moved to headingManager.js
    // revertBrokenHeading method is now moved to headingManager.js

    getBlocks() {
        return Array.from(this.editorEl.children); 
    },

    getAbsoluteCaretPosition() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode || !this.editorEl.contains(sel.anchorNode)) return 0;


        let currentBlock = sel.anchorNode;
        while (currentBlock && currentBlock.parentNode !== this.editorEl) {
            currentBlock = currentBlock.parentNode;
        }
        if (!currentBlock || currentBlock === this.editorEl && sel.anchorNode !== this.editorEl) { 
            // If currentBlock became editorEl but anchorNode is not editorEl, something is wrong (e.g. caret in marker span)
            // or if currentBlock is null. Try to find the block based on anchorNode again if it's the editor.
            if (sel.anchorNode === this.editorEl) {
                 // Caret is directly in editor, usually means it's empty or between blocks.
                 // Offset will be based on child index.
            } else {
                // Fallback or error, caret might be in an unexpected place (e.g. detached node, or inside marker)
                // For safety, return a value that implies start or end, or try a simpler calculation.
                // A simple recovery: if anchorNode is a text node, count characters up to it in its parent block.
                let tempNode = sel.anchorNode;
                let tempOffset = sel.anchorOffset;
                while(tempNode && tempNode.parentNode !== this.editorEl && tempNode.parentNode) {
                    let sibling = tempNode.previousSibling;
                    while(sibling) {
                        tempOffset += (sibling.textContent || '').length;
                        sibling = sibling.previousSibling;
                    }
                    tempNode = tempNode.parentNode;
                }
                 currentBlock = tempNode; // This is now the block-level child of editorEl
            }
        }


        let offset = 0;
        for (const el of this.getBlocks()) {
            if (el === currentBlock) {
                if (sel.anchorNode === this.editorEl) { // Caret directly in editor (e.g. empty)
                    let childOffset = 0;
                    for (let i = 0; i < sel.anchorOffset; i++) {
                        childOffset += (this.editorEl.childNodes[i].textContent || '').length +1;
                    }
                    offset += childOffset;
                } else if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
                     // Calculate offset within the currentBlock up to the anchorNode, then add anchorOffset
                    let intraBlockOffset = 0;
                    let tempNode = currentBlock.firstChild;
                    let foundAnchor = false;
                    while(tempNode) {
                        if (tempNode === sel.anchorNode) {
                            intraBlockOffset += sel.anchorOffset;
                            foundAnchor = true;
                            break;
                        }
                        intraBlockOffset += (tempNode.textContent || '').length;
                        if (tempNode.contains && tempNode.contains(sel.anchorNode)) { // Anchor is a descendant
                            let innerOffset = 0;
                            let pathNode = sel.anchorNode;
                            // Sum text content of pathNode's preceding siblings up to tempNode's child
                            while(pathNode !== tempNode) {
                                let pathSibling = pathNode.previousSibling;
                                while(pathSibling) {
                                    innerOffset += (pathSibling.textContent || '').length;
                                    pathSibling = pathSibling.previousSibling;
                                }
                                if (pathNode.nodeType === Node.TEXT_NODE && pathNode === sel.anchorNode) {
                                     innerOffset += sel.anchorOffset;
                                } else if (pathNode.nodeType === Node.TEXT_NODE) {
                                     innerOffset += (pathNode.textContent || '').length;
                                }
                                // If pathNode is an element containing the sel.anchorNode, this needs more recursion.
                                // For simplicity, this case is complex. The original logic was simpler.
                                // Sticking to simpler logic: if anchorNode is text, add its offset.
                                // If anchorNode is an element, it's more complex.
                                pathNode = pathNode.parentNode; // This logic is getting too complex, revert to simpler if problematic
                            }
                            // This recursive/deep offset calculation is tricky.
                            // The original logic was simpler: if TEXT_NODE, add sel.anchorOffset.
                            // Let's stick to that for now and refine if needed.
                            intraBlockOffset = sel.anchorOffset; // Simplified for now
                            foundAnchor = true; // Assume if we are here, anchor is in this block
                            break; 
                        }
                        tempNode = tempNode.nextSibling;
                    }
                     offset += (foundAnchor ? intraBlockOffset : (currentBlock.textContent || '').length); // Fallback to full length if not found (should not happen)
                } else if (sel.anchorNode.nodeType === Node.ELEMENT_NODE && currentBlock.contains(sel.anchorNode)) {
                    // Caret is in an element node, sel.anchorOffset is child index
                    let intraBlockOffset = 0;
                    for(let i=0; i < sel.anchorOffset; i++){
                        if(currentBlock.childNodes[i]){
                            intraBlockOffset += (currentBlock.childNodes[i].textContent || '').length;
                        }
                    }
                    offset += intraBlockOffset;
                }
                break;
            }
            offset += (el.textContent || '').length + 1; 
        }
        return offset;
    },

    restoreCaret(abs) {
        console.log(`[restoreCaret] Called. abs: ${abs}, Current editor innerHTML length: ${this.editorEl.innerHTML.length}`); // ADD THIS LOG
        const blocks = this.getBlocks();
        let run = 0, targetBlock = null, innerOffset = 0;

        for (const el of blocks) {
            const len = (el.textContent || '').length; 
            if (run + len + 1 > abs) {
                innerOffset  = abs - run;
                targetBlock = el;
                break;
            }
            run += len + 1;
        }
        
        if (!targetBlock) {
            if (blocks.length > 0) {
                targetBlock = blocks[blocks.length - 1];
                innerOffset = (targetBlock.textContent || '').length; 
            } else { 
                this.editorEl.focus();
                if (this.editorEl.children.length === 0) {
                    const div = document.createElement('div');
                    const br = document.createElement('br'); 
                    div.appendChild(br);
                    this.editorEl.appendChild(div);
                    targetBlock = div;
                    innerOffset = 0;
                } else {
                     return; 
                }
            }
        }

        let charCount = 0;
        let foundNode = null;
        let offsetInNode = 0;

        function findTextNodeRecursive(parentNode) {
            for (const child of parentNode.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    // Ensure we are not trying to place caret in a heading marker's text node
                    if (!child.parentNode || !child.parentNode.classList || !child.parentNode.classList.contains('heading-marker')) {
                        const nodeLen = child.nodeValue.length;
                        // If innerOffset is 0, and this is the first text-like content we've encountered (charCount is 0),
                        // this text node (even if empty) is our target.
                        if (charCount === 0 && innerOffset === 0) {
                            foundNode = child;
                            offsetInNode = 0;
                            return true; // Found
                        }
                        if (charCount + nodeLen >= innerOffset) {
                            foundNode = child;
                            offsetInNode = innerOffset - charCount;
                            return true; // Found
                        }
                        charCount += nodeLen;
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    if (child.classList && child.classList.contains('heading-marker')) continue; // Skip heading markers
                    if (findTextNodeRecursive(child)) {
                        return true; // Found in recursion
                    }
                }
            }
            return false; // Not found in this branch
        }

        if (targetBlock.childNodes.length === 0 && innerOffset === 0) { 
             // Block is genuinely empty, and caret is at its start. Add ZWSP to make it focusable.
             const textNode = document.createTextNode('\u200B'); 
             targetBlock.appendChild(textNode);
             foundNode = textNode;
             offsetInNode = 0; // Caret at the start of ZWSP, effectively. Or 1 to be after. For empty, 0 is fine.
        } else {
            findTextNodeRecursive(targetBlock);
        }
        
        if (!foundNode && targetBlock) { 
            if (targetBlock.childNodes.length === 1 && 
                targetBlock.firstChild.nodeType === Node.TEXT_NODE && 
                targetBlock.firstChild.nodeValue === "" && 
                innerOffset === 0) {
                foundNode = targetBlock.firstChild;
                offsetInNode = 0;
            } else {
                let isEffectivelyEmptyOrCaretAtEnd = true;
                if (targetBlock.textContent !== "" && innerOffset < targetBlock.textContent.length) {
                    isEffectivelyEmptyOrCaretAtEnd = false; 
                }

                if (isEffectivelyEmptyOrCaretAtEnd) {
                    // This is the log for ZWSP insertion by this fallback
                    console.log('[restoreCaret] Fallback: Adding ZWSP. targetBlock:', targetBlock.tagName, 'innerHTML:', targetBlock.innerHTML, 'childNodes.length:', targetBlock.childNodes.length, 'innerOffset:', innerOffset);
                    const newTextNode = document.createTextNode('\u200B');
                    targetBlock.appendChild(newTextNode);
                    foundNode = newTextNode;
                    offsetInNode = (innerOffset === 0 && targetBlock.textContent === '\u200B') ? 0 : 1;
                } else if (targetBlock.lastChild && targetBlock.lastChild.nodeType === Node.TEXT_NODE) {
                    foundNode = targetBlock.lastChild;
                    offsetInNode = foundNode.nodeValue.length;
                }
            }
        }
        
        if (foundNode) {
            offsetInNode = Math.max(0, Math.min(offsetInNode, foundNode.nodeValue.length));
            const sel = window.getSelection();
            const rng = document.createRange();
            try {
                rng.setStart(foundNode, offsetInNode);
                rng.collapse(true);
                sel.removeAllRanges();
                sel.addRange(rng);
            } catch (e) {
                if(targetBlock) targetBlock.focus(); 
            }
        } else if (targetBlock) {
            targetBlock.focus(); // Fallback: focus the block if no text node found
        }
    },

    applyFocusFormatting(focusRange) {
        const blocks = this.getBlocks();
        let run = 0;
        for (const el of blocks) {
            const len = (el.innerText || '').length; // Use innerText for opacity as it reflects visible text
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

    // revertBrokenHeading method is now moved to headingManager.js
}; // This should be the closing brace for the 'editor' object.

export default editor;
