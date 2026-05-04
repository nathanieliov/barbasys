import type Database from 'better-sqlite3';
import db from '../../db.js';
import type { Service, Barber } from '../../domain/entities.js';

export interface ShopContext {
  shopName: string;
  activeServices: Service[];
  activeBarbers: Barber[];
}

export async function loadShopContext(shopId: number): Promise<ShopContext> {
  const shop = db.prepare('SELECT name FROM shops WHERE id = ?').get(shopId) as { name: string } | undefined;
  if (!shop) throw new Error(`Shop ${shopId} not found`);

  const services = db
    .prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1')
    .all(shopId) as Service[];

  const barbers = db
    .prepare('SELECT * FROM barbers WHERE shop_id = ? AND is_active = 1')
    .all(shopId) as Barber[];

  return {
    shopName: shop.name,
    activeServices: services,
    activeBarbers: barbers,
  };
}
