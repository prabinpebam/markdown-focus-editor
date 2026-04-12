# DOM State Capture Guide — Markdown Focus Editor

> **Version**: 1.0  
> **Date**: April 11, 2026  
> **Scope**: A concrete implementation guide for capturing the editor's UI state as structured JSON snapshots over time. Adapted from the generic DOM State Capture Guide for a browser-based `contenteditable` Markdown editor with no backend — where all state lives in the DOM and localStorage.  
> **Prerequisite**: Familiarity with the [Eval Loop Framework](eval-loop-framework.md).

---

## 0. Why DOM State Capture Matters for This Editor

Users don't see `innerHTML` strings, ZWSP characters, or heading marker spans. They see text, headings, lists, and a highlighted focus line. But "what the user sees" is hard to reason about programmatically. The solution: **capture the editor DOM as structured JSON at meaningful moments, then analyze the JSON.**

This gives you three things:

1. **A machine-readable record of structure.** Not the raw innerHTML (which is noisy and browser-specific) but a typed block tree: "block-3 is an H2 with a valid marker, block-4 is a UL with 3 nested LIs."
2. **A timeline of how structure changed.** When the user typed `# `, did a DIV transform into an H1? When they pressed Tab, did the LI actually nest? The mutation timeline shows every transition.
3. **A diagnostic artifact that survives the session.** When a heading marker goes missing or a list nests incorrectly, you don't need to reproduce it. The recording shows exactly when it broke.

### The Gap This Fills

| Approach | What It Knows | What It Misses |
|----------|---------------|----------------|
| `console.log` in handlers | What the code did when triggered | Whether the DOM looks right *after* the browser processes it |
| Manual inspection in DevTools | Current DOM state | Every state before now; transient corruption that self-healed |
| `editor.innerHTML` comparison | Whether HTML strings match | Whether the *structure* is valid (a string match catches nothing about nesting, markers, ZWSPs) |
| Screenshot diffing | Pixel-level changes | "Heading marker disappeared" vs. "6 pixels changed" — one is diagnosis, the other is noise |
| **DOM state capture** | **Structured state at every moment** | **Nothing observable — that's the point** |

---

## 1. The Core Idea: Snapshots as Structured JSON

A **snapshot** captures the complete user-visible state of the editor at one moment:

```
    t=0ms         t=200ms        t=400ms        t=600ms        t=2000ms
    ┌─────┐       ┌─────┐       ┌─────┐        ┌─────┐        ┌─────┐
    │ S₀  │       │ S₁  │       │ S₂  │        │ S₃  │        │ S₄  │
    │     │       │     │       │     │        │     │        │     │
    │empty│──────▶│typed│──────▶│"# "│───────▶│ H1  │───────▶│list │
    │     │       │text │       │det. │        │made │        │made │
    └─────┘       └─────┘       └─────┘        └─────┘        └─────┘
       │              │             │               │              │
       ▼              ▼             ▼               ▼              ▼
    snap.json     snap.json     snap.json      snap.json      snap.json
```

---

## 2. Anatomy of a Snapshot

### 2.1 The Envelope

```typescript
interface Snapshot {
  // ── Identity ──
  frameId: number;            // Sequential frame number (0, 1, 2, ...)
  timestamp: number;          // Date.now()
  elapsedMs: number;          // Time since the scenario started
  trigger: string;            // "initial" | "after-type" | "after-shortcut"
                              //   | "after-paste" | "poll-200ms" | "after-save"

  // ── Visual Layer ──
  visual: VisualState;        // What the user sees (from DOM)

  // ── Store Layer ──
  store: StoreState;          // What localStorage believes

  // ── Inline Anomalies ──
  anomalies: Anomaly[];       // Issues detected at capture time
}
```

The separation of `visual` and `store` is critical. Anomalies manifest as **divergence** between these layers: localStorage says document has 500 characters but the editor shows 0 (empty after failed load).

### 2.2 The Visual Layer — What the User Sees

The visual layer is a **typed block tree** built by reading `#editor`'s DOM children. Each block is classified by its tag name and structural properties.

```typescript
interface VisualState {
  blockCount: number;
  viewportState: string;      // "empty" | "has-content"
  blocks: BlockNode[];        // Direct children of #editor
  focusMode: FocusState;
  toolbar: ToolbarState;
  modal: ModalState;
  theme: string;              // "light" | "dark"
  caretBlock: number | null;  // Index of the block containing the caret
}

interface BlockNode {
  type: string;               // "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
                              //   | "ul" | "ol"
  id: string;                 // "block-0", "block-1", etc. (positional)
  position: number;           // DOM order among #editor's children
  contentHash: number;        // Hash of trimmed text content
  visible: boolean;           // offsetParent !== null
  textLength: number;         // Trimmed text length
  isEmpty: boolean;           // No visible text
  hasBr: boolean;             // Contains <br> somewhere

  // Heading-specific
  hasMarker: boolean;         // Has a .heading-marker span
  markerText: string;         // "#", "##", etc.
  markerEditable: boolean;    // false = correct, true = bug
  headingTextAfterMarker: string; // First 100 chars of text after the marker

  // List-specific
  listItems: ListItemNode[];  // For ul/ol: the <li> children (recursive)
  maxNestingDepth: number;    // Deepest nesting level in this list

  // Inline elements
  boldCount: number;          // Number of <b>/<strong> elements
  italicCount: number;        // Number of <i>/<em> elements
  strikeCount: number;        // Number of <s> elements
  emptyInlineCount: number;   // Inline elements with no text content
  zwspCount: number;          // Zero-width space characters in this block

  // Generic
  children: BlockNode[];      // For nested structures
}

interface ListItemNode {
  id: string;                 // "li-0-0", "li-0-1", etc.
  position: number;
  contentHash: number;
  textLength: number;
  isEmpty: boolean;
  nestingLevel: number;       // 0 = top, 1 = nested, etc.
  subItems: ListItemNode[];   // Recursively nested items
}

interface FocusState {
  toggleChecked: boolean;     // The checkbox input state
  maskApplied: boolean;       // Whether CSS mask-image is set on #editor
  focusLineY: number;         // #focus-line SVG rect Y
  focusLineHeight: number;    // #focus-line SVG rect height
  focusLineWidth: number;     // #focus-line SVG rect width
  maskBaseOpacity: number;    // The dimming level (mask-base fill opacity)
}

interface ToolbarState {
  isExpanded: boolean;        // Has class .is-toolbar-active
  focusToggleChecked: boolean;
}

interface ModalState {
  isOpen: boolean;            // Document modal visible
  thumbnailCount: number;     // Number of document cards in the grid
  storagePercent: number;     // Percentage shown in the storage bar
}
```

