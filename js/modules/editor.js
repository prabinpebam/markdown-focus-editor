import storage from './storage.js';
import listManager from './listManager.js';
import headingManager from './headingManager.js';

// undoManager is assigned by app.js
// inlineStyleManager is assigned by app.js
// focusMode is assigned by app.js

const editor = {
    /* ──────────────────────────────────────────────────────────────
       Focus-mode support removed
    ──────────────────────────────────────────────────────────────*/
    // Define methods that will be bound in init first
    handlePaste(e) {
        e.preventDefault();
        let text = (e.clipboardData || window.clipboardData).getData('text/plain');
        
        text = text.replace(/\r\n|\r|\n/g, '\n').trim();

        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        
        const lines = text.split('\n');
        let firstNodeInserted = null;
        let lastNodeInserted = null;

        lines.forEach((line, index) => {
            const textNode = document.createTextNode(line);
            if (index === 0) {
                range.insertNode(textNode);
                firstNodeInserted = textNode;
                lastNodeInserted = textNode;
                range.setStartAfter(lastNodeInserted); 
                range.collapse(true);
            } else {
                const div = document.createElement('div');
                div.appendChild(textNode);
                let currentBlock = lastNodeInserted;
                while(currentBlock && currentBlock.parentNode !== this.editorEl) {
                    currentBlock = currentBlock.parentNode;
                }
                if (currentBlock && currentBlock.parentNode === this.editorEl) {
                    currentBlock.parentNode.insertBefore(div, currentBlock.nextSibling);
                } else { 
                    this.editorEl.appendChild(div);
                }
                lastNodeInserted = textNode; 
                range.setStart(lastNodeInserted, lastNodeInserted.length); 
                range.collapse(true);
            }
        });
        sel.removeAllRanges();
        sel.addRange(range);
        
        console.log('[CURSOR-LOG] Editor.handlePaste - CURSOR SET - Target:', lastNodeInserted, 'Offset:', lastNodeInserted.length);

        if (this.undoManager) {
            this.undoManager.handleCustomChange('pasteText');
        }
        this.updateCaretDisplayAndSave();
    },

    init() {
        this.editorEl = document.getElementById('editor');
        if (!this.editorEl) return;
        
        this.editorEl.focus();

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
        // Add new binding for paste
        this.boundHandlePaste = this.handlePaste.bind(this);


        this.editorEl.addEventListener('keydown', this.boundHandleKeyDown);
        this.editorEl.addEventListener('mousedown', this.boundHandleMouseDown);
        document.addEventListener('mouseup',  this.boundHandleMouseUp);
        this.editorEl.addEventListener('keyup', this.boundHandleKeyUp);
        this.editorEl.addEventListener('paste', this.boundHandlePaste); // Add paste listener
        
        this.editorEl.addEventListener('input', () => {
            if (!this.lastLogTrigger) {
                this.lastLogTrigger = 'input';
            }
            this.boundHandleInputFormatting();
        });

        this.editorEl.addEventListener('click', this.boundHandleClick);
        
        this.editorEl.addEventListener('keydown', this.boundHandleEnterKeydown); // Handles preEnterDOM snapshot

        listManager.init(this);
        headingManager.init(this);
        // inlineStyleManager is initialized in app.js and assigned to this.inlineStyleManager
    },

    handleKeyDown(e) {
        // Undo/Redo handling
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) { 
                if (this.undoManager) this.undoManager.redo();
            } else { 
                if (this.undoManager) this.undoManager.undo();
            }
            return; 
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { 
            e.preventDefault();
            if (this.undoManager) this.undoManager.redo();
            return; 
        }

        // Enhanced Ctrl+B and Ctrl+I handling
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'i')) {
            e.preventDefault(); // Take full control
            
            const styleType = e.key.toLowerCase() === 'b' ? 'bold' : 'italic';
            const tagName = e.key.toLowerCase() === 'b' ? 'B' : 'I';

            const sel = window.getSelection();
            let hadTextSelection = false;
            
            // Trimming logic for single text node selection (if any)
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (!range.collapsed) {
                    hadTextSelection = true;
                    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
                        const textNode = range.startContainer;
                        const fullText = textNode.nodeValue;
                        let selStart = range.startOffset;
                        let selEnd = range.endOffset;
                        let currentSelectedText = fullText.substring(selStart, selEnd);
                        const leadingSpaces = currentSelectedText.match(/^\s+/);
                        const trailingSpaces = currentSelectedText.match(/\s+$/);
                        if (leadingSpaces) selStart += leadingSpaces[0].length;
                        if (trailingSpaces) selEnd -= trailingSpaces[0].length;
                        if ((leadingSpaces || trailingSpaces) && selStart < selEnd) {
                            const newRange = document.createRange();
                            newRange.setStart(textNode, selStart);
                            newRange.setEnd(textNode, selEnd);
                            sel.removeAllRanges();
                            sel.addRange(newRange);
                            console.log(`[Editor] Trimmed selection for ${styleType}.`);
                        }
                    }
                }
            }
            
            // Store affected block elements before execCommand
            const affectedBlocksInfo = [];
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (!range.collapsed) {
                    this.getBlocks().forEach(block => {
                        if (range.intersectsNode(block)) {
                            const isEffectivelyEmpty = block.innerHTML.trim().toLowerCase() === '<br>' || block.textContent.trim() === '';
                            affectedBlocksInfo.push({ element: block, wasEffectivelyEmpty: isEffectivelyEmpty, originalHTML: block.innerHTML });
                        }
                    });
                }
            }

            document.execCommand(styleType, false, null);

            setTimeout(() => {
                // Cleanup effectively empty blocks that got styled
                affectedBlocksInfo.forEach(info => {
                    if (info.wasEffectivelyEmpty) {
                        const styleTag = info.element.querySelector(tagName); 
                        if (styleTag && styleTag.parentElement === info.element) {
                            const styleTagContent = styleTag.innerHTML.trim().toLowerCase();
                            if (styleTagContent === '<br>' || styleTag.textContent.trim() === '') {
                                info.element.innerHTML = info.originalHTML;
                                console.log('[Editor] Cleaned up styled empty block:', info.element);
                            }
                        } else if (info.element.textContent.trim() === '' && info.element.querySelector(tagName)) {
                            info.element.innerHTML = info.originalHTML;
                            console.log('[Editor] Cleaned up styled empty block (no text):', info.element);
                        }
                    }
                });

                const currentSel = window.getSelection();
                if (!currentSel || !currentSel.anchorNode) {
                    if (this.undoManager) this.undoManager.handleCustomChange(`style_${styleType}_with_ZWSP`);
                    this.updateCaretDisplayAndSave();
                    return;
                }

                let styledElement = null;
                let anchor = currentSel.anchorNode;
                let focus = currentSel.focusNode;

                let current = focus;
                while(current && current !== this.editorEl) {
                    if (current.nodeType === Node.ELEMENT_NODE && current.tagName === tagName) {
                        let parentBlock = current;
                        while(parentBlock && parentBlock.parentNode !== this.editorEl) parentBlock = parentBlock.parentNode;
                        const blockInfo = affectedBlocksInfo.find(bi => bi.element === parentBlock);
                        if (!(blockInfo && blockInfo.wasEffectivelyEmpty && parentBlock.innerHTML === blockInfo.originalHTML)) {
                             if (current.contains(focus) || current === focus || (current.parentNode && current.parentNode.contains(focus))) {
                                styledElement = current;
                                break;
                            }
                        }
                    }
                    current = current.parentNode;
                }
                if (!styledElement) {
                    current = anchor;
                     while(current && current !== this.editorEl) {
                        if (current.nodeType === Node.ELEMENT_NODE && current.tagName === tagName) {
                            let parentBlock = current;
                            while(parentBlock && parentBlock.parentNode !== this.editorEl) parentBlock = parentBlock.parentNode;
                            const blockInfo = affectedBlocksInfo.find(bi => bi.element === parentBlock);
                            if (!(blockInfo && blockInfo.wasEffectivelyEmpty && parentBlock.innerHTML === blockInfo.originalHTML)) {
                                if (current.contains(anchor) || current === anchor || (current.parentNode && current.parentNode.contains(anchor))) {
                                    styledElement = current;
                                    break;
                                }
                            }
                        }
                        current = current.parentNode;
                    }
                }

                if (styledElement) {
                    if (!styledElement.nextSibling || styledElement.nextSibling.nodeValue !== '\u200B') {
                        const zwspNode = document.createTextNode('\u200B');
                        styledElement.parentNode.insertBefore(zwspNode, styledElement.nextSibling);
                        console.log(`[Editor] Added ZWSP after ${styleType} tag.`);
                    }
                    
                    // Set selection based on whether there was originally selected text
                    const newRange = document.createRange();
                    if (hadTextSelection && styledElement.hasChildNodes()) {
                        // If text was originally selected, select the content inside the styled element
                        newRange.selectNodeContents(styledElement);
                        // Position cursor at the end of the selection
                        newRange.collapse(false);
                        currentSel.removeAllRanges();
                        currentSel.addRange(newRange);
                        // Extend selection to cover the content
                        newRange.selectNodeContents(styledElement);
                        currentSel.removeAllRanges();
                        currentSel.addRange(newRange);
                        console.log(`[CURSOR-LOG] Editor.handleKeyDown (${styleType}) - SELECTION SET - Target:`, styledElement, 'Selected content');
                    } else {
                        // If no text was selected originally, just place cursor inside the tag
                        if (styledElement.lastChild && styledElement.lastChild.nodeType === Node.TEXT_NODE) {
                            newRange.setStart(styledElement.lastChild, styledElement.lastChild.textContent.length);
                        } else if (styledElement.hasChildNodes()) {
                             newRange.selectNodeContents(styledElement);
                             newRange.collapse(false); 
                        } else { 
                            newRange.setStart(styledElement, 0); 
                        }
                        newRange.collapse(true);
                        currentSel.removeAllRanges();
                        currentSel.addRange(newRange);
                        console.log(`[CURSOR-LOG] Editor.handleKeyDown (${styleType}) - CURSOR SET - Target:`, newRange.startContainer, 'Offset:', newRange.startOffset);
                    }
                }
                
                if (this.undoManager) {
                    this.undoManager.handleCustomChange(`style_${styleType}_with_ZWSP`);
                }
                this.updateCaretDisplayAndSave();
            }, 0);
            return; // Ctrl+B/I handled
        }

        // Ctrl+Shift+S for strikethrough
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
            e.preventDefault(); 
            
            const strikeTagName = 'S'; 
            const selStrike = window.getSelection();
            let hadTextSelectionStrike = false;

            if (selStrike && selStrike.rangeCount > 0) {
                const rangeStrike = selStrike.getRangeAt(0);
                if (!rangeStrike.collapsed) {
                    hadTextSelectionStrike = true;
                }
            }

            // Store affected block elements before execCommand
            const affectedBlocksInfoStrike = [];
            if (selStrike && selStrike.rangeCount > 0) {
                const rangeStrike = selStrike.getRangeAt(0);
                if (!rangeStrike.collapsed) {
                    this.getBlocks().forEach(block => {
                        if (rangeStrike.intersectsNode(block)) {
                            const isEffectivelyEmpty = block.innerHTML.trim().toLowerCase() === '<br>' || block.textContent.trim() === '';
                            affectedBlocksInfoStrike.push({ element: block, wasEffectivelyEmpty: isEffectivelyEmpty, originalHTML: block.innerHTML });
                        }
                    });
                }
            }
            
            document.execCommand('strikethrough', false, null);

            setTimeout(() => {
                affectedBlocksInfoStrike.forEach(info => {
                    if (info.wasEffectivelyEmpty) {
                        const styleTag = info.element.querySelector(strikeTagName) || info.element.querySelector('STRIKE');
                        if (styleTag && styleTag.parentElement === info.element) {
                            const styleTagContent = styleTag.innerHTML.trim().toLowerCase();
                            if (styleTagContent === '<br>' || styleTag.textContent.trim() === '') {
                                info.element.innerHTML = info.originalHTML;
                                console.log('[Editor] Cleaned up styled empty block (strikethrough):', info.element);
                            }
                        } else if (info.element.textContent.trim() === '' && info.element.querySelector(strikeTagName)) {
                             info.element.innerHTML = info.originalHTML;
                             console.log('[Editor] Cleaned up styled empty block (strikethrough, no text):', info.element);
                        }
                    }
                });

                const currentSel = window.getSelection();
                if (!currentSel || !currentSel.anchorNode) {
                    if (this.undoManager) this.undoManager.handleCustomChange('style_strikethrough_with_ZWSP');
                    this.updateCaretDisplayAndSave();
                    return;
                }

                let styledElement = null;
                let anchor = currentSel.anchorNode;
                let focus = currentSel.focusNode;

                let current = focus;
                while(current && current !== this.editorEl) {
                    if (current.nodeType === Node.ELEMENT_NODE && (current.tagName === strikeTagName || current.tagName === 'STRIKE')) {
                        let parentBlock = current;
                        while(parentBlock && parentBlock.parentNode !== this.editorEl) parentBlock = parentBlock.parentNode;
                        const blockInfo = affectedBlocksInfoStrike.find(bi => bi.element === parentBlock);
                        if (!(blockInfo && blockInfo.wasEffectivelyEmpty && parentBlock.innerHTML === blockInfo.originalHTML)) {
                             if (current.contains(focus) || current === focus || (current.parentNode && current.parentNode.contains(focus))) {
                                styledElement = current;
                                break;
                            }
                        }
                    }
                    current = current.parentNode;
                }
                 if (!styledElement) { 
                    current = anchor;
                    while(current && current !== this.editorEl) {
                        if (current.nodeType === Node.ELEMENT_NODE && (current.tagName === strikeTagName || current.tagName === 'STRIKE')) {
                            let parentBlock = current;
                            while(parentBlock && parentBlock.parentNode !== this.editorEl) parentBlock = parentBlock.parentNode;
                            const blockInfo = affectedBlocksInfoStrike.find(bi => bi.element === parentBlock);
                            if (!(blockInfo && blockInfo.wasEffectivelyEmpty && parentBlock.innerHTML === blockInfo.originalHTML)) {
                                if (current.contains(anchor) || current === anchor || (current.parentNode && current.parentNode.contains(anchor))) {
                                    styledElement = current;
                                    break;
                                }
                            }
                        }
                        current = current.parentNode;
                    }
                }
                
                if (styledElement) {
                    if (!styledElement.nextSibling || styledElement.nextSibling.nodeValue !== '\u200B') {
                        const zwspNode = document.createTextNode('\u200B');
                        styledElement.parentNode.insertBefore(zwspNode, styledElement.nextSibling);
                        console.log('[Editor] Added ZWSP after strikethrough tag.');
                    }
                    
                    const newRange = document.createRange();
                    if (hadTextSelectionStrike && styledElement.hasChildNodes()) {
                        // Select content inside strikethrough element
                        newRange.selectNodeContents(styledElement);
                        newRange.collapse(false);
                        currentSel.removeAllRanges();
                        currentSel.addRange(newRange);
                        newRange.selectNodeContents(styledElement);
                        currentSel.removeAllRanges();
                        currentSel.addRange(newRange);
                        console.log('[CURSOR-LOG] Editor.handleKeyDown (strikethrough) - SELECTION SET - Target:', styledElement, 'Selected content');
                    } else {
                        // Place cursor inside strikethrough element
                        if (styledElement.lastChild && styledElement.lastChild.nodeType === Node.TEXT_NODE) {
                           newRange.setStart(styledElement.lastChild, styledElement.lastChild.textContent.length);
                        } else if (styledElement.hasChildNodes()) {
                             newRange.selectNodeContents(styledElement);
                             newRange.collapse(false);
                        } else {
                            newRange.setStart(styledElement, 0);
                        }
                        newRange.collapse(true);
                        currentSel.removeAllRanges();
                        currentSel.addRange(newRange);
                        console.log('[CURSOR-LOG] Editor.handleKeyDown (strikethrough) - CURSOR SET - Target:', newRange.startContainer, 'Offset:', newRange.startOffset);
                    }
                }
                
                if (this.undoManager) {
                    this.undoManager.handleCustomChange('style_strikethrough_with_ZWSP');
                }
                this.updateCaretDisplayAndSave();
            }, 0);
            return;
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
        // Set isSelecting true if shift is held down WITH an arrow key, or for Ctrl+A
        if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            this.isSelecting = true;
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            this.isSelecting = true;
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.shiftKey) {
            // If just an arrow key is pressed (no shift), it might collapse a selection
            // We'll handle isSelecting = false in keyup for this.
            // For now, don't set isSelecting to true here.
        } else if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
            // Just a modifier key press, don't set isSelecting = true yet.
            // isSelecting will be set if combined with selection actions.
        }
        // Note: Simple Shift + character typing should not set isSelecting = true here.
        // The input event will handle the character insertion.
    },

    handleMouseDown() {
        this.preDomSnapshot = this.editorEl.innerHTML;
        this.lastLogTrigger = 'click';
        this.isSelecting = true; // Mouse down always starts a potential selection
    },

    handleMouseUp() {
        // If selection is collapsed after mouseup, it means it was a click, not a drag selection.
        if (window.getSelection().isCollapsed) {
            this.isSelecting = false;
        }
        // If not collapsed, isSelecting remains true until selection is changed/cleared.
    },

    handleKeyUp(e) {
        // If Shift key is released and selection is collapsed, no longer selecting.
        // Or if any key is released and selection is collapsed.
        if (window.getSelection().isCollapsed) {
            this.isSelecting = false;
        }

        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key) && !e.shiftKey) {
            this.updateCaretDisplayAndSave();
            return;
        }
        // For other keys, or if selection is not collapsed, proceed to post-action formatting.
        this.boundHandlePotentialPostActionFormatting();
    },
    
    handleClick() {
        this.isSelecting = false;
        this.boundHandlePotentialPostActionFormatting();
    },

    handleEnterKeydown(e) {
        if (e.key === 'Enter') {
            this.preEnterDOM = this.editorEl.innerHTML; 
        }
    },

    handleInputFormatting() {
        // The check "if (this.isSelecting) return;" at the beginning of this function
        // might be too aggressive if 'isSelecting' is true just because Shift was held.
        // The 'input' event fires after a character (like 'A' from Shift+'a') is inserted.
        // At this point, the selection is usually collapsed.
        
        // Let's rely on the selection state at the moment the input event fires.
        const currentSelection = window.getSelection();

        // Capture caret position *before* any potential transformation
        const absCaretPosBeforeTransform = this.getAbsoluteCaretPosition();
        console.log('[CURSOR-LOG] Editor.handleInputFormatting - BEFORE transformation - absCaretPos:', absCaretPosBeforeTransform);

        setTimeout(() => {
            const sel = window.getSelection();
            let blockToProcess = null; 
            let textNodeForInline = null; 
            let offsetInTextNode = 0;

            if (sel && sel.anchorNode) {
                console.log('[CURSOR-LOG] Editor.handleInputFormatting - sel.anchorNode:', sel.anchorNode, 'nodeType:', sel.anchorNode.nodeType, 'nodeName:', sel.anchorNode.nodeName);
                
                blockToProcess = sel.anchorNode;
                while (blockToProcess && blockToProcess.parentNode !== this.editorEl) {
                    blockToProcess = blockToProcess.parentNode;
                }
                if (blockToProcess === this.editorEl && sel.anchorNode !== this.editorEl) { // If caret is in a child of editor directly
                    blockToProcess = sel.anchorNode.childNodes[sel.anchorOffset] || sel.anchorNode.lastChild || sel.anchorNode;
                } else if (blockToProcess === this.editorEl && sel.anchorNode === this.editorEl) { // Caret directly in editor (empty or between blocks)
                     blockToProcess = this.editorEl.childNodes[sel.anchorOffset] || this.editorEl.lastChild;
                }

                console.log('[CURSOR-LOG] Editor.handleInputFormatting - blockToProcess after logic:', blockToProcess, 'tagName:', blockToProcess?.tagName, 'textContent:', blockToProcess?.textContent);

                if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
                    textNodeForInline = sel.anchorNode;
                    offsetInTextNode = sel.anchorOffset;
                }
            }

            let transformationOccurred = false;
            
            if (blockToProcess && blockToProcess.parentNode === this.editorEl) {
                console.log('[CURSOR-LOG] Editor.handleInputFormatting - ATTEMPTING block transformation on:', blockToProcess.tagName, 'with content:', JSON.stringify(blockToProcess.textContent));
                transformationOccurred = this.attemptBlockTransformations(blockToProcess, sel.anchorNode, sel.anchorOffset);
                console.log('[CURSOR-LOG] Editor.handleInputFormatting - Block transformation result:', transformationOccurred);
            } else {
                console.log('[CURSOR-LOG] Editor.handleInputFormatting - NO block transformation attempted. blockToProcess:', blockToProcess, 'parentNode:', blockToProcess?.parentNode, 'editorEl:', this.editorEl);
            }

            if (!transformationOccurred && textNodeForInline && this.inlineStyleManager) {
                transformationOccurred = this.inlineStyleManager.checkAndApplyInlineStyles(textNodeForInline, offsetInTextNode);
            }

            // If no custom transformation happened, it means the browser handled the input.
            // Record this state for our undo manager.
            // This will cover typing, simple backspace/delete, enter in plain divs, etc.
            if (!transformationOccurred && this.undoManager) {
                this.undoManager.handleCustomChange('textInput'); 
            }

            if (transformationOccurred) {
                console.log('[CURSOR-LOG] Editor.handleInputFormatting - AFTER transformation - calling applyFocusAndSave with current pos');
                this.applyFocusAndSave(this.getAbsoluteCaretPosition(), true); 
            } else {
                console.log('[CURSOR-LOG] Editor.handleInputFormatting - NO transformation - calling applyFocusAndSave with original pos:', absCaretPosBeforeTransform);
                this.applyFocusAndSave(absCaretPosBeforeTransform, false); 
            }
            this.lastLogTrigger = null;
        }, 0);
    },
    
    handlePotentialPostActionFormatting() {
        if (this.isSelecting) return;
        
        const absCaretPosBeforeTransform = this.getAbsoluteCaretPosition();

        setTimeout(() => {
            let transformationOccurred = false; 

            // Only run if dev mode is on (or if certain checks are always on)
            if (!this.devToggle || this.devToggle.checked) {
                const headingWasReverted = headingManager.checkAndRevertBrokenHeadings();
                if (headingWasReverted) {
                    // headingManager.checkAndRevertBrokenHeadings should call undoManager.handleCustomChange
                    transformationOccurred = true;
                }
            }
            
            // If a heading was reverted, it's a transformation.
            // If not, this path doesn't typically involve other direct browser inputs
            // that haven't already been caught by the 'input' event.
            // So, no explicit undoManager call here unless a new type of transformation is added.

            if (transformationOccurred) {
                this.applyFocusAndSave(this.getAbsoluteCaretPosition(), true);
            } else {
                this.applyFocusAndSave(absCaretPosBeforeTransform, false);
            }

            this.preDomSnapshot = null;
            this.lastLogTrigger = null;
        }, 0); 
    },

    attemptBlockTransformations(blockNode, originalAnchorNode, originalAnchorOffset) {
        console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - CALLED with blockNode:', blockNode, 'tagName:', blockNode?.tagName);
        
        if (!blockNode || blockNode.nodeType !== Node.ELEMENT_NODE) {
            console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - EARLY RETURN: invalid blockNode');
            return false;
        }

        // Only attempt transformations on DIVs for now
        if (blockNode.tagName !== 'DIV') {
            console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - EARLY RETURN: not a DIV, tagName:', blockNode.tagName);
            return false;
        }

        const textContent = blockNode.textContent;
        console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - textContent:', JSON.stringify(textContent));
        
        // Try heading transformation first
        let transformed = headingManager.tryTransformToHeading(blockNode, textContent, originalAnchorNode, originalAnchorOffset);
        console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - heading transformation result:', transformed);
        
        // headingManager.tryTransformToHeading should call undoManager if successful
        if (transformed) {
            return true;
        }

        // Try list transformation if heading transformation didn't occur
        const ulMatch = textContent.match(listManager.ulMarkerRegex);
        if (ulMatch) {
            console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - UL match found, converting to list');
            // listManager.convertBlockToList should call undoManager if successful
            return listManager.convertBlockToList(blockNode, ulMatch, 'ul');
        }

        const olMatch = textContent.match(listManager.olMarkerRegex);
        if (olMatch) {
            console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - OL match found, converting to list');
            // listManager.convertBlockToList should call undoManager if successful
            return listManager.convertBlockToList(blockNode, olMatch, 'ol');
        }
        
        console.log('[CURSOR-LOG] Editor.attemptBlockTransformations - NO transformation applied');
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
        console.log('[CURSOR-LOG] Editor.restoreCaret - CALLED with abs position:', abs);
        
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

        console.log('[CURSOR-LOG] Editor.restoreCaret - Target block:', targetBlock, 'innerOffset:', innerOffset);

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
                console.log('[CURSOR-LOG] Editor.restoreCaret - CURSOR SET - Target:', foundNode, 'Offset:', offsetInNode);
            } catch (e) {
                // fallback – at least focus the block
                if (targetBlock) targetBlock.focus();
                console.log('[CURSOR-LOG] Editor.restoreCaret - ERROR, fallback focus on:', targetBlock);
            }
        } else if (targetBlock) {
            targetBlock.focus(); // Fallback if no text node found
            console.log('[CURSOR-LOG] Editor.restoreCaret - NO foundNode, fallback focus on:', targetBlock);
        }
    },

    /* ------------------------------------------------------------
      Focus-mode was removed; some code still calls this helper.
      Now we use the focusMode module instead.
    ------------------------------------------------------------ */
    applyFocusAndSave(currentAbsoluteCaretPos, transformationDidOccur) {
        // Update focus mode if it exists and is active
        if (this.focusMode) {
            this.focusMode.updateFocusIfActive();
        }
        // persist editor HTML
        if (this.editorEl) {
            storage.saveSettings('lastContent', this.editorEl.innerHTML);
        }
    },

    /* ------------------------------------------------------------
      Utility: show caret index in #caret-pos and persist content.
    ------------------------------------------------------------ */
    updateCaretDisplayAndSave() {
        // persist editor HTML
        if (this.editorEl) {
            storage.saveSettings('lastContent', this.editorEl.innerHTML);
        }
    },
};

export default editor;