# Taskflows — Exhaustive Catalog

> **Version**: 1.0  
> **Date**: April 11, 2026  
> **Scope**: Every user-observable interaction path in the Markdown Focus Editor, documented step-by-step with expected system behavior, edge cases, and cross-feature interactions.  
> **Used by**: [Evaluation Loop Framework](eval-loop-framework.md) (Step 1: DEFINE)

---

## How to Read This Document

Each taskflow (TF-N) is a step-by-step user action sequence with:
- **EXPECTED**: What the user should see after the action.
- **EDGE**: Edge cases and browser-specific behavior.
- **CURRENT BEHAVIOR**: Where actual behavior differs from ideal (known gaps).

Taskflows are grouped by feature area. Cross-feature interactions are in Section L.

---

## A. Core Editing

### TF-1: Basic Typing & Cursor

```
Step 1: User clicks the editor area.
  EXPECTED: Cursor blinks inside the editor. Editor element is focused.
  The toolbar auto-collapses if it was expanded.

Step 2: User types plain text characters.
  EXPECTED: Characters appear at the cursor position. No DOM transformation.
  Text is inside a <div> block (browser default for contenteditable).
  Focus mode updates the highlight to the current visual line (if enabled).
  Content is auto-saved to the current document in localStorage.

Step 3: User presses Enter in the middle of text.
  EXPECTED: The current block splits into two <div> blocks at the cursor.
  Cursor moves to the start of the new (second) block.
  Focus mode highlight moves to the new line.
  EDGE: Enter at end of block → creates empty <div> below with <br> placeholder.

Step 4: User presses Enter at the end of a block.
  EXPECTED: A new empty <div> with a <br> is created below.
  Cursor is in the new block.

Step 5: User presses Backspace at the start of a block (not the first block).
  EXPECTED: Current block merges with the previous block. Cursor is at the join point.
  Browser default behavior handles the merge.

Step 6: User presses Backspace at the start of the first block.
  EXPECTED: Nothing happens. The first block cannot merge further.

Step 7: User presses Delete at the end of a block (not the last block).
  EXPECTED: Next block merges into the current block. Cursor stays at original position.

Step 8: User uses arrow keys (Up/Down/Left/Right) to navigate.
  EXPECTED: Cursor moves. Focus mode highlight tracks to the new visual line.
  No DOM transformation occurs.

Step 9: User presses Home / End.
  EXPECTED: Cursor jumps to start/end of the current visual line.
  Focus mode highlight stays on the same line (position unchanged).

Step 10: User presses Ctrl+A (select all).
  EXPECTED: All editor content is selected. Selection flag is set.
  No DOM transformation. Focus mode may dim all or highlight selection.
```

### TF-2: Text Selection

```
Step 1: User click-drags to select text within a single block.
  EXPECTED: Text is highlighted. Selection spans the dragged range.
  isSelecting flag is set during drag, cleared on mouseup.

Step 2: User click-drags across multiple blocks.
  EXPECTED: Multi-block selection is highlighted. Browser default behavior.

Step 3: User double-clicks a word.
  EXPECTED: The entire word is selected (browser default).
  No DOM transformation.

Step 4: User triple-clicks a line.
  EXPECTED: The entire block/paragraph is selected (browser default).

Step 5: User holds Shift + clicks to extend selection.
  EXPECTED: Selection extends from current cursor to click point.

Step 6: User holds Shift + arrow keys.
  EXPECTED: Selection extends character-by-character or line-by-line.
  isSelecting flag is set.

Step 7: User presses Delete or Backspace with text selected.
  EXPECTED: Selected text is deleted. Cursor is at the deletion point.
  If selection spans multiple blocks, blocks merge.
```

---

## B. Block Transformations

### TF-3: Heading Creation (All Levels)

```
Step 1: User types "# " (hash + space) at the start of an empty <div>.
  EXPECTED: The <div> transforms into an <h1>.
  A non-editable <span class="heading-marker" contenteditable="false">#</span> appears.
  The marker is positioned absolutely to the left (hanging marker, left: -8ch).
  A ZWSP (\u200B) is prepended to the text node after the marker.
  The cursor is positioned after the ZWSP, inside the heading text.
  Undo state is recorded with operationType 'createH1'.

Step 2: User types "## " at the start of an empty <div>.
  EXPECTED: Transforms to <h2>. Marker shows "##". Same structural rules as Step 1.

Step 3: User types "### " → <h3>, "#### " → <h4>, "##### " → <h5>, "###### " → <h6>.
  EXPECTED: Each level creates the correct heading tag with matching marker text.
  Marker hash count matches heading level exactly.

Step 4: User types "####### " (7 or more hashes).
  EXPECTED: No heading transformation. Content stays as plain text in a <div>.
  The hashes remain as literal text characters.

Step 5: User types "# " at the start of a <div> that already has text content.
  EXPECTED: The <div> transforms to <h1>. Existing text follows the marker + ZWSP.
  Cursor position is recalculated: offset = original position minus marker length minus 1.

Step 6: User types heading syntax with non-breaking space (U+00A0) instead of regular space.
  EXPECTED: Still triggers heading transformation. The editor supports:
  regular space, non-breaking space (U+00A0), zero-width space (U+200B),
  en space (U+2002), em space (U+2003), thin space (U+2009).

Step 7: User types heading syntax in the middle of existing text (not at block start).
  EXPECTED: No transformation. "# " only triggers when at position 0 of the block.
```

### TF-4: Heading Reversion

