import type { IFlow } from './flow.interface.js';
import type { ILLMClient } from '../../../adapters/llm/llm-client.interface.js';
import type { Conversation } from '../../../domain/entities.js';

export class FAQFlow implements IFlow {
  constructor(private llmClient: ILLMClient, private shopName: string, private shopPhone: string) {}

  async handle(input: { conversation: Conversation; body: string }) {
    const { conversation, body } = input;
    const language = conversation.language as 'es' | 'en';

    const systemPrompt = language === 'es'
      ? `Eres un asistente FAQ de la barbería "${this.shopName}".
Responde preguntas sobre servicios, horarios, políticas y ubicación de la barbería.
Si la pregunta está fuera de alcance o no está relacionada con la barbería, responde: "out_of_scope".
Responde en español de manera concisa.`
      : `You are a FAQ assistant for the barbershop "${this.shopName}".
Answer questions about services, hours, policies, and location.
If the question is out of scope or unrelated to the barbershop, respond: "out_of_scope".
Respond in English concisely.`;

    const answer = await this.llmClient.answerFaq(systemPrompt, body);

    if (!answer || answer.includes('out_of_scope')) {
      const contactMsg = language === 'es'
        ? `No puedo ayudarte con eso. Por favor, llama a la barbería al ${this.shopPhone}.`
        : `I can't help with that. Please call the barbershop at ${this.shopPhone}.`;

      return {
        reply: contactMsg,
        nextState: 'idle' as const,
        nextContext: null,
      };
    }

    return {
      reply: answer,
      nextState: 'idle' as const,
      nextContext: null,
    };
  }
}
