// Conversation memory — session-scoped buffer that keeps multi-turn context coherent.

export function createConversationMemory() {
  // TODO: Initialize LangChain BufferMemory or ConversationBufferMemory
  // Memory is session-scoped only — no cross-session persistence in the MVP
  throw new Error("Not implemented yet");
}
