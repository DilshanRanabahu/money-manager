import { categoryRepo } from '@/db/repositories/categoryRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import type { TransactionType } from '../domain/types';

const TABLES = ['categories'] as const;

export function useCategories(type?: TransactionType) {
  const { data, loading } = useLiveQuery(() => categoryRepo.findAll(type), TABLES, [type]);
  return { categories: data ?? [], loading };
}
