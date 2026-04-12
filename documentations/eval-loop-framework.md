# Evaluation Loop Framework — Markdown Focus Editor

> **Version**: 2.0  
> **Date**: April 12, 2026  
> **Scope**: An evaluation framework for identifying gaps between actual app behavior and desired user behavior in the Markdown Focus Editor.  
> **Adapted from**: The Agnostic Evaluation Loop Framework (v2.0)

---

## Eval Is Not Test

This distinction is fundamental and must not be blurred.

| | **Traditional Tests (TDD)** | **Evaluation Loop** |
|---|---|---|
| **Purpose** | Verify code does what the code says | Identify gaps between what the user sees and what the user expects |
| **Expectations** | Hardcoded assertions: `expect(x).toBe(y)` | No imposed expectations during observation — record first, evaluate later |
| **Observation** | Checks specific values at specific moments | Captures the full state of the system across time, agnostic of implementation |
| **Scope** | One function, one component, one code path | The entire user-visible experience from the user's perspective |
| **What drives it** | Implementation details (function signatures, return values) | User behavior expectations (taskflows, scenarios, what a person would expect to see) |
| **When it fails** | Code doesn't match the assertion | System doesn't match user expectations — which may never have been coded |
| **Determinism** | Deterministic: same input → same expected output | Non-deterministic: same user action may produce different DOM across browsers |
| **Discovery** | Tests only what you thought to test | Discovers issues you never anticipated — the recording captures everything |

### The eval loop protocol

```
1. OBSERVE — Record what the system actually does
   The capture function reads the DOM, the store, the visual state.
   It does NOT check whether anything is "right" — it just records.
   No assertions. No expectations. Pure observation.

2. RECORD — Structure the observation as a timeline
   Snapshots across time, mutations between frames, anomalies inline.
   The recording is a diagnostic artifact — it survives the session.

3. EVALUATE — Apply heuristic and semantic checks AFTER recording
   Heuristic: Boolean invariants (is there an orphan text node? a missing marker?)
   Temporal: Rules over the mutation timeline (did a state go backwards?)
   Semantic: Open-ended questions (would a user be confused by this?)
   
   Evaluation criteria come from USER EXPECTATIONS, not from code.
   "Does the user see what they should see, given what they did?"

4. IDENTIFY GAPS — The delta between actual and expected
   Anomalies are not "test failures" — they are observations that
   diverge from what a user would expect. Some may be acceptable.
   Some may reveal bugs nobody anticipated.

5. FIX — Close the gap between actual and expected behavior
   Fix the app, not the eval. The eval doesn't change.

6. RE-OBSERVE — Run the loop again to verify the gap is closed
   New recording, new evaluation. Did the fix work?
   Did it introduce new gaps elsewhere?
```

### Why this matters for contenteditable editors

Traditional tests assume deterministic output: given input X, expect output Y. This breaks for a `contenteditable` editor because:

- **Browser behavior is non-deterministic.** Pressing Enter, Backspace, or pasting content produces different DOM structures in Chrome vs. Firefox vs. Safari.
- **DOM transformations interact unpredictably.** Heading creation, list nesting, inline styling, and focus mode all modify the same DOM tree.
- **Paste content is unbounded.** Users paste from Word, Google Docs, VS Code, web pages. Each produces different HTML.
- **Focus mode depends on visual layout.** The SVG mask tracks visual line positions. Line wrapping, font loading, and zoom level all affect the result.
- **Undo/redo snapshots entire innerHTML.** Any DOM corruption gets baked into the undo stack and resurfaces.

A hardcoded test can only verify what you thought to check. The eval loop observes the **actual running editor** from the user's perspective, records what they would see, and then — separately, after the fact — evaluates whether that matches what a user would expect.

---

