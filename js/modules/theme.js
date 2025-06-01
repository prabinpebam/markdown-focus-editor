import storage from './storage.js';

// Store the bound function at the module level to ensure it's truly a singleton reference
let boundToggleThemeFunction = null;
let isCurrentlyToggling = false; // Re-entrancy guard / simple debounce flag

const theme = {
    themeToggleButton: null,

    init() {
        this.themeToggleButton = document.getElementById('toggle-theme');
        if (this.themeToggleButton) {
            // Create the bound function only once and store it at module level
            if (!boundToggleThemeFunction) {
                boundToggleThemeFunction = this.toggleTheme.bind(this);
                // console.log('[Theme] Created module-level boundToggleThemeFunction');
            }

            // Always remove before adding to be safe, using the module-level singleton reference
            this.themeToggleButton.removeEventListener('click', boundToggleThemeFunction);
            this.themeToggleButton.addEventListener('click', boundToggleThemeFunction);
            // console.log('[Theme] Event listener attached/re-attached.');
        }
        // Initial theme application is handled by storage.loadSettings which should call applyTheme
    },

    applyTheme(themeName) {
        document.body.classList.remove('light-theme', 'dark-theme');
        if (themeName === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.add('light-theme'); // Default to light
        }
        // Update icon
        if (this.themeToggleButton && this.themeToggleButton.querySelector('img')) {
            this.themeToggleButton.querySelector('img').src = themeName === 'dark' ? 'images/light-theme.svg' : 'images/dark-theme.svg';
            this.themeToggleButton.querySelector('img').alt = themeName === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
        }
        console.log(`[Theme] Applied ${themeName} theme.`); // This is line 26 from the log
    },

    toggleTheme() {
        // console.log('[Theme] toggleTheme attempt.'); // Log entry attempt
        if (isCurrentlyToggling) {
            // console.log('[Theme] Debounce: Toggle already in progress.');
            return; // Prevent rapid re-execution
        }
        isCurrentlyToggling = true;
        // console.log('[Theme] toggleTheme execution started.');

        const currentThemeIsDark = document.body.classList.contains('dark-theme');
        const newTheme = currentThemeIsDark ? 'light' : 'dark';
        this.applyTheme(newTheme);
        storage.saveSettings('theme', newTheme);

        // Reset the flag after a short delay.
        // This allows the current event processing to complete and prevents immediate re-triggering.
        setTimeout(() => {
            isCurrentlyToggling = false;
            // console.log('[Theme] Debounce: Flag reset.');
        }, 100); // 100ms cooldown
    }
};

export default theme;
