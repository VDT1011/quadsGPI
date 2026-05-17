/**
 * QPC POY Engine — Namespace & Constants
 *
 * Defines window.QPE root namespace + tunable defaults.
 * Load FIRST before all other engine modules.
 */
(function (global) {
  'use strict';

  const QPE = {};

  QPE.CONST = {
    K: 100,
    TIER_MULT: {
      championship: 1.00,
      high_roller:  1.00,
      mid_stakes:   0.60,
      side:         0.30
    },
    MIN_CASH: {
      overall:     1,   // 1 = accept one-shot wonder; raise to enforce consistency
      womens:      1,
      high_roller: 1
    },
    HR_BUYIN_THRESHOLD: 30_000_000  // VND
  };

  // Sub-namespaces (populated by other modules)
  QPE.scoring     = {};
  QPE.leaderboard = {};
  QPE.event       = {};
  QPE.parse       = {};
  QPE.validate    = {};
  QPE.utils       = {};

  global.QPE = QPE;
})(typeof window !== 'undefined' ? window : globalThis);
