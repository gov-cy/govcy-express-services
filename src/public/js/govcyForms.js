document.addEventListener("DOMContentLoaded", function () {
    // --- Show conditionals for checked radios ---
    document.querySelectorAll('.govcy-radio-input[data-aria-controls]:checked').forEach(radio => {
        const targetId = radio.getAttribute('data-aria-controls');
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            targetElement.classList.remove('govcy-radio__conditional--hidden');
        }
    });
    // --- Disable submit button after form submission ---
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function (e) {
            const submitButton = form.querySelector('[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.setAttribute('aria-disabled', 'true');
            }
        });
    });
});
