import { User } from '../domain/entities.js';

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(shopId: number): Promise<User[]>;
  create(user: Omit<User, 'id' | 'created_at'>): Promise<User>;
  update(user: Partial<User> & { id: number }): Promise<User>;
  updateShopId(userId: number, shopId: number): Promise<void>;
  delete(id: number): Promise<void>;
}
