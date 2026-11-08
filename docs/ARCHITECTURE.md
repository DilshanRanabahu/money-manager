# Architecture

## Goals

- **Feature-based**: code for one feature lives together.
- **One-way dependencies**: UI → hooks → services → repositories → database. Never the reverse.
- **Pure core**: money math, date grouping and summaries are plain TypeScript functions with no React and no database, so they are trivial to test.
- **Replaceable storage**: only repositories know about SQLite. Adding cloud sync later means changing that layer, not the screens.

## Layers

```
┌──────────────────────────────────────────────┐
│  app/            Routes & screens (Expo Router) │  thin: layout + wiring only
├──────────────────────────────────────────────┤
│  features/*/components   Feature UI            │
│  features/*/hooks        React hooks (live data, actions) │
├──────────────────────────────────────────────┤
│  features/*/services     Use cases (validate, orchestrate) │
│  features/*/domain       Pure logic & types    │  no React, no DB
├──────────────────────────────────────────────┤
│  db/repositories         Data access (SQL)     │  only layer that touches SQL
│  db/migrations           Tables                │
└──────────────────────────────────────────────┘
        shared/  ui kit, theme, utils — usable by every layer above it
```

### Rules

1. A screen in `app/` must not import from `db/`. It uses feature hooks.
2. `domain/` imports nothing from React, Expo, or `db/`.
3. Features may import from `shared/` and from another feature's **public `index.ts`** only, never its internals.
4. Components do not compute money totals; they call a domain function or receive the value.
5. All writes go through a service, so validation lives in one place.

## Folder structure

```
money-manager/
├── src/
│   ├── app/                      # Expo Router routes (SDK 55+ uses src/app)
│   │   ├── _layout.tsx           # Providers: gesture root, theme, DB, toasts; root Stack
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       # JS tabs (expo-router/js-tabs) + custom TabBar
│   │   │   ├── index.tsx         # Home (month view)
│   │   │   └── breakdown.tsx     # Per-category breakdown
│   │   ├── settings.tsx          # Backup, theme, about (pushed from Home)
│   │   └── transaction/
│   │       ├── new.tsx           # Add sheet (formSheet presentation)
│   │       └── [id].tsx          # Edit sheet
│   │
│   ├── features/
│   │   ├── transactions/
│   │   │   ├── components/       # TransactionRow, DayHeader, AmountPad, TypeToggle...
│   │   │   ├── hooks/            # useMonthTransactions, useTransactionActions
│   │   │   ├── services/         # transactionService.ts
│   │   │   ├── domain/           # types.ts, groupByDay.ts, validation.ts
│   │   │   └── index.ts          # public API of the feature
│   │   ├── summary/
│   │   │   ├── components/       # SummaryCard, CategoryBreakdownRow
│   │   │   ├── hooks/            # useMonthSummary, useCategoryBreakdown
│   │   │   ├── domain/           # computeSummary.ts, computeBreakdown.ts
│   │   │   └── index.ts
│   │   ├── categories/
│   │   │   ├── components/       # CategoryChip, CategoryGrid
│   │   │   ├── hooks/            # useCategories
│   │   │   ├── domain/           # defaults.ts, types.ts
│   │   │   └── index.ts
│   │   └── backup/
│   │       ├── services/         # exportData.ts, importData.ts
│   │       ├── domain/           # backupSchema.ts (Zod)
│   │       └── index.ts
│   │
│   ├── db/
│   │   ├── client.ts             # opens SQLite (change listener on)
│   │   ├── migrations.ts         # ordered SQL migrations (PRAGMA user_version)
│   │   ├── seed.ts               # default categories (idempotent)
│   │   ├── DbProvider.tsx        # migrate + seed before rendering the app
│   │   ├── useLiveQuery.ts       # re-runs a query when its tables change
│   │   └── repositories/
│   │       ├── transactionRepo.ts
│   │       └── categoryRepo.ts
│   │
│   ├── shared/
│   │   ├── ui/                   # Text, Button, TabBar, ToastHost, PressableScale, AnimatedNumber, MonthSwitcher...
│   │   ├── theme/                # tokens.ts, ThemeProvider, useTheme
│   │   ├── motion/               # springs.ts, durations.ts, useReducedMotion
│   │   ├── lib/                  # money.ts, dates.ts, id.ts, haptics.ts
│   │   └── store/                # uiStore.ts (month, toast), settingsStore.ts (theme, last category; kv-store)
│
├── docs/
├── assets/
├── app.json
└── tsconfig.json                 # path alias: "@/*" -> "src/*"
```

