# Fenced Code Blocks — Implementation Spec

> Feature: Live input trigger for `` ``` `` fenced code blocks with grayscale syntax highlighting, language detection, and proper DOM representation.

---

## 1. Overview

Fenced code blocks use triple backticks to create monospaced, non-formatted code regions. This spec defines:
- **Input trigger**: Typing `` ``` `` creates a code block
- **Language declaration**: `` ```js `` sets the language for highlighting
- **Grayscale syntax highlighting**: All highlighting in shades of grey (editor's aesthetic)
- **DOM structure**: How code blocks are stored
- **Keyboard behavior**: Tab indentation, Enter, escape
- **Round-trip**: Markdown ↔ editor HTML

---

## 2. Syntax Definition

### 2.1 Basic Code Block
````markdown
```
function hello() {
    return "world";
}
```
````

### 2.2 Code Block with Language
````markdown
```javascript
const x = 42;
```
````

### 2.3 Supported Language Identifiers

| Identifier | Aliases | Language |
|------------|---------|----------|
| `javascript` | `js` | JavaScript |
| `typescript` | `ts` | TypeScript |
| `python` | `py` | Python |
| `html` | — | HTML |
| `css` | — | CSS |
| `json` | — | JSON |
| `markdown` | `md` | Markdown |
| `bash` | `sh`, `shell` | Shell/Bash |
| `sql` | — | SQL |
| `c` | — | C |
| `cpp` | `c++` | C++ |
| `csharp` | `cs`, `c#` | C# |
| `java` | — | Java |
| `rust` | `rs` | Rust |
| `go` | — | Go |
| `ruby` | `rb` | Ruby |
| `php` | — | PHP |
| `yaml` | `yml` | YAML |
| `xml` | — | XML |
| `plaintext` | `text`, `txt` | Plain text (no highlighting) |

---

## 3. DOM Structure

### 3.1 Code Block HTML
```html
<div class="code-block" data-language="javascript">
  <div class="code-block-header" contenteditable="false">
    <span class="code-language">javascript</span>
  </div>
  <pre class="code-block-content" contenteditable="true" spellcheck="false"><code class="language-javascript"><span class="tok-keyword">const</span> <span class="tok-variable">x</span> <span class="tok-operator">=</span> <span class="tok-number">42</span><span class="tok-punctuation">;</span></code></pre>
</div>
```

### 3.2 Structure Breakdown

| Element | Purpose |
|---------|---------|
| `.code-block` | Outer wrapper, non-contenteditable container |
| `.code-block-header` | Language label bar (non-editable) |
| `.code-language` | Displays the language identifier |
| `pre.code-block-content` | Editable code area, monospace, preserves whitespace |
| `code.language-*` | Inner element holding highlighted tokens |
| `.tok-*` | Individual token spans for syntax highlighting |

### 3.3 Without Language
```html
<div class="code-block" data-language="plaintext">
  <div class="code-block-header" contenteditable="false">
    <span class="code-language">plaintext</span>
  </div>
  <pre class="code-block-content" contenteditable="true" spellcheck="false"><code>some code here</code></pre>
</div>
```

---

## 4. Input Trigger

### 4.1 Opening a Code Block
| Action | Trigger | Result |
|--------|---------|--------|
| Type `` ``` `` + Enter in empty div | Regex: `/^```(\w*)$/` | Create code block with optional language |
| Type `` ```js `` + Enter | Same regex, capture group = `js` | Create code block with JS highlighting |

### 4.2 Processing Flow
```
1. User types ``` (or ```js) and presses Enter
2. handleKeyDown intercepts Enter
3. Match current line text against /^```(\w*)$/
4. If match:
   a. Extract language identifier (or default to "plaintext")
   b. Resolve alias (js → javascript, py → python, etc.)
   c. Remove the ``` line
   d. Insert code-block DOM structure
   e. Place caret inside <pre><code>
   f. Prevent default Enter behavior
```

### 4.3 Closing a Code Block
The code block is a self-contained region. There is no closing `` ``` `` typed by the user — the block is exited via keyboard (see §5).

---

## 5. Keyboard Behavior

### 5.1 Inside Code Block

| Key | Context | Result |
|-----|---------|--------|
| Enter | Inside code block | New line within `<pre>` (plain `\n`, no `<div>`) |
| Tab | Inside code block | Insert 2 spaces (NOT indent list) |
| Shift+Tab | Inside code block | Remove up to 2 leading spaces on current line |
| Backspace | At start of first line, code empty | Delete entire code block, caret to previous block |
| Backspace | At start of first line, code has content | No-op (prevent deletion of pre wrapper) |
| Arrow Down | On last line of code block | Move caret to next block after code block |
| Arrow Up | On first line of code block | Move caret to previous block before code block |
| Escape | Anywhere inside code block | Exit code block — caret to new div after the block |

