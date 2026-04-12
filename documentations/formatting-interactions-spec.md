# Markdown Formatting Interactions — Exhaustive Specification

> **Version**: 1.0  
> **Date**: April 12, 2026  
> **Purpose**: Exhaustive enumeration of every possible way a markdown-formatted element can be created, edited, modified, or destroyed in the editor. This is the test matrix for verifying that every interaction path produces correct behavior.  
> **Scope**: Every formatted element type × every mutation method × every caret position × every content state.

---

## How to Read This Document

Each section covers one formatted element type. Within each:
- **C-N**: Creation path N
- **E-N**: Edit/content modification path N
- **M-N**: Format modification path N (changing the formatting itself)
- **D-N**: Deletion/destruction path N
- **X-N**: Edge case / cross-interaction N

For each interaction:
- **Action**: What the user does (atomic input)
- **Precondition**: What must be true before the action
- **Expected**: What the user should see after
- **DOM**: What the DOM should look like after

---

## 1. HEADINGS (H1–H6)

### DOM Structure
```html
<h2>
  <span class="heading-marker" contenteditable="false">##</span>
  ​Content text here          <!-- ​ = ZWSP \u200B -->
</h2>
```

### Creation

```
C-H1: Type "# " at start of empty <div>
  Action: User types "#" then " " (space) in an empty line
  Expected: <div> transforms to <h1>. Marker "#" hangs left. Cursor after ZWSP.

C-H2: Type "## " at start of empty <div>
  (Same for ###, ####, #####, ######)

C-H3: Type "# " at start of <div> with existing text
  Action: Line has "hello", user moves to start, types "# "
  Precondition: <div>hello</div>, cursor at position 0
  Expected: <div> → <h1> with marker "#" and content "hello"
  Cursor: After ZWSP, at offset matching original position minus marker length

C-H4: Type "# " with non-breaking space (U+00A0)
  Action: User types "#" then non-breaking space
  Expected: Same heading transformation (editor supports multiple space types)

C-H5: Type "# " with en space (U+2002), em space (U+2003), thin space (U+2009)
  Expected: All trigger heading transformation

C-H6: Paste "# Heading text" into empty editor
  Action: Paste plain text containing markdown heading
  Expected: markdownToEditorHtml() converts → heading with marker

C-H7: Paste HTML <h2>text</h2> from external source
  Action: Paste HTML heading from a web page
  Expected: HTML→MD→editorHTML pipeline produces <h2> with marker

C-H8: Type "####### " (7+ hashes)
  Action: Type seven hashes + space
  Expected: NO heading transformation. Stays as plain text <div>

C-H9: Type "# " in the middle of existing text (not at line start)
  Action: "hello # world" — # is not at position 0
  Expected: NO heading transformation. Plain text.

C-H10: Type "#" without trailing space
  Action: Type "#a" (no space between hash and text)
  Expected: NO heading transformation until space is typed

C-H11: Type "# " inside a list item
  Action: Cursor in <li>, type "# "
  Expected: NO heading transformation (only triggers in <div>)

C-H12: Undo after heading creation (Ctrl+Z)
  Action: Create heading, then Ctrl+Z
  Expected: Heading reverts to <div> with "# text" as plain text
```

### Content Editing (inside a heading)

```
E-H1: Type text after the ZWSP inside a heading
  Action: Cursor inside <h1> text node, type characters
  Precondition: <h1> with marker and ZWSP
  Expected: Characters appear inside heading. No re-render. Structure unchanged.

E-H2: Click to reposition cursor inside heading
  Action: Click on text within heading
  Expected: Cursor lands in text node after ZWSP. Never inside marker span.

E-H3: Select all text in heading, type replacement
  Action: Select heading content (not marker), type new text
  Expected: Old text replaced. Heading structure preserved (marker + ZWSP intact).

E-H4: Select text spanning heading + following block
  Action: Selection starts inside heading, ends in next <div>
  Expected: Browser handles cross-block selection. On delete: blocks merge.

E-H5: Press Enter at end of heading
  Action: Cursor at end of heading text, press Enter
  Expected: New <div> created below. NOT a new heading. Cursor in new <div>.

E-H6: Press Enter in the middle of heading text
  Action: Cursor mid-word in heading text
  Expected: Heading splits. First block: <h2> with marker + first half text.
  Second block: <div> with remaining text (orphan heading converted to div).

E-H7: Press Enter at start of heading (right after ZWSP)
  Action: Cursor immediately after ZWSP
  Expected: Empty <div> inserted before heading, OR heading structure adjusts.

E-H8: Backspace at start of heading (deleting ZWSP)
  Action: Cursor after ZWSP, press Backspace
  Expected: ZWSP deleted → heading detected as broken → reverts to <div>.
  Hash characters appear as plain text.

E-H9: Delete key from end of previous block into heading
  Action: Cursor at end of block preceding heading, press Delete
  Expected: Heading merges into previous block. Browser default behavior.

E-H10: Arrow keys through heading
  Action: Use Left/Right arrows to navigate into/out of heading
  Expected: Cursor skips marker span (contenteditable="false"). Moves from
  end of previous block → start of heading text (after ZWSP).

E-H11: Home/End keys inside heading
  Action: Press Home or End while cursor in heading
  Expected: Home → cursor at start of text (after ZWSP). End → end of text.
  Cursor does NOT go inside marker span.

E-H12: Ctrl+A (select all) with heading present
  Action: Press Ctrl+A
  Expected: All content selected including heading text + marker structurally.

E-H13: Bold/italic inside heading (Ctrl+B with selection)
  Action: Select part of heading text, press Ctrl+B
  Expected: <b> element created inside heading. Marker + ZWSP preserved.

E-H14: Type markdown bold **text inside heading
  Action: Type "**word" inside heading
  Expected: Bold element created inside heading text. Heading structure intact.
```

