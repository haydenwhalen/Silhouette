// Component 6 §9 scoring weights. Externalized so they can be tuned without code changes.
// Treat as initial config; calibrate against the evaluation set.

// NOTE: the name `MvpState` is kept for backward-compat across ~10 importers, but as of the
// Expanded Six-State Corpus Buildout (2026-05-26) this is the full set of 6 User Problem Model
// states, not just the MVP-3. The first three remain the validated MVP wedge.
export type MvpState =
  | "direction-collapse"
  | "engagement-drought"
  | "inaction-loop"
  // ── Six-State Buildout additions (comment out these three to pin runtime to MVP-3) ──
  | "possibility-paralysis"
  | "identity-transition"
  | "momentum-gap";

export interface ResonanceProfile {
  insight_type: string;
  voice_register: string;
}

// Component 3 §7.5 — Default resonance profiles per MVP state.
export const STATE_DEFAULT_RESONANCE: Record<MvpState, ResonanceProfile> = {
  "direction-collapse": {
    insight_type: "reframe",
    voice_register: "intellectual/measured",
  },
  "engagement-drought": {
    insight_type: "mechanism",
    voice_register: "expert/scientific",
  },
  "inaction-loop": {
    insight_type: "story",
    voice_register: "direct/challenging",
  },
  // ── Six-State Buildout additions (defaults from remaining_states_sio_strategy.md §10–11) ──
  "possibility-paralysis": {
    insight_type: "reframe",
    voice_register: "intellectual/measured",
  },
  "identity-transition": {
    insight_type: "story",
    voice_register: "vulnerable/personal",
  },
  "momentum-gap": {
    insight_type: "reframe",
    voice_register: "warm/affirming",
  },
};

// Boost weights for resonance_source = "inferred" or "default" (Component 6 §9).
// Strong-resonance weights (explicit/learned) are not used at MVP since we only
// have inferred/default signals.
//
// RESONANCE SCORING MODEL (Phase: tone-selectivity fix)
// ------------------------------------------------------
// There are two resonance signals: the per-state DEFAULT profile (e.g.
// engagement-drought → mechanism/expert) and the per-query intake HINT inferred
// by the classifier from the user's emotional tone (e.g. burnout → permission/
// vulnerable).
//
//   default = FALLBACK, hint = PRECEDENCE.
//
// For each dimension (insight_type, voice_register) independently:
//   - If the classifier produced a HINT for that dimension, the hint governs:
//     only SIOs matching the hint get the (larger) hint boost, and the default
//     boost for that dimension is SUPPRESSED — even if the hint diverges from
//     the default. This stops the generic state default from out-voting the
//     user-specific tonal signal (e.g. Huberman's default mechanism boost no
//     longer buries Huffington's permission match on a burnout query).
//   - If there is NO hint for that dimension, the default profile boost applies
//     as before (analytical queries still pull mechanism/expert, etc.).
// The hint boosts are intentionally LARGER than the default boosts so that a
// clear user signal can actually move ranking; the +0.20 cap keeps boosts from
// swamping semantic similarity. See vectorStore.ts applyBoosts().
export const RETRIEVAL_CONFIG = {
  // Resonance (default profile — applied only as a FALLBACK when no intake hint
  // exists for the dimension; see model note above).
  boost_insight_type_match_default: 0.05,
  boost_voice_register_match_default: 0.04,
  // Credibility
  boost_credibility_tier_1: 0.05,
  boost_credibility_tier_2: 0.02,
  // Ingestion quality
  boost_tagger_confidence_high: 0.02,
  // Penalties (Component 6 §9)
  penalty_tagger_confidence_medium: 0.03,
  // Hard cap on total positive boosts (Component 6 §9).
  // Without this, metadata could rescue semantically weak candidates.
  boost_cap_total: 0.2,
  // Threshold for "Strong" vs "Acceptable" labels (Component 6 §11).
  // Recalibrated against text-embedding-3-small distribution observed in
  // Phase 4 calibration runs (top correct winners land 0.50–0.65).
  // Original Component 6 starting points were 0.75 / 0.55 — left as a comment for
  // historical context; recalibrate again after human-judged eval data exists.
  threshold_strong: 0.6,
  threshold_acceptable: 0.45,
  // Variant boost (Phase 4 fix #1) — applies when classifier infers a Direction
  // Collapse variant that matches an SIO's direction_collapse_variant field.
  boost_variant_match: 0.06,
  // User-language resonance hint boost — intake-inferred tonal signal per
  // Component 3 §6.5. Raised from 0.03 → 0.06 each (tone-selectivity fix):
  // these now take PRECEDENCE over the default profile (which is suppressed for
  // any dimension that has a hint), so they must be large enough that a clear
  // user signal can flip ranking against semantically-close default-matching
  // SIOs. Combined max hint boost = 0.12, still well under boost_cap_total 0.20.
  boost_inferred_insight_type_match: 0.06,
  boost_inferred_voice_register_match: 0.06,

  // ── Diversity (magnet/diversity-fix phase) ────────────────────────────────
  // Layer B: MMR (Maximal Marginal Relevance) reranking of the RETURNED top-k.
  // The #1 winner is ALWAYS the highest-final_score SIO (so the within-state
  // winner logic + calibration are unaffected); MMR only reorders/selects
  // positions 2..k from the candidate pool to avoid surfacing near-duplicate
  // alternatives. λ favors relevance heavily (0.7) so it never lets a weak SIO
  // displace a clearly better one. This is a forward-looking guardrail for as the
  // corpus grows; the PRIMARY magnet safeguard is the promotion-time win-rate gate
  // (scripts/test-magnet-risk.ts), NOT a serving-time penalty. A centroid-centrality
  // penalty was deliberately REJECTED — the data showed the biggest magnet had the
  // LOWEST centrality, so penalizing centrality would invert (see retrieval_magnet_diagnostic.md).
  enable_mmr_diversity: true,
  mmr_lambda: 0.7, // weight on relevance vs. diversity in MMR (1 = pure relevance)
} as const;

export type RetrievalConfig = typeof RETRIEVAL_CONFIG;
