/**
 * QPC POY Engine — Scoring functions
 *
 * Core formula:  P = K × √(PP_M) × Pos(rank, ITM) × TierMult(tier)
 *
 * Public:
 *   QPE.scoring.posLog(rank, itm)         → number in [0, 1]
 *   QPE.scoring.tierMult(tier, settings?) → number ≥ 0
 *   QPE.scoring.calcPoints(event, result, settings?) → integer ≥ 0
 */
(function (global) {
  'use strict';
  const QPE = global.QPE;

  /**
   * Logarithmic position curve.
   *   Pos(rank, ITM) = log₁₀(ITM/rank + 1) / log₁₀(ITM + 1)
   *
   *   Pos(1, ITM)   = 1.0   (champion = 100%)
   *   Pos(ITM, ITM) ≈ 0.18–0.40 (min cash)
   *   rank > ITM    → 0     (bubble out)
   */
  QPE.scoring.posLog = function (rank, itm) {
    if (!(rank > 0) || !(itm > 0)) return 0;
    if (rank > itm) return 0;
    return Math.log10(itm / rank + 1) / Math.log10(itm + 1);
  };

  /**
   * Tier multiplier lookup. Falls back to CONST.TIER_MULT.
   * Admin can override via settings.tierMult.{tier}.
   */
  QPE.scoring.tierMult = function (tier, settings) {
    if (typeof tier !== 'string') return 0;
    const override = settings && settings.tierMult && settings.tierMult[tier];
    if (typeof override === 'number') return override;
    const def = QPE.CONST.TIER_MULT[tier];
    return typeof def === 'number' ? def : 0;
  };

  /**
   * Compute points for a single (event, result) pair.
   *
   * Returns 0 if:
   *   - event is satellite, cancelled, or invalid PP
   *   - rank > ITM (bubble out)
   *   - tier unknown
   */
  QPE.scoring.calcPoints = function (event, result, settings) {
    if (!event || !result) return 0;
    if (event.is_satellite) return 0;
    if (event.status === 'cancelled') return 0;
    if (!(event.prizepool_actual > 0)) return 0;
    if (!(result.rank > 0) || !(event.itm_cutoff > 0)) return 0;
    if (result.rank > event.itm_cutoff) return 0;

    const K = (settings && settings.K) || QPE.CONST.K;
    const PP_M = event.prizepool_actual / 1_000_000;
    const pos = QPE.scoring.posLog(result.rank, event.itm_cutoff);
    const mult = QPE.scoring.tierMult(event.tier, settings);

    if (pos <= 0 || mult <= 0) return 0;
    return Math.round(K * Math.sqrt(PP_M) * pos * mult);
  };
})(typeof window !== 'undefined' ? window : globalThis);
