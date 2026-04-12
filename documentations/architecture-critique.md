# Markdown Focus Editor — Architecture Critique & Improvement Report

## 1. Executive Summary

The Markdown Focus Editor is a browser-based, zero-dependency contenteditable Markdown writing tool with a unique "focus mode" that dims everything except the current line. The codebase is ~3,200 lines of vanilla JavaScript across 15 ES modules, with no build step, no framework, and no external runtime dependencies.

**Overall assessment:** The core design philosophy — "leverage browser defaults, intervene minimally" — is sound and aligns with how successful lightweight editors work. However, the implementation has accumulated structural debt that undermines that philosophy. The app is functional but fragile, and several architectural decisions will make it increasingly difficult to extend or debug.

---

## 2. What the Editor Gets Right

### 2.1 Philosophy: Minimal DOM intervention
The spec explicitly states: _"Leverage default browser edit behavior, don't fight it."_ This is the correct instinct. The editor only transforms the DOM on specific triggers (heading creation, list nesting) and lets the browser handle Enter, Backspace, and normal typing. This avoids the largest class of contenteditable bugs.

### 2.2 No framework, no build step
For a focused writing tool, zero dependencies means instant load, zero supply chain risk, and easy deployment (drop files on a server). This is a legitimate advantage over framework-heavy alternatives.

### 2.3 Focus mode via SVG mask
Using an SVG viewport mask rather than per-element opacity is clever — it avoids z-index battles, works across block boundaries, and handles wrapped lines correctly with character-level Y-position sampling.

### 2.4 Document model in localStorage
The multi-document store with import/export, conflict resolution, and storage quota tracking is a well-thought-out feature for a zero-backend app.

---

## 3. Architectural Critique

### 3.1 No Document Model (Critical)

**The most significant architectural gap.** The editor has **no abstract document model**. The DOM IS the model. Every module reads and writes the DOM directly.

Why this matters:
- **Undo/redo** snapshots entire `innerHTML` strings (expensive, lossy for caret position).
- **Save** serializes whatever the DOM looks like at that moment — including browser-injected elements, ZWSPs, orphaned `<br>` tags.
- **Paste** must round-trip through HTML → Markdown → HTML because there's no canonical representation to normalize into.
- **Testing** is impossible without a browser — you can't unit-test any logic without JSDOM or a real DOM.

Every serious editor (ProseMirror, Slate, Tiptap, CodeMirror) separates the document model from the view. **This is the single design decision that would yield the highest return if changed.**

| Editor | Document Model | View Layer |
|--------|---------------|------------|
| ProseMirror | Immutable tree of typed nodes | DOM rendered from model |
| Slate | JSON tree with operations | React (or custom) rendering |
| Tiptap | ProseMirror schema | ProseMirror + extensions |
| CodeMirror 6 | Immutable `Text` object | Custom viewport renderer |
| **This editor** | **The DOM itself** | **The DOM itself** |

### 3.2 Caret Management is a Multiplying Liability

The codebase contains ~300 lines of caret position tracking and restoration (`getAbsoluteCaretPosition`, `restoreCaret`). This is fragile because:

- **ZWSP (Zero-Width Space) characters** are inserted after styled elements and heading markers as cursor positioning aids. These leak into saved content, break text search, and require constant cleanup accounting.
- **Offset calculation** assumes a flat text model but operates on a nested DOM tree. When headings have non-editable marker spans, or lists have nested `<ul>/<ol>`, the offset math silently produces wrong results.
- **Every new feature** (e.g., blockquotes, code blocks, tables) would require caret restoration code, multiplying the bug surface.

### 3.3 Module Coupling is Circular

The initialization graph shows tight bidirectional coupling:

```
app.js
  ├─ editor.init()
  ├─ toolbar.init()           → imports editor, storage, documentStore, modalManager (dynamic)
  ├─ fileManager.init()       → imports editor, documentStore
  ├─ storage.loadSettings()   → imports editor, theme, toolbar, documentStore
  ├─ undoManager.init(editor) → editor.undoManager = undoManager  (monkey-patch)
  ├─ inlineStyleManager(editor) → editor.inlineStyleManager = ...  (monkey-patch)
  ├─ focusMode.init(editor)   → editor.focusMode = ...  (monkey-patch)
  └─ modalManager.init()
```

