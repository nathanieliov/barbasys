import type { Conversation, ConversationState } from '../../../domain/entities.js';

export interface IFlow {
  handle(input: {
    conversation: Conversation;
    body: string;
  }): Promise<{
    reply: string;
    nextState: ConversationState;
    nextContext: unknown | null;
  }>;
}
