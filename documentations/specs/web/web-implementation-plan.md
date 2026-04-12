# Web App — Implementation Plan

> **Methodology**: Strict TDD with eval-loop verification  
> **Architecture**: Gated phases, each verified before proceeding  
> **Testing**: DOM snapshot capture → heuristic + semantic evaluation → fix loop  
> **Version**: 1.0 | April 2026

---

## Implementation Philosophy

```
For every feature:
  1. Write the eval-loop test FIRST (from the spec scenario)
  2. Run it → FAIL (feature doesn't exist yet)
  3. Implement the feature
  4. Run eval loop → analyze anomalies
  5. Fix anomalies → re-run
  6. Converge to CLEAN (zero critical, zero warning)
  7. Gate review → proceed to next feature

No feature ships without a CLEAN eval-loop run.
```

---

## Gate Structure

```
Gate 0: Foundation (eval-loop infrastructure)    ← DONE
Gate 1: Document Store & Auto-Save               ← DONE (existing)
Gate 2: Document Modal & Browsing                ← DONE (existing)
Gate 3: Download as .md                          ← NEEDS WORK
Gate 4: Import & Export                          ← DONE (existing)
Gate 5: Error Handling & Recovery                ← NEW
Gate 6: Accessibility                            ← NEW
Gate 7: Storage Quota Management                 ← NEEDS WORK
Gate 8: Cross-Tab Safety                         ← NEW
Gate 9: Final Integration & Regression           ← NEW
```

---

## Gate 0: Foundation ✅ COMPLETE

**Status**: Done. Eval-loop infrastructure exists.

**What exists**:
- Playwright test harness with headed browser
- CAPTURE_FN for DOM snapshot capture
- Temporal rule checkers (block transitions, ZWSP, markers)
- 60 taskflow tests + 62 formatting interaction tests + 10 focus accuracy tests
- All 132 tests CLEAN

**Artifacts**: `eval-loop/`, `test-results/`

---

## Gate 1: Document Store & Auto-Save ✅ COMPLETE

**Status**: Done. documentStore.js, storage.js, auto-save exist.

**Scenarios covered**: SC-W01, SC-W03, SC-W04, SC-W10, SC-W16  
**Tests**: TF-28 (save), TF-29 (save as), TF-30 (new doc), TF-50 (first load), TF-51 (return visit)

**Verified by eval loop**: All CLEAN.

---

## Gate 2: Document Modal & Browsing ✅ COMPLETE

**Status**: Done. modalManager.js with grid, thumbnails, delete.

**Scenarios covered**: SC-W17–SC-W25, SC-W26–SC-W30  
**Tests**: TF-31 (open modal), TF-32 (load doc), TF-33 (delete)

**Verified by eval loop**: All CLEAN.

---

## Gate 3: Download as .md

**Status**: Partially done. Ctrl+S triggers download but .md export may include HTML/ZWSPs.

### Implementation Tasks

```
G3-1: Ensure Ctrl+S produces clean markdown download
  - Use clipboardManager._fragmentToMarkdown() logic for the full doc
  - Strip heading marker spans, ZWSPs, internal HTML artifacts
  - Output: clean, standard CommonMark-compatible .md text
  - Filename: "[document name].md"

G3-2: Download trigger mechanism
  - Create Blob with text/markdown MIME type
  - URL.createObjectURL → <a download> → click → revokeObjectURL
  - Verify download works in Chrome, Firefox, Safari

G3-3: Download notification
  - Green toast "Document saved!" auto-dismiss 3s
  - role="alert" for screen readers
```

### TDD: Eval-Loop Tests

```
Test ID: DL-01  "Download produces valid markdown"
  Actions:
    1. Type "# Heading" + Enter + "**bold** text" + Enter + "- list"
    2. Trigger Ctrl+S
    3. Intercept download → read file content
  Capture: downloaded file content as text
  Heuristic checks:
    - File starts with "# Heading"
    - Contains "**bold**" (not <b> tags)
    - Contains "- list" (not <li>)
    - No ZWSP characters (\u200B)
    - No <span class="heading-marker">
    - Valid UTF-8

Test ID: DL-02  "Download filename matches document name"
  Actions: Create doc named "My Notes", Ctrl+S
  Check: downloaded filename == "My Notes.md"

Test ID: DL-03  "Download works with special characters in name"
  Actions: Create doc named "2026/04 — Draft #1", Ctrl+S
  Check: filename sanitized for OS (no / or special chars)
```

