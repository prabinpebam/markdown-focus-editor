const storage = {
    loadSettings() {
        // Apply theme
        const themePref = localStorage.getItem('theme') || 'light';
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(themePref + '-theme');
        
        const editorEl = document.getElementById('editor'); // Get editor element

        // Apply font family if saved
        const fontFamily = localStorage.getItem('fontFamily');
        if (fontFamily && editorEl) {
            editorEl.style.fontFamily = fontFamily;
        }
        // Apply font size if saved
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize && editorEl) {
            editorEl.style.fontSize = fontSize + 'px';
        }
        // Set focus mode toggle based on saved value
        const focusEnabled = localStorage.getItem('focusEnabled');
        const focusToggle = document.getElementById('focus-toggle');
        if (focusToggle) {
            focusToggle.checked = (focusEnabled === 'true');
        }

        // Load last saved content into the editor
        const lastContent = localStorage.getItem('lastContent');
        if (lastContent && editorEl) {
            // Only set content if it's different from the default initial content
            // to avoid unnecessary 'input' event if content is already the default.
            // However, for simplicity and to ensure it always loads, we'll set it.
            // The initial content is simple, so an extra formatContent call is minor.
            editorEl.innerHTML = lastContent;
        }
    },
    saveSettings(key, value) {
        localStorage.setItem(key, value);
    }
};

export default storage;
