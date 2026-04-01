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
import { SQLiteSupplierRepository } from './repositories/sqlite-supplier-repository.js';

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
import { ExportSalesCSV } from './use-cases/reports/ExportSalesCSV.js';
import { GetInventoryIntelligence } from './use-cases/inventory/get-inventory-intelligence.js';
import { SwitchShop } from './use-cases/switch-shop.js';
import { CreateSupplier } from './use-cases/suppliers/CreateSupplier.js';
import { ListSuppliers } from './use-cases/suppliers/ListSuppliers.js';
import { UpdateSupplier } from './use-cases/suppliers/UpdateSupplier.js';
import { DeleteSupplier } from './use-cases/suppliers/DeleteSupplier.js';
import { ListUsers } from './use-cases/ListUsers.js';
import { UpdateUser } from './use-cases/UpdateUser.js';
import { DeleteUser } from './use-cases/DeleteUser.js';
import { UpdateProfile } from './use-cases/UpdateProfile.js';

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
const supplierRepo = new SQLiteSupplierRepository(db);

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
const exportSalesCSV = new ExportSalesCSV(saleRepo);
const getInventoryIntelligence = new GetInventoryIntelligence(productRepo);
const switchShop = new SwitchShop(userRepo);
const createSupplier = new CreateSupplier(supplierRepo);
const listSuppliers = new ListSuppliers(supplierRepo);
const updateSupplier = new UpdateSupplier(supplierRepo);
const deleteSupplier = new DeleteSupplier(supplierRepo);
const listUsers = new ListUsers(userRepo);
const updateUser = new UpdateUser(userRepo);
const deleteUser = new DeleteUser(userRepo);
const updateProfile = new UpdateProfile(userRepo, barberRepo);

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

