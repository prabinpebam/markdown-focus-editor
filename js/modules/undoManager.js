const undoManager = {
    editor: null,
    history: [],
    currentIndex: -1,
    maxHistorySize: 50, // Maximum number of states to keep

    init(editorInstance) {
        this.editor = editorInstance;
        console.log('[UndoManager] Initialized with editor instance');
    },

    recordInitialState() {
        console.log('[UndoManager] Recording initial state...');
        if (!this.editor || !this.editor.editorEl) {
            console.warn('[UndoManager] Cannot record initial state - editor or editorEl not available');
            return;
        }
        this.recordState();
        console.log('[UndoManager] Initial state recorded. History size:', this.history.length, 'Index:', this.currentIndex);
    },

    recordState(operationType = 'unknown') {
        if (!this.editor || !this.editor.editorEl) {
            console.warn('[UndoManager] Cannot record state - editor or editorEl not available');
            return;
        }

        const currentState = this.editor.editorEl.innerHTML;
        const currentCaret = this.editor.getAbsoluteCaretPosition ? this.editor.getAbsoluteCaretPosition() : 0;
        
        console.log('[UndoManager] Recording state. HTML length:', currentState.length, 'Caret pos:', currentCaret);

        // Avoid recording identical consecutive states
        if (this.currentIndex >= 0 && this.history[this.currentIndex].html === currentState) {
            // Update caret position for the current state if only caret moved
            // this.history[this.currentIndex].caret = currentCaret; 
            // console.log('[UndoManager] State identical, not recording.');
            return;
        }
        
        // If we are not at the end of history (i.e., after an undo), truncate future states
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        const state = {
            html: currentState,
            caretPos: currentCaret,
            timestamp: Date.now(),
            operation: operationType
        };

        // Remove any states after current index (if we're in the middle of history)
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Add new state
        this.history.push(state);
        this.currentIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }
        
        console.log('[UndoManager] State recorded. History size:', this.history.length, 'Index:', this.currentIndex);
    },

    undo() {
        if (!this.editor || !this.editor.editorEl) {
            console.warn('[UndoManager] Cannot undo - editor or editorEl not available');
            return;
        }

        if (this.currentIndex > 0) {
            this.currentIndex--;
            const state = this.history[this.currentIndex];
            this.editor.editorEl.innerHTML = state.html;
            if (this.editor.restoreCaret) {
                this.editor.restoreCaret(state.caretPos);
            }
            console.log('[UndoManager] Undo applied. Index:', this.currentIndex);
        } else {
            console.log('[UndoManager] Nothing to undo');
        }
    },

    redo() {
        if (!this.editor || !this.editor.editorEl) {
            console.warn('[UndoManager] Cannot redo - editor or editorEl not available');
            return;
        }

        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            const state = this.history[this.currentIndex];
            this.editor.editorEl.innerHTML = state.html;
            if (this.editor.restoreCaret) {
                this.editor.restoreCaret(state.caretPos);
            }
            console.log('[UndoManager] Redo applied. Index:', this.currentIndex);
        } else {
            console.log('[UndoManager] Nothing to redo');
        }
    },

    // Call this method after custom DOM transformations that should be undoable
    handleCustomChange(operationType) {
        console.log('[UndoManager] Custom change detected:', operationType);
        if (!this.editor || !this.editor.editorEl) {
            console.warn('[UndoManager] Cannot handle custom change - editor or editorEl not available');
            return;
        }
        this.recordState(operationType);
    },

    /**
     * Clear the undo/redo history stack
     */
    clearHistory() {
        console.log('[UndoManager] History cleared');
        this.history = [];
        this.currentIndex = -1;
    },
};

export default undoManager;
