import editor from './editor.js'; // To access editorEl and selection utils if they live there
import utils from './utils.js'; // For getSelectionStateDetailed, restoreSelectionStateDetailed

const undoManager = {
    undoStack: [],
    redoStack: [],
    editorInstance: null,

    init(editorInst) {
        this.editorInstance = editorInst; // editor.js instance
        this.undoStack = [];
        this.redoStack = [];
    },

    add(beforeState, afterState) {
        if (!beforeState || !afterState) {
            console.warn("UndoManager: Attempted to add invalid state.");
            return;
        }
        this.undoStack.push({ undo: beforeState, redo: afterState });
        this.redoStack = []; // Clear redo stack on new action
        // console.log('UndoManager: Added state. Undo stack size:', this.undoStack.length);
    },

    undo() {
        if (this.undoStack.length === 0) {
            // console.log('UndoManager: Undo stack empty.');
            return false; // No undo operation performed
        }
        const state = this.undoStack.pop();
        this.redoStack.push(state);

        // console.log('UndoManager: Undoing. HTML to restore:', state.undo.html.substring(0,100));
        this.editorInstance.editorEl.innerHTML = state.undo.html;
        utils.restoreSelectionStateDetailed(this.editorInstance.editorEl, state.undo.selection);
        this.editorInstance.updateCaretDisplayAndSave(false); // Update display, don't save to prevent loop
        return true; // Undo operation performed
    },

    redo() {
        if (this.redoStack.length === 0) {
            // console.log('UndoManager: Redo stack empty.');
            return false; // No redo operation performed
        }
        const state = this.redoStack.pop();
        this.undoStack.push(state);

        // console.log('UndoManager: Redoing. HTML to restore:', state.redo.html.substring(0,100));
        this.editorInstance.editorEl.innerHTML = state.redo.html;
        utils.restoreSelectionStateDetailed(this.editorInstance.editorEl, state.redo.selection);
        this.editorInstance.updateCaretDisplayAndSave(false); // Update display, don't save
        return true; // Redo operation performed
    },

    clearRedoStack() {
        if (this.redoStack.length > 0) {
            // console.log('UndoManager: Clearing redo stack.');
            this.redoStack = [];
        }
    },
    
    // Optional: if needed for specific scenarios
    clearUndoStack() {
        if (this.undoStack.length > 0) {
            // console.log('UndoManager: Clearing undo stack.');
            this.undoStack = [];
        }
    },

    hasUndo() {
        return this.undoStack.length > 0;
    },

    hasRedo() {
        return this.redoStack.length > 0;
    }
};

export default undoManager;
