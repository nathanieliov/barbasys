import 'dotenv/config';
import { validateEnv } from './env-check.js';
validateEnv();
import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import { TwilioWhatsAppClient } from './adapters/whatsapp/twilio-whatsapp-client.js';
import { FakeTwilioClient } from './adapters/whatsapp/fake-twilio-client.js';
import { IWhatsAppClient } from './adapters/whatsapp/whatsapp-client.interface.js';
import { OpenAILLMClient } from './adapters/llm/openai-llm-client.js';
import { FakeLLMClient } from './adapters/llm/fake-llm-client.js';
import { ILLMClient } from './adapters/llm/llm-client.interface.js';
import { SqliteConversationRepository } from './repositories/sqlite-conversation-repository.js';
import { ResendReceipt } from './use-cases/pos/ResendReceipt.js';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { GetAvailableSlots } from './use-cases/booking/GetAvailableSlots.js';
import { CancelAppointment } from './use-cases/booking/CancelAppointment.js';
import { UpdateAppointment } from './use-cases/booking/UpdateAppointment.js';
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
import { SendOTP } from './use-cases/SendOTP.js';
import { VerifyOTP } from './use-cases/VerifyOTP.js';

import { protect, authorize } from './middleware/auth-middleware.js';
import { loginRateLimiter, recordFailedLogin, clearLoginAttempts } from './middleware/login-rate-limiter.js';
import { buildChatbotRouter } from './routes/chatbot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const conversationRepo = new SqliteConversationRepository(db);
const whatsAppClient: IWhatsAppClient = process.env.FAKE_TWILIO === '1'
  ? new FakeTwilioClient()
  : new TwilioWhatsAppClient(
      twilio(process.env.TWILIO_ACCOUNT_SID || '', process.env.TWILIO_AUTH_TOKEN || ''),
      process.env.TWILIO_FROM_NUMBER || 'whatsapp:+14155238886',
    );
const llmClient: ILLMClient = process.env.FAKE_LLM === '1'
  ? new FakeLLMClient()
  : new OpenAILLMClient(process.env.OPENAI_API_KEY || '');
const chatbotRouter = buildChatbotRouter({ whatsAppClient, llmClient });

const listBarbers = new ListBarbers(barberRepo);
const loginUseCase = new LoginUseCase(userRepo);
const registerUseCase = new RegisterUseCase(userRepo);
const createService = new CreateService(serviceRepo);
const listServices = new ListServices(serviceRepo);
const updateService = new UpdateService(serviceRepo);
const deleteService = new DeleteService(serviceRepo);
const getService = new GetService(serviceRepo);
const createAppointment = new CreateAppointment(appointmentRepo, shiftRepo, serviceRepo);
const cancelAppointment = new CancelAppointment(appointmentRepo, customerRepo, barberRepo, serviceRepo);
const getAvailableSlots = new GetAvailableSlots(appointmentRepo, shiftRepo, db);
const updateAppointment = new UpdateAppointment(appointmentRepo, serviceRepo, shiftRepo);
const processSale = new ProcessSale(saleRepo, customerRepo, barberRepo, productRepo, db, conversationRepo, whatsAppClient);
const resendReceiptUseCase = new ResendReceipt(saleRepo, customerRepo, conversationRepo, whatsAppClient);
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
const sendOTP = new SendOTP(userRepo, customerRepo);
const verifyOTP = new VerifyOTP(userRepo, customerRepo);

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
    req.body = {};
  }
  next();
});

// Chatbot routes (public, no auth required)
app.use(chatbotRouter);

