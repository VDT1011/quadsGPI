/**
 * QPC POY Engine — Leaderboard aggregation
 *
 * Public:
 *   QPE.leaderboard.tieBreak(a, b)          → Array.sort comparator
 *   QPE.leaderboard.compute(state, scope, settings?) → sorted entries
 *
 * scope: 'overall' | 'high_roller' | 'womens'
 */
(function (global) {
  'use strict';
  const QPE = global.QPE;

  /**
   * Comparator for leaderboard entries.
   * Order: final_total > events_cashed > best_rank (asc) > total_prize_vnd
   */
  QPE.leaderboard.tieBreak = function (a, b) {
    if (a.final_total !== b.final_total) return b.final_total - a.final_total;
    if (a.events_cashed !== b.events_cashed) return b.events_cashed - a.events_cashed;
    const aRank = (a.tie_break_data && a.tie_break_data.best_rank) || Infinity;
    const bRank = (b.tie_break_data && b.tie_break_data.best_rank) || Infinity;
    if (aRank !== bRank) return aRank - bRank;
    const aPrize = (a.tie_break_data && a.tie_break_data.total_prize_vnd) || 0;
    const bPrize = (b.tie_break_data && b.tie_break_data.total_prize_vnd) || 0;
    if (aPrize !== bPrize) return bPrize - aPrize;
    return 0;
  };

  /**
   * Merge series-level minCash override into settings.
   * Used so each series can have its own eligibility threshold.
   *   effectiveSettings = settings + (series.minCash overrides specific scope keys)
   */
  QPE.leaderboard.effectiveSettings = function (settings, series) {
    if (!series || !series.minCash) return settings || {};
    return Object.assign({}, settings, {
      minCash: Object.assign({}, (settings && settings.minCash) || {}, series.minCash)
    });
  };

  /**
   * Compute leaderboard for a given scope.
   *
   * state: { events: [...], players: [...], results: [...] }
   * scope: 'overall' | 'high_roller' | 'womens'
   *
   * Algorithm:
   *   1. Filter events by scope (also skip cancelled / satellite)
   *   2. Keep best-rank result per (player, event) — re-entry handling
   *   3. Compute points via scoring.calcPoints
   *   4. Aggregate per player: sum + by_tier + cashes + best_finish + prize
   *   5. Apply eligibility threshold
   *   6. Sort via tieBreak
   */
  QPE.leaderboard.compute = function (state, scope, settings) {
    if (!state) return [];
    scope = scope || 'overall';
    settings = settings || {};

    const events = state.events || [];
    const results = state.results || [];

    // Build event lookup
    const eventMap = {};
    for (const e of events) eventMap[e.id] = e;

    const hrThreshold = settings.hrBuyinThreshold || QPE.CONST.HR_BUYIN_THRESHOLD;
    const minCashConfig = settings.minCash || {};
    // Fallback chain: settings.minCash[scope] → CONST.MIN_CASH[scope] → 1
    const minCashForScope = (minCashConfig[scope] !== undefined)
      ? minCashConfig[scope]
      : (QPE.CONST.MIN_CASH[scope] !== undefined ? QPE.CONST.MIN_CASH[scope] : 1);

    function inScope(e) {
      if (!e || e.status === 'cancelled' || e.is_satellite) return false;
      if (scope === 'high_roller') return (e.buyin_listed || 0) >= hrThreshold;
      if (scope === 'womens') return !!e.is_womens;
      return true;  // overall
    }

    // Step 1+2: filter + best per (player, event)
    const bestByKey = {};  // playerId + ':' + eventId → best result
    for (const r of results) {
      const e = eventMap[r.event_id];
      if (!inScope(e)) continue;
      if (!(r.rank > 0) || r.rank > (e.itm_cutoff || 0)) continue;
      const key = (r.player_id || r.player_name) + ':' + r.event_id;
      const existing = bestByKey[key];
      if (!existing || r.rank < existing.rank) {
        bestByKey[key] = r;
      }
    }

    // Step 3+4: aggregate per player
    const playerAgg = {};
    for (const key in bestByKey) {
      const r = bestByKey[key];
      const e = eventMap[r.event_id];
      const points = QPE.scoring.calcPoints(e, r, settings);
      if (points <= 0) continue;

      const pid = r.player_id || r.player_name;
      if (!playerAgg[pid]) {
        playerAgg[pid] = {
          player_id: pid,
          player_name: r.player_name,
          final_total: 0,
          by_tier: { championship: 0, high_roller: 0, mid_stakes: 0, side: 0 },
          events_cashed: 0,
          best_finish: null,
          tie_break_data: { best_rank: Infinity, total_prize_vnd: 0 },
          results: []
        };
      }
      const agg = playerAgg[pid];
      agg.final_total += points;
      if (e.tier && agg.by_tier[e.tier] !== undefined) {
        agg.by_tier[e.tier] += points;
      }
      agg.events_cashed += 1;
      agg.tie_break_data.total_prize_vnd += (r.prize_vnd || 0);
      if (r.rank < agg.tie_break_data.best_rank) {
        agg.tie_break_data.best_rank = r.rank;
      }
      const resultEntry = {
        event_id: r.event_id,
        event_name: e.name,
        tier: e.tier,
        rank: r.rank,
        points,
        prize_vnd: r.prize_vnd || 0
      };
      agg.results.push(resultEntry);
      if (!agg.best_finish || points > agg.best_finish.points) {
        agg.best_finish = resultEntry;
      }
    }

    // Include players with 0 valid results in scope (shown as not eligible)
    for (const p of (state.players || [])) {
      if (!playerAgg[p.id]) {
        playerAgg[p.id] = {
          player_id: p.id,
          player_name: p.name,
          final_total: 0,
          by_tier: { championship: 0, high_roller: 0, mid_stakes: 0, side: 0 },
          events_cashed: 0,
          best_finish: null,
          tie_break_data: { best_rank: Infinity, total_prize_vnd: 0 },
          results: []
        };
      }
    }

    // Step 5: eligibility
    const entries = Object.values(playerAgg);
    for (const e of entries) {
      e.is_eligible = e.events_cashed >= minCashForScope;
    }

    // Step 6: sort
    entries.sort(QPE.leaderboard.tieBreak);
    return entries;
  };
})(typeof window !== 'undefined' ? window : globalThis);
