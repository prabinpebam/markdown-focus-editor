# Implementation Plan — Quotes, Code Blocks, Tables

> Gated implementation plan for three new block-level markdown features.
> Each gate has defined entry criteria, implementation tasks, and exit criteria.

---

## Execution Order

```
Gate 1: Block Quotes          (smallest scope — establishes the pattern for new block types)
    ↓
Gate 2: Code Blocks           (medium scope — introduces code editing sub-mode + tokenizer)
    ↓
Gate 3: Syntax Highlighter    (isolated — pure function, zero DOM coupling)
    ↓
Gate 4: Tables                (largest scope — introduces grid editing sub-mode)
    ↓
Gate 5: Converter Updates     (cross-cutting — paste + export for all three features)
    ↓
Gate 6: Focus Mode + Eval     (integration — ensure all new blocks work with SVG mask)
```

---

## Gate 1: Block Quotes

### Files Modified
| File | Changes |
|------|---------|
| `js/modules/editor.js` | Add `>` pattern detection in `handleInputFormatting()` |
| `js/modules/editor.js` | Handle Enter/Backspace inside `<blockquote>` in `handleKeyDown()` |
| `style/main.css` | Add `blockquote` styling (border-left, padding, dark theme) |

### Tasks
| # | Task | Detail |
|---|------|--------|
| G1-1 | Input trigger | Detect `/^(>{1,})\s+(.*)$/` in `handleInputFormatting`. Create `<blockquote>` wrapper with `<div>` child containing the text. Add `<span class="quote-marker">` |
| G1-2 | Enter in quote | New `<div>` inside the same `<blockquote>`. If current div is empty → exit quote (create `<div>` sibling after `<blockquote>`) |
| G1-3 | Backspace at start | Unwrap: promote `<div>` out of `<blockquote>`. If nested, reduce nesting by one level. If last child removed, delete `<blockquote>` |
| G1-4 | Nested quotes | `>>` creates `<blockquote>` inside `<blockquote>`. Cap at 5 levels |
| G1-5 | CSS styling | Left border (3px, translucent), padding-left 1em, slightly reduced opacity for text. Dark theme variant |
| G1-6 | Undo integration | Record state before and after quote creation via `undoManager` |

### Exit Criteria
- [ ] Type `> text` → creates blockquote with visible left border
- [ ] Enter inside quote → new line in same quote
- [ ] Enter on empty quote line → exits quote
- [ ] Backspace at start → unwraps quote
- [ ] `>> text` → nested blockquote (2 levels)
- [ ] Undo reverts to `> text` as plain text
- [ ] Light and dark theme styling correct

---

## Gate 2: Code Blocks

### Files Created
| File | Purpose |
|------|---------|
| `js/modules/codeBlockManager.js` | Code block creation, keyboard handling, exit logic |

### Files Modified
| File | Changes |
|------|---------|
| `js/modules/editor.js` | Delegate to codeBlockManager when caret is inside `.code-block` |
| `js/app.js` | Import and init `codeBlockManager` |
| `style/main.css` | Code block container, header, pre/code styling |

### Tasks
| # | Task | Detail |
|---|------|--------|
| G2-1 | Input trigger | Detect `` /^```(\w*)$/ `` on Enter. Create `.code-block` DOM structure. Place caret inside `<pre><code>` |
| G2-2 | Language resolution | Map aliases: `js`→`javascript`, `py`→`python`, `ts`→`typescript`, etc. Store in `data-language` |
| G2-3 | Keyboard: Enter | Insert `\n` inside `<pre>` (plain text newline, no `<div>`) |
| G2-4 | Keyboard: Tab | Insert 2 spaces (override default tab behavior when inside code block) |
| G2-5 | Keyboard: Shift+Tab | Remove up to 2 leading spaces on current line |
| G2-6 | Keyboard: Escape | Exit code block — create new `<div>` after `.code-block`, place caret there |
| G2-7 | Keyboard: Backspace | At start of empty code block → delete block. At start of non-empty → no-op |
| G2-8 | Disable markdown triggers | Inside code block: suppress heading, list, bold, italic, quote triggers. Raw text only |
| G2-9 | CSS styling | Rounded container, subtle border, monospace font, header with language label |
| G2-10 | Undo integration | Record state before/after code block creation |

### Exit Criteria
- [ ] Type `` ```js `` + Enter → creates code block with "javascript" label
- [ ] Type inside code block → monospace, no formatting triggers
- [ ] Tab → 2 spaces
- [ ] Enter → new line within pre
- [ ] Escape → exits code block
- [ ] Backspace on empty block → deletes block
- [ ] Light and dark theme styling correct
- [ ] `**bold**` typed inside code block stays as literal text

