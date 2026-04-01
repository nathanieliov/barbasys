import { UserRepository } from './user-repository.interface.js';
import { User } from '../domain/entities.js';
import db from '../db.js';

export class SQLiteUserRepository implements UserRepository {
  async findById(id: number): Promise<User | null> {
    const user = db.prepare(`
      SELECT u.*, COALESCE(b.fullname, u.fullname) as fullname 
      FROM users u 
      LEFT JOIN barbers b ON u.barber_id = b.id 
      WHERE u.id = ?
    `).get(id) as User | undefined;
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = db.prepare(`
      SELECT u.*, COALESCE(b.fullname, u.fullname) as fullname 
      FROM users u 
      LEFT JOIN barbers b ON u.barber_id = b.id 
      WHERE u.username = ?
    `).get(username) as User | undefined;
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = db.prepare(`
      SELECT u.*, COALESCE(b.fullname, u.fullname) as fullname 
      FROM users u 
      LEFT JOIN barbers b ON u.barber_id = b.id 
      WHERE u.email = ?
    `).get(email) as User | undefined;
    return user || null;
  }

  async findAll(shopId: number): Promise<User[]> {
    return db.prepare('SELECT id, username, email, role, barber_id, shop_id, created_at, fullname FROM users WHERE shop_id = ?').all(shopId) as User[];
  }

  async create(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const info = db.prepare(
      'INSERT INTO users (username, email, password_hash, role, barber_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(user.username, user.email, user.password_hash, user.role, user.barber_id, user.shop_id, user.fullname || null);
    
    return {
      ...user,
      id: info.lastInsertRowid as number,
      created_at: new Date().toISOString()
    };
  }

  async update(user: Partial<User> & { id: number }): Promise<User> {
    const existing = await this.findById(user.id);
    if (!existing) throw new Error('User not found');

    const username = user.username ?? existing.username;
    const email = user.email ?? existing.email;
    const role = user.role ?? existing.role;
    const barber_id = user.barber_id !== undefined ? user.barber_id : existing.barber_id;
    const password_hash = user.password_hash ?? existing.password_hash;
    const fullname = user.fullname ?? existing.fullname;

    db.prepare(
      'UPDATE users SET username = ?, email = ?, role = ?, barber_id = ?, password_hash = ?, fullname = ? WHERE id = ?'
    ).run(username, email, role, barber_id, password_hash, fullname, user.id);

    return (await this.findById(user.id))!;
  }

  async updateShopId(userId: number, shopId: number): Promise<void> {
    db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run(shopId, userId);
  }

  async delete(id: number): Promise<void> {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}
