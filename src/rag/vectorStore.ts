import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { requireKey } from "../lib/config";
import { logAgentStep } from "../logging/logger";
import {
  RETRIEVAL_CONFIG,
  STATE_DEFAULT_RESONANCE,
  type MvpState,
  type ResonanceProfile,
} from "./retrievalConfig";

let store: MemoryVectorStore | null = null;

export async function getOrCreateVectorStore(
  docs?: Document[]
): Promise<MemoryVectorStore> {
  if (store) return store;

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: requireKey("openaiApiKey"),
    model: "text-embedding-3-small",
  });

  if (docs && docs.length > 0) {
    store = await MemoryVectorStore.fromDocuments(docs, embeddings);
    logAgentStep("vectorstore_created", { documentCount: docs.length });
  } else {
    store = new MemoryVectorStore(embeddings);
    logAgentStep("vectorstore_created", { documentCount: 0, note: "empty store" });
  }

  return store;
}

function stateFilter(state?: string) {
  if (!state) return undefined;
  return (doc: Document) => {
    const primary = String(doc.metadata.primary_state_tag ?? "");
    if (primary === state) return true;
    const secondary = doc.metadata.secondary_state_tags;
    if (Array.isArray(secondary) && secondary.map(String).includes(state)) {
      return true;
    }
    return false;
  };
}

export async function similaritySearch(
  query: string,
  k = 3
): Promise<Document[]> {
  if (!store) throw new Error("Vector store not initialized. Run ingestion first.");
  return store.similaritySearch(query, k);
}

export async function similaritySearchWithState(
  query: string,
  state?: string,
  k = 3
): Promise<Document[]> {
  if (!store) throw new Error("Vector store not initialized. Run ingestion first.");
  const filter = stateFilter(state);
  return filter ? store.similaritySearch(query, k, filter) : store.similaritySearch(query, k);
}

export interface ScoredCandidate {
  doc: Document;
  semantic_score: number;
  boosts: Array<{ reason: string; amount: number }>;
  penalties: Array<{ reason: string; amount: number }>;
  applied_boost_total: number; // after the +0.20 cap
  raw_boost_total: number; // before the cap
  final_score: number;
  label: "strong" | "acceptable" | "below_threshold";
  // Debug trace for scoring decisions that don't add/subtract score but explain
  // the resonance logic (e.g. a default boost being suppressed by a user hint).
  notes?: string[];
}

export interface ScoredSearchResult {
  candidates: ScoredCandidate[];
  resonance_profile_used: ResonanceProfile | null;
  state_filter_applied: string | null;
  query_framing_used: boolean;
}

// Component 6 §8 Option A — query framing prefix to address query-document
// language asymmetry. Cheap, adds no latency.
function frameQuery(rawQuery: string): string {
  return `A young professional describes their situation: ${rawQuery.trim()}`;
}

export interface IntakeResonanceHint {
  insight_type?: string | null;
  voice_register?: string | null;
  direction_collapse_variant?: string | null;
}

