# Quads Poker Championship — Player of the Year System

**Phiên bản:** 1.4 (final, ready to build TDD)
**Ngày:** 2026-05-17
**Series:** Quads Poker Championship (QPC) 2026, 17/6–29/6/2026, GTD 80B
**Brand:** Quads Poker Championship — black & gold
**Format output:** Single-file HTML web app, lưu LocalStorage + Export/Import JSON
**Methodology:** Test-Driven Development (TDD) — xem [PLAN.md](PLAN.md#2-tdd-methodology)

---

## 0. Mục đích — 2 cấp Player of the Year

Hệ thống vận hành **2 cấp leaderboard**:

### Cấp 1 — Series POY (per-series)
Tính điểm tích luỹ xuyên suốt 1 series (vd QPC 2026, 13 ngày). Vinh danh:
- **🏆 QPC Player of the Year** — top 1 overall.
- **🥇 HR Player of the Series** — top HR sub-board.
- **♕ Women's Player of the Series** — top Women's sub-board.
- Live leaderboard suốt giải.

### Cấp 2 — Annual POY (cross-series, cuối năm)
Quy ra **Master Points** từ kết quả từng series, nhân **Series Multiplier** theo prestige series, tổng dồn cuối năm để xác định:
- **🌟 QPC Annual Player of the Year** — vô địch năm trên toàn hệ thống series.
- Top X được công bố/thưởng riêng theo kế hoạch organizer.

Cấp 2 build sau khi cấp 1 chạy ổn → xem §11 và [PLAN.md](PLAN.md) v2.0 roadmap.

---

## 1. Mục tiêu & Triết lý

Xây dựng POY ranking xuyên suốt series, **công bằng giữa các tier buyin** (từ daily side ~2–3M VND → Super High Roller 100M VND), thưởng **skill thực sự** thay vì chỉ thưởng người có nhiều tiền.

### Nguyên tắc cốt lõi
1. **Skill-based** — beat nhiều người (field size lớn) trong giải có barrier cao = điểm cao.
2. **Sublinear theo prizepool** — dùng `√(PP)` để HR không áp đảo tour nhỏ-đông.
3. **Top-heavy nhưng ITM cuối vẫn có điểm** — Pos curve dạng logarit.
4. **Anti-farm 2 lớp** (đơn giản hoá v1.4):
   - Lớp 1 (entry-level): re-entry chỉ tính best result per player per event.
   - Lớp 2 (event-level): **Tier Multiplier** — side ×0.30, mid_stakes ×0.60, champ/HR ×1.0. Hệ số đủ thấp để tự nhiên chống farm mà không cần cap cứng.

   > **v1.4 loại bỏ "best-N per format"**: mọi event player tham gia đều được tính. Khuyến khích chơi nhiều — side event giá trị thấp nên grind không thể đẩy điểm lên mức HR.
5. **Minh bạch** — công thức công khai, leaderboard breakdown được điểm từng event.
6. **Reward consistency** — min 3 events cash để eligible cho giải top leaderboard.

---

## 2. Công thức tính điểm

### 2.1 Công thức cốt lõi

```
P(player, event) = K × √(PP_M) × Pos(rank, ITM) × TierMult(event.tier)
```

| Ký hiệu | Ý nghĩa | Giá trị mặc định |
|---|---|---|
| `K` | Hằng số scale | `100` |
| `PP_M` | Prizepool thực tế của event, đơn vị **triệu VND** | nhập sau khi đóng reg |
| `rank` | Vị trí cuối của player (1 = vô địch) | — |
| `ITM` | Số suất vào tiền theo payout table thực tế | nhập từng event |
| `Pos()` | Hàm vị trí logarit (top-heavy) | xem 2.3 |
| `TierMult()` | Hệ số tier event | xem 2.4 |

**Điều kiện:**
- Nếu `rank > ITM` → `P = 0`.
- Nếu event không hợp lệ (huỷ, không đủ field) → toàn bộ event bị loại khỏi leaderboard.
- **Mọi event player tham gia đều được tính** — không có cap best-N. Tier Multiplier đảm bảo side event không thể vượt qua championship/HR.

### 2.2 Định nghĩa `PP_M` (quan trọng)

`PP_M = PP_actual / 1,000,000`

Với `PP_actual`:
- **Bao gồm**: tất cả entry phí sau khi trừ rake/fee, **tính cả re-entry**, cộng overlay (nếu PP < GTD → cộng phần thiếu).
- **Không bao gồm**: rake/fee đã thu, tiền bounty (series này không có bounty).
- **Multi-flight event**: tổng PP của tất cả flight + Day 2, gộp 1 con số.
- **Day 1/Day 2 event** (HR Ultra Stack, Quads Star, …): PP của event đó.
- **Freerake players**: phần freerake (5 player đầu reg-all) **không cộng** vào PP vì họ không đóng tiền — PP chỉ tính từ player đóng phí.

> **Lý do dùng PP thay vì `√B × √N`**: toán học tương đương (`√(B×N) = √B × √N`), nhưng PP chỉ cần nhập 1 con số duy nhất, dễ verify với thực tế.

### 2.3 Hàm vị trí `Pos(rank, ITM)` — Logarit

```
Pos(rank, ITM) = log₁₀(ITM/rank + 1) / log₁₀(ITM + 1)
```

**Tính chất:**
- `Pos(1, ITM) = 1.000` — vô địch nhận trọn vẹn.
- `Pos(ITM, ITM)` ≈ `0.16–0.22` tuỳ ITM — min cash vẫn được ~20%.
- `rank > ITM` → `0`.

**Bảng minh hoạ với ITM = 50** (đã verify số học):

| rank | Pos | % của max |
|---|---|---|
| 1 | 1.000 | 100% |
| 2 | 0.829 | 83% |
| 3 | 0.733 | 73% |
| 5 | 0.610 | 61% |
| 10 | 0.456 | 46% |
| 25 | 0.263 | 26% |
| 50 | 0.176 | 18% |
| 51+ | 0.000 | 0% |

### 2.4 Tier Multiplier (anti-farm lớp duy nhất)

Mỗi event có `tier` quyết định hệ số nhân. **4 tier**:

| Tier | Multiplier | Tiêu chí | Events điển hình |
|---|---|---|---|
| `championship` | **×1.00** | Marquee multi-flight / Final Day, danh hiệu series | Main Event, Mini Main, Micro Main, Quads Star, Quads Signature, Kick Off, Championship #50 |
| `high_roller` | **×1.00** | Buyin ≥ 30M VND, single high-stakes event | HR Ultra Stack 40M, HR Grand Prix 60M, HR Imperial 35M, HR Single Day 30M, SHR Prestige 100M, Mini HR |
| `mid_stakes` | **×0.60** | Buyin 5–15M VND, weekend/special concept, không phải daily grind | Hyper Turbo HR 11M, Super Deepstack 8-max 6M, Quads Kickstarter 8M, Quads Premium 6M, Quads Elite 5M, Quads Unity 6M |
| `side` | **×0.30** | Daily grindable, buyin thấp, hoặc niche event | Daily Megastack 3M, Evening Storm 2M, NLH Super Hyper Turbo 4M, **Women's Championship 4M** |

**Triết lý hệ số mới (v1.4):**
- Bỏ cap best-N → mọi event đều được tính → khuyến khích player chơi nhiều, mỗi effort được công nhận.
- Bù lại: hạ multiplier xuống `×0.30 / ×0.60` để **một mình side hoặc mid_stakes không bao giờ vượt qua được championship/HR**, dù player grind bao nhiêu.

**Toán học chống farm tự động:**

Với 1 Main Event win (PP 25B, ×1.0) = **15,811 pts**:
- Để bắt kịp, player cần grind Megastack (367 pts/win): **44 lần** — bất khả thi.
- Hoặc Hyper Turbo HR (1,039 pts/win): **16 lần** — series chỉ chạy ~6 lần, KHÔNG ĐỦ.
- Hoặc HR Single Day (3,873 pts/win): **5 lần** — series chỉ có 1-2 HR Single Day.

→ Tier Multiplier đủ thấp → farm là **vô vọng về mặt số học**, không cần cap.

### 2.5 Ví dụ điểm thực tế (v1.4 multipliers, PP từ GTD QPC 2026)

| Event | Tier | PP (M VND) | √PP_M | TierMult | **Pts vô địch** | **Pts min-cash** |
|---|---|---|---|---|---|---|
| Main Event (GTD 25B) | champ | 25,000 | 158.1 | 1.00 | **15,811** | **2,787** |
| Quads Signature (GTD 4B) | champ | 4,000 | 63.2 | 1.00 | **6,325** | ~1,140 |
| Quads Star Challenge (GTD 3B) | champ | 3,000 | 54.8 | 1.00 | **5,477** | ~990 |
| Mini Main (~800M) | champ | 800 | 28.3 | 1.00 | **2,828** | ~510 |
| SHR Prestige (GTD 2B) | HR | 2,000 | 44.7 | 1.00 | **4,472** | ~810 |
| HR Grand Prix (GTD 2B) | HR | 2,000 | 44.7 | 1.00 | **4,472** | ~810 |
| HR Single Day (GTD 1.5B) | HR | 1,500 | 38.7 | 1.00 | **3,873** | ~700 |
| HR Imperial (GTD 1.2B) | HR | 1,200 | 34.6 | 1.00 | **3,464** | ~625 |
| Quads Kickstarter (GTD 800M) | mid_stakes | 800 | 28.3 | 0.60 | **1,697** | ~305 |
| Quads Premium (GTD 600M) | mid_stakes | 600 | 24.5 | 0.60 | **1,470** | ~263 |
| Hyper Turbo HR (~300M) | mid_stakes | 300 | 17.3 | 0.60 | **1,039** | ~186 |
| Super Deepstack 8-max (~300M) | mid_stakes | 300 | 17.3 | 0.60 | **1,039** | ~186 |
| NLH Super Hyper Turbo (~200M) | side | 200 | 14.1 | 0.30 | **424** | ~75 |
| Daily Megastack (GTD 150M) | side | 150 | 12.2 | 0.30 | **367** | ~65 |
| Women's Championship (~135M) | side | 135 | 11.6 | 0.30 | **349** | ~90 |
| Evening Storm (~120M) | side | 120 | 11.0 | 0.30 | **329** | ~60 |

### 2.6 Scenario validation (v1.4, no cap)

Test case fairness — **mọi event đều tính, không cap best-N**:

| Player | Hành động | Detail | **Final pts** | Eligible? |
|---|---|---|---|---|
| A | Win 5× Daily Megastack | 5 × 367 | **1,835** | ✅ (5 cash) |
| B | Win 1× HR Grand Prix 66M | 4,472 | **4,472** | ❌ (<3 cash) |
| C | Win 1× Mini Main (PP 800M) | 2,828 | **2,828** | ❌ (<3 cash) |
| D | Win 3 Megastack + 1 Mini Main | 3×367 + 2,828 | **3,929** | ✅ (4 cash) |
| E | ITM Main #20 (5,038) + 2× Megastack win | 5,038 + 2×367 | **5,772** | ✅ (3 cash) |
| F | Win 4× Hyper Turbo HR | 4 × 1,039 | **4,156** | ✅ (4 cash) |
| G | Win 6× Megastack (extreme grinder) | 6 × 367 | **2,202** | ✅ (6 cash) |
| H | Win 2 HR Single Day + 3 Megastack | 2×3,873 + 3×367 | **8,847** | ✅ (5 cash) |

**Kết luận fairness:**
- H > E > B > F > D > C > G > A — đúng thứ tự "stake × volume × consistency".
- H (2 HR wins + 3 side): **cao nhất** — đa dạng, win cả HR lẫn cash side → POY xứng đáng.
- G (6 Megastack extreme grinder): 2,202 pts — không thể bắt kịp 1 HR win (4,472). **Farm vô vọng**.
- F (4 HT HR wins) > D (3 side + Mini Main) — mid_stakes vẫn quý hơn side.
- A (5 side wins) < C (1 Mini Main win) — championship > nhiều side grind.

**So sánh với v1.3 (best-3 cap):**
- v1.3 A = 1,470 → v1.4 A = 1,835 (chơi thêm 2 events được +365 pts, vừa phải)
- v1.3 F = 3,636 → v1.4 F = 4,156 (cộng thêm 1 win nữa được +520, hợp lý)
- v1.4 cleaner: không cần track format_group, không cần explain "tại sao 3 win bị drop".

---

## 3. Phạm vi & Phân loại Event

### 3.1 Event được tính điểm

| Loại | Tính điểm? |
|---|---|
| Tất cả Championship events (đánh số trong schedule) | ✅ |
| Daily side events (Megastack, Super Hyper Turbo, Evening Storm) | ✅ (×0.3, tính tất cả) |
| Mid_stakes events (Hyper Turbo HR, Super Deepstack, Quads Kickstarter/Premium/Elite/Unity) | ✅ (×0.6, tính tất cả) |
| **Satellite** | ❌ Không có PP độc lập |
| Event huỷ / không đủ field hợp lệ | ❌ Status = `cancelled` |

### 3.2 Phân loại Tier

Mỗi event có 1 trong **4 tier** (chi tiết §2.4):

| Tier | TierMult | Vào HR sub-board? |
|---|---|---|
| `championship` | ×1.00 | Nếu buyin ≥ 30M |
| `high_roller` | ×1.00 | ✅ Luôn vào |
| `mid_stakes` | ×0.60 | ❌ Không |
| `side` | ×0.30 | ❌ Không |

### 3.3 Recurring events (informational only)

v1.4 **không có** rule best-N per format → recurring events được tính độc lập 100%. Mỗi instance của Daily Megastack là 1 event riêng, có PP riêng, ITM riêng.

Một số format chạy nhiều lần để info display:

| Format | Tier | Số lần ước tính |
|---|---|---|
| Daily Megastack | side | 6 |
| Evening Storm 8-max | side | 5-7 |
| NLH Super Hyper Turbo | side | 10+ |
| Women's Championship | side (+ `is_womens=true`) | 3 (#3, #9, #25) |
| Hyper Turbo HR | mid_stakes | 6 |
| Quads Kickstarter/Premium/Elite/Unity | mid_stakes | mỗi cái 1 lần (khác buyin) |
| Super Deepstack 8-max | mid_stakes | 1-2 |

Tier được set sẵn khi seed events, admin sửa được trong UI.

---

## 4. Quy tắc đặc biệt

### 4.1 Multi-flight events
- Main Event 1A/1B/1C/1D + Day 2 → **1 event duy nhất**.
- `PP_actual` = tổng PP toàn bộ flight (sau rake).
- `rank` lấy từ Day 2/final.
- ITM cutoff: theo payout chung sau Day 2.

### 4.2 Day 1 / Day 2 events (HR Ultra Stack, Quads Star, SHR Prestige, HR Grand Prix, HR Imperial)
- 1 event, `rank` từ Final.
- PP = PP của event đó.

### 4.3 Re-entry / Multi-entry
- Player re-entry: **chỉ lấy best result** trong event đó.
- Nếu cả 2 entry đều ITM (rất hiếm), lấy entry có rank nhỏ hơn.

### 4.4 Day 1 bagged nhưng no-show Day 2
- Player được **fold blind** đến out → có `rank` thực tế.
- Nếu rank ≤ ITM → có điểm bình thường.
- Tournament Director nhập rank thực tế khi nhập kết quả.

### 4.5 Chop deal ở final table
- Dùng **rank chính thức theo Tournament Director ghi nhận** (thường là rank tại thời điểm chop, hoặc rank sau khi đánh nốt nếu vẫn tiếp tục).
- Không chia trung bình điểm dù chia tiền.

### 4.6 Overlay policy (PP < GTD)

Khi event không đạt GTD, có 2 trường hợp:

**Case A — Organizer cover overlay (default ON):**
- `overlay_covered = true`
- `prizepool_actual = max(gtd_vnd, sum_of_buyins_net)`
- Player không bị "trừng phạt" vì event ế. Skill barrier vẫn là GTD đã announce.

**Case B — Không cover, để PP tự nhiên:**
- `overlay_covered = false`
- `prizepool_actual = sum_of_buyins_net` (tổng buyin trừ rake)
- PP có thể nhỏ hơn GTD → ít điểm hơn.

UI Tab Nhập kết quả có checkbox **"Organizer đã cover overlay đạt GTD"** (default checked). Khi check, auto-fill `prizepool_actual = gtd_vnd`. Khi uncheck, admin nhập số thực tế.

### 4.7 Anti-farm: Tier Multiplier (lớp duy nhất)

**Tier Multiplier** áp dụng tự động trong `calcPoints(event, result)` (xem §2.4):
- champ/HR ×1.00
- mid_stakes ×0.60
- side ×0.30

**Mọi event player tham gia đều cộng vào `final_total`**, không có cap best-N.

Lý do đủ chống farm (xem §2.4):
- 1 Main Event win = 15,811 pts.
- Cần grind 44 Megastack wins (impossible — series chỉ có 6).
- Cần grind 16 Hyper Turbo HR wins (impossible — series chỉ có 6).
- Tier Multiplier đủ thấp để toán học tự nhiên triệt tiêu farm strategy.

### 4.8 Eligibility cho giải thưởng top leaderboard
- **Min cash threshold** admin-tunable trong Settings:
  - Default Overall: 3 cash
  - Default Women's: 2 cash
  - Default HR sub-board: 3 cash
- Player < threshold vẫn hiện trên leaderboard nhưng đánh dấu "not eligible".
- Áp dụng cho cả Overall và sub-board (mỗi board có threshold riêng).
- **Gợi ý scale** cho series khác nhau: `max(2, round(events_total × 0.05))` — admin có thể set theo.

### 4.9 Tie-breaker (xếp hạng khi cùng total points)
1. Số event cashed nhiều hơn → cao hơn
2. Best finish (rank thấp nhất ở 1 event) → cao hơn
3. Tổng tiền thắng (VND) → cao hơn
4. Cùng tất cả → đồng hạng

---

## 5. Sub-leaderboards

Tool hiển thị **3 leaderboard** song song:

### 5.1 Overall Leaderboard
- Tất cả events (trừ satellite, cancelled).
- Áp dụng Tier Mult auto trong calcPoints (§4.7).
- Min cash để eligible (§4.8, admin tunable, default 3).

### 5.2 High Roller Leaderboard
- Chỉ tính events có **`buyin_listed ≥ 30M VND`** (tier `high_roller` hoặc championship đạt mức buyin).
- KHÔNG có side events trong sub-board này.
- Min 3 cash trong scope HR.

### 5.3 Women's Championship Leaderboard
- Chỉ tính events có flag `is_womens = true` (Women Championship #3, #9, #25).
- Lưu ý: từ v1.4, Women's Championship events là **tier `side` ×0.30** (theo quyết định organizer). `is_womens` flag là độc lập với tier — dùng riêng cho sub-board này.
- Min 2 cash (vì chỉ có 3 women events).
- TierMult chung ×0.30 nên điểm tuyệt đối thấp, nhưng **ranking nội bộ trong sub-board vẫn chính xác** vì mọi event cùng hệ số.

---

## 6. Data Model

### 6.1 Event

```json
{
  "id": "ME",
  "code": "#18",
  "name": "Main Event",
  "tier": "championship",            // championship | high_roller | mid_stakes | side
  "is_womens": false,
  "is_multi_flight": true,
  "date_start": "2026-06-20",
  "date_end": "2026-06-24",
  "buyin_listed": 25000000,          // VND (cho tính HR sub-board)
  "is_satellite": false,
  "status": "scheduled",             // scheduled | running | completed | cancelled
  "gtd_vnd": 25000000000,            // GTD ban đầu, để biết overlay
  "prizepool_actual": 25000000000,   // VND thực tế (có overlay nếu organizer cover, xem §4.9)
  "overlay_covered": true,           // true nếu organizer bù để đạt GTD; default true
  "entries_total": 1000,             // tổng entries (incl re-entry)
  "unique_players": 800,             // số con người, optional
  "itm_cutoff": 50                   // số suất ITM
}
```

### 6.2 Result

```json
{
  "event_id": "ME",
  "player_id": "p_001",             // sinh tự động, link với Player.id
  "player_name": "Nguyễn Văn A",
  "rank": 7,
  "prize_vnd": 350000000,           // optional, để hiển thị
  "entry_count": 2,                 // optional, info debug re-entry
  "points": 5820                    // calculated, cached
}
```

### 6.3 Player

```json
{
  "id": "p_001",
  "name": "Nguyễn Văn A",
  "aliases": ["Van A Nguyen", "A Nguyễn"],   // do merge
  "notes": ""
}
```

### 6.4 Leaderboard entry (computed)

```json
{
  "player_id": "p_001",
  "player_name": "Nguyễn Văn A",
  "final_total": 18450,           // sum của tất cả events × TierMult
  "by_tier": {
    "championship": 12500,
    "high_roller":  3500,
    "mid_stakes":   1850,
    "side":          600
  },
  "events_cashed": 7,
  "is_eligible": true,
  "best_finish": { "event": "Main Event", "rank": 7, "points": 5820 },
  "tie_break_data": {
    "total_prize_vnd": 580000000,
    "best_rank": 7
  },
  "results": [ ... ]
}
```

### 6.5 Player identity & Merge

- Khoá định danh: `Player.id` (UUID nội bộ).
- Khi nhập kết quả: match theo `name` chuẩn hoá (trim, NFC unicode, gộp whitespace). Nếu match → dùng player cũ; nếu không → tạo player mới.
- UI có chức năng **Merge players**: chọn 2+ players → gộp về 1, tên còn lại vào `aliases`.
- Khi merge: tất cả Results trỏ player_id → player target.

---

## 7. Web App — Functional Spec

### 7.1 Tech
- **Single-file HTML** (`index.html`), embed CSS + JS, **zero dependencies**.
- Không cần server, mở bằng browser là chạy.
- Lưu LocalStorage (key: `quads_qpc_2026`), backup qua Export/Import JSON.
- UI tiếng Việt, font Inter hoặc system default.
- Responsive: desktop là chính, tablet OK.

### 7.2 Tabs

#### Tab 1 — **Events**
- Bảng tất cả events (pre-seed từ schedule).
- Cột: Code, Name, Tier, Date, Buyin, Status, PP actual, ITM, Cashed?, Actions.
- Filter: status, tier, multi-flight.
- Action: Edit, Delete (confirm), "📊 Nhập kết quả".
- Nút **+ Add event** thủ công.
- **Seed button**: "Load schedule from QPC 2026" (load embedded data).

#### Tab 2 — **Nhập kết quả**
- Chọn event từ dropdown.
- Nhập 3 field bắt buộc: `prizepool_actual`, `entries_total`, `itm_cutoff`.
- 3 cách nhập danh sách ITM (cả 3 đều available):
  1. **Paste TSV/CSV** (textarea): format `rank<TAB>name<TAB>prize` (prize optional). Auto-detect delimiter.
  2. **Upload `.csv/.tsv`**: drop file hoặc click.
  3. **Form nhập tay**: thêm từng row, dropdown autocomplete tên player đã có.
- **Preview table** trước khi save: hiển thị điểm tính được realtime.
- **Validation**:
  - rank duplicate
  - rank > itm_cutoff
  - rank không liên tục (warn, không block)
  - tên trùng player đã có (gợi ý merge)
- Status event tự chuyển: `scheduled` → `completed` sau khi save.

#### Tab 3 — **Leaderboards**
- 3 sub-tab: Overall | High Roller | Women's
- Bảng: Rank, Player, Final Total, Events Cashed, Best Finish, Eligible?
- Sort theo final_total desc + tie-breaker.
- Top 3 highlight medal 🥇🥈🥉.
- Click player → modal:
  - Bảng tất cả events đã cash, kèm điểm, rank, tier.
  - Visualize **by_tier breakdown** (4 thanh: champ / HR / mid_stakes / side).
  - Tie-break data hiển thị dưới (cashes, best rank, total prize).
- Filter: search by name, show only eligible.
- **Export CSV** cho từng leaderboard.

#### Tab 4 — **Players**
- Danh sách tất cả player + tổng cash + tổng điểm.
- Function: **Merge players** (chọn ≥2, click merge).
- Edit tên player (apply mọi nơi).

#### Tab 5 — **Settings**
- Tuning hằng số `K` (mặc định 100, không nên đổi giữa series).
- **Tier Multiplier table** (editable):
  - championship: 1.00
  - high_roller: 1.00
  - mid_stakes: 0.60
  - side: 0.30
- **Min cash eligibility** (per board):
  - Overall: 3 (default)
  - Women's: 2
  - HR sub-board: 3
- HR sub-board buyin threshold: mặc định 30M VND.
- Reset all data (gõ "RESET" để confirm).

#### Tab 6 — **Backup**
- Export JSON: file `quads-YYYYMMDD-HHmm.json`.
- Import JSON: drop file → replace state (confirm).
- Auto-save mỗi thay đổi vào LocalStorage.

### 7.3 Pre-seed data

Khi mở app lần đầu (hoặc click "Seed schedule"), load list events từ schedule QPC 2026 đã có sẵn (embedded trong JS):

Championship & HR (~22 events):
- #1 Kick Off, #2 HR Ultra Stack, #8 Quads Star, #13 Quads Signature, #14 SHR Prestige, #18 Main Event, #24 HR Grand Prix, #36 HR Imperial, #40 Mini Main, #49 Micro Main, #50 Championship, #65 Mini HR
- #-numbered HR Single Day, Hyper Turbo HR (recurring)

Mid_stakes events:
- Hyper Turbo HR (~6 lần)
- Super Deepstack 8-max
- Quads Kickstarter/Premium/Elite/Unity (4 events khác buyin)

Side events (recurring):
- Daily Megastack (~6 ngày)
- NLH Super Hyper Turbo
- Evening Storm
- **Women's Championship #3, #9, #25** (tier=side, `is_womens=true`)

Mỗi event seed sẵn `tier`, `buyin_listed`, `is_womens`, `date_start`, `is_multi_flight`. PP/ITM/results để trống.

---

## 8. Edge cases — đã chốt

| # | Case | Xử lý |
|---|---|---|
| 1 | Event huỷ / không đủ field | `status = cancelled`, loại khỏi mọi leaderboard |
| 2 | Chop deal final table | Dùng rank chính thức (4.5) |
| 3 | Player trùng tên | UI merge thủ công (6.5) |
| 4 | Day1 bagged no-show Day2 | Tính rank thực tế sau fold blind (4.4) |
| 5 | Freerake player (5 đầu reg-all) | Vẫn được điểm nếu cash, không cộng PP |
| 6 | Bounty/Mystery bounty | Series này không có |
| 7 | Player < cash threshold | Hiện trên board, ghi chú not eligible. Threshold admin-tunable (default 3 overall, 2 womens, 3 HR) |
| 8 | Tie ở total points | Tie-breaker mục 4.8 |
| 9 | Overlay (PP < GTD) | Theo §4.6: nếu organizer cover (default true), PP = GTD; nếu không, PP = sum buyins |
| 10 | Side-only player | Có điểm (sau ×0.3, tính tất cả events), eligible nếu ≥3 cash |
| 11 | Grinder cố đào điểm | Toán học triệt tiêu — 6 Megastack wins = 2,202 < 1 HR win = 4,472. Không cần cap cứng |

---

## 9. Roadmap

### v1.0 (MVP — build ngay)
- Toàn bộ công thức mục 2 (Tier Mult only, no cap)
- 6 tabs mục 7.2
- Pre-seed events QPC 2026
- 3 series leaderboards (Overall + HR + Women's)
- Tie-breaker, eligibility 3 cash

### v1.1 (sau khi chạy thử 2–3 event đầu series)
- Fine-tune K, TierMult, min cash threshold nếu kết quả phi trực giác
- Bug fixes UX
- Tăng tốc paste TSV

### v2.0 — Annual POY (xem §11)
- Thêm concept **Series** (multiple series trong 1 năm)
- Master Points table
- Annual leaderboard cross-series
- Series Multiplier per prestige tier

### v2.1+ (nice-to-have)
- Chart leaderboard over time
- Public share read-only (cần backend)
- Export PDF poster top 10

---

## 10. Quyết định pending (không block build)

| # | Vấn đề | Default |
|---|---|---|
| 1 | Giải thưởng vật chất cho top X overall | Không thuộc tool, ops tự quyết |
| 2 | Players bị DQ giữa series | Manual: admin xoá Results của player đó |
| 3 | Tournament chia thêm bounty/leaderboard nội bộ | Không ảnh hưởng điểm QPC Points |
| 4 | Sửa kết quả sau khi đã save (correct typo) | Có, edit từ tab Events → Nhập kết quả lại |
| 5 | Multi-currency (nếu có player nước ngoài) | Không, chỉ VND |

---

## 11. Annual POY (cross-series, v2.0)

### 11.1 Tổng quan
Bạn tổ chức **1 flagship (QPC) + 4–6 series nhỏ** trong năm 2026. Cuối năm chọn ra **🌟 QPC Annual Player of the Year**.

Mô hình: **Master Points × Series Multiplier** (lai WSOP POY + OWGR).

### 11.2 Công thức Annual

```
AnnualMP(player) = Σ across all series:
    MP_TABLE[player.series_rank_overall] × SeriesMultiplier(series.tier)
```

Trong đó:
- `series_rank_overall` = rank của player trong **Overall leaderboard** của series đó (sau khi áp Tier Mult + tie-breaker).
- `MP_TABLE[rank]` = master points theo bảng cố định (xem 11.3).
- `SeriesMultiplier` = hệ số prestige của series (xem 11.4).

### 11.3 Master Points table (default, admin tunable)

Bảng giảm dần logarit, top 50 mỗi series có MP:

| Rank | MP | Rank | MP | Rank | MP |
|---|---|---|---|---|---|
| 1 | **1000** | 11 | 175 | 26 | 75 |
| 2 | 700 | 12 | 160 | 30 | 60 |
| 3 | 550 | 13 | 145 | 35 | 45 |
| 4 | 450 | 14 | 135 | 40 | 35 |
| 5 | 380 | 15 | 125 | 45 | 25 |
| 6 | 330 | 16 | 115 | 50 | 15 |
| 7 | 290 | 18 | 100 | 51+ | **0** |
| 8 | 250 | 20 | 90 |  |  |
| 9 | 220 | 22 | 85 |  |  |
| 10 | 195 | 25 | 80 |  |  |

Sinh từ formula: `MP[rank] = round(1000 × posLog(rank, 50))` rồi adjust manually cho smooth.

Chỉ player **eligible** trong series đó (theo cash threshold của series, default 3) mới được MP. Player không eligible → 0 MP từ series đó.

### 11.4 Series Multiplier (prestige tier)

| Series Tier | Multiplier | Tiêu chí gợi ý |
|---|---|---|
| **Flagship** | ×1.00 | QPC main event, GTD ≥ 50B, ≥ 50 events trong series |
| **Major** | ×0.70 | Series lớn, GTD 20–50B, 30–50 events |
| **Regional** | ×0.50 | Series tỉnh/vùng, GTD 5–20B, 15–30 events |
| **Mini** | ×0.30 | Series ngắn, GTD < 5B, ≤ 15 events |

Bạn tự assign khi tạo series. Admin có thể tune trong settings.

### 11.5 Ví dụ Annual

Giả định Player X năm 2026:
- QPC 2026 (Flagship ×1.0): rank 3 → 550 × 1.0 = **550 MP**
- Series #2 Da Nang (Regional ×0.5): rank 1 → 1000 × 0.5 = **500 MP**
- Series #3 Vung Tau (Regional ×0.5): rank 8 → 250 × 0.5 = **125 MP**
- Series #4 Mini Hai Phong (Mini ×0.3): rank 12 → 160 × 0.3 = **48 MP**
- Series #5 Saigon Open (Major ×0.7): rank 5 → 380 × 0.7 = **266 MP**

**Annual MP của X = 1,489 MP**.

Cuối năm: top 10 Annual MP nhận **🌟 QPC Annual POY 2026** + giải thưởng theo bảng của organizer.

### 11.6 Data model mở rộng

```json
Series {
  id: "qpc2026",
  name: "Quads Poker Championship 2026",
  tier: "flagship",            // flagship | major | regional | mini
  multiplier: 1.00,
  year: 2026,
  date_start: "2026-06-17",
  date_end: "2026-06-29",
  status: "scheduled",         // scheduled | running | completed
  events: [event_ids...]
}

AnnualPOY (computed) {
  year: 2026,
  entries: [
    {
      player_id,
      player_name,
      annual_mp: 1489,
      by_series: [
        { series_id, series_rank: 3, mp: 550, multiplier: 1.0, mp_weighted: 550 },
        ...
      ],
      eligible: true,           // có cash ≥ 1 series trong năm
      tie_break: { series_played: 5, best_series_rank: 1 }
    }
  ]
}
```

### 11.7 UI cho Annual POY (v2.0)

- **Tab mới**: "🌟 Annual POY 2026"
- **Series Manager**: list các series, mỗi cái có tier, multiplier, link đến leaderboard riêng
- **Annual table**: sort by annual_mp, click player → modal "MP breakdown by series"
- **Settings mở rộng**:
  - MP table editor (50 hàng tunable)
  - Series multiplier per tier
  - Year selector
- **Eligibility annual**: cần cash ít nhất 1 series trong năm (hoặc admin tự định)

### 11.8 Tie-breaker Annual

Khi 2 player cùng `annual_mp`:
1. Số series cash nhiều hơn → cao hơn
2. Best series rank thấp nhất → cao hơn
3. Tổng MP cao nhất từ 1 series → cao hơn
4. Đồng hạng

---

