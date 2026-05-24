// Component 6 §9 scoring weights. Externalized so they can be tuned without code changes.
// Treat as initial config; calibrate against the evaluation set.

export type MvpState =
  | "direction-collapse"
  | "engagement-drought"
  | "inaction-loop";

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
};

// Boost weights for resonance_source = "inferred" or "default" (Component 6 §9).
// Strong-resonance weights (explicit/learned) are not used at MVP since we only
// have inferred/default signals.
export const RETRIEVAL_CONFIG = {
  // Resonance (default profile)
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
  // User-language resonance hint boost (Phase 4 fix #2) — light intake-inferred
  // resonance signal per Component 3 §6.5. Smaller than default-profile match
  // because it's noisier and shouldn't override a clear default.
  boost_inferred_insight_type_match: 0.03,
  boost_inferred_voice_register_match: 0.03,
} as const;

export type RetrievalConfig = typeof RETRIEVAL_CONFIG;
