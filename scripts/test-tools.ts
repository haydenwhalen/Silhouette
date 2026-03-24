import { calculatorTool } from "../src/tools/calculator";

async function main() {
  console.log("=== Calculator Tool Tests ===\n");

  const tests = [
    "2000 / 250",
    "15 * 5",
    "180 / 6",
    "(3 * 60) + 45",
    "100 * 0.125",
    "abc + 1",        // should produce a clear error
    "10 / 0",         // Infinity — should produce an error
  ];

  for (const expr of tests) {
    const result = await calculatorTool.invoke({ expression: expr });
    console.log(`  ${expr}  →  ${result}\n`);
  }

  console.log("=== Calculator tool schema ===");
  console.log("Name:", calculatorTool.name);
  console.log("Description:", calculatorTool.description);
}

main().catch(console.error);
