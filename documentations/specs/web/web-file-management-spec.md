# Web App — File Management Specification

> **Platform**: Browser (no server, no backend)  
> **Storage**: localStorage (5MB limit)  
> **Export**: Download as `.md` file  
> **Version**: 1.0 | April 2026

---

## 1. User Needs & Motivations

### Why users need file management in the web app

| Need ID | User Need | Motivation |
|---------|-----------|------------|
| WN-01 | I need my work to be saved automatically | I don't want to lose my writing if I close the tab or browser crashes |
| WN-02 | I need to have multiple documents | I write different notes/articles and need them separated |
| WN-03 | I need to find a specific document quickly | I have many documents and need to identify the right one |
| WN-04 | I need to download my work as a `.md` file | I want to use my writing in other tools, share it, or back it up locally |
| WN-05 | I need to import/open an existing `.md` file | I have work from other editors I want to continue editing |
| WN-06 | I need to delete old documents | My storage is limited (5MB) and I need to free space |
| WN-07 | I need to know how much storage I'm using | localStorage has a hard limit and I need visibility |
| WN-08 | I need to back up all my documents | If I clear browser data or switch devices, I lose everything |
| WN-09 | I need to restore from a backup | After clearing data or on a new device, I need my documents back |
| WN-10 | I need to know which document I'm currently editing | I switch between documents and need orientation |
| WN-11 | I need to rename a document | The auto-generated title may not be meaningful |
| WN-12 | I need my documents to survive browser data clearing | localStorage can be wiped; I need an escape hatch |

---

## 2. User Scenarios

### Document Creation

```
SC-W01: First visit — auto-created document
  User opens the app for the first time.
  A default document "My First Document" is created automatically.
  User starts typing immediately.

SC-W02: Create new document explicitly
  User presses Ctrl+N or clicks "New Document" in toolbar.
  A prompt asks for the document name.
  A new empty document is created and becomes active.
  Previous document is auto-saved before switching.

SC-W03: Create document from imported file
  User clicks "Import md doc" in the document modal.
  File picker opens for .md/.txt files.
  Selected file content becomes a new document.
  Document is named after the filename.
```

### Document Saving

```
SC-W04: Auto-save on every edit
  User types in the editor.
  Content is auto-saved to localStorage on every input event.
  No save button needed for persistence.
  Document's "lastEdited" timestamp updates.

SC-W05: Manual save notification (Ctrl+S)
  User presses Ctrl+S.
  Content is saved (same as auto-save).
  A brief notification confirms the save.
  If no currentDocId exists, prompts for name first (Save As).

SC-W06: Download as .md file
  User clicks the save button in toolbar or presses Ctrl+S.
  The current document downloads as a .md file.
  Filename: document name + .md extension.

SC-W07: Save As (new copy)
  User presses Ctrl+Shift+S.
  Prompt asks for new document name.
  A new document is created with current content.
  Original document is preserved.
```

### Document Opening & Browsing

```
SC-W08: Open document modal
  User presses Ctrl+O or clicks "Open Document" button.
  Modal shows all documents as thumbnail cards in a grid (3 per row).
  Each card shows: title, last edited date, content preview.
  Footer shows document count and storage usage.

SC-W09: Load a document
  User clicks a document thumbnail in the modal.
  Document content loads into the editor.
  Modal closes. Editor is focused.
  Undo history resets for the new document.

SC-W10: Identify documents visually
  Each thumbnail shows enough preview text (~200 chars) to distinguish.
  Title is bold, date is secondary text.
  Most recently edited documents appear first (sorted by lastEdited).

SC-W11: Switch between documents
  User opens modal, clicks a different document.
  Current document auto-saves before switching.
  New document loads. Context switches completely.
```

### Document Deletion

```
SC-W12: Delete a document
  User hovers over a document thumbnail in the modal.
  A delete (×) button appears.
  Clicking it shows a confirmation dialog.
  On confirm, document is removed from localStorage.
  If it was the current document, editor loads another or clears.

SC-W13: Delete all documents
  No bulk delete feature exists.
  User deletes documents one by one.
```

### Import & Export

```
SC-W14: Export all documents as JSON backup
  User clicks "Export documents backup" in modal footer.
  A JSON file downloads containing all documents.
  Filename: "MD-focus-editor-backup-{timestamp}.json"

SC-W15: Import JSON backup
  User clicks "Import backup" in modal footer.
  File picker opens for .json files.
  Non-conflicting documents are added immediately.
  Conflicting documents (same ID) show resolution UI.

SC-W16: Import single .md file
  User clicks "Import md doc" in modal footer.
  File picker opens for .md/.txt/.html files.
  File becomes a new document.

SC-W17: Drag-and-drop file onto editor
  User drags a .md/.txt file onto the editor area.
  File content replaces the editor (creates new document).
```

### Storage Management

```
SC-W18: View storage usage
  Document modal footer shows:
  - Total document count
  - Storage used in KB/MB
  - Percentage of 5MB limit
  - Visual progress bar

SC-W19: Storage full warning
  When localStorage.setItem throws QuotaExceededError:
  - Alert shown: "Storage full. Export backup and delete old documents."
  - No data loss (write simply fails gracefully).
```

