/**
 * test-magnet-risk.ts — Layer A: the magnet-risk promotion gate.
 *
 * The PRIMARY magnet safeguard. Runs the shared diverse probe bank
 * (scripts/lib/magnet-probes.ts) and measures each SIO's WIN-RATE per state — the only
 * metric that reliably surfaces a query-magnet (centrality does not; see
 * retrieval_magnet_diagnostic.md). Uses the real scoredSearch (default profile, no hint).
 *
 * Modes:
 *   npm run test-magnet-risk
 *       Report served-corpus dominance. Existing default-profile dominators (Newport/Huberman
 *       under no-hint) are WARNED but allowed (intended state defaults, mitigated by the hint
 *       layer in production). Exits 0.
 *   npm run test-magnet-risk -- --candidate corpus/candidates/<id>.yaml
 *       PROMOTION GATE. Injects the candidate into its target state and FAILS (exit 1) if the
 *       candidate wins > threshold of that state's diverse probes — i.e. it would be a magnet.
 *       This is how McKeown is blocked (6/10 → fail).
 */

import "dotenv/config";
import { Document } from "@langchain/core/documents";
import { loadSIODocuments } from "../src/rag/sioLoader";
import { getOrCreateVectorStore, scoredSearch } from "../src/rag/vectorStore";
import type { MvpState } from "../src/rag/retrievalConfig";
import { MAGNET_PROBES, ALL_STATES } from "./lib/magnet-probes";
import { loadCandidateFromPath, str } from "./lib/discovery";

const MAGNET_WIN_RATE = 0.5; // win > 50% of a state's diverse probes = magnet

async function winRates(state: MvpState): Promise<Record<string, number>> {
  const probes = MAGNET_PROBES[state];
  const wins: Record<string, number> = {};
  for (const q of probes) {
    const res = await scoredSearch({ query: q, state, k: 3, intakeHint: null });
    if (!res.candidates.length) continue;
    const w = String(res.candidates[0].doc.metadata.insight_id);
    wins[w] = (wins[w] ?? 0) + 1;
  }
  return wins;
}

function hr(s: string) { console.log("\n" + "=".repeat(70) + "\n" + s + "\n" + "=".repeat(70)); }

async function main() {
  const args = process.argv.slice(2);
  const ci = args.indexOf("--candidate");
  const candidatePath = ci !== -1 ? args[ci + 1] : null;

  const docs = await loadSIODocuments();
  const store = await getOrCreateVectorStore(docs);

  // ── Gate mode: test a single candidate before promotion ──
  if (candidatePath) {
    const c = loadCandidateFromPath(candidatePath);
    const id = str(c.candidate_id);
    const state = str(c.target_state) as MvpState;
    if (!ALL_STATES.includes(state)) {
      console.error(`Candidate target_state "${state}" is not an MVP state.`);
      process.exit(2);
    }
    const pageContent = [str(c.key_claim), str(c.candidate_moment_summary), str(c.transcript_excerpt)]
      .filter(Boolean).join("\n\n");
    await store.addDocuments([new Document({
      pageContent,
      metadata: {
        insight_id: id, primary_state_tag: state, secondary_state_tags: [],
        insight_type: str(c.proposed_insight_type), voice_register: str(c.proposed_voice_register),
        intensity_level: str(c.proposed_intensity_level), credibility_tier: "tier-2",
        tagger_confidence: "high", direction_collapse_variant: "",
      },
    })]);

    const probes = MAGNET_PROBES[state];
    const wins = await winRates(state);
    const candWins = wins[id] ?? 0;
    const rate = candWins / probes.length;

    hr(`MAGNET-RISK GATE — ${id} (state: ${state})`);
    console.log(`Candidate win-rate: ${candWins}/${probes.length} (${Math.round(rate * 100)}%)  ·  magnet threshold > ${Math.round(MAGNET_WIN_RATE * 100)}%`);
    console.log("Win distribution with candidate injected:");
    for (const [wid, n] of Object.entries(wins).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${wid === id ? "→ " : "  "}${wid}: ${n}/${probes.length}${wid === id ? "  (candidate)" : ""}`);
    }
    if (rate > MAGNET_WIN_RATE) {
      console.log(`\n✗ FAIL — magnet risk. ${id} dominates ${state} (${Math.round(rate * 100)}% of diverse probes).`);
      console.log(`  DO NOT serve. Keep candidate_status: held_for_retrieval_risk and document why.`);
      console.log(`  (It is broadly/generically relevant rather than specifically matched — it will`);
      console.log(`   displace more specific SIOs for users with different tones/variants in this state.)`);
      process.exit(1);
    }
    console.log(`\n✓ PASS — no magnet risk. ${id} wins a reasonable share; safe to promote on this signal.`);
    process.exit(0);
  }

  // ── Report mode: served-corpus dominance ──
  hr("MAGNET-RISK REPORT — served corpus (no-hint default path)");
  let anyWarn = false;
  for (const state of ALL_STATES) {
    const probes = MAGNET_PROBES[state];
    const wins = await winRates(state);
    const top = Object.entries(wins).sort((a, b) => b[1] - a[1]);
    const magnets = top.filter(([, n]) => n / probes.length > MAGNET_WIN_RATE);
    console.log(`\n${state}:`);
    for (const [id, n] of top) console.log(`  ${id}: ${n}/${probes.length}${n / probes.length > MAGNET_WIN_RATE ? "  ⚠️ dominant" : ""}`);
    if (magnets.length) {
      anyWarn = true;
      console.log(`  ⚠️ ${magnets.map(([id]) => id).join(", ")} dominate(s) under the no-hint default path.`);
      console.log(`     This is the state default (intended); the intake-hint layer diversifies tonal`);
      console.log(`     queries in production (calibration 27/27). Monitored, not blocked.`);
    }
  }
  console.log(`\n${anyWarn ? "Note: default-profile dominators flagged above (monitored, see retrieval_magnet_diagnostic.md)." : "No dominators."}`);
  console.log("Served-corpus report is informational; exits 0. Use --candidate <path> to GATE a promotion.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