### 5.2 Outside Code Block

| Key | Context | Result |
|-----|---------|--------|
| Arrow Down / Enter | On line immediately before code block | Enter code block at first line |
| Backspace | On empty line after code block | Delete the empty line, stay outside code block |

### 5.3 Selection Across Code Block Boundary

| Action | Result |
|--------|--------|
| Select text spanning into code block | Selection includes raw code text |
| Delete selection spanning code block | Delete selected text, merge surrounding blocks |
| Copy selection spanning code block | Code portion included as plain text |

---

## 6. Grayscale Syntax Highlighting

### 6.1 Design Principle
All syntax highlighting uses **shades of grey only** — no color. This maintains the editor's distraction-free, monochrome aesthetic. The hierarchy uses opacity and weight to distinguish token types.

### 6.2 Token Classes and Colors

| Token Class | CSS Class | Light Theme | Dark Theme | Font Style |
|-------------|-----------|-------------|------------|------------|
| **Keyword** | `.tok-keyword` | `#333333` | `#cccccc` | `font-weight: 600` |
| **String** | `.tok-string` | `#555555` | `#aaaaaa` | normal |
| **Number** | `.tok-number` | `#555555` | `#aaaaaa` | normal |
| **Comment** | `.tok-comment` | `#999999` | `#666666` | `font-style: italic` |
| **Function** | `.tok-function` | `#444444` | `#bbbbbb` | normal |
| **Variable** | `.tok-variable` | `#4a4a4a` | `#b5b5b5` | normal |
| **Operator** | `.tok-operator` | `#666666` | `#888888` | normal |
| **Punctuation** | `.tok-punctuation` | `#777777` | `#888888` | normal |
| **Type / Class** | `.tok-type` | `#3d3d3d` | `#c2c2c2` | normal |
| **Property** | `.tok-property` | `#4a4a4a` | `#b5b5b5` | normal |
| **Tag** (HTML/XML) | `.tok-tag` | `#444444` | `#bbbbbb` | normal |
| **Attribute** | `.tok-attribute` | `#555555` | `#aaaaaa` | normal |
| **Value** | `.tok-value` | `#555555` | `#aaaaaa` | normal |
| **Built-in** | `.tok-builtin` | `#3d3d3d` | `#c2c2c2` | normal |
| **Regex** | `.tok-regex` | `#666666` | `#999999` | normal |
| **Decorator** | `.tok-decorator` | `#666666` | `#999999` | `font-style: italic` |
| **Plain text** | (none) | `#4a4a4a` | `#b0b0b0` | normal |

### 6.3 Visual Hierarchy (Light Theme)
```
Most prominent   ━━━━━━━━━━━━━━━━━━━━━━━   Least prominent
Keywords (#333)  →  Functions (#444)  →  Strings (#555)  →  Operators (#666)  →  Comments (#999)
     ▲ bold                                                                          ▲ italic
```

### 6.4 Code Block Container Styling
```css
.code-block {
    margin: 1em 0;
    border-radius: 6px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.08);
}

.dark-theme .code-block {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
}

.code-block-header {
    padding: 4px 12px;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.4);
    background: rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    font-family: 'Segoe UI', system-ui, sans-serif;
    user-select: none;
}

.dark-theme .code-block-header {
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.03);
    border-bottom-color: rgba(255, 255, 255, 0.06);
}

.code-block-content {
    font-family: 'Roboto Mono', 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
    line-height: 1.5;
    padding: 12px 16px;
    margin: 0;
    overflow-x: auto;
    white-space: pre;
    tab-size: 2;
    outline: none;
}
```

---

## 7. Syntax Highlighting Engine

### 7.1 Architecture
The highlighter is a **lightweight, built-in tokenizer** — NOT a full parser. It uses regex-based token matching per language. No external library dependency.

### 7.2 Tokenizer Design
```
highlighter.tokenize(code, language) → TokenStream[]

Where TokenStream = { type: string, text: string }

Example:
  tokenize("const x = 42;", "javascript")
  → [
      { type: "keyword", text: "const" },
      { type: "plain", text: " " },
      { type: "variable", text: "x" },
      { type: "plain", text: " " },
      { type: "operator", text: "=" },
      { type: "plain", text: " " },
      { type: "number", text: "42" },
      { type: "punctuation", text: ";" }
    ]
```

### 7.3 Language Grammar Definitions

Each language is defined as an array of token rules (order matters — first match wins):

