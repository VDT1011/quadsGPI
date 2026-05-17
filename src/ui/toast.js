/**
 * QPC POY — Toast notifications
 *
 * Public:
 *   QPE_UI.toast.show(message, variant?, duration?)
 *     variant: 'success' (default) | 'danger' | 'warning' | 'info'
 *     duration: ms (default 3000)
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  function containerEl() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  UI.toast = {
    show(message, variant, duration) {
      variant = variant || 'success';
      duration = duration || 3000;
      const div = document.createElement('div');
      div.className = 'toast toast-' + variant;
      div.textContent = message;
      div.addEventListener('click', () => div.remove());
      containerEl().appendChild(div);
      setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.2s';
        setTimeout(() => div.remove(), 220);
      }, duration);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