```
Step 1: User positions cursor right after the heading marker's ZWSP and presses Backspace.
  EXPECTED: The ZWSP is deleted. The heading detects structural breakage.
  The <hX> reverts to a <div>. The marker span is removed.
  The hash characters and remaining text appear as plain text in the <div>.
  Cursor position is preserved relative to the visible text.
  Undo state is recorded with operationType 'revertH#'.

Step 2: Heading marker span is somehow removed or corrupted (e.g., by paste, undo glitch).
  EXPECTED: checkAndRevertBrokenHeadings() detects the heading has no text node after marker,
  or has only an orphaned <br>. The heading reverts to a <div>.

Step 3: User deletes all text inside a heading (content becomes empty, only marker + ZWSP remain).
  EXPECTED: Heading persists with empty text. Does NOT revert.
  The heading only reverts if the ZWSP itself is deleted.

Step 4: User undoes a heading creation (Ctrl+Z after typing "# text").
  EXPECTED: The editor restores the prior state — a <div> with the original typed text.
  The heading marker span no longer exists.
```

### TF-5: Heading Content Editing

```
Step 1: User continues typing inside a heading after the ZWSP.
  EXPECTED: Text appears normally. No re-render. No flicker.
  The heading tag, marker, and ZWSP all remain intact. Browser default behavior.

Step 2: User clicks inside a heading to reposition cursor.
  EXPECTED: Cursor lands in the text node (after ZWSP). Never inside the marker span.
  Focus mode highlight moves to this line.

Step 3: User selects text within a heading and applies inline style (Ctrl+B).
  EXPECTED: Selected text is wrapped in **<b>text</b>** within the heading.
  The heading structure (marker, tag, ZWSP) is preserved.

Step 4: User presses Enter in the middle of a heading.
  EXPECTED: Browser splits the heading into two blocks.
  The first block keeps the heading tag and marker.
  The second block becomes a new <div> (browser default).
  EDGE: The second block should NOT be a heading — headings don't auto-continue.

Step 5: User presses Enter at the end of a heading.
  EXPECTED: A new empty <div> is created below the heading. Cursor moves to it.
```

### TF-6: Unordered List Creation

```
Step 1: User types "- " (dash + space) at the start of a <div>.
  EXPECTED: The <div> transforms into <ul><li>remaining-text</li></ul>.
  The "- " marker text is stripped from the content.
  Cursor is positioned inside the <li>, at the corresponding text offset.
  Undo state is recorded with operationType 'createULList'.

Step 2: User types "* " (asterisk + space) at the start of a <div>.
  EXPECTED: Same as Step 1 — transforms to <ul><li>...</li></ul>.

Step 3: User types "+ " (plus + space) at the start of a <div>.
  EXPECTED: Same as Step 1 — transforms to <ul><li>...</li></ul>.

Step 4: User types "- " with existing text content after it.
  EXPECTED: The text after "- " becomes the <li> content.
  Example: typing "- buy milk" in a <div> → <ul><li>buy milk</li></ul>.
```

### TF-7: Ordered List Creation

```
Step 1: User types "1. " (digit + dot + space) at the start of a <div>.
  EXPECTED: The <div> transforms into <ol><li>remaining-text</li></ol>.
  The "1. " marker is stripped. Cursor in <li>.
  Undo state recorded with operationType 'createOLList'.

Step 2: User types "42. " (multi-digit number) at the start of a <div>.
  EXPECTED: Same transformation. Any digit sequence followed by ". " triggers OL creation.

Step 3: User types "1." without a trailing space.
  EXPECTED: No transformation. The space after the dot is required.
```

### TF-8: List Item Creation (Enter Key in Lists)

```
Step 1: User presses Enter inside a list item with text.
  EXPECTED: Browser creates a new <li> below. Text after cursor moves to new <li>.
  Browser default behavior. No custom DOM manipulation.

Step 2: User presses Enter on an empty list item (last item in list).
  EXPECTED: Browser default — may create another empty <li> or exit the list.
  Behavior is browser-specific (Chrome vs Firefox differ here).

Step 3: User presses Enter in a nested list item.
  EXPECTED: New <li> is created at the same nesting level.
  The nested list structure is preserved.
```

### TF-9: List Indentation (Tab Key)

```
Step 1: User presses Tab on a list item that has a previous sibling <li>.
  EXPECTED: The current <li> moves inside the previous sibling as a nested sub-list.
  If the previous <li> already has a sub-list → append to it.
  If not → create a new <ul>/<ol> inside the previous <li>, append current <li>.
  List type is preserved (UL stays UL, OL stays OL).
  Cursor is restored to the same position within the moved <li>.
  Undo state is recorded.

Step 2: User presses Tab on the first list item (no previous sibling).
  EXPECTED: Nothing happens. Cannot indent without a parent sibling to nest under.

Step 3: User presses Tab on an already-nested list item.
  EXPECTED: Further nesting occurs (if previous sibling exists at current level).
  Multi-level nesting is supported.

Step 4: User presses Tab on a list item that has its own nested sub-list.
  EXPECTED: The item AND its children move together into the previous sibling's sub-list.

Step 5: User presses Tab on a list item followed by sibling items.
  EXPECTED: Only the current item indents. Following siblings remain at their level.
  Following siblings are re-attached to maintain list structure.
```

### TF-10: List Outdentation (Shift+Tab Key)