// Public Discovery
app.get('/api/public/shops', (req, res) => {
  try {
    const shops = db.prepare('SELECT * FROM shops').all();
    res.json(shops);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/shops/:id', (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
    const services = db.prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1').all(req.params.id);
    const barbers = db.prepare('SELECT * FROM barbers WHERE shop_id = ? AND is_active = 1').all(req.params.id);
    const settingRows = db.prepare("SELECT key, value FROM shop_settings WHERE shop_id = ? AND key IN ('open_time', 'close_time')").all(req.params.id) as { key: string; value: string }[];
    const settings = {
      open_time: settingRows.find(r => r.key === 'open_time')?.value ?? null,
      close_time: settingRows.find(r => r.key === 'close_time')?.value ?? null,
    };
    res.json({ shop, services, barbers, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/barbers/:slug', async (req, res) => {
  try {
    const barber = await barberRepo.findBySlug(req.params.slug);
    if (!barber) return res.status(404).json({ error: 'Barber not found' });
    
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(barber.shop_id);
    const services = db.prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1').all(barber.shop_id);
    res.json({ barber, shop, services });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/barbers/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { date, duration } = req.query;
  try {
    const slots = await getAvailableSlots.execute({ 
      barber_id: Number(id), 
      date: date as string, 
      duration: Number(duration || 30) 
    });
    res.json(slots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auth
app.post('/api/auth/otp/send', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await sendOTP.execute(email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/otp/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const result = await verifyOTP.execute(email, code);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  try {
    const result = await loginUseCase.execute(username, password);
    clearLoginAttempts(ip, username);
    res.json(result);
  } catch (err: any) {
    recordFailedLogin(ip, username);
    const code = err.code || 'invalid_credentials';
    res.status(401).json({ error: code });
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

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  // Always return 204 to prevent user enumeration
  res.status(204).end();
  if (!email) return;
  try {
    const user = await userRepo.findByEmail(email);
    if (!user || user.role === 'CUSTOMER') return; // only reset staff accounts
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await userRepo.update({ id: user.id, otp_code: otp, otp_expires: expires });
    const { sendOTP } = await import('./communication.js');
    await sendOTP(email, otp);
  } catch { /* silent — response already sent */ }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password too short' });
  }
  try {
    const user = await userRepo.findByEmail(email);
    if (!user || !user.otp_code || user.otp_code !== code) {
      return res.status(400).json({ error: 'invalid_code' });
    }
    if (user.otp_expires && new Date(user.otp_expires) < new Date()) {
      return res.status(400).json({ error: 'code_expired' });
    }
    const bcrypt = await import('bcryptjs');
    const password_hash = await bcrypt.hash(new_password, 10);
    await userRepo.update({ id: user.id, password_hash, otp_code: null, otp_expires: null });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { shop_name, owner_email, owner_password, owner_fullname } = req.body;
  if (!shop_name || !owner_email || !owner_password || !owner_fullname) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (owner_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(owner_email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const existingUser = await userRepo.findByEmail(owner_email);
  if (existingUser) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  try {
    const bcrypt = await import('bcryptjs');
    const password_hash = await bcrypt.hash(owner_password, 10);
    const signup = db.transaction(() => {
      const shopInfo = db.prepare('INSERT INTO shops (name) VALUES (?)').run(shop_name);
      const shopId = Number(shopInfo.lastInsertRowid);
      const username = owner_email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'owner';
      let finalUsername = username;
      let suffix = 1;
      while (db.prepare('SELECT 1 FROM users WHERE username = ?').get(finalUsername)) {
        finalUsername = `${username}${suffix++}`;
      }
      const userInfo = db.prepare(
        'INSERT INTO users (username, email, password_hash, role, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(finalUsername, owner_email, password_hash, 'OWNER', shopId, owner_fullname);
      const userId = Number(userInfo.lastInsertRowid);
      // Default shop settings
      const defaults = [['open_time', '09:00'], ['close_time', '18:00'], ['currency_symbol', '$'], ['default_tax_rate', '0'], ['locale', 'es-DO']];
      const ins = db.prepare('INSERT OR IGNORE INTO shop_settings (shop_id, key, value) VALUES (?, ?, ?)');
      for (const [key, value] of defaults) ins.run(shopId, key, value);
      return { shopId, userId, username: finalUsername };
    });
    const { shopId, userId, username: finalUsername } = signup();
    const jwt = await import('jsonwebtoken');
    const { JWT_SECRET } = await import('./auth/jwt-secret.js');
    const token = jwt.sign(
      { id: userId, username: finalUsername, role: 'OWNER', barber_id: null, customer_id: null, shop_id: shopId, fullname: owner_fullname },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any }
    );
    res.status(201).json({
      token,
      user: { id: userId, username: finalUsername, email: owner_email, role: 'OWNER', shop_id: shopId, fullname: owner_fullname }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

    // Ensure user has a linked customer record
    let customerId = user.customer_id;
    if (!customerId) {
      const existingCustomer = await customerRepo.findByEmailOrPhone(user.email, null);
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        customerId = await customerRepo.create({
          email: user.email,
          name: user.fullname || user.username,
          last_visit: new Date().toISOString()
        });
      }
      await userRepo.update({ id: user.id, customer_id: customerId });
    }

    // Check if customer profile is incomplete
    let requires_profile_completion = false;
    const customer = await customerRepo.findById(customerId);
    
    if (customer) {
      // Sync name if missing but we have it on user
      if (!customer.name && user.fullname) {
        await customerRepo.update({ id: customer.id, name: user.fullname });
        customer.name = user.fullname;
      }

      const isStaff = ['BARBER', 'OWNER', 'MANAGER'].includes(user.role);
      if (!customer.name) {
        requires_profile_completion = true;
      } else if (!isStaff && !customer.birthday) {
        requires_profile_completion = true;
      }
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      barber_id: user.barber_id,
      customer_id: customerId,
      shop_id: user.shop_id,
      fullname: user.fullname,
      requires_profile_completion
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});
app.patch('/api/auth/profile', protect, async (req, res) => {
  const userId = req.user?.id;
  try {
    const user = await updateProfile.execute({ ...req.body, id: userId! });

    // If it's a customer, also update the customer record with birthday/name
    if (user.role === 'CUSTOMER' && user.customer_id) {
      await customerRepo.update({
        id: user.customer_id,
        name: req.body.fullname || user.fullname,
        birthday: req.body.birthday
      });
    }

    res.json({ success: true, user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      barber_id: user.barber_id,
      customer_id: user.customer_id,
      shop_id: user.shop_id,
      fullname: user.fullname
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

app.get('/api/customers', protect, async (req, res) => {
  const shopId = req.user?.shop_id ?? null;
  if (req.user?.role === 'BARBER') {
    const rows = shopId !== null
      ? db.prepare('SELECT DISTINCT c.* FROM customers c JOIN sales s ON s.customer_id = c.id WHERE s.barber_id = ? AND c.shop_id = ? ORDER BY c.last_visit DESC').all(req.user.barber_id, shopId)
      : db.prepare('SELECT DISTINCT c.* FROM customers c JOIN sales s ON s.customer_id = c.id WHERE s.barber_id = ? ORDER BY c.last_visit DESC').all(req.user.barber_id);
    return res.json(rows);
  }
  const customers = shopId !== null
    ? await customerRepo.findAll(shopId)
    : db.prepare('SELECT * FROM customers ORDER BY last_visit DESC').all();
  res.json(customers);
});

app.get('/api/customers/:id', protect, (req, res) => {
  const { id } = req.params;
  const shopId = req.user?.shop_id ?? null;
  const customer = shopId !== null
    ? db.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').get(id, shopId) as any
    : db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
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
  const shopId = req.user?.shop_id ?? null;
  const { name, email, phone, notes, tags } = req.body;

  // Verify ownership before mutation
  const existing = shopId !== null
    ? db.prepare('SELECT id FROM customers WHERE id = ? AND shop_id = ?').get(id, shopId)
    : db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  if (req.user?.role === 'BARBER') {
    const hasServed = db.prepare('SELECT 1 FROM sales WHERE customer_id = ? AND barber_id = ? LIMIT 1').get(id, req.user.barber_id);
    if (!hasServed) return res.status(403).json({ error: 'Not authorized to update this customer' });
  }

  try {
    if (shopId !== null) {
      db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, notes = ?, tags = ? WHERE id = ? AND shop_id = ?')
        .run(name, email, phone, notes, tags, id, shopId);
    } else {
      db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, notes = ?, tags = ? WHERE id = ?')
        .run(name, email, phone, notes, tags, id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/customers/:id/history', protect, (req, res) => {
  const { id } = req.params;
  const shopId2 = req.user?.shop_id ?? null;
  if (shopId2 !== null) {
    const owned = db.prepare('SELECT id FROM customers WHERE id = ? AND shop_id = ?').get(id, shopId2);
    if (!owned) return res.status(404).json({ error: 'Customer not found' });
  }

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
  const asCustomer = req.query.as === 'customer';

  if ((req.user?.role === 'CUSTOMER' || asCustomer) && req.user?.customer_id) {
    const query = `
      SELECT a.*, b.name as barber_name, sh.name as shop_name,
             (SELECT group_concat(s.name || ' x' || ai.quantity, ', ') 
              FROM appointment_items ai 
              JOIN services s ON ai.service_id = s.id 
              WHERE ai.appointment_id = a.id) as services_summary
      FROM appointments a
      JOIN barbers b ON a.barber_id = b.id
      LEFT JOIN shops sh ON a.shop_id = sh.id
      WHERE a.customer_id = ?
      ORDER BY a.start_time DESC
    `;
    return res.json(db.prepare(query).all(req.user.customer_id));
  }

  let query = `
    SELECT a.*, b.name as barber_name, c.name as customer_name,
           (SELECT group_concat(s.name || ' x' || ai.quantity, ', ') 
            FROM appointment_items ai 
            JOIN services s ON ai.service_id = s.id 
            WHERE ai.appointment_id = a.id) as services_summary
    FROM appointments a
    JOIN barbers b ON a.barber_id = b.id
    LEFT JOIN customers c ON a.customer_id = c.id
    WHERE date(a.start_time) = ? AND (a.shop_id = ? OR ? IS NULL)
  `;
  const params: any[] = [date, shopId, shopId];

  if (req.user?.role === 'BARBER') {
    query += ' AND a.barber_id = ?';
    params.push(req.user.barber_id);
  }

  query += ' ORDER BY a.start_time ASC';
  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

app.get('/api/appointments/:id', protect, (req, res) => {
  const shopId = req.user?.shop_id;
  const query = shopId !== null
    ? `SELECT a.*, b.name as barber_name, c.name as customer_name,
         (SELECT group_concat(s.name || ' x' || ai.quantity, ', ')
          FROM appointment_items ai JOIN services s ON ai.service_id = s.id WHERE ai.appointment_id = a.id) as services_summary
       FROM appointments a JOIN barbers b ON a.barber_id = b.id LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ? AND (a.shop_id = ? OR ? IS NULL)`
    : `SELECT a.*, b.name as barber_name, c.name as customer_name,
         (SELECT group_concat(s.name || ' x' || ai.quantity, ', ')
          FROM appointment_items ai JOIN services s ON ai.service_id = s.id WHERE ai.appointment_id = a.id) as services_summary
       FROM appointments a JOIN barbers b ON a.barber_id = b.id LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`;
  const appt = shopId !== null
    ? db.prepare(query).get(req.params.id, shopId, shopId) as any
    : db.prepare(query).get(req.params.id) as any;
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  res.json(appt);
});

app.get('/api/appointments/:id/items', protect, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT ai.*, s.name, s.price, s.duration_minutes 
      FROM appointment_items ai
      JOIN services s ON ai.service_id = s.id
      WHERE ai.appointment_id = ?
    `).all(req.params.id);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', protect, async (req, res) => {
  const shopId = req.user?.shop_id || req.body.shop_id;
  let { send_confirmation, barber_id, services, service_id, start_time } = req.body;
  
  if (!services && service_id) {
    services = [{ id: service_id, quantity: 1 }];
  }
  
  // Robust customer_id selection: prioritize token id if it's a customer booking for themselves
  let customer_id = req.body.customer_id;
  if (req.user?.role === 'CUSTOMER' && req.user.customer_id) {
    customer_id = req.user.customer_id;
  } else if (!customer_id && req.user?.customer_id) {
    // If a staff member is booking for themselves
    customer_id = req.user.customer_id;
  }
  
  if (req.user?.role === 'BARBER' && req.user.barber_id !== barber_id) {
    return res.status(403).json({ error: 'Cannot book for another barber' });
  }

  try {
    const result = await createAppointment.execute({ ...req.body, shop_id: shopId, customer_id, services });
    
    // Send confirmation if requested
    if (send_confirmation && result.ids.length > 0) {
      const barber = db.prepare('SELECT name FROM barbers WHERE id = ?').get(barber_id) as any;
      const primaryService = services && services.length > 0 ? db.prepare('SELECT name FROM services WHERE id = ?').get(services[0].id) as any : null;
      const customer = customer_id ? db.prepare('SELECT name, email, phone FROM customers WHERE id = ?').get(customer_id) as any : null;

      if (barber && primaryService) {
        sendAppointmentNotification({
          customer_name: customer?.name,
          customer_email: customer?.email,
          customer_phone: customer?.phone,
          start_time,
          service_name: primaryService.name + (services.length > 1 ? ` (+${services.length - 1} more)` : ''),
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

app.post('/api/appointments/:id/cancel', protect, async (req, res) => {
  const { id } = req.params;
  try {
    await cancelAppointment.execute({
      appointment_id: Number(id),
      user_id: req.user!.id,
      user_role: req.user!.role,
      customer_id: req.user!.customer_id,
      reason: req.body?.reason
    });
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', protect, async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    await updateAppointment.execute({
      appointment_id: Number(id),
      user_id: user.id,
      user_role: user.role,
      customer_id: user.customer_id,
      new_start_time: req.body.start_time,
      new_barber_id: req.body.barber_id,
      new_services: req.body.services,
      new_notes: req.body.notes
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/appointments/:id', protect, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (status === 'cancelled') {
    // Logic moved to /cancel endpoint for better security and validation
    return res.status(400).json({ error: 'Use /api/appointments/:id/cancel for cancellations' });
  }

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true });
});

app.post('/api/barbers', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const shopId = req.user?.shop_id;
  try {
    const id = await barberRepo.create({ ...req.body, shop_id: shopId });
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/barbers/:id', protect, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const id = req.params.id as string;
  try {
    await barberRepo.update({ ...req.body, id: parseInt(id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
  const { name, description, price, min_stock_threshold, supplier_id } = req.body;
  const result = db.prepare('INSERT INTO products (name, description, price, min_stock_threshold, supplier_id, shop_id) VALUES (?, ?, ?, ?, ?, ?)').run(name, description, price, min_stock_threshold, supplier_id || null, shopId);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.post('/api/products', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const { name, description, price, min_stock_threshold, supplier_id } = req.body;
  try {
    const result = db.prepare('INSERT INTO products (name, description, price, min_stock_threshold, supplier_id, shop_id, stock) VALUES (?, ?, ?, ?, ?, ?, 0)').run(name, description, price, min_stock_threshold, supplier_id, shopId);
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
  const { name, description, price, min_stock_threshold, supplier_id } = req.body;
  try {
    db.prepare('UPDATE products SET name = ?, description = ?, price = ?, min_stock_threshold = ?, supplier_id = ? WHERE id = ?').run(name, description, price, min_stock_threshold, supplier_id, req.params.id);
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
    const { name, description, price, duration_minutes } = req.body;
    const result = db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id) VALUES (?, ?, ?, ?, ?)').run(name, description, price, duration_minutes, shopId);
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
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;
  const settings = db.prepare('SELECT * FROM shop_settings WHERE shop_id = ?').all(shopId);
  const settingsMap = (settings as any[]).reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  
  res.json({
    ...settingsMap,
    shop_name: shop?.name || '',
    shop_address: shop?.address || '',
    shop_phone: shop?.phone || ''
  });
});

app.post('/api/settings', protect, authorize('OWNER', 'MANAGER'), (req, res) => {
  const shopId = req.user?.shop_id;
  const settings = { ...req.body };
  
  // Extract shop-specific fields from settings to update the shops table
  const { shop_name, shop_address, shop_phone } = settings;
  delete settings.shop_name;
  delete settings.shop_address;
  delete settings.shop_phone;

  const upsertSetting = db.prepare('INSERT OR REPLACE INTO shop_settings (shop_id, key, value) VALUES (?, ?, ?)');
  const updateShop = db.prepare('UPDATE shops SET name = ?, address = ?, phone = ? WHERE id = ?');
  
  const transaction = db.transaction((settings: any, shopInfo: any) => {
    // 1. Update shop details
    updateShop.run(shopInfo.name, shopInfo.address, shopInfo.phone, shopId);

    // 2. Update all other settings
    for (const [key, value] of Object.entries(settings)) {
      upsertSetting.run(shopId, key, String(value));
    }
  });

  try {
    transaction(settings, { name: shop_name, address: shop_address, phone: shop_phone });
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

app.post('/api/sales/:id/resend-receipt', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  if (!shopId) return res.status(400).json({ error: 'Missing shop context' });
  const saleId = parseInt(req.params.id as string);
  if (isNaN(saleId)) return res.status(400).json({ error: 'Invalid sale id' });

  const { email, phone } = req.body || {};
  try {
    const result = await resendReceiptUseCase.execute({
      saleId,
      shopId,
      email: email ?? null,
      phone: phone ?? null,
    });
    res.json({ success: true, channels: result.channels });
  } catch (err: any) {
    const status = /not found/i.test(err.message) ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

app.get('/api/sales', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  const { startDate, endDate, barberId: queryBarberId, as: asParam } = req.query;

  if ((req.user?.role === 'CUSTOMER' || asParam === 'customer') && req.user?.customer_id) {
    const query = `
      SELECT s.id, s.timestamp, s.total_amount, b.name as barber_name,
             (SELECT group_concat(name, ', ') FROM sale_items si JOIN services srv ON si.item_id = srv.id WHERE si.sale_id = s.id AND si.type = 'service') as services,
             (SELECT group_concat(name, ', ') FROM sale_items si JOIN products p ON si.item_id = p.id WHERE si.sale_id = s.id AND si.type = 'product') as products
      FROM sales s
      JOIN barbers b ON s.barber_id = b.id
      WHERE s.customer_id = ?
      ORDER BY s.timestamp DESC
    `;
    return res.json(db.prepare(query).all(req.user.customer_id));
  }

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

const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