function applyBoosts(
  doc: Document,
  semanticScore: number,
  resonance: ResonanceProfile | null,
  hint: IntakeResonanceHint | null
): ScoredCandidate {
  const m = doc.metadata;
  const cfg = RETRIEVAL_CONFIG;
  const boosts: ScoredCandidate["boosts"] = [];
  const penalties: ScoredCandidate["penalties"] = [];
  const notes: string[] = [];

  // Resonance scoring: default = FALLBACK, hint = PRECEDENCE (see retrievalConfig.ts).
  // Each dimension (insight_type, voice_register) is decided independently:
  //   - If the classifier produced a HINT for the dimension, the hint governs:
  //     matching SIOs get the (larger) hint boost; the per-state DEFAULT boost
  //     for that dimension is SUPPRESSED, whether the hint matches OR diverges
  //     from the default. This stops the generic state default from out-voting
  //     the user-specific tonal signal.
  //   - If there is NO hint for the dimension, the default profile boost applies.
  const hintType = hint?.insight_type || null;
  const hintRegister = hint?.voice_register || null;
  const docType = String(m.insight_type ?? "");
  const docRegister = String(m.voice_register ?? "");

  // --- insight_type dimension ---
  if (hintType) {
    // Hint present → hint takes precedence; default suppressed for this dimension.
    if (docType === hintType) {
      boosts.push({
        reason: `insight_type matches intake hint (${hintType})`,
        amount: cfg.boost_inferred_insight_type_match,
      });
    }
    if (resonance && hintType !== resonance.insight_type) {
      notes.push(
        `default insight_type boost suppressed (user hint diverges: ${hintType} vs default ${resonance.insight_type})`
      );
    }
  } else if (resonance && docType === resonance.insight_type) {
    // No hint → default profile applies as fallback.
    boosts.push({
      reason: `insight_type matches state default (${resonance.insight_type})`,
      amount: cfg.boost_insight_type_match_default,
    });
  }

  // --- voice_register dimension ---
  if (hintRegister) {
    if (docRegister === hintRegister) {
      boosts.push({
        reason: `voice_register matches intake hint (${hintRegister})`,
        amount: cfg.boost_inferred_voice_register_match,
      });
    }
    if (resonance && hintRegister !== resonance.voice_register) {
      notes.push(
        `default voice_register boost suppressed (user hint diverges: ${hintRegister} vs default ${resonance.voice_register})`
      );
    }
  } else if (resonance && docRegister === resonance.voice_register) {
    boosts.push({
      reason: `voice_register matches state default (${resonance.voice_register})`,
      amount: cfg.boost_voice_register_match_default,
    });
  }

  // Direction Collapse variant boost
  if (
    hint?.direction_collapse_variant &&
    String(m.direction_collapse_variant ?? "") === hint.direction_collapse_variant
  ) {
    boosts.push({
      reason: `direction_collapse_variant matches (${hint.direction_collapse_variant})`,
      amount: cfg.boost_variant_match,
    });
  }

  const credTier = String(m.credibility_tier ?? "");
  if (credTier === "tier-1") {
    boosts.push({
      reason: "credibility_tier = tier-1",
      amount: cfg.boost_credibility_tier_1,
    });
  } else if (credTier === "tier-2") {
    boosts.push({
      reason: "credibility_tier = tier-2",
      amount: cfg.boost_credibility_tier_2,
    });
  }

  const taggerConf = String(m.tagger_confidence ?? "");
  if (taggerConf === "high") {
    boosts.push({
      reason: "tagger_confidence = high",
      amount: cfg.boost_tagger_confidence_high,
    });
  } else if (taggerConf === "medium") {
    penalties.push({
      reason: "tagger_confidence = medium",
      amount: cfg.penalty_tagger_confidence_medium,
    });
  }

  const rawBoostTotal = boosts.reduce((a, b) => a + b.amount, 0);
  const appliedBoostTotal = Math.min(rawBoostTotal, cfg.boost_cap_total);
  const penaltyTotal = penalties.reduce((a, b) => a + b.amount, 0);

  const finalScore = semanticScore + appliedBoostTotal - penaltyTotal;

  let label: ScoredCandidate["label"] = "below_threshold";
  if (finalScore >= cfg.threshold_strong) label = "strong";
  else if (finalScore >= cfg.threshold_acceptable) label = "acceptable";

  return {
    doc,
    semantic_score: semanticScore,
    boosts,
    penalties,
    applied_boost_total: appliedBoostTotal,
    raw_boost_total: rawBoostTotal,
    final_score: finalScore,
    label,
    notes: notes.length ? notes : undefined,
  };
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// Layer B diversity (magnet/diversity-fix phase): MMR rerank of the RETURNED set.
// INVARIANT: position #1 is ALWAYS the highest-final_score candidate, so the winner
// logic and calibration are unaffected. MMR only chooses positions 2..k to avoid
// surfacing near-duplicate alternatives. λ favors relevance so a weak SIO never
// displaces a clearly better one. Embeddings are read fresh from the store each call
// (trivial at corpus scale) to avoid staleness.
function mmrSelect(
  scored: ScoredCandidate[],
  k: number,
  lambda: number
): ScoredCandidate[] {
  if (scored.length <= 2 || k <= 1) return scored.slice(0, k);
  const memVecs =
    (store as unknown as { memoryVectors?: Array<{ embedding: number[]; metadata: Record<string, unknown> }> })
      .memoryVectors ?? [];
  const embById = new Map<string, number[]>();
  for (const v of memVecs) {
    const id = String(v.metadata?.insight_id ?? "");
    if (id) embById.set(id, v.embedding);
  }
  if (embById.size === 0) return scored.slice(0, k); // embeddings unavailable → no-op

  const selected: ScoredCandidate[] = [scored[0]]; // winner: top final_score, always
  const remaining = scored.slice(1);
  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestMmr = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const cEmb = embById.get(String(cand.doc.metadata.insight_id));
      let maxSim = 0;
      if (cEmb) {
        for (const s of selected) {
          const sEmb = embById.get(String(s.doc.metadata.insight_id));
          if (sEmb) maxSim = Math.max(maxSim, cosineSim(cEmb, sEmb));
        }
      }
      const mmr = lambda * cand.final_score - (1 - lambda) * maxSim;
      if (mmr > bestMmr) { bestMmr = mmr; bestIdx = i; }
    }
    const [picked] = remaining.splice(bestIdx, 1);
    (picked.notes ??= []).push(`MMR-selected for diversity (λ=${lambda})`);
    selected.push(picked);
  }
  return selected;
}

