/**
 * QPC POY Engine — Event helpers
 *
 * Public:
 *   QPE.event.computePP(event) → suggested prizepool_actual based on overlay policy
 */
(function (global) {
  'use strict';
  const QPE = global.QPE;

  /**
   * Compute prizepool_actual based on overlay policy.
   *
   * Priority:
   *   1. If event.prizepool_actual already set (>0), return as-is.
   *   2. If overlay_covered=true: PP = max(gtd_vnd, sum_buyins_net)
   *   3. If overlay_covered=false: PP = sum_buyins_net (or 0)
   */
  QPE.event.computePP = function (event) {
    if (!event) return 0;
    if (Number.isFinite(event.prizepool_actual) && event.prizepool_actual > 0) {
      return event.prizepool_actual;
    }
    const gtd = event.gtd_vnd || 0;
    const buyins = event.sum_buyins_net || 0;
    if (event.overlay_covered) {
      return Math.max(gtd, buyins);
    }
    return buyins;
  };
})(typeof window !== 'undefined' ? window : globalThis);
