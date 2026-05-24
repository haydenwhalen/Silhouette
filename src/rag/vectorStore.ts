import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { requireKey } from "../lib/config";
import { logAgentStep } from "../logging/logger";

let store: MemoryVectorStore | null = null;

export async function getOrCreateVectorStore(
  docs?: Document[]
): Promise<MemoryVectorStore> {
  if (store) return store;

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: requireKey("openaiApiKey"),
    model: "text-embedding-3-small",
  });

  if (docs && docs.length > 0) {
    store = await MemoryVectorStore.fromDocuments(docs, embeddings);
    logAgentStep("vectorstore_created", { documentCount: docs.length });
  } else {
    store = new MemoryVectorStore(embeddings);
    logAgentStep("vectorstore_created", { documentCount: 0, note: "empty store" });
  }

  return store;
}

export async function similaritySearch(
  query: string,
  k = 3
): Promise<Document[]> {
  if (!store) throw new Error("Vector store not initialized. Run ingestion first.");
  return store.similaritySearch(query, k);
}

export async function similaritySearchWithState(
  query: string,
  state?: string,
  k = 3
): Promise<Document[]> {
  if (!store) throw new Error("Vector store not initialized. Run ingestion first.");

  if (!state) return store.similaritySearch(query, k);

  const filter = (doc: Document) => {
    const primary = String(doc.metadata.primary_state_tag ?? "");
    if (primary === state) return true;
    const secondary = doc.metadata.secondary_state_tags;
    if (Array.isArray(secondary) && secondary.map(String).includes(state)) {
      return true;
    }
    return false;
  };

  return store.similaritySearch(query, k, filter);
}
