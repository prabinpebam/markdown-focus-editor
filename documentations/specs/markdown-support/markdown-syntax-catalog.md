# Markdown Syntax Catalog — Complete Support Matrix

> Exhaustive catalog of all CommonMark + GFM syntax elements.
> Each entry: syntax, trigger, HTML output, and current support status.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ INPUT | Typing the syntax transforms it live in the editor |
| ✅ PASTE | Pasting markdown from external source converts correctly |
| ✅ EXPORT | Editor HTML exports to correct markdown |
| ❌ | Not supported at all |
| 🔶 PARTIAL | Conversion exists but input trigger is missing |

---

## 1. Block-Level Elements

### 1.1 Headings

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.1.1 | `# Heading 1` | Type `# ` + text | ✅ | ✅ | ✅ INPUT |
| 1.1.2 | `## Heading 2` | Type `## ` + text | ✅ | ✅ | ✅ INPUT |
| 1.1.3 | `### Heading 3` | Type `### ` + text | ✅ | ✅ | ✅ INPUT |
| 1.1.4 | `#### Heading 4` | Type `#### ` + text | ✅ | ✅ | ✅ INPUT |
| 1.1.5 | `##### Heading 5` | Type `##### ` + text | ✅ | ✅ | ✅ INPUT |
| 1.1.6 | `###### Heading 6` | Type `###### ` + text | ✅ | ✅ | ✅ INPUT |
| 1.1.7 | Setext H1: `text\n===` | — | ❌ | ❌ | ❌ |
| 1.1.8 | Setext H2: `text\n---` | — | ❌ | ❌ | ❌ |

**Implementation**: `headingManager.js` — regex `/^(#{1,6})\s+(.*)$/` on input. Creates `<hN>` with `<span class="heading-marker">` prefix and ZWSP separator.

### 1.2 Lists

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.2.1 | `- item` (dash UL) | Type `- ` + text | ✅ | ✅ | ✅ INPUT |
| 1.2.2 | `* item` (asterisk UL) | Type `* ` + text | ✅ | ✅ | ✅ INPUT |
| 1.2.3 | `+ item` (plus UL) | Type `+ ` + text | ✅ | ✅ | ✅ INPUT |
| 1.2.4 | `1. item` (ordered) | Type `1. ` + text | ✅ | ✅ | ✅ INPUT |
| 1.2.5 | Nested list (2-space indent) | Tab key in list context | ✅ | ✅ | ✅ INPUT |
| 1.2.6 | List outdent | Shift+Tab in list context | ✅ | ✅ | ✅ INPUT |
| 1.2.7 | Empty item → exit list | Enter on empty LI | ✅ | — | ✅ INPUT |
| 1.2.8 | `- [ ] task` (unchecked) | — | ❌ | ❌ | ❌ |
| 1.2.9 | `- [x] task` (checked) | — | ❌ | ❌ | ❌ |
| 1.2.10 | Loose lists (blank lines between items) | — | ❌ | ❌ | ❌ |

**Implementation**: `listManager.js` — regex `/^(\s*)([-*+])\s+(.*)$/` and `/^(\s*)(\d+\.)\s+(.*)$/` on input. Tab/Shift+Tab for indent/outdent.

### 1.3 Block Quotes

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.3.1 | `> quote text` | Type `> ` + text | ✅ | ✅ | ✅ INPUT |
| 1.3.2 | `>> nested quote` | Type `>> ` + text | ✅ | ✅ | ✅ INPUT |
| 1.3.3 | `> ` with multiple paragraphs | Enter inside blockquote | ✅ | ✅ | ✅ INPUT |
| 1.3.4 | `> ` with other block elements inside | — | ❌ | ❌ | ❌ |
| 1.3.5 | Lazy continuation (no `>` on continuation lines) | — | ❌ | ❌ | ❌ |
| 1.3.6 | Bare `>` (no trailing space) | — | ✅ | ✅ | ✅ PASTE |
| 1.3.7 | Indented `   > text` (quote in list context) | — | ✅ | ✅ | ✅ PASTE |

**Implementation**: `blockquoteManager.js` — regex `/^(>{1,5})\s(.*)$/` on input. Enter creates new line in quote, Enter on empty exits. Backspace at start unwraps. Nesting up to 5 levels. Paste handles bare `>`, indented `>`, and multi-line continuity.

