# Snapshot Timeline Spec — Per-Taskflow Capture Plan

> **Version**: 1.0  
> **Date**: April 11, 2026  
> **Scope**: Defines the canonical snapshot JSON schema, maps every taskflow to a timeline file with precise capture points, and specifies what heuristic and semantic checks each timeline enables.  
> **Prerequisite**: [Taskflows](taskflows.md), [DOM State Capture Guide](dom-state-capture-guide.md)

---

## 0. Overview

Each taskflow (TF-N) gets its own timeline JSON file — a recording of the editor's DOM state at each meaningful moment during that taskflow's execution. These timelines are the primary artifacts for both heuristic and semantic evaluation.

```
snapshots/
  ├── TF-01-basic-typing.timeline.json
  ├── TF-02-text-selection.timeline.json
  ├── TF-03-heading-creation.timeline.json
  │   ...
  ├── TF-60-rapid-editing.timeline.json
  └── _schema.json                        # JSON Schema for validation
```

Each file is self-contained: it has metadata, an ordered array of snapshot frames, and can be analyzed independently.

---

## 1. Canonical Snapshot Schema

### 1.1 Timeline Envelope

Every timeline file has this outer structure:

```json
{
  "schema": "md-focus-editor-timeline/1.0",
  "metadata": {
    "taskflow": "TF-03",
    "title": "Heading Creation (All Levels)",
    "category": "B. Block Transformations",
    "browser": "Chrome 126",
    "startTimestamp": 1744358400000,
    "totalFrames": 12,
    "totalDurationMs": 4800,
    "captureIntervalMs": 200,
    "stabilityThresholdPolls": 10,
    "userActions": [
      { "step": 1, "action": "type", "detail": "# ", "atMs": 0 },
      { "step": 2, "action": "type", "detail": "Introduction", "atMs": 300 }
    ]
  },
  "frames": [ /* Snapshot[] */ ],
  "mutations": [ /* Mutation[] — computed from frames */ ],
  "anomalyReport": {
    "verdict": "CLEAN",
    "summary": { "critical": 0, "warning": 0, "info": 1 },
    "anomalies": []
  }
}
```

### 1.2 Snapshot Frame

Each frame in the `frames` array:

```json
{
  "frameId": 0,
  "timestamp": 1744358400000,
  "elapsedMs": 0,
  "trigger": "initial",

  "visual": {
    "blockCount": 1,
    "viewportState": "has-content",
    "blocks": [ /* BlockNode[] */ ],
    "focusMode": { /* FocusState */ },
    "toolbar": { /* ToolbarState */ },
    "modal": { /* ModalState */ },
    "theme": "light",
    "caretBlock": 0
  },

  "store": {
    "currentDocId": "1744358399000-abc123",
    "currentDocName": "My Document",
    "documentCount": 1,
    "storageUsedBytes": 2048,
    "storageLimitBytes": 5242880,
    "focusEnabled": true,
    "fontSize": 16,
    "theme": "light",
    "storedContentHash": 48291,
    "undoStackDepth": 0,
    "redoStackDepth": 0
  },

  "anomalies": []
}
```

### 1.3 BlockNode — The Core Unit

Every direct child of `#editor` becomes a `BlockNode`:

```json
{
  "type": "h1",
  "id": "block-0",
  "position": 0,
  "contentHash": 44012,
  "visible": true,
  "textLength": 14,
  "isEmpty": false,
  "hasBr": false,

  "hasMarker": true,
  "markerText": "#",
  "markerEditable": false,
  "headingTextAfterMarker": "Introduction",

  "listItems": [],
  "maxNestingDepth": 0,

  "boldCount": 0,
  "italicCount": 0,
  "strikeCount": 0,
  "emptyInlineCount": 0,
  "zwspCount": 1,

  "children": []
}
```

**Field reference:**

| Field | Type | Present When | Purpose |
|-------|------|-------------|---------|
| `type` | string | Always | Tag name: `"div"`, `"h1"`–`"h6"`, `"ul"`, `"ol"` |
| `id` | string | Always | Positional: `"block-0"`, `"block-1"` |
| `position` | number | Always | DOM order among `#editor` children |
| `contentHash` | number | Always | Hash of trimmed text content (for change detection) |
| `visible` | boolean | Always | `offsetParent !== null \|\| offsetHeight > 0` |
| `textLength` | number | Always | Trimmed text length |
| `isEmpty` | boolean | Always | No visible text (after stripping ZWSPs) |
| `hasBr` | boolean | Always | Contains any `<br>` element |
| `hasMarker` | boolean | Always | Has `.heading-marker` span (headings only) |
| `markerText` | string | `hasMarker=true` | `"#"`, `"##"`, etc. |
| `markerEditable` | boolean | `hasMarker=true` | `true` = bug (marker should be non-editable) |
| `headingTextAfterMarker` | string | `hasMarker=true` | First 100 chars of text after marker |
| `listItems` | ListItemNode[] | `type=ul\|ol` | Recursive list item tree |
| `maxNestingDepth` | number | `type=ul\|ol` | Deepest nesting level |
| `boldCount` | number | Always | Count of `<b>` / `<strong>` elements |
| `italicCount` | number | Always | Count of `<i>` / `<em>` elements |
| `strikeCount` | number | Always | Count of `<s>` elements |
| `emptyInlineCount` | number | Always | Inline elements with zero text content |
| `zwspCount` | number | Always | Total `\u200B` characters in this block |
| `children` | BlockNode[] | Reserved | For future nested block support |

### 1.4 ListItemNode

```json
{
  "id": "li-2-0",
  "position": 0,
  "contentHash": 33781,
  "textLength": 10,
  "isEmpty": false,
  "nestingLevel": 0,
  "subItems": [
    {
      "id": "li-2-0-0",
      "position": 0,
      "contentHash": 12890,
      "textLength": 12,
      "isEmpty": false,
      "nestingLevel": 1,
      "subItems": []
    }
  ]
}
```

### 1.5 FocusState

```json
{
  "toggleChecked": true,
  "maskApplied": true,
  "focusLineY": 142,
  "focusLineHeight": 24,
  "focusLineWidth": 1920,
  "maskBaseOpacity": 0.3
}
```

### 1.6 ToolbarState

```json
{
  "isExpanded": false,
  "focusToggleChecked": true
}
```

### 1.7 ModalState

```json
{
  "isOpen": false,
  "thumbnailCount": 0,
  "storagePercent": 0
}
```

### 1.8 Anomaly

```json
{
  "code": "HEADING_MISSING_MARKER",
  "severity": "critical",
  "category": "structure",
  "message": "H1 at position 0 has no .heading-marker span",
  "trigger": "frame-3"
}
```

### 1.9 Mutation

```json
{
  "frameId": 2,
  "timestamp": 1744358400300,
  "nodeId": "block-0",
  "nodeType": "h1",
  "field": "type",
  "oldValue": "div",
  "newValue": "h1",
  "parentId": "editor",
  "parentType": "editor"
}
```

### 1.10 Trigger Values

