import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import { sendReceipt, alertLowStock, sendAppointmentNotification } from './communication.js';
import { SQLiteBarberRepository } from './repositories/sqlite-barber-repository.js';
import { SQLiteUserRepository } from './repositories/sqlite-user-repository.js';
import { SQLiteServiceRepository } from './repositories/sqlite-service-repository.js';
import { ListBarbers } from './use-cases/list-barbers.js';
import { DeleteBarber } from './use-cases/delete-barber.js';
import { LoginUseCase } from './use-cases/login.js';
import { RegisterUseCase } from './use-cases/register.js';
import { CreateService } from './use-cases/create-service.js';
import { ListServices } from './use-cases/list-services.js';
import { UpdateService } from './use-cases/update-service.js';
import { DeleteService } from './use-cases/delete-service.js';
import { GetService } from './use-cases/get-service.js';
import { protect, authorize } from './middleware/auth-middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize repositories and use cases
const barberRepo = new SQLiteBarberRepository(db);
const userRepo = new SQLiteUserRepository();
const serviceRepo = new SQLiteServiceRepository(db);

const listBarbers = new ListBarbers(barberRepo);
const loginUseCase = new LoginUseCase(userRepo);
const registerUseCase = new RegisterUseCase(userRepo);
const createService = new CreateService(serviceRepo);
const listServices = new ListServices(serviceRepo);
const updateService = new UpdateService(serviceRepo);
const deleteService = new DeleteService(serviceRepo);
const getService = new GetService(serviceRepo);

app.use(cors());
app.use(express.json());

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await loginUseCase.execute(username, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/register', protect, authorize('OWNER'), async (req, res) => {
  try {
    const result = await registerUseCase.execute(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  res.json(req.user);
});

// Barbers
app.get('/api/barbers', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const barbers = await db.prepare('SELECT * FROM barbers WHERE shop_id = ?').all(shopId);
    res.json(barbers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch barbers' });
  }
});

app.get('/api/barbers/:id/shifts', protect, (req, res) => {
  const shifts = db.prepare('SELECT * FROM barber_shifts WHERE barber_id = ?').all(req.params.id);
  res.json(shifts);
});

app.post('/api/barbers/:id/shifts', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const { shifts } = req.body;
  const barberId = req.params.id;

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM barber_shifts WHERE barber_id = ?').run(barberId);
    const insert = db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
    for (const s of shifts) {
      insert.run(barberId, s.day_of_week, s.start_time, s.end_time);
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shifts' });
  }
});

app.get('/api/barbers/:id/time-off', protect, (req, res) => {
  const timeOff = db.prepare('SELECT * FROM barber_time_off WHERE barber_id = ? ORDER BY start_time DESC').all(req.params.id);
  res.json(timeOff);
});

app.post('/api/barbers/:id/time-off', protect, authorize('OWNER', 'MANAGER', 'BARBER'), (req, res) => {
  const { start_time, end_time, reason } = req.body;
  const barberId = req.params.id as string;

  // Prevent barbers from adding time off for others
  if (req.user?.role === 'BARBER' && req.user.barber_id !== parseInt(barberId)) {
    return res.status(403).json({ error: 'Cannot add time off for another barber' });
  }

  try {
    db.prepare('INSERT INTO barber_time_off (barber_id, start_time, end_time, reason) VALUES (?, ?, ?, ?)').run(barberId, start_time, end_time, reason);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add time off' });
  }
});

app.get('/api/customers', protect, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY last_visit DESC').all();
  res.json(customers);
});

app.get('/api/customers/:id', protect, (req, res) => {
  const { id } = req.params;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  
  const history = db.prepare(`
    SELECT s.id as sale_id, s.timestamp, s.total_amount, b.name as barber_name,
           (SELECT group_concat(name, '||') FROM sale_items si JOIN services srv ON si.item_id = srv.id WHERE si.sale_id = s.id AND si.type = 'service') as services,
           (SELECT group_concat(name, '||') FROM sale_items si JOIN products p ON si.item_id = p.id WHERE si.sale_id = s.id AND si.type = 'product') as products
    FROM sales s
    JOIN barbers b ON s.barber_id = b.id
    WHERE s.customer_id = ?
    ORDER BY s.timestamp DESC
  `).all(id);

  res.json({ ...customer, history });
});

