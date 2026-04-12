# Web App — Exhaustive File Management Specification

> **Platform**: Browser (no server, no backend, purely client-side)  
> **Storage**: localStorage (5MB limit per origin)  
> **Export**: Download as `.md` file  
> **Version**: 2.0 | April 2026

---

## 1. User Needs & Motivations

| ID | User Need | Motivation | Priority |
|----|-----------|------------|----------|
| WN-01 | My work saves automatically | I don't want to lose writing if I close the tab or browser crashes | Critical |
| WN-02 | I can have multiple documents | I write different notes/articles and need them separated | Critical |
| WN-03 | I can find a specific document quickly | I have many documents and need to identify the right one | High |
| WN-04 | I can download my work as `.md` | I want to use my writing in other tools, share it, or back it up | Critical |
| WN-05 | I can import an existing `.md` file | I have work from other editors I want to continue | High |
| WN-06 | I can delete old documents | My storage is limited (5MB) and I need to free space | High |
| WN-07 | I can see how much storage I'm using | localStorage has a hard limit and I need visibility | Medium |
| WN-08 | I can back up all my documents | If I clear browser data or switch devices, I lose everything | Critical |
| WN-09 | I can restore from a backup | After clearing data or on a new device, I need my documents back | Critical |
| WN-10 | I know which document I'm editing | I switch between documents and need orientation | High |
| WN-11 | I can rename a document | Auto-generated titles aren't always meaningful | Medium |
| WN-12 | My documents survive browser data clearing | localStorage can be wiped; I need an escape hatch | High |
| WN-13 | The app works offline after first load | I may not always have internet | Medium |
| WN-14 | I don't lose work when storage is full | Silent save failures = data loss | Critical |
| WN-15 | I can navigate the app with keyboard only | I prefer keyboard or have accessibility needs | High |
| WN-16 | I can use the app with a screen reader | Accessibility is not optional | High |
| WN-17 | Two browser tabs don't corrupt my data | I might open the app in multiple tabs | Medium |
| WN-18 | I can recover from corrupted localStorage | Data corruption shouldn't be permanent | Medium |
| WN-19 | Importing a malformed backup doesn't crash | Bad data from an old backup version should be handled | Medium |
| WN-20 | I can reset the app to a clean state | Start over if something goes wrong | Low |

---

## 2. User Scenarios

### A. Document Creation

```
SC-W01: First visit — auto-created document
  Precondition: No localStorage data for this app.
  User opens the app for the first time.
  System creates "My First Document" with welcome content.
  Editor immediately shows content. User can start typing.
  Theme: light. Font: 16px. Focus mode: enabled.

SC-W02: First visit — localStorage disabled by browser
  User has disabled localStorage or is in a restricted environment.
  App detects localStorage is unavailable.
  Editor still works (typing, formatting) but nothing persists.
  Notification: "Storage is unavailable. Your work won't be saved."

SC-W03: Create new document via Ctrl+N
  User presses Ctrl+N.
  Prompt: "Enter document name:" (prefilled with "Untitled").
  User types name, clicks OK.
  Current document auto-saves.
  Editor clears. New empty document becomes active.
  Undo history resets. currentDocId updates.
  If user cancels prompt: nothing happens.

SC-W04: Create new document via toolbar button
  User clicks toolbar → "New Document" button.
  Same flow as SC-W03.

SC-W05: Create document from imported file
  User clicks "Import md doc" in the document modal.
  File picker opens (filtered to .md, .txt, .html).
  User selects a file.
  New document created with file content.
  Document name = filename without extension.
  Grid refreshes with new doc highlighted (orange-yellow border).

SC-W06: Create document from drag-and-drop
  User drags a .md or .txt file onto the editor area.
  New document created with file content.
  Editor content replaced. currentDocId switches.
  Undo history clears. Alert confirms import.

SC-W07: Create document — name collision
  User creates a document with a name that already exists.
  System allows it (names are not unique — IDs are).
  Both documents coexist in the grid.

SC-W08: Create document — empty name
  User submits an empty name in the prompt.
  System uses "Untitled" as default name.

SC-W09: Create document — very long name (200+ chars)
  System accepts it. Display truncates with ellipsis in grid.
  Full name visible on hover as tooltip.
```