### Format Modification (changing heading level or removing heading)

```
M-H1: Change heading level by editing marker text
  Note: Marker is contenteditable="false" — cannot be directly edited.
  User must delete heading and retype with different hash count.

M-H2: Delete all content in heading, type new heading syntax
  Action: Select all heading text, delete, type "### New heading"
  Precondition: Heading exists, user wants different level
  Expected: OLD behavior: heading with empty text persists until ZWSP deleted.
  User needs to also delete the ZWSP to revert, then type new syntax.

M-H3: Delete heading by selecting entire heading block + Delete
  Action: Select the entire heading line (including marker), press Delete
  Expected: Heading element removed. Blocks before/after may merge.

M-H4: Heading to plain text by deleting ZWSP
  Action: Position cursor after ZWSP (first char after marker), press Backspace
  Expected: Heading reverts to <div>. "#" appears as literal text.

M-H5: Paste markdown with different heading level over existing heading
  Action: Select heading text, paste "### New heading text"
  Expected: Depends on paste pipeline. May create nested heading or replace.
```

### Deletion

```
D-H1: Backspace from empty new line after heading (merge upward)
  Action: Cursor in empty <div> after <h2>, press Backspace
  Expected: Empty div merges into heading. Heading gains trailing content.

D-H2: Backspace through heading text one character at a time
  Action: Cursor at end of heading text, repeatedly press Backspace
  Expected: Characters delete normally. When only ZWSP remains, heading persists.
  Deleting ZWSP → heading reverts to <div>.

D-H3: Delete forward through heading text
  Action: Cursor at start of heading text (after ZWSP), repeatedly press Delete
  Expected: Characters delete. Empty heading persists until ZWSP backspace.

D-H4: Select entire heading block, press Delete or Backspace
  Action: Triple-click heading (select entire block), press Delete
  Expected: Heading element removed entirely.

D-H5: Select from previous block through heading, delete
  Action: Selection spans previous div + heading, delete
  Expected: Both blocks removed, merged into single block.

D-H6: Cut heading text (Ctrl+X)
  Action: Select heading text, Ctrl+X
  Expected: Text cut to clipboard. Heading with empty text + ZWSP remains.

D-H7: Undo heading reversion (Ctrl+Z after heading reverted)
  Action: Heading reverts to <div>, then Ctrl+Z
  Expected: Heading restored from undo stack.
```

### Edge Cases

```
X-H1: Multiple headings in sequence
  Action: Create H1 Enter H2 Enter H3
  Expected: Each heading independent. Enter after each creates <div>, not new heading.

X-H2: Heading at start of document
  Expected: Heading marker hangs left correctly even when it's the first block.

X-H3: Heading at end of document  
  Expected: Enter after last heading creates empty <div> at document end.

X-H4: Very long heading text (text wrapping)
  Expected: Focus mode tracks visual line correctly within long heading.

X-H5: Heading with inline styles (bold inside heading)
  Expected: Heading marker + ZWSP + text with <b> inside = structurally valid.

X-H6: Copy a heading and paste it
  Action: Select heading, Ctrl+C, move cursor, Ctrl+V
  Expected: Pasted heading should have proper marker and structure.

X-H7: Drag-select starting from inside marker span
  Expected: Selection should start from text content, not marker internals.
```

---

## 2. UNORDERED LISTS (UL)

### DOM Structure
```html
<ul>
  <li>Item text</li>
  <li>Item with
    <ul>
      <li>Nested item</li>
    </ul>
  </li>
</ul>
```

### Creation

```
C-UL1: Type "- " at start of empty <div>
  Action: Type dash + space
  Expected: <div> → <ul><li></li></ul>. "- " stripped. Cursor in <li>.

C-UL2: Type "* " at start of empty <div>
  Expected: Same as "- ". Asterisk + space also triggers UL.

C-UL3: Type "+ " at start of empty <div>
  Expected: Same as "-". Plus + space also triggers UL.

C-UL4: Type "- " with existing text content
  Action: Line has "buy milk", user goes to start, types "- "
  Expected: <div> → <ul><li>buy milk</li></ul>

C-UL5: Type "- " in middle of text (not at start)
  Action: "hello - world" — dash+space not at position 0
  Expected: NO list transformation. Plain text.

C-UL6: Type "-" without trailing space
  Action: Type "-a"
  Expected: NO list transformation.

C-UL7: Paste markdown list "- item 1\n- item 2"
  Action: Paste plain text with list markers
  Expected: Converted to <ul> with two <li> elements.

C-UL8: Paste nested markdown list "- item\n  - subitem"
  Action: Paste with indentation
  Expected: Nested <ul> structure with proper nesting levels.

C-UL9: Type "- " inside an existing <li>
  Action: Cursor inside a list item, type "- "
  Expected: NO list transformation (already in a list). Text appears literally.

C-UL10: Type "- " inside a heading
  Expected: NO transformation (only triggers in <div>).
```

