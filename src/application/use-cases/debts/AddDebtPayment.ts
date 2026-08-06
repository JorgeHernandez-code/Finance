import type { IDebtRepository } from '@/domain/repositories/IDebtRepository';
import type { Debt } from '@/domain/entities/Debt';
import { debtPaymentInputSchema, type DebtPaymentInputDto } from '@/application/dto/debt';

export class AddDebtPayment {
  constructor(private readonly debtRepository: IDebtRepository) {}

  async execute(userId: string, rawInput: DebtPaymentInputDto): Promise<Debt> {
    const { debtId, ...rest } = debtPaymentInputSchema.parse(rawInput);
    return this.debtRepository.addPayment(userId, debtId, rest);
  }
}