### B. Document Saving

```
SC-W10: Auto-save on every edit
  User types in the editor.
  On each input event, content auto-saves to localStorage.
  Document's lastEdited timestamp updates.
  No visible notification. Silent operation.

SC-W11: Auto-save failure (localStorage full)
  User types, auto-save attempts localStorage.setItem().
  QuotaExceededError caught.
  Alert: "Storage full. Export a backup and delete old documents."
  Editor content is NOT lost (still in DOM).
  User's typing is not blocked.

SC-W12: Auto-save failure (localStorage corrupted)
  localStorage.getItem returns invalid JSON.
  App catches parse error.
  Creates new empty document store. Previous data lost.
  Notification: "Storage data was corrupted. Starting fresh."

SC-W13: Manual save with Ctrl+S (save + download)
  User presses Ctrl+S.
  Content saves to localStorage (same as auto-save).
  File downloads as .md (filename = document name + .md).
  Brief green notification: "Document saved!"

SC-W14: Save As with Ctrl+Shift+S
  User presses Ctrl+Shift+S.
  Prompt: "Save as new document name:"
  New document created with current content.
  currentDocId switches to new document. Original preserved.

SC-W15: Save — no currentDocId (orphaned state)
  User presses Ctrl+S but no currentDocId in localStorage.
  Falls through to Save As behavior (prompt for name).

SC-W16: Auto-save on tab close
  User is typing. Closes browser tab accidentally.
  Last auto-save captured the most recent input event.
  On re-open: last saved content is restored.
  Content between last input event and close may be lost.
```

### C. Document Opening & Browsing

```
SC-W17: Open document modal (Ctrl+O)
  User presses Ctrl+O or clicks "Open Document" button.
  Modal opens with lightbox overlay (50% opacity).
  Header: "Open document" + close (×). Body: 3-column grid.
  Footer: doc count, storage bar, import/export buttons.
  Escape or overlay click closes modal.

SC-W18: Browse documents — visual identification
  Each thumbnail shows:
  - Title (bold, single line, ellipsis on overflow, tooltip on hover)
  - Last edited date/time (relative or absolute)
  - Content preview (first ~200 chars, plain text stripped of HTML)
  - Delete (×) on hover
  Sorted by lastEdited descending (most recent first).

SC-W19: Browse documents — keyboard navigation
  Tab: navigate between thumbnails.
  Enter: open focused document.
  Escape: close modal. Delete: trigger deletion on focused thumbnail.
  Focus returns to editor when modal closes.

SC-W20: Browse documents — screen reader support
  Modal: role="dialog", aria-modal="true", aria-labelledby.
  Thumbnails: role="button", aria-label with title + date.
  Delete: aria-label="Delete [name]". Close: aria-label="Close dialog".

SC-W21: Browse — empty state (no documents)
  Grid shows: "No documents yet. Create your first document!"
  Import buttons still visible and functional.

SC-W22: Load a document from modal
  User clicks thumbnail. Current doc auto-saves. Selected doc loads.
  Modal closes. Editor focused. Undo resets. Focus mode updates.

SC-W23: Load document — content is empty
  Editor shows empty state. User can start typing.

SC-W24: Load document — content is very large
  Document approaching 5MB. Load may be slow.
  Editor remains functional. Focus mode sampling may stutter.

SC-W25: Rapid document switching
  User switches docs multiple times quickly.
  Each switch auto-saves before loading. Undo resets each time.
  No stale data from previous document.
```

### D. Document Deletion

```
SC-W26: Delete document — happy path
  Hover thumbnail → × appears → click → confirm → removed.
  Storage recalculated. Grid updates.

SC-W27: Delete current document
  After deletion: load most recent remaining doc.
  If none remain: create new default document.

SC-W28: Delete — cancel confirmation
  Nothing happens. Document preserved.

SC-W29: Delete — keyboard (Tab to thumbnail, Delete key)
  Same confirmation flow as click.

SC-W30: Delete all documents
  Final deletion creates new default document.
```

### E. Import & Export