### Content Editing (inside list items)

```
E-UL1: Type text inside a list item
  Expected: Normal text editing. List structure preserved.

E-UL2: Press Enter inside a list item (mid-text)
  Action: Cursor mid-word in <li>, press Enter
  Expected: Browser splits <li>. New <li> with remaining text. Same list.

E-UL3: Press Enter at end of list item
  Expected: New empty <li> created. Browser default.

E-UL4: Press Enter on empty list item (exit list)
  Action: Empty <li>, press Enter
  Expected: Browser behavior — may exit list or create another empty <li>.
  (Browser-specific; Chrome vs Firefox differ)

E-UL5: Type bold/italic markdown inside list item
  Action: Type "**bold" inside <li>
  Expected: Bold element created inside <li>. List structure preserved.

E-UL6: Ctrl+B with selection inside list item
  Expected: Selected text wrapped in <b>. <li> structure preserved.

E-UL7: Select text across multiple list items
  Action: Selection spans two <li> elements
  Expected: Browser multi-li selection. Delete merges items.

E-UL8: Select text spanning list + non-list block
  Action: Selection from <li> into following <div>
  Expected: Complex cross-structure selection. Behavior browser-dependent.
```

### List Nesting (Tab / Shift+Tab)

```
E-UL9: Tab on list item with previous sibling <li>
  Action: Cursor in list item (not first), press Tab
  Expected: Item nests inside previous sibling. nestingLevel +1.
  If previous <li> has sub-list → append to it.
  If not → create new <ul> inside previous <li>.

E-UL10: Tab on first list item (no previous sibling)
  Expected: NOTHING happens. Cannot indent without sibling above.

E-UL11: Tab on already-nested item
  Expected: Further nesting (if previous sibling exists at current level).

E-UL12: Tab on item with its own nested sub-list
  Expected: Item AND its children move together.

E-UL13: Tab on item followed by siblings
  Expected: Only current item indents. Siblings stay at their level.

E-UL14: Shift+Tab on nested item (parent is <li>)
  Action: Cursor in nested <li>, press Shift+Tab
  Expected: Item moves out one level (after parent <li>).
  Following siblings form new sub-list under outdented item.

E-UL15: Shift+Tab on nested item (parent is <ul>)
  Expected: Item placed before/after parent list depending on position.

E-UL16: Shift+Tab on top-level only item
  Expected: <li> converts to <div>. Entire <ul> removed.

E-UL17: Shift+Tab on top-level first item (siblings exist)
  Expected: Item becomes <div> BEFORE the list. Others stay in list.

E-UL18: Shift+Tab on top-level last item (siblings exist)
  Expected: Item becomes <div> AFTER the list.

E-UL19: Shift+Tab on top-level middle item
  Expected: List splits into two lists. Item becomes <div> between them.

E-UL20: Multiple consecutive Tab presses (deep nesting)
  Expected: Each Tab adds one level. Arbitrary depth supported.

E-UL21: Tab then Shift+Tab (round-trip)
  Expected: Item returns to original level. Content hash unchanged.
```

### Deletion

```
D-UL1: Backspace at start of first <li>
  Action: Cursor at start of first list item, press Backspace
  Expected: Browser behavior — may merge with block above or convert <li> to block.

D-UL2: Backspace at start of non-first <li>
  Expected: Browser merges with previous <li>.

D-UL3: Delete entire list item content, then Backspace
  Action: Empty <li>, Backspace
  Expected: <li> removed. Cursor moves to previous <li> or exits list.

D-UL4: Select entire list, delete
  Action: Select all <li> elements, press Delete
  Expected: Entire <ul> removed.

D-UL5: Select partial list (some items), delete
  Expected: Selected items removed. Remaining items stay in list.

D-UL6: Cut list items (Ctrl+X)
  Expected: Items cut. List structure adjusted.

D-UL7: Delete nested sub-list
  Action: Select nested items, delete
  Expected: Nested <ul> removed. Parent <li> retains its text.

D-UL8: Backspace from block after list into last <li>
  Action: Cursor in <div> after <ul>, press Backspace
  Expected: <div> content merges into last <li>.
```

### Edge Cases

