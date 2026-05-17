/**
 * QPC POY Engine — Parsing helpers
 *
 * Public:
 *   QPE.parse.tsv(text)            → [{rank, name, prize}]
 *   QPE.parse.csv(text)            → alias of tsv (auto-detect delimiter)
 *   QPE.parse.normalizeName(s)     → NFC-normalized, trimmed, collapsed-whitespace
 */
(function (global) {
  'use strict';
  const QPE = global.QPE;

  /**
   * Parse delimited text (TSV/CSV) into array of {rank, name, prize, country?, display_id?}.
   *
   * Auto-detects delimiter: tab > semicolon > comma.
   *
   * Smart header detection: if first row contains named columns, parses by header.
   * Otherwise falls back to positional: rank | name | prize | [country | id]
   *
   * Header aliases:
   *   rank   → rank, #, hạng, vị trí
   *   name   → name, tên, ten, player
   *   prize  → prize, money, tiền thưởng, prize_vnd
   *   country → country, nation, quốc gia, qg, flag, nước
   *   id     → id, player_id, mã, code, nickname, nick
   */
  QPE.parse.tsv = function (text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    const first = lines[0];
    let delim;
    if (first.includes('\t')) delim = '\t';
    else if (first.includes(';')) delim = ';';
    else if (first.includes(',')) delim = ',';
    else delim = '\t';

    // Detect header row: first cell non-numeric AND looks like header text
    const firstCols = first.split(delim).map(c => c.trim().toLowerCase());
    const firstHasHeader = !/^\d+$/.test(firstCols[0]) && firstCols.length >= 2;

    let cIdxRank = 0, cIdxName = 1, cIdxPrize = 2, cIdxCountry = -1, cIdxId = -1;
    let dataStart = 0;

    if (firstHasHeader) {
      const findCol = (...aliases) => {
        for (const a of aliases) {
          const i = firstCols.indexOf(a);
          if (i >= 0) return i;
        }
        return -1;
      };
      cIdxRank    = findCol('rank', '#', 'hạng', 'hang', 'vị trí', 'vi tri');
      cIdxName    = findCol('name', 'tên', 'ten', 'player');
      cIdxPrize   = findCol('prize', 'money', 'tiền', 'tien', 'prize_vnd', 'tiền thưởng');
      cIdxCountry = findCol('country', 'nation', 'quốc gia', 'quoc gia', 'qg', 'flag', 'nước', 'nuoc');
      cIdxId      = findCol('id', 'player_id', 'mã', 'ma', 'code', 'nickname', 'nick');

      if (cIdxRank < 0 || cIdxName < 0) {
        // Header didn't match — assume positional
        cIdxRank = 0; cIdxName = 1; cIdxPrize = 2;
        cIdxCountry = -1; cIdxId = -1;
      } else {
        dataStart = 1;  // skip header row
      }
    }

    const out = [];
    for (let i = dataStart; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim());
      const rank = parseInt(cols[cIdxRank], 10);
      if (!Number.isFinite(rank) || rank <= 0) continue;
      const name = (cols[cIdxName] || '').trim();
      let prize = null;
      if (cIdxPrize >= 0 && cols[cIdxPrize] !== undefined && cols[cIdxPrize] !== '') {
        const raw = cols[cIdxPrize].trim();
        const neg = /^-/.test(raw);
        const digits = raw.replace(/[^\d]/g, '');
        if (digits) {
          const n = parseInt(digits, 10);
          prize = neg ? -n : n;
        }
      }
      const row = { rank, name, prize };
      if (cIdxCountry >= 0 && cols[cIdxCountry]) {
        row.country = cols[cIdxCountry];
      }
      if (cIdxId >= 0 && cols[cIdxId]) {
        row.display_id = cols[cIdxId];
      }
      out.push(row);
    }
    return out;
  };

  QPE.parse.csv = QPE.parse.tsv;

  /**
   * Normalize player name for identity comparison.
   *  - NFC unicode normalization (composed form)
   *  - Trim leading/trailing whitespace
   *  - Collapse internal whitespace
   *  - Preserves case
   */
  QPE.parse.normalizeName = function (s) {
    if (typeof s !== 'string') return '';
    return s.normalize('NFC').replace(/\s+/g, ' ').trim();
  };

  /**
   * Normalize date string to YYYY-MM-DD.
   * Accepts: ISO, DD/MM/YYYY, DD-MM-YYYY, DD/MM (current year).
   */
  function normalizeDate(s) {
    if (!s) return '';
    s = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY or D/M/YYYY (full year)
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    // DD/MM/YY (2-digit year → assume 20YY for YY < 70, else 19YY)
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
    if (m) {
      const yy = parseInt(m[3], 10);
      const year = yy < 70 ? 2000 + yy : 1900 + yy;
      return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    // DD/MM (no year → current year)
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
    if (m) {
      const year = new Date().getFullYear();
      return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return s;
  }

  /**
   * Parse events table (TSV/CSV) for bulk import.
   *
   * Expected header row (case-insensitive, multiple aliases supported):
   *   name | tier | buyin | gtd | date | end | itm | code | women | multi
   *
   * Returns: { rows: [event objects], errors: [string], warnings: [string] }
   * Each row is a partial event (without id/series_id — caller assigns).
   */
  QPE.parse.eventsTable = function (text) {
    const result = { rows: [], errors: [], warnings: [] };
    if (!text || typeof text !== 'string') {
      result.errors.push('Input rỗng');
      return result;
    }
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    if (lines.length < 2) {
      result.errors.push('Cần ≥ 1 dòng header và ≥ 1 dòng dữ liệu');
      return result;
    }

    const first = lines[0];
    let delim;
    if (first.includes('\t')) delim = '\t';
    else if (first.includes(';')) delim = ';';
    else if (first.includes(',')) delim = ',';
    else { result.errors.push('Không nhận diện được delimiter (cần TAB / , / ;)'); return result; }

    const headers = first.split(delim).map(h => h.trim().toLowerCase());
    const findCol = (...aliases) => {
      for (const a of aliases) {
        const i = headers.indexOf(a);
        if (i >= 0) return i;
      }
      return -1;
    };

    const iName  = findCol('name', 'tên', 'ten', 'event', 'tournament');
    const iCode  = findCol('code', 'mã', 'ma', '#');
    const iTier  = findCol('tier', 'hạng', 'hang', 'category');
    const iBuyin = findCol('buyin', 'buy-in', 'buy_in', 'phí', 'phi');
    const iGtd   = findCol('gtd', 'guaranteed', 'đảm bảo', 'dam bao');
    const iDate  = findCol('date', 'date_start', 'ngày', 'ngay', 'bắt đầu', 'bat dau', 'start');
    const iEnd   = findCol('date_end', 'end', 'kết thúc', 'ket thuc');
    const iItm   = findCol('itm', 'số itm', 'so itm', 'itm cutoff', 'itm_cutoff');
    const iWomen = findCol('women', 'womens', 'nữ', 'nu', 'is_womens');
    const iMulti = findCol('multi', 'multi-flight', 'multi_flight', 'flight', 'is_multi_flight');

    if (iName < 0) {
      result.errors.push('Thiếu cột "name" (tên event)');
      return result;
    }

    const validTiers = ['championship', 'high_roller', 'mid_stakes', 'side'];
    const truthy = (s) => /^(y|yes|true|1|x|✓|có|co)$/i.test(String(s || '').trim());

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim());
      const name = (cols[iName] || '').trim();
      if (!name) continue;

      let tier = (cols[iTier] || 'side').toLowerCase().replace(/[\s-]+/g, '_');
      if (!validTiers.includes(tier)) {
        if (/champ/i.test(tier))         tier = 'championship';
        else if (/(^hr|high|roller)/i.test(tier)) tier = 'high_roller';
        else if (/mid/i.test(tier))      tier = 'mid_stakes';
        else                              tier = 'side';
      }

      result.rows.push({
        code:  iCode >= 0 ? cols[iCode] : '',
        name,
        tier,
        buyin_listed: iBuyin >= 0 ? QPE.utils.parseVnd(cols[iBuyin]) : 0,
        gtd_vnd:      iGtd   >= 0 ? QPE.utils.parseVnd(cols[iGtd])   : 0,
        date_start:   iDate  >= 0 ? normalizeDate(cols[iDate])       : '',
        date_end:     iEnd   >= 0 ? normalizeDate(cols[iEnd])        : '',
        itm_cutoff:   iItm   >= 0 ? (parseInt(cols[iItm], 10) || 0)  : 0,
        is_womens:    iWomen >= 0 ? truthy(cols[iWomen])             : false,
        is_multi_flight: iMulti >= 0 ? truthy(cols[iMulti])          : false
      });
    }

    if (result.rows.length === 0) {
      result.errors.push('Không parse được dòng nào');
    }
    return result;
  };

  QPE.parse._normalizeDate = normalizeDate;  // expose for tests
})(typeof window !== 'undefined' ? window : globalThis);