### Gate 3 Exit Criteria
```
□ DL-01, DL-02, DL-03 CLEAN
□ Downloaded .md file opens correctly in VS Code, Obsidian, Typora
□ No ZWSP or HTML artifacts in downloaded file
□ Notification appears and auto-dismisses
```

---

## Gate 4: Import & Export ✅ MOSTLY COMPLETE

**Status**: Done. Import/export with conflict resolution exists.

**Additional work needed**:

```
G4-1: Malformed JSON import handling (SC-W35, SC-W36, SC-W37)
  - Invalid JSON → alert, no data modified
  - Wrong schema → alert
  - Partial corruption → import valid, skip malformed, report

G4-2: Large file import guard (SC-W39)
  - Check if file would exceed localStorage quota before importing
  - Alert with explanation if too large
```

### TDD: Eval-Loop Tests

```
Test ID: IM-01  "Import malformed JSON — no crash"
  Actions: Trigger import with "{not valid json"
  Check: Alert shown, no documents modified, app functional

Test ID: IM-02  "Import wrong schema — no crash"
  Actions: Trigger import with '{"users": [1,2,3]}'
  Check: Alert shown, no documents modified

Test ID: IM-03  "Import partial corruption"
  Actions: Import JSON with 3 valid + 1 malformed doc
  Check: 3 imported, 1 skipped, notification shows counts
```

### Gate 4 Exit Criteria
```
□ IM-01, IM-02, IM-03 CLEAN
□ All existing import tests (TF-35, TF-36, FI-P-*) still CLEAN
□ No data loss on any malformed input
```

---

## Gate 5: Error Handling & Recovery 🆕

**Scenarios**: SC-W11, SC-W12, SC-W52–SC-W55

### Implementation Tasks

```
G5-1: QuotaExceededError handling (SC-W11)
  - Already implemented in documentStore and storage.js
  - Verify: alert shown, editor content preserved, typing not blocked

G5-2: Corrupted localStorage recovery (SC-W12, SC-W52)
  - JSON.parse wrapped in try/catch in getDocuments()
  - On error: reset to empty array, alert user, create default doc

G5-3: Schema versioning migration (future-proofing)
  - Documents already have schemaVersion: 1
  - Add migration function for version upgrades

G5-4: Graceful handling of missing localStorage (SC-W02)
  - Check: typeof localStorage !== 'undefined' before use
  - If unavailable: editor works, notification shown, no persistence
```

### TDD: Eval-Loop Tests

```
Test ID: ERR-01  "Storage full — editor keeps working"
  Actions:
    1. Fill localStorage to near 5MB
    2. Type text → auto-save triggers
    3. Capture: alert shown, editor content preserved
  Heuristic:
    - No ORPHAN_TEXT_NODE (editor structure intact)
    - Content in DOM matches what user typed
    - blockCount > 0

Test ID: ERR-02  "Corrupted localStorage — recovers"
  Actions:
    1. Inject corrupted JSON into localStorage key
    2. Reload page
    3. Capture: app initializes, default doc created
  Heuristic:
    - blockCount >= 1 (default doc exists)
    - No JavaScript errors in console

Test ID: ERR-03  "localStorage unavailable — notification shown"
  Actions:
    1. Block localStorage access (Object.defineProperty override)
    2. Load app
    3. Capture: editor works, notification visible
  Heuristic:
    - Editor contenteditable still functional
    - Notification element present in DOM
```

### Gate 5 Exit Criteria
```
□ ERR-01, ERR-02, ERR-03 CLEAN
□ All error paths produce user-visible notification (not silent)
□ No unhandled exceptions in console
□ Editor remains functional after every error
□ All existing 132 tests still CLEAN (no regression)
```

---

## Gate 6: Accessibility 🆕

**Scenarios**: SC-W58–SC-W61

### Implementation Tasks

