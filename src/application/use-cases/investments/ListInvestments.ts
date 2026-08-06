import type { IInvestmentRepository } from '@/domain/repositories/IInvestmentRepository';
import type { Investment } from '@/domain/entities/Investment';

export class ListInvestments {
  constructor(private readonly investmentRepository: IInvestmentRepository) {}

  async execute(userId: string): Promise<Investment[]> {
    return this.investmentRepository.list(userId);
  }
}
