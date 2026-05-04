import { describe, it, expect, vi } from 'vitest';
import { FAQFlow } from './faq-flow.js';
import type { ILLMClient } from '../../../adapters/llm/llm-client.interface.js';
import type { Conversation } from '../../../domain/entities.js';

describe('FAQFlow', () => {
  const mockLLMClient: ILLMClient = {
    answerFaq: vi.fn(),
    classify: vi.fn(),
  };

  const flow = new FAQFlow(mockLLMClient, 'La Barba', '+15551234567');

  const conversation: Conversation = {
    id: 1,
    customer_id: 1,
    wa_phone: '+15551234567',
    language: 'es',
    state: 'idle',
    context_json: null,
    last_inbound_at: null,
    last_outbound_at: null,
    created_at: '2026-04-20T00:00:00',
    updated_at: '2026-04-20T00:00:00',
  };

  it('answers FAQ question', async () => {
    (mockLLMClient.answerFaq as any).mockResolvedValueOnce('We are open Monday-Saturday, 9am-6pm');

    const result = await flow.handle({ conversation, body: 'What are your hours?' });

    expect(result.reply).toBe('We are open Monday-Saturday, 9am-6pm');
    expect(result.nextState).toBe('idle');
    expect(result.nextContext).toBeNull();
  });

  it('uses Spanish prompt for Spanish conversation', async () => {
    (mockLLMClient.answerFaq as any).mockResolvedValueOnce('Abierto de lunes a sábado');

    await flow.handle({ conversation: { ...conversation, language: 'es' }, body: '¿Horarios?' });

    const callArgs = (mockLLMClient.answerFaq as any).mock.calls[(mockLLMClient.answerFaq as any).mock.calls.length - 1];
    expect(callArgs[0]).toContain('español');
  });

  it('handles out-of-scope questions with shop phone', async () => {
    (mockLLMClient.answerFaq as any).mockResolvedValueOnce(null);

    const result = await flow.handle({ conversation, body: 'Can you hack my computer?' });

    expect(result.reply).toContain('+15551234567');
    expect(result.nextState).toBe('idle');
  });
});
