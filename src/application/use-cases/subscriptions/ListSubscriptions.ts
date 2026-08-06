import type { ISubscriptionRepository } from '@/domain/repositories/ISubscriptionRepository';
import type { Subscription } from '@/domain/entities/Subscription';

export class ListSubscriptions {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.list(userId);
  }
}
