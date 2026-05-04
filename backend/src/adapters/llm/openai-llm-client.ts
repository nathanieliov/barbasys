import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ILLMClient, ClassifiedIntent } from './llm-client.interface.js';

const intentSchema = z.object({
  intent: z.enum(['book', 'cancel', 'reschedule', 'view_next', 'faq', 'unknown']),
  args: z.record(z.unknown()),
});

export class OpenAILLMClient implements ILLMClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async classify(systemPrompt: string, userText: string): Promise<ClassifiedIntent> {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: intentSchema,
      system: systemPrompt,
      prompt: userText,
    });

    return result.object as ClassifiedIntent;
  }

  async answerFaq(systemPrompt: string, userText: string): Promise<string> {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userText,
    });

    return result.text;
  }
}
