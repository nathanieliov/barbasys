import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../db.js';
import { SQLiteCustomerRepository } from '../../repositories/sqlite-customer-repository.js';
import { SqliteConversationRepository } from '../../repositories/sqlite-conversation-repository.js';
import { SqliteWaMessageRepository } from '../../repositories/sqlite-wa-message-repository.js';
import { handleInboundMessage } from './handle-inbound-message.js';
import type { ILLMClient } from '../../adapters/llm/llm-client.interface.js';

describe('handleInboundMessage', () => {
  let shopId: number;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop', '+15551234567');
    shopId = shop.lastInsertRowid as number;
  });

  const customerRepo = new SQLiteCustomerRepository(db);
  const convRepo = new SqliteConversationRepository(db);
  const msgRepo = new SqliteWaMessageRepository(db);

  const mockWhatsAppClient = {
    sendText: vi.fn(),
  };

  const mockLLMClient: ILLMClient = {
    classify: vi.fn().mockResolvedValue({ intent: 'faq', args: {} }),
    answerFaq: vi.fn().mockResolvedValue('Here is an answer'),
  };

  it('parses inbound, resolves customer, creates conversation, routes intent', async () => {
    mockWhatsAppClient.sendText.mockResolvedValueOnce({ sid: 'SM_out_123', status: 'queued' });

    const inbound = {
      from: '+15551234567',
      to: '+11234567890',
      body: 'What are your hours?',
      mediaUrl: null,
      sid: 'SM_in_123',
    };

    const result = await handleInboundMessage({
      inbound,
      customerRepo,
      convRepo,
      msgRepo,
      whatsAppClient: mockWhatsAppClient,
      llmClient: mockLLMClient,
      shopId,
      shopPhone: '+15551234567',
    });

    expect(result.customerId).toBeGreaterThan(0);
    expect(result.conversationId).toBeGreaterThan(0);
    expect(result.inboundMessageId).toBeGreaterThan(0);
    expect(mockWhatsAppClient.sendText).toHaveBeenCalled();
  });

  it('handles empty body without routing', async () => {
    mockWhatsAppClient.sendText.mockResolvedValueOnce({ sid: 'SM_out_empty', status: 'queued' });

    const inbound = {
      from: '+15552222222',
      to: '+11234567890',
      body: null,
      mediaUrl: null,
      sid: 'SM_in_empty',
    };

    const result = await handleInboundMessage({
      inbound,
      customerRepo,
      convRepo,
      msgRepo,
      whatsAppClient: mockWhatsAppClient,
      llmClient: mockLLMClient,
      shopId,
      shopPhone: '+15551234567',
    });

    expect(result.customerId).toBeGreaterThan(0);
    expect(mockWhatsAppClient.sendText).toHaveBeenCalled();
    // Should send a default message for empty body
    const callArgs = mockWhatsAppClient.sendText.mock.calls[mockWhatsAppClient.sendText.mock.calls.length - 1];
    expect(callArgs[1]).toMatch(/I did not understand|No entendí/);
  });
});
