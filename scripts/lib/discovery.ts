/**
 * discovery.ts — Shared contract for the SIO Discovery Agent.
 *
 * This is the single source of truth that every discovery script imports:
 *   - the Candidate schema + status vocabulary
 *   - controlled vocabularies (states / insight_type / voice_register / intensity)
 *   - scoring weights + thresholds + the overall-score aggregation
 *   - candidate YAML IO (load / save / list)
 *   - a lightweight SIO frontmatter reader (for gap detection, verify, draft)
 *
 * HONESTY INVARIANTS (enforced by the scripts that use this lib):
 *   - Drafts are written to corpus/drafts/, NEVER corpus/sios/.
 *   - transcript_verified stays false and human_review_status stays prototype_only/needs_review
 *     unless a human supplies verbatim evidence.
 *   - No script ever fabricates a quote, timestamp, video_id, URL, or official-channel claim.
 *   - When evidence is missing, the honest status is needs_review.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { load as parseYaml, dump as dumpYaml } from "js-yaml";

export const ROOT = process.cwd();
export const SIOS_DIR = join(ROOT, "corpus", "sios");
export const SOURCES_DIR = join(ROOT, "corpus", "sources");
export const CANDIDATES_DIR = join(ROOT, "corpus", "candidates");
export const DRAFTS_DIR = join(ROOT, "corpus", "drafts");
export const GUIDES_DIR = join(ROOT, "ai", "guides");

// ── Controlled vocabularies (MVP) ───────────────────────────────────────────
// As of the Expanded Six-State Corpus Buildout (2026-05-26) this covers all 6 User Problem
// Model states (the name is kept for backward-compat). The first three are the validated MVP
// wedge; comment out the last three to pin discovery/gap-detection back to MVP-3.
export const MVP_STATES = [
  "direction-collapse",
  "engagement-drought",
  "inaction-loop",
  "possibility-paralysis",
  "identity-transition",
  "momentum-gap",
] as const;
export type MvpState = (typeof MVP_STATES)[number];

export const INSIGHT_TYPES = ["reframe", "permission", "mechanism", "story"] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

export const VOICE_REGISTERS = [
  "direct/challenging",
  "warm/affirming",
  "intellectual/measured",
  "vulnerable/personal",
  "expert/scientific",
] as const;
export type VoiceRegister = (typeof VOICE_REGISTERS)[number];

export const INTENSITIES = ["mild", "moderate", "intense"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const QUOTE_TYPES = ["verbatim", "paraphrase", "unknown"] as const;
export type QuoteType = (typeof QUOTE_TYPES)[number];

// Loader-served review statuses (must match src/rag/sioLoader.ts allowlist).
export const SIO_REVIEW_STATUSES = ["approved", "prototype_only", "needs_review"] as const;

// ── Candidate lifecycle ──────────────────────────────────────────────────────
export const CANDIDATE_STATUSES = [
  "proposed",
  "needs_source_verification",
  "needs_transcript_verification",
  "needs_quote_review",
  "ready_for_sio_draft",
  "drafted",
  "approved",
  "rejected",
  "archived",
  // Verified + high-scoring, but found to be a retrieval MAGNET (would dominate its state and
  // collapse within-state diversity). NOT served. Held pending diversity-aware retrieval. Caught
  // by scripts/test-magnet-risk.ts. (magnet/diversity-fix phase.)
  "held_for_retrieval_risk",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "verified",
  "needs_review",
  "unverified",
  "unofficial",
  "not_applicable",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// ── Scoring contract (shared by evaluate / novelty / review / draft) ──────────
// All component scores are 0–100. Human Resonance dominates the blend — that is
// the deliberate differentiator from generic relevance-only RAG.
export const SCORE_WEIGHTS = {
  human_resonance: 0.4,
  quote_quality: 0.2,
  gap_fit: 0.15,
  novelty: 0.15,
  source_credibility: 0.1,
} as const;

// The 10 Human Resonance dimensions (each scored 1–5 by the evaluator).
export const RESONANCE_DIMENSIONS = [
  "state_specificity",
  "felt_recognition",
  "emotional_precision",
  "reframe_power",
  "permission_relief",
  "actionability",
  "human_credibility",
  "source_vividness",
  "non_genericness",
  "voice_register_clarity",
] as const;
export type ResonanceDimension = (typeof RESONANCE_DIMENSIONS)[number];

// Recommendation gates on the OVERALL score.
export const SCORE_THRESHOLDS = {
  reject_below: 45, // < 45 → reject
  promising_at: 65, // 65–74 → promising (needs evidence to advance)
  draft_ready_at: 75, // >= 75 AND evidence satisfied → ready_for_sio_draft
} as const;

// Anti-generic hard gate: if either of these dimensions is <= this floor, the
// candidate is capped/rejected regardless of other scores. A quote that isn't
// state-specific or that reads like a generic motivational post is not an SIO.
export const ANTI_GENERIC_FLOOR = 2; // on the 1–5 dimension scale
export const ANTI_GENERIC_DIMENSIONS: ResonanceDimension[] = [
  "non_genericness",
  "state_specificity",
];

// Calibration guard (Phase K). When the candidate has no VERIFIED VERBATIM excerpt, the
// evaluator is scoring the reviewer's paraphrase/summary — the reviewer's words, not the
// speaker's actual moment. LLM judges score polished summaries too generously (observed:
// a clean paraphrase scoring 100/100). Until a verbatim quote is verified, cap the resonance
// score so an unverified candidate cannot display as a flawless SIO. The recommendation gate
// still independently blocks drafting until evidence exists.
export const UNVERIFIED_RESONANCE_CAP = 85;
export function applyVerificationCap(resonance: number, verbatimVerified: boolean): number {
  return verbatimVerified ? resonance : Math.min(resonance, UNVERIFIED_RESONANCE_CAP);
}

export type Recommendation =
  | "reject"
  | "needs_stronger_source"
  | "needs_transcript_verification"
  | "promising"
  | "ready_for_sio_draft";

export interface ResonanceBreakdown {
  // 1–5 per dimension, plus the evidence phrase that justifies each score.
  scores: Partial<Record<ResonanceDimension, number>>;
  evidence: Partial<Record<ResonanceDimension, string>>;
  why_it_might_land?: string;
  why_it_might_not_land?: string;
}

export interface CandidateScores {
  human_resonance_score?: number | null;
  quote_quality_score?: number | null;
  source_credibility_score?: number | null;
  gap_fit_score?: number | null;
  novelty_score?: number | null;
  overall_candidate_score?: number | null;
}

// ── Candidate object ──────────────────────────────────────────────────────────
export interface Candidate extends CandidateScores {
  candidate_id: string;
  candidate_status: CandidateStatus;

  // Targeting (what gap this is meant to fill)
  target_state: string;
  target_gap: string;
  proposed_insight_type: string;
  proposed_voice_register: string;
  proposed_intensity_level: string;

  // Source identity
  source_title: string;
  source_url: string;
  source_platform: string;
  speaker: string;
  guest_if_applicable?: string;
  official_channel_url?: string;
  video_url?: string;
  embed_url?: string;
  transcript_url?: string;

  // The moment
  timestamp_start_seconds?: number | null;
  timestamp_end_seconds?: number | null;
  transcript_excerpt?: string;
  quote_type: QuoteType;
  candidate_moment_summary?: string;
  key_claim?: string;

  // Editorial / resonance notes
  why_it_might_land?: string;
  user_problem_match_notes?: string;
  resonance_match_notes?: string;
  source_credibility_notes?: string;

  // Verification (honest, evidence-gated)
  media_verification_status?: VerificationStatus | "";
  transcript_verification_status?: VerificationStatus | "";

  // Optional detailed evaluator output
  resonance_breakdown?: ResonanceBreakdown;
  novelty_nearest?: Array<{ insight_id: string; similarity: number }>;
  novelty_rating?: "duplicate" | "similar_but_useful" | "novel";
  recommendation?: Recommendation;

  human_review_notes?: string;
  created_at: string;
  updated_at: string;

  // tolerate forward-compatible extra keys
  [k: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function nowIso(): string {
  return new Date().toISOString();
}

export function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Clamp + round a 0–100 score. */
export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Convert a 1–5 dimension sum to a 0–100 score. dims = number of dimensions. */
export function dimsToScore(sum: number, dims: number): number {
  if (dims <= 0) return 0;
  // 1–5 scale → min possible = dims*1, max = dims*5. Normalize to 0–100.
  const min = dims * 1;
  const max = dims * 5;
  return clampScore(((sum - min) / (max - min)) * 100);
}

