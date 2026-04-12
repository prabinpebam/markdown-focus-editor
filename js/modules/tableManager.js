/**
 * tableManager.js — Handles GFM-style markdown table creation, cell navigation, and editing.
 *
 * Input trigger: Type a pipe-separated header row, then a separator row (|---|---|),
 * then press space/enter. The two lines are detected and converted to an HTML table.
 * Tab navigates between cells. Enter adds a new row. Escape exits the table.
 */

const tableManager = {
    editor: null,

    // Header row: at least one pipe-separated cell
    headerRegex: /^\|(.+\|)+\s*$/,
    // Separator row: pipes with dashes (and optional colons for alignment)
    separatorRegex: /^\|(\s*:?-+:?\s*\|)+\s*$/,

    init(editorInstance) {
        this.editor = editorInstance;
        console.log('[TableManager] Initialized');
    },

    /**
     * Check if the current input (plus previous line) forms a table trigger.
     * Called from editor.attemptBlockTransformations().
     * @param {Element} blockNode - The current DIV block (should be the separator row)
     * @param {string} textContent - The text content of the block
     * @returns {boolean} - True if transformation occurred
     */
    tryTransformToTable(blockNode, textContent) {
        if (!this.editor || blockNode.tagName !== 'DIV') return false;

        // Check if this line is a separator row
        if (!this.separatorRegex.test(textContent)) return false;

        // Check if the previous sibling is a header row
        const prevBlock = blockNode.previousElementSibling;
        if (!prevBlock || prevBlock.tagName !== 'DIV') return false;

        const headerText = prevBlock.textContent;
        if (!this.headerRegex.test(headerText)) return false;

        // Parse header cells
        const headers = this._parseCells(headerText);
        if (headers.length === 0) return false;

        // Parse alignment from separator
        const alignments = this._parseAlignments(textContent);

        // Pad alignments to match header count
        while (alignments.length < headers.length) {
            alignments.push('left');
        }

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeTable');
        }

        // Create table DOM
        const tableBlock = this._createTableElement(headers, alignments);

        // Replace both the header div and separator div
        prevBlock.remove();
        blockNode.replaceWith(tableBlock);

        // Place caret in first data cell
        const firstTd = tableBlock.querySelector('tbody td');
        if (firstTd) {
            this._activateCell(firstTd);
        }

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('createTable');
        }

        console.log(`[TableManager] Created table with ${headers.length} columns`);
        return true;
    },

    /**
     * Parse cells from a pipe-separated line.
     * "| Name | Age |" → ["Name", "Age"]
     */
    _parseCells(line) {
        return line.split('|')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    },

    /**
     * Parse column alignments from a separator line.
     * "|:---|:---:|---:|" → ["left", "center", "right"]
     */
    _parseAlignments(line) {
        return line.split('|')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(cell => {
                const left = cell.startsWith(':');
                const right = cell.endsWith(':');
                if (left && right) return 'center';
                if (right) return 'right';
                return 'left';
            });
    },

    /**
     * Create the table DOM structure.
     */
    _createTableElement(headers, alignments) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-block';

        const table = document.createElement('table');

        // Header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach((text, i) => {
            const th = document.createElement('th');
            th.textContent = text;
            th.setAttribute('data-align', alignments[i] || 'left');
            th.style.textAlign = alignments[i] || 'left';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // One empty data row
        const tbody = document.createElement('tbody');
        const dataRow = document.createElement('tr');
        headers.forEach((_, i) => {
            const td = document.createElement('td');
            td.innerHTML = '<br>';
            td.style.textAlign = alignments[i] || 'left';
            dataRow.appendChild(td);
        });
        tbody.appendChild(dataRow);

        table.appendChild(thead);
        table.appendChild(tbody);
        wrapper.appendChild(table);

        return wrapper;
    },

    /**
     * Check if the caret is currently inside a table block.
     * @returns {Element|null} - The .table-block element, or null
     */
    getActiveTable() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return null;

        let node = sel.anchorNode;
        while (node && node !== this.editor?.editorEl) {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('table-block')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    },

    /**
     * Get the currently active cell (td or th) from the selection.
     */
    _getActiveCell() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return null;

        let node = sel.anchorNode;
        while (node) {
            if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'TD' || node.tagName === 'TH')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    },

    /**
     * Make a cell editable and place caret in it.
     */
    _activateCell(cell) {
        // Deactivate any previously active cell
        const tableBlock = cell.closest('.table-block');
        if (tableBlock) {
            tableBlock.querySelectorAll('.cell-editing').forEach(c => {
                c.classList.remove('cell-editing');
                c.setAttribute('contenteditable', 'false');
            });
        }

        cell.classList.add('cell-editing');
        cell.setAttribute('contenteditable', 'true');
        cell.focus();

        // Place caret at end of cell content
        const sel = window.getSelection();
        const rng = document.createRange();
        if (cell.lastChild && cell.lastChild.nodeType === Node.TEXT_NODE) {
            rng.setStart(cell.lastChild, cell.lastChild.textContent.length);
        } else {
            rng.selectNodeContents(cell);
            rng.collapse(false);
        }
        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);
    },

    /**
     * Handle keydown events when caret is inside a table.
     * Returns true if the event was handled.
     * @param {KeyboardEvent} e
     * @param {Element} tableBlock - The .table-block element
     * @returns {boolean}
     */
    handleKeyDown(e, tableBlock) {
        const cell = this._getActiveCell();
        if (!cell) return false;

        const table = tableBlock.querySelector('table');
        if (!table) return false;

        // Escape — exit table
        if (e.key === 'Escape') {
            e.preventDefault();
            this._exitTable(tableBlock);
            return true;
        }

        // Tab — navigate to next cell
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            this._navigateToNextCell(table, cell);
            return true;
        }

        // Shift+Tab — navigate to previous cell
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            this._navigateToPrevCell(table, cell);
            return true;
        }

        // Enter — create new row
        if (e.key === 'Enter') {
            e.preventDefault();
            this._addRowAfter(table, cell);
            return true;
        }

        // Arrow Down — move to same column in next row
        if (e.key === 'ArrowDown') {
            const nextCell = this._getCellBelow(table, cell);
            if (nextCell) {
                e.preventDefault();
                this._activateCell(nextCell);
                return true;
            }
        }

        // Arrow Up — move to same column in previous row
        if (e.key === 'ArrowUp') {
            const prevCell = this._getCellAbove(table, cell);
            if (prevCell) {
                e.preventDefault();
                this._activateCell(prevCell);
                return true;
            }
        }

        // Backspace in empty cell that's the only data row — delete table
        if (e.key === 'Backspace') {
            const tbody = table.querySelector('tbody');
            const rows = tbody ? tbody.querySelectorAll('tr') : [];
            const isEmpty = !cell.textContent.trim() && (cell.innerHTML.trim() === '<br>' || cell.innerHTML.trim() === '');
            const isOnlyRow = rows.length <= 1;
            const allEmpty = isOnlyRow && Array.from(rows[0]?.children || []).every(
                c => !c.textContent.trim()
            );

            if (isEmpty && allEmpty) {
                e.preventDefault();
                this._deleteTable(tableBlock);
                return true;
            }
        }

        return false; // Let browser handle other keys (typing in cell)
    },

    /**
     * Handle click on a table cell — activate it for editing.
     * @param {Event} e
     * @param {Element} tableBlock
     */
    handleClick(e, tableBlock) {
        const cell = e.target.closest('td, th');
        if (cell && tableBlock.contains(cell)) {
            this._activateCell(cell);
        }
    },

    /**
     * Navigate to the next cell (left→right, then next row). If last cell, add new row.
     */
    _navigateToNextCell(table, currentCell) {
        const allCells = this._getAllCells(table);
        const idx = allCells.indexOf(currentCell);

        if (idx < allCells.length - 1) {
            this._activateCell(allCells[idx + 1]);
        } else {
            // Last cell — add new row and navigate to its first cell
            this._addRowAfter(table, currentCell);
        }
    },

    /**
     * Navigate to the previous cell.
     */
    _navigateToPrevCell(table, currentCell) {
        const allCells = this._getAllCells(table);
        const idx = allCells.indexOf(currentCell);

        if (idx > 0) {
            this._activateCell(allCells[idx - 1]);
        }
    },

    /**
     * Get the cell in the same column in the row below.
     */
    _getCellBelow(table, currentCell) {
        const row = currentCell.parentNode;
        const colIndex = Array.from(row.children).indexOf(currentCell);
        const nextRow = row.nextElementSibling ||
            (row.parentNode.tagName === 'THEAD' ? table.querySelector('tbody tr') : null);

        if (nextRow) {
            return nextRow.children[colIndex] || null;
        }
        return null;
    },

    /**
     * Get the cell in the same column in the row above.
     */
    _getCellAbove(table, currentCell) {
        const row = currentCell.parentNode;
        const colIndex = Array.from(row.children).indexOf(currentCell);

        let prevRow = row.previousElementSibling;
        if (!prevRow && row.parentNode.tagName === 'TBODY') {
            // Jump to thead
            const thead = table.querySelector('thead');
            prevRow = thead ? thead.querySelector('tr') : null;
        }

        if (prevRow) {
            return prevRow.children[colIndex] || null;
        }
        return null;
    },

    /**
     * Get all cells in order (thead then tbody, row by row).
     */
    _getAllCells(table) {
        const cells = [];
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        if (thead) {
            thead.querySelectorAll('th, td').forEach(c => cells.push(c));
        }
        if (tbody) {
            tbody.querySelectorAll('td').forEach(c => cells.push(c));
        }
        return cells;
    },

    /**
     * Add a new row after the current cell's row.
     */
    _addRowAfter(table, currentCell) {
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeTableAddRow');
        }

        const currentRow = currentCell.parentNode;
        const colCount = table.querySelector('thead tr')?.children.length || currentRow.children.length;
        const tbody = table.querySelector('tbody');

        const newRow = document.createElement('tr');
        for (let i = 0; i < colCount; i++) {
            const td = document.createElement('td');
            td.innerHTML = '<br>';
            // Copy alignment from header
            const th = table.querySelector(`thead th:nth-child(${i + 1})`);
            if (th) {
                td.style.textAlign = th.style.textAlign || 'left';
            }
            newRow.appendChild(td);
        }

        // Insert after current row (if in tbody), or as first tbody row
        if (currentRow.parentNode === tbody) {
            if (currentRow.nextSibling) {
                tbody.insertBefore(newRow, currentRow.nextSibling);
            } else {
                tbody.appendChild(newRow);
            }
        } else {
            // Current row is in thead — add to start of tbody
            if (tbody.firstChild) {
                tbody.insertBefore(newRow, tbody.firstChild);
            } else {
                tbody.appendChild(newRow);
            }
        }

        // Activate first cell of new row
        this._activateCell(newRow.children[0]);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('tableAddRow');
        }

        console.log('[TableManager] Added new row');
    },

    /**
     * Exit table — create new <div> after the table-block and place caret there.
     */
    _exitTable(tableBlock) {
        // Deactivate current cell
        tableBlock.querySelectorAll('.cell-editing').forEach(c => {
            c.classList.remove('cell-editing');
            c.setAttribute('contenteditable', 'false');
        });

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeTableExit');
        }

        const newDiv = document.createElement('div');
        newDiv.innerHTML = '<br>';
        tableBlock.parentNode.insertBefore(newDiv, tableBlock.nextSibling);

        const sel = window.getSelection();
        const rng = document.createRange();
        rng.setStart(newDiv, 0);
        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('tableExit');
        }

        console.log('[TableManager] Exited table');
    },

    /**
     * Delete the entire table and place caret in adjacent block.
     */
    _deleteTable(tableBlock) {
        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('beforeTableDelete');
        }

        const prev = tableBlock.previousElementSibling;
        const next = tableBlock.nextElementSibling;
        tableBlock.remove();

        let target = prev || next;
        if (!target) {
            target = document.createElement('div');
            target.innerHTML = '<br>';
            this.editor.editorEl.appendChild(target);
        }

        const sel = window.getSelection();
        const rng = document.createRange();
        if (target.lastChild && target.lastChild.nodeType === Node.TEXT_NODE) {
            rng.setStart(target.lastChild, target.lastChild.textContent.length);
        } else {
            rng.setStart(target, 0);
        }
        rng.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rng);

        if (this.editor.undoManager) {
            this.editor.undoManager.handleCustomChange('tableDelete');
        }

        console.log('[TableManager] Deleted table');
    },
};

export default tableManager;
