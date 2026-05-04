import type { IFlow } from './flow.interface.js';
import type { IAppointmentRepository } from '../../../repositories/appointment-repository.interface.js';
import type { IConversationRepository } from '../../../repositories/conversation-repository.interface.js';
import type { Conversation } from '../../../domain/entities.js';
import { buildBarberList, buildServiceList, buildDateList, buildSlotList } from './list-builders.js';
import { GetAvailableSlots } from '../../booking/GetAvailableSlots.js';
import db from '../../../db.js';

interface RescheduleContext {
  step: number;
  appointmentId?: number;
  barberId?: number;
  serviceId?: number;
  date?: string;
  slotTime?: string;
  availableSlots?: string[];
}

export class RescheduleFlow implements IFlow {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private convRepo: IConversationRepository,
    private shopId: number,
    private getAvailableSlots: GetAvailableSlots
  ) {}

  async handle(input: { conversation: Conversation; body: string }) {
    const { conversation, body } = input;
    const language = conversation.language as 'es' | 'en';

    let context: RescheduleContext = { step: 0 };
    if (conversation.context_json) {
      try {
        context = JSON.parse(conversation.context_json);
      } catch {
        context = { step: 0 };
      }
    }

    // Get resources
    const barbers = db.prepare('SELECT * FROM barbers WHERE shop_id = ? AND is_active = 1').all(this.shopId) as any[];
    const services = db.prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1').all(this.shopId) as any[];

    // Step 0: Show list of appointments
    if (context.step === 0) {
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

      if (appointments.length === 0) {
        const noAppointmentMsg =
          language === 'es'
            ? 'No tienes ninguna cita próxima para reprogramar.'
            : "You don't have any upcoming appointments to reschedule.";

        return {
          reply: noAppointmentMsg,
          nextState: 'idle' as const,
          nextContext: null,
        };
      }

      const header = language === 'es' ? 'Selecciona la cita a reprogramar:' : 'Select appointment to reschedule:';
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
      context.appointmentId = appointments[0].id;
      await this.convRepo.updateState(conversation.id, 'rescheduling', context);

      return {
        reply: `${header}\n\n${listItems}`,
        nextState: 'rescheduling' as const,
        nextContext: context,
      };
    } else if (context.step === 1) {
      // Step 1: Select appointment and show barber list
      const appointments = db
        .prepare(
          `SELECT a.* FROM appointments a
           WHERE a.customer_id = ? AND a.status = 'scheduled' AND date(a.start_time) >= date('now')
           ORDER BY a.start_time ASC`
        )
        .all(conversation.customer_id) as any[];

      const idx = parseInt(body) - 1;
      if (idx < 0 || idx >= appointments.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'rescheduling' as const,
          nextContext: context,
        };
      }

      context.appointmentId = appointments[idx].id;
      context.step = 2;
      await this.convRepo.updateState(conversation.id, 'rescheduling', context);

      const list = buildBarberList(barbers);
      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'rescheduling' as const,
        nextContext: context,
      };
    } else if (context.step === 2) {
      // Step 2: Select barber
      const barberIdx = parseInt(body) - 1;
      if (barberIdx < 0 || barberIdx >= barbers.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'rescheduling' as const,
          nextContext: context,
        };
      }

      context.barberId = barbers[barberIdx].id;
      context.step = 3;
      await this.convRepo.updateState(conversation.id, 'rescheduling', context);

      const list = buildServiceList(services, language);
      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'rescheduling' as const,
        nextContext: context,
      };
    } else if (context.step === 3) {
      // Step 3: Select service
      const serviceIdx = parseInt(body) - 1;
      if (serviceIdx < 0 || serviceIdx >= services.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'rescheduling' as const,
          nextContext: context,
        };
      }

      context.serviceId = services[serviceIdx].id;
      context.step = 4;
      await this.convRepo.updateState(conversation.id, 'rescheduling', context);

      const list = buildDateList(language);
      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'rescheduling' as const,
        nextContext: context,
      };
    } else if (context.step === 4) {
      // Step 4: Select date
      const dateIdx = parseInt(body) - 1;
      const dates = buildDateList(language).items;
      if (dateIdx < 0 || dateIdx >= dates.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'rescheduling' as const,
          nextContext: context,
        };
      }

      context.date = dates[dateIdx].id;

      // Fetch real availability for the selected barber + date
      const service = services.find(s => s.id === context.serviceId);
      const duration = service?.duration_minutes ?? 30;
      const slots = await this.getAvailableSlots.execute({
        barber_id: context.barberId!,
        date: context.date,
        duration,
      });

      if (slots.length === 0) {
        const noSlotsMsg = language === 'es'
          ? 'No hay horarios disponibles ese día. Elige otra fecha:'
          : 'No available slots for that day. Choose another date:';
        const dateList = buildDateList(language);
        await this.convRepo.updateState(conversation.id, 'rescheduling', context);
        return {
          reply: `${noSlotsMsg}\n\n${dateList.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
          nextState: 'rescheduling' as const,
          nextContext: context,
        };
      }

      context.availableSlots = slots;
      context.step = 5;
      await this.convRepo.updateState(conversation.id, 'rescheduling', context);

      const list = buildSlotList(slots, language);
      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'rescheduling' as const,
        nextContext: context,
      };
    } else if (context.step === 5) {
      // Step 5: Select time using stored slots
      const slots = context.availableSlots ?? [];
      const slotIdx = parseInt(body) - 1;
      if (slotIdx < 0 || slotIdx >= slots.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'rescheduling' as const,
          nextContext: context,
        };
      }

      context.slotTime = slots[slotIdx];
      context.step = 6;
      await this.convRepo.updateState(conversation.id, 'rescheduling', context);

      const service = services.find(s => s.id === context.serviceId);
      const barber = barbers.find(b => b.id === context.barberId);
      const confirmMsg =
        language === 'es'
          ? `Confirmar cambios:\n- Barbero: ${barber?.fullname}\n- Servicio: ${service?.name}\n- Fecha: ${context.date}\n- Hora: ${context.slotTime}\n\n1. Confirmar\n2. Cancelar`
          : `Confirm changes:\n- Barber: ${barber?.fullname}\n- Service: ${service?.name}\n- Date: ${context.date}\n- Time: ${context.slotTime}\n\n1. Confirm\n2. Cancel`;

      return {
        reply: confirmMsg,
        nextState: 'rescheduling' as const,
        nextContext: context,
      };
    } else if (context.step === 6) {
      // Step 6: Confirmation choice
      if (body === '1') {
        // Update appointment
        if (
          context.appointmentId &&
          context.barberId &&
          context.serviceId &&
          context.date &&
          context.slotTime
        ) {
          const [hours, minutes] = context.slotTime.split(':');
          const startTime = `${context.date}T${hours}:${minutes}:00`;

          db.prepare(
            `UPDATE appointments
             SET barber_id = ?, service_id = ?, start_time = ?
             WHERE id = ?`
          ).run(context.barberId, context.serviceId, startTime, context.appointmentId);

          context.step = 0;
          await this.convRepo.updateState(conversation.id, 'idle', null);

          const msg =
            language === 'es'
              ? '¡Cita reprogramada exitosamente!'
              : 'Appointment rescheduled successfully!';

          return {
            reply: msg,
            nextState: 'idle' as const,
            nextContext: null,
          };
        }
      }

      // Cancel or invalid
      context.step = 0;
      await this.convRepo.updateState(conversation.id, 'idle', null);

      return {
        reply: language === 'es' ? 'Reprogramación cancelada.' : 'Rescheduling cancelled.',
        nextState: 'idle' as const,
        nextContext: null,
      };
    }

    return {
      reply: language === 'es' ? 'Error en el flujo de reprogramación.' : 'Error in rescheduling flow.',
      nextState: 'idle' as const,
      nextContext: null,
    };
  }
}
