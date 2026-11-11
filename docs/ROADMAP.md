# Roadmap

Build in this order. Each milestone ends with something usable on the phone.

## Milestone 0 — Foundation ✅
- [x] Create Expo app (SDK 58) with TypeScript and Expo Router (`src/app`)
- [x] Add `@/` path alias, ESLint, Jest (`jest-expo`)
- [x] Install Reanimated, Gesture Handler, expo-haptics, expo-sqlite, Zustand, Zod, Ionicons
- [x] Theme: tokens, `ThemeProvider`, light/dark following system
- [x] Motion tokens and `useReducedMotion`
- [x] Base UI: `Screen`, `Text`, `PressableScale`, `Button`
- [x] Folder structure from [ARCHITECTURE.md](ARCHITECTURE.md)

## Milestone 1 — Data layer ✅
- [x] `money.ts` and `dates.ts` with full unit tests
- [x] SQL migrations, DB provider with splash while migrating
- [x] Seed default categories
- [x] Repositories + transaction service with Zod validation
- [x] Service tests with in-memory fakes

## Milestone 2 — Add & list ✅ (first usable version)
- [x] Add sheet: type toggle, amount pad, category chips, date, note
- [x] Home: summary (income / expense / balance) + day-grouped list
- [x] Month switcher (arrows; tap title for current month)
- [x] Empty state
- **Goal:** start logging real expenses daily from here.

## Milestone 3 — Edit, delete, polish ✅
- [x] Edit transaction
- [x] Swipe to delete + Undo toast + purge on start
- [x] Animations in [MOTION.md](MOTION.md) and haptics
- [x] Reduce Motion support, accessibility labels

## Milestone 4 — Breakdown & backup ✅
- [x] Breakdown screen with animated bars
- [x] Export to JSON / import from JSON
- [x] Settings screen (theme override, version)
- [x] Test export → import round trip on the device (import uses `File.pickFileAsync`; expo-document-picker's cached file was not readable in Expo Go)
- [x] Check the light theme on the device

## Milestone 5 — Release for myself
- [ ] App icon and splash
- [ ] Standalone Android build (EAS build or `npx expo run:android`), so Expo Go is not needed
- [ ] Use it for a full month; write down what was annoying

## Known issues / follow-ups
- Sticky day headers are off: on RN 0.88 / Android they stopped list rows from rendering.
- In the light theme the Android navigation bar stays grey (seen in Expo Go); re-check in the standalone build.
- Swipe left/right on the month title to change month (only arrows today).

## Done after v1
- [x] Carry last month's leftover into the new month as an automatic income entry (negative if overspent)
- [x] Expense categories "AI subscriptions" and "API subscriptions"
- [x] App lock with fingerprint / phone screen lock, toggle in Settings, lock-again delay
- [x] Breakdown: change vs last month, spending pace + month-end estimate, tap a category to see its entries
- [x] Ask Money chat (Claude, user's own API key in secure store, on-device tools, confirm before adding entries)
- [x] Ask Money can create new income/expense categories (confirm card)
- [x] Test Ask Money on the device with a real key (Expo Go streaming via `expo/fetch`; `metro.config.js` forces the SDK's CommonJS build)

## Security follow-ups
- [ ] Encrypt the database with SQLCipher (`expo-sqlite` `useSQLCipher`), key in `expo-secure-store`; migrate the existing plaintext DB
- [ ] Optional password-protected backup export
- [ ] Check the final APK manifest for permissions Expo adds by default; block unused ones

## Later

Pick from here only after a month of real use, based on what was actually missing.

- Custom categories (add / rename / reorder / archive)
- Monthly budget per category with gentle warnings
- Recurring transactions (rent, subscriptions)
- Simple charts (daily spending trend)
- Search and filters
- Multiple wallets (cash, bank, card)
- Home screen widget for quick add
- Cloud backup / sync (repository layer is the only place to change)
- Reminders ("You haven't logged today")
