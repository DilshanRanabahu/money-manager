import { categoryRepo } from '@/db/repositories/categoryRepo';
import { useQuery } from '@/db/useQuery';
import type { TransactionType } from '../domain/types';

const TABLES = ['categories'] as const;

export function useCategories(type?: TransactionType) {
  const { data, loading } = useQuery(`categories:${type ?? 'all'}`, () => categoryRepo.findAll(type), TABLES);
  return { categories: data ?? [], loading };
}