## 1. The Six-Step Framework

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: DEFINE — What the user should see                   │
│         "Start from the user, not the code"                │
├─────────────────────────────────────────────────────────────┤
│ Step 2: ENUMERATE — Every user-observable behavior           │
│         "If it's not in the list, it won't be checked"      │
├─────────────────────────────────────────────────────────────┤
│ Step 3: PLAN RECORDING — How to capture the evidence         │
│         "Tech enters here — only to plan capture"           │
├─────────────────────────────────────────────────────────────┤
│ Step 4: CAPTURE — Record the real system running              │
│         "Mock nothing. Real browser, real DOM."             │
├─────────────────────────────────────────────────────────────┤
│ Step 5: DETECT — Find anomalies in the recording              │
│         "Two eyes: heuristic and temporal"                  │
├─────────────────────────────────────────────────────────────┤
│ Step 6: CONVERGE — Fix, re-run, repeat until clean            │
│         "The loop is the test"                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Step 1: DEFINE — What the User Should See

### 2.1 Taskflows

All taskflows are documented exhaustively in a separate file:

**→ [taskflows.md](taskflows.md)** — 60 taskflows across 12 categories (A–L)

| Category | Taskflows | Coverage |
|----------|-----------|----------|
| A. Core Editing | TF-1 – TF-2 | Typing, Enter/Backspace, cursor, selection |
| B. Block Transformations | TF-3 – TF-11 | Heading creation/reversion/editing, UL/OL creation, list Enter/Tab/Shift+Tab/Backspace |
| C. Inline Styling | TF-12 – TF-19 | Bold/italic/bold-italic/strikethrough via MD syntax, Ctrl+B/I/Shift+S shortcuts, break-out |
| D. Focus Mode | TF-20 – TF-24 | Toggle, cursor tracking, content changes, headings/lists, resize/fullscreen |
| E. Toolbar & Controls | TF-25 – TF-27 | Toolbar morph, font size ±2px, fullscreen |
| F. Document Management | TF-28 – TF-33 | Save, Save As, New, Open Modal, Load, Delete |
| G. Import & Export | TF-34 – TF-37 | JSON backup export, JSON import + conflicts, MD import, drag-and-drop |
| H. Paste Handling | TF-38 – TF-42 | Plain text, HTML, inline MD, block MD, security (XSS) |
| I. Undo & Redo | TF-43 – TF-46 | Basic undo, block undo, redo, stack management |
| J. Theme & Appearance | TF-47 – TF-49 | Theme toggle + debounce, persistence, font size persistence |
| K. Settings & Page Load | TF-50 – TF-51 | First-time defaults, return visit restoration, legacy fallback |
| L. Cross-Feature | TF-52 – TF-60 | Heading+style, list+style, focus+transforms, undo+focus, paste+undo, theme+focus, doc switch+undo, storage full, rapid sequences |

Each taskflow includes step-by-step user actions, EXPECTED system behavior, and EDGE cases.

### 2.2 User-Visible Invariants

Properties that must **always** hold, regardless of content:

```
INV-1: Structure — Every direct child of #editor is a block element:
       <div>, <h1>–<h6>, <ul>, or <ol>. Never a bare text node.

INV-2: Heading markers — Every <h1>–<h6> has exactly one
       <span class="heading-marker" contenteditable="false"> as its first child.
       The marker text matches the heading level (# for h1, ## for h2, etc.).

INV-3: ZWSP hygiene — ZWSP characters (\u200B) appear ONLY:
       (a) immediately after heading markers (as the first char of the text node)
       (b) immediately after inline styled elements (**<b>text</b>**\u200B)
       No other ZWSPs exist in the document.

INV-4: List structure — Every <li> is inside a <ul> or <ol>.
       No orphaned <li> elements outside a list container.
       No empty <ul>/<ol> without at least one <li>.

INV-5: Focus mask — When focus mode is ON, the SVG mask highlights exactly
       the visual line containing the cursor. When OFF, no mask is applied.

INV-6: Store↔DOM sync — The content in localStorage for the current document
       matches editor.innerHTML at save time. No divergence.

INV-7: Undo integrity — After undo, editor.innerHTML matches the recorded
       state at that history index exactly.

INV-8: No stale elements — No <br> inside a heading (headings revert to <div>
       if their structure breaks). No empty inline style wrappers (<b></b>).

INV-9: Save always works — Ctrl+S never silently fails. If localStorage is full,
       the user sees feedback.

INV-10: Theme consistency — Body, toolbar, modal, and editor all reflect the
        same theme. No mixed theme state.
```

### 2.3 Content Delivery Contract