```
SC-W31: Export all → JSON download
  "MD-focus-editor-backup-{ISO-timestamp}.json" downloads.
  Contains all documents as JSON array.

SC-W32: Export — zero documents
  Alert: "No documents to export." No file.

SC-W33: Import JSON — no conflicts
  All docs added. Orange-yellow border in grid.

SC-W34: Import JSON — with conflicts
  Red border + overlay with "Keep current"/"Keep imported" per doc.
  Floating toolbar: "Keep all" / "Discard all".

SC-W35: Import JSON — malformed file
  Alert: "Invalid backup file." No data modified.

SC-W36: Import JSON — valid JSON, wrong schema
  Alert: "Not a valid backup format." No data modified.

SC-W37: Import JSON — partial corruption
  Valid docs imported. Malformed skipped.
  Notification: "Imported N of M. K skipped due to errors."

SC-W38: Import single .md file
  New doc created. Name = filename. Grid refreshes.

SC-W39: Import .md — too large for storage
  QuotaExceededError caught. Alert with explanation.

SC-W40: Import .md — non-UTF-8 encoding
  FileReader reads as UTF-8. Non-UTF-8 may display garbled.
  No encoding detection.

SC-W41: Drag-and-drop import
  .md/.txt → new doc. .json → "Drop on modal instead." Other → alert.

SC-W42: Import cancellation
  File picker cancelled → nothing happens.

SC-W43: Import during conflict resolution
  New import clears previous import state.
```

### F. Storage Management

```
SC-W44: View storage usage — footer display
SC-W45: Storage >80% — amber progress bar
SC-W46: Storage full — alert on save failure
SC-W47: Storage calculation method (UTF-16 byte counting)
SC-W48: 5MB assumption (conservative, browser-dependent)
```

### G. Cross-Tab Behavior

```
SC-W49: Two tabs editing same document — last write wins, no sync
SC-W50: One tab switches docs while other edits — no cross-tab notification
SC-W51: Future: 'storage' event listener for cross-tab awareness
```

### H. Error Recovery

```
SC-W52: Corrupted localStorage — reset to first-visit state
SC-W53: Empty localStorage — same as first visit
SC-W54: Unhandled error during doc operations — editor stays functional
SC-W55: Manual reset via browser DevTools (clear storage)
```

### I. Offline

```
SC-W56: Works offline after first load (browser cache dependent)
SC-W57: No Service Worker currently (future PWA enhancement)
```

### J. Accessibility

```
SC-W58: Full keyboard navigation (Ctrl+N/O/S, Tab, Enter, Esc, Delete)
SC-W59: Screen reader support (ARIA roles, labels, live regions)
SC-W60: High contrast mode (prefers-contrast)
SC-W61: Reduced motion (prefers-reduced-motion)
```

---

## 3. "User Can..." Statements (43 total)

### Documents (13)
1. User can have a default document auto-created on first visit
2. User can create a new document with a custom name (Ctrl+N)
3. User can create a new document via toolbar button
4. User can have multiple documents stored simultaneously
5. User can switch between documents via the modal grid
6. User can see all documents in a visual 3-column grid
7. User can identify documents by title, date, and content preview
8. User can rename a document
9. User can delete a document with confirmation
10. User can see which document is currently active
11. User can create a document by importing a .md file
12. User can create a document by drag-and-drop
13. User can have the most recent document loaded on return visit

### Saving (7)
14. User can have work auto-saved on every keystroke
15. User can trigger manual save + download with Ctrl+S
16. User can save as a new copy with Ctrl+Shift+S
17. User can download any document as a `.md` file
18. User can be warned when storage is full (not lose data silently)
19. User can have settings persist across sessions
20. User can continue editing when storage is full (DOM preserves content)

### Import & Export (8)
21. User can import a single `.md` file as a new document
22. User can drag-and-drop a `.md` file to import it
23. User can export all documents as a JSON backup
24. User can import a JSON backup to restore documents
25. User can resolve conflicts when importing duplicate documents
26. User can keep either current or imported version of conflicts
27. User can bulk-resolve conflicts ("Keep all" / "Discard all")
28. User can be protected from malformed backup files (no crash)

### Storage (5)
29. User can see storage usage (KB/MB + percentage)
30. User can see document count
31. User can see the 5MB limit
32. User can be warned when storage nears capacity
33. User can be alerted when save fails due to quota