| Trigger | When Used | Frequency |
|---------|-----------|-----------|
| `"initial"` | Before any user action | Once per timeline |
| `"after-type"` | After `page.keyboard.type()` completes | Per typing action |
| `"after-press"` | After `page.keyboard.press()` (Enter, Tab, Backspace, etc.) | Per keypress |
| `"after-shortcut"` | After Ctrl+B, Ctrl+S, Ctrl+Z, etc. | Per shortcut |
| `"after-paste"` | After clipboard paste completes | Per paste |
| `"after-click"` | After mouse click on UI element | Per click |
| `"after-toggle"` | After focus/theme/fullscreen toggle | Per toggle |
| `"after-save"` | After Ctrl+S + delay for save to complete | Per save |
| `"after-modal"` | After modal open/close | Per modal action |
| `"after-import"` | After file import completes | Per import |
| `"poll-200ms"` | Polling interval capture | Every 200ms during wait |
| `"stable"` | Stability threshold reached (no change for 2s) | Once at end |
| `"pre-action"` | Immediately before a destructive action | Before paste, undo |
| `"final"` | Last capture before scenario ends | Once per timeline |

---

## 2. Per-Taskflow Capture Plan

### 2.1 Plan Format

Each entry defines:
- **File**: Filename under `snapshots/`
- **Actions**: Playwright actions that simulate the taskflow
- **Capture Points**: When to take snapshots (using trigger labels)
- **Expected Frame Count**: Approximate number of frames
- **Critical Fields**: Which BlockNode/state fields are essential for this TF's detectors
- **Heuristic Checks**: Named checks from the detector catalog that fire on this timeline
- **Semantic Eval Questions**: Open-ended questions for human/LLM review

---

### A. Core Editing

#### TF-01: Basic Typing & Cursor

```
File: TF-01-basic-typing.timeline.json
Actions:
  1. click #editor                              → capture("initial")
  2. type "Hello world"                         → capture("after-type")
  3. press Enter                                → capture("after-press")
  4. type "Second paragraph"                    → capture("after-type")
  5. press Enter (at end of block)              → capture("after-press")
  6. press ArrowUp × 2                          → capture("after-press")
  7. position cursor mid-word, press Enter      → capture("after-press")
  8. press Backspace (at start of block)        → capture("after-press")
  9. press Home, then End                       → capture("after-press")
  10. Ctrl+A                                    → capture("after-shortcut")
  11. wait for stability                        → capture("stable")

Expected Frames: 12–15
Critical Fields: blockCount, type (all "div"), isEmpty, hasBr, caretBlock
Heuristic Checks:
  - ORPHAN_TEXT_NODE: No bare text nodes after any action
  - Every block.type === "div" (no accidental transformations)
  - blockCount increases on Enter, decreases on Backspace-merge
Semantic Eval:
  - Does Enter mid-text correctly split the block?
  - Does Backspace-at-start correctly merge blocks?
  - Does the caret track to the expected block after each action?
```

#### TF-02: Text Selection

```
File: TF-02-text-selection.timeline.json
Actions:
  1. type "Hello world, this is a test"        → capture("initial-content")
  2. press Enter, type "Second line of text"    → capture("after-type")
  3. triple-click line 1 (select block)         → capture("after-click")
  4. click to deselect                          → capture("after-click")
  5. double-click a word                        → capture("after-click")
  6. Shift+click to extend selection            → capture("after-click")
  7. press Delete with selection active         → capture("after-press")
  8. wait for stability                         → capture("stable")

Expected Frames: 10–12
Critical Fields: blockCount, textLength, contentHash, caretBlock
Heuristic Checks:
  - ORPHAN_TEXT_NODE after deletion
  - blockCount correct after cross-block deletion
Semantic Eval:
  - Does delete with selection remove exactly the selected content?
  - Does block merge happen correctly on cross-block delete?
```

---

### B. Block Transformations

#### TF-03: Heading Creation (All Levels)

```
File: TF-03-heading-creation.timeline.json
Actions:
  1. capture("initial")                         → empty editor
  2. type "# "                                  → capture("after-type")
     — CRITICAL: block type must change div → h1
  3. type "Heading One"                         → capture("after-type")
  4. press Enter                                → capture("after-press")
  5. type "## Second Heading"                   → capture("after-type")
     — block type must change div → h2
  6. press Enter                                → capture("after-press")
  7. type "### Third"                           → capture("after-type")
  8. press Enter                                → capture("after-press")
  9. type "#### Fourth"                         → capture("after-type")
  10. press Enter                               → capture("after-press")
  11. type "##### Fifth"                        → capture("after-type")
  12. press Enter                               → capture("after-press")
  13. type "###### Sixth"                       → capture("after-type")
  14. press Enter                               → capture("after-press")
  15. type "####### Not a heading"              → capture("after-type")
     — CRITICAL: block type must remain "div"
  16. capture("stable")

Expected Frames: 18–22
Critical Fields: type (h1–h6 vs div), hasMarker, markerText, markerEditable,
                 headingTextAfterMarker, zwspCount
Heuristic Checks:
  - HEADING_MISSING_MARKER: Every h1–h6 has hasMarker=true
  - HEADING_MARKER_EDITABLE: Every marker has markerEditable=false
  - Marker text matches heading level (# for h1, ## for h2, etc.)
  - 7+ hashes does NOT create a heading
  - zwspCount === 1 for each heading block
  - New block after Enter is "div" (not another heading)
Temporal Checks:
  - checkBlockTypeTransitions: div→h1, div→h2, ... all valid
  - checkMarkerAppearance: marker appears in same frame as type change
Semantic Eval:
  - Do all 6 heading levels render correctly?
  - Does the 7-hash case correctly stay as plain text?
  - Is the marker text visually correct for each level?
```

#### TF-04: Heading Reversion

```
File: TF-04-heading-reversion.timeline.json
Actions:
  1. type "# Some heading text"                 → capture("after-heading")
  2. capture("pre-action")
  3. position cursor after ZWSP, press Backspace → capture("after-press")
     — CRITICAL: h1 must revert to div, marker must disappear
  4. type "## Another heading"                  → capture("after-type")
  5. select all text in heading, press Delete    → capture("after-press")
     — heading should persist (only revert if ZWSP deleted)
  6. press Backspace to delete ZWSP             → capture("after-press")
     — heading reverts
  7. capture("stable")

Expected Frames: 10–14
Critical Fields: type (h1→div transition), hasMarker (true→false), zwspCount,
                 contentHash
Heuristic Checks:
  - After reversion: type==="div", hasMarker===false
  - No orphan marker spans left in the DOM
  - Hashes appear as plain text in reverted div
Temporal Checks:
  - checkBlockTypeTransitions: h1→div, h2→div (valid)
  - Marker disappears (hasMarker true→false) in same or next frame as type change
Semantic Eval:
  - Does the hash text survive the reversion as literal characters?
  - Is the cursor position preserved after reversion?
```

#### TF-05: Heading Content Editing

```
File: TF-05-heading-editing.timeline.json
Actions:
  1. type "## Introduction"                     → capture("after-heading")
  2. type " to the guide"                       → capture("after-type")
     — CRITICAL: no re-render, heading structure unchanged
  3. click inside heading to reposition cursor   → capture("after-click")
  4. select "Introduction", press Ctrl+B         → capture("after-shortcut")
     — bold inside heading, marker+ZWSP preserved
  5. press Enter mid-heading                     → capture("after-press")
     — heading splits, second block becomes div
  6. capture("stable")

Expected Frames: 8–12
Critical Fields: type, hasMarker, markerText, boldCount, contentHash
Heuristic Checks:
  - Heading structure unchanged during normal typing (type stays h2, marker stays)
  - After Ctrl+B: boldCount === 1, heading still h2
  - After Enter mid-heading: first block is h2 with marker, second is div without
Semantic Eval:
  - Does inline styling preserve heading structure?
  - Does Enter correctly split without duplicating the heading marker?
```

