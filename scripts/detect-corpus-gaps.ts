/**
 * detect-corpus-gaps.ts — Component 1: Gap Analyst.
 *
 * Reads corpus/sios/, reports the corpus distribution across every dimension, and
 * ranks the highest-priority gaps as concrete *target candidate profiles* the Source
 * Scout can act on (e.g. "engagement-drought + permission + warm/affirming + mild").
 *
 * Deterministic. No LLM, no network. Output: console + JSON (stdout) + markdown report
 * at ai/guides/corpus_gap_detection_report.md.
 *
 * Run: npm run detect-gaps
 */

import { writeFileSync } from "fs";
import { join } from "path";
import {
  GUIDES_DIR,
  INSIGHT_TYPES,
  INTENSITIES,
  MVP_STATES,
  VOICE_REGISTERS,
  loadSioMetas,
  tally,
  type SioMeta,
} from "./lib/discovery";

const REPORT_PATH = join(GUIDES_DIR, "corpus_gap_detection_report.md");

// Soft MVP targets used to flag "thin" coverage.
const TARGETS = {
  minPerState: 5, // a state with < this is thin
  minPerStateType: 1, // each (state × insight_type) should have >= 1
  minPerRegisterGlobal: 3, // each voice_register should have >= 3 across the corpus
  minIntenseGlobal: 2, // 'intense' intensity is chronically thin
  minTier3Global: 3, // research-grounded coverage
  concentrationLimit: 3, // max SIOs per speaker per state (Component 5)
  maxReconstructedPct: 60, // if > this % are transcript_verified=false, flag
  minVerifiedVideo: 8, // want a healthy set of video-ready SIOs
  overrepresentationMargin: 2, // a state exceeding the smallest state by > this is over-filled
};

interface Gap {
  priority: number; // higher = more urgent
  kind: string;
  detail: string;
  target_profile?: string;
}

function isVerified(v: unknown): boolean {
  return v === true || v === "true";
}

