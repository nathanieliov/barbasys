import type { ILLMClient, ClassifiedIntent } from '../../adapters/llm/llm-client.interface.js';
import type { ShopContext } from './shop-context-loader.js';

export async function routeIntent(
  llmClient: ILLMClient,
  shopContext: ShopContext,
  language: 'es' | 'en',
  userText: string
): Promise<ClassifiedIntent> {
  const servicesList = shopContext.activeServices.map(s => `- ${s.name} ($${s.price}, ${s.duration_minutes} min)`).join('\n');
  const barbersList = shopContext.activeBarbers.map(b => `- ${b.fullname}`).join('\n');

  const systemPrompt = language === 'es'
    ? `Eres un asistente de chatbot para una barbería llamada "${shopContext.shopName}".
Tu tarea es clasificar la intención del usuario en una de estas categorías: book, cancel, reschedule, view_next, faq, o unknown.

Servicios disponibles:
${servicesList}

Barberos disponibles:
${barbersList}

Responde SOLO con un JSON válido en este formato exacto (sin markdown):
{"intent":"book"|"cancel"|"reschedule"|"view_next"|"faq"|"unknown","args":{}}`
    : `You are a chatbot assistant for a barbershop called "${shopContext.shopName}".
Your task is to classify the user's intent into one of these categories: book, cancel, reschedule, view_next, faq, or unknown.

Available services:
${servicesList}

Available barbers:
${barbersList}

Respond ONLY with valid JSON in this exact format (no markdown):
{"intent":"book"|"cancel"|"reschedule"|"view_next"|"faq"|"unknown","args":{}}`;

  return llmClient.classify(systemPrompt, userText);
}