**Why a block tree, not flat fields.** Flat fields like `{ headingCount: 3, hasMarker: true }` lose context. WHICH heading is missing its marker? Is the orphan `<br>` in a heading (bug) or a div (expected)? The tree structure `block[h2].hasMarker=false` makes the violation self-evident.

**Why `contentHash` instead of full text.** Snapshots are taken every 200ms. Hashing detects change cheaply. Full text is captured only for the final frame when needed for debugging.

```javascript
// Simple string hash (fast, inline)
function hashStr(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}
```

### 2.3 The Store Layer — What localStorage Believes

```typescript
interface StoreState {
  currentDocId: string | null;
  currentDocName: string;
  documentCount: number;
  storageUsedBytes: number;
  storageLimitBytes: number;  // 5 * 1024 * 1024
  focusEnabled: boolean;
  fontSize: number;
  theme: string;
  // Content hash of what's in localStorage for comparison with visual
  storedContentHash: number;
}
```

The store layer is accessed by reading localStorage directly in the capture function:

```javascript
var docs = JSON.parse(localStorage.getItem('mdFocusEditorDocs') || '[]');
var currentDocId = localStorage.getItem('currentDocId');
var currentDoc = docs.find(function(d) { return d.id === currentDocId; });
```

### 2.4 Inline Anomalies

Anomalies detected at capture time — cheap checks that give precise timing:

```typescript
interface Anomaly {
  code: string;               // "ORPHAN_TEXT_NODE", "HEADING_MISSING_MARKER"
  severity: 'critical' | 'warning' | 'info';
  category: string;           // "structure" | "sync" | "focus" | "style" | "security"
  message: string;            // Human-readable
  trigger: string;            // Which snapshot trigger caught it
}
```

Good inline anomaly candidates for this editor:

| Check | Code | Why Inline |
|-------|------|------------|
| `[object Object]` in editor text | `OBJECT_OBJECT_VISIBLE` | Simple string search, always a bug |
| `<script>` tag in editor DOM | `SCRIPT_TAG_IN_EDITOR` | Security: pasted XSS check |
| Bare text node as #editor child | `ORPHAN_TEXT_NODE` | Single nodeType check per child |
| Heading without marker span | `HEADING_MISSING_MARKER` | querySelector per heading |
| Editable heading marker | `HEADING_MARKER_EDITABLE` | getAttribute check |
| Empty `<b>`/`<i>`/`<s>` element | `EMPTY_STYLE_WRAPPER` | textContent length check |
| `<br>` inside heading | `BR_IN_HEADING` | querySelector per heading |
| `<li>` outside `<ul>`/`<ol>` | `ORPHAN_LIST_ITEM` | parentElement check |
| Storage content != editor content | `STORE_CONTENT_DIVERGENCE` | Both layers available |
| Focus mask ON but toggle OFF | `FOCUS_MASK_WHEN_TOGGLE_OFF` | Both state sources available |

---

## 3. When to Capture: Trigger Strategies

### 3.1 Change-Driven Capture (Primary)

Capture when the block structure actually changes. Use a **structural fingerprint** — not deep equality — to detect meaningful change:

```javascript
function buildFingerprint(visual) {
  return JSON.stringify({
    blocks: visual.blocks.map(function(b) {
      return {
        type: b.type,
        hasMarker: b.hasMarker,
        isEmpty: b.isEmpty,
        listItemCount: b.listItems ? b.listItems.length : 0,
        boldCount: b.boldCount,
        italicCount: b.italicCount,
        strikeCount: b.strikeCount,
      };
    }),
    focusEnabled: visual.focusMode.toggleChecked,
    focusY: Math.round(visual.focusMode.focusLineY / 10) * 10, // Round to 10px
    modalOpen: visual.modal.isOpen,
    theme: visual.theme,
  });
}
```

**Why rounding for focus Y position**: The focus line Y changes by fractions of pixels as text reflows. Rounding to 10px groups prevents a new frame for every sub-pixel shift while still catching real line changes.

### 3.2 Interval Polling (Safety Net)

```
every 200ms:
  snapshot = captureCurrentState()
  fingerprint = buildFingerprint(snapshot.visual)
  if fingerprint ≠ lastFingerprint:
    timeline.push(snapshot)
    lastFingerprint = fingerprint
    stableCount = 0
  else:
    stableCount++
  if stableCount ≥ STABILITY_THRESHOLD:
    break  // Editor has stabilized
```

### 3.3 Event-Driven Capture (Precision)

Bracket user actions with before/after snapshots:

```
User types "# " at the start of a div:
  → capture(trigger: "pre-heading-trigger")   // State before: plain div
  → browser processes input event
  → editor.handleInputFormatting() runs
  → capture(trigger: "post-heading-trigger")  // State after: h1 with marker
  → resume polling
```

### 3.4 Stability Detection

For this editor, stability means "block structure hasn't changed":

