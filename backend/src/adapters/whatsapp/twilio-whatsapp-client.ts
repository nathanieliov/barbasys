import type { Twilio } from 'twilio';
import type { IWhatsAppClient } from './whatsapp-client.interface.js';

export class TwilioWhatsAppClient implements IWhatsAppClient {
  constructor(
    private twilioClient: Twilio,
    private fromNumber: string,
  ) {}

  private ensureWhatsAppPrefix(phone: string): string {
    return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  }

  async sendText(to: string, body: string): Promise<{ sid: string | null; status: string }> {
    try {
      const result = await this.twilioClient.messages.create({
        from: this.fromNumber,
        to: this.ensureWhatsAppPrefix(to),
        body,
      });
      return { sid: result.sid, status: 'queued' };
    } catch (e) {
      const err = e as { message?: string };
      return { sid: null, status: `error: ${err.message}` };
    }
  }

  async sendList(
    to: string,
    header: string,
    body: string,
    buttonText: string,
    items: Array<{ id: string; title: string }>,
  ): Promise<{ sid: string | null; status: string }> {
    try {
      const result = await this.twilioClient.messages.create({
        from: this.fromNumber,
        to: this.ensureWhatsAppPrefix(to),
        contentSid: undefined, // Use contentVariables for template OR construct body
        body,
        listItem: items.map((item) => ({
          id: item.id,
          title: item.title,
        })),
      } as any);
      return { sid: result.sid, status: 'queued' };
    } catch (e) {
      const err = e as { message?: string };
      return { sid: null, status: `error: ${err.message}` };
    }
  }
}