#### TF-06: Unordered List Creation

```
File: TF-06-ul-creation.timeline.json
Actions:
  1. capture("initial")
  2. type "- "                                  → capture("after-type")
     — CRITICAL: div transforms to ul > li
  3. type "First item"                          → capture("after-type")
  4. press Enter                                → capture("after-press")
     — browser creates new li
  5. type "Second item"                         → capture("after-type")
  6. press Enter                                → capture("after-press")
  7. type "* Third with asterisk"               → capture("after-type")
     — if in a new div: transforms to another ul
  8. capture("stable")

Expected Frames: 10–14
Critical Fields: type ("ul"), listItems array, listItems[].contentHash,
                 listItems[].nestingLevel, maxNestingDepth
Heuristic Checks:
  - ORPHAN_LIST_ITEM: every li inside ul
  - EMPTY_LIST_CONTAINER: no empty ul
  - List item count matches expected
  - All markers (-, *, +) produce identical ul structure
Temporal Checks:
  - checkBlockTypeTransitions: div→ul (valid)
Semantic Eval:
  - Does "- " correctly strip the marker from li content?
  - Does Enter in a list create a new li at the correct position?
```

#### TF-07: Ordered List Creation

```
File: TF-07-ol-creation.timeline.json
Actions:
  1. type "1. First ordered"                    → capture("after-type")
     — div → ol > li
  2. press Enter                                → capture("after-press")
  3. type "Second ordered"                      → capture("after-type")
  4. press Enter, type into new div
  5. type "42. Multi-digit"                     → capture("after-type")
     — div → ol > li
  6. type "1." (no trailing space)              → capture("after-type")
     — CRITICAL: must NOT transform
  7. capture("stable")

Expected Frames: 10–12
Critical Fields: type ("ol"), listItems, textLength
Heuristic Checks:
  - Type is "ol" (not "ul")
  - No transformation for "1." without space
Temporal Checks:
  - checkBlockTypeTransitions: div→ol (valid)
Semantic Eval:
  - Does multi-digit number trigger correctly?
  - Does missing space prevent transformation?
```

#### TF-08: List Item Creation (Enter)

```
File: TF-08-list-enter.timeline.json
Actions:
  1. type "- First"                             → capture("after-type")
  2. press Enter                                → capture("after-press")
  3. type "Second"                              → capture("after-type")
  4. press Enter                                → capture("after-press")
  5. press Enter (empty li — may exit list)     → capture("after-press")
  6. capture("stable")

Expected Frames: 8–10
Critical Fields: type, listItems.length, listItems[].isEmpty
Heuristic Checks:
  - li count increases on Enter
  - Empty li + Enter behavior is captured (browser-specific)
Semantic Eval:
  - Does Enter correctly split text between old and new li?
  - What happens on Enter in an empty li? (Browser-dependent)
```

#### TF-09: List Indentation (Tab)

```
File: TF-09-list-indent.timeline.json
Actions:
  1. type "- Item one"                          → capture("after-ul")
  2. press Enter, type "Item two"               → capture("after-type")
  3. press Enter, type "Item three"             → capture("after-type")
  4. capture("pre-action")
  5. position cursor on "Item two", press Tab   → capture("after-press")
     — CRITICAL: li nests under "Item one"
  6. capture("pre-action")
  7. position cursor on "Item three", press Tab → capture("after-press")
     — further nesting or nests under "Item two"
  8. press Tab again on item three              → capture("after-press")
     — deeper nesting
  9. capture("stable")

Expected Frames: 12–16
Critical Fields: listItems (recursive), nestingLevel, maxNestingDepth, contentHash
Heuristic Checks:
  - nestingLevel increases by exactly 1 per Tab
  - List type preserved (ul stays ul)
  - Content hash unchanged (text not modified)
  - Tab on first item with no previous sibling → no change
Temporal Checks:
  - nestingLevel monotonically increases per Tab
  - No ORPHAN_LIST_ITEM after indentation
Semantic Eval:
  - Does the visual nesting match the DOM structure?
  - Is cursor position preserved after indent?
```

#### TF-10: List Outdentation (Shift+Tab)

```
File: TF-10-list-outdent.timeline.json
Actions:
  1. Create nested list: 3 items, item 2 nested → capture("setup-complete")
  2. position cursor on nested item
  3. press Shift+Tab                            → capture("after-press")
     — item outdents one level
  4. press Shift+Tab on top-level only item     → capture("after-press")
     — CRITICAL: li converts to div
  5. Create list with 3 items, Shift+Tab middle → capture("after-press")
     — CRITICAL: list splits
  6. capture("stable")

Expected Frames: 12–16
Critical Fields: type (ul/ol→div transitions), listItems, nestingLevel,
                 blockCount (increases when list splits)
Heuristic Checks:
  - Top-level only-item Shift+Tab → type changes from ul/ol to div
  - List split → blockCount increases
  - No ORPHAN_LIST_ITEM
  - No EMPTY_LIST_CONTAINER
Temporal Checks:
  - checkBlockTypeTransitions: ul→div (valid for top-level outdent)
Semantic Eval:
  - Does the middle-item split create two valid lists with a div between?
  - Is following-sibling reattachment correct?
```

#### TF-11: List Deletion (Backspace)

```
File: TF-11-list-backspace.timeline.json
Actions:
  1. Create list: "- A" Enter "B" Enter "C"    → capture("setup")
  2. position cursor at start of "B"
  3. press Backspace                            → capture("after-press")
     — merges with "A"
  4. position cursor at start of first li
  5. press Backspace                            → capture("after-press")
     — browser-specific behavior
  6. capture("stable")

Expected Frames: 8–12
Critical Fields: type, listItems.length, textLength, blockCount
Heuristic Checks:
  - li count decreases on merge
  - No ORPHAN_LIST_ITEM
Semantic Eval:
  - Does Backspace at list start behave sensibly (browser-dependent)?
```

---

### C. Inline Styling

#### TF-12: Bold via Markdown Syntax

```
File: TF-12-bold-markdown.timeline.json
Actions:
  1. type "Normal text "                        → capture("after-type")
  2. type "**h"                                 → capture("after-type")
     — CRITICAL: **<b>h</b>** + ZWSP created
  3. type "ello"                                → capture("after-type")
     — text grows inside <b>
  4. move cursor past ZWSP, type " unstyled"    → capture("after-type")
     — text is OUTSIDE <b>
  5. capture("stable")

Expected Frames: 8–10
Critical Fields: boldCount, zwspCount, textLength, contentHash
Heuristic Checks:
  - boldCount === 1 after step 2
  - zwspCount increases by 1 (ZWSP after styled element)
  - EMPTY_STYLE_WRAPPER: boldCount matches non-empty bold elements
Semantic Eval:
  - Does typing after ZWSP produce unstyled text?
  - Are markdown markers ** visually present flanking the <b>?
```

