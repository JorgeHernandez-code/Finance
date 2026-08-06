import type { IClientRepository } from '@/domain/repositories/IClientRepository';
import type { Client } from '@/domain/entities/Client';
import { clientInputSchema, type ClientInputDto } from '@/application/dto/client';

export class CreateClient {
  constructor(private readonly clientRepository: IClientRepository) {}

  async execute(userId: string, rawInput: ClientInputDto): Promise<Client> {
    const input = clientInputSchema.parse(rawInput);
    return this.clientRepository.create(userId, input);
  }
}
