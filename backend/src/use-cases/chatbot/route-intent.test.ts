import { describe, it, expect, vi } from 'vitest';
import { routeIntent } from './route-intent.js';
import type { ILLMClient } from '../../adapters/llm/llm-client.interface.js';
import type { ShopContext } from './shop-context-loader.js';

describe('routeIntent', () => {
  const mockLLMClient: ILLMClient = {
    classify: vi.fn(),
    answerFaq: vi.fn(),
  };

  const shopContext: ShopContext = {
    shopName: 'La Barba',
    activeServices: [
      { id: 1, name: 'Haircut', price: 25, duration_minutes: 30, description: 'Classic haircut', shop_id: 1, is_active: 1 },
      { id: 2, name: 'Beard Trim', price: 20, duration_minutes: 20, description: 'Beard trim', shop_id: 1, is_active: 1 },
    ],
    activeBarbers: [
      { id: 1, name: 'Carlos', fullname: 'Carlos Mendez', shop_id: 1, is_active: 1, payment_model: 'COMMISSION', service_commission_rate: 0.2, product_commission_rate: 0.15 },
    ],
  };

  it('routes book intent', async () => {
    (mockLLMClient.classify as any).mockResolvedValueOnce({
      intent: 'book',
      args: { serviceId: 1 },
    });

    const result = await routeIntent(mockLLMClient, shopContext, 'es', 'I want to book a haircut');

    expect(result.intent).toBe('book');
    expect(result.args).toEqual({ serviceId: 1 });
  });

  it('routes faq intent', async () => {
    (mockLLMClient.classify as any).mockResolvedValueOnce({
      intent: 'faq',
      args: {},
    });

    const result = await routeIntent(mockLLMClient, shopContext, 'es', 'What are your hours?');

    expect(result.intent).toBe('faq');
  });

  it('uses Spanish prompt for Spanish language', async () => {
    (mockLLMClient.classify as any).mockResolvedValueOnce({
      intent: 'unknown',
      args: {},
    });

    await routeIntent(mockLLMClient, shopContext, 'es', 'Hola');

    const callArgs = (mockLLMClient.classify as any).mock.calls[(mockLLMClient.classify as any).mock.calls.length - 1];
    expect(callArgs[0]).toContain('Tu tarea');
  });

  it('uses English prompt for English language', async () => {
    (mockLLMClient.classify as any).mockResolvedValueOnce({
      intent: 'unknown',
      args: {},
    });

    await routeIntent(mockLLMClient, shopContext, 'en', 'Hello');

    const callArgs = (mockLLMClient.classify as any).mock.calls[(mockLLMClient.classify as any).mock.calls.length - 1];
    expect(callArgs[0]).toContain('Your task is');
  });
});
