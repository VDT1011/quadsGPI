/**
 * QPC POY — Tab Nhập kết quả
 *
 * UI: choose event → enter PP/ITM/entries → paste/upload/manual ITM list → preview points → save.
 *
 * Public:
 *   QPE_UI.results.init()
 *   QPE_UI.results.render()
 *   QPE_UI.results.selectEvent(eventId)  — called from Events tab
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  // Module state (transient — not persisted)
  const M = {
    selectedSeriesId: null,     // null = auto-pick from selected event
    selectedEventId: null,
    inputMode: 'paste',
    parsedRows: [],
    pasteText: '',
    manualRows: []
  };

  function render() {
    const container = document.getElementById('tab-results');
    if (!container) return;

    const allEvents = QPE_APP.state.events
      .filter(e => e.status !== 'cancelled' && !e.is_satellite)
      .sort((a, b) => (a.date_start || '').localeCompare(b.date_start || ''));
    const seriesList = QPE_APP.state.series || [];

    if (allEvents.length === 0) {
      container.innerHTML = `
        <h2>Nhập kết quả</h2>
        <div class="empty-state">
          <div class="icon">📊</div>
          <p><strong>Chưa có event nào để nhập kết quả.</strong></p>
          <p>Vào <b>Cấu hình → Events</b> để seed schedule trước.</p>
        </div>
      `;
      return;
    }

    // Determine selected series
    let selectedSeriesId = M.selectedSeriesId;
    if (!selectedSeriesId) {
      // Auto-pick from selectedEvent's series, or first series with events
      const evMatch = M.selectedEventId && allEvents.find(e => e.id === M.selectedEventId);
      if (evMatch) selectedSeriesId = evMatch.series_id;
      else if (seriesList.length > 0) selectedSeriesId = seriesList[0].id;
    }

    // Events in selected series
    const eventsInSeries = selectedSeriesId
      ? allEvents.filter(e => e.series_id === selectedSeriesId)
      : allEvents;

    // Selected event must be in current series; otherwise pick first
    let selectedEv = eventsInSeries.find(e => e.id === M.selectedEventId);
    if (!selectedEv) {
      selectedEv = eventsInSeries[0] || allEvents[0];
      M.selectedEventId = selectedEv.id;
      M.selectedSeriesId = selectedEv.series_id;
      selectedSeriesId = selectedEv.series_id;
    }

    const completedCount = eventsInSeries.filter(e => e.status === 'completed').length;

    container.innerHTML = `
      <div style="margin-bottom: var(--sp-4);">
        <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Nhập kết quả</div>
        <h2 style="margin: 0 0 var(--sp-4);">${escapeHtml(selectedEv.code ? selectedEv.code + ' · ' : '')}${escapeHtml(selectedEv.name)}</h2>

        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--sp-3); align-items: end;">
          <div>
            <label>Series</label>
            <select id="rs-series-select">
              ${seriesList.length === 0 ? '<option value="">— Chưa có series —</option>' : ''}
              ${seriesList.map(s => `
                <option value="${escapeHtml(s.id)}" ${s.id===selectedSeriesId?'selected':''}>
                  ${escapeHtml(s.short_name || s.name)}
                </option>
              `).join('')}
            </select>
          </div>
          <div>
            <label>Event <span class="muted" style="font-weight: 400;">(${completedCount}/${eventsInSeries.length} đã có kết quả)</span></label>
            <select id="rs-event-select">
              ${eventsInSeries.map(e => `
                <option value="${escapeHtml(e.id)}" ${e.id===selectedEv.id?'selected':''}>
                  ${e.status === 'completed' ? '✓ ' : ''}${escapeHtml(e.code ? e.code + ' · ' : '')}${escapeHtml(e.name)}${e.date_start ? ' — ' + QPE.utils.fmtDateShort(e.date_start) : ''}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>

      <div id="rs-event-meta"></div>

      <div id="rs-input-section" style="margin-top: var(--sp-5);"></div>

      <div id="rs-preview-section" style="margin-top: var(--sp-5);"></div>
    `;

    renderEventMeta(selectedEv);
    renderInputSection(selectedEv);
    renderPreview(selectedEv);

    document.getElementById('rs-series-select').addEventListener('change', (e) => {
      M.selectedSeriesId = e.target.value;
      M.selectedEventId = null;  // force first event in new series
      M.parsedRows = []; M.pasteText = ''; M.manualRows = [];
      render();
    });

    document.getElementById('rs-event-select').addEventListener('change', (e) => {
      M.selectedEventId = e.target.value;
      M.parsedRows = []; M.pasteText = ''; M.manualRows = [];
      render();
    });
  }

  function renderEventMeta(ev) {
    const meta = document.getElementById('rs-event-meta');
    if (!meta) return;

    const tierBadge = badgeFor(ev.tier);
    const statusBadge = `<span class="badge ${ev.status==='completed'?'badge-done':'badge-sched'}">${ev.status === 'completed' ? 'Done' : 'Đang chờ'}</span>`;

    meta.innerHTML = `
      <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-4); margin-top: var(--sp-3);">
        <div style="display: flex; gap: var(--sp-4); align-items: center; margin-bottom: var(--sp-4); font-size: 13px; flex-wrap: wrap;">
          ${tierBadge}
          ${statusBadge}
          <span class="muted">Buyin <strong style="color: var(--text-0); font-family: var(--font-mono);">${QPE.utils.fmtVndCompact(ev.buyin_listed)}</strong></span>
          ${ev.gtd_vnd ? `<span class="muted">GTD <strong style="color: var(--text-0); font-family: var(--font-mono);">${QPE.utils.fmtVndCompact(ev.gtd_vnd)}</strong></span>` : ''}
          ${ev.gtd_vnd ? `<button class="btn btn-sm btn-secondary" id="rs-auto-pp" style="margin-left: auto;">↺ PP = GTD</button>` : ''}
        </div>
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--sp-3);">
          <div>
            <label>PP actual (VND)</label>
            <input id="rs-pp" type="text" data-money value="${ev.prizepool_actual || ''}" placeholder="auto từ GTD">
          </div>
          <div>
            <label>Số ITM <span class="muted" style="font-weight: 400;" id="rs-itm-pct"></span></label>
            <input id="rs-itm" type="number" value="${ev.itm_cutoff || ''}" min="0">
          </div>
          <div>
            <label>Entries</label>
            <input id="rs-entries" type="number" value="${ev.entries_total || ''}" min="0">
          </div>
        </div>
        <label style="display:flex; align-items:center; gap: 6px; cursor:pointer; margin: var(--sp-3) 0 0; font-size: 13px;">
          <input id="rs-overlay" type="checkbox" ${ev.overlay_covered ? 'checked' : ''}>
          <span class="muted">Organizer cover overlay (overlay → PP = GTD)</span>
        </label>
      </div>
    `;

    const autoBtn = document.getElementById('rs-auto-pp');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        const ppInput = document.getElementById('rs-pp');
        ppInput.value = QPE_UI.money.format(ev.gtd_vnd || 0);
      });
    }
    // Note: don't mutate ev.overlay_covered here — it's captured at save time via the checkbox value
    // (see onSave). Mutating ev directly would drift in-memory state from persisted state.
    document.getElementById('rs-overlay').addEventListener('change', (e) => {
      const ppInput = document.getElementById('rs-pp');
      if (e.target.checked && ppInput && !QPE.utils.parseVnd(ppInput.value) && ev.gtd_vnd) {
        ppInput.value = QPE_UI.money.format(ev.gtd_vnd);
      }
      renderPreview(ev);
    });

    // Live %ITM hint + re-render preview on PP/ITM/entries changes (bound ONCE here)
    function updateItmPct() {
      const pctEl = document.getElementById('rs-itm-pct');
      if (!pctEl) return;
      const itm = parseInt(document.getElementById('rs-itm').value, 10) || 0;
      const entries = parseInt(document.getElementById('rs-entries').value, 10) || 0;
      if (itm > 0 && entries > 0) {
        const pct = (itm / entries * 100).toFixed(1);
        pctEl.textContent = `(${pct}% field)`;
      } else {
        pctEl.textContent = '(người vào tiền)';
      }
    }
    updateItmPct();
    const ppEl = document.getElementById('rs-pp');
    const itmEl = document.getElementById('rs-itm');
    const entriesEl = document.getElementById('rs-entries');
    const debouncedPreview = QPE.utils.debounce(() => renderPreview(ev), 150);
    const onParamChange = () => { updateItmPct(); debouncedPreview(); };
    if (ppEl)      ppEl.addEventListener('input', onParamChange);
    if (itmEl)     itmEl.addEventListener('input', onParamChange);
    if (entriesEl) entriesEl.addEventListener('input', onParamChange);

    // Attach money formatters
    if (QPE_UI.money) QPE_UI.money.attachAll('#rs-event-meta input[data-money]');
  }

  function renderInputSection(ev) {
    const sec = document.getElementById('rs-input-section');
    sec.innerHTML = `
      <h3>Danh sách ITM</h3>
      <div class="toolbar" style="margin-bottom: var(--sp-3);">
        <button class="btn btn-sm ${M.inputMode==='paste'?'btn-primary':'btn-secondary'}" data-mode="paste">📋 Paste</button>
        <button class="btn btn-sm ${M.inputMode==='upload'?'btn-primary':'btn-secondary'}" data-mode="upload">⬆️ Upload</button>
        <button class="btn btn-sm ${M.inputMode==='manual'?'btn-primary':'btn-secondary'}" data-mode="manual">✍️ Nhập tay</button>
      </div>
      <div id="rs-mode-content"></div>
    `;

    sec.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        M.inputMode = btn.dataset.mode;
        if (M.inputMode === 'manual' && M.manualRows.length === 0) {
          // initial empty row
          M.manualRows = [{ rank: 1, name: '', prize: null }];
        }
        renderInputSection(ev);
        renderPreview(ev);
      });
    });

    renderModeContent(ev);
  }

  function renderModeContent(ev) {
    const c = document.getElementById('rs-mode-content');
    if (M.inputMode === 'paste') {
      c.innerHTML = `
        <p class="muted" style="font-size: 13px;">
          Paste TSV/CSV. Có thể có header row với các cột:
          <code>rank</code> · <code>name</code> · <code>prize</code> · <code>country</code> (VN/US/...) · <code>id</code>.
          Nếu không có header → đoán positional: rank | name | prize.
        </p>
        <textarea id="rs-paste" rows="12" style="width:100%; font-family: var(--font-mono); font-size: 13px;"
                  placeholder="rank&#9;name&#9;country&#9;id&#9;prize&#10;1&#9;Nguyễn Văn A&#9;VN&#9;VN001&#9;5000000&#10;2&#9;John Smith&#9;US&#9;US042&#9;3000000"
        >${escapeHtml(M.pasteText)}</textarea>
      `;
      document.getElementById('rs-paste').addEventListener('input', (e) => {
        M.pasteText = e.target.value;
        M.parsedRows = QPE.parse.tsv(M.pasteText);
        renderPreview(ev);
      });
    } else if (M.inputMode === 'upload') {
      c.innerHTML = `
        <p class="muted" style="font-size: 13px;">Chọn file <code>.xlsx</code> / <code>.csv</code> / <code>.tsv</code>:</p>
        <div style="display: flex; gap: var(--sp-3); align-items: center; flex-wrap: wrap;">
          <input type="file" id="rs-file" accept=".xlsx,.csv,.tsv,.txt">
          <button class="btn btn-sm btn-secondary" id="rs-template" type="button">📄 Tải file mẫu Excel</button>
        </div>
        <div id="rs-file-result" class="muted" style="margin-top: var(--sp-2); font-size: 12px;"></div>
      `;
      document.getElementById('rs-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isXlsx = /\.xlsx$/i.test(file.name);
        const info = document.getElementById('rs-file-result');
        try {
          if (isXlsx) {
            const buf = await file.arrayBuffer();
            const rows = await MiniXLSX.read(buf);
            M.pasteText = MiniXLSX.rowsToTsv(rows);
          } else {
            M.pasteText = await file.text();
          }
          M.parsedRows = QPE.parse.tsv(M.pasteText);
          info.textContent = `Đã đọc ${M.parsedRows.length} dòng từ ${file.name}`;
          renderPreview(ev);
        } catch (err) {
          info.style.color = 'var(--danger)';
          info.textContent = '❌ ' + err.message;
        }
      });

      document.getElementById('rs-template').addEventListener('click', downloadResultsTemplate);
    } else if (M.inputMode === 'manual') {
      c.innerHTML = `
        <div id="rs-manual-list"></div>
        <button class="btn btn-sm btn-secondary" id="rs-add-row" style="margin-top: var(--sp-2);">➕ Thêm dòng</button>
      `;
      renderManualList(ev);
      document.getElementById('rs-add-row').addEventListener('click', () => {
        const nextRank = M.manualRows.length + 1;
        M.manualRows.push({ rank: nextRank, name: '', prize: null });
        renderManualList(ev);
        renderPreview(ev);
      });
    }
  }

  function renderManualList(ev) {
    const list = document.getElementById('rs-manual-list');
    if (!list) return;
    const datalistOpts = QPE_APP.state.players.map(p => `<option value="${escapeHtml(p.name)}">`).join('');
    list.innerHTML = `
      <datalist id="rs-player-list">${datalistOpts}</datalist>
      <table style="width: 100%;">
        <thead>
          <tr>
            <th style="width: 70px;">Rank</th>
            <th>Tên player</th>
            <th style="width: 160px; text-align: right;">Tiền thưởng (VND)</th>
            <th style="width: 50px;"></th>
          </tr>
        </thead>
        <tbody>
          ${M.manualRows.map((r, i) => `
            <tr data-idx="${i}">
              <td><input type="number" class="rs-m-rank" value="${r.rank || ''}" min="1" style="width: 60px;"></td>
              <td><input type="text" list="rs-player-list" class="rs-m-name" value="${escapeHtml(r.name)}" placeholder="Tên player"></td>
              <td><input type="text" class="rs-m-prize num-input" data-money value="${r.prize || ''}" placeholder="0" style="text-align: right;"></td>
              <td><button class="btn btn-sm btn-ghost rs-m-del" title="Xoá">🗑️</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    list.querySelectorAll('tr[data-idx]').forEach(tr => {
      const idx = parseInt(tr.dataset.idx, 10);
      tr.querySelector('.rs-m-rank').addEventListener('input', (e) => {
        M.manualRows[idx].rank = parseInt(e.target.value, 10) || 0;
        syncManualToParsed(); renderPreview(ev);
      });
      tr.querySelector('.rs-m-name').addEventListener('input', (e) => {
        M.manualRows[idx].name = e.target.value;
        syncManualToParsed(); renderPreview(ev);
      });
      tr.querySelector('.rs-m-prize').addEventListener('input', (e) => {
        M.manualRows[idx].prize = QPE.utils.parseVnd(e.target.value);
        syncManualToParsed(); renderPreview(ev);
      });
      tr.querySelector('.rs-m-del').addEventListener('click', () => {
        M.manualRows.splice(idx, 1);
        renderManualList(ev); syncManualToParsed(); renderPreview(ev);
      });
    });

    // Attach money formatter to prize inputs (after rendering)
    if (QPE_UI.money) QPE_UI.money.attachAll('.rs-m-prize');
  }

  function syncManualToParsed() {
    M.parsedRows = M.manualRows
      .filter(r => r.rank > 0 && r.name)
      .map(r => ({
        rank: r.rank,
        name: r.name,
        prize: r.prize,
        country: r.country || '',
        display_id: r.display_id || ''
      }));
  }

  function renderPreview(ev) {
    const sec = document.getElementById('rs-preview-section');
    if (!sec) return;

    // Build a candidate event with current form values for live point computation
    const ppInput  = document.getElementById('rs-pp');
    const itmInput = document.getElementById('rs-itm');
    const entriesInput = document.getElementById('rs-entries');
    const overlayInput = document.getElementById('rs-overlay');

    const previewEv = {
      ...ev,
      prizepool_actual: ppInput ? QPE.utils.parseVnd(ppInput.value) : ev.prizepool_actual,
      itm_cutoff: itmInput ? (parseInt(itmInput.value, 10) || 0) : ev.itm_cutoff,
      entries_total: entriesInput ? (parseInt(entriesInput.value, 10) || 0) : ev.entries_total,
      overlay_covered: overlayInput ? overlayInput.checked : ev.overlay_covered,
      status: 'completed'  // for point computation preview
    };

    // Auto PP via overlay
    if (!previewEv.prizepool_actual && previewEv.overlay_covered) {
      previewEv.prizepool_actual = previewEv.gtd_vnd || 0;
    }

    const rows = M.parsedRows;
    const errors = [];

    if (rows.length === 0) {
      sec.innerHTML = `
        <h3>Preview</h3>
        <div class="empty-state" style="padding: 24px;">
          <div class="icon" style="font-size: 24px;">📋</div>
          <p class="muted">Chưa có dữ liệu. Paste / upload / nhập tay danh sách ITM ở trên.</p>
        </div>
      `;
      return;
    }

    // Validation
    const ranks = rows.map(r => r.rank);
    const dupRanks = ranks.filter((r, i) => ranks.indexOf(r) !== i);
    if (dupRanks.length > 0) errors.push('Rank trùng: ' + [...new Set(dupRanks)].join(', '));
    if (previewEv.itm_cutoff > 0) {
      const overItm = rows.filter(r => r.rank > previewEv.itm_cutoff);
      if (overItm.length > 0) errors.push(`${overItm.length} rank > ITM cutoff (${previewEv.itm_cutoff})`);
    }
    const noName = rows.filter(r => !r.name || !r.name.trim()).length;
    if (noName > 0) errors.push(`${noName} dòng thiếu tên`);

    let totalPts = 0;
    const previewRows = rows.map(r => {
      const pts = QPE.scoring.calcPoints(previewEv, { rank: r.rank });
      totalPts += pts;
      return { ...r, pts };
    }).sort((a, b) => a.rank - b.rank);

    sec.innerHTML = `
      <h3>Preview <span class="muted" style="font-size: 14px; font-weight: 400;">${rows.length} dòng · Σ ${QPE.utils.fmtPts(totalPts)} pts</span></h3>

      ${errors.length ? `
        <div style="background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger); padding: 12px 16px; border-radius: var(--rd-md); margin-bottom: var(--sp-3); font-size: 13px;">
          ⚠️ <strong>Lỗi cần sửa:</strong><br>${errors.map(e => '• ' + escapeHtml(e)).join('<br>')}
        </div>
      ` : ''}

      <div class="table-wrap" style="max-height: 400px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">Rank</th>
              <th>Player</th>
              <th style="width: 140px; text-align: right;">Prize VND</th>
              <th style="width: 90px; text-align: right;">Points</th>
            </tr>
          </thead>
          <tbody>
            ${previewRows.map(r => {
              const flag = r.country ? QPE.utils.countryFlag(QPE.utils.normalizeCountry(r.country)) : '';
              const idTag = r.display_id ? `<span class="muted" style="font-family: var(--font-mono); font-size: 11px; margin-left: 6px;">${escapeHtml(r.display_id)}</span>` : '';
              return `
                <tr>
                  <td class="num" style="text-align: left;">${r.rank === 1 ? '🥇 ' : r.rank === 2 ? '🥈 ' : r.rank === 3 ? '🥉 ' : ''}${r.rank}</td>
                  <td>${flag ? `<span style="margin-right: 6px;">${flag}</span>` : ''}<strong>${escapeHtml(r.name || '—')}</strong>${idTag}</td>
                  <td class="num">${r.prize ? QPE.utils.fmtVndCompact(r.prize) : '—'}</td>
                  <td class="num" style="color: var(--gold);">${QPE.utils.fmtPts(r.pts)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: var(--sp-4); display: flex; gap: var(--sp-3);">
        <button class="btn btn-primary" id="rs-save" ${errors.length ? 'disabled' : ''}>💾 Lưu ${previewRows.length} kết quả</button>
        <button class="btn btn-ghost" id="rs-clear">Xoá nhập</button>
      </div>
    `;

    document.getElementById('rs-save').addEventListener('click', () => onSave(ev, previewEv, previewRows));
    document.getElementById('rs-clear').addEventListener('click', () => {
      M.parsedRows = []; M.pasteText = ''; M.manualRows = [];
      render();
    });

    // NOTE: Live update listeners for PP/ITM/entries inputs are bound ONCE in renderEventMeta()
    // (see "Live %ITM hint" block). Binding here on every renderPreview() call would leak listeners.
  }

  function onSave(originalEv, previewEv, previewRows) {
    // Persist event changes
    const idx = QPE_APP.state.events.findIndex(e => e.id === originalEv.id);
    if (idx === -1) return;

    QPE_APP.state.events[idx] = {
      ...originalEv,
      prizepool_actual: previewEv.prizepool_actual,
      itm_cutoff: previewEv.itm_cutoff,
      entries_total: previewEv.entries_total || originalEv.entries_total,
      overlay_covered: previewEv.overlay_covered,
      status: 'completed'
    };

    // Remove existing results for this event
    QPE_APP.state.results = QPE_APP.state.results.filter(r => r.event_id !== originalEv.id);

    // Add new results, mapped to players (find-or-create with country/id)
    for (const row of previewRows) {
      const player = QPE_APP.findOrCreatePlayer(row.name, {
        country: row.country,
        display_id: row.display_id
      });
      if (!player) continue;
      QPE_APP.state.results.push({
        event_id: originalEv.id,
        player_id: player.id,
        player_name: player.name,
        rank: row.rank,
        prize_vnd: row.prize || 0
      });
    }

    QPE_APP.save();
    UI.toast.show(`Đã lưu ${previewRows.length} kết quả cho "${originalEv.name}"`, 'success');

    // Reset module state
    M.parsedRows = []; M.pasteText = ''; M.manualRows = [];
    render();
  }

  function selectEvent(eventId) {
    M.selectedEventId = eventId;
    // Sync selected series to match this event
    const ev = QPE_APP.state.events.find(e => e.id === eventId);
    if (ev) M.selectedSeriesId = ev.series_id;
    M.parsedRows = []; M.pasteText = ''; M.manualRows = [];
    render();
  }

  function downloadResultsTemplate() {
    const blob = MiniXLSX.write({
      sheetName: 'Results',
      columns: [
        { header: 'rank',    key: 'rank',    type: 'number', width: 8  },
        { header: 'name',    key: 'name',                      width: 32 },
        { header: 'country', key: 'country',                   width: 10 },
        { header: 'id',      key: 'id',                        width: 12 },
        { header: 'prize',   key: 'prize',   type: 'number', width: 16 }
      ],
      rows: [
        { rank: 1, name: 'Nguyễn Văn A', country: 'VN', id: 'VN001', prize: 5000000 },
        { rank: 2, name: 'Trần Thị B',   country: 'VN', id: 'VN002', prize: 3000000 },
        { rank: 3, name: 'John Smith',   country: 'US', id: 'US042', prize: 2000000 },
        { rank: 4, name: 'Kenji Tanaka', country: 'JP', id: '',      prize: 1500000 },
        { rank: 5, name: 'Lê Văn C',     country: '',   id: '',      prize: 1000000 }
      ]
    });
    MiniXLSX.download(blob, 'qpc-results-template.xlsx');
    UI.toast.show('Đã tải file mẫu Results', 'success');
  }

  function badgeFor(tier) {
    const map = {
      championship: ['CHAMPIONSHIP', 'badge-champ'],
      high_roller:  ['HIGH ROLLER',  'badge-hr'],
      mid_stakes:   ['MID STAKES',   'badge-mid'],
      side:         ['SIDE',         'badge-side']
    };
    const [label, cls] = map[tier] || ['?', 'badge-side'];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    render();
    QPE_APP.subscribe(() => {
      if (QPE_UI.tabs.current() === 'results') render();
    });
    QPE_UI.tabs.onSwitch((name) => {
      if (name === 'results') render();
    });
  }

  UI.results = { init, render, selectEvent };
})(typeof window !== 'undefined' ? window : globalThis);
