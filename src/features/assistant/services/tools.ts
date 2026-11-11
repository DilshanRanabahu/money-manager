import { z } from 'zod';

import { CATEGORY_ICONS, unusedHue, validateNewCategory, type NewCategoryInput } from '@/features/categories/domain/newCategory';
import type { Category } from '@/features/categories/domain/types';
import { computeBreakdown, computeSummary } from '@/features/summary/domain/computeSummary';
import type { Transaction, TransactionDraft, TransactionWithCategory } from '@/features/transactions/domain/types';
import { addMonths, isValidISODate, monthName, type ISODate, type MonthKey } from '@/shared/lib/dates';
import { formatAmount, parseAmount } from '@/shared/lib/money';
import type { Result } from '@/shared/lib/result';
import { categoryHues } from '@/shared/theme/tokens';

/**
 * Tools the assistant can call. They run on the phone against local data and return only
 * what the question needs. Writing (add_entry) always waits for the user to confirm.
 */

export type SearchFilter = {
  text?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  from?: ISODate;
  to?: ISODate;
  limit: number;
};

/** What the tools need from the app. Real services in the app, fakes in tests. */
export type AssistantData = {
  monthEntries(month: MonthKey): Promise<{ transactions: TransactionWithCategory[]; carry: number }>;
  search(f: SearchFilter): Promise<{ rows: TransactionWithCategory[]; total: number; count: number }>;
  categories(): Promise<Category[]>;
  addEntry(draft: TransactionDraft): Promise<Result<Transaction>>;
  addCategory(input: NewCategoryInput): Promise<Result<Category>>;
  today(): ISODate;
};

/** Something the assistant wants to save, shown to the user as a confirm card. */
export type Proposal =
  | {
      kind: 'entry';
      type: 'income' | 'expense';
      amount: number; // minor units
      category: Category;
      date: ISODate;
      note: string;
    }
  | { kind: 'category'; category: Category };

export type ConfirmFn = (p: Proposal) => Promise<boolean>;

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM');
const date = z.string().refine(isValidISODate, 'date must be a real YYYY-MM-DD');
const type = z.enum(['income', 'expense']);

const schemas = {
  get_month_summary: z.object({ month }),
  get_breakdown: z.object({ month, type }),
  search_entries: z.object({
    text: z.string().max(60).optional(),
    category_id: z.string().max(60).optional(),
    type: type.optional(),
    from: date.optional(),
    to: date.optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  list_categories: z.object({}),
  add_entry: z.object({
    type,
    amount: z.string().max(20),
    category_id: z.string().max(60),
    date,
    note: z.string().max(120).optional(),
  }),
  add_category: z.object({
    name: z.string().max(60),
    type,
    icon: z.string().max(60),
    color: z.string().max(20).optional(),
  }),
};

export type ToolName = keyof typeof schemas;

const monthProp = { type: 'string', description: 'Month as YYYY-MM' };
const typeProp = { type: 'string', enum: ['income', 'expense'] };

/** JSON Schema definitions sent to the API. */
export const TOOL_DEFINITIONS = [
  {
    name: 'get_month_summary',
    description:
      'Totals for one month: income, expense, balance, number of entries, and the carry-over from earlier months (already included in income if positive, or expense if negative).',
    input_schema: { type: 'object', properties: { month: monthProp }, required: ['month'] },
  },
  {
    name: 'get_breakdown',
    description: 'Per-category totals for one month and one type (income or expense), biggest first, with share of the total.',
    input_schema: { type: 'object', properties: { month: monthProp, type: typeProp }, required: ['month', 'type'] },
  },
  {
    name: 'search_entries',
    description:
      'Find individual entries. All filters optional and combined with AND. `text` matches the note or category name. Dates are inclusive YYYY-MM-DD. Returns up to `limit` newest entries plus the count and net total of ALL matches.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        category_id: { type: 'string', description: 'From list_categories' },
        type: typeProp,
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
        limit: { type: 'integer', description: '1-50, default 20' },
      },
    },
  },
  {
    name: 'list_categories',
    description: 'All categories with their id, name and type. Call before add_entry or filtering by category.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'add_entry',
    description:
      'Propose a new entry. The app shows it to the user, who confirms or declines; the result says which. Use one call per entry. Never a future date.',
    input_schema: {
      type: 'object',
      properties: {
        type: typeProp,
        amount: { type: 'string', description: 'Rupees, e.g. "850" or "1250.50"' },
        category_id: { type: 'string', description: 'From list_categories, matching the type' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        note: { type: 'string', description: 'Short note, optional' },
      },
      required: ['type', 'amount', 'category_id', 'date'],
    },
  },
  {
    name: 'add_category',
    description:
      'Propose a new income or expense category. The app shows it to the user, who confirms or declines. Only when no existing category fits, or the user asks. Returns the new category id on success.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short, Title case, max 24 chars, e.g. "Fuel"' },
        type: typeProp,
        icon: { type: 'string', enum: [...CATEGORY_ICONS] },
        color: { type: 'string', enum: [...categoryHues], description: 'Optional; omit to use an unused colour' },
      },
      required: ['name', 'type', 'icon'],
    },
  },
] as const;

const money = (minor: number) => formatAmount(minor);

const entryOut = (t: TransactionWithCategory) => ({
  date: t.occurredOn,
  type: t.type,
  amount: money(t.amount),
  category: t.category.name,
  ...(t.note ? { note: t.note } : {}),
});

/**
 * What the chat shows for a tool result: real numbers straight from the phone's data,
 * so the reply text only needs to explain them.
 */