#### TF-13: Italic via Markdown Syntax

```
File: TF-13-italic-markdown.timeline.json
Actions:
  1. type "Some *h"                             → capture("after-type")
     — *<i>h</i>* + ZWSP
  2. type "ello"                                → capture("after-type")
  3. type " more text"                          → capture("after-type")
  4. capture("stable")

Expected Frames: 6–8
Critical Fields: italicCount, zwspCount
Heuristic Checks:
  - italicCount === 1 after single-star trigger
  - Single star doesn't trigger bold (boldCount === 0)
Semantic Eval:
  - Is single-star correctly distinguished from double-star?
```

#### TF-14: Bold-Italic via Markdown Syntax

```
File: TF-14-bold-italic-markdown.timeline.json
Actions:
  1. type "***h"                                → capture("after-type")
     — ***<b><i>h</i></b>*** + ZWSP
  2. type "ello"                                → capture("after-type")
  3. capture("stable")

Expected Frames: 5–7
Critical Fields: boldCount, italicCount, zwspCount
Heuristic Checks:
  - boldCount === 1 AND italicCount === 1 (nested)
  - Triple-star takes precedence over double and single
Semantic Eval:
  - Are both bold and italic visually applied?
```

#### TF-15: Strikethrough via Markdown Syntax

```
File: TF-15-strikethrough-markdown.timeline.json
Actions:
  1. type "~~h"                                 → capture("after-type")
     — ~~<s>h</s>~~ + ZWSP
  2. type "ello"                                → capture("after-type")
  3. capture("stable")

Expected Frames: 5–7
Critical Fields: strikeCount, zwspCount
Heuristic Checks:
  - strikeCount === 1
  - No empty <s> wrappers
```

#### TF-16: Bold via Ctrl+B

```
File: TF-16-bold-shortcut.timeline.json
Actions:
  1. type "Select this text"                    → capture("after-type")
  2. select "this"                              → capture("pre-action")
  3. press Ctrl+B                               → capture("after-shortcut")
     — **<b>this</b>** + ZWSP
  4. click to deselect                          → capture("after-click")
  5. position cursor in plain text, Ctrl+B      → capture("after-shortcut")
     — empty <b> created
  6. type "bolded"                              → capture("after-type")
  7. capture("stable")

Expected Frames: 10–12
Critical Fields: boldCount, zwspCount, textLength
Heuristic Checks:
  - boldCount increases after Ctrl+B
  - Selected text is inside <b>
  - Empty <b> created when no selection
Semantic Eval:
  - Is whitespace trimming applied to the selection?
  - Does the text remain selected after Ctrl+B?
```

#### TF-17: Italic via Ctrl+I

```
File: TF-17-italic-shortcut.timeline.json
  (Same structure as TF-16 with italicCount instead of boldCount)
```

#### TF-18: Strikethrough via Ctrl+Shift+S

```
File: TF-18-strikethrough-shortcut.timeline.json
  (Same structure as TF-16 with strikeCount)
```

#### TF-19: Inline Style Break-Out

```
File: TF-19-style-breakout.timeline.json
Actions:
  1. type "**hello"                             → capture("after-bold")
  2. type "**w"                                 → capture("after-type")
     — CRITICAL: old <b> closes, new <b> created after
  3. type "orld"                                → capture("after-type")
  4. capture("stable")

Expected Frames: 6–8
Critical Fields: boldCount (should be 2 after breakout), zwspCount
Heuristic Checks:
  - boldCount === 2 (two separate <b> elements)
  - No nested <b> inside <b>
Semantic Eval:
  - Is the break-out clean — two independent styled regions?
```

---

### D. Focus Mode

#### TF-20: Focus Mode Toggle

```
File: TF-20-focus-toggle.timeline.json
Actions:
  1. capture("initial")                         → focusMode state
  2. uncheck focus toggle                       → capture("after-toggle")
     — maskApplied must become false
  3. check focus toggle                         → capture("after-toggle")
     — maskApplied must become true
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: focusMode.toggleChecked, focusMode.maskApplied,
                 store.focusEnabled
Heuristic Checks:
  - FOCUS_MASK_WHEN_TOGGLE_OFF: maskApplied===false when toggleChecked===false
  - FOCUS_MASK_MISSING_WHEN_ON: maskApplied===true when toggleChecked===true
  - store.focusEnabled matches toggle state
Semantic Eval:
  - Does the visual dimming disappear when toggle is OFF?
```

#### TF-21: Focus Line Tracking — Cursor Movement

```
File: TF-21-focus-cursor-tracking.timeline.json
Actions:
  1. type "Line one" Enter "Line two" Enter "Line three" → capture("setup")
  2. click on line 1                            → capture("after-click")
  3. click on line 3                            → capture("after-click")
     — focusLineY must change
  4. press ArrowUp                              → capture("after-press")
     — focusLineY must change
  5. press Home                                 → capture("after-press")
     — focusLineY should NOT change
  6. capture("stable")

Expected Frames: 8–12
Critical Fields: focusMode.focusLineY, focusMode.focusLineHeight, caretBlock
Heuristic Checks:
  - focusLineY changes when caretBlock changes
  - focusLineY stays same when only horizontal movement (Home/End)
  - focusLineHeight > 0 when focus is on
Semantic Eval:
  - Does the focus highlight visually follow the cursor?
```

#### TF-22: Focus Line Tracking — Content Changes

```
File: TF-22-focus-content-changes.timeline.json
Actions:
  1. type long text that wraps                  → capture("after-type")
  2. press Enter (new line)                     → capture("after-press")
     — focusLineY must move to new line
  3. delete text causing unwrap                 → capture("after-press")
  4. capture("stable")

Expected Frames: 6–10
Critical Fields: focusMode.focusLineY, blockCount
Semantic Eval:
  - Does focus line track correctly during line wrap changes?
```

#### TF-23: Focus Mode with Headings and Lists

```
File: TF-23-focus-headings-lists.timeline.json
Actions:
  1. type "# Heading" Enter "- list item"       → capture("setup")
  2. click inside heading                       → capture("after-click")
     — focusLineY on heading line
  3. click inside list item                     → capture("after-click")
     — focusLineY on li line, not entire list
  4. capture("stable")

Expected Frames: 6–8
Critical Fields: focusMode.focusLineY, caretBlock, blocks[].type
Semantic Eval:
  - Does focus highlight the heading line specifically?
  - Does focus highlight the li line, not the whole ul?
```

#### TF-24: Focus Mode with Window Resize

```
File: TF-24-focus-resize.timeline.json
Actions:
  1. type content with focus on                 → capture("initial")
  2. resize viewport (page.setViewportSize)     → capture("after-resize")
     — focusLineWidth must change
  3. restore viewport                           → capture("after-resize")
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: focusMode.focusLineWidth, focusMode.focusLineY
Semantic Eval:
  - Does the mask width track the viewport width?
```

---

### E. Toolbar & App Controls

#### TF-25: Toolbar Activation

```
File: TF-25-toolbar-activation.timeline.json
Actions:
  1. capture("initial")                         → toolbar.isExpanded=false
  2. click #toolbar                             → capture("after-click")
     — isExpanded=true
  3. click outside toolbar                      → capture("after-click")
     — isExpanded=false
  4. capture("stable")

Expected Frames: 5–6
Critical Fields: toolbar.isExpanded
Heuristic Checks:
  - Toolbar expands on click, collapses on outside click
```

