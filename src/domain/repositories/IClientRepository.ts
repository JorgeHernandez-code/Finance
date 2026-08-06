import type { Client, ClientStatus } from '@/domain/entities/Client';

export interface ClientInput {
  name: string;
  color: string;
  icon: string;
  status: ClientStatus;
  notes?: string | null;
}

/** client_id en transactions es ON DELETE SET NULL: borrar un cliente nunca borra transacciones, solo las desvincula. */
export interface IClientRepository {
  list(userId: string): Promise<Client[]>;
  create(userId: string, input: ClientInput): Promise<Client>;
  update(userId: string, id: string, input: ClientInput): Promise<Client>;
  delete(userId: string, id: string): Promise<void>;
}
