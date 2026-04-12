# Tables — Implementation Spec

> Feature: GFM-style markdown tables with live input trigger, visual grid rendering, and keyboard-driven cell navigation.

---

## 1. Overview

Tables use pipe (`|`) and dash (`-`) syntax from GitHub Flavored Markdown (GFM). This spec defines:
- **Input trigger**: Typing `| Header |` pattern creates a table
- **DOM structure**: HTML `<table>` with proper `<thead>` / `<tbody>`
- **Cell navigation**: Tab/Shift+Tab between cells, Enter for new row
- **Column alignment**: Left, center, right via `:---`, `:---:`, `---:`
- **Visual styling**: Minimal grid matching the editor's aesthetic
- **Round-trip**: Markdown ↔ editor HTML

---

## 2. Syntax Definition

### 2.1 Basic Table
```markdown
| Name | Age |
|------|-----|
| Alice | 30 |
| Bob   | 25 |
```

### 2.2 Alignment
```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| L    |   C    |     R |
```

### 2.3 Inline Formatting in Cells
```markdown
| Feature | Status |
|---------|--------|
| **Bold** cell | `code` cell |
| *italic* | ~~struck~~ |
```

### 2.4 Minimum Table
```markdown
| A |
|---|
| 1 |
```

---

## 3. DOM Structure

### 3.1 Table HTML
```html
<div class="table-block" contenteditable="false">
  <table>
    <thead>
      <tr>
        <th data-align="left">Name</th>
        <th data-align="left">Age</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alice</td>
        <td>30</td>
      </tr>
      <tr>
        <td>Bob</td>
        <td>25</td>
      </tr>
    </tbody>
  </table>
  <div class="table-controls" contenteditable="false">
    <button class="add-row" title="Add row">+</button>
    <button class="add-col" title="Add column">+</button>
  </div>
</div>
```

### 3.2 Structure Breakdown

| Element | Purpose |
|---------|---------|
| `.table-block` | Non-editable wrapper (prevents contenteditable from mangling table) |
| `<table>` | Standard HTML table |
| `<thead>` | Header row (always exactly one row) |
| `<th>` | Header cells, `data-align` attribute for alignment |
| `<tbody>` | Data rows |
| `<td>` | Data cells (individually editable) |
| `.table-controls` | Add row / add column buttons |

### 3.3 Cell Editing
Individual cells are made editable via focused editing mode:
```html
<!-- When a cell is selected for editing -->
<td class="cell-editing" contenteditable="true">Alice</td>
```
Only one cell is editable at a time. Clicking a cell or navigating to it via Tab makes it editable.

---

## 4. Input Trigger

### 4.1 Table Creation Flow

**Method 1: Header row trigger**
```
1. User types: | Name | Age |
2. Presses Enter
3. Editor detects pipe-separated pattern: /^\|(.+\|)+\s*$/
4. Auto-generates separator row: |------|-----|
5. Creates table DOM with header and one empty data row
6. Caret placed in first data cell
```

**Method 2: Header + separator trigger**
```
1. User types:
   | Name | Age |
   |------|-----|
2. Presses Enter after separator row
3. Editor detects complete table header pattern
4. Creates table DOM, caret in first data cell
```

### 4.2 Detection Regex
```javascript
// Header row: at least one pipe-separated cell
const TABLE_HEADER = /^\|(.+\|)+\s*$/;

// Separator row: pipes with dashes (and optional colons for alignment)
const TABLE_SEPARATOR = /^\|(\s*:?-+:?\s*\|)+\s*$/;

// Alignment detection per cell
const ALIGN_LEFT   = /^:?-+$/;     // --- or :---
const ALIGN_CENTER = /^:-+:$/;     // :---:
const ALIGN_RIGHT  = /^-+:$/;      // ---:
```

### 4.3 Processing (in editor.js or tableManager.js)
```
1. On Enter key, check if current line + previous line form a table header
2. Parse header cells by splitting on |
3. Parse separator to determine column count and alignment
4. Create DOM: .table-block > table > thead + tbody
5. Remove the markdown text lines
6. Insert table DOM at that position
7. Place caret in first tbody td
```

---

## 5. Keyboard Behavior

### 5.1 Cell Navigation

| Key | Context | Result |
|-----|---------|--------|
| Tab | Inside a cell | Move to next cell (left→right, then next row) |
| Shift+Tab | Inside a cell | Move to previous cell |
| Tab | In last cell of last row | Create new row, move to first cell |
| Enter | Inside a cell | Create new row below current, move to first cell of new row |
| Escape | Inside a cell | Exit table — caret to new div after table |
| Arrow Right | At end of cell text | Move to next cell |
| Arrow Left | At start of cell text | Move to previous cell |
| Arrow Down | Inside a cell | Move to same column in next row |
| Arrow Up | Inside a cell | Move to same column in previous row |

### 5.2 Table-Level Operations