#### TF-26: Font Size Controls

```
File: TF-26-font-size.timeline.json
Actions:
  1. capture("initial")                         → store.fontSize = 16
  2. click #increase-font                       → capture("after-click")
     — store.fontSize = 18
  3. click #increase-font × 15                  → capture("after-click")
     — store.fontSize should cap at 48
  4. click #decrease-font × 20                  → capture("after-click")
     — store.fontSize should cap at 8
  5. capture("stable")

Expected Frames: 6–8
Critical Fields: store.fontSize
Heuristic Checks:
  - Font size clamps between 8 and 48
  - localStorage fontSize matches store.fontSize
```

#### TF-27: Fullscreen Toggle

```
File: TF-27-fullscreen.timeline.json
Actions:
  1. click #fullscreen                          → capture("after-click")
  2. click #fullscreen (or Esc)                 → capture("after-click")
  3. capture("stable")

Expected Frames: 4–5
Critical Fields: (fullscreen state not captured in snapshot — info only)
Semantic Eval:
  - Does the editor fill the screen in fullscreen mode?
```

---

### F. Document Management

#### TF-28: Save Existing Document

```
File: TF-28-save-existing.timeline.json
Actions:
  1. type "New content"                         → capture("after-type")
  2. press Ctrl+S                               → capture("after-save")
  3. wait 500ms                                 → capture("poll-200ms")
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: store.storedContentHash, store.currentDocId, visual contentHash
Heuristic Checks:
  - STORE_CONTENT_DIVERGENCE: after save, storedContentHash should match editor
  - currentDocId is not null
Semantic Eval:
  - Does the save notification appear?
  - Does the stored content match the editor content?
```

#### TF-29: Save As

```
File: TF-29-save-as.timeline.json
Actions:
  1. type "Content for new doc"                 → capture("after-type")
  2. press Ctrl+Shift+S                         → capture("after-shortcut")
     — (prompt dialog — handle in Playwright)
  3. capture("after-save")
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: store.currentDocId (should change), store.documentCount (should increment)
```

#### TF-30: New Document

```
File: TF-30-new-document.timeline.json
Actions:
  1. type "Existing content"                    → capture("after-type")
  2. press Ctrl+N                               → capture("after-shortcut")
     — (prompt dialog for name)
  3. capture("after-new-doc")
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: blockCount (should be 1, empty), store.currentDocId (changed),
                 store.undoStackDepth (should be 0 or 1)
Heuristic Checks:
  - Editor is empty (blockCount=1, isEmpty=true, hasBr=true)
  - documentCount increases by 1
  - undoStackDepth reset
```

#### TF-31: Open Document Modal

```
File: TF-31-open-modal.timeline.json
Actions:
  1. capture("initial")
  2. press Ctrl+O                               → capture("after-modal")
     — modal.isOpen=true
  3. capture("modal-open")
     — thumbnailCount matches documentCount
  4. press Escape                               → capture("after-modal")
     — modal.isOpen=false
  5. capture("stable")

Expected Frames: 6–8
Critical Fields: modal.isOpen, modal.thumbnailCount, modal.storagePercent,
                 store.documentCount
Heuristic Checks:
  - modal.thumbnailCount === store.documentCount
  - storagePercent between 0 and 100
  - Modal opens and closes cleanly
```

#### TF-32: Load Document from Modal

```
File: TF-32-load-document.timeline.json
Actions:
  1. Create 2 documents (Ctrl+N × 2)          → capture("setup")
  2. press Ctrl+O                              → capture("modal-open")
  3. click first document thumbnail            → capture("after-click")
     — modal closes, content loads
  4. capture("after-load")
  5. capture("stable")

Expected Frames: 8–12
Critical Fields: store.currentDocId (changed), blockCount, contentHash (changed),
                 modal.isOpen (false after load), store.undoStackDepth (reset)
Heuristic Checks:
  - Modal closes after click
  - Editor content matches loaded document
  - Undo history reset
```

#### TF-33: Delete Document

```
File: TF-33-delete-document.timeline.json
Actions:
  1. Create a document                         → capture("setup")
  2. press Ctrl+O                              → capture("modal-open")
  3. hover thumbnail, click delete button      → capture("after-click")
     — confirm dialog appears
  4. confirm deletion                          → capture("after-delete")
  5. capture("stable")

Expected Frames: 8–10
Critical Fields: store.documentCount (decreases), modal.thumbnailCount (decreases),
                 store.currentDocId (may clear)
Heuristic Checks:
  - documentCount decreases by 1
  - thumbnailCount matches new documentCount
```

---

### G. Import & Export

#### TF-34: Export Backup

```
File: TF-34-export-backup.timeline.json
Actions:
  1. Create 2 documents                        → capture("setup")
  2. press Ctrl+O                              → capture("modal-open")
  3. click Export button                       → capture("after-click")
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: store.documentCount, modal.isOpen
Semantic Eval:
  - Does a file download trigger?
  - Is the filename format correct?
```

#### TF-35: Import JSON Backup

```
File: TF-35-import-json.timeline.json
Actions:
  1. capture("initial")                        → note documentCount
  2. press Ctrl+O                              → capture("modal-open")
  3. trigger JSON file import                  → capture("after-import")
     — documentCount should increase
  4. capture("stable")

Expected Frames: 6–10
Critical Fields: store.documentCount (increases), modal.thumbnailCount (increases)
Heuristic Checks:
  - documentCount increases by number of non-conflicting imports
Semantic Eval:
  - Are newly imported docs shown with orange-yellow border?
  - Are conflicting docs shown with red border?
```

#### TF-36: Import Markdown File

```
File: TF-36-import-md.timeline.json
  (Same pattern as TF-35 but for single md file)
```

#### TF-37: Drag-and-Drop File Import

```
File: TF-37-drag-drop.timeline.json
Actions:
  1. capture("initial")
  2. drag .md file onto editor (page.dispatchEvent) → capture("after-import")
  3. capture("stable")

Expected Frames: 5–7
Critical Fields: store.currentDocId (changed), blockCount, contentHash
Heuristic Checks:
  - documentCount increases by 1
  - Editor content matches dropped file
```

---

### H. Paste Handling

#### TF-38: Paste Plain Text

```
File: TF-38-paste-plain.timeline.json
Actions:
  1. type "Before "                            → capture("after-type")
  2. capture("pre-action")
  3. paste "pasted text\nwith newlines"        → capture("after-paste")
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: blockCount (increases for newlines), textLength, contentHash
Heuristic Checks:
  - ORPHAN_TEXT_NODE: no bare text nodes after paste
  - SCRIPT_TAG_IN_EDITOR: no scripts injected
  - blockCount matches expected (1 per newline + original)
```

#### TF-39: Paste HTML from External Source

