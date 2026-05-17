# QPC POY — Implementation Plan (TDD)

**Liên quan:** [SPEC.md](SPEC.md), [TODO.md](TODO.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
**Mục tiêu:** Player of the Year system cho QPC 2026 — xây bằng **Test-Driven Development**, 3–5 phiên.

---

## 1. Kiến trúc tổng thể

### 1.1 Stack
- **Vanilla JS ES2020+**, zero deps, zero build.
- 2 file deliverable: `index.html` (app) + `tests.html` (test runner) — share chung 1 file `engine.js`.
- LocalStorage cho persistence, JSON export/import cho backup.
- Mở `file://` trên Chrome/Edge/Firefox.

### 1.2 Cấu trúc thư mục

```
C:\Claude\GPI\
├── docs\
│   ├── SPEC.md
│   ├── PLAN.md          ← bạn đang xem
│   ├── TODO.md
│   └── DESIGN_SYSTEM.md
├── engine.js            ← pure logic: scoring, leaderboard, validation
├── seed.js              ← QPC 2026 events seed data
├── tests.html           ← test runner UI (load engine.js)
├── tests.js             ← test cases
└── index.html           ← app (load engine.js + seed.js + UI code)
```

Production build (optional): concat tất cả vào 1 `index.html` cuối series.

### 1.3 Module trong `engine.js`

```js
window.QPE = {
  scoring: { posLog, calcPoints, tierMult },
  leaderboard: { compute, tieBreak },
  validate: { event, result, schema },
  parse: { tsv, csv, normalizeName },
  event: { computePP },                    // overlay logic
  utils: { uuid, vnd, sqrt, ... },
  CONST: {
    K: 100,
    TIER_MULT: { championship: 1.0, high_roller: 1.0, mid_stakes: 0.6, side: 0.3 },
    MIN_CASH: { overall: 3, womens: 2, high_roller: 3 },
    HR_BUYIN_THRESHOLD: 30_000_000        // VND
  }
}
```

`engine.js` **pure functions**, không touch DOM/LocalStorage — testable hoàn toàn.

---

## 2. TDD Methodology

### 2.1 Quy trình Red → Green → Refactor

Mọi function logic trong `engine.js` được phát triển theo chu trình:

1. **🔴 RED** — Viết test case trong `tests.js` trước, chạy `tests.html` → fail (function chưa tồn tại hoặc sai).
2. **🟢 GREEN** — Viết code tối thiểu trong `engine.js` để test pass.
3. **♻️ REFACTOR** — Cleanup code, test vẫn pass.
4. Commit (mental hoặc git): "test: …" → "feat: …".

### 2.2 Test runner architecture

`tests.html` là single-file runner, **không cần Jest/Mocha**:

```html
<script src="engine.js"></script>
<script src="tests.js"></script>
<script>QPE_TEST.runAll();</script>
```

API trong `tests.js`:

```js
QPE_TEST.suite("scoring.posLog", () => {
  QPE_TEST.test("rank 1 returns 1.0", () => {
    QPE_TEST.assertEqual(QPE.scoring.posLog(1, 50), 1.0);
  });
  QPE_TEST.test("rank > itm returns 0", () => {
    QPE_TEST.assertEqual(QPE.scoring.posLog(51, 50), 0);
  });
  QPE_TEST.test("min cash ITM=50 ≈ 0.176", () => {
    QPE_TEST.assertClose(QPE.scoring.posLog(50, 50), 0.176, 0.005);
  });
});
```

UI render:
```
✓ scoring.posLog (3/3)
  ✓ rank 1 returns 1.0
  ✓ rank > itm returns 0
  ✓ min cash ITM=50 ≈ 0.176

✗ scoring.tierMult (4/5)
  ✓ championship → 1.0
  ✓ high_roller → 1.0
  ✓ mid_stakes → 0.6
  ✓ side → 0.3
  ✗ unknown tier → defensive 0
      Expected: 0    Got: undefined
```

Mở `tests.html` thấy ngay green/red — chạy lại sau mỗi save.

### 2.3 Test categories

| Layer | File | Coverage |
|---|---|---|
| **Unit** — pure functions | `tests.js` (suite per module) | scoring, leaderboard math, parse TSV, validate, tie-breaker |
| **Integration** — full data flow | `tests.js` (suite "integration") | seed → add events → add results → compute 3 leaderboards → JSON roundtrip |
| **Manual QA** — UI/UX | TODO.md Phase 7 checklist | tabs, modal, paste, merge, export, print |

UI testing: manual. App nhỏ + zero-dep nên không setup Playwright.

### 2.4 Definition of "tested"

Mỗi function trong `engine.js` phải có ≥ 1 test cho:
- Happy path
- Edge case (zero, max, boundary)
- Invalid input (return safe default hoặc throw có kiểm soát)

Coverage mục tiêu: ≥ 90% statement trong `engine.js` (đo manual qua review test list).

---

## 3. Phases (TDD-driven)

Mỗi phase = **viết test trước → impl → refactor → check tất cả test trước đó vẫn xanh**.

### Phase 0 — Repo skeleton (30m)
- `engine.js`, `tests.html`, `tests.js`, `index.html` empty shells.
- Test runner UI working với 1 dummy test.
- Mở `tests.html` thấy "1/1 pass".

### Phase 1 — Scoring engine (TDD core, 3h)

**Cycle 1.1 — `scoring.posLog(rank, itm)`**
🔴 Tests:
- rank=1, itm=50 → 1.0
- rank=50, itm=50 → ~0.176
- rank=51, itm=50 → 0
- rank=2, itm=50 → ~0.829
- rank=1, itm=1 → 1.0
- rank=0 or negative → 0 (defensive)
- itm=0 → 0

🟢 Impl: `Math.log10(itm/rank + 1) / Math.log10(itm + 1)`, guarded.

**Cycle 1.2 — `scoring.calcPoints(event, result, settings)`**
🔴 Tests:
- Main Event PP=25B tier=champ, rank=1, itm=50 → ~15,811
- Main Event PP=25B, rank=50, itm=50 → ~2,783
- SHR PP=2B tier=HR, rank=1, itm=10 → ~4,472
- Hyper Turbo HR PP=300M tier=mid_stakes, rank=1 → ~1,039
- Daily Megastack PP=150M tier=side, rank=1, itm=14 → ~367
- Event cancelled → 0
- Satellite event → 0
- rank > itm → 0
- Same PP across 3 tiers (champ/mid/side) → ratio 1.0:0.6:0.3

🟢 Impl: `Math.round(K * Math.sqrt(PP_M) * posLog(rank, itm) * tierMult(tier))`.

**Cycle 1.3 — `scoring.tierMult(tier, settings)`**
🔴 Tests:
- `tierMult("championship") === 1.0`
- `tierMult("high_roller") === 1.0`
- `tierMult("mid_stakes") === 0.6`
- `tierMult("side") === 0.3`
- `tierMult("unknown") === 0` defensive
- Admin override via settings → returns custom multiplier

🟢 Impl: lookup, fall back to defaults.

> **v1.4 update:** đã **bỏ best-N per format**. Toàn bộ events đều tính. Anti-farm dựa thuần vào TierMult — đủ thấp để toán học triệt tiêu farm strategy.

**Cycle 1.4 — `leaderboard.tieBreak(a, b)`**
🔴 Tests:
- a.total > b.total → -1
- equal total, a more cashes → -1
- equal total + cashes, a better best_rank → -1
- equal all but prize → compare prize
- truly identical → 0

**Cycle 1.5 — `leaderboard.compute(state, scope)`**
🔴 Tests (integration, full Scenario suite SPEC §2.6):
- Empty state → []
- 1 event + 3 results → 3 players ranked
- Scenario A: 5× Megastack win → final ≈ 1,835, eligible
- Scenario B: 1× HR Grand Prix → final ≈ 4,472, not eligible (<3 cash)
- Scenario D: 3 Megastack + 1 Mini Main → final ≈ 3,929
- Scenario E: ITM Main #20 + 2 Megastack → final ≈ 5,772
- Scenario F: 4× Hyper Turbo HR (no cap) → final ≈ 4,156
- Scenario G: 6× Megastack grinder → final ≈ 2,202 (< 1 HR win)
- Scenario H: 2 HR Single Day + 3 Megastack → final ≈ 8,847 (top)
- Player <3 cash on overall → eligible=false
- Scope=high_roller → only events buyin ≥ 30M
- Scope=womens → only is_womens events, min 2 cash
- Cancelled event không vào tính
- by_tier breakdown chính xác (champ/HR/mid/side)

🟢 Impl: calcPoints (có tierMult sẵn) per result → group by player → sum + by_tier → eligibility filter → sort + tie-break.

### Phase 2 — Parsing & Validation (1h)

**Cycle 2.1 — `parse.tsv(text)` / `parse.csv(text)`**
🔴 Tests:
- Plain `1\tNguyễn A\t5000000` → [{rank:1, name:"Nguyễn A", prize:5000000}]
- Comma delimiter auto-detect
- Empty lines skipped
- Missing prize column → prize=null
- Vietnamese unicode preserved
- Header row detected & skipped if first row non-numeric rank

**Cycle 2.2 — `parse.normalizeName(s)`**
🔴 Tests:
- "  Nguyễn  Văn A  " → "Nguyễn Văn A"
- NFC normalization
- Returns canonical form for compare

**Cycle 2.3 — `validate.event(e)` / `validate.result(r)`**
🔴 Tests: missing field, wrong types, rank out of range, PP < 0.

### Phase 3 — Seed data (30m)
- `seed.js`: array ~35 events QPC 2026 từ schedule.
- Test: `seed.qpc2026.length > 30`, có Main Event, có 3 women events, có SHR Prestige.

### Phase 4 — Tab Events UI (2h)
Không TDD UI nhưng manual QA. Tab Events bind vào `engine` đã test.

### Phase 5 — Tab Nhập kết quả (3h)
Live preview dùng `engine.scoring.calcPoints` — test đã pass nên tin tưởng.

### Phase 6 — Tab Leaderboards (2h)
Render `engine.leaderboard.compute(state, scope)` × 3 scopes.

### Phase 7 — Players, Settings, Backup (2h)
Merge logic cần test (Cycle 7.1: merge 2 players → results trỏ đúng).

### Phase 8 — Polish, Brand, Print (2h)
Apply Design System đen-vàng, logo, favicon, print stylesheet.

**Total: ~16h, 3–5 phiên.**

---

## 4. Critical path

```
Phase 0 → Phase 1 (scoring TDD) ─── critical, blocks everything
                  │
                  └─→ Phase 2 (parsing) ─┐
                  └─→ Phase 3 (seed) ────┤
                                         ├─→ Phase 4–7 UI
                                         └─→ Phase 8 polish
```

Sai Phase 1 = sai toàn bộ leaderboard. **Không build UI cho đến khi tests Phase 1 đều xanh.**

---

## 5. Brand identity reminder

- **Tên đầy đủ**: Quads Poker Championship
- **Viết tắt**: QPC
- **Tagline (tạm)**: "Player of the Year 2026"
- **Màu chủ đạo**: Pure Black (#000) + Gold (#D4AF37) — xem [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- **Tone**: cao cấp, sang trọng, đọc nhanh, in giấy A4 vẫn đẹp.

Brand áp dụng nhất quán:
- Header app: "QUADS POKER CHAMPIONSHIP" full-caps, gold, letter-spacing.
- Sub: "Player of the Year 2026".
- Favicon: chữ Q gold trên nền đen.
- Print header: logo + title trên mỗi trang leaderboard.

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| TierMult quá thấp/cao gây ranking phi trực giác | High | Test scenarios A-H rõ ràng; visualize by_tier breakdown trong modal player; admin có thể tune trong Settings |
| Player nhập trùng tên do typo | Medium | Autocomplete + merge UI; test `normalizeName` kỹ |
| Paste TSV format khác nhau | Medium | Test parse với 5+ format samples |
| LocalStorage limit | Low | Series ~500 players × 70 events <500KB |
| Mất data do clear browser | High | Suggest Export sau mỗi event hoàn thành |
| Test pass nhưng UI sai | Medium | Manual QA checklist Phase 7 TODO |
| Brand không đúng kỳ vọng | Medium | Confirm design tokens với user trước Phase 8 |

---

## 7. Definition of Done (v1.0)

- [ ] **Tests**: 100% test cases xanh, ≥ 90% statement coverage `engine.js`
- [ ] **Functional**: tất cả 10 edge cases SPEC §8 đã handle
- [ ] **Leaderboards**: 3 boards (Overall + HR + Women's) render đúng
- [ ] **Roundtrip**: Export JSON → Import → state identical
- [ ] **Cross-browser**: Chrome + Edge + Firefox đều OK
- [ ] **Console**: zero errors trên cả tests.html và index.html
- [ ] **Print**: leaderboard A4 portrait đẹp, có brand
- [ ] **README**: comment đầu `index.html` hướng dẫn admin 5 bước
- [ ] **Brand**: pure black + gold, logo QPC, font đồng nhất

---

## 8. Sau MVP

- **Trial run**: nhập kết quả thật event #1 Kick Off ngày 17/6 → review điểm.
- **Adjust** K / TierMult / min cash threshold nếu kết quả phi trực giác (spec change → re-test).
- **v2.0 Annual POY**: build khi planning series #2 — xem §9.

---

## 9. v2.0 — Annual POY (cross-series)

Sau khi QPC 2026 chạy xong, build mở rộng cho Annual POY (SPEC §11):

### Scope
- Thêm concept **Series** (multi-series trong cùng năm)
- Master Points table (50 hàng tunable)
- Series Multiplier (×1.0 / ×0.7 / ×0.5 / ×0.3)
- Annual leaderboard cross-series + tab UI mới

### TDD cycles bổ sung
- **Cycle A.1**: `annual.masterPoints(rank)` — bảng MP lookup
- **Cycle A.2**: `annual.seriesMP(series, leaderboard)` — chuyển series rank → weighted MP
- **Cycle A.3**: `annual.compute(allSeries)` — aggregate cross-series + tie-breaker

### Data migration
- v1.0 state: `{events, results, players, settings}`
- v2.0 state: `{series: [{id, events, results, ...}], players, settings, mp_table}`
- Import v1.0 JSON: wrap thành 1 series duy nhất với tier flagship.

### Effort estimate
~6–8h sau khi v1.0 stable.

### Khi nào build
- Khi bạn có planning concrete cho series #2 + 4–6 series khác.
- Không build trước → KISS, tránh over-engineer.
