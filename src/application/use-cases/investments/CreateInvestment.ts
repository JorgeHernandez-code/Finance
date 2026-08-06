import type { IInvestmentRepository } from '@/domain/repositories/IInvestmentRepository';
import type { Investment } from '@/domain/entities/Investment';
import { investmentInputSchema, type InvestmentInputDto } from '@/application/dto/investment';

export class CreateInvestment {
  constructor(private readonly investmentRepository: IInvestmentRepository) {}

  async execute(userId: string, rawInput: InvestmentInputDto): Promise<Investment> {
    const input = investmentInputSchema.parse(rawInput);
    return this.investmentRepository.create(userId, input);
  }
}