/** Weighted overall score from component scores. Missing components are dropped
 *  and the remaining weights renormalized, so a partial candidate still scores. */
export function aggregateOverall(s: CandidateScores): number | null {
  const parts: Array<[number, number]> = [];
  const push = (val: number | null | undefined, w: number) => {
    if (typeof val === "number" && !Number.isNaN(val)) parts.push([val, w]);
  };
  push(s.human_resonance_score, SCORE_WEIGHTS.human_resonance);
  push(s.quote_quality_score, SCORE_WEIGHTS.quote_quality);
  push(s.gap_fit_score, SCORE_WEIGHTS.gap_fit);
  push(s.novelty_score, SCORE_WEIGHTS.novelty);
  push(s.source_credibility_score, SCORE_WEIGHTS.source_credibility);
  if (parts.length === 0) return null;
  const wSum = parts.reduce((a, [, w]) => a + w, 0);
  const weighted = parts.reduce((a, [v, w]) => a + v * w, 0);
  return clampScore(weighted / wSum);
}

/** Map an overall score (+ evidence flags) to a recommendation. */
export function recommendationFor(opts: {
  overall: number | null;
  antiGenericTriggered?: boolean;
  sourceVerified?: boolean;
  transcriptVerified?: boolean;
}): Recommendation {
  if (opts.antiGenericTriggered) return "reject";
  const o = opts.overall ?? 0;
  if (o < SCORE_THRESHOLDS.reject_below) return "reject";
  if (o < SCORE_THRESHOLDS.promising_at) return "needs_stronger_source";
  // Strong enough on content; gate the final step on evidence.
  if (o >= SCORE_THRESHOLDS.draft_ready_at) {
    if (!opts.sourceVerified) return "needs_stronger_source";
    if (!opts.transcriptVerified) return "needs_transcript_verification";
    return "ready_for_sio_draft";
  }
  return "promising";
}

