import type { Database } from 'better-sqlite3';

export async function buildApp() {
  const dbModule = await import('../../src/db.js');
  const db = dbModule.default;

  // Reset all data tables (preserves schema)
  const tables = ['wa_messages', 'conversations', 'sale_items', 'sales', 'appointment_items',
    'appointments', 'barber_shifts', 'barber_time_off', 'shop_settings', 'expenses',
    'stock_logs', 'products', 'services', 'users', 'customers', 'barbers', 'suppliers', 'shops'];
  for (const t of tables) {
    try { db.prepare(`DELETE FROM ${t}`).run(); } catch {}
  }

  const indexModule = await import('../../src/index.js');
  return { db, app: indexModule.default };
}

// Helper to seed a minimal shop + owner for tests that need auth
export async function seedMinimalShop(db: Database) {
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const shop = db.prepare('INSERT INTO shops (name) VALUES (?)').run('Test Shop');
  const shopId = Number(shop.lastInsertRowid);
  const user = db.prepare(
    'INSERT INTO users (username, email, password_hash, role, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('owner', 'owner@test.local', passwordHash, 'OWNER', shopId, 'Test Owner');
  return { shopId, ownerId: Number(user.lastInsertRowid), passwordHash };
}
