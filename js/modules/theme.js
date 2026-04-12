import storage from './storage.js';

// Store the bound function at the module level to ensure it's truly a singleton reference
let boundToggleThemeFunction = null;
let isCurrentlyToggling = false; // Re-entrancy guard / simple debounce flag

const theme = {
    themeToggleButton: null,

    init() {
        this.themeToggleButton = document.getElementById('toggle-theme');
        if (this.themeToggleButton) {
            if (!boundToggleThemeFunction) {
                boundToggleThemeFunction = this.toggleTheme.bind(this);
            }
            this.themeToggleButton.removeEventListener('click', boundToggleThemeFunction);
            this.themeToggleButton.addEventListener('click', boundToggleThemeFunction);
        }

        // Listen for system theme changes (only applies if user hasn't explicitly overridden)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                // No explicit user override — follow system
                this.applyTheme(e.matches ? 'dark' : 'light');
                console.log(`[Theme] System theme changed to ${e.matches ? 'dark' : 'light'}`);
            }
        });
    },

    applyTheme(themeName) {
        document.body.classList.remove('light-theme', 'dark-theme');
        if (themeName === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.add('light-theme');
        }
        // Update toolbar toggle icon
        if (this.themeToggleButton && this.themeToggleButton.querySelector('img')) {
            this.themeToggleButton.querySelector('img').src = themeName === 'dark' ? 'images/light-theme.svg' : 'images/dark-theme.svg';
            this.themeToggleButton.querySelector('img').alt = themeName === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
        }
        // Update title bar app icon (dark icon on light bg, light icon on dark bg)
        const titleIcon = document.getElementById('title-icon');
        if (titleIcon) {
            titleIcon.src = themeName === 'dark' ? 'images/favicon-light.svg' : 'images/favicon-dark.svg';
        }
        // Update HTML favicon
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = themeName === 'dark' ? 'images/favicon-light.svg' : 'images/favicon-dark.svg';
        }
        console.log(`[Theme] Applied ${themeName} theme.`);
    },

    toggleTheme() {
        console.log('[Theme] Toggle theme attempt started');
        if (isCurrentlyToggling) {
            console.log('[Theme] Debounce: Toggle already in progress, ignoring request');
            return;
        }
        isCurrentlyToggling = true;

        const currentThemeIsDark = document.body.classList.contains('dark-theme');
        const newTheme = currentThemeIsDark ? 'light' : 'dark';
        this.applyTheme(newTheme);
        // Save explicitly — this marks the user as having overridden system default
        storage.saveSettings('theme', newTheme);
        console.log(`[Theme] Theme toggled to ${newTheme} (explicit user override)`);

        setTimeout(() => {
            isCurrentlyToggling = false;
        }, 100);
    }
};

export default theme;
