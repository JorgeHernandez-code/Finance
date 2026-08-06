import type { ISubscriptionRepository } from '@/domain/repositories/ISubscriptionRepository';
import type { Subscription } from '@/domain/entities/Subscription';
import { subscriptionInputSchema, type SubscriptionInputDto } from '@/application/dto/subscription';

export class CreateSubscription {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string, rawInput: SubscriptionInputDto): Promise<Subscription> {
    const input = subscriptionInputSchema.parse(rawInput);
    return this.subscriptionRepository.create(userId, input);
  }
}
