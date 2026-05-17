/**
 * Tests for QPE.event — computePP (overlay logic)
 */
QPE_TEST.suite('event.computePP', () => {
  const c = (e) => QPE.event.computePP(e);

  QPE_TEST.test('overlay_covered=true, buyins<GTD → PP=GTD', () => {
    QPE_TEST.assertEqual(c({ overlay_covered: true, gtd_vnd: 25e9, sum_buyins_net: 20e9 }), 25e9);
  });

  QPE_TEST.test('overlay_covered=true, buyins>GTD → PP=buyins (higher)', () => {
    QPE_TEST.assertEqual(c({ overlay_covered: true, gtd_vnd: 25e9, sum_buyins_net: 30e9 }), 30e9);
  });

  QPE_TEST.test('overlay_covered=false, buyins<GTD → PP=buyins', () => {
    QPE_TEST.assertEqual(c({ overlay_covered: false, gtd_vnd: 25e9, sum_buyins_net: 20e9 }), 20e9);
  });

  QPE_TEST.test('prizepool_actual manually set → returned as-is', () => {
    QPE_TEST.assertEqual(c({ prizepool_actual: 12_345_678_900, overlay_covered: true, gtd_vnd: 25e9 }), 12_345_678_900);
  });

  QPE_TEST.test('no GTD, no buyins → 0', () => {
    QPE_TEST.assertEqual(c({}), 0);
  });

  QPE_TEST.test('only GTD + overlay covered → PP=GTD', () => {
    QPE_TEST.assertEqual(c({ overlay_covered: true, gtd_vnd: 1e9 }), 1e9);
  });

  QPE_TEST.test('only buyins, no GTD → PP=buyins', () => {
    QPE_TEST.assertEqual(c({ sum_buyins_net: 5e9 }), 5e9);
  });
});
