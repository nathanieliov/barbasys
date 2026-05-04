import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyTwilioSignature } from './signature-verifier.js';

function generateTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  let data = url;
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  return createHmac('sha1', authToken).update(data).digest('base64');
}

describe('verifyTwilioSignature', () => {
  const authToken = 'test_auth_token_12345';
  const baseUrl = 'https://myapp.example.com/webhooks/whatsapp';
  const params = { From: 'whatsapp:+11234567890', Body: 'Hello' };

  it('accepts valid Twilio signature', () => {
    const signature = generateTwilioSignature(authToken, baseUrl, params);
    const result = verifyTwilioSignature({
      authToken,
      signature,
      url: baseUrl,
      params,
    });
    expect(result).toBe(true);
  });

  it('rejects invalid signature', () => {
    const result = verifyTwilioSignature({
      authToken,
      signature: 'invalid_signature_xyz',
      url: baseUrl,
      params,
    });
    expect(result).toBe(false);
  });

  it('rejects when params modified', () => {
    const signature = generateTwilioSignature(authToken, baseUrl, params);
    const modifiedParams = { ...params, Body: 'Modified' };
    const result = verifyTwilioSignature({
      authToken,
      signature,
      url: baseUrl,
      params: modifiedParams,
    });
    expect(result).toBe(false);
  });
});
