import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import { SqliteGcalPendingOpRepository } from './sqlite-gcal-pending-op-repository.js';

describe('SqliteGcalPendingOpRepository', () => {
  const repo = new SqliteGcalPendingOpRepository(db);

  let barberId1: number;
  let barberId2: number;

  beforeAll(() => {
    // Create in proper order with FK constraints ON
    const shopRes = db.prepare(
      `INSERT INTO shops (name, phone) VALUES (?, ?)`
    ).run('Test Shop GCal', '+18095551234');
    const shopId = shopRes.lastInsertRowid as number;

    const barber1Res = db.prepare(
      `INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('Barber1', 'Barber One', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId1 = barber1Res.lastInsertRowid as number;

    const barber2Res = db.prepare(
      `INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('Barber2', 'Barber Two', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId2 = barber2Res.lastInsertRowid as number;
  });

  it('verifies barbers exist', () => {
    const b1 = db.prepare('SELECT id FROM barbers WHERE id = ?').get(barberId1);
    const b2 = db.prepare('SELECT id FROM barbers WHERE id = ?').get(barberId2);
    expect(b1).toBeDefined();
    expect(b2).toBeDefined();
  });

  it('enqueues a pending operation', async () => {
    const id = await repo.enqueue({
      barber_id: barberId1,
      appointment_id: null,
      op: 'insert',
      payload_json: '{"summary":"Haircut"}',
    });
    expect(id).toBeGreaterThan(0);
  });

  it('claims due operations', async () => {
    const now = new Date().toISOString();
    await repo.enqueue({
      barber_id: barberId1,
      appointment_id: null,
      op: 'insert',
      payload_json: '{"summary":"Fade"}',
    });
    await repo.enqueue({
      barber_id: barberId2,
      appointment_id: null,
      op: 'patch',
      payload_json: '{"summary":"Trim"}',
    });

    const due = await repo.claimDue(now, 10);
    expect(due.length).toBeGreaterThanOrEqual(2);
    expect(due[0].op).toMatch(/insert|patch|delete/);
  });

  it('marks operation as failed and increments attempts', async () => {
    const id = await repo.enqueue({
      barber_id: barberId1,
      appointment_id: null,
      op: 'delete',
      payload_json: '{}',
    });

    const pastTime = new Date(Date.now() - 10000).toISOString();
    await repo.markFailed(id, 'Connection timeout', pastTime);

    const due = await repo.claimDue(new Date().toISOString(), 10);
    const op = due.find((o) => o.id === id);
    expect(op).toBeDefined();
    expect(op?.attempts).toBe(1);
    expect(op?.last_error).toContain('timeout');
  });

  it('deletes a pending operation', async () => {
    const id = await repo.enqueue({
      barber_id: barberId1,
      appointment_id: null,
      op: 'insert',
      payload_json: '{}',
    });

    await repo.delete(id);

    const due = await repo.claimDue(new Date().toISOString(), 100);
    const deleted = due.find((o) => o.id === id);
    expect(deleted).toBeUndefined();
  });
});
