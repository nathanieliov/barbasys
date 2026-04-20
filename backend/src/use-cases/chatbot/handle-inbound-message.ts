import type { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import type { IConversationRepository } from '../../repositories/conversation-repository.interface.js';
import type { IWaMessageRepository } from '../../repositories/wa-message-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';
import type { ILLMClient } from '../../adapters/llm/llm-client.interface.js';
import type { ParsedInbound } from '../../adapters/whatsapp/webhook-parser.js';
import { resolveCustomer } from './resolve-customer.js';
import { routeIntent } from './route-intent.js';
import { loadShopContext } from './shop-context-loader.js';
import { FAQFlow } from './flows/faq-flow.js';

export interface HandleInboundInput {
  inbound: ParsedInbound;
  customerRepo: ICustomerRepository;
  convRepo: IConversationRepository;
  msgRepo: IWaMessageRepository;
  whatsAppClient: IWhatsAppClient;
  llmClient: ILLMClient;
  shopId: number;
  shopPhone: string;
}

export interface HandleInboundResult {
  customerId: number;
  conversationId: number;
  inboundMessageId: number;
}

export async function handleInboundMessage(input: HandleInboundInput): Promise<HandleInboundResult> {
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

      // For now, handle FAQ intent; other intents will be handled in future phases
      if (classified.intent === 'faq') {
        const faqFlow = new FAQFlow(input.llmClient, shopContext.shopName, input.shopPhone);
        const flowResult = await faqFlow.handle({ conversation, body: input.inbound.body });
        reply = flowResult.reply;
      } else if (classified.intent === 'unknown') {
        reply = conversation.language === 'es'
          ? 'No entendí eso. ¿Puedo ayudarte con algo más?'
          : 'I did not understand that. Can I help with something else?';
      } else {
        // Placeholder for other intents (book, cancel, etc.)
        reply = conversation.language === 'es'
          ? `Tu intención: ${classified.intent} (próximamente disponible)`
          : `Your intent: ${classified.intent} (coming soon)`;
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