// User Management
app.get('/api/users', protect, authorize('OWNER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const users = await listUsers.execute(shopId!);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id', protect, authorize('OWNER'), async (req, res) => {
  try {
    await updateUser.execute({ ...req.body, id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', protect, authorize('OWNER'), async (req, res) => {
  try {
    await deleteUser.execute(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await userRepo.findById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      barber_id: user.barber_id,
      shop_id: user.shop_id,
      fullname: user.fullname
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

app.patch('/api/auth/profile', protect, async (req, res) => {
  const userId = req.user?.id;
  try {
    const user = await updateProfile.execute({ ...req.body, id: userId! });
    res.json({ success: true, user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      barber_id: user.barber_id,
      shop_id: user.shop_id
    }});
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Barbers
app.get('/api/barbers', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    let query = 'SELECT * FROM barbers WHERE shop_id = ? AND is_active = 1';
    const params: any[] = [shopId];

    if (req.user?.role === 'BARBER') {
      query += ' AND id = ?';
      params.push(req.user.barber_id);
    }

    const barbers = await db.prepare(query).all(...params);
    res.json(barbers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch barbers' });
  }
});

app.get('/api/barbers/:id/shifts', protect, (req, res) => {
  const barberId = req.params.id as string;
  if (req.user?.role === 'BARBER' && req.user.barber_id !== parseInt(barberId)) {
    return res.status(403).json({ error: 'Cannot view shifts for another barber' });
  }
  const shifts = db.prepare('SELECT * FROM barber_shifts WHERE barber_id = ?').all(barberId);
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
  const barberId = req.params.id as string;
  if (req.user?.role === 'BARBER' && req.user.barber_id !== parseInt(barberId)) {
    return res.status(403).json({ error: 'Cannot view time off for another barber' });
  }
  const timeOff = db.prepare('SELECT * FROM barber_time_off WHERE barber_id = ? ORDER BY start_time DESC').all(barberId);
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
  let query = 'SELECT * FROM customers';
  const params: any[] = [];

  if (req.user?.role === 'BARBER') {
    query = 'SELECT DISTINCT c.* FROM customers c JOIN sales s ON s.customer_id = c.id WHERE s.barber_id = ?';
    params.push(req.user.barber_id);
  }

  query += ' ORDER BY last_visit DESC';
  const customers = db.prepare(query).all(...params);
  res.json(customers);
});

app.get('/api/customers/:id', protect, (req, res) => {
  const { id } = req.params;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  
  if (req.user?.role === 'BARBER') {
    const hasServed = db.prepare('SELECT 1 FROM sales WHERE customer_id = ? AND barber_id = ? LIMIT 1').get(id, req.user.barber_id);
    if (!hasServed) return res.status(403).json({ error: 'Not authorized to view this customer' });
  }

  const historyQuery = `
    SELECT s.id as sale_id, s.timestamp, s.total_amount, s.barber_id, b.name as barber_name,
           (SELECT group_concat(name, '||') FROM sale_items si JOIN services srv ON si.item_id = srv.id WHERE si.sale_id = s.id AND si.type = 'service') as services,
           (SELECT group_concat(name, '||') FROM sale_items si JOIN products p ON si.item_id = p.id WHERE si.sale_id = s.id AND si.type = 'product') as products
    FROM sales s
    JOIN barbers b ON s.barber_id = b.id
    WHERE s.customer_id = ?
  `;
  const historyParams: any[] = [id];

  let history = db.prepare(historyQuery).all(...historyParams) as any[];
  
  // If barber, filter history to only their own
  if (req.user?.role === 'BARBER') {
    history = history.filter(h => h.barber_id === req.user?.barber_id);
  }

  res.json({ ...customer, history });
});

app.patch('/api/customers/:id', protect, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, notes, tags } = req.body;
  
  if (req.user?.role === 'BARBER') {
    const hasServed = db.prepare('SELECT 1 FROM sales WHERE customer_id = ? AND barber_id = ? LIMIT 1').get(id, req.user.barber_id);
    if (!hasServed) return res.status(403).json({ error: 'Not authorized to update this customer' });
  }

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
  let query = `
    SELECT s.id, s.timestamp, s.total_amount, b.name as barber_name,
           (SELECT group_concat(name, ', ') FROM sale_items si JOIN services srv ON si.item_id = srv.id WHERE si.sale_id = s.id AND si.type = 'service') as services,
           (SELECT group_concat(name, ', ') FROM sale_items si JOIN products p ON si.item_id = p.id WHERE si.sale_id = s.id AND si.type = 'product') as products
    FROM sales s
    JOIN barbers b ON s.barber_id = b.id
    WHERE s.customer_id = ?
  `;
  const params: any[] = [id];

  if (req.user?.role === 'BARBER') {
    query += ' AND s.barber_id = ?';
    params.push(req.user.barber_id);
  }

  query += ' ORDER BY s.timestamp DESC';
  const history = db.prepare(query).all(...params);
  res.json(history);
});

// Appointments
app.get('/api/appointments', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const date = req.query.date || new Date().toISOString().split('T')[0];
  let query = `
    SELECT a.*, b.name as barber_name, c.name as customer_name, s.name as service_name
    FROM appointments a
    JOIN barbers b ON a.barber_id = b.id
    LEFT JOIN customers c ON a.customer_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE date(a.start_time) = ? AND a.shop_id = ?
  `;
  const params: any[] = [date, shopId];

  if (req.user?.role === 'BARBER') {
    query += ' AND a.barber_id = ?';
    params.push(req.user.barber_id);
  }

  query += ' ORDER BY a.start_time ASC';
  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

app.post('/api/appointments', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  const { send_confirmation, barber_id, customer_id, service_id, start_time } = req.body;
  
  if (req.user?.role === 'BARBER' && req.user.barber_id !== barber_id) {
    return res.status(403).json({ error: 'Cannot book for another barber' });
  }

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
  res.status(201).json({ id: result.lastInsertRowid });
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

app.post('/api/inventory', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const { name, price, min_stock_threshold, supplier_id } = req.body;
  const result = db.prepare('INSERT INTO products (name, price, min_stock_threshold, supplier_id, shop_id) VALUES (?, ?, ?, ?, ?)').run(name, price, min_stock_threshold, supplier_id || null, shopId);
  res.status(201).json({ id: result.lastInsertRowid });
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
app.get('/api/suppliers', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const suppliers = await listSuppliers.execute(shopId!);
    res.json(suppliers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

app.post('/api/suppliers', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const id = await createSupplier.execute({ ...req.body, shop_id: shopId });
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    await deleteSupplier.execute(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    await updateSupplier.execute({ ...req.body, id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
    const services = await db.prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1').all(shopId);
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
// Shops
app.get('/api/shops', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shops = db.prepare('SELECT * FROM shops').all();
  res.json(shops);
});

app.post('/api/shops/switch', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const { shopId } = req.body;
  const userId = req.user?.id;

  try {
    const result = await switchShop.execute({ userId: userId!, shopId: parseInt(shopId) });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/shops/:id', protect, (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  res.json(shop);
});

app.get('/api/settings', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const settings = db.prepare('SELECT * FROM shop_settings WHERE shop_id = ?').all(shopId);
  const settingsMap = (settings as any[]).reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settingsMap);
});

app.post('/api/settings', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const settings = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO shop_settings (shop_id, key, value) VALUES (?, ?, ?)');
  
  const transaction = db.transaction((settings: any) => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(shopId, key, String(value));
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
  const { barber_id } = req.body;

  if (req.user?.role === 'BARBER' && req.user.barber_id !== barber_id) {
    return res.status(403).json({ error: 'Cannot input sales for another barber' });
  }

  try {
    const result = await processSale.execute({ ...req.body, shop_id: shopId });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sales', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  const { startDate, endDate, barberId: queryBarberId } = req.query;

  let barberIdToFilter: number | undefined | null = undefined;
  if (req.user?.role === 'BARBER') {
    barberIdToFilter = req.user.barber_id ?? -1;
  } else if (queryBarberId) {
    barberIdToFilter = parseInt(queryBarberId as string);
  }

  try {
    const sales = await saleRepo.findDetailedInRange(
      (startDate as string) || '2000-01-01',
      (endDate as string) || '2099-12-31',
      shopId!,
      barberIdToFilter
    );
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

app.get('/api/sales/:id', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const { id } = req.params;

  try {
    let query = `
      SELECT s.*, COALESCE(s.barber_name, b.name) as barber_name
      FROM sales s
      LEFT JOIN barbers b ON s.barber_id = b.id
      WHERE s.id = ? AND s.shop_id = ?
    `;
    const params: any[] = [id, shopId];

    if (req.user?.role === 'BARBER') {
      query += " AND s.barber_id = ?";
      params.push(req.user.barber_id);
    }

    const sale = db.prepare(query).get(...params) as any;

    if (!sale) {
      // Check if it exists but belongs to someone else (security)
      const exists = db.prepare('SELECT 1 FROM sales WHERE id = ? AND shop_id = ?').get(id, shopId);
      if (exists && req.user?.role === 'BARBER') {
        return res.status(403).json({ error: 'Access denied to this transaction' });
      }
      return res.status(404).json({ error: 'Sale not found' });
    }

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
  const barberId = isBarber ? (req.user?.barber_id ?? -1) : undefined;

  if (!shopId) return res.status(401).json({ error: 'Shop not assigned' });

  try {
    const result = await getCommissionsReport.execute({
      startDate,
      endDate,
      shop_id: shopId,
      barber_id: barberId,
      isBarber
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/export/sales', protect, authorize('OWNER', 'MANAGER', 'BARBER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  const startDate = (req.query.startDate as string) || new Date().toISOString().split('T')[0];
  const endDate = (req.query.endDate as string) || startDate;
  
  let barberId = req.query.barberId ? parseInt(req.query.barberId as string) : undefined;
  if (req.user?.role === 'BARBER') {
    barberId = req.user.barber_id!;
  }

  try {
    const csv = await exportSalesCSV.execute({
      startDate,
      endDate,
      shop_id: shopId!,
      barber_id: barberId
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.csv`);
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
  const shopId = req.user?.shop_id;
  db.prepare('DELETE FROM expenses WHERE id = ? AND shop_id = ?').run(req.params.id, shopId);
  res.json({ success: true });
});

app.get('/api/reports/analytics', protect, authorize('OWNER', 'MANAGER', 'BARBER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const { startDate, endDate } = req.query;
  const isBarber = req.user?.role === 'BARBER';
  const barberId = isBarber ? (req.user?.barber_id ?? -1) : undefined;
  
  // 1. Revenue by Hour (Heatmap data)
  let hourlyQuery = `
    SELECT strftime('%H', timestamp) as hour, SUM(total_amount) as revenue
    FROM sales
    WHERE date(timestamp) BETWEEN ? AND ? AND shop_id = ?
  `;
  const hourlyParams: any[] = [startDate, endDate, shopId];
  if (isBarber) {
    hourlyQuery += ' AND barber_id = ?';
    hourlyParams.push(barberId);
  }
  hourlyQuery += ' GROUP BY hour ORDER BY hour ASC';
  const hourlyRevenue = db.prepare(hourlyQuery).all(...hourlyParams);

  // 2. Revenue by Day of Week
  let dailyQuery = `
    SELECT strftime('%w', timestamp) as day_of_week, SUM(total_amount) as revenue
    FROM sales
    WHERE date(timestamp) BETWEEN ? AND ? AND shop_id = ?
  `;
  const dailyParams: any[] = [startDate, endDate, shopId];
  if (isBarber) {
    dailyQuery += ' AND barber_id = ?';
    dailyParams.push(barberId);
  }
  dailyQuery += ' GROUP BY day_of_week ORDER BY day_of_week ASC';
  const dailyRevenue = db.prepare(dailyQuery).all(...dailyParams);

  // 3. Barber Performance Metrics
  let barberQuery = `
    SELECT 
      COALESCE(b.fullname, b.name) as name,
      COUNT(s.id) as total_sales,
      SUM(s.total_amount) as total_revenue,
      AVG(s.total_amount) as avg_ticket_size,
      (SELECT COUNT(*) FROM appointments a WHERE a.barber_id = b.id AND a.status = 'completed' AND date(a.start_time) BETWEEN ? AND ? AND a.shop_id = ?) as completed_appointments
    FROM barbers b
    LEFT JOIN sales s ON s.barber_id = b.id AND date(s.timestamp) BETWEEN ? AND ? AND s.shop_id = ?
    WHERE b.shop_id = ?
  `;
  const barberParams: any[] = [startDate, endDate, shopId, startDate, endDate, shopId, shopId];
  
  if (isBarber) {
    barberQuery += ' AND b.id = ?';
    barberParams.push(barberId);
  }
  
  barberQuery += ' GROUP BY b.id';
  const barberPerformance = db.prepare(barberQuery).all(...barberParams);

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