What counts as the editor having successfully handled a user action:

```
- Typing: Characters visible at the cursor position within one frame.
- Heading creation: The <hX> element exists, the marker span is visible, hash is left-hanging.
- List creation: The <ul>/<ol> structure exists with proper <li> children.
- Inline style: The styled content is visually formatted AND retains the markdown markers.
- Paste: Content is visible, cleaned of external formatting, no broken HTML.
- Save: Content persisted. Reload produces the same visual output.
- Focus mode: The correct line is highlighted. All other lines are dimmed.
```

---

## 3. Step 2: ENUMERATE — User-Observable Behavior Checklist

### Failure Categories

Each category groups detectors by the TYPE of failure they catch.

```
Category A: Block Structure Integrity
  Does every block render as a valid block element?
  Are headings properly formed with markers?
  Do lists have correct nesting?

Category B: Inline Style Integrity
  Are bold/italic/strikethrough elements correctly wrapped?
  Do markdown markers survive alongside HTML tags?
  Are ZWSPs placed correctly and only where needed?

Category C: Focus Mode Accuracy
  Does the SVG mask track the current visual line?
  Does the mask update on cursor movement?
  Is the mask correctly toggled on/off?

Category D: Store↔DOM Sync
  Does localStorage content match the editor DOM?
  Do document metadata (title, lastEdited) stay consistent?
  Does the storage indicator in the modal reflect actual usage?

Category E: Paste & Import Fidelity
  Is external formatting stripped?
  Is markdown syntax detected and converted?
  Are unsupported elements removed without breaking structure?

Category F: Undo/Redo Consistency
  Does undo restore the exact prior state?
  Is cursor position restored after undo?
  Does the history stack stay coherent after edits?

Category G: Document Management
  Do all documents appear in the modal grid?
  Does delete remove the correct document?
  Does import handle conflicts correctly?

Category H: Cross-Snapshot Temporal
  Do blocks transition correctly (div → heading, div → list)?
  Do blocks never transition in invalid directions?
  Does focus mode never highlight the wrong line after editing?
```

### Detector Catalog

