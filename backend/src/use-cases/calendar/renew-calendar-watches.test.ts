import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../db.js';
import { renewCalendarWatches } from './renew-calendar-watches.js';
import type { IGCalClient } from '../../adapters/google-calendar/gcal-client.interface.js';

describe('renewCalendarWatches', () => {
  let shopId: number;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop Cal', '+15551234560');
    shopId = shop.lastInsertRowid as number;
  });

  const createBarberWithWatch = (name: string, expiresAt: Date = new Date(Date.now() - 60000)) => {
    return db.prepare(
      'INSERT INTO barbers (name, shop_id, gcal_token_enc, gcal_channel_id, gcal_resource_id, gcal_watch_expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, shopId, 'encrypted_token', 'channel_' + name, 'resource_' + name, expiresAt.toISOString()).lastInsertRowid as number;
  };

  it('renews watch for barbers with expiring watches', async () => {
    const barberId = createBarberWithWatch('Test Barber 1');
    const mockGCalClient: IGCalClient = {
      freebusy: vi.fn(),
      insertEvent: vi.fn(),
      patchEvent: vi.fn(),
      deleteEvent: vi.fn(),
      watch: vi.fn().mockResolvedValue({
        channelId: 'new_channel_123',
        resourceId: 'new_resource_123',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      }),
      stopWatch: vi.fn()
    };

    await renewCalendarWatches(db, mockGCalClient, shopId);

    expect(mockGCalClient.stopWatch).toHaveBeenCalledWith(barberId, 'channel_Test Barber 1', 'resource_Test Barber 1');
    expect(mockGCalClient.watch).toHaveBeenCalledWith(barberId, expect.any(String));
  });

  it('updates barber with new watch credentials', async () => {
    const barberId = createBarberWithWatch('Test Barber 2');
    const mockGCalClient: IGCalClient = {
      freebusy: vi.fn(),
      insertEvent: vi.fn(),
      patchEvent: vi.fn(),
      deleteEvent: vi.fn(),
      watch: vi.fn().mockResolvedValue({
        channelId: 'new_channel_456',
        resourceId: 'new_resource_456',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      }),
      stopWatch: vi.fn()
    };

    await renewCalendarWatches(db, mockGCalClient, shopId);

    const updated = db.prepare('SELECT gcal_resource_id, gcal_channel_id FROM barbers WHERE id = ?').get(barberId) as any;
    expect(updated.gcal_resource_id).toBe('new_resource_456');
  });

  it('skips barbers without watch credentials', async () => {
    const barberNoWatch = db.prepare(
      'INSERT INTO barbers (name, shop_id) VALUES (?, ?)'
    ).run('No Watch Barber', shopId).lastInsertRowid as number;

    const mockGCalClient: IGCalClient = {
      freebusy: vi.fn(),
      insertEvent: vi.fn(),
      patchEvent: vi.fn(),
      deleteEvent: vi.fn(),
      watch: vi.fn(),
      stopWatch: vi.fn()
    };

    await renewCalendarWatches(db, mockGCalClient, shopId);

    expect(mockGCalClient.watch).not.toHaveBeenCalledWith('No Watch Barber', expect.any(String));
  });
});
