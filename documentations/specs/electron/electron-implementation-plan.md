# Electron App — Implementation Plan

> **Methodology**: Strict TDD with eval-loop verification  
> **Architecture**: Gated phases, each verified before proceeding  
> **Testing**: Playwright Electron + DOM snapshots → heuristic + semantic eval → fix loop  
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

The web editor core is shared. Electron wraps it with:
  - Node.js filesystem access (main process)
  - Custom frameless window (BrowserWindow)
  - IPC for file operations (main ↔ renderer)
  - Native file dialogs (dialog.showOpenDialog, etc.)
```

---

## Gate Structure

```
Gate 0: Project Setup & Shared Core             ← NEW
Gate 1: Electron Window & Custom Title Bar       ← NEW
Gate 2: File Open (Ctrl+O, drag-drop, CLI)       ← NEW
Gate 3: File Save & Auto-Save                    ← NEW
Gate 4: File Create (Ctrl+N) & Save As           ← NEW
Gate 5: Recent Files                             ← NEW
Gate 6: File Watching (External Changes)         ← NEW
Gate 7: Error Handling & Recovery                ← NEW
Gate 8: Title Bar States & Notifications         ← NEW
Gate 9: Window Lifecycle & Settings              ← NEW
Gate 10: Accessibility                           ← NEW
Gate 11: Multi-Window Support                    ← NEW
Gate 12: Final Integration & Regression          ← NEW
```

---

## Gate 0: Project Setup & Shared Core

### Implementation Tasks

```
G0-1: Project structure
  markdown-focus-editor/
  ├── web/                    ← Web app (current code, moved)
  │   ├── index.html
  │   ├── js/modules/
  │   ├── style/
  │   └── eval-loop/
  ├── electron/               ← Electron wrapper
  │   ├── main.js             ← Main process
  │   ├── preload.js          ← Preload script (IPC bridge)
  │   ├── renderer/           ← Renderer-specific code
  │   │   └── titlebar.js
  │   └── electron-eval/      ← Electron-specific eval tests
  ├── shared/                 ← Shared modules
  │   ├── editor.js
  │   ├── focusMode.js
  │   ├── headingManager.js
  │   ├── listManager.js
  │   ├── inlineStyleManager.js
  │   ├── clipboardManager.js
  │   ├── markdownConverter.js
  │   ├── sanitizer.js
  │   ├── undoManager.js
  │   └── theme.js
  └── package.json            ← Electron dependency

G0-2: Separate web-only from shared modules
  Web-only: documentStore.js, storage.js, modalManager.js
  Electron-only: main.js, preload.js, fileManager.js, titlebar.js
  Shared: everything else (editor core, formatting, clipboard, theme)

G0-3: Electron dependencies
  npm install electron --save-dev
  npm install electron-builder --save-dev  (for packaging)

G0-4: Shared test infrastructure
  Playwright supports Electron testing via _electron.launch()
  Eval-loop tests can run against both web (HTTP) and Electron
```

### TDD: Eval-Loop Tests

```
Test ID: E-SETUP-01  "Electron app launches"
  Actions:
    1. Launch Electron app via Playwright
    2. Wait for window to appear
    3. Capture: window size, title, editor element present
  Heuristic:
    - Window title contains "Markdown Focus Editor"
    - #editor element exists and is contenteditable
    - No JavaScript errors in console

Test ID: E-SETUP-02  "Shared editor core works in Electron"
  Actions:
    1. Launch Electron app
    2. Type "# Heading" → Enter → "**bold text"
    3. Capture snapshot
  Heuristic:
    - Heading with marker created (same as web)
    - Bold element created
    - Focus mode active
