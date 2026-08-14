// =============================================================
// MindSpout Additional UI Enhancements & Micro-Animations
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Add page transition fade-in effect to body on load
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.6s ease';
        document.body.style.opacity = '1';
    }, 50);

    // Track mouse coordinates on glassmorphic cards to create a glowing border effect
    const cards = document.querySelectorAll('.glassmorphic-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element.
            const y = e.clientY - rect.top;  // y position within the element.

            // Find or create card glow overlay element
            let glow = card.querySelector('.card-glow-interactive');
            if (!glow) {
                glow = document.createElement('div');
                glow.className = 'card-glow-interactive';
                glow.style.position = 'absolute';
                glow.style.width = '200px';
                glow.style.height = '200px';
                glow.style.borderRadius = '50%';
                glow.style.background = 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)';
                glow.style.pointerEvents = 'none';
                glow.style.transform = 'translate(-50%, -50%)';
                glow.style.zIndex = '1';
                card.appendChild(glow);
            }

            glow.style.left = `${x}px`;
            glow.style.top = `${y}px`;
        });

        card.addEventListener('mouseleave', () => {
            const glow = card.querySelector('.card-glow-interactive');
            if (glow) {
                glow.style.transition = 'opacity 0.4s ease';
                glow.style.opacity = '0';
                setTimeout(() => glow.remove(), 400);
            }
        });
    });

    // Animate glowing logo icon on hover
    const brainIcon = document.querySelector('.brain-icon');
    if (brainIcon) {
        brainIcon.addEventListener('mouseenter', () => {
            brainIcon.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            brainIcon.style.transform = 'scale(1.15) rotate(12deg)';
        });
        brainIcon.style.mouseleave = () => {
            brainIcon.style.transform = 'scale(1) rotate(0deg)';
        };
    }
});
