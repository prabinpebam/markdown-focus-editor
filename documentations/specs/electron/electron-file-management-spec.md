# Electron App — Exhaustive File Management Specification

> **Platform**: Desktop (Windows, macOS, Linux) via Electron  
> **Storage**: Local filesystem (native `.md` files)  
> **UI**: Custom frameless window with title bar  
> **Version**: 2.0 | April 2026

---

## 1. User Needs & Motivations

| ID | User Need | Motivation | Priority |
|----|-----------|------------|----------|
| EN-01 | My work saves directly to a local .md file | I want real files on disk, not trapped in browser storage | Critical |
| EN-02 | Auto-save without any user action | I never want to lose work — saves should be instant and silent | Critical |
| EN-03 | I can open any .md file from my filesystem | I work with files from other editors, repos, tools | Critical |
| EN-04 | The app feels native with a custom title bar | I want a proper writing tool, not a browser tab | High |
| EN-05 | I can see which file I'm editing and where it's saved | I need to know the file's location and name at all times | High |
| EN-06 | I can create new files and choose where to save them | I organize files into folders (projects, notes, drafts) | High |
| EN-07 | I can quickly access recent files | I frequently return to the same few documents | High |
| EN-08 | The app remembers my last open file on launch | Continue where I left off without finding the file again | High |
| EN-09 | The app works fully offline | No network dependency — everything local | Critical |
| EN-10 | Standard keyboard shortcuts work naturally | Ctrl+S saves to disk, Ctrl+O opens, Ctrl+N creates | High |
| EN-11 | The window remembers its size and position | My desktop layout is intentional | Medium |
| EN-12 | Minimal, elegant UI with no visual clutter | The editor is about focus — chrome should be invisible | High |
| EN-13 | I'm warned if my file was changed by another app | I may use Git, VS Code, or sync tools alongside this editor | High |
| EN-14 | I can open files from the command line | I use terminal workflows for my writing | Medium |
| EN-15 | I can open .md files by double-clicking in Explorer/Finder | Standard OS integration expected for a writing app | Medium |
| EN-16 | Read-only files are handled gracefully | I may browse .md files I can't edit (permissions, read-only) | Medium |
| EN-17 | Very large files don't crash the app | Some markdown docs are hundreds of KB | Medium |
| EN-18 | Files are always written in UTF-8 | Standard encoding for markdown everywhere | High |
| EN-19 | I can see unsaved indicator if auto-save is delayed | If network drive or slow disk delays save, I want to know | Low |
| EN-20 | Multiple windows are handled correctly | I might open the app twice | Medium |

---

## 2. User Scenarios

### A. File Creation

```
SC-E01: New file — untitled
  User presses Ctrl+N.
  Current file auto-saves (if it has a path).
  Editor clears. Title bar: "Untitled — Markdown Focus Editor"
  File is NOT on disk yet. No file path assigned.
  User starts typing. Content exists only in memory.

SC-E02: First save of untitled file (Save As flow)
  User has untitled file with content. Presses Ctrl+S.
  Native "Save As" dialog opens.
  Default location: last used folder or user's Documents.
  Default filename: "Untitled.md"
  User picks location and name. File written to disk.
  Title bar updates: "filename.md — /path/to/folder/"
  Auto-save now targets this file.

SC-E03: New file while current file has unsaved content
  User presses Ctrl+N while editing.
  Auto-save fires first (500ms debounce may not have triggered yet).
  Force-save current file before clearing editor.
  If untitled and never saved: silently discard (no prompt).
  If file has path: save to disk, then clear.

SC-E04: New file from command line
  User runs: mdfe (no arguments)
  App launches with untitled empty editor.

SC-E05: New file — empty name in Save As dialog
  User clears the filename field in Save As dialog.
  OS dialog prevents saving with empty filename (native behavior).

SC-E06: New file — filename with special characters
  User names file: 📝 日本語.md
  On Windows: some chars (< > : " / \ | ? *) are forbidden.
  App relies on native dialog which validates filename.
  On macOS/Linux: most characters allowed.

SC-E07: New file — filename longer than 255 characters
  OS native dialog prevents filenames exceeding OS limit.
  App doesn't need to validate — OS handles it.
```

### B. File Saving

