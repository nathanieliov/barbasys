import { describe, it, expect, beforeEach } from 'vitest';
import { FakeTwilioClient, fakeTwilioOutbox } from './fake-twilio-client.js';

describe('FakeTwilioClient', () => {
  beforeEach(() => fakeTwilioOutbox.clear());

  it('records sendText calls', async () => {
    const client = new FakeTwilioClient();
    const res = await client.sendText('whatsapp:+18095550100', 'hi');
    expect(res).toEqual({ sid: expect.stringMatching(/^FAKE-/), status: 'queued' });
    expect(fakeTwilioOutbox.messages).toHaveLength(1);
    expect(fakeTwilioOutbox.messages[0]).toMatchObject({
      to: 'whatsapp:+18095550100',
      body: 'hi',
      kind: 'text',
    });
  });

  it('records sendList calls with items', async () => {
    const client = new FakeTwilioClient();
    await client.sendList('whatsapp:+1', 'H', 'B', 'Pick', [{ id: '1', title: 'A' }]);
    expect(fakeTwilioOutbox.messages[0]).toMatchObject({
      kind: 'list',
      items: [{ id: '1', title: 'A' }],
    });
  });

  it('clear() resets the outbox', async () => {
    const client = new FakeTwilioClient();
    await client.sendText('to', 'body');
    fakeTwilioOutbox.clear();
    expect(fakeTwilioOutbox.messages).toHaveLength(0);
  });
});