```
Step 1: User presses Shift+Tab on a nested list item (parent is <li>).
  EXPECTED: The <li> moves out one level — placed after the parent <li>.
  If following siblings exist at the nested level → they form a new sub-list under the outdented item.
  If the original nested list is now empty → it is removed.
  Cursor restored. Undo state recorded.

Step 2: User presses Shift+Tab on a nested list item (parent is <ul>/<ol>, not <li>).
  EXPECTED: The <li> is placed before or after the parent list as a sibling.
  Position depends on whether it was first/last item.
  Similar handling for following siblings and empty list cleanup.

Step 3: User presses Shift+Tab on a top-level list item that is the ONLY item.
  EXPECTED: The <li> converts to a <div> with the item's text content.
  The entire <ul>/<ol> wrapper is removed (it had only one item).
  Cursor is inside the new <div>.

Step 4: User presses Shift+Tab on a top-level list item that is the FIRST item (siblings exist).
  EXPECTED: The <li> is removed from the list and placed as a <div> BEFORE the list.
  Remaining items stay in the list.

Step 5: User presses Shift+Tab on a top-level list item that is the LAST item (siblings exist).
  EXPECTED: The <li> is removed from the list and placed as a <div> AFTER the list.
  Remaining items stay in the list.

Step 6: User presses Shift+Tab on a top-level list item in the MIDDLE (siblings before and after).
  EXPECTED: The list splits into two lists. The <li> becomes a <div> between them.
  EDGE: This is the most complex case. The implementation may be incomplete.
```

### TF-11: List Deletion (Backspace in Lists)

```
Step 1: User presses Backspace at the start of a list item (not first item).
  EXPECTED: Browser default — merges with previous <li>.

Step 2: User presses Backspace at the start of the first <li> in a top-level list.
  EXPECTED: Browser default behavior. May merge with block above the list,
  or convert the <li> to a block outside the list.
  EDGE: Browser behavior varies — Chrome and Firefox differ significantly here.

Step 3: User deletes all text in a list item, then presses Backspace.
  EXPECTED: The empty <li> is removed. Cursor moves to previous <li> or block.
```

---

## C. Inline Styling

### TF-12: Bold via Markdown Syntax

```
Step 1: User types "**" followed by a non-space character (e.g., "**h").
  EXPECTED: Immediately transforms:
  Text before cursor: **
  Creates: **<b>h</b>**\u200B
  Cursor is positioned inside <b>, after "h".
  The markdown markers ** are visible flanking the <b> element.

Step 2: User continues typing inside the <b> element.
  EXPECTED: Characters appear inside <b>. The styled region grows.
  Example: typing "ello" → **<b>hello</b>**\u200B

Step 3: User moves cursor past the ZWSP after the styled element and types.
  EXPECTED: New characters appear OUTSIDE the <b> element. They are unstyled.
  The ZWSP acts as a cursor escape boundary.

Step 4: User types "**" immediately after a space (not preceded by another *).
  EXPECTED: No transformation yet — waits for the next non-space character.

Step 5: User types "** " (double star + space).
  EXPECTED: No transformation. The space prevents the trigger.
```

### TF-13: Italic via Markdown Syntax

```
Step 1: User types "*" followed by a non-space character (e.g., "*h").
  EXPECTED: Detects single-star italic pattern (not double-star bold).
  Transforms to: *<i>h</i>*\u200B
  Cursor inside <i>, after "h".

Step 2: User types inside an existing <i> element.
  EXPECTED: Text appears inside <i> as expected. Markers remain.

Step 3: User types "*" when NOT preceded by another "*" and followed by a space.
  EXPECTED: No transformation. Space after the character prevents trigger.
```

### TF-14: Bold-Italic via Markdown Syntax

```
Step 1: User types "***" followed by a non-space character (e.g., "***h").
  EXPECTED: Triple-star pattern detected (takes precedence over double and single).
  Transforms to: ***<b><i>h</i></b>***\u200B
  Cursor inside the innermost element (<i>), after "h".

Step 2: User continues typing inside the bold-italic element.
  EXPECTED: Characters appear inside both <b> and <i>. Both styles visible.
```

### TF-15: Strikethrough via Markdown Syntax

```
Step 1: User types "~~" followed by a non-space character (e.g., "~~h").
  EXPECTED: Transforms to: ~~<s>h</s>~~\u200B
  Cursor inside <s>, after "h".

Step 2: User continues typing inside <s>.
  EXPECTED: Text appears with strikethrough styling. Markers remain flanking the element.
```

### TF-16: Bold via Keyboard Shortcut (Ctrl+B)

```
Step 1: User selects text and presses Ctrl+B.
  EXPECTED: Selected text is wrapped in **<b>selected text</b>**\u200B.
  The text remains selected after the operation.
  Leading/trailing whitespace in the selection is excluded from the <b> wrapping.

Step 2: User presses Ctrl+B with no selection (cursor in plain text).
  EXPECTED: **<b></b>**\u200B is created at cursor position.
  Cursor is placed inside the empty <b> element, ready for typing.

Step 3: User presses Ctrl+B with cursor inside an existing <b> element.
  EXPECTED: Browser default toggle behavior — may remove the <b> wrapper.

Step 4: User selects text that spans across multiple blocks and presses Ctrl+B.
  EXPECTED: Browser's default execCommand behavior. Each block's selected portion gets <b>.
```

### TF-17: Italic via Keyboard Shortcut (Ctrl+I)

```
Step 1: User selects text and presses Ctrl+I.
  EXPECTED: Selected text wrapped in *<i>selected text</i>*\u200B.
  Whitespace trimming applied. Selection retained.

Step 2: User presses Ctrl+I with no selection.
  EXPECTED: *<i></i>*\u200B created at cursor. Cursor inside <i>.
```

### TF-18: Strikethrough via Keyboard Shortcut (Ctrl+Shift+S)

