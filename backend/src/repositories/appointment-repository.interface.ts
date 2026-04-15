import { Appointment } from '../domain/entities.js';

export interface IAppointmentRepository {
  create(appointment: Omit<Appointment, 'id'>): Promise<number>;
  findById(id: number): Promise<Appointment | null>;
  findByBarberAndDateRange(barberId: number, start: string, end: string): Promise<Appointment[]>;
  checkConflict(barberId: number, startTime: string, endTime: string): Promise<boolean>;
  addItem(item: { appointment_id: number, service_id: number, quantity: number, price_at_booking: number }): Promise<void>;
  updateStatus(id: number, status: 'scheduled' | 'completed' | 'cancelled'): Promise<void>;
  update(appointment: Partial<Appointment> & { id: number }): Promise<void>;
  clearItems(appointment_id: number): Promise<void>;
  delete(id: number): Promise<void>;
}
