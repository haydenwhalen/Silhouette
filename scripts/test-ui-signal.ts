import "dotenv/config";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { POST as chatPost } from "../src/app/api/chat/route";
import { POST as signalPost } from "../src/app/api/feedback-signal/route";
import { resetSession } from "../src/memory/sessionState";
import { getFeedbackLogPath } from "../src/feedback/feedbackLog";

// We invoke the route handlers directly with a constructed Request so we exercise
// the actual /api/chat and /api/feedback-signal code without spinning up the
// Next.js dev server. NextRequest is structurally compatible with Request for
// the methods our handlers use (.json()).

interface ChatResponseJson {
  reply: string;
  sessionId: string;
  toolsUsed: string[];
  last_insight_id: string | null;
  feedback_handled: string | null;
}

async function postChat(message: string, sessionId: string): Promise<ChatResponseJson> {
  const req = new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, sessionId }),
    headers: { "Content-Type": "application/json" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await chatPost(req as any);
  return res.json() as Promise<ChatResponseJson>;
}

async function postSignal(payload: {
  session_id: string;
  insight_id: string;
  dwell_ms: number;
  dwell_qualified: boolean;
}): Promise<{ ok?: boolean; error?: string; event_id?: string }> {
  const req = new Request("http://localhost/api/feedback-signal", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await signalPost(req as any);
  return res.json();
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

function header(s: string) {
  console.log("\n" + "=".repeat(72));
  console.log(s);
  console.log("=".repeat(72));
}

async function caseChatReturnsInsightId() {
  header("Case 1 — /api/chat returns last_insight_id after a real presentation");
  const sid = "test-uisig-1-" + Date.now();
  resetSession(sid);
  const r = await postChat(
    "I got the promotion I'd been working toward. Should feel great. Just feel empty.",
    sid
  );
  console.log(`  reply preview: ${r.reply.slice(0, 60)}...`);
  console.log(`  toolsUsed: ${r.toolsUsed.join(" → ")}`);
  console.log(`  last_insight_id: ${r.last_insight_id}`);
  const pass =
    typeof r.last_insight_id === "string" &&
    r.last_insight_id.startsWith("sio-") &&
    r.toolsUsed.includes("present_insight");
  console.log(`  verdict: ${pass ? "PASS" : "FAIL"}`);
  return { pass, sessionId: sid, insightId: r.last_insight_id };
}

async function caseDwellSignalRoundtrip(sessionId: string, insightId: string) {
  header("Case 2 — /api/feedback-signal logs a dwell_signal event");
  const r = await postSignal({
    session_id: sessionId,
    insight_id: insightId,
    dwell_ms: 8240,
    dwell_qualified: true,
  });
  console.log(`  response: ${JSON.stringify(r)}`);
  const log = readLog();
  const dwell = log.find(
    (e) =>
      e.session_id === sessionId &&
      e.response_type === "dwell_signal" &&
      e.insight_id === insightId
  );
  console.log(`  log entry found: ${!!dwell}`);
  if (dwell) {
    console.log(`    dwell_ms=${dwell.dwell_ms}, dwell_qualified=${dwell.dwell_qualified}`);
  }
  const pass =
    r.ok === true &&
    !!dwell &&
    typeof dwell.dwell_ms === "number" &&
    typeof dwell.dwell_qualified === "boolean";
  console.log(`  verdict: ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function caseDwellSignalValidation() {
  header("Case 3 — /api/feedback-signal rejects missing fields");
  const reqA = new Request("http://localhost/api/feedback-signal", {
    method: "POST",
    body: JSON.stringify({ insight_id: "sio-x", dwell_ms: 100, dwell_qualified: true }),
    headers: { "Content-Type": "application/json" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resA = await signalPost(reqA as any);
  const a = await resA.json();
  const reqB = new Request("http://localhost/api/feedback-signal", {
    method: "POST",
    body: JSON.stringify({ session_id: "s", insight_id: "sio-x", dwell_qualified: true }),
    headers: { "Content-Type": "application/json" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resB = await signalPost(reqB as any);
  const b = await resB.json();
  console.log(`  missing session_id → ${JSON.stringify(a)}`);
  console.log(`  missing dwell_ms   → ${JSON.stringify(b)}`);
  const pass = resA.status === 400 && resB.status === 400;
  console.log(`  verdict: ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function casePositiveFeedbackEndToEnd(sessionId: string) {
  header("Case 4 — POST 'yes' to /api/chat triggers positive feedback path");
  const r = await postChat("yes", sessionId);
  console.log(`  reply: ${r.reply}`);
  console.log(`  last_insight_id: ${r.last_insight_id} (expected null — feedback turn)`);
  console.log(`  feedback_handled: ${r.feedback_handled}`);
  const log = readLog();
  const landed = log.find(
    (e) => e.session_id === sessionId && e.response_type === "landed"
  );
  console.log(`  landed event logged: ${!!landed}`);
  const pass =
    r.feedback_handled === "positive" && r.last_insight_id === null && !!landed;
  console.log(`  verdict: ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function caseShowDifferentEndToEnd() {
  header("Case 5 — POST 'show me something different' triggers retry");
  const sid = "test-uisig-retry-" + Date.now();
  resetSession(sid);
  const first = await postChat(
    "I used to love this work. Now I open my laptop and feel nothing. Just flat, for months.",
    sid
  );
  console.log(`  first insight: ${first.last_insight_id}`);
  const retry = await postChat("show me something different", sid);
  console.log(`  retry insight: ${retry.last_insight_id}`);
  console.log(`  retry feedback_handled: ${retry.feedback_handled}`);
  const pass =
    retry.feedback_handled === "negative-retry" &&
    typeof retry.last_insight_id === "string" &&
    retry.last_insight_id !== first.last_insight_id;
  console.log(`  verdict: ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

async function main() {
  header("Phase 6a UI Signal Test");
  ensureCleanLog();

  const r1 = await caseChatReturnsInsightId();
  const r2 = r1.insightId
    ? await caseDwellSignalRoundtrip(r1.sessionId, r1.insightId)
    : false;
  const r3 = await caseDwellSignalValidation();
  const r4 = r1.insightId ? await casePositiveFeedbackEndToEnd(r1.sessionId) : false;
  const r5 = await caseShowDifferentEndToEnd();

  header("Summary");
  const results = [
    { name: "chat returns last_insight_id", pass: r1.pass },
    { name: "dwell signal roundtrip", pass: r2 },
    { name: "dwell signal validation", pass: r3 },
    { name: "positive feedback via API", pass: r4 },
    { name: "show different via API triggers retry", pass: r5 },
  ];
  for (const r of results) console.log(`  ${r.pass ? "✓" : "✗"}  ${r.name}`);
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n${passCount}/${results.length} passed`);
  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
