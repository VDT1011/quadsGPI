# QPC POY — Design System (Black & Gold)

**Liên quan:** [SPEC.md](SPEC.md), [PLAN.md](PLAN.md), [TODO.md](TODO.md)
**Brand:** Quads Poker Championship — **Pure Black + Quads Gold**
**Mood:** Casino premium, championship trophy, sportsbook clarity.

---

## 1. Brand Identity

### 1.1 Tên & dùng
- **Full**: `QUADS POKER CHAMPIONSHIP` (uppercase, gold, letter-spacing)
- **Short**: `QPC`
- **Series tag**: `Player of the Year 2026`
- **App tag (header)**: `QUADS POKER CHAMPIONSHIP · POY 2026`

### 1.2 Logo (text-based, zero-asset)
Vì zero-dep, logo = CSS art:

```
┌─────┐
│  Q  │   ← chữ Q gold #D4AF37 trên nền đen, font Display 700
└─────┘
QUADS POKER CHAMPIONSHIP
Player of the Year 2026
```

Favicon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23000'/><text x='32' y='46' font-family='serif' font-size='44' font-weight='700' fill='%23D4AF37' text-anchor='middle'>Q</text></svg>`

### 1.3 Tone
- **Sang trọng**: không gradient màu mè, không neon, không animation thừa.
- **Tập trung**: typography rõ, hierarchy mạnh, số liệu phải đọc được trong 1 giây.
- **In giấy đẹp**: print stylesheet giữ chất lượng poster.

---

## 2. Color Tokens

### 2.1 Pure Black palette

```css
--bg-0:        #000000;   /* page bg — TRUE BLACK */
--bg-1:        #0A0A0A;   /* card bg */
--bg-2:        #141414;   /* elevated, table hover */
--bg-3:        #1C1C1C;   /* modal bg */
--bg-4:        #262626;   /* deepest elevation (dropdown) */

--border-1:    #1F1F1F;   /* subtle divider */
--border-2:    #2E2E2E;   /* strong divider */
--border-gold: #3D3220;   /* gold-tinted border (cards, focus) */
```

### 2.2 Gold (Quads brand)

```css
--gold:        #D4AF37;   /* PRIMARY — Quads Gold, classic metallic */
--gold-h:      #E5C158;   /* hover, brighter */
--gold-d:      #A88A2C;   /* pressed, darker */
--gold-soft:   #8A7224;   /* muted gold, secondary */
--gold-bg:     rgba(212, 175, 55, 0.08);   /* tint background */
--gold-bg-h:   rgba(212, 175, 55, 0.16);   /* tint hover */
--gold-glow:   rgba(212, 175, 55, 0.25);   /* champion glow */
```

### 2.3 Text on black

```css
--text-0:      #FFFFFF;   /* primary, max contrast */
--text-1:      #C8C8C8;   /* body text */
--text-2:      #888888;   /* secondary, captions */
--text-mute:   #4D4D4D;   /* disabled, placeholders */
--text-gold:   #D4AF37;   /* accent text */
```

### 2.4 Semantic (tuned for black bg)

```css
--success:     #2EA559;   /* ITM cash, completed */
--success-bg:  rgba(46, 165, 89, 0.12);
--warning:     #E0A23A;   /* not eligible, warning — slight gold tint */
--warning-bg:  rgba(224, 162, 58, 0.12);
--danger:      #E04B4B;   /* cancelled, delete */
--danger-bg:   rgba(224, 75, 75, 0.12);
--info:        #5AA0F2;   /* info banner */
--info-bg:     rgba(90, 160, 242, 0.12);
```

### 2.5 Tier badges

| Tier | Color | Hex | Tinh thần |
|---|---|---|---|
| Championship | Gold | `#D4AF37` | Crown jewel |
| High Roller | Pearl White | `#E8E8E8` | Premium silver |
| Side | Mute Grey | `#7A7A7A` | Supporting |
| Women's | Rose Gold | `#E8B4A8` | Elegant accent |

```css
--tier-champ:  #D4AF37;
--tier-hr:     #E8E8E8;
--tier-side:   #7A7A7A;
--tier-women:  #E8B4A8;
```

### 2.6 Rank highlights (leaderboard top 3)