```
Step 1: User selects text and presses Ctrl+Shift+S.
  EXPECTED: Selected text wrapped in ~~<s>selected text</s>~~\u200B.
  Selection retained.

Step 2: User presses Ctrl+Shift+S with no selection.
  EXPECTED: ~~<s></s>~~\u200B created at cursor. Cursor inside <s>.
```

### TF-19: Inline Style Break-Out

```
Step 1: User is typing inside a <b> element and types "**" + character.
  EXPECTED: The <b> element is closed. A NEW <b> element is created AFTER the current one.
  The new character goes into the new <b> element. This prevents infinite nesting.

Step 2: User is inside <i> and types "*" + character at the boundary.
  EXPECTED: Same break-out behavior — <i> closes, new <i> created after.

Step 3: User is inside <s> and types "~~" + character.
  EXPECTED: Same break-out behavior for strikethrough.

Step 4: User moves cursor past the ZWSP after any styled element and types a plain character.
  EXPECTED: Character is unstyled. No re-entry into the previous styled element.
```

---

## D. Focus Mode

### TF-20: Focus Mode Toggle

```
Step 1: User clicks the focus toggle switch (currently OFF, grey).
  EXPECTED: Toggle turns ON (blue). SVG mask is applied to .editor-wrapper.
  The mask dims all lines except the one containing the cursor.
  mask-image CSS property is set on .editor-wrapper (with url(#focusMask)).
  focusEnabled is saved as 'true' in localStorage.

Step 2: User clicks the focus toggle switch (currently ON, blue).
  EXPECTED: Toggle turns OFF (grey). SVG mask is removed.
  All text returns to full opacity. mask-image is removed or set to 'none'.
  focusEnabled saved as 'false' in localStorage.

Step 3: User reloads the page.
  EXPECTED: Focus mode state is restored from localStorage.
  If it was ON, the mask is re-applied on load.
```

### TF-21: Focus Line Tracking — Cursor Movement

```
Step 1: User clicks a different line in the editor.
  EXPECTED: Focus highlight SVG rect (#focus-line) moves to the new visual line.
  The rect's Y position matches the line's Y coordinate.
  The rect's height matches the line height.
  The rect's width spans the full viewport.

Step 2: User uses arrow keys (Up/Down) to move between lines.
  EXPECTED: Focus line tracks on keyup. Updates after the cursor has moved.

Step 3: User uses Home/End keys.
  EXPECTED: Focus line stays on the same line (cursor moved horizontally, not vertically).

Step 4: User uses Ctrl+Home / Ctrl+End.
  EXPECTED: Focus line jumps to the first/last visual line in the document.
```

### TF-22: Focus Line Tracking — Content Changes

```
Step 1: User types text that causes a line wrap (text exceeds editor width).
  EXPECTED: Focus line updates to the new visual line where the cursor now is.
  The mask adjusts to the new line geometry.

Step 2: User presses Enter (creates new line).
  EXPECTED: Focus line moves to the new block's visual line.

Step 3: User deletes text that causes a line unwrap (text contracts to previous line).
  EXPECTED: Focus line updates to the current cursor position on the shorter line.

Step 4: User changes font size (increase/decrease).
  EXPECTED: Line heights change. Focus line recalculates to match new geometry.
  ResizeObserver triggers updated mask dimensions.
```

### TF-23: Focus Mode with Headings and Lists

```
Step 1: User clicks inside a heading with focus mode ON.
  EXPECTED: Focus line highlights the heading's visual line(s).
  The heading marker span is skipped during text node traversal.

Step 2: User clicks inside a list item.
  EXPECTED: Focus line highlights the <li>'s visual line, not the entire list.

Step 3: User is in a multi-line paragraph (long text that wraps).
  EXPECTED: Only the VISUAL line containing the cursor is highlighted, not the entire block.
  The character-level Y-position sampling correctly identifies sub-block visual lines.
```

### TF-24: Focus Mode with Window Resize

```
Step 1: User resizes the browser window with focus mode ON.
  EXPECTED: ResizeObserver fires. SVG mask dimensions update.
  Focus line rect width adjusts to new viewport width.
  Line wrapping may change — focus line re-targets the cursor's new visual line.

Step 2: User enters fullscreen mode with focus mode ON.
  EXPECTED: Same as Step 1 — mask dimensions update to fullscreen viewport.

Step 3: User exits fullscreen.
  EXPECTED: Mask dimensions revert to windowed viewport size.
```

---

## E. Toolbar & App Controls

### TF-25: Toolbar Activation

```
Step 1: User hovers over the toolbar dot (small red dot at top center).
  EXPECTED: The dot grows (width/height expand from 10px to 30px via CSS transition).

Step 2: User clicks the toolbar dot.
  EXPECTED: The dot morphs into an expanded toolbar bar.
  CSS class .is-toolbar-active is added.
  Buttons fade in (opacity 0→1, scale 0.9→1, transition-delay 0.15s).
  The red dot shrinks to 0 and becomes invisible.

Step 3: User clicks anywhere outside the toolbar while it's expanded.
  EXPECTED: Toolbar collapses back to dot state.
  .is-toolbar-active is removed. Buttons fade out. Dot reappears.

Step 4: User clicks a button inside the toolbar.
  EXPECTED: The button action fires. The toolbar does NOT auto-collapse
  (it stays expanded until the user clicks outside).
```

### TF-26: Font Size Controls

