import { formatMonth, monthName, type MonthKey } from '@/shared/lib/dates';

/** Short "what I looked at" label shown above a tool's card, or null for tools not worth showing. */
export function toolLabel(name: string, input: unknown, currentYear: string): string | null {
  const a = (input ?? {}) as Record<string, unknown>;
  const month = typeof a.month === 'string' && /^\d{4}-\d{2}$/.test(a.month) ? (a.month as MonthKey) : null;
  const when = month ? (month.startsWith(currentYear) ? monthName(month) : formatMonth(month)) : null;

  switch (name) {
    case 'get_month_summary':
      return when ? `Checked ${when}` : 'Checked the month';
    case 'get_breakdown':
      return `${a.type === 'income' ? 'Income' : 'Spending'} by category${when ? ` · ${when}` : ''}`;
    case 'search_entries': {
      const text = typeof a.text === 'string' && a.text.trim() ? `“${a.text.trim().slice(0, 24)}”` : null;
      return text ? `Searched ${text}` : 'Searched entries';
    }
    default:
      return null; // list_categories is plumbing; add_* already show a confirm card
  }
}
