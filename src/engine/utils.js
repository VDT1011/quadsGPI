/**
 * QPC POY Engine — Utility helpers
 *
 * - uuid()         → short random id for players
 * - fmtVnd(n)      → "25,000,000 ₫" Vietnamese number format
 * - fmtPts(n)      → "15,811" thousands-separated integer
 */
(function (global) {
  'use strict';
  const QPE = global.QPE;

  QPE.utils.uuid = function () {
    return 'p_' + Math.random().toString(36).slice(2, 10);
  };

  QPE.utils.fmtVnd = function (n) {
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
  };

  QPE.utils.fmtPts = function (n) {
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('en-US').format(Math.round(n));
  };

  /**
   * Compact VND for hero displays: 25M, 1.5B, etc.
   */
  QPE.utils.fmtVndCompact = function (n) {
    if (!Number.isFinite(n) || n === 0) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B ₫';
    if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M ₫';
    if (abs >= 1e3) return (n / 1e3).toFixed(0) + 'K ₫';
    return n + ' ₫';
  };

  /**
   * Format ISO date YYYY-MM-DD → "DD/MM/YYYY".
   * Returns "—" if invalid/empty.
   */
  QPE.utils.fmtDate = function (iso) {
    if (!iso || typeof iso !== 'string') return '—';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return `${m[3]}/${m[2]}/${m[1]}`;
  };

  /**
   * Format date range as "DD/MM/YYYY → DD/MM/YYYY".
   * If start === end (or end missing), returns single date.
   */
  QPE.utils.fmtDateRange = function (start, end) {
    if (!start) return '—';
    const s = QPE.utils.fmtDate(start);
    if (!end || end === start) return s;
    return s + ' → ' + QPE.utils.fmtDate(end);
  };

  /**
   * Compact date for tight UIs: "DD/MM" (skips year — use for current-year contexts).
   */
  QPE.utils.fmtDateShort = function (iso) {
    if (!iso || typeof iso !== 'string') return '—';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return `${m[3]}/${m[2]}`;
  };

  /**
   * Convert ISO 3166-1 alpha-2 country code → flag emoji.
   *   "VN" → "🇻🇳"   "US" → "🇺🇸"   "GB" → "🇬🇧"
   * Returns empty string if invalid.
   */
  QPE.utils.countryFlag = function (code) {
    if (!code || typeof code !== 'string') return '';
    const c = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(c)) return '';
    // Regional indicator symbols start at U+1F1E6 ('A')
    return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65) +
           String.fromCodePoint(0x1F1E6 + c.charCodeAt(1) - 65);
  };

  /**
   * Normalize country code input: "vn", "Vn", "VIETNAM" → "VN"
   * Returns empty string if can't normalize to 2-letter code.
   */
  QPE.utils.normalizeCountry = function (input) {
    if (!input || typeof input !== 'string') return '';
    const s = input.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(s)) return s;
    // Common Vietnamese poker country mappings
    const map = {
      'VIETNAM': 'VN', 'VIET NAM': 'VN', 'VIỆT NAM': 'VN',
      // Note: ISO 2-letter codes are passed through by the early regex check above.
      // Avoid ambiguous aliases — "MY" is Malaysia (ISO), do NOT remap to US.
      'USA': 'US', 'UNITED STATES': 'US', 'AMERICA': 'US', 'MỸ': 'US',
      'UK': 'GB', 'BRITAIN': 'GB', 'ENGLAND': 'GB',
      'AUSTRALIA': 'AU',  'AUS': 'AU',
      'CANADA': 'CA',     'CAN': 'CA',
      'JAPAN': 'JP',      'JPN': 'JP', 'NHẬT': 'JP', 'NHAT': 'JP',
      'KOREA': 'KR',      'SOUTH KOREA': 'KR', 'HÀN': 'KR', 'HAN': 'KR',
      'CHINA': 'CN',      'CHN': 'CN', 'TRUNG QUỐC': 'CN', 'TRUNG QUOC': 'CN',
      'TAIWAN': 'TW',     'ĐÀI LOAN': 'TW', 'DAI LOAN': 'TW',
      'HONG KONG': 'HK',  'HK': 'HK',
      'SINGAPORE': 'SG',  'SG': 'SG',
      'MALAYSIA': 'MY',   'MAS': 'MY',
      'THAILAND': 'TH',   'THAI': 'TH', 'THÁI LAN': 'TH', 'THAI LAN': 'TH',
      'PHILIPPINES': 'PH','PHIL': 'PH', 'FILIPINO': 'PH',
      'INDONESIA': 'ID',  'INDO': 'ID',
      'INDIA': 'IN',
      'FRANCE': 'FR', 'PHÁP': 'FR', 'PHAP': 'FR',
      'GERMANY': 'DE', 'ĐỨC': 'DE', 'DUC': 'DE',
      'RUSSIA': 'RU',
      'BRAZIL': 'BR'
    };
    return map[s] || '';
  };

  /**
   * Parse VND input:
   *   - Plain numbers: "25000000", "25,000,000", "25.000.000" → 25000000 (integer VND, no decimals)
   *   - Shortcuts: "25M", "1.5B", "1,5K" → expanded (decimal allowed in multiplier)
   */
  QPE.utils.parseVnd = function (input) {
    if (typeof input === 'number') return input;
    if (!input || typeof input !== 'string') return 0;
    const s = input.trim().replace(/[\s₫]/g, '');
    const mSuffix = s.match(/^(-?[\d.,]+)([KMB])$/i);
    if (mSuffix) {
      // Normalize decimal separator: last . or , is decimal, others are thousand sep
      const num = mSuffix[1].replace(/,/g, '.');
      const lastDot = num.lastIndexOf('.');
      const cleaned = lastDot === -1
        ? num
        : num.slice(0, lastDot).replace(/\./g, '') + '.' + num.slice(lastDot + 1);
      const mult = { K: 1e3, M: 1e6, B: 1e9 }[mSuffix[2].toUpperCase()];
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? Math.round(n * mult) : 0;
    }
    // Plain number: strip all separators, parse as integer
    const neg = /^-/.test(s);
    const digits = s.replace(/[^\d]/g, '');
    if (!digits) return 0;
    const n = parseInt(digits, 10);
    return neg ? -n : n;
  };

  /**
   * Debounce a function call. Returns a function that delays invocation
   * until `wait` ms have elapsed since the last call.
   */
  QPE.utils.debounce = function (fn, wait) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn.apply(this, args); }, wait);
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
