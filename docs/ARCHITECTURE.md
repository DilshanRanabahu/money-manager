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
│   │   │   ├── domain/           # defaults.ts, types.ts, newCategory.ts (validation + icon set)
│   │   │   ├── services/         # categoryService.ts (create)
│   │   │   └── index.ts
│   │   ├── security/
│   │   │   ├── domain/           # lockPolicy.ts (when to lock again; pure, tested)
│   │   │   ├── services/         # biometrics.ts (expo-local-authentication wrapper)
│   │   │   ├── store/            # lockStore.ts (locked / covered / busy), withoutLocking()
│   │   │   ├── hooks/            # useAppLockLifecycle (AppState), useUnlock
│   │   │   └── components/       # AppLockOverlay (root, above everything), AppLockSettings
│   │   ├── assistant/            # "Ask Money" chat (only feature that uses the network)
│   │   │   ├── services/         # tools.ts (tool schemas + handlers, tested), chatEngine.ts (SDK client,
│   │   │   │                     #   streaming tool loop), apiKey.ts (expo-secure-store), data.ts (real repos),
│   │   │   │                     #   richText.ts + toolLabel.ts (pure, tested; tools also return UI cards)
│   │   │   ├── hooks/            # useChat (in-memory session, confirm cards)
│   │   │   └── components/       # ChatView, ToolCard, RichText, TypingDots, AssistantSettings
│   │   └── backup/
│   │       ├── services/         # exportData.ts, importData.ts
│   │       ├── domain/           # backupSchema.ts (Zod)
│   │       └── index.ts
│   │
│   ├── db/
│   │   ├── client.ts             # opens SQLite
│   │   ├── migrations.ts         # ordered SQL migrations (PRAGMA user_version)
│   │   ├── seed.ts               # default categories (idempotent)
│   │   ├── DbProvider.tsx        # migrate + seed before rendering the app
│   │   ├── queryCache.ts         # shared per-key cache, invalidated by repositories
│   │   ├── useQuery.ts           # React hook over queryCache (useSyncExternalStore)
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
             │  cached per month in queryCache; neighbouring months are prefetched
             ▼
        useMonthTransactions(month)  ──► groupByDay()  (pure)
             │                       ──► computeSummary() (pure)
             ▼
        Home screen renders SummaryCard + day list
```

The screen never refetches by hand. After a write, the repository calls `queryCache.invalidate([...tables])` once; watched queries refetch and the UI animates the change.

Rules for the cache:
- A key's data always belongs to that key. Switching months shows the new month (or a loading state), never the previous month's rows.
- Home and Breakdown share one query per month.
- Bulk writes (backup import) invalidate once after the transaction commits, so no screen reads half-imported data.

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
repository → queryCache.invalidate(['transactions']) → watched queries refetch → UI updates
```

Delete uses **soft delete + undo**: the service sets `deleted_at`, the toast offers Undo for ~4 s, then a cleanup hard-deletes rows older than that on next app start.

## State: what lives where

| State                                  | Where                          |
| -------------------------------------- | ------------------------------ |
| Transactions, categories (persistent)  | SQLite, read through `useQuery` / `queryCache` |
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
| 11 | Own query cache instead of SQLite change listener | The listener fired once per row (an import of 139 rows caused 139 refetches mid-transaction) and returned the previous month's data while a new month loaded. Explicit invalidation from repositories is predictable and testable. |
| 12 | Inactive tab frozen (`freezeOnBlur`); rows only animate when new | Month switch measured at ~160 ms on a Samsung A06 with 100+ rows. |
| 13 | Light list rows (own swipe row, plain `Pressable`) instead of `ReanimatedSwipeable` + `PressableScale` | Each row had ~10 Reanimated objects; creating them while scrolling caused stutter. Mid-scroll stalls went from 6 to 0–3 per test (dev mode). `failOffsetY` hands vertical drags to the list immediately. |
| 14 | Security audit fixes (Nov 2026) | Lock timing uses wall + monotonic clocks and locks if the clock goes back; trips to our own system screens get only a 60 s grace; strong biometrics only; FLAG_SECURE while app lock is on; open modals are dismissed on lock; backup import has size/length/amount limits and type checks; old export files are removed from the cache at start. Not done yet: SQLCipher database encryption and password-protected export (need a native build). |
| 15 | SQLCipher database (Nov 2026) | `money-secure.db` is AES-256 encrypted with a random 256-bit raw key in `expo-secure-store` (Android Keystore, excluded from backups). `src/db/client.ts` `openAppDb()` follows `planOpen()` (pure, tested): create / open / migrate the old plain `money.db` via `sqlcipher_export` (row counts checked, then the plain file is deleted) / plain in Expo Go (no SQLCipher). If the key is gone the start screen offers "Erase and start over". `allowBackup` is false: Auto Backup would copy a file the new phone can't decrypt; moving phones uses JSON export. |
| 10 | Service wired with injected ports | `createTransactionService({ transactions, categories })` lets tests use in-memory fakes; `services/instance.ts` wires the real repos. |

When a decision changes, update this table and say why.
