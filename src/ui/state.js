/**
 * QPC POY — State & Storage layer
 *
 * Global state shape:
 *   {
 *     version: 1,
 *     events:  [Event...],
 *     players: [Player...],
 *     results: [Result...],
 *     settings: { K, tierMult, minCash, hrBuyinThreshold }
 *   }
 *
 * Persists to LocalStorage under 'quads_qpc_2026'.
 *
 * Public:
 *   QPE_APP.state                — live state (read or mutate then call save)
 *   QPE_APP.load()               — load from LocalStorage (called on init)
 *   QPE_APP.save()               — persist to LocalStorage + update saved-status
 *   QPE_APP.reset()              — wipe state, fresh start
 *   QPE_APP.export()             — return JSON string for download
 *   QPE_APP.import(json)         — replace state from JSON (validates schema)
 *   QPE_APP.seedQPC2026()        — load seed events (only if events empty)
 *
 *   QPE_APP.subscribe(fn)        — register re-render callback (called after save)
 *   QPE_APP.notify()             — manually trigger subscribers
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'quads_qpc_2026';
  const SCHEMA_VERSION = 1;

  const APP = {};

  // ─── Initial empty state ────────────────────────────────
  function emptyState() {
    return {
      version: SCHEMA_VERSION,
      series:  [],   // [Series...] — wraps events, enables Annual POY in v2.0
      events:  [],
      players: [],
      results: [],
      settings: {
        K: 100,
        tierMult: {},  // overrides: { side: 0.3, ... } — empty = use defaults
        minCash: {},   // { overall: 3, womens: 2, high_roller: 3 }
        hrBuyinThreshold: 30_000_000
      },
      meta: {
        last_saved: null
      }
    };
  }

  APP.state = emptyState();

  // ─── Subscribers (re-render hooks) ──────────────────────
  const subscribers = [];

  APP.subscribe = function (fn) {
    if (typeof fn === 'function') subscribers.push(fn);
  };

  APP.notify = function () {
    for (const fn of subscribers) {
      try { fn(APP.state); }
      catch (err) { console.error('subscriber error:', err); }
    }
  };

  // ─── LocalStorage ───────────────────────────────────────
  APP.load = function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      APP.state = migrate(parsed);
      return true;
    } catch (err) {
      console.warn('Failed to load state from LocalStorage:', err);
      return false;
    }
  };

  APP.save = function () {
    APP.state.meta = APP.state.meta || {};
    APP.state.meta.last_saved = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(APP.state));
    } catch (err) {
      console.error('Failed to save state:', err);
      if (typeof QPE_UI !== 'undefined' && QPE_UI.toast) {
        QPE_UI.toast.show('Không lưu được state — LocalStorage có thể đã đầy.', 'danger');
      }
      return false;
    }
    APP.notify();
    return true;
  };

  APP.reset = function () {
    APP.state = emptyState();
    APP.save();
  };

  APP.export = function () {
    return JSON.stringify(APP.state, null, 2);
  };

  APP.import = function (json) {
    let parsed;
    try { parsed = JSON.parse(json); }
    catch (err) { throw new Error('JSON không hợp lệ: ' + err.message); }
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON không phải object');
    APP.state = migrate(parsed);
    APP.save();
  };

  // ─── Schema migration (v0 → current) ────────────────────
  function migrate(state) {
    const out = emptyState();
    if (Array.isArray(state.series))  out.series  = state.series;
    if (Array.isArray(state.events))  out.events  = state.events;
    if (Array.isArray(state.players)) out.players = state.players;
    if (Array.isArray(state.results)) out.results = state.results;
    if (state.settings && typeof state.settings === 'object') {
      Object.assign(out.settings, state.settings);
    }
    if (state.meta) out.meta = state.meta;
    out.version = SCHEMA_VERSION;

    // Auto-migrate events without series_id → assign to default series
    const orphans = out.events.filter(e => !e.series_id);
    if (orphans.length > 0) {
      let defaultSeries = out.series.find(s => s.tier === 'flagship');
      if (!defaultSeries) {
        defaultSeries = {
          id: 'qpc_2026_1',
          name: 'Quads Poker Championship I',
          short_name: 'QPC I',
          year: 2026,
          date_start: '2026-06-17',
          date_end:   '2026-06-29',
          tier: 'flagship',
          multiplier: 1.00,
          status: 'scheduled'
        };
        out.series.unshift(defaultSeries);
      }
      for (const e of orphans) e.series_id = defaultSeries.id;
    }

    return out;
  }

  // ─── Seed QPC 2026 events ───────────────────────────────
  /**
   * Bulk add events to a series.
   * eventsToAdd: array of partial event objects (will be assigned id + series_id).
   * mode: 'append' (default) or 'replace' (delete existing events in series)
   * Returns { added: number, replaced: number, skipped: number }
   */
  APP.bulkAddEvents = function (seriesId, eventsToAdd, mode) {
    mode = mode || 'append';
    const stats = { added: 0, replaced: 0, skipped: 0 };

    if (mode === 'replace') {
      const removed = APP.state.events.filter(e => e.series_id === seriesId);
      stats.replaced = removed.length;
      // Also remove their results
      const removedIds = new Set(removed.map(e => e.id));
      APP.state.events = APP.state.events.filter(e => e.series_id !== seriesId);
      APP.state.results = APP.state.results.filter(r => !removedIds.has(r.event_id));
    }

    const existingIds = new Set(APP.state.events.map(e => e.id));

    for (const ev of eventsToAdd) {
      // Generate unique id if not provided
      let id = ev.id;
      if (!id) {
        const slug = (ev.code || ev.name || 'evt').toLowerCase()
          .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
        id = slug + '_' + Math.random().toString(36).slice(2, 6);
      }
      if (existingIds.has(id)) {
        stats.skipped++;
        continue;
      }
      existingIds.add(id);
      APP.state.events.push({
        id,
        series_id: seriesId,
        code: ev.code || '',
        name: ev.name || 'Untitled',
        tier: ev.tier || 'side',
        is_womens: !!ev.is_womens,
        is_multi_flight: !!ev.is_multi_flight,
        date_start: ev.date_start || '',
        date_end: ev.date_end || ev.date_start || '',
        buyin_listed: ev.buyin_listed || 0,
        is_satellite: false,
        status: 'scheduled',
        gtd_vnd: ev.gtd_vnd || 0,
        prizepool_actual: 0,
        overlay_covered: true,
        entries_total: 0,
        unique_players: 0,
        itm_cutoff: ev.itm_cutoff || 0
      });
      stats.added++;
    }

    APP.save();
    return stats;
  };

  APP.seedQPC2026 = function () {
    if (typeof QPE_SEED === 'undefined' || !QPE_SEED.qpc2026) {
      throw new Error('QPE_SEED.qpc2026 not loaded');
    }
    const seed = QPE_SEED.qpc2026;
    // Deep clone to avoid mutating the seed module
    const series = JSON.parse(JSON.stringify(seed.series));
    const events = JSON.parse(JSON.stringify(seed.events));

    // Replace existing QPC I series if present, else add
    APP.state.series = APP.state.series.filter(s => s.id !== series.id);
    APP.state.series.unshift(series);

    // Replace all events
    APP.state.events = events;

    APP.save();
  };

  // ─── Players helpers ────────────────────────────────────
  /**
   * Find or create a player by name (NFC + case-insensitive match against name + aliases).
   * Optionally accepts country (ISO code) and display_id; fills if player doesn't have them yet.
   */
  APP.findOrCreatePlayer = function (rawName, opts) {
    opts = opts || {};
    const name = QPE.parse.normalizeName(rawName);
    if (!name) return null;
    const key = name.toLowerCase();
    let player = APP.state.players.find(p =>
      QPE.parse.normalizeName(p.name).toLowerCase() === key ||
      (p.aliases || []).some(a => QPE.parse.normalizeName(a).toLowerCase() === key)
    );
    if (player) {
      // Backfill optional fields if not set
      if (opts.country && !player.country) player.country = QPE.utils.normalizeCountry(opts.country);
      if (opts.display_id && !player.display_id) player.display_id = String(opts.display_id).trim();
      return player;
    }
    player = {
      id: QPE.utils.uuid(),
      name,
      aliases: [],
      notes: '',
      country: opts.country ? QPE.utils.normalizeCountry(opts.country) : '',
      display_id: opts.display_id ? String(opts.display_id).trim() : ''
    };
    APP.state.players.push(player);
    return player;
  };

  global.QPE_APP = APP;
})(typeof window !== 'undefined' ? window : globalThis);