```
SC-E08: Auto-save during editing
  User types in editor.
  After 500ms of no input (debounce), file writes to disk.
  File written atomically (write to temp, then rename).
  No notification. No interruption. Silent.
  If file has no path (untitled): auto-save is no-op.

SC-E09: Manual save (Ctrl+S) — file has path
  User presses Ctrl+S.
  File saves immediately to its current path.
  Brief notification: "Saved to ~/path/file.md"

SC-E10: Manual save (Ctrl+S) — untitled file
  "Save As" dialog opens (same as SC-E02).

SC-E11: Save As (Ctrl+Shift+S)
  Always opens "Save As" dialog regardless of file state.
  User picks new location/name.
  Editor now points to new file. Original preserved.

SC-E12: Save on close
  User closes window or quits app.
  Current file auto-saves before closing.
  If untitled with content: silently discard (or prompt — TBD).
  No "unsaved changes" dialog for files with paths (always saved).

SC-E13: Save failure — disk full
  fs.writeFile fails with ENOSPC.
  Notification: "Save failed: disk is full."
  Editor content preserved in memory. User can try saving elsewhere.

SC-E14: Save failure — permission denied
  fs.writeFile fails with EACCES.
  Notification: "Save failed: permission denied. Try Save As to a different location."
  User can Ctrl+Shift+S to save elsewhere.

SC-E15: Save failure — file locked by another application
  fs.writeFile fails with EBUSY or EPERM.
  Notification: "Save failed: file is in use by another application."
  Retry after 1 second. If still locked: notify user.

SC-E16: Save failure — network drive disconnected
  File path is on a network share that disconnected.
  fs.writeFile fails with ENETUNREACH or similar.
  Notification: "Save failed: network location unavailable."
  Content safe in memory. User can save locally.

SC-E17: Save encoding
  All files written in UTF-8 (no BOM by default).
  fs.writeFile('path', content, 'utf8').

SC-E18: Auto-save indicator
  Title bar shows a subtle dot (●) when content has changed since last save.
  Dot disappears after successful save. Usually invisible (500ms debounce).
  If save fails: dot persists as visual cue.
```

### C. File Opening

```
SC-E19: Open via dialog (Ctrl+O)
  User presses Ctrl+O.
  Current file auto-saves.
  Native "Open File" dialog appears.
  Filter: "Markdown files (*.md *.markdown *.txt)"
  User selects file. Content loads. Title bar updates.
  Undo history resets.

SC-E20: Open via drag-and-drop
  User drags .md file onto app window.
  File opens. Title bar shows path.

SC-E21: Open via command line
  User runs: mdfe ~/Documents/note.md
  App launches with that file loaded.
  If file doesn't exist: create it on first save.
  Title bar: "note.md — ~/Documents/"

SC-E22: Open via command line — file doesn't exist
  mdfe ~/path/nonexistent.md
  App opens with empty editor. Title bar: "nonexistent.md (new)"
  On first save: file created at that path.

SC-E23: Open via OS file association
  User double-clicks .md file in Explorer/Finder.
  If app not running: launches and opens file.
  If app already running: raises window, opens file (replaces current).

SC-E24: Open file — encoding detection
  File read with fs.readFile('path', 'utf8').
  Non-UTF-8 files: may display garbled characters.
  No automatic encoding detection. UTF-8 assumed.

SC-E25: Open file — very large (>1MB)
  File loads. Editor may be slower for very large content.
  Focus mode character sampling (O(n)) may cause initial lag.
  No hard limit — graceful degradation.

SC-E26: Open file — empty (0 bytes)
  Editor shows empty state. User can start typing.

SC-E27: Open file — binary/corrupted
  File read returns non-text data.
  Editor displays garbled content. User can close and open another.
  No detection of binary files currently.

SC-E28: Open file — read-only (permissions)
  File opens and displays content.
  Auto-save fails with EACCES.
  Notification: "This file is read-only."
  User can edit in-memory but cannot save to same path.
  Ctrl+Shift+S (Save As) to writable location works.

SC-E29: Open recent files
  App maintains a list of recently opened files (last 10).
  Accessible from Open dialog or app menu.
  Click to open. If file was moved/deleted: notification.

SC-E30: Open file changed externally since last open
  Another app modified the file after this app opened it.
  On focus-return or file watcher event:
  Notification: "File changed externally. Reload?"
  User chooses: Reload (lose in-memory changes) or Keep (overwrite on next save).
```

### D. File Watching (External Changes)

```
SC-E31: File watcher detects external modification
  App uses fs.watch() on the current file path.
  When file changes on disk (not by this app):
  Show notification bar at top of editor:
  "[filename] was modified externally. [Reload] [Ignore]"

SC-E32: File watcher — file deleted externally
  File is deleted while editor has it open.
  Notification: "[filename] was deleted. Save to recreate it."
  Title bar: "filename.md (deleted)"
  Auto-save creates the file again on next edit.

SC-E33: File watcher — file renamed/moved externally
  Watcher loses track (old path gone).
  Same as SC-E32 — treat as deletion.
  User does Ctrl+Shift+S to save at new location.

SC-E34: File watcher — cloud sync conflict (Dropbox, OneDrive)
  Sync tool modifies file between auto-saves.
  Same as SC-E31 — "modified externally" notification.
  User decides whether to reload or overwrite.
```

