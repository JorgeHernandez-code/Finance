import type { IInvestmentRepository } from '@/domain/repositories/IInvestmentRepository';
import type { Investment } from '@/domain/entities/Investment';
import { investmentValuationInputSchema, type InvestmentValuationInputDto } from '@/application/dto/investment';

export class AddInvestmentValuation {
  constructor(private readonly investmentRepository: IInvestmentRepository) {}

  async execute(userId: string, rawInput: InvestmentValuationInputDto): Promise<Investment> {
    const { investmentId, ...rest } = investmentValuationInputSchema.parse(rawInput);
    return this.investmentRepository.addValuation(userId, investmentId, rest);
  }
}