```javascript
var STABILITY_THRESHOLD = 10; // 10 polls × 200ms = 2 seconds of no structural change

var stableCount = 0;
while (stableCount < STABILITY_THRESHOLD && elapsed < MAX_WAIT) {
  var snapshot = capture();
  var fp = buildFingerprint(snapshot.visual);
  if (fp !== lastFingerprint) {
    stableCount = 0;
    lastFingerprint = fp;
    timeline.push(snapshot);
  } else {
    stableCount++;
  }
  await wait(200);
}
```

No need to check a "backend done" flag — there's no backend. Stability is purely DOM-based.

---

## 4. Building the Capture Function

### 4.1 Design Principles

1. **ES5 syntax.** The function is serialized by Playwright's `page.evaluate()`. Use `function`, `var`, explicit null checks. No arrow functions, no optional chaining.

2. **No side effects.** Read the DOM and localStorage. Never modify, click, scroll, emit events, or mutate state.

3. **Bounded output.** First 100 chars for heading text, first 300 chars for block text. Hash long strings. A single snapshot should be under 15KB.

4. **Self-contained.** No closures, no module imports. Everything defined inline.

5. **Tolerant of missing elements.** The DOM can be in any state — empty editor, mid-transformation, corrupt. Never throw. Always fallback.

### 4.2 Reference Implementation

