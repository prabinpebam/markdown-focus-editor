# Render-Pipeline & Input-Flow Schema
Markdown-Focus-Editor


# Coding principle
- Keep it simple, don't create a fix for a fix for a fix, avoid the issue at a fundamental level to begin with.
- STICK TO THE SCHEMA
- Leverage default browser edit behavior, don't fight it 


# IMPORTANT: Render pipeline
On every key press and mouse click
- Let browser do its default edit behavior for contenteditable elements
- Preserve the DOM in the conteneditable tag that gets created.
- Detect and store current caret position considering the current DOM
- Use the DOM and use regex to detect various formatting sections.
  - Header sections:
    - Real-time detection using syntax identifiers: `# `, `## `, etc. (matches regular space, non-breaking space, zero-width space, en space, em space, and thin space after hashes).
  - List sections
  - Focus mode sections
  - Text style sections
- Split all sections using spans within the preserved structure of the DOM
- Apply correct formatting by assigning the appropriate CSS classes
- Update the preserved DOM with the new added spans and formatting classes.
- Preserve caret position

## Leverage browser edit behavior
- Account for click drag selection
- Account for double click, tripple click selection
- Account for ctrl + z functionality.

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
- Pressing enter creats a new list item automatically. For OL, numbers are calculated and added automatically.
- Pressing tab while the cursor is anywhere on a list item automatically indents the list to create nested list. For ordered lists, the count starts from the beginning for every nested group.
- For OL, the count for the overall list is recalculated every time there's a change in the list structure.
  - There should be continuous count for list items at the same level of the nesting. Having sub items in the list structure doens't break this count.
  - The count of a nested item ends only when the next item after the nested item goes above the level of the nested item.

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
\```

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
- Detect ul and ol syntax marker using regex (Similar to how it done for heading marker)
- Transition div to ul/ol if list marker is matched
- Tab key in a list item creates a nested ul/ol list
- shift+tab key
  - brings a list item up by one level in the nesting.


# shift+tab key handling

DOM render pipeline should be suspended by default.
There were code to suspend DOM render on specific conditions, we can remove them.
DOM is rendered using the existing logic only when heading match happens with the existing heading match algorithm. Even here it's a one time thing. Once the transition form div to hx has happened, there's no need to re render the DOM.

Similarly DOM is rendered only the first time an list item syntax match happens. Just one time transition from the div element to ul/ol li structure happens. After that the brwser default behavior is what I need, for everything including enter and backspace. Don't render DOM again for enter and backspace.
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


# Focus mode

- **Toggle**: Via `focusToggle` checkbox in toolbar (`focusEnabled` boolean)
- **Detection**: Sentence boundaries using terminators (`. ! ? …`)
- **Range Calculation**: 2-sentence window (previous terminator to next terminator)
- **Persistence**: Saved to localStorage as `markdownEditorFocusEnabled`
- **Styling**: Text within focus mode is 90% opacity, text outside focus range is 30% opacity. This respects light and dark themme.

**Current Logic**:
1. Focus is driven by the current caret position. Map current caret position to absolute character index
2. Walk backwards until 2nd terminator found. The character immediately after the terminator is the focus start index.
  1. If only 1 or no terminator is found, that means the caret is in the beginning of the doc. Hence the start of the doc itself is the focust start index.
3. Walk forwards until 2nd terminator found. The terminator is included in the focus amd it is the focus end index.
  1. If only 1 or no terminator is found, that means the caret is in the end of the doc. Hence the end of the doc itself is the focust end index.
4. Apply focus style during DOM building


