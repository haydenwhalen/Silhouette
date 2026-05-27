import "dotenv/config";
import { loadSIODocuments } from "../src/rag/sioLoader";
import {
  getOrCreateVectorStore,
  similaritySearchWithState,
} from "../src/rag/vectorStore";

interface TestCase {
  label: string;
  query: string;
  expectedState:
    | "direction-collapse"
    | "engagement-drought"
    | "inaction-loop"
    | "possibility-paralysis"
    | "identity-transition"
    | "momentum-gap";
}

const CASES: TestCase[] = [
  {
    label: "Direction Collapse",
    query:
      "I got what I thought I wanted, but now I feel empty and unsure what comes next.",
    expectedState: "direction-collapse",
  },
  {
    label: "Engagement Drought",
    query:
      "I used to care about my work, but now I feel flat and disconnected from it.",
    expectedState: "engagement-drought",
  },
  {
    label: "Inaction Loop",
    query: "I know exactly what I need to do, but I keep avoiding it.",
    expectedState: "inaction-loop",
  },
  {
    label: "Possibility Paralysis",
    query:
      "I have several real options I could pursue and I can't commit to any one because choosing it forecloses the others.",
    expectedState: "possibility-paralysis",
  },
  {
    label: "Identity Transition",
    query:
      "A big chapter of my life ended and the thing that organized who I was is gone — I don't recognize myself now.",
    expectedState: "identity-transition",
  },
  {
    label: "Momentum Gap",
    query:
      "I had a strong routine going, fell off for a couple of months, and getting back into motion now feels impossible.",
    expectedState: "momentum-gap",
  },
];

function header(s: string) {
  console.log("\n" + "=".repeat(72));
  console.log(s);
  console.log("=".repeat(72));
}

async function main() {
  header("Phase 1 SIO Retrieval Test");

  console.log("\nLoading SIOs from corpus/sios/...");
  const docs = await loadSIODocuments();
  console.log(`Loaded ${docs.length} SIO(s).`);
  for (const d of docs) {
    console.log(
      `  - ${d.metadata.insight_id}  [state=${d.metadata.primary_state_tag}, speaker=${d.metadata.speaker}]`
    );
  }

  if (docs.length === 0) {
    console.error("\nNo SIOs loaded — aborting.");
    process.exit(1);
  }

  console.log("\nBuilding vector store...");
  await getOrCreateVectorStore(docs);
  console.log("Vector store ready.");

  let pass = 0;
  let fail = 0;

  for (const c of CASES) {
    header(`Case: ${c.label}`);
    console.log(`Query: ${c.query}`);

    // Query-only retrieval (no state filter)
    const queryOnly = await similaritySearchWithState(c.query, undefined, 1);
    const queryTop = queryOnly[0];
    console.log("\n[query-only top hit]");
    if (queryTop) {
      const m = queryTop.metadata;
      console.log(`  insight_id: ${m.insight_id}`);
      console.log(`  primary_state_tag: ${m.primary_state_tag}`);
      console.log(`  speaker: ${m.speaker}`);
    } else {
      console.log("  (no results)");
    }

    // State-filtered retrieval
    const stateFiltered = await similaritySearchWithState(
      c.query,
      c.expectedState,
      1
    );
    const stateTop = stateFiltered[0];
    console.log(`\n[state-filtered top hit (state=${c.expectedState})]`);
    if (stateTop) {
      const m = stateTop.metadata;
      console.log(`  insight_id: ${m.insight_id}`);
      console.log(`  primary_state_tag: ${m.primary_state_tag}`);
      console.log(`  speaker: ${m.speaker}`);
      console.log(`  key_claim: ${String(m.key_claim).slice(0, 200)}`);
    } else {
      console.log("  (no results)");
    }

    const queryStateOk = queryTop?.metadata.primary_state_tag === c.expectedState;
    const stateStateOk = stateTop?.metadata.primary_state_tag === c.expectedState;

    console.log("\n[verdict]");
    console.log(`  query-only retrieved expected state: ${queryStateOk ? "YES" : "NO"}`);
    console.log(`  state-filtered retrieved expected state: ${stateStateOk ? "YES" : "NO"}`);
    console.log(`  reasonable result: ${stateStateOk ? "YES" : "NO"}`);

    if (stateStateOk) pass++;
    else fail++;
  }

  header("Summary");
  console.log(`Passed: ${pass}/${CASES.length}`);
  console.log(`Failed: ${fail}/${CASES.length}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
