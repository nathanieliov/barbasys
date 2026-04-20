import type { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import type { IConversationRepository } from '../../repositories/conversation-repository.interface.js';
import type { IWaMessageRepository } from '../../repositories/wa-message-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';
import type { ParsedInbound } from '../../adapters/whatsapp/webhook-parser.js';
import { resolveCustomer } from './resolve-customer.js';

export interface HandleInboundInput {
  inbound: ParsedInbound;
  customerRepo: ICustomerRepository;
  convRepo: IConversationRepository;
  msgRepo: IWaMessageRepository;
  whatsAppClient: IWhatsAppClient;
}

export interface HandleInboundResult {
  customerId: number;
  conversationId: number;
  inboundMessageId: number;
}

export async function handleInboundMessage(input: HandleInboundInput): Promise<HandleInboundResult> {
  const customer = await resolveCustomer(input.customerRepo, input.inbound.from);

  const conversationId = await input.convRepo.create({
    wa_phone: input.inbound.from,
    language: 'es',
    state: 'idle',
    customer_id: customer.id,
  });

  const inboundMessageId = await input.msgRepo.recordInbound({
    conversation_id: conversationId,
    wa_message_sid: input.inbound.sid,
    body: input.inbound.body,
    media_url: input.inbound.mediaUrl,
    raw_payload_json: null,
  });

  const reply = input.inbound.body || '(no text)';
  const sendResult = await input.whatsAppClient.sendText(`whatsapp:${input.inbound.from}`, reply);

  if (sendResult.sid) {
    await input.msgRepo.recordOutbound({
      conversation_id: conversationId,
      wa_message_sid: sendResult.sid,
      body: reply,
      status: sendResult.status,
    });
  }

  return {
    customerId: customer.id,
    conversationId,
    inboundMessageId: inboundMessageId || 0,
  };
}