```
X-UL1: Converting between UL and OL
  Note: No direct conversion path exists. User must outdent to <div> first,
  then type new marker (e.g., "1. ").

X-UL2: Empty list container (no <li> children)
  Expected: Should not exist. Detector catches this as a structural anomaly.

X-UL3: <li> outside <ul>/<ol>
  Expected: Invalid. Detector catches ORPHAN_LIST_ITEM.

X-UL4: List with single item + Backspace at start
  Expected: Converts to <div> (via Shift+Tab behavior or browser default).

X-UL5: Paste list content into an existing list
  Action: Cursor in <li>, paste "- new item"
  Expected: Text appears literally inside <li> (no nested list creation from paste).

X-UL6: Drag-and-drop reorder of list items
  Note: Not implemented. Browser default drag behavior.

X-UL7: Copy list items and paste elsewhere
  Expected: Paste pipeline handles HTML → MD → editorHTML conversion.
```

---

## 3. ORDERED LISTS (OL)

### DOM Structure
```html
<ol>
  <li>First item</li>
  <li>Second item</li>
</ol>
```

### Creation

```
C-OL1: Type "1. " at start of empty <div>
  Expected: <div> → <ol><li></li></ol>. "1. " stripped.

C-OL2: Type "42. " (multi-digit number)
  Expected: Same transformation. Any digit sequence + ". " triggers OL.

C-OL3: Type "1." without trailing space
  Expected: NO transformation.

C-OL4: Type "0. " (zero)
  Expected: Should trigger OL (regex matches \d+\.).

C-OL5: Type "1. " with existing text
  Expected: <div>text → <ol><li>text</li></ol>

C-OL6: Paste "1. item\n2. item\n3. item"
  Expected: Converted to <ol> with three <li> elements.
```

### Content Editing

```
E-OL1: Press Enter in OL (creates new <li>)
  Expected: Browser auto-numbers the new item.

E-OL2: Reorder OL items (delete + re-add)
  Expected: Browser auto-renumbers all items.

E-OL3: Tab in OL (indent)
  Expected: Same as UL Tab. Nested <ol> created (maintains OL type).

E-OL4: Shift+Tab in OL (outdent to <div>)
  Expected: Same as UL. Converts to <div> at top level.

E-OL5: Mix of UL and OL nesting
  Action: OL item, Tab creates nested OL (not UL). List type preserved.
```

### Deletion and Edge Cases

```
D-OL1: Delete all items → empty <ol>
  Expected: Empty <ol> should be cleaned up.

X-OL1: OL with non-sequential starting number
  Note: Editor always creates from "1.". Existing numbering browser-managed.

X-OL2: Paste OL content that has discontinuous numbers
  Expected: Browser normalizes numbering.
```

---

## 4. BOLD

### DOM Structure
```html
<!-- Markdown-triggered -->
**<b>content</b>**​
<!-- Ctrl+B triggered (with selection) -->
**<b>selected text</b>**​
<!-- Ctrl+B triggered (no selection) -->
**<b></b>**​
```
(​ = ZWSP `\u200B`)

### Creation

```
C-B1: Type "**" then a non-space character (e.g., "**h")
  Action: Type two asterisks then a letter
  Expected: Pattern detected → **<b>h</b>**\u200B created. Cursor inside <b> after "h".

C-B2: Type "**" then space
  Action: Type "** " (double star + space)
  Expected: NO bold transformation. Space prevents trigger.

C-B3: Type "**" then another "*"
  Action: Type "***" → triggers bold-italic, not bold
  Expected: ***<b><i>...</i></b>***\u200B (bold-italic takes precedence)

C-B4: Ctrl+B with text selected
  Action: Select "hello", press Ctrl+B
  Expected: **<b>hello</b>**\u200B. Selection retained on "hello".
  Leading/trailing whitespace trimmed from bold wrapping.

C-B5: Ctrl+B with no selection (cursor in plain text)
  Action: Cursor in plain text, press Ctrl+B
  Expected: **<b></b>**\u200B created at cursor. Cursor inside empty <b>.

C-B6: Ctrl+B inside a heading
  Expected: Bold created inside heading. Heading structure preserved.

C-B7: Ctrl+B inside a list item
  Expected: Bold created inside <li>. List structure preserved.

C-B8: Paste "**bold text**" (plain text with MD syntax)
  Expected: Detected as bold pattern → <b>bold text</b>\u200B

C-B9: Paste HTML "<b>bold</b>" from external source
  Expected: HTML→MD→editorHTML pipeline preserves bold.

C-B10: Type bold markdown inside existing bold (nesting attempt)
  Action: Cursor inside <b>, type "**"
  Expected: Break-out behavior — old <b> closes, new <b> starts after.
```

### Content Editing

