const storage = {
    loadSettings() {
        // Apply theme
        const themePref = localStorage.getItem('theme') || 'light';
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(themePref + '-theme');
        // Apply font family if saved
        const fontFamily = localStorage.getItem('fontFamily');
        if (fontFamily) {
            document.getElementById('editor').style.fontFamily = fontFamily;
        }
        // Apply font size if saved
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize) {
            document.getElementById('editor').style.fontSize = fontSize + 'px';
        }
        // Set focus mode toggle based on saved value
        const focusEnabled = localStorage.getItem('focusEnabled');
        const focusToggle = document.getElementById('focus-toggle');
        if (focusToggle) {
            focusToggle.checked = (focusEnabled === 'true');
        }
    },
    saveSettings(key, value) {
        localStorage.setItem(key, value);
    }
};

export default storage;
