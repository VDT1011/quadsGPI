/**
 * Tests for QPE.leaderboard — tieBreak, compute (Scenarios A-H)
 */

// ─── tieBreak ────────────────────────────────────────────────
QPE_TEST.suite('leaderboard.tieBreak', () => {
  const tb = (a, b) => QPE.leaderboard.tieBreak(a, b);

  const mkEntry = (overrides) => Object.assign({
    final_total: 1000,
    events_cashed: 3,
    tie_break_data: { best_rank: 5, total_prize_vnd: 100_000_000 }
  }, overrides);

  QPE_TEST.test('a.final > b.final → a wins (negative)', () => {
    QPE_TEST.assertTrue(tb(mkEntry({ final_total: 2000 }), mkEntry({ final_total: 1000 })) < 0);
  });

  QPE_TEST.test('a.final < b.final → b wins (positive)', () => {
    QPE_TEST.assertTrue(tb(mkEntry({ final_total: 500 }), mkEntry({ final_total: 1000 })) > 0);
  });

  QPE_TEST.test('equal final, a has more cashes → a wins', () => {
    QPE_TEST.assertTrue(tb(mkEntry({ events_cashed: 5 }), mkEntry({ events_cashed: 3 })) < 0);
  });

  QPE_TEST.test('equal final + cashes, a has better best_rank → a wins', () => {
    const a = mkEntry({ tie_break_data: { best_rank: 1, total_prize_vnd: 0 } });
    const b = mkEntry({ tie_break_data: { best_rank: 5, total_prize_vnd: 0 } });
    QPE_TEST.assertTrue(tb(a, b) < 0);
  });

  QPE_TEST.test('equal final + cashes + rank, a higher prize → a wins', () => {
    const a = mkEntry({ tie_break_data: { best_rank: 5, total_prize_vnd: 200_000_000 } });
    const b = mkEntry({ tie_break_data: { best_rank: 5, total_prize_vnd: 100_000_000 } });
    QPE_TEST.assertTrue(tb(a, b) < 0);
  });

  QPE_TEST.test('truly identical → 0', () => {
    QPE_TEST.assertEqual(tb(mkEntry({}), mkEntry({})), 0);
  });

  QPE_TEST.test('Array.sort([weak, strong]) → strong first', () => {
    const weak = mkEntry({ final_total: 100, events_cashed: 1 });
    const strong = mkEntry({ final_total: 5000, events_cashed: 5 });
    const sorted = [weak, strong].sort(tb);
    QPE_TEST.assertEqual(sorted[0].final_total, 5000);
  });
});

