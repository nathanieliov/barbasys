import { describe, it, expect } from 'vitest';
import { GCalOAuthFlow } from './oauth-flow.js';

describe('GCalOAuthFlow', () => {
  const clientId = process.env.GCAL_CLIENT_ID || 'test_client_id';
  const clientSecret = process.env.GCAL_CLIENT_SECRET || 'test_client_secret';
  const redirectUri = 'http://localhost:3000/callback';
  const cipherKey = 'c'.repeat(64);

  it('initializes with valid credentials', () => {
    const flow = new GCalOAuthFlow(clientId, clientSecret, redirectUri, cipherKey);
    expect(flow).toBeDefined();
  });

  it('getAuthUrl returns a valid URL', () => {
    const flow = new GCalOAuthFlow(clientId, clientSecret, redirectUri, cipherKey);
    const state = 'random_state_123';
    const authUrl = flow.getAuthUrl(state);

    expect(authUrl).toBeDefined();
    expect(authUrl).toContain('client_id=' + encodeURIComponent(clientId));
    expect(authUrl).toContain('redirect_uri=' + encodeURIComponent(redirectUri));
    expect(authUrl).toContain('state=' + encodeURIComponent(state));
    expect(authUrl).toContain('scope=');
  });

  it('throws error if refresh token missing', async () => {
    const flow = new GCalOAuthFlow(clientId, clientSecret, redirectUri, cipherKey);

    await expect(flow.exchangeCode('invalid_code')).rejects.toThrow();
  });
});