```
E-B1: Type inside <b> element
  Action: Cursor inside <b>hello</b>, type " world"
  Expected: <b>hello world</b>. Bold region grows.

E-B2: Type after ZWSP (past bold element)
  Action: Move cursor past ZWSP after <b>, type text
  Expected: New text is UNSTYLED. Outside <b>.

E-B3: Backspace inside <b> (deleting characters)
  Action: Cursor inside <b>hello</b>, Backspace
  Expected: Characters deleted normally. <b> persists even if only 1 char remains.

E-B4: Delete all text inside <b> (empty bold)
  Action: Select all text inside <b>, delete
  Expected: <b> may become empty. Possibly triggers EMPTY_STYLE_WRAPPER anomaly.

E-B5: Arrow keys into and out of <b>
  Action: Arrow right from before <b>, through content, past ZWSP
  Expected: Cursor enters <b>, traverses content, exits through ZWSP.

E-B6: Home/End with cursor inside <b>
  Expected: Jumps to line start/end (may skip ZWSP).

E-B7: Double-click word inside <b>
  Expected: Word selected within <b>. Selection stays inside bold element.

E-B8: Triple-click line containing <b>
  Expected: Entire block selected including <b> and surrounding text.
```

### Format Modification

```
M-B1: Select bold text and press Ctrl+B (toggle off)
  Action: Select <b>hello</b>, press Ctrl+B
  Expected: Bold removed. "hello" becomes plain text. ZWSP and markers cleaned up.

M-B2: Select bold text and press Ctrl+I (change to italic)
  Action: Select bold text, Ctrl+I
  Expected: Italic added (may nest: <b><i>text</i></b> or replace depending on browser).

M-B3: Select bold text and press Ctrl+Shift+S (change to strikethrough)
  Expected: Strikethrough added alongside bold.

M-B4: Delete opening ** markers manually
  Note: Markers are text nodes flanking the <b>. Deleting them:
  - If user selects and deletes just "**" before <b>: 
    The bold element persists (markers are visual, not structural).
  - The <b> tag itself survives marker deletion.

M-B5: Delete closing ** markers manually
  Same as M-B4 — <b> tag persists even without visual markers.

M-B6: Delete ** markers and type ~~ (convert bold to strikethrough)
  Action: Remove markers, type "~~" around text
  Note: This doesn't actually change the <b> tag. User would need to
  remove bold (Ctrl+B toggle) then apply strikethrough.

M-B7: Paste over bold text
  Action: Select <b>content</b>, paste new text
  Expected: Bold element replaced with pasted content.
  If pasted text has its own formatting, it replaces the bold.
```

### Deletion

```
D-B1: Backspace through bold text one character at a time
  Action: Cursor at end of <b>hello</b>, Backspace × 5
  Expected: Characters deleted. When <b> becomes empty, it may persist as
  empty wrapper or be cleaned up. ZWSP after <b> may remain.

D-B2: Select entire bold element (including markers), delete
  Action: Select "**hello**", delete
  Expected: Bold and markers removed. ZWSP may remain.

D-B3: Select just the <b> content (not markers), delete
  Expected: <b> becomes empty. Markers remain.

D-B4: Cut bold text (Ctrl+X)
  Expected: Bold + markers cut. ZWSP may remain.

D-B5: Backspace from start of bold (cursor before "**")
  Action: Cursor before opening "**", Backspace
  Expected: Character before the markers deleted. Bold moves left.

D-B6: Delete key from after bold (cursor after ZWSP)
  Action: Cursor after ZWSP, Delete
  Expected: Next character (or next block start) deleted. Bold unchanged.

D-B7: Backspace into bold from adjacent text
  Action: Cursor right after ZWSP (in unstyled text), Backspace
  Expected: ZWSP deleted. Cursor may enter <b> element or markers.
```

### Edge Cases

```
X-B1: Adjacent bold elements
  Action: Type "**hello** **world**"
  Expected: Two separate <b> elements, each with their own markers + ZWSP.

X-B2: Bold at start of block (first thing in <div>)
  Expected: "**<b>text</b>**\u200B" as first content of <div>.

X-B3: Bold at end of block
  Expected: "text **<b>bold</b>**\u200B" — ZWSP is the last character before block end.

X-B4: Bold spanning entire block content
  Expected: <div>**<b>entire line</b>**\u200B</div>

X-B5: Partial bold marker — "**" typed but no closing trigger
  Action: Type "**" and then a space or stop
  Expected: "**" remains as literal text. No bold transformation.
  Bold only triggers on "**" + non-space character.

X-B6: Orphan ZWSP after bold removal
  Expected: ZWSP remains in DOM. May appear in saved content.
  Breaks text search. Should be cleaned up.

X-B7: Bold inside heading
  Expected: <h2><span marker>##</span>\u200B text **<b>bold</b>**\u200B more</h2>

X-B8: Bold inside list item
  Expected: <li>text **<b>bold</b>**\u200B more</li>

X-B9: Bold spanning across block boundary (selection across blocks)
  Action: Select text from <div> through <div>, Ctrl+B
  Expected: Browser applies bold to each block's selected portion independently.

X-B10: Nested bold (bold inside bold)
  Action: Select text inside <b>, press Ctrl+B again
  Expected: Browser toggle — may remove inner bold or create nested <b>.
  Break-out logic should prevent nesting via markdown markers.
```

---

## 5. ITALIC

### DOM Structure
```html
*<i>content</i>*​
```

### Creation