---

## 3. "User Can..." Statements

### Documents
- User can create a new document with a custom name
- User can have the first document created automatically on first visit
- User can switch between multiple documents
- User can see all documents in a visual grid
- User can identify documents by title, date, and content preview
- User can rename a document
- User can delete a document with confirmation
- User can see which document is currently active

### Saving & Persistence
- User can have their work auto-saved on every keystroke
- User can manually trigger save with Ctrl+S
- User can save the current document as a new copy (Save As)
- User can download any document as a `.md` file
- User can have settings (theme, font, focus mode) persist across sessions
- User can have the last active document restored on page reload

### Import & Export
- User can import a single `.md` file as a new document
- User can drag-and-drop a `.md` file to import it
- User can export all documents as a JSON backup
- User can import a JSON backup to restore documents
- User can resolve conflicts when importing duplicate documents
- User can keep either the current or imported version of conflicting documents

### Storage
- User can see how much storage they're using
- User can see how many documents they have
- User can see the storage limit (5MB)
- User can be warned when storage is full

---

## 4. Taskflows

### TFW-01: Create New Document
```
1. User presses Ctrl+N (or clicks New Document in toolbar)
2. Prompt appears: "Enter document name:"
3. User types name → clicks OK
4. Current document auto-saves
5. Editor clears. New empty document loaded.
6. Undo history resets. currentDocId updated.
```

### TFW-02: Open Existing Document
```
1. User presses Ctrl+O (or clicks Open Document)
2. Modal opens with document grid
3. User scans thumbnails (title + date + preview)
4. User clicks desired document
5. Current document auto-saves
6. Selected document loads into editor
7. Modal closes. Editor focused. Undo resets.
```

### TFW-03: Download Current Document
```
1. User presses Ctrl+S (or clicks Save button)
2. Document auto-saves to localStorage
3. Browser triggers download of .md file
4. File saved to user's Downloads folder
5. Brief notification "Document saved!"
```

### TFW-04: Import Markdown File
```
1. User presses Ctrl+O to open modal
2. Clicks "Import md doc" in footer
3. File picker opens (filtered to .md, .txt, .html)
4. User selects file
5. New document created with file content
6. Document name = filename without extension
7. Grid refreshes showing new document (highlighted)
8. Alert confirms import success
```

### TFW-05: Backup & Restore
```
Backup:
1. User opens document modal (Ctrl+O)
2. Clicks "Export documents backup"
3. JSON file downloads with all documents

Restore:
1. User opens document modal
2. Clicks "Import backup"
3. Selects JSON file
4. Non-conflicting docs: added immediately (orange-yellow border)
5. Conflicting docs: shown with red border + resolution buttons
6. User resolves each conflict or clicks "Keep all" / "Discard all"
```

### TFW-06: Delete Document
```
1. User opens document modal (Ctrl+O)
2. Hovers over document thumbnail
3. Delete (×) button appears on top-right
4. User clicks ×
5. Confirmation dialog: "Are you sure?"
6. On confirm: document removed. Grid updates. Storage recalculated.
```

### TFW-07: Check Storage Usage
```
1. User opens document modal (Ctrl+O)
2. Footer displays: "Documents: N" | "X KB used (Y% of 5MB)"
3. Progress bar visualizes storage percentage
4. If >80% full, bar color changes to warn
```

---

## 5. UI Design

### Document Modal (existing — enhanced)

```
┌─────────────────────────────────────────────────┐
│  Open document                              [×] │ ← Sticky header
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │ Title  │  │ Title  │  │ Title  │            │ ← 3-column grid
│  │ Date   │  │ Date   │  │ Date   │            │
│  │ Preview│  │ Preview│  │ Preview│            │ ← 200 chars max
│  │     [×]│  │     [×]│  │     [×]│            │ ← Delete on hover
│  └────────┘  └────────┘  └────────┘            │
│                                                 │
│  ┌────────┐  ┌────────┐                        │
│  │ Title  │  │ Title  │                        │
│  │ Date   │  │ Date   │                        │
│  │ Preview│  │ Preview│                        │
│  │     [×]│  │     [×]│                        │
│  └────────┘  └────────┘                        │
│                                                 │ ← Scrollable body
├─────────────────────────────────────────────────┤
│  Documents: 5  │  ████████░░ 2.1 MB (42%)     │ ← Footer
│                                                 │
│  [Import md]  [Export backup]  [Import backup]  │ ← Action buttons
└─────────────────────────────────────────────────┘
```

### Toolbar (existing)

```
  ┌─ red dot (collapsed) ─┐
  │                        │
  └── click to expand ─────┘

  ┌────────────────────────────────────────────────┐
  │ [New] [Open] [Save] [A+] [A-] [Theme] [⛶]  │─│ ← Focus toggle
  └────────────────────────────────────────────────┘
```

### Notifications
- Save: green bar, top-right, auto-dismiss 3s
- Storage full: alert dialog (blocking)
- Import success: alert dialog

### Design Principles
- No new UI chrome — use existing toolbar + modal pattern
- Minimal prompts — only when user needs to name something
- Auto-save silently — no interruptions
- Download = explicit action (Ctrl+S or save button)
- Modal = document browser + file operations hub