```javascript
const GRAMMARS = {
  javascript: [
    { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
    { type: 'string',      pattern: /`[\s\S]*?`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g },
    { type: 'regex',       pattern: /\/(?!\/)(?:\\.|[^/\\])+\/[gimsuy]*/g },
    { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g },
    { type: 'keyword',     pattern: /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/g },
    { type: 'builtin',     pattern: /\b(?:Array|Boolean|Date|Error|Function|JSON|Map|Math|Number|Object|Promise|Proxy|RegExp|Set|String|Symbol|WeakMap|WeakSet|console|document|global|globalThis|module|process|require|undefined|null|true|false|NaN|Infinity)\b/g },
    { type: 'function',    pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/g },
    { type: 'operator',    pattern: /[+\-*/%=!<>&|^~?:]+|\.{3}/g },
    { type: 'punctuation', pattern: /[{}()[\];,.]/g },
    { type: 'variable',    pattern: /\b[a-zA-Z_$][\w$]*\b/g },
  ],
  // ... other languages follow same pattern
};
```

### 7.4 Re-highlighting Strategy
- **On input**: Debounce 300ms after last keystroke, then re-tokenize entire code block
- **On paste**: Immediate re-tokenize
- **On language change**: Immediate re-tokenize
- **Performance**: For blocks under 500 lines, tokenize synchronously. Over 500 lines, use `requestIdleCallback`

### 7.5 Token-to-HTML Conversion
```javascript
function tokensToHtml(tokens) {
  return tokens.map(t => {
    if (t.type === 'plain') return escapeHtml(t.text);
    return `<span class="tok-${t.type}">${escapeHtml(t.text)}</span>`;
  }).join('');
}
```

---

## 8. Conversion

### 8.1 markdownToEditorHtml (Paste/Import)
```
Input:
  ```javascript
  const x = 42;
  ```

Output:
  <div class="code-block" data-language="javascript">
    <div class="code-block-header" contenteditable="false">
      <span class="code-language">javascript</span>
    </div>
    <pre class="code-block-content" contenteditable="true" spellcheck="false"><code class="language-javascript">
      <span class="tok-keyword">const</span> ...
    </code></pre>
  </div>
```

### 8.2 editorHtmlToMarkdown (Export/Save)
```
Input:  <div class="code-block" data-language="javascript"><pre ...><code>const x = 42;</code></pre></div>

Output:
  ```javascript
  const x = 42;
  ```
```

**Critical**: Export strips all `<span class="tok-*">` wrappers — only raw text content is emitted.

### 8.3 Clipboard (Copy)
When copying from a code block:
- `text/plain`: Raw code text (no markdown fences, no token spans)
- `text/html`: Code block HTML with token spans intact

---

## 9. Focus Mode Integration

- The entire `.code-block` is treated as a **single focus unit**
- When focused, the entire code block is bright; all other blocks are dimmed
- The SVG mask rectangle covers the full height of the `.code-block` div
- Individual lines within the code block are NOT separately focusable

---

## 10. Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | `` ``` `` alone on a line (no Enter yet) | No transformation — just text |
| 2 | `` ``` `` + Enter with no language | Create plaintext code block |
| 3 | `` ```invalidlang `` + Enter | Create code block, treat as plaintext |
| 4 | Paste markdown with nested code fences | Handle correctly — inner fences are literal |
| 5 | Code block containing HTML | Escape all `<`, `>`, `&` — no HTML interpretation |
| 6 | Very long lines in code block | Horizontal scroll within `<pre>`, no word wrap |
| 7 | Empty code block | Show with placeholder text "Type code here..." |
| 8 | Copy entire code block | Include `` ```lang `` fences in markdown clipboard |
| 9 | Markdown characters inside code | No formatting — `**bold**` stays as literal text |
| 10 | Multiple adjacent code blocks | Separated by at least one `<div>` between them |
| 11 | Tab key inside code block | Insert 2 spaces (not trigger list/indent) |
| 12 | Undo after creating code block | Revert to `` ``` `` text in a div |

---

## 11. Module Structure

### New file: `js/modules/codeBlockManager.js`

```
Exports:
  - init(editor)                     // Attach to editor instance
  - handleCodeBlockInput(line)       // Check if line is ``` trigger
  - createCodeBlock(language)        // Create DOM structure
  - exitCodeBlock(pre)               // Move caret out of code block
  - rehighlight(codeBlock)           // Re-tokenize and re-render tokens
```

### New file: `js/modules/syntaxHighlighter.js`

```
Exports:
  - tokenize(code, language)         // Returns TokenStream[]
  - tokensToHtml(tokens)             // Converts tokens to HTML string
  - resolveLanguage(alias)           // Resolves aliases (js → javascript)
  - getSupportedLanguages()          // Returns list of supported languages
```

---

## 12. Accessibility

- `<pre>` has `role="code"` for screen readers
- Language label is read via `aria-label` on the code block container
- Tab inserts spaces (standard code editing behavior)
- Escape exits to normal editing flow — announced via `aria-live` if needed