```
DETECTOR: ORPHAN_TEXT_NODE
  Category:  A (Block Structure Integrity)
  Severity:  critical
  Rule:      No direct child of #editor should be a bare text node
  Check:     All childNodes of editorEl where nodeType === 3 have only whitespace
  Fires when: A text node exists directly under #editor with non-whitespace content
  Why:       Bare text nodes break block-level operations (headings, lists, focus)

DETECTOR: HEADING_MISSING_MARKER
  Category:  A (Block Structure Integrity)
  Severity:  critical
  Rule:      Every <h1>–<h6> must have a .heading-marker span as its first child
  Check:     h.firstElementChild?.classList.contains('heading-marker')
  Fires when: A heading exists without a marker span
  Why:       The user expects to see the hash markers; missing marker = broken heading

DETECTOR: HEADING_MARKER_EDITABLE
  Category:  A (Block Structure Integrity)
  Severity:  critical
  Rule:      Heading markers must be contenteditable="false"
  Check:     marker.getAttribute('contenteditable') === 'false'
  Fires when: A heading marker is editable
  Why:       If users can edit the marker, they can break heading structure

DETECTOR: HEADING_MARKER_MISMATCH
  Category:  A (Block Structure Integrity)
  Severity:  critical
  Rule:      Marker text must match heading level (# for h1, ## for h2, etc.)
  Check:     marker.textContent.trim() === '#'.repeat(headingLevel)
  Fires when: A heading marker shows the wrong number of hashes
  Why:       Confuses the user about heading level

DETECTOR: ORPHAN_LIST_ITEM
  Category:  A (Block Structure Integrity)
  Severity:  critical
  Rule:      Every <li> must be inside a <ul> or <ol>
  Check:     li.parentElement.tagName === 'UL' || li.parentElement.tagName === 'OL'
  Fires when: An <li> element exists outside a list container
  Why:       Orphaned list items render incorrectly and break list operations

DETECTOR: EMPTY_LIST_CONTAINER
  Category:  A (Block Structure Integrity)
  Severity:  warning
  Rule:      No <ul>/<ol> should be empty (no <li> children)
  Check:     list.querySelectorAll('li').length > 0
  Fires when: An empty list container exists
  Why:       Empty lists are invisible to the user but take up DOM space

DETECTOR: STRAY_ZWSP
  Category:  B (Inline Style Integrity)
  Severity:  warning
  Rule:      ZWSP (\u200B) should only appear after heading markers and styled elements
  Check:     Scan all text nodes; ZWSPs not adjacent to valid positions are stray
  Fires when: ZWSP found in plain text, middle of words, or random positions
  Why:       Stray ZWSPs break text search, copy operations, and appear in saved markdown

DETECTOR: EMPTY_STYLE_WRAPPER
  Category:  B (Inline Style Integrity)
  Severity:  warning
  Rule:      No empty inline style elements (<b></b>, <i></i>, <s></s>)
  Check:     el.textContent.replace(/\u200B/g, '').length === 0
  Fires when: An inline style element contains only ZWSPs or nothing
  Why:       Empty wrappers accumulate and pollute the DOM; they show as invisible markup

DETECTOR: OBJECT_OBJECT_VISIBLE
  Category:  B (Inline Style Integrity)
  Severity:  critical
  Rule:      "[object Object]" must never appear in the editor content
  Check:     bodyText.indexOf('[object Object]') === -1
  Fires when: A JavaScript object was coerced to string and rendered as text
  Why:       Always a code bug — objects should never be rendered as text

DETECTOR: FOCUS_MASK_WHEN_OFF
  Category:  C (Focus Mode Accuracy)
  Severity:  critical
  Rule:      When focus mode is OFF, the SVG mask should not apply
  Check:     If toggle is unchecked, editor mask-image/mask should be 'none' or absent
  Fires when: Focus mode styling is applied while the toggle is OFF
  Why:       User turned off focus mode but text is still dimmed

DETECTOR: FOCUS_MASK_ZERO_HEIGHT
  Category:  C (Focus Mode Accuracy)
  Severity:  warning
  Rule:      When focus mode is ON and cursor is in editor, focus-line rect height > 0
  Check:     focusLineRect.height.baseVal.value > 0
  Fires when: Focus mode is on but the highlight has zero height (invisible line)
  Why:       User expects to see the focused line highlighted

DETECTOR: STORE_CONTENT_DIVERGENCE
  Category:  D (Store↔DOM Sync)
  Severity:  critical
  Rule:      After a save, localStorage content matches editor innerHTML
  Check:     storedDoc.content === editor.innerHTML at save time
  Fires when: The saved document differs from what's in the editor
  Why:       Silent data loss — user thinks they saved but the stored version differs

DETECTOR: STORAGE_QUOTA_SILENT_FAIL
  Category:  D (Store↔DOM Sync)
  Severity:  critical
  Rule:      localStorage write failures must produce user-visible feedback
  Check:     After Ctrl+S, either save succeeds or notification appears
  Fires when: Save fails silently (user sees notification but file isn't saved)
  Why:       Silent data loss — the most critical failure mode

DETECTOR: RAW_HTML_IN_EDITOR
  Category:  E (Paste & Import Fidelity)
  Severity:  critical
  Rule:      No raw HTML tags visible as text (e.g., "&lt;div&gt;", "&lt;script&gt;")
  Check:     bodyText does not match /<[a-z]+[^>]*>/i rendered as text
  Fires when: HTML was escaped and rendered as literal text instead of being processed
  Why:       The user sees raw markup instead of formatted content

DETECTOR: SCRIPT_TAG_IN_EDITOR
  Category:  E (Paste & Import Fidelity)
  Severity:  critical
  Rule:      No <script> tags in the editor DOM
  Check:     editor.querySelectorAll('script').length === 0
  Fires when: A <script> element exists inside the editor (XSS vulnerability)
  Why:       Security: pasted content must never introduce executable scripts

DETECTOR: BR_IN_HEADING
  Category:  A (Block Structure Integrity)
  Severity:  warning
  Rule:      No <br> elements inside headings (heading should revert to <div> if broken)
  Check:     heading.querySelectorAll('br').length === 0
  Fires when: A heading contains a <br> element
  Why:       A heading with <br> is structurally broken — the reversion logic didn't fire
```

