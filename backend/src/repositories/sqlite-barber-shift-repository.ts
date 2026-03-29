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
}
