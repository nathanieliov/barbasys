import type { IFlow } from './flow.interface.js';
import type { IAppointmentRepository } from '../../../repositories/appointment-repository.interface.js';
import type { IConversationRepository } from '../../../repositories/conversation-repository.interface.js';
import type { Conversation } from '../../../domain/entities.js';
import { buildBarberList, buildServiceList, buildDateList, buildSlotList } from './list-builders.js';
import db from '../../../db.js';

interface BookingContext {
  step: number;
  barberId?: number;
  serviceId?: number;
  date?: string;
  slotTime?: string;
}

export class BookAppointmentFlow implements IFlow {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private convRepo: IConversationRepository,
    private shopId: number
  ) {}

  async handle(input: { conversation: Conversation; body: string }) {
    const { conversation, body } = input;
    const language = conversation.language as 'es' | 'en';

    let context: BookingContext = { step: 0 };
    if (conversation.context_json) {
      try {
        context = JSON.parse(conversation.context_json);
      } catch {
        context = { step: 0 };
      }
    }

    // Get shop info
    const shop = db.prepare('SELECT name FROM shops WHERE id = ?').get(this.shopId) as { name: string } | undefined;
    const shopName = shop?.name || 'Barbershop';

    // Get resources
    const barbers = db.prepare('SELECT * FROM barbers WHERE shop_id = ? AND is_active = 1').all(this.shopId) as any[];
    const services = db.prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1').all(this.shopId) as any[];

    // State machine
    if (context.step === 0) {
      // Step 1: Select barber
      const list = buildBarberList(barbers);
      context.step = 1;
      await this.convRepo.updateState(conversation.id, 'booking', context);

      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'booking' as const,
        nextContext: context,
      };
    } else if (context.step === 1) {
      // Parse barber selection
      const barberIdx = parseInt(body) - 1;
      if (barberIdx < 0 || barberIdx >= barbers.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'booking' as const,
          nextContext: context,
        };
      }

      context.barberId = barbers[barberIdx].id;
      context.step = 2;
      await this.convRepo.updateState(conversation.id, 'booking', context);

      // Step 2: Select service
      const list = buildServiceList(services, language);
      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'booking' as const,
        nextContext: context,
      };
    } else if (context.step === 2) {
      // Parse service selection
      const serviceIdx = parseInt(body) - 1;
      if (serviceIdx < 0 || serviceIdx >= services.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'booking' as const,
          nextContext: context,
        };
      }

      context.serviceId = services[serviceIdx].id;
      context.step = 3;
      await this.convRepo.updateState(conversation.id, 'booking', context);

      // Step 3: Select date
      const list = buildDateList(language);
      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'booking' as const,
        nextContext: context,
      };
    } else if (context.step === 3) {
      // Parse date selection
      const dateIdx = parseInt(body) - 1;
      const dates = buildDateList(language).items;
      if (dateIdx < 0 || dateIdx >= dates.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'booking' as const,
          nextContext: context,
        };
      }

      context.date = dates[dateIdx].id;
      context.step = 4;
      await this.convRepo.updateState(conversation.id, 'booking', context);

      // Step 4: Select slot (mock slots for now)
      const slots = ['09:00', '10:00', '14:00', '15:00', '16:00'];
      const list = buildSlotList(slots, language);
      return {
        reply: `${list.body}\n\n${list.items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`,
        nextState: 'booking' as const,
        nextContext: context,
      };
    } else if (context.step === 4) {
      // Parse time selection
      const slots = ['09:00', '10:00', '14:00', '15:00', '16:00'];
      const slotIdx = parseInt(body) - 1;
      if (slotIdx < 0 || slotIdx >= slots.length) {
        return {
          reply: language === 'es' ? 'Selección inválida. Intenta de nuevo.' : 'Invalid selection. Try again.',
          nextState: 'booking' as const,
          nextContext: context,
        };
      }

      context.slotTime = slots[slotIdx];
      context.step = 5;
      await this.convRepo.updateState(conversation.id, 'booking', context);

      // Step 5: Confirmation
      const service = services.find(s => s.id === context.serviceId);
      const barber = barbers.find(b => b.id === context.barberId);
      const confirmMsg = language === 'es'
        ? `Confirmar cita:\n- Barbero: ${barber?.fullname}\n- Servicio: ${service?.name}\n- Fecha: ${context.date}\n- Hora: ${context.slotTime}\n\n1. Confirmar\n2. Cancelar`
        : `Confirm appointment:\n- Barber: ${barber?.fullname}\n- Service: ${service?.name}\n- Date: ${context.date}\n- Time: ${context.slotTime}\n\n1. Confirm\n2. Cancel`;

      return {
        reply: confirmMsg,
        nextState: 'booking' as const,
        nextContext: context,
      };
    } else if (context.step === 5) {
      // Confirmation choice
      if (body === '1') {
        // Create appointment
        if (context.barberId && context.serviceId && context.date && context.slotTime && conversation.customer_id) {
          const [hours, minutes] = context.slotTime.split(':');
          const startTime = `${context.date}T${hours}:${minutes}:00`;

          const appointmentId = await this.appointmentRepo.create({
            barber_id: context.barberId,
            customer_id: conversation.customer_id,
            start_time: startTime,
            shop_id: this.shopId,
            service_id: context.serviceId,
          } as any);

          context.step = 0;
          await this.convRepo.updateState(conversation.id, 'idle', null);

          const msg = language === 'es'
            ? `¡Cita confirmada! Tu número de cita es #${appointmentId}`
            : `Appointment confirmed! Your appointment number is #${appointmentId}`;

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
        reply: language === 'es' ? 'Reserva cancelada.' : 'Booking cancelled.',
        nextState: 'idle' as const,
        nextContext: null,
      };
    }

    return {
      reply: language === 'es' ? 'Error en el flujo de reserva.' : 'Error in booking flow.',
      nextState: 'idle' as const,
      nextContext: null,
    };
  }
}
