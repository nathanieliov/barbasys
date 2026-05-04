import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwilioWhatsAppClient } from './twilio-whatsapp-client.js';

describe('TwilioWhatsAppClient', () => {
  let client: TwilioWhatsAppClient;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreate = vi.fn().mockResolvedValue({ sid: 'SM123456789' });
    const mockMessagesClient = { create: mockCreate };
    const mockTwilioClient = {
      messages: mockMessagesClient,
    } as any;

    client = new TwilioWhatsAppClient(mockTwilioClient, 'whatsapp:+11234567890');
  });

  it('sends text message', async () => {
    const result = await client.sendText('whatsapp:+15551234567', 'Hello');

    expect(mockCreate).toHaveBeenCalledWith({
      from: 'whatsapp:+11234567890',
      to: 'whatsapp:+15551234567',
      body: 'Hello',
    });
    expect(result.sid).toBe('SM123456789');
    expect(result.status).toBe('queued');
  });

  it('sends list message', async () => {
    const items = [
      { id: '1', title: 'Option 1' },
      { id: '2', title: 'Option 2' },
    ];

    const result = await client.sendList('whatsapp:+15551234567', 'Choose:', 'Pick one', 'Select', items);

    expect(mockCreate).toHaveBeenCalled();
    expect(result.sid).not.toBeNull();
    expect(result.status).toBe('queued');
  });

  it('handles send failure gracefully', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network error'));

    const result = await client.sendText('whatsapp:+15551234567', 'Hello');

    expect(result.sid).toBeNull();
    expect(result.status).toContain('error');
  });

  it('formats phone without whatsapp prefix in to param', async () => {
    await client.sendText('+15551234567', 'Hello');

    const call = mockCreate.mock.calls[0][0];
    expect(call.to).toBe('whatsapp:+15551234567');
  });
});
