import * as readline from "readline";
import { chat } from "../src/agent/index";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SESSION_ID = "test-" + Date.now();

console.log("=== Silhouette Agent Test CLI ===");
console.log("Type a message to chat. Type 'quit' to exit.");
console.log("Session:", SESSION_ID);
console.log("");

function askQuestion(): void {
  rl.question("You: ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.toLowerCase() === "quit") {
      console.log("Goodbye.");
      rl.close();
      return;
    }

    try {
      const start = Date.now();
      const response = await chat(trimmed, SESSION_ID);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log("");
      console.log("Silhouette:", response.output);
      const tools = response.toolsUsed.length
        ? response.toolsUsed.join(", ")
        : "none";
      console.log(`  [${elapsed}s | tools: ${tools}]`);
      console.log("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error:", msg);
      console.log("");
    }

    askQuestion();
  });
}

askQuestion();
