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
| 1.3.1 | `> quote text` | — | ❌ | ✅ | 🔶 EXPORT ONLY |
| 1.3.2 | `>> nested quote` | — | ❌ | ❌ | ❌ |
| 1.3.3 | `> ` with multiple paragraphs | — | ❌ | ❌ | ❌ |
| 1.3.4 | `> ` with other block elements inside | — | ❌ | ❌ | ❌ |
| 1.3.5 | Lazy continuation (no `>` on continuation lines) | — | ❌ | ❌ | ❌ |

**Implementation**: `htmlToMarkdown` has `case 'blockquote'` for export. No input trigger. No paste conversion. **TARGET FOR NEW SUPPORT**.

### 1.4 Code Blocks

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.4.1 | Fenced: `` ```code``` `` | — | ❌ | ✅ | 🔶 EXPORT ONLY |
| 1.4.2 | Fenced with language: `` ```js\ncode\n``` `` | — | ❌ | ❌ | ❌ |
| 1.4.3 | Indented code block (4 spaces) | — | ❌ | ❌ | ❌ |
| 1.4.4 | Fenced with tildes: `~~~code~~~` | — | ❌ | ❌ | ❌ |

**Implementation**: `htmlToMarkdown` has `case 'pre'` wrapping in backtick fences. No input trigger. No language detection. No syntax highlighting. **TARGET FOR NEW SUPPORT**.

### 1.5 Horizontal Rules

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.5.1 | `---` (three dashes) | — | ❌ | ✅ | 🔶 EXPORT ONLY |
| 1.5.2 | `***` (three asterisks) | — | ❌ | ❌ | ❌ |
| 1.5.3 | `___` (three underscores) | — | ❌ | ❌ | ❌ |
| 1.5.4 | `- - -` (spaced dashes) | — | ❌ | ❌ | ❌ |

**Implementation**: `htmlToMarkdown` has `case 'hr'`. No input trigger.

### 1.6 Tables (GFM)

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 1.6.1 | Basic table with pipes | — | ❌ | ❌ | ❌ |
| 1.6.2 | Header separator row `\|---\|---\|` | — | ❌ | ❌ | ❌ |
| 1.6.3 | Column alignment `:---`, `:---:`, `---:` | — | ❌ | ❌ | ❌ |
| 1.6.4 | Inline formatting within cells | — | ❌ | ❌ | ❌ |

**Implementation**: No support. **TARGET FOR NEW SUPPORT**.

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
| 2.1.2 | `_text_` (underscore) | — | — | ❌ | ❌ | ❌ |
| 2.1.3 | Intraword emphasis `foo*bar*baz` | — | — | ❌ | ❌ | ❌ |

**Implementation**: `inlineStyleManager.js` — regex `/(\*)([^\s*])/` triggers on char after closing `*`. Produces `<i>`.

### 2.2 Strong (Bold)

| # | Syntax | Input Trigger | Keyboard | Paste | Export | Status |
|---|--------|---------------|----------|-------|--------|--------|
| 2.2.1 | `**text**` (asterisk) | Type `**text**` char-by-char | Ctrl+B | ✅ | ✅ | ✅ INPUT |
| 2.2.2 | `__text__` (underscore) | — | — | ❌ | ❌ | ❌ |

**Implementation**: `inlineStyleManager.js` — regex `/(\*\*)([^\s*])/` triggers on char after closing `**`. Produces `<b>`.

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
| 2.5.1 | `` `code` `` (single backtick) | — | — | ❌ | ✅ | 🔶 EXPORT ONLY |
| 2.5.2 | ``` ``code`` ``` (double backtick) | — | — | ❌ | ❌ | ❌ |
| 2.5.3 | Backtick with literal backtick inside | — | — | ❌ | ❌ | ❌ |

**Implementation**: `htmlToMarkdown` has `case 'code'` producing backtick wrap. No input trigger.

### 2.6 Links

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 2.6.1 | `[text](url)` inline | — | ❌ | ✅ | 🔶 EXPORT ONLY |
| 2.6.2 | `[text](url "title")` with title | — | ❌ | ❌ | ❌ |
| 2.6.3 | `[text][ref]` reference-style | — | ❌ | ❌ | ❌ |
| 2.6.4 | `<url>` autolink | — | ❌ | ❌ | ❌ |
| 2.6.5 | `https://...` extended autolink (GFM) | — | ❌ | ❌ | ❌ |
| 2.6.6 | `user@email.com` email autolink (GFM) | — | ❌ | ❌ | ❌ |

**Implementation**: `htmlToMarkdown` has `case 'a'` producing `[text](url)`. No input trigger.

### 2.7 Images

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 2.7.1 | `![alt](src)` inline | — | ❌ | ✅ | 🔶 EXPORT ONLY |
| 2.7.2 | `![alt](src "title")` with title | — | ❌ | ❌ | ❌ |
| 2.7.3 | `![alt][ref]` reference-style | — | ❌ | ❌ | ❌ |

### 2.8 Character Escapes

| # | Syntax | Input Trigger | Paste | Export | Status |
|---|--------|---------------|-------|--------|--------|
| 2.8.1 | `\*` escaped asterisk | — | ❌ | ❌ | ❌ |
| 2.8.2 | `\[` escaped bracket | — | ❌ | ❌ | ❌ |
| 2.8.3 | `\\` escaped backslash | — | ❌ | ❌ | ❌ |
| 2.8.4 | All 32 CommonMark escapable characters | — | ❌ | ❌ | ❌ |

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
| 3.1.1 | `- [ ] unchecked` | ❌ |
| 3.1.2 | `- [x] checked` | ❌ |

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
| Block Elements | 30 | 9 | 3 | 18 |
| Inline Elements | 24 | 4 | 3 | 17 |
| Extended (GFM+) | 14 | 0 | 0 | 14 |
| **TOTAL** | **68** | **13** | **6** | **49** |

### Priority Features for Next Implementation

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| **P0** | Block Quotes (`>`) | Medium | High — common in all markdown |
| **P0** | Fenced Code Blocks (`` ``` ``) | High | High — essential for technical docs |
| **P0** | Tables (`\| \|`) | High | High — essential for structured data |
| **P1** | Inline Code (`` ` ``) | Low | Medium — very common |
| **P1** | Horizontal Rule (`---`) | Low | Low — simple addition |
| **P2** | Task Lists (`- [ ]`) | Medium | Medium — productivity feature |