```
C-I1: Type "*" then a non-space character (e.g., "*h")
  Action: Single asterisk + letter
  Expected: *<i>h</i>*\u200B. Cursor inside <i>.
  Note: Must NOT trigger when preceded by another "*" (that would be bold).

C-I2: Type "*" then space
  Expected: NO italic transformation.

C-I3: Ctrl+I with text selected
  Expected: *<i>selected</i>*\u200B. Selection retained.

C-I4: Ctrl+I with no selection
  Expected: *<i></i>*\u200B at cursor position.

C-I5: Paste "*italic*"
  Expected: Detected as italic → <i>italic</i>\u200B

C-I6: Distinguish single * (italic) from ** (bold) from *** (bold-italic)
  Action: Type "***h"
  Expected: Bold-italic, NOT italic + extra asterisks.
  Pattern order: bolditalic → bold → italic (checked in that sequence).
```

### Content Editing, Format Modification, Deletion
```
(Same patterns as Bold §4 — substitute <i> for <b>, "*" for "**", Ctrl+I for Ctrl+B)

E-I1 through E-I8: Same as E-B1 through E-B8 with italic element
M-I1 through M-I7: Same as M-B1 through M-B7 with italic
D-I1 through D-I7: Same as D-B1 through D-B7 with italic

Key differences from bold:
- Single asterisk marker (not double)
- Pattern detection must avoid false match with ** and ***
- Ctrl+I shortcut instead of Ctrl+B
```

---

## 6. BOLD-ITALIC

### DOM Structure
```html
***<b><i>content</i></b>***​
```

### Creation
```
C-BI1: Type "***" then non-space character
  Expected: ***<b><i>h</i></b>***\u200B. Cursor inside innermost (<i>).

C-BI2: Ctrl+B then Ctrl+I (sequential shortcuts)
  Action: Select text, Ctrl+B, then Ctrl+I (or vice versa)
  Expected: Text gets both bold and italic. DOM nesting order may vary.

C-BI3: Paste "***bold italic***"
  Expected: <b><i>bold italic</i></b>\u200B
```

### Special Interactions
```
X-BI1: Delete one asterisk from "***" marker
  Expected: Should change formatting (*** → ** = bold only).
  Current behavior: Markers are text nodes, structural tags persist.

X-BI2: Type inside bold-italic
  Expected: Characters inherit both bold + italic styling.

X-BI3: Toggle one style off (Ctrl+B inside bold-italic)
  Expected: Removes bold, keeps italic. Or vice versa.
```

---

## 7. STRIKETHROUGH

### DOM Structure
```html
~~<s>content</s>~~​
```

### Creation
```
C-S1: Type "~~" then non-space character
  Expected: ~~<s>h</s>~~\u200B. Cursor inside <s>.

C-S2: Ctrl+Shift+S with text selected
  Expected: ~~<s>selected</s>~~\u200B

C-S3: Ctrl+Shift+S with no selection
  Expected: ~~<s></s>~~\u200B at cursor.

C-S4: Paste "~~strike~~"
  Expected: <s>strike</s>\u200B
```

### Content Editing, Modification, Deletion
```
(Same patterns as Bold §4 — substitute <s> for <b>, "~~" for "**", Ctrl+Shift+S for Ctrl+B)
```

---

## 8. INLINE STYLE BREAK-OUT

When the cursor is inside a styled element and the user types the same marker sequence again, the style should "break out" — close the current element and start a new one.

```
BO-1: Inside <b>, type "**" + character
  Action: Cursor at end of <b>hello</b>, type "**w"
  Expected: <b>hello</b>**\u200B → NEW <b>w</b>. Two separate bold elements.
  NOT nested bold.

BO-2: Inside <i>, type "*" + character
  Expected: Same break-out. New <i> after the old one.

BO-3: Inside <s>, type "~~" + character
  Expected: Same break-out for strikethrough.

BO-4: Inside <b><i>, type "***" + character
  Expected: Bold-italic breaks out.

BO-5: Type past ZWSP then type plain character
  Action: Navigate past ZWSP, type
  Expected: Character is UNSTYLED. No re-entry into previous styled element.

BO-6: Type past ZWSP then type new markers
  Action: After ZWSP, type "~~"
  Expected: New strikethrough element, independent of previous bold/italic.
```

---

## 9. PASTE INTERACTIONS WITH ALL FORMATS

### Plain Text Paste
```
P-1: Paste "plain text" into empty editor
  Expected: Text in <div>. No formatting.

P-2: Paste "text\nwith\nnewlines"
  Expected: Multiple <div> blocks (one per line).

P-3: Paste plain text mid-word
  Expected: Inserted inline. Block may grow but not split.

P-4: Paste plain text replacing selection
  Expected: Selected text replaced by paste content.
```

