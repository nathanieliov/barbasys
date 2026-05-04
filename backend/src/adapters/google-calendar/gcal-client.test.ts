import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../db.js';
import { GoogleCalendarClient } from './gcal-client.js';
import { TokenCipher } from './token-cipher.js';

describe('GoogleCalendarClient', () => {
  const clientId = 'test_client_id';
  const clientSecret = 'test_client_secret';
  const cipherKey = 'd'.repeat(64);

  let barberId: number;
  let encryptedToken: string;

  beforeAll(() => {
    const shop = db
      .prepare('INSERT INTO shops (name, phone) VALUES (?, ?)')
      .run('Test Shop', '+15551234567');
    const shopId = shop.lastInsertRowid as number;

    const cipher = new TokenCipher(cipherKey);
    encryptedToken = cipher.encrypt('refresh_token_from_google');

    const barber = db
      .prepare(
        'INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active, gcal_token_enc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run('Carlos', 'Carlos Mendez', 'COMMISSION', 0.2, 0.15, shopId, 1, encryptedToken);
    barberId = barber.lastInsertRowid as number;
  });

  it('initializes with valid credentials', () => {
    const client = new GoogleCalendarClient(clientId, clientSecret, cipherKey);
    expect(client).toBeDefined();
  });

  it('throws error if barber has no calendar token', async () => {
    const client = new GoogleCalendarClient(clientId, clientSecret, cipherKey);

    const shop = db
      .prepare('INSERT INTO shops (name, phone) VALUES (?, ?)')
      .run('Test Shop 2', '+15551234568');
    const shopId = shop.lastInsertRowid as number;

    const barberNoToken = db
      .prepare(
        'INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run('Juan', 'Juan Lopez', 'COMMISSION', 0.2, 0.15, shopId, 1);
    const barberNoTokenId = barberNoToken.lastInsertRowid as number;

    await expect(
      client.freebusy(barberNoTokenId, '2026-04-20T00:00:00Z', '2026-04-21T00:00:00Z')
    ).rejects.toThrow('has no Google Calendar token');
  });

  it('methods exist and are callable', () => {
    const client = new GoogleCalendarClient(clientId, clientSecret, cipherKey);

    expect(typeof client.freebusy).toBe('function');
    expect(typeof client.insertEvent).toBe('function');
    expect(typeof client.patchEvent).toBe('function');
    expect(typeof client.deleteEvent).toBe('function');
    expect(typeof client.watch).toBe('function');
  });

  it('correctly decrypts barber token', () => {
    const client = new GoogleCalendarClient(clientId, clientSecret, cipherKey);
    const cipher = new TokenCipher(cipherKey);

    const tokenFromDb = db
      .prepare('SELECT gcal_token_enc FROM barbers WHERE id = ?')
      .get(barberId) as any;
    const decrypted = cipher.decrypt(tokenFromDb.gcal_token_enc);

    expect(decrypted).toBe('refresh_token_from_google');
  });
});
