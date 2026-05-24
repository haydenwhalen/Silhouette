import "dotenv/config";
import { chat } from "../src/agent";

interface Probe {
  label: string;
  query: string;
}

const PROBES: Probe[] = [
  {
    label: "Direction Collapse",
    query:
      "I got the promotion I'd been working toward for two years. I should feel great. I just feel empty. I don't know what comes next.",
  },
  {
    label: "Engagement Drought",
    query:
      "I used to love this work. Now I open my laptop and feel nothing. Not bad, just flat. It's been like this for months.",
  },
];

function header(s: string) {
  console.log("\n" + "=".repeat(72));
  console.log(s);
  console.log("=".repeat(72));
}

interface Checks {
  used_knowledge_base: boolean;
  used_present_insight: boolean;
  has_block_quote: boolean;
  has_attribution_dash: boolean;
  has_feedback_prompt: boolean;
  has_did_this_land: boolean;
  output_not_raw_tool_output: boolean;
}

async function main() {
  header("Phase 5 Step 0 — Real Chat E2E Verification");

  let pass = 0;
  let fail = 0;

  for (const p of PROBES) {
    header(`Probe: ${p.label}`);
    console.log(`Query: ${p.query}\n`);

    const result = await chat(p.query, `e2e-${p.label.replace(/\s/g, "-")}-${Date.now()}`);

    console.log(`[classification] ${result.classification.detected_state} (${result.classification.state_confidence})`);
    console.log(`[tools used] ${result.toolsUsed.join(" → ") || "(none)"}`);
    console.log("\n[final output as user would see it]");
    console.log(result.output.split("\n").map((l) => "  " + l).join("\n"));

    const checks: Checks = {
      used_knowledge_base: result.toolsUsed.includes("knowledge_base"),
      used_present_insight: result.toolsUsed.includes("present_insight"),
      has_block_quote: /^>\s/m.test(result.output),
      has_attribution_dash: /^—\s/m.test(result.output),
      has_feedback_prompt: result.output.includes("Did this land?"),
      has_did_this_land: result.output.includes("Did this land?"),
      output_not_raw_tool_output:
        !result.output.startsWith("[1]") && !result.output.includes("insight_id: sio-"),
    };

    console.log("\n[checks]");
    for (const [k, v] of Object.entries(checks)) {
      console.log(`  ${v ? "✓" : "✗"}  ${k}`);
    }

    const allOk = Object.values(checks).every(Boolean);
    console.log(`\n[verdict] ${allOk ? "PASS" : "FAIL"}`);
    if (allOk) pass++;
    else fail++;
  }

  header("Summary");
  console.log(`Passed: ${pass}/${PROBES.length}`);
  console.log(`Failed: ${fail}/${PROBES.length}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