### Markdown-in-Plain-Text Paste
```
P-5: Paste "**bold**" (complete bold syntax)
  Expected: <b>bold</b>\u200B

P-6: Paste "*italic*"
  Expected: <i>italic</i>\u200B

P-7: Paste "~~strike~~"
  Expected: <s>strike</s>\u200B

P-8: Paste "***bold italic***"
  Expected: <b><i>bold italic</i></b>\u200B

P-9: Paste "**partial bold" (no closing **)
  Expected: Text appears literally as "**partial bold" — no formatting.

P-10: Paste "# Heading\n\nParagraph\n\n- List item"
  Expected: Full block-level structure: <h1> + <div> + <ul><li>.

P-11: Paste "1. Item\n2. Item\n3. Item"
  Expected: <ol> with three <li> elements.

P-12: Paste nested list "- item\n  - subitem\n    - deep"
  Expected: Nested <ul> structure matching indentation levels.

P-13: Paste mixed formatting "**bold** and *italic* and ~~strike~~"
  Expected: Three separate styled elements in one line.
```

### HTML Paste
```
P-14: Paste HTML <b>bold</b> from web page
  Expected: HTML→MD→editorHTML pipeline. Bold preserved.

P-15: Paste HTML with inline styles (color, font-family)
  Expected: All external styles stripped. Only structural tags survive.

P-16: Paste HTML <script>alert(1)</script>
  Expected: Script tag stripped by sanitizer. No execution.

P-17: Paste HTML <img onerror="alert(1)">
  Expected: Event handlers stripped. Image tag may be stripped entirely.

P-18: Paste HTML table
  Expected: Table not supported. Text content extracted, structure discarded.

P-19: Paste from Google Docs (complex spans with classes)
  Expected: All classes/styles stripped. Text structure preserved.

P-20: Paste from Microsoft Word (MsoNormal classes)
  Expected: Word-specific markup stripped. Basic structure preserved.
```

### Paste INTO Formatted Elements
```
P-21: Paste into a heading
  Expected: Pasted text appears inside heading. No structural break.

P-22: Paste into a list item
  Expected: Pasted text appears inside <li>. No structural break.

P-23: Paste into a bold element
  Expected: Pasted text appears inside <b> (if cursor is inside <b>).

P-24: Paste formatted markdown over a selection in bold
  Action: Select <b>text</b>, paste "**new**"
  Expected: Old bold replaced. New bold created from paste pipeline.

P-25: Paste block-level markdown into inline context
  Action: Cursor mid-line, paste "# Heading"
  Expected: May split block and create heading. Behavior complex.
```

---

## 10. UNDO/REDO INTERACTIONS WITH FORMATTING

```
U-1: Undo heading creation
  Expected: <h1> reverts to <div> with "# text" as literal text.

U-2: Undo list creation
  Expected: <ul><li>text</li></ul> reverts to <div>- text</div>

U-3: Undo bold creation (markdown)
  Expected: **<b>text</b>** reverts to "**text" (pre-trigger state).

U-4: Undo Ctrl+B bold
  Expected: Bold removed. Text returns to plain.

U-5: Undo list indentation (Tab)
  Expected: Item returns to previous nesting level.

U-6: Undo heading reversion (after ZWSP delete)
  Expected: Heading restored from undo stack.

U-7: Undo paste of formatted content
  Expected: Pasted content removed. Prior state restored.

U-8: Redo after undo of heading creation
  Expected: Heading re-created.

U-9: Multiple undos across different format types
  Action: Create heading → bold in heading → list after → Undo × 3
  Expected: Each undo steps back one operation.

U-10: New edit after undo (redo stack discarded)
  Action: Undo 3 times, then type new text
  Expected: Redo stack cleared. New text is latest state.
```

---

## 11. SELECTION-BASED OPERATIONS ACROSS FORMAT BOUNDARIES

```
S-1: Select text spanning plain text + <b> element
  Action: Selection starts in plain text, extends into bold
  Expected: Partial bold selected. Delete removes selected portion of both.

S-2: Select text spanning <b> + <i> elements
  Expected: Both inline elements partially selected.

S-3: Select text spanning heading + plain div
  Expected: Cross-block selection. Delete merges blocks.

S-4: Select text spanning list item + non-list block
  Expected: Complex cross-structure. Delete behavior browser-dependent.

S-5: Select text spanning two list items
  Expected: Browser handles li-to-li selection. Delete merges items.

S-6: Ctrl+A then type (replace all with formatted syntax)
  Action: Ctrl+A, type "# New heading"
  Expected: All content replaced. New heading created from typed syntax.

S-7: Ctrl+A then Ctrl+B (bold everything)
  Expected: All blocks get bold applied to their visible text.

S-8: Ctrl+A then paste formatted content
  Expected: All content replaced with pasted content structure.

S-9: Ctrl+A then Delete
  Expected: Editor cleared. Single empty <div><br></div> remains.
```

---

## 12. ZWSP (ZERO-WIDTH SPACE) LIFECYCLE

The ZWSP `\u200B` is used internally for cursor positioning but must not leak into visible content or stored documents.

