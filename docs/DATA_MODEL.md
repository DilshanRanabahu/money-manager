# Data Model

## Money

- Stored as an **integer in minor units** (cents). `Rs. 1,250.50` is stored as `125050`.
- Never use floating point for money. Parsing and formatting live only in `src/shared/lib/money.ts`:
  - `parseAmount("1,250.50") → 125050` (rejects invalid input)
  - `formatAmount(125050) → "Rs. 1,250.50"`
  - `formatAmountCompact(12500000) → "Rs. 125K"` (for tight spaces)
- All amounts are **positive**. Direction comes from `type` (`income` / `expense`), never from a negative sign.

## Dates

- A transaction's day is stored as **`occurred_on`**: a `YYYY-MM-DD` string in the user's local calendar.
- Month filters use string ranges: `occurred_on >= '2026-11-01' AND occurred_on < '2026-12-01'`.
- `created_at` / `updated_at` are Unix timestamps in milliseconds (for ordering within a day and for sync later).
- Date helpers live only in `src/shared/lib/dates.ts`.

## IDs

- Text IDs generated on the device (UUID v4 or ULID), not auto-increment. This keeps import/export and future sync simple.

## Tables

### `categories`

| Column       | Type    | Notes                                   |
| ------------ | ------- | --------------------------------------- |
| `id`         | text PK |                                         |
| `name`       | text    | e.g. "Food"                             |
| `type`       | text    | `income` or `expense`                   |
| `icon`       | text    | icon name from the icon set             |
| `color`      | text    | token name (e.g. `cat.orange`), not hex |
| `sort_order` | integer | display order                           |
| `is_archived`| integer | 0/1, for the future; hidden when 1      |
| `created_at` | integer | ms                                      |

### `transactions`

| Column        | Type    | Notes                                    |
| ------------- | ------- | ---------------------------------------- |
| `id`          | text PK |                                          |
| `type`        | text    | `income` or `expense`                    |
| `amount`      | integer | minor units, > 0                         |
| `category_id` | text FK | → `categories.id`                        |
| `note`        | text    | nullable, max 120 chars                  |
| `occurred_on` | text    | `YYYY-MM-DD`                             |
| `created_at`  | integer | ms                                       |
| `updated_at`  | integer | ms                                       |
| `deleted_at`  | integer | nullable; set on soft delete (undo)      |

**Indexes**
- `idx_tx_occurred_on` on (`occurred_on`) for month queries.
- `idx_tx_category` on (`category_id`) for breakdowns.

Every read query filters `deleted_at IS NULL`.

### Schema source

The tables are created by the SQL in `src/db/migrations.ts`. Repositories in `src/db/repositories` map rows to domain types.

Equivalent shape, for reference only:

```ts
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  note: text('note'),
  occurredOn: text('occurred_on').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (t) => [
  index('idx_tx_occurred_on').on(t.occurredOn),
  index('idx_tx_category').on(t.categoryId),
]);
```

## Default categories

Seeded once on first launch (idempotent, by fixed IDs).

**Expense:** Food · Transport · Bills · Groceries · Shopping · Health · Education · Entertainment · Family · Other

**Income:** Salary · Overtime · Side income · Gift · Other

## Core queries (repository methods)

| Method                                   | Returns                                       |
| ---------------------------------------- | --------------------------------------------- |
| `transactionRepo.findByMonth(yyyyMm)`    | rows for the month, joined with category, ordered by `occurred_on DESC, created_at DESC` |
| `transactionRepo.findById(id)`           | one row or `null`                             |
| `transactionRepo.insert(row)`            | —                                             |
| `transactionRepo.update(id, patch)`      | —                                             |
| `transactionRepo.softDelete(id)` / `restore(id)` | —                                     |
| `transactionRepo.purgeDeleted(olderThanMs)` | —                                          |
| `categoryRepo.findAll(type?)`            | active categories, ordered by `sort_order`    |

Summaries (income, expense, balance, per-category totals, per-day totals) are computed by pure functions in `features/summary/domain` from the month's rows. A month is small (hundreds of rows), so this is fast and keeps logic testable. If it ever gets slow, move the sums into SQL `GROUP BY` queries in the repository without changing the hooks.

## Backup format

```json
{
  "app": "money-manager",
  "version": 1,
  "exportedAt": "2026-11-08T10:30:00.000Z",
  "categories": [ /* rows */ ],
  "transactions": [ /* rows, excluding soft-deleted */ ]
}
```

Import validates with Zod, then replaces all data inside one database transaction (all or nothing).

## Migrations

- Append a new SQL string to `MIGRATIONS` in `src/db/migrations.ts`. Its position + 1 is the schema version (`PRAGMA user_version`).
- Never edit an applied migration. Add a new one.
