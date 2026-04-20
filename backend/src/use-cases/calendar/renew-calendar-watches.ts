import type { Database } from 'better-sqlite3';
import type { IGCalClient } from '../../adapters/google-calendar/gcal-client.interface.js';

interface BarberWithWatch {
  id: number;
  name: string;
  gcal_channel_id: string;
  gcal_resource_id: string;
  gcal_watch_expires_at: string;
}

export async function renewCalendarWatches(db: Database, gCalClient: IGCalClient, shopId: number): Promise<{ renewed: number; failed: number }> {
  const now = new Date();
  const barbersWithExpiring = db.prepare(
    'SELECT id, name, gcal_channel_id, gcal_resource_id, gcal_watch_expires_at FROM barbers WHERE shop_id = ? AND gcal_channel_id IS NOT NULL AND gcal_watch_expires_at IS NOT NULL'
  ).all(shopId) as BarberWithWatch[];

  let renewed = 0;
  let failed = 0;

  for (const barber of barbersWithExpiring) {
    const expiresAt = new Date(barber.gcal_watch_expires_at);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

    // Renew if expiring within 24 hours
    if (hoursUntilExpiry < 24) {
      try {
        // Stop old watch
        await gCalClient.stopWatch(barber.id, barber.gcal_channel_id, barber.gcal_resource_id);

        // Start new watch
        const webhookUrl = process.env.CALENDAR_WEBHOOK_URL || 'https://api.barbasys.com/webhooks/calendar';
        const watchResponse = await gCalClient.watch(barber.id, webhookUrl);

        // Update barber with new credentials
        db.prepare(
          'UPDATE barbers SET gcal_channel_id = ?, gcal_resource_id = ?, gcal_watch_expires_at = ? WHERE id = ?'
        ).run(watchResponse.channelId, watchResponse.resourceId, new Date(watchResponse.expiresAt).toISOString(), barber.id);

        renewed++;
        console.log(`[Calendar] Watch renewed for barber ${barber.name} (${barber.id})`);
      } catch (err) {
        failed++;
        console.error(`[Calendar] Failed to renew watch for barber ${barber.name}:`, err);
      }
    }
  }

  console.log(`[Calendar] Watch renewal complete: ${renewed} renewed, ${failed} failed`);
  return { renewed, failed };
}
