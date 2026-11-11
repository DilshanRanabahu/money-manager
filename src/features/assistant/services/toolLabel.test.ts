import { toolLabel } from './toolLabel';

describe('toolLabel', () => {
  it.each([
    ['get_month_summary', { month: '2026-11' }, 'Checked November'],
    ['get_month_summary', { month: '2025-12' }, 'Checked December 2025'],
    ['get_breakdown', { month: '2026-10', type: 'expense' }, 'Spending by category · October'],
    ['get_breakdown', { month: '2026-10', type: 'income' }, 'Income by category · October'],
    ['search_entries', { text: ' kfc ' }, 'Searched “kfc”'],
    ['search_entries', {}, 'Searched entries'],
    ['list_categories', {}, null],
    ['add_entry', {}, null],
  ])('%s %p -> %p', (name, input, label) => {
    expect(toolLabel(name, input, '2026')).toBe(label);
  });
});