```javascript
// This function runs inside the browser via page.evaluate().
// It reads #editor's DOM, localStorage, and SVG mask state.
// Produces a structured snapshot for the eval loop timeline.

const CAPTURE_FN = `(function() {
  // ── Helpers ──

  function qsa(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }
  function qs(root, sel) { return root.querySelector(sel); }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h;
  }

  function getText(el) {
    return el ? (el.textContent || '').trim().substring(0, 300) : '';
  }

  function getAttr(el, attr) {
    return el ? (el.getAttribute(attr) || '') : '';
  }

  function countChar(str, char) {
    var c = 0;
    for (var i = 0; i < str.length; i++) {
      if (str[i] === char) c++;
    }
    return c;
  }

  // ── Count ZWSPs in a subtree ──
  function countZwsp(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var count = 0;
    var node;
    while (node = walker.nextNode()) {
      count += countChar(node.textContent, '\\u200B');
    }
    return count;
  }

  // ── Build list item tree recursively ──
  function buildListItems(listEl, baseId, level) {
    var items = [];
    var directLis = [];
    for (var c = 0; c < listEl.children.length; c++) {
      if (listEl.children[c].tagName === 'LI') {
        directLis.push(listEl.children[c]);
      }
    }
    for (var i = 0; i < directLis.length; i++) {
      var li = directLis[i];
      var id = baseId + '-' + i;
      var text = '';
      // Get direct text (not from nested lists)
      for (var n = 0; n < li.childNodes.length; n++) {
        var child = li.childNodes[n];
        if (child.nodeType === 3) text += child.textContent;
        else if (child.nodeType === 1 && child.tagName !== 'UL' && child.tagName !== 'OL') {
          text += child.textContent;
        }
      }
      text = text.trim().substring(0, 200);

      // Find nested sub-list
      var subList = qs(li, 'ul') || qs(li, 'ol');
      var subItems = subList ? buildListItems(subList, id, level + 1) : [];

      items.push({
        id: id,
        position: i,
        contentHash: hashStr(text),
        textLength: text.length,
        isEmpty: text.length === 0,
        nestingLevel: level,
        subItems: subItems
      });
    }
    return items;
  }

  // ── Get max nesting depth ──
  function getMaxDepth(items, currentMax) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].nestingLevel > currentMax) currentMax = items[i].nestingLevel;
      if (items[i].subItems.length > 0) {
        currentMax = getMaxDepth(items[i].subItems, currentMax);
      }
    }
    return currentMax;
  }

  // ── Visual Layer: Read #editor DOM ──

  var editor = document.getElementById('editor');
  var blocks = [];

  if (editor) {
    var children = editor.children;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      var tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
      var text = getText(el);
      var blockId = 'block-' + i;

      // Heading marker detection
      var marker = qs(el, '.heading-marker');
      var hasMarker = !!marker;
      var markerText = marker ? getText(marker) : '';
      var markerEditable = marker ? getAttr(marker, 'contenteditable') !== 'false' : false;
      var headingTextAfterMarker = '';
      if (hasMarker && marker.nextSibling) {
        headingTextAfterMarker = (marker.nextSibling.textContent || '').substring(0, 100);
      }

      // List detection
      var listItems = [];
      var maxNestingDepth = 0;
      if (tag === 'ul' || tag === 'ol') {
        listItems = buildListItems(el, 'li-' + i, 0);
        maxNestingDepth = getMaxDepth(listItems, 0);
      }

      // Inline element counts
      var boldEls = qsa(el, 'b, strong');
      var italicEls = qsa(el, 'i, em');
      var strikeEls = qsa(el, 's');
      var emptyInlineCount = 0;
      var allInline = [].concat(boldEls, italicEls, strikeEls);
      for (var j = 0; j < allInline.length; j++) {
        var inlineText = (allInline[j].textContent || '').replace(/\\u200B/g, '');
        if (inlineText.length === 0) emptyInlineCount++;
      }

      blocks.push({
        type: tag,
        id: blockId,
        position: i,
        contentHash: hashStr(text),
        visible: el.offsetParent !== null || el.offsetHeight > 0,
        textLength: text.length,
        isEmpty: text.replace(/\\u200B/g, '').length === 0,
        hasBr: !!qs(el, 'br'),
        hasMarker: hasMarker,
        markerText: markerText,
        markerEditable: markerEditable,
        headingTextAfterMarker: headingTextAfterMarker,
        listItems: listItems,
        maxNestingDepth: maxNestingDepth,
        boldCount: boldEls.length,
        italicCount: italicEls.length,
        strikeCount: strikeEls.length,
        emptyInlineCount: emptyInlineCount,
        zwspCount: countZwsp(el),
        children: [] // reserved for future nesting
      });
    }
  }

  // Caret position
  var caretBlock = null;
  try {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor) {
      var anchorNode = sel.anchorNode;
      var current = anchorNode;
      while (current && current.parentNode !== editor) {
        current = current.parentNode;
      }
      if (current && current.parentNode === editor) {
        caretBlock = [].indexOf.call(editor.children, current);
      }
    }
  } catch(e) { /* selection not available */ }

  // Focus mode state
  var focusToggle = document.getElementById('focus-toggle');
  var focusLine = document.getElementById('focus-line');
  var svgDefs = qs(document, '.svg-defs');
  var editorStyle = editor ? window.getComputedStyle(editor) : null;
  var maskImage = editorStyle ? (editorStyle.maskImage || editorStyle.webkitMaskImage || '') : '';

  var focusState = {
    toggleChecked: focusToggle ? focusToggle.checked : false,
    maskApplied: maskImage.indexOf('url') !== -1,
    focusLineY: focusLine ? (focusLine.getAttribute('y') || 0) : 0,
    focusLineHeight: focusLine ? (focusLine.getAttribute('height') || 0) : 0,
    focusLineWidth: focusLine ? (focusLine.getAttribute('width') || 0) : 0,
    maskBaseOpacity: 0
  };
  try {
    var maskBase = document.getElementById('mask-base');
    if (maskBase) {
      var fill = maskBase.getAttribute('fill') || '';
      var match = fill.match(/[\\d.]+/g);
      if (match && match.length >= 4) {
        focusState.maskBaseOpacity = parseFloat(match[3]);
      }
    }
  } catch(e) {}

  // Toolbar state
  var toolbar = document.getElementById('toolbar');
  var toolbarState = {
    isExpanded: toolbar ? toolbar.classList.contains('is-toolbar-active') : false,
    focusToggleChecked: focusToggle ? focusToggle.checked : false
  };

  // Modal state
  var modalOverlay = document.getElementById('document-modal-overlay');
  var docGrid = document.getElementById('document-grid');
  var storageBar = document.getElementById('storage-progress-bar');
  var modalState = {
    isOpen: modalOverlay ? (window.getComputedStyle(modalOverlay).display !== 'none'
            && window.getComputedStyle(modalOverlay).opacity !== '0') : false,
    thumbnailCount: docGrid ? docGrid.children.length : 0,
    storagePercent: storageBar ? parseFloat(storageBar.style.width || '0') : 0
  };

  // Theme
  var theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

  var visual = {
    blockCount: blocks.length,
    viewportState: blocks.length === 0 ? 'empty' : 'has-content',
    blocks: blocks,
    focusMode: focusState,
    toolbar: toolbarState,
    modal: modalState,
    theme: theme,
    caretBlock: caretBlock
  };

  // ── Store Layer: Read localStorage ──

  var storeState = null;
  try {
    var docsRaw = localStorage.getItem('mdFocusEditorDocs');
    var docs = docsRaw ? JSON.parse(docsRaw) : [];
    var currentDocId = localStorage.getItem('currentDocId');
    var currentDoc = null;
    for (var d = 0; d < docs.length; d++) {
      if (docs[d].id === currentDocId) { currentDoc = docs[d]; break; }
    }

    var storageBytes = 0;
    for (var k = 0; k < localStorage.length; k++) {
      var key = localStorage.key(k);
      storageBytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }

    storeState = {
      currentDocId: currentDocId || null,
      currentDocName: currentDoc ? (currentDoc.name || currentDoc.title || '') : '',
      documentCount: docs.length,
      storageUsedBytes: storageBytes,
      storageLimitBytes: 5 * 1024 * 1024,
      focusEnabled: localStorage.getItem('focusEnabled') === 'true',
      fontSize: parseInt(localStorage.getItem('fontSize') || '16', 10),
      theme: localStorage.getItem('theme') || 'light',
      storedContentHash: currentDoc ? hashStr(currentDoc.content || '') : 0
    };
  } catch(e) {
    storeState = {
      currentDocId: null, currentDocName: '', documentCount: 0,
      storageUsedBytes: 0, storageLimitBytes: 5242880,
      focusEnabled: false, fontSize: 16, theme: 'light', storedContentHash: 0
    };
  }

  // ── Inline Anomaly Detection ──

  var anomalies = [];

  // 1. [object Object] visible
  var bodyText = editor ? (editor.textContent || '').substring(0, 5000) : '';
  if (bodyText.indexOf('[object Object]') !== -1) {
    anomalies.push({
      code: 'OBJECT_OBJECT_VISIBLE', severity: 'critical', category: 'rendering',
      message: '[object Object] visible in editor content', trigger: 'capture'
    });
  }

  // 2. Script tags in editor
  if (editor && editor.querySelectorAll('script').length > 0) {
    anomalies.push({
      code: 'SCRIPT_TAG_IN_EDITOR', severity: 'critical', category: 'security',
      message: '<script> tag found inside editor DOM', trigger: 'capture'
    });
  }

  // 3. Orphan text nodes
  if (editor) {
    for (var t = 0; t < editor.childNodes.length; t++) {
      var child = editor.childNodes[t];
      if (child.nodeType === 3 && child.textContent.trim().length > 0) {
        anomalies.push({
          code: 'ORPHAN_TEXT_NODE', severity: 'critical', category: 'structure',
          message: 'Bare text node as direct child of #editor: "' +
            child.textContent.trim().substring(0, 50) + '"', trigger: 'capture'
        });
      }
    }
  }

  // 4. Headings without markers
  for (var h = 0; h < blocks.length; h++) {
    var b = blocks[h];
    if (/^h[1-6]$/.test(b.type)) {
      if (!b.hasMarker) {
        anomalies.push({
          code: 'HEADING_MISSING_MARKER', severity: 'critical', category: 'structure',
          message: b.type.toUpperCase() + ' at position ' + b.position + ' has no .heading-marker span',
          trigger: 'capture'
        });
      }
      if (b.hasMarker && b.markerEditable) {
        anomalies.push({
          code: 'HEADING_MARKER_EDITABLE', severity: 'critical', category: 'structure',
          message: b.type.toUpperCase() + ' marker at position ' + b.position + ' is editable',
          trigger: 'capture'
        });
      }
      if (b.hasBr) {
        anomalies.push({
          code: 'BR_IN_HEADING', severity: 'warning', category: 'structure',
          message: b.type.toUpperCase() + ' at position ' + b.position + ' contains a <br>',
          trigger: 'capture'
        });
      }
    }
  }

  // 5. Orphan list items
  var allLis = editor ? qsa(editor, 'li') : [];
  for (var li = 0; li < allLis.length; li++) {
    var parent = allLis[li].parentElement;
    if (!parent || (parent.tagName !== 'UL' && parent.tagName !== 'OL')) {
      anomalies.push({
        code: 'ORPHAN_LIST_ITEM', severity: 'critical', category: 'structure',
        message: '<li> at DOM position is not inside <ul> or <ol>',
        trigger: 'capture'
      });
    }
  }

  // 6. Empty inline wrappers
  var totalEmptyInline = 0;
  for (var ei = 0; ei < blocks.length; ei++) {
    totalEmptyInline += blocks[ei].emptyInlineCount;
  }
  if (totalEmptyInline > 0) {
    anomalies.push({
      code: 'EMPTY_STYLE_WRAPPER', severity: 'warning', category: 'style',
      message: totalEmptyInline + ' empty inline style wrappers (<b>/<i>/<s> with no text)',
      trigger: 'capture'
    });
  }

  // 7. Focus mode state mismatch
  if (!focusState.toggleChecked && focusState.maskApplied) {
    anomalies.push({
      code: 'FOCUS_MASK_WHEN_TOGGLE_OFF', severity: 'critical', category: 'focus',
      message: 'Focus mode toggle is OFF but SVG mask is applied to editor',
      trigger: 'capture'
    });
  }
  if (focusState.toggleChecked && !focusState.maskApplied && blocks.length > 0) {
    anomalies.push({
      code: 'FOCUS_MASK_MISSING_WHEN_ON', severity: 'warning', category: 'focus',
      message: 'Focus mode toggle is ON but SVG mask is not applied',
      trigger: 'capture'
    });
  }

  // 8. Store↔DOM content hash divergence (only meaningful after save)
  // This is checked by comparing visual content hash with stored content hash.
  // Note: Only flag if both hashes are non-zero (both have content).
  var editorContentHash = editor ? hashStr((editor.innerHTML || '').trim()) : 0;
  if (storeState.storedContentHash !== 0 && editorContentHash !== 0 &&
      storeState.storedContentHash !== editorContentHash) {
    anomalies.push({
      code: 'STORE_CONTENT_DIVERGENCE', severity: 'info', category: 'sync',
      message: 'Editor innerHTML hash (' + editorContentHash + ') differs from stored content hash (' +
        storeState.storedContentHash + '). May be expected if unsaved changes exist.',
      trigger: 'capture'
    });
  }

  // ── Assemble Snapshot ──

  return {
    timestamp: Date.now(),
    visual: visual,
    store: storeState,
    anomalies: anomalies
  };
})()`;
```

