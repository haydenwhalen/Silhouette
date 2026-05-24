import "dotenv/config";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { chat } from "../src/agent";
import { resetSession } from "../src/memory/sessionState";
import { getFeedbackLogPath } from "../src/feedback/feedbackLog";

function header(s: string) {
  console.log("\n" + "=".repeat(72));
  console.log(s);
  console.log("=".repeat(72));
}

function readLog(): Array<Record<string, unknown>> {
  const path = getFeedbackLogPath();
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function ensureCleanLog() {
  const path = getFeedbackLogPath();
  if (existsSync(path)) unlinkSync(path);
}

async function caseLandedPositive() {
  header("Case 1 — Direction Collapse query + 'yes' → positive feedback logged");
  const sid = "test-positive-" + Date.now();
  resetSession(sid);

  const first = await chat(
    "I got the promotion I'd been working toward. Should feel great. Just feel empty.",
    sid
  );
  console.log(`[turn 1] tools=${first.toolsUsed.join(" → ")}, state=${first.classification.detected_state}`);
  const firstInsightId = (first.output.match(/insight_id|sio-[\w-]+/g) ?? [])[0] ?? null;
  // Better: read from the session via the last presentation context; but we can detect SIO from output indirectly.
  // We'll rely on log inspection below.

  const fb = await chat("yes", sid);
  console.log(`[turn 2] feedbackHandled=${fb.feedbackHandled}`);
  console.log(`[turn 2 output] ${fb.output.slice(0, 80)}`);

  const events = readLog().filter((e) => e.session_id === sid);
  const landed = events.find((e) => e.response_type === "landed");
  console.log(`[log] events for session: ${events.length}, landed event: ${!!landed}`);
  if (landed) {
    console.log(`  insight_id: ${landed.insight_id}, state: ${landed.detected_state}`);
  }

  const pass =
    fb.feedbackHandled === "positive" &&
    !!landed &&
    typeof landed.insight_id === "string" &&
    String(landed.insight_id).startsWith("sio-");
  console.log(`[verdict] ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function caseShowDifferent() {
  header("Case 2 — Engagement Drought + 'show me something different' → retry with prior excluded");
  const sid = "test-retry-" + Date.now();
  resetSession(sid);

  const first = await chat(
    "I used to love this work. Now I open my laptop and feel nothing. Just flat, for months.",
    sid
  );
  console.log(`[turn 1] tools=${first.toolsUsed.join(" → ")}`);
  // Find first SIO id by inspecting log presentation_built events would be cleaner, but
  // we can also look at the chronological log: the first retry event will reveal the excluded ID.

  const fb = await chat("show me something different", sid);
  console.log(`[turn 2] feedbackHandled=${fb.feedbackHandled}`);

  const events = readLog().filter((e) => e.session_id === sid);
  const showDiff = events.find((e) => e.response_type === "show_different");
  const retry = events.find((e) => e.response_type === "retry_presented");
  console.log(`[log] events: show_different=${!!showDiff}, retry_presented=${!!retry}`);
  if (showDiff) console.log(`  excluded SIO (first shown): ${showDiff.insight_id}`);
  if (retry) console.log(`  retry SIO: ${retry.insight_id}`);

  const pass =
    fb.feedbackHandled === "negative-retry" &&
    !!showDiff &&
    !!retry &&
    showDiff.insight_id !== retry.insight_id;
  console.log(`[verdict] ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function caseRetryCap() {
  header("Case 3 — Inaction Loop + 'not quite' twice → second negative does NOT retrigger retrieval");
  const sid = "test-cap-" + Date.now();
  resetSession(sid);

  await chat("I know what I need to do and I keep not doing it. Same conversation for months.", sid);
  const first = await chat("not quite", sid);
  console.log(`[turn 2] feedbackHandled=${first.feedbackHandled}`);
  const second = await chat("not quite", sid);
  console.log(`[turn 3] feedbackHandled=${second.feedbackHandled}`);

  const events = readLog().filter((e) => e.session_id === sid);
  const retries = events.filter((e) => e.response_type === "retry_presented");
  console.log(`[log] retry_presented count: ${retries.length}`);

  const pass =
    first.feedbackHandled === "negative-retry" &&
    second.feedbackHandled === "negative-no-retry" &&
    retries.length === 1;
  console.log(`[verdict] ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function caseStrayYes() {
  header("Case 4 — 'yes' as the very first message → stray feedback, graceful response");
  const sid = "test-stray-" + Date.now();
  resetSession(sid);

  const r = await chat("yes", sid);
  console.log(`[output] ${r.output.slice(0, 100)}`);
  const events = readLog().filter((e) => e.session_id === sid);
  const stray = events.find((e) => e.response_type === "stray_feedback");
  console.log(`[log] stray_feedback: ${!!stray}`);
  const pass = r.feedbackHandled === "stray" && !!stray;
  console.log(`[verdict] ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function caseJsonlValidity() {
  header("Case 5 — corpus/feedback.jsonl contains valid JSON per line");
  const path = getFeedbackLogPath();
  if (!existsSync(path)) {
    console.log("FAIL — log file does not exist");
    return false;
  }
  const lines = readFileSync(path, "utf-8").split("\n").filter(Boolean);
  console.log(`[log] ${lines.length} line(s)`);
  let allValid = true;
  for (const [i, l] of lines.entries()) {
    try {
      const obj = JSON.parse(l);
      const requiredFields = [
        "event_id",
        "session_id",
        "timestamp",
        "response_type",
        "retry_count",
      ];
      for (const f of requiredFields) {
        if (!(f in obj)) {
          console.log(`  line ${i + 1}: missing field ${f}`);
          allValid = false;
        }
      }
    } catch (e) {
      console.log(`  line ${i + 1}: invalid JSON`);
      allValid = false;
    }
  }
  console.log(`[verdict] ${allValid ? "PASS" : "FAIL"}`);
  return allValid;
}

async function main() {
  header("Phase 5 Feedback Loop Test");
  ensureCleanLog();

  const results: { name: string; pass: boolean }[] = [];
  results.push({ name: "positive feedback logged", pass: await caseLandedPositive() });
  results.push({ name: "show different retries with exclusion", pass: await caseShowDifferent() });
  results.push({ name: "retry cap enforced", pass: await caseRetryCap() });
  results.push({ name: "stray feedback handled", pass: await caseStrayYes() });
  results.push({ name: "JSONL log validity", pass: await caseJsonlValidity() });

  header("Summary");
  for (const r of results) {
    console.log(`  ${r.pass ? "✓" : "✗"}  ${r.name}`);
  }
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n${passCount}/${results.length} passed`);
  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