```
Step 1: User clicks the increase font button (A+).
  EXPECTED: Base font size increases by 2px.
  CSS variable --base-font updates. All text, headings, and margins scale.
  New font size saved to localStorage as 'fontSize'.

Step 2: User clicks the decrease font button (A-).
  EXPECTED: Base font size decreases by 2px.
  Minimum is 8px — clicking at 8px does nothing.

Step 3: User clicks increase font past maximum (48px).
  EXPECTED: Nothing happens at 48px. Font size is clamped.

Step 4: User reloads the page.
  EXPECTED: Font size is restored from localStorage.
```

### TF-27: Fullscreen Toggle

```
Step 1: User clicks the fullscreen button.
  EXPECTED: Browser enters fullscreen mode (document.documentElement.requestFullscreen).
  The editor fills the entire screen.

Step 2: User clicks the fullscreen button again (or presses Esc).
  EXPECTED: Browser exits fullscreen. Window returns to normal size.

Step 3: Browser/OS prevents fullscreen (e.g., iframe sandbox, permissions).
  EXPECTED: Error is logged to console. No crash. Editor continues working normally.
```

---

## F. Document Management

### TF-28: Save (Existing Document)

```
Step 1: User presses Ctrl+S with a currentDocId set.
  EXPECTED: documentStore.updateDocument() updates the document's content and lastEdited.
  A green notification appears briefly ("Document saved!" or similar).
  The notification auto-dismisses after ~3 seconds.

Step 2: User clicks the save button in the toolbar.
  EXPECTED: Same as Ctrl+S.

Step 3: Auto-save triggers (on content change via storage.saveSettings('lastContent', html)).
  EXPECTED: Current document is silently updated in localStorage.
  No notification for auto-save.
```

### TF-29: Save As (New Document or Rename)

```
Step 1: User presses Ctrl+Shift+S.
  EXPECTED: A prompt dialog asks for a new document name.
  If confirmed: a NEW document is created with the current content.
  currentDocId switches to the new document.
  Save notification shown.

Step 2: User presses Ctrl+S but no currentDocId exists (fresh page, deleted doc).
  EXPECTED: Falls through to save-as behavior — prompts for a name.

Step 3: User cancels the prompt.
  EXPECTED: No save occurs. No state changes.
```

### TF-30: New Document

```
Step 1: User presses Ctrl+N.
  EXPECTED: A prompt asks for the document name.
  If confirmed: a new empty document is created via documentStore.createNewDocument().
  Editor content is cleared. Undo history is cleared.
  currentDocId is set to the new document.
  Initial undo state is recorded.

Step 2: User has unsaved changes when pressing Ctrl+N.
  EXPECTED: The current document's content is auto-saved before clearing.
  (Current behavior: auto-save fires on every content change, so latest content is saved.)

Step 3: User cancels the name prompt.
  EXPECTED: Nothing happens. Current document stays loaded.
```

### TF-31: Open Document Modal

```
Step 1: User presses Ctrl+O or clicks the Open Document toolbar button.
  EXPECTED: The document modal opens with:
  - A lightbox overlay (50% opacity, covers the page body).
  - The modal header: "Open document" with a close button (×).
  - A grid of document thumbnails (3 per row).
  - A footer with: doc count, storage usage bar, export/import buttons.

Step 2: Modal opens with zero documents.
  EXPECTED: Grid shows a "No documents yet" placeholder message.

Step 3: Modal opens with multiple documents.
  EXPECTED: Each thumbnail shows:
  - Document title (bold, single line, ellipsis on overflow).
  - Last edited date/time as subtext.
  - First ~200 chars of content as body preview.
  - On hover: a red delete (×) button appears on the top-right corner.

Step 4: User scrolls the modal content.
  EXPECTED: The header is sticky. Thumbnails scroll within the modal body.
  The footer is visible at the bottom.
```

### TF-32: Load Document from Modal

```
Step 1: User clicks a document thumbnail in the modal.
  EXPECTED: The document's content loads into the editor.
  currentDocId is set to the selected document.
  Undo history is cleared. Initial state recorded.
  The modal closes.
  Focus mode updates to the new content.

Step 2: User clicks the close button (×) or presses Escape.
  EXPECTED: Modal closes. No document change. Editor retains current content.

Step 3: User clicks the modal overlay (outside the modal body).
  EXPECTED: Modal closes. Same as pressing Escape.
```

### TF-33: Delete Document

```
Step 1: User hovers over a document thumbnail in the modal.
  EXPECTED: A delete button (×) appears on the thumbnail's top-right corner.
  The button has a semi-transparent red background.

Step 2: User clicks the delete button.
  EXPECTED: A browser confirm dialog appears:
  "Are you sure you want to delete '[doc name]'? This cannot be undone."

Step 3: User confirms deletion.
  EXPECTED: The document is removed from localStorage.
  The thumbnail disappears from the grid.
  Storage usage updates in the footer.
  If the deleted document was the currently loaded document:
  - currentDocId is cleared.
  - The editor may need to load a different document or show empty state.

Step 4: User cancels deletion.
  EXPECTED: Nothing happens. Document and thumbnail remain.
```

---

## G. Import & Export

### TF-34: Export Documents Backup

```
Step 1: User clicks "Export documents backup" button in the modal footer.
  EXPECTED: A JSON file downloads automatically.
  Filename format: "MD-focus-editor-backup-{ISO-timestamp}.json"
  The file contains all documents as a JSON array with 2-space indentation.
  The download URL is revoked after use (memory cleanup).

Step 2: User clicks export with zero documents.
  EXPECTED: Alert: "No documents to export" (or similar).
  No file is downloaded.
```

### TF-35: Import JSON Backup