### 4.3 Adapting for Your Specific Needs

The capture function above covers the editor's core DOM. To extend it for new features:

**Step 1: Identify the new component.** If you add blockquotes, code blocks, or tables — add a new block type to the classifier.

**Step 2: Find the DOM selector.** Open dev tools, inspect the element. Prefer `tagName`, `classList`, or `data-*` over generated attributes.

**Step 3: Add state extraction.** What state does this component have? (collapsed/expanded, error/success, etc.) Read it from DOM attributes or CSS classes.

**Step 4: Add inline anomaly.** What would be wrong about this component? Write a check.

---

## 5. The Timeline: Snapshots Across Time

### 5.1 Timeline Structure

```typescript
interface Timeline {
  metadata: {
    feature: string;          // "editor"
    scenario: string;         // "write-structured-document"
    browser: string;          // "Chrome 126" | "Firefox 128"
    startTimestamp: number;
    captureInterval: number;  // 200
    stabilityThreshold: number; // 10
    totalFrames: number;
    totalDurationMs: number;
  };
  frames: Snapshot[];         // Ordered by timestamp
}
```

### 5.2 Cross-Snapshot Analysis: The Mutation Timeline

Diff consecutive snapshots to track how blocks changed:

```javascript
function buildMutationTimeline(frames) {
  var mutations = [];

  for (var i = 1; i < frames.length; i++) {
    var prev = frames[i - 1];
    var curr = frames[i];
    var prevBlocks = prev.visual.blocks;
    var currBlocks = curr.visual.blocks;

    // Build lookup by position (since IDs are positional, use contentHash for identity)
    var maxLen = Math.max(prevBlocks.length, currBlocks.length);

    for (var b = 0; b < maxLen; b++) {
      var prevB = b < prevBlocks.length ? prevBlocks[b] : null;
      var currB = b < currBlocks.length ? currBlocks[b] : null;

      if (!prevB && currB) {
        // Block appeared
        mutations.push({
          frameId: i, timestamp: curr.timestamp,
          nodeId: currB.id, nodeType: currB.type,
          field: 'existence', oldValue: null, newValue: 'created',
          parentId: 'editor', parentType: 'editor'
        });
        continue;
      }

      if (prevB && !currB) {
        // Block disappeared
        mutations.push({
          frameId: i, timestamp: curr.timestamp,
          nodeId: prevB.id, nodeType: prevB.type,
          field: 'existence', oldValue: 'present', newValue: null,
          parentId: 'editor', parentType: 'editor'
        });
        continue;
      }

      if (prevB && currB) {
        // Check for type change (div → heading, heading → div, div → ul, etc.)
        if (prevB.type !== currB.type) {
          mutations.push({
            frameId: i, timestamp: curr.timestamp,
            nodeId: currB.id, nodeType: currB.type,
            field: 'type', oldValue: prevB.type, newValue: currB.type,
            parentId: 'editor', parentType: 'editor'
          });
        }

        // Check for content change
        if (prevB.contentHash !== currB.contentHash) {
          mutations.push({
            frameId: i, timestamp: curr.timestamp,
            nodeId: currB.id, nodeType: currB.type,
            field: 'contentHash', oldValue: prevB.contentHash, newValue: currB.contentHash,
            parentId: 'editor', parentType: 'editor'
          });
        }

        // Check for marker changes
        if (prevB.hasMarker !== currB.hasMarker) {
          mutations.push({
            frameId: i, timestamp: curr.timestamp,
            nodeId: currB.id, nodeType: currB.type,
            field: 'hasMarker', oldValue: prevB.hasMarker, newValue: currB.hasMarker,
            parentId: 'editor', parentType: 'editor'
          });
        }

        // Check for inline element count changes
        var fields = ['boldCount', 'italicCount', 'strikeCount', 'zwspCount',
                      'emptyInlineCount', 'textLength'];
        for (var f = 0; f < fields.length; f++) {
          if (prevB[fields[f]] !== currB[fields[f]]) {
            mutations.push({
              frameId: i, timestamp: curr.timestamp,
              nodeId: currB.id, nodeType: currB.type,
              field: fields[f], oldValue: prevB[fields[f]], newValue: currB[fields[f]],
              parentId: 'editor', parentType: 'editor'
            });
          }
        }
      }
    }

    // Focus mode changes
    if (prev.visual.focusMode.toggleChecked !== curr.visual.focusMode.toggleChecked) {
      mutations.push({
        frameId: i, timestamp: curr.timestamp,
        nodeId: 'focus-mode', nodeType: 'focus',
        field: 'toggleChecked',
        oldValue: prev.visual.focusMode.toggleChecked,
        newValue: curr.visual.focusMode.toggleChecked,
        parentId: 'editor', parentType: 'editor'
      });
    }
  }

  return mutations;
}
```

