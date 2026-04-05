import { Database } from 'better-sqlite3';
import { Appointment } from '../domain/entities.js';
import { IAppointmentRepository } from './appointment-repository.interface.js';

export class SQLiteAppointmentRepository implements IAppointmentRepository {
  constructor(private db: Database) {}

  async create(appointment: Omit<Appointment, 'id' | 'status' | 'reminder_sent'> & { recurring_id?: string | null, recurring_rule?: string | null }): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO appointments (barber_id, customer_id, service_id, start_time, total_duration_minutes, recurring_id, recurring_rule, shop_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      appointment.barber_id,
      appointment.customer_id,
      appointment.service_id,
      appointment.start_time,
      appointment.total_duration_minutes || 30,
      appointment.recurring_id || null,
      appointment.recurring_rule || null,
      appointment.shop_id,
      appointment.notes || null
    );
    return Number(result.lastInsertRowid);
  }

  async addItem(item: { appointment_id: number, service_id: number, quantity: number, price_at_booking: number }): Promise<void> {
    this.db.prepare(
      'INSERT INTO appointment_items (appointment_id, service_id, quantity, price_at_booking) VALUES (?, ?, ?, ?)'
    ).run(item.appointment_id, item.service_id, item.quantity, item.price_at_booking);
  }

  async findById(id: number): Promise<Appointment | null> {
    return this.db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment | null;
  }

  async findByBarberAndDateRange(barberId: number, start: string, end: string): Promise<Appointment[]> {
    return this.db.prepare(
      'SELECT * FROM appointments WHERE barber_id = ? AND start_time >= ? AND start_time <= ? AND status != "cancelled"'
    ).all(barberId, start, end) as Appointment[];
  }

  async checkConflict(barberId: number, startTime: string, endTime: string): Promise<boolean> {
    const conflict = this.db.prepare(`
      SELECT a.id FROM appointments a
      WHERE a.barber_id = ? AND a.status != 'cancelled'
      AND ((datetime(a.start_time) < datetime(?)) AND (datetime(a.start_time, '+' || a.total_duration_minutes || ' minutes') > datetime(?)))
    `).get(barberId, endTime, startTime);
    return !!conflict;
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  }
}
