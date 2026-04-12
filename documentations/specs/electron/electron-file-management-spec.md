# Electron App — File Management Specification

> **Platform**: Desktop (Windows, macOS, Linux) via Electron  
> **Storage**: Local filesystem (native `.md` files)  
> **UI**: Custom title bar, native file dialogs  
> **Version**: 1.0 | April 2026

---

## 1. User Needs & Motivations

### Why users need the Electron app

| Need ID | User Need | Motivation |
|---------|-----------|------------|
| EN-01 | I need my work saved directly to a local file | I want real files on my disk, not trapped in browser storage |
| EN-02 | I need auto-save without any user action | I never want to lose work — saves should happen instantly and silently |
| EN-03 | I need to open any `.md` file from my filesystem | I work with files from other editors, repos, and tools |
| EN-04 | I need a native app feel with custom title bar | I want it to feel like a proper writing tool, not a browser tab |
| EN-05 | I need to see which file I'm editing and where it's saved | I need to know the file's location and name at all times |
| EN-06 | I need to create new files and choose where to save them | I organize files into folders (projects, notes, drafts) |
| EN-07 | I need recent files access | I frequently return to the same few documents |
| EN-08 | I need the app to remember my last open file | When I launch, I want to continue where I left off |
| EN-09 | I need to work offline without any limitations | No network dependency — everything local |
| EN-10 | I need to use keyboard shortcuts naturally | Ctrl+S saves to disk, Ctrl+O opens file picker, Ctrl+N new file |
| EN-11 | I need the window to remember its size and position | I arrange my desktop a certain way and want it preserved |
| EN-12 | I need minimal, elegant UI with no clutter | The editor is about focus — the chrome should be invisible |

---

## 2. User Scenarios

### File Creation

```
SC-E01: New file (untitled)
  User presses Ctrl+N.
  A new untitled editor opens.
  File is not saved to disk until first explicit save (Ctrl+S).
  Title bar shows "Untitled — Markdown Focus Editor"

SC-E02: New file with Save As
  User presses Ctrl+N, types content, presses Ctrl+S.
  Native "Save As" dialog opens (first time only).
  User chooses location and filename.
  File saved to disk. Title bar shows filename and path.
  All subsequent saves go to same file automatically.

SC-E03: New file from template
  (Future) User can start from a blank or a template.
  Initially: always blank.
```

### File Saving

```
SC-E04: Auto-save to disk
  User types in the editor.
  After a brief debounce (500ms of no typing), file auto-saves to disk.
  No notification. No interruption. Silent.
  Title bar shows filename (no "unsaved" indicator needed — always saved).

SC-E05: Manual save (Ctrl+S)
  User presses Ctrl+S.
  If file has a path: saves immediately to that path.
  If untitled: opens "Save As" dialog.
  Brief notification "Saved to ~/path/file.md"

SC-E06: Save As (new copy)
  User presses Ctrl+Shift+S.
  "Save As" dialog opens.
  User chooses new location/name.
  Editor now points to the new file.
  Original file preserved.

SC-E07: Save on close
  User closes the window or quits the app.
  Current file auto-saves before closing.
  No "unsaved changes" dialog needed — always up to date.
```

### File Opening

```
SC-E08: Open file via dialog (Ctrl+O)
  User presses Ctrl+O.
  Native "Open File" dialog appears.
  Filtered to: .md, .txt, .markdown files.
  Selected file opens in editor.
  Previous file auto-saves before switching.

SC-E09: Open file via drag-and-drop
  User drags a .md file onto the app window.
  File opens in editor. Path shown in title bar.

SC-E10: Open file from command line
  User runs: `mdfe myfile.md` from terminal.
  App opens with that file loaded.

SC-E11: Open file from OS file manager
  User double-clicks a .md file (if app is registered as handler).
  App opens with that file.

SC-E12: Open recent file
  Title bar menu or Ctrl+O dialog shows recent files.
  User clicks a recent file — opens immediately.
```

### File Browsing & Management

```
SC-E13: See current file info
  Title bar shows: filename and parent folder path.
  Example: "notes.md — ~/Documents/project/"

SC-E14: Open containing folder
  (Future) Right-click title bar → "Reveal in Finder/Explorer"
  Opens the folder containing the current file.

SC-E15: Switch between recently opened files
  Recent files list in the Open dialog or a Recent menu.
  Click to switch. Current file auto-saves.
```

### Window & App Lifecycle

```
SC-E16: Remember window state
  Window size, position, and maximized state persist across sessions.
  On launch, window restores to last known state.

SC-E17: Remember last open file
  On launch, the last edited file opens automatically.
  If file was moved/deleted, show empty editor with notification.

SC-E18: Minimize / Maximize / Close
  Custom title bar buttons: minimize, maximize/restore, close.
  Standard keyboard shortcuts: Alt+F4 close, Win+Up maximize.

SC-E19: Fullscreen mode
  F11 or fullscreen button toggles fullscreen.
  Title bar hides in fullscreen. Toolbar still accessible.
```

---

## 3. "User Can..." Statements

