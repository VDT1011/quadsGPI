/**
 * QPC POY Engine — Validation
 *
 * Public:
 *   QPE.validate.event(e)            → { ok, errors[] }
 *   QPE.validate.result(r, event?)   → { ok, errors[] }
 */
(function (global) {
  'use strict';
  const QPE = global.QPE;

  const VALID_TIERS = ['championship', 'high_roller', 'mid_stakes', 'side'];  // defaults; custom tiers also accepted
  const VALID_STATUS = ['scheduled', 'running', 'completed', 'cancelled'];

  QPE.validate.event = function (e) {
    const errors = [];
    if (!e || typeof e !== 'object') return { ok: false, errors: ['Event not an object'] };
    if (!e.id || typeof e.id !== 'string') errors.push('Missing id');
    if (!e.name || typeof e.name !== 'string') errors.push('Missing name');
    // Tier: accept any non-empty string (custom tiers allowed). Engine returns 0 multiplier if unknown.
    if (!e.tier || typeof e.tier !== 'string') errors.push('Missing tier');
    if (e.status !== undefined && !VALID_STATUS.includes(e.status)) errors.push('Invalid status');
    if (e.buyin_listed !== undefined && !(e.buyin_listed >= 0)) errors.push('buyin_listed must be ≥ 0');
    if (e.itm_cutoff !== undefined) {
      if (!Number.isFinite(e.itm_cutoff) || e.itm_cutoff < 0) {
        errors.push('itm_cutoff must be ≥ 0');
      }
      if (e.status === 'completed' && !(e.itm_cutoff > 0)) {
        errors.push('itm_cutoff must be > 0 for completed event');
      }
    }
    if (e.prizepool_actual !== undefined && !(e.prizepool_actual >= 0)) {
      errors.push('prizepool_actual must be ≥ 0');
    }
    return { ok: errors.length === 0, errors };
  };

  QPE.validate.result = function (r, event) {
    const errors = [];
    if (!r || typeof r !== 'object') return { ok: false, errors: ['Result not an object'] };
    if (!r.player_name || typeof r.player_name !== 'string') errors.push('Missing player_name');
    if (typeof r.rank !== 'number' || !Number.isFinite(r.rank) || r.rank < 1) {
      errors.push('rank must be positive number');
    }
    if (event && event.itm_cutoff > 0 && r.rank > event.itm_cutoff) {
      errors.push('rank > itm_cutoff');
    }
    return { ok: errors.length === 0, errors };
  };

  QPE.validate.VALID_TIERS = VALID_TIERS;
  QPE.validate.VALID_STATUS = VALID_STATUS;
})(typeof window !== 'undefined' ? window : globalThis);
