
document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            const isHidden = mobileMenu.classList.contains('hidden');
            mobileMenu.classList.toggle('hidden', !isHidden);
            const icon = menuBtn.querySelector('.material-symbols-outlined');
            icon.textContent = isHidden ? 'close' : 'menu';
        });

        // Close menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                menuBtn.querySelector('.material-symbols-outlined').textContent = 'menu';
            });
        });
    }

    // --- FAQ Accordion ---
    document.querySelectorAll('.faq-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const content = item.querySelector('.faq-content');
            const icon = btn.querySelector('.faq-icon');
            const isOpen = !content.classList.contains('hidden');

            // Close all others
            document.querySelectorAll('.faq-item').forEach(other => {
                if (other !== item) {
                    other.querySelector('.faq-content').classList.add('hidden');
                    other.querySelector('.faq-icon').classList.remove('open');
                    other.querySelector('.faq-toggle').setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle current
            content.classList.toggle('hidden', isOpen);
            icon.classList.toggle('open', !isOpen);
            btn.setAttribute('aria-expanded', !isOpen);
        });
    });
});
