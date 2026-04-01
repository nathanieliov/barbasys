export type UserRole = 'OWNER' | 'MANAGER' | 'BARBER';
export type PaymentModel = 'COMMISSION' | 'FIXED';
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

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  barber_id: number | null;
  shop_id: number | null;
  fullname?: string | null;
}
