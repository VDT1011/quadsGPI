/**
 * QPC POY 2026 — Seed data
 * Events từ Quads Poker Championship 17/6 – 29/6/2026, GTD 80B.
 *
 * Tier classification:
 *   championship — Main Event, Mini Main, Micro Main, Quads Star, Signature, Championship, Kick Off
 *   high_roller  — buyin ≥ 30M VND
 *   mid_stakes   — buyin 5–15M VND (Hyper Turbo HR, Quads Kickstarter/Premium/Elite/Unity, Super Deepstack)
 *   side         — daily grindable + Women's: Megastack, Evening Storm, Super Hyper Turbo, Women's Champ
 *
 * Structure: { series: {...}, events: [...] }
 * Each event has `series_id` pointing back to the series.
 *
 * Satellites và Day 2 (qualified-only) KHÔNG có trong seed.
 */
(function (global) {
  'use strict';

  const SERIES_ID = 'qpc_2026_1';

  const series = {
    id: SERIES_ID,
    name: 'Quads Poker Championship I',
    short_name: 'QPC I',
    year: 2026,
    date_start: '2026-06-17',
    date_end:   '2026-06-29',
    tier: 'flagship',         // flagship | major | regional | mini (for future Annual POY)
    multiplier: 1.00,
    status: 'scheduled'
  };

  function E(id, code, name, tier, buyin, gtd, itm, dateStart, opts) {
    opts = opts || {};
    return {
      id,
      series_id: SERIES_ID,
      code,
      name,
      tier,
      is_womens: !!opts.is_womens,
      is_multi_flight: !!opts.is_multi_flight,
      date_start: dateStart,
      date_end: opts.date_end || dateStart,
      buyin_listed: buyin,
      is_satellite: false,
      status: 'scheduled',
      gtd_vnd: gtd || 0,
      prizepool_actual: 0,
      overlay_covered: true,
      entries_total: 0,
      unique_players: 0,
      itm_cutoff: itm || 0
    };
  }

  const events = [
    // ═══ DAY 17/6 (Wed) ═══
    E('1_kickoff',    '#1',  'Kick Off Event',                 'championship', 7_700_000,   6_000_000_000, 0, '2026-06-17', { is_multi_flight: true,  date_end: '2026-06-19' }),
    E('2_hr_ultra',   '#2',  'High Roller - Ultra Stack',      'high_roller',  44_000_000,  2_000_000_000, 0, '2026-06-17', { date_end: '2026-06-18' }),
    E('mega_d1',      '—',   'Daily Megastack (17/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-17'),
    E('sht_d1',       '—',   'NLH Super Hyper Turbo (17/6)',   'side',         4_500_000,     0,           10, '2026-06-17'),
    E('hthr_d1',      '—',   'Hyper Turbo High Roller (17/6)', 'mid_stakes',   11_000_000,    0,            8, '2026-06-17'),

    // ═══ DAY 18/6 (Thu) ═══
    E('mega_d2',      '—',   'Daily Megastack (18/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-18'),
    E('8_quads_star', '#8',  'Quads Star Challenge',           'championship', 88_000_000,    3_000_000_000, 0, '2026-06-18', { date_end: '2026-06-19' }),
    E('superdeep_1',  '—',   'Super Deepstack 8-max',          'mid_stakes',   6_600_000,     0,           10, '2026-06-18'),
    E('3_women',      '#3',  'Women Championship #3',          'side',         4_500_000,     0,           12, '2026-06-18', { is_womens: true }),
    E('sht_d2',       '—',   'NLH Super Hyper Turbo (18/6)',   'side',         4_500_000,     0,           10, '2026-06-18'),
    E('storm_d2',     '—',   'Evening Storm 8-max (18/6)',     'side',         2_300_000,     0,            8, '2026-06-18'),

    // ═══ DAY 19/6 (Fri) ═══
    E('13_signature', '#13', 'Quads Signature Champion',       'championship', 9_900_000,     4_000_000_000, 0, '2026-06-19', { is_multi_flight: true, date_end: '2026-06-20' }),
    E('14_shr',       '#14', 'Super High Roller - Prestige',   'high_roller',  109_000_000,   2_000_000_000, 0, '2026-06-19', { date_end: '2026-06-20' }),
    E('mega_d3',      '—',   'Daily Megastack (19/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-19'),
    E('sht_d3',       '—',   'NLH Super Hyper Turbo (19/6)',   'side',         4_500_000,     0,           10, '2026-06-19'),
    E('hthr_d3',      '—',   'Hyper Turbo High Roller (19/6)', 'mid_stakes',   11_000_000,    0,            8, '2026-06-19'),

    // ═══ DAY 20/6 (Sat) ═══
    E('18_main',      '#18', 'Main Event',                     'championship', 27_500_000,    25_000_000_000, 0, '2026-06-20', { is_multi_flight: true, date_end: '2026-06-24' }),
    E('kickstarter',  '—',   'Quads Kickstarter',              'mid_stakes',   8_800_000,     800_000_000, 14, '2026-06-20'),
    E('mega_d4',      '—',   'Daily Megastack (20/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-20'),
    E('sht_d4',       '—',   'NLH Super Hyper Turbo (20/6)',   'side',         4_500_000,     0,           10, '2026-06-20'),
    E('storm_d4',     '—',   'Evening Storm 8-max (20/6)',     'side',         2_300_000,     0,            8, '2026-06-20'),

    // ═══ DAY 21/6 (Sun) ═══
    E('premium',      '—',   'Quads Premium',                  'mid_stakes',   6_600_000,     600_000_000, 12, '2026-06-21'),
    E('24_hr_grand',  '#24', 'High Roller - Grand Prix',       'high_roller',  66_000_000,    2_000_000_000, 0, '2026-06-21', { date_end: '2026-06-22' }),
    E('mega_d5',      '—',   'Daily Megastack (21/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-21'),
    E('sht_d5',       '—',   'NLH Super Hyper Turbo (21/6)',   'side',         4_500_000,     0,           10, '2026-06-21'),
    E('hthr_d5',      '—',   'Hyper Turbo High Roller (21/6)', 'mid_stakes',   11_000_000,    0,            8, '2026-06-21'),

    // ═══ DAY 22/6 (Mon) ═══
    E('elite',        '—',   'Quads Elite',                    'mid_stakes',   5_500_000,     500_000_000, 10, '2026-06-22'),
    E('hr_single',    '—',   'High Roller - Single Day',       'high_roller',  33_000_000,    1_500_000_000, 10, '2026-06-22'),
    E('mega_d6',      '—',   'Daily Megastack (22/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-22'),
    E('sht_d6',       '—',   'NLH Super Hyper Turbo (22/6)',   'side',         4_500_000,     0,           10, '2026-06-22'),
    E('hthr_d6',      '—',   'Hyper Turbo High Roller (22/6)', 'mid_stakes',   11_000_000,    0,            8, '2026-06-22'),
    E('storm_d6',     '—',   'Evening Storm 8-max (22/6)',     'side',         2_300_000,     0,            8, '2026-06-22'),

    // ═══ DAY 23/6 (Tue) ═══
    E('unity',        '—',   'Quads Unity',                    'mid_stakes',   6_600_000,     600_000_000, 12, '2026-06-23'),
    E('36_hr_imp',    '#36', 'High Roller - Imperial',         'high_roller',  38_500_000,    1_200_000_000, 0, '2026-06-23', { date_end: '2026-06-24' }),
    E('mega_d7',      '—',   'Daily Megastack (23/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-23'),
    E('sht_d7',       '—',   'NLH Super Hyper Turbo (23/6)',   'side',         4_500_000,     0,           10, '2026-06-23'),
    E('storm_d7',     '—',   'Evening Storm 8-max (23/6)',     'side',         2_300_000,     0,            8, '2026-06-23'),

    // ═══ DAY 24/6 (Wed) ═══
    E('40_mini_main', '#40', 'Mini Main Event',                'championship', 5_500_000,     800_000_000, 0, '2026-06-24', { is_multi_flight: true, date_end: '2026-06-26' }),
    E('9_women',      '#9',  'Women Championship #9',          'side',         4_500_000,     0,           12, '2026-06-24', { is_womens: true }),
    E('mega_d8',      '—',   'Daily Megastack (24/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-24'),
    E('hthr_d8',      '—',   'Hyper Turbo High Roller (24/6)', 'mid_stakes',   11_000_000,    0,            8, '2026-06-24'),

    // ═══ DAY 25/6 (Thu) ═══
    E('superdeep_2',  '—',   'Super Deepstack 8-max (25/6)',   'mid_stakes',   6_600_000,     0,           10, '2026-06-25'),
    E('mega_d9',      '—',   'Daily Megastack (25/6)',         'side',         3_400_000,     150_000_000, 14, '2026-06-25'),
    E('storm_d9',     '—',   'Evening Storm 8-max (25/6)',     'side',         2_300_000,     0,            8, '2026-06-25'),

    // ═══ DAY 27-28/6 (Sat-Sun) ═══
    E('49_micro',     '#49', 'Micro Main Event',               'championship', 2_750_000,     500_000_000, 0, '2026-06-27', { is_multi_flight: true, date_end: '2026-06-28' }),
    E('50_champ',     '#50', 'Championship',                   'championship', 11_000_000,    1_000_000_000, 0, '2026-06-27'),
    E('25_women',     '#25', 'Women Championship #25',         'side',         4_500_000,     0,           12, '2026-06-27', { is_womens: true }),
    E('65_mini_hr',   '#65', 'Mini High Roller',               'high_roller',  16_500_000,    600_000_000, 0, '2026-06-28'),
    E('hthr_d12',     '—',   'Hyper Turbo High Roller (28/6)', 'mid_stakes',   11_000_000,    0,            8, '2026-06-28')
  ];

  global.QPE_SEED = {
    qpc2026: {
      series: series,
      events: events
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
