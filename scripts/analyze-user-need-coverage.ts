/**
 * analyze-user-need-coverage.ts — User-Side Discovery Layer (Stage 0).
 *
 * Answers the user-centered question the corpus gap analyst cannot:
 *   "Which real user situations does the corpus fail to serve — and what must we harvest?"
 *
 * It loads hypothesis user-need patterns (corpus/user_need_patterns.yaml) and realistic query
 * patterns (corpus/user_query_patterns.yaml), then measures coverage two ways:
 *   1. STATIC  — metadata match of served SIOs to each need (state / insight_type /
 *                voice_register / EXCLUDED registers / intensity). Always runs, no network.
 *   2. PROBE   — runs the REAL retrieval engine (scoredSearch, default profile, no hint —
 *                same path as test-magnet-risk) over each query and checks whether the top
 *                result lands, mismatches the register, serves an EXCLUDED register, returns
 *                nothing, or reveals a magnet. Degrades cleanly if embeddings are unavailable.
 *
 * Outputs:
 *   - console summary
 *   - ai/guides/user_need_coverage_report.md
 *   - ai/guides/user_need_harvesting_targets.md   (enriched, user-voiced briefs → Source Scout)
 *   - JSON to stdout with --json
 *
 * HONESTY: needs are hypotheses, queries are author-written (not real user logs). This tool
 * NEVER mutates the corpus, never approves anything, never weakens a verification gate, and
 * never claims a need is "observed". It only reports.
 *
 * Run: npm run analyze-user-needs            (full: static + retrieval probe if key present)
 *      npm run analyze-user-needs -- --static (force static-only; no network)
 *      npm run analyze-user-needs -- --json   (also print JSON summary to stdout)
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";
import {
  GUIDES_DIR,
  ROOT,
  MVP_STATES,
  loadSioMetas,
  str,
  ensureDir,
  type SioMeta,
  type MvpState,
} from "./lib/discovery";

const NEEDS_PATH = join(ROOT, "corpus", "user_need_patterns.yaml");
const QUERIES_PATH = join(ROOT, "corpus", "user_query_patterns.yaml");
const REPORT_PATH = join(GUIDES_DIR, "user_need_coverage_report.md");
const TARGETS_PATH = join(GUIDES_DIR, "user_need_harvesting_targets.md");
// Machine-readable twin of the targets doc — read by find-source-candidates.ts so the
// user-need-driven targets appear alongside corpus-cell gaps in ONE place (single analysis).
const TARGETS_JSON_PATH = join(GUIDES_DIR, "user_need_harvesting_targets.json");

const MAGNET_WIN_RATE = 0.5; // same threshold as test-magnet-risk.ts

type Strength = "unknown" | "none" | "weak" | "partial" | "strong";
// verdict of the production-faithful (HINTED) probe for one query:
//   lands                    — top-1 is acceptable register + (≈) expected form
//   buried                   — a register-appropriate SIO is in top-3 but not #1 (retrieval ranking issue)
//   wrong_register           — top-1 is a non-excluded but non-matching register; nothing better in top-3
//   excluded_register_served — top-1 is an EXCLUDED register (would mismatch/harm the user)
//   nothing                  — nothing above threshold
type Verdict = "lands" | "buried" | "wrong_register" | "excluded_register_served" | "nothing";
// Why a need is under-served — drives WHAT to do about it (methodology §2):
//   well_served   — production-faithful probe lands; no action
//   corpus_gap    — no register-appropriate SIO exists at all → HARVEST
//   retrieval_gap — a register-appropriate SIO exists but isn't delivered even with the hint
//                   → fix retrieval/discoverability (and/or harvest a stronger exemplar)
type GapKind = "well_served" | "corpus_gap" | "retrieval_gap";

interface IntakeHint {
  insight_type?: string | null;
  voice_register?: string | null;
  direction_collapse_variant?: string | null;
}

// The slice of the real retrieval engine (src/rag/vectorStore.ts scoredSearch) this tool uses.
type ProbeFn = (opts: {
  query: string;
  state?: MvpState;
  k?: number;
  intakeHint?: IntakeHint | null;
}) => Promise<{
  candidates: Array<{ doc: { metadata: Record<string, unknown> }; final_score: number; label: string }>;
}>;

interface TopDoc {
  id: string;
  register: string;
  type: string;
  state: string;
  score: number;
  label: string;
}

interface NeedPattern {
  need_id: string;
  state: string;
  variant: string | null;
  sub_state: string;
  status: string;
  source_provenance: string[];
  situational_context: string[];
  emotional_texture: string[];
  hidden_beliefs: string[];
  user_question_under_it: string;
  recommended_insight_type: string[];
  recommended_voice_register: string;
  excluded_voice_registers: string[];
  resonance_need: string;
  recommended_intensity: string;
  disambiguation_neighbors: string[];
  anti_pattern_notes: string;
  missing_source_profile: string;
  harvesting_priority: number;
}

interface QueryPattern {
  query_id: string;
  need_id: string;
  text: string;
  source: string;
  expected_state: string;
  expected_resonance: string;
  expected_insight_type: string;
  excluded_voice_registers: string[];
  notes: string;
}

interface QueryResult {
  query: QueryPattern;
  ran: boolean;
  verdict: Verdict; // from the HINTED (production-faithful) probe
  hinted_top: TopDoc | null;
  hinted_top3: TopDoc[];
  nohint_top_id: string; // for magnet tally (default-profile path)
  detail: string;
}

interface NeedCoverage {
  need: NeedPattern;
  static_covered_sio_ids: string[];
  static_strength: Strength;
  static_note: string;
  static_has_register_match: boolean; // a non-excluded SIO in the recommended register exists
  probe_results: QueryResult[];
  hinted_strength: Strength | null; // production-faithful coverage; null when probe didn't run
  coverage_strength: Strength; // final (hinted probe preferred when available)
  gap_kind: GapKind;
  coverage_evidence: string;
  computed_priority: number;
}

// ── small helpers ─────────────────────────────────────────────────────────────
function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (v === null || v === undefined || v === "") return [];
  return [String(v)];
}
function num(v: unknown, d = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
}
function loadList<T>(path: string, key: string): T[] {
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  const parsed = parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
  const list = parsed?.[key];
  return Array.isArray(list) ? (list as T[]) : [];
}

function normalizeNeed(raw: Record<string, unknown>): NeedPattern {
  return {
    need_id: str(raw.need_id),
    state: str(raw.state),
    variant: raw.variant == null ? null : str(raw.variant),
    sub_state: str(raw.sub_state),
    status: str(raw.status) || "hypothesis",
    source_provenance: arr(raw.source_provenance),
    situational_context: arr(raw.situational_context),
    emotional_texture: arr(raw.emotional_texture),
    hidden_beliefs: arr(raw.hidden_beliefs),
    user_question_under_it: str(raw.user_question_under_it),
    recommended_insight_type: arr(raw.recommended_insight_type),
    recommended_voice_register: str(raw.recommended_voice_register),
    excluded_voice_registers: arr(raw.excluded_voice_registers),
    resonance_need: str(raw.resonance_need),
    recommended_intensity: str(raw.recommended_intensity),
    disambiguation_neighbors: arr(raw.disambiguation_neighbors),
    anti_pattern_notes: str(raw.anti_pattern_notes),
    missing_source_profile: str(raw.missing_source_profile),
    harvesting_priority: num(raw.harvesting_priority, 50),
  };
}
function normalizeQuery(raw: Record<string, unknown>): QueryPattern {
  return {
    query_id: str(raw.query_id),
    need_id: str(raw.need_id),
    text: str(raw.text),
    source: str(raw.source),
    expected_state: str(raw.expected_state),
    expected_resonance: str(raw.expected_resonance),
    expected_insight_type: str(raw.expected_insight_type),
    excluded_voice_registers: arr(raw.excluded_voice_registers),
    notes: str(raw.notes),
  };
}

// ── static coverage (no network) ───────────────────────────────────────────────
function sioInState(s: SioMeta, state: string): boolean {
  return s.primary_state_tag === state || s.secondary_state_tags.includes(state);
}

function staticCoverage(need: NeedPattern, sios: SioMeta[]): {
  ids: string[];
  strength: Strength;
  note: string;
  hasRegisterMatch: boolean; // a non-excluded SIO in the recommended register exists in the corpus
} {
  const stateSios = sios.filter((s) => sioInState(s, need.state));
  if (stateSios.length === 0) {
    return { ids: [], strength: "none", note: `No SIOs in ${need.state} at all.`, hasRegisterMatch: false };
  }
  const excluded = new Set(need.excluded_voice_registers);
  const recTypes = new Set(need.recommended_insight_type);
  const acceptable = stateSios.filter((s) => !excluded.has(s.voice_register));
  if (acceptable.length === 0) {
    return {
      ids: [],
      strength: "none",
      note: `${stateSios.length} ${need.state} SIO(s) exist but ALL are in an excluded register (${[...excluded].join(", ")}) — the corpus can only serve this user with a register that would harm them.`,
      hasRegisterMatch: false,
    };
  }
  const exact = acceptable.filter(
    (s) => s.voice_register === need.recommended_voice_register && recTypes.has(s.insight_type)
  );
  const registerMatch = acceptable.filter((s) => s.voice_register === need.recommended_voice_register);
  const typeMatch = acceptable.filter((s) => recTypes.has(s.insight_type));
  const hasRegisterMatch = registerMatch.length >= 1;

  if (exact.length >= 1) {
    return {
      ids: exact.map((s) => s.insight_id),
      strength: "strong",
      note: `${exact.length} SIO(s) match recommended register (${need.recommended_voice_register}) + type.`,
      hasRegisterMatch,
    };
  }
  if (registerMatch.length >= 1 || typeMatch.length >= 1) {
    const ids = [...new Set([...registerMatch, ...typeMatch].map((s) => s.insight_id))];
    return {
      ids,
      strength: "partial",
      note: `No exact register+type match. ${registerMatch.length} register-only and ${typeMatch.length} type-only match(es).`,
      hasRegisterMatch,
    };
  }
  return {
    ids: [],
    strength: "weak",
    note: `${acceptable.length} non-excluded ${need.state} SIO(s) exist, but none match the recommended register (${need.recommended_voice_register}) or type (${need.recommended_insight_type.join("/")}).`,
    hasRegisterMatch,
  };
}

// ── retrieval probe verdict (evaluated on the HINTED, production-faithful path) ──
function classifyVerdict(
  q: QueryPattern,
  top: TopDoc | null,
  top3: TopDoc[]
): { verdict: Verdict; detail: string } {
  if (!top || top.label === "below_threshold") {
    return {
      verdict: "nothing",
      detail: top
        ? `top ${top.id} below threshold (score ${top.score.toFixed(3)})`
        : "no in-state candidates returned",
    };
  }
  const excluded = new Set(q.excluded_voice_registers);
  const wantReg = q.expected_resonance;
  const wantType = q.expected_insight_type;
  const regAppropriate = (d: TopDoc) =>
    !excluded.has(d.register) && (!wantReg || d.register === wantReg) && d.label !== "below_threshold";

  if (excluded.has(top.register)) {
    const buriedGood = top3.find((d) => d.id !== top.id && regAppropriate(d));
    return {
      verdict: "excluded_register_served",
      detail:
        `top ${top.id} is ${top.register} — an EXCLUDED register for this user.` +
        (buriedGood ? ` (a register-appropriate ${buriedGood.id} sits at a lower rank — ranking issue too)` : ""),
    };
  }
  const regOk = !wantReg || top.register === wantReg;
  const typeOk = !wantType || top.type === wantType;
  if (regOk && typeOk) {
    return { verdict: "lands", detail: `top ${top.id} (${top.register}/${top.type}) matches expectation.` };
  }
  if (regOk && !typeOk) {
    return { verdict: "lands", detail: `top ${top.id} register OK (${top.register}) but type ${top.type} != ${wantType}.` };
  }
  // top-1 is a non-excluded but non-matching register — is a good one merely buried?
  const buriedGood = top3.find((d) => d.id !== top.id && regAppropriate(d));
  if (buriedGood) {
    return {
      verdict: "buried",
      detail: `top ${top.id} is ${top.register}; a register-appropriate ${buriedGood.id} (${buriedGood.register}) is in top-3 but not #1 — retrieval ranking issue, not a corpus gap.`,
    };
  }
  return {
    verdict: "wrong_register",
    detail: `top ${top.id} is ${top.register}/${top.type}; wanted ${wantReg || "any"}/${wantType || "any"}; nothing appropriate in top-3.`,
  };
}

// Production-faithful coverage from the HINTED probe verdicts. "buried" is treated as a
// partial credit (the SIO exists and is retrievable) but never as a full land.
function probeStrength(results: QueryResult[]): Strength | null {
  const ran = results.filter((r) => r.ran);
  if (ran.length === 0) return null;
  const lands = ran.filter((r) => r.verdict === "lands").length;
  const buried = ran.filter((r) => r.verdict === "buried").length;
  const excludedAny = ran.some((r) => r.verdict === "excluded_register_served");
  const credit = (lands + 0.5 * buried) / ran.length;
  if (excludedAny) return credit > 0 ? "weak" : "none";
  if (credit >= 0.75) return "strong";
  if (credit >= 0.4) return "partial";
  if (credit > 0) return "weak";
  return "none";
}

// Methodology §2: classify WHY a need is under-served, which decides the remedy.
function gapKindFor(hinted: Strength | null, staticHasRegisterMatch: boolean, results: QueryResult[]): GapKind {
  const strength = hinted ?? "unknown";
  if (STRENGTH_RANK[strength] >= STRENGTH_RANK["partial"]) return "well_served";
  // under-served. Does a register-appropriate SIO exist anywhere (static) or surface buried?
  const buriedSeen = results.some((r) => r.ran && r.verdict === "buried");
  if (staticHasRegisterMatch || buriedSeen) return "retrieval_gap"; // SIO exists; delivery is the problem
  return "corpus_gap"; // the right form genuinely isn't in the corpus → harvest
}

const STRENGTH_RANK: Record<Strength, number> = { unknown: -1, none: 0, weak: 1, partial: 2, strong: 3 };

function priorityFor(strength: Strength, results: QueryResult[], seed: number, gapKind: GapKind): number {
  const base: Record<Strength, number> = { unknown: 50, none: 90, weak: 70, partial: 40, strong: 10 };
  let p = base[strength];
  if (results.some((r) => r.verdict === "excluded_register_served")) p += 15; // actively harmful → urgent
  // blend a little of the curator's demand estimate (seed) without letting it dominate
  p += Math.round((seed - 50) * 0.2);
  // gap_kind shapes HARVEST priority: a retrieval_gap won't be fixed by harvesting (the SIO
  // exists) so it ranks lower as a harvest target; well_served is near-zero.
  if (gapKind === "retrieval_gap") p = Math.round(p * 0.5);
  if (gapKind === "well_served") p = Math.min(p, 15);
  return Math.max(0, Math.min(100, p));
}

// Map a scoredSearch candidate list to our lightweight TopDoc shape (top-k order preserved).
function toTopDocs(candidates: Array<{ doc: { metadata: Record<string, unknown> }; final_score: number; label: string }>): TopDoc[] {
  return candidates.map((c) => ({
    id: String(c.doc.metadata.insight_id ?? ""),
    register: String(c.doc.metadata.voice_register ?? ""),
    type: String(c.doc.metadata.insight_type ?? ""),
    state: String(c.doc.metadata.primary_state_tag ?? ""),
    score: c.final_score,
    label: c.label,
  }));
}

// ── source-family suggestion (mirrors find-source-candidates families; names only) ──
interface FamilyLite { name: string; states: string[]; registers: string[] }
const SOURCE_FAMILIES: FamilyLite[] = [
  { name: "The School of Greatness", states: ["direction-collapse", "engagement-drought", "inaction-loop", "identity-transition", "momentum-gap"], registers: ["warm/affirming", "vulnerable/personal"] },
  { name: "Huberman Lab", states: ["engagement-drought", "inaction-loop", "possibility-paralysis", "momentum-gap"], registers: ["expert/scientific"] },
  { name: "The Tim Ferriss Show", states: ["direction-collapse", "inaction-loop", "possibility-paralysis", "identity-transition"], registers: ["intellectual/measured", "direct/challenging"] },
  { name: "Diary of a CEO", states: ["direction-collapse", "engagement-drought", "identity-transition", "momentum-gap"], registers: ["vulnerable/personal", "direct/challenging"] },
  { name: "Rich Roll Podcast", states: ["direction-collapse", "engagement-drought", "inaction-loop", "identity-transition"], registers: ["warm/affirming", "vulnerable/personal"] },
  { name: "Modern Wisdom", states: ["inaction-loop", "direction-collapse", "possibility-paralysis"], registers: ["direct/challenging", "intellectual/measured"] },
  { name: "Impact Theory", states: ["inaction-loop", "direction-collapse", "momentum-gap"], registers: ["direct/challenging"] },
  { name: "TED / TEDx", states: ["direction-collapse", "engagement-drought", "inaction-loop", "possibility-paralysis", "identity-transition", "momentum-gap"], registers: ["expert/scientific", "intellectual/measured", "warm/affirming"] },
];
function suggestFamilies(need: NeedPattern): string[] {
  const exact = SOURCE_FAMILIES.filter(
    (f) => f.states.includes(need.state) && f.registers.includes(need.recommended_voice_register)
  );
  const fams = exact.length > 0 ? exact : SOURCE_FAMILIES.filter((f) => f.states.includes(need.state));
  return fams.slice(0, 3).map((f) => f.name);
}
function suggestQueries(need: NeedPattern, families: string[]): string[] {
  const texture = need.emotional_texture.slice(0, 2).join(" ");
  const topic = need.sub_state.replace(/-/g, " ");
  const regWord = need.recommended_voice_register.split("/")[0];
  const out: string[] = [];
  for (const f of families.slice(0, 2)) {
    out.push(`"${f}" ${topic} ${regWord} official`.replace(/\s+/g, " ").trim());
    out.push(`"${f}" ${texture} ${need.recommended_insight_type[0] ?? "insight"}`.replace(/\s+/g, " ").trim());
  }
  return [...new Set(out)];
}

// ── main ────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const staticOnly = args.includes("--static");
  const wantJson = args.includes("--json");

  const needs = loadList<Record<string, unknown>>(NEEDS_PATH, "needs").map(normalizeNeed);
  const queries = loadList<Record<string, unknown>>(QUERIES_PATH, "queries").map(normalizeQuery);
  const sios = loadSioMetas();

  const queriesByNeed = new Map<string, QueryPattern[]>();
  for (const q of queries) {
    if (!queriesByNeed.has(q.need_id)) queriesByNeed.set(q.need_id, []);
    queriesByNeed.get(q.need_id)!.push(q);
  }

  // ── retrieval setup (graceful degradation) ──
  let retrievalAvailable = false;
  let retrievalNote = "";
  let scoredSearchFn: ProbeFn | null = null;

  if (staticOnly) {
    retrievalNote = "--static flag set: retrieval probe skipped (metadata-only coverage).";
  } else {
    try {
      const { loadSIODocuments } = await import("../src/rag/sioLoader");
      const { getOrCreateVectorStore, scoredSearch } = await import("../src/rag/vectorStore");
      const docs = await loadSIODocuments();
      await getOrCreateVectorStore(docs);
      scoredSearchFn = scoredSearch as unknown as ProbeFn;
      retrievalAvailable = true;
      retrievalNote = `Retrieval probe ON (${docs.length} SIOs embedded). Coverage uses the HINTED path (production-faithful: the intake classifier infers the need's resonance); magnets use the no-hint default path.`;
    } catch (err) {
      retrievalAvailable = false;
      retrievalNote = `Retrieval probe SKIPPED — ${err instanceof Error ? err.message : String(err)}. Reporting STATIC coverage only. Re-run with a valid OPENAI_API_KEY in .env for the live probe.`;
    }
  }

  // ── per-state magnet tracking (winner tally across that state's probed queries) ──
  const stateWinTally: Record<string, Record<string, number>> = {};
  const stateProbeCount: Record<string, number> = {};

  // ── analyze each need ──
  const coverages: NeedCoverage[] = [];
  for (const need of needs) {
    const stat = staticCoverage(need, sios);
    const needQueries = queriesByNeed.get(need.need_id) ?? [];
    const probeResults: QueryResult[] = [];

    for (const q of needQueries) {
      const state = (q.expected_state || need.state) as MvpState;
      if (!retrievalAvailable || !scoredSearchFn) {
        probeResults.push({ query: q, ran: false, verdict: "nothing", hinted_top: null, hinted_top3: [], nohint_top_id: "", detail: "probe not run" });
        continue;
      }
      try {
        // (1) HINTED path — production-faithful: the intake classifier would infer this need's
        //     resonance from the user's tone. This is what the user actually receives.
        const hint: IntakeHint = {
          insight_type: q.expected_insight_type || null,
          voice_register: q.expected_resonance || null,
        };
        const hres = await scoredSearchFn({ query: q.text, state, k: 3, intakeHint: hint });
        const top3 = toTopDocs(hres.candidates);
        const top = top3[0] ?? null;
        const { verdict, detail } = classifyVerdict(q, top, top3);

        // (2) NO-HINT path — default profile, for magnet tally only (matches test-magnet-risk).
        const nres = await scoredSearchFn({ query: q.text, state, k: 3, intakeHint: null });
        const nTop = toTopDocs(nres.candidates)[0] ?? null;
        if (nTop && nTop.label !== "below_threshold") {
          stateWinTally[state] ??= {};
          stateWinTally[state][nTop.id] = (stateWinTally[state][nTop.id] ?? 0) + 1;
          stateProbeCount[state] = (stateProbeCount[state] ?? 0) + 1;
        }

        probeResults.push({ query: q, ran: true, verdict, hinted_top: top, hinted_top3: top3, nohint_top_id: nTop?.id ?? "", detail });
      } catch (err) {
        probeResults.push({
          query: q, ran: false, verdict: "nothing", hinted_top: null, hinted_top3: [], nohint_top_id: "",
          detail: `probe error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const hinted = probeStrength(probeResults);
    // Final coverage: prefer the hinted (production-faithful) probe when it ran; else static.
    const finalStrength: Strength = hinted ?? stat.strength;
    const gapKind: GapKind = hinted
      ? gapKindFor(hinted, stat.hasRegisterMatch, probeResults)
      : stat.hasRegisterMatch
        ? "well_served" // static-only can't see retrieval problems; only flags truly-absent forms
        : "corpus_gap";

    const evidenceParts: string[] = [];
    if (hinted) {
      const ran = probeResults.filter((r) => r.ran);
      const c = (v: Verdict) => ran.filter((r) => r.verdict === v).length;
      evidenceParts.push(
        `Hinted probe: ${c("lands")}/${ran.length} land` +
          (c("buried") ? `, ${c("buried")} buried (retrievable, mis-ranked)` : "") +
          (c("wrong_register") ? `, ${c("wrong_register")} wrong-register` : "") +
          (c("excluded_register_served") ? `, ${c("excluded_register_served")} EXCLUDED-register served` : "") +
          (c("nothing") ? `, ${c("nothing")} nothing` : "") + "."
      );
    }
    evidenceParts.push(`Static: ${stat.strength} — ${stat.note}`);
    evidenceParts.push(`Gap kind: ${gapKind}.`);

    coverages.push({
      need,
      static_covered_sio_ids: stat.ids,
      static_strength: stat.strength,
      static_note: stat.note,
      static_has_register_match: stat.hasRegisterMatch,
      probe_results: probeResults,
      hinted_strength: hinted,
      coverage_strength: finalStrength,
      gap_kind: gapKind,
      coverage_evidence: evidenceParts.join(" "),
      computed_priority: priorityFor(finalStrength, probeResults, need.harvesting_priority, gapKind),
    });
  }

  // ── magnet findings ──
  const magnets: Array<{ state: string; sio_id: string; wins: number; total: number }> = [];
  for (const state of Object.keys(stateWinTally)) {
    const total = stateProbeCount[state] ?? 0;
    for (const [sio, wins] of Object.entries(stateWinTally[state])) {
      if (total > 0 && wins / total > MAGNET_WIN_RATE && total >= 3) {
        magnets.push({ state, sio_id: sio, wins, total });
      }
    }
  }
  magnets.sort((a, b) => b.wins / b.total - a.wins / a.total);

  // ── outputs ──
  writeReport(coverages, magnets, retrievalAvailable, retrievalNote, sios.length);
  writeTargets(coverages, retrievalAvailable, retrievalNote);
  writeTargetsJson(coverages);
  printConsole(coverages, magnets, retrievalAvailable, retrievalNote);

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          retrieval_available: retrievalAvailable,
          needs: coverages.map((c) => ({
            need_id: c.need.need_id,
            state: c.need.state,
            coverage_strength: c.coverage_strength,
            gap_kind: c.gap_kind,
            static_strength: c.static_strength,
            hinted_strength: c.hinted_strength,
            computed_priority: c.computed_priority,
            covered_by_sio_ids: c.static_covered_sio_ids,
            coverage_evidence: c.coverage_evidence,
          })),
          magnets,
        },
        null,
        2
      )
    );
  }
}

// ── report rendering ──────────────────────────────────────────────────────────
function badge(s: Strength): string {
  return { unknown: "❔ unknown", none: "🔴 none", weak: "🟠 weak", partial: "🟡 partial", strong: "🟢 strong" }[s];
}

function writeReport(
  coverages: NeedCoverage[],
  magnets: Array<{ state: string; sio_id: string; wins: number; total: number }>,
  retrievalAvailable: boolean,
  retrievalNote: string,
  totalSios: number
) {
  const now = new Date().toISOString().slice(0, 10);
  const L: string[] = [];
  L.push("# User Need Coverage Report");
  L.push("");
  L.push(`_Generated by \`scripts/analyze-user-need-coverage.ts\` on ${now}._`);
  L.push("");
  L.push(
    "> **Hypothesis layer.** Needs are curator hypotheses; queries are author-written (not real " +
      "user logs). Coverage below is COMPUTED — it overrides the seed values in " +
      "`corpus/user_need_patterns.yaml`. This tool never mutates the corpus or approves anything."
  );
  L.push("");
  L.push(`**Served SIOs:** ${totalSios}  ·  **Retrieval probe:** ${retrievalAvailable ? "ON" : "OFF (static only)"}`);
  L.push("");
  L.push(`> ${retrievalNote}`);
  L.push("");

  // summary table by computed priority
  const sorted = [...coverages].sort((a, b) => b.computed_priority - a.computed_priority);
  L.push("## Coverage summary (worst-served first)");
  L.push("");
  L.push("> **coverage** = production-faithful (HINTED) probe when available. **gap_kind** decides the remedy: ");
  L.push("> `corpus_gap` → harvest a new SIO · `retrieval_gap` → an appropriate SIO exists; fix ranking/discoverability · `well_served` → no action.");
  L.push("");
  L.push("| priority | need_id | state | coverage | gap_kind | static | hinted | covered SIOs |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const c of sorted) {
    L.push(
      `| ${c.computed_priority} | ${c.need.need_id} | ${c.need.state} | ${badge(c.coverage_strength)} | ${c.gap_kind} | ${c.static_strength} | ${c.hinted_strength ?? "—"} | ${c.static_covered_sio_ids.join(", ") || "—"} |`
    );
  }
  L.push("");

  // magnets
  L.push("## Retrieval magnets (user-side view)");
  L.push("");
  if (!retrievalAvailable) {
    L.push("_Retrieval probe was OFF — magnet detection requires the live engine._");
  } else if (magnets.length === 0) {
    L.push("_No single SIO won > 50% of a state's probed queries. No magnet detected from the user-side probes._");
  } else {
    L.push("| state | sio_id | win rate |");
    L.push("|---|---|---|");
    for (const m of magnets) L.push(`| ${m.state} | ${m.sio_id} | ${m.wins}/${m.total} (${Math.round((m.wins / m.total) * 100)}%) |`);
    L.push("");
    L.push("> A magnet collapses within-state discrimination: many distinct user situations get the same SIO. Cross-check with `scripts/test-magnet-risk.ts`.");
  }
  L.push("");

  // possible SIO mis-tags: an EXCLUDED register was served to a need whose recommended register
  // DOES exist in the corpus → the served SIO may be mis-tagged, or retrieval mis-ranked. QA signal.
  const tagFlags: Array<{ need: string; query: string; sio: string; served: string; excluded: string[] }> = [];
  for (const c of coverages) {
    if (!c.static_has_register_match) continue; // can't be a mis-tag if the right register is genuinely absent
    for (const r of c.probe_results) {
      if (r.ran && r.verdict === "excluded_register_served" && r.hinted_top) {
        tagFlags.push({
          need: c.need.need_id,
          query: r.query.query_id,
          sio: r.hinted_top.id,
          served: r.hinted_top.register,
          excluded: c.need.excluded_voice_registers,
        });
      }
    }
  }
  L.push("## Possible SIO tagging / ranking review");
  L.push("");
  if (!retrievalAvailable) {
    L.push("_Retrieval probe was OFF — skipped._");
  } else if (tagFlags.length === 0) {
    L.push("_None. No SIO was served in an excluded register where the right register also exists._");
  } else {
    L.push("> Each row served an **excluded** register though a register-appropriate SIO exists for that need. " +
      "Either the served SIO's `voice_register` is mis-tagged, or retrieval mis-ranked it. **Human review** (do not auto-edit tags).");
    L.push("");
    L.push("| served SIO | served register | excluded for need | need | query |");
    L.push("|---|---|---|---|---|");
    for (const f of tagFlags) L.push(`| ${f.sio} | ${f.served} | ${f.excluded.join(", ")} | ${f.need} | ${f.query} |`);
  }
  L.push("");

  // per-need detail
  L.push("## Per-need detail");
  L.push("");
  for (const c of sorted) {
    const n = c.need;
    L.push(`### \`${n.need_id}\` — ${badge(c.coverage_strength)} (priority ${c.computed_priority})`);
    L.push("");
    L.push(`- **State / variant:** ${n.state}${n.variant ? ` / ${n.variant}` : ""}  ·  **status:** ${n.status}`);
    L.push(`- **User question:** "${n.user_question_under_it}"`);
    L.push(`- **Emotional texture:** ${n.emotional_texture.join(", ")}`);
    L.push(`- **Wants:** ${n.recommended_insight_type.join("/")} · ${n.recommended_voice_register} · ${n.recommended_intensity}` + (n.excluded_voice_registers.length ? `  ·  **Excludes:** ${n.excluded_voice_registers.join(", ")}` : ""));
    L.push(`- **Coverage evidence:** ${c.coverage_evidence}`);
    L.push(`- **Gap kind:** ${c.gap_kind}`);
    if (c.probe_results.some((r) => r.ran)) {
      L.push(`- **Hinted probe results:**`);
      for (const r of c.probe_results) {
        if (!r.ran) continue;
        const flag =
          r.verdict === "excluded_register_served" ? "⛔"
          : r.verdict === "lands" ? "✓"
          : r.verdict === "buried" ? "↧"
          : r.verdict === "wrong_register" ? "≈"
          : "∅";
        L.push(`    - ${flag} \`${r.query.query_id}\` → ${r.detail}`);
      }
    }
    L.push("");
  }

  ensureDir(GUIDES_DIR);
  writeFileSync(REPORT_PATH, L.join("\n") + "\n", "utf-8");
}

function writeTargets(
  coverages: NeedCoverage[],
  retrievalAvailable: boolean,
  retrievalNote: string
) {
  const now = new Date().toISOString().slice(0, 10);
  // Targets = under-served needs. Ordered: true corpus gaps (harvest) before retrieval gaps
  // (fix ranking), each by priority. well_served needs are excluded.
  const order: Record<GapKind, number> = { corpus_gap: 0, retrieval_gap: 1, well_served: 2 };
  const targets = coverages
    .filter((c) => c.gap_kind !== "well_served")
    .sort((a, b) => order[a.gap_kind] - order[b.gap_kind] || b.computed_priority - a.computed_priority);
  const nCorpus = targets.filter((c) => c.gap_kind === "corpus_gap").length;
  const nRetrieval = targets.filter((c) => c.gap_kind === "retrieval_gap").length;

  const L: string[] = [];
  L.push("# User-Need Harvesting Targets");
  L.push("");
  L.push(`_Generated by \`scripts/analyze-user-need-coverage.ts\` on ${now}. The bridge to the Source Scout._`);
  L.push("");
  L.push(
    "> **Hypothesis layer.** Each target below is a curator hypothesis about real demand, not a " +
      "measurement. These are enriched, user-voiced source briefs to feed " +
      "`find-source-candidates.ts` and the human curator — they sharpen *what to harvest*; they " +
      "never lower a verification bar or approve anything."
  );
  L.push("");
  L.push(`> ${retrievalNote}`);
  L.push("");
  L.push(
    `**${targets.length} under-served need(s):** ${nCorpus} **corpus_gap** (harvest a new SIO) · ` +
      `${nRetrieval} **retrieval_gap** (an appropriate SIO exists — fix ranking/discoverability before harvesting). ` +
      `Corpus gaps first, highest priority first.`
  );
  L.push("");

  let lastKind: GapKind | null = null;
  for (const c of targets) {
    const n = c.need;
    if (c.gap_kind !== lastKind) {
      lastKind = c.gap_kind;
      L.push(
        c.gap_kind === "corpus_gap"
          ? "# ⛏️ Corpus gaps — harvest these"
          : "# 🔧 Retrieval gaps — an appropriate SIO already exists (tune retrieval; harvest only a stronger exemplar)"
      );
      L.push("");
    }
    const families = suggestFamilies(n);
    const sQueries = suggestQueries(n, families);
    const near = c.probe_results
      .filter((r) => r.ran && r.hinted_top)
      .map((r) => `${r.query.query_id} → ${r.hinted_top!.id} (${r.hinted_top!.register || "?"})`);
    L.push(`## ${badge(c.coverage_strength)} \`${n.need_id}\` — priority ${c.computed_priority} · ${c.gap_kind}`);
    L.push("");
    L.push(`**User situation:** ${n.user_question_under_it} (${n.sub_state.replace(/-/g, " ")})`);
    L.push("");
    L.push(`| Field | Value |`);
    L.push(`|---|---|`);
    L.push(`| target_state | ${n.state}${n.variant ? ` / ${n.variant}` : ""} |`);
    L.push(`| recommended_insight_type | ${n.recommended_insight_type.join(", ")} |`);
    L.push(`| recommended_voice_register | ${n.recommended_voice_register} |`);
    L.push(`| excluded_voice_registers | ${n.excluded_voice_registers.join(", ") || "—"} |`);
    L.push(`| recommended_intensity | ${n.recommended_intensity} |`);
    L.push(`| emotional_texture | ${n.emotional_texture.join(", ")} |`);
    L.push(`| hidden_beliefs | ${n.hidden_beliefs.map((b) => `"${b}"`).join("; ")} |`);
    L.push(`| why coverage is weak | ${c.coverage_evidence} |`);
    L.push(`| existing near-misses | ${near.join("; ") || "—"} |`);
    L.push(`| suggested source families | ${families.join(", ")} |`);
    L.push("");
    L.push(`**Missing source profile:** ${n.missing_source_profile}`);
    L.push("");
    L.push(`**Anti-pattern (what NOT to harvest):** ${n.anti_pattern_notes}`);
    L.push("");
    if (c.gap_kind === "retrieval_gap") {
      L.push(
        "> ⚠️ **Retrieval gap, not a corpus gap.** A register-appropriate SIO already exists or is " +
          "retrievable but isn't surfaced #1 even with the intake hint. Prefer retrieval tuning " +
          "(rerank / threshold / hint strength / MMR) or improving the existing SIO's discoverability. " +
          "Harvest a new SIO only if a clearly stronger exemplar is warranted."
      );
      L.push("");
    }
    L.push(`**Enriched harvesting brief:**`);
    L.push("");
    L.push(
      `> We need a verified **${n.recommended_voice_register}** ${stateLabel(n.state)} ` +
        `${n.recommended_insight_type[0] ?? "insight"} for a user who ${beliefClause(n)}. ` +
        `Source profile: ${n.missing_source_profile.replace(/\.$/, "")}. ` +
        (n.excluded_voice_registers.length ? `Exclude ${n.excluded_voice_registers.join(", ")}. ` : "") +
        `Avoid: ${shorten(n.anti_pattern_notes)}.`
    );
    L.push("");
    L.push(`**Suggested source-search queries** (run via web tools; prefer official URLs; never treat re-uploads as verified):`);
    for (const q of sQueries) L.push(`- \`${q}\``);
    L.push("");
    L.push(`**Provenance (hypothesis basis):** ${n.source_provenance.join(" · ")}`);
    L.push("");
    L.push("---");
    L.push("");
  }

  ensureDir(GUIDES_DIR);
  writeFileSync(TARGETS_PATH, L.join("\n") + "\n", "utf-8");
}

// Machine-readable targets — consumed by find-source-candidates.ts so user-need-driven
// harvesting targets surface alongside corpus-cell gaps (HITL "single analysis", not two silos).
function writeTargetsJson(coverages: NeedCoverage[]) {
  const targets = coverages
    .filter((c) => c.gap_kind !== "well_served")
    .sort((a, b) => b.computed_priority - a.computed_priority)
    .map((c) => {
      const families = suggestFamilies(c.need);
      return {
        need_id: c.need.need_id,
        gap_kind: c.gap_kind,
        priority: c.computed_priority,
        coverage_strength: c.coverage_strength,
        target_state: c.need.state,
        recommended_insight_type: c.need.recommended_insight_type,
        recommended_voice_register: c.need.recommended_voice_register,
        excluded_voice_registers: c.need.excluded_voice_registers,
        recommended_intensity: c.need.recommended_intensity,
        user_situation: c.need.user_question_under_it,
        missing_source_profile: c.need.missing_source_profile,
        anti_pattern_notes: c.need.anti_pattern_notes,
        suggested_source_families: families,
        suggested_queries: suggestQueries(c.need, families),
        coverage_evidence: c.coverage_evidence,
      };
    });
  ensureDir(GUIDES_DIR);
  writeFileSync(
    TARGETS_JSON_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        status: "hypothesis",
        note: "User-need-driven harvesting targets. Hypothesis layer — not observed demand. corpus_gap → harvest; retrieval_gap → tune retrieval first.",
        targets,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );
}

function stateLabel(s: string): string {
  return { "direction-collapse": "Direction Collapse", "engagement-drought": "Engagement Drought", "inaction-loop": "Inaction Loop", "possibility-paralysis": "Possibility Paralysis", "identity-transition": "Identity Transition", "momentum-gap": "Momentum Gap" }[s] ?? s;
}
function beliefClause(n: NeedPattern): string {
  const b = n.hidden_beliefs[0] ?? n.user_question_under_it;
  return `believes "${b.replace(/"/g, "")}" (${n.emotional_texture.slice(0, 2).join(", ")})`;
}
function shorten(s: string, max = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function printConsole(
  coverages: NeedCoverage[],
  magnets: Array<{ state: string; sio_id: string; wins: number; total: number }>,
  retrievalAvailable: boolean,
  retrievalNote: string
) {
  const sorted = [...coverages].sort((a, b) => b.computed_priority - a.computed_priority);
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  SILHOUETTE — User Need Coverage Analyzer (Stage 0)               ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`\n${retrievalNote}\n`);
  console.log(`Needs analyzed: ${coverages.length}  (all status: hypothesis)\n`);
  const counts: Record<Strength, number> = { unknown: 0, none: 0, weak: 0, partial: 0, strong: 0 };
  for (const c of coverages) counts[c.coverage_strength]++;
  console.log(`Coverage: 🟢 strong ${counts.strong}  ·  🟡 partial ${counts.partial}  ·  🟠 weak ${counts.weak}  ·  🔴 none ${counts.none}`);
  const gk: Record<GapKind, number> = { well_served: 0, corpus_gap: 0, retrieval_gap: 0 };
  for (const c of coverages) gk[c.gap_kind]++;
  console.log(`Gap kind: ⛏️ corpus_gap ${gk.corpus_gap} (harvest)  ·  🔧 retrieval_gap ${gk.retrieval_gap} (tune retrieval)  ·  ✅ well_served ${gk.well_served}`);
  console.log("");
  console.log("Most actionable HARVEST targets (corpus gaps first, worst-served):");
  const ranked = [...sorted].sort((a, b) => {
    const ord = { corpus_gap: 0, retrieval_gap: 1, well_served: 2 } as Record<GapKind, number>;
    return ord[a.gap_kind] - ord[b.gap_kind] || b.computed_priority - a.computed_priority;
  });
  for (const c of ranked.filter((x) => x.gap_kind !== "well_served").slice(0, 8)) {
    console.log(`  [${c.computed_priority}] ${badge(c.coverage_strength)} ${c.gap_kind}  ${c.need.need_id}`);
    console.log(`        ${c.coverage_evidence}`);
  }
  if (retrievalAvailable && magnets.length) {
    console.log("\n⚠️  Magnets (one SIO winning >50% of a state's probes):");
    for (const m of magnets) console.log(`     ${m.state}: ${m.sio_id} ${m.wins}/${m.total}`);
  }
  console.log(`\nReports written:`);
  console.log(`  • ${REPORT_PATH.replace(ROOT + "/", "")}`);
  console.log(`  • ${TARGETS_PATH.replace(ROOT + "/", "")}  (→ feed the Source Scout)`);
  console.log("");
}

main().catch((err) => {
  console.error("[analyze-user-need-coverage] error:", err);
  process.exit(1);
});
