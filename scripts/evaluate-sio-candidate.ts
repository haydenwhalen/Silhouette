/**
 * evaluate-sio-candidate.ts — Human Resonance Evaluator
 *
 * LLM-as-judge with a strict, evidence-anchored, anti-generic rubric.
 * Scores each of the 10 resonance dimensions (1–5) plus produces mapped
 * insight metadata, then computes component scores and a recommendation.
 *
 * Usage:
 *   npx tsx scripts/evaluate-sio-candidate.ts <path/to/candidate.yaml>
 *   npx tsx scripts/evaluate-sio-candidate.ts --text "Never give up, believe in yourself"
 *   npx tsx scripts/evaluate-sio-candidate.ts <path> --no-write
 */

import "dotenv/config";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { requireKey } from "../src/lib/config";
import {
  loadCandidateFromPath,
  saveCandidate,
  RESONANCE_DIMENSIONS,
  ANTI_GENERIC_DIMENSIONS,
  ANTI_GENERIC_FLOOR,
  SCORE_WEIGHTS,
  dimsToScore,
  aggregateOverall,
  recommendationFor,
  applyVerificationCap,
  UNVERIFIED_RESONANCE_CAP,
  nowIso,
  str,
  type Candidate,
  type ResonanceBreakdown,
} from "./lib/discovery";

// ── Zod schema for LLM structured output ─────────────────────────────────────

const DimScore = z.object({
  score: z.number().int().min(1).max(5),
  evidence: z.string().min(1),
});

const evaluationSchema = z.object({
  // 10 resonance dimensions
  state_specificity: DimScore,
  felt_recognition: DimScore,
  emotional_precision: DimScore,
  reframe_power: DimScore,
  permission_relief: DimScore,
  actionability: DimScore,
  human_credibility: DimScore,
  source_vividness: DimScore,
  non_genericness: DimScore,
  voice_register_clarity: DimScore,
  // Holistic notes
  why_it_might_land: z.string(),
  why_it_might_not_land: z.string(),
  // Detected mappings (what the LLM judges the content to actually be)
  detected_state: z.enum([
    "direction-collapse",
    "engagement-drought",
    "inaction-loop",
    "unknown",
  ]),
  detected_insight_type: z.enum(["reframe", "permission", "mechanism", "story", "unknown"]),
  detected_voice_register: z.enum([
    "direct/challenging",
    "warm/affirming",
    "intellectual/measured",
    "vulnerable/personal",
    "expert/scientific",
    "unknown",
  ]),
  detected_intensity: z.enum(["mild", "moderate", "intense", "unknown"]),
  // Gap-fit: how well detected mappings match proposed_* fields (1–5)
  gap_fit_raw: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      "1–5: how well the content's actual state/type/register matches what was declared in proposed_* fields"
    ),
});

type EvaluationResult = z.infer<typeof evaluationSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a strict, evidence-anchored resonance evaluator for Silhouette — a retrieval engine that surfaces ONE insight at a time to a young professional (22–32) who feels stuck.

Your job is to rate how likely this candidate insight is to create a genuine moment of resonance — NOT to be generous, NOT to encourage. Be honest. Be specific. Be strict.

## The Silhouette Standard
Silhouette's only differentiator is human resonance. The content must feel alive, specific, and human. It must speak to a real psychological stuck state. Generic motivational content actively harms trust.

## The 3 Stuck States
- **direction-collapse**: Lost the sense of what they're building toward. Core question: "What do I want?"
- **engagement-drought**: Still has a target but lost feeling for it. Core question: "Why don't I care anymore?"
- **inaction-loop**: Knows what to do but can't do it. Core question: "Why do I keep not doing this?"

## Scoring: 10 Dimensions (each 1–5)

For EACH dimension provide: a score (1–5 integer) AND an evidence string (quote the specific phrase or name the specific aspect that justifies the score — no vague summaries).

**1. state_specificity** — Does this clearly speak to ONE stuck state?
- 1: Could apply to any state, or to anyone having a bad day
- 3: Leans toward one state but language is still general
- 5: Unmistakably addresses ONE specific stuck state; you could name which one

**2. felt_recognition** — Would the target user think "that's exactly what I'm feeling"?
- 1: User would nod politely and move on — nothing landed
- 3: Resonant but missing the precise inner experience
- 5: User feels seen in a way they haven't articulated themselves

**3. emotional_precision** — Does it name the emotion UNDERNEATH the surface complaint?
- 1: Names the surface ("feeling stuck") without going deeper
- 3: Gets one layer down but stops short of the precise feeling
- 5: Names the specific feeling most people suppress or can't articulate

