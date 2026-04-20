import { describe, it, expect } from 'vitest';
import { parseTwilioInbound } from './webhook-parser.js';

describe('parseTwilioInbound', () => {
  it('parses text message payload', () => {
    const payload = {
      From: 'whatsapp:+15551234567',
      To: 'whatsapp:+11234567890',
      Body: 'Hello there',
      MessageSid: 'SM1234567890abcdef',
      MediaUrl0: '',
    };

    const result = parseTwilioInbound(payload);

    expect(result.from).toBe('+15551234567');
    expect(result.to).toBe('+11234567890');
    expect(result.body).toBe('Hello there');
    expect(result.sid).toBe('SM1234567890abcdef');
    expect(result.mediaUrl).toBeNull();
  });

  it('parses message without body', () => {
    const payload = {
      From: 'whatsapp:+15559876543',
      To: 'whatsapp:+11234567890',
      MessageSid: 'SM9876543210abcdef',
    };

    const result = parseTwilioInbound(payload);

    expect(result.from).toBe('+15559876543');
    expect(result.body).toBeNull();
  });

  it('parses media message with media URL', () => {
    const payload = {
      From: 'whatsapp:+15551111111',
      To: 'whatsapp:+11234567890',
      Body: '',
      MessageSid: 'SMmedia123456',
      MediaUrl0: 'https://example.com/image.jpg',
    };

    const result = parseTwilioInbound(payload);

    expect(result.from).toBe('+15551111111');
    expect(result.body).toBeNull();
    expect(result.mediaUrl).toBe('https://example.com/image.jpg');
  });

  it('normalizes whatsapp: prefix', () => {
    const payload = {
      From: 'whatsapp:+12125551234',
      To: 'whatsapp:+11234567890',
      Body: 'Test',
      MessageSid: 'SM123',
    };

    const result = parseTwilioInbound(payload);

    expect(result.from).not.toContain('whatsapp:');
    expect(result.to).not.toContain('whatsapp:');
    expect(result.from).toBe('+12125551234');
  });
});
