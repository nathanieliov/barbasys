import type { Conversation } from '../domain/entities.js';

export interface IConversationRepository {
  create(c: { wa_phone: string; language: 'es' | 'en'; state: string; customer_id?: number | null }): Promise<number>;
  findById(id: number): Promise<Conversation | null>;
  findByPhone(phone: string): Promise<Conversation | null>;
  updateState(id: number, state: string, context: unknown | null): Promise<void>;
  linkCustomer(id: number, customerId: number): Promise<void>;
  touchInbound(id: number): Promise<void>;
  touchOutbound(id: number): Promise<void>;
}
