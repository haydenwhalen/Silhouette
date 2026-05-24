import "dotenv/config";
import { existsSync, readFileSync } from "fs";
import { getFeedbackLogPath, type FeedbackEvent } from "../src/feedback/feedbackLog";

// Phase 7 path recommendation thresholds. Tweak as the corpus and beta data grow.
const PHASE7_THRESHOLDS = {
  min_events_for_recommendation: 20,
  min_presentations_per_sio_for_judgment: 3,
  yes_rate_low: 0.3,
  yes_rate_high: 0.7,
  response_rate_low: 0.4,
  retry_dominance: 0.55, // % of retries that ended in Yes — high means retrieval mitigation might help
};

interface Aggregates {
  total_events: number;
  total_sessions: number;
  total_user_handles: number;
  by_response_type: Record<string, number>;
  presentations: number;
  yes_rate_overall: number | null;
  yes_rate_by_state: Record<string, { yes: number; total: number; rate: number | null }>;
  per_sio: Record<
    string,
    {
      presentations: number;
      yes: number;
      different: number;
      yes_rate: number | null;
      flagged_no_yes: boolean;
      flagged_high_retry: boolean;
      reconstructed: boolean;
    }
  >;
  retry_trigger_rate_by_state: Record<string, { retries: number; presentations: number; rate: number | null }>;
  retry_success_rate: number | null;
  response_rate: number | null;
  dwell_summary: {
    avg_ms_by_response_type: Record<string, number | null>;
    median_ms_by_response_type: Record<string, number | null>;
    qualified_true: number;
    qualified_false: number;
  };
  data_quality_warnings: string[];
}

// 6 of 9 SIOs are reconstructed (verbatim only for McConaughey, Manson, Newport).
// This list lets the analysis spot a verbatim-vs-reconstructed performance gap.
const RECONSTRUCTED_SIO_IDS = new Set([
  "sio-huberman-dopamine-baseline-2021",
  "sio-goggins-identity-of-inaction-2023",
  "sio-grant-languishing-2021",
  "sio-brown-numbing-not-failing-2021",
  "sio-pressfield-resistance-2015",
  "sio-robbins-5-second-rule-2011",
]);

