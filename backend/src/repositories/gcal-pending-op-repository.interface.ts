import type { GCalPendingOp } from '../domain/entities.js';

export interface IGCalPendingOpRepository {
  enqueue(op: { barber_id: number; appointment_id: number | null; op: 'insert' | 'patch' | 'delete'; payload_json: string }): Promise<number>;
  claimDue(now: string, limit: number): Promise<GCalPendingOp[]>;
  markFailed(id: number, error: string, nextAttemptAt: string): Promise<void>;
  delete(id: number): Promise<void>;
}
