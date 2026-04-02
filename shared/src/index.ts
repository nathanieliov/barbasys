export type UserRole = 'OWNER' | 'MANAGER' | 'BARBER';
export type PaymentModel = 'COMMISSION' | 'FIXED' | 'FIXED_FEE';
export type FixedPeriod = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY';

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