Problems:
- **Monkey-patching**: Sub-modules are attached to the editor object at runtime (`editor.undoManager = undoManager`). This means no module can import `editor` and reliably access `.undoManager` — it depends on initialization order.
- **Circular dependency hack**: `toolbar.js` uses dynamic `import()` for `modalManager` to avoid a cycle. This indicates the dependency graph needs restructuring.
- **`storage.js` imports nearly everything**: It loads settings by reaching into `editor`, `theme`, `toolbar`, and `documentStore`, making it a god-module for initialization.

### 3.4 Monolithic Functions

Several functions exceed 200 lines with deeply nested branching:

| Function | Module | Lines | Concern |
|----------|--------|-------|---------|
| `handleInputFormatting()` | editor.js | ~200 | Input dispatch + heading + inline style + focus |
| `handleKeyDown()` | editor.js | ~180 | Undo/redo + formatting + list tab keys |
| `handleTab()` | listManager.js | ~150 | 4+ indent scenarios with DOM surgery |
| `handleShiftTab()` | listManager.js | ~200 | 6 outdent scenarios, some incomplete |
| `handleHtmlPaste()` | pasteManager.js | ~120 | HTML→MD→HTML pipeline |
| `markdownToEditorHtml()` | markdownConverter.js | ~200 | Line-by-line Markdown parser |

These make the code difficult to reason about, test, or extend safely.

### 3.5 Security Concerns

| Risk | Location | Details |
|------|----------|---------|
| **XSS via paste** | pasteManager.js, markdownConverter.js | Pasted HTML is processed but not sanitized with DOMPurify or equivalent. `innerHTML` assignments happen without escaping. |
| **XSS via import** | documentStore.js, modalManager.js | Imported JSON backup documents are rendered via `innerHTML` for thumbnails without sanitization. A malicious `.json` backup could execute scripts. |
| **Stored XSS** | documentStore.js | Auto-title generation strips HTML via regex (`/<[^>]+>/g`), which is bypassable. |
| **No CSP headers** | index.html | No Content-Security-Policy meta tag. Inline event handlers and `eval()` from pasted content would execute. |

### 3.6 Data Durability Gaps

- **No `QuotaExceededError` handling**: `localStorage.setItem()` calls are unguarded. When the 5MB limit is hit, writes silently fail and users lose work.
- **No schema versioning**: Documents in localStorage have no version field. Future format changes will break existing stored documents with no migration path.
- **Race condition on save**: `saveSettings('lastContent', ...)` updates both localStorage and `documentStore` but without any transaction boundary. A crash between the two calls can leave state inconsistent.
- **`setTimeout(100)` for initial state**: The undo system records initial state with a 100ms delay, hoping `storage.loadSettings()` has finished. This is a timing bug waiting to happen.

### 3.7 Performance Concerns

- **MutationObserver + ResizeObserver on the editor**: `focusMode.js` attaches both observers to the editor element. Every keystroke triggers observer callbacks. With long documents, this causes jank.
- **Full innerHTML snapshots for undo**: Each undo state is a full copy of the editor's `innerHTML`. With a 5,000-word document, each snapshot is ~50KB. At 50 states, that's 2.5MB in memory — and comparing consecutive snapshots for deduplication requires string equality on large strings.
- **TreeWalker character sampling**: The focus mode samples text nodes with a TreeWalker on every caret move to determine the visual line. This is O(n) on document length.

---

## 4. Competitive Benchmark

### 4.1 Direct Competitors (Focus/Distraction-Free Markdown Editors)

