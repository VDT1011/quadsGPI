/**
 * QPC POY — Tab Leaderboards
 *
 * 3 sub-boards: Overall · High Roller · Women's
 *
 * Public:
 *   QPE_UI.leaderboards.init()
 *   QPE_UI.leaderboards.render()
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  const M = {
    scope: 'overall',        // 'overall' | 'high_roller' | 'womens'
    seriesId: '',            // '' = all series; else filter events by series_id
    showOnlyEligible: false,
    search: ''
  };

  const SCOPE_META = {
    overall:     { icon: '🏆', label: 'Overall',       hero: 'QPC PLAYER OF THE YEAR' },
    high_roller: { icon: '🥇', label: 'High Roller',   hero: 'HIGH ROLLER OF THE SERIES' },
    womens:      { icon: '♕',  label: 'Women\'s',      hero: 'WOMEN\'S PLAYER OF THE SERIES' }
  };

  function render() {
    const container = document.getElementById('tab-leaderboards');
    if (!container) return;

    const seriesList = QPE_APP.state.series || [];
    const selectedSeriesObj = M.seriesId ? seriesList.find(s => s.id === M.seriesId) : null;

    // Filter state.events by selected series (if any) + merge series.minCash into settings
    const filteredState = M.seriesId
      ? { ...QPE_APP.state, events: QPE_APP.state.events.filter(e => e.series_id === M.seriesId) }
      : QPE_APP.state;
    const settings = QPE.leaderboard.effectiveSettings(QPE_APP.state.settings, selectedSeriesObj);
    const lb = QPE.leaderboard.compute(filteredState, M.scope, settings);

    // Compute eligible-only ordering first (used for champion + medals)
    const eligibleSorted = lb.filter(e => e.is_eligible);

    // For the table, apply search + eligibility filter
    let filtered = lb.slice();
    if (M.showOnlyEligible) filtered = filtered.filter(e => e.is_eligible);
    if (M.search) {
      const q = M.search.toLowerCase();
      filtered = filtered.filter(e => e.player_name.toLowerCase().includes(q));
    }

    // Champion = #1 eligible (regardless of filter); medals tied to eligible-rank, not row index
    const champion = eligibleSorted[0] || null;
    const eligibleRankMap = {};
    eligibleSorted.forEach((e, i) => { eligibleRankMap[e.player_id] = i + 1; });

    const selectedSeries = seriesList.find(s => s.id === M.seriesId);
    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--sp-4); flex-wrap: wrap; gap: var(--sp-3);">
        <div style="display:flex; align-items:center; gap: var(--sp-3); flex-wrap: wrap;">
          <h2 style="margin:0;">🏆 Bảng xếp hạng</h2>
          ${seriesList.length > 0 ? `
            <select id="lb-series" style="font-size: 14px; padding: 6px 10px;">
              <option value="" ${M.seriesId===''?'selected':''}>Tất cả series</option>
              ${seriesList.map(s => `<option value="${escapeHtml(s.id)}" ${M.seriesId===s.id?'selected':''}>${escapeHtml(s.short_name || s.name)}</option>`).join('')}
            </select>
          ` : ''}
        </div>
        <div style="display:flex; gap: 0; border: 1px solid var(--border-2); border-radius: var(--rd-md); overflow: hidden;">
          ${Object.entries(SCOPE_META).map(([key, meta]) => `
            <button class="btn btn-sm ${M.scope===key?'btn-primary':'btn-ghost'}" data-scope="${key}" style="border-radius: 0; border: none;">
              ${meta.icon} ${meta.label}
            </button>
          `).join('')}
        </div>
        <div style="display:flex; gap: var(--sp-2); align-items: center;">
          <input type="text" id="lb-search" placeholder="🔍 Tìm..." value="${escapeHtml(M.search)}" style="width: 180px;">
          <label style="display:flex; align-items:center; gap: 6px; cursor:pointer; margin:0; font-size: 13px;">
            <input type="checkbox" id="lb-eligible" ${M.showOnlyEligible?'checked':''}>
            <span class="muted">Eligible</span>
          </label>
          <button class="btn btn-sm btn-secondary" id="lb-export" title="Export CSV">⬇️</button>
        </div>
      </div>

      ${champion ? renderChampionCard(champion) : ''}

      ${filtered.length === 0 ? renderEmpty() : renderTable(filtered, eligibleRankMap)}
    `;

    bind(container);
  }

  function renderEmpty() {
    const completedCount = QPE_APP.state.events.filter(e => e.status === 'completed').length;
    return `
      <div class="empty-state">
        <div class="icon">${SCOPE_META[M.scope].icon}</div>
        <p><strong>${M.scope === 'overall' ? 'POY 2026 chưa khởi tranh' : 'Chưa có kết quả trong sub-board này'}.</strong></p>
        <p>Đã có ${completedCount} event hoàn thành. Sang tab <b>📊 Nhập kết quả</b> để thêm.</p>
      </div>
    `;
  }

  function renderChampionCard(c) {
    const meta = SCOPE_META[M.scope];
    return `
      <div style="background: var(--bg-1); border: 1px solid var(--gold); border-radius: var(--rd-lg); padding: var(--sp-5); margin-bottom: var(--sp-4); box-shadow: var(--sh-gold); display: flex; align-items: center; gap: var(--sp-5);">
        <div style="font-family: var(--font-mono); font-size: 36px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums; min-width: 120px;">${QPE.utils.fmtPts(c.final_total)}</div>
        <div style="flex: 1; border-left: 1px solid var(--border-gold); padding-left: var(--sp-5);">
          <div style="color: var(--gold); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">${meta.icon} ${meta.hero}</div>
          <div style="font-size: 22px; font-weight: 700; color: var(--text-0); margin-top: 4px;">${escapeHtml(c.player_name)}</div>
          <div class="muted" style="margin-top: 4px; font-size: 12px;">
            ${c.events_cashed} cash · best ${c.best_finish ? c.best_finish.event_name + ' #' + c.best_finish.rank : '—'} · ${QPE.utils.fmtVndCompact(c.tie_break_data.total_prize_vnd)}
          </div>
        </div>
      </div>
    `;
  }

  function renderTable(entries, eligibleRankMap) {
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Player</th>
              <th style="width: 110px; text-align: right;">Points</th>
              <th style="width: 80px; text-align: right;">Cashes</th>
              <th style="width: 200px;">Best Finish</th>
              <th style="width: 110px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map((e, i) => renderRow(e, i + 1, eligibleRankMap[e.player_id])).join('')}
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin-top: var(--sp-3); font-size: 12px;">
        ${entries.length} player${entries.length === 1 ? '' : 's'} · Click row để xem chi tiết.
      </p>
    `;
  }

  function renderRow(e, displayRank, eligibleRank) {
    // Medal & row tint based on eligible-only ranking (champion = #1 eligible, not table position)
    const er = eligibleRank;
    const rankCls = (er === 1 || er === 2 || er === 3) ? `rank-${er}` : '';
    const medal = er === 1 ? '🥇' : er === 2 ? '🥈' : er === 3 ? '🥉' : '';
    const bestStr = e.best_finish
      ? `${escapeHtml(e.best_finish.event_name)} <span class="muted">#${e.best_finish.rank}</span>`
      : '—';
    const status = e.is_eligible
      ? '<span class="badge badge-done">Eligible</span>'
      : `<span class="badge badge-warn">< ${minCashFor(M.scope)} cash</span>`;

    // Lookup player for country + display_id
    const player = QPE_APP.state.players.find(p => p.id === e.player_id);
    const flag = player && player.country ? QPE.utils.countryFlag(player.country) : '';
    const idTag = player && player.display_id
      ? `<span class="muted" style="font-family: var(--font-mono); font-size: 11px; margin-left: 6px;">${escapeHtml(player.display_id)}</span>`
      : '';

    return `
      <tr class="${rankCls}" data-player-id="${escapeHtml(e.player_id)}" style="cursor: pointer;">
        <td class="num" style="text-align: left;">${medal}${displayRank}</td>
        <td>${flag ? `<span style="font-size: 16px; margin-right: 8px;">${flag}</span>` : ''}<strong>${escapeHtml(e.player_name)}</strong>${idTag}</td>
        <td class="num" style="color: var(--gold); font-size: 15px;">${QPE.utils.fmtPts(e.final_total)}</td>
        <td class="num">${e.events_cashed}</td>
        <td style="color: var(--text-2); font-size: 13px;">${bestStr}</td>
        <td>${status}</td>
      </tr>
    `;
  }

  function minCashFor(scope) {
    const cfg = QPE_APP.state.settings.minCash || {};
    return cfg[scope] !== undefined ? cfg[scope] : QPE.CONST.MIN_CASH[scope];
  }

  function bind(container) {
    container.querySelectorAll('[data-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        M.scope = btn.dataset.scope;
        render();
      });
    });

    const seriesSel = document.getElementById('lb-series');
    if (seriesSel) seriesSel.addEventListener('change', (e) => {
      M.seriesId = e.target.value;
      render();
    });

    const search = document.getElementById('lb-search');
    if (search) {
      const onSearch = QPE.utils.debounce((val) => { M.search = val; render(); }, 200);
      search.addEventListener('input', (e) => onSearch(e.target.value));
    }

    const elig = document.getElementById('lb-eligible');
    if (elig) elig.addEventListener('change', (e) => { M.showOnlyEligible = e.target.checked; render(); });

    const exp = document.getElementById('lb-export');
    if (exp) exp.addEventListener('click', () => exportXLSX());

    container.querySelectorAll('tr[data-player-id]').forEach(tr => {
      tr.addEventListener('click', () => openPlayerDetail(tr.dataset.playerId));
    });
  }

  // ─── Player detail modal ──────────────────────────────────
  function openPlayerDetail(playerId) {
    const lb = QPE.leaderboard.compute(QPE_APP.state, M.scope, QPE_APP.state.settings);
    const entry = lb.find(e => e.player_id === playerId);
    if (!entry) return;

    const tierLabels = {
      championship: 'Championship',
      high_roller:  'High Roller',
      mid_stakes:   'Mid Stakes',
      side:         'Side'
    };
    const tierColors = {
      championship: 'var(--gold)',
      high_roller:  'var(--tier-hr)',
      mid_stakes:   'var(--tier-mid)',
      side:         'var(--tier-side)'
    };

    // by_tier bars (skip zero tiers)
    const tierBars = Object.entries(entry.by_tier)
      .filter(([_, pts]) => pts > 0)
      .map(([t, pts]) => {
        const pct = (pts / entry.final_total * 100) || 0;
        return `
          <div style="margin-bottom: var(--sp-2);">
            <div style="display:flex; justify-content:space-between; font-size: 12px; margin-bottom: 4px;">
              <span style="color: ${tierColors[t]}; font-weight: 600;">${tierLabels[t]}</span>
              <span class="num">${QPE.utils.fmtPts(pts)} · ${pct.toFixed(0)}%</span>
            </div>
            <div style="background: var(--bg-2); height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="background: ${tierColors[t]}; height: 100%; width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');

    const results = entry.results
      .slice()
      .sort((a, b) => b.points - a.points);

    const body = document.createElement('div');
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-5); margin-bottom: var(--sp-5);">
        <div>
          <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Total Points</div>
          <div style="font-family: var(--font-mono); font-size: 32px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums;">${QPE.utils.fmtPts(entry.final_total)}</div>
        </div>
        <div>
          <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Status</div>
          <div style="margin-top: var(--sp-1);">
            ${entry.is_eligible ? '<span class="badge badge-done">Eligible</span>' : `<span class="badge badge-warn">< ${minCashFor(M.scope)} cash</span>`}
          </div>
          <div class="muted" style="font-size: 13px; margin-top: var(--sp-2);">
            ${entry.events_cashed} cashes · best rank ${Number.isFinite(entry.tie_break_data.best_rank) ? entry.tie_break_data.best_rank : '—'} · ${QPE.utils.fmtVndCompact(entry.tie_break_data.total_prize_vnd)}
          </div>
        </div>
      </div>

      <h3 style="margin-bottom: var(--sp-3);">Breakdown by Tier</h3>
      <div style="margin-bottom: var(--sp-5);">${tierBars}</div>

      <h3 style="margin-bottom: var(--sp-3);">All Results (${results.length})</h3>
      <div class="table-wrap" style="max-height: 320px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th style="width: 100px;">Tier</th>
              <th style="width: 60px; text-align: right;">Rank</th>
              <th style="width: 100px; text-align: right;">Prize</th>
              <th style="width: 80px; text-align: right;">Points</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => {
              const [tierLabel, tierClass] = tierBadge(r.tier);
              return `
                <tr>
                  <td><strong>${escapeHtml(r.event_name)}</strong></td>
                  <td><span class="badge ${tierClass}">${tierLabel}</span></td>
                  <td class="num">${r.rank}</td>
                  <td class="num">${r.prize_vnd ? QPE.utils.fmtVndCompact(r.prize_vnd) : '—'}</td>
                  <td class="num" style="color: var(--gold);">${QPE.utils.fmtPts(r.points)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    UI.modal.open({
      title: entry.player_name,
      body
    });
  }

  function tierBadge(tier) {
    const map = {
      championship: ['CHAMP', 'badge-champ'],
      high_roller:  ['HR',    'badge-hr'],
      mid_stakes:   ['MID',   'badge-mid'],
      side:         ['SIDE',  'badge-side']
    };
    return map[tier] || ['?', 'badge-side'];
  }

  function exportXLSX() {
    const lb = QPE.leaderboard.compute(QPE_APP.state, M.scope, QPE_APP.state.settings);
    const scopeName = SCOPE_META[M.scope].label;
    const blob = MiniXLSX.write({
      sheetName: `POY ${scopeName}`,
      columns: [
        { header: 'Rank',          key: 'rank',      type: 'number', width: 8  },
        { header: 'Player',        key: 'name',                        width: 32 },
        { header: 'Points',        key: 'points',    type: 'number', width: 12 },
        { header: 'Cashes',        key: 'cashes',    type: 'number', width: 10 },
        { header: 'Best Event',    key: 'best',                        width: 36 },
        { header: 'Best Rank',     key: 'bestRank',  type: 'number', width: 12 },
        { header: 'Total Prize',   key: 'prize',     type: 'number', width: 16 },
        { header: 'Eligible',      key: 'elig',                        width: 10 }
      ],
      rows: lb.map((e, i) => ({
        rank:     i + 1,
        name:     e.player_name,
        points:   e.final_total,
        cashes:   e.events_cashed,
        best:     e.best_finish ? e.best_finish.event_name : '',
        bestRank: e.best_finish ? e.best_finish.rank : '',
        prize:    e.tie_break_data.total_prize_vnd || 0,
        elig:     e.is_eligible ? 'Yes' : 'No'
      }))
    });
    MiniXLSX.download(blob, `qpc-poy-${M.scope}-${new Date().toISOString().slice(0,10)}.xlsx`);
    UI.toast.show('Đã export Excel', 'success');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    render();
    QPE_APP.subscribe(() => {
      if (QPE_UI.tabs.current() === 'leaderboards') render();
    });
    QPE_UI.tabs.onSwitch((name) => {
      if (name === 'leaderboards') render();
    });
  }

  UI.leaderboards = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
