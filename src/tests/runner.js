/**
 * QPC POY — TDD Test Runner
 * Zero-dep mini framework. Load BEFORE individual suite files.
 *
 * API:
 *   QPE_TEST.suite(name, fn)            — group tests
 *   QPE_TEST.test(name, fn)             — register a test
 *   QPE_TEST.assertEqual(a, b, msg?)    — strict ===
 *   QPE_TEST.assertClose(a, b, tol, msg?)   — Math abs diff ≤ tol
 *   QPE_TEST.assertTrue(v, msg?)
 *   QPE_TEST.assertFalse(v, msg?)
 *   QPE_TEST.assertDeepEqual(a, b, msg?)    — JSON-stringify equality
 *   QPE_TEST.assertThrows(fn, msg?)
 *   QPE_TEST.runAll()                       — execute all suites, render results
 *
 * tests.html overrides QPE_TEST.render with DOM render.
 */
(function (global) {
  'use strict';

  const T = {
    suites: [],
    currentSuite: null,
    results: { total: 0, passed: 0, failed: 0, suites: [] }
  };

  T.suite = function (name, fn) {
    const suite = { name, tests: [] };
    T.suites.push(suite);
    T.currentSuite = suite;
    try { fn(); }
    catch (err) {
      suite.tests.push({ name: '<suite setup>', passed: false, error: 'Suite setup threw: ' + err.message });
    }
    T.currentSuite = null;
  };

  T.test = function (name, fn) {
    if (!T.currentSuite) throw new Error('T.test() must be called inside T.suite()');
    const test = { name, passed: false, error: null };
    try { fn(); test.passed = true; }
    catch (err) { test.error = err.message || String(err); }
    T.currentSuite.tests.push(test);
  };

  // ── Assertions ────────────────────────────────────────────

  T.assertEqual = function (actual, expected, msg) {
    if (actual !== expected) {
      throw new Error((msg ? msg + ' — ' : '') +
        'Expected: ' + JSON.stringify(expected) + '   Got: ' + JSON.stringify(actual));
    }
  };

  T.assertClose = function (actual, expected, tolerance, msg) {
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
      throw new Error((msg ? msg + ' — ' : '') +
        'Non-numeric values. Expected: ' + expected + '   Got: ' + actual);
    }
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      throw new Error((msg ? msg + ' — ' : '') +
        'Expected ~' + expected + ' (±' + tolerance + ')   Got: ' + actual +
        '   Diff: ' + diff.toFixed(4));
    }
  };

  T.assertTrue = function (v, msg) {
    if (v !== true) throw new Error((msg ? msg + ' — ' : '') + 'Expected true, got: ' + JSON.stringify(v));
  };

  T.assertFalse = function (v, msg) {
    if (v !== false) throw new Error((msg ? msg + ' — ' : '') + 'Expected false, got: ' + JSON.stringify(v));
  };

  T.assertDeepEqual = function (actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error((msg ? msg + ' — ' : '') + 'Expected: ' + e + '   Got: ' + a);
  };

  T.assertThrows = function (fn, msg) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) throw new Error((msg ? msg + ' — ' : '') + 'Expected function to throw');
  };

  // ── Run + Render ──────────────────────────────────────────

  T.runAll = function () {
    T.results = { total: 0, passed: 0, failed: 0, suites: [] };
    for (const suite of T.suites) {
      const suiteResult = {
        name: suite.name,
        tests: suite.tests,
        passed: suite.tests.filter(t => t.passed).length,
        total: suite.tests.length
      };
      T.results.suites.push(suiteResult);
      T.results.total += suiteResult.total;
      T.results.passed += suiteResult.passed;
      T.results.failed += (suiteResult.total - suiteResult.passed);
    }
    if (typeof T.render === 'function') T.render();
    return T.results;
  };

  // Default render: console only
  T.render = function () {
    const r = T.results;
    console.log('═══ QPC POY TEST RUNNER ═══');
    for (const s of r.suites) {
      const icon = (s.passed === s.total) ? '✓' : '✗';
      console.log(`${icon} ${s.name} (${s.passed}/${s.total})`);
      for (const t of s.tests) {
        if (!t.passed) console.log(`    ✗ ${t.name}\n        ${t.error}`);
      }
    }
    console.log(`\nTOTAL: ${r.passed}/${r.total} passed`);
  };

  global.QPE_TEST = T;
})(typeof window !== 'undefined' ? window : globalThis);