---

## 4. Step 3: PLAN RECORDING — How to Capture the Evidence

**This is where technology enters.** Steps 1–2 were entirely about what the user should see. This step figures out HOW to observe and record evidence using the editor's specific DOM structure.

### Three Recording Layers

#### Layer 1: User Actions (what the user did)

Since this editor has no backend server or IPC, Layer 1 records user interactions instead of backend events:

```typescript
interface UserAction {
  timestamp: number;          // performance.now()
  type: string;               // 'keystroke' | 'click' | 'paste' | 'shortcut' | 'toggle' | 'save'
  detail: string;             // 'Enter' | 'Tab' | 'Ctrl+B' | 'paste-html' | 'focus-toggle-on'
  target: string;             // 'editor' | 'toolbar' | 'modal' | 'document'
}
```

#### Layer 2: Editor State Tree (what the user sees)

The editor DOM, structured as a typed component tree:

```typescript
interface EditorSnapshot {
  // Envelope
  frameId: number;
  timestamp: number;
  elapsedMs: number;
  trigger: string;            // "initial" | "after-keystroke" | "after-paste" | "poll-200ms"

  // Visual layer
  visual: {
    blockCount: number;
    viewportState: string;    // "empty" | "has-content"
    blocks: BlockNode[];      // Direct children of #editor
    focusMode: FocusState;
    toolbar: ToolbarState;
    modal: ModalState;
    theme: string;            // "light" | "dark"
    caretPosition: {          // Where the user's cursor is
      blockIndex: number;
      offset: number;
      blockType: string;      // "div" | "h1" | "li" | etc.
    } | null;
  };

  // Store layer
  store: {
    currentDocId: string | null;
    documentCount: number;
    storageUsedBytes: number;
    focusEnabled: boolean;
    fontSize: number;
    theme: string;
    undoStackDepth: number;
    redoStackDepth: number;
  };

  // Inline anomalies
  anomalies: Anomaly[];
}

interface BlockNode {
  type: string;               // "div" | "h1" | "h2" | ... | "h6" | "ul" | "ol"
  id: string;                 // Generated: "block-0", "block-1", etc.
  position: number;           // DOM order among siblings (0-indexed)
  contentHash: number;        // Hash of text content
  visible: boolean;
  hasMarker: boolean;         // For headings: does the marker span exist?
  markerText: string;         // "#", "##", etc.
  markerEditable: boolean;    // Is the marker contenteditable?
  zwspCount: number;          // Number of ZWSPs in this block
  children: ListItemNode[];   // For ul/ol: the list items
  inlineElements: InlineNode[]; // bold, italic, strike elements
  properties: {
    textLength: number;
    isEmpty: boolean;         // No visible text content
    hasBr: boolean;           // Contains a <br> element
  };
}

interface ListItemNode {
  type: "li";
  id: string;
  position: number;
  contentHash: number;
  nestingLevel: number;       // 0 = top level, 1 = nested once, etc.
  children: ListItemNode[];   // Nested sub-lists
  properties: {
    textLength: number;
    isEmpty: boolean;
  };
}

interface InlineNode {
  type: "b" | "i" | "s" | "strong" | "em";
  id: string;
  contentHash: number;
  hasMarkdownMarkers: boolean; // Does the surrounding text have ** or * or ~~ ?
  isEmpty: boolean;
}

interface FocusState {
  enabled: boolean;           // Toggle checkbox state
  maskApplied: boolean;       // Is the SVG mask CSS property set?
  focusLineY: number;         // Y position of the focus-line rect
  focusLineHeight: number;    // Height of the focus-line rect
}

interface ToolbarState {
  isExpanded: boolean;        // Is toolbar in active/expanded state?
}

interface ModalState {
  isOpen: boolean;
  documentCount: number;      // Number of thumbnails visible
  storageBarPercent: number;  // Storage progress bar value
}
```

#### Layer 3: Mutation Timeline (how the UI changed)

Built by diffing consecutive snapshots (see DOM State Capture Guide for implementation):

