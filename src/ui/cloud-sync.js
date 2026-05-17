/**
 * QPC POY — GitHub Cloud Sync
 *
 * Stores state (data.json) in a GitHub repo via Contents API.
 * Read = no auth (raw URL), write = Personal Access Token (PAT).
 *
 * Config (persisted in state.settings.cloudSync):
 *   { enabled, owner, repo, branch, path, autoSync, deviceLabel }
 * PAT stored separately in localStorage (NEVER in state JSON to avoid leak in exports).
 *
 * Public:
 *   QPE_SYNC.pull()        — fetch data.json, replace state
 *   QPE_SYNC.push()        — commit current state to repo
 *   QPE_SYNC.startAuto()   — poll every 20s for remote changes
 *   QPE_SYNC.stopAuto()
 *   QPE_SYNC.getConfig()   / setConfig(cfg)
 *   QPE_SYNC.getPAT()      / setPAT(pat)
 *   QPE_SYNC.getStatus()   — { state, lastSync, lastSha, error }
 *   QPE_SYNC.subscribe(fn) — notified on status change
 */
(function (global) {
  'use strict';

  const SYNC = {};
  const PAT_KEY = 'qpc_github_pat';
  const POLL_INTERVAL_MS = 20_000;

  // ─── Config (per-state) ────────────────────────────────
  function getConfig() {
    return (QPE_APP.state.settings && QPE_APP.state.settings.cloudSync) || {};
  }

  function setConfig(partial) {
    QPE_APP.state.settings = QPE_APP.state.settings || {};
    QPE_APP.state.settings.cloudSync = Object.assign({}, getConfig(), partial);
    QPE_APP.save();
  }

  // ─── PAT (per-browser, never exported) ─────────────────
  function getPAT() {
    try { return localStorage.getItem(PAT_KEY) || ''; } catch (_) { return ''; }
  }
  function setPAT(token) {
    try {
      if (token) localStorage.setItem(PAT_KEY, token);
      else localStorage.removeItem(PAT_KEY);
    } catch (_) {}
  }

  // ─── Status ────────────────────────────────────────────
  const status = {
    state: 'idle',     // idle | pulling | pushing | error | conflict
    lastSync: null,
    lastSha: null,
    error: null
  };
  const subscribers = [];
  function notifyStatus() {
    for (const fn of subscribers) { try { fn(status); } catch (e) {} }
  }
  function subscribe(fn) {
    if (typeof fn === 'function') subscribers.push(fn);
  }

  // ─── UTF-8 safe Base64 ─────────────────────────────────
  function utf8ToB64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  }

  // ─── GitHub Contents API ───────────────────────────────
  function apiUrl(cfg, includeRef) {
    const path = encodeURIComponent(cfg.path).replace(/%2F/g, '/');
    const base = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    return includeRef ? base + `?ref=${encodeURIComponent(cfg.branch || 'main')}` : base;
  }

  async function ghGet(cfg) {
    const headers = { Accept: 'application/vnd.github+json' };
    const pat = getPAT();
    if (pat) headers.Authorization = `token ${pat}`;
    const res = await fetch(apiUrl(cfg, true), { headers });
    if (res.status === 404) return null;
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error('GET ' + res.status + ': ' + (j.message || res.statusText));
    }
    return await res.json();
  }

  async function ghPut(cfg, contentB64, message, sha) {
    const pat = getPAT();
    if (!pat) throw new Error('Cần Personal Access Token để push');
    const body = {
      message,
      content: contentB64,
      branch: cfg.branch || 'main'
    };
    if (sha) body.sha = sha;
    const res = await fetch(apiUrl(cfg, false), {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        Authorization: `token ${pat}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error('PUT ' + res.status + ': ' + (j.message || res.statusText));
    }
    return await res.json();
  }

  // ─── High-level ops ────────────────────────────────────

  function validateConfig() {
    const cfg = getConfig();
    if (!cfg.owner || !cfg.repo) throw new Error('Chưa nhập owner/repo');
    if (!cfg.path) throw new Error('Chưa nhập path file');
    return cfg;
  }

  /** Pull data.json from repo, replace local state. */
  async function pull() {
    status.state = 'pulling'; status.error = null; notifyStatus();
    try {
      const cfg = validateConfig();
      const file = await ghGet(cfg);
      if (!file) {
        status.state = 'idle';
        status.lastSync = new Date().toISOString();
        notifyStatus();
        return { empty: true };
      }
      const json = b64ToUtf8(file.content || '');
      QPE_APP.import(json);
      status.lastSha = file.sha;
      status.lastSync = new Date().toISOString();
      status.state = 'idle';
      notifyStatus();
      return { ok: true, sha: file.sha };
    } catch (err) {
      status.state = 'error';
      status.error = err.message || String(err);
      notifyStatus();
      throw err;
    }
  }

  /** Push current state to repo. Handles conflict by asking user. */
  async function push(opts) {
    opts = opts || {};
    status.state = 'pushing'; status.error = null; notifyStatus();
    try {
      const cfg = validateConfig();
      if (!getPAT()) throw new Error('Cần Personal Access Token để push');

      // Get current remote sha
      const remote = await ghGet(cfg);
      const remoteSha = remote ? remote.sha : null;

      // Conflict: someone else pushed after our last pull
      if (!opts.force && remoteSha && status.lastSha && remoteSha !== status.lastSha) {
        status.state = 'conflict'; notifyStatus();
        if (typeof QPE_UI !== 'undefined' && QPE_UI.modal) {
          const ok = await QPE_UI.modal.confirm(
            'Có thay đổi mới từ máy khác trên cloud. Push tiếp sẽ ghi đè data đó.\n\nKhuyến nghị: Pull trước, kiểm tra, rồi Push lại.',
            { title: '⚠️ Conflict', danger: true, okText: 'Ghi đè (Force push)' }
          );
          if (!ok) {
            status.state = 'idle'; notifyStatus();
            return { cancelled: true };
          }
        }
      }

      const json = QPE_APP.export();
      const content = utf8ToB64(json);
      const device = (cfg.deviceLabel || 'unnamed').replace(/[^a-z0-9\-_]/gi, '_');
      const message = `[${device}] sync @ ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
      const res = await ghPut(cfg, content, message, remoteSha);

      status.lastSha = res.content && res.content.sha;
      status.lastSync = new Date().toISOString();
      status.state = 'idle';
      notifyStatus();
      return { ok: true, sha: status.lastSha };
    } catch (err) {
      status.state = 'error';
      status.error = err.message || String(err);
      notifyStatus();
      throw err;
    }
  }

  // ─── Auto-sync (polling) ───────────────────────────────
  let pollTimer = null;

  async function checkRemote() {
    try {
      const cfg = getConfig();
      if (!cfg.owner || !cfg.repo) return;
      const file = await ghGet(cfg);
      if (!file) return;
      // Remote changed since last seen → pull
      if (file.sha !== status.lastSha) {
        await pull();
      }
    } catch (err) {
      console.warn('[sync] poll error:', err.message);
    }
  }

  function startAuto() {
    stopAuto();
    pollTimer = setInterval(checkRemote, POLL_INTERVAL_MS);
  }

  function stopAuto() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  // Auto-push hook: after each QPE_APP.save(), schedule a push (debounced)
  let pushTimer = null;
  function autoPushDebounced() {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const cfg = getConfig();
      if (!cfg.enabled || !cfg.autoSync) return;
      if (!getPAT()) return;
      try { await push(); }
      catch (err) { console.warn('[sync] auto-push failed:', err.message); }
    }, 2000);  // 2s debounce so rapid edits batch
  }

  function init() {
    const cfg = getConfig();
    if (!cfg.enabled) return;

    // Pull on app boot
    if (cfg.owner && cfg.repo && cfg.path) {
      pull().catch(err => console.warn('[sync] initial pull failed:', err.message));
    }

    if (cfg.autoSync) {
      startAuto();
      // Hook into state save to auto-push
      QPE_APP.subscribe(autoPushDebounced);
    }
  }

  // ─── Export ────────────────────────────────────────────
  SYNC.getConfig  = getConfig;
  SYNC.setConfig  = setConfig;
  SYNC.getPAT     = getPAT;
  SYNC.setPAT     = setPAT;
  SYNC.pull       = pull;
  SYNC.push       = push;
  SYNC.startAuto  = startAuto;
  SYNC.stopAuto   = stopAuto;
  SYNC.getStatus  = () => Object.assign({}, status);
  SYNC.subscribe  = subscribe;
  SYNC.init       = init;

  global.QPE_SYNC = SYNC;
})(typeof window !== 'undefined' ? window : globalThis);
