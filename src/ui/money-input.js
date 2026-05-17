/**
 * QPC POY — Money input formatter
 *
 * Live-format VND number inputs with thousands separators ("25,000,000").
 * Supports shortcut suffixes K / M / B (expanded on blur).
 *
 * Public:
 *   QPE_UI.money.attach(input)        — attach formatter to existing <input>
 *   QPE_UI.money.attachAll(selector)  — attach to all matching inputs
 *   QPE_UI.money.read(input)          — read parsed number from input value
 *
 * Usage:
 *   <input class="money-input" type="text" value="25000000">
 *   QPE_UI.money.attach(input);
 *
 * Live behavior:
 *   - User types digits → live formatted "25,000,000"
 *   - Cursor position preserved by counting digits before cursor
 *   - On blur, "25M" → "25,000,000" auto-expanded
 *   - Empty / invalid → empty string
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  function format(n) {
    if (!Number.isFinite(n) || n === 0) return '';
    return n.toLocaleString('vi-VN');  // 25.000.000
  }

  // Delegate to engine parser — accepts both VN (25.000.000) and EN (25,000,000) formats,
  // plus K/M/B shortcuts with either decimal separator.
  function parseRaw(str) {
    return QPE.utils.parseVnd(str);
  }

  function attach(input) {
    if (!input || input.dataset.moneyAttached === '1') return;
    input.dataset.moneyAttached = '1';
    input.classList.add('money-input');

    // Initial format (in case value is a raw number)
    if (input.value) {
      const n = parseRaw(input.value);
      if (n > 0) input.value = format(n);
    }

    input.addEventListener('input', () => {
      const oldVal = input.value;
      const oldStart = input.selectionStart;

      // Count digits before cursor
      const digitsBefore = oldVal.slice(0, oldStart).replace(/[^\d]/g, '').length;

      // Strip non-digits (keep K/M/B for blur-time expansion)
      const hasSuffix = /[KMB]$/i.test(oldVal.trim());
      if (hasSuffix) return;  // let user finish typing suffix

      const rawDigits = oldVal.replace(/[^\d]/g, '');
      if (!rawDigits) { input.value = ''; return; }

      const n = parseInt(rawDigits, 10);
      const newVal = format(n);
      input.value = newVal;

      // Restore cursor: position after Nth digit in new value
      let count = 0, pos = 0;
      for (; pos < newVal.length; pos++) {
        if (/\d/.test(newVal[pos])) {
          count++;
          if (count === digitsBefore) { pos++; break; }
        }
      }
      try { input.setSelectionRange(pos, pos); } catch (_) {}
    });

    // On blur: expand shortcuts like "25M" → "25,000,000"
    input.addEventListener('blur', () => {
      const n = parseRaw(input.value);
      input.value = n > 0 ? format(n) : '';
    });

    // On focus: select all (easier to overwrite)
    input.addEventListener('focus', () => {
      setTimeout(() => input.select && input.select(), 0);
    });
  }

  function attachAll(selector) {
    document.querySelectorAll(selector).forEach(attach);
  }

  function read(input) {
    if (!input) return 0;
    return parseRaw(input.value);
  }

  UI.money = { attach, attachAll, read, format, parse: parseRaw };
})(typeof window !== 'undefined' ? window : globalThis);
