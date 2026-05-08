import { beforeEach } from 'vitest';

// Force NODE_ENV=test BEFORE importing db.ts so we get :memory:
process.env.NODE_ENV = 'test';
process.env.FAKE_TWILIO = '1';
process.env.FAKE_LLM = '1';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.DB_PATH = '';  // unset any leaked override

// Lazy import so env vars are set first
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

  // Import the app AFTER env vars are set
  const indexModule = await import('../../src/index.js');
  return { db, app: indexModule.default };
}

// Helper to seed a minimal shop + owner for tests that need auth
export async function seedMinimalShop(db: any) {
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const shop = db.prepare('INSERT INTO shops (name) VALUES (?)').run('Test Shop');
  const shopId = Number(shop.lastInsertRowid);
  const user = db.prepare(
    'INSERT INTO users (username, email, password_hash, role, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('owner', 'owner@test.local', passwordHash, 'OWNER', shopId, 'Test Owner');
  return { shopId, ownerId: Number(user.lastInsertRowid), passwordHash };
}