```typescript
interface Mutation {
  frameId: number;
  timestamp: number;
  nodeId: string;
  nodeType: string;
  field: string;              // "type" | "contentHash" | "visible" | "hasMarker" | "state"
  oldValue: unknown;
  newValue: unknown;
  parentId: string;
  parentType: string;
}
```

### Capture Triggers

| Trigger | Why | Frequency |
|---|---|---|
| **After input event** | Catches state after each keystroke/edit | Per-event |
| **After requestAnimationFrame** | Catches state after browser renders | Per-event |
| **Polling interval** (200ms) | Catches focus mode updates, CSS transitions | Every 200ms |
| **Before/after user action** | Brackets the cause→effect for shortcuts, paste, save | Per-action |

### Where Records Live

```
test-results/editor-eval/<scenario>-<timestamp>/
  ├── user-actions.json        (Layer 1: user interaction log)
  ├── state-timeline.json      (Layer 2: editor state snapshots)
  ├── mutations.json           (Layer 3: block-level state changes)
  ├── anomaly-report.json      (aggregated anomalies — the verdict)
  ├── metadata.json            (scenario config, browser, timing)
  └── screenshots/
      ├── frame-0000-0ms.png
      ├── frame-0005-800ms.png
      └── final.png
```

---

## 5. Step 4: CAPTURE — Record the Real System

**Principle**: Mock nothing. Open the real editor in a real browser. Type real content. Paste real clipboard data. The non-determinism of browser behavior and contenteditable is the point.

### Why No Mocking?

| Mocked Test | Eval Loop |
|---|---|
| Tests your transforms against a fake DOM | Tests your transforms against a real browser's contenteditable |
| Passes when your JSDOM stub is correct | Passes when the real browser produces correct output |
| Never catches browser-specific bugs | Catches Chrome vs. Firefox divergence |
| "Test passes" with a clean fake DOM | "Zero anomalies" with a dirty real DOM |

### Capture Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Playwright Test Process                                      │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────────────────┐      │
│  │  Scenario Runner  │  │  Report Writer                │      │
│  │  - open index.html│  │  - state-timeline.json        │      │
│  │  - type text      │  │  - mutations.json             │      │
│  │  - press shortcuts│  │  - anomaly-report.json        │      │
│  │  - paste content  │  │  - screenshots/               │      │
│  └──────┬───────────┘  └──────────────────────────────┘      │
│         │                                                     │
│         │ page.evaluate()                                     │
│         ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Injected Capture Function (runs in browser)           │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │ CAPTURE_FN                                        │  │   │
│  │  │ - reads #editor DOM → block tree                  │  │   │
│  │  │ - reads localStorage → store state                │  │   │
│  │  │ - reads SVG mask → focus mode state               │  │   │
│  │  │ - runs inline anomaly detectors                   │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Post-Run Analysis                                     │   │
│  │  - Aggregate inline anomalies                          │   │
│  │  - Cross-snapshot temporal detectors                    │   │
│  │  - Mutation timeline analysis                          │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Scenario Design

Scenarios are **user behavior patterns**. They exercise taskflows naturally.

```
Good scenario — "Write a structured document":
  1. Type "# Introduction" → Enter → type a paragraph
  2. Type "## Background" → Enter → type a paragraph
  3. Type "- first item" → Enter → "- second item" → Tab (indent)
  4. Type some **bold** and *italic* text
  5. Ctrl+S → save
  6. Ctrl+Z × 3 → undo three times
  7. Ctrl+Y × 2 → redo twice

Why it's good:
  - Exercises heading creation, list nesting, inline styling, save, undo/redo
  - The DOM structure at each step is checked by invariants
  - Detectors don't assert specific content — they check structural properties

Good scenario — "Paste from external source":
  1. Paste formatted HTML from a web page (bold, colors, font-family)
  2. Paste markdown text with headings, lists, bold
  3. Paste plain text with line breaks
  4. Ctrl+S → save
  5. Reload → verify content survived

Why it's good:
  - Exercises the full paste pipeline
  - Checks that external formatting is stripped
  - Verifies save/restore round-trip

Bad scenario — "Type exactly 'Hello World'":
  - Deterministic expectation. Tests nothing about DOM integrity.
  - Doesn't exercise any transformation path.
```

### Session Idle Detection

