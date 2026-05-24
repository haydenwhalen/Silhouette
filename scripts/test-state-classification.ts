import "dotenv/config";
import { loadSIODocuments } from "../src/rag/sioLoader";
import {
  getOrCreateVectorStore,
  similaritySearchWithState,
} from "../src/rag/vectorStore";
import {
  classifyState,
  shouldApplyStateFilter,
  MvpState,
} from "../src/agent/stateClassifier";

type Expectation =
  | { kind: "clear"; expectedState: MvpState }
  | { kind: "ambiguous" };

interface TestCase {
  label: string;
  query: string;
  expectation: Expectation;
}

const CASES: TestCase[] = [
  {
    label: "Direction Collapse (clear)",
    query:
      "I got what I thought I wanted, but now I feel empty and unsure what comes next.",
    expectation: { kind: "clear", expectedState: "direction-collapse" },
  },
  {
    label: "Engagement Drought (clear)",
    query:
      "I used to care about my work, but now I feel flat and disconnected from it.",
    expectation: { kind: "clear", expectedState: "engagement-drought" },
  },
  {
    label: "Inaction Loop (clear)",
    query: "I know exactly what I need to do, but I keep avoiding it.",
    expectation: { kind: "clear", expectedState: "inaction-loop" },
  },
  {
    label: "Ambiguous (sparse)",
    query: "I just feel stuck and off lately.",
    expectation: { kind: "ambiguous" },
  },
  {
    label: "Ambiguous (overwhelmed)",
    query: "I'm overwhelmed and not sure what's wrong.",
    expectation: { kind: "ambiguous" },
  },
];

interface RowReport {
  label: string;
  query: string;
  detected: string;
  confidence: string;
  needsClarification: boolean;
  passedToRetrieval: boolean;
  retrievedSioId: string | null;
  retrievedSioState: string | null;
  pass: boolean;
  note: string;
}

function header(s: string) {
  console.log("\n" + "=".repeat(72));
  console.log(s);
  console.log("=".repeat(72));
}

function judge(c: TestCase, applied: boolean, retrievedState: string | null, detected: string, confidence: string): { pass: boolean; note: string } {
  if (c.expectation.kind === "clear") {
    const { expectedState } = c.expectation;
    if (!applied) {
      return {
        pass: false,
        note: `Expected ${expectedState} to be passed into retrieval; classifier set confidence=${confidence}.`,
      };
    }
    if (detected !== expectedState) {
      return {
        pass: false,
        note: `Detected ${detected}, expected ${expectedState}.`,
      };
    }
    if (retrievedState !== expectedState) {
      return {
        pass: false,
        note: `Retrieved SIO has state ${retrievedState}, expected ${expectedState}.`,
      };
    }
    return { pass: true, note: "Detected and retrieved expected state." };
  }
  // ambiguous: pass means classifier did NOT force a state with high confidence
  if (applied && confidence === "high") {
    return {
      pass: false,
      note: `Ambiguous input was classified ${detected} with high confidence — should be low/moderate.`,
    };
  }
  if (!applied) {
    return {
      pass: true,
      note: `Correctly held back from state filter (confidence=${confidence}).`,
    };
  }
  // applied but moderate — acceptable per spec, log soft note
  return {
    pass: true,
    note: `Applied state ${detected} at moderate confidence — acceptable per Phase 2 routing rules.`,
  };
}

async function main() {
  header("Phase 2 State Classification + Retrieval Test");

  console.log("\nLoading SIOs...");
  const docs = await loadSIODocuments();
  console.log(`Loaded ${docs.length} SIO(s).`);
  if (docs.length === 0) {
    console.error("No SIOs loaded — aborting.");
    process.exit(1);
  }
  await getOrCreateVectorStore(docs);
  console.log("Vector store ready.");

  const rows: RowReport[] = [];

  for (const c of CASES) {
    header(`Case: ${c.label}`);
    console.log(`Query: ${c.query}`);

    const classification = await classifyState(c.query);
    const apply = shouldApplyStateFilter(classification);
    const stateForRetrieval = apply ? classification.detected_state : undefined;

    console.log(`\n[classification]`);
    console.log(`  detected_state:           ${classification.detected_state}`);
    console.log(`  state_confidence:         ${classification.state_confidence}`);
    console.log(`  secondary_possible_states:${classification.secondary_possible_states.join(", ") || " (none)"}`);
    console.log(`  needs_clarification:      ${classification.needs_clarification}`);
    console.log(`  classification_reason:    ${classification.classification_reason}`);
    console.log(`  state_passed_to_retrieval:${apply ? ` yes (${classification.detected_state})` : " no (fallback to unfiltered search)"}`);

    const results = await similaritySearchWithState(
      c.query,
      stateForRetrieval,
      1
    );
    const top = results[0];
    const retrievedSioId = top ? String(top.metadata.insight_id) : null;
    const retrievedSioState = top ? String(top.metadata.primary_state_tag) : null;

    console.log(`\n[retrieval]`);
    if (top) {
      console.log(`  retrieved_sio_id:    ${retrievedSioId}`);
      console.log(`  retrieved_sio_state: ${retrievedSioState}`);
      console.log(`  speaker:             ${top.metadata.speaker}`);
    } else {
      console.log(`  (no results)`);
    }

    const verdict = judge(
      c,
      apply,
      retrievedSioState,
      classification.detected_state,
      classification.state_confidence
    );
    console.log(`\n[verdict] ${verdict.pass ? "PASS" : "FAIL"} — ${verdict.note}`);

    rows.push({
      label: c.label,
      query: c.query,
      detected: classification.detected_state,
      confidence: classification.state_confidence,
      needsClarification: classification.needs_clarification,
      passedToRetrieval: apply,
      retrievedSioId,
      retrievedSioState,
      pass: verdict.pass,
      note: verdict.note,
    });
  }

  header("Summary");
  console.log(
    [
      "label".padEnd(32),
      "detected".padEnd(22),
      "conf".padEnd(10),
      "passed?".padEnd(8),
      "retrievedState".padEnd(22),
      "verdict",
    ].join(" | ")
  );
  console.log("-".repeat(110));
  for (const r of rows) {
    console.log(
      [
        r.label.padEnd(32),
        r.detected.padEnd(22),
        r.confidence.padEnd(10),
        (r.passedToRetrieval ? "yes" : "no").padEnd(8),
        (r.retrievedSioState ?? "-").padEnd(22),
        r.pass ? "PASS" : "FAIL",
      ].join(" | ")
    );
  }

  const fails = rows.filter((r) => !r.pass).length;
  console.log(`\nPassed: ${rows.length - fails}/${rows.length}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