### Accessibility (5)
34. User can navigate document modal with keyboard only
35. User can use the app with a screen reader
36. User can see focus rings on interactive elements
37. User can have animations respect reduced-motion preference
38. User can interact with all features without a mouse

### Error Handling (5)
39. User can recover from corrupted localStorage
40. User can be notified when data corruption is detected
41. User can import partial backups (valid docs imported, bad ones skipped)
42. User can keep editing when auto-save fails
43. User can have import errors reported without crashing

---

## 4. Taskflows (9 total)

### TFW-01: First Visit Experience
```
1. Navigate to app URL
2. Check localStorage → no data
3. Create "My First Document"
4. Apply defaults: light theme, 16px, focus ON
5. Editor loads with welcome content
6. Focus mode activates. User starts typing.
```

### TFW-02: Create New Document
```
1. Ctrl+N → current doc auto-saves
2. Prompt: "Document name:" → user enters name
3. If cancel: return to editing. If empty: "Untitled"
4. Editor clears. New doc created. Undo resets.
Error: storage full → alert, new doc still created in memory.
```

### TFW-03: Open Existing Document
```
1. Ctrl+O → current doc auto-saves
2. Modal opens. First thumbnail focused.
3. Browse (scroll/Tab). Click or Enter to select.
4. Doc loads. Modal closes. Undo resets.
Error: doc content missing → load empty, notify.
```

### TFW-04: Download as .md
```
1. Ctrl+S → auto-save + create Blob + trigger download
2. File: "[name].md" in Downloads folder
3. Notification: "Document saved!"
Error: popup blocker → download may fail silently.
```

### TFW-05: Backup All Documents
```
1. Ctrl+O → modal → "Export documents backup"
2. JSON file downloads with all docs
Error: zero docs → alert "No documents to export."
```

### TFW-06: Restore from Backup
```
1. Ctrl+O → modal → "Import backup" → file picker
2. Parse JSON. Validate schema.
3. Invalid → alert. Wrong schema → alert. Partial → skip malformed.
4. Non-conflicting → add. Conflicting → resolution UI.
5. Floating toolbar for bulk resolution.
Error: storage full → import what fits, report rest.
```

### TFW-07: Delete Document
```
1. Ctrl+O → modal → hover thumbnail → click ×
2. Confirm dialog → confirm → remove from store
3. If current doc deleted → load another or create default
4. Cancel → nothing changes
```

### TFW-08: Handle Storage Full
```
1. Auto-save → QuotaExceededError caught
2. Alert: "Storage full."
3. DOM preserves content. User keeps typing.
4. Export backup → delete docs → storage freed → auto-save resumes.
```

### TFW-09: Recovery from Corrupted Data
```
1. App init → localStorage read → JSON.parse fails
2. Error caught → empty doc array
3. Treat as first visit → create default document
4. Alert: "Data corrupted. Starting fresh."
```

---

## 5. UI Design

### Document Modal
```
┌─────────────────────────────────────────────────┐
│  Open document                              [×] │ ← Sticky header
│  role="dialog" aria-modal="true"                │
├─────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │ Title  │  │ Title  │  │ Title  │            │ ← role="button"
│  │ 2h ago │  │ 1d ago │  │ 3d ago │            │   tabindex="0"
│  │ Preview│  │ Preview│  │ Preview│            │
│  │     [×]│  │     [×]│  │     [×]│            │
│  └────────┘  └────────┘  └────────┘            │
├─────────────────────────────────────────────────┤
│  Docs: 5  │  ████████░░ 2.1 MB (42%)          │
│  [Import md]  [Export backup]  [Import backup]  │
└─────────────────────────────────────────────────┘
```

### Notifications
- Save: green bar, top-right, auto-dismiss 3s, role="alert"
- Storage full: alert dialog (blocking)
- Import success/error: alert dialog
- Data corruption: alert dialog

### Design Principles
- Auto-save silently — never interrupt the writer
- Download = explicit action for local disk
- Modal = single hub for all document operations
- Keyboard + screen reader accessible throughout
- All errors have visible feedback — never silent failures
