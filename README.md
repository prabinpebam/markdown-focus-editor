# Markdown Focus Editor

A distraction-free Markdown editor with a unique focus mode that dims everything except the line you're working on. Built with vanilla JavaScript and Electron — no frameworks, no build step.

## Download

**[Download Portable (Windows x64)](release/MarkdownFocusEditor-Portable.zip)** — Extract and run. No installation needed. Settings stored in `data/` folder next to the exe.

## Features

### Focus Mode
An SVG mask dims all text except the current line. The mask tracks your cursor position in real-time, covering the exact character bounding box (not line-height) for precise visual focus.

### Markdown Support (39/74 CommonMark + GFM)

| Category | Supported |
|----------|-----------|
| **Headings** | `# ` through `###### ` — live input trigger with heading markers |
| **Lists** | `- `, `* `, `+ ` (unordered), `1. ` (ordered), Tab/Shift+Tab nesting |
| **Task Lists** | `- [ ] ` unchecked, `- [x] ` checked — interactive checkboxes |
| **Block Quotes** | `> ` with nesting up to 5 levels, Enter/Backspace behavior |
| **Code Blocks** | `` ``` `` with 20-language grayscale syntax highlighting |
| **Tables** | Pipe syntax with alignment (`:---:`) , Tab cell navigation, Enter adds rows |
| **Horizontal Rule** | `---`, `***`, `___` |
| **Bold** | `**text**` and `__text__` — input trigger + Ctrl+B |
| **Italic** | `*text*` and `_text_` — input trigger + Ctrl+I |
| **Strikethrough** | `~~text~~` — input trigger + Ctrl+Shift+S |
| **Inline Code** | `` `code` `` — input trigger on closing backtick |
| **Links** | `[text](url)` — input trigger + autolinks on space after URLs |
| **Images** | `![alt](url)` — input trigger on closing parenthesis |
| **Character Escapes** | `\*`, `\[`, `\\` — prevents false formatting triggers |

All features work across three paths: **typing** (live input), **paste** (markdown clipboard), and **export** (save as .md).

### Syntax Highlighting
Code blocks use **grayscale-only** highlighting — 16 token classes (keywords bold, comments italic) in shades of grey. No color. Supports: JavaScript, TypeScript, Python, HTML, CSS, JSON, Bash, SQL, C, C++, C#, Java, Rust, Go, Ruby, PHP, YAML, XML, Markdown.

### Editor
- Contenteditable-based — no textarea, no CodeMirror
- Undo/Redo with custom state management
- Copy produces clean markdown (`text/plain`) + formatted HTML (`text/html`)
- Paste converts markdown → editor HTML automatically
- Font size scaling (headings scale proportionally via CSS variable)

### Electron Desktop App
- Custom frameless title bar with backdrop blur (content scrolls underneath)
- Auto-save (500ms debounce, atomic write via temp+rename)
- File operations: Ctrl+O (open), Ctrl+S (save), Ctrl+Shift+S (save as), Ctrl+N (new)
- Drag-and-drop file open, CLI argument open, recent files
- File watching with external change notification (Reload/Ignore)
- Window state persistence (position, size, maximized)
- Single instance lock
- Dark/light theme follows system preference (overridable by user toggle)
- Portable: settings in `data/` next to exe, no AppData, no registry

### Theme
- Light and dark themes with system preference detection
- Explicit toggle overrides system default
- Runtime listener updates theme when system preference changes
- Theme-aware app icon (dark icon on light bg, light icon on dark bg)

## Quick Start

```bash
git clone https://github.com/prabinpebam/markdown-focus-editor.git
cd markdown-focus-editor
npm install
npm start
```

## Build Portable

```bash
npm run build
# Output: dist/MarkdownFocusEditor.exe (87 MB self-extracting portable)
```

## Eval Loop

The project uses an agnostic eval loop framework for quality assurance — 187 Playwright-based scenarios that capture DOM snapshots, run temporal/heuristic/semantic evaluation, and detect formatting anomalies.

```bash
npm run eval          # Run all 187 eval captures
npm run eval:headed   # Run with visible browser
```

## Project Structure

```
electron/           Electron main process (main.js, preload.js)
js/modules/         Editor modules (17 ES modules)
  editor.js           Core editor with contenteditable
  headingManager.js   Heading creation/reversion
  listManager.js      List creation/indent/outdent + task lists
  blockquoteManager.js Blockquote creation/nesting
  codeBlockManager.js  Code block creation/keyboard
  tableManager.js     Table creation/cell navigation
  inlineStyleManager.js Bold/italic/strikethrough/code/links/images
  syntaxHighlighter.js  20-language grayscale tokenizer
  markdownConverter.js  Bidirectional markdown ↔ HTML
  clipboardManager.js  Copy/cut/paste pipeline
  focusMode.js        SVG mask focus tracking
  ...
style/main.css      All styling (scrollbar, title bar, themes)
eval-loop/          Eval loop framework + 187 test scenarios
build/              Icon generation scripts
```

## License

ISC