The editor is fully client-side — there's no backend to wait for. Stability means "the DOM structure hasn't changed":

```typescript
const STABILITY_THRESHOLD = 10; // 10 polls × 200ms = 2 seconds no change

let stableCount = 0;
while (stableCount < STABILITY_THRESHOLD) {
  const snapshot = await capture();
  const fingerprint = buildFingerprint(snapshot.visual);
  if (fingerprint !== lastFingerprint) {
    stableCount = 0;
    lastFingerprint = fingerprint;
    timeline.push(snapshot);
  } else {
    stableCount++;
  }
  await wait(200);
}
```

---

## 6. Step 5: DETECT — Find Anomalies

### Mechanism 1: Temporal Invariant Rules

Rules expressed over the mutation timeline — they check how state EVOLVES, not what state exists at one moment.

```
RULE: heading_immutability
  "Once a heading is fully formed (has marker, has text), its marker text must not
   change unless the heading level changes or the heading reverts to a <div>."
  → Catches: heading markers silently corrupting

RULE: monotonic_block_type
  "A block transforms: div → h1..h6 (heading creation) or h1..h6 → div (heading reversion)
   or div → ul/ol (list creation). A heading NEVER transforms directly to a list or vice versa."
  → Catches: broken transformations that skip intermediate states

RULE: inline_style_immutability
  "Once an inline style element (b/i/s) is created, its text content only changes
   while the cursor is inside it. After the cursor leaves, content is immutable."
  → Catches: styled text mutating after the user has moved on

RULE: focus_line_tracks_cursor
  "When the cursor changes blocks, the focus line Y position must change within 200ms.
   When the cursor stays in the same visual line, Y position must not change."
  → Catches: focus mode not tracking, focus mode tracking the wrong line

RULE: undo_restores_exact_state
  "After an undo action, editor.innerHTML must exactly equal the recorded
   undo history state at the new index."
  → Catches: undo producing a different state than recorded

RULE: block_never_orphaned
  "Once a block (div, heading, list) exists in the editor, it persists in subsequent
   snapshots unless the user explicitly deletes it (Backspace/Delete) or transforms it."
  → Catches: blocks silently disappearing due to DOM corruption

RULE: zwsp_count_monotonic_per_block
  "In a given block, ZWSP count only increases (inline styles added) or decreases
   (styles removed). It should never oscillate or spike."
  → Catches: ZWSP multiplication bugs (each edit adds more ZWSPs)
```

### Mechanism 2: Heuristic Detection (Inline)

Point-in-time checks that run inside the capture function on every snapshot:

- All detectors from the catalog in Step 2
- Run at capture time for precise timestamps
- Boolean invariants — violated or not

### Mechanism 3: Manual / Visual Inspection

For a single-developer project without LLM integration in the eval loop, visual inspection replaces semantic LLM evaluation:

- Screenshots at key frames can be compared manually
- The mutation timeline can be reviewed for unexpected state changes
- The anomaly report highlights exactly where to look

### The Anomaly Report

```json
{
  "scenario": "write-structured-document",
  "browser": "Chrome 126",
  "timestamp": "2026-04-11T12:00:00.000Z",
  "verdict": "CLEAN",
  "summary": {
    "critical": 0,
    "warning": 1,
    "info": 3
  },
  "frames": 34,
  "durationMs": 8200,
  "anomalies": [
    {
      "code": "STRAY_ZWSP",
      "severity": "warning",
      "count": 2,
      "firstSeen": "frame-12",
      "message": "2 ZWSP characters found in plain text blocks (not adjacent to styled elements)"
    }
  ]
}
```

**Zero critical + zero warning = CLEAN.**

---

## 7. Step 6: CONVERGE — The Loop Is the Test

```
Run 1:  12 anomalies (3 critical, 5 warning, 4 info)
  → Fix 3 critical (orphan text nodes after paste, heading marker editable, stray script tag)
  → Commit: "fix: resolve 3 critical eval loop findings"

Run 2:  6 anomalies (0 critical, 3 warning, 3 info)
  → Fix 3 warnings (stray ZWSPs, empty <b> wrapper, <br> in heading)
  → Commit: "fix: resolve 3 warning eval loop findings"

Run 3:  3 anomalies (0 critical, 0 warning, 3 info)
  → Document 3 info-level as accepted
  → CLEAN ✅
```

