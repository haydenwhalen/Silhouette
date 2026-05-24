import "dotenv/config";
import { calculatorTool } from "../src/tools/calculator";
import { webSearchTool } from "../src/tools/webSearch";
import { knowledgeBaseTool } from "../src/tools/knowledgeBase";
import { loadSIODocuments } from "../src/rag/sioLoader";
import { getOrCreateVectorStore } from "../src/rag/vectorStore";

async function testCalculator() {
  console.log("=== Calculator Tool Tests ===\n");

  const tests = [
    "2000 / 250",
    "15 * 5",
    "180 / 6",
    "(3 * 60) + 45",
    "100 * 0.125",
    "abc + 1",
    "10 / 0",
  ];

  for (const expr of tests) {
    const result = await calculatorTool.invoke({ expression: expr });
    console.log("  " + expr + "  ->  " + result + "\n");
  }
}

async function testWebSearch() {
  console.log("=== Web Search Tool Tests ===\n");

  const queries = [
    "short podcast clip about overcoming avoidance in your 20s",
    "how to get out of a rut when you feel behind in life",
    "",
  ];

  for (const query of queries) {
    const label = query || "(empty)";
    console.log("  Query: " + JSON.stringify(label));
    const result = await webSearchTool.invoke({ query });
    console.log("  Result:");
    console.log(result);
    console.log();
  }
}

async function initVectorStore() {
  console.log("  Loading SIOs and creating vector store...");
  const docs = await loadSIODocuments();
  await getOrCreateVectorStore(docs);
  console.log(`  Vector store ready (${docs.length} SIOs).\n`);
}

async function testKnowledgeBase() {
  console.log("=== Knowledge Base Tool Tests ===\n");

  await initVectorStore();

  const queries = [
    "I feel overwhelmed and stuck",
    "I'm avoiding what matters",
    "I feel lonely",
    "I don't feel like I'm doing enough",
    "I'm too hard on myself and I want to change",
    "",
  ];

  for (const query of queries) {
    const label = query || "(empty)";
    console.log("  Query: " + JSON.stringify(label));
    const result = await knowledgeBaseTool.invoke({ query });
    console.log(result);
    console.log();
  }
}

async function main() {
  const target = process.argv[2];

  if (!target || target === "calculator") {
    await testCalculator();
  }

  if (!target || target === "web-search") {
    await testWebSearch();
  }

  if (!target || target === "knowledge-base") {
    await testKnowledgeBase();
  }

  if (target && !["calculator", "web-search", "knowledge-base"].includes(target)) {
    console.log("Unknown tool: " + JSON.stringify(target));
    console.log("Options: calculator, web-search, knowledge-base");
  }
}

main().catch(console.error);
