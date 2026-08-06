import type { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import type { Category } from '@/domain/entities/Category';
import { updateCategorySchema, type UpdateCategoryInput } from '@/application/dto/category';

export class UpdateCategory {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(userId: string, rawInput: UpdateCategoryInput): Promise<Category> {
    const { id, ...rest } = updateCategorySchema.parse(rawInput);

    if (rest.parentId === id) {
      throw new Error('Una categoría no puede ser su propia categoría padre.');
    }

    return this.categoryRepository.update(userId, id, rest);
  }
}
