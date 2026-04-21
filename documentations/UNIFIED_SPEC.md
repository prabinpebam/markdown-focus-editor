# Markdown Focus Editor - Unified Specification
**Version:** 2.0  
**Date:** 2025-12-22  
**Status:** Master Specification (Replaces: app-spec.md, tech-detail.md, files-storage-backup-spec.md)

---

## Table of Contents

1. [Product Vision & Purpose](#1-product-vision--purpose)
2. [Core Principles](#2-core-principles)
3. [User Experience Flow](#3-user-experience-flow)
4. [Feature Specifications](#4-feature-specifications)
5. [Technical Architecture](#5-technical-architecture)
6. [Implementation Guidelines](#6-implementation-guidelines)
7. [Testing & Quality](#7-testing--quality)

---

## 1. Product Vision & Purpose

### 1.1 What is Markdown Focus Editor?

A **distraction-free markdown editor** that helps writers maintain focus by highlighting only the current section being edited while dimming the rest. It combines the simplicity of plain text editing with smart markdown formatting and document management.

### 1.2 Target Users

- **Writers** creating long-form content (articles, blog posts, documentation)
- **Note-takers** who prefer markdown syntax
- **Developers** documenting their projects
- **Anyone** who needs focused, distraction-free writing

### 1.3 Core Value Proposition

**"Write one section at a time, without distraction."**

Unlike traditional editors that show everything at once, this editor keeps you focused on the current paragraph, sentence, or heading you're working on.

---

## 2. Core Principles

### 2.1 Design Principles

1. **Distraction-Free First:** Minimal UI, maximum canvas
2. **Progressive Disclosure:** Advanced features hidden until needed
3. **Keyboard-Friendly:** Everything accessible via keyboard
4. **Smart Defaults:** Works great out-of-the-box
5. **Local-First:** All data stored locally, works offline

### 2.2 Technical Principles

1. **Leverage Browser Defaults:** Use native contenteditable behavior wherever possible
2. **Minimal DOM Manipulation:** Only transform DOM when absolutely necessary
3. **Performance First:** No full re-renders for minor edits
4. **Fail Gracefully:** Degrade gracefully when features aren't available
5. **Keep It Simple:** Avoid creating fixes for fixes

---

## 3. User Experience Flow

### 3.1 First Launch

```
1. User opens app
   ↓
2. Full-screen editor with blinking cursor appears
   ↓
3. Toolbar activator (dot) visible in top-left
   ↓
4. User starts typing immediately
```

### 3.2 Typical Writing Session

```
1. User clicks toolbar activator or hovers
   ↓
2. Toolbar expands showing controls
   ↓
3. User can:
   - Open existing document
   - Adjust font size
   - Toggle theme
   - Enable focus mode
   ↓
4. User types markdown syntax
   ↓
5. Editor auto-converts to formatted elements
   ↓
6. Changes auto-save to localStorage
   ↓
7. User can export when done
```

### 3.3 Document Management Flow

```
1. User clicks "Open" button
   ↓
2. Modal shows all documents as thumbnails
   ↓
3. User can:
   - Click document to open
   - Hover to delete (with confirmation)
   - See storage usage
   - Import/export backup
   ↓
4. Selected document loads in editor
```

---

## 4. Feature Specifications

### 4.1 Editor Core

#### 4.1.1 Basic Editing

**Requirement:** Native contenteditable with markdown shortcuts

**Behavior:**
- Plain text editing with monospace font (Roboto Mono default)
- Cursor always visible
- Standard text selection (click, drag, double-click, triple-click)
- Standard clipboard (copy, cut, paste)

**Technical:**
- Use `contenteditable="true"` on main editor div
- Leverage browser's native undo/redo stack where possible
- Custom undo manager for DOM transformations

#### 4.1.2 Auto-Save

**Requirement:** Save content automatically without user intervention

**Behavior:**
- Save on every content change (debounced by 500ms)
- Visual indicator NOT required (transparent to user)
- Save to localStorage under key `lastContent`

**Technical:**
```javascript
// Save after user stops typing for 500ms
let saveTimeout;
editorEl.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        storage.saveSettings('lastContent', editorEl.innerHTML);
    }, 500);
});
```

**NOT REQUIRED:** Periodic save (e.g., every 30 seconds) - save-on-change is sufficient

---

### 4.2 Focus Mode

#### 4.2.1 Purpose

Help users concentrate on current sentence/paragraph by dimming everything else.

#### 4.2.2 Behavior

**Level 1 (MVP):** Line-based focus
- When focus mode is ON, current line is 100% opaque
- All other lines are dimmed to 30% opacity
- Dim level updates as cursor moves

**Level 2 (Future):** Sentence-based focus
- When focus mode is ON, current sentence is 100% opaque
- All other text is dimmed to 30% opacity
- Sentence boundaries: `.`, `!`, `?` followed by space or newline

**Level 3 (Future):** Section-based focus
- When focus mode is ON, current heading section is 100% opaque
- All other sections are dimmed
- Section: text from one heading to the next

#### 4.2.3 Controls

**Toggle Focus Mode:**
- Checkbox in toolbar (always visible)
- Keyboard shortcut: `Alt+L` (optional, nice-to-have)

**Adjust Dimming Level:** (Optional, future enhancement)
- `Alt+Shift+Up`: Make dimmed text MORE visible (increase opacity)
- `Alt+Shift+Down`: Make dimmed text LESS visible (decrease opacity)
- Range: 10% to 70% opacity for dimmed text
- Default: 30%

#### 4.2.4 Technical Implementation

**Current (MVP):**
```css
/* Use SVG mask for focus effect */
.editor-wrapper {
    mask-image: url(#focusMask);
}
```

**Alternative (Future):**
```javascript
// Apply opacity directly to non-focused lines
blocks.forEach(block => {
    if (block === currentBlock) {
        block.style.opacity = '1';
    } else {
        block.style.opacity = '0.3';
    }
});
```

#### 4.2.5 Persistence

- Focus mode state saved to localStorage
- Dimming level saved to localStorage
- Restored on next app launch

---

### 4.3 Markdown Formatting

#### 4.3.1 Headings

**Syntax:**
```
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

**Behavior:**
1. User types `# ` at start of line
2. Line instantly converts to `<h1>` element
3. Marker (`#`) becomes non-editable span
4. User continues typing heading text
5. Heading displays with specified typography scale

**Typography Scale:**
```
H1: 3.0× base font, bold, 2.0× margin-top
H2: 2.0× base font, bold, 1.5× margin-top
H3: 1.6× base font, bold, 1.2× margin-top
H4: 1.3× base font, bold, 1.0× margin-top
H5: 1.1× base font, bold, 0.8× margin-top
H6: 1.0× base font, bold, 0.6× margin-top
```

**Space Recognition:**
After `#` markers, accept these spaces:
- Regular space (U+0020)
- Non-breaking space (U+00A0)
- Zero-width space (U+200B)
- En space (U+2002)
- Em space (U+2003)
- Thin space (U+2009)

**Reversion:**
- If user deletes space after `#` marker → revert to plain `<div>`
- If user deletes `#` marker → revert to plain `<div>`

**DOM Structure:**
```html
<h1>
    <span class="heading-marker" contenteditable="false">#</span>
    ​<!-- ZWSP -->Heading text here
</h1>
```

**Visual Style:**
- Heading markers displayed in left margin (hanging indent)
- Or inline with slight gray color
- User preference via settings (future)

#### 4.3.2 Lists

**Unordered Lists:**
```
- Item 1
* Item 2
+ Item 3
```

**Ordered Lists:**
```
1. First item
2. Second item
3. Third item
```

**Behavior:**
1. User types `- ` at start of line
2. Line converts to `<ul><li>` structure
3. Marker removed from text
4. User types list item content
5. Pressing Enter creates new list item (browser default)
6. Pressing Backspace at empty item removes it (browser default)

**Nested Lists:**
- Press `Tab` in list item → indent (create nested list)
- Press `Shift+Tab` in list item → outdent (decrease nesting)
- Browser handles numbering for `<ol>` automatically

**Tab Key Behavior (Custom):**
```javascript
if (Tab pressed in LI) {
    preventDefault();
    if (previousSibling is LI) {
        Create nested UL/OL inside previousSibling
        Move current LI into that nested list
    } else if (previousSibling is UL/OL) {
        Move current LI into that list
    }
}
```

**Shift+Tab Behavior (Custom):**
See tech-detail.md for 7 cases - all must be handled for proper outdenting.

**DOM Structure:**
```html
<ul>
    <li>Parent item
        <ul>
            <li>Nested item 1</li>
            <li>Nested item 2</li>
        </ul>
    </li>
    <li>Another parent item</li>
</ul>
```

#### 4.3.3 Inline Styles

**Bold:**
- Markdown: `**text**` or `__text__`
- Shortcut: `Ctrl+B`
- Output: `**<b>text</b>**`
- Markers shown in editor

**Italic:**
- Markdown: `*text*` or `_text_`
- Shortcut: `Ctrl+I`
- Output: `*<i>text</i>*`
- Markers shown in editor

**Bold + Italic:**
- Markdown: `***text***` or `___text___`
- Output: `***<b><i>text</i></b>***`
- Markers shown in editor

**Strikethrough:**
- Markdown: `~~text~~`
- Shortcut: `Ctrl+Shift+S`
- Output: `~~<s>text</s>~~`
- Markers shown in editor

**Real-time Transformation:**
```
User types: **a
↓
Editor shows: **<b>a</b>**
(with cursor after 'a' inside <b> tag)
```

**Shortcut Behavior:**
```
No selection + Ctrl+B:
  → Insert **<b></b>** with cursor inside

Text selected + Ctrl+B:
  → Wrap with **<b>selected text</b>**
  → Keep text selected after wrapping
```

**ZWSP After Tags:**
```html
**<b>text</b>**​<!-- ZWSP here allows cursor to exit tag -->
```

#### 4.3.4 Inline Code (Future)

**Syntax:** `` `code` ``

**Behavior:**
1. User types `` `c ``
2. Converts to `` `<code>c</code>` ``
3. Monospace font, light background
4. Marker (`` ` ``) shown

**Not Yet Implemented:** Marked as future enhancement

#### 4.3.5 Blockquote (Future)

**Syntax:** `> text`

**Behavior:**
1. User types `> ` at line start
2. Converts to `<blockquote>`
3. Marker (`>`) becomes non-editable
4. Left border, indentation, italic font (styling)

**Not Yet Implemented:** Marked as future enhancement

#### 4.3.6 NOT Supported

These markdown features are explicitly OUT OF SCOPE:
- Code blocks (```)
- Horizontal rules (`---`)
- Links (`[text](url)`)
- Images (`![alt](url)`)
- Tables (`| ... |`)

**Reason:** Keep editor focused on writing text, not complex formatting.

**Future Consideration:** May add in later versions if user demand exists.

---

### 4.4 Paste Handling

#### 4.4.1 Plain Text Paste (Current)

**Behavior:**
- Strip all formatting
- Insert as plain text
- Convert line breaks to `<div>` elements

**Implementation:**
```javascript
handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // Insert as text nodes and divs
}
```

#### 4.4.2 HTML Paste (Future Enhancement)

**Behavior:**
1. Detect HTML in clipboard
2. Parse HTML structure
3. Convert to markdown equivalents:
   - `<h1>` → `# `
   - `<strong>`, `<b>` → `**text**`
   - `<em>`, `<i>` → `*text*`
   - `<ul>`, `<ol>` → list syntax
4. Strip all other tags
5. Insert converted content

**Use Cases:**
- Paste from Word
- Paste from Google Docs
- Paste from web pages
- Paste from emails

**Not Yet Implemented:** Current version only handles plain text.

---

### 4.5 Document Management

#### 4.5.1 Document Storage

**Data Structure:**
```json
{
    "id": "1640000000000-abc123def",
    "name": "Document title",
    "content": "<div>HTML content here</div>",
    "createdAt": "2025-12-22T12:00:00.000Z",
    "lastEdited": "2025-12-22T14:30:00.000Z"
}
```

**Storage:**
- localStorage key: `markdownFocusEditorDocs`
- Array of document objects
- Total size limit: 5MB (localStorage default)

**ID Generation:**
```javascript
function generateUniqueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

**Name Generation:**
- Auto-generate from first 100 characters of content
- Remove HTML tags for display
- Fallback: "Untitled Document"

#### 4.5.2 Document Modal

**Trigger:**
- Click "Open" button in toolbar
- Keyboard shortcut: `Ctrl+O`

**Layout:**
```
┌─────────────────────────────────────────┐
│ Open document                        × │ ← Header (sticky)
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐              │
│ │ Doc │ │ Doc │ │ Doc │              │ ← Grid (3 per row)
│ │  1  │ │  2  │ │  3  │              │
│ └─────┘ └─────┘ └─────┘              │
│                                         │
│ ┌─────┐ ┌─────┐                       │ ← Scrollable
│ │ Doc │ │ Doc │                       │
│ │  4  │ │  5  │                       │
│ └─────┘ └─────┘                       │
├─────────────────────────────────────────┤
│ Documents: 5                           │ ← Footer (sticky)
│ 45 KB used (0.9% of 5MB)              │
│ ████░░░░░░ [Export] [Import]          │
└─────────────────────────────────────────┘
```

**Document Thumbnail:**
```
┌───────────────────────┐
│ Document Title (bold) │ ← Title (1 line, ellipsis)
│ Last edited: 2h ago   │ ← Metadata
├───────────────────────┤
│ First few lines of... │ ← Preview (3-4 lines)
│ content go here with  │
│ ellipsis at the end...│
└───────────────────────┘
   ↑ Hover shows delete icon (×)
```

**Thumbnail Hover:**
- Delete icon (×) appears in top-right corner
- Click delete → confirmation dialog appears
- Confirm → document deleted from storage

**Grid Specifications:**
- 3 thumbnails per row (desktop)
- 2 per row (tablet)
- 1 per row (mobile)
- Fixed height thumbnails
- Responsive layout

#### 4.5.3 Storage Info (Footer)

**Display:**
- Total number of documents
- Storage used (KB or MB)
- Percentage of 5MB limit
- Progress bar visualization

**Example:**
```
Documents: 12
156 KB used (3.1% of 5MB)
████░░░░░░░░░░░░░░░░ 3.1%
```

#### 4.5.4 Export Backup

**Trigger:** Click "Export documents backup" button

**Behavior:**
1. Gather all documents from localStorage
2. Create JSON file
3. Filename: `MD-focus-editor-backup-YYYY-MM-DD-HH-mm-ss.json`
4. Download to user's computer

**File Format:**
```json
[
    {
        "id": "...",
        "name": "...",
        "content": "...",
        "createdAt": "...",
        "lastEdited": "..."
    },
    // ... more documents
]
```

#### 4.5.5 Import Backup

**Triggers:**
- Click "Import backup" button → file picker
- Drag & drop JSON file onto modal

**Behavior:**

**Step 1: Parse & Categorize**
```javascript
const importedDocs = JSON.parse(fileContent);
const currentDocs = documentStore.getDocuments();

const newDocs = []; // No ID conflict
const conflicts = []; // Same ID exists

importedDocs.forEach(doc => {
    if (currentDocs.find(d => d.id === doc.id)) {
        conflicts.push(doc);
    } else {
        newDocs.push(doc);
    }
});
```

**Step 2: Add New Docs**
- Add all non-conflicting docs to storage immediately
- Show with **orangish-yellow border** (#FFA500)
- Border persists until modal closed or new import

**Step 3: Resolve Conflicts**

For each conflicting document:

```
┌───────────────────────────┐
│ Document Title            │ ← Red border (#CC0000)
│ Last edited: 2h ago       │
├───────────────────────────┤
│ ┌───────────────────────┐ │ ← Overlay
│ │ Keep current: 2h ago  │ │ ← Button
│ │ Keep imported: 5h ago │ │ ← Button
│ └───────────────────────┘ │
└───────────────────────────┘
```

**Floating Toolbar (appears during import):**
```
┌─────────────────────────────────────────┐
│ Imported: 15 | Conflicts: 3             │
│ [Keep all imported] [Discard all]       │
└─────────────────────────────────────────┘
```
Position: Sticky, above footer

**Resolution:**
- Click "Keep current" → use existing doc, border → yellow
- Click "Keep imported" → replace with imported, border → yellow
- Click "Keep all imported" → bulk replace all conflicts
- Click "Discard all" → bulk keep all current docs

**Step 4: Finalize**
- Save resolved documents to storage
- Clear import state
- Remove colored borders when modal closes

**Not Yet Implemented:** Conflict resolution UI is partially complete.

---

### 4.6 User Interface

#### 4.6.1 Color Schemes

**Light Theme:**
```css
--bg-color: #f5f5f5;
--text-color: #1a1a1a;
--toolbar-bg: rgba(255, 255, 255, 0.95);
--border-color: #ddd;
```

**Dark Theme:**
```css
--bg-color: #1a1a1a;
--text-color: #e0e0e0;
--toolbar-bg: rgba(30, 30, 30, 0.95);
--border-color: #444;
```

**Persistence:**
- Save theme choice to localStorage
- Restore on app launch

#### 4.6.2 Toolbar

**Position:** Top-left corner, fixed

**States:**
1. **Collapsed:** Just activator dot visible
2. **Expanded:** All buttons visible

**Activator:**
- Small circular dot (8px diameter)
- Pulse animation on first launch
- Click or hover to expand

**Expanded Toolbar:**
```
┌────────────────────────────────────┐
│ ⚪ 📄 📁 💾 A⁺ A⁻ 🌙 ⛶  ◯──────○  │
└────────────────────────────────────┘
   ↑   ↑  ↑  ↑  ↑  ↑  ↑  ↑     ↑
  Dot New Open Save + - Theme FS Focus
```

**Buttons:**
- New Document (📄)
- Open (📁)
- Save (💾)
- Increase Font (A⁺)
- Decrease Font (A⁻)
- Toggle Theme (🌙/☀️)
- Fullscreen (⛶)
- Focus Mode (iOS-style toggle)

**Behavior:**
- Click anywhere outside → collapse
- Click toolbar → expand (if collapsed)
- Semi-transparent background with blur

**NOT in Toolbar:**
- Font family picker (future: modal)
- Word count (future: status bar)
- Settings (future: modal)

#### 4.6.3 Font Size

**Range:** 8px to 48px (base font size)

**Controls:**
- Increase: Click A⁺ button or `Ctrl+Plus`
- Decrease: Click A⁻ button or `Ctrl+Minus`
- Reset: `Ctrl+0`

**Increment:** 2px per click

**Persistence:** Save to localStorage

**Affects:**
- Base text size
- Heading sizes (multiplied by scale)
- Line height (auto-adjust)

#### 4.6.4 Font Family (Future)

**Default:** Roboto Mono (loaded via Google Fonts)

**Future Options:**
- Roboto Mono
- Source Code Pro
- JetBrains Mono
- Courier New
- Monaco
- Consolas

**Selection:** Modal with font samples

**Not Yet Implemented:** Font selection partially built but incomplete.

---

### 4.7 Keyboard Shortcuts

#### 4.7.1 File Operations

```
Ctrl+N          New Document
Ctrl+O          Open Document Modal
Ctrl+S          Save/Export Document
Ctrl+Shift+S    Save As (future)
```

#### 4.7.2 Editing

```
Ctrl+B          Bold
Ctrl+I          Italic
Ctrl+Shift+S    Strikethrough
Ctrl+Z          Undo
Ctrl+Shift+Z    Redo
Ctrl+Y          Redo (alternative)
```

#### 4.7.3 Navigation

```
Alt+Up          Previous Section (heading)
Alt+Down        Next Section (heading)
Ctrl+F          Find (browser default)
```

#### 4.7.4 View

```
Ctrl+Shift+L    Toggle Theme
Ctrl+Plus       Zoom In (increase font)
Ctrl+Minus      Zoom Out (decrease font)
Ctrl+0          Reset Zoom
F11             Toggle Fullscreen
```

#### 4.7.5 Focus Mode

```
Alt+L               Toggle Focus Mode (future)
Alt+Shift+Up        Decrease Dimming (future)
Alt+Shift+Down      Increase Dimming (future)
```

**Note:** Future shortcuts marked as optional enhancements.

#### 4.7.6 Lists

```
Tab             Indent List Item (in list)
Shift+Tab       Outdent List Item (in list)
Enter           New List Item (browser default)
Backspace       Delete List Item (browser default)
```

---

### 4.8 Features NOT Included

These features are explicitly out of scope:

#### Will NOT Implement:
- ❌ Real-time collaboration
- ❌ Cloud sync
- ❌ Version control / git integration
- ❌ Plugin system
- ❌ Custom themes (beyond light/dark)
- ❌ Mobile app (web-only)
- ❌ Rich media (images, videos, embeds)
- ❌ Advanced markdown (tables, footnotes, etc.)
- ❌ Printing
- ❌ Email export
- ❌ Social sharing

#### May Consider (Future):
- ⚠️ Command Palette (`Ctrl+Shift+P`)
- ⚠️ Outline/TOC panel
- ⚠️ Export to HTML
- ⚠️ Export to PDF
- ⚠️ Spell check (custom)
- ⚠️ Word count display
- ⚠️ Recent files quick access
- ⚠️ Inline code & blockquote
- ⚠️ Presentation mode

---

## 5. Technical Architecture

### 5.1 Technology Stack

**Frontend:**
- HTML5
- CSS3 (no preprocessor)
- Vanilla JavaScript (ES6+)
- No frameworks (React, Vue, etc.)

**Storage:**
- localStorage (browser)
- No backend server
- No database

**Build:**
- No build step required
- Simple file serving
- Optional: minification for production

### 5.2 File Structure

```
markdown-focus-editor/
├── index.html                 # Main HTML file
├── js/
│   ├── app.js                # Main app initialization
│   └── modules/
│       ├── editor.js         # Core editor logic
│       ├── headingManager.js # Heading transformations
│       ├── listManager.js    # List operations
│       ├── inlineStyleManager.js # Inline styles
│       ├── focusMode.js      # Focus mode logic
│       ├── undoManager.js    # Undo/redo system
│       ├── documentStore.js  # Document CRUD
│       ├── modalManager.js   # Document modal
│       ├── fileManager.js    # File I/O
│       ├── storage.js        # localStorage wrapper
│       ├── toolbar.js        # Toolbar controls
│       └── theme.js          # Theme switching
├── style/
│   └── main.css             # All styles
├── images/
│   └── *.svg                # Icon files
└── documentations/
    └── UNIFIED_SPEC.md      # This file
```

### 5.3 Module Responsibilities

**editor.js** - Central coordinator
- Manages contenteditable element
- Dispatches events to specialized managers
- Handles caret positioning
- Coordinates paste, undo, etc.

**headingManager.js** - Heading transformations
- Detect heading syntax (`# `, `## `, etc.)
- Transform DIV → H1-H6
- Revert broken headings
- Manage heading markers

**listManager.js** - List operations
- Detect list syntax (`-`, `1.`)
- Transform DIV → UL/OL
- Handle Tab/Shift+Tab indenting
- Manage nested structures

**inlineStyleManager.js** - Inline styling
- Detect style syntax (`**`, `*`, `~~`)
- Apply real-time transformations
- Handle Ctrl+B/I/S shortcuts
- Insert ZWSP after tags

**focusMode.js** - Focus highlighting
- Calculate current line/sentence/section
- Update SVG mask or opacity
- Handle focus mode toggle
- Persist focus state

**undoManager.js** - Custom undo/redo
- Track editor state changes
- Implement undo stack
- Implement redo stack
- Integrate with browser undo where possible

**documentStore.js** - Data layer
- CRUD operations for documents
- ID generation
- Storage size calculation
- Import/export logic

**modalManager.js** - Document modal UI
- Render document grid
- Handle thumbnail clicks
- Manage import/export UI
- Conflict resolution (future)

**fileManager.js** - File I/O
- Read files from disk
- Write files to disk
- Drag & drop handling
- File picker integration

**storage.js** - localStorage abstraction
- Get/set settings
- Get/set documents
- Handle quota errors
- Clear storage

**toolbar.js** - Toolbar UI
- Show/hide toolbar
- Button click handlers
- Keyboard shortcut routing

**theme.js** - Theme switching
- Toggle light/dark
- Apply CSS classes
- Persist choice

### 5.4 Event Flow

**Example: User types `# ` (heading)**

```
1. User presses space after #
   ↓
2. 'input' event fires on editor
   ↓
3. editor.handleInputFormatting() called
   ↓
4. Determines which block changed
   ↓
5. Calls headingManager.tryTransformToHeading()
   ↓
6. Regex matches "# "
   ↓
7. Transform DIV → H1 (one-time DOM render)
   ↓
8. Calculate new caret position
   ↓
9. Restore caret in H1 element
   ↓
10. undoManager.recordChange()
    ↓
11. storage.saveSettings('lastContent', ...)
```

**Example: User presses Tab in list**

```
1. User presses Tab key
   ↓
2. 'keydown' event fires
   ↓
3. editor.handleKeyDown() detects Tab
   ↓
4. Checks if caret is in LI element
   ↓
5. preventDefault() to stop tab navigation
   ↓
6. Calls listManager.handleTab(listItem)
   ↓
7. Finds previous sibling
   ↓
8. Creates or finds nested UL/OL
   ↓
9. Moves LI into nested list (DOM render)
   ↓
10. Calculates new caret position
    ↓
11. Restores caret
    ↓
12. undoManager.recordChange()
```

### 5.5 State Management

**No global state object.** Each module manages its own state.

**Shared via:**
- Editor element reference
- localStorage for persistence
- Module exports/imports

**Example:**
```javascript
// editor.js
export default {
    editorEl: null,
    undoManager: null,
    focusMode: null,
    // ...
}

// app.js
import editor from './modules/editor.js';
import undoManager from './modules/undoManager.js';

undoManager.init(editor);
editor.undoManager = undoManager; // Share reference
```

---

## 6. Implementation Guidelines

### 6.1 DOM Transformation Rules

**Rule 1: Transform only when necessary**
```javascript
// ❌ BAD: Re-render on every keystroke
editorEl.addEventListener('input', () => {
    rerenderEntireEditor();
});

// ✅ GOOD: Transform only on syntax match
editorEl.addEventListener('input', () => {
    if (syntaxMatches(currentBlock)) {
        transformBlock(currentBlock);
    }
});
```

**Rule 2: One-time transformations**
```javascript
// ❌ BAD: Transform every time
if (text.startsWith('# ')) {
    convertToHeading(); // Runs repeatedly
}

// ✅ GOOD: Transform once
if (block.tagName === 'DIV' && text.startsWith('# ')) {
    convertToHeading(); // Only when still a DIV
}
```

**Rule 3: Preserve browser behavior**
```javascript
// ❌ BAD: Custom Enter handling everywhere
editorEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        // Custom logic for all cases
    }
});

// ✅ GOOD: Custom handling only where needed
editorEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inSpecialContext()) {
        e.preventDefault();
        // Custom logic only for this context
    }
    // Otherwise, browser handles it
});
```

### 6.2 Caret Management

**Always restore caret after DOM transformation:**

```javascript
function transformHeading(block) {
    // 1. Capture current caret position
    const caretPos = getAbsoluteCaretPosition();
    
    // 2. Transform DOM
    const h1 = document.createElement('h1');
    // ... build h1 structure
    block.replaceWith(h1);
    
    // 3. Restore caret
    restoreCaret(caretPos);
}
```

**Absolute caret position calculation:**
```javascript
function getAbsoluteCaretPosition() {
    // Count characters from start of editor
    // to current caret position
    let offset = 0;
    for (const block of editorBlocks) {
        if (block === currentBlock) {
            offset += caretOffsetInBlock;
            break;
        }
        offset += block.textContent.length + 1; // +1 for line break
    }
    return offset;
}
```

### 6.3 Performance Optimization

**Debounce expensive operations:**
```javascript
let saveTimeout;
editorEl.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        storage.saveSettings('lastContent', editorEl.innerHTML);
    }, 500); // Wait 500ms after user stops typing
});
```

**Use event delegation where possible:**
```javascript
// ❌ BAD: Multiple listeners
thumbnails.forEach(thumb => {
    thumb.addEventListener('click', handleClick);
});

// ✅ GOOD: Single listener on parent
grid.addEventListener('click', (e) => {
    if (e.target.matches('.thumbnail')) {
        handleClick(e.target);
    }
});
```

**Minimize DOM queries:**
```javascript
// ❌ BAD: Query every time
function updateEditor() {
    const editor = document.getElementById('editor');
    editor.textContent = newContent;
}

// ✅ GOOD: Cache reference
const editorEl = document.getElementById('editor');
function updateEditor() {
    editorEl.textContent = newContent;
}
```

### 6.4 Error Handling

**Graceful degradation:**
```javascript
function enableFocusMode() {
    try {
        if (!('maskImage' in document.body.style)) {
            // Fallback: use opacity instead
            useFallbackFocusMode();
            return;
        }
        // Use SVG mask
        applyMaskFocusMode();
    } catch (err) {
        console.error('Focus mode failed:', err);
        // Disable focus mode gracefully
        disableFocusMode();
    }
}
```

**localStorage quota handling:**
```javascript
function saveDocument(doc) {
    try {
        localStorage.setItem(key, JSON.stringify(doc));
    } catch (err) {
        if (err.name === 'QuotaExceededError') {
            alert('Storage full. Please delete old documents or export a backup.');
        } else {
            console.error('Save failed:', err);
        }
    }
}
```

### 6.5 Browser Compatibility

**Target browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required features:**
- contenteditable
- localStorage
- ES6 modules
- CSS Grid
- Flexbox
- SVG masks (with fallback)

**Not required:**
- IE11 support
- Very old browsers

**Feature detection:**
```javascript
if ('maskImage' in document.body.style) {
    // Use mask-based focus mode
} else {
    // Use opacity-based fallback
}
```

---

## 7. Testing & Quality

### 7.1 Manual Testing Checklist

**Before each release, test:**

**Basic Editing:**
- [ ] Can type plain text
- [ ] Can select text (click, drag, double-click, triple-click)
- [ ] Can copy/paste
- [ ] Can undo/redo (Ctrl+Z, Ctrl+Y)

**Headings:**
- [ ] Type `# ` → converts to H1
- [ ] Type `## ` → converts to H2
- [ ] Type `### ` → converts to H3
- [ ] Delete space after # → reverts to DIV
- [ ] Caret position correct after conversion

**Lists:**
- [ ] Type `- ` → converts to UL
- [ ] Type `1. ` → converts to OL
- [ ] Press Enter in list → creates new item
- [ ] Press Tab in list → indents
- [ ] Press Shift+Tab in list → outdents
- [ ] Backspace at empty item → removes item

**Inline Styles:**
- [ ] Type `**a` → converts to bold
- [ ] Type `*a` → converts to italic
- [ ] Type `~~a` → converts to strikethrough
- [ ] Ctrl+B with selection → wraps in bold
- [ ] Ctrl+I with selection → wraps in italic

**Focus Mode:**
- [ ] Toggle focus mode → current line highlighted
- [ ] Move cursor → highlight updates
- [ ] Disable focus mode → all text visible

**Documents:**
- [ ] Open document modal
- [ ] Click document → loads
- [ ] Delete document → prompts confirmation
- [ ] Export backup → downloads JSON
- [ ] Import backup → adds documents

**Persistence:**
- [ ] Content saved after typing
- [ ] Theme persists across reload
- [ ] Font size persists across reload
- [ ] Focus mode state persists across reload

**Keyboard Shortcuts:**
- [ ] Ctrl+N → new document
- [ ] Ctrl+O → open modal
- [ ] Ctrl+S → save/export
- [ ] Ctrl+B → bold
- [ ] Ctrl+I → italic
- [ ] Ctrl+Z → undo
- [ ] F11 → fullscreen

### 7.2 Edge Cases to Test

**Heading edge cases:**
- Multiple headings in a row
- Heading at end of document
- Delete marker from middle of heading
- Paste into heading
- Undo heading creation

**List edge cases:**
- Tab at first item (no previous sibling)
- Shift+Tab at top-level single item
- Shift+Tab in middle of nested list
- Backspace at first character of list item
- Paste into list item

**Inline style edge cases:**
- Bold text at start of document
- Bold text at end of document
- Overlapping styles (bold inside italic)
- Delete marker from styled text
- Copy/paste styled text

**General edge cases:**
- Empty document
- Very long document (100+ lines)
- Document with only whitespace
- Rapid typing
- Rapid undo/redo
- localStorage quota exceeded

### 7.3 Automated Testing (Future)

**Unit tests for:**
- Regex patterns (heading, list detection)
- Caret position calculations
- Document ID generation
- Storage size calculations

**Integration tests for:**
- Heading transformation flow
- List indentation flow
- Inline style application flow
- Undo/redo flow

**E2E tests for:**
- Full user workflows
- Multi-document management
- Import/export cycle

**Not currently implemented.** Add when app is stable.

---

## Appendices

### Appendix A: Changelog from Original Specs

**Changes from app-spec.md:**
1. Clarified focus mode: line-level (MVP), sentence-level (future)
2. Removed vague "sentence with caret" → specified line-based implementation
3. Added ZWSP requirements for inline styles
4. Specified that Save downloads to disk (not just localStorage)
5. Clarified toolbar behavior (dot activator, not hamburger icon)

**Changes from tech-detail.md:**
1. Organized format specifications clearly
2. Added explicit "NOT Supported" section
3. Clarified one-time DOM transformations
4. Added detailed Tab/Shift+Tab specifications
5. Removed ambiguous inline code/blockquote (marked as future)

**Changes from files-storage-backup-spec.md:**
1. Added complete import/export workflow
2. Specified conflict resolution UI in detail
3. Added storage size calculation formulas
4. Clarified thumbnail layout specifications
5. Added "Import md doc" button clarification

**New in Unified Spec:**
1. Product vision and purpose
2. Core principles (design + technical)
3. User experience flows
4. Explicit "NOT included" features
5. Technical architecture overview
6. Implementation guidelines
7. Testing checklist

### Appendix B: Glossary

**Terms used in this spec:**

- **Block:** Block-level element (DIV, H1-H6, UL, OL, etc.)
- **Inline:** Inline-level element (B, I, S, CODE, etc.)
- **Transform:** Convert one element type to another (e.g., DIV → H1)
- **Revert:** Convert back to plain DIV
- **Marker:** Non-editable visual indicator (e.g., `#` for headings)
- **ZWSP:** Zero-width space character (U+200B)
- **Caret:** Text cursor position
- **Focus:** Current line/sentence being edited (in focus mode context)
- **Dim:** Reduce opacity to de-emphasize content

### Appendix C: Design Decisions

**Why contenteditable?**
- Native browser support
- No need for custom rendering
- Works with screen readers
- Browser undo/redo mostly works
- Standard clipboard integration

**Why localStorage?**
- No server needed
- Works offline
- Simple API
- Instant save/load
- Privacy-friendly (local-only)

**Why vanilla JS?**
- No dependencies
- Fast startup
- Small bundle size
- Easy to understand
- No build step needed

**Why line-based focus (not sentence)?**
- Simpler to implement
- More predictable behavior
- Better performance
- Sentence detection is complex (abbreviations, etc.)
- Can upgrade to sentence-based later

**Why no cloud sync?**
- Keep app simple
- Privacy-focused
- Avoid server costs
- Avoid account system
- User controls their data

### Appendix D: Future Roadmap

**Version 1.0 (Current):**
- Core editing
- Headings (H1-H6)
- Lists (UL/OL)
- Inline styles (bold, italic, strikethrough)
- Focus mode (line-based)
- Document management
- Import/export

**Version 1.1 (Next):**
- Inline code support
- Blockquote support
- Enhanced paste (HTML conversion)
- Conflict resolution UI
- Word count display
- Recent files list

**Version 1.2:**
- Sentence-based focus mode
- Adjustable dimming level
- Keyboard shortcuts for focus mode
- Font family picker
- Command palette

**Version 2.0:**
- Outline/TOC panel
- Export to HTML
- Export to PDF
- Presentation mode
- Advanced keyboard shortcuts

**No timeline set.** Implement based on user feedback and demand.

---

## Document Status

**Version:** 2.0  
**Date:** 2025-12-22  
**Status:** **APPROVED - Master Specification**

**This document supersedes:**
- app-spec.md
- tech-detail.md
- files-storage-backup-spec.md

**Use this specification for:**
- All new development
- Gap analysis
- Feature planning
- Implementation guidance
- Testing checklists

**Update this document when:**
- New features are designed
- Architecture changes
- User requirements change
- Implementation reveals issues

**Maintained by:** Development team  
**Review cycle:** Quarterly or as needed

---

**END OF SPECIFICATION**
