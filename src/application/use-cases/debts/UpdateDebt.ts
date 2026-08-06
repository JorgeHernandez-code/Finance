import type { IDebtRepository } from '@/domain/repositories/IDebtRepository';
import type { Debt } from '@/domain/entities/Debt';
import { updateDebtSchema, type UpdateDebtInput } from '@/application/dto/debt';

export class UpdateDebt {
  constructor(private readonly debtRepository: IDebtRepository) {}

  async execute(userId: string, rawInput: UpdateDebtInput): Promise<Debt> {
    const { id, ...rest } = updateDebtSchema.parse(rawInput);
    return this.debtRepository.update(userId, id, rest);
  }
}
