import { ILLMClient, ClassifiedIntent } from './llm-client.interface.js';

class FakeLLMScript {
  private intentQueue: ClassifiedIntent[] = [];
  private answerQueue: string[] = [];

  queueIntent(intent: ClassifiedIntent) { this.intentQueue.push(intent); }
  queueAnswer(answer: string) { this.answerQueue.push(answer); }
  reset() { this.intentQueue = []; this.answerQueue = []; }

  nextIntent(): ClassifiedIntent {
    return this.intentQueue.shift() ?? { intent: 'unknown', args: {} };
  }
  nextAnswer(): string {
    return this.answerQueue.shift() ?? 'No tengo información sobre eso.';
  }
}

export const fakeLLMScript = new FakeLLMScript();

export class FakeLLMClient implements ILLMClient {
  async classify(_systemPrompt: string, _userText: string): Promise<ClassifiedIntent> {
    return fakeLLMScript.nextIntent();
  }
  async answerFaq(_systemPrompt: string, _userText: string): Promise<string> {
    return fakeLLMScript.nextAnswer();
  }
}