### 5.3 What the Mutation Timeline Reveals

| Question | How the Timeline Answers It |
|----------|----------------------------|
| Did the heading form correctly? | Filter: `field === 'type' && newValue === 'h1'` followed by `field === 'hasMarker' && newValue === true` in the same or next frame |
| Did a heading silently lose its marker? | Filter: `field === 'hasMarker' && oldValue === true && newValue === false` (without a corresponding type change to 'div') |
| Are ZWSPs multiplying? | Filter: `field === 'zwspCount'` — the count should be stable or increase by exactly 1 per styled element added |
| Did a block disappear unexpectedly? | Filter: `field === 'existence' && newValue === null` |
| Did the block type transition illegally? | Filter: `field === 'type'` — check against allowed transitions (div↔heading, div↔list only) |
| Did focus mode react to cursor movement? | Filter: `nodeId === 'focus-mode'` — check focusLineY changes bracket cursor block changes |

### 5.4 Temporal Invariant Rules

```javascript
// Rule 1: Block type transitions are monotonic
// Only allowed: div ↔ h1-h6, div ↔ ul/ol. Never h1 → ul directly.
function checkBlockTypeTransitions(mutations) {
  var validTransitions = {
    'div': ['h1','h2','h3','h4','h5','h6','ul','ol'],
    'h1': ['div'], 'h2': ['div'], 'h3': ['div'],
    'h4': ['div'], 'h5': ['div'], 'h6': ['div'],
    'ul': ['div'], 'ol': ['div']
  };

  return mutations
    .filter(function(m) { return m.field === 'type'; })
    .filter(function(m) {
      var allowed = validTransitions[m.oldValue] || [];
      return allowed.indexOf(m.newValue) === -1;
    })
    .map(function(m) {
      return {
        code: 'ILLEGAL_BLOCK_TRANSITION', severity: 'critical', category: 'temporal',
        message: 'Block "' + m.nodeId + '" transitioned from ' + m.oldValue +
          ' to ' + m.newValue + ' (not allowed) at frame ' + m.frameId,
        trigger: 'frame-' + m.frameId
      };
    });
}

// Rule 2: Heading marker must appear when type becomes h1-h6
function checkMarkerAppearance(mutations) {
  var anomalies = [];
  var headingCreations = {};

  for (var i = 0; i < mutations.length; i++) {
    var m = mutations[i];
    if (m.field === 'type' && /^h[1-6]$/.test(m.newValue)) {
      headingCreations[m.nodeId] = m.frameId;
    }
    if (m.field === 'hasMarker' && m.newValue === true && headingCreations[m.nodeId]) {
      delete headingCreations[m.nodeId]; // Marker appeared — resolved
    }
  }

  // Any unresolved heading creation = heading without marker
  for (var id in headingCreations) {
    anomalies.push({
      code: 'HEADING_CREATED_WITHOUT_MARKER', severity: 'critical', category: 'temporal',
      message: id + ' became a heading at frame ' + headingCreations[id] +
        ' but never got a .heading-marker span',
      trigger: 'frame-' + headingCreations[id]
    });
  }
  return anomalies;
}

// Rule 3: ZWSP count should not grow unboundedly
function checkZwspGrowth(mutations) {
  var anomalies = [];
  var maxZwsp = {};

  for (var i = 0; i < mutations.length; i++) {
    var m = mutations[i];
    if (m.field === 'zwspCount') {
      if (!maxZwsp[m.nodeId]) maxZwsp[m.nodeId] = 0;
      var newVal = typeof m.newValue === 'number' ? m.newValue : 0;
      if (newVal > maxZwsp[m.nodeId]) maxZwsp[m.nodeId] = newVal;
      if (newVal > 10) { // Arbitrary threshold — no block should have 10+ ZWSPs
        anomalies.push({
          code: 'ZWSP_OVERFLOW', severity: 'warning', category: 'temporal',
          message: m.nodeId + ' has ' + newVal + ' ZWSPs at frame ' + m.frameId +
            ' (likely multiplication bug)',
          trigger: 'frame-' + m.frameId
        });
      }
    }
  }
  return anomalies;
}
```