```
Step 1: User clicks "Import backup" button in the modal footer.
  EXPECTED: The OS native file picker opens, filtered to .json files.

Step 2: User selects a valid JSON backup file.
  EXPECTED: File is parsed. Documents are processed:
  - Documents with unique IDs (no conflict) → added immediately to the store.
    Shown in the grid with an orange-yellow (#FFA500-ish) border.
  - Documents with conflicting IDs (same ID as existing doc) → shown with a dark red border.
    Each conflicting thumbnail has an overlay with two buttons:
    "Keep current: [timestamp]" and "Keep imported: [timestamp]".
  - A floating toolbar appears above the footer showing:
    "Docs imported: N" | "Conflicting: M" | "Keep all" / "Discard all" buttons.

Step 3: User resolves a conflict by clicking "Keep current" on a conflicting doc.
  EXPECTED: The imported version is discarded. The existing document is kept.
  The red border changes to orange-yellow border. Conflict count decreases.

Step 4: User resolves a conflict by clicking "Keep imported" on a conflicting doc.
  EXPECTED: The existing document is replaced with the imported version.
  The red border changes to orange-yellow. Conflict count decreases.

Step 5: User clicks "Keep all" in the floating toolbar.
  EXPECTED: All conflicting documents are resolved by keeping the imported versions.
  All red borders become orange-yellow.

Step 6: User clicks "Discard all" in the floating toolbar.
  EXPECTED: All conflicting documents are resolved by keeping the current versions.
  All red borders become orange-yellow.

Step 7: User selects an invalid file (not valid JSON).
  EXPECTED: Alert: "Invalid backup file format" (or similar). No state changes.

Step 8: User cancels the file picker.
  EXPECTED: Nothing happens.

Step 9: Orange-yellow borders on newly imported docs are cleared when:
  - The modal is closed, OR
  - A new import is initiated, OR
  - An export is initiated.
```

### TF-36: Import Markdown File

```
Step 1: User clicks "Import md doc" button in the modal footer.
  EXPECTED: OS file picker opens, filtered to .md, .txt, .html files.

Step 2: User selects a .md or .txt file.
  EXPECTED: A new document is created with:
  - Name: filename without extension.
  - Content: file text content.
  The grid refreshes showing the new document with an orange-yellow border.
  Alert: 'Document "[name]" imported successfully!'

Step 3: User selects an .html file.
  EXPECTED: Same as Step 2 — HTML file is imported as-is.

Step 4: User cancels the file picker.
  EXPECTED: Nothing happens.
```

### TF-37: Drag-and-Drop File Import (Editor)

```
Step 1: User drags a .md or .txt file onto the editor area.
  EXPECTED: The file is read as text.
  A new document is created in the store with the file content.
  Editor content is replaced with the imported file.
  currentDocId switches to the new document.
  Undo history cleared, initial state recorded.
  Alert: 'Document "[name]" imported from dropped file and is now active'

Step 2: User drags a non-markdown file onto the editor area.
  EXPECTED: Alert: "Please drop backup files onto the Open Document modal"
  No content change.

Step 3: User drags a file over the editor area (without dropping).
  EXPECTED: Browser default dragover is prevented (allows drop).
  No visual feedback (no drop zone highlight — not implemented).
```

---

## H. Paste Handling

### TF-38: Paste Plain Text

```
Step 1: User copies plain text and pastes into the editor (Ctrl+V).
  EXPECTED: Text appears at cursor position. Newlines produce new <div> blocks.
  No formatting applied beyond line splitting.

Step 2: User pastes text mid-sentence.
  EXPECTED: Text is inserted inline at cursor. The current block's content grows.
  If paste contains newlines, the block splits.

Step 3: User pastes with text selected.
  EXPECTED: Selected text is replaced by pasted text.
```

### TF-39: Paste HTML from External Source

```
Step 1: User copies formatted text from a web page (with styles, colors, fonts) and pastes.
  EXPECTED: The paste manager intercepts the event (preventDefault).
  HTML content is extracted from clipboard.
  HTML → Markdown conversion: htmlToMarkdown().
  Markdown → Editor HTML conversion: markdownToEditorHtml().
  Only allowed elements survive: headings (h1–h6), lists (ul/ol/li), paragraphs (div),
  inline styles (b/i/s/strong/em).
  All external CSS, classes, font-family, color, background are stripped.
  No <script>, <style>, <iframe>, <img> tags survive.
  Content is inserted at cursor position.

Step 2: User pastes from Google Docs.
  EXPECTED: Same pipeline. Google Docs uses complex spans with inline styles →
  all stripped to plain formatting.

Step 3: User pastes from Microsoft Word.
  EXPECTED: Same pipeline. Word's MsoNormal classes and conditional comments → stripped.

Step 4: User pastes from another Markdown editor.
  EXPECTED: If the clipboard has Markdown syntax, it's detected and converted to
  editor-native formatting.
```

### TF-40: Paste Inline Markdown

```
Step 1: User pastes "**bold text**" (plain text with Markdown bold syntax).
  EXPECTED: Markdown is detected. Converted to: <b>bold text</b>\u200B
  The text appears bold in the editor.

Step 2: User pastes "*italic text*".
  EXPECTED: Converted to: <i>italic text</i>\u200B

Step 3: User pastes "~~strikethrough~~".
  EXPECTED: Converted to: <s>strikethrough</s>\u200B

Step 4: User pastes "***bold-italic***".
  EXPECTED: Converted to: <b><i>bold-italic</i></b>\u200B

Step 5: User pastes mixed inline: "normal **bold** and *italic*".
  EXPECTED: Each pattern is converted independently.
  Result: normal <b>bold</b>\u200B and <i>italic</i>\u200B
```

