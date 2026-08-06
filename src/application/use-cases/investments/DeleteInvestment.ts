import type { IInvestmentRepository } from '@/domain/repositories/IInvestmentRepository';

export class DeleteInvestment {
  constructor(private readonly investmentRepository: IInvestmentRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    await this.investmentRepository.delete(userId, id);
  }
}
