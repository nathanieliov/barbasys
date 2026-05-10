import { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { OutstandingTab, TabStatus, CreateTabDto } from '@barbasys/shared';
import type { ITabRepository } from './tab-repository.interface.js';

interface TabRow {
  id: string;
  customer_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  barber_id: number;
  barber_name: string | null;
  sale_id: number | null;
  items_json: string;
  amount: number;
  opened_at: string;
  status: string;
  last_reminder_at: string | null;
  reminder_count: number;
  note: string | null;
  paid_at: string | null;
  paid_method: string | null;
  paid_sale_id: number | null;
  tip_on_payback: number | null;
  shop_id: number | null;
}

function rowToTab(row: TabRow): OutstandingTab {
  return {
    id: row.id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    barber_id: row.barber_id,
    barber_name: row.barber_name,
    sale_id: row.sale_id,
    items: JSON.parse(row.items_json),
    amount: row.amount,
    opened_at: row.opened_at,
    status: row.status as TabStatus,
    last_reminder_at: row.last_reminder_at,
    reminder_count: row.reminder_count,
    note: row.note,
    paid_at: row.paid_at,
    paid_method: row.paid_method as OutstandingTab['paid_method'],
    tip_on_payback: row.tip_on_payback,
    shop_id: row.shop_id,
  };
}

const SELECT_COLS = `
  t.id, t.customer_id, c.name AS customer_name, c.phone AS customer_phone,
  t.barber_id, b.name AS barber_name, t.sale_id,
  t.items_json, t.amount, t.opened_at, t.status,
  t.last_reminder_at, t.reminder_count, t.note,
  t.paid_at, t.paid_method, t.paid_sale_id, t.tip_on_payback, t.shop_id
`;

const JOIN_CLAUSE = `
  FROM outstanding_tabs t
  LEFT JOIN customers c ON c.id = t.customer_id
  LEFT JOIN barbers b ON b.id = t.barber_id
`;

export class SqliteTabRepository implements ITabRepository {
  constructor(private db: Database) {}

  findById(id: string): OutstandingTab | null {
    const row = this.db.prepare(`SELECT ${SELECT_COLS} ${JOIN_CLAUSE} WHERE t.id = ?`).get(id) as TabRow | undefined;
    return row ? rowToTab(row) : null;
  }

  findByShop(shopId: number, status: TabStatus | 'all' = 'all'): OutstandingTab[] {
    let sql = `SELECT ${SELECT_COLS} ${JOIN_CLAUSE} WHERE t.shop_id = ?`;
    const params: (string | number)[] = [shopId];
    if (status !== 'all') {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY t.opened_at DESC';
    return (this.db.prepare(sql).all(...params) as TabRow[]).map(rowToTab);
  }

  findByCustomer(customerId: number): OutstandingTab[] {
    const rows = this.db.prepare(
      `SELECT ${SELECT_COLS} ${JOIN_CLAUSE} WHERE t.customer_id = ? ORDER BY t.opened_at DESC`
    ).all(customerId) as TabRow[];
    return rows.map(rowToTab);
  }

  findByBarber(barberId: number, shopId?: number): OutstandingTab[] {
    let sql = `SELECT ${SELECT_COLS} ${JOIN_CLAUSE} WHERE t.barber_id = ?`;
    const params: (string | number)[] = [barberId];
    if (shopId !== undefined) {
      sql += ' AND t.shop_id = ?';
      params.push(shopId);
    }
    sql += ' ORDER BY t.opened_at DESC';
    return (this.db.prepare(sql).all(...params) as TabRow[]).map(rowToTab);
  }

  countOpenByCustomer(customerId: number): number {
    const row = this.db.prepare(
      `SELECT COUNT(*) AS n FROM outstanding_tabs WHERE customer_id = ? AND status IN ('open','reminded')`
    ).get(customerId) as { n: number };
    return row.n;
  }

  create(data: CreateTabDto): OutstandingTab {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO outstanding_tabs
        (id, customer_id, barber_id, sale_id, items_json, amount, note, shop_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.customerId,
      data.barberId,
      data.saleId ?? null,
      JSON.stringify(data.items),
      data.amount,
      data.note ?? null,
      data.shopId,
    );
    return this.findById(id)!;
  }

  updateStatus(
    id: string,
    status: TabStatus,
    extra: {
      paid_at?: string;
      paid_method?: 'cash' | 'bank_transfer';
      paid_sale_id?: number;
      tip_on_payback?: number;
      last_reminder_at?: string;
      reminder_count?: number;
    } = {},
  ): void {
    const sets: string[] = ['status = ?'];
    const vals: (string | number | null)[] = [status];

    if (extra.paid_at !== undefined)       { sets.push('paid_at = ?');        vals.push(extra.paid_at); }
    if (extra.paid_method !== undefined)   { sets.push('paid_method = ?');    vals.push(extra.paid_method); }
    if (extra.paid_sale_id !== undefined)  { sets.push('paid_sale_id = ?');   vals.push(extra.paid_sale_id); }
    if (extra.tip_on_payback !== undefined){ sets.push('tip_on_payback = ?'); vals.push(extra.tip_on_payback); }
    if (extra.last_reminder_at !== undefined){ sets.push('last_reminder_at = ?'); vals.push(extra.last_reminder_at); }
    if (extra.reminder_count !== undefined){ sets.push('reminder_count = ?'); vals.push(extra.reminder_count); }

    vals.push(id);
    this.db.prepare(`UPDATE outstanding_tabs SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }

  logReminder(tabId: string, sentBy: number | null, waStatus: string): void {
    this.db.prepare(
      `INSERT INTO tab_reminder_log (tab_id, sent_by, wa_status) VALUES (?, ?, ?)`
    ).run(tabId, sentBy, waStatus);
  }
}
