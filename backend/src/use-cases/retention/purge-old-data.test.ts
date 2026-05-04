import { describe, it, expect, beforeAll } from 'vitest';
import db from '../../db.js';
import { purgeOldData } from './purge-old-data.js';

describe('purgeOldData', () => {
  beforeAll(() => {
    // Insert test shops and customers
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop', '+15551234567');
    const shopId = shop.lastInsertRowid as number;

    const custInsert = db.prepare(
      'INSERT INTO customers (phone, name, created_at) VALUES (?, ?, ?)'
    );

    const oldDate = new Date(Date.now() - 190 * 24 * 60 * 60 * 1000).toISOString(); // 190 days ago
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

    const oldCustId = custInsert.run('+15559999999', 'Old Customer', oldDate).lastInsertRowid as number;
    const recentCustId = custInsert.run('+15558888888', 'Recent Customer', recentDate).lastInsertRowid as number;

    // Insert conversations for both
    const convInsert = db.prepare(
      'INSERT INTO conversations (wa_phone, customer_id, language, state, created_at) VALUES (?, ?, ?, ?, ?)'
    );

    const oldConvId = convInsert.run('+15559999999', oldCustId, 'es', 'idle', oldDate).lastInsertRowid as number;
    const recentConvId = convInsert.run('+15558888888', recentCustId, 'en', 'idle', recentDate).lastInsertRowid as number;

    // Insert messages for both
    const msgInsert = db.prepare(
      'INSERT INTO wa_messages (conversation_id, wa_message_sid, direction, body, created_at) VALUES (?, ?, ?, ?, ?)'
    );

    msgInsert.run(oldConvId, 'SM_old_1', 'in', 'Hello', oldDate);
    msgInsert.run(recentConvId, 'SM_recent_1', 'in', 'Hi', recentDate);
  });

  it('deletes conversations and messages older than 180 days', async () => {
    const msgsBefore = db.prepare('SELECT COUNT(*) as count FROM wa_messages').get() as { count: number };
    const convBefore = db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };

    await purgeOldData(db, 180);

    const msgsAfter = db.prepare('SELECT COUNT(*) as count FROM wa_messages').get() as { count: number };
    const convAfter = db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };

    // Should have deleted old messages and conversations
    expect(msgsAfter.count).toBeLessThan(msgsBefore.count);
    expect(convAfter.count).toBeLessThan(convBefore.count);
  });

  it('preserves recent conversations and messages', async () => {
    const recentMsg = db.prepare(
      "SELECT * FROM wa_messages WHERE wa_message_sid = 'SM_recent_1'"
    ).get();
    expect(recentMsg).not.toBeNull();

    const recentConv = db.prepare(
      "SELECT * FROM conversations WHERE wa_phone = '+15558888888'"
    ).get();
    expect(recentConv).not.toBeNull();
  });
});
