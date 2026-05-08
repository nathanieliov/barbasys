import { IWhatsAppClient } from './whatsapp-client.interface.js';

export interface FakeTwilioMessage {
  to: string;
  body: string;
  kind: 'text' | 'list';
  header?: string;
  buttonText?: string;
  items?: Array<{ id: string; title: string }>;
  timestamp: string;
}

class FakeTwilioOutbox {
  messages: FakeTwilioMessage[] = [];
  clear() { this.messages = []; }
  byPhone(to: string) { return this.messages.filter(m => m.to === to); }
}

export const fakeTwilioOutbox = new FakeTwilioOutbox();

let counter = 0;

export class FakeTwilioClient implements IWhatsAppClient {
  async sendText(to: string, body: string) {
    fakeTwilioOutbox.messages.push({ to, body, kind: 'text', timestamp: new Date().toISOString() });
    return { sid: `FAKE-${++counter}`, status: 'queued' };
  }

  async sendList(to: string, header: string, body: string, buttonText: string, items: Array<{ id: string; title: string }>) {
    fakeTwilioOutbox.messages.push({ to, body, kind: 'list', header, buttonText, items, timestamp: new Date().toISOString() });
    return { sid: `FAKE-${++counter}`, status: 'queued' };
  }
}
