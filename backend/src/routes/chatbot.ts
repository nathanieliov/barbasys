import { Router } from 'express';
import db from '../db.js';
import { SQLiteCustomerRepository } from '../repositories/sqlite-customer-repository.js';
import { SqliteConversationRepository } from '../repositories/sqlite-conversation-repository.js';
import { SqliteWaMessageRepository } from '../repositories/sqlite-wa-message-repository.js';
import { TwilioWhatsAppClient } from '../adapters/whatsapp/twilio-whatsapp-client.js';
import { OpenAILLMClient } from '../adapters/llm/openai-llm-client.js';
import { verifyTwilioSignature } from '../adapters/whatsapp/signature-verifier.js';
import { parseTwilioInbound } from '../adapters/whatsapp/webhook-parser.js';
import { handleInboundMessage } from '../use-cases/chatbot/handle-inbound-message.js';

const router = Router();

// Initialize repositories and clients
const customerRepo = new SQLiteCustomerRepository(db);
const convRepo = new SqliteConversationRepository(db);
const msgRepo = new SqliteWaMessageRepository(db);
const whatsAppClient = new TwilioWhatsAppClient();
const llmClient = new OpenAILLMClient(process.env.OPENAI_API_KEY || '');

// TODO: Make shop configurable; for now use shop 1
const SHOP_ID = 1;
const SHOP_PHONE = process.env.SHOP_PHONE || '+1-800-000-0000';

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

export default router;
