import "dotenv/config";
import { loadAndChunkDocuments } from "../src/rag/documents";
import { getOrCreateVectorStore, similaritySearch } from "../src/rag/vectorStore";

async function main() {
  console.log("=== Silhouette RAG Ingestion ===\n");

  const chunks = await loadAndChunkDocuments();
  console.log(`Loaded ${chunks.length} chunks from source documents.\n`);

  const store = await getOrCreateVectorStore(chunks);
  console.log("Vector store created successfully.\n");

  console.log("=== Test Queries ===\n");

  const queries = [
    "I've been avoiding my work and I feel ashamed",
    "I feel lonely and disconnected from people",
    "I keep telling myself I'm not doing enough",
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const results = await similaritySearch(query, 2);
    for (const doc of results) {
      const meta = doc.metadata;
      console.log(`  → ${meta.source_title} (${meta.source_author})`);
      console.log(`    ${meta.source_url}`);
      console.log(`    Tags: ${meta.tags}`);
      console.log(`    Chunk: "${doc.pageContent.slice(0, 120)}..."`);
    }
    console.log();
  }

  console.log("=== Ingestion complete ===");
}

main().catch(console.error);
