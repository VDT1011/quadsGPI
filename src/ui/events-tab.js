/**
 * QPC POY — Tab Events
 *
 * Renders the events table with filter, sort, and CRUD modal.
 *
 * Public:
 *   QPE_UI.events.render()          — re-render table from state
 *   QPE_UI.events.init()            — bind listeners + initial render
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};
  const $ = (sel, root) => (root || document).querySelector(sel);

  // Track collapsed series IDs (transient, in-memory)
  const collapsedSeries = new Set();

  const TIER_LABEL = {
    championship: ['CHAMP',  'badge-champ'],
    high_roller:  ['HR',     'badge-hr'],
    mid_stakes:   ['MID',    'badge-mid'],
    side:         ['SIDE',   'badge-side']
  };

  const STATUS_LABEL = {
    scheduled: ['Lịch',     'badge-sched'],
    running:   ['Đang chạy','badge-info'],
    completed: ['Done',     'badge-done'],
    cancelled: ['Huỷ',      'badge-danger']
  };

  // ─── Render ──────────────────────────────────────────────
  function render() {
    const container = document.getElementById('tab-events');
    if (!container) return;

    const events = QPE_APP.state.events;

    if (events.length === 0) {
      container.innerHTML = renderEmpty();
      bindEmpty();
      return;
    }

    // Get filter state from UI (or defaults)
    const filterStatus = container.dataset.filterStatus || '';
    const filterTier   = container.dataset.filterTier   || '';
    const filterSeries = container.dataset.filterSeries || '';
    const search       = (container.dataset.search || '').toLowerCase();

    let filtered = events.slice();
    if (filterStatus) filtered = filtered.filter(e => e.status === filterStatus);
    if (filterTier)   filtered = filtered.filter(e => e.tier === filterTier);
    if (filterSeries) filtered = filtered.filter(e => e.series_id === filterSeries);
    if (search)       filtered = filtered.filter(e =>
      e.name.toLowerCase().includes(search) ||
      (e.code || '').toLowerCase().includes(search)
    );

    // Sort by date_start
    filtered.sort((a, b) => (a.date_start || '').localeCompare(b.date_start || ''));

    const series = QPE_APP.state.series || [];

    // Group filtered events by series_id
    const grouped = {};
    for (const e of filtered) {
      const sid = e.series_id || '_orphan';
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(e);
    }

    // Series order: as in state.series, then orphans last
    const orderedSeries = series.slice();
    if (grouped._orphan) {
      orderedSeries.push({
        id: '_orphan',
        name: 'Không thuộc series nào',
        short_name: 'Orphan',
        tier: 'mini',
        multiplier: 0
      });
    }

    const hasActiveFilter = !!(filterStatus || filterTier || filterSeries || search);

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--sp-4);">
        <h2 style="margin:0;">Events <span class="muted" style="font-size: 14px; font-weight: 400;">${events.length}</span></h2>
        <div style="display: flex; gap: var(--sp-2);">
          <button class="btn btn-sm btn-secondary" id="btn-expand-all">${collapsedSeries.size > 0 ? 'Mở tất cả' : 'Đóng tất cả'}</button>
          <button class="btn btn-primary" id="btn-add-event">+ Thêm</button>
        </div>
      </div>

      <div class="toolbar">
        <input type="text" id="ev-search" placeholder="🔍 Tìm..." value="${escapeHtml(container.dataset.search || '')}" style="min-width: 180px;">
        <select id="ev-status">
          <option value="">Status</option>
          <option value="scheduled" ${filterStatus==='scheduled'?'selected':''}>Lịch</option>
          <option value="running"   ${filterStatus==='running'?'selected':''}>Đang chạy</option>
          <option value="completed" ${filterStatus==='completed'?'selected':''}>Done</option>
          <option value="cancelled" ${filterStatus==='cancelled'?'selected':''}>Huỷ</option>
        </select>
        <select id="ev-tier">
          <option value="">Tier</option>
          <option value="championship" ${filterTier==='championship'?'selected':''}>Championship</option>
          <option value="high_roller"  ${filterTier==='high_roller'?'selected':''}>High Roller</option>
          <option value="mid_stakes"   ${filterTier==='mid_stakes'?'selected':''}>Mid Stakes</option>
          <option value="side"         ${filterTier==='side'?'selected':''}>Side</option>
        </select>
        <div class="spacer"></div>
        <span class="muted">${filtered.length}/${events.length}</span>
      </div>

      <div id="ev-groups">
        ${orderedSeries.map(s => renderSeriesGroup(s, grouped[s.id] || [], hasActiveFilter)).join('')}
      </div>
    `;

    bind(container);
  }

  // ─── Render single series accordion ───────────────────────
  function renderSeriesGroup(series, events, hasFilter) {
    // Hide empty series when filtering, but keep when no filter (so user sees all series)
    if (hasFilter && events.length === 0) return '';

    const isCollapsed = collapsedSeries.has(series.id);
    const tierMap = {
      flagship: ['FLAGSHIP', 'badge-champ'],
      major:    ['MAJOR',    'badge-hr'],
      regional: ['REGIONAL', 'badge-mid'],
      mini:     ['MINI',     'badge-side']
    };
    const [tierLabel, tierClass] = tierMap[series.tier] || ['—', 'badge-side'];

    const meta = [
      `<span class="badge ${tierClass}">${tierLabel}</span>`,
      series.multiplier ? `<span class="muted">×${(series.multiplier || 0).toFixed(2)}</span>` : '',
      series.date_start ? `<span class="muted">${QPE.utils.fmtDateRange(series.date_start, series.date_end)}</span>` : '',
      `<span class="muted">${events.length} event${events.length === 1 ? '' : 's'}</span>`
    ].filter(Boolean).join(' · ');

    return `
      <div class="series-group" data-series-id="${escapeHtml(series.id)}" style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); margin-bottom: var(--sp-3); overflow: hidden;">
        <div class="series-head" data-toggle="${escapeHtml(series.id)}" style="display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); cursor: pointer; user-select: none; background: var(--bg-2); border-bottom: ${isCollapsed ? 'none' : '1px solid var(--border-gold)'};">
          <span style="font-family: var(--font-mono); color: var(--gold); width: 16px; transform: rotate(${isCollapsed ? '-90deg' : '0deg'}); transition: transform 0.15s;">▼</span>
          <div style="flex: 1;">
            <strong style="color: var(--text-0);">${escapeHtml(series.name)}</strong>
            <div style="display: flex; gap: var(--sp-3); align-items: center; margin-top: 4px; font-size: 12px;">${meta}</div>
          </div>
        </div>
        ${isCollapsed ? '' : renderEventTable(events)}
      </div>
    `;
  }

  function renderEventTable(events) {
    if (events.length === 0) {
      return `<div style="padding: var(--sp-5); text-align: center; color: var(--text-mute); font-size: 13px;">Chưa có event trong series này.</div>`;
    }
    return `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th style="width: 100px;">Tier</th>
              <th style="width: 140px;">Ngày</th>
              <th style="width: 100px; text-align: right;">Buyin</th>
              <th style="width: 80px;">Status</th>
              <th style="width: 110px; text-align: right;">PP</th>
              <th style="width: 140px; text-align: right;"></th>
            </tr>
          </thead>
          <tbody>
            ${events.map(renderRow).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderEmpty() {
    return `
      <h2>Events</h2>
      <div class="empty-state">
        <div class="icon">📅</div>
        <p><strong>Chưa có event nào.</strong></p>
        <div class="actions">
          <button class="btn btn-primary" id="btn-seed">Load QPC 2026</button>
          <button class="btn btn-secondary" id="btn-add-event-empty">+ Thêm event</button>
        </div>
      </div>
    `;
  }

  function renderRow(e) {
    const [tierLabel, tierClass] = TIER_LABEL[e.tier] || [humanizeTier(e.tier || '?').toUpperCase().slice(0, 12), 'badge-side'];
    const [statusLabel, statusClass] = STATUS_LABEL[e.status] || ['?', 'badge-sched'];
    const pp = e.prizepool_actual > 0 ? QPE.utils.fmtVndCompact(e.prizepool_actual) : (e.gtd_vnd ? 'GTD ' + QPE.utils.fmtVndCompact(e.gtd_vnd) : '—');
    const womenIcon = e.is_womens ? ' <span style="color: var(--tier-women);" title="Women">♕</span>' : '';
    const flightIcon = e.is_multi_flight ? ' <span style="color: var(--text-2);" title="Multi-flight">✈</span>' : '';
    const codeStr = e.code && e.code !== '—' ? `<span class="muted" style="font-family: var(--font-mono); font-size: 12px; margin-right: 6px;">${escapeHtml(e.code)}</span>` : '';
    return `
      <tr data-event-id="${escapeHtml(e.id)}">
        <td>${codeStr}<strong>${escapeHtml(e.name)}</strong>${womenIcon}${flightIcon}</td>
        <td><span class="badge ${tierClass}">${tierLabel}</span></td>
        <td class="num" style="text-align: left; color: var(--text-2); font-size: 13px;">${fmtDate(e.date_start, e.date_end)}</td>
        <td class="num">${QPE.utils.fmtVndCompact(e.buyin_listed)}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td class="num">${pp}</td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-action="results" title="Nhập kết quả">📊</button>
          <button class="btn btn-sm btn-secondary" data-action="edit" title="Sửa">✏️</button>
          <button class="btn btn-sm btn-secondary" data-action="delete" title="Xoá">🗑️</button>
        </td>
      </tr>
    `;
  }

  function fmtDate(start, end) {
    return QPE.utils.fmtDateRange(start, end);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function humanizeTier(key) {
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function getTierOptions(currentTier) {
    const settingsMult = (QPE_APP.state.settings && QPE_APP.state.settings.tierMult) || {};
    const tiers = {};
    // Defaults first
    for (const k of ['championship', 'high_roller', 'mid_stakes', 'side']) {
      tiers[k] = (typeof settingsMult[k] === 'number') ? settingsMult[k] : QPE.CONST.TIER_MULT[k];
    }
    // Custom tiers
    for (const [k, v] of Object.entries(settingsMult)) {
      if (!(k in tiers)) tiers[k] = v;
    }
    // Include currentTier even if no longer defined (so it shows in edit)
    if (currentTier && !(currentTier in tiers)) {
      tiers[currentTier] = 0;
    }
    return Object.entries(tiers).map(([k, v]) =>
      `<option value="${escapeHtml(k)}" ${currentTier===k?'selected':''}>${escapeHtml(humanizeTier(k))} ×${(v || 0).toFixed(2)}</option>`
    ).join('');
  }

  // ─── Event bindings ─────────────────────────────────────
  function bindEmpty() {
    const seedBtn = document.getElementById('btn-seed');
    if (seedBtn) seedBtn.addEventListener('click', onSeed);
    const addBtn = document.getElementById('btn-add-event-empty');
    if (addBtn) addBtn.addEventListener('click', () => openEditModal(null));
  }

  function bind(container) {
    const search = document.getElementById('ev-search');
    if (search) {
      const onSearch = QPE.utils.debounce((val) => {
        container.dataset.search = val;
        render();
      }, 200);
      search.addEventListener('input', (e) => onSearch(e.target.value));
    }
    const status = document.getElementById('ev-status');
    if (status) {
      status.addEventListener('change', (e) => {
        container.dataset.filterStatus = e.target.value;
        render();
      });
    }
    const tier = document.getElementById('ev-tier');
    if (tier) {
      tier.addEventListener('change', (e) => {
        container.dataset.filterTier = e.target.value;
        render();
      });
    }

    const addBtn = document.getElementById('btn-add-event');
    if (addBtn) addBtn.addEventListener('click', () => openEditModal(null));

    // Expand/collapse all toggle
    const expandAllBtn = document.getElementById('btn-expand-all');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        const allSeries = QPE_APP.state.events.map(e => e.series_id || '_orphan');
        const uniqueSeries = [...new Set(allSeries)];
        if (collapsedSeries.size > 0) {
          collapsedSeries.clear();
        } else {
          uniqueSeries.forEach(id => collapsedSeries.add(id));
        }
        render();
      });
    }

    // Accordion toggle
    container.querySelectorAll('[data-toggle]').forEach(head => {
      head.addEventListener('click', () => {
        const sid = head.dataset.toggle;
        if (collapsedSeries.has(sid)) collapsedSeries.delete(sid);
        else collapsedSeries.add(sid);
        render();
      });
    });

    container.querySelectorAll('tr[data-event-id]').forEach(tr => {
      const id = tr.dataset.eventId;
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => openEditModal(id));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => onDelete(id));
      tr.querySelector('[data-action="results"]').addEventListener('click', () => {
        QPE_UI.tabs.switchTo('results');
        if (QPE_UI.results && QPE_UI.results.selectEvent) {
          QPE_UI.results.selectEvent(id);
        }
      });
    });
  }

  // ─── Actions ────────────────────────────────────────────
  async function onSeed() {
    const has = QPE_APP.state.events.length > 0;
    if (has) {
      const ok = await UI.modal.confirm(
        'Đã có events trong state. Load seed sẽ ghi đè toàn bộ events hiện tại (kết quả không bị mất). Tiếp tục?',
        { title: 'Load QPC 2026 schedule', danger: true }
      );
      if (!ok) return;
    }
    QPE_APP.seedQPC2026();
    UI.toast.show(`Đã load ${QPE_APP.state.events.length} events QPC 2026`, 'success');
    render();
  }

  async function onDelete(id) {
    const e = QPE_APP.state.events.find(x => x.id === id);
    if (!e) return;
    const resultCount = QPE_APP.state.results.filter(r => r.event_id === id).length;
    const msg = resultCount > 0
      ? `Xoá event "${e.name}" sẽ xoá luôn ${resultCount} kết quả đã nhập. Tiếp tục?`
      : `Xoá event "${e.name}"?`;
    const ok = await UI.modal.confirm(msg, { title: 'Xoá event', danger: true, okText: 'Xoá' });
    if (!ok) return;
    QPE_APP.state.events = QPE_APP.state.events.filter(x => x.id !== id);
    QPE_APP.state.results = QPE_APP.state.results.filter(r => r.event_id !== id);
    QPE_APP.save();
    UI.toast.show(`Đã xoá event "${e.name}"`, 'success');
    render();
  }

  // ─── Modal: Add/Edit Event ──────────────────────────────
  function openEditModal(eventId) {
    const isNew = !eventId;
    const seriesList = QPE_APP.state.series || [];
    const defaultSeriesId = seriesList.length > 0 ? seriesList[0].id : '';
    const ev = isNew
      ? {
          id: '', series_id: defaultSeriesId, code: '', name: '', tier: 'side',
          is_womens: false, is_multi_flight: false,
          date_start: new Date().toISOString().slice(0,10),
          date_end:   '',
          buyin_listed: 0, is_satellite: false, status: 'scheduled',
          gtd_vnd: 0, prizepool_actual: 0, overlay_covered: true,
          entries_total: 0, unique_players: 0, itm_cutoff: 0
        }
      : { ...QPE_APP.state.events.find(e => e.id === eventId) };

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-row">
        <div>
          <label>ID (unique)</label>
          <input id="ed-id" type="text" value="${escapeHtml(ev.id)}" ${isNew ? '' : 'disabled'} placeholder="vd: me_2026">
        </div>
        <div>
          <label>Code</label>
          <input id="ed-code" type="text" value="${escapeHtml(ev.code)}" placeholder="vd: #18">
        </div>
        <div style="flex: 1.5;">
          <label>Series</label>
          <select id="ed-series">
            ${seriesList.length === 0 ? '<option value="">— Chưa có series —</option>' : ''}
            ${seriesList.map(s => `<option value="${escapeHtml(s.id)}" ${ev.series_id===s.id?'selected':''}>${escapeHtml(s.short_name || s.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div style="flex: 2;">
          <label>Tên event</label>
          <input id="ed-name" type="text" value="${escapeHtml(ev.name)}" placeholder="Main Event">
        </div>
        <div>
          <label>Tier <span class="help" data-tip="Tier quyết định hệ số điểm. Quản lý ở Cài đặt → Tier Multipliers.">?</span></label>
          <select id="ed-tier">
            ${getTierOptions(ev.tier)}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div>
          <label>Ngày bắt đầu</label>
          <input id="ed-date-start" type="date" value="${escapeHtml(ev.date_start)}">
        </div>
        <div>
          <label>Ngày kết thúc (optional)</label>
          <input id="ed-date-end" type="date" value="${escapeHtml(ev.date_end)}">
        </div>
        <div>
          <label>Status</label>
          <select id="ed-status">
            <option value="scheduled" ${ev.status==='scheduled'?'selected':''}>Lịch</option>
            <option value="running"   ${ev.status==='running'?'selected':''}>Đang chạy</option>
            <option value="completed" ${ev.status==='completed'?'selected':''}>Done</option>
            <option value="cancelled" ${ev.status==='cancelled'?'selected':''}>Huỷ</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div>
          <label>Buyin (VND)</label>
          <input id="ed-buyin" type="text" data-money value="${ev.buyin_listed || ''}" placeholder="25,000,000 hoặc 25M">
        </div>
        <div>
          <label>GTD (VND)</label>
          <input id="ed-gtd" type="text" data-money value="${ev.gtd_vnd || ''}" placeholder="25B hoặc 25,000,000,000">
        </div>
        <div>
          <label>Số ITM <span class="help" data-tip="Số người vào tiền (in-the-money). Ví dụ event 400 entries, top 50 nhận tiền → ITM = 50. Rank > ITM = 0 điểm.">?</span></label>
          <input id="ed-itm" type="number" value="${ev.itm_cutoff || ''}" min="0" placeholder="vd 50">
        </div>
      </div>
      <div class="form-row">
        <div>
          <label>PP actual (VND) <span class="help" data-tip="Prizepool thực tế sau khi đóng đăng ký. Nếu trống và overlay covered → tự lấy GTD.">?</span></label>
          <input id="ed-pp" type="text" data-money value="${ev.prizepool_actual || ''}" placeholder="auto từ GTD nếu trống">
        </div>
        <div>
          <label>Entries total <span class="help" data-tip="Tổng số entries (bao gồm cả re-entry). Chỉ để hiển thị, không ảnh hưởng điểm.">?</span></label>
          <input id="ed-entries" type="number" value="${ev.entries_total || ''}" min="0">
        </div>
      </div>
      <div class="form-row">
        <div style="display:flex; align-items:center; gap: var(--sp-3); flex-wrap: wrap;">
          <label data-tip="Nếu organizer bù để đạt GTD khi event ế, PP = GTD" style="display:flex; align-items:center; gap: 6px; cursor:pointer; margin:0;">
            <input id="ed-overlay" type="checkbox" ${ev.overlay_covered ? 'checked' : ''}>
            Organizer cover overlay
          </label>
          <label data-tip="Event chỉ dành cho phụ nữ — xuất hiện trong Bảng XH Women's" style="display:flex; align-items:center; gap: 6px; cursor:pointer; margin:0;">
            <input id="ed-womens" type="checkbox" ${ev.is_womens ? 'checked' : ''}>
            Women's event
          </label>
          <label data-tip="Multi-flight: nhiều Day 1 (1A, 1B...) gộp lại Day 2" style="display:flex; align-items:center; gap: 6px; cursor:pointer; margin:0;">
            <input id="ed-multi" type="checkbox" ${ev.is_multi_flight ? 'checked' : ''}>
            Multi-flight
          </label>
        </div>
      </div>
      <div id="ed-errors" style="color: var(--danger); margin-top: var(--sp-3); display: none; font-size: 13px;"></div>
    `;

    const footer = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Huỷ';
    cancel.addEventListener('click', () => UI.modal.close());
    const save = document.createElement('button');
    save.className = 'btn btn-primary';
    save.textContent = isNew ? 'Thêm event' : 'Lưu thay đổi';
    save.addEventListener('click', () => saveEvent(ev, isNew));
    footer.appendChild(cancel);
    footer.appendChild(save);

    UI.modal.open({
      title: isNew ? 'Thêm event mới' : `Sửa: ${ev.name}`,
      body,
      footer
    });

    // Attach money formatter to all data-money inputs
    if (UI.money) UI.money.attachAll('input[data-money]');
  }

  function saveEvent(original, isNew) {
    const get = (id) => document.getElementById(id);
    const seriesEl = get('ed-series');
    const updated = {
      ...original,
      id:   isNew ? (get('ed-id').value || '').trim() : original.id,
      series_id: seriesEl ? seriesEl.value : (original.series_id || ''),
      code: get('ed-code').value.trim(),
      name: get('ed-name').value.trim(),
      tier: get('ed-tier').value,
      date_start: get('ed-date-start').value,
      date_end:   get('ed-date-end').value || get('ed-date-start').value,
      buyin_listed: QPE.utils.parseVnd(get('ed-buyin').value),
      gtd_vnd: QPE.utils.parseVnd(get('ed-gtd').value),
      prizepool_actual: QPE.utils.parseVnd(get('ed-pp').value),
      itm_cutoff: parseInt(get('ed-itm').value, 10) || 0,
      entries_total: parseInt(get('ed-entries').value, 10) || 0,
      status: get('ed-status').value,
      overlay_covered: get('ed-overlay').checked,
      is_womens:       get('ed-womens').checked,
      is_multi_flight: get('ed-multi').checked
    };

    // Auto-fill PP if empty + status completed
    if (!updated.prizepool_actual && updated.status === 'completed') {
      updated.prizepool_actual = QPE.event.computePP(updated);
    }

    // Validate
    const v = QPE.validate.event(updated);
    if (!v.ok) {
      const errEl = document.getElementById('ed-errors');
      errEl.innerHTML = '⚠️ ' + v.errors.join('<br>⚠️ ');
      errEl.style.display = 'block';
      return;
    }

    // Check unique ID on new
    if (isNew) {
      if (!updated.id) {
        showFormError('ID không được trống');
        return;
      }
      if (QPE_APP.state.events.find(e => e.id === updated.id)) {
        showFormError('ID "' + updated.id + '" đã tồn tại');
        return;
      }
      QPE_APP.state.events.push(updated);
    } else {
      const idx = QPE_APP.state.events.findIndex(e => e.id === original.id);
      QPE_APP.state.events[idx] = updated;
    }

    QPE_APP.save();
    UI.modal.close();
    UI.toast.show(isNew ? `Đã thêm "${updated.name}"` : `Đã cập nhật "${updated.name}"`, 'success');
    render();
  }

  function showFormError(msg) {
    const errEl = document.getElementById('ed-errors');
    errEl.innerHTML = '⚠️ ' + msg;
    errEl.style.display = 'block';
  }

  function init() {
    render();
    QPE_APP.subscribe(() => {
      if (QPE_UI.tabs.current() === 'events') render();
    });
  }

  UI.events = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