### E. Window & App Lifecycle

```
SC-E35: App launch — restore last session
  Window size/position restored from settings.
  Last opened file path read from settings.
  If file exists: load content, title bar shows name.
  If file moved/deleted: empty editor, notification: "Last file not found."
  Theme, font, focus mode restored.

SC-E36: App launch — first time (no settings)
  Default window: 1200×800, centered on primary screen.
  Empty untitled editor. Default settings:
  Light theme, 16px font, focus mode ON.

SC-E37: App launch — from command line with file argument
  File specified → opens that file instead of restoring last session.
  Window state still restored.

SC-E38: Window minimize/maximize/close — custom title bar
  Minimize: window.minimize()
  Maximize: window.maximize() / window.unmaximize() (toggle)
  Close: auto-save → save window state → quit

SC-E39: Fullscreen mode (F11)
  Title bar hides in fullscreen.
  Toolbar still accessible (dot appears below top edge).
  Escape or F11 exits fullscreen. Title bar reappears.

SC-E40: Window dragging
  Entire title bar area (excluding buttons) is the drag region.
  Double-click title bar = maximize/restore toggle.
  Buttons (min/max/close) are excluded from drag region.

SC-E41: Multiple windows
  User opens app twice (or opens second file from Explorer).
  Each window is independent. Each tracks its own file.
  Each auto-saves independently. No IPC between windows.
  Each window saves its own state (size/position/file).

SC-E42: Quit with multiple windows
  All windows auto-save. Window states saved for all.
  On next launch: only one window restored (last focused).

SC-E43: System tray (future)
  Not implemented initially. Single window only.

SC-E44: App idle for extended time
  File watcher continues running.
  Auto-save only triggers on content changes.
  No timeout. No session expiry. Content safe in file.
```

### F. Title Bar

```
SC-E45: Title bar — file with path
  Shows: "filename.md — /parent/folder/"
  Font: small, clean. Matches editor theme.

SC-E46: Title bar — untitled file
  Shows: "Untitled — Markdown Focus Editor"

SC-E47: Title bar — file deleted externally
  Shows: "filename.md (deleted)"

SC-E48: Title bar — unsaved dot indicator
  Shows: "● filename.md — /path/" (dot before filename)
  Dot appears when content changed since last save.
  Disappears after successful save (usually within 500ms).

SC-E49: Title bar — dark/light theme
  Light: white/light-grey background, dark text
  Dark: #2a2a2a background, light text
  Window control buttons adapt to theme.

SC-E50: Title bar — close button hover
  Close (×) button hover: red background (Windows convention).
  Minimize/Maximize hover: subtle highlight.
```

### G. Error Handling

```
SC-E51: File read error on open
  fs.readFile fails (corrupted disk, permission, etc.).
  Alert: "Could not open file: [error message]"
  Editor stays on current file (or empty if no file was open).

SC-E52: File write error — repeated failures
  Auto-save tries, fails, retries once after 2 seconds.
  If still fails: notification persists.
  User can Save As to different location.

SC-E53: App crash recovery
  If app crashes mid-edit (OOM, unhandled exception):
  Last auto-save (max 500ms old) is on disk.
  On re-launch: last file path restored. Content from disk.

SC-E54: Settings file corrupted
  JSON settings file can't be parsed.
  Defaults applied. Old settings file backed up as .bak.
  App launches normally with defaults.
```

### H. Accessibility

```
SC-E55: Custom title bar — keyboard accessible
  Alt+F4: close. Alt+Space: system menu (native).
  Custom buttons: Tab-focusable with aria-labels.

SC-E56: Screen reader — title bar
  Title bar text is readable. Window role = "application".
  Buttons have aria-labels: "Minimize", "Maximize", "Close".

SC-E57: High contrast / reduced motion
  Same as web app. CSS media queries applied.

SC-E58: Keyboard shortcuts — standard platform conventions
  Ctrl+S, Ctrl+O, Ctrl+N, Ctrl+Shift+S follow platform norms.
  macOS: Cmd instead of Ctrl (Electron handles this).
```

---

## 3. "User Can..." Statements (48 total)