function main() {
  const sios = loadSioMetas();
  const n = sios.length;

  const byState = tally(sios, (s) => s.primary_state_tag);
  const byType = tally(sios, (s) => s.insight_type);
  const byRegister = tally(sios, (s) => s.voice_register);
  const byTier = tally(sios, (s) => s.credibility_tier);
  const byIntensity = tally(sios, (s) => s.intensity_level);
  const bySpeaker = tally(sios, (s) => s.speaker);
  const byReviewStatus = tally(sios, (s) => s.human_review_status);
  const byMediaStatus = tally(sios, (s) => s.media_verification_status);
  const byDisplayMode = tally(sios, (s) => s.display_mode);
  const bySourceType = tally(sios, (s) => s.source_type);

  const secondaryTally: Record<string, number> = {};
  for (const s of sios)
    for (const t of s.secondary_state_tags)
      secondaryTally[t] = (secondaryTally[t] ?? 0) + 1;

  const reconstructed = sios.filter((s) => !isVerified(s.transcript_verified)).length;
  const verifiedTranscripts = n - reconstructed;
  const verifiedVideo = sios.filter((s) => s.media_verification_status === "verified").length;

  // state × type matrix
  const stateTypeCount: Record<string, number> = {};
  for (const st of MVP_STATES)
    for (const ty of INSIGHT_TYPES) stateTypeCount[`${st}|${ty}`] = 0;
  for (const s of sios) {
    const k = `${s.primary_state_tag}|${s.insight_type}`;
    if (k in stateTypeCount) stateTypeCount[k]++;
  }
  // state × register matrix
  const stateRegCount: Record<string, number> = {};
  for (const st of MVP_STATES)
    for (const r of VOICE_REGISTERS) stateRegCount[`${st}|${r}`] = 0;
  for (const s of sios) {
    const k = `${s.primary_state_tag}|${s.voice_register}`;
    if (k in stateRegCount) stateRegCount[k]++;
  }
  // speaker × state concentration
  const concentration: Record<string, number> = {};
  for (const s of sios) {
    const k = `${s.speaker}|${s.primary_state_tag}`;
    concentration[k] = (concentration[k] ?? 0) + 1;
  }

  // ── Detect gaps ──
  const gaps: Gap[] = [];

  // Missing (state × insight_type) combos — highest priority (a whole resonance lane absent).
  for (const st of MVP_STATES)
    for (const ty of INSIGHT_TYPES) {
      const c = stateTypeCount[`${st}|${ty}`];
      if (c < TARGETS.minPerStateType) {
        gaps.push({
          priority: 100,
          kind: "missing_state_type",
          detail: `No ${ty} SIO for ${st} (0).`,
          target_profile: `${st} + ${ty}`,
        });
      }
    }

  // Empty (state × register) cells — a tone the state cannot serve at all.
  for (const st of MVP_STATES)
    for (const r of VOICE_REGISTERS) {
      const c = stateRegCount[`${st}|${r}`];
      if (c === 0) {
        gaps.push({
          priority: 80,
          kind: "empty_state_register",
          detail: `${st} has no ${r} SIO.`,
          target_profile: `${st} + ${r}`,
        });
      }
    }

  // Thin states.
  for (const st of MVP_STATES) {
    const c = byState[st] ?? 0;
    if (c < TARGETS.minPerState) {
      gaps.push({
        priority: 70,
        kind: "thin_state",
        detail: `${st} has only ${c} SIO(s) (< ${TARGETS.minPerState}).`,
        target_profile: `${st} + (any under-covered type/register)`,
      });
    }
  }

  // ── Corpus-imbalance guardrails (magnet/diversity-fix phase) ──
  // A state that is over-filled relative to the smallest state both wastes effort and raises
  // magnet risk (more same-state SIOs competing → one broad SIO can dominate). Warn + steer the
  // NEXT batch toward the under-represented states (don't add more of the over-filled one).
  const stateCounts = MVP_STATES.map((st) => ({ st, n: byState[st] ?? 0 }));
  const maxState = stateCounts.reduce((a, b) => (b.n > a.n ? b : a));
  const minState = stateCounts.reduce((a, b) => (b.n < a.n ? b : a));
  if (maxState.n - minState.n > TARGETS.overrepresentationMargin) {
    const underStates = stateCounts.filter((s) => s.n <= minState.n + 1).map((s) => s.st);
    gaps.push({
      priority: 65,
      kind: "state_overrepresented",
      detail: `${maxState.st} has ${maxState.n} SIOs vs the smallest state ${minState.st} (${minState.n}) — gap ${maxState.n - minState.n} > ${TARGETS.overrepresentationMargin}. Do NOT add more ${maxState.st} SIOs unless exceptional; prioritize verified SIOs in under-represented states: ${underStates.join(", ")}.`,
      target_profile: `${underStates[0]} + (fill empty register/type cells first)`,
    });
  }

  // Global register floors.
  for (const r of VOICE_REGISTERS) {
    const c = byRegister[r] ?? 0;
    if (c < TARGETS.minPerRegisterGlobal) {
      gaps.push({
        priority: 60,
        kind: "thin_register_global",
        detail: `voice_register "${r}" has only ${c} across the corpus (< ${TARGETS.minPerRegisterGlobal}).`,
        target_profile: `(thinnest state) + ${r}`,
      });
    }
  }

  // Intensity (intense is chronically thin).
  const intenseC = byIntensity["intense"] ?? 0;
  if (intenseC < TARGETS.minIntenseGlobal) {
    gaps.push({
      priority: 55,
      kind: "thin_intensity",
      detail: `Only ${intenseC} 'intense' SIO(s) (< ${TARGETS.minIntenseGlobal}). The corpus can't serve users who want a hard push outside one speaker.`,
      target_profile: `inaction-loop + direct/challenging + intense (or a state lacking intense)`,
    });
  }

  // tier-3 (research-grounded).
  const tier3C = byTier["tier-3"] ?? 0;
  if (tier3C < TARGETS.minTier3Global) {
    gaps.push({
      priority: 45,
      kind: "thin_tier3",
      detail: `Only ${tier3C} tier-3 (research-grounded) SIO(s) (< ${TARGETS.minTier3Global}).`,
      target_profile: `(any state) + mechanism + expert/scientific (tier-3)`,
    });
  }

  // Concentration risk.
  for (const [k, c] of Object.entries(concentration)) {
    if (c >= TARGETS.concentrationLimit) {
      const [sp, st] = k.split("|");
      gaps.push({
        priority: c > TARGETS.concentrationLimit ? 90 : 30,
        kind: c > TARGETS.concentrationLimit ? "concentration_violation" : "concentration_at_limit",
        detail: `${sp} has ${c} SIO(s) in ${st} (limit ${TARGETS.concentrationLimit}).`,
      });
    }
  }

  // Too many reconstructions.
  const reconPct = n ? Math.round((reconstructed / n) * 100) : 0;
  if (reconPct > TARGETS.maxReconstructedPct) {
    gaps.push({
      priority: 50,
      kind: "too_many_reconstructed",
      detail: `${reconstructed}/${n} (${reconPct}%) SIOs are transcript_verified=false (reconstructions). Verbatim verification is the trust priority.`,
    });
  }

  // Too few verified-video SIOs.
  if (verifiedVideo < TARGETS.minVerifiedVideo) {
    gaps.push({
      priority: 35,
      kind: "thin_verified_video",
      detail: `Only ${verifiedVideo} SIO(s) have media_verification_status=verified (want >= ${TARGETS.minVerifiedVideo}).`,
    });
  }

  gaps.sort((a, b) => b.priority - a.priority);

  // ── Output: JSON to stdout ──
  const json = {
    generated_at: new Date().toISOString(),
    total_sios: n,
    distributions: {
      by_state: byState,
      by_secondary_state: secondaryTally,
      by_insight_type: byType,
      by_voice_register: byRegister,
      by_credibility_tier: byTier,
      by_intensity: byIntensity,
      by_speaker: bySpeaker,
      by_review_status: byReviewStatus,
      by_media_verification_status: byMediaStatus,
      by_display_mode: byDisplayMode,
      by_source_type: bySourceType,
    },
    transcript_verified_true: verifiedTranscripts,
    transcript_verified_false: reconstructed,
    verified_video: verifiedVideo,
    state_type_matrix: stateTypeCount,
    state_register_matrix: stateRegCount,
    ranked_gaps: gaps,
    top_target_profiles: gaps.filter((g) => g.target_profile).slice(0, 6).map((g) => g.target_profile),
  };
  console.log(JSON.stringify(json, null, 2));

  // ── Output: markdown report ──
  writeFileSync(REPORT_PATH, renderMarkdown(json, sios) + "\n", "utf-8");
  console.error(`\n[detect-gaps] total=${n} reconstructed=${reconstructed} verified_video=${verifiedVideo} gaps=${gaps.length}`);
  console.error(`[detect-gaps] wrote markdown report → ${REPORT_PATH}`);
  console.error(`[detect-gaps] TOP TARGET PROFILES: ${json.top_target_profiles.join(" | ") || "(none — corpus well covered)"}`);
}

