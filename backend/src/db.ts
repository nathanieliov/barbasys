import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(__dirname, '../barbasys.db');

const db: Database.Database = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS barbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    service_commission_rate REAL DEFAULT 0.5,
    product_commission_rate REAL DEFAULT 0.1
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0 CHECK(stock >= 0),
    min_stock_threshold INTEGER DEFAULT 2
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
    duration_minutes INTEGER DEFAULT 30
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    last_visit DATETIME,
    notes TEXT,
    tags TEXT, -- Comma-separated tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('OWNER', 'MANAGER', 'BARBER')),
    barber_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER,
    customer_id INTEGER,
    total_amount REAL NOT NULL,
    tip_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    customer_email TEXT, -- Keep for legacy/external tracking
    customer_phone TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    item_id INTEGER,
    type TEXT CHECK(type IN ('service', 'product')),
    price REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER,
    customer_id INTEGER,
    service_id INTEGER,
    start_time DATETIME NOT NULL,
    status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
    reminder_sent INTEGER DEFAULT 0,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
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
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Seed initial data
const settingsCount = db.prepare('SELECT count(*) as count FROM shop_settings').get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare('INSERT INTO shop_settings (key, value) VALUES (?, ?)').run('shop_name', 'BarbaSys');
}

const usersCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (usersCount.count === 0) {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('admin123', salt);
  db.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('admin', 'admin@barbasys.com', passwordHash, 'OWNER');
}

const barbersCount = db.prepare('SELECT count(*) as count FROM barbers').get() as { count: number };
if (barbersCount.count === 0) {
  const nathaniel = db.prepare('INSERT INTO barbers (name, service_commission_rate, product_commission_rate) VALUES (?, ?, ?)').run('Nathaniel', 0.6, 0.15);
  const alex = db.prepare('INSERT INTO barbers (name, service_commission_rate, product_commission_rate) VALUES (?, ?, ?)').run('Alex', 0.5, 0.10);
  
  // Seed Monday-Friday shifts (1-5)
  const shiftInsert = db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
  [1, 2, 3, 4, 5].forEach(day => {
    shiftInsert.run(nathaniel.lastInsertRowid, day, '09:00', '17:00');
    shiftInsert.run(alex.lastInsertRowid, day, '10:00', '18:00');
  });

  db.prepare('INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)').run('Haircut', 25, 30);
  db.prepare('INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)').run('Beard Trim', 15, 15);
  
  db.prepare('INSERT INTO products (name, price, stock, min_stock_threshold) VALUES (?, ?, ?, ?)').run('Pomade', 18, 10, 3);
  db.prepare('INSERT INTO products (name, price, stock, min_stock_threshold) VALUES (?, ?, ?, ?)').run('Shampoo', 12, 5, 2);
}

export default db;