### Files (18)
1. User can create a new empty document (Ctrl+N)
2. User can open any .md file from disk (Ctrl+O)
3. User can drag-and-drop a file onto the window to open it
4. User can open a file from the command line
5. User can open .md files by double-clicking in OS file manager
6. User can see the current filename in the title bar
7. User can see the current file's folder path in the title bar
8. User can access recently opened files (last 10)
9. User can save the current file (Ctrl+S)
10. User can save as a new file (Ctrl+Shift+S)
11. User can have the file auto-save on every edit (500ms debounce)
12. User can close the app knowing the file is saved
13. User can be notified when a file was modified externally
14. User can reload or ignore external file changes
15. User can be warned when a file is read-only
16. User can open files that don't exist yet (created on first save)
17. User can see an unsaved indicator when save is pending
18. User can have all files written in UTF-8

### Window (9)
19. User can minimize, maximize, close via custom title bar
20. User can drag the window by the title bar
21. User can double-click title bar to maximize/restore
22. User can enter fullscreen mode (F11)
23. User can have the title bar hide in fullscreen
24. User can have window size/position remembered across sessions
25. User can open multiple independent windows
26. User can have the title bar match the light/dark theme
27. User can see the close button turn red on hover (Windows)

### Settings (5)
28. User can have theme, font, focus mode persist across sessions
29. User can have the last opened file restore on launch
30. User can have settings recover from corruption (defaults applied)
31. User can use macOS Cmd shortcuts in addition to Ctrl
32. User can have first-launch defaults (light, 16px, focus ON)

### Error Handling (8)
33. User can be notified when save fails (disk full, permissions)
34. User can Save As to different location when current path fails
35. User can recover from app crash (last auto-save on disk)
36. User can be told when a file was deleted externally
37. User can be told when a file read fails
38. User can have save retry automatically once
39. User can keep editing even when save fails (content in memory)
40. User can have settings corruption recovered silently

### Accessibility (8)
41. User can navigate the title bar with keyboard
42. User can use the app with a screen reader
43. User can see focus rings on all interactive elements
44. User can have animations respect reduced-motion
45. User can interact with all features without a mouse
46. User can use standard platform keyboard shortcuts
47. User can have title bar buttons with aria-labels
48. User can have the app work with high contrast mode

---

## 4. Taskflows (11 total)

### TFE-01: Create New File
```
1. Ctrl+N → current file auto-saves (if path exists)
2. Editor clears. Title bar: "Untitled"
3. User types content. Auto-save disabled (no path).
4. Ctrl+S → "Save As" dialog (native OS)
5. User picks folder + filename → file written
6. Title bar updates. Auto-save enabled.
Error: disk full → alert. Permissions → alert + Save As elsewhere.
```

### TFE-02: Open File from Disk
```
1. Ctrl+O → current file auto-saves
2. Native file dialog (filter: .md, .txt, .markdown)
3. User selects file → fs.readFile(path, 'utf8')
4. Content loads. Title bar: "name.md — /folder/"
5. File watcher starts for this path.
6. Undo resets. Auto-save targets this file.
Error: read fails → alert. File binary → garbled display.
```

### TFE-03: Auto-Save During Editing
```
1. User types → debounce timer starts (500ms)
2. No more input within 500ms → file writes to disk
3. Write: temp file → atomic rename
4. Unsaved dot (●) appears on change, disappears on save
5. If untitled: skip (no path to save to)
Error: write fails → notification persists. Retry once.
```

### TFE-04: Save As New Copy
```
1. Ctrl+Shift+S → "Save As" dialog
2. User picks new name/location
3. File written to new path
4. Title bar updates. Auto-save retargets.
5. Original file preserved on disk.
```

### TFE-05: Open Recent File
```
1. Ctrl+O → dialog shows recent files list (last 10)
2. User clicks recent entry
3. Current file auto-saves
4. Recent file opens. Title bar updates.
Error: file moved/deleted → "File not found. Remove from recents?"
```

### TFE-06: Launch App — Restore Session
```
1. App launches → read settings file
2. Restore window size/position/maximized state
3. Read last file path → fs.existsSync check
4. File exists → load content, title bar, start watcher
5. File gone → empty editor, notification
6. Restore theme, font, focus mode
Error: settings corrupted → apply defaults, back up old file.
```

### TFE-07: Close App
```
1. User clicks close (or Alt+F4 / Cmd+Q)
2. Force auto-save (don't wait for debounce)
3. Save window state (size, position, maximized)
4. Save current file path to settings
5. Disconnect file watcher
6. App exits. No confirmation dialog.
```