```css
--rank-1-bg:   rgba(212, 175, 55, 0.10);   /* gold tint row */
--rank-1-bar:  #D4AF37;                     /* left border 3px */
--rank-2-bg:   rgba(220, 220, 220, 0.05);   /* silver tint */
--rank-2-bar:  #DCDCDC;
--rank-3-bg:   rgba(176, 122, 65, 0.08);    /* bronze tint */
--rank-3-bar:  #B07A41;
```

### 2.7 Print mode (`@media print`)

```css
@media print {
  --bg-0: #FFFFFF; --bg-1: #FFFFFF; --bg-2: #F8F8F8; --bg-3: #FFFFFF;
  --text-0: #000000; --text-1: #1A1A1A; --text-2: #555555;
  --border-1: #DDDDDD; --border-2: #999999;
  --gold: #B8941F;       /* deeper gold, in giấy đẹp */
  --gold-bg: rgba(184, 148, 31, 0.10);
}
```

---

## 3. Typography

### 3.1 Font stack

```css
--font-display: "Inter", "Segoe UI", system-ui, sans-serif;   /* H1, brand */
--font-sans:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
                system-ui, "Roboto", sans-serif;               /* body */
--font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular,
                Consolas, "Liberation Mono", monospace;        /* numbers */
--font-serif:   Georgia, "Times New Roman", serif;             /* logo Q only */
```

### 3.2 Type scale

| Token | Size | Line | Weight | Letter-sp | Dùng cho |
|---|---|---|---|---|---|
| `--fs-brand` | 18px | 22px | 800 | 0.18em | Header "QUADS POKER CHAMPIONSHIP" |
| `--fs-h1` | 32px | 40px | 700 | -0.01em | Tab title |
| `--fs-h2` | 22px | 30px | 700 | 0 | Section heading |
| `--fs-h3` | 18px | 26px | 600 | 0 | Card title |
| `--fs-body` | 14px | 22px | 400 | 0 | Body, table |
| `--fs-sm` | 13px | 20px | 400 | 0 | Secondary |
| `--fs-xs` | 11px | 16px | 600 | 0.05em | Badge, label (uppercase) |
| `--fs-num-hero` | 40px | 48px | 800 | -0.02em | Champion points display |
| `--fs-num-lg` | 24px | 30px | 700 | 0 | Total points trong leaderboard |
| `--fs-num` | 14px | 22px | 600 | 0 | Numbers trong bảng |

**Rules:**
- Numbers: `font-family: var(--font-mono); font-variant-numeric: tabular-nums;`
- Brand text: `text-transform: uppercase; letter-spacing: 0.18em; color: var(--gold);`
- Headings: `font-family: var(--font-display); color: var(--text-0);`

---

## 4. Spacing & Layout

```css
--sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
--sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

--rd-sm: 4px; --rd-md: 8px; --rd-lg: 12px; --rd-xl: 16px;

--sh-1: 0 1px 2px rgba(0,0,0,0.5);
--sh-2: 0 4px 12px rgba(0,0,0,0.6);
--sh-3: 0 12px 32px rgba(0,0,0,0.8);
--sh-gold: 0 0 24px rgba(212, 175, 55, 0.2);  /* champion glow */
```

Container max: `1280px`, padding-x: `24px`.

---

## 5. Components

### 5.1 Header (brand bar)

```
┌──────────────────────────────────────────────────────────────┐
│  [Q]  QUADS POKER CHAMPIONSHIP                  Đã lưu 14:32 │
│       Player of the Year 2026                   ⬇️ Export    │
├──────────────────────────────────────────────────────────────┤
│  Events | Nhập kết quả | Leaderboards | Players | Settings   │
└──────────────────────────────────────────────────────────────┘
```

- Sticky top, bg `#000`, border-bottom `1px var(--border-gold)`.
- Logo Q: 36×36, gold trên đen.
- Brand: gold uppercase, letter-spacing 0.18em.

### 5.2 Buttons

| Variant | Bg | Text | Border | Khi |
|---|---|---|---|---|
| **Primary** (gold) | `--gold` | `#000` | none | CTA chính, Save |
| **Secondary** | `transparent` | `--text-0` | `1px --border-2` | Action phụ |
| **Ghost** | `transparent` | `--text-1` | none | Cancel |
| **Danger** | `--danger` | `#fff` | none | Delete, Reset |
| **Gold outline** | `transparent` | `--gold` | `1px --gold` | Highlight CTA phụ |