// ─── compute (full integration via Scenarios A-H) ────────────
QPE_TEST.suite('leaderboard.compute', () => {
  const compute = (state, scope) => QPE.leaderboard.compute(state, scope);

  const events = {
    main_event:    { id: 'me',  name: 'Main Event',        tier: 'championship', buyin_listed: 25_000_000, prizepool_actual: 25_000_000_000, itm_cutoff: 50, status: 'completed', is_satellite: false, is_womens: false },
    hr_grand:      { id: 'hrg', name: 'HR Grand Prix',     tier: 'high_roller',  buyin_listed: 60_000_000, prizepool_actual: 2_000_000_000,  itm_cutoff: 10, status: 'completed', is_satellite: false, is_womens: false },
    hr_single_1:   { id: 'hs1', name: 'HR Single Day #1',  tier: 'high_roller',  buyin_listed: 30_000_000, prizepool_actual: 1_500_000_000,  itm_cutoff: 10, status: 'completed', is_satellite: false, is_womens: false },
    hr_single_2:   { id: 'hs2', name: 'HR Single Day #2',  tier: 'high_roller',  buyin_listed: 30_000_000, prizepool_actual: 1_500_000_000,  itm_cutoff: 10, status: 'completed', is_satellite: false, is_womens: false },
    mini_main:     { id: 'mm',  name: 'Mini Main',         tier: 'championship', buyin_listed:  5_000_000, prizepool_actual:   800_000_000,  itm_cutoff: 20, status: 'completed', is_satellite: false, is_womens: false },
    hyper_hr_1:    { id: 'ht1', name: 'Hyper Turbo HR #1', tier: 'mid_stakes',   buyin_listed: 11_000_000, prizepool_actual:   300_000_000,  itm_cutoff:  8, status: 'completed', is_satellite: false, is_womens: false },
    hyper_hr_2:    { id: 'ht2', name: 'Hyper Turbo HR #2', tier: 'mid_stakes',   buyin_listed: 11_000_000, prizepool_actual:   300_000_000,  itm_cutoff:  8, status: 'completed', is_satellite: false, is_womens: false },
    hyper_hr_3:    { id: 'ht3', name: 'Hyper Turbo HR #3', tier: 'mid_stakes',   buyin_listed: 11_000_000, prizepool_actual:   300_000_000,  itm_cutoff:  8, status: 'completed', is_satellite: false, is_womens: false },
    hyper_hr_4:    { id: 'ht4', name: 'Hyper Turbo HR #4', tier: 'mid_stakes',   buyin_listed: 11_000_000, prizepool_actual:   300_000_000,  itm_cutoff:  8, status: 'completed', is_satellite: false, is_womens: false },
    mega_1:        { id: 'mg1', name: 'Megastack #1',      tier: 'side',         buyin_listed:  3_000_000, prizepool_actual:   150_000_000,  itm_cutoff: 14, status: 'completed', is_satellite: false, is_womens: false },
    mega_2:        { id: 'mg2', name: 'Megastack #2',      tier: 'side',         buyin_listed:  3_000_000, prizepool_actual:   150_000_000,  itm_cutoff: 14, status: 'completed', is_satellite: false, is_womens: false },
    mega_3:        { id: 'mg3', name: 'Megastack #3',      tier: 'side',         buyin_listed:  3_000_000, prizepool_actual:   150_000_000,  itm_cutoff: 14, status: 'completed', is_satellite: false, is_womens: false },
    mega_4:        { id: 'mg4', name: 'Megastack #4',      tier: 'side',         buyin_listed:  3_000_000, prizepool_actual:   150_000_000,  itm_cutoff: 14, status: 'completed', is_satellite: false, is_womens: false },
    mega_5:        { id: 'mg5', name: 'Megastack #5',      tier: 'side',         buyin_listed:  3_000_000, prizepool_actual:   150_000_000,  itm_cutoff: 14, status: 'completed', is_satellite: false, is_womens: false },
    mega_6:        { id: 'mg6', name: 'Megastack #6',      tier: 'side',         buyin_listed:  3_000_000, prizepool_actual:   150_000_000,  itm_cutoff: 14, status: 'completed', is_satellite: false, is_womens: false },
    women_1:       { id: 'w1',  name: 'Women #1',          tier: 'side',         buyin_listed:  4_000_000, prizepool_actual:   135_000_000,  itm_cutoff: 12, status: 'completed', is_satellite: false, is_womens: true },
    women_2:       { id: 'w2',  name: 'Women #2',          tier: 'side',         buyin_listed:  4_000_000, prizepool_actual:   135_000_000,  itm_cutoff: 12, status: 'completed', is_satellite: false, is_womens: true },
    cancelled:     { id: 'cx',  name: 'Cancelled Event',   tier: 'championship', buyin_listed:  5_000_000, prizepool_actual:   500_000_000,  itm_cutoff: 10, status: 'cancelled', is_satellite: false, is_womens: false }
  };

  function mkState(map) {
    const state = { events: Object.values(events), players: [], results: [] };
    const pidMap = {};
    let counter = 0;
    for (const [name, results] of Object.entries(map)) {
      const pid = pidMap[name] || ('p_' + (++counter));
      pidMap[name] = pid;
      if (!state.players.find(p => p.id === pid)) {
        state.players.push({ id: pid, name, aliases: [] });
      }
      for (const [eventId, rank, prize] of results) {
        state.results.push({ event_id: eventId, player_id: pid, player_name: name, rank, prize_vnd: prize || 0 });
      }
    }
    return state;
  }

  QPE_TEST.test('empty state → []', () => {
    QPE_TEST.assertDeepEqual(compute({ events: [], players: [], results: [] }, 'overall'), []);
  });

  QPE_TEST.test('1 event + 3 results → 3 entries sorted desc', () => {
    const out = compute(mkState({ 'A': [['me', 1]], 'B': [['me', 2]], 'C': [['me', 3]] }), 'overall');
    QPE_TEST.assertEqual(out[0].player_name, 'A');
    QPE_TEST.assertEqual(out[2].player_name, 'C');
  });

  QPE_TEST.test('cancelled event excluded from totals', () => {
    const out = compute(mkState({ 'X': [['cx', 1], ['me', 50]] }), 'overall');
    QPE_TEST.assertEqual(out[0].final_total, 2787);
  });

  // ─── Scenarios A-H (SPEC §2.6) ────────────────────────────
  QPE_TEST.test('Scenario A: 5× Megastack win → ~1,835', () => {
    const out = compute(mkState({ 'A': [['mg1',1],['mg2',1],['mg3',1],['mg4',1],['mg5',1]] }), 'overall');
    QPE_TEST.assertClose(out[0].final_total, 1835, 5);
    QPE_TEST.assertTrue(out[0].is_eligible);
  });

  QPE_TEST.test('Scenario B: 1× HR Grand Prix → 4,472, not eligible (min=3)', () => {
    const state = mkState({ 'B': [['hrg', 1]] });
    state.settings = { minCash: { overall: 3 } };
    const out = QPE.leaderboard.compute(state, 'overall', state.settings);
    QPE_TEST.assertClose(out[0].final_total, 4472, 2);
    QPE_TEST.assertFalse(out[0].is_eligible);
  });

  QPE_TEST.test('Scenario C: 1× Mini Main → 2,828, not eligible (min=3)', () => {
    const state = mkState({ 'C': [['mm', 1]] });
    state.settings = { minCash: { overall: 3 } };
    const out = QPE.leaderboard.compute(state, 'overall', state.settings);
    QPE_TEST.assertClose(out[0].final_total, 2828, 2);
    QPE_TEST.assertFalse(out[0].is_eligible);
  });

  QPE_TEST.test('Scenario D: 3 Megastack + 1 Mini Main → ~3,929', () => {
    const out = compute(mkState({ 'D': [['mg1',1],['mg2',1],['mg3',1],['mm',1]] }), 'overall');
    QPE_TEST.assertClose(out[0].final_total, 3929, 5);
  });

  QPE_TEST.test('Scenario E: ITM Main #20 + 2× Megastack → ~5,772', () => {
    const out = compute(mkState({ 'E': [['me',20],['mg1',1],['mg2',1]] }), 'overall');
    QPE_TEST.assertClose(out[0].final_total, 5772, 5);
  });

  QPE_TEST.test('Scenario F: 4× Hyper Turbo HR → ~4,156', () => {
    const out = compute(mkState({ 'F': [['ht1',1],['ht2',1],['ht3',1],['ht4',1]] }), 'overall');
    QPE_TEST.assertClose(out[0].final_total, 4156, 5);
  });

  QPE_TEST.test('Scenario G: 6× Megastack grinder → ~2,202 (< 1 HR win)', () => {
    const out = compute(mkState({ 'G': [['mg1',1],['mg2',1],['mg3',1],['mg4',1],['mg5',1],['mg6',1]] }), 'overall');
    QPE_TEST.assertClose(out[0].final_total, 2202, 5);
    QPE_TEST.assertTrue(out[0].final_total < 4472);
  });

  QPE_TEST.test('Scenario H: 2 HR Single Day + 3 Megastack → ~8,847 (top)', () => {
    const out = compute(mkState({ 'H': [['hs1',1],['hs2',1],['mg1',1],['mg2',1],['mg3',1]] }), 'overall');
    QPE_TEST.assertClose(out[0].final_total, 8847, 5);
  });

  QPE_TEST.test('Full A-H ranking: H > E > B > F > D > C > G > A', () => {
    const out = compute(mkState({
      'A': [['mg1',1],['mg2',1],['mg3',1],['mg4',1],['mg5',1]],
      'B': [['hrg',1]],
      'C': [['mm',1]],
      'D': [['mg1',1],['mg2',1],['mg3',1],['mm',1]],
      'E': [['me',20],['mg1',1],['mg2',1]],
      'F': [['ht1',1],['ht2',1],['ht3',1],['ht4',1]],
      'G': [['mg1',1],['mg2',1],['mg3',1],['mg4',1],['mg5',1],['mg6',1]],
      'H': [['hs1',1],['hs2',1],['mg1',1],['mg2',1],['mg3',1]]
    }), 'overall');
    QPE_TEST.assertDeepEqual(out.map(e => e.player_name), ['H','E','B','F','D','C','G','A']);
  });

  // ─── Sub-board scopes ────────────────────────────────────
  QPE_TEST.test('scope=high_roller → only buyin ≥ 30M', () => {
    const out = compute(mkState({ 'A': [['me',1],['hrg',1],['mg1',1]] }), 'high_roller');
    QPE_TEST.assertClose(out[0].final_total, 4472, 2);
    QPE_TEST.assertEqual(out[0].events_cashed, 1);
  });

  QPE_TEST.test('scope=womens → only is_womens events', () => {
    const out = compute(mkState({ 'A': [['w1',1],['w2',1],['me',1]] }), 'womens');
    QPE_TEST.assertClose(out[0].final_total, 698, 10);
    QPE_TEST.assertTrue(out[0].is_eligible);
  });

  QPE_TEST.test('scope=overall: cancelled events excluded', () => {
    const out = compute(mkState({ 'A': [['cx',1]] }), 'overall');
    QPE_TEST.assertEqual(out[0].final_total, 0);
    QPE_TEST.assertEqual(out[0].events_cashed, 0);
  });

  // ─── Eligibility ─────────────────────────────────────────
  QPE_TEST.test('<3 cash overall → not eligible when min=3', () => {
    const state = mkState({ 'X': [['me',1],['mg1',1]] });
    state.settings = { minCash: { overall: 3 } };
    QPE_TEST.assertFalse(QPE.leaderboard.compute(state, 'overall', state.settings)[0].is_eligible);
  });

  QPE_TEST.test('=3 cash overall → eligible when min=3', () => {
    const state = mkState({ 'X': [['me',1],['mg1',1],['mg2',1]] });
    state.settings = { minCash: { overall: 3 } };
    QPE_TEST.assertTrue(QPE.leaderboard.compute(state, 'overall', state.settings)[0].is_eligible);
  });

  QPE_TEST.test('=1 cash womens → not eligible when min=2', () => {
    const state = mkState({ 'X': [['w1',1]] });
    state.settings = { minCash: { womens: 2 } };
    QPE_TEST.assertFalse(QPE.leaderboard.compute(state, 'womens', state.settings)[0].is_eligible);
  });

  QPE_TEST.test('default min_cash=1 accepts one-shot wonder', () => {
    QPE_TEST.assertTrue(compute(mkState({ 'X': [['hrg', 1]] }), 'overall')[0].is_eligible);
  });

  // ─── Re-entry / best result per event ────────────────────
  QPE_TEST.test('re-entry: 2 results → use best rank', () => {
    const state = {
      events: [events.main_event],
      players: [{ id: 'p1', name: 'X', aliases: [] }],
      results: [
        { event_id: 'me', player_id: 'p1', player_name: 'X', rank: 30 },
        { event_id: 'me', player_id: 'p1', player_name: 'X', rank: 7 }
      ]
    };
    const out = compute(state, 'overall');
    QPE_TEST.assertClose(out[0].final_total, 8433, 5);
    QPE_TEST.assertEqual(out[0].events_cashed, 1);
  });

  // ─── by_tier breakdown ───────────────────────────────────
  QPE_TEST.test('by_tier breakdown sums to final_total', () => {
    const out = compute(mkState({ 'X': [['me',1],['hrg',1],['ht1',1],['mg1',1]] }), 'overall');
    const e = out[0];
    const sum = e.by_tier.championship + e.by_tier.high_roller + e.by_tier.mid_stakes + e.by_tier.side;
    QPE_TEST.assertEqual(sum, e.final_total);
  });

  QPE_TEST.test('best_finish points to highest-points result', () => {
    const out = compute(mkState({ 'X': [['me',7],['mg1',1]] }), 'overall');
    QPE_TEST.assertEqual(out[0].best_finish.event_id, 'me');
  });

  QPE_TEST.test('sort works with mixed entries', () => {
    const out = compute(mkState({ 'A': [['hrg',1]], 'B': [['hrg',1],['mg1',14]] }), 'overall');
    QPE_TEST.assertEqual(out.length, 2);
    QPE_TEST.assertTrue(out[0].final_total >= out[1].final_total);
  });
});
