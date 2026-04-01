import db from '../db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🚀 Starting BarbaRd Demo Setup...');

  // 1. Wipe current data
  db.transaction(() => {
    db.prepare('DELETE FROM sale_items').run();
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM appointments').run();
    db.prepare('DELETE FROM barber_shifts').run();
    db.prepare('DELETE FROM barber_time_off').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM barbers').run();
    db.prepare('DELETE FROM services').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM stock_logs').run();
    db.prepare('DELETE FROM shop_settings').run();
    db.prepare('DELETE FROM shops').run();
    db.prepare('DELETE FROM customers').run();
  })();

  console.log('🧹 Database wiped clean.');

  // 2. Create Shop
  const shopResult = db.prepare('INSERT INTO shops (name, address, phone) VALUES (?, ?, ?)').run(
    'BarbaRd', 
    'Santo Domingo Este, Dominican Republic', 
    '809-555-0123'
  );
  const shopId = Number(shopResult.lastInsertRowid);

  // 3. Configure Settings (18% Tax, RD$ Currency)
  const upsertSetting = db.prepare('INSERT INTO shop_settings (shop_id, key, value) VALUES (?, ?, ?)');
  upsertSetting.run(shopId, 'default_tax_rate', '18');
  upsertSetting.run(shopId, 'currency_symbol', 'RD$');
  upsertSetting.run(shopId, 'open_time', '09:00');
  upsertSetting.run(shopId, 'close_time', '21:00');
  upsertSetting.run(shopId, 'enable_reminders', 'true');

  // 4. Create Barbers
  // Ramon: Commission
  const ramonId = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run('Ramon', 'Ramón Rodríguez', 'COMMISSION', 0.6, 0.1, shopId).lastInsertRowid;

  // Leo: Fixed RD$45,000 Monthly
  const leoId = db.prepare('INSERT INTO barbers (name, fullname, payment_model, fixed_amount, fixed_period, shop_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run('Leo', 'Leonardo Tejeda', 'FIXED', 45000, 'MONTHLY', shopId).lastInsertRowid;

  // Set Shifts
  const shiftInsert = db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
  [ramonId, leoId].forEach(barberId => {
    // Mon-Sat: 9am-9pm
    [1, 2, 3, 4, 5, 6].forEach(day => shiftInsert.run(barberId, day, '09:00', '21:00'));
    // Sun: 9am-7pm
    shiftInsert.run(barberId, 0, '09:00', '19:00');
  });

  // 5. Create Services & Products
  const services = [
    { name: 'Corte Moderno', price: 800 },
    { name: 'Perfilado de Barba', price: 800 },
    { name: 'Cerquillo', price: 400 },
    { name: 'Limpieza Facial', price: 1200 },
    { name: 'Corte + Barba', price: 1400 }
  ];
  const serviceIds = services.map(s => db.prepare('INSERT INTO services (name, price, shop_id) VALUES (?, ?, ?)').run(s.name, s.price, shopId).lastInsertRowid);

  const products = [
    { name: 'Gelatina Ultra Hold', price: 450, stock: 20 },
    { name: 'Cera Matte', price: 650, stock: 15 },
    { name: 'Aceite para Barba', price: 900, stock: 10 },
    { name: 'After Shave DR', price: 350, stock: 30 }
  ];
  const productIds = products.map(p => db.prepare('INSERT INTO products (name, price, stock, shop_id) VALUES (?, ?, ?, ?)').run(p.name, p.price, p.stock, shopId).lastInsertRowid);

  // 6. Create Demo Users
  const salt = await bcrypt.genSalt(10);
  const pass = await bcrypt.hash('barba123', salt);
  db.prepare('INSERT INTO users (username, email, password_hash, role, shop_id) VALUES (?, ?, ?, ?, ?)').run('admin', 'admin@barbard.com', pass, 'OWNER', shopId);
  db.prepare('INSERT INTO users (username, email, password_hash, role, barber_id, shop_id) VALUES (?, ?, ?, ?, ?, ?)').run('ramon', 'ramon@barbard.com', pass, 'BARBER', ramonId, shopId);

  // 7. Generate Historical Data (30 days)
  console.log('📊 Generating 30 days of historical sales...');
  const insertSale = db.prepare(`
    INSERT INTO sales (barber_id, barber_name, total_amount, tip_amount, tax_amount, discount_amount, timestamp, shop_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, item_id, item_name, type, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const firstNames = ['Jose', 'Luis', 'Juan', 'Carlos', 'Miguel', 'Angel', 'Rafael', 'Pedro', 'Manuel', 'Ricardo'];
  const lastNames = ['Garcia', 'Martinez', 'Rodriguez', 'Lopez', 'Perez', 'Gonzalez', 'Sanchez', 'Rivera', 'Torres', 'Ramirez'];

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    // Average 6 sales per day
    const salesCount = 4 + Math.floor(Math.random() * 5);
    for (let j = 0; j < salesCount; j++) {
      const barber = Math.random() > 0.5 ? { id: ramonId, name: 'Ramón Rodríguez' } : { id: leoId, name: 'Leonardo Tejeda' };
      const serviceIdx = Math.floor(Math.random() * services.length);
      const service = services[serviceIdx];
      
      const subtotal = service.price;
      const tax = subtotal * 0.18;
      const tip = Math.random() > 0.7 ? 100 : 0;
      const total = subtotal + tax + tip;

      date.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
      
      const saleResult = insertSale.run(
        barber.id, 
        barber.name, 
        total, 
        tip, 
        tax, 
        0, 
        date.toISOString(), 
        shopId
      );
      const saleId = saleResult.lastInsertRowid;
      insertSaleItem.run(saleId, serviceIds[serviceIdx], service.name, 'service', service.price);

      // 30% chance of buying a product too
      if (Math.random() > 0.7) {
        const prodIdx = Math.floor(Math.random() * products.length);
        const prod = products[prodIdx];
        insertSaleItem.run(saleId, productIds[prodIdx], prod.name, 'product', prod.price);
        // Add to total
        const newTax = (service.price + prod.price) * 0.18;
        const newTotal = service.price + prod.price + newTax + tip;
        db.prepare('UPDATE sales SET total_amount = ?, tax_amount = ? WHERE id = ?').run(newTotal, newTax, saleId);
      }
    }
  }

  // 8. Generate Upcoming Appointments
  console.log('📅 Scheduling upcoming appointments...');
  const insertAppt = db.prepare(`
    INSERT INTO appointments (barber_id, customer_id, service_id, start_time, status, shop_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (let i = 1; i <= 3; i++) {
    const apptDate = new Date();
    apptDate.setDate(now.getDate() + i);
    apptDate.setHours(10 + i, 0, 0, 0);

    insertAppt.run(ramonId, null, serviceIds[0], apptDate.toISOString(), 'scheduled', shopId);
    
    const apptDate2 = new Date();
    apptDate2.setDate(now.getDate() + i);
    apptDate2.setHours(14 + i, 30, 0, 0);
    insertAppt.run(leoId, null, serviceIds[1], apptDate2.toISOString(), 'scheduled', shopId);
  }

  console.log('✨ BarbaRd Demo Environment is READY!');
  console.log('--------------------------------------');
  console.log('Login: admin / barba123');
  console.log('Shop: BarbaRd (Santo Domingo Este)');
  console.log('Tax: 18% ITBIS included');
  console.log('Data: 30 days of historical sales and pro-rated fixed salary for Leo.');
}

seed().catch(err => {
  console.error('❌ Failed to seed demo:', err);
  process.exit(1);
});