### Files
- User can create a new empty document (Ctrl+N)
- User can open any `.md` file from disk (Ctrl+O)
- User can drag-and-drop a file onto the window to open it
- User can open a file from the command line
- User can open a file from the OS file manager (file association)
- User can see the current file's name in the title bar
- User can see the current file's location in the title bar
- User can access recently opened files
- User can save the current file (Ctrl+S) — auto-targets the same path
- User can save as a new file (Ctrl+Shift+S)
- User can have the file auto-save on every edit (after debounce)
- User can close the app knowing the file is saved (save on close)

### Window
- User can minimize, maximize, and close via custom title bar buttons
- User can have the window remember its size and position
- User can enter fullscreen mode (F11)
- User can see a minimal, elegant title bar that matches the editor theme
- User can have the title bar adapt to light/dark theme

### Settings
- User can have all settings (theme, font, focus mode) persist across sessions
- User can have the last opened file restore on app launch

---

## 4. Taskflows

### TFE-01: Create New File
```
1. User presses Ctrl+N
2. Current file auto-saves (if it has a path)
3. Editor clears. Title bar shows "Untitled"
4. User starts typing
5. On first Ctrl+S → "Save As" dialog opens
6. User picks folder and filename
7. File saved. Title bar updates. Auto-save now targets this file.
```

### TFE-02: Open File from Disk
```
1. User presses Ctrl+O
2. Current file auto-saves
3. Native file dialog opens (filtered to .md, .txt)
4. User selects file
5. File content loads into editor
6. Title bar shows filename + path
7. Undo history resets. Auto-save targets this file.
```

### TFE-03: Auto-Save During Editing
```
1. User types in the editor
2. Debounce timer starts (500ms)
3. If no more input within 500ms → file writes to disk
4. No notification. No interruption.
5. Title bar stays clean (no "unsaved" dot).
```

### TFE-04: Save As New Copy
```
1. User presses Ctrl+Shift+S
2. "Save As" dialog opens (pre-filled with current folder)
3. User picks new name/location
4. File saved to new path
5. Title bar updates to new filename
6. Auto-save now targets the new file
7. Original file is preserved.
```

### TFE-05: Open Recent File
```
1. User presses Ctrl+O (or accesses Recent menu)
2. Dialog shows file picker + recent files list
3. User clicks a recent file
4. Current file auto-saves
5. Recent file opens. Title bar updates.
```

### TFE-06: Launch App (Restore State)
```
1. User launches the app (double-click icon or command line)
2. Window restores to last size/position
3. Last opened file path is read from settings
4. If file exists → loads content, title bar shows name
5. If file was deleted/moved → empty editor, notification shown
6. Theme, font size, focus mode restored from settings
```

### TFE-07: Close App
```
1. User clicks close button (or Alt+F4)
2. Current file auto-saves to disk
3. Window state (size, position) saved to settings
4. Current file path saved to settings
5. App closes. No confirmation dialog needed.
```

---

## 5. UI Design

### Custom Title Bar

```
┌──────────────────────────────────────────────────────────────────┐
│  📝 notes.md — ~/Documents/project/        [—] [□] [×]         │
└──────────────────────────────────────────────────────────────────┘

Light theme: white background, dark text, subtle border
Dark theme: #2a2a2a background, light text
Window controls: minimize, maximize/restore, close (right-aligned)
Icon: small app icon (left side)
Text: filename — parent folder path (centered or left-aligned)
Draggable: entire title bar is the drag region
```

### Title Bar States

```
File saved:     "notes.md — ~/Documents/project/"
Untitled:       "Untitled — Markdown Focus Editor"
File not found: "notes.md (file moved or deleted)"
```

### Window Controls

```
[—]  Minimize      → window.minimize()
[□]  Maximize      → window.maximize() / window.unmaximize()
[×]  Close         → auto-save + quit

Hover: subtle highlight
Active/click: slightly darker
Close button hover: red background (Windows convention)
```

### Toolbar (same as web, positioned below title bar)

```
┌──────────────────────────────────────────────────────────────────┐
│  📝 notes.md — ~/Documents                     [—] [□] [×]     │ ← Title bar
├──────────────────────────────────────────────────────────────────┤
│                           ●                                      │ ← Toolbar dot
│                                                                  │
│                    ┌─── editor area ───┐                         │
│                    │                   │                         │
│                    │    Focus mode     │                         │
│                    │    writing here   │                         │
│                    │                   │                         │
│                    └───────────────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Differences from Web Version

| Aspect | Web | Electron |
|--------|-----|----------|
| Storage | localStorage (5MB) | Local filesystem (unlimited) |
| Save | Auto-save to localStorage + download | Auto-save to `.md` file on disk |
| Open | Modal with document grid | Native file dialog + recent files |
| Title bar | Browser tab | Custom title bar with filename + path |
| File format | HTML internally, MD on download | `.md` file is the native format |
| Multi-document | Grid in modal | One file open at a time |
| Backup | JSON export | Not needed (files are on disk) |
| Close | No save prompt | Auto-save on close |
| Offline | After first load | Always |
| Window state | Browser manages | App remembers size/position |

### Design Principles
- **One file at a time** — the Electron app is a focused single-document editor
- **Auto-save always** — never show "unsaved changes" dialogs
- **Native feel** — use OS file dialogs, remember window state, file associations
- **Same editor experience** — focus mode, formatting, theme all identical to web
- **Custom title bar** — minimal, elegant, shows file context
- **No document modal** — replace with native file dialog + recent files
