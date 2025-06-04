# Markdown Focus Editor

A distraction-free, browser-based markdown editor with live formatting and focus mode.

![Markdown Focus Editor](images/screenshot.png)

## Features

- **Focus Mode**: Highlights only the current line for distraction-free writing
- **Live Markdown Formatting**:
  - Bold (**text**) with Ctrl+B
  - Italic (*text*) with Ctrl+I
  - Strikethrough (~~text~~) with Ctrl+Shift+S
- **Heading Support**: Type # through ###### and space to create headings
- **List Support**: Create ordered and unordered lists
- **Smart Paste**: Preserves formatting when pasting text
- **Undo/Redo**: Full history management with Ctrl+Z/Ctrl+Y
- **Dark/Light Theme**: Toggle between themes for comfortable writing
- **File Management**: Save and open markdown files
- **Responsive Layout**: Works on different screen sizes

## Getting Started

1. Clone this repository or download the files
2. Open `index.html` in a modern web browser
3. Start writing in Markdown!

## Usage

- Use the floating red dot to access the toolbar
- Toggle Focus Mode with the switch in the toolbar
- Format text with standard keyboard shortcuts:
  - Ctrl+B for bold
  - Ctrl+I for italic
  - Ctrl+Shift+S for strikethrough
- Create headings by typing # to ###### followed by a space
- Create lists with * or 1. followed by a space

## Focus Mode

The highlight feature helps maintain attention on the current line by:
- Keeping the current line at full opacity
- Dimming all other content for minimal distraction
- Following cursor movement in real-time
- Supporting all content types (paragraphs, headings, lists)

## Technology

- Vanilla JavaScript (ES6+)
- HTML5
- CSS3 with CSS variables
- SVG masks for focus highlighting
- LocalStorage for content persistence

## Development

- Enable Dev Mode with the toggle switch in the top right
- The caret position display helps with debugging
- Modules are organized in the js/modules directory
- Styles can be customized in style/main.css

## License

MIT License - Feel free to use, modify, and distribute as needed
