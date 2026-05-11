export type UserRole = 'OWNER' | 'MANAGER' | 'BARBER' | 'CUSTOMER';
export type PaymentModel = 'COMMISSION' | 'FIXED' | 'FIXED_FEE';
export type FixedPeriod = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  barber_id: number | null;
  customer_id: number | null;
  shop_id: number | null;
  created_at: string;
  fullname?: string | null;
  otp_code?: string | null;
  otp_expires?: string | null;
  otp_requests_count?: number | null;
  last_otp_request_at?: string | null;
}

export interface Barber {
  id: number;
  name: string;
  fullname: string;
  slug?: string | null;
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
  description: string;
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
  description: string;
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
  birthday: string | null;
  last_visit: string | null;
  notes: string | null;
  created_at: string;
  is_walkin?: number;
  wa_opt_in?: number;
  wa_opt_in_at?: string | null;
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
  total_duration_minutes: number;
  status: 'scheduled' | 'in-chair' | 'completed' | 'no-show' | 'cancelled';
  reminder_sent: number;
  recurring_id: string | null;
  recurring_rule: string | null;
  shop_id: number | null;
  notes?: string | null;
}

export type Intent = 'book' | 'reschedule' | 'cancel' | 'view_next' | 'faq' | 'unknown';
export type ConversationState = 'idle' | 'booking' | 'rescheduling' | 'cancelling' | 'faq';

export interface Conversation {
  id: number;
  customer_id: number | null;
  wa_phone: string;
  language: 'es' | 'en';
  state: ConversationState;
  context_json: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaMessage {
  id: number;
  conversation_id: number;
  direction: 'in' | 'out';
  wa_message_sid: string | null;
  body: string | null;
  media_url: string | null;
  intent: Intent | null;
  status: string | null;
  raw_payload_json: string | null;
  created_at: string;
}

export interface GCalPendingOp {
  id: number;
  barber_id: number;
  appointment_id: number | null;
  op: 'insert' | 'patch' | 'delete';
  payload_json: string;
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
}
