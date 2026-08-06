import { z } from 'zod';
import type { IDebtRepository } from '@/domain/repositories/IDebtRepository';

const idSchema = z.string().uuid();

export class DeleteDebt {
  constructor(private readonly debtRepository: IDebtRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.debtRepository.delete(userId, id);
  }
}