Hover primary: `bg: --gold-h`, shadow `--sh-gold`.

```css
.btn { padding: 8px 18px; border-radius: var(--rd-md);
       font-weight: 600; font-size: 14px; cursor: pointer;
       transition: all 0.15s ease; }
.btn-primary { background: var(--gold); color: #000; }
.btn-primary:hover { background: var(--gold-h); box-shadow: var(--sh-gold); }
.btn-secondary { background: transparent; color: var(--text-0);
                 border: 1px solid var(--border-2); }
.btn-secondary:hover { border-color: var(--gold); color: var(--gold); }
```

### 5.3 Inputs

```css
input, select, textarea {
  background: var(--bg-2);
  border: 1px solid var(--border-2);
  color: var(--text-0);
  border-radius: var(--rd-md);
  padding: 10px 14px;
  font-size: 14px;
  font-family: var(--font-sans);
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus {
  border-color: var(--gold);
  outline: none;
  box-shadow: 0 0 0 3px var(--gold-bg);
}
input[type="number"], .num-input { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
input::placeholder { color: var(--text-mute); }
```

### 5.4 Tables (core UI)

```css
table { width: 100%; border-collapse: separate; border-spacing: 0;
        font-size: 14px; }
th {
  background: var(--bg-2);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-gold);
  text-align: left;
  user-select: none;
}
th.sortable { cursor: pointer; }
th.sortable:hover { color: var(--gold); }
td {
  padding: 14px;
  border-bottom: 1px solid var(--border-1);
  color: var(--text-1);
}
tr:hover td { background: var(--bg-2); }
td.num { text-align: right; font-family: var(--font-mono);
         font-variant-numeric: tabular-nums; color: var(--text-0); font-weight: 600; }

/* Top 3 in leaderboard */
tr.rank-1 td { background: var(--rank-1-bg); border-left: 3px solid var(--rank-1-bar); }
tr.rank-2 td { background: var(--rank-2-bg); border-left: 3px solid var(--rank-2-bar); }
tr.rank-3 td { background: var(--rank-3-bg); border-left: 3px solid var(--rank-3-bar); }
```

### 5.5 Badges

```css
.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--rd-sm);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.badge-champ  { background: var(--gold-bg); color: var(--gold); border: 1px solid var(--gold); }
.badge-hr     { background: rgba(232,232,232,0.10); color: var(--tier-hr); border: 1px solid var(--tier-hr); }
.badge-side   { background: rgba(122,122,122,0.10); color: var(--tier-side); border: 1px solid var(--tier-side); }
.badge-women  { background: rgba(232,180,168,0.10); color: var(--tier-women); border: 1px solid var(--tier-women); }
.badge-done   { background: var(--success-bg); color: var(--success); }
.badge-warn   { background: var(--warning-bg); color: var(--warning); }
.badge-danger { background: var(--danger-bg); color: var(--danger); }
```

### 5.6 Modal

```css
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  z-index: 100;
  animation: fade-in 0.15s ease;
}
.modal {
  max-width: 720px;
  margin: 64px auto;
  background: var(--bg-3);
  border: 1px solid var(--border-gold);
  border-top: 3px solid var(--gold);
  border-radius: var(--rd-xl);
  box-shadow: var(--sh-3), var(--sh-gold);
  padding: var(--sp-6);
}
.modal-title { font-size: var(--fs-h2); color: var(--text-0);
               border-bottom: 1px solid var(--border-2); padding-bottom: var(--sp-4); }
```

### 5.7 Toast

```css
.toast {
  position: fixed; right: var(--sp-5); bottom: var(--sp-5);
  background: var(--bg-3);
  border-left: 3px solid var(--gold);
  padding: 14px 18px;
  border-radius: var(--rd-md);
  box-shadow: var(--sh-2);
  color: var(--text-0);
  font-size: 14px;
  animation: slide-in 0.2s ease;
}
.toast-success { border-left-color: var(--success); }
.toast-danger  { border-left-color: var(--danger); }
```

### 5.8 Tabs

