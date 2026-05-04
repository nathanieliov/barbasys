import type { Intent } from '../../domain/entities.js';

export interface ClassifiedIntent {
  intent: Intent;
  args: Record<string, unknown>;
}

export interface ILLMClient {
  classify(systemPrompt: string, userText: string): Promise<ClassifiedIntent>;
  answerFaq(systemPrompt: string, userText: string): Promise<string>;
}
