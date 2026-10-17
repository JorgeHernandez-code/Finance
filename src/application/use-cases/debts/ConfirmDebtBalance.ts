import type { IDebtRepository } from '@/domain/repositories/IDebtRepository';
import { confirmDebtBalanceSchema, type ConfirmDebtBalanceInput } from '@/application/dto/debt';

/** Registra el saldo que el acreedor confirmó en una fecha (deja de ser una estimación). */
export class ConfirmDebtBalance {
  constructor(private readonly debtRepository: IDebtRepository) {}

  async execute(userId: string, rawInput: ConfirmDebtBalanceInput): Promise<void> {
    const { id, amount, confirmedAt } = confirmDebtBalanceSchema.parse(rawInput);
    await this.debtRepository.confirmBalance(userId, id, { amount, confirmedAt });
  }
}
