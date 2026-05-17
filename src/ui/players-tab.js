/**
 * QPC POY — Tab Players
 *
 * List all players with aggregated stats. Rename + merge actions.
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  const M = {
    search: '',
    selected: new Set()      // for merge selection
  };

  function render() {
    const container = document.getElementById('tab-players');
    if (!container) return;

    const players = QPE_APP.state.players;

    // Aggregate stats per player
    const stats = aggregateStats();

    let list = players.map(p => ({
      ...p,
      ...stats[p.id]
    }));

    if (M.search) {
      const q = M.search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.aliases || []).some(a => a.toLowerCase().includes(q)) ||
        (p.display_id || '').toLowerCase().includes(q) ||
        (p.country || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    if (players.length === 0) {
      container.innerHTML = `
        <h2>Players</h2>
        <div class="empty-state">
          <div class="icon">👥</div>
          <p><strong>Chưa có player nào.</strong></p>
          <p>Player được tạo tự động khi bạn nhập kết quả ở tab <b>📊 Nhập kết quả</b>.</p>
        </div>
      `;
      return;
    }

    const anyAlias = list.some(p => (p.aliases || []).length > 0);

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--sp-4);">
        <h2 style="margin:0;">Players <span class="muted" style="font-size: 14px; font-weight: 400;">${players.length}</span></h2>
        <button class="btn btn-secondary btn-sm" id="pl-merge" ${M.selected.size < 2 ? 'disabled' : ''}>🔗 Merge${M.selected.size>=2 ? ` (${M.selected.size})` : ''}</button>
      </div>

      <div class="toolbar" style="margin-bottom: var(--sp-3);">
        <input type="text" id="pl-search" placeholder="🔍 Tìm name/ID/country..." value="${escapeHtml(M.search)}" style="min-width: 220px;">
        <div class="spacer"></div>
        <span class="muted">${list.length}/${players.length}</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 30px;"></th>
              <th style="width: 50px;">Flag</th>
              <th style="width: 90px;">ID <span class="help" data-tip="Mã định danh riêng của player (phân biệt trùng tên). Hiển thị cùng cờ ở Bảng XH.">?</span></th>
              <th>Tên</th>
              <th style="width: 80px; text-align: right;">Cashes</th>
              <th style="width: 100px; text-align: right;">Points</th>
              <th style="width: 110px; text-align: right;">Prize</th>
              ${anyAlias ? '<th>Aliases</th>' : ''}
              <th style="width: 100px; text-align: right;"></th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => {
              const flag = p.country ? QPE.utils.countryFlag(p.country) : '';
              return `
                <tr data-pid="${escapeHtml(p.id)}">
                  <td><input type="checkbox" class="pl-check" data-pid="${escapeHtml(p.id)}" ${M.selected.has(p.id)?'checked':''}></td>
                  <td style="font-size: 18px; text-align: center;">${flag || '—'}</td>
                  <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-2);">${escapeHtml(p.display_id || '—')}</td>
                  <td><strong>${escapeHtml(p.name)}</strong></td>
                  <td class="num">${p.cashes || 0}</td>
                  <td class="num" style="color: var(--gold);">${QPE.utils.fmtPts(p.total_points || 0)}</td>
                  <td class="num">${QPE.utils.fmtVndCompact(p.total_prize || 0)}</td>
                  ${anyAlias ? `<td style="color: var(--text-2); font-size: 12px;">${escapeHtml((p.aliases || []).join(', '))}</td>` : ''}
                  <td class="actions">
                    <button class="btn btn-sm btn-secondary" data-action="edit" title="Sửa">✏️</button>
                    <button class="btn btn-sm btn-secondary" data-action="delete" title="Xoá">🗑️</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    bind(container);
  }

  function aggregateStats() {
    const stats = {};
    for (const r of QPE_APP.state.results) {
      if (!stats[r.player_id]) {
        stats[r.player_id] = { cashes: 0, total_prize: 0, total_points: 0 };
      }
      stats[r.player_id].cashes += 1;
      stats[r.player_id].total_prize += (r.prize_vnd || 0);
    }
    // Sum points using engine.compute(overall)
    const lb = QPE.leaderboard.compute(QPE_APP.state, 'overall', QPE_APP.state.settings);
    for (const e of lb) {
      if (stats[e.player_id]) stats[e.player_id].total_points = e.final_total;
    }
    return stats;
  }

  function bind(container) {
    const plSearch = QPE.utils.debounce((val) => { M.search = val; render(); }, 200);
    document.getElementById('pl-search').addEventListener('input', (e) => plSearch(e.target.value));

    document.getElementById('pl-merge').addEventListener('click', onMerge);

    container.querySelectorAll('.pl-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const pid = e.target.dataset.pid;
        if (e.target.checked) M.selected.add(pid);
        else M.selected.delete(pid);
        render();
      });
    });

    container.querySelectorAll('tr[data-pid]').forEach(tr => {
      const pid = tr.dataset.pid;
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => onEdit(pid));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => onDelete(pid));
    });
  }

  // ─── Actions ────────────────────────────────────────────
  function onEdit(pid) {
    const p = QPE_APP.state.players.find(x => x.id === pid);
    if (!p) return;

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-row">
        <div style="flex: 2;">
          <label>Tên player</label>
          <input id="pl-name" type="text" value="${escapeHtml(p.name)}">
        </div>
        <div>
          <label>ID <span class="help" data-tip="Mã định danh riêng (vd VN001, phone last 4). Phân biệt khi trùng tên.">?</span></label>
          <input id="pl-display-id" type="text" value="${escapeHtml(p.display_id || '')}" placeholder="VN001">
        </div>
        <div>
          <label>Quốc gia <span class="help" data-tip="ISO 2-letter (VN, US, JP...) hoặc viết đầy đủ (Vietnam, USA, Japan). Sẽ hiện cờ.">?</span></label>
          <input id="pl-country" type="text" value="${escapeHtml(p.country || '')}" placeholder="VN">
        </div>
      </div>

      <div style="display: flex; gap: var(--sp-3); margin-top: var(--sp-2); align-items: center; font-size: 13px;">
        <span class="muted">Preview:</span>
        <span id="pl-preview" style="font-size: 16px;">${p.country ? QPE.utils.countryFlag(p.country) : '🏳️'} <strong style="color: var(--text-0);">${escapeHtml(p.name)}</strong> ${p.display_id ? `<span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-2);">${escapeHtml(p.display_id)}</span>` : ''}</span>
      </div>

      <div style="margin-top: var(--sp-4);">
        <label>Aliases (do merge cũ)</label>
        <div class="muted" style="font-size: 12px;">${(p.aliases || []).length > 0 ? (p.aliases || []).map(escapeHtml).join(', ') : '—'}</div>
      </div>

      <p class="muted" style="font-size: 12px; margin-top: var(--sp-4);">
        Nếu đổi tên, tên cũ "${escapeHtml(p.name)}" sẽ vào aliases để khớp với data cũ.
      </p>
    `;

    // Live preview
    function updatePreview() {
      const name = document.getElementById('pl-name').value || p.name;
      const id   = document.getElementById('pl-display-id').value;
      const cn   = QPE.utils.normalizeCountry(document.getElementById('pl-country').value);
      const flag = cn ? QPE.utils.countryFlag(cn) : '🏳️';
      const idTag = id ? `<span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-2); margin-left: 6px;">${escapeHtml(id)}</span>` : '';
      document.getElementById('pl-preview').innerHTML = `${flag} <strong style="color: var(--text-0);">${escapeHtml(name)}</strong>${idTag}`;
    }
    setTimeout(() => {
      ['pl-name', 'pl-display-id', 'pl-country'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
      });
    }, 0);

    const footer = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Huỷ';
    cancel.addEventListener('click', () => UI.modal.close());
    const save = document.createElement('button');
    save.className = 'btn btn-primary';
    save.textContent = 'Lưu';
    save.addEventListener('click', () => {
      const newName = QPE.parse.normalizeName(document.getElementById('pl-name').value);
      const newId   = (document.getElementById('pl-display-id').value || '').trim();
      const newCountry = QPE.utils.normalizeCountry(document.getElementById('pl-country').value);

      if (!newName) { UI.toast.show('Tên không được trống', 'warning'); return; }

      if (newName !== p.name) {
        p.aliases = p.aliases || [];
        if (!p.aliases.includes(p.name)) p.aliases.push(p.name);
        p.name = newName;
        for (const r of QPE_APP.state.results) {
          if (r.player_id === pid) r.player_name = newName;
        }
      }
      p.display_id = newId;
      p.country = newCountry;
      QPE_APP.save();
      UI.toast.show(`Đã cập nhật "${newName}"`, 'success');
      UI.modal.close();
    });
    footer.appendChild(cancel);
    footer.appendChild(save);
    UI.modal.open({ title: 'Sửa player', body, footer });
  }

  async function onDelete(pid) {
    const p = QPE_APP.state.players.find(x => x.id === pid);
    if (!p) return;
    const resultCount = QPE_APP.state.results.filter(r => r.player_id === pid).length;
    const ok = await UI.modal.confirm(
      `Xoá player "${p.name}" sẽ xoá luôn ${resultCount} kết quả. Tiếp tục?`,
      { title: 'Xoá player', danger: true, okText: 'Xoá' }
    );
    if (!ok) return;
    QPE_APP.state.players = QPE_APP.state.players.filter(x => x.id !== pid);
    QPE_APP.state.results = QPE_APP.state.results.filter(r => r.player_id !== pid);
    M.selected.delete(pid);
    QPE_APP.save();
    UI.toast.show(`Đã xoá "${p.name}"`, 'success');
  }

  function onMerge() {
    const ids = [...M.selected];
    if (ids.length < 2) return;
    const players = ids.map(id => QPE_APP.state.players.find(p => p.id === id)).filter(Boolean);
    if (players.length < 2) return;

    const body = document.createElement('div');
    body.innerHTML = `
      <p>Gộp ${players.length} player thành 1. Chọn player <strong>target</strong> (giữ lại):</p>
      <div style="margin: var(--sp-3) 0;">
        ${players.map((p, i) => `
          <label style="display: block; padding: 8px 12px; margin-bottom: 4px; background: var(--bg-2); border: 1px solid var(--border-1); border-radius: var(--rd-md); cursor: pointer;">
            <input type="radio" name="merge-target" value="${escapeHtml(p.id)}" ${i===0?'checked':''}>
            <strong>${escapeHtml(p.name)}</strong>
            <span class="muted" style="font-size: 12px;">· ${QPE_APP.state.results.filter(r => r.player_id === p.id).length} cash</span>
          </label>
        `).join('')}
      </div>
      <p class="muted" style="font-size: 12px;">
        Các player còn lại sẽ được thêm vào <code>aliases</code> của target. Tất cả results trỏ về target.
      </p>
    `;
    const footer = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Huỷ';
    cancel.addEventListener('click', () => UI.modal.close());
    const ok = document.createElement('button');
    ok.className = 'btn btn-primary';
    ok.textContent = 'Merge';
    ok.addEventListener('click', () => {
      const checked = document.querySelector('input[name="merge-target"]:checked');
      if (!checked) {
        UI.toast.show('Chọn player target để merge', 'danger');
        return;
      }
      doMerge(checked.value, ids);
      UI.modal.close();
    });
    footer.appendChild(cancel);
    footer.appendChild(ok);
    UI.modal.open({ title: 'Merge players', body, footer });
  }

  function doMerge(targetId, allIds) {
    const target = QPE_APP.state.players.find(p => p.id === targetId);
    if (!target) return;
    target.aliases = target.aliases || [];
    for (const id of allIds) {
      if (id === targetId) continue;
      const src = QPE_APP.state.players.find(p => p.id === id);
      if (!src) continue;
      if (!target.aliases.includes(src.name)) target.aliases.push(src.name);
      for (const a of (src.aliases || [])) {
        if (!target.aliases.includes(a)) target.aliases.push(a);
      }
      // Reassign results
      for (const r of QPE_APP.state.results) {
        if (r.player_id === id) {
          r.player_id = targetId;
          r.player_name = target.name;
        }
      }
    }
    // Remove merged players
    QPE_APP.state.players = QPE_APP.state.players.filter(p => p.id === targetId || !allIds.includes(p.id));
    M.selected.clear();
    QPE_APP.save();
    UI.toast.show(`Đã merge ${allIds.length} players vào "${target.name}"`, 'success');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    render();
    QPE_APP.subscribe(() => {
      if (QPE_UI.tabs.current() === 'players') render();
    });
    QPE_UI.tabs.onSwitch((name) => {
      if (name === 'players') render();
    });
  }

  UI.players = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
