import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { TokenCipher } from './token-cipher.js';

export class GCalOAuthFlow {
  private oauth2Client: OAuth2Client;
  private cipher: TokenCipher;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenCipherKey: string
  ) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this.cipher = new TokenCipher(tokenCipherKey);
  }

  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state,
    });
  }

  async exchangeCode(code: string): Promise<{ refreshTokenEnc: string }> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error('No refresh token received from Google');
    }

    const refreshTokenEnc = this.cipher.encrypt(tokens.refresh_token);

    return { refreshTokenEnc };
  }
}
