import type { IFlow } from './flow.interface.js';
import type { IAppointmentRepository } from '../../../repositories/appointment-repository.interface.js';
import type { IConversationRepository } from '../../../repositories/conversation-repository.interface.js';
import type { Conversation } from '../../../domain/entities.js';
import db from '../../../db.js';

interface CancelContext {
  step: number;
  appointmentId?: number;
}

export class CancelFlow implements IFlow {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private convRepo: IConversationRepository
  ) {}

  async handle(input: { conversation: Conversation; body: string }) {
    const { conversation, body } = input;
    const language = conversation.language as 'es' | 'en';

    let context: CancelContext = { step: 0 };
    if (conversation.context_json) {
      try {
        context = JSON.parse(conversation.context_json);
      } catch {
        context = { step: 0 };
      }
    }

    // Get upcoming appointments
    const appointments = db
      .prepare(
        `SELECT a.*, b.fullname as barber_name, s.name as service_name
         FROM appointments a
         JOIN barbers b ON a.barber_id = b.id
         JOIN services s ON a.service_id = s.id
         WHERE a.customer_id = ? AND a.status = 'scheduled' AND date(a.start_time) >= date('now')
         ORDER BY a.start_time ASC`
      )
      .all(conversation.customer_id) as any[];

    // Step 0: Show list of appointments
    if (context.step === 0) {
      if (appointments.length === 0) {
        const noAppointmentMsg =
          language === 'es'
            ? 'No tienes ninguna cita próxima para cancelar.'
            : "You don't have any upcoming appointments to cancel.";

        return {
          reply: noAppointmentMsg,
          nextState: 'idle' as const,
          nextContext: null,
        };
      }

      const header = language === 'es' ? 'Selecciona la cita a cancelar:' : 'Select appointment to cancel:';
      const listItems = appointments
        .map((app, i) => {
          const dateTime = new Date(app.start_time);
          const dateStr = dateTime.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
            month: 'short',
            day: 'numeric',
          });
          const timeStr = dateTime.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `${i + 1}. ${app.barber_name} - ${dateStr} ${timeStr}`;
        })
        .join('\n');

      context.step = 1;
      await this.convRepo.updateState(conversation.id, 'cancelling', context);

      return {
        reply: `${header}\n\n${listItems}`,
        nextState: 'cancelling' as const,
        nextContext: context,
      };
    } else if (context.step === 1) {
      // Step 1: Confirm and delete
      const idx = parseInt(body) - 1;
      if (idx < 0 || idx >= appointments.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'cancelling' as const,
          nextContext: context,
        };
      }

      const appointmentToCancel = appointments[idx];
      const confirmMsg =
        language === 'es'
          ? `¿Cancelar cita con ${appointmentToCancel.barber_name}?\n\n1. Sí, cancelar\n2. No, volver`
          : `Cancel appointment with ${appointmentToCancel.barber_name}?\n\n1. Yes, cancel\n2. No, go back`;

      context.appointmentId = appointmentToCancel.id;
      context.step = 2;
      await this.convRepo.updateState(conversation.id, 'cancelling', context);

      return {
        reply: confirmMsg,
        nextState: 'cancelling' as const,
        nextContext: context,
      };
    } else if (context.step === 2) {
      // Step 2: Confirmation choice
      if (body === '1') {
        // Delete appointment
        if (context.appointmentId) {
          db.prepare('DELETE FROM appointments WHERE id = ?').run(context.appointmentId);

          const msg =
            language === 'es'
              ? 'Tu cita ha sido cancelada.'
              : 'Your appointment has been cancelled.';

          context.step = 0;
          await this.convRepo.updateState(conversation.id, 'idle', null);

          return {
            reply: msg,
            nextState: 'idle' as const,
            nextContext: null,
          };
        }
      }

      // Cancel or invalid choice
      const msg =
        language === 'es'
          ? 'Cancelación abortada. ¿Necesitas algo más?'
          : 'Cancellation aborted. Is there anything else I can help with?';

      context.step = 0;
      await this.convRepo.updateState(conversation.id, 'idle', null);

      return {
        reply: msg,
        nextState: 'idle' as const,
        nextContext: null,
      };
    }

    return {
      reply: language === 'es' ? 'Error en el flujo de cancelación.' : 'Error in cancellation flow.',
      nextState: 'idle' as const,
      nextContext: null,
    };
  }
}
