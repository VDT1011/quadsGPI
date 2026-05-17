/**
 * Tests for QPE.utils — parseVnd, debounce
 */
QPE_TEST.suite('utils.parseVnd', () => {
  const p = QPE.utils.parseVnd;

  QPE_TEST.test('plain integer "25000000"', () => QPE_TEST.assertEqual(p('25000000'), 25000000));
  QPE_TEST.test('EN thousand sep "25,000,000"', () => QPE_TEST.assertEqual(p('25,000,000'), 25000000));
  QPE_TEST.test('VN thousand sep "25.000.000"', () => QPE_TEST.assertEqual(p('25.000.000'), 25000000));
  QPE_TEST.test('mixed "5.000,000" still parsed as int', () => QPE_TEST.assertEqual(p('5.000,000'), 5000000));
  QPE_TEST.test('with ₫ symbol', () => QPE_TEST.assertEqual(p('25.000.000 ₫'), 25000000));
  QPE_TEST.test('25M shortcut', () => QPE_TEST.assertEqual(p('25M'), 25000000));
  QPE_TEST.test('1.5B with EN decimal', () => QPE_TEST.assertEqual(p('1.5B'), 1500000000));
  QPE_TEST.test('1,5B with VN decimal', () => QPE_TEST.assertEqual(p('1,5B'), 1500000000));
  QPE_TEST.test('500K', () => QPE_TEST.assertEqual(p('500K'), 500000));
  QPE_TEST.test('empty → 0', () => QPE_TEST.assertEqual(p(''), 0));
  QPE_TEST.test('null → 0', () => QPE_TEST.assertEqual(p(null), 0));
  QPE_TEST.test('number passthrough', () => QPE_TEST.assertEqual(p(12345), 12345));
  QPE_TEST.test('negative "-1000"', () => QPE_TEST.assertEqual(p('-1000'), -1000));
});

QPE_TEST.suite('utils.debounce', () => {
  QPE_TEST.test('returns callable function', () => {
    const fn = QPE.utils.debounce(() => {}, 100);
    QPE_TEST.assertTrue(typeof fn === 'function');
  });

  QPE_TEST.test('does not invoke immediately', () => {
    let called = false;
    const fn = QPE.utils.debounce(() => { called = true; }, 100);
    fn(); fn(); fn();
    QPE_TEST.assertFalse(called);
  });
});
