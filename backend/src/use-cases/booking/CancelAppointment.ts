import { IAppointmentRepository } from '../../repositories/appointment-repository.interface.js';
import { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import { IBarberRepository } from '../../repositories/barber-repository.interface.js';
import { IServiceRepository } from '../../repositories/service-repository.interface.js';
import { sendAppointmentNotification } from '../../communication.js';
import { UserRole } from '@barbasys/shared';

export interface CancelAppointmentRequest {
  appointment_id: number;
  user_id: number;
  user_role: UserRole;
  customer_id?: number | null; // From JWT if customer
  reason?: string;
}

export class CancelAppointment {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private customerRepo: ICustomerRepository,
    private barberRepo: IBarberRepository,
    private serviceRepo: IServiceRepository
  ) {}

  async execute(request: CancelAppointmentRequest): Promise<void> {
    const { appointment_id, user_id, user_role, customer_id, reason } = request;

    const appointment = await this.appointmentRepo.findById(appointment_id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status === 'cancelled') {
      throw new Error('Appointment is already cancelled');
    }

    // Role-based validation
    if (user_role === 'CUSTOMER') {
      if (appointment.customer_id !== customer_id) {
        throw new Error('You can only cancel your own appointments');
      }

      // Start time must be in the future
      // appointment.start_time is usually YYYY-MM-DD HH:mm:ss in SQLite
      const startTime = new Date(appointment.start_time.replace(' ', 'T')).getTime();
      if (startTime < Date.now()) {
        throw new Error('Cannot cancel past appointments');
      }
    }

    // Update status
    await this.appointmentRepo.updateStatus(appointment_id, 'cancelled');

    // If cancelled by staff, notify the customer
    if (user_role !== 'CUSTOMER' && appointment.customer_id) {
      const customer = await this.customerRepo.findById(appointment.customer_id);
      const barber = await this.barberRepo.findById(appointment.barber_id);
      const service = await this.serviceRepo.findById(appointment.service_id);

      if (customer && (customer.email || customer.phone)) {
        await sendAppointmentNotification({
          customer_name: customer.name || undefined,
          customer_email: customer.email || undefined,
          customer_phone: customer.phone || undefined,
          start_time: appointment.start_time,
          service_name: service?.name || 'Service',
          barber_name: barber?.name || 'Barber',
          type: 'cancellation'
        });
      }
    }
  }
}
