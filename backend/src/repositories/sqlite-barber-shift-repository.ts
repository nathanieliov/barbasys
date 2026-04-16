import { Database } from 'better-sqlite3';
import { BarberShift, IBarberShiftRepository } from './barber-shift-repository.interface.js';

export class SQLiteBarberShiftRepository implements IBarberShiftRepository {
  constructor(private db: Database) {}

  async findByBarberAndDay(barberId: number, dayOfWeek: number): Promise<BarberShift[]> {
    return this.db.prepare(
      'SELECT * FROM barber_shifts WHERE barber_id = ? AND day_of_week = ?'
    ).all(barberId, dayOfWeek) as BarberShift[];
  }

  async isBarberWorking(barberId: number, dayOfWeek: number, time: string): Promise<boolean> {
    const shift = this.db.prepare(
      'SELECT id FROM barber_shifts WHERE barber_id = ? AND day_of_week = ? AND ? >= start_time AND ? <= end_time'
    ).get(barberId, dayOfWeek, time, time);
    return !!shift;
  }

  async checkRangeWorking(barberId: number, dayOfWeek: number, startTime: string, endTime: string): Promise<boolean> {
    // Check if there is a shift that covers the entire requested range
    const shift = this.db.prepare(
      'SELECT id FROM barber_shifts WHERE barber_id = ? AND day_of_week = ? AND ? >= start_time AND ? <= end_time'
    ).get(barberId, dayOfWeek, startTime, endTime);
    return !!shift;
  }

  async checkTimeOffConflict(barberId: number, start: string, end: string): Promise<boolean> {
    const conflict = this.db.prepare(`
      SELECT id FROM barber_time_off 
      WHERE barber_id = ? 
      AND datetime(start_time) < datetime(?) 
      AND datetime(end_time) > datetime(?)
    `).get(barberId, end, start);
    return !!conflict;
  }
}
