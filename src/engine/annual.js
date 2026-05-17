/**
 * QPC POY Engine — Annual POY (cross-series)
 *
 * Aggregates Series POY ranks into a yearly leaderboard.
 *
 *   AnnualMP(player) = Σ across series:
 *     MP_TABLE[series_rank_overall] × SeriesMultiplier(series.tier)
 *
 * Only eligible players (≥ min_cash in that series) earn MP.
 * Top 50 of each series get MP; rank > 50 → 0.
 *
 * Public:
 *   QPE.annual.masterPoints(rank, table?)        → MP for rank
 *   QPE.annual.seriesMP(series, leaderboard, table?) → [{ player, mp_weighted, series_rank, ... }]
 *   QPE.annual.compute(state, opts?)             → [{ player, annual_mp, by_series, ... }]
 *     opts: { year?: number, settings? }
 */
(function (global) {
  'use strict';
  const QPE = global.QPE;

  // ─── Default Master Points table (index = rank, 1–50) ───
  // Logarithmic decay, normalized so rank-1 = 1000.
  // Generated from MP[r] = round(1000 × log10(50/r + 1) / log10(51)) with manual smoothing.
  const DEFAULT_MP_TABLE = [
    /*  0 */ 0,
    /*  1 */ 1000, /*  2 */ 700,  /*  3 */ 550,  /*  4 */ 450,  /*  5 */ 380,
    /*  6 */ 330,  /*  7 */ 290,  /*  8 */ 250,  /*  9 */ 220,  /* 10 */ 195,
    /* 11 */ 175,  /* 12 */ 160,  /* 13 */ 145,  /* 14 */ 135,  /* 15 */ 125,
    /* 16 */ 115,  /* 17 */ 108,  /* 18 */ 100,  /* 19 */ 95,   /* 20 */ 90,
    /* 21 */ 88,   /* 22 */ 85,   /* 23 */ 83,   /* 24 */ 82,   /* 25 */ 80,
    /* 26 */ 75,   /* 27 */ 71,   /* 28 */ 67,   /* 29 */ 64,   /* 30 */ 60,
    /* 31 */ 57,   /* 32 */ 54,   /* 33 */ 51,   /* 34 */ 48,   /* 35 */ 45,
    /* 36 */ 42,   /* 37 */ 39,   /* 38 */ 37,   /* 39 */ 35,   /* 40 */ 33,
    /* 41 */ 31,   /* 42 */ 29,   /* 43 */ 27,   /* 44 */ 25,   /* 45 */ 23,
    /* 46 */ 21,   /* 47 */ 19,   /* 48 */ 17,   /* 49 */ 16,   /* 50 */ 15
  ];

  QPE.annual = {};
  QPE.annual.DEFAULT_MP_TABLE = DEFAULT_MP_TABLE;

  /**
   * Master Points lookup by rank.
   * rank > 50 or invalid → 0.
   */
  QPE.annual.masterPoints = function (rank, table) {
    const t = (Array.isArray(table) && table.length >= 51) ? table : DEFAULT_MP_TABLE;
    if (!Number.isFinite(rank) || rank < 1 || rank > 50) return 0;
    return t[Math.floor(rank)] || 0;
  };

  /**
   * Build a state sub-view containing only events of one series.
   * Used internally by compute().
   */
  function seriesSubState(state, seriesId) {
    return {
      events:  (state.events  || []).filter(e => e.series_id === seriesId),
      players: state.players  || [],
      results: state.results  || [],
      settings: state.settings || {}
    };
  }

  /**
   * Compute MP earned by each player in a single series.
   * Returns array of { player_id, player_name, series_rank, mp, mp_weighted }.
   */
  QPE.annual.seriesMP = function (series, leaderboard, table) {
    const t = (Array.isArray(table) && table.length >= 51) ? table : DEFAULT_MP_TABLE;
    const mult = (series && Number.isFinite(series.multiplier)) ? series.multiplier : 1.0;
    const out = [];

    // The leaderboard from QPE.leaderboard.compute is already sorted desc by points.
    // series_rank = position in eligible-only sequence? No — official rank includes ineligible.
    // Per SPEC §11.3: only ELIGIBLE players earn MP. So we count by index over eligible-only list,
    // because rank-1 by points might be non-eligible (one-shot wonder).
    // → Filter eligible first, then rank-by-index.
    const eligible = (leaderboard || []).filter(e => e.is_eligible);

    for (let i = 0; i < eligible.length && i < 50; i++) {
      const entry = eligible[i];
      const seriesRank = i + 1;
      const mp = t[seriesRank] || 0;
      if (mp <= 0) continue;
      out.push({
        player_id: entry.player_id,
        player_name: entry.player_name,
        series_rank: seriesRank,
        mp: mp,
        mp_weighted: Math.round(mp * mult)
      });
    }
    return out;
  };

  /**
   * Compute Annual leaderboard across all series.
   *
   * opts: { year?: number, table?, settings? }
   *   year — filter series by .year; if omitted, includes all series
   *
   * Returns sorted entries with breakdown by series.
   */
  QPE.annual.compute = function (state, opts) {
    opts = opts || {};
    if (!state || !Array.isArray(state.series)) return [];

    const table = opts.table || (state.settings && state.settings.mpTable) || DEFAULT_MP_TABLE;
    const settings = opts.settings || state.settings || {};

    let seriesList = state.series.slice();
    if (Number.isFinite(opts.year)) {
      seriesList = seriesList.filter(s => s.year === opts.year);
    }

    const playerMap = {};

    for (const s of seriesList) {
      const subState = seriesSubState(state, s.id);
      if (subState.events.length === 0) continue;

      // Use series-specific minCash override if present
      const seriesSettings = QPE.leaderboard.effectiveSettings(settings, s);
      const lb = QPE.leaderboard.compute(subState, 'overall', seriesSettings);
      const earnings = QPE.annual.seriesMP(s, lb, table);

      for (const e of earnings) {
        if (!playerMap[e.player_id]) {
          playerMap[e.player_id] = {
            player_id: e.player_id,
            player_name: e.player_name,
            annual_mp: 0,
            by_series: [],
            tie_break_data: {
              series_played: 0,
              best_series_rank: Infinity,
              max_single_mp: 0
            }
          };
        }
        const agg = playerMap[e.player_id];
        agg.annual_mp += e.mp_weighted;
        agg.by_series.push({
          series_id: s.id,
          series_name: s.name,
          series_short: s.short_name || s.name,
          series_tier: s.tier,
          multiplier: s.multiplier,
          series_rank: e.series_rank,
          mp: e.mp,
          mp_weighted: e.mp_weighted
        });
        agg.tie_break_data.series_played++;
        if (e.series_rank < agg.tie_break_data.best_series_rank) {
          agg.tie_break_data.best_series_rank = e.series_rank;
        }
        if (e.mp_weighted > agg.tie_break_data.max_single_mp) {
          agg.tie_break_data.max_single_mp = e.mp_weighted;
        }
      }
    }

    const entries = Object.values(playerMap);

    // Tie-breaker per SPEC §11.8:
    //   1. annual_mp
    //   2. series_played (more = better)
    //   3. best_series_rank (lower = better)
    //   4. max_single_mp (higher = better)
    entries.sort((a, b) => {
      if (a.annual_mp !== b.annual_mp) return b.annual_mp - a.annual_mp;
      const ad = a.tie_break_data, bd = b.tie_break_data;
      if (ad.series_played !== bd.series_played) return bd.series_played - ad.series_played;
      if (ad.best_series_rank !== bd.best_series_rank) return ad.best_series_rank - bd.best_series_rank;
      if (ad.max_single_mp !== bd.max_single_mp) return bd.max_single_mp - ad.max_single_mp;
      return 0;
    });

    return entries;
  };
})(typeof window !== 'undefined' ? window : globalThis);
