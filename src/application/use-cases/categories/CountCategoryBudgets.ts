import { z } from 'zod';
import type { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';

const idSchema = z.string().uuid();

export class CountCategoryBudgets {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(userId: string, rawId: string): Promise<number> {
    const id = idSchema.parse(rawId);
    return this.categoryRepository.countBudgets(userId, id);
  }
}
