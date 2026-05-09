import path from 'path';
import Database from 'better-sqlite3';

const TEST_DB = path.resolve(__dirname, '../../data/test.db');

export function openTestDb() {
  const db = new Database(TEST_DB, { readonly: false });
  db.pragma('foreign_keys = ON');
  return db;
}

export function getOtpCode(email: string): string | null {
  const db = openTestDb();
  const row = db.prepare('SELECT otp_code FROM users WHERE email = ?').get(email) as { otp_code: string | null } | undefined;
  db.close();
  return row?.otp_code ?? null;
}

export function countAppointments(filters: { barber_id?: number; status?: string } = {}): number {
  const db = openTestDb();
  let q = 'SELECT COUNT(*) as n FROM appointments WHERE 1=1';
  const args: unknown[] = [];
  if (filters.barber_id !== undefined) { q += ' AND barber_id = ?'; args.push(filters.barber_id); }
  if (filters.status) { q += ' AND status = ?'; args.push(filters.status); }
  const row = db.prepare(q).get(...args) as { n: number };
  db.close();
  return row.n;
}

export function getBarberIdBySlug(slug: string): number {
  const db = openTestDb();
  const row = db.prepare('SELECT id FROM barbers WHERE slug = ?').get(slug) as { id: number };
  db.close();
  return row.id;
}

export function getShopIdByName(name: string): number {
  const db = openTestDb();
  const row = db.prepare('SELECT id FROM shops WHERE name = ?').get(name) as { id: number };
  db.close();
  return row.id;
}
