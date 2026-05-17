# QPC POY — TDD Checklist

**Liên quan:** [SPEC.md](SPEC.md), [PLAN.md](PLAN.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

Mỗi cycle: 🔴 viết test → 🟢 viết code → ♻️ refactor → ✅ tick.

---

## Phase 0 — Repo Skeleton

- [ ] Tạo `engine.js` (empty với `window.QPE = {}`)
- [ ] Tạo `tests.js` (empty với `window.QPE_TEST = {}`)
- [ ] Tạo `tests.html` shell với test runner UI (dark theme đen-vàng)
- [ ] Implement `QPE_TEST.suite/test/assertEqual/assertClose/runAll`
- [ ] Render UI: pass = ✓ gold, fail = ✗ red, count "N/M passed"
- [ ] Dummy test `1+1===2` → mở `tests.html` thấy "1/1 ✓"
- [ ] Tạo `index.html` empty với QPC brand header

## Phase 1 — Scoring Engine (TDD CORE)

### Cycle 1.1 — `scoring.posLog(rank, itm)`
- [ ] 🔴 Test: `posLog(1, 50) === 1.0`
- [ ] 🔴 Test: `posLog(50, 50) ≈ 0.176 (±0.005)`
- [ ] 🔴 Test: `posLog(51, 50) === 0`
- [ ] 🔴 Test: `posLog(2, 50) ≈ 0.829 (±0.005)`
- [ ] 🔴 Test: `posLog(1, 1) === 1.0`
- [ ] 🔴 Test: `posLog(0, 50) === 0` (defensive)
- [ ] 🔴 Test: `posLog(-1, 50) === 0`
- [ ] 🔴 Test: `posLog(5, 0) === 0`
- [ ] 🟢 Implement
- [ ] ♻️ Refactor + verify

### Cycle 1.2 — `scoring.calcPoints(event, result, settings)`
- [ ] 🔴 Test: Main Event PP=25B, tier=champ, rank=1, itm=50 → ~15,811
- [ ] 🔴 Test: Main Event PP=25B, rank=50, itm=50 → ~2,783
- [ ] 🔴 Test: SHR PP=2B, tier=HR, rank=1, itm=10 → ~4,472
- [ ] 🔴 Test: Hyper Turbo HR PP=300M, tier=mid_stakes, rank=1, itm=8 → ~1,039
- [ ] 🔴 Test: Megastack PP=150M, tier=side, rank=1, itm=14 → ~367
- [ ] 🔴 Test: event.status="cancelled" → 0
- [ ] 🔴 Test: event.is_satellite=true → 0
- [ ] 🔴 Test: rank > itm → 0
- [ ] 🔴 Test: PP=0 → 0
- [ ] 🔴 Test: TierMult áp dụng đúng (champion vs mid_stakes vs side cùng PP → ratio 1.0:0.6:0.3)
- [ ] 🟢 Implement
- [ ] ♻️ Refactor

### Cycle 1.3 — `scoring.tierMult(tier, settings)`
- [ ] 🔴 Test: `tierMult("championship") === 1.0`
- [ ] 🔴 Test: `tierMult("high_roller") === 1.0`
- [ ] 🔴 Test: `tierMult("mid_stakes") === 0.6`
- [ ] 🔴 Test: `tierMult("side") === 0.3`
- [ ] 🔴 Test: `tierMult("unknown") === 0` defensive
- [ ] 🔴 Test: admin override settings.tierMult.side=0.4 → returns 0.4
- [ ] 🟢 Implement lookup
- [ ] ♻️ Refactor

> v1.4: bỏ Cycle bestN. Anti-farm thuần Tier Multiplier.

### Cycle 1.4 — `leaderboard.tieBreak(a, b)`
- [ ] 🔴 Test: a.final > b.final → a wins
- [ ] 🔴 Test: equal final, a more cashes → a wins
- [ ] 🔴 Test: equal final+cashes, a better best_rank → a wins
- [ ] 🔴 Test: equal all but a higher prize → a wins
- [ ] 🔴 Test: truly equal → 0
- [ ] 🟢 Implement
- [ ] ♻️ Refactor

### Cycle 1.5 — `leaderboard.compute(state, scope)`
- [ ] 🔴 Test: empty state → []
- [ ] 🔴 Test: 1 event, 3 results → 3 entries sorted by final desc
- [ ] 🔴 Test: **Scenario A** (SPEC §2.6 v1.4) 5× Megastack win → final ≈ 1,835, eligible
- [ ] 🔴 Test: **Scenario B** 1× HR Grand Prix win → final ≈ 4,472, not eligible (<3 cash)
- [ ] 🔴 Test: **Scenario D** 3 Megastack + 1 Mini Main → final ≈ 3,929
- [ ] 🔴 Test: **Scenario E** ITM Main #20 + 2 Megastack win → final ≈ 6,234
- [ ] 🔴 Test: **Scenario F** 4× Hyper Turbo HR (no cap) → final ≈ 4,156
- [ ] 🔴 Test: **Scenario G** 6× Megastack extreme grinder → final ≈ 2,202 (< 1 HR win)
- [ ] 🔴 Test: **Scenario H** 2 HR Single Day + 3 Megastack → final ≈ 8,847 (cao nhất)
- [ ] 🔴 Test: player <3 cash on overall → eligible=false
- [ ] 🔴 Test: scope="high_roller" → chỉ events buyin ≥ 30M
- [ ] 🔴 Test: scope="womens" → chỉ events is_womens=true, min 2 cash
- [ ] 🔴 Test: cancelled event không vào tính
- [ ] 🔴 Test: tie-breaker được apply đúng thứ tự
- [ ] 🔴 Test: best result per player per event (re-entry case)
- [ ] 🔴 Test: by_tier breakdown trả về đúng phân bổ champ/HR/mid/side
- [ ] 🟢 Implement (calcPoints có tierMult sẵn → sum per player → eligibility → sort + tie-break)
- [ ] ♻️ Refactor

## Phase 2 — Parsing & Validation

### Cycle 2.1 — `parse.tsv(text)` / `parse.csv(text)`
- [ ] 🔴 Test: TSV 3-col → array of {rank, name, prize}
- [ ] 🔴 Test: CSV comma auto-detect
- [ ] 🔴 Test: CSV semicolon auto-detect
- [ ] 🔴 Test: empty lines skipped
- [ ] 🔴 Test: missing prize → null
- [ ] 🔴 Test: header row (non-numeric rank) skipped
- [ ] 🔴 Test: Vietnamese unicode "Nguyễn Văn A" preserved
- [ ] 🔴 Test: trailing whitespace trimmed
- [ ] 🟢 Implement
- [ ] ♻️ Refactor

### Cycle 2.2 — `parse.normalizeName(s)`
- [ ] 🔴 Test: "  Nguyễn  Văn A  " → "Nguyễn Văn A"
- [ ] 🔴 Test: NFC normalize composed/decomposed
- [ ] 🔴 Test: case-insensitive compare (lowercase form)
- [ ] 🟢 Implement
- [ ] ♻️ Refactor

### Cycle 2.3a — `event.computePP(event)` (overlay handling)
- [ ] 🔴 Test: overlay_covered=true, sum_buyins=20B, gtd=25B → PP=25B
- [ ] 🔴 Test: overlay_covered=true, sum_buyins=30B, gtd=25B → PP=30B (cao hơn GTD vẫn dùng)
- [ ] 🔴 Test: overlay_covered=false, sum_buyins=20B, gtd=25B → PP=20B
- [ ] 🔴 Test: prizepool_actual nhập manual → ưu tiên dùng số đó (override auto)
- [ ] 🟢 Implement

### Cycle 2.3 — `validate.event(e)` / `validate.result(r)`
- [ ] 🔴 Test: valid event → {ok:true}
- [ ] 🔴 Test: missing name → {ok:false, errors:[...]}
- [ ] 🔴 Test: PP < 0 → invalid
- [ ] 🔴 Test: rank > itm_cutoff → invalid
- [ ] 🔴 Test: rank duplicate trong list → invalid
- [ ] 🟢 Implement
- [ ] ♻️ Refactor

## Phase 3 — Seed data

- [ ] Tạo `seed.js` với `QPE_SEED.qpc2026 = [...]`
- [ ] 🔴 Test: `seed.qpc2026.length >= 30`
- [ ] 🔴 Test: Main Event tồn tại với tier=championship, is_multi_flight=true
- [ ] 🔴 Test: 3 events có is_womens=true, **tier=side**
- [ ] 🔴 Test: SHR Prestige tồn tại, tier=high_roller, buyin_listed=100M
- [ ] 🔴 Test: Daily Megastack tồn tại 6 lần với tier=side
- [ ] 🔴 Test: Hyper Turbo HR có tier=mid_stakes
- [ ] 🔴 Test: không có satellite trong seed
- [ ] 🟢 Populate data từ schedule QPC 2026

## Phase 4 — Tab Events UI

- [ ] Load `engine.js` + `seed.js` vào `index.html`
- [ ] Header brand: "QUADS POKER CHAMPIONSHIP" gold full-caps
- [ ] Sub: "Player of the Year 2026"
- [ ] Tab nav: Events / Nhập kết quả / Leaderboards / Players / Settings / Backup
- [ ] Bảng events render từ state
- [ ] Cột: Code · Name · Tier badge · Date · Buyin · Status · PP · ITM · Actions
- [ ] Sort theo cột (default: date asc)
- [ ] Filter: status, tier, search name
- [ ] Action: ✏️ Sửa, 🗑️ Xoá (confirm), 📊 Nhập kết quả
- [ ] Modal Add/Edit event (form schema SPEC §6.1)
- [ ] Seed button "Load QPC 2026 schedule"
- [ ] Validation client-side hiển thị inline

## Phase 5 — Tab Nhập kết quả

- [ ] Dropdown chọn event (loại cancelled)
- [ ] Hiển thị info event read-only
- [ ] Form: PP_actual (VND format), entries_total, itm_cutoff
- [ ] Sub-tab: 📋 Paste / ⬆️ Upload / ✍️ Manual
- [ ] **Paste**: textarea, auto-detect delimiter, parse preview
- [ ] **Upload**: file input `.csv/.tsv/.txt` → feed parser
- [ ] **Manual**: form add row, datalist autocomplete tên
- [ ] **Preview table**: rank, player, prize, **points realtime**
- [ ] Validation banner (rank dup, > itm, etc.)
- [ ] Save → tạo Results + đổi status event → completed
- [ ] Toast "Đã lưu N kết quả cho {event}"

## Phase 6 — Tab Leaderboards

- [ ] Sub-tabs: 🏆 Overall · 🥇 High Roller · ♕ Women's
- [ ] Bảng: Rank · Player · Final Points · Cashes · Best Finish · Eligible
- [ ] Top 3 với medal 🥇🥈🥉 + row tint gold/silver/bronze
- [ ] Sort + tie-breaker theo SPEC §4.9
- [ ] Search by name, filter "only eligible"
- [ ] Click row → modal player detail:
  - [ ] Total + by_tier breakdown bar (4 thanh champ/HR/mid/side)
  - [ ] Tie-break data: cashes, best rank, total prize VND
  - [ ] Bảng all results: event, tier badge, rank, points, prize
- [ ] Export CSV cho từng leaderboard

## Phase 7 — Players, Settings, Backup

### Players
- [ ] Bảng aggregated: name, cashes, total points, total prize
- [ ] Rename player → propagate tất cả results
- [ ] Merge: chọn ≥2 → modal target → confirm
- [ ] 🔴 Test cycle merge: results trỏ đúng player target, aliases gộp

### Settings
- [ ] Input K (default 100)
- [ ] Tier Multiplier table (4 inputs):
  - [ ] championship: 1.00
  - [ ] high_roller: 1.00
  - [ ] mid_stakes: 0.60
  - [ ] side: 0.30
- [ ] Min cash thresholds (3 inputs):
  - [ ] Overall: 3
  - [ ] Women's: 2
  - [ ] HR sub-board: 3
- [ ] HR sub-board buyin threshold (default 30M VND)
- [ ] Save → re-compute leaderboards
- [ ] Reset data (gõ "RESET" để confirm)

### Backup
- [ ] Export JSON → download `qpc-poy-{ISO}.json`
- [ ] Import JSON → validate schema → confirm → replace
- [ ] Auto-save LocalStorage mỗi mutation
- [ ] Hiển thị "Đã lưu lúc HH:MM" trong header

## Phase 8 — Brand, Polish, Print

- [ ] Apply Design System tokens (đen #000 + vàng #D4AF37)
- [ ] Logo Q gold trong header
- [ ] Favicon `Q` data-URI gold-on-black
- [ ] Font: Inter system fallback, mono cho numbers
- [ ] Tabular-nums trên tất cả cột số
- [ ] Empty states cho mỗi tab (text + icon)
- [ ] Toast system (gold border-left, slide-in)
- [ ] Keyboard: Esc đóng modal, Ctrl+S export
- [ ] **Print stylesheet**: A4 portrait, white bg, gold accents giữ
- [ ] Print header: logo QPC + title + timestamp trên mỗi trang
- [ ] README comment đầu `index.html` (5 bước admin)

## QA Final (manual)

- [ ] Open `tests.html`: ALL pass (xanh hết)
- [ ] Open `index.html`: seed → save event → leaderboard render đúng
- [ ] 6× Megastack cho 1 player → 6 cash hiển thị, final ≈ 2,202 (< 1 HR win)
- [ ] Side-only player (3 cash side) → final_total > 0, eligible, ranking thấp
- [ ] Player <3 cash → not eligible badge, vẫn hiện
- [ ] Run Scenario A-H (SPEC §2.6) → kết quả match
- [ ] Merge 2 players → results trỏ đúng, không mất
- [ ] Export → clear LocalStorage → Import → state identical
- [ ] Test 3 browsers: Chrome, Edge, Firefox
- [ ] Print preview overall leaderboard → A4 đẹp, có brand
- [ ] Empty state mỗi tab hiển thị đúng
- [ ] Console zero errors

---

## Pre-build (đã xong)

- [x] Đọc xlsx schedule QPC 2026
- [x] Research GPI / WSOP POY / OWGR / FedEx Cup
- [x] Phỏng vấn user 6+ lượt → chốt triết lý qua nhiều iteration
- [x] SPEC v1.4 (Tier Mult only, no cap best-N, 4 tier với mid_stakes)
- [x] PLAN với TDD cycles
- [x] TODO (file này)
- [x] DESIGN_SYSTEM đen-vàng (#000 + #D4AF37)

## Post-MVP

- [ ] Trial event #1 Kick Off 17/6
- [ ] Feedback admin
- [ ] v1.1 fixes
- [ ] (Optional) Chart, public share (cần backend)

---

## v2.0 — Annual POY (cross-series, build sau)

**Trigger**: khi planning concrete cho series #2 trong 2026.

### Cycle A.1 — `annual.masterPoints(rank)` — MP table lookup
- [ ] 🔴 Test: MP(1) === 1000
- [ ] 🔴 Test: MP(50) === 15 (đúng bảng)
- [ ] 🔴 Test: MP(51) === 0
- [ ] 🔴 Test: MP(0) === 0 defensive
- [ ] 🔴 Test: admin custom table via settings → lookup new table
- [ ] 🟢 Implement: array lookup

### Cycle A.2 — `annual.seriesMP(series, leaderboard)`
- [ ] 🔴 Test: player rank 1 trong flagship series → MP × 1.0 = 1000
- [ ] 🔴 Test: player rank 5 trong regional (×0.5) → 380 × 0.5 = 190
- [ ] 🔴 Test: player not eligible (<3 cash) → 0 MP
- [ ] 🔴 Test: player rank > 50 → 0 MP
- [ ] 🟢 Implement

### Cycle A.3 — `annual.compute(allSeries)`
- [ ] 🔴 Test: empty → []
- [ ] 🔴 Test: 1 series → equivalent to that series MP
- [ ] 🔴 Test: 5 series (1 flagship + 4 regional/mini) → đúng tổng
- [ ] 🔴 Test: player chơi 5 series, không eligible 2 → chỉ tính 3 eligible
- [ ] 🔴 Test: tie-breaker: series_played > best_series_rank > max_single_mp
- [ ] 🟢 Implement

### Annual UI
- [ ] Tab mới "🌟 Annual POY {year}"
- [ ] Series Manager: list series, tier dropdown, multiplier
- [ ] Annual leaderboard table
- [ ] Click player → modal MP breakdown by series
- [ ] Settings: MP table editor (50 hàng), Series multiplier per tier
- [ ] Data migration: v1.0 JSON → wrap 1 series flagship

### Annual QA
- [ ] Multi-series scenario test với data giả
- [ ] Export/import xuyên version (v1.0 ↔ v2.0)
- [ ] Performance check với 5 series × 500 players = 2500 entries