```
G6-1: Document modal keyboard navigation
  - Tab order through thumbnails (tabindex="0")
  - Enter opens focused document
  - Escape closes modal
  - Delete key on focused thumbnail → delete confirmation
  - Focus trapping inside modal when open
  - Focus returns to editor when modal closes

G6-2: ARIA attributes
  - Modal: role="dialog", aria-modal="true", aria-labelledby
  - Thumbnails: aria-label="Open [title], edited [date]"
  - Delete: aria-label="Delete [title]"
  - Close: aria-label="Close dialog"
  - Storage bar: aria-label="Storage: X percent"
  - Notifications: role="alert"

G6-3: Focus rings
  - All interactive elements have visible :focus-visible outline
  - outline: 2px solid var(--focus-color)
  - No outline on :focus (only :focus-visible for keyboard users)

G6-4: Reduced motion
  - @media (prefers-reduced-motion: reduce) { ... }
  - Toolbar morph animation: instant instead of 300ms transition
  - Focus mode mask: no transition on opacity

G6-5: High contrast
  - @media (prefers-contrast: more) { ... }
  - Borders, focus rings, text all meet WCAG AA contrast ratios
```

### TDD: Eval-Loop Tests

```
Test ID: A11Y-01  "Modal keyboard navigation"
  Actions:
    1. Ctrl+O → modal opens
    2. Tab → first thumbnail focused (check focus ring)
    3. Tab → second thumbnail focused
    4. Enter → document loads, modal closes
    5. Ctrl+O → Tab → Delete key → confirm dialog
  Capture: focus state at each step
  Heuristic:
    - focusedElement matches expected thumbnail
    - Modal has role="dialog" and aria-modal="true"

Test ID: A11Y-02  "ARIA attributes present"
  Actions: Open modal, capture DOM
  Heuristic:
    - Modal element has role, aria-modal, aria-labelledby
    - Each thumbnail has aria-label
    - Delete buttons have aria-label
    - Close button has aria-label

Test ID: A11Y-03  "Focus returns to editor after modal"
  Actions: Ctrl+O → Escape → check focused element
  Heuristic: document.activeElement === editorEl
```

### Gate 6 Exit Criteria
```
□ A11Y-01, A11Y-02, A11Y-03 CLEAN
□ All interactive elements reachable by Tab key
□ Screen reader announces modal, thumbnails, buttons correctly
□ Focus ring visible on all keyboard-focused elements
□ No regression on existing 132 tests
```

---

## Gate 7: Storage Quota Management

**Scenarios**: SC-W44–SC-W48

### Implementation Tasks

```
G7-1: Storage bar accuracy
  - Calculate actual localStorage usage (all keys × 2 for UTF-16)
  - Display in KB or MB with one decimal
  - Progress bar percentage: used / 5MB
  - Amber color when >80%

G7-2: Pre-import quota check (SC-W39)
  - Before importing, estimate new data size
  - If would exceed limit: alert before attempting write
  - "Not enough storage space for this import."
```

### TDD: Eval-Loop Tests

```
Test ID: SQ-01  "Storage bar shows correct percentage"
  Actions:
    1. Create 3 documents with known content sizes
    2. Open modal
    3. Capture storage bar width and text
  Heuristic:
    - storagePercent > 0
    - storagePercent < 100
    - Displayed text matches calculated usage

Test ID: SQ-02  "Storage >80% shows amber bar"
  Actions:
    1. Fill localStorage to ~4.2MB
    2. Open modal
    3. Capture storage bar color
  Heuristic:
    - Progress bar background-color is amber/warning color

Test ID: SQ-03  "Import blocked when storage would exceed"
  Actions:
    1. Fill localStorage to ~4.8MB
    2. Try to import a 500KB .md file
    3. Capture: alert shown, import blocked
```

### Gate 7 Exit Criteria
```
□ SQ-01, SQ-02, SQ-03 CLEAN
□ Storage display matches actual usage
□ Warning color at >80%
□ Import blocked with explanation when quota would exceed
```

---

## Gate 8: Cross-Tab Safety 🆕

**Scenarios**: SC-W49–SC-W51

### Implementation Tasks