---

## Gate 3: Syntax Highlighter

### Files Created
| File | Purpose |
|------|---------|
| `js/modules/syntaxHighlighter.js` | Language grammars + tokenizer + token→HTML renderer |

### Files Modified
| File | Changes |
|------|---------|
| `js/modules/codeBlockManager.js` | Call `rehighlight()` on input (debounced 300ms) |
| `style/main.css` | Token classes (`.tok-keyword`, `.tok-string`, etc.) with grayscale colors |

### Tasks
| # | Task | Detail |
|---|------|--------|
| G3-1 | Tokenizer engine | `tokenize(code, language)` → array of `{type, text}` tokens. Regex-based, first-match-wins |
| G3-2 | JavaScript grammar | Keywords, strings, comments, numbers, functions, operators, punctuation |
| G3-3 | Python grammar | Keywords, strings (including triple-quote), comments (`#`), decorators (`@`) |
| G3-4 | HTML grammar | Tags, attributes, values, comments (`<!-- -->`), entities |
| G3-5 | CSS grammar | Selectors, properties, values, comments, at-rules |
| G3-6 | JSON grammar | Keys, strings, numbers, booleans, null, punctuation |
| G3-7 | Generic grammars | TypeScript (extend JS), Bash, SQL, YAML, Markdown, XML, C/C++/C#, Java, Rust, Go, Ruby, PHP |
| G3-8 | Plaintext fallback | No tokenization, just wrap in `<code>` |
| G3-9 | Token rendering | `tokensToHtml(tokens)` → HTML string with `<span class="tok-*">` wrappers |
| G3-10 | Grayscale CSS | 16 token classes with grayscale shades. Keywords bold, comments italic. Light + dark theme |
| G3-11 | Rehighlight integration | Debounce 300ms on input inside code block. Preserve caret position across re-render |
| G3-12 | Performance guard | Blocks over 500 lines → use `requestIdleCallback` for tokenization |

### Exit Criteria
- [ ] JavaScript code block shows keywords in bold, comments in italic, all in grey shades
- [ ] Python code block tokenizes correctly (triple-quote strings, decorators)
- [ ] Changing language (editing header) re-tokenizes with correct grammar
- [ ] No visible caret jump after re-highlight
- [ ] Unknown language defaults to plaintext (no tokenization)
- [ ] Performance: 200 lines of code tokenizes in under 16ms

---

## Gate 4: Tables

### Files Created
| File | Purpose |
|------|---------|
| `js/modules/tableManager.js` | Table creation, cell navigation, row/column operations |

### Files Modified
| File | Changes |
|------|---------|
| `js/modules/editor.js` | Delegate to tableManager when caret is inside `.table-block` |
| `js/app.js` | Import and init `tableManager` |
| `style/main.css` | Table grid styling, cell editing state, control buttons |

### Tasks
| # | Task | Detail |
|---|------|--------|
| G4-1 | Input trigger | Detect pipe-separated header line + separator line on Enter. Parse cells and alignment |
| G4-2 | Table DOM creation | Build `.table-block > table > thead + tbody`. Header in `<th>`, data in `<td>`. Controls div |
| G4-3 | Cell editing | Click/Tab into cell → make `contenteditable="true"`, add `.cell-editing` class. Only one cell editable at a time |
| G4-4 | Tab navigation | Tab → next cell (wrap to next row). Shift+Tab → previous cell. Tab from last cell → add new row |
| G4-5 | Enter in cell | Create new row below current, move to first cell of new row |
| G4-6 | Arrow key navigation | Up/Down → same column adjacent row. Left/Right at cell boundary → adjacent cell |
| G4-7 | Escape | Exit table — new `<div>` after table, caret there |
| G4-8 | Add row button | Append empty row at bottom |
| G4-9 | Add column button | Append new column to all rows (new `<th>` + `<td>` per row) |
| G4-10 | Delete row | Remove current row. If last data row, keep empty first data row |
| G4-11 | Delete column | Remove column at index from all rows. If last column, delete table |
| G4-12 | Inline styles in cells | Bold, italic, strikethrough work inside editable cells |
| G4-13 | Alignment | Parse `:---`, `:---:`, `---:` from separator. Apply `text-align` and `data-align` |
| G4-14 | CSS styling | Borders, header background, cell editing outline, dark theme, control button hover/show |
| G4-15 | Undo integration | Record state before/after table creation and structural edits |

