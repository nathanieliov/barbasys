import { Database } from 'better-sqlite3';
import { Appointment } from '../domain/entities.js';
import { IAppointmentRepository } from './appointment-repository.interface.js';

export class SQLiteAppointmentRepository implements IAppointmentRepository {
  constructor(private db: Database) {}

  async create(appointment: Omit<Appointment, 'id' | 'status' | 'reminder_sent'> & { recurring_id?: string | null, recurring_rule?: string | null }): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO appointments (barber_id, customer_id, service_id, start_time, recurring_id, recurring_rule, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      appointment.barber_id,
      appointment.customer_id,
      appointment.service_id,
      appointment.start_time,
      appointment.recurring_id || null,
      appointment.recurring_rule || null,
      appointment.shop_id
    );
    return Number(result.lastInsertRowid);
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
      JOIN services s ON a.service_id = s.id
      WHERE a.barber_id = ? AND a.status != 'cancelled'
      AND ((datetime(a.start_time) < datetime(?)) AND (datetime(a.start_time, '+' || s.duration_minutes || ' minutes') > datetime(?)))
    `).get(barberId, endTime, startTime);
    return !!conflict;
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  }
}
