import { categoryRepo } from '@/db/repositories/categoryRepo';
import { newId } from '@/shared/lib/id';
import { ok, type Result } from '@/shared/lib/result';
import { validateNewCategory, type NewCategoryInput } from '../domain/newCategory';
import type { Category } from '../domain/types';

/** Writes for categories. Validation lives in the domain. */
export const categoryService = {
  async create(input: NewCategoryInput): Promise<Result<Category>> {
    const v = validateNewCategory(input, await categoryRepo.findAll());
    if (!v.ok) return v;
    return ok(await categoryRepo.insert({ id: `cat_${newId()}`, ...v.value }, Date.now()));
  },
};