**4. reframe_power** — Does it change how the user sees their situation?
- 1: Confirms what they already think (or says nothing new)
- 3: Introduces a slight angle shift, still stays close to the obvious
- 5: Fundamentally reorients how the user sees the situation

**5. permission_relief** — Does it reduce shame, self-blame, or self-pressure (where relevant)?
- 1: Adds pressure or is morally neutral
- 3: Implies relief but doesn't grant it clearly
- 5: Explicitly removes a layer of self-blame or pressure the user was carrying

**6. actionability** — Does it imply a small next step or reflection (not a 10-step plan)?
- 1: Vague or implies a massive overhaul
- 3: Points vaguely in a direction
- 5: Implies one small, specific shift in thinking or action

**7. human_credibility** — Is the speaker credible for THIS specific insight?
- 1: Unknown, unattributed, or their credibility is irrelevant to this claim
- 3: Credible in general but the connection to this claim is loose
- 5: This person's specific background or lived experience makes THIS claim credible

**8. source_vividness** — Does it feel alive, specific, human — not bland or produced?
- 1: Corporate tone, motivational poster, AI-sounding, or lifeless
- 3: Human but flat — the personality of the source does not come through
- 5: You can hear a specific human voice; it feels observed, not manufactured

**9. non_genericness** — Could this NOT be a generic motivational Instagram post?
- 1: This exact phrase already exists on a thousand motivational pages
- 2: Barely distinguishable from generic content
- 3: Specific enough to avoid being generic, not specific enough to be unmistakable
- 4: Clearly from a specific person/framework; unlikely to be misattributed
- 5: So specific, so human, so particular — it could not have come from anywhere else

**ANTI-GENERIC RULE**: If non_genericness OR state_specificity is 1 or 2, the candidate fails the Silhouette bar regardless of other scores. Be honest about this.

**10. voice_register_clarity** — Is the voice register clear and consistent?
- 1: Register is mixed, unclear, or shifts within the content
- 3: Leans toward one register but has ambiguous moments
- 5: Unmistakably one register throughout (warm/affirming, direct/challenging, intellectual/measured, vulnerable/personal, or expert/scientific)

## gap_fit_raw (1–5)
Compare the detected state/type/register to the proposed_* fields. Score 5 if they match, 3 if partially, 1 if they substantially diverge.

