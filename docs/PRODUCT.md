# Product

## Problem

Salary arrives, and by the end of the month it is gone with no clear picture of where it went. Existing apps do too much, push subscriptions, or want an account and cloud sync.

## Goal

A personal app that answers three questions, fast:

1. **How much came in** this month?
2. **How much went out**, and on what?
3. **How much is left**?

## Principles

- **Fast entry beats rich entry.** Adding an expense must take under 5 seconds: open, type amount, pick category, save.
- **Offline and private.** All data lives on the device. No account, no server.
- **Calm UI.** Minimal, readable, no clutter. Motion explains changes; it never decorates.
- **Small and correct.** Fewer features, each done well. Money math is always exact.

## MVP scope (v1)

### 1. Add a transaction
- Type: **Income** or **Expense** (toggle; default Expense).
- **Amount** (required, > 0), entered with a large custom number pad.
- **Category** (required), picked from a chip grid.
- **Date** (defaults to today; can change).
- **Note** (optional, one line).

### 2. Edit / delete a transaction
- Tap a row to edit.
- Swipe a row left to delete, with an **Undo** toast (no confirm dialog).

### 3. Home: the month view
- Month switcher at the top (arrows; tap the title to jump to the current month).
- **New month, automatically**: when a new day or month starts (app reopened, or left open past midnight) the app follows the calendar. If the current month was on screen it moves to the new month, which starts with the carry-over from last month. A month the user chose to browse is left alone.
- **Summary card**: Income, Expense, Balance (Income − Expense) for the selected month.
- **Day-grouped list**: each day shows a header with that day's net total, then its entries, newest first.
- Empty state for a month with no entries.
- **Carry-over**: what was left at the end of the previous month appears automatically as the first entry of the month ("From October +6,080", on the 1st) and counts as income. If the previous months were overspent, it shows as a negative amount and counts as expense. It is calculated, not stored, so it cannot be edited directly; editing an old entry updates it.

### 4. Categories
- Ship with a default set (see [DATA_MODEL.md](DATA_MODEL.md#default-categories)).
- v1: categories are fixed (no add/edit UI yet).

### 5. Breakdown
- A simple per-category list for the selected month: category, amount, % of total expense, a thin bar.
- This is the "where did my money go" answer. No pie charts.
- **Change vs last month**: the total and each category show ▲/▼ % (red when spending rises or income falls, green otherwise; "New" / "Same"). The current month is compared with the same days of last month (Nov 1–8 vs Oct 1–8); past months with the whole previous month. Hidden when last month has no data.
- **Spending pace** (Spending tab): average per day. For the current month also an estimate for the month end: what has been spent so far plus what was spent in the rest of last month (falls back to a straight line if last month is empty), with a note whether it fits the money available this month (income + carry-over).
- **Tap a category** to see its entries for the month, biggest first; tap an entry to edit it.

### 6. App lock (Settings → Security)
- Optional. Turning it on **and** off asks for the fingerprint first, so nobody else can switch it off.
- Needs a fingerprint or a phone screen lock; if the phone has neither, it says so.
- When on: the app opens on a lock screen and asks for the fingerprint right away. Only strong biometrics (the fingerprint sensor, not camera face unlock). The phone's PIN / pattern always works as a fallback, so the owner is never locked out.
- Locks again after leaving the app: **Immediately**, **1 min** or **5 min** (choice under the switch).
- While app lock is on, screenshots, screen recording and the recent-apps preview are blocked (Android FLAG_SECURE).
- Opening the share sheet or file picker from the app does not lock it if you come back within a minute; leaving it open longer still locks.
- Changing the phone's clock back does not skip the lock.
- When the app locks, any open sheet or screen is closed first (unsaved input in it is dropped).

### 7. Backup
- Export all data to a JSON file (share sheet).
- Import from that JSON file.

## Not in v1 (on purpose)

Budgets and limits · charts · recurring transactions · multiple accounts/wallets · multiple currencies · cloud sync · login · notifications · widgets · receipt photos · custom categories.

These live in [ROADMAP.md](ROADMAP.md#later). We only add one when v1 is used daily and the need is real.

## Defaults

- Currency: **LKR** (Rs.), shown as `Rs. 12,500.00`.
- Week starts Monday. Month = calendar month.
- Theme follows the system (light / dark).
