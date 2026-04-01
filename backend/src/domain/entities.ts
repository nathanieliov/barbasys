export type UserRole = 'OWNER' | 'MANAGER' | 'BARBER';
export type PaymentModel = 'COMMISSION' | 'FIXED';
export type FixedPeriod = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  barber_id: number | null;
  shop_id: number | null;
  created_at: string;
  fullname?: string | null;
}

export interface Barber {
  id: number;
  name: string;
  fullname: string;
  payment_model: PaymentModel;
  service_commission_rate: number;
  product_commission_rate: number;
  fixed_amount: number | null;
  fixed_period: FixedPeriod | null;
  shop_id: number | null;
  is_active: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  min_stock_threshold: number;
  supplier_id: number | null;
  shop_id: number | null;
  is_active: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  lead_time_days: number;
  is_active: number;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  shop_id: number | null;
  is_active: number;
}

export interface Customer {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  last_visit: string | null;
  notes: string | null;
  created_at: string;
}

export interface Sale {
  id: number;
  barber_id: number;
  customer_id: number | null;
  total_amount: number;
  tip_amount: number;
  tax_amount: number;
  discount_amount: number;
  customer_email: string | null;
  customer_phone: string | null;
  barber_name: string;
  timestamp: string;
  shop_id: number | null;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  item_id: number;
  item_name: string;
  type: 'service' | 'product';
  price: number;
}

export interface Appointment {
  id: number;
  barber_id: number;
  customer_id: number | null;
  service_id: number;
  start_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  shop_id: number | null;
}
