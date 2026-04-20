import db from '../../db.js';
import i18n from '../../i18n.js';
import type { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import type { IConversationRepository } from '../../repositories/conversation-repository.interface.js';
import type { IWaMessageRepository } from '../../repositories/wa-message-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';
import type { ILLMClient } from '../../adapters/llm/llm-client.interface.js';
import type { ParsedInbound } from '../../adapters/whatsapp/webhook-parser.js';
import type { PhoneRateLimiter } from '../../adapters/rate-limiter/phone-rate-limiter.js';
import { resolveCustomer } from './resolve-customer.js';
import { routeIntent } from './route-intent.js';
import { loadShopContext } from './shop-context-loader.js';
import { FAQFlow } from './flows/faq-flow.js';
import { BookAppointmentFlow } from './flows/book-appointment.js';
import { ViewNextFlow } from './flows/view-next-flow.js';
import { CancelFlow } from './flows/cancel-flow.js';
import { RescheduleFlow } from './flows/reschedule-flow.js';
import { SQLiteAppointmentRepository } from '../../repositories/sqlite-appointment-repository.js';
import { SqliteConversationRepository } from '../../repositories/sqlite-conversation-repository.js';

export interface HandleInboundInput {
  inbound: ParsedInbound;
  customerRepo: ICustomerRepository;
  convRepo: IConversationRepository;
  msgRepo: IWaMessageRepository;
  whatsAppClient: IWhatsAppClient;
  llmClient: ILLMClient;
  rateLimiter: PhoneRateLimiter;
  shopId: number;
  shopPhone: string;
}

export interface HandleInboundResult {
  customerId: number;
  conversationId: number;
  inboundMessageId: number;
}

export async function handleInboundMessage(input: HandleInboundInput): Promise<HandleInboundResult> {
  if (!input.rateLimiter.isAllowed(input.inbound.from)) {
    throw new Error(`Rate limit exceeded for phone: ${input.inbound.from}`);
  }

  const customer = await resolveCustomer(input.customerRepo, input.inbound.from);

  let conversation = await input.convRepo.findByPhone(input.inbound.from);

  if (!conversation) {
    const conversationId = await input.convRepo.create({
      wa_phone: input.inbound.from,
      language: 'es',
      state: 'idle',
      customer_id: customer.id,
    });
    conversation = await input.convRepo.findById(conversationId);
    if (!conversation) throw new Error('Failed to create conversation');
  }

  const inboundMessageId = await input.msgRepo.recordInbound({
    conversation_id: conversation.id,
    wa_message_sid: input.inbound.sid,
    body: input.inbound.body,
    media_url: input.inbound.mediaUrl,
    raw_payload_json: null,
  });

  // Route intent and dispatch to flow
  let reply = 'I did not understand that. Please try again.';

  if (input.inbound.body) {
    try {
      const shopContext = await loadShopContext(input.shopId);
      const classified = await routeIntent(input.llmClient, shopContext, conversation.language as 'es' | 'en', input.inbound.body);

      // Dispatch to appropriate flow based on intent
      const appointmentRepo = new SQLiteAppointmentRepository(db);
      const convRepo = new SqliteConversationRepository(db);

      if (classified.intent === 'faq') {
        const faqFlow = new FAQFlow(input.llmClient, shopContext.shopName, input.shopPhone);
        const flowResult = await faqFlow.handle({ conversation, body: input.inbound.body });
        reply = flowResult.reply;
        await input.convRepo.updateState(conversation.id, flowResult.nextState, flowResult.nextContext);
        conversation.state = flowResult.nextState;
      } else if (classified.intent === 'book') {
        const bookingFlow = new BookAppointmentFlow(appointmentRepo, input.convRepo, input.shopId);
        const flowResult = await bookingFlow.handle({ conversation, body: input.inbound.body });
        reply = flowResult.reply;
        await input.convRepo.updateState(conversation.id, flowResult.nextState, flowResult.nextContext);
        conversation.state = flowResult.nextState;
      } else if (classified.intent === 'view_next') {
        const viewNextFlow = new ViewNextFlow(appointmentRepo);
        const flowResult = await viewNextFlow.handle({ conversation, body: input.inbound.body });
        reply = flowResult.reply;
        await input.convRepo.updateState(conversation.id, flowResult.nextState, flowResult.nextContext);
        conversation.state = flowResult.nextState;
      } else if (classified.intent === 'cancel') {
        const cancelFlow = new CancelFlow(appointmentRepo, convRepo);
        const flowResult = await cancelFlow.handle({ conversation, body: input.inbound.body });
        reply = flowResult.reply;
        await input.convRepo.updateState(conversation.id, flowResult.nextState, flowResult.nextContext);
        conversation.state = flowResult.nextState;
      } else if (classified.intent === 'reschedule') {
        const rescheduleFlow = new RescheduleFlow(appointmentRepo, convRepo, input.shopId);
        const flowResult = await rescheduleFlow.handle({ conversation, body: input.inbound.body });
        reply = flowResult.reply;
        await input.convRepo.updateState(conversation.id, flowResult.nextState, flowResult.nextContext);
        conversation.state = flowResult.nextState;
      } else if (classified.intent === 'unknown') {
        const t = i18n.t.bind(i18n);
        const lang = conversation.language as 'es' | 'en';
        i18n.changeLanguage(lang === 'es' ? 'es-DO' : 'en-US');
        reply =
          lang === 'es'
            ? `${t('chatbot.menu_header')}\n\n1. ${t('chatbot.menu_view_next')}\n2. ${t('chatbot.menu_book')}\n3. ${t('chatbot.menu_reschedule')}\n4. ${t('chatbot.menu_cancel')}\n5. ${t('chatbot.menu_faq')}\n\n${t('chatbot.menu_prompt')}`
            : `${t('chatbot.menu_header')}\n\n1. ${t('chatbot.menu_view_next')}\n2. ${t('chatbot.menu_book')}\n3. ${t('chatbot.menu_reschedule')}\n4. ${t('chatbot.menu_cancel')}\n5. ${t('chatbot.menu_faq')}\n\n${t('chatbot.menu_prompt')}`;
      }
    } catch (err) {
      console.error('Error routing intent:', err);
    }
  }

  const sendResult = await input.whatsAppClient.sendText(`whatsapp:${input.inbound.from}`, reply);

  if (sendResult.sid) {
    await input.msgRepo.recordOutbound({
      conversation_id: conversation.id,
      wa_message_sid: sendResult.sid,
      body: reply,
      status: sendResult.status,
    });
  }

  return {
    customerId: customer.id,
    conversationId: conversation.id,
    inboundMessageId: inboundMessageId || 0,
  };
}
