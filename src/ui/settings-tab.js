/**
 * QPC POY — Tab Settings
 *
 * Tune K, TierMult, MinCash. Reset data.
 */
(function (global) {
  'use strict';
  const UI = global.QPE_UI = global.QPE_UI || {};

  function render() {
    const container = document.getElementById('tab-settings');
    if (!container) return;

    const s = QPE_APP.state.settings;
    const mult = (tier) => {
      if (s.tierMult && typeof s.tierMult[tier] === 'number') return s.tierMult[tier];
      return QPE.CONST.TIER_MULT[tier];
    };
    const minc = (board) => {
      if (s.minCash && typeof s.minCash[board] === 'number') return s.minCash[board];
      return QPE.CONST.MIN_CASH[board];
    };
    const ls = QPE_APP.state.meta && QPE_APP.state.meta.last_saved;
    const lastSaved = ls ? new Date(ls).toLocaleString('vi-VN') : '—';
    const stateSize = JSON.stringify(QPE_APP.state).length;

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--sp-4);">
        <h2 style="margin:0;">Settings</h2>
        <div style="display:flex; gap: var(--sp-2);">
          <button class="btn btn-secondary btn-sm" id="st-defaults">↺ Default</button>
          <button class="btn btn-primary btn-sm" id="st-save">💾 Lưu</button>
        </div>
      </div>

      <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-5); margin-bottom: var(--sp-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3);">
          <h3 style="margin: 0; font-size: 15px;">
            Tier Multipliers
            <span class="help" data-tip="Hệ số nhân điểm cho từng tier event. Default 4 tiers (Champ ×1.0, HR ×1.0, Mid ×0.6, Side ×0.3) — không xoá được. Thêm tier custom nếu cần.">?</span>
          </h3>
          <button class="btn btn-sm btn-secondary" id="st-tier-add">+ Thêm tier</button>
        </div>
        <div id="st-tier-list"></div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4);">
        <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-5);">
          <h3 style="margin-top: 0; font-size: 15px;">
            Eligibility — Min events cash
            <span class="help" data-tip="Số event tối thiểu player phải có ít nhất 1 cash để vào ranking chính thức. Default = 1 (chấp nhận one-shot wonder). Nâng lên 3 nếu muốn enforce consistency.">?</span>
          </h3>
          <p class="muted" style="font-size: 12px; margin: 0 0 var(--sp-3);">Default 1 = chấp nhận one-shot wonder. Tăng lên để enforce consistency.</p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-3);">
            ${['overall', 'womens', 'high_roller'].map(board => `
              <div>
                <label>${board === 'overall' ? 'Overall' : board === 'womens' ? "Women's" : 'HR'}</label>
                <input id="st-minc-${board}" type="number" value="${minc(board)}" min="0" step="1">
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-5);">
          <h3 style="margin-top: 0; font-size: 15px;">Khác</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3);">
            <div>
              <label>K (scale) <span class="help" data-tip="Hằng số scale điểm. Default 100. Không ảnh hưởng xếp hạng, chỉ độ lớn số (Main winner ~16K). Cố định trong series.">?</span></label>
              <input id="st-K" type="number" value="${s.K || QPE.CONST.K}" min="1" step="1">
            </div>
            <div>
              <label>HR threshold <span class="help" data-tip="Buyin tối thiểu (VND) để event vào sub-board High Roller. Default 30M.">?</span></label>
              <input id="st-hr-threshold" type="text" data-money value="${s.hrBuyinThreshold || QPE.CONST.HR_BUYIN_THRESHOLD}" placeholder="30M">
            </div>
          </div>
        </div>
      </div>

      <h2 style="margin: var(--sp-7) 0 var(--sp-4);">☁️ Cloud Sync (GitHub)</h2>

      <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-5); margin-bottom: var(--sp-4);">
        ${renderCloudSyncSection()}
      </div>

      <h2 style="margin: var(--sp-7) 0 var(--sp-4);">Backup</h2>

      <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-5); margin-bottom: var(--sp-4);">
        <div style="display: flex; gap: var(--sp-5); margin-bottom: var(--sp-4); padding-bottom: var(--sp-4); border-bottom: 1px solid var(--border-1);">
          <div style="flex: 1;"><div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Series</div><div class="num" style="font-size: 22px;">${(QPE_APP.state.series || []).length}</div></div>
          <div style="flex: 1;"><div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Events</div><div class="num" style="font-size: 22px;">${QPE_APP.state.events.length}</div></div>
          <div style="flex: 1;"><div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Players</div><div class="num" style="font-size: 22px;">${QPE_APP.state.players.length}</div></div>
          <div style="flex: 1;"><div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Results</div><div class="num" style="font-size: 22px;">${QPE_APP.state.results.length}</div></div>
          <div style="flex: 1;"><div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Size</div><div class="num" style="font-size: 22px;">${formatBytes(stateSize)}</div></div>
        </div>
        <div class="muted" style="font-size: 12px;">Auto-save · LocalStorage lúc <strong>${lastSaved}</strong></div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4);">
        <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-5);">
          <h3 style="margin-top: 0; font-size: 15px;">⬇️ Export</h3>
          <p class="muted" style="font-size: 13px;">Full state (JSON) hoặc Events ra Excel.</p>
          <div style="display: flex; gap: var(--sp-2); flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" id="bk-export-json">JSON</button>
            <button class="btn btn-secondary btn-sm" id="bk-export-xlsx">Events → Excel</button>
          </div>
        </div>

        <div style="background: var(--bg-1); border: 1px solid var(--border-1); border-radius: var(--rd-lg); padding: var(--sp-5);">
          <h3 style="margin-top: 0; font-size: 15px;">⬆️ Import JSON</h3>
          <p class="muted" style="font-size: 13px;">Khôi phục từ JSON (sẽ ghi đè).</p>
          <input type="file" id="bk-file" accept=".json" style="font-size: 12px;">
          <div id="bk-file-info" class="muted" style="font-size: 12px; margin-top: var(--sp-2);"></div>
        </div>
      </div>

      <div style="margin-top: var(--sp-7); padding-top: var(--sp-5); border-top: 1px solid var(--border-1); display: flex; justify-content: flex-end;">
        <button class="btn btn-danger btn-sm" id="st-reset-all">🗑️ Xoá toàn bộ data</button>
      </div>
    `;

    renderTierList();
    bind();
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ─── Cloud Sync (GitHub) ─────────────────────────────────
  function renderCloudSyncSection() {
    if (typeof QPE_SYNC === 'undefined') {
      return `<p class="muted">Cloud sync module chưa load.</p>`;
    }
    const cfg = QPE_SYNC.getConfig();
    const pat = QPE_SYNC.getPAT();
    const st = QPE_SYNC.getStatus();

    return `
      <p class="muted" style="font-size: 13px; margin: 0 0 var(--sp-3);">
        Đồng bộ <code>data.json</code> qua GitHub repo. Mỗi save → commit. Pull mỗi 20s khi auto-sync ON.
        Tạo PAT ở <a href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a> (scope <code>repo</code> hoặc <code>public_repo</code>).
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr 100px 1fr; gap: var(--sp-3); margin-bottom: var(--sp-3);">
        <div>
          <label>Owner <span class="help" data-tip="GitHub username hoặc org sở hữu repo">?</span></label>
          <input id="cs-owner" type="text" value="${escapeHtml(cfg.owner || '')}" placeholder="vuadeptrai">
        </div>
        <div>
          <label>Repo</label>
          <input id="cs-repo" type="text" value="${escapeHtml(cfg.repo || '')}" placeholder="qpc-poy">
        </div>
        <div>
          <label>Branch</label>
          <input id="cs-branch" type="text" value="${escapeHtml(cfg.branch || 'main')}" placeholder="main">
        </div>
        <div>
          <label>Data path</label>
          <input id="cs-path" type="text" value="${escapeHtml(cfg.path || 'data.json')}" placeholder="data.json">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--sp-3); margin-bottom: var(--sp-3);">
        <div>
          <label>Personal Access Token (PAT) <span class="help" data-tip="Token để PUSH. Chỉ lưu local, KHÔNG export. Scope cần: repo (private) hoặc public_repo (public).">?</span></label>
          <input id="cs-pat" type="password" value="${escapeHtml(pat)}" placeholder="ghp_...">
        </div>
        <div>
          <label>Device label <span class="help" data-tip="Tên máy hiện tại — hiển thị trong commit message để biết ai sync.">?</span></label>
          <input id="cs-device" type="text" value="${escapeHtml(cfg.deviceLabel || '')}" placeholder="td-laptop">
        </div>
      </div>

      <div style="display: flex; gap: var(--sp-3); align-items: center; margin-bottom: var(--sp-4);">
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0; font-size: 13px;">
          <input id="cs-enabled" type="checkbox" ${cfg.enabled ? 'checked' : ''}>
          <span>Enable cloud sync</span>
        </label>
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0; font-size: 13px;">
          <input id="cs-auto" type="checkbox" ${cfg.autoSync ? 'checked' : ''}>
          <span>Auto-sync (push mỗi save, pull mỗi 20s)</span>
        </label>
      </div>

      <div style="display: flex; gap: var(--sp-2); align-items: center;">
        <button class="btn btn-secondary btn-sm" id="cs-save">💾 Lưu config</button>
        <button class="btn btn-primary btn-sm" id="cs-pull">↓ Pull</button>
        <button class="btn btn-primary btn-sm" id="cs-push">↑ Push</button>
        <div style="flex: 1;"></div>
        <div id="cs-status" style="font-size: 12px;">${renderSyncStatus(st)}</div>
      </div>
    `;
  }

  function renderSyncStatus(st) {
    if (!st) return '<span class="muted">—</span>';
    if (st.state === 'pulling') return '<span style="color: var(--info);">↓ Đang pull…</span>';
    if (st.state === 'pushing') return '<span style="color: var(--info);">↑ Đang push…</span>';
    if (st.state === 'conflict') return '<span style="color: var(--warning);">⚠️ Conflict</span>';
    if (st.state === 'error')   return `<span style="color: var(--danger);" title="${escapeHtml(st.error || '')}">❌ ${escapeHtml((st.error || '').slice(0, 60))}</span>`;
    if (st.lastSync) {
      const t = new Date(st.lastSync);
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      return `<span style="color: var(--success);">✓ Synced ${hh}:${mm}</span>`;
    }
    return '<span class="muted">Chưa sync</span>';
  }

  function bindCloudSync() {
    const get = (id) => document.getElementById(id);
    if (!get('cs-save')) return;

    get('cs-save').addEventListener('click', () => {
      const cfg = {
        enabled:     get('cs-enabled').checked,
        owner:       get('cs-owner').value.trim(),
        repo:        get('cs-repo').value.trim(),
        branch:      get('cs-branch').value.trim() || 'main',
        path:        get('cs-path').value.trim() || 'data.json',
        deviceLabel: get('cs-device').value.trim(),
        autoSync:    get('cs-auto').checked
      };
      QPE_SYNC.setConfig(cfg);
      QPE_SYNC.setPAT(get('cs-pat').value.trim());

      // Restart auto-sync if needed
      QPE_SYNC.stopAuto();
      if (cfg.enabled && cfg.autoSync) QPE_SYNC.startAuto();

      UI.toast.show('Đã lưu cloud config', 'success');
    });

    get('cs-pull').addEventListener('click', async () => {
      try {
        await QPE_SYNC.pull();
        UI.toast.show('Đã pull data từ cloud', 'success');
      } catch (err) {
        UI.toast.show('Pull lỗi: ' + err.message, 'danger', 5000);
      }
    });

    get('cs-push').addEventListener('click', async () => {
      try {
        const r = await QPE_SYNC.push();
        if (r.cancelled) return;
        UI.toast.show('Đã push lên cloud', 'success');
      } catch (err) {
        UI.toast.show('Push lỗi: ' + err.message, 'danger', 5000);
      }
    });
  }

  const DEFAULT_TIERS = ['championship', 'high_roller', 'mid_stakes', 'side'];

  function allTiers() {
    const settingsMult = (QPE_APP.state.settings && QPE_APP.state.settings.tierMult) || {};
    const out = {};
    for (const k of DEFAULT_TIERS) {
      out[k] = (typeof settingsMult[k] === 'number') ? settingsMult[k] : QPE.CONST.TIER_MULT[k];
    }
    for (const [k, v] of Object.entries(settingsMult)) {
      if (!(k in out)) out[k] = typeof v === 'number' ? v : 0.5;
    }
    return out;
  }

  function humanizeTier(key) {
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderTierList() {
    const list = document.getElementById('st-tier-list');
    if (!list) return;
    const tiers = allTiers();
    const entries = Object.entries(tiers);

    list.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 100px 40px; gap: var(--sp-2) var(--sp-3); align-items: center;">
        <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Tier</div>
        <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; text-align: right;">×Mult</div>
        <div></div>
        ${entries.map(([key, val]) => {
          const isDef = DEFAULT_TIERS.includes(key);
          return `
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <span style="color: var(--text-1); font-size: 13px;">${escapeHtml(humanizeTier(key))}</span>
              <code style="font-family: var(--font-mono); font-size: 11px; color: var(--text-mute);">${escapeHtml(key)}</code>
              ${isDef ? '<span class="muted" style="font-size: 10px; padding: 1px 6px; background: var(--bg-2); border-radius: 999px;">default</span>' : ''}
            </div>
            <input type="number" data-tier-key="${escapeHtml(key)}" value="${val}" min="0" max="2" step="0.05" style="text-align: right;">
            <button class="btn btn-sm btn-ghost" data-tier-del="${escapeHtml(key)}" ${isDef ? 'disabled style="opacity: 0.2;"' : ''} title="${isDef ? 'Tier mặc định không xoá được' : 'Xoá tier'}">🗑️</button>
          `;
        }).join('')}
      </div>
    `;

    list.querySelectorAll('[data-tier-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.tierDel;
        if (DEFAULT_TIERS.includes(key)) return;
        const usage = QPE_APP.state.events.filter(e => e.tier === key).length;
        if (usage > 0) {
          UI.modal.confirm(
            `Tier "${key}" đang được dùng bởi ${usage} event. Xoá tier sẽ làm events đó mất điểm. Tiếp tục?`,
            { title: 'Xoá tier', danger: true, okText: 'Xoá' }
          ).then(ok => { if (ok) deleteCustomTier(key); });
        } else {
          deleteCustomTier(key);
        }
      });
    });
  }

  function deleteCustomTier(key) {
    if (DEFAULT_TIERS.includes(key)) return;
    const s = QPE_APP.state.settings;
    if (s.tierMult && key in s.tierMult) {
      delete s.tierMult[key];
      QPE_APP.save();
      UI.toast.show(`Đã xoá tier "${key}"`, 'success');
      render();
    }
  }

  function addTierPrompt() {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-row">
        <div style="flex: 2;">
          <label>Tier key <span class="help" data-tip="Snake_case, không trùng. VD: mystery_bounty, satellite, daily_grind">?</span></label>
          <input id="nt-key" type="text" placeholder="vd: mystery_bounty">
        </div>
        <div>
          <label>× Multiplier</label>
          <input id="nt-mult" type="number" value="0.5" min="0" max="2" step="0.05">
        </div>
      </div>
      <p class="muted" style="font-size: 12px; margin-top: var(--sp-3);">
        Sau khi thêm, tier sẽ xuất hiện trong dropdown "Tier" khi sửa event.
      </p>
      <div id="nt-err" style="color: var(--danger); font-size: 13px; margin-top: var(--sp-2); display: none;"></div>
    `;
    const footer = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Huỷ';
    cancel.addEventListener('click', () => UI.modal.close());
    const ok = document.createElement('button');
    ok.className = 'btn btn-primary';
    ok.textContent = 'Thêm tier';
    ok.addEventListener('click', () => {
      const key = (document.getElementById('nt-key').value || '').trim().toLowerCase().replace(/\s+/g, '_');
      const mult = parseFloat(document.getElementById('nt-mult').value);
      const err = document.getElementById('nt-err');
      err.style.display = 'none';
      if (!key || !/^[a-z][a-z0-9_]*$/.test(key)) {
        err.textContent = '⚠️ Key phải snake_case (a-z, 0-9, _) và bắt đầu bằng chữ';
        err.style.display = 'block'; return;
      }
      if (key in allTiers()) {
        err.textContent = '⚠️ Tier "' + key + '" đã tồn tại';
        err.style.display = 'block'; return;
      }
      if (!Number.isFinite(mult) || mult < 0) {
        err.textContent = '⚠️ Multiplier phải ≥ 0';
        err.style.display = 'block'; return;
      }
      QPE_APP.state.settings.tierMult = QPE_APP.state.settings.tierMult || {};
      QPE_APP.state.settings.tierMult[key] = mult;
      QPE_APP.save();
      UI.toast.show(`Đã thêm tier "${key}" ×${mult}`, 'success');
      UI.modal.close();
      render();
    });
    footer.appendChild(cancel);
    footer.appendChild(ok);
    UI.modal.open({ title: 'Thêm tier mới', body, footer });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function bind() {
    document.getElementById('st-save').addEventListener('click', onSave);
    document.getElementById('st-defaults').addEventListener('click', onDefaults);
    document.getElementById('st-reset-all').addEventListener('click', onResetAll);
    document.getElementById('st-tier-add').addEventListener('click', addTierPrompt);
    document.getElementById('bk-export-json').addEventListener('click', onExportJSON);
    document.getElementById('bk-export-xlsx').addEventListener('click', onExportXLSX);
    document.getElementById('bk-file').addEventListener('change', onFileChosen);
    bindCloudSync();
    if (QPE_UI.money) QPE_UI.money.attachAll('#tab-settings input[data-money]');
  }

  // ─── Backup actions ─────────────────────────────────────
  function onExportJSON() {
    const json = QPE_APP.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qpc-poy-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast.show(`Đã tải qpc-poy-${ts}.json`, 'success');
  }

  function onExportXLSX() {
    const events = QPE_APP.state.events;
    const seriesMap = {};
    for (const ss of QPE_APP.state.series) seriesMap[ss.id] = ss;
    const blob = MiniXLSX.write({
      sheetName: 'Events',
      columns: [
        { header: 'series',    key: 'series',                   width: 32 },
        { header: 'code',      key: 'code',                      width: 8  },
        { header: 'name',      key: 'name',                      width: 36 },
        { header: 'tier',      key: 'tier',                      width: 14 },
        { header: 'buyin',     key: 'buyin',  type: 'number',  width: 14 },
        { header: 'gtd',       key: 'gtd',    type: 'number',  width: 16 },
        { header: 'date',      key: 'date',                      width: 12 },
        { header: 'end',       key: 'end',                       width: 12 },
        { header: 'itm',       key: 'itm',    type: 'number',  width: 8  },
        { header: 'status',    key: 'status',                    width: 12 },
        { header: 'pp_actual', key: 'pp',     type: 'number',  width: 16 },
        { header: 'women',     key: 'women',                     width: 8  },
        { header: 'multi',     key: 'multi',                     width: 8  }
      ],
      rows: events.map(e => ({
        series: (seriesMap[e.series_id] && seriesMap[e.series_id].name) || '',
        code:   e.code || '',
        name:   e.name,
        tier:   e.tier,
        buyin:  e.buyin_listed || 0,
        gtd:    e.gtd_vnd || 0,
        date:   e.date_start ? QPE.utils.fmtDate(e.date_start) : '',
        end:    e.date_end ? QPE.utils.fmtDate(e.date_end) : '',
        itm:    e.itm_cutoff || 0,
        status: e.status,
        pp:     e.prizepool_actual || 0,
        women:  e.is_womens ? 'Y' : '',
        multi:  e.is_multi_flight ? 'Y' : ''
      }))
    });
    MiniXLSX.download(blob, `qpc-events-${new Date().toISOString().slice(0,10)}.xlsx`);
    UI.toast.show(`Đã export ${events.length} events`, 'success');
  }

  function onFileChosen(e) {
    const file = e.target.files[0];
    if (!file) return;
    const info = document.getElementById('bk-file-info');
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result);
      try {
        const preview = JSON.parse(text);
        const sx = (preview.series || []).length;
        const evs = (preview.events || []).length;
        const pls = (preview.players || []).length;
        const rs = (preview.results || []).length;
        info.textContent = `${file.name}: ${sx} series, ${evs} events, ${pls} players, ${rs} results`;

        const ok = await UI.modal.confirm(
          `File "${file.name}" có ${sx} series / ${evs} events / ${pls} players / ${rs} results. State hiện tại sẽ bị ghi đè. Tiếp tục?`,
          { title: 'Import JSON', danger: true, okText: 'Ghi đè' }
        );
        if (!ok) { e.target.value = ''; return; }
        QPE_APP.import(text);
        UI.toast.show(`Đã import ${file.name}`, 'success');
        render();
      } catch (err) {
        info.style.color = 'var(--danger)';
        info.textContent = '❌ ' + err.message;
      }
    };
    reader.readAsText(file);
  }

  function onSave() {
    const get = (id) => document.getElementById(id);

    // Helpers: parse with fallback to default (avoid NaN poisoning)
    const numOrDefault = (input, def) => {
      const v = parseFloat(input.value);
      return Number.isFinite(v) && v >= 0 ? v : def;
    };
    const intOrDefault = (input, def) => {
      const v = parseInt(input.value, 10);
      return Number.isFinite(v) && v >= 0 ? v : def;
    };

    const s = QPE_APP.state.settings;
    const KV = QPE.CONST;

    s.K = numOrDefault(get('st-K'), KV.K);

    const hrVal = QPE.utils.parseVnd(get('st-hr-threshold').value);
    s.hrBuyinThreshold = hrVal > 0 ? hrVal : KV.HR_BUYIN_THRESHOLD;

    // Read all tier mult inputs (defaults + custom)
    const newTierMult = {};
    document.querySelectorAll('input[data-tier-key]').forEach(inp => {
      const key = inp.dataset.tierKey;
      const v = parseFloat(inp.value);
      const fallback = DEFAULT_TIERS.includes(key) ? KV.TIER_MULT[key] : 0.5;
      newTierMult[key] = (Number.isFinite(v) && v >= 0) ? v : fallback;
    });
    s.tierMult = newTierMult;
    s.minCash = {
      overall:     intOrDefault(get('st-minc-overall'),     KV.MIN_CASH.overall),
      womens:      intOrDefault(get('st-minc-womens'),      KV.MIN_CASH.womens),
      high_roller: intOrDefault(get('st-minc-high_roller'), KV.MIN_CASH.high_roller)
    };
    QPE_APP.save();
    UI.toast.show('Đã lưu settings', 'success');
    render();
  }

  function onDefaults() {
    QPE_APP.state.settings = {
      K: 100,
      tierMult: {},
      minCash: {},
      hrBuyinThreshold: 30_000_000
    };
    QPE_APP.save();
    UI.toast.show('Đã reset về defaults', 'success');
    render();
  }

  async function onResetAll() {
    const body = document.createElement('div');
    body.innerHTML = `
      <p style="color: var(--danger);">⚠️ <strong>Cẩn thận!</strong> Hành động này sẽ xoá:</p>
      <ul style="font-size: 13px; line-height: 1.8;">
        <li>${QPE_APP.state.events.length} events</li>
        <li>${QPE_APP.state.players.length} players</li>
        <li>${QPE_APP.state.results.length} results</li>
        <li>Toàn bộ settings</li>
      </ul>
      <p>Gõ <code style="background: var(--bg-2); padding: 2px 6px; border-radius: 4px;">RESET</code> để xác nhận:</p>
      <input type="text" id="st-reset-confirm" placeholder="RESET" style="width: 100%;">
    `;
    const footer = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Huỷ';
    cancel.addEventListener('click', () => UI.modal.close());
    const ok = document.createElement('button');
    ok.className = 'btn btn-danger';
    ok.textContent = 'Xoá tất cả';
    ok.addEventListener('click', () => {
      const v = document.getElementById('st-reset-confirm').value.trim();
      if (v !== 'RESET') {
        UI.toast.show('Phải gõ "RESET" để xác nhận', 'warning');
        return;
      }
      QPE_APP.reset();
      UI.modal.close();
      UI.toast.show('Đã xoá toàn bộ data', 'success');
      render();
    });
    footer.appendChild(cancel);
    footer.appendChild(ok);
    UI.modal.open({ title: 'Xoá toàn bộ data', body, footer });
  }

  function init() {
    render();
    QPE_APP.subscribe(() => {
      if (QPE_UI.tabs.current() === 'settings') render();
    });
    QPE_UI.tabs.onSwitch((name) => {
      if (name === 'settings') render();
    });
    // Live status update from sync module
    if (typeof QPE_SYNC !== 'undefined') {
      QPE_SYNC.subscribe((st) => {
        const el = document.getElementById('cs-status');
        if (el) el.innerHTML = renderSyncStatus(st);
        // Also update topbar saved status indicator
        const top = document.getElementById('saved-status');
        if (top && QPE_SYNC.getConfig().enabled) {
          if (st.state === 'pulling')      top.textContent = '☁️ ↓ Pulling…';
          else if (st.state === 'pushing') top.textContent = '☁️ ↑ Pushing…';
          else if (st.state === 'error')   top.textContent = '☁️ ❌ Error';
          else if (st.lastSync) {
            const d = new Date(st.lastSync);
            top.textContent = `☁️ ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          }
        }
      });
    }
  }

  UI.settings = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
