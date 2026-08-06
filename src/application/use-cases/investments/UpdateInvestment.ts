import type { IInvestmentRepository } from '@/domain/repositories/IInvestmentRepository';
import type { Investment } from '@/domain/entities/Investment';
import { updateInvestmentSchema, type UpdateInvestmentInput } from '@/application/dto/investment';

export class UpdateInvestment {
  constructor(private readonly investmentRepository: IInvestmentRepository) {}

  async execute(userId: string, rawInput: UpdateInvestmentInput): Promise<Investment> {
    const { id, ...rest } = updateInvestmentSchema.parse(rawInput);
    return this.investmentRepository.update(userId, id, rest);
  }
}
