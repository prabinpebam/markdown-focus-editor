# Render-Pipeline & Input-Flow Schema
Markdown-Focus-Editor


# Coding principle
- Keep it simple, don't create a fix for a fix for a fix, avoid the issue at a fundamental level to begin with.
- STICK TO THE SCHEMA
- Leverage default browser edit behavior, don't fight it 


# IMPORTANT: Render pipeline
The editor primarily leverages the browser's native `contenteditable` behavior for most user interactions (typing, caret movement, basic deletions). Custom JavaScript intervenes to re-render or transform parts of the DOM only in specific, targeted scenarios:

- **Initial Content Load/File Open:**
  - When content is first loaded (e.g., from local storage or a file), a one-time processing pass may occur to ensure structural integrity (e.g., presence of non-editable heading markers).

- **Runtime DOM Transformations (Triggered by User Input):**
  - **Heading Creation:** When Markdown heading syntax (e.g., `# `, `## `) is typed at the start of a plain block (e.g., a `<div>`), the block is converted to the corresponding `<hX>` element. This includes inserting a non-editable `<span class="heading-marker">`. The caret is then programmatically placed.
  - **Heading Reversion:** If a heading's structural integrity is compromised (e.g., the ZWSP after the marker is deleted), the `<hX>` element is reverted to a `<div>`. The caret is programmatically placed.
  - **List Creation:** When Markdown list syntax (e.g., `- `, `1. `) is typed at the start of a plain block, the block is converted into a `<ul><li>...</li></ul>` or `<ol><li>...</li></ol>` structure. The caret is programmatically placed.
  - **List Indentation/Outdentation (Tab/Shift+Tab):** When `Tab` or `Shift+Tab` is pressed within an `<li>` element:
    - The default browser action is prevented.
    - Custom logic restructures the DOM to create/remove nesting levels for the list item.
    - The caret is programmatically placed after the DOM change.

- **No Full Re-renders for Minor Edits:**
  - Standard typing within existing paragraphs, headings, or list items does not trigger a full re-parse or re-render of the editor's content by custom JavaScript.
  - Browser default behavior handles Enter key presses for creating new list items or splitting blocks, and Backspace for deletions, unless these actions trigger a specific reversion rule (like breaking a heading).

- **Caret Management:**
  - For most operations, the browser manages caret position.
  - Custom caret calculation (`getAbsoluteCaretPosition`) and restoration (`restoreCaret`) are invoked *only after* a custom DOM transformation has occurred to ensure the caret is correctly placed within the newly modified structure.

- **Non-Destructive Formatting (e.g., Focus Mode):**
  - Features like Focus Mode apply styling (e.g., opacity changes) without altering the HTML structure. These are typically updated after caret movements or content changes but do not involve the DOM transformation pipeline described above.

## Leverage browser edit behavior
- Account for click drag selection.
- Account for double click, triple click selection.
- Account for Ctrl+Z (undo/redo) functionality – custom DOM transformations should integrate with the browser's undo stack.

# Formats
## Basic Text Styles
```
Style	Markdown Syntax	Output Example
Bold	**text** or __text__	text
Italic	*text* or _text_	text
Bold Italic	***text*** or ___text___	text
Strikethrough	~~text~~	text
Inline Code	`code`	code
> Blockquote	> text	> text
```

## Headers

- Header is detected in real time using the following syntax identifier
  - `# `, `## `, `### `, `#### `, `##### `, `###### `,
  - The space after the hash(es) can be a regular space, non-breaking space (U+00A0), zero-width space (U+200B), en space (U+2002), em space (U+2003), or thin space (U+2009) to accommodate various text sources.

- **Single Hash**: `# ` → H1 (3x base font size, bold)
- **Double Hash**: `## ` → H2 (2x base font size, bold)  
- **Triple Hash**: `### ` → H3 (1.6x base font size, bold)
- **Quad Hash**: `#### ` → H4 (1.3x base font size, bold)
- **Penta Hash**: `##### ` → H5 (1.1x base font size, bold)
- **Hexa Hash**: `###### ` → H6 (1x base font size, bold)
- **Beyond Six**: `####### ` → Treated as body text with literal hashes

## Typography Scale
```
H1: 3.0x base font, bold weight, 2.0x margin-top
H2: 2.0x base font, bold weight, 1.5x margin-top  
H3: 1.6x base font, bold weight, 1.2x margin-top
H4: 1.3x base font, bold weight, 1.0x margin-top
H5: 1.1x base font, bold weight, 0.8x margin-top
H6: 1.0x base font, bold weight, 0.6x margin-top
```


# List items

## List item UX
- List items should have proper list formatting.
- When text overflow in a sentence, the new line text is aligned properly with the start of the previous line.
- Pressing enter creates a new list item automatically (primarily browser default). For OL, numbers are calculated and added automatically by the browser.
- Pressing tab while the cursor is anywhere on a list item automatically indents the list to create a nested list (custom handling). For ordered lists, the count starts from the beginning for every nested group.
- Pressing shift+tab while the cursor is anywhere on a list item automatically outdents the list item (custom handling).
- For OL, the count for the overall list is recalculated every time there's a change in the list structure (primarily browser default, custom updates if needed after indent/outdent).

