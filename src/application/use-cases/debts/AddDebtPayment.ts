import type { IDebtRepository } from '@/domain/repositories/IDebtRepository';
import { debtPaymentInputSchema, type DebtPaymentInputDto } from '@/application/dto/debt';

/**
 * Registra un pago. Si se indica cuenta, el movimiento de salida se crea en
 * la misma operación y queda enlazado (no hay que registrarlo de nuevo como
 * gasto). La clave de idempotencia evita duplicados por doble envío.
 */
export class AddDebtPayment {
  constructor(private readonly debtRepository: IDebtRepository) {}

  async execute(userId: string, rawInput: DebtPaymentInputDto): Promise<void> {
    const { debtId, ...rest } = debtPaymentInputSchema.parse(rawInput);
    await this.debtRepository.addPayment(userId, debtId, rest);
  }
}
