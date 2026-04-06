import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';
import { CreateAppointmentRequest, CreateAppointmentResponse } from '@barbasys/shared';

export class CreateAppointment {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private barberShiftRepo: IBarberShiftRepository,
    private serviceRepo: IServiceRepository
  ) {}

  async execute(request: CreateAppointmentRequest): Promise<CreateAppointmentResponse> {
    const { barber_id, customer_id, services, start_time, recurring_rule, occurrences = 1, shop_id, notes } = request;
    const recurring_id = recurring_rule ? Math.random().toString(36).substring(2, 15) : null;

    if (!services || services.length === 0) throw new Error('At least one service is required');

    // Fetch all requested services to calculate total duration and get prices
    const serviceDetails = await Promise.all(
      services.map(async (s) => {
        const detail = await this.serviceRepo.findById(s.id);
        if (!detail) throw new Error(`Service with ID ${s.id} not found`);
        return { ...detail, requestedQuantity: s.quantity };
      })
    );

    const totalDuration = serviceDetails.reduce((sum, s) => sum + (s.duration_minutes * s.requestedQuantity), 0);
    const createdIds: number[] = [];

    for (let i = 0; i < occurrences; i++) {
      const currentStart = new Date(start_time);
      if (recurring_rule === 'weekly') currentStart.setDate(currentStart.getDate() + (i * 7));
      if (recurring_rule === 'biweekly') currentStart.setDate(currentStart.getDate() + (i * 14));
      if (recurring_rule === 'monthly') currentStart.setMonth(currentStart.getMonth() + i);

      const startTimeStr = currentStart.toISOString().replace('T', ' ').substring(0, 19);
      const endTimeDate = new Date(currentStart.getTime() + totalDuration * 60000);
      const endTimeStr = endTimeDate.toISOString().replace('T', ' ').substring(0, 19);

      const dayOfWeek = currentStart.getDay();
      const timeStr = currentStart.toTimeString().split(' ')[0].substring(0, 5);

      // Shift Validation
      const isWorking = await this.barberShiftRepo.isBarberWorking(barber_id, dayOfWeek, timeStr);
      if (!isWorking) {
        throw new Error(`Barber not working on ${currentStart.toLocaleDateString()} at ${timeStr}`);
      }

      // Conflict Detection (now uses combined duration)
      const hasConflict = await this.appointmentRepo.checkConflict(barber_id, startTimeStr, endTimeStr);
      if (hasConflict) {
        throw new Error(`Conflict on ${currentStart.toLocaleDateString()} at ${timeStr}`);
      }

      const appointmentId = await this.appointmentRepo.create({
        barber_id,
        customer_id,
        service_id: services[0].id, // Primary service
        start_time: startTimeStr,
        total_duration_minutes: totalDuration,
        status: 'scheduled',
        reminder_sent: 0,
        recurring_id,
        recurring_rule: recurring_rule || null,
        shop_id,
        notes: notes || null
      });

      // Add each service item
      for (const s of serviceDetails) {
        await this.appointmentRepo.addItem({
          appointment_id: appointmentId,
          service_id: s.id,
          quantity: s.requestedQuantity,
          price_at_booking: s.price
        });
      }

      createdIds.push(appointmentId);
    }

    return { ids: createdIds, recurring_id };
  }
}
