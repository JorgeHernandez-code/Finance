import type { IClientRepository } from '@/domain/repositories/IClientRepository';
import type { Client } from '@/domain/entities/Client';
import { updateClientSchema, type UpdateClientInput } from '@/application/dto/client';

export class UpdateClient {
  constructor(private readonly clientRepository: IClientRepository) {}

  async execute(userId: string, rawInput: UpdateClientInput): Promise<Client> {
    const { id, ...rest } = updateClientSchema.parse(rawInput);
    return this.clientRepository.update(userId, id, rest);
  }
}
