// Script: test-tools
// Quick smoke test for each tool to verify they work independently.
//
// Run with: npm run test-tools

import { validateConfig } from "../src/lib/config";

async function main() {
  validateConfig();

  console.log("--- Calculator ---");
  console.log("TODO: Test calculator with a sample expression");

  console.log("\n--- Web Search ---");
  console.log("TODO: Test web search with a sample query");

  console.log("\n--- Knowledge Base ---");
  console.log("TODO: Test RAG retrieval with a sample stuck-moment query");
}

main().catch(console.error);
