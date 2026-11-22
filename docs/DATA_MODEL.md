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

## Storage

One SQLite file, `money-secure.db`, encrypted with SQLCipher (AES-256, raw 256-bit key in `expo-secure-store`). In Expo Go, which has no SQLCipher, the plain `money.db` is used. On the first start of a SQLCipher build an existing `money.db` is copied into the encrypted file and deleted (see `src/db/client.ts`). Settings live in a separate unencrypted kv-store (no money data).

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

### `chat_messages` (schema v4)

Ask Money chat history. One conversation per local day; kept 90 days; never exported in backups.

| Column       | Type    | Notes                                                        |
| ------------ | ------- | ------------------------------------------------------------ |
| `id`         | text PK | chat item id                                                 |
| `day`        | text    | `YYYY-MM-DD` the chat was opened                             |
| `seq`        | integer | order within the day                                         |
| `kind`       | text    | `user` / `assistant` / `tool` / `proposal`                   |
| `payload`    | text    | the item as JSON (without id; cards keep their real numbers) |
| `image`      | text    | nullable; resized receipt photo, JPEG base64 (user messages) |
| `created_at` | integer | ms                                                           |

**Index:** `idx_chat_day` on (`day`, `seq`). Saved with `ON CONFLICT(id) DO UPDATE` (payload and order only; the photo is written once). `purgeBefore(today − 89 days)` runs at app start. Backup import does not touch this table.

### `ai_usage` (schema v5)

Ask Money token counts, summed per day and model, to show what the user's API key spent. Counts only, no message content. Kept with the data (not purged); never exported in backups.

| Column               | Type    | Notes                                              |
| -------------------- | ------- | -------------------------------------------------- |
| `day`                | text    | `YYYY-MM-DD` of the chat (PK with `model`)         |
| `model`              | text    | e.g. `claude-haiku-5-5`                            |
| `questions`          | integer | questions sent (one per user message)              |
| `requests`           | integer | API calls (a question with tools takes several)    |
| `input_tokens`       | integer | uncached input                                     |
| `output_tokens`      | integer |                                                    |
| `cache_write_tokens` | integer | `usage.cache_creation_input_tokens`                |
| `cache_read_tokens`  | integer | `usage.cache_read_input_tokens`                    |

Each API call adds to its row (`ON CONFLICT(day, model) DO UPDATE SET x = x + excluded.x`). Cost is not stored: `features/assistant/domain/usage.ts` computes it from list prices, in integer nano-dollars, and `formatUsd` in `money.ts` shows it.

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

**Expense:** Food · Transport · Bills · Groceries · Shopping · Health · Education · Entertainment · Family · AI subscriptions · API subscriptions · Other (the two subscription categories were added in schema v2)

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

**Carry-over** is never stored. `transactionRepo.balanceBefore('YYYY-MM-01')` sums income − expense of every non-deleted row before the month; `computeSummary(rows, carry)` adds a positive carry to income and a negative one to expense, and `computeBreakdown` shows it as a pseudo-category (`id: 'carry'`). Because it is derived, editing or deleting any earlier entry updates every later month.

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
