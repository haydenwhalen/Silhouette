/**
 * Probe: does the dwell signal endpoint break session state for the same session?
 * If "yes-without-dwell" works and "yes-with-dwell" fails on the same dev server,
 * the dynamic import in feedback-signal/route.ts is creating a separate module copy.
 */

export {};

const BASE = "http://localhost:3000";

async function postChat(message: string, sessionId: string, source: "text" | "button" = "text") {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId, user_handle: "probe", feedback_source: source }),
  });
  return res.json();
}

async function postDwell(payload: { session_id: string; insight_id: string; dwell_ms: number; dwell_qualified: boolean }) {
  const res = await fetch(`${BASE}/api/feedback-signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function main() {
  console.log("\n[A] Yes WITHOUT dwell between insight and yes");
  const sidA = `s-probe-A-${Date.now()}`;
  const a1 = await postChat(
    "I used to love this work. Now I open my laptop and feel nothing. Just flat, for months.",
    sidA,
  );
  console.log(`  first insight_id: ${a1.last_insight_id}`);
  const a2 = await postChat("yes", sidA, "button");
  console.log(`  yes feedback_handled: ${a2.feedback_handled}`);
  console.log(`  yes reply preview: ${a2.reply?.slice(0, 60)}`);

  console.log("\n[B] Yes WITH dwell between insight and yes");
  const sidB = `s-probe-B-${Date.now()}`;
  const b1 = await postChat(
    "I used to love this work. Now I open my laptop and feel nothing. Just flat, for months.",
    sidB,
  );
  console.log(`  first insight_id: ${b1.last_insight_id}`);
  if (b1.last_insight_id) {
    const dwell = await postDwell({
      session_id: sidB,
      insight_id: b1.last_insight_id,
      dwell_ms: 8500,
      dwell_qualified: true,
    });
    console.log(`  dwell ok: ${dwell.ok}`);
  }
  const b2 = await postChat("yes", sidB, "button");
  console.log(`  yes feedback_handled: ${b2.feedback_handled}`);
  console.log(`  yes reply preview: ${b2.reply?.slice(0, 60)}`);

  console.log("\n[verdict]");
  console.log(`  A (no dwell): ${a2.feedback_handled === "positive" ? "POSITIVE ✓" : "STRAY ✗"}`);
  console.log(`  B (with dwell): ${b2.feedback_handled === "positive" ? "POSITIVE ✓" : "STRAY ✗"}`);
  if (a2.feedback_handled === "positive" && b2.feedback_handled === "stray") {
    console.log("  → Dwell endpoint dynamic import is the culprit. Fix: use static import.");
  } else if (a2.feedback_handled !== "positive" && b2.feedback_handled !== "positive") {
    console.log("  → Both fail — session state not persisting at all in dev. Different root cause.");
  } else if (a2.feedback_handled === "positive" && b2.feedback_handled === "positive") {
    console.log("  → Both succeed — earlier smoke test failure was transient.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