| Feature | **This Editor** | **Typora** ($15) | **iA Writer** ($50) | **StackEdit** (Free) | **Obsidian** (Free) |
|---------|----------------|-------------------|---------------------|----------------------|---------------------|
| Focus mode | Line-level SVG mask | Line + paragraph focus | Sentence-level | None | Plugin-based |
| Document model | DOM-is-the-model | Custom AST | Custom engine | PageDown library | CodeMirror 6 |
| Markdown fidelity | Partial (H1-H6, bold, italic, strike, lists) | Full CommonMark + GFM + extensions | Full CommonMark | Full CommonMark + extensions | Full CommonMark + plugins |
| Storage | localStorage (5MB) | Filesystem | Filesystem + iCloud | Google Drive / Dropbox / CouchDB | Filesystem vault |
| Platform | Browser only | Desktop (Electron) | Desktop + iOS | Browser | Desktop + Mobile |
| Offline | Yes (after first load) | Yes | Yes | Partial (Service Worker) | Yes |
| Tables | No | Yes | Yes | Yes | Yes |
| Code blocks | No | Yes (syntax highlight) | Yes | Yes (highlight) | Yes (highlight) |
| Images | No | Yes (inline + drag) | Yes | Yes | Yes |
| Math/LaTeX | No | Yes (KaTeX/MathJax) | Yes (MathJax) | Yes (KaTeX) | Yes (MathJax) |
| Export | Download .md | PDF, HTML, DOCX, LaTeX, EPUB | PDF, HTML, DOCX | PDF, HTML, Markdown | PDF (plugin) |
| Search/Replace | Basic find | Full regex | Find + replace | Find + replace | Full regex |
| Collaboration | No | No | No | Yes (real-time) | No (Sync has plugin) |
| Theme-ability | Light/Dark toggle | 6+ themes, CSS customizable | 6+ themes | Themes | CSS snippets + community themes |
| Word count | Yes | Yes | Yes (goal targets) | Yes | Yes (plugin) |
| Price | Free | $14.99 | $49.99 | Free | Free core |

### 4.2 Architecture Comparison

| Aspect | This Editor | How Competitors Solve It |
|--------|-------------|--------------------------|
| **Document model** | DOM = model | Typora: custom AST. Obsidian: CodeMirror 6 `Text` object. All maintain a model separate from the view. |
| **Undo/redo** | innerHTML snapshots | ProseMirror/Slate: operation-based. Record transforms, not snapshots. Enables collaborative editing. CodeMirror 6: transaction-based history. |
| **Focus mode** | SVG mask with character sampling | Typora: CSS opacity per paragraph, toggled by caret tracking. iA Writer: sentence-level opacity with native text layout APIs. Both avoid per-keystroke DOM walks. |
| **Paste handling** | Intercept → HTML→MD→HTML round-trip | ProseMirror: parse pasted HTML against schema, reject unknown nodes. Slate: `insertData` with schema-aware normalization. Both validate against a known model. |
| **Caret management** | Manual offset calculation with ZWSP hacks | ProseMirror: model-to-DOM position mapping via `ResolvedPos`. CodeMirror 6: decorations mapped to document positions. No ZWSPs needed. |
| **Persistence** | localStorage with JSON | Obsidian: filesystem + file watcher. StackEdit: Google Drive / CouchDB sync. Even localStorage-based editors use IndexedDB for larger storage (100MB+). |

### 4.3 What This Editor Does Better Than Some Competitors

1. **Zero startup cost**: No Electron shell (Typora ~100MB), no framework bundle (StackEdit ~2MB gzipped). This loads in milliseconds.
2. **Simplicity of deployment**: A static folder on any web server. No build, no Node, no backend.
3. **Focus mode UX**: The SVG-mask approach gives a smooth visual effect. Typora's paragraph-level focus is coarser. iA Writer's sentence-level focus is more refined but requires native text layout APIs.
4. **Privacy**: Nothing leaves the browser. No telemetry, no accounts, no cloud sync.

---

## 5. Improvement Recommendations

### Tier 1: High-impact, addresses fragility (do these)

#### 5.1 Introduce a Minimal Document Model
You do NOT need ProseMirror's full schema system. A lightweight model would be:

```javascript
// A document is an array of blocks
const doc = [
  { type: 'heading', level: 2, content: 'Introduction' },
  { type: 'paragraph', content: 'Some text with **bold** words.' },
  { type: 'list', ordered: false, items: [
    { content: 'Item 1', children: [] },
    { content: 'Item 2', children: [
      { content: 'Nested item', children: [] }
    ]}
  ]}
];
```

**Benefits:** Undo becomes diffing model states (cheap). Save becomes `JSON.stringify(doc)`. Paste normalizes into model nodes. Tests run without a DOM.

**Migration path:** Keep `contenteditable` for input. On `input` events, extract the changed block from the DOM into the model. On model change, re-render only the changed block back to the DOM. This is how Typora works internally.

#### 5.2 Sanitize All HTML Insertion
Add DOMPurify (3KB gzipped) or equivalent:

```javascript
// Before any innerHTML assignment
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(untrustedHtml, {
  ALLOWED_TAGS: ['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                 'ul', 'ol', 'li', 'strong', 'em', 's', 'b', 'i', 'br', 'span'],
  ALLOWED_ATTR: ['class', 'contenteditable']
});
```

