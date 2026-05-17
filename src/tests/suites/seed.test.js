/**
 * Tests for QPE_SEED.qpc2026 — full seed data validation
 */
QPE_TEST.suite('seed.qpc2026', () => {
  const pkg = (typeof QPE_SEED !== 'undefined') ? QPE_SEED.qpc2026 : null;
  const seed = pkg && pkg.events;
  const series = pkg && pkg.series;

  QPE_TEST.test('seed structure has series + events', () => {
    QPE_TEST.assertTrue(typeof pkg === 'object');
    QPE_TEST.assertTrue(typeof series === 'object');
    QPE_TEST.assertTrue(Array.isArray(seed));
    QPE_TEST.assertTrue(seed.length >= 30, 'expected ≥30 events, got ' + (seed && seed.length));
  });

  QPE_TEST.test('series = Quads Poker Championship I', () => {
    QPE_TEST.assertEqual(series.id, 'qpc_2026_1');
    QPE_TEST.assertEqual(series.name, 'Quads Poker Championship I');
    QPE_TEST.assertEqual(series.tier, 'flagship');
    QPE_TEST.assertEqual(series.multiplier, 1.00);
  });

  QPE_TEST.test('All events have series_id pointing to QPC I', () => {
    for (const e of seed) {
      QPE_TEST.assertEqual(e.series_id, 'qpc_2026_1', e.id + ' has wrong series_id');
    }
  });

  QPE_TEST.test('Main Event present, championship, multi-flight', () => {
    const me = seed.find(e => e.id === '18_main');
    QPE_TEST.assertEqual(me.tier, 'championship');
    QPE_TEST.assertEqual(me.is_multi_flight, true);
    QPE_TEST.assertEqual(me.buyin_listed, 27_500_000);
    QPE_TEST.assertEqual(me.gtd_vnd, 25_000_000_000);
  });

  QPE_TEST.test('SHR Prestige present, high_roller, buyin 109M', () => {
    const shr = seed.find(e => e.id === '14_shr');
    QPE_TEST.assertEqual(shr.tier, 'high_roller');
    QPE_TEST.assertEqual(shr.buyin_listed, 109_000_000);
  });

  QPE_TEST.test('Hyper Turbo HR is mid_stakes', () => {
    QPE_TEST.assertEqual(seed.find(e => e.id === 'hthr_d1').tier, 'mid_stakes');
  });

  QPE_TEST.test('All 3 Women events are tier=side, is_womens=true', () => {
    const women = seed.filter(e => e.is_womens);
    QPE_TEST.assertEqual(women.length, 3);
    for (const w of women) QPE_TEST.assertEqual(w.tier, 'side');
  });

  QPE_TEST.test('Daily Megastack: ≥6 instances, all tier=side, buyin 3.4M', () => {
    const mega = seed.filter(e => /Daily Megastack/.test(e.name));
    QPE_TEST.assertTrue(mega.length >= 6);
    for (const m of mega) {
      QPE_TEST.assertEqual(m.tier, 'side');
      QPE_TEST.assertEqual(m.buyin_listed, 3_400_000);
    }
  });

  QPE_TEST.test('No satellites in seed', () => {
    QPE_TEST.assertEqual(seed.filter(e => e.is_satellite).length, 0);
  });

  QPE_TEST.test('All events status=scheduled initially', () => {
    for (const e of seed) QPE_TEST.assertEqual(e.status, 'scheduled');
  });

  QPE_TEST.test('All events overlay_covered=true by default', () => {
    for (const e of seed) QPE_TEST.assertEqual(e.overlay_covered, true);
  });

  QPE_TEST.test('All events pass validate.event', () => {
    for (const e of seed) {
      const r = QPE.validate.event(e);
      QPE_TEST.assertTrue(r.ok, e.id + ': ' + JSON.stringify(r.errors));
    }
  });

  QPE_TEST.test('Unique IDs', () => {
    const ids = seed.map(e => e.id);
    QPE_TEST.assertEqual(ids.length, new Set(ids).size);
  });

  QPE_TEST.test('Date format YYYY-MM-DD valid', () => {
    for (const e of seed) {
      QPE_TEST.assertTrue(/^\d{4}-\d{2}-\d{2}$/.test(e.date_start), 'bad date: ' + e.date_start);
    }
  });

  QPE_TEST.test('Tier distribution sane', () => {
    const counts = { championship: 0, high_roller: 0, mid_stakes: 0, side: 0 };
    for (const e of seed) counts[e.tier]++;
    QPE_TEST.assertTrue(counts.championship >= 5);
    QPE_TEST.assertTrue(counts.high_roller >= 5);
    QPE_TEST.assertTrue(counts.mid_stakes >= 5);
    QPE_TEST.assertTrue(counts.side >= 10);
  });
});

QPE_TEST.suite('runner.smoke', () => {
  QPE_TEST.test('engine namespace loaded', () => {
    QPE_TEST.assertTrue(typeof QPE === 'object');
    QPE_TEST.assertTrue(typeof QPE.scoring === 'object');
  });

  QPE_TEST.test('CONST.K = 100', () => {
    QPE_TEST.assertEqual(QPE.CONST.K, 100);
  });

  QPE_TEST.test('CONST.TIER_MULT values', () => {
    QPE_TEST.assertEqual(QPE.CONST.TIER_MULT.championship, 1.0);
    QPE_TEST.assertEqual(QPE.CONST.TIER_MULT.side, 0.3);
  });
});
