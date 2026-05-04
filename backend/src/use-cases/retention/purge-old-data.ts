import type { Database } from 'better-sqlite3';

export async function purgeOldData(db: Database, days: number): Promise<{ deletedConversations: number; deletedMessages: number }> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Delete messages older than cutoff date
  const deletedMsgs = db.prepare(
    'DELETE FROM wa_messages WHERE created_at < ?'
  ).run(cutoffDate).changes;

  // Delete conversations older than cutoff date (cascade will delete associated messages)
  const deletedConvs = db.prepare(
    'DELETE FROM conversations WHERE created_at < ?'
  ).run(cutoffDate).changes;

  console.log(`[Retention] Deleted ${deletedMsgs} messages and ${deletedConvs} conversations older than ${days} days`);

  return { deletedConversations: deletedConvs, deletedMessages: deletedMsgs };
}