```
File: TF-39-paste-html.timeline.json
Actions:
  1. capture("initial")
  2. capture("pre-action")
  3. paste HTML with <div style="color:red;font-family:Comic Sans">styled</div>
     → capture("after-paste")
  4. paste HTML with <script>alert(1)</script>  → capture("after-paste")
  5. capture("stable")

Expected Frames: 6–8
Critical Fields: blocks[].type, boldCount, italicCount, strikeCount
Heuristic Checks:
  - SCRIPT_TAG_IN_EDITOR: critical — must never appear
  - No external CSS classes or inline styles survive
  - Only allowed tags (div, h1-h6, ul, ol, li, b, i, s, strong, em)
Semantic Eval:
  - Is all external formatting stripped?
  - Is structural content (headings, lists) preserved?
```

#### TF-40: Paste Inline Markdown

```
File: TF-40-paste-inline-md.timeline.json
Actions:
  1. capture("initial")
  2. paste "**bold text**"                     → capture("after-paste")
     — boldCount should be 1
  3. paste "*italic*"                          → capture("after-paste")
     — italicCount should be 1
  4. paste "~~strike~~"                        → capture("after-paste")
     — strikeCount should be 1
  5. capture("stable")

Expected Frames: 7–10
Critical Fields: boldCount, italicCount, strikeCount, zwspCount
Heuristic Checks:
  - Each paste produces exactly 1 styled element
  - ZWSP inserted after each styled element
  - EMPTY_STYLE_WRAPPER: no empty wrappers
```

#### TF-41: Paste Block-Level Markdown

```
File: TF-41-paste-block-md.timeline.json
Actions:
  1. capture("initial")
  2. paste "# Heading\n\nParagraph\n\n- Item 1\n- Item 2"
     → capture("after-paste")
  3. capture("stable")

Expected Frames: 4–6
Critical Fields: blocks[].type (h1, div, ul), hasMarker, listItems
Heuristic Checks:
  - Heading block has marker
  - List block has correct items
  - HEADING_MISSING_MARKER if heading present without marker
```

#### TF-42: Paste Security

```
File: TF-42-paste-security.timeline.json
Actions:
  1. capture("initial")
  2. paste "<script>alert('xss')</script>"     → capture("after-paste")
  3. paste "<img onerror='alert(1)' src=x>"    → capture("after-paste")
  4. paste "<iframe src='evil.com'></iframe>"  → capture("after-paste")
  5. capture("stable")

Expected Frames: 6–8
Critical Fields: (script/event handler presence)
Heuristic Checks:
  - SCRIPT_TAG_IN_EDITOR: MUST be zero in every frame — critical security
  - OBJECT_OBJECT_VISIBLE: no object coercion artifacts
  - No iframe, embed, object tags in DOM
Semantic Eval:
  - Does any JavaScript execute? (Would need browser console monitoring)
```

---

### I. Undo & Redo

#### TF-43: Undo Basic Edits

```
File: TF-43-undo-basic.timeline.json
Actions:
  1. type "Hello"                              → capture("after-type")
  2. type " World"                             → capture("after-type")
  3. press Ctrl+Z                              → capture("after-shortcut")
     — content reverts
  4. press Ctrl+Z                              → capture("after-shortcut")
  5. press Ctrl+Z (at initial state)           → capture("after-shortcut")
     — nothing happens
  6. capture("stable")

Expected Frames: 8–10
Critical Fields: contentHash, textLength, store.undoStackDepth, store.redoStackDepth
Heuristic Checks:
  - contentHash changes on each undo
  - undoStackDepth decreases, redoStackDepth increases
  - At initial state, undo is a no-op
```

#### TF-44: Undo Block Transformations

```
File: TF-44-undo-blocks.timeline.json
Actions:
  1. type "# Heading"                          → capture("after-heading")
     — block is h1 with marker
  2. press Ctrl+Z                              → capture("after-shortcut")
     — CRITICAL: h1 reverts to div, marker gone
  3. type "- list item"                        → capture("after-list")
  4. press Ctrl+Z                              → capture("after-shortcut")
     — ul reverts to div
  5. capture("stable")

Expected Frames: 8–12
Critical Fields: type (h1→div, ul→div transitions), hasMarker, listItems
Heuristic Checks:
  - After undo heading: type=div, hasMarker=false
  - After undo list: type=div, no listItems
Temporal Checks:
  - Type transitions match undo expectations
```

#### TF-45: Redo

```
File: TF-45-redo.timeline.json
Actions:
  1. type "Content"                            → capture("after-type")
  2. Ctrl+Z                                    → capture("after-shortcut")
  3. Ctrl+Y                                    → capture("after-shortcut")
     — content restored
  4. Ctrl+Shift+Z                              → capture("after-shortcut")
     — same as Ctrl+Y
  5. capture("stable")

Expected Frames: 7–9
Critical Fields: contentHash, store.undoStackDepth, store.redoStackDepth
```

#### TF-46: Undo/Redo Stack Management

```
File: TF-46-undo-stack.timeline.json
Actions:
  1. type "A" (repeat 5 times with pauses)     → capture each
  2. Ctrl+Z × 3                                → capture each
  3. type "new text" (should discard redo)      → capture("after-type")
  4. Ctrl+Y                                    → capture("after-shortcut")
     — nothing happens (redo discarded)
  5. capture("stable")

Expected Frames: 14–18
Critical Fields: store.undoStackDepth, store.redoStackDepth, contentHash
Heuristic Checks:
  - After type following undo: redoStackDepth === 0
  - Ctrl+Y is no-op when redo is empty
```

---

### J. Theme & Appearance

#### TF-47: Theme Toggle

```
File: TF-47-theme-toggle.timeline.json
Actions:
  1. capture("initial")                        → theme="light"
  2. click #toggle-theme                       → capture("after-toggle")
     — theme="dark"
  3. click #toggle-theme                       → capture("after-toggle")
     — theme="light"
  4. capture("stable")

Expected Frames: 5–6
Critical Fields: visual.theme, store.theme
Heuristic Checks:
  - visual.theme === store.theme (always in sync)
  - Theme alternates light→dark→light
```

#### TF-48: Theme Persistence

```
File: TF-48-theme-persistence.timeline.json
Actions:
  1. click #toggle-theme (set to dark)         → capture("after-toggle")
  2. page.reload()                             → capture("after-reload")
     — theme should be "dark"
  3. capture("stable")

Expected Frames: 4–6
Critical Fields: visual.theme, store.theme
Heuristic Checks:
  - After reload: visual.theme === "dark"
  - store.theme === "dark"
```

#### TF-49: Font Size Persistence

```
File: TF-49-font-persistence.timeline.json
Actions:
  1. click #increase-font × 4                 → capture("after-click")
     — fontSize should be 24
  2. page.reload()                             → capture("after-reload")
     — fontSize should still be 24
  3. capture("stable")

Expected Frames: 4–6
Critical Fields: store.fontSize
Heuristic Checks:
  - store.fontSize matches expected value after reload
```

---

### K. Settings & Page Load

#### TF-50: First-Time Load

```
File: TF-50-first-load.timeline.json
Actions:
  1. Clear all localStorage                    → (precondition)
  2. page.reload()                             → capture("initial")
  3. wait for app init                         → capture("after-init")
  4. capture("stable")

Expected Frames: 4–6
Critical Fields: store.documentCount (1 — default created), store.currentDocId (not null),
                 store.theme ("light"), store.fontSize (16), store.focusEnabled (true),
                 visual.theme ("light"), focusMode.toggleChecked (true)
Heuristic Checks:
  - Default document exists (documentCount >= 1)
  - currentDocId is set
  - All defaults are correct
```