### TF-41: Paste Block-Level Markdown

```
Step 1: User pastes "# Heading\n\nParagraph text\n\n- List item 1\n- List item 2".
  EXPECTED: containsMarkdownSyntax() returns true.
  markdownToEditorHtml() converts to:
  - <h1> with heading marker span
  - <div> with paragraph text
  - <ul> with two <li> elements

Step 2: User pastes a multi-level nested list:
  "- Item 1\n  - Sub item 1.1\n  - Sub item 1.2\n- Item 2"
  EXPECTED: Nested list structure with indentation levels detected
  by leading space count. <ul> with nested <ul> children.
```

### TF-42: Paste Security

```
Step 1: User pastes HTML containing <script>alert('xss')</script>.
  EXPECTED: The script tag is stripped during the HTML→MD→HTML pipeline.
  No script execution. No <script> element in the editor DOM.

Step 2: User pastes HTML with onerror, onclick, or other event handler attributes.
  EXPECTED: All event handler attributes are stripped. No JavaScript execution.

Step 3: User pastes HTML with <iframe>, <embed>, <object>.
  EXPECTED: These elements are stripped. Only text content inside them (if any) survives.
```

---

## I. Undo & Redo

### TF-43: Undo Basic Edits

```
Step 1: User types text, then presses Ctrl+Z.
  EXPECTED: The last edit is undone. Editor shows content from one state ago.
  Cursor is restored to the position recorded at that state.

Step 2: User presses Ctrl+Z multiple times consecutively.
  EXPECTED: Each press moves one step back in the undo stack.
  Oldest state is retained (up to 50 states). Beyond 50, oldest is dropped.

Step 3: User presses Ctrl+Z at the initial state (nothing more to undo).
  EXPECTED: Nothing happens. Editor stays at the initial recorded state.
```

### TF-44: Undo Block Transformations

```
Step 1: User creates a heading ("# Title"), then presses Ctrl+Z.
  EXPECTED: The heading reverts. Editor shows the pre-transformation state
  (a <div> with "# Title" as plain text, or whatever the prior state was).

Step 2: User creates a list ("- item"), then presses Ctrl+Z.
  EXPECTED: The list reverts to a <div> with the original text.

Step 3: User indents a list item (Tab), then presses Ctrl+Z.
  EXPECTED: The indentation is undone. The list item returns to its previous level.
```

### TF-45: Redo

```
Step 1: User undoes several actions, then presses Ctrl+Y.
  EXPECTED: The editor moves forward one state. Content and cursor are restored.

Step 2: User presses Ctrl+Shift+Z (alternative redo shortcut).
  EXPECTED: Same as Ctrl+Y — moves forward one state.

Step 3: User presses Ctrl+Y at the latest state (nothing to redo).
  EXPECTED: Nothing happens.
```

### TF-46: Undo/Redo Stack Management

```
Step 1: User undoes to a middle state, then types new content.
  EXPECTED: The redo stack (all states after current index) is discarded.
  The new content becomes the latest state. Redo is no longer available.

Step 2: User performs 60 edits (exceeds the 50-state limit).
  EXPECTED: The oldest 10 states are silently dropped.
  Undo can go back at most 50 states from the current position.

Step 3: Identical consecutive states.
  EXPECTED: If the innerHTML after an edit is identical to the current top of the stack,
  the duplicate state is NOT pushed. Prevents wasted undo slots.

Step 4: New document creation (Ctrl+N) or document switch.
  EXPECTED: Undo history is cleared. Initial state of the new document is recorded.
  No undo back to the previous document's content.
```

---

## J. Theme & Appearance

### TF-47: Theme Toggle (Light→Dark→Light)

```
Step 1: User clicks the theme toggle button (currently light theme).
  EXPECTED: body gets class 'dark-theme', 'light-theme' is removed.
  Background changes to #1a1a1a. Text color changes to #e0e0e0.
  Theme toggle icon switches to light-theme.svg (sun icon).
  CSS variables update: --text-color, --text-color-intense, --text-dim-color.
  localStorage 'theme' is set to 'dark'.

Step 2: User clicks the theme toggle again (currently dark theme).
  EXPECTED: body gets class 'light-theme', 'dark-theme' is removed.
  Background changes to #f5f5f5. Text color changes to #333.
  Icon switches to dark-theme.svg (moon icon).
  localStorage 'theme' set to 'light'.

Step 3: User rapidly clicks the toggle multiple times.
  EXPECTED: Debounce flag (isCurrentlyToggling) prevents re-entrancy.
  Only one toggle fires per ~100ms. No visual glitching.
```

### TF-48: Theme Persistence and Consistency

```
Step 1: User sets dark theme, then reloads the page.
  EXPECTED: Dark theme is restored from localStorage.
  All elements (body, toolbar, modal, editor, font modal) render in dark theme.

Step 2: User opens the document modal in dark theme.
  EXPECTED: Modal background is dark (#2a2a2a). Text is light (#e0e0e0).
  Font list buttons have dark background (#3a3a3a).
  Toolbar inside modal also adapts.

Step 3: User opens the font modal in dark theme.
  EXPECTED: Font modal content area is dark. Close button matches theme.

Step 4: Focus mode in dark theme.
  EXPECTED: Focus line background-color uses dark-theme-appropriate value.
  Dimmed lines use dark theme text-dim-color.
```

### TF-49: Font Size Persistence

