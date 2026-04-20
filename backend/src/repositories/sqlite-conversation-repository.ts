import type Database from 'better-sqlite3';
import type { Conversation } from '../domain/entities.js';
import type { IConversationRepository } from './conversation-repository.interface.js';

export class SqliteConversationRepository implements IConversationRepository {
  private insertStmt: Database.Statement;
  private findByPhoneStmt: Database.Statement;
  private findByIdStmt: Database.Statement;
  private updateStateStmt: Database.Statement;
  private linkCustomerStmt: Database.Statement;
  private touchInboundStmt: Database.Statement;
  private touchOutboundStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO conversations (wa_phone, language, state, customer_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    this.findByPhoneStmt = db.prepare('SELECT * FROM conversations WHERE wa_phone = ?');
    this.findByIdStmt = db.prepare('SELECT * FROM conversations WHERE id = ?');

    this.updateStateStmt = db.prepare(`
      UPDATE conversations SET state = ?, context_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    this.linkCustomerStmt = db.prepare(`
      UPDATE conversations SET customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    this.touchInboundStmt = db.prepare(`
      UPDATE conversations SET last_inbound_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    this.touchOutboundStmt = db.prepare(`
      UPDATE conversations SET last_outbound_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
  }

  async create(c: {
    wa_phone: string;
    language: 'es' | 'en';
    state: string;
    customer_id?: number | null;
  }): Promise<number> {
    const res = this.insertStmt.run(c.wa_phone, c.language, c.state, c.customer_id ?? null);
    return res.lastInsertRowid as number;
  }

  async findById(id: number): Promise<Conversation | null> {
    const row = this.findByIdStmt.get(id) as Conversation | undefined;
    return row ?? null;
  }

  async findByPhone(phone: string): Promise<Conversation | null> {
    const row = this.findByPhoneStmt.get(phone) as Conversation | undefined;
    return row ?? null;
  }

  async updateState(id: number, state: string, context: unknown | null): Promise<void> {
    const contextJson = context ? JSON.stringify(context) : null;
    this.updateStateStmt.run(state, contextJson, id);
  }

  async linkCustomer(id: number, customerId: number): Promise<void> {
    this.linkCustomerStmt.run(customerId, id);
  }

  async touchInbound(id: number): Promise<void> {
    this.touchInboundStmt.run(id);
  }

  async touchOutbound(id: number): Promise<void> {
    this.touchOutboundStmt.run(id);
  }
}