export interface ScoredSearchOptions {
  query: string;
  state?: MvpState;
  k?: number;
  applyResonanceDefault?: boolean; // default true if state is known
  useQueryFraming?: boolean; // default true
  intakeHint?: IntakeResonanceHint | null;
  excluded_sio_ids?: string[];
}

export async function scoredSearch(
  opts: ScoredSearchOptions
): Promise<ScoredSearchResult> {
  if (!store) throw new Error("Vector store not initialized. Run ingestion first.");
  const k = opts.k ?? 5;
  const useFraming = opts.useQueryFraming ?? true;
  const applyResonance = opts.applyResonanceDefault ?? Boolean(opts.state);
  const resonance: ResonanceProfile | null =
    applyResonance && opts.state ? STATE_DEFAULT_RESONANCE[opts.state] : null;

  const queryText = useFraming ? frameQuery(opts.query) : opts.query;
  const baseFilter = stateFilter(opts.state);
  const excluded = new Set(opts.excluded_sio_ids ?? []);
  const filter =
    excluded.size > 0
      ? (doc: Document) =>
          (baseFilter ? baseFilter(doc) : true) &&
          !excluded.has(String(doc.metadata.insight_id))
      : baseFilter;

  const pool = Math.max(k * 4, 20);
  const raw = filter
    ? await store.similaritySearchWithScore(queryText, pool, filter)
    : await store.similaritySearchWithScore(queryText, pool);

  const scored = raw
    .map(([doc, score]) =>
      applyBoosts(doc, score, resonance, opts.intakeHint ?? null)
    )
    .sort((a, b) => b.final_score - a.final_score);

  // Layer B: MMR diversity on positions 2..k (winner #1 preserved). See retrievalConfig.
  const candidates = RETRIEVAL_CONFIG.enable_mmr_diversity
    ? mmrSelect(scored, k, RETRIEVAL_CONFIG.mmr_lambda)
    : scored.slice(0, k);

  return {
    candidates,
    resonance_profile_used: resonance,
    state_filter_applied: opts.state ?? null,
    query_framing_used: useFraming,
  };
}
