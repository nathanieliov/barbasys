import type Database from 'better-sqlite3';
import type { WaMessage, Intent } from '../domain/entities.js';
import type { IWaMessageRepository } from './wa-message-repository.interface.js';

export class SqliteWaMessageRepository implements IWaMessageRepository {
  private recordInboundStmt: Database.Statement;
  private recordOutboundStmt: Database.Statement;
  private setIntentStmt: Database.Statement;
  private findBySidStmt: Database.Statement;
  private countRecentInboundStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.recordInboundStmt = db.prepare(`
      INSERT INTO wa_messages (conversation_id, direction, wa_message_sid, body, media_url, raw_payload_json, created_at)
      VALUES (?, 'in', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    this.recordOutboundStmt = db.prepare(`
      INSERT INTO wa_messages (conversation_id, direction, wa_message_sid, body, status, created_at)
      VALUES (?, 'out', ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    this.setIntentStmt = db.prepare('UPDATE wa_messages SET intent = ? WHERE id = ?');

    this.findBySidStmt = db.prepare('SELECT * FROM wa_messages WHERE wa_message_sid = ?');

    this.countRecentInboundStmt = db.prepare(`
      SELECT COUNT(*) as cnt FROM wa_messages
      WHERE direction = 'in'
        AND conversation_id = (SELECT id FROM conversations WHERE wa_phone = ?)
        AND julianday(created_at) > julianday(?)
    `);
  }

  async recordInbound(m: {
    conversation_id: number;
    wa_message_sid: string | null;
    body: string | null;
    media_url: string | null;
    raw_payload_json: string | null;
  }): Promise<number | null> {
    try {
      const res = this.recordInboundStmt.run(
        m.conversation_id,
        m.wa_message_sid,
        m.body,
        m.media_url,
        m.raw_payload_json,
      );
      return res.lastInsertRowid as number;
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err.message?.includes('UNIQUE constraint failed')) {
        return null;
      }
      throw e;
    }
  }

  async recordOutbound(m: {
    conversation_id: number;
    wa_message_sid: string | null;
    body: string;
    status: string;
  }): Promise<number> {
    const res = this.recordOutboundStmt.run(m.conversation_id, m.wa_message_sid, m.body, m.status);
    return res.lastInsertRowid as number;
  }

  async setIntent(id: number, intent: Intent): Promise<void> {
    this.setIntentStmt.run(intent, id);
  }

  async findBySid(sid: string): Promise<WaMessage | null> {
    const row = this.findBySidStmt.get(sid) as WaMessage | undefined;
    return row ?? null;
  }

  async countRecentInbound(phone: string, sinceIso: string): Promise<number> {
    const row = this.countRecentInboundStmt.get(phone, sinceIso) as { cnt: number } | undefined;
    return row?.cnt ?? 0;
  }
}
