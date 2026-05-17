/**
 * QPC POY — App entry point
 *
 * Load order (set in index.html):
 *   1. engine/* (pure logic)
 *   2. seed/*
 *   3. ui/state.js, toast.js, modal.js, tabs.js, *-tab.js
 *   4. ui/app.js (this file) — runs init on DOMContentLoaded
 */
(function (global) {
  'use strict';

  function init() {
    // 1. Load state from LocalStorage
    QPE_APP.load();

    // 2. Init tabs
    QPE_UI.tabs.init();

    // 3. Init each tab
    if (QPE_UI.series && QPE_UI.series.init) QPE_UI.series.init();
    if (QPE_UI.events && QPE_UI.events.init) QPE_UI.events.init();
    if (QPE_UI.results && QPE_UI.results.init) QPE_UI.results.init();
    if (QPE_UI.leaderboards && QPE_UI.leaderboards.init) QPE_UI.leaderboards.init();
    if (QPE_UI.annual && QPE_UI.annual.init) QPE_UI.annual.init();
    if (QPE_UI.players && QPE_UI.players.init) QPE_UI.players.init();
    if (QPE_UI.settings && QPE_UI.settings.init) QPE_UI.settings.init();

    // Init cloud sync (pulls on boot if configured, starts auto-sync)
    if (typeof QPE_SYNC !== 'undefined') {
      // Slight delay so all UI subscriptions are wired before pull triggers re-render
      setTimeout(() => { try { QPE_SYNC.init(); } catch (e) { console.warn(e); } }, 100);
    }

    // 4. Update saved-status indicator
    updateSavedStatus();
    QPE_APP.subscribe(updateSavedStatus);

    console.log('QPC POY ready. State:', {
      events: QPE_APP.state.events.length,
      results: QPE_APP.state.results.length,
      players: QPE_APP.state.players.length
    });
  }

  function updateSavedStatus() {
    const el = document.getElementById('saved-status');
    if (!el) return;
    const ls = QPE_APP.state.meta && QPE_APP.state.meta.last_saved;
    if (ls) {
      const t = new Date(ls);
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      el.textContent = `Saved ${hh}:${mm}`;
    } else {
      el.textContent = `${QPE_APP.state.events.length} events`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
