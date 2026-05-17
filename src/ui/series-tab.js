/**
 * QPC POY — Tab Series (Series management)
 *
 * CRUD for series. Each series wraps a collection of events.
 * Tier (flagship / major / regional / mini) and multiplier seed the future Annual POY system.
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  const TIER_LABEL = {
    flagship: ['FLAGSHIP', 'badge-champ'],
    major:    ['MAJOR',    'badge-hr'],
    regional: ['REGIONAL', 'badge-mid'],
    mini:     ['MINI',     'badge-side']
  };

  const TIER_DEFAULTS = {
    flagship: 1.00,
    major:    0.70,
    regional: 0.50,
    mini:     0.30
  };

  const STATUS_LABEL = {
    scheduled: ['Lịch',     'badge-sched'],
    running:   ['Đang chạy','badge-info'],
    completed: ['Done',     'badge-done'],
    cancelled: ['Huỷ',      'badge-danger']
  };

  function render() {
    const container = document.getElementById('tab-series');
    if (!container) return;

    const series = QPE_APP.state.series || [];

    if (series.length === 0) {
      container.innerHTML = `
        <h2>Series</h2>
        <div class="empty-state">
          <div class="icon">🗓️</div>
          <p><strong>Chưa có series nào.</strong></p>
          <div class="actions">
            <button class="btn btn-primary" id="sr-create-default">Tạo "QPC I" + seed</button>
            <button class="btn btn-secondary" id="sr-add-empty">+ Tạo series mới</button>
          </div>
        </div>
      `;
      document.getElementById('sr-create-default').addEventListener('click', onSeedDefault);
      document.getElementById('sr-add-empty').addEventListener('click', () => openEditModal(null));
      return;
    }

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--sp-4);">
        <h2 style="margin:0;">Series <span class="muted" style="font-size: 14px; font-weight: 400;">${series.length}</span></h2>
        <button class="btn btn-primary" id="sr-add">+ Tạo series</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Series</th>
              <th style="width: 110px;">Tier</th>
              <th style="width: 240px;">Thời gian</th>
              <th style="width: 70px; text-align: right;">Events</th>
              <th style="width: 110px; text-align: right;"></th>
            </tr>
          </thead>
          <tbody>
            ${series.map(renderRow).join('')}
          </tbody>
        </table>
      </div>
    `;

    bind();
  }

  function renderRow(s) {
    const [tierLabel, tierClass] = TIER_LABEL[s.tier] || ['?', 'badge-side'];
    const eventCount = QPE_APP.state.events.filter(e => e.series_id === s.id).length;
    const statusText = s.status !== 'scheduled'
      ? `<span class="badge ${STATUS_LABEL[s.status] ? STATUS_LABEL[s.status][1] : 'badge-sched'}" style="margin-left: 6px;">${STATUS_LABEL[s.status] ? STATUS_LABEL[s.status][0] : s.status}</span>`
      : '';
    return `
      <tr data-series-id="${escapeHtml(s.id)}">
        <td>
          <strong>${escapeHtml(s.name)}</strong>${statusText}
          <div class="muted" style="font-size: 11px;">${escapeHtml(s.short_name || s.id)} · ×${(s.multiplier || 0).toFixed(2)}</div>
        </td>
        <td><span class="badge ${tierClass}">${tierLabel}</span></td>
        <td style="color: var(--text-2); font-size: 13px;">${s.year} · ${fmtDateRange(s.date_start, s.date_end)}</td>
        <td class="num">${eventCount}</td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-action="import" title="Import events">📥</button>
          <button class="btn btn-sm btn-secondary" data-action="edit" title="Sửa">✏️</button>
          <button class="btn btn-sm btn-secondary" data-action="delete" title="Xoá">🗑️</button>
        </td>
      </tr>
    `;
  }

  function fmtDateRange(s, e) {
    return QPE.utils.fmtDateRange(s, e);
  }

  function bind() {
    const addBtn = document.getElementById('sr-add');
    if (addBtn) addBtn.addEventListener('click', () => openEditModal(null));

    document.querySelectorAll('tr[data-series-id]').forEach(tr => {
      const id = tr.dataset.seriesId;
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => openEditModal(id));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => onDelete(id));
      tr.querySelector('[data-action="import"]').addEventListener('click', () => openImportModal(id));
    });
  }

  // ─── Events template download ───────────────────────────
  function downloadEventsTemplate() {
    const blob = MiniXLSX.write({
      sheetName: 'Events',
      columns: [
        { header: 'code',   key: 'code',                      width: 8  },
        { header: 'name',   key: 'name',                       width: 32 },
        { header: 'tier',   key: 'tier',                       width: 14 },
        { header: 'buyin',  key: 'buyin',  type: 'number',   width: 14 },
        { header: 'gtd',    key: 'gtd',    type: 'number',   width: 16 },
        { header: 'date',   key: 'date',                       width: 12 },
        { header: 'end',    key: 'end',                        width: 12 },
        { header: 'itm',    key: 'itm',    type: 'number',   width: 8  },
        { header: 'women',  key: 'women',                      width: 8  },
        { header: 'multi',  key: 'multi',                      width: 8  }
      ],
      rows: [
        { code: '#1',  name: 'Kick Off Event',    tier: 'championship', buyin: 7700000,  gtd: 6000000000,  date: '17/06/2026', end: '19/06/2026', itm: 0,  women: '',  multi: 'Y' },
        { code: '#2',  name: 'HR Ultra Stack',    tier: 'high_roller',  buyin: 44000000, gtd: 2000000000,  date: '17/06/2026', end: '18/06/2026', itm: 0,  women: '',  multi: '' },
        { code: '',    name: 'Daily Megastack',   tier: 'side',         buyin: 3400000,  gtd: 150000000,   date: '17/06/2026', end: '',           itm: 14, women: '',  multi: '' },
        { code: '#18', name: 'Main Event',        tier: 'championship', buyin: 27500000, gtd: 25000000000, date: '20/06/2026', end: '24/06/2026', itm: 50, women: '',  multi: 'Y' },
        { code: '#3',  name: 'Women Championship',tier: 'side',         buyin: 4500000,  gtd: 0,           date: '18/06/2026', end: '',           itm: 12, women: 'Y', multi: '' }
      ]
    });
    MiniXLSX.download(blob, 'qpc-events-template.xlsx');
    UI.toast.show('Đã tải file mẫu Events', 'success');
  }

  // ─── Bulk Import Events ─────────────────────────────────
  function openImportModal(seriesId) {
    const series = QPE_APP.state.series.find(s => s.id === seriesId);
    if (!series) return;
    const existingCount = QPE_APP.state.events.filter(e => e.series_id === seriesId).length;

    const M = { text: '', parsed: null, mode: 'append' };

    function rerender() {
      const body = document.getElementById('imp-body');
      if (!body) return;
      const parsed = M.parsed;
      const previewHTML = !parsed ? '' : (parsed.rows.length === 0
        ? `<div class="muted" style="padding: var(--sp-3); text-align: center; font-size: 13px;">Chưa parse được dòng nào.${parsed.errors.length ? '<br>' + parsed.errors.map(escapeHtml).join('<br>') : ''}</div>`
        : `
          ${parsed.errors.length ? `<div style="color: var(--danger); font-size: 12px; margin-bottom: var(--sp-2);">⚠️ ${parsed.errors.map(escapeHtml).join('<br>⚠️ ')}</div>` : ''}
          <div class="table-wrap" style="max-height: 280px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th style="width: 100px;">Tier</th>
                  <th style="width: 90px;">Ngày</th>
                  <th style="width: 90px; text-align: right;">Buyin</th>
                  <th style="width: 90px; text-align: right;">GTD</th>
                  <th style="width: 50px; text-align: right;">ITM</th>
                </tr>
              </thead>
              <tbody>
                ${parsed.rows.map(r => {
                  const tierBadge = `<span class="badge badge-${r.tier === 'championship' ? 'champ' : r.tier === 'high_roller' ? 'hr' : r.tier === 'mid_stakes' ? 'mid' : 'side'}">${r.tier}</span>`;
                  const icons = (r.is_womens ? ' ♕' : '') + (r.is_multi_flight ? ' ✈' : '');
                  return `<tr>
                    <td>${r.code ? `<span class="muted" style="font-family: var(--font-mono); font-size: 12px;">${escapeHtml(r.code)}</span> ` : ''}<strong>${escapeHtml(r.name)}</strong>${icons}</td>
                    <td>${tierBadge}</td>
                    <td class="num" style="text-align: left; color: var(--text-2); font-size: 12px;">${r.date_start || '—'}</td>
                    <td class="num">${r.buyin_listed ? QPE.utils.fmtVndCompact(r.buyin_listed) : '—'}</td>
                    <td class="num">${r.gtd_vnd ? QPE.utils.fmtVndCompact(r.gtd_vnd) : '—'}</td>
                    <td class="num">${r.itm_cutoff || '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <p class="muted" style="margin-top: var(--sp-2); font-size: 12px;">Sẽ thêm <strong style="color: var(--gold);">${parsed.rows.length}</strong> event vào series <strong>${escapeHtml(series.short_name || series.name)}</strong>.</p>
        `);

      body.innerHTML = `
        <p class="muted" style="font-size: 13px; margin-bottom: var(--sp-3);">
          Upload Excel/CSV/TSV hoặc paste. Header bắt buộc cột <code>name</code>; optional:
          <code>code, tier, buyin, gtd, date, end, itm, women, multi</code>.
          Tier: <code>championship / high_roller / mid_stakes / side</code>.
          Date: <code>DD/MM/YYYY</code> hoặc <code>YYYY-MM-DD</code>.
        </p>

        <div style="display: flex; gap: var(--sp-3); margin-bottom: var(--sp-3); align-items: center; flex-wrap: wrap;">
          <input type="file" id="imp-file" accept=".xlsx,.csv,.tsv,.txt" style="font-size: 12px;">
          <button class="btn btn-sm btn-secondary" id="imp-template" type="button">📄 Tải file mẫu Excel</button>
          <span class="muted" style="font-size: 12px;">hoặc paste bên dưới ↓</span>
        </div>

        <textarea id="imp-paste" rows="8" placeholder="name	tier	buyin	gtd	date	itm&#10;Main Event	championship	25M	25B	2026-06-20	50&#10;HR Grand Prix	high_roller	66M	2B	2026-06-21	10" style="width:100%; font-family: var(--font-mono); font-size: 12px;">${escapeHtml(M.text)}</textarea>

        <div style="display: flex; gap: var(--sp-3); margin-top: var(--sp-3); align-items: center;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; margin: 0;">
            <input type="radio" name="imp-mode" value="append" ${M.mode==='append'?'checked':''}>
            <span>Append (thêm vào ${existingCount} events có sẵn)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; margin: 0; color: var(--warning);">
            <input type="radio" name="imp-mode" value="replace" ${M.mode==='replace'?'checked':''}>
            <span>Replace (xoá ${existingCount} events có sẵn + kết quả)</span>
          </label>
        </div>

        <h3 style="margin-top: var(--sp-5); margin-bottom: var(--sp-2); font-size: 15px;">Preview</h3>
        ${previewHTML || '<div class="muted" style="padding: var(--sp-3); text-align: center; font-size: 13px;">Paste dữ liệu để xem preview.</div>'}
      `;

      // Bind
      document.getElementById('imp-paste').addEventListener('input', (e) => {
        M.text = e.target.value;
        M.parsed = QPE.parse.eventsTable(M.text);
        rerender();
      });

      document.getElementById('imp-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isXlsx = /\.xlsx$/i.test(file.name);
        try {
          if (isXlsx) {
            const buf = await file.arrayBuffer();
            const rows = await MiniXLSX.read(buf);
            M.text = MiniXLSX.rowsToTsv(rows);
          } else {
            M.text = await file.text();
          }
          M.parsed = QPE.parse.eventsTable(M.text);
          rerender();
        } catch (err) {
          UI.toast.show('Lỗi đọc file: ' + err.message, 'danger', 5000);
        }
      });

      document.getElementById('imp-template').addEventListener('click', downloadEventsTemplate);

      document.querySelectorAll('input[name="imp-mode"]').forEach(r => {
        r.addEventListener('change', (e) => { M.mode = e.target.value; });
      });
    }

    const body = document.createElement('div');
    body.id = 'imp-body';

    const footer = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Huỷ';
    cancel.addEventListener('click', () => UI.modal.close());
    const save = document.createElement('button');
    save.className = 'btn btn-primary';
    save.textContent = 'Import';
    save.addEventListener('click', () => {
      const parsed = M.parsed;
      if (!parsed || parsed.rows.length === 0) {
        UI.toast.show('Không có dữ liệu để import', 'warning');
        return;
      }
      const stats = QPE_APP.bulkAddEvents(seriesId, parsed.rows, M.mode);
      let msg = `Đã import ${stats.added} event vào "${series.name}"`;
      if (stats.replaced > 0) msg += ` (replaced ${stats.replaced})`;
      if (stats.skipped > 0) msg += ` · skipped ${stats.skipped} (trùng ID)`;
      UI.toast.show(msg, 'success');
      UI.modal.close();
    });
    footer.appendChild(cancel);
    footer.appendChild(save);

    UI.modal.open({
      title: `📥 Import events → ${series.name}`,
      body,
      footer
    });

    rerender();
  }

  async function onSeedDefault() {
    QPE_APP.seedQPC2026();
    UI.toast.show(`Đã tạo "QPC I" + ${QPE_APP.state.events.length} events`, 'success');
    render();
  }

  async function onDelete(id) {
    const s = QPE_APP.state.series.find(x => x.id === id);
    if (!s) return;
    const eventCount = QPE_APP.state.events.filter(e => e.series_id === id).length;

    if (eventCount > 0) {
      const msg = `Series "${s.name}" có ${eventCount} events. Xoá series sẽ KHÔNG xoá events — bạn cần gán chúng vào series khác hoặc xoá thủ công ở tab Events. Tiếp tục?`;
      const ok = await UI.modal.confirm(msg, { title: 'Xoá series', danger: true, okText: 'Xoá series' });
      if (!ok) return;
    } else {
      const ok = await UI.modal.confirm(`Xoá series "${s.name}"?`, { title: 'Xoá series', danger: true, okText: 'Xoá' });
      if (!ok) return;
    }

    QPE_APP.state.series = QPE_APP.state.series.filter(x => x.id !== id);
    QPE_APP.save();
    UI.toast.show(`Đã xoá series "${s.name}"`, 'success');
    render();
  }

  // ─── Modal: Add/Edit Series ─────────────────────────────
  function openEditModal(seriesId) {
    const isNew = !seriesId;
    const s = isNew
      ? {
          id: '', name: '', short_name: '',
          year: new Date().getFullYear(),
          date_start: new Date().toISOString().slice(0, 10),
          date_end: '',
          tier: 'flagship', multiplier: 1.00,
          status: 'scheduled',
          minCash: {}
        }
      : { ...QPE_APP.state.series.find(x => x.id === seriesId) };

    // Helper: read global default min cash for a board
    const globalMin = (QPE_APP.state.settings && QPE_APP.state.settings.minCash) || {};
    const minDef = (board) =>
      (globalMin[board] !== undefined) ? globalMin[board] : QPE.CONST.MIN_CASH[board];

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-row">
        <div>
          <label>ID (unique)</label>
          <input id="sd-id" type="text" value="${escapeHtml(s.id)}" ${isNew ? '' : 'disabled'} placeholder="vd: qpc_2027_1">
        </div>
        <div style="flex: 2;">
          <label>Tên đầy đủ</label>
          <input id="sd-name" type="text" value="${escapeHtml(s.name)}" placeholder="Quads Poker Championship II">
        </div>
        <div>
          <label>Tên ngắn</label>
          <input id="sd-short" type="text" value="${escapeHtml(s.short_name || '')}" placeholder="QPC II">
        </div>
      </div>

      <div class="form-row">
        <div>
          <label>Năm</label>
          <input id="sd-year" type="number" value="${s.year || ''}" min="2000" max="2100">
        </div>
        <div>
          <label>Ngày bắt đầu</label>
          <input id="sd-date-start" type="date" value="${escapeHtml(s.date_start || '')}">
        </div>
        <div>
          <label>Ngày kết thúc</label>
          <input id="sd-date-end" type="date" value="${escapeHtml(s.date_end || '')}">
        </div>
        <div>
          <label>Status</label>
          <select id="sd-status">
            <option value="scheduled" ${s.status==='scheduled'?'selected':''}>Lịch</option>
            <option value="running"   ${s.status==='running'?'selected':''}>Đang chạy</option>
            <option value="completed" ${s.status==='completed'?'selected':''}>Done</option>
            <option value="cancelled" ${s.status==='cancelled'?'selected':''}>Huỷ</option>
          </select>
        </div>
      </div>

      <h3 style="margin-top: var(--sp-5); margin-bottom: var(--sp-2); font-size: 16px;">
        Eligibility cho series này
        <span class="help" data-tip="Min events cash để vào ranking — override per series. Để trống = dùng global default ở Cài đặt.">?</span>
      </h3>
      <p class="muted" style="font-size: 12px; margin: 0 0 var(--sp-3);">Override min events cash. Trống = dùng global default (${minDef('overall')}/${minDef('womens')}/${minDef('high_roller')}).</p>
      <div class="form-row">
        ${['overall', 'womens', 'high_roller'].map(board => `
          <div>
            <label>${board === 'overall' ? 'Overall' : board === 'womens' ? "Women's" : 'HR sub-board'}</label>
            <input id="sd-minc-${board}" type="number" min="0" step="1"
                   value="${(s.minCash && s.minCash[board] != null) ? s.minCash[board] : ''}"
                   placeholder="${minDef(board)}">
          </div>
        `).join('')}
      </div>

      <h3 style="margin-top: var(--sp-5); margin-bottom: var(--sp-2); font-size: 16px;">
        Prestige
        <span class="help" data-tip="Dùng cho Xếp hạng năm: top X mỗi series → Master Points × series.multiplier → tổng cuối năm.">?</span>
      </h3>
      <div class="form-row">
        <div style="flex: 2;">
          <label>Tier <span class="help" data-tip="Series prestige tier. Flagship = QPC chính; Major = series lớn; Regional = tỉnh/vùng; Mini = ngắn.">?</span></label>
          <select id="sd-tier">
            <option value="flagship" ${s.tier==='flagship'?'selected':''}>🏆 Flagship — GTD ≥ 50B, 50+ events</option>
            <option value="major"    ${s.tier==='major'?'selected':''}>⭐ Major — GTD 20–50B, 30+ events</option>
            <option value="regional" ${s.tier==='regional'?'selected':''}>📍 Regional — GTD 5–20B</option>
            <option value="mini"     ${s.tier==='mini'?'selected':''}>💎 Mini — GTD < 5B</option>
          </select>
        </div>
        <div>
          <label>× Multiplier <span class="help" data-tip="Hệ số nhân MP cho Annual POY. Flagship ×1.0, Major ×0.7, Regional ×0.5, Mini ×0.3.">?</span></label>
          <input id="sd-mult" type="number" value="${s.multiplier || 1.0}" min="0" max="2" step="0.05">
        </div>
      </div>
      <p class="muted" style="font-size: 12px; margin-top: var(--sp-2);">
        Default multipliers: Flagship ×1.00 · Major ×0.70 · Regional ×0.50 · Mini ×0.30.
      </p>

      <div id="sd-errors" style="color: var(--danger); margin-top: var(--sp-3); display: none; font-size: 13px;"></div>
    `;

    const footer = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Huỷ';
    cancel.addEventListener('click', () => UI.modal.close());
    const save = document.createElement('button');
    save.className = 'btn btn-primary';
    save.textContent = isNew ? 'Tạo series' : 'Lưu thay đổi';
    save.addEventListener('click', () => saveSeries(s, isNew));
    footer.appendChild(cancel);
    footer.appendChild(save);

    UI.modal.open({
      title: isNew ? 'Tạo series mới' : `Sửa: ${s.name}`,
      body,
      footer
    });

    // Auto-update multiplier when tier changes (if user hasn't customized)
    setTimeout(() => {
      const tierEl = document.getElementById('sd-tier');
      const multEl = document.getElementById('sd-mult');
      let userTouched = false;
      multEl.addEventListener('input', () => { userTouched = true; });
      tierEl.addEventListener('change', () => {
        if (!userTouched) {
          multEl.value = TIER_DEFAULTS[tierEl.value] || 1.0;
        }
      });
    }, 0);
  }

  function saveSeries(original, isNew) {
    const get = (id) => document.getElementById(id);

    // Parse per-series minCash overrides (empty = no override)
    const minCash = {};
    ['overall', 'womens', 'high_roller'].forEach(b => {
      const v = (get('sd-minc-' + b).value || '').trim();
      if (v !== '') {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n >= 0) minCash[b] = n;
      }
    });

    const updated = {
      ...original,
      id:    isNew ? (get('sd-id').value || '').trim() : original.id,
      name:  get('sd-name').value.trim(),
      short_name: get('sd-short').value.trim(),
      year:  parseInt(get('sd-year').value, 10) || new Date().getFullYear(),
      date_start: get('sd-date-start').value,
      date_end:   get('sd-date-end').value || get('sd-date-start').value,
      tier:       get('sd-tier').value,
      multiplier: parseFloat(get('sd-mult').value) || 1.0,
      status:     get('sd-status').value,
      minCash:    minCash
    };

    const errors = [];
    if (!updated.id) errors.push('ID không được trống');
    if (!updated.name) errors.push('Tên series không được trống');
    if (!['flagship', 'major', 'regional', 'mini'].includes(updated.tier)) errors.push('Tier không hợp lệ');
    if (!(updated.multiplier > 0)) errors.push('Multiplier phải > 0');

    if (errors.length === 0 && isNew && QPE_APP.state.series.find(s => s.id === updated.id)) {
      errors.push('ID "' + updated.id + '" đã tồn tại');
    }

    if (errors.length > 0) {
      const errEl = document.getElementById('sd-errors');
      errEl.innerHTML = '⚠️ ' + errors.join('<br>⚠️ ');
      errEl.style.display = 'block';
      return;
    }

    if (isNew) {
      QPE_APP.state.series.push(updated);
    } else {
      const idx = QPE_APP.state.series.findIndex(s => s.id === original.id);
      QPE_APP.state.series[idx] = updated;
    }
    QPE_APP.save();
    UI.modal.close();
    UI.toast.show(isNew ? `Đã tạo series "${updated.name}"` : `Đã cập nhật "${updated.name}"`, 'success');
    render();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    render();
    QPE_APP.subscribe(() => {
      if (QPE_UI.tabs.current() === 'series') render();
    });
    QPE_UI.tabs.onSwitch((name) => {
      if (name === 'series') render();
    });
  }

  UI.series = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
