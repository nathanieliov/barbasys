import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL || (process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(__dirname, '../barbasys.db'));

const db: Database.Database = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS barbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fullname TEXT,
    slug TEXT UNIQUE,
    payment_model TEXT DEFAULT 'COMMISSION' CHECK(payment_model IN ('COMMISSION', 'FIXED', 'FIXED_FEE')),
    service_commission_rate REAL DEFAULT 0.5,
    product_commission_rate REAL DEFAULT 0.1,
    fixed_amount REAL,
    fixed_period TEXT CHECK(fixed_period IN ('MONTHLY', 'WEEKLY', 'BIWEEKLY')),
    shop_id INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    lead_time_days INTEGER DEFAULT 7,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0 CHECK(stock >= 0),
    min_stock_threshold INTEGER DEFAULT 2,
    supplier_id INTEGER,
    shop_id INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stock_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    change_amount INTEGER NOT NULL,
    type TEXT CHECK(type IN ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN')),
    reference_id INTEGER,
    reason TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    shop_id INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    birthday DATE,
    last_visit DATETIME,
    notes TEXT,
    tags TEXT, -- Comma-separated tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    fullname TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('OWNER', 'MANAGER', 'BARBER', 'CUSTOMER')),
    barber_id INTEGER,
    customer_id INTEGER,
    shop_id INTEGER,
    otp_code TEXT,
    otp_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER,
    customer_id INTEGER,
    total_amount REAL NOT NULL,
    tip_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    customer_email TEXT,
    customer_phone TEXT,
    barber_name TEXT, -- SNAPSHOT: Name of the barber at time of sale
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    shop_id INTEGER,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    item_id INTEGER,
    item_name TEXT, -- SNAPSHOT: Name of service/product at time of sale
    type TEXT CHECK(type IN ('service', 'product')),
    price REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER,
    customer_id INTEGER,
    service_id INTEGER, -- Primary service (for backwards compatibility)
    start_time DATETIME NOT NULL,
    total_duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'scheduled',
    reminder_sent INTEGER DEFAULT 0,
    recurring_id TEXT,
    recurring_rule TEXT,
    shop_id INTEGER,
    notes TEXT,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER,
    service_id INTEGER,
    quantity INTEGER DEFAULT 1,
    price_at_booking REAL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS barber_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0 (Sunday) to 6 (Saturday)
    start_time TEXT NOT NULL, -- "09:00"
    end_time TEXT NOT NULL, -- "17:00"
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS barber_time_off (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    reason TEXT,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shop_settings (
    shop_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (shop_id, key),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- Rent, Utilities, Supplies, Marketing, Other
    amount REAL NOT NULL,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    shop_id INTEGER,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );
`);

// 1. Ensure shops exist first (needed for defaultShopId and migrations)
const shopsCount = db.prepare('SELECT count(*) as count FROM shops').get() as { count: number };
if (shopsCount.count === 0) {
  db.prepare('INSERT INTO shops (name, address) VALUES (?, ?)').run('Main Street Shop', '123 Main St');
  db.prepare('INSERT INTO shops (name, address) VALUES (?, ?)').run('Downtown Studio', '456 Center Ave');
}
const defaultShopId = (db.prepare('SELECT id FROM shops LIMIT 1').get() as { id: number }).id;

// 2. Migration for existing databases
try {
  const usersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string };
  if (usersSchema && !usersSchema.sql.includes('CUSTOMER')) {
    console.log('🔄 Migrating users table to support CUSTOMER role...');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          fullname TEXT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('OWNER', 'MANAGER', 'BARBER', 'CUSTOMER')),
          barber_id INTEGER,
          customer_id INTEGER,
          shop_id INTEGER,
          otp_code TEXT,
          otp_expires DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
          FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL
        )
      `);
      db.exec(`
        INSERT INTO users_new (id, username, fullname, email, password_hash, role, barber_id, customer_id, shop_id, otp_code, otp_expires, created_at)
        SELECT id, username, fullname, email, password_hash, role, barber_id, customer_id, shop_id, otp_code, otp_expires, created_at FROM users
      `);
      db.exec('DROP TABLE users');
      db.exec('ALTER TABLE users_new RENAME TO users');
    })();
    console.log('✅ Users table migrated successfully.');
  }
} catch (e) {
  console.error('Migration error:', e);
}

