# Block Quotes — Implementation Spec

> Feature: Live input trigger for `>` block quote syntax with proper DOM representation, nesting, and round-trip conversion.

---

## 1. Overview

Block quotes in markdown are prefixed with `>`. This spec defines how the editor handles:
- **Input trigger**: Typing `> ` at the start of a line converts to a block quote
- **DOM structure**: How quotes are stored in the editor DOM
- **Nesting**: `>> ` for nested quotes
- **Keyboard behavior**: Enter, Backspace, and exit behavior
- **Visual styling**: Indented with a left border
- **Round-trip**: Markdown → editor HTML → markdown

---

## 2. Syntax Definition

### 2.1 Basic Quote
```markdown
> This is a quoted paragraph.
```

### 2.2 Multi-line Quote
```markdown
> First line of quote
> Second line continues
```

### 2.3 Nested Quote
```markdown
> Outer quote
>> Inner nested quote
>>> Deeply nested
```

### 2.4 Quote with Block Elements Inside
```markdown
> # Heading inside quote
> 
> - List item inside quote
> 
> **Bold text** inside quote
```

### 2.5 Exit Quote
An empty `> ` line followed by Enter exits the quote context:
```markdown
> Some quoted text
> ← Enter on empty quote line exits to normal paragraph
```

---

## 3. DOM Structure

### 3.1 Basic Quote
```html
<blockquote>
  <div>This is a quoted paragraph.</div>
</blockquote>
```

### 3.2 Multi-line Quote
```html
<blockquote>
  <div>First line of quote</div>
  <div>Second line continues</div>
</blockquote>
```

### 3.3 Nested Quote
```html
<blockquote>
  <div>Outer quote</div>
  <blockquote>
    <div>Inner nested quote</div>
    <blockquote>
      <div>Deeply nested</div>
    </blockquote>
  </blockquote>
</blockquote>
```

### 3.4 Visual Marker
Each `<blockquote>` gets a quote marker for visual identification:
```html
<blockquote>
  <span class="quote-marker" contenteditable="false">></span>
  <div>Quoted text</div>
</blockquote>
```

---

## 4. Input Trigger

### 4.1 Creation
| Action | Trigger | Result |
|--------|---------|--------|
| Type `> ` at start of empty div | Regex: `/^>\s+(.*)$/` | Wrap div in `<blockquote>` |
| Type `> ` at start of div with text | Same regex | Wrap entire div content in `<blockquote>` |
| Type `>> ` at start of line | Regex: `/^(>{1,})\s+(.*)$/` | Create nested blockquote (depth = `>` count) |

### 4.2 Processing (in `handleInputFormatting`)
```
1. Get current block's text content
2. Match against /^(>{1,})\s+(.*)$/
3. If match:
   a. Determine nesting depth from > count
   b. Create <blockquote> wrapper(s) for depth
   c. Place remaining text inside innermost blockquote as <div>
   d. Add quote-marker span
   e. Place caret after the text
```

---

## 5. Keyboard Behavior

### 5.1 Enter Key Inside Quote
| Context | Action | Result |
|---------|--------|--------|
| Caret at end of quoted line | Enter | New `<div>` inside same `<blockquote>` |
| Caret in middle of quoted text | Enter | Split text, both halves inside quote |
| Empty line inside quote | Enter | Exit quote — new `<div>` after `<blockquote>` |

### 5.2 Backspace
| Context | Action | Result |
|---------|--------|--------|
| Caret at start of first line in quote | Backspace | Unwrap: promote `<div>` out of `<blockquote>` |
| Caret at start of nested quote line | Backspace | Reduce nesting by one level |
| Empty blockquote | Backspace | Remove blockquote entirely |

### 5.3 Tab / Shift+Tab
| Context | Action | Result |
|---------|--------|--------|
| Caret in quote | Tab | Increase nesting (wrap in another `<blockquote>`) |
| Caret in nested quote | Shift+Tab | Decrease nesting (unwrap one `<blockquote>`) |

---

## 6. Visual Styling

```css
blockquote {
    border-left: 3px solid rgba(0, 0, 0, 0.2);
    margin: 0.5em 0;
    padding: 0.25em 0 0.25em 1em;
    color: inherit;
    opacity: 0.85;
}

blockquote blockquote {
    margin-left: 0;
}

.dark-theme blockquote {
    border-left-color: rgba(255, 255, 255, 0.2);
}

.quote-marker {
    position: absolute;
    left: -1.5em;
    color: rgba(0, 0, 0, 0.3);
    user-select: none;
    font-family: monospace;
}

.dark-theme .quote-marker {
    color: rgba(255, 255, 255, 0.3);
}
```

---

## 7. Focus Mode Integration

When focus mode is active:
- The SVG mask must treat `<blockquote>` as a **container** — individual `<div>` lines inside are the focus targets, not the `<blockquote>` itself
- The left border should remain visible even for dimmed lines (at reduced opacity)

---

## 8. Conversion

### 8.1 markdownToEditorHtml (Paste/Import)
```
Input:  "> quoted text\n>> nested"
Output: <blockquote><div>quoted text</div><blockquote><div>nested</div></blockquote></blockquote>
```

### 8.2 editorHtmlToMarkdown (Export/Save)
```
Input:  <blockquote><div>quoted text</div></blockquote>
Output: "> quoted text"
```

Nested:
```
Input:  <blockquote><blockquote><div>nested</div></blockquote></blockquote>
Output: ">> nested"
```

### 8.3 Existing Support
- `htmlToMarkdown` already has `case 'blockquote': > prefix` — needs update for nesting depth
- `markdownToEditorHtml` needs new block for `>` lines
- `editorHtmlToMarkdown` needs new block for `<blockquote>` traversal

---

## 9. Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | `>` without space after | Do NOT trigger — treat as literal `>` |
| 2 | `> ` only (no text) | Create empty blockquote with cursor inside |
| 3 | Paste multiline quote | Each `> ` prefixed line joins same blockquote |
| 4 | Quote immediately after heading | Blockquote is sibling of heading, not child |
| 5 | Quote inside list item | NOT supported (block quote only at top level) |
| 6 | Copy from quote | Clipboard gets `> ` prefixed markdown |
| 7 | Undo after quote creation | Reverts to `> text` as plain text in div |
| 8 | `>` in middle of text | Not a quote trigger — only at line start |
| 9 | 10+ nesting levels | Cap at 5 levels to prevent UI issues |

---

## 10. Accessibility

- `<blockquote>` is natively accessible — screen readers announce "blockquote"
- Quote marker span has `aria-hidden="true"` (decorative)
- Keyboard navigation must work: arrow keys move through quote lines as normal divs
