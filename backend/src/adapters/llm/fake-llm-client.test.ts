import { describe, it, expect, beforeEach } from 'vitest';
import { FakeLLMClient, fakeLLMScript } from './fake-llm-client.js';

describe('FakeLLMClient', () => {
  beforeEach(() => fakeLLMScript.reset());

  it('returns scripted classify responses in order', async () => {
    fakeLLMScript.queueIntent({ intent: 'book', args: { date: '2026-06-01' } });
    fakeLLMScript.queueIntent({ intent: 'cancel', args: {} });
    const client = new FakeLLMClient();

    expect(await client.classify('sys', 'q1')).toEqual({ intent: 'book', args: { date: '2026-06-01' } });
    expect(await client.classify('sys', 'q2')).toEqual({ intent: 'cancel', args: {} });
  });

  it('returns "unknown" intent when queue is empty', async () => {
    const client = new FakeLLMClient();
    expect(await client.classify('sys', 'anything')).toEqual({ intent: 'unknown', args: {} });
  });

  it('returns scripted FAQ answers', async () => {
    fakeLLMScript.queueAnswer('Estamos abiertos hasta las 8pm');
    const client = new FakeLLMClient();
    expect(await client.answerFaq('sys', 'horario?')).toBe('Estamos abiertos hasta las 8pm');
  });
});
