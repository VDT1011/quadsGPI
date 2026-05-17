/**
 * Tests for QPE.scoring — posLog, tierMult, calcPoints
 */

// ─── posLog ──────────────────────────────────────────────────
QPE_TEST.suite('scoring.posLog', () => {
  const pos = (r, i) => QPE.scoring.posLog(r, i);

  QPE_TEST.test('rank=1, itm=50 → 1.0 (champion)', () => {
    QPE_TEST.assertClose(pos(1, 50), 1.0, 1e-9);
  });

  QPE_TEST.test('rank=2, itm=50 → ~0.829', () => {
    QPE_TEST.assertClose(pos(2, 50), 0.829, 0.005);
  });

  QPE_TEST.test('rank=10, itm=50 → ~0.456', () => {
    QPE_TEST.assertClose(pos(10, 50), 0.456, 0.005);
  });

  QPE_TEST.test('rank=50, itm=50 → ~0.176 (min cash)', () => {
    QPE_TEST.assertClose(pos(50, 50), 0.176, 0.005);
  });

  QPE_TEST.test('rank=51, itm=50 → 0 (bubble out)', () => {
    QPE_TEST.assertEqual(pos(51, 50), 0);
  });

  QPE_TEST.test('rank=1, itm=1 → 1.0 (winner-takes-all)', () => {
    QPE_TEST.assertClose(pos(1, 1), 1.0, 1e-9);
  });

  QPE_TEST.test('rank=14, itm=14 → ~0.256 (Megastack min cash)', () => {
    QPE_TEST.assertClose(pos(14, 14), 0.256, 0.005);
  });

  QPE_TEST.test('rank=5, itm=5 → ~0.387 (small HR min cash)', () => {
    QPE_TEST.assertClose(pos(5, 5), 0.387, 0.005);
  });

  QPE_TEST.test('rank=0 → 0 (defensive)', () => {
    QPE_TEST.assertEqual(pos(0, 50), 0);
  });

  QPE_TEST.test('rank=-1 → 0 (defensive)', () => {
    QPE_TEST.assertEqual(pos(-1, 50), 0);
  });

  QPE_TEST.test('itm=0 → 0 (defensive)', () => {
    QPE_TEST.assertEqual(pos(5, 0), 0);
  });

  QPE_TEST.test('itm negative → 0 (defensive)', () => {
    QPE_TEST.assertEqual(pos(5, -3), 0);
  });

  QPE_TEST.test('rank non-integer (3.5) → still computes', () => {
    const v = pos(3.5, 50);
    QPE_TEST.assertTrue(v > 0 && v < 1);
  });
});

// ─── tierMult ────────────────────────────────────────────────
QPE_TEST.suite('scoring.tierMult', () => {
  const tm = (t, s) => QPE.scoring.tierMult(t, s);

  QPE_TEST.test('championship → 1.0', () => QPE_TEST.assertEqual(tm('championship'), 1.0));
  QPE_TEST.test('high_roller → 1.0', () => QPE_TEST.assertEqual(tm('high_roller'), 1.0));
  QPE_TEST.test('mid_stakes → 0.6', () => QPE_TEST.assertEqual(tm('mid_stakes'), 0.6));
  QPE_TEST.test('side → 0.3', () => QPE_TEST.assertEqual(tm('side'), 0.3));
  QPE_TEST.test('unknown tier → 0 (defensive)', () => QPE_TEST.assertEqual(tm('foobar'), 0));
  QPE_TEST.test('null tier → 0 (defensive)', () => QPE_TEST.assertEqual(tm(null), 0));
  QPE_TEST.test('undefined tier → 0 (defensive)', () => QPE_TEST.assertEqual(tm(undefined), 0));

  QPE_TEST.test('admin override side=0.4 → returns 0.4', () => {
    QPE_TEST.assertEqual(tm('side', { tierMult: { side: 0.4 } }), 0.4);
  });

  QPE_TEST.test('partial settings: only side overridden, championship still default', () => {
    const s = { tierMult: { side: 0.5 } };
    QPE_TEST.assertEqual(tm('championship', s), 1.0);
    QPE_TEST.assertEqual(tm('side', s), 0.5);
  });
});