try {
  const barbersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='barbers'").get() as { sql: string };
  if (barbersSchema && !barbersSchema.sql.includes('FIXED_FEE')) {
    console.log('🔄 Migrating barbers table to support FIXED_FEE model...');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE barbers_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          fullname TEXT,
          slug TEXT UNIQUE,
          payment_model TEXT DEFAULT 'COMMISSION' CHECK(payment_model IN ('COMMISSION', 'FIXED', 'FIXED_FEE')),
          service_commission_rate REAL DEFAULT 0.5,
          product_commission_rate REAL DEFAULT 0.1,
          fixed_amount REAL,
          fixed_period TEXT CHECK(fixed_period IN ('MONTHLY', 'WEEKLY', 'BIWEEKLY')),
          shop_id INTEGER,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
        )
      `);
      // We need to check which columns exist before copying to be safe
      const info = db.prepare("PRAGMA table_info(barbers)").all() as any[];
      const cols = info.map(c => c.name).filter(c => ['id', 'name', 'fullname', 'slug', 'payment_model', 'service_commission_rate', 'product_commission_rate', 'fixed_amount', 'fixed_period', 'shop_id', 'is_active'].includes(c));
      const colList = cols.join(', ');
      db.exec(`INSERT INTO barbers_new (${colList}) SELECT ${colList} FROM barbers`);
      db.exec('DROP TABLE barbers');
      db.exec('ALTER TABLE barbers_new RENAME TO barbers');
    })();
    console.log('✅ Barbers table migrated successfully.');
  }
} catch (e) {
  console.error('Barbers migration error:', e);
}

try { db.exec('ALTER TABLE barbers ADD COLUMN fixed_amount REAL'); } catch (e) {}
try { db.exec('ALTER TABLE barbers ADD COLUMN fixed_period TEXT CHECK(fixed_period IN (\'MONTHLY\', \'WEEKLY\', \'BIWEEKLY\'))'); } catch (e) {}
try { db.exec('ALTER TABLE barbers ADD COLUMN slug TEXT'); } catch (e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_barbers_slug ON barbers(slug)'); } catch (e) {}
try { db.exec('ALTER TABLE customers ADD COLUMN birthday DATE'); } catch (e) {}
try { db.exec('ALTER TABLE barbers ADD COLUMN is_active INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE barbers ADD COLUMN fullname TEXT'); } catch (e) {}
try { db.exec('UPDATE barbers SET fullname = name WHERE fullname IS NULL'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN role TEXT CHECK(role IN (\'OWNER\', \'MANAGER\', \'BARBER\', \'CUSTOMER\'))'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN customer_id INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN otp_code TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN otp_expires DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN fullname TEXT'); } catch (e) {}
try { db.exec('UPDATE users SET fullname = username WHERE fullname IS NULL'); } catch (e) {}
try { db.exec('ALTER TABLE appointments ADD COLUMN notes TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE services ADD COLUMN is_active INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE suppliers ADD COLUMN is_active INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE suppliers ADD COLUMN shop_id INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN barber_name TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN tax_amount REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE sale_items ADD COLUMN item_name TEXT'); } catch (e) {}

// 3. Migration for shop_settings to support multi-shop
try {
  const columns = db.prepare('PRAGMA table_info(shop_settings)').all();
  const hasShopId = columns.some((c: any) => c.name === 'shop_id');
  if (!hasShopId) {
    db.exec(`
      ALTER TABLE shop_settings RENAME TO shop_settings_old;
      CREATE TABLE shop_settings (
        shop_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (shop_id, key),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      );
      INSERT INTO shop_settings (shop_id, key, value)
      SELECT ${defaultShopId}, key, value FROM shop_settings_old;
      DROP TABLE shop_settings_old;
    `);
  }
} catch (e) {}

// Backfill snapshotted names for existing sales
try {
  db.exec(`
    UPDATE sales 
    SET barber_name = (SELECT name FROM barbers WHERE barbers.id = sales.barber_id)
    WHERE barber_name IS NULL AND barber_id IS NOT NULL;
    
    UPDATE sale_items
    SET item_name = (SELECT name FROM services WHERE services.id = sale_items.item_id)
    WHERE item_name IS NULL AND type = 'service';
    
    UPDATE sale_items
    SET item_name = (SELECT name FROM products WHERE products.id = sale_items.item_id)
    WHERE item_name IS NULL AND type = 'product';
  `);
} catch (e) {}

const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync('admin123', salt);

// 1. Seed Barbers FIRST (so they can be linked to users)
const barbersCount = db.prepare('SELECT count(*) as count FROM barbers').get() as { count: number };
if (barbersCount.count === 0) {
  const nathaniel = db.prepare('INSERT INTO barbers (name, fullname, service_commission_rate, product_commission_rate, shop_id) VALUES (?, ?, ?, ?, ?)').run('Nathaniel', 'Nathaniel Calderon', 0.6, 0.15, defaultShopId);
  const alex = db.prepare('INSERT INTO barbers (name, fullname, service_commission_rate, product_commission_rate, shop_id) VALUES (?, ?, ?, ?, ?)').run('Alex', 'Alex Rivera', 0.5, 0.10, defaultShopId);
  
  // Seed all-week shifts (0-6)
  const shiftInsert = db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
  [0, 1, 2, 3, 4, 5, 6].forEach(day => {
    shiftInsert.run(nathaniel.lastInsertRowid, day, '09:00', '21:00');
    shiftInsert.run(alex.lastInsertRowid, day, '09:00', '21:00');
  });

  db.prepare('INSERT INTO services (name, price, duration_minutes, shop_id) VALUES (?, ?, ?, ?)').run('Haircut', 25, 30, defaultShopId);
  db.prepare('INSERT INTO services (name, price, duration_minutes, shop_id) VALUES (?, ?, ?, ?)').run('Beard Trim', 15, 15, defaultShopId);
  
  db.prepare('INSERT INTO products (name, price, stock, min_stock_threshold, shop_id) VALUES (?, ?, ?, ?, ?)').run('Pomade', 18, 10, 3, defaultShopId);
  db.prepare('INSERT INTO products (name, price, stock, min_stock_threshold, shop_id) VALUES (?, ?, ?, ?, ?)').run('Shampoo', 12, 5, 2, defaultShopId);
}

// 2. Seed Users
// Seed OWNER
db.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, role, shop_id) VALUES (?, ?, ?, ?, ?)').run('admin', 'admin@barbasys.com', passwordHash, 'OWNER', defaultShopId);

// Seed MANAGER
db.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, role, shop_id) VALUES (?, ?, ?, ?, ?)').run('manager', 'manager@barbasys.com', passwordHash, 'MANAGER', defaultShopId);

// Seed BARBER (linked to Nathaniel)
let barberToLink = db.prepare('SELECT id FROM barbers WHERE name = ?').get('Nathaniel') as { id: number };
if (!barberToLink) {
  barberToLink = db.prepare('SELECT id FROM barbers LIMIT 1').get() as { id: number };
}

if (barberToLink) {
  db.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, role, barber_id, shop_id) VALUES (?, ?, ?, ?, ?, ?)').run('barber', 'barber@barbasys.com', passwordHash, 'BARBER', barberToLink.id, defaultShopId);
  // Also seed a user specifically named Nathaniel for testing
  db.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, role, barber_id, shop_id) VALUES (?, ?, ?, ?, ?, ?)').run('Nathaniel', 'nathaniel.calderon@gmail.com', passwordHash, 'BARBER', barberToLink.id, defaultShopId);
}

export default db;
