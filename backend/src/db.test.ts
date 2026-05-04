import { describe, it, expect } from 'vitest';
import db from './db.js';

describe('chatbot schema', () => {
  it('conversations table exists with required columns', () => {
    const cols = db.prepare("PRAGMA table_info(conversations)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('customer_id');
    expect(names).toContain('wa_phone');
    expect(names).toContain('language');
    expect(names).toContain('state');
    expect(names).toContain('context_json');
    expect(names).toContain('created_at');
  });

  it('wa_messages table exists', () => {
    const cols = db.prepare("PRAGMA table_info(wa_messages)").all() as Array<{ name: string }>;
    expect(cols.map(c => c.name)).toContain('conversation_id');
    expect(cols.map(c => c.name)).toContain('wa_message_sid');
    expect(cols.map(c => c.name)).toContain('direction');
  });

  it('gcal_pending_ops table exists', () => {
    const cols = db.prepare("PRAGMA table_info(gcal_pending_ops)").all() as Array<{ name: string }>;
    expect(cols.map(c => c.name)).toContain('barber_id');
    expect(cols.map(c => c.name)).toContain('op');
  });

  it('customers has wa_opt_in columns', () => {
    const cols = db.prepare("PRAGMA table_info(customers)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('wa_opt_in');
    expect(names).toContain('wa_opt_in_at');
    expect(names).toContain('preferred_language');
  });

  it('barbers has gcal columns', () => {
    const cols = db.prepare("PRAGMA table_info(barbers)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('gcal_refresh_token_enc');
    expect(names).toContain('gcal_calendar_id');
    expect(names).toContain('gcal_channel_id');
    expect(names).toContain('gcal_resource_id');
    expect(names).toContain('gcal_watch_expires_at');
  });

  it('appointments has gcal_event_id', () => {
    const cols = db.prepare("PRAGMA table_info(appointments)").all() as Array<{ name: string }>;
    expect(cols.map(c => c.name)).toContain('gcal_event_id');
  });
});
