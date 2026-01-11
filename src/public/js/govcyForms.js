document.addEventListener("DOMContentLoaded", function () {
    function updateConditionalRadios() {
        // 1. Close ALL conditional blocks
        Array.prototype.forEach.call(
            document.querySelectorAll('.govcy-radio__conditional'),
            function (el) {
                el.classList.add('govcy-radio__conditional--hidden');
            }
        );

        // 2. Re-open conditionals for CHECKED radios
        // --- Show conditionals for checked radios ---
        // CHANGED: NodeList.prototype.forEach is not in IE11 → use Array.prototype.forEach.call
        // CHANGED: Arrow function → function
        Array.prototype.forEach.call(
            document.querySelectorAll('.govcy-radio-input[data-aria-controls]:checked'),
            function (radio) { // CHANGED: arrow → function
                // CHANGED: const → var (ES5)
                var targetId = radio.getAttribute('data-aria-controls');
                var targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.classList.remove('govcy-radio__conditional--hidden');
                }
            }
        );
    }

    // Attach to *all* radios to repair DS behaviour
    Array.prototype.forEach.call(
        document.querySelectorAll('.govcy-radio-input'),
        function (radio) {
            radio.addEventListener('change', updateConditionalRadios);
        }
    );

    // Apply once on page load
    updateConditionalRadios();

    // --- Disable submit button after form submission ---
    // CHANGED: NodeList.forEach → Array.prototype.forEach.call
    Array.prototype.forEach.call(document.querySelectorAll('form'), function (form) { // CHANGED
        form.addEventListener('submit', function (e) {
            // CHANGED: const → var (ES5)
            var submitButton = form.querySelector('[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.setAttribute('aria-disabled', 'true');
                // (Optional) announce busy state for AT:
                // submitButton.setAttribute('aria-busy', 'true'); // CHANGED: optional a11y improvement
            }
        });
    });
});
