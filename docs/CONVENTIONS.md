# Conventions

## TypeScript

- `strict: true`. No `any`; use `unknown` and narrow.
- Prefer `type` over `interface` for data shapes.
- Domain types live in `features/*/domain/types.ts` and are the single source of truth. DB row types (`TransactionRow`, `CategoryRow`) live in the repositories, which map them to domain types.
- Import with the `@/` alias (`@/shared/lib/money`), not long relative paths.

## Naming

| Thing                 | Style            | Example                    |
| --------------------- | ---------------- | -------------------------- |
| Components            | PascalCase file & export | `TransactionRow.tsx` |
| Hooks                 | `useX`           | `useMonthSummary.ts`       |
| Services / repos      | camelCase + suffix | `transactionService.ts`, `transactionRepo.ts` |
| Pure functions        | verb first       | `groupByDay`, `computeSummary` |
| Constants             | UPPER_SNAKE      | `MAX_NOTE_LENGTH`          |
| DB columns            | snake_case       | `occurred_on`              |
| TS fields             | camelCase        | `occurredOn`               |

## Components

- Function components only. One component per file.
- Keep components presentational where possible: data in via props, events out via callbacks.
- Styles via `StyleSheet.create` using theme tokens from `useTheme()`. No inline magic numbers.
- Lists use `FlatList` with a stable `keyExtractor` (the transaction `id`).
- Write shared values from JS with `.set()` (React Compiler lint rule); read `.value` inside worklets.
- Memoize rows (`React.memo`) and callbacks passed to them.

## Money & dates

- Only `shared/lib/money.ts` parses or formats money. Only `shared/lib/dates.ts` creates or formats date strings.
- Never `Number(amount) * 100` in a component. Never `new Date('2026-11-08')` (it parses as UTC).

## Testing

| Layer                 | Test type                         | Required? |
| --------------------- | --------------------------------- | --------- |
| `domain/`, `shared/lib` | Unit tests (Jest)               | **Yes**, every function |
| Services              | Unit tests with in-memory fake ports | Yes    |
| Repositories / UI     | Manual check on a device (Expo Go) | Each milestone |

Test files sit next to the code: `computeSummary.test.ts`.

Must-have test cases: amount parsing edge cases (`"0"`, `"."`, `"1,000.505"`, empty), month boundaries (Jan 31 → Feb, Dec → Jan), day grouping order, balance with zero income.

## Tooling

- ESLint (Expo config, flat config in `eslint.config.js`).
- `npm run typecheck`, `npx eslint .`, `npm test` must pass before a commit.
- Install native packages with `npx expo install` so versions match the SDK.

## Git

- Small commits, one change each. Message style: `feat: add swipe to delete`, `fix: month boundary in summary`, `docs: ...`, `refactor: ...`, `test: ...`.
- `main` stays runnable. Work on a branch per milestone item.

## Docs

- If you change architecture, data model, design tokens or motion tokens, update the matching doc in the same commit.