```
Step 1: User increases font size to 24px, then reloads.
  EXPECTED: Font size is restored from localStorage.
  --base-font is set to 24px. All text scales accordingly.
  Heading sizes scale as multiples of base font.

Step 2: User decreases font to minimum (8px).
  EXPECTED: Text is very small but readable. Further decrease does nothing.

Step 3: User increases font to maximum (48px).
  EXPECTED: Text is very large. Further increase does nothing.
```

---

## K. Settings Persistence & Page Load

### TF-50: First-Time Load (No localStorage Data)

```
Step 1: User opens the editor for the first time (clean localStorage).
  EXPECTED: A default document is created: "My First Document".
  Editor shows the default content (or empty state).
  Theme defaults to light.
  Font size defaults to 16px.
  Focus mode defaults to enabled (checked).
  currentDocId is set to the new default document.

Step 2: Focus toggle is checked by default.
  EXPECTED: Focus mode is active. SVG mask is applied.
```

### TF-51: Return Visit (Existing localStorage Data)

```
Step 1: User opens the editor with existing documents and settings.
  EXPECTED: The app loads and restores:
  - Theme (light or dark)
  - Font size
  - Font family (if set)
  - Focus mode state
  - The document identified by currentDocId

Step 2: currentDocId refers to a document that was deleted (stale reference).
  EXPECTED: The app silently falls back to the most recently edited document.
  If no documents exist, a default document is created.

Step 3: currentDocId is null or missing.
  EXPECTED: The app loads the most recently edited document (sorted by lastEdited).

Step 4: Legacy fallback — 'lastContent' key exists but no documents.
  EXPECTED: The app creates a default document using the lastContent value.
  This handles migration from an older version of the app.
```

---

## L. Cross-Feature Interactions

### TF-52: Heading + Inline Style

```
Step 1: User creates a heading ("# Title"), then types "**bold**" inside it.
  EXPECTED: Bold element is created inside the heading. Heading structure preserved.
  The heading tag, marker, and ZWSP are unaffected.

Step 2: User selects heading text and presses Ctrl+B.
  EXPECTED: Selected text is bolded within the heading. Marker is not selected/affected.
```

### TF-53: List + Inline Style

```
Step 1: User types "**bold**" inside a list item.
  EXPECTED: Bold element created inside <li>. List structure preserved.

Step 2: User indents (Tab) a list item that contains bold text.
  EXPECTED: The bold text moves with the <li>. No formatting is lost.
```

### TF-54: Focus Mode + Block Transformations

```
Step 1: User types "# Heading" with focus mode ON.
  EXPECTED: The heading is created. Focus line immediately updates to the heading's line.
  No flicker where the focus is on the old div position.

Step 2: User presses Tab to indent a list item with focus mode ON.
  EXPECTED: The item indents. Focus line updates to the new position of the text.
  MutationObserver triggers mask dimension recalculation.
```

### TF-55: Undo + Focus Mode

```
Step 1: User creates a heading, then undoes (Ctrl+Z), with focus mode ON.
  EXPECTED: Heading reverts to div. Focus line updates to the cursor's new visual line.
  The focus mask correctly reflects the post-undo DOM.
```

### TF-56: Paste + Undo

```
Step 1: User pastes formatted content, then presses Ctrl+Z.
  EXPECTED: The paste is undone. Editor shows content before the paste.
  The pasted content disappears completely.
```

### TF-57: Theme + Focus Mode

```
Step 1: User toggles theme while focus mode is ON.
  EXPECTED: Focus mode dimming adjusts to theme colors.
  Dark theme: dimmed text uses dark-theme text-dim-color.
  Light theme: dimmed text uses light-theme text-dim-color.
  Focus line background-color CSS changes per theme.
```

### TF-58: Document Switch + Undo

```
Step 1: User edits Document A, switches to Document B (via modal), then presses Ctrl+Z.
  EXPECTED: Undo applies to Document B's history (which was just initialized).
  Document A's undo history was discarded when the switch happened.
  Ctrl+Z does nothing (or goes to initial state of B).
```

### TF-59: Save + Storage Full

```
Step 1: User fills localStorage close to 5MB limit, then edits and saves.
  EXPECTED: If localStorage.setItem throws QuotaExceededError, ideally the user sees feedback.
  CURRENT BEHAVIOR: Silent fail — no error handling. (This is a known gap.)
```

### TF-60: Rapid Editing Sequences

```
Step 1: User rapidly types "# Heading" + Enter + "- list" + Enter + "**bold**".
  EXPECTED: All transformations fire correctly in sequence.
  No race conditions between heading creation → list creation → inline styling.
  Each transformation records its own undo state.
  Focus mode tracks each line change without visually lagging.
```

---

## Summary

| Category | Taskflows | Count |
|----------|-----------|-------|
| A. Core Editing | TF-1 – TF-2 | 2 |
| B. Block Transformations | TF-3 – TF-11 | 9 |
| C. Inline Styling | TF-12 – TF-19 | 8 |
| D. Focus Mode | TF-20 – TF-24 | 5 |
| E. Toolbar & App Controls | TF-25 – TF-27 | 3 |
| F. Document Management | TF-28 – TF-33 | 6 |
| G. Import & Export | TF-34 – TF-37 | 4 |
| H. Paste Handling | TF-38 – TF-42 | 5 |
| I. Undo & Redo | TF-43 – TF-46 | 4 |
| J. Theme & Appearance | TF-47 – TF-49 | 3 |
| K. Settings & Page Load | TF-50 – TF-51 | 2 |
| L. Cross-Feature Interactions | TF-52 – TF-60 | 9 |
| **Total** | | **60** |