export type Card =
  | { kind: 'summary'; month: MonthKey; income: number; expense: number; balance: number; carry: number }
  | {
      kind: 'breakdown';
      month: MonthKey;
      type: 'income' | 'expense';
      total: number;
      rows: { category: Category; amount: number; share: number }[];
      /** Categories folded into "others" (not shown as rows). */
      more: number;
    }
  | { kind: 'entries'; count: number; total: number; rows: TransactionWithCategory[] };

/** Rows shown on a card; the model still gets the full list. */
export const CARD_ROWS = 5;

export type ToolOutcome = { ok: boolean; content: string; card?: Card };

/** Run one tool call. Input is untrusted model output: validated here before use. */
export async function runTool(
  name: string,
  input: unknown,
  data: AssistantData,
  confirm: ConfirmFn,
): Promise<ToolOutcome> {
  if (!(name in schemas)) return { ok: false, content: `Unknown tool: ${name}` };
  const parsed = schemas[name as ToolName].safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, content: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}` };
  }
  const args = parsed.data as never;
  const out = await handlers[name as ToolName](args, data, confirm);
  return { ok: out.ok, content: typeof out.value === 'string' ? out.value : JSON.stringify(out.value), card: out.card };
}

type Out = { ok: boolean; value: unknown; card?: Card };
type Handler<K extends ToolName> = (a: z.infer<(typeof schemas)[K]>, d: AssistantData, c: ConfirmFn) => Promise<Out>;

const handlers: { [K in ToolName]: Handler<K> } = {
  async get_month_summary({ month: m }, d) {
    const { transactions, carry } = await d.monthEntries(m);
    const s = computeSummary(transactions, carry);
    return {
      ok: true,
      value: {
        month: m,
        income: money(s.income),
        expense: money(s.expense),
        balance: money(s.balance),
        carry_from_previous_months: money(s.carry),
        entries: transactions.length,
      },
      card: { kind: 'summary', month: m, income: s.income, expense: s.expense, balance: s.balance, carry: s.carry },
    };
  },

  async get_breakdown({ month: m, type: t }, d) {
    const { transactions, carry } = await d.monthEntries(m);
    const { total, rows } = computeBreakdown(transactions, t, carry, `From ${monthName(addMonths(m, -1))}`);
    return {
      ok: true,
      value: {
        month: m,
        type: t,
        total: money(total),
        categories: rows.map((r) => ({
          category: r.category.name,
          amount: money(r.amount),
          share: `${Math.round(r.share * 100)}%`,
          entries: r.count,
        })),
      },
      card: {
        kind: 'breakdown',
        month: m,
        type: t,
        total,
        rows: rows.slice(0, CARD_ROWS).map((r) => ({ category: r.category, amount: r.amount, share: r.share })),
        more: Math.max(rows.length - CARD_ROWS, 0),
      },
    };
  },

  async search_entries(a, d) {
    const r = await d.search({
      text: a.text?.trim() || undefined,
      categoryId: a.category_id,
      type: a.type,
      from: a.from,
      to: a.to,
      limit: a.limit ?? 20,
    });
    return {
      ok: true,
      value: {
        matches: r.count,
        net_total: money(r.total),
        note: 'net_total is income minus expense over ALL matches',
        shown: r.rows.map(entryOut),
      },
      card: r.count > 0 ? { kind: 'entries', count: r.count, total: r.total, rows: r.rows.slice(0, CARD_ROWS) } : undefined,
    };
  },

  async list_categories(_a, d) {
    const cats = await d.categories();
    return {
      ok: true,
      value: cats.filter((c) => !c.isArchived).map((c) => ({ id: c.id, name: c.name, type: c.type })),
    };
  },

  async add_entry(a, d, confirm) {
    const amount = parseAmount(a.amount);
    if (amount === null) return { ok: false, value: 'Amount must be a positive number like "850" or "1250.50".' };
    if (a.date > d.today()) return { ok: false, value: 'Future dates are not allowed.' };
    const category = (await d.categories()).find((c) => c.id === a.category_id && !c.isArchived);
    if (!category) return { ok: false, value: 'Unknown category_id. Call list_categories.' };
    if (category.type !== a.type) return { ok: false, value: `Category "${category.name}" is for ${category.type}.` };

    const note = (a.note ?? '').trim();
    const accepted = await confirm({ kind: 'entry', type: a.type, amount, category, date: a.date, note });
    if (!accepted) return { ok: true, value: 'The user declined. Nothing was saved.' };

    const saved = await d.addEntry({
      type: a.type,
      amountText: a.amount,
      categoryId: category.id,
      occurredOn: a.date,
      note,
    });
    if (!saved.ok) return { ok: false, value: `Not saved: ${saved.error}` };
    return { ok: true, value: `Saved: ${a.type} ${money(amount)} · ${category.name} · ${a.date}` };
  },

  async add_category(a, d, confirm) {
    const existing = await d.categories();
    const input = { name: a.name, type: a.type, icon: a.icon, color: a.color ?? unusedHue(a.type, existing) };
    const v = validateNewCategory(input, existing);
    if (!v.ok) return { ok: false, value: v.error };

    const preview: Category = { id: 'new', ...v.value, sortOrder: 0, isArchived: false };
    if (!(await confirm({ kind: 'category', category: preview }))) {
      return { ok: true, value: 'The user declined. No category was created.' };
    }
    const saved = await d.addCategory(v.value);
    if (!saved.ok) return { ok: false, value: `Not saved: ${saved.error}` };
    return { ok: true, value: { created: { id: saved.value.id, name: saved.value.name, type: saved.value.type } } };
  },
};
