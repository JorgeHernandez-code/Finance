import { z } from 'zod';
import type { ISubscriptionRepository } from '@/domain/repositories/ISubscriptionRepository';
import type { SubscriptionStatus } from '@/domain/entities/Subscription';

const inputSchema = z.object({ id: z.string().uuid(), status: z.enum(['active', 'paused', 'cancelled']) });

export class SetSubscriptionStatus {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string, rawInput: { id: string; status: SubscriptionStatus }): Promise<void> {
    const { id, status } = inputSchema.parse(rawInput);
    await this.subscriptionRepository.setStatus(userId, id, status);
  }
}
