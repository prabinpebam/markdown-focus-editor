# Markdown Focus Editor

A simple, distraction-free Markdown editor built with Electron, focusing on one heading section at a time. This editor helps you concentrate on the current part of your document by dimming other sections.

## Features

*   **Focus Mode:** Highlights the current heading section (e.g., text under an `H1`, `H2`, etc.) and dims the rest of the document.
*   **Real-time Markdown Preview:** (Currently basic, renders Markdown on file save/change)
*   **File Operations:** Open, save, and save-as Markdown files.
*   **Theme Toggle:** Switch between light and dark themes.
*   **Section Navigation:** Quickly jump to the next or previous heading section.
*   **Basic Formatting:** Apply bold, italic, and strikethrough using keyboard shortcuts.
*   **Find Functionality:** Search for text within the editor.
*   **Auto Save:** Automatically saves the file at regular intervals (currently every 30 seconds).
*   **Word Count:** Displays the word count for the current section and the entire document.
*   **Recent Files:** Access recently opened files.
*   **Adjustable Dimming Level:** Control the opacity of non-focused sections.

## Screenshots

*(Consider adding new screenshots if the UI has changed significantly)*
*TODO: Add updated screenshots*

## Usage

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/markdown-focus-editor.git
    cd markdown-focus-editor
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the application:**
    ```bash
    npm start
    ```

### Editing

*   Type your Markdown content in the left-hand editor pane.
*   The editor will automatically identify heading sections (H1, H2, H3, etc.).
*   The section you are currently editing will be fully opaque, while other sections will be dimmed.
*   Clicking into a different section will shift the focus.

## Keybindings

*   **File Operations:**
    *   `Ctrl+O`: Open File
    *   `Ctrl+S`: Save File
    *   `Ctrl+Shift+S`: Save File As
    *   `Ctrl+N`: New File (Opens an empty untitled file)
*   **Editing & Navigation:**
    *   `Ctrl+F`: Find
    *   `Ctrl+B`: Toggle Bold (`**text**`)
    *   `Ctrl+I`: Toggle Italic (`*text*`)
    *   `Ctrl+Shift+X` or `Ctrl+Shift+K`: Toggle Strikethrough (`~~text~~`)
    *   `Alt+UpArrow`: Move to Previous Section
    *   `Alt+DownArrow`: Move to Next Section
    *   `Ctrl+PageUp` or `Ctrl+Shift+Tab`: Previous Tab (if multiple files are open)
    *   `Ctrl+PageDown` or `Ctrl+Tab`: Next Tab (if multiple files are open)
    *   `Ctrl+W` or `Ctrl+F4`: Close Current Tab
*   **View:**
    *   `Ctrl+Shift+I`: Toggle Developer Tools
    *   `Ctrl+R` or `F5`: Reload
    *   `Ctrl+Shift+L`: Toggle Theme (Light/Dark)
    *   `Ctrl+Plus` or `Ctrl+Shift+Plus`: Zoom In
    *   `Ctrl+-`: Zoom Out
    *   `Ctrl+0`: Reset Zoom
    *   `F11`: Toggle Fullscreen
*   **Focus Mode:**
    *   `Alt+L`: Toggle Focus Mode (globally enables/disables dimming)
    *   `Alt+ShiftUpArrow`: Decrease Dimming Level (make non-focused text more visible)
    *   `Alt+ShiftDownArrow`: Increase Dimming Level (make non-focused text less visible)

## How Focus Mode Works

The editor parses the Markdown content and identifies lines starting with `#`, `##`, `###`, etc., as headings. When your cursor is within a block of text associated with a heading, that entire section (from the heading to just before the next heading of the same or higher level, or the end of the document) is considered "focused." All other sections are dimmed.

## Future Enhancements / Ideas

*   [x] More robust Markdown preview (e.g., using a library like `marked` or `markdown-it` with live updates). - *Partially implemented, updates on change.*
*   [x] Theme persistence. - *Implemented*
*   [ ] Customizable keyboard shortcuts.
*   [x] Improved section detection logic (e.g., handling horizontal rules or other separators). - *Improved*
*   [ ] Export to HTML/PDF.
*   [x] Word count (current section / total). - *Implemented*
*   [x] Recent files list. - *Implemented*
*   [x] Auto-save feature. - *Implemented*
*   [ ] Spell check.
*   [ ] Support for different Markdown flavors.
*   [x] Adjustable dimming level. - *Implemented*
*   [ ] Table editing assistance.
*   [ ] Image pasting/uploading.
*   [ ] Presentation mode (viewing one section at a time, full screen).
*   [ ] Better handling of unsaved changes (e.g., asterisk in title, prompt on close).
*   [ ] Tabbed interface for multiple open files. - *Implemented*
*   [ ] Command Palette (`Ctrl+Shift+P`).
*   [ ] Outline view/Table of Contents panel.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any bugs, features, or improvements.
