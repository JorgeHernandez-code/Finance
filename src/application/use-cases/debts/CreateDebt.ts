import type { IDebtRepository } from '@/domain/repositories/IDebtRepository';
import type { Debt } from '@/domain/entities/Debt';
import { debtInputSchema, type DebtInputDto } from '@/application/dto/debt';

export class CreateDebt {
  constructor(private readonly debtRepository: IDebtRepository) {}

  async execute(userId: string, rawInput: DebtInputDto): Promise<Debt> {
    const input = debtInputSchema.parse(rawInput);
    return this.debtRepository.create(userId, input);
  }
}