```
G8-1: Document current behavior (last-write-wins)
  - No immediate code change — document the limitation
  - Two tabs auto-saving to same doc: last write wins
  - This is accepted behavior for v1.0

G8-2: Future enhancement design (window 'storage' event)
  - window.addEventListener('storage', handler)
  - When another tab changes localStorage → show notification
  - "Document changed in another tab. Reload?"
  - Not implemented in v1.0 — documented as future work
```

### Gate 8 Exit Criteria
```
□ Cross-tab behavior documented in spec (accepted limitation)
□ No data corruption when two tabs edit different documents
□ No JavaScript errors when two tabs are open
```

---

## Gate 9: Final Integration & Regression

### Full Suite Run

```
Run ALL tests:
  - 60 original taskflow tests (TF-01..TF-60)
  - 62 formatting interaction tests (FI-H/S/L/P/X)
  - 10 focus accuracy tests (FM-01..FM-10)
  - New Gate 3–7 tests (DL, IM, ERR, A11Y, SQ)

Convergence criteria:
  □ All tests CLEAN (zero critical, zero warning)
  □ Info-level anomalies documented and accepted
  □ 3 consecutive clean runs
  □ Manual verification of download, import, accessibility
```

### Gate 9 Exit Criteria
```
□ Full suite CLEAN × 3 runs
□ Manual test: download .md → open in Obsidian → content matches
□ Manual test: export backup → clear localStorage → import → restored
□ Manual test: Tab through modal → screen reader announces correctly
□ Manual test: storage near full → warning bar appears
□ No regressions from any gate
```

---

## Eval-Loop Design for Each Gate

### Snapshot Schema (uses existing CAPTURE_FN)

Each gate's tests capture the standard snapshot plus gate-specific fields:

```json
{
  "visual": {
    "blocks": [...],
    "modal": { "isOpen": true, "thumbnailCount": 5, "storagePercent": 42 },
    "toolbar": { "isExpanded": false },
    "notifications": [{ "text": "Document saved!", "type": "success" }]
  },
  "store": {
    "documentCount": 5,
    "currentDocId": "...",
    "storageUsedBytes": 2100000,
    "storageLimitBytes": 5242880
  },
  "anomalies": [...]
}
```

### Heuristic Evaluation (per gate)

| Gate | Heuristic Checks |
|------|-----------------|
| G3 Download | No ZWSP in file, no HTML tags, valid markdown, correct filename |
| G4 Import | Document count increases, no crash on malformed, correct skip count |
| G5 Errors | Alert visible on error, editor functional, no console errors |
| G6 A11Y | ARIA attributes present, focus management correct, focus rings visible |
| G7 Quota | Storage bar matches calculated, warning at >80%, import blocked at limit |

### Semantic Evaluation (per gate)

| Gate | Semantic Questions |
|------|-------------------|
| G3 | Does the downloaded file look like something a user would expect from a markdown editor? |
| G4 | Would a user understand what happened when import partially fails? |
| G5 | Would a user know what went wrong and what to do about it? |
| G6 | Can a keyboard-only user accomplish every task? |
| G7 | Does the storage visualization give the user confidence about their remaining space? |

### Fix Loop Protocol

```
For each gate:
  1. Write eval-loop tests based on spec scenarios
  2. Run tests → capture snapshots + anomaly reports
  3. Analyze anomalies:
     - Critical: must fix before proceeding
     - Warning: should fix, may accept with justification
     - Info: document and accept
  4. Fix code → re-run tests
  5. Repeat until CLEAN
  6. Run regression (all existing tests) → must stay CLEAN
  7. Gate review → sign off
```

---

## Timeline Estimate

| Gate | Scope | Status |
|------|-------|--------|
| G0 Foundation | Eval-loop infrastructure | ✅ Done |
| G1 Document Store | Auto-save, create, load | ✅ Done |
| G2 Document Modal | Grid, browse, delete | ✅ Done |
| G3 Download | Clean .md export | Needs work |
| G4 Import/Export | Malformed handling | Needs work |
| G5 Error Handling | Recovery, notifications | New |
| G6 Accessibility | Keyboard, ARIA, contrast | New |
| G7 Storage Quota | Bar accuracy, import guard | Needs work |
| G8 Cross-Tab | Document limitation | Document only |
| G9 Integration | Full regression | Final |
