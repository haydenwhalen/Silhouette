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

  // Default-profile resonance (Component 3 §7.5)
  // Only apply if NOT overridden by an explicit intake hint of the opposite kind.
  if (resonance) {
    const hintType = hint?.insight_type;
    const hintRegister = hint?.voice_register;
    if (
      String(m.insight_type ?? "") === resonance.insight_type &&
      // Don't double-boost when intake hint matches default — give credit once via intake hint.
      hintType !== resonance.insight_type
    ) {
      boosts.push({
        reason: `insight_type matches state default (${resonance.insight_type})`,
        amount: cfg.boost_insight_type_match_default,
      });
    }
    if (
      String(m.voice_register ?? "") === resonance.voice_register &&
      hintRegister !== resonance.voice_register
    ) {
      boosts.push({
        reason: `voice_register matches state default (${resonance.voice_register})`,
        amount: cfg.boost_voice_register_match_default,
      });
    }
  }

  // Intake-inferred resonance hint (Component 3 §6.5)
  if (hint?.insight_type && String(m.insight_type ?? "") === hint.insight_type) {
    boosts.push({
      reason: `insight_type matches intake hint (${hint.insight_type})`,
      amount: cfg.boost_inferred_insight_type_match,
    });
  }
  if (
    hint?.voice_register &&
    String(m.voice_register ?? "") === hint.voice_register
  ) {
    boosts.push({
      reason: `voice_register matches intake hint (${hint.voice_register})`,
      amount: cfg.boost_inferred_voice_register_match,
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
  };
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

  const candidates = raw
    .map(([doc, score]) =>
      applyBoosts(doc, score, resonance, opts.intakeHint ?? null)
    )
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, k);

  return {
    candidates,
    resonance_profile_used: resonance,
    state_filter_applied: opts.state ?? null,
    query_framing_used: useFraming,
  };
}