Apply to: `markdownConverter.js`, `pasteManager.js`, `modalManager.js` thumbnails, `documentStore.js` imports.

#### 5.3 Guard localStorage Writes

```javascript
saveDocuments(docs) {
  try {
    localStorage.setItem('mdFocusEditorDocs', JSON.stringify(docs));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      this.notifyUser('Storage full. Export a backup and delete old documents.');
    }
    throw e;
  }
}
```

#### 5.4 Add Schema Versioning to Stored Documents
```javascript
const CURRENT_SCHEMA_VERSION = 1;

createNewDocument(name, content) {
  return {
    id: generateId(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name, content,
    created: new Date().toISOString(),
    lastEdited: new Date().toISOString()
  };
}
```

### Tier 2: Structural improvements (do when extending features)

#### 5.5 Replace Monkey-Patching with an Event Bus
Instead of `editor.undoManager = undoManager`, use a simple pub/sub:

```javascript
// eventBus.js
const listeners = {};
export default {
  on(event, fn) { (listeners[event] ??= []).push(fn); },
  emit(event, data) { (listeners[event] ?? []).forEach(fn => fn(data)); }
};
```

Modules emit events (`content-changed`, `caret-moved`, `block-transformed`) and subscribe to what they need. This eliminates circular imports and initialization ordering issues.

#### 5.6 Debounce Focus Mode Updates
The SVG mask update fires on every caret movement and every MutationObserver callback. Debounce to `requestAnimationFrame`:

```javascript
let pendingFocusUpdate = false;
function scheduleUpdate() {
  if (!pendingFocusUpdate) {
    pendingFocusUpdate = true;
    requestAnimationFrame(() => {
      updateFocusLine();
      pendingFocusUpdate = false;
    });
  }
}
```

#### 5.7 Move from localStorage to IndexedDB
localStorage has a 5MB hard limit and is synchronous (blocks the main thread on read/write). IndexedDB gives ~50MB+ storage, is async, and supports binary data (for future image support).

Use a tiny wrapper like `idb-keyval` (600 bytes) to keep the API simple.

#### 5.8 Break Up Monolithic Functions
`handleInputFormatting()` should dispatch to named handlers:

```javascript
handleInput(e) {
  const block = this.getCurrentBlock();
  if (!block) return;

  if (headingManager.tryTransform(block)) return;
  if (listManager.tryTransform(block)) return;
  inlineStyleManager.check(block);
  this.scheduleFocusUpdate();
  this.scheduleAutoSave();
}
```

### Tier 3: Feature parity with competitors (do if the editor needs to grow)

| Feature | Effort | Impact |
|---------|--------|--------|
| Code blocks with syntax highlighting | Medium (use Prism.js, 2KB core) | High — expected by developers |
| Tables | High (requires model support) | Medium — common in Markdown |
| Image support (paste/drag) | Medium (blob URLs + IndexedDB) | High — major workflow gap |
| Keyboard-driven command palette | Low (simple modal + filter) | Medium — power user feature |
| Export to PDF/HTML | Low (window.print() + print stylesheet) | Medium — expected feature |
| Service Worker for offline | Low | Medium — enables PWA install |
| Content Security Policy | Low (add meta tag) | High — closes XSS vectors |

---

## 6. Summary

| Area | Score | Notes |
|------|-------|-------|
| Core concept | ★★★★☆ | Focus mode is a genuine differentiator |
| Philosophy | ★★★★☆ | "Leverage browser defaults" is correct |
| Implementation | ★★☆☆☆ | DOM-as-model, fragile caret math, monolithic functions |
| Security | ★★☆☆☆ | No sanitization on paste or import |
| Data safety | ★★☆☆☆ | Silent storage failures, no versioning |
| Feature breadth | ★★☆☆☆ | Missing tables, code blocks, images, export |
| Code maintainability | ★★☆☆☆ | Circular deps, monkey-patching, 200+ line functions |
| Performance | ★★★☆☆ | Fine for small docs, observers will degrade on large docs |
| UX polish | ★★★★☆ | Toolbar animation, theme toggle, backup/restore all well-done |

**Bottom line:** The editor has a strong concept and a pragmatic "no framework" approach. The biggest risk is the lack of a document model — every new feature will fight the DOM directly, each adding more caret management complexity and more edge cases. Introducing even a minimal model layer would be the single highest-leverage improvement.
