// Script: ingest-docs
// Loads source documents from docs/sources/, chunks them, attaches metadata,
// and ingests them into the vector store.
//
// Run with: npm run ingest

import { validateConfig } from "../src/lib/config";

async function main() {
  validateConfig();
  console.log("TODO: Load documents from docs/sources/");
  console.log("TODO: Chunk and attach metadata");
  console.log("TODO: Ingest into vector store");
}

main().catch(console.error);