### Exit Criteria
- [ ] Type `| A | B |` then `|---|---|` + Enter → creates 2-column table
- [ ] Tab moves between cells, wrapping rows
- [ ] Enter creates new row
- [ ] Escape exits table
- [ ] `+` buttons add rows and columns
- [ ] Inline formatting (**bold**, *italic*) works in cells
- [ ] Alignment (`:---:`) centers column text
- [ ] Light and dark theme styling correct
- [ ] Undo reverts table creation to pipe-text

---

## Gate 5: Converter Updates

### Files Modified
| File | Changes |
|------|---------|
| `js/modules/markdownConverter.js` | Add quote, code block, and table handling in both directions |
| `js/modules/clipboardManager.js` | Handle copy/paste for new block types |

### Tasks
| # | Task | Detail |
|---|------|--------|
| G5-1 | Paste: block quotes | Detect `> ` prefixed lines → create `<blockquote>` DOM |
| G5-2 | Paste: code blocks | Detect `` ``` `` fences → create `.code-block` DOM with language and highlighting |
| G5-3 | Paste: tables | Detect pipe-separated lines with separator → create `.table-block` DOM |
| G5-4 | Export: block quotes | `<blockquote>` → `> ` prefix per line. Nested → `>> ` |
| G5-5 | Export: code blocks | `.code-block` → `` ```lang\ncode\n``` ``. Strip all `<span class="tok-*">` |
| G5-6 | Export: tables | `.table-block` → pipe-separated rows with column padding and alignment markers |
| G5-7 | Copy: block quotes | Clipboard `text/plain` gets `> ` prefixed markdown |
| G5-8 | Copy: code blocks | Clipboard `text/plain` gets raw code (no fences). `text/html` gets styled HTML |
| G5-9 | Copy: tables | Clipboard `text/plain` gets pipe-separated markdown table |

### Exit Criteria
- [ ] Paste markdown with `>` quotes → renders as blockquote
- [ ] Paste markdown with `` ``` `` code → renders as code block with highlighting
- [ ] Paste markdown with `|` table → renders as table grid
- [ ] Export to .md → all three block types produce valid CommonMark/GFM markdown
- [ ] Copy from quote/code/table → clipboard has correct markdown

---

## Gate 6: Focus Mode + Eval Loop

### Files Modified
| File | Changes |
|------|---------|
| `js/modules/focusMode.js` | Treat `.code-block`, `.table-block`, `<blockquote>` as single focus units |
| `eval-loop/capture-fn.js` | Capture new block types in DOM snapshots |

### Tasks
| # | Task | Detail |
|---|------|--------|
| G6-1 | Focus mode: quotes | Individual `<div>` lines inside `<blockquote>` are focus targets (same as heading children) |
| G6-2 | Focus mode: code blocks | `.code-block` is a single focus unit — entire block bright or dimmed |
| G6-3 | Focus mode: tables | `.table-block` is a single focus unit |
| G6-4 | SVG mask sizing | Ensure mask rectangle computation handles new block types' bounding boxes |
| G6-5 | Capture function | Update `CAPTURE_FN` to detect and report `blockquote`, `code-block`, `table-block` in snapshots |
| G6-6 | New eval scenarios | Add eval loop test cases for all new block types |
| G6-7 | Regression run | Full 132+ existing tests must remain CLEAN |

### Exit Criteria
- [ ] Focus mode dims all blocks except the one containing the caret
- [ ] Code blocks and tables dim/brighten as single units
- [ ] Quote inner lines focus individually
- [ ] All 132+ existing eval tests CLEAN
- [ ] New eval tests for quotes, code blocks, tables all CLEAN

---

## Dependency Graph

```
Gate 1 (Quotes)       ──┐
                        ├── Gate 5 (Converters) ── Gate 6 (Focus + Eval)
Gate 2 (Code Blocks)  ──┤
  └── Gate 3 (Highlighter)
                        │
Gate 4 (Tables)       ──┘
```

- Gates 1, 2, 4 are **independent** — can be implemented in any order
- Gate 3 **depends on** Gate 2 (code block DOM must exist before highlighting)
- Gate 5 **depends on** Gates 1, 2, 4 (all block types must exist before converters)
- Gate 6 **depends on** Gate 5 (converters must work before integration testing)

---

## Estimated Complexity

| Gate | New Files | Modified Files | New CSS Lines | Complexity |
|------|-----------|----------------|---------------|------------|
| G1 Quotes | 0 | 2 | ~30 | Low |
| G2 Code Blocks | 1 | 3 | ~60 | Medium |
| G3 Highlighter | 1 | 2 | ~80 | Medium-High |
| G4 Tables | 1 | 3 | ~100 | High |
| G5 Converters | 0 | 2 | 0 | Medium |
| G6 Focus + Eval | 0 | 2+ | 0 | Medium |
| **TOTAL** | **3** | **~14** | **~270** | — |