```
Z-1: ZWSP created after heading marker
  When: Heading is created
  Expected: Single ZWSP as first char of heading text node

Z-2: ZWSP created after inline style element
  When: Bold/italic/strike created (markdown or shortcut)
  Expected: Single ZWSP immediately after closing tag

Z-3: ZWSP deleted on heading reversion
  When: Heading reverts to <div>
  Expected: ZWSP removed. Plain text has no ZWSPs.

Z-4: ZWSP persists after inline style removal
  When: Bold removed (Ctrl+B toggle)
  Expected: ZWSP may remain as orphan. SHOULD be cleaned up.

Z-5: ZWSP in saved/exported content
  Expected: ZWSP should be stripped during markdown export.
  Currently: ZWSP leaks into HTML saves and JSON exports.

Z-6: ZWSP count per block
  Expected: At most 1 per heading (after marker) + 1 per inline styled element.
  No block should have >10 ZWSPs (temporal rule threshold).

Z-7: ZWSP multiplication bug
  When: Multiple edits to same block with multiple styled elements
  Expected: ZWSP count should be stable, not growing.

Z-8: Text search through content with ZWSPs
  Expected: ZWSPs are invisible to user. Search should skip them.
  Currently: ZWSPs may interfere with browser Find (Ctrl+F).

Z-9: Copy text containing ZWSPs
  Expected: Clipboard should NOT include ZWSPs.
  Currently: ZWSPs may be copied to clipboard.
```

---

## 13. CARET POSITION MATRIX

For each formatted element, the caret can be in these positions:

```
Position key:
  |  = caret position
  ■  = content character
  ★  = ZWSP
  ≪≫ = markdown markers

For bold "hello":  ≪**≫|■■■■■|≪**≫|★|

CP-1: Caret BEFORE opening markers
  "text |**hello** more" → typing here produces plain text

CP-2: Caret BETWEEN opening markers and <b> start
  "text **|hello** more" → should place caret inside <b>

CP-3: Caret INSIDE <b> content (normal editing position)
  "text **hel|lo** more" → typing adds to bold content

CP-4: Caret BETWEEN <b> end and closing markers
  "text **hello|** more" → at boundary, typing should extend bold

CP-5: Caret BETWEEN closing markers and ZWSP
  "text **hello**|★ more" → typically not reachable directly

CP-6: Caret AFTER ZWSP (escape position)
  "text **hello**★| more" → typing here produces plain text

CP-7: Caret at \u200B in heading (between marker and content)
  "<h2><marker>##</marker>|★Content</h2>" → typing goes into heading text

For headings:
CP-8: Caret cannot be inside marker span (contenteditable="false")
CP-9: Caret at start of heading text node (after ZWSP character)
CP-10: Caret at end of heading text content

For list items:
CP-11: Caret at start of <li> (before any content)
CP-12: Caret at end of <li> (after last content)
CP-13: Caret between <li> text and nested sub-list
```

---

## 14. CONCURRENT / COMPOUND OPERATIONS

Operations that involve multiple formatting types interacting:

```
CC-1: Create heading, then bold inside it, then Enter (split)
  Expected: First block: heading with bold. Second block: plain <div>.

CC-2: Create list, indent item, type bold inside, outdent
  Expected: Bold inside <li> survives nesting changes.

CC-3: Type bold at the boundary where heading starts
  Action: Type "**b" right after the ZWSP in a heading
  Expected: Bold created inside heading.

CC-4: Undo heading creation that contained bold text
  Expected: Heading reverts. Bold formatting also reverts (from undo snapshot).

CC-5: Paste formatted content into a list item that's being indented
  Expected: Paste completes, then indent applies.

CC-6: Select text spanning heading (with bold) + list item, delete
  Expected: Both structures removed/merged. Complex DOM surgery.

CC-7: Rapid typing: "# Heading" Enter "- list" Enter "**bold" Enter "normal"
  Expected: All four blocks created correctly in sequence.
  No race conditions between transformations.

CC-8: Theme toggle while editing inside bold element
  Expected: Visual style changes. DOM structure unchanged.

CC-9: Focus mode tracking through formatted elements
  Expected: Focus line highlights visual line regardless of inline formatting.

CC-10: Save (Ctrl+S) during mid-transformation
  Expected: Current DOM state saved. Partial transformations may save incomplete state.
```

---

## 15. SUMMARY: INTERACTION COUNT PER ELEMENT

| Element | Create | Edit | Modify | Delete | Edge | Total |
|---------|--------|------|--------|--------|------|-------|
| Heading | 12 | 14 | 5 | 7 | 7 | 45 |
| UL | 10 | 21 | — | 8 | 7 | 46 |
| OL | 6 | 5 | — | 1 | 2 | 14 |
| Bold | 10 | 8 | 7 | 7 | 10 | 42 |
| Italic | 6 | 8 | 7 | 7 | — | 28 |
| Bold-Italic | 3 | — | — | — | 3 | 6 |
| Strikethrough | 4 | 8 | 7 | 7 | — | 26 |
| Break-Out | 6 | — | — | — | — | 6 |
| Paste | 25 | — | — | — | — | 25 |
| Undo/Redo | 10 | — | — | — | — | 10 |
| Selection | 9 | — | — | — | — | 9 |
| ZWSP | 9 | — | — | — | — | 9 |
| Caret | 13 | — | — | — | — | 13 |
| Compound | 10 | — | — | — | — | 10 |
| **Total** | | | | | | **~289** |
