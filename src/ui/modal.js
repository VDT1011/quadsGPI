/**
 * QPC POY — Modal helper
 *
 * Public:
 *   QPE_UI.modal.open({ title, body, footer, onClose? })
 *     - body / footer: HTML string OR DOM node
 *     - returns { close }
 *   QPE_UI.modal.close()
 *   QPE_UI.modal.confirm(message, { title?, danger? }) → Promise<boolean>
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  let current = null;

  function appendChildOrHTML(parent, content) {
    if (content == null) return;
    if (typeof content === 'string') {
      const wrap = document.createElement('div');
      wrap.innerHTML = content;
      while (wrap.firstChild) parent.appendChild(wrap.firstChild);
    } else if (content instanceof Node) {
      parent.appendChild(content);
    }
  }

  function open(opts) {
    opts = opts || {};
    close();  // close any previous

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    backdrop.appendChild(modal);

    if (opts.title) {
      const head = document.createElement('div');
      head.className = 'modal-header';
      const title = document.createElement('h2');
      title.className = 'modal-title';
      title.textContent = opts.title;
      const close = document.createElement('button');
      close.className = 'modal-close';
      close.innerHTML = '✕';
      close.addEventListener('click', () => UI.modal.close());
      head.appendChild(title);
      head.appendChild(close);
      modal.appendChild(head);
    }

    if (opts.body) {
      const body = document.createElement('div');
      body.className = 'modal-body';
      appendChildOrHTML(body, opts.body);
      modal.appendChild(body);
    }

    if (opts.footer) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      appendChildOrHTML(footer, opts.footer);
      modal.appendChild(footer);
    }

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) UI.modal.close();
    });

    document.body.appendChild(backdrop);
    const previousFocus = document.activeElement;
    current = { backdrop, modal, onClose: opts.onClose, previousFocus };

    // Focus trap: focus first focusable element, cycle Tab within modal
    const focusables = () => Array.from(modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
    const first = focusables()[0];
    if (first) setTimeout(() => first.focus(), 0);

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const active = document.activeElement;
      const idx = f.indexOf(active);
      if (e.shiftKey) {
        if (idx <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      } else {
        if (idx === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });

    return { close: () => UI.modal.close() };
  }

  function close() {
    if (!current) return;
    const { backdrop, onClose, previousFocus } = current;
    current = null;
    backdrop.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') {
      try { previousFocus.focus(); } catch (_) {}
    }
    if (typeof onClose === 'function') onClose();
  }

  function confirm(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      // Promise can only settle once — first resolve() wins, subsequent calls ignored.
      // We must call resolve(true/false) BEFORE close(), because close() fires onClose
      // which would otherwise resolve(false) first and lock the result.
      const body = document.createElement('div');
      body.innerHTML = `<p style="font-size: 15px; line-height: 1.5;">${escapeHtml(message)}</p>`;

      const footer = document.createElement('div');
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-ghost';
      cancel.textContent = 'Huỷ';
      cancel.addEventListener('click', () => { resolve(false); close(); });

      const ok = document.createElement('button');
      ok.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
      ok.textContent = opts.okText || 'Xác nhận';
      ok.addEventListener('click', () => { resolve(true); close(); });

      footer.appendChild(cancel);
      footer.appendChild(ok);

      open({
        title: opts.title || 'Xác nhận',
        body,
        footer,
        onClose: () => resolve(false)  // backdrop click / Esc — ignored if already settled
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current) UI.modal.close();
  });

  UI.modal = { open, close, confirm };
})(typeof window !== 'undefined' ? window : globalThis);
