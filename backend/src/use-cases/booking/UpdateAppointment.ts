import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';
import { IBarberShiftRepository } from '../../repositories/barber-shift-repository.interface.js';
import { UserRole } from '@barbasys/shared';

export interface UpdateAppointmentRequest {
  appointment_id: number;
  user_id: number;
  user_role: UserRole;
  customer_id?: number | null;
  new_start_time?: string;
  new_barber_id?: number;
  new_services?: Array<{ id: number, quantity: number }>;
  new_notes?: string;
}

export class UpdateAppointment {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private serviceRepo: IServiceRepository,
    private barberShiftRepo: IBarberShiftRepository
  ) {}

  async execute(request: UpdateAppointmentRequest): Promise<void> {
    const { appointment_id, user_id, user_role, customer_id, new_start_time, new_barber_id, new_services, new_notes } = request;

    const appointment = await this.appointmentRepo.findById(appointment_id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      throw new Error(`Cannot update ${appointment.status} appointment`);
    }

    // Role-based validation
    if (user_role === 'CUSTOMER') {
      if (appointment.customer_id !== customer_id) {
        throw new Error('You can only update your own appointments');
      }

      const startTime = new Date(appointment.start_time.replace(' ', 'T')).getTime();
      if (startTime < Date.now()) {
        throw new Error('Cannot update past appointments');
      }
    }

    let finalBarberId = new_barber_id || appointment.barber_id;
    let finalStartTime = new_start_time || appointment.start_time;
    let finalDuration = appointment.total_duration_minutes;
    let primaryServiceId = appointment.service_id;
    let serviceDetails: any[] = [];

    // Calculate duration and get primary service if services are changing
    if (new_services && new_services.length > 0) {
      serviceDetails = await Promise.all(
        new_services.map(async (s) => {
          const detail = await this.serviceRepo.findById(s.id);
          if (!detail) throw new Error(`Service with ID ${s.id} not found`);
          return { ...detail, requestedQuantity: s.quantity };
        })
      );

      finalDuration = serviceDetails.reduce((sum, s) => sum + (s.duration_minutes * s.requestedQuantity), 0);
      primaryServiceId = new_services[0].id;
    }

    // If rescheduling or changing barber, check availability
    if (new_start_time || new_barber_id || (new_services && finalDuration !== appointment.total_duration_minutes)) {
      const currentStart = new Date(finalStartTime.replace(' ', 'T'));
      const offset = currentStart.getTimezoneOffset();
      const localDate = new Date(currentStart.getTime() - (offset * 60 * 1000));
      const startTimeStr = localDate.toISOString().replace('T', ' ').substring(0, 19);

      const endTimeDate = new Date(currentStart.getTime() + finalDuration * 60000);
      const endOffset = endTimeDate.getTimezoneOffset();
      const localEndDate = new Date(endTimeDate.getTime() - (endOffset * 60 * 1000));
      const endTimeStr = localEndDate.toISOString().replace('T', ' ').substring(0, 19);

      const dayOfWeek = currentStart.getDay();
      const timeStr = currentStart.toTimeString().split(' ')[0].substring(0, 5);
      const endTimeStrShort = endTimeDate.toTimeString().split(' ')[0].substring(0, 5);

      // Shift Validation
      const isWorking = await this.barberShiftRepo.checkRangeWorking(finalBarberId, dayOfWeek, timeStr, endTimeStrShort);
      if (!isWorking) {
        throw new Error(`Barber not working on this day for the full duration from ${timeStr} to ${endTimeStrShort}`);
      }

      // Time Off Validation
      const hasTimeOff = await this.barberShiftRepo.checkTimeOffConflict(finalBarberId, startTimeStr, endTimeStr);
      if (hasTimeOff) {
        throw new Error('Conflict with barber time off');
      }

      // Conflict Detection - check against all EXCEPT the current appointment
      const appointments = await this.appointmentRepo.findByBarberAndDateRange(finalBarberId, startTimeStr, endTimeStr);
      
      const conflict = appointments.find(a => {
        if (a.id === appointment_id || a.status === 'cancelled') return false;
        
        const aStart = a.start_time;
        const aStartTs = new Date(a.start_time.replace(' ', 'T')).getTime();
        const aEndTs = aStartTs + a.total_duration_minutes * 60000;
        
        const aEndDate = new Date(aEndTs);
        const aEndOffset = aEndDate.getTimezoneOffset();
        const aLocalEndDate = new Date(aEndTs - (aEndOffset * 60 * 1000));
        const aEnd = aLocalEndDate.toISOString().replace('T', ' ').substring(0, 19);
        
        return (startTimeStr < aEnd && endTimeStr > aStart);
      });

      if (conflict) {
        throw new Error('Conflict with another appointment');
      }

      finalStartTime = startTimeStr;
    }

    // Update the main appointment record
    await this.appointmentRepo.update({
      id: appointment_id,
      barber_id: finalBarberId,
      start_time: finalStartTime,
      service_id: primaryServiceId,
      total_duration_minutes: finalDuration,
      notes: new_notes !== undefined ? new_notes : appointment.notes
    });

    // If services changed, update appointment items
    if (new_services && new_services.length > 0) {
      await this.appointmentRepo.clearItems(appointment_id);
      for (const s of serviceDetails) {
        await this.appointmentRepo.addItem({
          appointment_id,
          service_id: s.id,
          quantity: s.requestedQuantity,
          price_at_booking: s.price
        });
      }
    }
  }
}
