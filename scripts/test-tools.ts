import "dotenv/config";
import { calculatorTool } from "../src/tools/calculator";
import { webSearchTool } from "../src/tools/webSearch";

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
    console.log(`  ${expr}  →  ${result}\n`);
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

async function main() {
  const target = process.argv[2];

  if (!target || target === "calculator") {
    await testCalculator();
  }

  if (!target || target === "web-search") {
    await testWebSearch();
  }

  if (target && !["calculator", "web-search"].includes(target)) {
    console.log(`Unknown tool: "${target}". Options: calculator, web-search`);
  }
}

main().catch(console.error);
