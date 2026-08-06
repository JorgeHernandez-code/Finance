import type { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import type { Category } from '@/domain/entities/Category';

export class ListCategories {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(userId: string): Promise<Category[]> {
    return this.categoryRepository.list(userId);
  }
}
