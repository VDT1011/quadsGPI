/**
 * Tests for QPE.parse — tsv/csv, normalizeName
 */

QPE_TEST.suite('parse.tsv/csv', () => {
  const p = (text) => QPE.parse.tsv(text);

  QPE_TEST.test('TSV 3-col: rank, name, prize', () => {
    const out = p('1\tNguyễn A\t5000000\n2\tTrần B\t3000000');
    QPE_TEST.assertEqual(out.length, 2);
    QPE_TEST.assertEqual(out[0].rank, 1);
    QPE_TEST.assertEqual(out[0].name, 'Nguyễn A');
    QPE_TEST.assertEqual(out[0].prize, 5000000);
  });

  QPE_TEST.test('CSV comma auto-detect', () => {
    const out = p('1,Player A,1000\n2,Player B,500');
    QPE_TEST.assertEqual(out[1].prize, 500);
  });

  QPE_TEST.test('CSV semicolon auto-detect', () => {
    const out = p('1;Player A;1000\n2;Player B;500');
    QPE_TEST.assertEqual(out[0].name, 'Player A');
  });

  QPE_TEST.test('Empty lines skipped', () => {
    QPE_TEST.assertEqual(p('1\tA\t100\n\n2\tB\t50\n\n').length, 2);
  });

  QPE_TEST.test('Missing prize column → null', () => {
    const out = p('1\tPlayer A\n2\tPlayer B');
    QPE_TEST.assertEqual(out[0].prize, null);
  });

  QPE_TEST.test('Header row skipped (non-numeric first col)', () => {
    const out = p('Rank\tName\tPrize\n1\tA\t100\n2\tB\t50');
    QPE_TEST.assertEqual(out.length, 2);
    QPE_TEST.assertEqual(out[0].name, 'A');
  });

  QPE_TEST.test('Vietnamese unicode preserved', () => {
    QPE_TEST.assertEqual(p('1\tNguyễn Văn Đức\t1000')[0].name, 'Nguyễn Văn Đức');
  });

  QPE_TEST.test('Trailing whitespace trimmed', () => {
    const out = p('1\t  Player A  \t  100  ');
    QPE_TEST.assertEqual(out[0].name, 'Player A');
    QPE_TEST.assertEqual(out[0].prize, 100);
  });

  QPE_TEST.test('Prize with thousand separators "5,000,000"', () => {
    QPE_TEST.assertEqual(p('1\tPlayer\t5,000,000')[0].prize, 5000000);
  });

  QPE_TEST.test('Prize with VND symbol "5,000,000 ₫" parsed', () => {
    QPE_TEST.assertEqual(p('1\tPlayer\t5,000,000 ₫')[0].prize, 5000000);
  });

  QPE_TEST.test('Prize VN format "5.000.000" → 5000000 (not 5)', () => {
    QPE_TEST.assertEqual(p('1\tPlayer\t5.000.000')[0].prize, 5000000);
  });

  QPE_TEST.test('Prize malformed "5..000" still strips to digits', () => {
    QPE_TEST.assertEqual(p('1\tPlayer\t5..000')[0].prize, 5000);
  });

  QPE_TEST.test('Empty input → []', () => {
    QPE_TEST.assertDeepEqual(p(''), []);
    QPE_TEST.assertDeepEqual(p('   \n   '), []);
  });

  QPE_TEST.test('Single column (no rank) → skipped', () => {
    QPE_TEST.assertEqual(p('Player A\nPlayer B').length, 0);
  });
});

QPE_TEST.suite('parse.normalizeName', () => {
  const n = (s) => QPE.parse.normalizeName(s);

  QPE_TEST.test('trim leading/trailing spaces', () => {
    QPE_TEST.assertEqual(n('  Nguyễn Văn A  '), 'Nguyễn Văn A');
  });

  QPE_TEST.test('collapse multiple spaces', () => {
    QPE_TEST.assertEqual(n('Nguyễn   Văn  A'), 'Nguyễn Văn A');
  });

  QPE_TEST.test('NFC normalize: composed vs decomposed unicode', () => {
    const composed = 'Nguyễn';
    const decomposed = 'Nguyễn';
    QPE_TEST.assertEqual(n(composed), n(decomposed));
  });

  QPE_TEST.test('non-string input → empty string', () => {
    QPE_TEST.assertEqual(n(null), '');
    QPE_TEST.assertEqual(n(undefined), '');
    QPE_TEST.assertEqual(n(123), '');
  });

  QPE_TEST.test('empty string returns empty', () => {
    QPE_TEST.assertEqual(n(''), '');
    QPE_TEST.assertEqual(n('   '), '');
  });

  QPE_TEST.test('tabs and newlines treated as whitespace', () => {
    QPE_TEST.assertEqual(n('Player\tA\nB'), 'Player A B');
  });

  QPE_TEST.test('preserves case', () => {
    QPE_TEST.assertEqual(n('Nguyễn Văn A'), 'Nguyễn Văn A');
    QPE_TEST.assertEqual(n('NGUYEN VAN A'), 'NGUYEN VAN A');
  });
});
