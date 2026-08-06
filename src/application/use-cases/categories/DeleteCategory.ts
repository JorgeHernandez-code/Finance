import { z } from 'zod';
import type { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';

const idSchema = z.string().uuid();

export class DeleteCategory {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.categoryRepository.delete(userId, id);
  }
}