app.patch('/api/customers/:id', protect, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, notes, tags } = req.body;
  
  try {
    db.prepare(`
      UPDATE customers 
      SET name = ?, email = ?, phone = ?, notes = ?, tags = ? 
      WHERE id = ?
    `).run(name, email, phone, notes, tags, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/customers/:id/history', protect, (req, res) => {
  const { id } = req.params;
  const history = db.prepare(`
    SELECT s.id, s.timestamp, s.total_amount, b.name as barber_name,
           (SELECT group_concat(name, ', ') FROM sale_items si JOIN services srv ON si.item_id = srv.id WHERE si.sale_id = s.id AND si.type = 'service') as services,
           (SELECT group_concat(name, ', ') FROM sale_items si JOIN products p ON si.item_id = p.id WHERE si.sale_id = s.id AND si.type = 'product') as products
    FROM sales s
    JOIN barbers b ON s.barber_id = b.id
    WHERE s.customer_id = ?
    ORDER BY s.timestamp DESC
  `).all(id);
  res.json(history);
});

// Appointments
app.get('/api/appointments', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const appointments = db.prepare(`
    SELECT a.*, b.name as barber_name, c.name as customer_name, s.name as service_name
    FROM appointments a
    JOIN barbers b ON a.barber_id = b.id
    LEFT JOIN customers c ON a.customer_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE date(a.start_time) = ? AND a.shop_id = ?
    ORDER BY a.start_time ASC
  `).all(date, shopId);
  res.json(appointments);
});

app.post('/api/appointments', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const { barber_id, customer_id, service_id, start_time, recurring_rule, occurrences = 1 } = req.body;
  const recurring_id = recurring_rule ? Math.random().toString(36).substring(2, 15) : null;
  
  const service = db.prepare('SELECT duration_minutes FROM services WHERE id = ?').get(service_id) as { duration_minutes: number };
  const insert = db.prepare('INSERT INTO appointments (barber_id, customer_id, service_id, start_time, recurring_id, recurring_rule, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  const createdIds: number[] = [];

  const transaction = db.transaction(() => {
    for (let i = 0; i < occurrences; i++) {
      const currentStart = new Date(start_time);
      if (recurring_rule === 'weekly') currentStart.setDate(currentStart.getDate() + (i * 7));
      if (recurring_rule === 'biweekly') currentStart.setDate(currentStart.getDate() + (i * 14));
      if (recurring_rule === 'monthly') currentStart.setMonth(currentStart.getMonth() + i);

      const startTimeStr = currentStart.toISOString().replace('T', ' ').substring(0, 19);
      const endTimeDate = new Date(currentStart.getTime() + service.duration_minutes * 60000);
      const endTimeStr = endTimeDate.toISOString().replace('T', ' ').substring(0, 19);

      const dayOfWeek = currentStart.getDay();
      const timeStr = currentStart.toTimeString().split(' ')[0].substring(0, 5);

      // Validation
      const shift = db.prepare('SELECT id FROM barber_shifts WHERE barber_id = ? AND day_of_week = ? AND ? >= start_time AND ? <= end_time').get(barber_id, dayOfWeek, timeStr, timeStr);
      if (!shift) throw new Error(`Barber not working on ${currentStart.toLocaleDateString()} at ${timeStr}`);

      const conflict = db.prepare(`
        SELECT a.id FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.barber_id = ? AND a.status != 'cancelled'
        AND ((datetime(a.start_time) < datetime(?)) AND (datetime(a.start_time, '+' || s.duration_minutes || ' minutes') > datetime(?)))
      `).get(barber_id, endTimeStr, startTimeStr);
      if (conflict) throw new Error(`Conflict on ${currentStart.toLocaleDateString()} at ${timeStr}`);

      const result = insert.run(barber_id, customer_id, service_id, startTimeStr, recurring_id, recurring_rule, shopId);
      createdIds.push(Number(result.lastInsertRowid));
    }
  });

  try {
    transaction();
    
    // Send confirmation (only for the first one for brevity)
    const firstApt = db.prepare('SELECT a.*, b.name as barber_name, s.name as service_name, c.name as customer_name, c.email, c.phone FROM appointments a JOIN barbers b ON a.barber_id = b.id JOIN services s ON a.service_id = s.id LEFT JOIN customers c ON a.customer_id = c.id WHERE a.id = ?').get(createdIds[0]) as any;
    sendAppointmentNotification({ ...firstApt, type: 'confirmation', customer_name: firstApt.customer_name || 'Valued Client' });

    res.json({ ids: createdIds, recurring_id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/appointments/:id', protect, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (status === 'cancelled') {
    const apt = db.prepare(`
      SELECT a.*, b.name as barber_name, s.name as service_name, c.name as customer_name, c.email, c.phone
      FROM appointments a
      JOIN barbers b ON a.barber_id = b.id
      JOIN services s ON a.service_id = s.id
      LEFT JOIN customers c ON a.customer_id = c.id
      WHERE a.id = ?
    `).get(id) as any;

    if (apt) {
      sendAppointmentNotification({
        customer_name: apt.customer_name,
        customer_email: apt.email,
        customer_phone: apt.phone,
        start_time: apt.start_time,
        service_name: apt.service_name,
        barber_name: apt.barber_name,
        type: 'cancellation'
      });
    }
  }

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true });
});