## Data flow

### Reading (reactive)

```
SQLite ──► transactionRepo.findByMonth(month)
             │  (useLiveQuery re-runs when the table changes)
             ▼
        useMonthTransactions(month)  ──► groupByDay()  (pure)
             │                       ──► computeSummary() (pure)
             ▼
        Home screen renders SummaryCard + day list
```

The screen never refetches by hand. After a write, live queries update and the UI animates the change.

### Writing

```
AddTransaction sheet
   │ onSave(formValues)
   ▼
useTransactionActions().create(values)
   ▼
transactionService.create(values)
   ├─ validate with Zod (amount > 0, valid category, valid date)
   ├─ convert amount string → integer minor units (money.ts)
   └─ transactionRepo.insert(row)
   ▼
SQLite changes → live queries re-run → UI updates
```

Delete uses **soft delete + undo**: the service sets `deleted_at`, the toast offers Undo for ~4 s, then a cleanup hard-deletes rows older than that on next app start.

## State: what lives where

| State                                  | Where                          |
| -------------------------------------- | ------------------------------ |
| Transactions, categories (persistent)  | SQLite, read via live queries  |
| Theme preference, last used category   | `expo-sqlite/kv-store` via `settingsStore` |
| Selected month, sheet open, toast      | Zustand `uiStore`              |
| Form input while typing                | Local component state          |
| Derived totals, grouping               | Computed in `domain/` functions (memoized in hooks) |

No server-state library is needed: there is no server.

## Error handling

- Services return `Result<T>` (`{ ok: true, value } | { ok: false, error }`) instead of throwing for expected errors (validation).
- Unexpected errors (DB failure) throw and are caught by an app-level error boundary that shows a calm "Something went wrong" screen with a retry.
- The DB provider shows a splash until migrations finish; if migrations fail, show the error screen, never a half-working app.

## Key decisions

| # | Decision | Why |
| - | -------- | --- |
| 1 | Expo managed workflow | No native setup, fast iteration, easy builds with EAS. |
| 2 | SQLite (not AsyncStorage) | Monthly totals and grouping are queries; SQL does them correctly and fast as data grows. |
| 3 | Plain expo-sqlite, no ORM | Drizzle's Expo driver needed an RC version plus Babel/Metro changes. A few typed repository functions and SQL migrations are simpler and run in Expo Go. |
| 4 | Money as integer minor units | Floats make `0.1 + 0.2 ≠ 0.3`. Integers are exact. |
| 5 | Dates stored as `YYYY-MM-DD` strings | A transaction belongs to a calendar day, not an instant. Avoids timezone bugs. |
| 6 | Zustand only for UI state | Persistent data already has a source of truth (SQLite). Do not duplicate it. |
| 7 | Reanimated for all motion | Runs on the UI thread, stays at 60 fps. |
| 8 | Feature folders + public `index.ts` | Keeps features independent and easy to delete or extend. |
| 9 | No sticky day headers | With RN 0.88 on Android, `stickyHeaderIndices` stopped list rows from rendering. Revisit on a later SDK. |
| 10 | Service wired with injected ports | `createTransactionService({ transactions, categories })` lets tests use in-memory fakes; `services/instance.ts` wires the real repos. |

When a decision changes, update this table and say why.