#### TF-51: Return Visit

```
File: TF-51-return-visit.timeline.json
Actions:
  1. Set up localStorage with known state      → (precondition)
  2. page.reload()                             → capture("after-reload")
  3. capture("stable")

Expected Frames: 4–6
Critical Fields: store.currentDocId, store.theme, store.fontSize, store.focusEnabled
Heuristic Checks:
  - All settings restored from localStorage
  - Content matches the stored document
```

---

### L. Cross-Feature Interactions

#### TF-52: Heading + Inline Style

```
File: TF-52-heading-plus-inline.timeline.json
Actions:
  1. type "# Title text here"                  → capture("after-heading")
  2. select "text", press Ctrl+B               → capture("after-shortcut")
     — bold inside heading, marker preserved
  3. capture("stable")

Expected Frames: 5–7
Critical Fields: type (h1), hasMarker (still true), boldCount (1), markerEditable (false)
Heuristic Checks:
  - Heading structure preserved after inline style
  - hasMarker still true
  - markerEditable still false
```

#### TF-53: List + Inline Style

```
File: TF-53-list-plus-inline.timeline.json
Actions:
  1. type "- Item with **bold"                 → capture("after-type")
  2. press Tab                                 → capture("after-press")
     — bold text survives indentation
  3. capture("stable")

Expected Frames: 5–7
Critical Fields: listItems, boldCount, nestingLevel
Heuristic Checks:
  - boldCount unchanged after indent
  - Content hash unchanged (text preserved)
```

#### TF-54: Focus Mode + Block Transformations

```
File: TF-54-focus-plus-blocks.timeline.json
Actions:
  1. ensure focus mode ON                      → capture("initial")
  2. type "# Heading"                          → capture("after-type")
     — focusLineY updates to heading position
  3. press Tab on list item                    → capture("after-press")
  4. capture("stable")

Expected Frames: 6–8
Critical Fields: focusMode.focusLineY, blocks[].type
Heuristic Checks:
  - focusLineY changes when block transformation occurs
  - FOCUS_MASK_MISSING_WHEN_ON: mask still applied
```

#### TF-55: Undo + Focus Mode

```
File: TF-55-undo-plus-focus.timeline.json
Actions:
  1. type "# Heading" with focus ON            → capture("after-heading")
  2. Ctrl+Z                                    → capture("after-shortcut")
     — focusLineY must update to reflect reverted DOM
  3. capture("stable")

Expected Frames: 5–7
Critical Fields: type, focusMode.focusLineY, hasMarker
```

#### TF-56: Paste + Undo

```
File: TF-56-paste-plus-undo.timeline.json
Actions:
  1. type "Original"                           → capture("after-type")
  2. paste "Pasted content"                    → capture("after-paste")
  3. Ctrl+Z                                    → capture("after-shortcut")
     — paste completely undone
  4. capture("stable")

Expected Frames: 6–8
Critical Fields: contentHash, blockCount, textLength
Heuristic Checks:
  - After undo: contentHash matches pre-paste state
```

#### TF-57: Theme + Focus Mode

```
File: TF-57-theme-plus-focus.timeline.json
Actions:
  1. ensure focus mode ON                      → capture("initial")
  2. toggle theme to dark                      → capture("after-toggle")
     — focusMode still active, theme changes
  3. capture("stable")

Expected Frames: 4–6
Critical Fields: visual.theme, focusMode.maskApplied, focusMode.toggleChecked
Heuristic Checks:
  - Focus mode still ON after theme change
  - maskApplied still true
```

#### TF-58: Document Switch + Undo

```
File: TF-58-doc-switch-undo.timeline.json
Actions:
  1. type "Content in doc A"                   → capture("after-type")
  2. switch to doc B via modal                 → capture("after-load")
  3. Ctrl+Z                                    → capture("after-shortcut")
     — should NOT undo to doc A content
  4. capture("stable")

Expected Frames: 6–10
Critical Fields: store.currentDocId, contentHash, store.undoStackDepth
Heuristic Checks:
  - currentDocId changed after switch
  - Undo does not cross document boundary
  - undoStackDepth was reset on switch
```

#### TF-59: Save + Storage Full

```
File: TF-59-save-storage-full.timeline.json
Actions:
  1. Fill localStorage to near 5MB limit       → (precondition)
  2. type "Additional content"                 → capture("after-type")
  3. press Ctrl+S                              → capture("after-save")
  4. capture("stable")

Expected Frames: 5–7
Critical Fields: store.storageUsedBytes, store.storageLimitBytes
Heuristic Checks:
  - STORAGE_QUOTA_SILENT_FAIL: check if content was actually saved
  - storageUsedBytes near storageLimitBytes
Semantic Eval:
  - Did the user see feedback about storage being full?
  - CURRENT BEHAVIOR: silent fail (known gap)
```

#### TF-60: Rapid Editing Sequences

```
File: TF-60-rapid-editing.timeline.json
Actions:
  1. type "# Heading"                          → capture("after-type")
  2. press Enter                               → capture("after-press")
  3. type "- list item"                        → capture("after-type")
  4. press Enter                               → capture("after-press")
  5. type "**bold text"                        → capture("after-type")
  6. capture("stable")

Expected Frames: 8–12
Critical Fields: ALL fields — this is a stress test
Heuristic Checks:
  - Every check from all categories (A–H) applied
  - No race condition artifacts
  - Each block has correct type in final state
  - All structural invariants hold
Temporal Checks:
  - All block transitions valid
  - All markers appear when headings created
  - No ZWSP overflow
Semantic Eval:
  - Does the final document structure make sense?
  - Did all transformations fire without interference?
```

---

## 3. Evaluation Matrix

### 3.1 Heuristic Checks per Timeline

Every timeline runs the **universal checks** plus scenario-specific checks.

**Universal checks (run on EVERY frame of EVERY timeline):**

| Code | Severity | Check |
|------|----------|-------|
| `ORPHAN_TEXT_NODE` | critical | No bare text node as #editor child |
| `OBJECT_OBJECT_VISIBLE` | critical | "[object Object]" not in editor text |
| `SCRIPT_TAG_IN_EDITOR` | critical | No `<script>` in editor DOM |
| `HEADING_MISSING_MARKER` | critical | Every h1–h6 has .heading-marker span |
| `HEADING_MARKER_EDITABLE` | critical | Every marker has contenteditable="false" |
| `ORPHAN_LIST_ITEM` | critical | Every `<li>` inside `<ul>` or `<ol>` |
| `EMPTY_LIST_CONTAINER` | warning | No empty `<ul>`/`<ol>` |
| `EMPTY_STYLE_WRAPPER` | warning | No empty `<b>`/`<i>`/`<s>` |
| `BR_IN_HEADING` | warning | No `<br>` inside headings |
| `FOCUS_MASK_WHEN_TOGGLE_OFF` | critical | Mask OFF when toggle OFF |
| `FOCUS_MASK_MISSING_WHEN_ON` | warning | Mask ON when toggle ON (if content exists) |
| `STORE_CONTENT_DIVERGENCE` | info | Editor hash vs stored hash after save |

**Temporal checks (run on mutation timeline after capture):**

