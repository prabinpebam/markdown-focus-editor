const undoManager = {
    editor: null,
    history: [],
    currentIndex: -1,
    maxHistorySize: 50, // Maximum number of states to keep

    init(editorInstance) {
        this.editor = editorInstance;
        // console.log('UndoManager initialized');
        // It's crucial to record the initial state AFTER editor content is loaded.
        // This might be called from editor.js after storage.loadSettings() or initial content setup.
    },

    recordInitialState() {
        if (!this.editor || !this.editor.editorEl || this.history.length > 0) return; // Only record if history is empty
        this.recordState("initialLoad");
        // console.log('[UndoManager] Initial state recorded.');
    },

    recordState(operationType = 'unknown') {
        if (!this.editor || !this.editor.editorEl) return;

        const currentState = this.editor.editorEl.innerHTML;
        const currentCaret = this.editor.getAbsoluteCaretPosition();

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

        this.history.push({ html: currentState, caret: currentCaret, operation: operationType });
        this.currentIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift(); // Remove the oldest state
            this.currentIndex--; // Adjust current index
        }
        // console.log(`[UndoManager] State recorded (${operationType}). History size: ${this.history.length}, Index: ${this.currentIndex}`);
    },

    undo() {
        if (!this.editor || !this.editor.editorEl) return false;
        if (this.currentIndex <= 0) { 
            // console.log('[UndoManager] Nothing to undo or at initial state.');
            return false;
        }

        this.currentIndex--;
        const previousState = this.history[this.currentIndex];
        this.editor.editorEl.innerHTML = previousState.html;
        this.editor.restoreCaret(previousState.caret);
        // console.log(`[UndoManager] Undo performed. Index: ${this.currentIndex}`);
        this.editor.updateCaretDisplayAndSave(); // Update display after undo
        this.editor.applyFocusAndSave(previousState.caret, true); // Re-apply focus
        return true;
    },

    redo() {
        if (!this.editor || !this.editor.editorEl) return false;
        if (this.currentIndex >= this.history.length - 1) {
            // console.log('[UndoManager] Nothing to redo.');
            return false;
        }

        this.currentIndex++;
        const nextState = this.history[this.currentIndex];
        this.editor.editorEl.innerHTML = nextState.html;
        this.editor.restoreCaret(nextState.caret);
        // console.log(`[UndoManager] Redo performed. Index: ${this.currentIndex}`);
        this.editor.updateCaretDisplayAndSave(); // Update display after redo
        this.editor.applyFocusAndSave(nextState.caret, true); // Re-apply focus
        return true;
    },

    // Call this method after custom DOM transformations that should be undoable
    handleCustomChange(operationType) {
        // console.log(`[UndoManager] handleCustomChange called for: ${operationType}`);
        this.recordState(operationType);
    }
};

export default undoManager;
