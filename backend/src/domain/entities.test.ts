import { describe, it, expectTypeOf } from 'vitest';
import type { Conversation, WaMessage, Intent } from './entities.js';

describe('chatbot domain types', () => {
  it('exports Conversation type', () => {
    const c: Conversation = {
      id: 1, customer_id: 1, wa_phone: '+18095551212',
      language: 'es', state: 'idle', context_json: null,
      last_inbound_at: null, last_outbound_at: null,
      created_at: '2026-04-20T00:00:00', updated_at: '2026-04-20T00:00:00'
    };
    expectTypeOf(c.language).toEqualTypeOf<'es' | 'en'>();
  });

  it('exports Intent type', () => {
    const intents: Intent[] = ['book','reschedule','cancel','view_next','faq','unknown'];
    expectTypeOf(intents).toEqualTypeOf<Intent[]>();
  });

  it('exports WaMessage type', () => {
    const m: WaMessage = {
      id: 1, conversation_id: 1, direction: 'in',
      wa_message_sid: 'SMxxx', body: 'hi', media_url: null,
      intent: null, status: null, raw_payload_json: null,
      created_at: '2026-04-20T00:00:00'
    };
    expectTypeOf(m.direction).toEqualTypeOf<'in' | 'out'>();
  });
});
