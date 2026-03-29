import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';

export interface CreateAppointmentRequest {
  barber_id: number;
  customer_id: number | null;
  service_id: number;
  start_time: string;
  recurring_rule?: 'weekly' | 'biweekly' | 'monthly' | null;
  occurrences?: number;
  shop_id: number;
}

export interface CreateAppointmentResponse {
  ids: number[];
  recurring_id: string | null;
}

export class CreateAppointment {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private barberShiftRepo: IBarberShiftRepository,
    private serviceRepo: IServiceRepository
  ) {}

  async execute(request: CreateAppointmentRequest): Promise<CreateAppointmentResponse> {
    const { barber_id, customer_id, service_id, start_time, recurring_rule, occurrences = 1, shop_id } = request;
    const recurring_id = recurring_rule ? Math.random().toString(36).substring(2, 15) : null;

    const service = await this.serviceRepo.findById(service_id);
    if (!service) throw new Error('Service not found');

    const createdIds: number[] = [];

    for (let i = 0; i < occurrences; i++) {
      const currentStart = new Date(start_time);
      if (recurring_rule === 'weekly') currentStart.setDate(currentStart.getDate() + (i * 7));
      if (recurring_rule === 'biweekly') currentStart.setDate(currentStart.getDate() + (i * 14));
      if (recurring_rule === 'monthly') currentStart.setMonth(currentStart.getMonth() + i);

      const startTimeStr = currentStart.toISOString().replace('T', ' ').substring(0, 19);
      const endTimeDate = new Date(currentStart.getTime() + service.duration_minutes * 60000);
      const endTimeStr = endTimeDate.toISOString().replace('T', ' ').substring(0, 19);

      const dayOfWeek = currentStart.getDay();
      const timeStr = currentStart.toTimeString().split(' ')[0].substring(0, 5);

      // Shift Validation
      const isWorking = await this.barberShiftRepo.isBarberWorking(barber_id, dayOfWeek, timeStr);
      if (!isWorking) {
        throw new Error(`Barber not working on ${currentStart.toLocaleDateString()} at ${timeStr}`);
      }

      // Conflict Detection
      const hasConflict = await this.appointmentRepo.checkConflict(barber_id, startTimeStr, endTimeStr);
      if (hasConflict) {
        throw new Error(`Conflict on ${currentStart.toLocaleDateString()} at ${timeStr}`);
      }

      const id = await this.appointmentRepo.create({
        barber_id,
        customer_id,
        service_id,
        start_time: startTimeStr,
        recurring_id,
        recurring_rule,
        shop_id,
        status: 'scheduled'
      } as any);
      createdIds.push(id);
    }

    return { ids: createdIds, recurring_id };
  }
}
