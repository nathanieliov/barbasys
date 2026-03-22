export type UserRole = 'OWNER' | 'MANAGER' | 'BARBER';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  barber_id: number | null;
  shop_id: number | null;
  created_at: string;
}

export interface Barber {
  id: number;
  name: string;
  service_commission_rate: number;
  product_commission_rate: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  min_stock_threshold: number;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
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
  discount_amount: number;
  customer_email: string | null;
  customer_phone: string | null;
  timestamp: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  item_id: number;
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
}
