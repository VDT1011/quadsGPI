/**
 * Tests for QPE.annual — masterPoints, seriesMP, compute
 */

// ─── masterPoints ────────────────────────────────────────────
QPE_TEST.suite('annual.masterPoints', () => {
  const mp = (r, t) => QPE.annual.masterPoints(r, t);

  QPE_TEST.test('rank 1 = 1000', () => QPE_TEST.assertEqual(mp(1), 1000));
  QPE_TEST.test('rank 2 = 700', () => QPE_TEST.assertEqual(mp(2), 700));
  QPE_TEST.test('rank 3 = 550', () => QPE_TEST.assertEqual(mp(3), 550));
  QPE_TEST.test('rank 10 = 195', () => QPE_TEST.assertEqual(mp(10), 195));
  QPE_TEST.test('rank 25 = 80', () => QPE_TEST.assertEqual(mp(25), 80));
  QPE_TEST.test('rank 50 = 15', () => QPE_TEST.assertEqual(mp(50), 15));
  QPE_TEST.test('rank 51 = 0 (out of top 50)', () => QPE_TEST.assertEqual(mp(51), 0));
  QPE_TEST.test('rank 100 = 0', () => QPE_TEST.assertEqual(mp(100), 0));
  QPE_TEST.test('rank 0 = 0 (defensive)', () => QPE_TEST.assertEqual(mp(0), 0));
  QPE_TEST.test('rank -1 = 0 (defensive)', () => QPE_TEST.assertEqual(mp(-1), 0));
  QPE_TEST.test('rank NaN = 0 (defensive)', () => QPE_TEST.assertEqual(mp(NaN), 0));

  QPE_TEST.test('monotonic decreasing', () => {
    let prev = Infinity;
    for (let r = 1; r <= 50; r++) {
      const v = mp(r);
      QPE_TEST.assertTrue(v > 0 && v <= prev, `rank ${r} should be > 0 and ≤ ${prev}, got ${v}`);
      prev = v;
    }
  });

  QPE_TEST.test('custom table override (valid)', () => {
    const t = new Array(51).fill(50);
    t[1] = 999;
    QPE_TEST.assertEqual(mp(1, t), 999);
    QPE_TEST.assertEqual(mp(10, t), 50);
  });

  QPE_TEST.test('invalid custom table → falls back to default', () => {
    QPE_TEST.assertEqual(mp(1, [100]), 1000);  // too short
    QPE_TEST.assertEqual(mp(1, null), 1000);
  });
});

// ─── seriesMP ────────────────────────────────────────────────
QPE_TEST.suite('annual.seriesMP', () => {
  const flagship = { id: 's1', name: 'QPC I', multiplier: 1.0, tier: 'flagship' };
  const mini     = { id: 's2', name: 'Mini',  multiplier: 0.3, tier: 'mini' };

  function lb(...players) {
    // Each player tuple: [name, eligible]
    return players.map((p, i) => ({
      player_id: 'p' + (i+1),
      player_name: p[0],
      final_total: 10000 - i * 100,  // descending
      is_eligible: p[1] !== false
    }));
  }

  QPE_TEST.test('flagship, 3 eligible players → top 3 get MP', () => {
    const out = QPE.annual.seriesMP(flagship, lb(['A', true], ['B', true], ['C', true]));
    QPE_TEST.assertEqual(out.length, 3);
    QPE_TEST.assertEqual(out[0].mp, 1000);
    QPE_TEST.assertEqual(out[0].mp_weighted, 1000);
    QPE_TEST.assertEqual(out[0].series_rank, 1);
    QPE_TEST.assertEqual(out[1].mp_weighted, 700);
    QPE_TEST.assertEqual(out[2].mp_weighted, 550);
  });

  QPE_TEST.test('mini series × 0.3 → MP_weighted = MP × 0.3', () => {
    const out = QPE.annual.seriesMP(mini, lb(['A', true]));
    QPE_TEST.assertEqual(out[0].mp, 1000);
    QPE_TEST.assertEqual(out[0].mp_weighted, 300);
  });

  QPE_TEST.test('non-eligible players skipped, rank by eligible-only index', () => {
    // A non-eligible (one-shot wonder), B eligible — B should be rank 1
    const out = QPE.annual.seriesMP(flagship, lb(['A', false], ['B', true], ['C', true]));
    QPE_TEST.assertEqual(out.length, 2);
    QPE_TEST.assertEqual(out[0].player_name, 'B');
    QPE_TEST.assertEqual(out[0].series_rank, 1);
    QPE_TEST.assertEqual(out[0].mp, 1000);
    QPE_TEST.assertEqual(out[1].player_name, 'C');
    QPE_TEST.assertEqual(out[1].series_rank, 2);
  });

  QPE_TEST.test('all non-eligible → empty', () => {
    QPE_TEST.assertEqual(QPE.annual.seriesMP(flagship, lb(['A', false], ['B', false])).length, 0);
  });

  QPE_TEST.test('51+ eligible players → only top 50 get MP', () => {
    const players = Array.from({ length: 60 }, (_, i) => ['P' + (i+1), true]);
    const out = QPE.annual.seriesMP(flagship, lb(...players));
    QPE_TEST.assertEqual(out.length, 50);
    QPE_TEST.assertEqual(out[49].mp, 15);
  });

  QPE_TEST.test('series with no multiplier → defaults to 1.0', () => {
    const s = { id: 's', name: 'X' };
    const out = QPE.annual.seriesMP(s, lb(['A', true]));
    QPE_TEST.assertEqual(out[0].mp_weighted, 1000);
  });
});

