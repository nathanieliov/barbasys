import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';

const repoRoot = path.resolve(__dirname, '../..');
const TEST_DB = path.join(repoRoot, 'data/test.db');

export const TEST_USERS = {
  OWNER:    { username: 'owner',    email: 'owner@test.local',    password: 'TestPass123!' },
  MANAGER:  { username: 'manager',  email: 'manager@test.local',  password: 'TestPass123!' },
  BARBER:   { username: 'ramon',    email: 'ramon@test.local',    password: 'TestPass123!' },
  CUSTOMER: { username: 'customer', email: 'customer@test.local', password: 'TestPass123!', phone: '+18095550100' },
};

export const TEST_DATA = {
  shopAName: 'Barbería Test',
  shopBName: 'Barbería Test 2',
};

export default async function globalSetup() {
  // 1. Wipe the test DB file
  fs.mkdirSync(path.dirname(TEST_DB), { recursive: true });
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  fs.mkdirSync(path.join(repoRoot, 'e2e/.auth'), { recursive: true });

  // 2. Initialize schema by spawning a child process that imports backend's db module.
  // The child sets DB_PATH to the test DB and lets db.ts run all schema/migrations.
  const { spawnSync } = await import('child_process');
  const result = spawnSync('npx', ['tsx', '-e', `
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = ${JSON.stringify(TEST_DB)};
    import('./backend/src/db.js').then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  `], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Failed to initialize test DB schema');

  // 3. Connect, wipe any auto-seed, insert deterministic data
  const db = new Database(TEST_DB);
  db.pragma('foreign_keys = ON');

  const tables = ['wa_messages', 'conversations', 'sale_items', 'sales', 'appointment_items',
    'appointments', 'barber_shifts', 'barber_time_off', 'shop_settings', 'expenses',
    'stock_logs', 'products', 'services', 'users', 'customers', 'barbers', 'suppliers', 'shops'];
  db.transaction(() => {
    for (const t of tables) {
      try { db.prepare(`DELETE FROM ${t}`).run(); } catch {}
    }
  })();

  const passwordHash = bcrypt.hashSync('TestPass123!', 10);

  db.transaction(() => {
    // Shops
    const shopA = Number(db.prepare('INSERT INTO shops (name, address) VALUES (?, ?)').run(TEST_DATA.shopAName, '1 Test St').lastInsertRowid);
    const shopB = Number(db.prepare('INSERT INTO shops (name, address) VALUES (?, ?)').run(TEST_DATA.shopBName, '2 Test Ave').lastInsertRowid);

    // shop_settings on both shops
    const ins = db.prepare('INSERT INTO shop_settings (shop_id, key, value) VALUES (?, ?, ?)');
    for (const [k, v] of [['open_time', '09:00'], ['close_time', '18:00'], ['currency_symbol', '$'], ['default_tax_rate', '0'], ['locale', 'es-DO']] as const) {
      ins.run(shopA, k, v);
      ins.run(shopB, k, v);
    }

    // Barbers in Shop A
    const ramonId = Number(db.prepare(
      'INSERT INTO barbers (name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    ).run('Ramon', 'Ramón Pérez', 'ramon', 'COMMISSION', 0.6, 0.15, shopA).lastInsertRowid);
    const luisId = Number(db.prepare(
      'INSERT INTO barbers (name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    ).run('Luis', 'Luis Gómez', 'luis', 'COMMISSION', 0.5, 0.10, shopA).lastInsertRowid);

    // Mon-Fri shifts for ramon and luis
    const shift = db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
    for (const bId of [ramonId, luisId]) {
      for (let d = 1; d <= 5; d++) shift.run(bId, d, '09:00', '17:00');
    }

    // One barber in Shop B
    db.prepare('INSERT INTO barbers (name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run('Pedro', 'Pedro García', 'pedro', 'COMMISSION', 0.5, 0.10, shopB);

    // Services in Shop A
    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Haircut', 'Standard haircut', 25, 30, shopA);
    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Beard Trim', 'Beard service', 15, 20, shopA);
    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Combo', 'Haircut + beard', 35, 45, shopA);

    // Service in Shop B
    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Shop B Cut', 'Shop B haircut', 30, 30, shopB);

    // Products in Shop A
    db.prepare('INSERT INTO products (name, description, price, stock, min_stock_threshold, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run('Pomade', 'Strong hold', 12, 10, 3, shopA);
    db.prepare('INSERT INTO products (name, description, price, stock, min_stock_threshold, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run('Shampoo', 'Cleansing', 18, 2, 3, shopA);

    // Customers — one per staff/customer user. /auth/me auto-creates a customer
    // record for any logged-in user that lacks one; pre-seeding linked customers
    // keeps that endpoint deterministic (no concurrent INSERT race) under E2E load.
    // The CUSTOMER row also opts-in to WhatsApp and has a recent inbound
    // conversation (within the 24h session window) so receipt sends route
    // through the WhatsApp client (E2E-10 asserts on the FakeTwilio outbox).
    const customerId = Number(db.prepare('INSERT INTO customers (name, email, phone, shop_id, wa_opt_in, wa_opt_in_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run('Test Customer', TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.phone, shopA, new Date().toISOString()).lastInsertRowid);
    db.prepare('INSERT INTO conversations (customer_id, wa_phone, language, state, last_inbound_at) VALUES (?, ?, ?, ?, ?)')
      .run(customerId, TEST_USERS.CUSTOMER.phone, 'es', 'idle', new Date().toISOString());
    const ownerCustomerId = Number(db.prepare('INSERT INTO customers (name, email, shop_id) VALUES (?, ?, ?)')
      .run('Test Owner', TEST_USERS.OWNER.email, shopA).lastInsertRowid);
    const managerCustomerId = Number(db.prepare('INSERT INTO customers (name, email, shop_id) VALUES (?, ?, ?)')
      .run('Test Manager', TEST_USERS.MANAGER.email, shopA).lastInsertRowid);
    const barberCustomerId = Number(db.prepare('INSERT INTO customers (name, email, shop_id) VALUES (?, ?, ?)')
      .run('Ramón Pérez', TEST_USERS.BARBER.email, shopA).lastInsertRowid);
    const ownerBCustomerId = Number(db.prepare('INSERT INTO customers (name, email, shop_id) VALUES (?, ?, ?)')
      .run('Test Owner B', 'owner-b@test.local', shopB).lastInsertRowid);

    // Users
    db.prepare('INSERT INTO users (username, email, password_hash, role, customer_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.OWNER.username, TEST_USERS.OWNER.email, passwordHash, 'OWNER', ownerCustomerId, shopA, 'Test Owner');
    db.prepare('INSERT INTO users (username, email, password_hash, role, customer_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.MANAGER.username, TEST_USERS.MANAGER.email, passwordHash, 'MANAGER', managerCustomerId, shopA, 'Test Manager');
    db.prepare('INSERT INTO users (username, email, password_hash, role, barber_id, customer_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.BARBER.username, TEST_USERS.BARBER.email, passwordHash, 'BARBER', ramonId, barberCustomerId, shopA, 'Ramón Pérez');
    db.prepare('INSERT INTO users (username, email, password_hash, role, customer_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.CUSTOMER.username, TEST_USERS.CUSTOMER.email, passwordHash, 'CUSTOMER', customerId, shopA, 'Test Customer');

    // OWNER for Shop B
    db.prepare('INSERT INTO users (username, email, password_hash, role, customer_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('owner_b', 'owner-b@test.local', passwordHash, 'OWNER', ownerBCustomerId, shopB, 'Test Owner B');
  })();

  db.close();
  console.log('[e2e] seed-test.ts: test DB ready at', TEST_DB);
}
