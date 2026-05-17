/**
 * Tests for QPE.validate — event, result
 */
QPE_TEST.suite('validate.event', () => {
  const v = (e) => QPE.validate.event(e);

  const validEvent = {
    id: 'me', name: 'Main Event', tier: 'championship',
    buyin_listed: 25_000_000, itm_cutoff: 50,
    prizepool_actual: 25_000_000_000, status: 'completed'
  };

  QPE_TEST.test('valid event → ok=true', () => QPE_TEST.assertTrue(v(validEvent).ok));
  QPE_TEST.test('missing name → invalid', () => QPE_TEST.assertFalse(v({ ...validEvent, name: '' }).ok));
  QPE_TEST.test('missing id → invalid', () => QPE_TEST.assertFalse(v({ ...validEvent, id: '' }).ok));
  QPE_TEST.test('custom tier → valid (any non-empty string allowed)', () => QPE_TEST.assertTrue(v({ ...validEvent, tier: 'custom_tier' }).ok));
  QPE_TEST.test('empty tier → invalid', () => QPE_TEST.assertFalse(v({ ...validEvent, tier: '' }).ok));
  QPE_TEST.test('negative buyin → invalid', () => QPE_TEST.assertFalse(v({ ...validEvent, buyin_listed: -1 }).ok));
  QPE_TEST.test('itm_cutoff = 0 → invalid (completed)', () => QPE_TEST.assertFalse(v({ ...validEvent, itm_cutoff: 0 }).ok));
  QPE_TEST.test('negative prizepool → invalid', () => QPE_TEST.assertFalse(v({ ...validEvent, prizepool_actual: -100 }).ok));

  QPE_TEST.test('errors array contains messages', () => {
    const r = v({ id: '', name: '', tier: '', buyin_listed: -1 });
    QPE_TEST.assertFalse(r.ok);
    QPE_TEST.assertTrue(r.errors.length >= 3);
  });

  QPE_TEST.test('scheduled event with no PP yet → OK', () => {
    QPE_TEST.assertTrue(v({ ...validEvent, status: 'scheduled', prizepool_actual: 0 }).ok);
  });
});

QPE_TEST.suite('validate.result', () => {
  const v = (r, e) => QPE.validate.result(r, e);

  QPE_TEST.test('valid result → ok=true', () => {
    QPE_TEST.assertTrue(v({ event_id: 'me', player_name: 'A', rank: 1 }, { id: 'me', itm_cutoff: 50 }).ok);
  });

  QPE_TEST.test('missing player_name → invalid', () => {
    QPE_TEST.assertFalse(v({ event_id: 'me', player_name: '', rank: 1 }).ok);
  });

  QPE_TEST.test('rank < 1 → invalid', () => {
    QPE_TEST.assertFalse(v({ event_id: 'me', player_name: 'A', rank: 0 }).ok);
  });

  QPE_TEST.test('rank > itm_cutoff → invalid', () => {
    QPE_TEST.assertFalse(v({ event_id: 'me', player_name: 'A', rank: 51 }, { id: 'me', itm_cutoff: 50 }).ok);
  });

  QPE_TEST.test('rank as string "5" → invalid (strict number)', () => {
    QPE_TEST.assertFalse(v({ event_id: 'me', player_name: 'A', rank: '5' }).ok);
  });
});