// ─── compute (integration) ──────────────────────────────────
QPE_TEST.suite('annual.compute', () => {
  // Helper: build state with N series, each with a single event + result players
  function mkState(seriesDefs) {
    const state = { series: [], events: [], players: [], results: [], settings: {} };
    let pidCounter = 0;
    const playerCache = {};

    function getOrCreatePlayer(name) {
      if (!playerCache[name]) {
        const id = 'p_' + (++pidCounter);
        playerCache[name] = { id, name, aliases: [] };
        state.players.push(playerCache[name]);
      }
      return playerCache[name];
    }

    for (const def of seriesDefs) {
      // def: { id, name, multiplier, year, players: [{name, count}], min_cash? }
      const series = {
        id: def.id, name: def.name, short_name: def.short || def.id,
        year: def.year || 2026, multiplier: def.multiplier ?? 1.0,
        tier: def.tier || 'flagship', status: 'completed'
      };
      state.series.push(series);

      // For each player, create N events worth of cashes
      // We need each player to have ≥ min_cash to be eligible.
      // Simplest: give them N events (one per cash).
      const minCash = def.min_cash !== undefined ? def.min_cash : 3;

      for (const p of def.players) {
        const player = getOrCreatePlayer(p.name);
        for (let i = 0; i < p.count; i++) {
          const eid = `${def.id}_e${i}_${player.id}`;
          // Each player gets a dedicated event to win (rank 1)
          // tier doesn't matter for ranking — only points matter
          state.events.push({
            id: eid, series_id: def.id, name: `Ev${i}`, code: '',
            tier: 'championship', status: 'completed', is_satellite: false,
            buyin_listed: 10_000_000, gtd_vnd: 100_000_000,
            prizepool_actual: 100_000_000 * (10 - p.rank_in_series + 1),  // higher prize = higher rank
            itm_cutoff: 10
          });
          state.results.push({
            event_id: eid, player_id: player.id, player_name: player.name,
            rank: p.rank || 1, prize_vnd: 0
          });
        }
      }
    }
    return state;
  }

  QPE_TEST.test('empty state → []', () => {
    QPE_TEST.assertDeepEqual(QPE.annual.compute({}), []);
    QPE_TEST.assertDeepEqual(QPE.annual.compute({ series: [], events: [], players: [], results: [] }), []);
  });

  QPE_TEST.test('1 series, 1 eligible winner → 1000 MP', () => {
    // Build manually for full control
    const state = {
      series: [{ id: 's1', name: 'S1', multiplier: 1.0, year: 2026, tier: 'flagship', status: 'completed' }],
      events: [
        { id: 'e1', series_id: 's1', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10_000_000, prizepool_actual: 1_000_000_000, itm_cutoff: 50, name: 'E1' },
        { id: 'e2', series_id: 's1', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10_000_000, prizepool_actual: 1_000_000_000, itm_cutoff: 50, name: 'E2' },
        { id: 'e3', series_id: 's1', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10_000_000, prizepool_actual: 1_000_000_000, itm_cutoff: 50, name: 'E3' }
      ],
      players: [{ id: 'p1', name: 'Alice', aliases: [] }],
      results: [
        { event_id: 'e1', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'e2', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'e3', player_id: 'p1', player_name: 'Alice', rank: 1 }
      ],
      settings: {}
    };
    const out = QPE.annual.compute(state);
    QPE_TEST.assertEqual(out.length, 1);
    QPE_TEST.assertEqual(out[0].player_name, 'Alice');
    QPE_TEST.assertEqual(out[0].annual_mp, 1000);
    QPE_TEST.assertEqual(out[0].by_series.length, 1);
    QPE_TEST.assertEqual(out[0].by_series[0].series_rank, 1);
    QPE_TEST.assertEqual(out[0].by_series[0].mp, 1000);
    QPE_TEST.assertEqual(out[0].by_series[0].mp_weighted, 1000);
  });

  QPE_TEST.test('flagship + mini: weighted MP sums (1000 + 1000×0.3 = 1300)', () => {
    const state = {
      series: [
        { id: 'flag', name: 'Flagship', multiplier: 1.0, year: 2026, tier: 'flagship', status: 'completed' },
        { id: 'mini', name: 'Mini',     multiplier: 0.3, year: 2026, tier: 'mini',     status: 'completed' }
      ],
      events: [
        // Flagship: 3 events for eligibility
        { id: 'f1', series_id: 'flag', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'f2', series_id: 'flag', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'f3', series_id: 'flag', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        // Mini: 3 events
        { id: 'm1', series_id: 'mini', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'm2', series_id: 'mini', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'm3', series_id: 'mini', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 }
      ],
      players: [{ id: 'p1', name: 'Alice', aliases: [] }],
      results: [
        { event_id: 'f1', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'f2', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'f3', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'm1', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'm2', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'm3', player_id: 'p1', player_name: 'Alice', rank: 1 }
      ],
      settings: {}
    };
    const out = QPE.annual.compute(state);
    QPE_TEST.assertEqual(out.length, 1);
    QPE_TEST.assertEqual(out[0].annual_mp, 1300);  // 1000 + 300
    QPE_TEST.assertEqual(out[0].by_series.length, 2);
    QPE_TEST.assertEqual(out[0].tie_break_data.series_played, 2);
  });

  QPE_TEST.test('player not eligible in series (min=3) → 0 MP from that series', () => {
    const state = {
      series: [{ id: 's1', name: 'S1', multiplier: 1.0, year: 2026, tier: 'flagship', status: 'completed' }],
      events: [
        { id: 'e1', series_id: 's1', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 }
      ],
      players: [{ id: 'p1', name: 'OneShot', aliases: [] }],
      results: [
        { event_id: 'e1', player_id: 'p1', player_name: 'OneShot', rank: 1 }  // 1 cash only
      ],
      settings: { minCash: { overall: 3 } }   // explicit threshold
    };
    const out = QPE.annual.compute(state, { settings: state.settings });
    QPE_TEST.assertEqual(out.length, 0);
  });

  QPE_TEST.test('year filter excludes other-year series', () => {
    const state = {
      series: [
        { id: 's2026', name: '2026', multiplier: 1.0, year: 2026, tier: 'flagship', status: 'completed' },
        { id: 's2027', name: '2027', multiplier: 1.0, year: 2027, tier: 'flagship', status: 'completed' }
      ],
      events: [
        { id: 'e26a', series_id: 's2026', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'e26b', series_id: 's2026', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'e26c', series_id: 's2026', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'e27a', series_id: 's2027', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'e27b', series_id: 's2027', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 },
        { id: 'e27c', series_id: 's2027', tier: 'championship', status: 'completed', is_satellite: false, buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50 }
      ],
      players: [{ id: 'p1', name: 'Alice', aliases: [] }],
      results: [
        { event_id: 'e26a', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'e26b', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'e26c', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'e27a', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'e27b', player_id: 'p1', player_name: 'Alice', rank: 1 },
        { event_id: 'e27c', player_id: 'p1', player_name: 'Alice', rank: 1 }
      ],
      settings: {}
    };
    const out2026 = QPE.annual.compute(state, { year: 2026 });
    QPE_TEST.assertEqual(out2026.length, 1);
    QPE_TEST.assertEqual(out2026[0].annual_mp, 1000);  // only 2026 series

    const outAll = QPE.annual.compute(state);
    QPE_TEST.assertEqual(outAll[0].annual_mp, 2000);  // both years
  });

  QPE_TEST.test('multiple players sorted by annual_mp desc', () => {
    const mkP = (id, name) => ({ id, name, aliases: [] });
    const mkE = (id, series) => ({
      id, series_id: series, tier: 'championship', status: 'completed', is_satellite: false,
      buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50
    });
    const mkR = (eid, pid, pname, rank) => ({ event_id: eid, player_id: pid, player_name: pname, rank });

    const state = {
      series: [{ id: 's1', name: 'S1', multiplier: 1.0, year: 2026, tier: 'flagship', status: 'completed' }],
      events: [mkE('e1','s1'), mkE('e2','s1'), mkE('e3','s1')],
      players: [mkP('p1', 'Alice'), mkP('p2', 'Bob'), mkP('p3', 'Charlie')],
      results: [
        // Alice: 3 events rank 1 → high
        mkR('e1', 'p1', 'Alice', 1), mkR('e2', 'p1', 'Alice', 1), mkR('e3', 'p1', 'Alice', 1),
        // Bob: 3 events rank 5 → mid
        mkR('e1', 'p2', 'Bob', 5), mkR('e2', 'p2', 'Bob', 5), mkR('e3', 'p2', 'Bob', 5),
        // Charlie: 3 events rank 10 → low
        mkR('e1', 'p3', 'Charlie', 10), mkR('e2', 'p3', 'Charlie', 10), mkR('e3', 'p3', 'Charlie', 10)
      ],
      settings: {}
    };
    const out = QPE.annual.compute(state);
    QPE_TEST.assertEqual(out.length, 3);
    QPE_TEST.assertEqual(out[0].player_name, 'Alice');
    QPE_TEST.assertEqual(out[1].player_name, 'Bob');
    QPE_TEST.assertEqual(out[2].player_name, 'Charlie');
    QPE_TEST.assertTrue(out[0].annual_mp > out[1].annual_mp);
    QPE_TEST.assertTrue(out[1].annual_mp > out[2].annual_mp);
  });

  QPE_TEST.test('tie-breaker: same annual_mp, more series_played wins', () => {
    const mkP = (id, name) => ({ id, name, aliases: [] });
    const mkE = (id, series) => ({
      id, series_id: series, tier: 'championship', status: 'completed', is_satellite: false,
      buyin_listed: 10e6, prizepool_actual: 1e9, itm_cutoff: 50
    });
    const mkR = (eid, pid, pname, rank) => ({ event_id: eid, player_id: pid, player_name: pname, rank });

    // 3 series: A (mult 1.0), B (mult 0.5), C (mult 0.5)
    // Alice: rank 1 across 3 events of A → series_rank 1 → 1000 × 1.0 = 1000 MP, series_played=1
    // Bob:   rank 1 across 3 events of B AND 3 of C → 1000×0.5 + 1000×0.5 = 1000 MP, series_played=2
    // Same annual_mp → Bob wins on series_played tie-break.
    const state = {
      series: [
        { id: 'A', name: 'A', multiplier: 1.0, year: 2026, tier: 'flagship', status: 'completed' },
        { id: 'B', name: 'B', multiplier: 0.5, year: 2026, tier: 'mini',     status: 'completed' },
        { id: 'C', name: 'C', multiplier: 0.5, year: 2026, tier: 'mini',     status: 'completed' }
      ],
      events: [
        mkE('a1','A'), mkE('a2','A'), mkE('a3','A'),
        mkE('b1','B'), mkE('b2','B'), mkE('b3','B'),
        mkE('c1','C'), mkE('c2','C'), mkE('c3','C')
      ],
      players: [mkP('p1','Alice'), mkP('p2','Bob')],
      results: [
        mkR('a1','p1','Alice',1), mkR('a2','p1','Alice',1), mkR('a3','p1','Alice',1),
        mkR('b1','p2','Bob',1),   mkR('b2','p2','Bob',1),   mkR('b3','p2','Bob',1),
        mkR('c1','p2','Bob',1),   mkR('c2','p2','Bob',1),   mkR('c3','p2','Bob',1)
      ],
      settings: {}
    };
    const out = QPE.annual.compute(state);
    QPE_TEST.assertEqual(out.length, 2);
    QPE_TEST.assertEqual(out[0].annual_mp, out[1].annual_mp);  // tie confirmed
    QPE_TEST.assertEqual(out[0].player_name, 'Bob');           // Bob wins (series_played=2)
    QPE_TEST.assertEqual(out[1].player_name, 'Alice');
    QPE_TEST.assertEqual(out[0].tie_break_data.series_played, 2);
    QPE_TEST.assertEqual(out[1].tie_break_data.series_played, 1);
  });
});
