/**
 * QPC POY — Tab switching with dropdown group support
 *
 * HTML structure:
 *   <div id="tabs">
 *     <div class="tab" data-tab="bxh">Bảng XH</div>
 *
 *     <div class="tab-group" data-group="config">
 *       <div class="tab-group-header">Cấu hình ▾</div>
 *       <div class="dropdown">
 *         <a class="dropdown-item" data-tab="series">Series</a>
 *         <a class="dropdown-item" data-tab="events">Events</a>
 *       </div>
 *     </div>
 *   </div>
 *
 * Public:
 *   QPE_UI.tabs.init()
 *   QPE_UI.tabs.switchTo(name)
 *   QPE_UI.tabs.current()
 *   QPE_UI.tabs.onSwitch(fn)
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  let currentTab = 'series';
  const listeners = [];

  function switchTo(name) {
    currentTab = name;

    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    document.querySelectorAll('.dropdown-item').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    document.querySelectorAll('.tab-group').forEach(g => {
      const hasActive = !!g.querySelector('.dropdown-item.active');
      g.classList.toggle('has-active', hasActive);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === 'tab-' + name);
    });

    // Close any open dropdowns after navigation
    document.querySelectorAll('.tab-group.open').forEach(g => g.classList.remove('open'));

    try { localStorage.setItem('qpc_last_tab', name); } catch (_) {}
    for (const fn of listeners) {
      try { fn(name); } catch (e) { console.error(e); }
    }
  }

  function init() {
    const bar = document.getElementById('tabs');
    if (!bar) return;

    bar.addEventListener('click', (e) => {
      // Group header click → toggle dropdown
      const header = e.target.closest('.tab-group-header');
      if (header) {
        e.stopPropagation();
        const group = header.closest('.tab-group');
        document.querySelectorAll('.tab-group.open').forEach(g => {
          if (g !== group) g.classList.remove('open');
        });
        group.classList.toggle('open');
        return;
      }

      // Dropdown item or top-level tab
      const tab = e.target.closest('.tab[data-tab], .dropdown-item[data-tab]');
      if (tab) switchTo(tab.dataset.tab);
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-group')) {
        document.querySelectorAll('.tab-group.open').forEach(g => g.classList.remove('open'));
      }
    });

    // Esc closes dropdowns
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.tab-group.open').forEach(g => g.classList.remove('open'));
      }
    });

    // Restore last tab
    try {
      const last = localStorage.getItem('qpc_last_tab');
      if (last && document.querySelector(`[data-tab="${last}"]`)) {
        switchTo(last);
      } else {
        switchTo(currentTab);
      }
    } catch (_) {
      switchTo(currentTab);
    }
  }

  UI.tabs = {
    init,
    switchTo,
    current: () => currentTab,
    onSwitch: (fn) => { if (typeof fn === 'function') listeners.push(fn); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
