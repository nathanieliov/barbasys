import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import { sendReceipt, alertLowStock, sendAppointmentNotification } from './communication.js';
import { SQLiteBarberRepository } from './repositories/sqlite-barber-repository.js';
import { SQLiteUserRepository } from './repositories/sqlite-user-repository.js';
import { SQLiteServiceRepository } from './repositories/sqlite-service-repository.js';
import { SQLiteAppointmentRepository } from './repositories/sqlite-appointment-repository.js';
import { SQLiteBarberShiftRepository } from './repositories/sqlite-barber-shift-repository.js';
import { SQLiteSaleRepository } from './repositories/sqlite-sale-repository.js';
import { SQLiteCustomerRepository } from './repositories/sqlite-customer-repository.js';
import { SQLiteProductRepository } from './repositories/sqlite-product-repository.js';
import { SQLiteExpenseRepository } from './repositories/sqlite-expense-repository.js';

import { ListBarbers } from './use-cases/list-barbers.js';
import { DeleteBarber } from './use-cases/delete-barber.js';
import { LoginUseCase } from './use-cases/login.js';
import { RegisterUseCase } from './use-cases/register.js';
import { CreateService } from './use-cases/create-service.js';
import { ListServices } from './use-cases/list-services.js';
import { UpdateService } from './use-cases/update-service.js';
import { DeleteService } from './use-cases/delete-service.js';
import { GetService } from './use-cases/get-service.js';
import { CreateAppointment } from './use-cases/booking/create-appointment.js';
import { ProcessSale } from './use-cases/pos/ProcessSale.js';
import { GetCommissionsReport } from './use-cases/reports/GetCommissionsReport.js';
import { GetInventoryIntelligence } from './use-cases/inventory/get-inventory-intelligence.js';

import { protect, authorize } from './middleware/auth-middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize repositories and use cases
const barberRepo = new SQLiteBarberRepository(db);
const userRepo = new SQLiteUserRepository();
const serviceRepo = new SQLiteServiceRepository(db);
const appointmentRepo = new SQLiteAppointmentRepository(db);
const shiftRepo = new SQLiteBarberShiftRepository(db);
const saleRepo = new SQLiteSaleRepository(db);
const customerRepo = new SQLiteCustomerRepository(db);
const productRepo = new SQLiteProductRepository(db);
const expenseRepo = new SQLiteExpenseRepository(db);

const listBarbers = new ListBarbers(barberRepo);
const loginUseCase = new LoginUseCase(userRepo);
const registerUseCase = new RegisterUseCase(userRepo);
const createService = new CreateService(serviceRepo);
const listServices = new ListServices(serviceRepo);
const updateService = new UpdateService(serviceRepo);
const deleteService = new DeleteService(serviceRepo);
const getService = new GetService(serviceRepo);
const createAppointment = new CreateAppointment(appointmentRepo, shiftRepo, serviceRepo);
const processSale = new ProcessSale(saleRepo, customerRepo, barberRepo, productRepo);
const getCommissionsReport = new GetCommissionsReport(saleRepo, barberRepo, expenseRepo);
const getInventoryIntelligence = new GetInventoryIntelligence(productRepo);

app.use(cors());
app.use(express.json());

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: ${username}`);
  try {
    const result = await loginUseCase.execute(username, password);
    console.log(`Login success: ${username}`);
    res.json(result);
  } catch (err: any) {
    console.log(`Login failed: ${username} - ${err.message}`);
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

app.post('/api/appointments', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  const { send_confirmation, barber_id, customer_id, service_id, start_time } = req.body;
  
  try {
    const result = await createAppointment.execute({ ...req.body, shop_id: shopId });
    
    // Send confirmation if requested
    if (send_confirmation && result.ids.length > 0) {
      const barber = db.prepare('SELECT name FROM barbers WHERE id = ?').get(barber_id) as any;
      const service = db.prepare('SELECT name FROM services WHERE id = ?').get(service_id) as any;
      const customer = customer_id ? db.prepare('SELECT name, email, phone FROM customers WHERE id = ?').get(customer_id) as any : null;

      if (barber && service) {
        sendAppointmentNotification({
          customer_name: customer?.name,
          customer_email: customer?.email,
          customer_phone: customer?.phone,
          start_time,
          service_name: service.name,
          barber_name: barber.name,
          type: 'confirmation'
        });
      }
    }

    res.json(result);
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

app.get('/api/inventory/intelligence', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  if (!shopId) return res.status(401).json({ error: 'Shop not assigned' });
  try {
    const results = await getInventoryIntelligence.execute(shopId);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory intelligence' });
  }
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
app.post('/api/sales', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const result = await processSale.execute({ ...req.body, shop_id: shopId });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
app.get('/api/reports', protect, authorize('OWNER', 'MANAGER', 'BARBER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  const startDate = (req.query.startDate as string) || (req.query.date as string) || new Date().toISOString().split('T')[0];
  const endDate = (req.query.endDate as string) || startDate;
  
  const isBarber = req.user?.role === 'BARBER';
  const barberId = req.user?.barber_id;

  if (!shopId) return res.status(401).json({ error: 'Shop not assigned' });

  try {
    const result = await getCommissionsReport.execute({
      startDate,
      endDate,
      shop_id: shopId,
      barber_id: barberId || undefined,
      isBarber
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