---

## 6. Storing and Organizing Artifacts

### 6.1 File Structure

```
test-results/editor-eval/<scenario>-<timestamp>/
  ├── timeline.json           # Full snapshot timeline (primary artifact)
  ├── mutations.json          # Computed mutation timeline
  ├── anomaly-report.json     # Aggregated anomalies (the verdict)
  ├── metadata.json           # Scenario config, browser, timing
  └── screenshots/
      ├── frame-0000-0ms.png
      ├── frame-0008-1200ms.png
      └── final.png
```

### 6.2 The Anomaly Report (The Verdict)

```json
{
  "scenario": "write-structured-document",
  "browser": "Chrome 126",
  "timestamp": "2026-04-11T14:00:00.000Z",
  "verdict": "CLEAN",
  "summary": {
    "critical": 0,
    "warning": 1,
    "info": 2
  },
  "frames": 34,
  "durationMs": 8200,
  "anomalies": [
    {
      "code": "STRAY_ZWSP",
      "severity": "warning",
      "category": "style",
      "message": "2 ZWSP characters in plain text block-5",
      "trigger": "frame-18"
    }
  ]
}
```

**Zero critical + zero warning = CLEAN.** This is the only number that matters.

### 6.3 Keeping Artifacts Manageable

| Rule | Why |
|------|-----|
| Hash content, don't store it | Snapshots at 200ms intervals with full innerHTML produce huge files |
| Truncate early | 100 chars for heading text, 300 for block text |
| Screenshot key frames only | When the fingerprint changes, not every poll |
| Rotate old runs | Keep last 5 runs per scenario |

---

## 7. Implementation Patterns

### 7.1 Playwright (Primary)

```typescript
import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('eval-loop: write-structured-document', async ({ page }) => {
  test.setTimeout(120_000);

  // Open the editor
  await page.goto('file:///path/to/index.html');
  await page.waitForSelector('#editor', { timeout: 10_000 });
  await page.click('#editor');

  const timeline: any[] = [];
  let lastFingerprint = '';
  let frameId = 0;
  const startTime = Date.now();

  // Capture helper
  async function capture(trigger: string) {
    const snapshot = await page.evaluate(CAPTURE_FN);
    snapshot.frameId = frameId++;
    snapshot.elapsedMs = Date.now() - startTime;
    snapshot.trigger = trigger;
    timeline.push(snapshot);
    return snapshot;
  }

  // Fingerprint helper
  function buildFingerprint(visual: any): string {
    return JSON.stringify(visual.blocks.map((b: any) => ({
      type: b.type, hasMarker: b.hasMarker, isEmpty: b.isEmpty,
      listItemCount: b.listItems?.length || 0,
    })));
  }

  // Exercise the taskflow
  await capture('initial');

  // Type a heading
  await page.keyboard.type('# Introduction');
  await page.keyboard.press('Enter');
  await capture('after-heading');

  // Type a paragraph
  await page.keyboard.type('This is the introduction paragraph.');
  await page.keyboard.press('Enter');
  await capture('after-paragraph');

  // Type a list
  await page.keyboard.type('- First item');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second item');
  await page.keyboard.press('Tab'); // Indent
  await capture('after-list-indent');

  // Type bold text
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('**bold text** and normal');
  await capture('after-bold');

  // Save
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(500);
  await capture('after-save');

  // Undo
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await capture('after-undo');

  // Redo
  await page.keyboard.press('Control+y');
  await page.keyboard.press('Control+y');
  await capture('after-redo');

  // Final capture
  await capture('final');

  // ── Write artifacts ──
  const outputDir = path.join(__dirname, 'test-results', 'editor-eval',
    'structured-doc-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(outputDir, { recursive: true });

  // Aggregate anomalies
  const allAnomalies: any[] = [];
  for (const frame of timeline) {
    for (const a of frame.anomalies) {
      a.trigger = 'frame-' + frame.frameId;
      allAnomalies.push(a);
    }
  }

  // Run temporal rules
  const mutations = buildMutationTimeline(timeline);
  allAnomalies.push(...checkBlockTypeTransitions(mutations));
  allAnomalies.push(...checkMarkerAppearance(mutations));
  allAnomalies.push(...checkZwspGrowth(mutations));

  const criticalCount = allAnomalies.filter(a => a.severity === 'critical').length;
  const warningCount = allAnomalies.filter(a => a.severity === 'warning').length;
  const infoCount = allAnomalies.filter(a => a.severity === 'info').length;

  fs.writeFileSync(path.join(outputDir, 'anomaly-report.json'), JSON.stringify({
    scenario: 'write-structured-document',
    browser: 'Chromium',
    timestamp: new Date().toISOString(),
    verdict: criticalCount === 0 && warningCount === 0 ? 'CLEAN' : 'FAIL',
    summary: { critical: criticalCount, warning: warningCount, info: infoCount },
    anomalies: allAnomalies,
  }, null, 2));

  fs.writeFileSync(path.join(outputDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
  fs.writeFileSync(path.join(outputDir, 'mutations.json'), JSON.stringify(mutations, null, 2));

  await page.screenshot({ path: path.join(outputDir, 'final.png'), fullPage: true });
});
```

### 7.2 Manual / Dev Tools

For debugging without Playwright, paste the capture function body into the browser console:

```javascript
// Paste CAPTURE_FN body (everything between the outer parens) into console
var snap = (function() { /* ... */ })();
console.log(JSON.stringify(snap, null, 2));

// Continuous recording (paste, then do your edits):
var timeline = [];
var interval = setInterval(function() {
  timeline.push((function() { /* CAPTURE_FN body */ })());
}, 200);

// Stop when done:
clearInterval(interval);
copy(JSON.stringify(timeline, null, 2)); // Copy to clipboard
```