```css
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-2);
  background: var(--bg-0);
}
.tab {
  padding: 14px 22px;
  color: var(--text-1);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: var(--text-0); }
.tab.active {
  color: var(--gold);
  border-bottom-color: var(--gold);
}
```

### 5.9 Champion card (top of leaderboard)

```
┌────────────────────────────────────────────┐
│                                            │
│   🏆 PLAYER OF THE YEAR                    │
│                                            │
│   Nguyễn Văn A                             │
│   ━━━━━━━━━━━━━━                          │
│   18,450 pts   ·   6 cash   ·   ME #7     │
│                                            │
└────────────────────────────────────────────┘
   bg: --bg-1, border: 1px --gold,
   shadow: --sh-gold, padding: --sp-6
```

Hero rank display: `font-size: 40px; color: gold; font-weight: 800`.

---

## 6. Iconography

Emoji thay icon (zero asset):

| Action | Emoji | Notes |
|---|---|---|
| Add | ➕ | |
| Edit | ✏️ | |
| Delete | 🗑️ | |
| Save | 💾 | |
| Export | ⬇️ | |
| Import | ⬆️ | |
| Result entry | 📊 | |
| **POY trophy** | 🏆 | Champion card |
| Rank #1 | 🥇 | |
| Rank #2 | 🥈 | |
| Rank #3 | 🥉 | |
| High Roller | 🎰 | |
| Women's | ♕ | Unicode crown |
| Warning | ⚠️ | |
| Money | 💰 | |
| Search | 🔍 | |
| Settings | ⚙️ | |
| Merge | 🔗 | |
| Test pass | ✓ | gold |
| Test fail | ✗ | danger |

---

## 7. Microcopy (tiếng Việt)

| Tình huống | Wording |
|---|---|
| Empty events | "Chưa có event nào. Bấm <b>Load QPC 2026</b> để khởi tạo." |
| Empty leaderboard | "POY 2026 chưa khởi tranh. Nhập kết quả event đầu tiên ở tab <b>📊 Nhập kết quả</b>." |
| Confirm delete event | "Xoá event này sẽ xoá luôn N kết quả đã nhập. Tiếp tục?" |
| Confirm reset | "Toàn bộ dữ liệu POY sẽ bị xoá. Gõ <b>RESET</b> để xác nhận." |
| Toast saved | "Đã lưu N kết quả cho <b>{event}</b>" |
| Toast exported | "Đã tải qpc-poy-{date}.json" |
| Eligibility note | "Cần tối thiểu {N} event cash để vào tranh POY 2026" |
| Cap explainer | "Side events chỉ được tính tối đa {%} tổng điểm — cơ chế chống farm" |
| Champion card | "🏆 PLAYER OF THE YEAR" |
| HR sub-title | "🥇 HIGH ROLLER OF THE SERIES" |
| Women's sub-title | "♕ WOMEN'S PLAYER OF THE SERIES" |

Tone: ngắn, sang, không "vui lòng". Tiếng poker Việt.

---

## 8. Animations (minimal)

```css
@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes slide-in { from { transform: translateY(20px); opacity: 0 }
                      to { transform: translateY(0); opacity: 1 } }
@keyframes gold-pulse { 0%, 100% { box-shadow: 0 0 0 0 var(--gold-glow) }
                        50% { box-shadow: 0 0 0 12px transparent } }
```

Chỉ dùng:
- Fade-in modal & toast.
- Slide-in toast.
- Gold-pulse champion card row khi mới update.

KHÔNG dùng:
- Page transitions.
- Hover scale.
- Loading spinners (skeleton text thay vào).

---

## 9. Accessibility

