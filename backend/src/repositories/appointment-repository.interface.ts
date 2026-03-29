import { Appointment } from '../domain/entities.js';

export interface IAppointmentRepository {
  create(appointment: Omit<Appointment, 'id'>): Promise<number>;
  findById(id: number): Promise<Appointment | null>;
  findByBarberAndDateRange(barberId: number, start: string, end: string): Promise<Appointment[]>;
  checkConflict(barberId: number, startTime: string, endTime: string): Promise<boolean>;
  delete(id: number): Promise<void>;
}