### 1.4 Code Blocks

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.4.1 | Fenced: `` ``` `` | Type `` ``` `` | ✅ | ✅ | ✅ INPUT |
| 1.4.2 | Fenced with language: `` ```js `` | Type `` ```js `` | ✅ | ✅ | ✅ INPUT |
| 1.4.3 | Indented code block (4 spaces) | — | ❌ | ❌ | ❌ |
| 1.4.4 | Fenced with tildes: `~~~code~~~` | — | ❌ | ❌ | ❌ |
| 1.4.5 | Grayscale syntax highlighting | Auto on input + paste | ✅ | — | ✅ INPUT |
| 1.4.6 | 20 language grammars | Alias resolution (js→javascript) | ✅ | ✅ | ✅ INPUT |

**Implementation**: `codeBlockManager.js` — regex `/^```(\w*)$/` on input. Creates `<div class="code-block">` with `<pre><code>`. Tab inserts 2 spaces, Escape exits, Enter creates newline (not div). `syntaxHighlighter.js` provides regex-based tokenization with 16 grayscale token classes. 20 languages: JavaScript, TypeScript, Python, HTML, CSS, JSON, Bash, SQL, C, C++, C#, Java, Rust, Go, Ruby, PHP, YAML, XML, Markdown, plaintext.

### 1.5 Horizontal Rules

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.5.1 | `---` (three dashes) | Type `---` | ✅ | ✅ | ✅ INPUT |
| 1.5.2 | `***` (three asterisks) | Type `***` | ✅ | ✅ | ✅ INPUT |
| 1.5.3 | `___` (three underscores) | Type `___` | ✅ | ✅ | ✅ INPUT |
| 1.5.4 | `- - -` (spaced dashes) | — | ❌ | ❌ | ❌ |

**Implementation**: `editor.attemptBlockTransformations()` — regex `/^[-*_]{3,}\s*$/`. Creates `<hr>` + new `<div>` for caret. Paste via `markdownConverter.markdownToEditorHtml()`. Export via `editorHtmlToMarkdown()` `case 'hr'` → `---`.

### 1.6 Tables (GFM)

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.6.1 | Basic table with pipes | Type header + separator rows | ✅ | ✅ | ✅ INPUT |
| 1.6.2 | Header separator row `\|---\|---\|` | Part of table trigger | ✅ | ✅ | ✅ INPUT |
| 1.6.3 | Column alignment `:---`, `:---:`, `---:` | Parsed from separator | ✅ | ✅ | ✅ INPUT |
| 1.6.4 | Inline formatting within cells | Typing inside cells | ✅ | ✅ | ✅ INPUT |
| 1.6.5 | Tab/Shift+Tab cell navigation | Tab between cells | ✅ | — | ✅ INPUT |
| 1.6.6 | Enter adds new row | Enter inside cell | ✅ | — | ✅ INPUT |
| 1.6.7 | Arrow key row navigation | Up/Down arrows | ✅ | — | ✅ INPUT |

**Implementation**: `tableManager.js` — pipe-separated header + separator row triggers table creation. Tab/Shift+Tab navigates cells, Enter adds rows, Escape exits. Column alignment via `:---`, `:---:`, `---:`. Export produces padded GFM-compatible pipe tables.

### 1.7 Paragraphs & Line Breaks

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.7.1 | Blank line between paragraphs | Enter key creates new `<div>` | ✅ | ✅ | ✅ INPUT |
| 1.7.2 | Hard break: two trailing spaces | — | ❌ | ❌ | ❌ |
| 1.7.3 | Hard break: backslash + newline | — | ❌ | ❌ | ❌ |
| 1.7.4 | Soft line break | — | ❌ | ❌ | ❌ |

### 1.8 HTML Blocks

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.8.1 | Raw HTML block (`<div>`, `<table>`, etc.) | — | ❌ | ❌ | ❌ |
| 1.8.2 | HTML comments `<!-- -->` | — | ❌ | ❌ | ❌ |

---

## 2. Inline Elements

### 2.1 Emphasis (Italic)

| # | Syntax | Input Trigger | Keyboard | Paste | Export | Status |
|---|--------|---------------|----------|-------|--------|--------|
| 2.1.1 | `*text*` (asterisk) | Type `*text*` char-by-char | Ctrl+I | ✅ | ✅ | ✅ INPUT |
| 2.1.2 | `_text_` (underscore) | Type `_text_` char-by-char | — | ✅ | ✅ | ✅ INPUT |
| 2.1.3 | Intraword emphasis `foo*bar*baz` | — | — | ❌ | ❌ | ❌ |

**Implementation**: `inlineStyleManager.js` — patterns for both `*` and `_`. Underscore regex `/(_)([^\s_])/`. Paste handles both via `_processInlineMarkdown`.

### 2.2 Strong (Bold)

| # | Syntax | Input Trigger | Keyboard | Paste | Export | Status |
|---|--------|---------------|----------|-------|--------|--------|
| 2.2.1 | `**text**` (asterisk) | Type `**text**` char-by-char | Ctrl+B | ✅ | ✅ | ✅ INPUT |
| 2.2.2 | `__text__` (underscore) | Type `__text__` char-by-char | — | ✅ | ✅ | ✅ INPUT |

**Implementation**: `inlineStyleManager.js` — patterns for both `**` and `__`. Underscore regex `/(__)([^\s_])/`. Paste handles both via `_processInlineMarkdown`.

### 2.3 Bold + Italic

| # | Syntax | Input Trigger | Keyboard | Paste | Export | Status |
|---|--------|---------------|----------|-------|--------|--------|
| 2.3.1 | `***text***` | Type `***text***` char-by-char | Ctrl+B then Ctrl+I | ✅ | ✅ | ✅ INPUT |
| 2.3.2 | `___text___` | — | — | ❌ | ❌ | ❌ |

### 2.4 Strikethrough (GFM)

| # | Syntax | Input Trigger | Keyboard | Paste | Export | Status |
|---|--------|---------------|----------|-------|--------|--------|
| 2.4.1 | `~~text~~` | Type `~~text~~` char-by-char | Ctrl+Shift+S | ✅ | ✅ | ✅ INPUT |
| 2.4.2 | `~text~` (single tilde) | — | — | ❌ | ❌ | ❌ |

**Implementation**: `inlineStyleManager.js` — regex `/(~~)([^\s~])/`. Produces `<s>`.

### 2.5 Inline Code

| # | Syntax | Input Trigger | Keyboard | Paste | Export | Status |
|---|--------|---------------|----------|-------|--------|--------|
| 2.5.1 | `` `code` `` (single backtick) | Type `` `text` `` char-by-char | — | ✅ | ✅ | ✅ INPUT |
| 2.5.2 | ``` ``code`` ``` (double backtick) | — | — | ❌ | ❌ | ❌ |
| 2.5.3 | Backtick with literal backtick inside | — | — | ❌ | ❌ | ❌ |

**Implementation**: `inlineStyleManager.js` — detects closing backtick, searches backwards for opening `` ` ``. Wraps content in `<code>` with ZWSP after. Paste via `_processInlineMarkdown()`. Export via `_processEditorInlineContent()` `case 'code'` → backtick wrap.

