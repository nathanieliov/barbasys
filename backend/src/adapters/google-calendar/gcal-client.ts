import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { IGCalClient, BusySlot, CalendarEvent, WatchResponse } from './gcal-client.interface.js';
import { TokenCipher } from './token-cipher.js';
import db from '../../db.js';

export class GoogleCalendarClient implements IGCalClient {
  private cipher: TokenCipher;
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string, tokenCipherKey: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.cipher = new TokenCipher(tokenCipherKey);
  }

  private getOAuth2Client(refreshTokenEnc: string): OAuth2Client {
    const refreshToken = this.cipher.decrypt(refreshTokenEnc);
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      process.env.GCAL_REDIRECT_URI || 'http://localhost:3000/callback'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  }

  private getBarberToken(barberId: number): string {
    const barber = db.prepare('SELECT gcal_token_enc FROM barbers WHERE id = ?').get(barberId) as any;
    if (!barber?.gcal_token_enc) {
      throw new Error(`Barber ${barberId} has no Google Calendar token`);
    }
    return barber.gcal_token_enc;
  }

  async freebusy(barberId: number, timeMin: string, timeMax: string): Promise<BusySlot[]> {
    const refreshTokenEnc = this.getBarberToken(barberId);
    const oauth2Client = this.getOAuth2Client(refreshTokenEnc);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      },
    });

    const busyTimes = response.data.calendars?.primary?.busy || [];
    return busyTimes.map(slot => ({
      start: slot.start || '',
      end: slot.end || '',
    }));
  }

  async insertEvent(barberId: number, event: CalendarEvent): Promise<string> {
    const refreshTokenEnc = this.getBarberToken(barberId);
    const oauth2Client = this.getOAuth2Client(refreshTokenEnc);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        start: { dateTime: event.startIso },
        end: { dateTime: event.endIso },
      },
    });

    return response.data.id || '';
  }

  async patchEvent(barberId: number, eventId: string, patch: Partial<CalendarEvent>): Promise<void> {
    const refreshTokenEnc = this.getBarberToken(barberId);
    const oauth2Client = this.getOAuth2Client(refreshTokenEnc);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const updateBody: any = {};
    if (patch.summary) updateBody.summary = patch.summary;
    if (patch.startIso) updateBody.start = { dateTime: patch.startIso };
    if (patch.endIso) updateBody.end = { dateTime: patch.endIso };

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: updateBody,
    });
  }

  async deleteEvent(barberId: number, eventId: string): Promise<void> {
    const refreshTokenEnc = this.getBarberToken(barberId);
    const oauth2Client = this.getOAuth2Client(refreshTokenEnc);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }

  async watch(barberId: number, webhookUrl: string): Promise<WatchResponse> {
    const refreshTokenEnc = this.getBarberToken(barberId);
    const oauth2Client = this.getOAuth2Client(refreshTokenEnc);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: `barber-${barberId}-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
      },
    });

    return {
      channelId: response.data.id || '',
      resourceId: response.data.resourceId || '',
      expiresAt: parseInt(response.data.expiration || '0') || Date.now() + 86400000,
    };
  }

  async stopWatch(barberId: number, channelId: string, resourceId: string): Promise<void> {
    const refreshTokenEnc = this.getBarberToken(barberId);
    const oauth2Client = this.getOAuth2Client(refreshTokenEnc);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.channels.stop({ requestBody: { id: channelId, resourceId } });
  }
}
