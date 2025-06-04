const utils = {
    // Example: Get the caret position within a contenteditable element
    getCaretPosition(editableDiv) {
        let caretPos = 0, sel, range;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.rangeCount) {
                range = sel.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(editableDiv);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                caretPos = preCaretRange.toString().length;
            }
        }
        return caretPos;
    },
    log(msg, type = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
        const prefix = type === 'error' ? '🔴' : type === 'warning' ? '🟠' : '🔵';
        console.log(`${prefix} [${timestamp}] ${msg}`);
    }
};

export default utils;
