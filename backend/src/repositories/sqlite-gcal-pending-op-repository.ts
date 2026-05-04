import type Database from 'better-sqlite3';
import type { GCalPendingOp } from '../domain/entities.js';
import type { IGCalPendingOpRepository } from './gcal-pending-op-repository.interface.js';

export class SqliteGcalPendingOpRepository implements IGCalPendingOpRepository {
  private enqueueStmt: Database.Statement;
  private claimDueStmt: Database.Statement;
  private markFailedStmt: Database.Statement;
  private deleteStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.enqueueStmt = db.prepare(`
      INSERT INTO gcal_pending_ops (barber_id, appointment_id, op, payload_json, attempts, created_at)
      VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `);

    this.claimDueStmt = db.prepare(`
      SELECT * FROM gcal_pending_ops
      WHERE next_attempt_at IS NULL OR julianday(next_attempt_at) <= julianday(?)
      ORDER BY created_at ASC
      LIMIT ?
    `);

    this.markFailedStmt = db.prepare(`
      UPDATE gcal_pending_ops
      SET attempts = attempts + 1, last_error = ?, next_attempt_at = ?
      WHERE id = ?
    `);

    this.deleteStmt = db.prepare('DELETE FROM gcal_pending_ops WHERE id = ?');
  }

  async enqueue(op: {
    barber_id: number;
    appointment_id: number | null;
    op: 'insert' | 'patch' | 'delete';
    payload_json: string;
  }): Promise<number> {
    const res = this.enqueueStmt.run(op.barber_id, op.appointment_id ?? null, op.op, op.payload_json);
    return res.lastInsertRowid as number;
  }

  async claimDue(now: string, limit: number): Promise<GCalPendingOp[]> {
    const rows = this.claimDueStmt.all(now, limit) as GCalPendingOp[];
    return rows;
  }

  async markFailed(id: number, error: string, nextAttemptAt: string): Promise<void> {
    this.markFailedStmt.run(error, nextAttemptAt, id);
  }

  async delete(id: number): Promise<void> {
    this.deleteStmt.run(id);
  }
}
