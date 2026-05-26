/**
 * scripts/test-smoke-flows.ts
 *
 * Drives the running dev server's API to simulate the manual browser smoke test
 * without a browser. Exercises preamble-aware session id + handle threading,
 * state classification, presentation rendering, feedback buttons,
 * retry-on-show-different, second-retry fallback, and sparse-query handling.
 *
 * Requires: `npm run dev` running on http://localhost:3000
 *
 * Run: `npx tsx scripts/test-smoke-flows.ts`
 */

// Explicit module marker so top-level identifiers don't collide with other scripts.
export {};

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const USER = "smoketest";

interface ChatResponse {
  reply: string;
  sessionId: string;
  toolsUsed?: string[];
  last_insight_id?: string | null;
  feedback_handled?: string | null;
}

interface FlowCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

interface FlowResult {
  flow: string;
  checks: FlowCheck[];
}

function newSession(suffix: string): string {
  return `s-${USER}-${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 6)}`;
}

async function postChat(args: {
  message: string;
  sessionId: string;
  feedback_source?: "text" | "button";
}): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: args.message,
      sessionId: args.sessionId,
      user_handle: USER,
      feedback_source: args.feedback_source ?? "text",
    }),
  });
  if (!res.ok) {
    throw new Error(`POST /api/chat → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function postDwell(args: {
  session_id: string;
  insight_id: string;
  dwell_ms: number;
  dwell_qualified: boolean;
}) {
  const res = await fetch(`${BASE}/api/feedback-signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`POST /api/feedback-signal → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function check(name: string, cond: boolean, detail?: string): FlowCheck {
  return { name, passed: cond, detail: detail ?? "" };
}

function looksLikeInsight(text: string): boolean {
  return /\*\*Did this land\?\*\*/.test(text) && /^>/m.test(text) && /^—\s/m.test(text);
}

async function flowDirectionCollapse(): Promise<FlowResult> {
  const sid = newSession("dc");
  const r = await postChat({
    message:
      "I got the promotion I'd been working toward for two years. Should feel great. I just feel empty. I don't know what comes next.",
    sessionId: sid,
  });
  return {
    flow: "Direction Collapse",
    checks: [
      check("insight presented", looksLikeInsight(r.reply), r.reply.slice(0, 60)),
      check("last_insight_id returned", !!r.last_insight_id, r.last_insight_id ?? "missing"),
      check("uses present_insight", (r.toolsUsed ?? []).includes("present_insight")),
    ],
  };
}

async function flowEngagementDrought(): Promise<FlowResult> {
  const sid = newSession("ed");
  const r = await postChat({
    message:
      "I used to love this work. Now I open my laptop and feel nothing. Not bad, just flat. It's been like this for months.",
    sessionId: sid,
  });
  return {
    flow: "Engagement Drought",
    checks: [
      check("insight presented", looksLikeInsight(r.reply), r.reply.slice(0, 60)),
      check("last_insight_id returned", !!r.last_insight_id),
    ],
  };
}

async function flowInactionLoop(): Promise<FlowResult> {
  const sid = newSession("il");
  const r = await postChat({
    message: "I know exactly what I need to do. I've known for months. I just keep not starting.",
    sessionId: sid,
  });
  return {
    flow: "Inaction Loop",
    checks: [
      check("insight presented", looksLikeInsight(r.reply), r.reply.slice(0, 60)),
      check("last_insight_id returned", !!r.last_insight_id),
    ],
  };
}

async function flowYesButton(): Promise<FlowResult> {
  const sid = newSession("yes");
  const first = await postChat({
    message:
      "I used to love this work. Now I open my laptop and feel nothing. Not bad, just flat. It's been like this for months.",
    sessionId: sid,
  });
  if (!first.last_insight_id) {
    return {
      flow: "Yes button",
      checks: [check("first insight presented", false, "no last_insight_id")],
    };
  }
  const dwell = await postDwell({
    session_id: sid,
    insight_id: first.last_insight_id,
    dwell_ms: 8500,
    dwell_qualified: true,
  });
  const yes = await postChat({
    message: "yes",
    sessionId: sid,
    feedback_source: "button",
  });
  return {
    flow: "Yes button",
    checks: [
      check("first insight present", !!first.last_insight_id),
      check("dwell ok=true", dwell.ok === true),
      check("yes handled as feedback", yes.feedback_handled === "positive", String(yes.feedback_handled)),
      check("yes reply is quiet (no second insight)", !looksLikeInsight(yes.reply), yes.reply.slice(0, 80)),
    ],
  };
}

async function flowShowDifferent(): Promise<FlowResult> {
  const sid = newSession("retry");
  const first = await postChat({
    message:
      "I used to love this work. Now I open my laptop and feel nothing. Not bad, just flat. It's been like this for months.",
    sessionId: sid,
  });
  if (!first.last_insight_id) {
    return {
      flow: "Show me different",
      checks: [check("first insight presented", false)],
    };
  }
  const retry = await postChat({
    message: "show me something different",
    sessionId: sid,
    feedback_source: "button",
  });
  return {
    flow: "Show me different",
    checks: [
      check("first insight present", !!first.last_insight_id),
      check("retry handled", retry.feedback_handled === "negative-retry", String(retry.feedback_handled)),
      check("retry returns different SIO", !!retry.last_insight_id && retry.last_insight_id !== first.last_insight_id, `${first.last_insight_id} → ${retry.last_insight_id}`),
      check("retry reply still has insight shape", looksLikeInsight(retry.reply)),
    ],
  };
}

async function flowSecondRetry(): Promise<FlowResult> {
  const sid = newSession("retry2");
  const first = await postChat({
    message:
      "I used to love this work. Now I open my laptop and feel nothing. Not bad, just flat. It's been like this for months.",
    sessionId: sid,
  });
  if (!first.last_insight_id) {
    return { flow: "Second retry cap", checks: [check("first insight presented", false)] };
  }
  const retry1 = await postChat({
    message: "show me something different",
    sessionId: sid,
    feedback_source: "button",
  });
  const retry2 = await postChat({
    message: "show me something different",
    sessionId: sid,
    feedback_source: "button",
  });
  return {
    flow: "Second retry cap",
    checks: [
      check("first insight present", !!first.last_insight_id),
      check("first retry succeeded", !!retry1.last_insight_id),
      check(
        "second retry returns graceful fallback",
        retry2.feedback_handled === "negative-retry-cap" ||
          retry2.feedback_handled === "negative-cap" ||
          (!retry2.last_insight_id && retry2.reply.length > 0),
        `feedback_handled=${retry2.feedback_handled}, last_insight_id=${retry2.last_insight_id}, reply=${retry2.reply.slice(0, 80)}`,
      ),
      check("no infinite loop (response received)", retry2.reply.length > 0),
    ],
  };
}

async function flowSparse(): Promise<FlowResult> {
  const sid = newSession("sparse");
  const r = await postChat({
    message: "I feel stuck",
    sessionId: sid,
  });
  return {
    flow: "Sparse query",
    checks: [
      check("response received", r.reply.length > 0, r.reply.slice(0, 80)),
      check("either no insight or has insight shape", r.last_insight_id == null || looksLikeInsight(r.reply)),
    ],
  };
}

async function flowApiSurfaceCheck(): Promise<FlowResult> {
  const homeRes = await fetch(BASE);
  const homeOk = homeRes.ok;
  const homeText = await homeRes.text();
  return {
    flow: "API surface check",
    checks: [
      check("GET / returns 200", homeOk),
      check("home contains <title>Silhouette</title>", homeText.includes("<title>Silhouette</title>")),
      check(
        "home SSR does NOT leak chat input markers before client mount",
        !homeText.includes("What&#x27;s going on for you right now"),
        "regression: SSR is rendering chat before client decides preamble state",
      ),
      check(
        "home SSR does NOT leak preamble before client mount",
        !homeText.includes("understand — continue"),
        "regression: SSR is rendering preamble before client decides accepted state",
      ),
    ],
  };
}

async function main() {
  console.log(`\n[smoke flows against ${BASE}]\n`);

  const flows: FlowResult[] = [];

  flows.push(await flowApiSurfaceCheck());
  flows.push(await flowDirectionCollapse());
  flows.push(await flowEngagementDrought());
  flows.push(await flowInactionLoop());
  flows.push(await flowSparse());
  flows.push(await flowYesButton());
  flows.push(await flowShowDifferent());
  flows.push(await flowSecondRetry());

  console.log("\n========== Smoke Flow Results ==========\n");
  let totalChecks = 0;
  let passedChecks = 0;
  for (const f of flows) {
    console.log(`Flow: ${f.flow}`);
    for (const c of f.checks) {
      totalChecks++;
      if (c.passed) {
        passedChecks++;
        console.log(`  ✓ ${c.name}${c.detail ? `  (${c.detail})` : ""}`);
      } else {
        console.log(`  ✗ ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
      }
    }
    console.log("");
  }

  console.log(`Total: ${passedChecks}/${totalChecks} checks passed across ${flows.length} flows`);
  if (passedChecks < totalChecks) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("smoke flows error:", err);
  process.exit(2);
});