// ── Candidate IO ────────────────────────────────────────────────────────────
function splitFrontmatterDoc(raw: string): Record<string, unknown> {
  // Candidate files are pure YAML (optionally fenced with --- ... ---).
  const trimmed = raw.trim();
  let body = trimmed;
  if (trimmed.startsWith("---")) {
    const end = trimmed.indexOf("\n---", 3);
    if (end !== -1) body = trimmed.slice(3, end).trim();
    else body = trimmed.replace(/^---\s*/, "");
  }
  const parsed = parseYaml(body);
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
}

export function listCandidateFiles(): string[] {
  if (!existsSync(CANDIDATES_DIR)) return [];
  return readdirSync(CANDIDATES_DIR)
    .filter((f) => (f.endsWith(".yaml") || f.endsWith(".yml")) && !f.startsWith("_") && f !== "candidate_template.yaml")
    .sort();
}

export function loadCandidateFromPath(path: string): Candidate {
  const raw = readFileSync(path, "utf-8");
  const obj = splitFrontmatterDoc(raw) as Partial<Candidate>;
  return obj as Candidate;
}

export function loadAllCandidates(): Array<{ file: string; path: string; candidate: Candidate }> {
  return listCandidateFiles().map((file) => {
    const path = join(CANDIDATES_DIR, file);
    return { file, path, candidate: loadCandidateFromPath(path) };
  });
}

export function saveCandidate(path: string, c: Candidate): void {
  c.updated_at = nowIso();
  const yaml = dumpYaml(c, { lineWidth: 100, noRefs: true });
  writeFileSync(path, yaml, "utf-8");
}

// ── Lightweight SIO frontmatter reader (no embeddings) ────────────────────────
export interface SioMeta {
  file: string;
  insight_id: string;
  source_id: string;
  speaker: string;
  primary_state_tag: string;
  secondary_state_tags: string[];
  direction_collapse_variant: string;
  insight_type: string;
  voice_register: string;
  credibility_tier: string;
  intensity_level: string;
  source_type: string;
  source_media_type: string;
  video_provider: string;
  embed_url: string;
  display_mode: string;
  media_available: unknown;
  media_verification_status: string;
  transcript_verified: unknown;
  human_review_status: string;
  tagger_confidence: string;
  key_claim: string;
  content_summary: string;
  raw: Record<string, unknown>;
}

function parseSioFrontmatter(raw: string): Record<string, unknown> {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const parsed = parseYaml(raw.slice(3, end).trim());
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
}

export function loadSioMetas(): SioMeta[] {
  if (!existsSync(SIOS_DIR)) return [];
  const out: SioMeta[] = [];
  for (const file of readdirSync(SIOS_DIR).filter((f) => f.endsWith(".md")).sort()) {
    const fm = parseSioFrontmatter(readFileSync(join(SIOS_DIR, file), "utf-8"));
    if (!str(fm.insight_id)) continue;
    const secondary = Array.isArray(fm.secondary_state_tags)
      ? fm.secondary_state_tags.map(String)
      : [];
    out.push({
      file,
      insight_id: str(fm.insight_id),
      source_id: str(fm.source_id),
      speaker: str(fm.speaker),
      primary_state_tag: str(fm.primary_state_tag),
      secondary_state_tags: secondary,
      direction_collapse_variant: str(fm.direction_collapse_variant),
      insight_type: str(fm.insight_type),
      voice_register: str(fm.voice_register),
      credibility_tier: str(fm.credibility_tier),
      intensity_level: str(fm.intensity_level),
      source_type: str(fm.source_type),
      source_media_type: str(fm.source_media_type),
      video_provider: str(fm.video_provider),
      embed_url: str(fm.embed_url),
      display_mode: str(fm.display_mode),
      media_available: fm.media_available ?? null,
      media_verification_status: str(fm.media_verification_status),
      transcript_verified: fm.transcript_verified ?? null,
      human_review_status: str(fm.human_review_status),
      tagger_confidence: str(fm.tagger_confidence),
      key_claim: str(fm.key_claim),
      content_summary: str(fm.content_summary),
      raw: fm,
    });
  }
  return out;
}

/** Count occurrences of a string key across a list. */
export function tally<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it) || "(unset)";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