function table(title: string, counts: Record<string, number>): string[] {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const out = [`**${title}**`, "", "| value | count |", "|---|---|"];
  for (const [k, v] of rows) out.push(`| ${k} | ${v} |`);
  out.push("");
  return out;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderMarkdown(json: any, _sios: SioMeta[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const L: string[] = [];
  L.push(`# Corpus Gap Detection Report`);
  L.push("");
  L.push(`_Generated by \`scripts/detect-corpus-gaps.ts\` on ${now}. Deterministic — counts only._`);
  L.push("");
  L.push(`**Total SIOs:** ${json.total_sios}  ·  **Verbatim-verified:** ${json.transcript_verified_true}  ·  **Reconstructions:** ${json.transcript_verified_false}  ·  **Verified video:** ${json.verified_video}`);
  L.push("");

  L.push(`## Top target candidate profiles (what to source next)`);
  L.push("");
  if (json.top_target_profiles.length === 0) L.push("_Corpus is well-covered on the measured dimensions._");
  for (const p of json.top_target_profiles) L.push(`- \`${p}\``);
  L.push("");

  L.push(`## Ranked gaps`);
  L.push("");
  L.push(`| priority | kind | detail |`);
  L.push(`|---|---|---|`);
  for (const g of json.ranked_gaps) L.push(`| ${g.priority} | ${g.kind} | ${g.detail} |`);
  L.push("");

  L.push(`## Distributions`);
  L.push("");
  L.push(...table("By state", json.distributions.by_state));
  L.push(...table("By insight_type", json.distributions.by_insight_type));
  L.push(...table("By voice_register", json.distributions.by_voice_register));
  L.push(...table("By credibility_tier", json.distributions.by_credibility_tier));
  L.push(...table("By intensity", json.distributions.by_intensity));
  L.push(...table("By review status", json.distributions.by_review_status));
  L.push(...table("By media verification status", json.distributions.by_media_verification_status));
  L.push(...table("By display mode", json.distributions.by_display_mode));

  L.push(`## State × insight_type matrix`);
  L.push("");
  L.push(`| state \\ type | ${INSIGHT_TYPES.join(" | ")} |`);
  L.push(`|---|${INSIGHT_TYPES.map(() => "---").join("|")}|`);
  for (const st of MVP_STATES) {
    const cells = INSIGHT_TYPES.map((ty) => {
      const c = json.state_type_matrix[`${st}|${ty}`] ?? 0;
      return c === 0 ? "**0**" : String(c);
    });
    L.push(`| ${st} | ${cells.join(" | ")} |`);
  }
  L.push("");

  L.push(`## State × voice_register matrix`);
  L.push("");
  L.push(`| state \\ register | ${VOICE_REGISTERS.join(" | ")} |`);
  L.push(`|---|${VOICE_REGISTERS.map(() => "---").join("|")}|`);
  for (const st of MVP_STATES) {
    const cells = VOICE_REGISTERS.map((r) => {
      const c = json.state_register_matrix[`${st}|${r}`] ?? 0;
      return c === 0 ? "**0**" : String(c);
    });
    L.push(`| ${st} | ${cells.join(" | ")} |`);
  }
  L.push("");

  return L.join("\n");
}

main();
