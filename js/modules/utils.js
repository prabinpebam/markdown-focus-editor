const utils = {
    /**
     * Gets a serializable representation of the current selection within an element.
     * @param {HTMLElement} editorEl - The editor element.
     * @returns {object|null} Selection state or null if no selection.
     */
    getSelectionStateDetailed(editorEl) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        const range = sel.getRangeAt(0);

        function getNodePath(node, root) {
            const path = [];
            let currentNode = node;
            while (currentNode && currentNode !== root) {
                const parent = currentNode.parentNode;
                if (!parent) return null; // Node not within root
                path.unshift(Array.from(parent.childNodes).indexOf(currentNode));
                currentNode = parent;
            }
            return currentNode === root ? path : null; // Return path if found, else null
        }

        const anchorPath = getNodePath(range.startContainer, editorEl);
        const focusPath = getNodePath(range.endContainer, editorEl);

        // If paths are null, it means selection is outside editorEl or structure is unexpected
        if (anchorPath === null || focusPath === null) {
            // console.warn("Could not get node path for selection, possibly outside editor.");
            return null; 
        }

        return {
            anchorPath: anchorPath,
            anchorOffset: range.startOffset,
            focusPath: focusPath,
            focusOffset: range.endOffset,
            isCollapsed: range.collapsed
        };
    },

    /**
     * Restores a selection state within an element.
     * @param {HTMLElement} editorEl - The editor element.
     * @param {object} selectionState - The state to restore.
     */
    restoreSelectionStateDetailed(editorEl, selectionState) {
        if (!selectionState || !selectionState.anchorPath || !selectionState.focusPath) {
            // console.warn("Invalid selectionState provided for restoration.");
            editorEl.focus(); // Fallback: just focus the editor
            return;
        }

        function getNodeFromPath(path, root) {
            let node = root;
            for (const index of path) {
                if (index < 0 || index >= node.childNodes.length) return null; // Path invalid
                node = node.childNodes[index];
            }
            return node;
        }

        const anchorNode = getNodeFromPath(selectionState.anchorPath, editorEl);
        const focusNode = getNodeFromPath(selectionState.focusPath, editorEl);

        if (!anchorNode || !focusNode) {
            console.warn("Could not find nodes from path for selection restoration.");
            editorEl.focus(); // Fallback
            return;
        }

        const sel = window.getSelection();
        const range = document.createRange();

        try {
            const maxAnchorOffset = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.nodeValue.length : anchorNode.childNodes.length;
            const maxFocusOffset = focusNode.nodeType === Node.TEXT_NODE ? focusNode.nodeValue.length : focusNode.childNodes.length;

            range.setStart(anchorNode, Math.min(selectionState.anchorOffset, maxAnchorOffset));
            if (selectionState.isCollapsed) {
                range.collapse(true);
            } else {
                range.setEnd(focusNode, Math.min(selectionState.focusOffset, maxFocusOffset));
            }
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {
            console.error("Error restoring selection:", e);
            editorEl.focus(); // Fallback
        }
    }
};

export default utils;
