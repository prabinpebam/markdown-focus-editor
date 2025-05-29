# Markdown Focus Editor – Product Brief

## 1 Purpose  
Give writers a calm, distraction-free space for drafting Markdown notes or articles, while still offering quick access to power-features such as dark-mode, custom fonts and file handling.

## 2 Key Experience  
1. You open the page and are greeted by a full-width light-grey canvas with a single blinking cursor.  
2. A small “☰” icon sits in the top-left corner. Clicking it reveals a floating toolbar; clicking anywhere else hides it again.  
3. The toolbar lets you: Save, Open, Change font size, Toggle light/dark theme, Enter/exit fullscreen, Switch *Focus* on/off and Pick a different font.  
4. When *Focus* is ON, everything except the sentence with the caret fades to 60 % opacity, helping you stay on the current thought. Turning it off shows the entire document at full strength.  
5. Pressing **Ctrl + S** downloads the text as a `.md` file. Drag-and-drop of a `.txt` or `.md` file instantly replaces the content.  
6. Headings display with a hanging “#” marker in the margin for easy scanning.  
7. Font size changes are remembered across sessions, as are the chosen theme, font and focus state.

## 3 Interface Elements
| Element | Location | Behaviour |
|---------|----------|-----------|
| Editor area | Centre of page | Plain text, monospace *Roboto Mono* by default. |
| Hamburger button | Fixed, top-left | Shows / hides toolbar. |
| Toolbar | Centred overlay | Semi-transparent, blurred background; contains icon buttons. |
| Font modal | Centre of screen | Lists top 50 Google Fonts; selecting one applies it instantly. |

## 4 User Controls
* **Save** – icon of a floppy disk. Downloads current text.  
* **Open** – opens file picker.  
* **A⁺ / A⁻** – increase / decrease base font size (8 px–48 px).  
* **Theme** – sun/moon icon toggles light (grey background, black text) and dark (near-black background, white text).  
* **Fullscreen** – fills monitor; Esc or button exits.  
* **Focus switch** – iOS-style slider. Blue when active, grey when off.  

## 5 Persisted Settings  
Saved to local storage so the workspace feels familiar each time:  
`theme`, `focusEnabled`, `fontSize`, `lastContent`, `caretPosition`.

