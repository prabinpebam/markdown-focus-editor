const toolbar = {
    init() {
        this.hamburger = document.getElementById('hamburger');
        this.toolbarEl = document.getElementById('toolbar');
        // Toggle toolbar visibility when hamburger is clicked
        if (this.hamburger) {
            this.hamburger.addEventListener('click', () => {
                this.toolbarEl.classList.toggle('visible');
                this.hamburger.classList.toggle('active');
            });
        }
        const inc = document.getElementById('increase-font');
        const dec = document.getElementById('decrease-font');

        const step = 2, min = 8, max = 48;
        const root = document.documentElement;

        // helper to apply & persist
        const setSize = px => {
            root.style.setProperty('--base-font', px + 'px');
            localStorage.setItem('baseFont', px);
        };

        // load persisted size once
        const saved = parseInt(localStorage.getItem('baseFont'), 10);
        if (saved) setSize(saved);

        if (inc) inc.addEventListener('click', () => {
            const cur = parseInt(getComputedStyle(root).getPropertyValue('--base-font'));
            if (cur < max) setSize(cur + step);
        });

        if (dec) dec.addEventListener('click', () => {
            const cur = parseInt(getComputedStyle(root).getPropertyValue('--base-font'));
            if (cur > min) setSize(cur - step);
        });
        // ...set up event listeners for toolbar buttons...
        console.log('Toolbar initialized');
    }
};

export default toolbar;