```

### Gate 0 Exit Criteria
```
□ Electron app launches without errors
□ Editor core (typing, headings, lists, styles) works identically
□ E-SETUP-01, E-SETUP-02 CLEAN
□ Web eval-loop tests still pass (no regression from restructure)
```

---

## Gate 1: Electron Window & Custom Title Bar

### Implementation Tasks

```
G1-1: Frameless BrowserWindow
  new BrowserWindow({
    frame: false,
    titleBarStyle: 'hidden',  // macOS: show traffic lights
    width: 1200, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

G1-2: Custom title bar HTML/CSS
  <div id="title-bar" class="drag-region">
    <span id="title-icon">📝</span>
    <span id="title-text">Untitled — Markdown Focus Editor</span>
    <div id="window-controls" class="no-drag">
      <button id="btn-minimize" aria-label="Minimize">—</button>
      <button id="btn-maximize" aria-label="Maximize">□</button>
      <button id="btn-close" aria-label="Close">×</button>
    </div>
  </div>

G1-3: Window control IPC
  Renderer → Main:
    window-minimize, window-maximize, window-close
  Main handles via:
    win.minimize(), win.maximize()/win.unmaximize(), win.close()

G1-4: Title bar theming
  .title-bar { -webkit-app-region: drag; }
  .no-drag { -webkit-app-region: no-drag; }
  Light: #fff bg, #333 text
  Dark: #2a2a2a bg, #e0e0e0 text
  Close hover: red background

G1-5: Double-click maximize toggle
  Title bar double-click → toggle maximize/restore
```

### TDD: Eval-Loop Tests

```
Test ID: E-TB-01  "Title bar renders correctly"
  Actions: Launch app, capture DOM
  Heuristic:
    - #title-bar element exists
    - #title-text contains "Markdown Focus Editor"
    - 3 window control buttons exist
    - All buttons have aria-labels

Test ID: E-TB-02  "Window controls work"
  Actions:
    1. Click minimize → verify window minimized
    2. Click maximize → verify window maximized
    3. Click restore → verify window normal
    4. Click close → verify app quits (auto-save first)

Test ID: E-TB-03  "Title bar matches theme"
  Actions:
    1. Capture title bar style (light theme)
    2. Toggle theme to dark
    3. Capture title bar style (dark theme)
  Heuristic:
    - Background color changes with theme
    - Text color changes with theme

Test ID: E-TB-04  "Close button hover shows red"
  Actions: Hover over close button, capture computed background-color
  Heuristic: background-color is red variant on hover
```

### Gate 1 Exit Criteria
```
□ E-TB-01..04 CLEAN
□ Title bar is draggable (window moves)
□ Double-click toggles maximize
□ Close button turns red on hover
□ Theme applies to title bar
```

---

## Gate 2: File Open

### Implementation Tasks

```
G2-1: IPC for file operations (preload.js)
  contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    readFile: (path) => ipcRenderer.invoke('file:read', path),
    saveFile: (path, content) => ipcRenderer.invoke('file:save', path, content),
    saveFileAs: () => ipcRenderer.invoke('dialog:saveFile'),
    getFilePath: () => ipcRenderer.invoke('file:getPath'),
  });

G2-2: Main process file handlers (main.js)
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      properties: ['openFile']
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle('file:read', async (event, filePath) => {
    return fs.promises.readFile(filePath, 'utf8');
  });

G2-3: Renderer file opener
  Ctrl+O → window.electronAPI.openFile() → get path
  → window.electronAPI.readFile(path) → set editor content
  → update title bar with filename + folder

G2-4: Drag-and-drop file open
  Editor 'drop' event → get file path from dataTransfer
  → read file → set editor content → update title bar

G2-5: Command-line file argument
  process.argv[1] → if it's a file path → open on launch
```

### TDD: Eval-Loop Tests

```
Test ID: E-OPEN-01  "Open file via Ctrl+O"
  Actions:
    1. Create a temp .md file with known content
    2. Launch app
    3. Simulate Ctrl+O → select the temp file
    4. Capture: editor content, title bar text
  Heuristic:
    - Editor content matches file
    - Title bar shows filename + folder

Test ID: E-OPEN-02  "Open file via drag-and-drop"
  Actions: Drag temp .md file onto window, capture
  Heuristic: Same as E-OPEN-01

Test ID: E-OPEN-03  "Open file via command line"
  Actions: Launch with file argument, capture
  Heuristic: File content loaded, title bar correct

Test ID: E-OPEN-04  "Open nonexistent file from CLI"
  Actions: Launch with --file /nonexistent/path.md
  Heuristic: Empty editor, title bar shows "path.md (new)"

Test ID: E-OPEN-05  "Open read-only file"
  Actions: Open file with read-only permissions
  Heuristic: Content loads, notification "read-only" shown
