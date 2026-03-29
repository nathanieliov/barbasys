import { UserRepository } from './user-repository.interface.js';
import { User } from '../domain/entities.js';
import db from '../db.js';

export class SQLiteUserRepository implements UserRepository {
  async findById(id: number): Promise<User | null> {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    return user || null;
  }

  async create(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const info = db.prepare(
      'INSERT INTO users (username, email, password_hash, role, barber_id) VALUES (?, ?, ?, ?, ?)'
    ).run(user.username, user.email, user.password_hash, user.role, user.barber_id);
    
    return {
      ...user,
      id: info.lastInsertRowid as number,
      created_at: new Date().toISOString()
    };
  }

  async updateShopId(userId: number, shopId: number): Promise<void> {
    db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run(shopId, userId);
  }
}
