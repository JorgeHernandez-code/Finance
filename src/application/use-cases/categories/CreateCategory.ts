import type { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import type { Category } from '@/domain/entities/Category';
import { categoryInputSchema, type CategoryInputDto } from '@/application/dto/category';

export class CreateCategory {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(userId: string, rawInput: CategoryInputDto): Promise<Category> {
    const input = categoryInputSchema.parse(rawInput);
    return this.categoryRepository.create(userId, input);
  }
}
