/**
 * run-sio-discovery-agent.ts — Orchestrator for the SIO Discovery Agent.
 *
 * Chains the discovery stages in an agent-like sequence, produces artifacts, and
 * STOPS for human review. It never auto-approves and never publishes to corpus/sios/.
 *
 * Modes:
 *   --user-needs      User-side discovery (Stage 0): analyze user-need coverage and emit
 *                     enriched harvesting targets. Hypothesis layer; no corpus changes.
 *   --gap-only        Gap analysis + source-candidate queries, then stop.
 *   --candidate <p>   Evaluate + novelty + verify a single candidate file.
 *   --review          Rebuild the candidate review queue.
 *   --draft-ready     Draft SIOs (to corpus/drafts/) ONLY for candidates whose
 *                     recommendation == ready_for_sio_draft. Still no approval.
 *   --full-local      (default) User-need coverage (Stage 0) → corpus gap → source queries →
 *                     score every candidate (evaluate + novelty + verify) → review queue →
 *                     list draft-ready. Does NOT auto-draft; prints the next human action.
 *
 * Run: npm run discover-sios -- [mode]
 */

import { spawnSync } from "child_process";
import { join } from "path";
import {
  CANDIDATES_DIR,
  listCandidateFiles,
  loadAllCandidates,
  ROOT,
} from "./lib/discovery";

function hr(title: string) {
  console.log("\n" + "═".repeat(78));
  console.log("▶ " + title);
  console.log("═".repeat(78));
}

function stage(script: string, args: string[] = []): number {
  const res = spawnSync("npx", ["tsx", join("scripts", script), ...args], {
    stdio: "inherit",
    cwd: ROOT,
    env: process.env,
  });
  return res.status ?? 1;
}

function candidatePaths(): string[] {
  return listCandidateFiles().map((f) => join(CANDIDATES_DIR, f));
}

function scoreEveryCandidate() {
  const paths = candidatePaths();
  if (paths.length === 0) {
    console.log("\n(no candidates in corpus/candidates/ — add one from candidate_template.yaml)");
    return;
  }
  for (const p of paths) {
    hr(`Evaluate (Human Resonance): ${p.split("/").pop()}`);
    stage("evaluate-sio-candidate.ts", [p]);
    hr(`Novelty / dedup: ${p.split("/").pop()}`);
    stage("score-candidate-novelty.ts", [p]);
    hr(`Verify source/media/transcript: ${p.split("/").pop()}`);
    stage("verify-candidate-source.ts", [p]);
  }
}

function listDraftReady(): string[] {
  return loadAllCandidates()
    .filter(
      ({ candidate }) =>
        candidate.recommendation === "ready_for_sio_draft" ||
        candidate.candidate_status === "ready_for_sio_draft"
    )
    .map(({ path }) => path);
}

function nextActions() {
  hr("Next actions (HUMAN review required)");
  const ready = listDraftReady();
  if (ready.length > 0) {
    console.log(`\n${ready.length} candidate(s) are READY FOR SIO DRAFT:`);
    for (const p of ready) console.log(`   • ${p}`);
    console.log(`\n→ Run:  npm run discover-sios -- --draft-ready`);
    console.log(`  (produces prototype_only drafts in corpus/drafts/ — still needs your approval)`);
  } else {
    console.log(`\nNo candidate is draft-ready yet. Open the review queue and address blockers:`);
    console.log(`   • ai/guides/candidate_review_queue.md`);
  }
  console.log(`\nReminder: nothing reaches corpus/sios/ or human_review_status: approved without you.`);
}

function main() {
  const mode = process.argv[2] ?? "--full-local";

  console.log("SIO Discovery Agent — local orchestrator");
  console.log(`mode: ${mode}`);
  console.log("This agent researches, scores, and drafts. It NEVER approves or publishes.");

  switch (mode) {
    case "--user-needs": {
      hr("Stage 0 — User-need coverage (user-side discovery)");
      // Pass through any extra flags (e.g. --static, --json) after the mode.
      stage("analyze-user-need-coverage.ts", process.argv.slice(3));
      console.log("\n→ Reports: ai/guides/user_need_coverage_report.md, ai/guides/user_need_harvesting_targets.md");
      console.log("  (Hypothesis layer — these enrich, but do not replace, the corpus gap reports.)");
      break;
    }
    case "--gap-only": {
      hr("Stage 1 — Gap analysis");
      stage("detect-corpus-gaps.ts");
      hr("Stage 2 — Source-candidate queries");
      stage("find-source-candidates.ts");
      console.log("\n→ Reports: ai/guides/corpus_gap_detection_report.md, ai/guides/source_candidate_discovery_report.md");
      break;
    }
    case "--candidate": {
      const p = process.argv[3];
      if (!p) {
        console.error("Usage: npm run discover-sios -- --candidate <path-to-candidate.yaml>");
        process.exit(1);
      }
      hr(`Evaluate (Human Resonance): ${p}`);
      stage("evaluate-sio-candidate.ts", [p]);
      hr(`Novelty / dedup: ${p}`);
      stage("score-candidate-novelty.ts", [p]);
      hr(`Verify source/media/transcript: ${p}`);
      stage("verify-candidate-source.ts", [p]);
      nextActions();
      break;
    }
    case "--review": {
      hr("Candidate review queue");
      stage("review-candidates.ts");
      break;
    }
    case "--draft-ready": {
      const ready = listDraftReady();
      if (ready.length === 0) {
        console.log("\nNo candidate has recommendation/status ready_for_sio_draft. Nothing to draft.");
        console.log("Run the full sweep first:  npm run discover-sios -- --full-local");
        break;
      }
      for (const p of ready) {
        hr(`Draft SIO (→ corpus/drafts/): ${p.split("/").pop()}`);
        stage("draft-sio-from-candidate.ts", [p]);
      }
      console.log("\n★ Drafts written to corpus/drafts/ as prototype_only. A HUMAN must verify the");
      console.log("  verbatim quote + timestamp, set transcript_verified/approved, and move the file");
      console.log("  to corpus/sios/. The agent will not do this.");
      break;
    }
    case "--full-local":
    default: {
      hr("Stage 0 — User-need coverage (user-side discovery)");
      // Enriches harvesting with realistic user situations BEFORE corpus-cell gap analysis.
      // Non-fatal: a probe failure (e.g. no embeddings key) still produces static coverage.
      stage("analyze-user-need-coverage.ts");
      hr("Stage 1 — Gap analysis");
      stage("detect-corpus-gaps.ts");
      hr("Stage 2 — Source-candidate queries");
      stage("find-source-candidates.ts");
      hr("Stage 3 — Score every candidate (evaluate → novelty → verify)");
      scoreEveryCandidate();
      hr("Stage 4 — Review queue");
      stage("review-candidates.ts");
      nextActions();
      break;
    }
  }
}

main();
