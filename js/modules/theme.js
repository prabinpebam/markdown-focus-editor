const theme = {
    init() {
        const toggleBtn = document.getElementById('toggle-theme');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleTheme.bind(this));
        }
        // Apply stored theme setting
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.add(currentTheme + '-theme');
    },
    toggleTheme() {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    }
};

export default theme;
