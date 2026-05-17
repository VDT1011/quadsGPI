/**
 * QPC POY — Tab Annual POY (cross-series, v2.0)
 *
 * Aggregates Series POY ranks into yearly ranking via Master Points × Series Multiplier.
 * See SPEC §11 and engine/annual.js.
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  const M = {
    year: undefined,   // undefined = not yet chosen (auto-pick latest); null = explicit "All years"
    search: ''
  };

  const TIER_LABEL = {
    flagship: ['FLAGSHIP', 'badge-champ'],
    major:    ['MAJOR',    'badge-hr'],
    regional: ['REGIONAL', 'badge-mid'],
    mini:     ['MINI',     'badge-side']
  };

  function render() {
    const container = document.getElementById('tab-annual');
    if (!container) return;

    const series = (QPE_APP.state.series || []);
    const years = [...new Set(series.map(s => s.year).filter(Boolean))].sort((a, b) => b - a);

    if (series.length === 0) {
      container.innerHTML = `
        <h2>Xếp hạng năm</h2>
        <div class="empty-state">
          <div class="icon">🌟</div>
          <p><strong>Chưa có series nào.</strong></p>
          <p>Tạo ít nhất 1 series ở <b>Cấu hình → Series</b> để bắt đầu Xếp hạng năm.</p>
        </div>
      `;
      return;
    }

    if (M.year === undefined && years.length > 0) M.year = years[0];
    const computeOpts = M.year != null ? { year: M.year } : {};
    const lb = QPE.annual.compute(QPE_APP.state, computeOpts);
    const champion = lb[0] || null;

    let filtered = lb;
    if (M.search) {
      const q = M.search.toLowerCase();
      filtered = lb.filter(e => e.player_name.toLowerCase().includes(q));
    }

    const seriesInYear = M.year ? series.filter(s => s.year === M.year) : series;
    const yearLabel = M.year || 'Tất cả năm';

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--sp-4); flex-wrap: wrap; gap: var(--sp-3);">
        <div style="display:flex; align-items:center; gap: var(--sp-3);">
          <h2 style="margin:0;">🌟 Xếp hạng năm <span class="muted" style="font-size: 14px; font-weight: 400;">${yearLabel}</span></h2>
          <select id="an-year" style="font-size: 14px; padding: 6px 10px;">
            ${years.map(y => `<option value="${y}" ${y===M.year?'selected':''}>Năm ${y}</option>`).join('')}
            <option value="all" ${M.year===null?'selected':''}>Tất cả năm</option>
          </select>
        </div>
        <div style="display:flex; gap: var(--sp-2); align-items: center;">
          <input type="text" id="an-search" placeholder="🔍 Tìm..." value="${escapeHtml(M.search)}" style="width: 180px;">
          <button class="btn btn-sm btn-secondary" id="an-export" title="Export Excel">⬇️ Excel</button>
        </div>
      </div>

      ${renderExplainer(seriesInYear)}

      ${champion ? renderChampion(champion) : ''}

      ${seriesInYear.length > 0 ? renderSeriesStrip(seriesInYear) : ''}

      ${lb.length === 0 ? renderEmpty(seriesInYear) : renderTable(filtered)}
    `;

    bind();
  }

  function renderExplainer(seriesInYear) {
    const isSingleSeries = seriesInYear.length === 1;
    const s = seriesInYear[0];
    return `
      <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-4); display: flex; align-items: flex-start; gap: var(--sp-4);">
        <div style="font-size: 22px;">ℹ️</div>
        <div style="flex: 1; font-size: 13px; line-height: 1.6; color: var(--text-1);">
          <strong style="color: var(--text-0);">Xếp hạng năm tổng hợp điểm xuyên series trong năm.</strong>
          Top 50 của mỗi series được <strong style="color: var(--gold);">Master Points (MP)</strong> theo bảng cố định (rank 1 = 1000, rank 50 = 15).
          MP được nhân với <strong style="color: var(--gold);">×Multiplier</strong> của series (Flagship ×1.0, Major ×0.7, Regional ×0.5, Mini ×0.3).
          ${isSingleSeries ? `<br><span class="muted">📌 Hiện chỉ có 1 series "${escapeHtml(s.short_name || s.name)}" — Xếp hạng năm = Series POY × ${(s.multiplier||0).toFixed(2)}. Khi có thêm series, các điểm sẽ cộng dồn.</span>` : ''}
        </div>
      </div>
    `;
  }

  function renderChampion(c) {
    const yearLabel = M.year || 'All-time';
    const player = QPE_APP.state.players.find(p => p.id === c.player_id);
    const flag = player && player.country ? QPE.utils.countryFlag(player.country) : '';
    const idTag = player && player.display_id
      ? `<span class="muted" style="font-family: var(--font-mono); font-size: 13px; margin-left: 8px;">${escapeHtml(player.display_id)}</span>`
      : '';
    const bestRank = Number.isFinite(c.tie_break_data.best_series_rank) ? '#' + c.tie_break_data.best_series_rank : '—';
    return `
      <div style="background: var(--bg-1); border: 1px solid var(--gold); border-radius: var(--rd-lg); padding: var(--sp-5); margin-bottom: var(--sp-4); box-shadow: var(--sh-gold); display: flex; align-items: center; gap: var(--sp-5);">
        <div style="font-family: var(--font-mono); font-size: 36px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums; min-width: 130px;">${QPE.utils.fmtPts(c.annual_mp)}<span style="font-size: 14px; color: var(--text-2);"> MP</span></div>
        <div style="flex: 1; border-left: 1px solid var(--border-gold); padding-left: var(--sp-5);">
          <div style="color: var(--gold); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">🌟 PLAYER OF THE YEAR · ${yearLabel}</div>
          <div style="font-size: 22px; font-weight: 700; color: var(--text-0); margin-top: 4px;">
            ${flag ? `<span style="font-size: 22px; margin-right: 8px;">${flag}</span>` : ''}${escapeHtml(c.player_name)}${idTag}
          </div>
          <div class="muted" style="margin-top: 4px; font-size: 12px;">
            Chơi <strong style="color: var(--text-0);">${c.tie_break_data.series_played} series</strong> · best rank <strong style="color: var(--text-0);">${bestRank}</strong> · single series cao nhất <strong style="color: var(--gold);">${QPE.utils.fmtPts(c.tie_break_data.max_single_mp)} MP</strong>
          </div>
        </div>
      </div>
    `;
  }

  function renderSeriesStrip(series) {
    return `
      <div style="margin-bottom: var(--sp-4);">
        <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: var(--sp-2);">Series tham gia (${series.length})</div>
        <div style="display: flex; gap: var(--sp-2); flex-wrap: wrap;">
          ${series.map(s => {
            const [tierLabel, tierClass] = TIER_LABEL[s.tier] || ['?', 'badge-side'];
            const eventCount = QPE_APP.state.events.filter(e => e.series_id === s.id).length;
            const dateStr = QPE.utils.fmtDateRange(s.date_start, s.date_end);
            return `
              <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-md); padding: 10px 14px; display: flex; align-items: center; gap: 12px; font-size: 12px;">
                <span class="badge ${tierClass}">${tierLabel}</span>
                <div>
                  <div><strong style="color: var(--text-0);">${escapeHtml(s.short_name || s.name)}</strong></div>
                  <div class="muted" style="font-size: 11px; margin-top: 2px;">${dateStr} · ${eventCount} events · MP ×${(s.multiplier || 0).toFixed(2)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderEmpty(seriesList) {
    return `
      <div class="empty-state">
        <div class="icon">🌟</div>
        <p><strong>Chưa có player nào eligible.</strong></p>
        <p>Cần ít nhất 1 player cash đủ min threshold trong 1 series để xuất hiện trên Xếp hạng năm.</p>
      </div>
    `;
  }

  function renderTable(entries) {
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Player</th>
              <th style="width: 120px; text-align: right;">Annual MP</th>
              <th style="width: 90px; text-align: right;">Series</th>
              <th style="width: 200px;">Best Series Rank</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map((e, i) => renderRow(e, i + 1)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderRow(e, displayRank) {
    const rankCls = displayRank <= 3 ? `rank-${displayRank}` : '';
    const medal = displayRank === 1 ? '🥇' : displayRank === 2 ? '🥈' : displayRank === 3 ? '🥉' : '';
    const bestSeries = e.by_series.find(s => s.series_rank === e.tie_break_data.best_series_rank);
    const bestStr = bestSeries
      ? `${escapeHtml(bestSeries.series_short)} <span class="muted">#${bestSeries.series_rank}</span>`
      : '—';
    const player = QPE_APP.state.players.find(p => p.id === e.player_id);
    const flag = player && player.country ? QPE.utils.countryFlag(player.country) : '';
    const idTag = player && player.display_id
      ? `<span class="muted" style="font-family: var(--font-mono); font-size: 11px; margin-left: 6px;">${escapeHtml(player.display_id)}</span>`
      : '';
    return `
      <tr class="${rankCls}" data-pid="${escapeHtml(e.player_id)}" style="cursor: pointer;">
        <td class="num" style="text-align: left;">${medal}${displayRank}</td>
        <td>${flag ? `<span style="font-size: 16px; margin-right: 8px;">${flag}</span>` : ''}<strong>${escapeHtml(e.player_name)}</strong>${idTag}</td>
        <td class="num" style="color: var(--gold); font-size: 15px;">${QPE.utils.fmtPts(e.annual_mp)}</td>
        <td class="num">${e.tie_break_data.series_played}</td>
        <td style="color: var(--text-2); font-size: 13px;">${bestStr}</td>
      </tr>
    `;
  }

  function bind() {
    const yearSel = document.getElementById('an-year');
    if (yearSel) yearSel.addEventListener('change', (e) => {
      M.year = e.target.value === 'all' ? null : parseInt(e.target.value, 10);
      render();
    });

    const search = document.getElementById('an-search');
    if (search) {
      const onSearch = QPE.utils.debounce((val) => { M.search = val; render(); }, 200);
      search.addEventListener('input', (e) => onSearch(e.target.value));
    }

    const exp = document.getElementById('an-export');
    if (exp) exp.addEventListener('click', exportXLSX);

    document.querySelectorAll('tr[data-pid]').forEach(tr => {
      tr.addEventListener('click', () => openPlayerDetail(tr.dataset.pid));
    });
  }

  function openPlayerDetail(pid) {
    const lb = QPE.annual.compute(QPE_APP.state, M.year != null ? { year: M.year } : {});
    const entry = lb.find(e => e.player_id === pid);
    if (!entry) return;

    const tierColor = (t) => {
      const map = { flagship: 'var(--gold)', major: 'var(--tier-hr)', regional: 'var(--tier-mid)', mini: 'var(--tier-side)' };
      return map[t] || 'var(--text-1)';
    };

    const playerInfo = QPE_APP.state.players.find(p => p.id === entry.player_id);
    const flag = playerInfo && playerInfo.country ? QPE.utils.countryFlag(playerInfo.country) : '';
    const idTag = playerInfo && playerInfo.display_id ? `<span class="muted" style="font-family: var(--font-mono); font-size: 13px; margin-left: 8px;">${escapeHtml(playerInfo.display_id)}</span>` : '';
    const bestRank = Number.isFinite(entry.tie_break_data.best_series_rank) ? '#' + entry.tie_break_data.best_series_rank : '—';

    const body = document.createElement('div');
    body.innerHTML = `
      <div style="display: flex; gap: var(--sp-4); align-items: center; margin-bottom: var(--sp-5); padding: var(--sp-4); background: var(--bg-2); border-radius: var(--rd-md);">
        ${flag ? `<div style="font-size: 36px;">${flag}</div>` : ''}
        <div style="flex: 1;">
          <div style="font-size: 18px; font-weight: 700; color: var(--text-0);">${escapeHtml(entry.player_name)}${idTag}</div>
          <div class="muted" style="font-size: 12px; margin-top: 4px;">
            ${entry.tie_break_data.series_played} series · best rank ${bestRank} · max single ${QPE.utils.fmtPts(entry.tie_break_data.max_single_mp)} MP
          </div>
        </div>
        <div style="text-align: right;">
          <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Annual MP</div>
          <div style="font-family: var(--font-mono); font-size: 32px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums;">${QPE.utils.fmtPts(entry.annual_mp)}</div>
        </div>
      </div>

      <h3 style="margin-bottom: var(--sp-2); font-size: 14px;">Cách tính: MP raw × Multiplier mỗi series</h3>
      <p class="muted" style="font-size: 12px; margin: 0 0 var(--sp-3);">Rank trong series → MP raw (bảng cố định, rank 1 = 1000) → ×Multiplier của series → Weighted MP.</p>
      <div class="table-wrap" style="max-height: 320px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th>Series</th>
              <th style="width: 100px;">Tier</th>
              <th style="width: 80px; text-align: right;">Rank</th>
              <th style="width: 90px; text-align: right;">MP raw</th>
              <th style="width: 80px; text-align: right;">×Mult</th>
              <th style="width: 110px; text-align: right;">→ Weighted</th>
            </tr>
          </thead>
          <tbody>
            ${entry.by_series
              .slice()
              .sort((a, b) => b.mp_weighted - a.mp_weighted)
              .map(s => {
                const [tierLabel, tierClass] = TIER_LABEL[s.series_tier] || ['?', 'badge-side'];
                return `
                  <tr>
                    <td><strong>${escapeHtml(s.series_name)}</strong></td>
                    <td><span class="badge ${tierClass}">${tierLabel}</span></td>
                    <td class="num">#${s.series_rank}</td>
                    <td class="num">${QPE.utils.fmtPts(s.mp)}</td>
                    <td class="num" style="color: var(--text-2);">×${(s.multiplier || 0).toFixed(2)}</td>
                    <td class="num" style="color: var(--gold); font-weight: 700;">${QPE.utils.fmtPts(s.mp_weighted)}</td>
                  </tr>
                `;
              }).join('')}
            <tr style="background: var(--bg-2);">
              <td colspan="5" style="text-align: right; color: var(--text-2); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Tổng Annual MP</td>
              <td class="num" style="color: var(--gold); font-size: 16px; font-weight: 800;">${QPE.utils.fmtPts(entry.annual_mp)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    UI.modal.open({
      title: entry.player_name,
      body
    });
  }

  function exportXLSX() {
    const lb = QPE.annual.compute(QPE_APP.state, M.year != null ? { year: M.year } : {});
    const blob = MiniXLSX.write({
      sheetName: `Xep hang nam ${M.year || 'All'}`,
      columns: [
        { header: 'Rank',             key: 'rank',     type: 'number', width: 8  },
        { header: 'Player',           key: 'name',                       width: 32 },
        { header: 'Annual MP',        key: 'mp',       type: 'number', width: 14 },
        { header: 'Series Played',    key: 'played',   type: 'number', width: 14 },
        { header: 'Best Series Rank', key: 'best',     type: 'number', width: 18 },
        { header: 'Max Single MP',    key: 'maxMp',    type: 'number', width: 14 }
      ],
      rows: lb.map((e, i) => ({
        rank:   i + 1,
        name:   e.player_name,
        mp:     e.annual_mp,
        played: e.tie_break_data.series_played,
        best:   e.tie_break_data.best_series_rank,
        maxMp:  e.tie_break_data.max_single_mp
      }))
    });
    MiniXLSX.download(blob, `qpc-annual-poy-${M.year || 'all'}-${new Date().toISOString().slice(0,10)}.xlsx`);
    UI.toast.show('Đã export Xếp hạng năm', 'success');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    render();
    QPE_APP.subscribe(() => {
      if (QPE_UI.tabs.current() === 'annual') render();
    });
    QPE_UI.tabs.onSwitch((name) => {
      if (name === 'annual') render();
    });
  }

  UI.annual = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