### Why Multiple Runs?

Browser contenteditable is non-deterministic. Different runs exercise different code paths:

- Run 1: Paste triggers a different MutationObserver sequence
- Run 2: Line wrapping puts the cursor at a different Y position, exercising focus mode differently
- Run 3: Undo stack plays back in a slightly different state

### Convergence Criteria

```
For the feature to be considered VERIFIED:
  □ At least 3 independent runs per scenario
  □ Zero critical anomalies across ALL runs
  □ Zero warning anomalies across ALL runs (or documented exceptions)
  □ Any accepted info-level anomalies have written justification
  □ Tested in at least Chrome and Firefox (contenteditable behaves differently)
```

---

## 8. Applying This Framework — Checklist

```
STEP 1: DEFINE
  □ All taskflows documented (TF-1 through TF-9 above, extend as needed)
  □ User-visible invariants listed (INV-1 through INV-10)
  □ Content delivery contract defined
  □ Edge cases enumerated per taskflow

STEP 2: ENUMERATE
  □ Failure categories defined (A through H)
  □ Detector catalog written with code, severity, rule, check, trigger, why

STEP 3: PLAN RECORDING
  □ DOM selectors identified (#editor, h1-h6, .heading-marker, ul/ol/li, b/i/s)
  □ localStorage access methods identified
  □ SVG mask state access identified
  □ Snapshot schema designed (BlockNode, ListItemNode, InlineNode, FocusState)
  □ Capture triggers defined

STEP 4: CAPTURE (Playwright)
  □ Playwright test file created
  □ Scenario scripts from taskflows
  □ CAPTURE_FN reads DOM + localStorage + SVG mask + runs inline detectors
  □ Stability detection configured
  □ First run produces non-empty recordings

STEP 5: DETECT
  □ All heuristic detectors implemented in CAPTURE_FN
  □ Temporal invariant rules implemented over mutation timeline
  □ Anomaly report aggregation works

STEP 6: CONVERGE
  □ First run identifies real issues
  □ Fixes committed, re-run shows fewer anomalies
  □ 3 clean runs achieved in Chrome
  □ 3 clean runs achieved in Firefox
  □ Accepted info-level anomalies documented
```

---

## 9. Anti-Patterns

| Anti-Pattern | Why It Fails | Instead |
|---|---|---|
| **Asserting exact innerHTML** | Browser produces different whitespace, tag order, attribute order | Assert structural properties: block types, marker presence, nesting depth |
| **Testing in JSDOM** | JSDOM doesn't implement contenteditable, Selection API, or CSS layout | Use Playwright with a real browser |
| **Checking caret with offsets** | Caret offsets are sensitive to ZWSPs, marker spans, and browser differences | Check which block the caret is in, not the exact offset |
| **Recording raw MutationObserver** | Every keystroke produces dozens of characterData mutations — drowns signal | Record structured snapshots at meaningful moments |
| **Mocking paste clipboard** | The whole point is to test what REAL paste content does to the DOM | Use `page.evaluate(() => document.execCommand('insertHTML', ...))` with real HTML |
| **Ignoring Firefox** | Contenteditable produces fundamentally different DOM in Firefox | Run the eval loop in both browsers — different bugs surface |
| **One run = clean** | One clean run proves nothing — the next paste source may break the editor | At least 3 runs per scenario |

---

## 10. Relationship to Other Testing

| Testing Type | What It Does | What Eval Loop Adds |
|---|---|---|
| **Manual testing** | "Does it look right?" in one browser | Systematic, recorded, reproducible — with permanent artifacts |
| **Unit tests** (future) | Verify utility functions in isolation | Eval loop verifies utilities produce correct DOM in a real browser |
| **Visual regression** (screenshots) | "Did the pixels change?" | "The heading marker disappeared" vs. "some pixels changed" — structural, not visual |
| **Accessibility audit** | Check ARIA roles, labels | Eval loop checks that ARIA state matches visual state over time |

The eval loop fills the gap between "I tried it and it looked fine" and "I have structured evidence that it works across browsers, paste sources, and editing patterns."
