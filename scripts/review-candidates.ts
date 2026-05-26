/**
 * review-candidates.ts — SIO Discovery Agent: Review Queue.
 *
 * DETERMINISTIC. No LLM, no network.
 *
 * Loads all candidates via loadAllCandidates(), ranks by overall_candidate_score (desc; nulls last).
 * For each candidate, shows: candidate_id, candidate_status, target_state, target_gap,
 * speaker/source, overall_candidate_score, human_resonance_score, novelty_rating,
 * media_verification_status, transcript_verification_status, recommendation, and BLOCKERS
 * before drafting.
 *
 * Output: console table + ai/guides/candidate_review_queue.md
 * Groups by recommended action: ready_for_sio_draft / promising / needs work / reject.
 *
 * Run: npx tsx scripts/review-candidates.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import {
  GUIDES_DIR,
  SCORE_THRESHOLDS,
  ANTI_GENERIC_FLOOR,
  ANTI_GENERIC_DIMENSIONS,
  loadAllCandidates,
  ensureDir,
  str,
  type Candidate,
  type Recommendation,
} from "./lib/discovery";

const REPORT_PATH = join(GUIDES_DIR, "candidate_review_queue.md");

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReviewRow {
  file: string;
  candidate_id: string;
  candidate_status: string;
  target_state: string;
  target_gap: string;
  speaker: string;
  source_title: string;
  overall_candidate_score: number | null;
  human_resonance_score: number | null;
  novelty_rating: string;
  media_verification_status: string;
  transcript_verification_status: string;
  recommendation: string;
  blockers: string[];
  action_group: "ready_for_sio_draft" | "promising" | "needs_work" | "reject";
}

// ── Compute blockers and action group ────────────────────────────────────────
function computeBlockers(c: Candidate): string[] {
  const blockers: string[] = [];

  // No overall score
  if (c.overall_candidate_score === null || c.overall_candidate_score === undefined) {
    blockers.push("No overall_candidate_score — run evaluate script first");
  }

  // Anti-generic gate
  const rd = c.resonance_breakdown;
  if (rd?.scores) {
    for (const dim of ANTI_GENERIC_DIMENSIONS) {
      const score = rd.scores[dim];
      if (typeof score === "number" && score <= ANTI_GENERIC_FLOOR) {
        blockers.push(`Anti-generic gate triggered: ${dim}=${score} (≤${ANTI_GENERIC_FLOOR}) → reject`);
      }
    }
  }

  // Novelty duplicate
  if (c.novelty_rating === "duplicate") {
    blockers.push("novelty_rating=duplicate — overlaps an existing SIO; must differentiate or reject");
  }

  // Transcript needs review
  const tvs = str(c.transcript_verification_status);
  if (tvs === "needs_review" || tvs === "") {
    blockers.push(`transcript_verification_status="${tvs || "(unset)"}" — transcript must be verified or marked not_applicable before drafting`);
  }

  // Missing source_url
  if (!str(c.source_url)) {
    blockers.push("source_url is blank — cannot establish official source origin");
  }

  // Media verification issues for video sources
  const mvs = str(c.media_verification_status);
  if (mvs === "unofficial") {
    blockers.push("media_verification_status=unofficial — only official sources may be drafted");
  }

  // Score too low
  const overall = typeof c.overall_candidate_score === "number" ? c.overall_candidate_score : null;
  if (overall !== null && overall < SCORE_THRESHOLDS.reject_below) {
    blockers.push(`overall_candidate_score=${overall} < reject threshold (${SCORE_THRESHOLDS.reject_below}) → reject`);
  }

  // Quote type / verbatim honesty check
  const qt = str(c.quote_type);
  if (qt === "verbatim" && tvs !== "verified") {
    blockers.push(`quote_type=verbatim but transcript_verification_status="${tvs}" — honesty violation; downgrade quote_type or verify transcript`);
  }

  // Already drafted or rejected
  if (c.candidate_status === "rejected") {
    blockers.push("candidate_status=rejected");
  }
  if (c.candidate_status === "archived") {
    blockers.push("candidate_status=archived");
  }

  return blockers;
}

function computeActionGroup(c: Candidate, blockers: string[]): ReviewRow["action_group"] {
  const rec = str(c.recommendation) as Recommendation | "";
  const status = str(c.candidate_status);

  if (status === "rejected" || status === "archived") return "reject";

  // Anti-generic hard reject
  const rd = c.resonance_breakdown;
  if (rd?.scores) {
    for (const dim of ANTI_GENERIC_DIMENSIONS) {
      const score = rd.scores[dim];
      if (typeof score === "number" && score <= ANTI_GENERIC_FLOOR) return "reject";
    }
  }

  // Novelty duplicate → reject
  if (c.novelty_rating === "duplicate") return "reject";

  // Official recommendation present → use it
  if (rec === "ready_for_sio_draft" || status === "ready_for_sio_draft") return "ready_for_sio_draft";
  if (rec === "reject") return "reject";
  if (rec === "promising") return "promising";

  // No score yet or score-based routing
  const overall = typeof c.overall_candidate_score === "number" ? c.overall_candidate_score : null;
  if (overall === null) return "needs_work";
  if (overall >= SCORE_THRESHOLDS.draft_ready_at) {
    // Has score but blocker(s) remain
    if (blockers.length > 0) return "needs_work";
    return "ready_for_sio_draft";
  }
  if (overall >= SCORE_THRESHOLDS.promising_at) return "promising";
  if (overall < SCORE_THRESHOLDS.reject_below) return "reject";

  return "needs_work";
}

// ── Build review rows ─────────────────────────────────────────────────────────
function buildRows(entries: ReturnType<typeof loadAllCandidates>): ReviewRow[] {
  const rows: ReviewRow[] = entries.map(({ file, candidate: c }) => {
    const blockers = computeBlockers(c);
    const action_group = computeActionGroup(c, blockers);
    return {
      file,
      candidate_id: str(c.candidate_id) || file,
      candidate_status: str(c.candidate_status) || "(unset)",
      target_state: str(c.target_state) || "(unset)",
      target_gap: str(c.target_gap) || "(unset)",
      speaker: str(c.speaker) || "(unset)",
      source_title: str(c.source_title) || "(unset)",
      overall_candidate_score: typeof c.overall_candidate_score === "number" ? c.overall_candidate_score : null,
      human_resonance_score: typeof c.human_resonance_score === "number" ? c.human_resonance_score : null,
      novelty_rating: str(c.novelty_rating) || "(unset)",
      media_verification_status: str(c.media_verification_status) || "(unset)",
      transcript_verification_status: str(c.transcript_verification_status) || "(unset)",
      recommendation: str(c.recommendation) || "(unset)",
      blockers,
      action_group,
    };
  });

  // Sort: by score desc, nulls last; within group, alphabetical by candidate_id
  rows.sort((a, b) => {
    if (a.overall_candidate_score === null && b.overall_candidate_score === null) return a.candidate_id.localeCompare(b.candidate_id);
    if (a.overall_candidate_score === null) return 1;
    if (b.overall_candidate_score === null) return -1;
    return b.overall_candidate_score - a.overall_candidate_score;
  });

  return rows;
}

// ── Console output ────────────────────────────────────────────────────────────
function printConsoleReport(rows: ReviewRow[]): void {
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  SILHOUETTE — Candidate Review Queue                             ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");
  console.log(`Total candidates: ${rows.length}\n`);

  const groups: Array<{ group: ReviewRow["action_group"]; label: string; icon: string }> = [
    { group: "ready_for_sio_draft", label: "READY FOR SIO DRAFT",  icon: "✓" },
    { group: "promising",           label: "PROMISING",             icon: "◎" },
    { group: "needs_work",          label: "NEEDS WORK",            icon: "⚠" },
    { group: "reject",              label: "REJECT",                icon: "✗" },
  ];

  for (const { group, label, icon } of groups) {
    const inGroup = rows.filter((r) => r.action_group === group);
    if (inGroup.length === 0) continue;

    console.log(`${"─".repeat(68)}`);
    console.log(`${icon}  ${label} (${inGroup.length})`);
    console.log();

    for (const r of inGroup) {
      const score = r.overall_candidate_score !== null ? `${r.overall_candidate_score}` : "—";
      const resonance = r.human_resonance_score !== null ? `${r.human_resonance_score}` : "—";

      console.log(`  ${r.candidate_id}`);
      console.log(`    Status:      ${r.candidate_status}`);
      console.log(`    Target:      ${r.target_state} / ${r.target_gap}`);
      console.log(`    Speaker:     ${r.speaker}`);
      console.log(`    Score:       overall=${score}  resonance=${resonance}  novelty=${r.novelty_rating}`);
      console.log(`    Media:       ${r.media_verification_status}`);
      console.log(`    Transcript:  ${r.transcript_verification_status}`);
      console.log(`    Recommend:   ${r.recommendation}`);
      if (r.blockers.length > 0) {
        console.log(`    BLOCKERS:`);
        for (const b of r.blockers) {
          console.log(`      · ${b}`);
        }
      } else {
        console.log(`    BLOCKERS:    (none)`);
      }
      console.log();
    }
  }
}

// ── Markdown report ───────────────────────────────────────────────────────────
function buildMarkdown(rows: ReviewRow[]): string {
  const now = new Date().toISOString();
  const L: string[] = [];

  L.push("# Candidate Review Queue");
  L.push("");
  L.push(`_Generated by \`scripts/review-candidates.ts\` on ${now.slice(0, 10)}. Deterministic — no LLM, no network._`);
  L.push("");
  L.push(`**Total candidates:** ${rows.length}`);
  L.push("");

  const groups: Array<{ group: ReviewRow["action_group"]; label: string; description: string }> = [
    {
      group: "ready_for_sio_draft",
      label: "Ready for SIO Draft",
      description: "All gates passed. Run `draft-sio-from-candidate` to generate a prototype_only draft.",
    },
    {
      group: "promising",
      label: "Promising",
      description: "Score is in the 65–74 range or recommendation=promising. Needs stronger source evidence or transcript verification to advance.",
    },
    {
      group: "needs_work",
      label: "Needs Work",
      description: "No overall score yet, or blockers prevent drafting. See blocker list for each.",
    },
    {
      group: "reject",
      label: "Reject",
      description: "Anti-generic gate triggered, duplicate novelty, score < 45, or explicitly rejected.",
    },
  ];

  for (const { group, label, description } of groups) {
    const inGroup = rows.filter((r) => r.action_group === group);
    if (inGroup.length === 0) continue;

    L.push(`## ${label} (${inGroup.length})`);
    L.push("");
    L.push(`_${description}_`);
    L.push("");
    L.push("| candidate_id | status | target_state | speaker | overall | resonance | novelty | media | transcript | recommendation |");
    L.push("|---|---|---|---|---|---|---|---|---|---|");

    for (const r of inGroup) {
      const score     = r.overall_candidate_score !== null ? String(r.overall_candidate_score) : "—";
      const resonance = r.human_resonance_score   !== null ? String(r.human_resonance_score)   : "—";
      L.push(
        `| ${r.candidate_id} | ${r.candidate_status} | ${r.target_state} | ${r.speaker} | ${score} | ${resonance} | ${r.novelty_rating} | ${r.media_verification_status} | ${r.transcript_verification_status} | ${r.recommendation} |`
      );
    }

    L.push("");
    L.push("### Blocker details");
    L.push("");
    for (const r of inGroup) {
      L.push(`**${r.candidate_id}**`);
      L.push(`- Target gap: ${r.target_gap}`);
      L.push(`- Source: ${r.source_title}`);
      if (r.blockers.length === 0) {
        L.push("- Blockers: (none)");
      } else {
        for (const b of r.blockers) {
          L.push(`- BLOCKER: ${b}`);
        }
      }
      L.push("");
    }
  }

  L.push("---");
  L.push("_End of queue. This file is auto-generated; do not edit manually._");
  L.push("");
  return L.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main(): void {
  const entries = loadAllCandidates();

  if (entries.length === 0) {
    console.log("[review-candidates] No candidates found in corpus/candidates/");
    console.log("[review-candidates] Add .yaml candidate files to generate a review queue.");
    process.exit(0);
  }

  const rows = buildRows(entries);
  printConsoleReport(rows);

  ensureDir(GUIDES_DIR);
  writeFileSync(REPORT_PATH, buildMarkdown(rows), "utf-8");
  console.log(`[review-candidates] Wrote report → ${REPORT_PATH}`);

  const byGroup = {
    ready: rows.filter((r) => r.action_group === "ready_for_sio_draft").length,
    promising: rows.filter((r) => r.action_group === "promising").length,
    needs_work: rows.filter((r) => r.action_group === "needs_work").length,
    reject: rows.filter((r) => r.action_group === "reject").length,
  };
  console.log(`[review-candidates] ready=${byGroup.ready} promising=${byGroup.promising} needs_work=${byGroup.needs_work} reject=${byGroup.reject}`);
}

main();
