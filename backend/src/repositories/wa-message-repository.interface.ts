import type { WaMessage, Intent } from '../domain/entities.js';

export interface IWaMessageRepository {
  recordInbound(m: { conversation_id: number; wa_message_sid: string | null; body: string | null; media_url: string | null; raw_payload_json: string | null }): Promise<number | null>;
  recordOutbound(m: { conversation_id: number; wa_message_sid: string | null; body: string; status: string }): Promise<number>;
  setIntent(id: number, intent: Intent): Promise<void>;
  findBySid(sid: string): Promise<WaMessage | null>;
  countRecentInbound(phone: string, sinceIso: string): Promise<number>;
}