function loadLog(): { events: FeedbackEvent[]; warnings: string[] } {
  const path = getFeedbackLogPath();
  if (!existsSync(path)) {
    return { events: [], warnings: ["feedback log does not exist yet"] };
  }
  const lines = readFileSync(path, "utf-8").split("\n").filter(Boolean);
  const events: FeedbackEvent[] = [];
  const warnings: string[] = [];
  for (const [i, line] of lines.entries()) {
    try {
      const obj = JSON.parse(line);
      if (!obj.response_type || !obj.session_id) {
        warnings.push(`line ${i + 1}: missing response_type or session_id`);
        continue;
      }
      events.push(obj as FeedbackEvent);
    } catch {
      warnings.push(`line ${i + 1}: invalid JSON`);
    }
  }
  return { events, warnings };
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function aggregate(events: FeedbackEvent[], warnings: string[]): Aggregates {
  const sessions = new Set<string>();
  const handles = new Set<string>();
  const byType: Record<string, number> = {};
  const yesByState: Record<string, { yes: number; total: number }> = {};
  const perSio: Record<string, { presentations: number; yes: number; different: number }> = {};
  const retriesByState: Record<string, { retries: number; presentations: number }> = {};
  const dwellByType: Record<string, number[]> = {};
  let qualifiedTrue = 0;
  let qualifiedFalse = 0;
  let presentationsCount = 0;

  // Build a per-session map of (session, last_seen_insight_id) so we can
  // count yes/different against the SIO actually shown.
  const sessionShownChain: Record<string, FeedbackEvent[]> = {};

  for (const e of events) {
    sessions.add(e.session_id);
    if (e.user_handle) handles.add(e.user_handle);
    byType[e.response_type] = (byType[e.response_type] ?? 0) + 1;
    (sessionShownChain[e.session_id] ??= []).push(e);

    if (e.response_type === "dwell_signal") {
      if (typeof e.dwell_ms === "number") {
        (dwellByType[e.response_type] ??= []).push(e.dwell_ms);
      }
      if (e.dwell_qualified === true) qualifiedTrue++;
      else if (e.dwell_qualified === false) qualifiedFalse++;
    }
  }

  // Count presentations: every "retry_presented" + every distinct shown_sio_id
  // from initial knowledge_base→present_insight chains. Heuristic: count from
  // any event whose response_type is in {landed, show_different, retry_presented}
  // because each implies an insight was presented to the user.
  // Cleaner: count dwell_signal events plus retry_presented (one per presentation).
  // dwell_signal fires once per insight render in the UI; retry_presented fires
  // on the server for retries (which the UI also dwells on). To avoid double-
  // counting, prefer dwell_signal as the canonical "presentation happened in UI".
  const dwellCount = byType["dwell_signal"] ?? 0;
  // Fallback when no UI dwell events exist (e.g., script-only runs): use the
  // count of unique presented insights inferred from landed + show_different.
  const inferredPresentations = new Set<string>();
  for (const e of events) {
    if (e.shown_sio_id && (e.response_type === "landed" || e.response_type === "show_different")) {
      inferredPresentations.add(`${e.session_id}|${e.shown_sio_id}`);
    }
    if (e.response_type === "retry_presented" && e.shown_sio_id) {
      inferredPresentations.add(`${e.session_id}|${e.shown_sio_id}`);
    }
  }
  // Use max of the two signals — both are lower bounds on real presentations.
  // dwell_signal is fired by the UI; inferred captures presentations that
  // produced any feedback event. In real beta they should converge; until then,
  // the larger of the two is closer to truth.
  presentationsCount = Math.max(dwellCount, inferredPresentations.size);
  if (dwellCount > 0 && Math.abs(dwellCount - inferredPresentations.size) > 0) {
    warnings.push(
      `dwell_signal count (${dwellCount}) and inferred presentation count (${inferredPresentations.size}) disagree — may indicate mixed UI + script-only events in the log`
    );
  }

  for (const e of events) {
    if ((e.response_type === "landed" || e.response_type === "show_different") && e.detected_state) {
      const slot = (yesByState[e.detected_state] ??= { yes: 0, total: 0 });
      slot.total++;
      if (e.response_type === "landed") slot.yes++;
    }
    if (e.shown_sio_id) {
      const slot = (perSio[e.shown_sio_id] ??= { presentations: 0, yes: 0, different: 0 });
      if (e.response_type === "landed") {
        slot.presentations++;
        slot.yes++;
      } else if (e.response_type === "show_different") {
        slot.presentations++;
        slot.different++;
      } else if (e.response_type === "retry_presented") {
        slot.presentations++;
      }
    }
    if (e.response_type === "retry_presented" && e.detected_state) {
      const slot = (retriesByState[e.detected_state] ??= { retries: 0, presentations: 0 });
      slot.retries++;
    }
  }
  // Map retries-vs-presentations using per-state presentation counts inferred
  // from yes+show_different events at the same state.
  for (const state of Object.keys(retriesByState)) {
    const presentationsAtState =
      (yesByState[state]?.total ?? 0) + (retriesByState[state]?.retries ?? 0);
    retriesByState[state].presentations = presentationsAtState;
  }

  // Retry success: of all retry_presented events, how many were followed by
  // a "landed" event in the same session?
  let retryAttempts = 0;
  let retrySuccess = 0;
  for (const chain of Object.values(sessionShownChain)) {
    for (let i = 0; i < chain.length; i++) {
      const ev = chain[i];
      if (ev.response_type !== "retry_presented") continue;
      retryAttempts++;
      // Look ahead in the chain for a "landed" event referencing this retry SIO.
      for (let j = i + 1; j < chain.length; j++) {
        const next = chain[j];
        if (
          next.response_type === "landed" &&
          next.shown_sio_id === ev.shown_sio_id
        ) {
          retrySuccess++;
          break;
        }
      }
    }
  }

  const yesRateByState: Aggregates["yes_rate_by_state"] = {};
  for (const [state, slot] of Object.entries(yesByState)) {
    yesRateByState[state] = {
      yes: slot.yes,
      total: slot.total,
      rate: slot.total > 0 ? slot.yes / slot.total : null,
    };
  }
  const retryTriggerRateByState: Aggregates["retry_trigger_rate_by_state"] = {};
  for (const [state, slot] of Object.entries(retriesByState)) {
    retryTriggerRateByState[state] = {
      retries: slot.retries,
      presentations: slot.presentations,
      rate: slot.presentations > 0 ? slot.retries / slot.presentations : null,
    };
  }

  const totalYesOverall = (byType["landed"] ?? 0);
  const totalExplicitResponses = (byType["landed"] ?? 0) + (byType["show_different"] ?? 0);
  const yesRateOverall =
    totalExplicitResponses > 0 ? totalYesOverall / totalExplicitResponses : null;

  const responseRate =
    presentationsCount > 0 ? totalExplicitResponses / presentationsCount : null;

  const perSioOut: Aggregates["per_sio"] = {};
  for (const [id, slot] of Object.entries(perSio)) {
    const yesRate = slot.presentations > 0 ? slot.yes / slot.presentations : null;
    perSioOut[id] = {
      ...slot,
      yes_rate: yesRate,
      flagged_no_yes:
        slot.presentations >= PHASE7_THRESHOLDS.min_presentations_per_sio_for_judgment &&
        slot.yes === 0,
      flagged_high_retry:
        slot.presentations >= PHASE7_THRESHOLDS.min_presentations_per_sio_for_judgment &&
        slot.different / slot.presentations >= 0.6,
      reconstructed: RECONSTRUCTED_SIO_IDS.has(id),
    };
  }

  const avgMsByType: Record<string, number | null> = {};
  const medianMsByType: Record<string, number | null> = {};
  for (const [t, arr] of Object.entries(dwellByType)) {
    const sum = arr.reduce((a, b) => a + b, 0);
    avgMsByType[t] = arr.length ? Math.round(sum / arr.length) : null;
    medianMsByType[t] = median(arr);
  }

  return {
    total_events: events.length,
    total_sessions: sessions.size,
    total_user_handles: handles.size,
    by_response_type: byType,
    presentations: presentationsCount,
    yes_rate_overall: yesRateOverall,
    yes_rate_by_state: yesRateByState,
    per_sio: perSioOut,
    retry_trigger_rate_by_state: retryTriggerRateByState,
    retry_success_rate:
      retryAttempts > 0 ? retrySuccess / retryAttempts : null,
    response_rate: responseRate,
    dwell_summary: {
      avg_ms_by_response_type: avgMsByType,
      median_ms_by_response_type: medianMsByType,
      qualified_true: qualifiedTrue,
      qualified_false: qualifiedFalse,
    },
    data_quality_warnings: warnings,
  };
}

interface Recommendation {
  path: "7-A" | "7-B" | "7-C" | "7-D" | "collect-more" | "no-clear-signal";
  label: string;
  confidence: "high" | "moderate" | "weak";
  why: string[];
  why_not_others: Record<string, string>;
}

function recommendPath(a: Aggregates): Recommendation {
  const why: string[] = [];
  const why_not: Record<string, string> = {};

  if (a.total_events < PHASE7_THRESHOLDS.min_events_for_recommendation) {
    return {
      path: "collect-more",
      label: "Collect more beta data before choosing a Phase 7 path",
      confidence: "weak",
      why: [
        `Only ${a.total_events} events in the log; need ≥${PHASE7_THRESHOLDS.min_events_for_recommendation} to make a credible recommendation.`,
        a.total_user_handles === 0
          ? "No identified beta users yet (all sessions are anonymous or test runs)."
          : `Only ${a.total_user_handles} unique beta user(s) so far.`,
      ],
      why_not_others: {
        "7-A": "Sample too small to identify SIO-level quality patterns.",
        "7-B": "Sample too small to compare reconstructed vs verbatim performance.",
        "7-C": "Sample too small to identify systematic retrieval mismatch.",
        "7-D": "Sample too small to judge response rate vs presentation count.",
      },
    };
  }

  // 7-D first — if users aren't even clicking, no other signal is reliable.
  if (
    a.response_rate !== null &&
    a.response_rate < PHASE7_THRESHOLDS.response_rate_low
  ) {
    why.push(
      `Response rate to feedback prompt is ${(a.response_rate * 100).toFixed(0)}%, below the ${(PHASE7_THRESHOLDS.response_rate_low * 100).toFixed(0)}% threshold.`
    );
    why.push("Users are seeing insights but not engaging with the feedback prompt.");
    why_not["7-A"] = "Without click signal, per-SIO performance can't be judged.";
    why_not["7-B"] = "Without click signal, reconstructed-vs-verbatim gap can't be judged.";
    why_not["7-C"] = "Without click signal, retrieval correctness can't be judged.";
    return {
      path: "7-D",
      label: "Trust/UX work — improve engagement with the feedback surface",
      confidence: "moderate",
      why,
      why_not_others: why_not,
    };
  }

  // 7-C — retries land more often than first results suggests retrieval ordering is wrong
  if (
    a.retry_success_rate !== null &&
    a.retry_success_rate >= PHASE7_THRESHOLDS.retry_dominance &&
    (a.yes_rate_overall ?? 0) < PHASE7_THRESHOLDS.yes_rate_high
  ) {
    why.push(
      `Retries landed ${(a.retry_success_rate * 100).toFixed(0)}% of the time vs an overall yes-rate of ${(((a.yes_rate_overall ?? 0)) * 100).toFixed(0)}%.`
    );
    why.push(
      "Better SIOs were apparently in the corpus — the system just didn't pick them first."
    );
    why_not["7-A"] = "Corpus appears to contain the right SIOs; ranking is the problem.";
    why_not["7-B"] = "Reconstruction quality isn't the dominant issue.";
    why_not["7-D"] = "Users are engaging; the gap is selection, not engagement.";
    return {
      path: "7-C",
      label: "Retrieval mitigation — query/document asymmetry fix",
      confidence: "moderate",
      why,
      why_not_others: why_not,
    };
  }

  // 7-B — reconstructed SIOs underperforming verbatim ones
  const sios = Object.entries(a.per_sio).filter(
    ([, v]) => v.presentations >= PHASE7_THRESHOLDS.min_presentations_per_sio_for_judgment
  );
  const reconRates = sios.filter(([, v]) => v.reconstructed && v.yes_rate !== null).map(([, v]) => v.yes_rate!);
  const verbatimRates = sios.filter(([, v]) => !v.reconstructed && v.yes_rate !== null).map(([, v]) => v.yes_rate!);
  if (reconRates.length >= 2 && verbatimRates.length >= 1) {
    const reconAvg = reconRates.reduce((a, b) => a + b, 0) / reconRates.length;
    const verbatimAvg = verbatimRates.reduce((a, b) => a + b, 0) / verbatimRates.length;
    if (verbatimAvg - reconAvg >= 0.2) {
      why.push(
        `Verbatim SIOs land ${(verbatimAvg * 100).toFixed(0)}% vs reconstructed ${(reconAvg * 100).toFixed(0)}% — a ${((verbatimAvg - reconAvg) * 100).toFixed(0)} point gap.`
      );
      why.push("Source authenticity appears to materially affect landing.");
      why_not["7-A"] = "Gap is reconstruction-vs-verbatim, not SIO-specific quality.";
      why_not["7-C"] = "Retrieval picks reasonable SIOs; the content is the bottleneck.";
      why_not["7-D"] = "Users are engaging; the gap is content, not engagement.";
      return {
        path: "7-B",
        label: "Verbatim transcript pass — replace reconstructed excerpts",
        confidence: "moderate",
        why,
        why_not_others: why_not,
      };
    }
  }

  // 7-A — bimodal per-SIO yes-rates or flagged no-yes SIOs
  const flaggedNoYes = sios.filter(([, v]) => v.flagged_no_yes).length;
  const flaggedHighRetry = sios.filter(([, v]) => v.flagged_high_retry).length;
  if (flaggedNoYes > 0 || flaggedHighRetry > 0) {
    why.push(
      `${flaggedNoYes} SIO(s) flagged with 3+ presentations and 0 Yes.`
    );
    why.push(
      `${flaggedHighRetry} SIO(s) flagged for high "show different" rate (≥60%).`
    );
    why_not["7-B"] = "Failure is SIO-specific, not reconstruction-vs-verbatim systemic.";
    why_not["7-C"] = "Specific SIOs underperform; retrieval picks them but they don't land.";
    why_not["7-D"] = "Users are engaging; specific corpus entries are weak.";
    return {
      path: "7-A",
      label: "Corpus quality — retire/rewrite weak SIOs, fill gaps",
      confidence: "moderate",
      why,
      why_not_others: why_not,
    };
  }

  // Nothing loud enough — weak default
  return {
    path: "no-clear-signal",
    label: "No clearly dominant signal — default to 7-A (Corpus Quality) but flag as weak",
    confidence: "weak",
    why: [
      "None of the Phase 7 path criteria triggered at the thresholds.",
      "Yes-rate is in the middle range and no SIO is obviously failing.",
    ],
    why_not_others: {},
  };
}

function fmtPct(x: number | null): string {
  if (x === null) return "n/a";
  return `${(x * 100).toFixed(0)}%`;
}

function renderReport(a: Aggregates, rec: Recommendation): void {
  console.log("\n" + "=".repeat(78));
  console.log("Silhouette Feedback Analysis");
  console.log("=".repeat(78));
  console.log(`Total events:        ${a.total_events}`);
  console.log(`Total sessions:      ${a.total_sessions}`);
  console.log(`Beta user handles:   ${a.total_user_handles}`);
  console.log(`Presentations:       ${a.presentations}`);
  console.log(`Response rate:       ${fmtPct(a.response_rate)} (clicks / presentations)`);

  console.log("\n--- by response_type ---");
  for (const [t, n] of Object.entries(a.by_response_type)) {
    console.log(`  ${t.padEnd(20)} ${n}`);
  }

  console.log("\n--- yes-rate ---");
  console.log(`  overall:           ${fmtPct(a.yes_rate_overall)}`);
  for (const [state, slot] of Object.entries(a.yes_rate_by_state)) {
    console.log(`  ${state.padEnd(20)} ${fmtPct(slot.rate)} (${slot.yes}/${slot.total})`);
  }

  console.log("\n--- per-SIO ---");
  const sortedSios = Object.entries(a.per_sio).sort((a, b) => (b[1].presentations - a[1].presentations));
  for (const [id, v] of sortedSios) {
    const recon = v.reconstructed ? "[recon]" : "[verbat]";
    const flags: string[] = [];
    if (v.flagged_no_yes) flags.push("⚠ no-yes");
    if (v.flagged_high_retry) flags.push("⚠ high-retry");
    console.log(
      `  ${recon} ${id.padEnd(45)} pres=${String(v.presentations).padStart(2)} yes=${String(v.yes).padStart(2)} diff=${String(v.different).padStart(2)} yes_rate=${fmtPct(v.yes_rate)} ${flags.join(" ")}`
    );
  }

  console.log("\n--- retry behavior ---");
  for (const [state, slot] of Object.entries(a.retry_trigger_rate_by_state)) {
    console.log(`  ${state.padEnd(20)} retry_trigger=${fmtPct(slot.rate)} (${slot.retries}/${slot.presentations})`);
  }
  console.log(`  retry_success_rate (retries that became Yes): ${fmtPct(a.retry_success_rate)}`);

  console.log("\n--- dwell ---");
  console.log(`  qualified_true:    ${a.dwell_summary.qualified_true}`);
  console.log(`  qualified_false:   ${a.dwell_summary.qualified_false}`);
  for (const [t, ms] of Object.entries(a.dwell_summary.avg_ms_by_response_type)) {
    const median = a.dwell_summary.median_ms_by_response_type[t];
    console.log(`  ${t.padEnd(20)} avg=${ms ?? "n/a"}ms median=${median ?? "n/a"}ms`);
  }

  if (a.data_quality_warnings.length > 0) {
    console.log("\n--- data quality warnings ---");
    for (const w of a.data_quality_warnings) console.log(`  - ${w}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log(`Phase 7 recommendation: ${rec.path} — ${rec.label}`);
  console.log(`Confidence: ${rec.confidence}`);
  console.log("=".repeat(78));
  console.log("\nWhy:");
  for (const r of rec.why) console.log(`  - ${r}`);
  if (Object.keys(rec.why_not_others).length > 0) {
    console.log("\nWhy not the others:");
    for (const [p, reason] of Object.entries(rec.why_not_others)) {
      console.log(`  ${p}: ${reason}`);
    }
  }

  if (process.env.SILHOUETTE_JSON === "1") {
    console.log("\n--- JSON summary ---");
    console.log(JSON.stringify({ aggregates: a, recommendation: rec }, null, 2));
  }
}

function main() {
  const { events, warnings } = loadLog();
  if (warnings.length > 0 && events.length === 0) {
    console.error("Feedback log unreadable or missing.");
    for (const w of warnings) console.error(`  - ${w}`);
    process.exit(2);
  }
  const aggregates = aggregate(events, warnings);
  const recommendation = recommendPath(aggregates);
  renderReport(aggregates, recommendation);
  process.exit(0);
}

main();