## UL/OL
We need to support the ul and ol.
We will use the standarl ul/li element inside contenteditable.
Maintain a separate js file as this can become big.


```html
<ul>
  <li>List item lvl 1</li>      
  <li>List item lvl 2</li>
    <ul>
      <li>List item lvl 2.1</li>
      <li>List item lvl 2.2</li>
        <ul>
          <li>List item lvl 2.2.1</li>
          <li>List item lvl 2.2.2</li>
        </ul>
    </ul>
  <li>List item lvl 3</li>
</ul>

<ol>
      <li>Chapter 1
        <ol>
          <li>Section 1.1</li>
          <li>Section 1.2</li>
        </ol>
      </li>
      <li>Chapter 2</li>
    </ol>


    <ol type="a">
      <li>Chapter 1
        <ol>
          <li>Section 1.1</li>
          <li>Section 1.2</li>
        </ol>
      </li>
      <li>Chapter 2</li>
    </ol>
```

The ul and ol markers will be as below.

## UL
- Item 1
* Item 2
+ Item 3


## OL
1. First
2. Second
3. Third

## Nested list UL
- Item 1
  - Subitem 1.1
  - Subitem 1.2

## Nested list OL
1. Item 1
  1. Subitem 1.1
  2. Subitem 1.2

We need to handle
- tab keypress (prevent default and use it to increase list item indent)
- shift + tab key press (prevent default and use it to decrease list item indent)
- Backspcae (handled by default browser behavior)
- Enter (handled by default browser behavior)

## Principle
- Principle is to leverage browser default behavior and write only code if the default behavior is undesired or is not meeting our requirements.

## Algorithm
- Detect ul and ol syntax marker using regex (Similar to how it's done for heading marker) when typed in a plain block.
- Transition `div` to `ul/ol` if list marker is matched (one-time DOM render).
- Tab key in a list item creates a nested `ul/ol` list (custom DOM render).
- Shift+tab key in a list item brings it up by one level or converts it (custom DOM render).
- Enter and Backspace within lists primarily rely on browser default behavior.

# shift+tab key handling

DOM is rendered only the first time an list item syntax match happens. Just one time transition from the div element to ul/ol li structure happens. After that the brwser default behavior is what I need, for everything including enter and backspace. Don't render DOM again for enter and backspace.
- for tab key press when already in a li item, the li item will be turned into a full ul/ol>li structure to nest the list. DOM should be re-remdered to update this change just one time.
- for shift+tab key press when on a li item, there are a few cases
   - li is at the top level nesting and it's the first/last item and it's the only item in the list
      - The li item is removed from the overall ul/ol>li structure and placed as normal text.
   - li is the top level nesting and it's not the first/last item and it's not the only item in the list
       - the ul/ol list it's currently part of is split into two ul/ol list
       - the list item is kept in between this two lists as a normat text.
   - li is at the top level nesting and it's the first/last item and it's not the only item in the list
      - The li item is removed from the overall ul/ol>li structure and placed either before or after the overall list depending on whether it was the first item or the last item.
   - li is  not the top level nesting and it's the first/last item and it's the the only item in the list
      - The ul/ol>li structure is converted into a single li item for the ul/ol structure that was above this list in the nesting.
   - li is not the top level nesting and it's the first/last item and it's not the only item in the list
      - The li item is removed from the current ul/ol>li structure it's part of and placed either before or after the that list as an li item for the parent ul/ol structure above it, depending on whether it was the first item or the last item.
    - li is not the top level nesting and it's not the first/last item and it's not the only item in the list
       - the ul/ol list it's currently part of is split into two ul/ol list
       - the list item is kept in between this two lists as an li item for the parent ul/ol




# text style support
We need to retain the md syntax in the ui, so the following is what I want.


Bold: **text** or __text__ -> **<strong>text</strong>**
Italic: *text* or _text_ -> *<em>text</em>*
Bold & Italic: ***text*** or ___text___ -> ***<strong><em>text</em></strong>*** (or ***<em><strong>text</strong></em>***)
Strikethrough: ~~text~~ -> ~~<s>text</s>~~

This way caret calculation should also be accurate and retained to what the user typed.

I see that for contenteditable browser already support ctrl+b and ctrl+i, and it uses <b></b> and <i></i> for these.
I want to work with browser behavior as much as possible.

md syntax and browser shortcut should work together.
that means
- if ctrl+b is pressed with nothing selected
   - **<b></b>** should be immediately created with the curson inside the tag.
- if ctrl+b is pressed with some text selected
   - **<b>some text</b>** should be the outcome with the text still being selected after the creation

Similar behavior for the other styles.

For style with md syntax
- The moment user types "**(any character other than space & *)"
   - **<b>(whatever character the user typed)</b>** should be immediately created with the cursor position preserved after the character.

- The moment user types "*(any character other than space & *)"
   - *<i>(whatever character the user typed)</i>* should be immediately created with the cursor position preserved after the character.

- The moment user types "~~(any character other than space)"
   - ~~<s>(whatever character the user typed)</s>~~ should be immediately created with the cursor position preserved after the character.

- The moment user types "***(any character other than space)"
   - ***<b><i>(whatever character the user typed)</i></b>*** should be immediately created with the cursor position preserved after the character.