- Contrast `--text-0` (#fff) trên `--bg-0` (#000) = 21:1 ✓
- Contrast `--gold` (#D4AF37) trên `--bg-0` = 8.7:1 ✓
- Focus rings: gold ring 3px on all interactive.
- `lang="vi"`, `aria-label` cho icon-only buttons.
- Modal trap focus, Esc đóng.

---

## 10. Format conventions

### Tiền VND
- Bảng: `25,000,000 ₫` (mono, ₫ sau)
- Hero: `25M ₫` hoặc `1.5B ₫` compact
- Input: chấp nhận `25000000`, `25,000,000`, `25M`

### Points
- Always integer, mono font, tabular-nums
- Thousands comma: `18,450`
- Champion card hero: `18,450` font-size 40px gold

### Dates
- Bảng: `17/6` (DD/M)
- Range: `17/6 → 24/6`
- Backup file: `qpc-poy-2026-06-17T14-30.json`

### Player name
- Display: nguyên unicode "Nguyễn Văn A"
- So sánh: `parse.normalizeName` (NFC + lowercase + trim)

---

## 11. Test runner UI (`tests.html`)

Cùng design system. Layout:

```
┌────────────────────────────────────────┐
│  QPC POY · TDD Test Runner             │
│  ─────────────────────────             │
│                                        │
│  ✓ scoring.posLog              (8/8)   │
│  ✓ scoring.calcPoints         (10/10)  │
│  ✓ scoring.tierMult            (6/6)   │
│  ✗ leaderboard.compute        (14/16)  │
│     ✓ Scenario A 5x Megastack          │
│     ✗ Scenario E Main #20 + 2 Mega     │
│        Expected: 5772  Got: 6234       │
│  ...                                   │
│                                        │
│  TOTAL: 38/40 passed                   │
└────────────────────────────────────────┘
```

- Pass row: text gold, ✓ icon.
- Fail row: text danger, ✗ icon, error detail indented.
- Summary footer: gold nếu all pass, danger nếu có fail.

---

## 12. Master CSS variables

Copy nguyên vào `<style>` đầu `index.html` và `tests.html`:

```css
:root {
  /* Black palette */
  --bg-0: #000000; --bg-1: #0A0A0A; --bg-2: #141414; --bg-3: #1C1C1C; --bg-4: #262626;
  --border-1: #1F1F1F; --border-2: #2E2E2E; --border-gold: #3D3220;

  /* Gold */
  --gold: #D4AF37; --gold-h: #E5C158; --gold-d: #A88A2C; --gold-soft: #8A7224;
  --gold-bg: rgba(212, 175, 55, 0.08); --gold-bg-h: rgba(212, 175, 55, 0.16);
  --gold-glow: rgba(212, 175, 55, 0.25);

  /* Text */
  --text-0: #FFFFFF; --text-1: #C8C8C8; --text-2: #888888;
  --text-mute: #4D4D4D; --text-gold: #D4AF37;

  /* Semantic */
  --success: #2EA559; --success-bg: rgba(46, 165, 89, 0.12);
  --warning: #E0A23A; --warning-bg: rgba(224, 162, 58, 0.12);
  --danger:  #E04B4B; --danger-bg:  rgba(224, 75, 75, 0.12);
  --info:    #5AA0F2; --info-bg:    rgba(90, 160, 242, 0.12);

  /* Tiers */
  --tier-champ: #D4AF37; --tier-hr: #E8E8E8; --tier-side: #7A7A7A; --tier-women: #E8B4A8;

  /* Rank */
  --rank-1-bg: rgba(212,175,55,0.10); --rank-1-bar: #D4AF37;
  --rank-2-bg: rgba(220,220,220,0.05); --rank-2-bar: #DCDCDC;
  --rank-3-bg: rgba(176,122,65,0.08);  --rank-3-bar: #B07A41;

  /* Type */
  --font-display: "Inter", "Segoe UI", system-ui, sans-serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  --font-serif: Georgia, "Times New Roman", serif;
  --fs-brand: 18px; --fs-h1: 32px; --fs-h2: 22px; --fs-h3: 18px;
  --fs-body: 14px; --fs-sm: 13px; --fs-xs: 11px;
  --fs-num-hero: 40px; --fs-num-lg: 24px; --fs-num: 14px;

  /* Spacing */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  /* Radius + shadow */
  --rd-sm: 4px; --rd-md: 8px; --rd-lg: 12px; --rd-xl: 16px;
  --sh-1: 0 1px 2px rgba(0,0,0,0.5);
  --sh-2: 0 4px 12px rgba(0,0,0,0.6);
  --sh-3: 0 12px 32px rgba(0,0,0,0.8);
  --sh-gold: 0 0 24px rgba(212, 175, 55, 0.2);
}

html, body { background: var(--bg-0); color: var(--text-0); margin: 0; font-family: var(--font-sans); }
```
