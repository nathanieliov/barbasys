import { describe, it, expect, vi } from 'vitest';
import { OpenAILLMClient } from './openai-llm-client.js';

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { intent: 'book', args: { date: '2026-04-25' } },
  }),
  generateText: vi.fn().mockResolvedValue({
    text: 'We are open Monday to Saturday, 9am to 6pm.',
  }),
}));

describe('OpenAILLMClient', () => {
  const client = new OpenAILLMClient('test-key');

  it('classifies intent from user text', async () => {
    const systemPrompt = `Classify the user's intent. Return JSON with: { "intent": "book"|"cancel"|"reschedule"|"view_next"|"faq"|"unknown", "args": {...} }`;
    const result = await client.classify(systemPrompt, 'I want to book an appointment');

    expect(result.intent).toBe('book');
    expect(result.args).toEqual({ date: '2026-04-25' });
  });

  it('answers FAQ questions', async () => {
    const systemPrompt = 'You are a barber shop FAQ assistant. Answer questions about our services, hours, policies.';
    const answer = await client.answerFaq(systemPrompt, 'What are your hours?');

    expect(answer).toBe('We are open Monday to Saturday, 9am to 6pm.');
  });
});
