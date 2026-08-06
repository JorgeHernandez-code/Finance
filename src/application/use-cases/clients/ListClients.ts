import type { IClientRepository } from '@/domain/repositories/IClientRepository';
import type { Client } from '@/domain/entities/Client';

export class ListClients {
  constructor(private readonly clientRepository: IClientRepository) {}

  async execute(userId: string): Promise<Client[]> {
    return this.clientRepository.list(userId);
  }
}
