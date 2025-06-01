import editor from './editor.js';
import theme from './theme.js';
import toolbar from './toolbar.js';

const storage = {
    loadSettings() {
        const editorEl = document.getElementById('editor'); // Get editor element once

        // Load and apply theme
        const themePref = localStorage.getItem('theme') || 'light'; // Default to 'light' string
        theme.applyTheme(themePref);

        // Load and apply font family
        const fontFamily = localStorage.getItem('fontFamily');
        if (fontFamily && editorEl) {
            editorEl.style.fontFamily = fontFamily;
        }

        // Load and apply font size (use toolbar's method for consistency)
        const fontSize = localStorage.getItem('fontSize'); // This will be a string e.g. "16"
        if (fontSize && toolbar.setFontSize) {
            toolbar.setFontSize(parseInt(fontSize, 10)); // Ensure it's a number
        }

        // Load and set focus mode toggle
        const focusEnabled = localStorage.getItem('focusEnabled'); // String "true" or "false"
        const focusToggle = document.getElementById('focus-toggle');
        if (focusToggle && focusEnabled !== null) {
            focusToggle.checked = (focusEnabled === 'true');
            // If editor needs to react to focus mode change on load, call relevant editor method here
            // Example: if (editor.applyFocusVisibility) editor.applyFocusVisibility();
        }

        // Load last saved content
        const lastContent = localStorage.getItem('lastContent');
        if (lastContent && editorEl) {
            editorEl.innerHTML = lastContent;
        }
        // Note: editor.undoManager.recordInitialState(); in app.js handles initial undo state.
    },

    saveSettings(key, value) {
        // Ensure consistent string saving for boolean-like values if necessary,
        // though localStorage stringifies everything anyway.
        // For 'theme', value is already 'light' or 'dark'.
        // For 'focusEnabled', value would be true/false, stringified to "true"/"false".
        // For 'fontSize', value is a number, stringified.
        localStorage.setItem(key, value);
    }
};

export default storage;
