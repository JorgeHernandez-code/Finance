import type { ISubscriptionRepository } from '@/domain/repositories/ISubscriptionRepository';
import type { Subscription } from '@/domain/entities/Subscription';
import { updateSubscriptionSchema, type UpdateSubscriptionInput } from '@/application/dto/subscription';

export class UpdateSubscription {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string, rawInput: UpdateSubscriptionInput): Promise<Subscription> {
    const { id, ...rest } = updateSubscriptionSchema.parse(rawInput);
    return this.subscriptionRepository.update(userId, id, rest);
  }
}
