import type { Category } from './types';

type Seed = Omit<Category, 'sortOrder' | 'isArchived'>;

/** Fixed ids so seeding is idempotent and backups stay compatible. */
const expense: Seed[] = [
  { id: 'exp_food', name: 'Food', type: 'expense', icon: 'fast-food-outline', color: 'orange' },
  { id: 'exp_transport', name: 'Transport', type: 'expense', icon: 'bus-outline', color: 'blue' },
  { id: 'exp_bills', name: 'Bills', type: 'expense', icon: 'flash-outline', color: 'yellow' },
  { id: 'exp_groceries', name: 'Groceries', type: 'expense', icon: 'basket-outline', color: 'green' },
  { id: 'exp_shopping', name: 'Shopping', type: 'expense', icon: 'bag-handle-outline', color: 'pink' },
  { id: 'exp_health', name: 'Health', type: 'expense', icon: 'medkit-outline', color: 'teal' },
  { id: 'exp_education', name: 'Education', type: 'expense', icon: 'school-outline', color: 'purple' },
  { id: 'exp_fun', name: 'Entertainment', type: 'expense', icon: 'film-outline', color: 'pink' },
  { id: 'exp_family', name: 'Family', type: 'expense', icon: 'people-outline', color: 'orange' },
  { id: 'exp_other', name: 'Other', type: 'expense', icon: 'ellipsis-horizontal', color: 'gray' },
];

const income: Seed[] = [
  { id: 'inc_salary', name: 'Salary', type: 'income', icon: 'briefcase-outline', color: 'green' },
  { id: 'inc_overtime', name: 'Overtime', type: 'income', icon: 'time-outline', color: 'teal' },
  { id: 'inc_side', name: 'Side income', type: 'income', icon: 'trending-up-outline', color: 'blue' },
  { id: 'inc_gift', name: 'Gift', type: 'income', icon: 'gift-outline', color: 'purple' },
  { id: 'inc_other', name: 'Other', type: 'income', icon: 'ellipsis-horizontal', color: 'gray' },
];

export const DEFAULT_CATEGORIES: Category[] = [...expense, ...income].map((c, i) => ({
  ...c,
  sortOrder: i,
  isArchived: false,
}));