### 2.6 Links

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 2.6.1 | `[text](url)` inline | Type `[text](url)` char-by-char | ✅ | ✅ | ✅ INPUT |
| 2.6.2 | `[text](url "title")` with title | — | ❌ | ❌ | ❌ |
| 2.6.3 | `[text][ref]` reference-style | — | ❌ | ❌ | ❌ |
| 2.6.4 | `<url>` autolink | — | ❌ | ❌ | ❌ |
| 2.6.5 | `https://...` extended autolink (GFM) | Type URL + space | ✅ | ✅ | ✅ INPUT |
| 2.6.6 | `user@email.com` email autolink (GFM) | — | ❌ | ❌ | ❌ |

**Implementation**: `inlineStyleManager.js` — detects closing `)` with lookback for `[text](url)` pattern. Creates `<a>` with `contenteditable="false"` and ZWSP after. Paste via `_processInlineMarkdown()`. Export via `_processEditorInlineContent()` `case 'a'` → `[text](url)`.

### 2.7 Images

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 2.7.1 | `![alt](src)` inline | Type `![alt](url)` char-by-char | ✅ | ✅ | ✅ INPUT |
| 2.7.2 | `![alt](src "title")` with title | — | ❌ | ❌ | ❌ |
| 2.7.3 | `![alt][ref]` reference-style | — | ❌ | ❌ | ❌ |

**Implementation**: `inlineStyleManager.js` — detects closing `)` preceded by `![alt](url)` pattern. Creates `<img>` with `contenteditable="false"` and ZWSP after. Paste via `_processInlineMarkdown`. Export via `_processEditorInlineContent` `case 'img'`. CSS: max-width 100%, rounded, slight opacity.

### 2.8 Character Escapes

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 2.8.1 | `\*` escaped asterisk | — | ✅ | ✅ | ✅ PASTE |
| 2.8.2 | `\[` escaped bracket | — | 🔶 | ❌ | 🔶 PARTIAL |
| 2.8.3 | `\\` escaped backslash | — | ✅ | ✅ | ✅ PASTE |
| 2.8.4 | All 32 CommonMark escapable characters | — | ✅ | ✅ | ✅ PASTE |