```

### Gate 2 Exit Criteria
```
□ E-OPEN-01..05 CLEAN
□ Native file dialog shows correct filters
□ Title bar updates on file open
□ Editor content matches file content
□ Read-only detection works
```

---

## Gate 3: File Save & Auto-Save

### Implementation Tasks

```
G3-1: Auto-save with debounce
  let saveTimer = null;
  editor.on('input', () => {
    clearTimeout(saveTimer);
    setUnsavedDot(true);
    saveTimer = setTimeout(() => {
      if (currentFilePath) {
        electronAPI.saveFile(currentFilePath, getMarkdownContent());
        setUnsavedDot(false);
      }
    }, 500);
  });

G3-2: Main process atomic write
  ipcMain.handle('file:save', async (event, filePath, content) => {
    const tempPath = filePath + '.tmp';
    await fs.promises.writeFile(tempPath, content, 'utf8');
    await fs.promises.rename(tempPath, filePath);  // Atomic
  });

G3-3: Ctrl+S manual save
  If file has path → save immediately (bypass debounce)
  If untitled → trigger Save As dialog

G3-4: Save on close
  Before window close → force save (don't wait for debounce)

G3-5: Unsaved dot indicator
  Title bar shows ● when content changed since last save
  Disappears after successful save
```

### TDD: Eval-Loop Tests

```
Test ID: E-SAVE-01  "Auto-save writes to disk after 500ms"
  Actions:
    1. Open temp file
    2. Type text
    3. Wait 700ms
    4. Read file from disk
  Heuristic: File content matches editor content

Test ID: E-SAVE-02  "Ctrl+S saves immediately"
  Actions: Open file, type text, Ctrl+S immediately, read disk
  Heuristic: File updated without 500ms waiting

Test ID: E-SAVE-03  "Unsaved dot appears and disappears"
  Actions:
    1. Open file
    2. Type text → check title bar for ●
    3. Wait for auto-save → check ● disappeared
  Heuristic: ● present after edit, absent after save

Test ID: E-SAVE-04  "Save on close"
  Actions: Open file, type text, close window, re-open, read file
  Heuristic: File contains the text typed before close

Test ID: E-SAVE-05  "Atomic write (no partial files)"
  Actions: Open file, type large content, save during write
  Heuristic: File is either old version or new version, never partial

Test ID: E-SAVE-06  "Content is clean markdown (no HTML artifacts)"
  Actions: Type heading + bold + list, save, read file
  Heuristic: File contains # Heading, **bold**, - item (no <span>, no ZWSP)
```

### Gate 3 Exit Criteria
```
□ E-SAVE-01..06 CLEAN
□ Auto-save works silently
□ Atomic write prevents partial file corruption
□ Unsaved indicator correct
□ Saved file is valid CommonMark markdown
```

---

## Gate 4: File Create & Save As

### Implementation Tasks

```
G4-1: Ctrl+N new file
  Auto-save current → clear editor → title bar "Untitled"
  Auto-save disabled (no path)

G4-2: Ctrl+Shift+S Save As
  dialog.showSaveDialog() → creates file at new path
  Title bar updates. Auto-save retargets.

G4-3: First save of untitled file
  Ctrl+S on untitled → triggers Save As dialog
```

### TDD: Eval-Loop Tests

```
Test ID: E-NEW-01  "Ctrl+N creates new untitled document"
  Actions: Open file, type text, Ctrl+N
  Heuristic: Editor empty, title bar "Untitled", old file saved on disk

Test ID: E-NEW-02  "Save As creates new file"
  Actions: Open file, Ctrl+Shift+S → pick new path
  Heuristic: New file exists, title bar updated, original preserved

Test ID: E-NEW-03  "Untitled Ctrl+S triggers Save As"
  Actions: Ctrl+N, type text, Ctrl+S → Save As dialog
  Heuristic: File created at chosen path, title bar updated
```

### Gate 4 Exit Criteria
```
□ E-NEW-01..03 CLEAN
□ Current file always saved before creating new
□ Save As preserves original
□ Untitled → Ctrl+S flows correctly to Save As
```

---

## Gate 5: Recent Files

### Implementation Tasks

```
G5-1: Track recently opened files
  Store last 10 file paths in settings JSON
  Update on every file open

G5-2: Show in Open dialog or menu
  Recent files list in file picker or app menu

G5-3: Handle moved/deleted recent files
  If path doesn't exist: show " (not found)" and offer to remove
```

### Gate 5 Exit Criteria
```
□ Recent files list persists across app restarts
□ Clicking recent file opens it
□ Missing files notified and removable
```

---

## Gate 6: File Watching

### Implementation Tasks

```
G6-1: fs.watch on current file
  Start watcher when file opens. Stop when switching.
  On change: compare modification time with last save time.
  If external: show notification bar.

G6-2: Notification bar UI
  Bar below title bar: "[name] was modified externally. [Reload] [Ignore]"
  Reload: re-read file, replace editor, reset undo
  Ignore: keep in-memory content, next auto-save overwrites

G6-3: File deleted externally
  Watcher fires error/rename event.
  Title bar: "filename.md (deleted)"
  Next auto-save recreates the file.

G6-4: Debounce watcher events
  Multiple rapid events (editors save in stages) → 500ms debounce
```

### TDD: Eval-Loop Tests

```
Test ID: E-WATCH-01  "External modification detected"
  Actions:
    1. Open file in app
    2. Write to the file from test (bypassing app)
    3. Wait for watcher event
    4. Capture: notification bar visible
  Heuristic:
    - Notification bar element exists in DOM
    - reload and Ignore buttons present

Test ID: E-WATCH-02  "Reload replaces editor content"
  Actions: External modification → click Reload
  Heuristic: Editor content matches new file content

Test ID: E-WATCH-03  "Ignore keeps editor content"
  Actions: External modification → click Ignore
  Heuristic: Editor content unchanged (in-memory version)

Test ID: E-WATCH-04  "File deleted externally"
  Actions: Delete file from disk while app has it open
  Heuristic: Title bar shows "(deleted)"
```

### Gate 6 Exit Criteria
```
□ E-WATCH-01..04 CLEAN
□ Watcher correctly distinguishes own saves from external changes
□ Notification bar is dismissible
□ Deleted files handled gracefully
```

---

## Gate 7: Error Handling

### Implementation Tasks

```
G7-1: Save failure handling
  fs.writeFile errors → notification + retry once
  ENOSPC (disk full), EACCES (permissions), EBUSY (locked)

G7-2: Read failure handling
  fs.readFile errors → alert + stay on current file

G7-3: Read-only file detection
  First save attempt fails → notification → disable auto-save
  User can Save As to writable location

G7-4: Settings corruption recovery
  JSON parse error → apply defaults, backup old file
```

### TDD: Eval-Loop Tests

```
Test ID: E-ERR-01  "Save fails — notification shown"
Test ID: E-ERR-02  "Read-only file — notification + Save As works"
Test ID: E-ERR-03  "Disk full — editor keeps working"
Test ID: E-ERR-04  "Settings corrupted — defaults applied"
```

### Gate 7 Exit Criteria
```
□ E-ERR-01..04 CLEAN
□ All error paths have visible notification
□ Editor remains functional after any error
□ Save retry works for transient failures
```

---

## Gate 8: Title Bar States

### Implementation Tasks

```
G8-1: Title bar text format
  Normal:     "filename.md — /path/"
  Unsaved:    "● filename.md — /path/"
  Untitled:   "Untitled — Markdown Focus Editor"
  Read-only:  "filename.md (read-only) — /path/"
  Deleted:    "filename.md (deleted)"

G8-2: Save notification toast
  Brief green notification on Ctrl+S: "Saved to /path/file.md"
```

### Gate 8 Exit Criteria
```
□ Title bar shows correct state for every scenario
□ Notification toast visible and auto-dismisses
```

---

## Gate 9: Window Lifecycle

### Implementation Tasks

```
G9-1: Save/restore window state
  On close: save { x, y, width, height, isMaximized } to settings
  On launch: restore from settings, or center 1200×800 if first launch

G9-2: Save/restore last file path
  On close: save currentFilePath to settings
  On launch: if file exists → open it. If not → empty + notification.

G9-3: Save/restore editor settings
  Theme, font size, focus mode → persisted in settings file
  Read on launch, apply before showing window
```

### Gate 9 Exit Criteria
```
□ Window position/size restored on re-launch
□ Last file opened on re-launch
□ Settings (theme, font, focus) restored
□ First-launch defaults applied when no settings exist
```

---

## Gate 10: Accessibility

### Same as Web Gate 6 plus:

```
G10-1: Custom title bar keyboard accessibility
  Alt+F4: close. Title bar buttons: Tab-focusable, aria-labeled.

G10-2: Native dialog accessibility
  OS file dialogs are natively accessible. No additional work.

G10-3: Notification bar keyboard accessible
  Tab to Reload/Ignore buttons. Enter to activate.
```

---

## Gate 11: Multi-Window Support

### Implementation Tasks

```
G11-1: Second instance handling
  app.requestSingleInstanceLock() → if false, send file to existing instance
  If second file requested: open in new window
  Each window tracks its own file path and state

G11-2: Independent auto-save per window
  Each window has its own debounce timer and file path

G11-3: Window state per window
  Each window saves its own size/position on close
  On re-launch: restore only the last focused window
```

### Gate 11 Exit Criteria
```
□ Two windows can edit two different files simultaneously
□ Each auto-saves independently
□ Closing one doesn't affect the other
□ No IPC conflicts between windows
```

---

## Gate 12: Final Integration & Regression

### Full Suite Run

```
Run ALL Electron tests:
  - E-SETUP, E-TB, E-OPEN, E-SAVE, E-NEW
  - E-WATCH, E-ERR, E-A11Y
  - Editor core tests (headings, lists, styles, paste)
    (reuse web eval-loop tests adapted for Electron launch)

Run ALL Web tests (regression):
  - Existing 132+ tests must still pass
  - Shared module changes must not break web

Convergence criteria:
  □ All Electron tests CLEAN
  □ All Web tests CLEAN (no regression)
  □ 3 consecutive clean runs on each platform
  □ Manual verification of all title bar states
  □ Manual verification of file watcher behavior
  □ Manual verification of auto-save timing
```

### Gate 12 Exit Criteria
```
□ Full Electron suite CLEAN × 3
□ Full Web suite CLEAN × 3  
□ Manual test: create file → save → close → reopen → content matches
□ Manual test: external change → notification → reload works
□ Manual test: disk full → notification → Save As → content saved
□ Manual test: read-only → notification → Save As elsewhere
□ Manual test: two windows → independent auto-save
□ Manual test: title bar states all correct
□ No regressions on either platform
```

---

## Eval-Loop Design for Electron

### Test Infrastructure

```javascript
// Electron eval-loop uses Playwright's _electron API
const { _electron: electron } = require('@playwright/test');

async function launchApp(fileArg) {
  const app = await electron.launch({
    args: ['electron/main.js', fileArg].filter(Boolean),
  });
  const window = await app.firstWindow();
  await window.waitForSelector('#editor');
  return { app, window };
}
```

### Snapshot Schema (Electron-specific additions)

```json
{
  "visual": {
    "blocks": [...],
    "titleBar": {
      "text": "● notes.md — ~/Documents/",
      "hasUnsavedDot": true,
      "theme": "dark"
    },
    "notificationBar": {
      "visible": false,
      "text": "",
      "hasReloadButton": false,
      "hasIgnoreButton": false
    }
  },
  "fileSystem": {
    "currentFilePath": "/Users/me/Documents/notes.md",
    "fileExists": true,
    "fileIsReadOnly": false,
    "fileSizeBytes": 1234,
    "lastModifiedMs": 1744358400000
  },
  "window": {
    "width": 1200,
    "height": 800,
    "isMaximized": false,
    "isFullscreen": false
  }
}
```

### Heuristic Checks (Electron-specific)

| Check | Code | Severity |
|-------|------|----------|
| Title bar text matches file state | `TITLE_BAR_MISMATCH` | critical |
| Unsaved dot present when content differs from disk | `UNSAVED_DOT_MISSING` | warning |
| File on disk matches editor after auto-save | `FILE_CONTENT_STALE` | critical |
| No ZWSP in saved file | `ZWSP_IN_FILE` | critical |
| No HTML tags in saved file | `HTML_IN_MARKDOWN_FILE` | critical |
| File watcher running for current file | `WATCHER_NOT_RUNNING` | warning |
| Notification bar visible on external change | `EXTERNAL_CHANGE_UNNOTIFIED` | critical |

### Fix Loop Protocol (Same as Web)

```
For each gate:
  1. Write eval-loop tests from spec scenarios
  2. Run → capture snapshots + anomaly reports
  3. Analyze: critical (must fix), warning (should fix), info (accept)
  4. Fix → re-run → repeat until CLEAN
  5. Regression check: run all existing tests
  6. Gate review → sign off → next gate
```
