
// Create the preload-fix.js content inline for now
document.addEventListener('DOMContentLoaded', function() {
    // Remove preload class to allow transitions
    document.body.classList.remove('preload');
    
    // Small delay to ensure DOM is fully ready, then remove is-preload
    setTimeout(function() {
        document.body.classList.remove('is-preload');
        
        // Trigger fade-up animations manually
        const fadeElements = document.querySelectorAll('.wrapper.fade-up, .spotlights > section');
        fadeElements.forEach(function(element, index) {
            setTimeout(function() {
                element.classList.remove('inactive');
            }, index * 150); // Stagger the animations
        });
    }, 100);
});