app.post('/api/barbers', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const { name, service_commission_rate, product_commission_rate } = req.body;
  const result = db.prepare('INSERT INTO barbers (name, service_commission_rate, product_commission_rate, shop_id) VALUES (?, ?, ?, ?)').run(name, service_commission_rate, product_commission_rate, shopId);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/barbers/:id', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const { name, service_commission_rate, product_commission_rate } = req.body;
  const { id } = req.params;
  
  try {
    db.prepare('UPDATE barbers SET name = ?, service_commission_rate = ?, product_commission_rate = ? WHERE id = ?').run(name, service_commission_rate, product_commission_rate, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update barber' });
  }
});

app.delete('/api/barbers/:id', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const deleteBarberUseCase = new DeleteBarber(barberRepo);
    const id = req.params.id as string;
    await deleteBarberUseCase.execute(parseInt(id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Products & Services
app.get('/api/inventory', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const products = db.prepare(`
    SELECT p.*, s.name as supplier_name 
    FROM products p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.shop_id = ? AND p.is_active = 1
  `).all(shopId);
  res.json(products);
});

app.post('/api/products', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const { name, price, min_stock_threshold, supplier_id } = req.body;
  try {
    const result = db.prepare('INSERT INTO products (name, price, min_stock_threshold, supplier_id, shop_id, stock) VALUES (?, ?, ?, ?, ?, 0)').run(name, price, min_stock_threshold, supplier_id, shopId);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.get('/api/inventory/intelligence', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  // Calculate sales velocity (avg units per day over last 30 days)
  const intelligence = db.prepare(`
    SELECT 
      p.id, p.name, p.stock, p.min_stock_threshold,
      IFNULL(AVG(daily_sales.units), 0) as avg_daily_velocity
    FROM products p
    LEFT JOIN (
      SELECT product_id, date(timestamp) as sale_date, COUNT(*) as units
      FROM stock_logs
      WHERE type = 'SALE' AND timestamp > date('now', '-30 days')
      GROUP BY product_id, sale_date
    ) daily_sales ON p.id = daily_sales.product_id
    GROUP BY p.id
  `).all();

  const results = (intelligence as any[]).map(item => {
    const daysRemaining = item.avg_daily_velocity > 0 
      ? Math.floor(item.stock / item.avg_daily_velocity) 
      : 999;
    return {
      ...item,
      days_remaining: daysRemaining,
      reorder_suggested: daysRemaining <= 7 || item.stock <= item.min_stock_threshold
    };
  });

  res.json(results);
});

// Suppliers
app.get('/api/suppliers', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers WHERE is_active = 1').all();
  res.json(suppliers);
});

app.post('/api/suppliers', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const { name, contact_name, email, phone, lead_time_days } = req.body;
  const result = db.prepare('INSERT INTO suppliers (name, contact_name, email, phone, lead_time_days) VALUES (?, ?, ?, ?, ?)').run(name, contact_name, email, phone, lead_time_days);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/suppliers/:id', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/suppliers/:id', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const { name, contact_name, email, phone, lead_time_days } = req.body;
  try {
    db.prepare('UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, lead_time_days = ? WHERE id = ?').run(name, contact_name, email, phone, lead_time_days, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

app.delete('/api/products/:id', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/products/:id', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const { name, price, min_stock_threshold, supplier_id } = req.body;
  try {
    db.prepare('UPDATE products SET name = ?, price = ?, min_stock_threshold = ?, supplier_id = ? WHERE id = ?').run(name, price, min_stock_threshold, supplier_id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.post('/api/inventory/restock', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const { product_id, amount, reason } = req.body;
  
  const transaction = db.transaction(() => {
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(amount, product_id);
    db.prepare('INSERT INTO stock_logs (product_id, change_amount, type, reason) VALUES (?, ?, ?, ?)').run(product_id, amount, 'RESTOCK', reason);
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restock' });
  }
});

// Services
app.get('/api/services', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const services = await db.prepare('SELECT * FROM services WHERE shop_id = ?').all(shopId);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.get('/api/services/:id', protect, async (req, res) => {
  try {
    const service = await getService.execute(Number(req.params.id));
    res.json(service);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/services', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const { name, price, duration_minutes } = req.body;
    const result = db.prepare('INSERT INTO services (name, price, duration_minutes, shop_id) VALUES (?, ?, ?, ?)').run(name, price, duration_minutes, shopId);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/services/:id', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    await updateService.execute({ ...req.body, id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/services/:id', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    await deleteService.execute(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Shop Settings
app.get('/api/shops/:id', protect, (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  res.json(shop);
});

app.get('/api/settings', protect, (req, res) => {
  const settings = db.prepare('SELECT * FROM shop_settings').all();
  const settingsMap = (settings as any[]).reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settingsMap);
});

app.post('/api/settings', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const settings = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO shop_settings (key, value) VALUES (?, ?)');
  
  const transaction = db.transaction((settings: any) => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, String(value));
    }
  });

  try {
    transaction(settings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Sales (POS)
app.post('/api/sales', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  let { barber_id, items, customer_email, customer_phone, tip_amount, discount_amount } = req.body;
  
  // Normalize numeric values to ensure valid math
  tip_amount = parseFloat(tip_amount) || 0;
  discount_amount = parseFloat(discount_amount) || 0;
  
  // Normalize customer strings (empty strings should be treated as NULL)
  customer_email = customer_email?.trim() || null;
  customer_phone = customer_phone?.trim() || null;

  if (!barber_id || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Missing required sale data' });
  }

  const barber = db.prepare('SELECT name FROM barbers WHERE id = ?').get(barber_id) as { name: string };
  
  const total_items_amount = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) || 0), 0);
  const total_amount = Math.max(0, total_items_amount + tip_amount - discount_amount);

  const transaction = db.transaction(() => {
    let customerId = null;
    
    // Upsert Customer only if identifying info is provided
    if (customer_email || customer_phone) {
      let customer = db.prepare('SELECT id FROM customers WHERE (email = ? AND email IS NOT NULL) OR (phone = ? AND phone IS NOT NULL)').get(customer_email, customer_phone) as { id: number };
      
      if (customer) {
        customerId = customer.id;
        db.prepare('UPDATE customers SET last_visit = CURRENT_TIMESTAMP WHERE id = ?').run(customerId);
      } else {
        const res = db.prepare('INSERT INTO customers (email, phone, last_visit) VALUES (?, ?, CURRENT_TIMESTAMP)').run(customer_email, customer_phone);
        customerId = Number(res.lastInsertRowid);
      }
    }

    const saleResult = db.prepare('INSERT INTO sales (barber_id, barber_name, customer_id, total_amount, tip_amount, discount_amount, customer_email, customer_phone, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(barber_id, barber?.name || 'Unknown', customerId, total_amount, tip_amount, discount_amount, customer_email, customer_phone, shopId);
    const saleId = Number(saleResult.lastInsertRowid);

    for (const item of items) {
      db.prepare('INSERT INTO sale_items (sale_id, item_id, item_name, type, price) VALUES (?, ?, ?, ?, ?)').run(saleId, item.id, item.name, item.type, item.price);
      
      if (item.type === 'product') {
        db.prepare('UPDATE products SET stock = stock - 1 WHERE id = ?').run(item.id);
        db.prepare('INSERT INTO stock_logs (product_id, change_amount, type, reference_id) VALUES (?, ?, ?, ?)').run(item.id, -1, 'SALE', saleId);
        
        // Check for low stock alert
        const product = db.prepare('SELECT name, stock, min_stock_threshold FROM products WHERE id = ?').get(item.id) as { name: string, stock: number, min_stock_threshold: number };
        if (product.stock <= product.min_stock_threshold) {
          alertLowStock({ name: product.name, stock: product.stock, threshold: product.min_stock_threshold });
        }
      }
    }
    return saleId;
  });

  try {
    const saleId = transaction();
    
    // Send receipt asynchronously
    sendReceipt({
      id: saleId,
      customer_email,
      customer_phone,
      total_amount,
      tip_amount,
      discount_amount,
      items,
      barber_name: barber?.name || 'Professional'
    });

    res.json({ success: true, saleId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process sale' });
  }
});

app.get('/api/sales', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const { startDate, endDate } = req.query;

  let query = `
    SELECT s.*, COALESCE(s.barber_name, b.name) as barber_name
    FROM sales s
    LEFT JOIN barbers b ON s.barber_id = b.id
    WHERE s.shop_id = ?
  `;
  const params: any[] = [shopId];

  if (startDate && endDate) {
    query += " AND s.timestamp BETWEEN ? AND ?";
    params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  }

  query += " ORDER BY s.timestamp DESC LIMIT 100";

  try {
    const sales = db.prepare(query).all(...params);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

app.get('/api/sales/:id', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const { id } = req.params;

  try {
    const sale = db.prepare(`
      SELECT s.*, COALESCE(s.barber_name, b.name) as barber_name
      FROM sales s
      LEFT JOIN barbers b ON s.barber_id = b.id
      WHERE s.id = ? AND s.shop_id = ?
    `).get(id, shopId) as any;

    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = db.prepare(`
      SELECT si.*, COALESCE(si.item_name, 'Unknown Item') as item_name
      FROM sale_items si
      WHERE si.sale_id = ?
    `).all(id);

    res.json({ ...sale, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sale details' });
  }
});

// Reports
app.get('/api/reports', protect, authorize('OWNER', 'MANAGER', 'BARBER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const startDate = (req.query.startDate as string) || (req.query.date as string) || new Date().toISOString().split('T')[0];
  const endDate = (req.query.endDate as string) || startDate;
  
  const isBarber = req.user?.role === 'BARBER';
  const barberId = req.user?.barber_id;

  // Revenue and tips in range
  let revenueQuery = 'SELECT SUM(total_amount) as total, SUM(tip_amount) as tips FROM sales WHERE date(timestamp) BETWEEN @startDate AND @endDate AND shop_id = @shopId';
  if (isBarber) {
    revenueQuery += ' AND barber_id = @barberId';
  }
  const revenueData = db.prepare(revenueQuery).get({ startDate, endDate, barberId, shopId }) as { total: number, tips: number };

  // Barber commissions in range
  let commissionsQuery = `
    SELECT b.id as barber_id, b.name, 
           IFNULL(SUM(CASE WHEN si.type = 'service' THEN si.price * b.service_commission_rate ELSE 0 END), 0) as service_commission,
           IFNULL(SUM(CASE WHEN si.type = 'product' THEN si.price * b.product_commission_rate ELSE 0 END), 0) as product_commission,
           IFNULL((SELECT SUM(tip_amount) FROM sales WHERE barber_id = b.id AND date(timestamp) BETWEEN @startDate AND @endDate), 0) as tips
    FROM barbers b
    LEFT JOIN sales s ON s.barber_id = b.id AND date(s.timestamp) BETWEEN @startDate AND @endDate
    LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE b.shop_id = @shopId
  `;
  
  if (isBarber) {
    commissionsQuery += ' AND b.id = @barberId';
  }
  
  commissionsQuery += ' GROUP BY b.id';
  
  const commissions = db.prepare(commissionsQuery).all({ startDate, endDate, barberId, shopId });

  // Total Expenses in range
  let expensesQuery = 'SELECT SUM(amount) as total FROM expenses WHERE date(date) BETWEEN @startDate AND @endDate AND shop_id = @shopId';
  const expenseData = db.prepare(expensesQuery).get({ startDate, endDate, shopId }) as { total: number };

  res.json({
    startDate,
    endDate,
    revenue: revenueData?.total || 0,
    tips: revenueData?.tips || 0,
    expenses: expenseData?.total || 0,
    commissions
  });
});

// Expenses
app.get('/api/expenses', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const expenses = db.prepare('SELECT * FROM expenses WHERE shop_id = ? ORDER BY date DESC').all(shopId);
  res.json(expenses);
});

app.post('/api/expenses', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const { category, amount, description, date } = req.body;
  const result = db.prepare('INSERT INTO expenses (category, amount, description, date, shop_id) VALUES (?, ?, ?, ?, ?)').run(category, amount, description, date || new Date().toISOString(), shopId);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/expenses/:id', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/reports/analytics', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const { startDate, endDate } = req.query;
  
  // 1. Revenue by Hour (Heatmap data)
  const hourlyRevenue = db.prepare(`
    SELECT strftime('%H', timestamp) as hour, SUM(total_amount) as revenue
    FROM sales
    WHERE date(timestamp) BETWEEN ? AND ? AND shop_id = ?
    GROUP BY hour
    ORDER BY hour ASC
  `).all(startDate, endDate, shopId);

  // 2. Revenue by Day of Week
  const dailyRevenue = db.prepare(`
    SELECT strftime('%w', timestamp) as day_of_week, SUM(total_amount) as revenue
    FROM sales
    WHERE date(timestamp) BETWEEN ? AND ? AND shop_id = ?
    GROUP BY day_of_week
    ORDER BY day_of_week ASC
  `).all(startDate, endDate, shopId);

  // 3. Barber Performance Metrics
  const barberPerformance = db.prepare(`
    SELECT 
      b.name,
      COUNT(s.id) as total_sales,
      SUM(s.total_amount) as total_revenue,
      AVG(s.total_amount) as avg_ticket_size,
      (SELECT COUNT(*) FROM appointments a WHERE a.barber_id = b.id AND a.status = 'completed' AND date(a.start_time) BETWEEN ? AND ? AND a.shop_id = ?) as completed_appointments
    FROM barbers b
    LEFT JOIN sales s ON s.barber_id = b.id AND date(s.timestamp) BETWEEN ? AND ? AND s.shop_id = ?
    WHERE b.shop_id = ?
    GROUP BY b.id
  `).all(startDate, endDate, shopId, startDate, endDate, shopId, shopId);

  res.json({
    hourlyRevenue,
    dailyRevenue,
    barberPerformance
  });
});

// Background Job: Check for reminders every hour
setInterval(() => {
  console.log('[Job] Checking for appointment reminders...');
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const upcoming = db.prepare(`
    SELECT a.*, b.name as barber_name, s.name as service_name, c.name as customer_name, c.email, c.phone
    FROM appointments a
    JOIN barbers b ON a.barber_id = b.id
    JOIN services s ON a.service_id = s.id
    LEFT JOIN customers c ON a.customer_id = c.id
    WHERE date(a.start_time) = ? 
    AND a.status = 'scheduled' 
    AND a.reminder_sent = 0
  `).all(tomorrowStr) as any[];

  for (const apt of upcoming) {
    sendAppointmentNotification({
      customer_name: apt.customer_name,
      customer_email: apt.email,
      customer_phone: apt.phone,
      start_time: apt.start_time,
      service_name: apt.service_name,
      barber_name: apt.barber_name,
      type: 'reminder'
    });
    db.prepare('UPDATE appointments SET reminder_sent = 1 WHERE id = ?').run(apt.id);
  }
}, 60 * 60 * 1000); // Hourly

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
