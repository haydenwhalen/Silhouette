/**
 * diagnose-retrieval-magnets.ts — Phase 1 magnet diagnostic.
 *
 * Measures, per MVP state, whether any single SIO dominates retrieval ("magnet" behavior):
 *   - win-rate: share of that state's diverse probe queries an SIO wins (candidates[0])
 *   - winner margin: avg final-score gap between #1 and #2
 *   - top-3 diversity: are the top-3 distinct SIOs (no near-duplicate collapse)?
 *   - centrality: cosine of each SIO's embedding to its STATE CENTROID (a proxy for
 *     "generic / broadly-relevant" — magnets tend to sit near the centroid).
 *
 * Uses the shared probe bank (scripts/lib/magnet-probes.ts) and the REAL scoring path
 * (scoredSearch with the per-state default profile, no intake hint — isolating semantic +
 * default dominance, no LLM needed). Embeddings (for centrality) are read from the store.
 *
 *   npm run diagnose-magnets                 # served corpus
 *   npm run diagnose-magnets -- --with-candidate corpus/candidates/cand-mckeown-floor-disengagement.yaml
 *
 * Writes ai/guides/retrieval_magnet_diagnostic.md (data section) + prints a summary.
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { join } from "path";
import { Document } from "@langchain/core/documents";
import { loadSIODocuments } from "../src/rag/sioLoader";
import { getOrCreateVectorStore, scoredSearch } from "../src/rag/vectorStore";
import type { MvpState } from "../src/rag/retrievalConfig";
import { MAGNET_PROBES, ALL_STATES } from "./lib/magnet-probes";
import { GUIDES_DIR, loadCandidateFromPath, str } from "./lib/discovery";

const REPORT_PATH = join(GUIDES_DIR, "retrieval_magnet_diagnostic_data.md");
const MAGNET_WIN_RATE = 0.5; // an SIO winning > 50% of its state's diverse probes = magnet flag

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

interface MemVec { content: string; embedding: number[]; metadata: Record<string, unknown>; }

function computeCentrality(memVecs: MemVec[]): Map<string, number> {
  // Per-state centroid (mean of L2-normalized embeddings), then centrality = cosine(emb, centroid).
  const byState: Record<string, MemVec[]> = {};
  for (const mv of memVecs) {
    const s = String(mv.metadata.primary_state_tag ?? "");
    (byState[s] ??= []).push(mv);
  }
  const centrality = new Map<string, number>();
  for (const [, vecs] of Object.entries(byState)) {
    if (vecs.length < 2) { for (const v of vecs) centrality.set(String(v.metadata.insight_id), 0); continue; }
    const dim = vecs[0].embedding.length;
    const centroid = new Array(dim).fill(0);
    for (const v of vecs) { const nv = normalize(v.embedding); for (let i = 0; i < dim; i++) centroid[i] += nv[i] / vecs.length; }
    for (const v of vecs) centrality.set(String(v.metadata.insight_id), cosine(v.embedding, centroid));
  }
  return centrality;
}

async function main() {
  const args = process.argv.slice(2);
  const ci = args.indexOf("--with-candidate");
  const candidatePath = ci !== -1 ? args[ci + 1] : null;

  const docs = await loadSIODocuments();
  const store = await getOrCreateVectorStore(docs);

  let injectedId: string | null = null;
  let injectedState: MvpState | null = null;
  if (candidatePath) {
    const c = loadCandidateFromPath(candidatePath);
    injectedId = str(c.candidate_id);
    injectedState = str(c.target_state) as MvpState;
    const pageContent = [str(c.key_claim), str(c.candidate_moment_summary), str(c.transcript_excerpt)].filter(Boolean).join("\n\n");
    await store.addDocuments([new Document({
      pageContent,
      metadata: {
        insight_id: injectedId,
        primary_state_tag: injectedState,
        secondary_state_tags: [],
        insight_type: str(c.proposed_insight_type),
        voice_register: str(c.proposed_voice_register),
        intensity_level: str(c.proposed_intensity_level),
        credibility_tier: "tier-2",
        tagger_confidence: "high",
        direction_collapse_variant: "",
      },
    })]);
    console.error(`[diagnose] injected held candidate ${injectedId} into state ${injectedState}`);
  }

  const memVecs = ((store as unknown as { memoryVectors?: MemVec[] }).memoryVectors) ?? [];
  const centrality = computeCentrality(memVecs);

  interface StateReport { state: string; probes: number; wins: Record<string, number>; avgMargin: number; top3DistinctRate: number; magnets: string[]; }
  const stateReports: StateReport[] = [];

  for (const state of ALL_STATES) {
    const probes = MAGNET_PROBES[state];
    const wins: Record<string, number> = {};
    let marginSum = 0, top3Distinct = 0;
    for (const q of probes) {
      const res = await scoredSearch({ query: q, state, k: 3, intakeHint: null });
      const c = res.candidates;
      if (!c.length) continue;
      const winner = String(c[0].doc.metadata.insight_id);
      wins[winner] = (wins[winner] ?? 0) + 1;
      if (c.length >= 2) marginSum += c[0].final_score - c[1].final_score;
      const top3 = new Set(c.slice(0, 3).map((x) => String(x.doc.metadata.insight_id)));
      if (top3.size === Math.min(3, c.length)) top3Distinct++;
    }
    const magnets = Object.entries(wins).filter(([, n]) => n / probes.length > MAGNET_WIN_RATE).map(([id]) => id);
    stateReports.push({ state, probes: probes.length, wins, avgMargin: marginSum / probes.length, top3DistinctRate: top3Distinct / probes.length, magnets });
  }

  // ── console + markdown ──
  const L: string[] = [];
  L.push(`# Retrieval Magnet Diagnostic (data)`);
  L.push("");
  L.push(`_Generated by \`scripts/diagnose-retrieval-magnets.ts\` on ${new Date().toISOString().slice(0, 10)}._`);
  L.push(`_Scoring path: scoredSearch(state, default profile, no intake hint). ${injectedId ? `Injected held candidate: \`${injectedId}\` into ${injectedState}.` : "Served corpus only."}_`);
  L.push("");
  L.push(`Magnet flag: an SIO winning > ${Math.round(MAGNET_WIN_RATE * 100)}% of its state's ${MAGNET_PROBES["inaction-loop"].length} diverse probes.`);
  L.push("");
  for (const sr of stateReports) {
    L.push(`## ${sr.state}`);
    L.push(`- probes: ${sr.probes} · avg winner margin (#1−#2): ${sr.avgMargin.toFixed(3)} · top-3 all-distinct: ${Math.round(sr.top3DistinctRate * 100)}%`);
    L.push(`- ${sr.magnets.length ? `⚠️ MAGNET(S): ${sr.magnets.join(", ")}` : "no magnet (wins spread acceptably)"}`);
    L.push(`- win counts:`);
    for (const [id, n] of Object.entries(sr.wins).sort((a, b) => b[1] - a[1])) {
      const cen = centrality.get(id);
      L.push(`  - ${id}: ${n}/${sr.probes} wins${cen !== undefined ? ` · centrality ${cen.toFixed(3)}` : ""}${sr.magnets.includes(id) ? "  ⚠️" : ""}`);
    }
    L.push("");
  }
  L.push(`## Centrality (cosine to state centroid; higher = more generic/central)`);
  const byStateCen: Record<string, Array<[string, number]>> = {};
  for (const [id, cen] of centrality.entries()) {
    const mv = memVecs.find((m) => String(m.metadata.insight_id) === id);
    const s = String(mv?.metadata.primary_state_tag ?? "?");
    (byStateCen[s] ??= []).push([id, cen]);
  }
  for (const [s, arr] of Object.entries(byStateCen)) {
    L.push(`- **${s}**: ${arr.sort((a, b) => b[1] - a[1]).map(([id, c]) => `${id} ${c.toFixed(3)}`).join(" · ")}`);
  }
  L.push("");

  const out = L.join("\n");
  writeFileSync(REPORT_PATH, out + "\n", "utf-8");
  console.log(out);
  console.error(`\n[diagnose] wrote ${REPORT_PATH}`);
  for (const sr of stateReports) {
    console.error(`[diagnose] ${sr.state}: magnets=${sr.magnets.join(",") || "none"} top3distinct=${Math.round(sr.top3DistinctRate * 100)}% margin=${sr.avgMargin.toFixed(3)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
