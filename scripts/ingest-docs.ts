import "dotenv/config";
import { loadSIODocuments } from "../src/rag/sioLoader";
import { getOrCreateVectorStore, similaritySearchWithState } from "../src/rag/vectorStore";

async function main() {
  console.log("=== Silhouette SIO Ingestion ===\n");

  const docs = await loadSIODocuments();
  console.log(`Loaded ${docs.length} SIOs from corpus/sios/.\n`);

  if (docs.length === 0) {
    console.log("No SIOs loaded. Check human_review_status and required fields.");
    return;
  }

  const store = await getOrCreateVectorStore(docs);
  console.log("Vector store created successfully.\n");
  void store;

  console.log("=== Smoke-test Queries ===\n");

  const queries: { query: string; state?: string }[] = [
    { query: "I got what I thought I wanted, but now I feel empty and unsure what comes next.", state: "direction-collapse" },
    { query: "I used to care about my work, but now I feel flat and disconnected from it.", state: "engagement-drought" },
    { query: "I know exactly what I need to do, but I keep avoiding it.", state: "inaction-loop" },
  ];

  for (const { query, state } of queries) {
    console.log(`Query: "${query}"`);
    console.log(`State: ${state ?? "(none)"}`);
    const results = await similaritySearchWithState(query, state, 2);
    for (const doc of results) {
      const m = doc.metadata;
      console.log(`  → ${m.insight_id}`);
      console.log(`    Speaker: ${m.speaker} | State: ${m.primary_state_tag}`);
      console.log(`    Key claim: ${String(m.key_claim).slice(0, 120)}...`);
    }
    console.log();
  }

  console.log("=== Ingestion complete ===");
}

main().catch(console.error);
