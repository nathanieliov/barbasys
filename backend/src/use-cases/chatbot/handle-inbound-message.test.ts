import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../db.js';
import { SQLiteCustomerRepository } from '../../repositories/sqlite-customer-repository.js';
import { SqliteConversationRepository } from '../../repositories/sqlite-conversation-repository.js';
import { SqliteWaMessageRepository } from '../../repositories/sqlite-wa-message-repository.js';
import { handleInboundMessage } from './handle-inbound-message.js';

describe('handleInboundMessage', () => {
  const customerRepo = new SQLiteCustomerRepository(db);
  const convRepo = new SqliteConversationRepository(db);
  const msgRepo = new SqliteWaMessageRepository(db);
  const mockWhatsAppClient = {
    sendText: vi.fn(),
  };

  it('parses inbound, resolves customer, creates conversation, echoes, persists', async () => {
    mockWhatsAppClient.sendText.mockResolvedValueOnce({ sid: 'SM_out_123', status: 'queued' });

    const inbound = {
      from: '+15551234567',
      to: '+11234567890',
      body: 'Hello bot',
      mediaUrl: null,
      sid: 'SM_in_123',
    };

    const result = await handleInboundMessage({
      inbound,
      customerRepo,
      convRepo,
      msgRepo,
      whatsAppClient: mockWhatsAppClient,
    });

    expect(result.customerId).toBeGreaterThan(0);
    expect(result.conversationId).toBeGreaterThan(0);
    expect(result.inboundMessageId).toBeGreaterThan(0);

    expect(mockWhatsAppClient.sendText).toHaveBeenCalledWith('whatsapp:+15551234567', 'Hello bot');
  });

  it('records conversation and message in database', async () => {
    mockWhatsAppClient.sendText.mockResolvedValueOnce({ sid: 'SM_out_456', status: 'queued' });

    const inbound = {
      from: '+15559876543',
      to: '+11234567890',
      body: 'Test message',
      mediaUrl: null,
      sid: 'SM_in_456',
    };

    const result = await handleInboundMessage({
      inbound,
      customerRepo,
      convRepo,
      msgRepo,
      whatsAppClient: mockWhatsAppClient,
    });

    const conv = await convRepo.findById(result.conversationId);
    expect(conv).not.toBeNull();
    expect(conv?.wa_phone).toBe('+15559876543');

    const msg = await msgRepo.findBySid('SM_in_456');
    expect(msg).not.toBeNull();
    expect(msg?.body).toBe('Test message');
  });

  it('persists outbound message', async () => {
    mockWhatsAppClient.sendText.mockResolvedValueOnce({ sid: 'SM_out_789', status: 'queued' });

    const inbound = {
      from: '+15551111111',
      to: '+11234567890',
      body: 'Echo test',
      mediaUrl: null,
      sid: 'SM_in_789',
    };

    await handleInboundMessage({
      inbound,
      customerRepo,
      convRepo,
      msgRepo,
      whatsAppClient: mockWhatsAppClient,
    });

    const outMsg = await msgRepo.findBySid('SM_out_789');
    expect(outMsg).not.toBeNull();
    expect(outMsg?.direction).toBe('out');
  });
});
