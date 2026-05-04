import type { IFlow } from './flow.interface.js';
import type { IAppointmentRepository } from '../../../repositories/appointment-repository.interface.js';
import type { Conversation } from '../../../domain/entities.js';
import db from '../../../db.js';

export class ViewNextFlow implements IFlow {
  constructor(private appointmentRepo: IAppointmentRepository) {}

  async handle(input: { conversation: Conversation; body: string }) {
    const { conversation } = input;
    const language = conversation.language as 'es' | 'en';

    // Get next upcoming appointment
    const appointment = db
      .prepare(
        `SELECT * FROM appointments
         WHERE customer_id = ? AND status = 'scheduled' AND date(start_time) >= date('now')
         ORDER BY start_time ASC
         LIMIT 1`
      )
      .get(conversation.customer_id) as any;

    if (!appointment) {
      const noAppointmentMsg =
        language === 'es'
          ? 'No tienes ninguna cita próxima. ¿Te gustaría agendar una?'
          : "You don't have any upcoming appointments. Would you like to book one?";

      return {
        reply: noAppointmentMsg,
        nextState: 'idle' as const,
        nextContext: null,
      };
    }

    // Fetch barber and service details
    const barber = db.prepare('SELECT fullname FROM barbers WHERE id = ?').get(appointment.barber_id) as any;
    const service = db.prepare('SELECT name FROM services WHERE id = ?').get(appointment.service_id) as any;

    const dateTime = new Date(appointment.start_time);
    const dateStr = dateTime.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = dateTime.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const barberName = barber?.fullname || 'Barbero';
    const serviceName = service?.name || 'Servicio';

    const appointmentMsg =
      language === 'es'
        ? `Tu próxima cita:\n\n📅 ${dateStr}\n⏰ ${timeStr}\n💇 ${barberName}\n✂️ ${serviceName}\n\n¿Necesitas cambiar o cancelar? Escribe "modificar" o "cancelar".`
        : `Your next appointment:\n\n📅 ${dateStr}\n⏰ ${timeStr}\n💇 ${barberName}\n✂️ ${serviceName}\n\nNeed to reschedule or cancel? Type "reschedule" or "cancel".`;

    return {
      reply: appointmentMsg,
      nextState: 'idle' as const,
      nextContext: null,
    };
  }
}
