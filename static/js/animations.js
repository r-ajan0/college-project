// =============================================================
// MindSpout UI Micro-Animations
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Fade body in on page load
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.45s ease';
        document.body.style.opacity   = '1';
    }, 30);

    // Animate in lightbulb icon on quiz page
    const bulb = document.querySelector('.help-bulb-btn');
    if (bulb) {
        bulb.addEventListener('mouseenter', () => {
            bulb.style.transform = 'scale(1.12) rotate(-8deg)';
        });
        bulb.addEventListener('mouseleave', () => {
            bulb.style.transform = '';
        });
    }
});
