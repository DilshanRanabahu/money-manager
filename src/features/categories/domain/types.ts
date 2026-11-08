import type { IconName } from '@/shared/ui/Icon';
import type { CategoryHue } from '@/shared/theme/tokens';

export type TransactionType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  icon: IconName;
  color: CategoryHue;
  sortOrder: number;
  isArchived: boolean;
};