**Implementation**: `_processInlineMarkdown` — escape handler replaces `\` + special char with placeholder before inline processing, then restores literal character. Prevents false triggers on `\*`, `\~`, etc.

### 2.9 HTML Entities

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 2.9.1 | `&amp;` named entity | — | ❌ | ❌ | ❌ |
| 2.9.2 | `&#123;` numeric entity | — | ❌ | ❌ | ❌ |
| 2.9.3 | `&#x7B;` hex entity | — | ❌ | ❌ | ❌ |

---

## 3. Extended Syntax (GFM / Common Extensions)

### 3.1 Task Lists

| # | Syntax | Status |
|---|--------|--------|
| 3.1.1 | `- [ ] unchecked` | ✅ INPUT + PASTE + EXPORT |
| 3.1.2 | `- [x] checked` | ✅ INPUT + PASTE + EXPORT |

### 3.2 Footnotes

| # | Syntax | Status |
|---|--------|--------|
| 3.2.1 | `[^1]` reference | ❌ |
| 3.2.2 | `[^1]: text` definition | ❌ |

### 3.3 Definition Lists

| # | Syntax | Status |
|---|--------|--------|
| 3.3.1 | `term\n: definition` | ❌ |

### 3.4 Abbreviations

| # | Syntax | Status |
|---|--------|--------|
| 3.4.1 | `*[HTML]: Hyper Text Markup Language` | ❌ |

### 3.5 YAML Front Matter

| # | Syntax | Status |
|---|--------|--------|
| 3.5.1 | `---\ntitle: ...\n---` | ❌ |

### 3.6 Math (KaTeX / MathJax)

| # | Syntax | Status |
|---|--------|--------|
| 3.6.1 | `$inline$` | ❌ |
| 3.6.2 | `$$block$$` | ❌ |

### 3.7 Mentions & References (GitHub-specific)

| # | Syntax | Status |
|---|--------|--------|
| 3.7.1 | `@username` | ❌ |
| 3.7.2 | `#123` issue ref | ❌ |

### 3.8 Highlight / Mark

| # | Syntax | Status |
|---|--------|--------|
| 3.8.1 | `==highlighted==` | ❌ |

### 3.9 Subscript / Superscript

| # | Syntax | Status |
|---|--------|--------|
| 3.9.1 | `H~2~O` subscript | ❌ |
| 3.9.2 | `X^2^` superscript | ❌ |

---

## 4. Summary

### Support Counts

| Category | Total | ✅ Supported | 🔶 Partial | ❌ Unsupported |
|----------|-------|-------------|-----------|----------------|
| Block Elements | 36 | 25 | 0 | 11 |
| Inline Elements | 24 | 12 | 1 | 11 |
| Extended (GFM+) | 14 | 2 | 0 | 12 |
| **TOTAL** | **74** | **39** | **1** | **34** |

### Recently Implemented (this session)

| Feature | Scope | Module | Tests |
|---------|-------|--------|-------|
| Block Quotes | Input + Paste + Export | `blockquoteManager.js` | BQ-01..07, PASTE-BQ-01..05 |
| Fenced Code Blocks | Input + Paste + Export | `codeBlockManager.js` | CB-01..07, PASTE-CB-01 |
| Grayscale Syntax Highlighting | 20 languages, 16 token classes | `syntaxHighlighter.js` | CB-03, PASTE-CB-01 |
| Tables | Input + Paste + Export | `tableManager.js` | TBL-01..06, PASTE-TBL-01 |
| Horizontal Rule | Input + Paste + Export | `editor.js` | HR-01..05 |
| Inline Code | Input + Paste + Export | `inlineStyleManager.js` | IC-01..04 |
| Task Lists | Input + Paste + Export | `listManager.js` | TASK-01..03 |
| Links | Input + Paste + Export | `inlineStyleManager.js` | LINK-01..03 |
| Underscore Emphasis | Input + Paste + Export | `inlineStyleManager.js` | USCORE-01..03 |
| Images | Input + Paste + Export | `inlineStyleManager.js` | IMG-01..03 |
| Autolinks | Input + Paste | `inlineStyleManager.js` | AUTO-01..03 |
| Character Escapes | Paste + Export | `markdownConverter.js` | ESC-01..02 |

### Priority Features for Next Implementation

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| **P2** | Link titles `[text](url "title")` | Low | Low |
| **P3** | `<url>` autolink | Low | Low |
| **P3** | Email autolink | Low | Low |