| Key | Context | Result |
|-----|---------|--------|
| Backspace | In empty cell, only row left | Delete table entirely |
| Backspace | At start of first cell, on empty line before table | No-op (don't break table) |
| Delete row | Context menu or keyboard shortcut (TBD) | Remove current row |
| Delete column | Context menu or keyboard shortcut (TBD) | Remove current column |

### 5.3 Outside Table

| Key | Context | Result |
|-----|---------|--------|
| Arrow Down | On line before table | Enter first header cell |
| Arrow Up | On line after table | Enter last body cell |
| Backspace | On empty line after table | Remove empty line, stay outside |

---

## 6. Visual Styling

```css
.table-block {
    margin: 1em 0;
    overflow-x: auto;
}

.table-block table {
    border-collapse: collapse;
    width: auto;
    min-width: 200px;
    font-size: 0.95em;
}

.table-block th,
.table-block td {
    border: 1px solid rgba(0, 0, 0, 0.12);
    padding: 6px 12px;
    text-align: left;
    min-width: 60px;
    vertical-align: top;
}

.table-block th {
    font-weight: 600;
    background: rgba(0, 0, 0, 0.03);
}

.table-block td.cell-editing {
    outline: 2px solid rgba(0, 0, 0, 0.2);
    outline-offset: -2px;
    background: rgba(0, 0, 0, 0.02);
}

/* Alignment */
.table-block [data-align="center"],
.table-block td:nth-child(/* dynamic */) { text-align: center; }
.table-block [data-align="right"] { text-align: right; }

/* Dark theme */
.dark-theme .table-block th,
.dark-theme .table-block td {
    border-color: rgba(255, 255, 255, 0.12);
}

.dark-theme .table-block th {
    background: rgba(255, 255, 255, 0.04);
}

.dark-theme .table-block td.cell-editing {
    outline-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.03);
}

/* Table control buttons */
.table-controls {
    display: flex;
    gap: 4px;
    margin-top: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.table-block:hover .table-controls,
.table-block:focus-within .table-controls {
    opacity: 1;
}

.table-controls button {
    width: 24px;
    height: 24px;
    border: 1px dashed rgba(0, 0, 0, 0.2);
    background: transparent;
    color: rgba(0, 0, 0, 0.4);
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.table-controls button:hover {
    border-style: solid;
    background: rgba(0, 0, 0, 0.05);
}

.dark-theme .table-controls button {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.4);
}
```

---

## 7. Conversion

### 7.1 markdownToEditorHtml (Paste/Import)
```
Input:
  | Name | Age |
  |------|-----|
  | Alice | 30 |

Output:
  <div class="table-block" contenteditable="false">
    <table>
      <thead><tr><th>Name</th><th>Age</th></tr></thead>
      <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
    </table>
  </div>
```

Processing steps:
1. Detect consecutive lines matching `TABLE_HEADER` + `TABLE_SEPARATOR` + data rows
2. Parse header cells from first line
3. Parse alignment from separator line
4. Parse data cells from remaining lines
5. Build table DOM

### 7.2 editorHtmlToMarkdown (Export/Save)
```
Input:  <div class="table-block"><table>...</table></div>

Output:
  | Name  | Age |
  |-------|-----|
  | Alice | 30  |
```

Processing steps:
1. Traverse `<table>` children
2. Extract cell text from `<th>` and `<td>`
3. Calculate max column widths for padding
4. Generate pipe-separated rows with padding
5. Generate separator row with `---` matching column widths
6. Apply alignment markers (`:`) from `data-align`

### 7.3 Column Width Padding
Export pads cells to align columns visually:
```markdown
| Name  | Age | City      |
|-------|-----|-----------|
| Alice | 30  | New York  |
| Bob   | 25  | London    |
```

---

## 8. Focus Mode Integration

- The entire `.table-block` is treated as a **single focus unit** (same as code blocks)
- When any cell is focused, the entire table is bright
- The SVG mask rectangle covers the full bounding box of `.table-block`
- Individual cells/rows are NOT separately focusable in focus mode

---

## 9. Inline Formatting in Cells

Cells support the same inline formatting as regular text:
- **Bold**: `**text**` → `<b>text</b>`
- **Italic**: `*text*` → `<i>text</i>`
- **Strikethrough**: `~~text~~` → `<s>text</s>`
- **Inline code**: `` `code` `` → `<code>code</code>`

The inline style manager should work within editable cells, detecting the `<td>` context.

---

## 10. Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | `\|` in middle of text, not table | No trigger — requires pipe at start AND end |
| 2 | Single column table `\| A \|` | Valid — creates 1-column table |
| 3 | Mismatched column counts between rows | Pad shorter rows with empty cells |
| 4 | Empty cells `\| \| \|` | Valid — creates cells with no content |
| 5 | Header only, no data rows | Create table with empty first data row |
| 6 | Very long cell content | Cell expands, no truncation |
| 7 | Table with 20+ columns | Horizontal scroll via `.table-block { overflow-x: auto }` |
| 8 | Paste pipe-separated text | Detect and offer to convert to table |
| 9 | Copy table selection | Clipboard gets markdown table syntax |
| 10 | Delete all rows | Delete entire table, replace with empty div |
| 11 | Undo table creation | Revert to pipe-separated text in divs |
| 12 | Table immediately after heading | Table is sibling, not child of heading |
| 13 | Separator row without header | NOT a table — treat as horizontal rule or text |

---

## 11. Module Structure

### New file: `js/modules/tableManager.js`

```
Exports:
  - init(editor)                       // Attach to editor instance
  - handleTableInput(lines)            // Check if lines form a table trigger
  - createTable(headers, alignments)   // Create table DOM structure
  - addRow(table)                      // Append new row
  - addColumn(table)                   // Append new column
  - deleteRow(table, rowIndex)         // Remove row
  - deleteColumn(table, colIndex)      // Remove column
  - navigateCell(direction)            // Move between cells
  - exitTable(table)                   // Move caret out of table
  - getCellAt(table, row, col)         // Get specific cell element
  - tableToMarkdown(tableElement)      // Convert table DOM to markdown string
```

---

## 12. Accessibility

- `<table>` is natively accessible — screen readers announce rows/columns
- `<th>` elements define column headers — read by screen readers on cell focus
- Tab navigation follows standard table patterns
- `aria-label` on `.table-block`: "Markdown table with N columns and M rows"
- Active cell has `aria-selected="true"`
- Add row/column buttons have proper `title` and `aria-label`
