/**
 * QPC POY — Date Input helper
 *
 * Replaces native <input type="date"> (browser-locale dependent) with
 * <input type="text"> displaying consistent DD/MM/YYYY format.
 *
 * Usage:
 *   <input type="text" data-date value="2026-06-17">
 *   QPE_UI.dateInput.attach(input);
 *
 *   // Read normalized ISO value (YYYY-MM-DD):
 *   const iso = QPE_UI.dateInput.read(input);
 *
 * On attach:
 *   - Sets placeholder "DD/MM/YYYY"
 *   - Formats initial value (ISO or DD/MM/YYYY) → "DD/MM/YYYY"
 *
 * On blur:
 *   - Parses user input via QPE.parse._normalizeDate (accepts 17/6, 17-6-2026, etc.)
 *   - Reformats to canonical "DD/MM/YYYY" or clears if invalid
 *
 * On input (typing):
 *   - Auto-inserts "/" after DD and MM digits (smart UX)
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  // Format ISO (YYYY-MM-DD) → "DD/MM/YYYY". Returns '' if invalid/empty.
  function formatDisplay(value) {
    if (!value) return '';
    const v = String(value).trim();
    // Already DD/MM/YYYY?
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    // ISO YYYY-MM-DD?
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    // Try parse via engine helper
    const norm = (QPE.parse && QPE.parse._normalizeDate) ? QPE.parse._normalizeDate(v) : '';
    const m = norm.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }

  // Read normalized ISO YYYY-MM-DD from input. Returns '' if empty/invalid.
  function read(input) {
    if (!input) return '';
    return (QPE.parse && QPE.parse._normalizeDate)
      ? QPE.parse._normalizeDate(input.value)
      : '';
  }

  function attach(input) {
    if (!input || input.dataset.dateAttached === '1') return;
    input.dataset.dateAttached = '1';
    input.type = 'text';
    if (!input.placeholder) input.placeholder = 'DD/MM/YYYY';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('maxlength', '10');
    input.classList.add('date-input');

    // Initial format
    input.value = formatDisplay(input.value);

    // Smart slash insertion while typing
    input.addEventListener('input', () => {
      const cursorAtEnd = input.selectionStart === input.value.length;
      let v = input.value;

      // Only auto-format if user is appending at end
      if (cursorAtEnd) {
        // Strip non-digits then re-insert slashes
        const digits = v.replace(/\D/g, '').slice(0, 8);
        let out = digits;
        if (digits.length > 4) out = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
        else if (digits.length > 2) out = digits.slice(0, 2) + '/' + digits.slice(2);
        input.value = out;
      }
    });

    // On blur, reformat & validate
    input.addEventListener('blur', () => {
      const iso = read(input);
      if (!iso) {
        if (input.value.trim() === '') return;  // empty is OK
        // Keep user input but mark invalid
        input.classList.add('date-invalid');
        return;
      }
      input.classList.remove('date-invalid');
      input.value = formatDisplay(iso);
    });

    // Select all on focus
    input.addEventListener('focus', () => {
      setTimeout(() => input.select && input.select(), 0);
    });
  }

  function attachAll(selector) {
    document.querySelectorAll(selector).forEach(attach);
  }

  UI.dateInput = { attach, attachAll, read, format: formatDisplay };
})(typeof window !== 'undefined' ? window : globalThis);
