import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { BaseMessage } from "@langchain/core/messages";

const sessions = new Map<string, ChatMessageHistory>();

export function getSessionHistory(sessionId: string): ChatMessageHistory {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new ChatMessageHistory());
  }
  return sessions.get(sessionId)!;
}

export async function getMessages(sessionId: string): Promise<BaseMessage[]> {
  const history = getSessionHistory(sessionId);
  return history.getMessages();
}
