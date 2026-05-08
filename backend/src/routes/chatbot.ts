import { Router } from 'express';
import db from '../db.js';
import { SQLiteCustomerRepository } from '../repositories/sqlite-customer-repository.js';
import { SqliteConversationRepository } from '../repositories/sqlite-conversation-repository.js';
import { SqliteWaMessageRepository } from '../repositories/sqlite-wa-message-repository.js';
import { IWhatsAppClient } from '../adapters/whatsapp/whatsapp-client.interface.js';
import { ILLMClient } from '../adapters/llm/llm-client.interface.js';
import { PhoneRateLimiter } from '../adapters/rate-limiter/phone-rate-limiter.js';
import { verifyTwilioSignature } from '../adapters/whatsapp/signature-verifier.js';
import { parseTwilioInbound } from '../adapters/whatsapp/webhook-parser.js';
import { handleInboundMessage } from '../use-cases/chatbot/handle-inbound-message.js';

export interface ChatbotRouterDeps {
  whatsAppClient: IWhatsAppClient;
  llmClient: ILLMClient;
}

// TODO: Make shop configurable; for now use shop 1
const SHOP_ID = 1;
const SHOP_PHONE = process.env.SHOP_PHONE || '+1-800-000-0000';

export function buildChatbotRouter(deps: ChatbotRouterDeps): Router {
  const router = Router();

  // Initialize repositories (DB-bound, always real)
  const customerRepo = new SQLiteCustomerRepository(db);
  const convRepo = new SqliteConversationRepository(db);
  const msgRepo = new SqliteWaMessageRepository(db);
  const rateLimiter = new PhoneRateLimiter({
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  });

  const { whatsAppClient, llmClient } = deps;

  router.post('/webhooks/whatsapp', (req, res) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const signature = req.get('X-Twilio-Signature') || '';
    const bypassSignature = process.env.NODE_ENV === 'test' || process.env.BYPASS_WEBHOOK_VERIFICATION === 'true';

    // Verify Twilio signature (skip in test mode)
    if (!bypassSignature && authToken) {
      const host = req.get('host') || 'localhost';
      const url = `${req.protocol}://${host}${req.baseUrl}${req.path}`;

      const isValid = verifyTwilioSignature({
        authToken,
        signature,
        url,
        params: req.body as Record<string, string>,
      });

      if (!isValid) {
        return res.status(403).json({ error: 'Invalid signature' });
      }
    }

    // Parse inbound
    const inbound = parseTwilioInbound(req.body as Record<string, string>);

    // Handle inbound message
    handleInboundMessage({
      inbound,
      customerRepo,
      convRepo,
      msgRepo,
      whatsAppClient,
      llmClient,
      rateLimiter,
      shopId: SHOP_ID,
      shopPhone: SHOP_PHONE,
    })
      .then((result) => {
        res.json(result);
      })
      .catch((err: any) => {
        console.error('Error handling inbound message:', err);
        res.status(500).json({ error: err.message });
      });
  });

  return router;
}