// ─── calcPoints ──────────────────────────────────────────────
QPE_TEST.suite('scoring.calcPoints', () => {
  const cp = (e, r, s) => QPE.scoring.calcPoints(e, r, s);

  const ev = (overrides) => Object.assign({
    tier: 'championship', is_satellite: false, status: 'completed',
    prizepool_actual: 25_000_000_000, itm_cutoff: 50
  }, overrides);

  QPE_TEST.test('Main Event PP=25B, rank=1, itm=50 → ~15,811', () => {
    QPE_TEST.assertClose(cp(ev({}), { rank: 1 }), 15811, 2);
  });

  QPE_TEST.test('Main Event rank=20, itm=50 → ~5,038', () => {
    QPE_TEST.assertClose(cp(ev({}), { rank: 20 }), 5038, 2);
  });

  QPE_TEST.test('Main Event rank=50, itm=50 (min cash) → 2,787', () => {
    QPE_TEST.assertEqual(cp(ev({}), { rank: 50 }), 2787);
  });

  QPE_TEST.test('SHR Prestige PP=2B, tier=HR, rank=1, itm=10 → ~4,472', () => {
    const e = ev({ tier: 'high_roller', prizepool_actual: 2_000_000_000, itm_cutoff: 10 });
    QPE_TEST.assertClose(cp(e, { rank: 1 }), 4472, 2);
  });

  QPE_TEST.test('HR Grand Prix PP=2B rank=5 itm=10 → ~2,049', () => {
    const e = ev({ tier: 'high_roller', prizepool_actual: 2_000_000_000, itm_cutoff: 10 });
    QPE_TEST.assertClose(cp(e, { rank: 5 }), 2049, 2);
  });

  QPE_TEST.test('Hyper Turbo HR PP=300M tier=mid_stakes rank=1 itm=8 → ~1,039', () => {
    const e = ev({ tier: 'mid_stakes', prizepool_actual: 300_000_000, itm_cutoff: 8 });
    QPE_TEST.assertClose(cp(e, { rank: 1 }), 1039, 2);
  });

  QPE_TEST.test('Daily Megastack PP=150M tier=side rank=1 itm=14 → ~367', () => {
    const e = ev({ tier: 'side', prizepool_actual: 150_000_000, itm_cutoff: 14 });
    QPE_TEST.assertClose(cp(e, { rank: 1 }), 367, 2);
  });

  QPE_TEST.test('Megastack rank=14 (min cash) → ~94', () => {
    const e = ev({ tier: 'side', prizepool_actual: 150_000_000, itm_cutoff: 14 });
    QPE_TEST.assertClose(cp(e, { rank: 14 }), 94, 2);
  });

  QPE_TEST.test('event status=cancelled → 0', () => {
    QPE_TEST.assertEqual(cp(ev({ status: 'cancelled' }), { rank: 1 }), 0);
  });

  QPE_TEST.test('event is_satellite=true → 0', () => {
    QPE_TEST.assertEqual(cp(ev({ is_satellite: true }), { rank: 1 }), 0);
  });

  QPE_TEST.test('rank > itm (bubble) → 0', () => {
    QPE_TEST.assertEqual(cp(ev({ itm_cutoff: 50 }), { rank: 51 }), 0);
  });

  QPE_TEST.test('PP=0 → 0', () => {
    QPE_TEST.assertEqual(cp(ev({ prizepool_actual: 0 }), { rank: 1 }), 0);
  });

  QPE_TEST.test('PP negative → 0', () => {
    QPE_TEST.assertEqual(cp(ev({ prizepool_actual: -100 }), { rank: 1 }), 0);
  });

  QPE_TEST.test('TierMult ratio: same PP across champ/mid/side → 1.0:0.6:0.3', () => {
    const PP = 1_000_000_000;
    const ITM = 10;
    const base = ev({ prizepool_actual: PP, itm_cutoff: ITM });
    const c = cp({ ...base, tier: 'championship' }, { rank: 1 });
    const m = cp({ ...base, tier: 'mid_stakes' },   { rank: 1 });
    const s = cp({ ...base, tier: 'side' },         { rank: 1 });
    QPE_TEST.assertClose(m / c, 0.6, 0.001);
    QPE_TEST.assertClose(s / c, 0.3, 0.001);
  });

  QPE_TEST.test('Admin settings override applied', () => {
    const e = ev({ tier: 'side', prizepool_actual: 150_000_000, itm_cutoff: 14 });
    QPE_TEST.assertClose(cp(e, { rank: 1 }, { tierMult: { side: 0.5 } }), 612, 2);
  });

  QPE_TEST.test('Result is rounded integer', () => {
    const v = cp(ev({}), { rank: 1 });
    QPE_TEST.assertEqual(v, Math.round(v));
  });
});
