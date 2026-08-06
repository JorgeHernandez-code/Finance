import { z } from 'zod';
import type { IClientRepository } from '@/domain/repositories/IClientRepository';

const idSchema = z.string().uuid();

export class DeleteClient {
  constructor(private readonly clientRepository: IClientRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.clientRepository.delete(userId, id);
  }
}