---

## 8. Real-World Example: Heading Creation Timeline

5 key frames from a session where the user types `# Hello World` at the start of an empty editor:

```json
[
  {
    "frameId": 0, "elapsedMs": 0, "trigger": "initial",
    "visual": {
      "blockCount": 1, "viewportState": "has-content",
      "blocks": [{
        "type": "div", "id": "block-0", "position": 0,
        "contentHash": 0, "textLength": 0, "isEmpty": true,
        "hasMarker": false, "markerText": "", "hasBr": true,
        "boldCount": 0, "italicCount": 0, "strikeCount": 0,
        "zwspCount": 0, "listItems": [], "emptyInlineCount": 0
      }],
      "focusMode": { "toggleChecked": true, "maskApplied": true },
      "theme": "light", "caretBlock": 0
    },
    "anomalies": []
  },
  {
    "frameId": 1, "elapsedMs": 150, "trigger": "after-type",
    "visual": {
      "blockCount": 1, "viewportState": "has-content",
      "blocks": [{
        "type": "div", "id": "block-0", "position": 0,
        "contentHash": 3948, "textLength": 1, "isEmpty": false,
        "hasMarker": false, "markerText": "", "hasBr": false,
        "zwspCount": 0
      }]
    },
    "anomalies": []
  },
  {
    "frameId": 2, "elapsedMs": 300, "trigger": "after-type",
    "visual": {
      "blockCount": 1,
      "blocks": [{
        "type": "h1", "id": "block-0", "position": 0,
        "contentHash": 8821, "textLength": 2, "isEmpty": false,
        "hasMarker": true, "markerText": "#", "markerEditable": false,
        "headingTextAfterMarker": "",
        "zwspCount": 1
      }]
    },
    "anomalies": []
  },
  {
    "frameId": 5, "elapsedMs": 1200, "trigger": "poll-200ms",
    "visual": {
      "blockCount": 1,
      "blocks": [{
        "type": "h1", "id": "block-0", "position": 0,
        "contentHash": 44012, "textLength": 14, "isEmpty": false,
        "hasMarker": true, "markerText": "#", "markerEditable": false,
        "headingTextAfterMarker": "Hello World",
        "zwspCount": 1
      }]
    },
    "anomalies": []
  },
  {
    "frameId": 8, "elapsedMs": 2800, "trigger": "stable",
    "visual": {
      "blockCount": 1,
      "blocks": [{
        "type": "h1", "id": "block-0", "position": 0,
        "contentHash": 44012, "textLength": 14, "isEmpty": false,
        "hasMarker": true, "markerText": "#", "markerEditable": false,
        "headingTextAfterMarker": "Hello World",
        "zwspCount": 1
      }]
    },
    "anomalies": []
  }
]
```

**Reading this timeline tells the full story:**

| Frame | Elapsed | What the User Sees | What Changed |
|-------|---------|-------------------|--------------|
| 0 | 0ms | Empty editor with blinking cursor | (baseline) |
| 1 | 150ms | `#` character in a plain div | User typed `#` |
| 2 | 300ms | H1 heading with hanging `#` marker | `# ` detected → div transformed to h1, marker span added |
| 5 | 1.2s | H1 heading: `# Hello World` | User continued typing inside the heading |
| 8 | 2.8s | Same — stable | No further changes |

From the mutation timeline:
- Block type went `div → h1` at frame 2 (valid transition ✓)
- Marker appeared (`hasMarker: false → true`) at frame 2 (immediate ✓)
- ZWSP count went `0 → 1` at frame 2 (expected: one ZWSP after marker ✓)
- ZWSP count stayed at `1` through frame 8 (no multiplication ✓)
- Content hash changed at frames 1, 2, 5 but stabilized by frame 8 (immutable after editing ✓)

---

## 9. Porting Checklist

When extending this capture system for new features (blockquotes, code blocks, tables, images):

```
STEP 1: Define the component vocabulary
  □ What tag/class identifies the new element?
  □ What states can it be in? (collapsed, expanded, error, etc.)
  □ → Add to the block classifier in CAPTURE_FN

STEP 2: Find the DOM selectors
  □ Inspect the element in dev tools
  □ Use tag name, class name, or data-* attribute
  □ Verify the selector is stable across edits

STEP 3: Add state extraction
  □ What properties matter? (language for code blocks, URL for links, etc.)
  □ Add to the BlockNode type and the CAPTURE_FN

STEP 4: Add inline anomaly detectors
  □ What would be wrong about this element?
  □ Write a check in the anomaly section

STEP 5: Add temporal rules
  □ What transitions are valid?
  □ What should never change after creation?
  □ Write rules over the mutation timeline

STEP 6: Run and iterate
  □ First run: expect capture function needs tuning
  □ Second run: expect anomaly detectors need calibration
  □ Third run: expect real anomalies to surface
```

---

## 10. Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **Arrow functions in CAPTURE_FN** | Serialization fails with cryptic error | Use ES5: `function()`, `var`, no `?.` |
| **Full innerHTML in snapshots** | Timeline file is 30MB+ | Hash content. Truncate text to 300 chars |
| **ZWSP in content comparison** | Every snapshot shows content "changed" | Strip ZWSPs before hashing, or exclude from fingerprint |
| **Focus line Y in fingerprint** | Every poll is a "change" (sub-pixel shifts) | Round Y to nearest 10px in fingerprint |
| **Browser-specific classList** | Selectors work in Chrome, fail in Firefox | Use `el.classList.contains()` instead of matching `.className` string |
| **Capture function throws** | Frame gap in timeline | Wrap every DOM access in try/catch |
| **Testing with empty editor only** | "All clean" but real content breaks everything | Design scenarios that exercise headings, lists, styles, paste |
| **Ignoring Firefox** | All clean in Chrome, structural bugs in Firefox | contenteditable is fundamentally different in Firefox — test both |