## Instructions
- EVIDENCE IS REQUIRED. Every score must quote a specific phrase or name a specific feature. "Generic" is not evidence. "No specific person named" is evidence.
- Be strict. A 4 is strong. A 5 is rare. Do not give 5s out of politeness.
- Score non_genericness 1 if this could be posted on a generic motivational page without attribution.
- why_it_might_land and why_it_might_not_land: one specific sentence each, about this specific content.`;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const noWrite = args.includes("--no-write");
  const textIdx = args.indexOf("--text");

  let candidate: Candidate;
  let candidatePath: string | null = null;

  if (textIdx !== -1) {
    // Raw text mode — build a minimal candidate
    const rawText = args[textIdx + 1];
    if (!rawText) {
      console.error("--text requires a quoted string argument");
      process.exit(1);
    }
    candidate = {
      candidate_id: "cli-text-input",
      candidate_status: "proposed",
      target_state: "unknown",
      target_gap: "",
      proposed_insight_type: "unknown",
      proposed_voice_register: "unknown",
      proposed_intensity_level: "unknown",
      source_title: "(CLI raw text)",
      source_url: "",
      source_platform: "",
      speaker: "(unknown)",
      quote_type: "unknown",
      key_claim: rawText,
      candidate_moment_summary: rawText,
      transcript_excerpt: "",
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  } else {
    const filePath = args.find((a) => !a.startsWith("--"));
    if (!filePath) {
      console.error(
        "Usage: npx tsx scripts/evaluate-sio-candidate.ts <path> [--no-write]\n" +
          "       npx tsx scripts/evaluate-sio-candidate.ts --text \"...\""
      );
      process.exit(1);
    }
    candidatePath = filePath;
    candidate = loadCandidateFromPath(filePath);
  }

  // Build the text to judge
  const textParts = [
    str(candidate.key_claim),
    str(candidate.candidate_moment_summary),
    str(candidate.transcript_excerpt),
  ].filter(Boolean);

  if (textParts.length === 0) {
    console.error("Candidate has no key_claim, candidate_moment_summary, or transcript_excerpt.");
    process.exit(1);
  }

  const textToJudge = textParts.join("\n\n");
  const context = [
    `target_state: ${str(candidate.target_state)}`,
    `proposed_insight_type: ${str(candidate.proposed_insight_type)}`,
    `proposed_voice_register: ${str(candidate.proposed_voice_register)}`,
    `proposed_intensity_level: ${str(candidate.proposed_intensity_level)}`,
    `speaker: ${str(candidate.speaker)}`,
    `source_title: ${str(candidate.source_title)}`,
    `source_credibility_notes: ${str(candidate.source_credibility_notes)}`,
  ]
    .filter((l) => !l.endsWith(": "))
    .join("\n");

  const userMessage = `CANDIDATE CONTEXT:\n${context}\n\nCONTENT TO EVALUATE:\n${textToJudge}`;

  // LLM call
  const llm = new ChatOpenAI({
    openAIApiKey: requireKey("openaiApiKey"),
    modelName: "gpt-4o-mini",
    temperature: 0,
  }).withStructuredOutput(evaluationSchema, { name: "evaluate_candidate" });

  console.log(`\nEvaluating: ${str(candidate.candidate_id)} …\n`);

  let result: EvaluationResult;
  try {
    result = await llm.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);
  } catch (err) {
    console.error("LLM call failed:", err);
    process.exit(1);
  }

  // ── Compute scores ──────────────────────────────────────────────────────────

  // Human resonance: sum of all 10 dimension scores → 0–100
  const dimScores = RESONANCE_DIMENSIONS.map((d) => (result[d] as { score: number }).score);
  const dimSum = dimScores.reduce((a, b) => a + b, 0);
  const rawResonanceScore = dimsToScore(dimSum, 10);
  // Calibration guard: cap the resonance score unless a VERIFIED VERBATIM excerpt exists,
  // because otherwise we're scoring the reviewer's paraphrase, not the speaker's moment.
  const verbatimVerified =
    str(candidate.quote_type) === "verbatim" &&
    str(candidate.transcript_verification_status) === "verified";
  const humanResonanceScore = applyVerificationCap(rawResonanceScore, verbatimVerified);
  const resonanceCapped = humanResonanceScore < rawResonanceScore;

  // Quote quality: source_vividness + emotional_precision + non_genericness (3 dims, 1–5 each)
  // Formula: dimsToScore(sum_of_3, 3) → maps [3,15] → [0,100]
  const quoteQualitySum =
    result.source_vividness.score +
    result.emotional_precision.score +
    result.non_genericness.score;
  const quoteQualityScore = dimsToScore(quoteQualitySum, 3);

  // Source credibility: primarily human_credibility dimension score.
  // Formula: dimsToScore(human_credibility_score * 1, 1) → maps [1,5] → [0,100]
  // This is the cleanest single-dimensional mapping since credibility is one LLM judgment.
  const sourceCredibilityScore = dimsToScore(result.human_credibility.score, 1);

  // Gap fit: LLM-judged alignment between detected mappings and proposed_* fields.
  // Formula: dimsToScore(gap_fit_raw, 1) → maps [1,5] → [0,100]
  const gapFitScore = dimsToScore(result.gap_fit_raw, 1);

  // Anti-generic gate
  const antiGenericTriggered = ANTI_GENERIC_DIMENSIONS.some(
    (dim) => (result[dim] as { score: number }).score <= ANTI_GENERIC_FLOOR
  );

  // Overall (novelty absent here — aggregateOverall renormalizes)
  const overallCandidateScore = aggregateOverall({
    human_resonance_score: humanResonanceScore,
    quote_quality_score: quoteQualityScore,
    source_credibility_score: sourceCredibilityScore,
    gap_fit_score: gapFitScore,
    novelty_score: null, // scored separately by score-candidate-novelty.ts
  });

  // "Source verified" for the draft-ready gate means the SOURCE is confirmed — NOT that a video
  // exists. Audio/book/article sources have no embeddable video, so media_verification_status
  // "not_applicable" must count as source-OK (otherwise a verified-transcript podcast can never
  // become draft-ready). The transcript gate below is what actually protects quote integrity.
  const sourceVerified =
    candidate.media_verification_status === "verified" ||
    candidate.media_verification_status === "not_applicable";
  const transcriptVerified = candidate.transcript_verification_status === "verified";

  const recommendation = recommendationFor({
    overall: overallCandidateScore,
    antiGenericTriggered,
    sourceVerified,
    transcriptVerified,
  });

  // ── Build resonance_breakdown ───────────────────────────────────────────────

  const resonanceBreakdown: ResonanceBreakdown = {
    scores: Object.fromEntries(
      RESONANCE_DIMENSIONS.map((d) => [d, (result[d] as { score: number }).score])
    ) as ResonanceBreakdown["scores"],
    evidence: Object.fromEntries(
      RESONANCE_DIMENSIONS.map((d) => [d, (result[d] as { evidence: string }).evidence])
    ) as ResonanceBreakdown["evidence"],
    why_it_might_land: result.why_it_might_land,
    why_it_might_not_land: result.why_it_might_not_land,
  };

  // ── Human-readable report ───────────────────────────────────────────────────

  const dimWidth = 26;
  const pad = (s: string, n: number) => s.padEnd(n);

  console.log("═".repeat(70));
  console.log(`EVALUATION REPORT — ${str(candidate.candidate_id)}`);
  console.log("═".repeat(70));
  console.log(`\nDetected:  state=${result.detected_state}  type=${result.detected_insight_type}  register=${result.detected_voice_register}  intensity=${result.detected_intensity}`);
  console.log(`Proposed:  state=${str(candidate.target_state)}  type=${str(candidate.proposed_insight_type)}  register=${str(candidate.proposed_voice_register)}\n`);

  console.log("DIMENSION SCORES");
  console.log("─".repeat(70));
  for (const dim of RESONANCE_DIMENSIONS) {
    const { score, evidence } = result[dim] as { score: number; evidence: string };
    const antiFlag = ANTI_GENERIC_DIMENSIONS.includes(dim as typeof ANTI_GENERIC_DIMENSIONS[number]) && score <= ANTI_GENERIC_FLOOR ? " ⚑ ANTI-GENERIC TRIGGERED" : "";
    console.log(`  ${pad(dim, dimWidth)} [${score}/5]${antiFlag}`);
    console.log(`    Evidence: ${evidence}`);
  }

  console.log("\nCOMPONENT SCORES");
  console.log("─".repeat(70));
  console.log(
    `  human_resonance_score    ${humanResonanceScore}  (wt ${SCORE_WEIGHTS.human_resonance})` +
      (resonanceCapped
        ? `  ⚑ capped from ${rawResonanceScore} → ${UNVERIFIED_RESONANCE_CAP} (no verified verbatim excerpt yet)`
        : "")
  );
  console.log(`  quote_quality_score      ${quoteQualityScore}  (wt ${SCORE_WEIGHTS.quote_quality})`);
  console.log(`  source_credibility_score ${sourceCredibilityScore}  (wt ${SCORE_WEIGHTS.source_credibility})`);
  console.log(`  gap_fit_score            ${gapFitScore}  (wt ${SCORE_WEIGHTS.gap_fit})`);
  console.log(`  novelty_score            (not yet scored — run score-candidate-novelty.ts)`);
  console.log(`\n  overall_candidate_score  ${overallCandidateScore}  (novelty absent; renormalized)`);
  console.log(`\n  anti_generic_triggered   ${antiGenericTriggered}`);
  console.log(`\n  RECOMMENDATION: ${recommendation.toUpperCase()}`);

  console.log("\nNARRATIVE");
  console.log("─".repeat(70));
  console.log(`  Why it might land:     ${result.why_it_might_land}`);
  console.log(`  Why it might not land: ${result.why_it_might_not_land}`);
  console.log("═".repeat(70));

  // ── JSON output ─────────────────────────────────────────────────────────────

  const jsonOutput = {
    candidate_id: candidate.candidate_id,
    detected: {
      state: result.detected_state,
      insight_type: result.detected_insight_type,
      voice_register: result.detected_voice_register,
      intensity: result.detected_intensity,
    },
    dimension_scores: Object.fromEntries(
      RESONANCE_DIMENSIONS.map((d) => [
        d,
        { score: (result[d] as { score: number }).score, evidence: (result[d] as { evidence: string }).evidence },
      ])
    ),
    component_scores: {
      human_resonance_score: humanResonanceScore,
      quote_quality_score: quoteQualityScore,
      source_credibility_score: sourceCredibilityScore,
      gap_fit_score: gapFitScore,
      novelty_score: null,
      overall_candidate_score: overallCandidateScore,
    },
    anti_generic_triggered: antiGenericTriggered,
    recommendation,
    resonance_breakdown: resonanceBreakdown,
  };

  console.log("\nJSON:\n" + JSON.stringify(jsonOutput, null, 2));

  // ── Write back ──────────────────────────────────────────────────────────────

  if (!noWrite && candidatePath) {
    candidate.human_resonance_score = humanResonanceScore;
    candidate.quote_quality_score = quoteQualityScore;
    candidate.source_credibility_score = sourceCredibilityScore;
    candidate.gap_fit_score = gapFitScore;
    candidate.overall_candidate_score = overallCandidateScore;
    candidate.resonance_breakdown = resonanceBreakdown;
    candidate.recommendation = recommendation;
    saveCandidate(candidatePath, candidate);
    console.log(`\nScores written to: ${candidatePath}`);
  } else if (noWrite) {
    console.log("\n--no-write: scores NOT persisted.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
