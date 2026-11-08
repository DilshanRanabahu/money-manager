# Design

## Feel

**Minimal, calm, smart.** Lots of white space, one strong number per screen, soft surfaces, and motion that confirms what just happened. The app should feel quiet until you touch it, then respond instantly.

- One primary action per screen.
- Numbers are the hero: big, tabular, easy to scan.
- Color carries meaning only: green = income, warm red = expense, neutral = everything else.
- No borders where spacing can do the job. No shadows heavier than "soft".
- Dark mode is first-class, not an afterthought.

## Design tokens

All values come from `src/shared/theme/tokens.ts`. Components never hard-code colors, sizes or durations.

### Color

| Token            | Light       | Dark        | Use                          |
| ---------------- | ----------- | ----------- | ---------------------------- |
| `bg`             | `#F7F7F5`   | `#0E0E10`   | screen background            |
| `surface`        | `#FFFFFF`   | `#18181B`   | cards, sheets                |
| `surfaceMuted`   | `#EFEFEC`   | `#232327`   | inputs, pressed states       |
| `text`           | `#111113`   | `#F4F4F5`   | primary text                 |
| `textMuted`      | `#6B6B70`   | `#A1A1AA`   | labels, secondary            |
| `textFaint`      | `#A3A3A8`   | `#5E5E66`   | placeholders, hints          |
| `divider`        | `#E6E6E2`   | `#2A2A2F`   | rare separators              |
| `accent`         | `#111113`   | `#F4F4F5`   | primary button (monochrome)  |
| `income`         | `#16A34A`   | `#4ADE80`   | income amounts               |
| `expense`        | `#E5484D`   | `#FF6B6F`   | expense amounts              |
| `cat.*`          | soft pastel set (8 hues) with matching dark variants | category chips & icons |

The accent is intentionally monochrome (black/white). Color is saved for money direction.

### Typography

System font (SF Pro / Roboto). Amounts use **tabular numbers** (`fontVariant: ['tabular-nums']`) so digits do not jump while animating.

| Token        | Size / Line | Weight | Use                     |
| ------------ | ----------- | ------ | ----------------------- |
| `display`    | 40 / 44     | 700    | balance, amount input   |
| `title`      | 22 / 28     | 600    | screen titles           |
| `headline`   | 17 / 22     | 600    | card titles, day headers|
| `body`       | 15 / 20     | 400    | rows, text              |
| `caption`    | 13 / 18     | 500    | labels, meta            |
| `micro`      | 11 / 14     | 600    | uppercase tags          |

### Spacing, radius, elevation

- **Spacing** (4-pt grid): `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48`. Screen padding = `lg` (16).
- **Radius**: `sm 8 · md 12 · lg 20 · full 999`. Cards and sheets use `lg`.
- **Elevation**: only `soft` (very light, blurred shadow) for the floating add button and sheets. Cards sit flat on `bg`, separated by color, not shadow.
- **Touch targets**: minimum 44×44.

### Icons

One icon set only: **Ionicons** (outline variants) via `@expo/vector-icons`, 16–24 px. Use the `Icon` component.

## Screens

### Home (month view)

```
┌─────────────────────────────┐
│  ‹   November 2026   ›      │  month switcher (swipe too)
│                             │
│  Balance                    │
│  Rs. 42,350.00              │  display, animated number
│  ↑ 120,000   ↓ 77,650       │  income / expense, caption
│                             │
│  TODAY · −1,850             │  day header + day net
│  🍔 Food        −850.00     │
│  🚌 Transport   −1,000.00   │
│  YESTERDAY · +118,500       │
│  💼 Salary   +120,000.00    │
│  🛒 Groceries  −1,500.00    │
├─────────────────────────────┤
│  Home      ( + )   Breakdown│  tab bar, add button centered
└─────────────────────────────┘
```

- Balance card is not a boxed card; it is large type on the background.
- Rows: category icon in a soft colored circle · category name + note (muted, one line) · amount right-aligned.
- The add button sits in the middle of the tab bar, so it is reachable from every tab.
- Settings opens from the gear icon on Home.
- Empty month: a short line ("Nothing here yet") and a hint pointing at the add button.

### Add / Edit transaction (bottom sheet)

```
┌─────────────────────────────┐
│        ─────                │  grabber
│   [ Expense | Income ]      │  segmented toggle
│                             │
│        Rs. 1,250            │  display, live as you type
│                             │
│  (Food)(Transport)(Bills)…  │  category chips, scroll/grid
│  📅 Today      ✎ Add note   │
│                             │
│   1   2   3                 │
│   4   5   6                 │  custom number pad
│   7   8   9                 │
│   .   0   ⌫                 │
│  [        Save         ]    │  disabled until valid
└─────────────────────────────┘
```

- Opens with amount focused; the custom pad avoids the system keyboard jumping.
- The last used category is pre-selected for faster entry.
- Save closes the sheet; the new row animates into the list. (No vibration: haptics are off.)

### Breakdown

- Month switcher (shared with Home via `uiStore`).
- Total expense at the top.
- Total at the top, with a change tag underneath ("▲ 20% vs Oct 1–8").
- Pace card (Spending only): per-day average; for the current month the month-end estimate and a green "Leaves about …" or red "… more than you have" line. Estimates use whole rupees.
- List of categories, sorted by amount: icon · name · change tag · amount · percent · thin progress bar in the category color · chevron. Tapping opens `category/[id]` (entries of that category, biggest first). The carry-over row is not tappable.
- Toggle Expense / Income.

### Settings

Export data · Import data · Theme (System / Light / Dark) · App version.

## Shared UI components (`src/shared/ui`)

| Component        | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `Text`           | typed variants from typography tokens                 |
| `PressableScale` | pressable with scale-down + optional haptic           |
| `Button`         | primary / secondary / ghost                           |
| `AnimatedNumber` | rolls between values for amounts                      |
| `TabBar`         | two tabs + centered add button, animated active dot   |
| `MonthSwitcher`  | ‹ month › bound to `uiStore`; tap title for current month |
| `SegmentedControl` | sliding indicator toggle                            |
| `Toast`          | bottom toast with action (Undo)                       |
| `EmptyState`     | icon + one line + hint                                |
| `Screen`         | safe area + padding + background                      |

The add/edit sheet uses Expo Router's native `formSheet` presentation (`sheetAllowedDetents: 'fitToContents'`).

## Accessibility

- Every amount has an accessibility label in words ("Expense, 1,250 rupees, Food").
- Contrast meets WCAG AA in both themes.
- Respect system font scaling up to 1.3×; layouts must not break.
- Respect "Reduce Motion" (see [MOTION.md](MOTION.md)).
