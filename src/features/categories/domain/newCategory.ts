import { categoryHues, type CategoryHue } from '@/shared/theme/tokens';
import type { IconName } from '@/shared/ui/Icon';
import { err, ok, type Result } from '@/shared/lib/result';
import type { Category, TransactionType } from './types';

/** Icons a new category can use (Ionicons outline set). Kept small so they all look alike. */
export const CATEGORY_ICONS = [
  'cafe-outline', 'restaurant-outline', 'pizza-outline', 'beer-outline', 'wine-outline',
  'car-outline', 'bicycle-outline', 'train-outline', 'airplane-outline', 'boat-outline', 'speedometer-outline',
  'home-outline', 'bed-outline', 'construct-outline', 'hammer-outline', 'water-outline', 'bulb-outline',
  'phone-portrait-outline', 'laptop-outline', 'wifi-outline', 'tv-outline', 'game-controller-outline',
  'shirt-outline', 'cut-outline', 'sparkles-outline', 'heart-outline', 'fitness-outline', 'barbell-outline',
  'paw-outline', 'leaf-outline', 'flower-outline', 'happy-outline', 'book-outline', 'library-outline',
  'musical-notes-outline', 'camera-outline', 'gift-outline', 'card-outline', 'cash-outline', 'wallet-outline',
  'trending-up-outline', 'business-outline', 'storefront-outline', 'cart-outline', 'receipt-outline',
  'shield-checkmark-outline', 'medical-outline', 'globe-outline', 'ticket-outline', 'pricetag-outline',
] as const satisfies readonly IconName[];

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const MAX_CATEGORY_NAME = 24;

export type NewCategoryInput = { name: string; type: TransactionType; icon: string; color: string };
export type ValidNewCategory = { name: string; type: TransactionType; icon: CategoryIcon; color: CategoryHue };

/** Check a new category against the existing (active) ones. Names are unique per type, ignoring case. */
export function validateNewCategory(input: NewCategoryInput, existing: readonly Category[]): Result<ValidNewCategory> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) return err('Name is required');
  if (name.length > MAX_CATEGORY_NAME) return err(`Name is too long (max ${MAX_CATEGORY_NAME})`);
  if (input.type !== 'income' && input.type !== 'expense') return err('Type must be income or expense');
  if (!(CATEGORY_ICONS as readonly string[]).includes(input.icon)) return err('Pick an icon from the list');
  if (!(categoryHues as readonly string[]).includes(input.color)) return err('Pick a colour from the list');
  const clash = existing.find((c) => c.type === input.type && !c.isArchived && c.name.toLowerCase() === name.toLowerCase());
  if (clash) return err(`"${clash.name}" already exists`);
  return ok({ name, type: input.type, icon: input.icon as CategoryIcon, color: input.color as CategoryHue });
}

/** A colour not yet used by this type's categories, if any (for a sensible default). */
export function unusedHue(type: TransactionType, existing: readonly Category[]): CategoryHue {
  const used = new Set(existing.filter((c) => c.type === type && !c.isArchived).map((c) => c.color));
  return categoryHues.find((h) => h !== 'gray' && !used.has(h)) ?? 'gray';
}
