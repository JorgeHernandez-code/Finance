import { z } from 'zod';
import type { ISubscriptionRepository } from '@/domain/repositories/ISubscriptionRepository';

const idSchema = z.string().uuid();

export class DeleteSubscription {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.subscriptionRepository.delete(userId, id);
  }
}