| Code | Severity | Check |
|------|----------|-------|
| `ILLEGAL_BLOCK_TRANSITION` | critical | Block type transitions follow allowed paths |
| `HEADING_CREATED_WITHOUT_MARKER` | critical | Heading creation always paired with marker |
| `ZWSP_OVERFLOW` | warning | No block exceeds 10 ZWSPs |

### 3.2 Scenario-Specific Checks

| Timeline | Extra Checks |
|----------|-------------|
| TF-03 | 7-hash→no heading; marker text matches level |
| TF-04 | Heading reversion produces type=div, hasMarker=false |
| TF-09 | nestingLevel increments correctly per Tab |
| TF-10 | List split produces correct blockCount |
| TF-16 | boldCount increments on Ctrl+B |
| TF-20 | Toggle state reflected in both visual and store |
| TF-30 | Editor empty after new doc, undo reset |
| TF-42 | ZERO script/iframe/event-handler elements (security) |
| TF-46 | Redo stack discarded after new edit |
| TF-59 | Storage usage tracked near limit |

### 3.3 Semantic Evaluation Questions

For each timeline, these open-ended questions guide human/LLM review:

| Category | Questions |
|----------|-----------|
| **Structure** | Does the final DOM make sense for what the user typed? |
| **Transitions** | Do block transformations happen at the correct moment? |
| **Content delivery** | Is all the user's text visible and in the right place? |
| **State sync** | Does stored state match visual state? |
| **Edge cases** | How does the editor handle boundary conditions? |
| **UX coherence** | Would a user be confused by what they see at any frame? |

---

## 4. Running the Capture

### 4.1 Playwright Execution Pattern

```typescript
// For each taskflow:
test(`eval: ${tf.id} - ${tf.title}`, async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('file:///path/to/index.html');
  await page.waitForSelector('#editor');
  await page.click('#editor');

  const timeline = createTimeline(tf.id, tf.title, tf.category);

  // Execute actions from the plan
  for (const action of tf.actions) {
    if (action.preCapture) await capture(page, timeline, action.preCapture);
    await executeAction(page, action);
    if (action.postCapture) await capture(page, timeline, action.postCapture);
  }

  // Wait for stability
  await waitForStability(page, timeline);

  // Build mutations, run checks, write artifacts
  finalize(timeline, tf.outputPath);
});
```

### 4.2 Directory Structure

```
test-results/
  └── editor-eval/
      ├── TF-01-basic-typing-2026-04-11T14-00-00/
      │   ├── timeline.json
      │   ├── mutations.json
      │   ├── anomaly-report.json
      │   ├── metadata.json
      │   └── screenshots/
      │       ├── frame-0000-initial.png
      │       ├── frame-0003-after-type.png
      │       └── final.png
      ├── TF-02-text-selection-2026-04-11T14-01-00/
      │   └── ...
      └── ...
```

### 4.3 Convergence Rule

```
Per-taskflow:
  Run ≥ 3 times per browser (Chrome, Firefox)
  Zero critical + zero warning = CLEAN for that taskflow

Overall:
  All 60 taskflows CLEAN across 3 runs each = feature verified
```

---

## 5. Summary Table

| TF | File | Frames | Critical Focus |
|----|------|--------|----------------|
| 01 | basic-typing | 12–15 | blockCount, type=div |
| 02 | text-selection | 10–12 | blockCount after delete |
| 03 | heading-creation | 18–22 | type h1–h6, hasMarker, markerText |
| 04 | heading-reversion | 10–14 | h→div, hasMarker false |
| 05 | heading-editing | 8–12 | marker preserved during editing |
| 06 | ul-creation | 10–14 | type=ul, listItems |
| 07 | ol-creation | 10–12 | type=ol, listItems |
| 08 | list-enter | 8–10 | listItems.length |
| 09 | list-indent | 12–16 | nestingLevel, maxNestingDepth |
| 10 | list-outdent | 12–16 | type transitions, blockCount |
| 11 | list-backspace | 8–12 | listItems.length, blockCount |
| 12 | bold-markdown | 8–10 | boldCount, zwspCount |
| 13 | italic-markdown | 6–8 | italicCount |
| 14 | bold-italic-md | 5–7 | boldCount + italicCount |
| 15 | strikethrough-md | 5–7 | strikeCount |
| 16 | bold-shortcut | 10–12 | boldCount |
| 17 | italic-shortcut | 10–12 | italicCount |
| 18 | strike-shortcut | 10–12 | strikeCount |
| 19 | style-breakout | 6–8 | boldCount=2 |
| 20 | focus-toggle | 5–7 | focusMode.* |
| 21 | focus-cursor | 8–12 | focusLineY |
| 22 | focus-content | 6–10 | focusLineY |
| 23 | focus-headings | 6–8 | focusLineY, caretBlock |
| 24 | focus-resize | 5–7 | focusLineWidth |
| 25 | toolbar | 5–6 | toolbar.isExpanded |
| 26 | font-size | 6–8 | store.fontSize |
| 27 | fullscreen | 4–5 | (visual) |
| 28 | save-existing | 5–7 | storedContentHash |
| 29 | save-as | 5–7 | currentDocId, documentCount |
| 30 | new-document | 5–7 | blockCount=1, isEmpty=true |
| 31 | open-modal | 6–8 | modal.isOpen, thumbnailCount |
| 32 | load-document | 8–12 | currentDocId, contentHash |
| 33 | delete-document | 8–10 | documentCount ↓ |
| 34 | export-backup | 5–7 | documentCount |
| 35 | import-json | 6–10 | documentCount ↑ |
| 36 | import-md | 6–10 | documentCount ↑ |
| 37 | drag-drop | 5–7 | currentDocId, contentHash |
| 38 | paste-plain | 5–7 | blockCount, textLength |
| 39 | paste-html | 6–8 | no script/style tags |
| 40 | paste-inline-md | 7–10 | boldCount, italicCount |
| 41 | paste-block-md | 4–6 | type variety, hasMarker |
| 42 | paste-security | 6–8 | SCRIPT_TAG=0 (critical) |
| 43 | undo-basic | 8–10 | contentHash regression |
| 44 | undo-blocks | 8–12 | type reversion |
| 45 | redo | 7–9 | contentHash restoration |
| 46 | undo-stack | 14–18 | undoStackDepth, redoStackDepth |
| 47 | theme-toggle | 5–6 | visual.theme, store.theme |
| 48 | theme-persist | 4–6 | theme after reload |
| 49 | font-persist | 4–6 | fontSize after reload |
| 50 | first-load | 4–6 | all defaults correct |
| 51 | return-visit | 4–6 | settings restoration |
| 52 | heading+inline | 5–7 | hasMarker + boldCount |
| 53 | list+inline | 5–7 | nestingLevel + boldCount |
| 54 | focus+blocks | 6–8 | focusLineY + type |
| 55 | undo+focus | 5–7 | type + focusLineY |
| 56 | paste+undo | 6–8 | contentHash match |
| 57 | theme+focus | 4–6 | theme + maskApplied |
| 58 | doc-switch+undo | 6–10 | currentDocId boundary |
| 59 | save+storage | 5–7 | storageUsedBytes |
| 60 | rapid-editing | 8–12 | all checks combined |