### TFE-08: External File Change Detected
```
1. File watcher fires (file modified on disk)
2. Compare with in-memory content
3. If identical: ignore (was our own save)
4. If different: show notification bar
   "[filename] changed externally. [Reload] [Ignore]"
5. Reload: re-read file, replace editor content, reset undo
6. Ignore: keep in-memory content, next save overwrites disk
```

### TFE-09: Handle Save Failure
```
1. Auto-save or Ctrl+S → fs.writeFile fails
2. Error caught. Unsaved dot (●) persists.
3. Notification: "Save failed: [reason]"
4. Retry once after 2 seconds
5. If still fails: notification stays until user acts
6. User can Ctrl+Shift+S to save to different location
7. Content safe in memory throughout
```

### TFE-10: Open File from OS File Manager
```
1. User double-clicks .md file in Explorer/Finder
2. OS launches app (or sends to running instance via IPC)
3. If new instance: normal launch flow with file argument
4. If existing instance: raise window, open file
5. Current file auto-saves before switch
```

### TFE-11: Handle Read-Only File
```
1. User opens file → fs.readFile succeeds
2. First auto-save attempt → fs.writeFile fails with EACCES
3. Notification: "This file is read-only."
4. unsaved dot (●) appears but save is blocked
5. User edits in memory. Can Save As to writable location.
6. Auto-save stops retrying for read-only files.
```

---

## 5. UI Design

### Custom Title Bar
```
┌──────────────────────────────────────────────────────────────────┐
│  📝 ● notes.md — ~/Documents/project/          [—] [□] [×]     │
└──────────────────────────────────────────────────────────────────┘
     ↑                                              ↑  ↑  ↑
  unsaved dot                                    min max close
  (disappears after save)                        (red on hover)

Light: #ffffff bg, #333 text, #e0e0e0 border-bottom
Dark:  #2a2a2a bg, #e0e0e0 text, #444 border-bottom
Height: 32px. Font: 12px system font.
Drag region: entire bar except buttons.
Double-click drag region: toggle maximize.
```

### Title Bar States
```
Normal:     "notes.md — ~/Documents/"
Unsaved:    "● notes.md — ~/Documents/"
Untitled:   "Untitled — Markdown Focus Editor"
Read-only:  "notes.md (read-only) — ~/Documents/"
Deleted:    "notes.md (deleted) — ~/Documents/"
Not found:  "notes.md (file not found)"
```

### External Change Notification Bar
```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠ notes.md was modified externally.         [Reload] [Ignore]  │
└──────────────────────────────────────────────────────────────────┘
Background: amber/yellow. Below title bar, above editor.
Dismisses on action. Doesn't block editing.
```

### Window Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  📝 notes.md — ~/Documents                     [—] [□] [×]     │ ← 32px title bar
├──────────────────────────────────────────────────────────────────┤
│                           ●                                      │ ← Toolbar dot
│                                                                  │
│                    ┌─── editor area ───┐                         │
│                    │                   │                         │
│                    │   # Heading       │                         │
│                    │                   │                         │
│                    │   Focus mode      │                         │
│                    │   highlights the  │                         │
│                    │   current line    │                         │
│                    │                   │                         │
│                    └───────────────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Differences from Web

| Aspect | Web | Electron |
|--------|-----|----------|
| Storage | localStorage (5MB) | Local filesystem (unlimited) |
| Save | Auto-save to localStorage + download .md | Auto-save directly to .md file on disk |
| Save trigger | Every input event | 500ms debounce after last input |
| Open | Modal with document grid | Native OS file dialog + recent files |
| Title bar | Browser tab title | Custom bar: filename + path + unsaved dot |
| File format | HTML in localStorage, md on download | .md file is the only format |
| Multi-document | Grid in modal, all in localStorage | One file per window |
| Backup | JSON export (needed — localStorage volatile) | Not needed (files on disk) |
| File watching | Not possible | fs.watch for external changes |
| Close behavior | Last auto-save on input event | Force-save on close |
| Offline | After first load (cache dependent) | Always (no network needed) |
| Window state | Browser manages | App persists size/position |
| Read-only | Not applicable | Detected, user notified |
| File encoding | Not applicable (localStorage is text) | Always UTF-8 |

### Design Principles
- **One file, one window** — focused single-document editor
- **Auto-save always** — never show "unsaved changes" dialogs
- **Native feel** — OS file dialogs, window state, file associations
- **Same editor core** — focus mode, formatting, theme identical to web
- **Custom title bar** — minimal, elegant, shows file context
- **External changes detected** — file watcher notifies, user decides
- **Errors are visible** — save failures, permissions, missing files all notified
