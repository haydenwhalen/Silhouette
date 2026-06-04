import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { Document } from "@langchain/core/documents";
import { requireKey } from "../lib/config";
import { logAgentStep } from "../logging/logger";
import { getSIOById } from "../rag/sioLoader";
import type { StateClassification } from "../agent/stateClassifier";

export interface PresentationMedia {
  display_mode: "video-primary" | "audio-primary" | "text-only" | "unknown";
  source_url: string | null;
  embed_url: string | null;
  video_id: string | null;
  video_url: string | null;
  video_provider: string | null;
  source_media_type: string | null;
  media_verification_status: string | null;
  timestamp_range: string | null;
  timestamp_start_seconds: number | null;
}

export interface PresentationObject {
  insight_id: string;
  speaker: string;
  bridge_sentence: string | null;
  excerpt: string;
  attribution: string;
  why_this_applies: string;
  next_step: null;
  feedback_prompt: string;
  media: PresentationMedia;
  // diagnostic
  source_confidence: "strong" | "acceptable" | "hedged";
  // ── Tier-1 structural presentation fields (research report §3 shared devices) ──
  // All three are STRUCTURED-ONLY: they travel as data to the UI and are NOT
  // written into rendered_markdown (so the brittle markdown parser and any
  // non-UI consumers/tests are untouched). Each degrades to a calm default when
  // its source data is missing.
  //
  // confidence_label   — derived from source_confidence. Always present.
  // verification_label — derived from transcript_verified / clip_match_type.
  //                      Null when those fields are absent/unknown (omit, don't guess).
  // credibility_line   — a ≤14-word, third-person, FACTUAL clause about who the
  //                      speaker is / what they navigated. LLM-generated under the
  //                      same guardrails as why_this_applies; null on any failure,
  //                      on low confidence, or when it would duplicate the why-line.
  confidence_label: "Closely matched" | "A nearby match";
  verification_label: "Verified source" | "Reconstructed — paraphrase" | null;
  credibility_line: string | null;
  presentation_notes: string[];
  rendered_markdown: string;
}

export interface PresentationFailure {
  ok: false;
  reason: string;
  insight_id?: string;
}

export interface PresentationSuccess {
  ok: true;
  presentation: PresentationObject;
}

export type PresentationResult = PresentationSuccess | PresentationFailure;

// States that get a bridge sentence per Component 7 §5 Part 1.
const STATES_WITH_BRIDGE = new Set([
  "engagement-drought",
  "identity-transition",
]);

const BANNED_FRAGMENTS = [
  /\bjourney\b/i,
  /\bbased on (your|what you)/i,
  /\bpowerful quote\b/i,
  /\bas an ai\b/i,
  /\bi (can )?see (that )?you/i,
  /\bexactly what you need\b/i,
  /\byou seem to be experiencing\b/i,
  /\bthis will help you\b/i,
  /\bmany people feel\b/i,
  /\bit sounds like\b/i,
  /\byou are not alone\b/i,
  /\bstruggle\b/i,
];

const llmSchema = z.object({
  bridge_sentence: z
    .string()
    .nullable()
    .describe(
      "Bridge sentence per Component 7 §5.1 — included only for engagement-drought (mechanism content benefits from a one-line setup). Null otherwise. Max 20 words. Never refer to the system, the user's words verbatim, or summarize their situation."
    ),
  why_this_applies: z
    .string()
    .describe(
      "One sentence per Component 7 §7. Subject = the speaker or the claim. Reference a specific aspect of the speaker's story or the insight's claim. Do not name the stuck state. Do not begin with 'You' or 'Based on'. Max 35 words."
    ),
  credibility_line: z
    .string()
    .nullable()
    .describe(
      "A ≤14-word, third-person, FACTUAL clause about who the speaker is or what they navigated — a credential, not a sentiment. Drawn ONLY from the provided facts (key claim, summary, match notes). Lowercase start, no trailing period, no quotes. Example: 'the actor who walked away from $14.5M to get honest about his work'. STRICT: no 'you'/'your'/'I'/'we', no advice, no motivation, no feelings, no therapy language, no naming any stuck state. Null if you cannot write a purely factual clause from the facts."
    ),
});

let llm: ChatOpenAI | null = null;

function getLlm(): ChatOpenAI {
  if (llm) return llm;
  llm = new ChatOpenAI({
    openAIApiKey: requireKey("openaiApiKey"),
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });
  return llm;
}

function attributionComplete(m: Record<string, unknown>): string | null {
  if (!m.speaker) return "missing speaker";
  if (!m.show_or_platform) return "missing show_or_platform";
  if (!m.episode_or_content_title) return "missing episode_or_content_title";
  return null;
}

// Common ≥5-char words that should not count as a "shared distinctive fact"
// when de-duplicating the credibility line against the why-sentence.
const STOPWORDS = new Set([
  "about", "after", "again", "their", "there", "these", "those", "which",
  "would", "could", "should", "where", "while", "being", "doesn", "isn",
  "something", "someone", "navigated", "speaker", "because", "before",
]);

// ── Tier-1 derived labels (no LLM) ──────────────────────────────────────
// Source-Confidence chip, per research report §3. Derived deterministically;
// rendered calm/peripheral by the UI (never a warning banner).

function confidenceLabelFor(
  c: PresentationObject["source_confidence"]
): PresentationObject["confidence_label"] {
  return c === "strong" ? "Closely matched" : "A nearby match";
}

/**
 * Derives the verification label from the SIO's own honesty fields. Defensive:
 * returns null (omit the label) when neither field is present, rather than
 * guessing. transcript_verified may be a real boolean; clip_match_type a string.
 */
function deriveVerificationLabel(
  m: Record<string, unknown>
): PresentationObject["verification_label"] {
  const tv = m.transcript_verified;
  const clip = typeof m.clip_match_type === "string" ? m.clip_match_type : null;
  if (tv === true) return "Verified source";
  if (clip === "exact_quote_match") return "Verified source";
  if (clip === "close_paraphrase" || clip === "talking_point") {
    return "Reconstructed — paraphrase";
  }
  if (tv === false) return "Reconstructed — paraphrase";
  return null; // fields absent/unknown → omit, don't guess
}

// Second-person / first-person guard for the credibility line. The line must be
// a third-person factual clause about the speaker — never address the user, never
// speak as the system.
const CREDIBILITY_PERSON_RE = /\b(you|your|you're|i|i'm|we|us|our|let's)\b/i;

/**
 * Validates a candidate credibility line against the same discipline as the
 * why-sentence: no banned fragments, no first/second person, ≤14 words, and a
 * concrete hook (at least one specificity token). Returns the cleaned line or
 * null to drop it. Never throws.
 */
function cleanCredibilityLine(
  raw: string | null | undefined,
  specificityTokens: string[],
  notes: string[]
): string | null {
  if (!raw) return null;
  let line = raw.trim().replace(/^["'“”]+|["'“”.]+$/g, "").trim();
  if (!line) return null;
  const banned = detectGuardrailViolations(line);
  if (banned.length > 0) {
    notes.push(`credibility_line dropped (banned: ${banned.join(", ")})`);
    return null;
  }
  if (CREDIBILITY_PERSON_RE.test(line)) {
    notes.push("credibility_line dropped (first/second person)");
    return null;
  }
  if (line.split(/\s+/).length > 14) {
    notes.push("credibility_line dropped (>14 words)");
    return null;
  }
  if (!whyContainsSpecificDetail(line, specificityTokens)) {
    notes.push("credibility_line dropped (no concrete hook)");
    return null;
  }
  return line;
}

/**
 * True when the why-sentence already contains the credibility line's distinctive
 * fact (a shared number or a shared ≥5-char content word), so we don't show the
 * same fact twice. Stopword-tolerant and case-insensitive.
 */
function whyDuplicatesCredibility(why: string, credibility: string): boolean {
  const w = why.toLowerCase();
  const credWords = credibility.toLowerCase().match(/[a-z0-9$.]+/g) ?? [];
  for (const tok of credWords) {
    if (/\d/.test(tok) && w.includes(tok)) return true; // shared number/$amount
    if (tok.length >= 5 && !STOPWORDS.has(tok) && w.includes(tok)) return true;
  }
  return false;
}

function pickDisplayMode(
  m: Record<string, unknown>
): PresentationMedia["display_mode"] {
  const raw = String(m.display_mode ?? "").trim();
  if (raw === "video-primary" || raw === "audio-primary" || raw === "text-only") {
    return raw;
  }
  return "unknown";
}

function buildMedia(m: Record<string, unknown>): PresentationMedia {
  const declared = pickDisplayMode(m);
  const videoId = (m.video_id as string) || null;
  const embedUrl = (m.embed_url as string) || null;
  const sourceUrl = (m.source_url as string) || null;
  const videoUrl = (m.video_url as string) || null;
  const videoProvider = (m.video_provider as string) || null;
  const sourceMediaType = (m.source_media_type as string) || null;
  const verificationStatus = (m.media_verification_status as string) || null;
  // A video is presentable only with a real embed (TED slug embed, or a verified YouTube
  // embed). A blank embed_url means we have no verified player — even if video_id/provider
  // are set as candidates — so video-primary must degrade rather than show a broken player.
  const hasEmbed = !!embedUrl;
  // Graceful fallback: declared video-primary without an embed collapses to audio-primary
  // or text-only (preserve existing behavior; embed_url presence keeps video-primary).
  let display: PresentationMedia["display_mode"] = declared;
  if (declared === "video-primary" && !hasEmbed) {
    display = sourceUrl ? "audio-primary" : "text-only";
  }
  if (declared === "audio-primary" && !sourceUrl) {
    display = "text-only";
  }
  if (declared === "unknown") {
    display = sourceUrl ? "audio-primary" : "text-only";
  }
  return {
    display_mode: display,
    source_url: sourceUrl,
    embed_url: embedUrl,
    video_id: videoId,
    video_url: videoUrl,
    video_provider: videoProvider,
    source_media_type: sourceMediaType,
    media_verification_status: verificationStatus,
    timestamp_range: (m.timestamp_range as string) || null,
    timestamp_start_seconds:
      typeof m.timestamp_start_seconds === "number"
        ? m.timestamp_start_seconds
        : null,
  };
}

function buildAttribution(m: Record<string, unknown>): string {
  const provided = String(m.attribution_text ?? "").trim();
  if (provided) return provided;
  const speaker = String(m.speaker ?? "").trim();
  const show = String(m.show_or_platform ?? "").trim();
  const title = String(m.episode_or_content_title ?? "").trim();
  const date = String(m.episode_or_content_date ?? "").trim();
  const year = date ? date.slice(0, 4) : "";
  return [
    speaker,
    show ? `appearing on ${show}` : null,
    title ? `"${title}"` : null,
    year ? `(${year})` : null,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/, "/g, ', "');
}

function pickExcerpt(doc: Document): string {
  const m = doc.metadata;
  const body = (doc.pageContent ?? "").trim();
  const keyClaim = String(m.key_claim ?? "").trim();
  const summary = String(m.content_summary ?? "").trim();
  // pageContent currently = key_claim + content_summary + transcript_excerpt.
  // The "transcript_excerpt" we want for display is the third segment.
  if (body && (body.startsWith(keyClaim) || keyClaim)) {
    let rest = body;
    if (keyClaim && rest.startsWith(keyClaim)) rest = rest.slice(keyClaim.length).trim();
    if (summary && rest.startsWith(summary)) rest = rest.slice(summary.length).trim();
    rest = stripReconstructionNotes(rest);
    if (rest) return rest;
  }
  return body || keyClaim || "[no excerpt available]";
}

// Reconstruction warnings come in a few shapes across the SIO corpus. They live at
// the top of the transcript body, are introduced by "⚠️" or "RECONSTRUCTION NOTE",
// and are separated from the actual transcript by a blank line.
// Strategy: if the first paragraph contains a warning marker, drop everything up
// through the first blank line. Repeat for stacked notes.
function stripReconstructionNotes(text: string): string {
  let out = text;
  const warningRegex = /(RECONSTRUCTION NOTE|TRANSCRIPT NOT VERIFIED|⚠️)/i;
  for (let i = 0; i < 3; i++) {
    const trimmed = out.trimStart();
    if (!warningRegex.test(trimmed.split(/\n\s*\n/, 1)[0] ?? "")) break;
    const blankLineIdx = trimmed.search(/\n\s*\n/);
    if (blankLineIdx === -1) {
      // Entire remaining text is the warning — return empty so caller falls back.
      out = "";
      break;
    }
    out = trimmed.slice(blankLineIdx).trim();
  }
  return out;
}

// Media-aware, never-broken source link. Chooses the verb (Watch / Listen / Read)
// from the media kind, prefers the canonical public page for the URL, and only adds a
// "from <timestamp>" cue when the timestamp is genuinely usable. Returns null (no link)
// rather than a broken one when no URL exists.
function sourceLink(m: PresentationMedia): string | null {
  // Best public link target. In true video-primary mode we may link the watch page
  // (video_url); otherwise prefer the canonical source page (e.g. the official episode
  // page) over a candidate watch URL. We never expose the bare embed URL as the click
  // target. Returns null (no link) rather than a broken one when no URL exists.
  const url =
    m.display_mode === "video-primary"
      ? m.video_url || m.source_url || null
      : m.source_url || m.video_url || null;
  if (!url) return null;

  const provider = (m.video_provider ?? "").toLowerCase();
  const mediaType = (m.source_media_type ?? "").toLowerCase();
  const startTs = m.timestamp_range ? m.timestamp_range.split("–")[0].trim() : null;

  // The verb follows the RESOLVED display_mode, so we only say "Watch" when we actually
  // have a verified video (video-primary requires an embed in buildMedia). A media block
  // that degraded to audio-primary (e.g. a needs_review YouTube source with no verified
  // embed) honestly reads as "Listen", not "Watch".
  if (m.display_mode === "video-primary") {
    // TED embeds play from the start (no per-moment ts), so plain "Watch the talk" is
    // correct there; only offer a timestamp cue for non-TED with a real embed timestamp.
    if (startTs && provider !== "ted") {
      return `Watch from ${startTs} → ${url}`;
    }
    return `Watch the talk → ${url}`;
  }

  if (
    m.display_mode === "text-only" ||
    mediaType === "book" ||
    mediaType === "article"
  ) {
    return `Read the source → ${url}`;
  }

  // Audio / audio-primary (incl. video sources that degraded for lack of a verified embed).
  if (startTs) {
    return `Hear it at ${startTs} → ${url}`;
  }
  return `Listen to the full episode → ${url}`;
}

function shouldIncludeBridge(c: StateClassification, state: string): boolean {
  if (c.state_confidence === "low") return false;
  return STATES_WITH_BRIDGE.has(state);
}

function detectGuardrailViolations(text: string): string[] {
  return BANNED_FRAGMENTS.filter((re) => re.test(text)).map((re) => re.source);
}

// Few-shot exemplars drawn directly from Component 7 §7 & §5.1.
// Format: "<context cue>" -> "<good sentence>" with rationale.
const WHY_EXAMPLES = [
  {
    state: "direction-collapse",
    insight_type: "story",
    good: "McConaughey was at the career peak most people work toward when he discovered the target itself was the problem.",
    bad: "This insight is about feeling lost after achieving your goals.",
    rationale: "good places the speaker at a specific moment; bad is a topic summary.",
  },
  {
    state: "engagement-drought",
    insight_type: "mechanism",
    good: "Huberman's research names the exact dopamine system behind what you're describing — and why it's not a willpower problem.",
    bad: "This is about losing motivation at work, which seems relevant to your situation.",
    rationale: "good names the specific mechanism; bad describes the topic area.",
  },
  {
    state: "engagement-drought",
    insight_type: "story",
    good: "She left a role at peak performance not because she failed at it but because mastery had made it invisible to her.",
    bad: "Many people feel this way — you are not alone.",
    rationale: "good places the speaker in a specific arc; bad is therapy language.",
  },
  {
    state: "inaction-loop",
    insight_type: "story",
    good: "Goggins spent two years knowing exactly what he needed to do before he understood what was actually keeping him in place.",
    bad: "You know what to do and aren't doing it — this addresses that.",
    rationale: "good places the speaker in a specific duration; bad repeats classification logic.",
  },
];

const BRIDGE_EXAMPLES = [
  {
    state: "engagement-drought",
    good: "There's a reason this feeling doesn't respond to willpower.",
    bad: "Here is something I thought you might find helpful.",
  },
];

function extractSpecificityTokens(
  m: Record<string, unknown>,
  doc: Document
): string[] {
  // Build a pool of "specific" tokens this why-sentence could reference:
  // proper-noun-ish words from key_claim / content_summary, dollar amounts, numbers, year/month words.
  const sources = [
    String(m.key_claim ?? ""),
    String(m.content_summary ?? ""),
    String(m.user_problem_match_notes ?? ""),
    doc.pageContent.slice(0, 400),
  ].join(" ");
  const tokens = new Set<string>();
  // Numbers / money / time spans
  for (const match of sources.match(/\$?\d+(?:[.,]\d+)*(?:[MK]| million| years?| months?|x| picture)?/g) ?? []) {
    tokens.add(match.toLowerCase());
  }
  // Capitalized words >= 4 chars (proper nouns, signature concepts)
  for (const match of sources.match(/\b[A-Z][a-zA-Z\-]{3,}\b/g) ?? []) {
    tokens.add(match.toLowerCase());
  }
  // Signature concepts in lower-case
  for (const concept of [
    "zero",
    "dopamine",
    "baseline",
    "tonic",
    "phasic",
    "identity",
    "loop",
    "honest",
    "discipline",
    "agent",
    "manager",
  ]) {
    if (sources.toLowerCase().includes(concept)) tokens.add(concept);
  }
  return Array.from(tokens);
}

function whyContainsSpecificDetail(why: string, tokens: string[]): boolean {
  const w = why.toLowerCase();
  return tokens.some((t) => w.includes(t));
}

async function generateLlmParts(
  doc: Document,
  classification: StateClassification,
  userQuery: string,
  includeBridge: boolean
): Promise<{
  bridge_sentence: string | null;
  why_this_applies: string;
  credibility_line: string | null;
  notes: string[];
}> {
  const m = doc.metadata;
  const insightType = String(m.insight_type ?? "");
  const voiceRegister = String(m.voice_register ?? "");
  const state = String(m.primary_state_tag ?? "");
  const speaker = String(m.speaker ?? "");
  const keyClaim = String(m.key_claim ?? "");
  const contentSummary = String(m.content_summary ?? "");
  const matchNotes = String(m.user_problem_match_notes ?? "");

  const hedgeNote =
    classification.state_confidence === "moderate"
      ? "Use slightly hedged language ('Something that might fit', 'navigated something close to this')."
      : "Use direct, confident framing without overclaiming.";

  const whyExemplars = WHY_EXAMPLES.map(
    (e) =>
      `- GOOD (${e.state}, ${e.insight_type}): "${e.good}"\n  BAD: "${e.bad}"\n  Why good wins: ${e.rationale}`
  ).join("\n");

  const bridgeExemplars = BRIDGE_EXAMPLES.map(
    (e) => `- GOOD (${e.state}): "${e.good}"\n  BAD: "${e.bad}"`
  ).join("\n");

  const specificityTokens = extractSpecificityTokens(m, doc);
  const tokenHint = specificityTokens.length
    ? `Specific details from this insight worth grounding in (use at least one in your why-sentence): ${specificityTokens.slice(0, 10).join(", ")}.`
    : "";

  const prompt = `You write two short pieces of framing for an insight Silhouette is about to present to a user.

# About this insight

Speaker: ${speaker}
Detected user state: ${state} (${classification.state_confidence} confidence)
Insight type: ${insightType}
Voice register: ${voiceRegister}
Key claim (the speaker's words distilled): ${keyClaim}
What this insight does for users in this state: ${matchNotes || contentSummary}
User wrote (do not quote verbatim): "${userQuery}"

${tokenHint}

# Bridge sentence

${includeBridge
  ? `Write ONE bridge sentence (max 20 words). Calm, observational. Reference the specific mechanism, frame, or experience the insight is about — NOT a generic platitude about feelings or change. Subject is NOT "I" or "You". Examples:\n${bridgeExemplars}`
  : "Set bridge_sentence to null."}

# Why-this-applies sentence

Write ONE sentence (max 35 words) that places ${speaker} in the specific moment of their story or names the specific mechanism/frame they offer.

The single biggest failure mode: writing a TOPIC summary instead of a SPECIFIC moment. Compare:

${whyExemplars}

Hard rules:
- Subject of the sentence should be the speaker or the speaker's claim — not the system, not the user.
- Reference something SPECIFIC from the speaker's story or claim: a number, a name, a place, a duration, a concrete frame. Not just the topic area.
- Do NOT name the stuck state ("direction-collapse", "engagement-drought", "inaction-loop") or any synonym ("you're stuck", "you're avoiding things").
- Do NOT begin with "You" or "I" or "Based on".
- Do NOT use the words "journey", "struggle", "powerful", "exactly what you need".
- Do NOT say "this will help you" or anything prescriptive.
- Do NOT explain the insight — that's the insight's job.
- Do NOT quote the user's words verbatim.
- ${hedgeNote}

# Insight-type guidance for the why sentence

- mechanism: name the specific mechanism the speaker describes (e.g., "dopamine baseline depletion", not "motivation").
- story: place the speaker in the specific moment they're in (e.g., "two years into knowing", not "feeling stuck").
- reframe: name the specific new frame the speaker offers (e.g., "argues clarity comes from engagement, not introspection", not "a new perspective").
- permission: name what specifically the speaker named (e.g., "what languishing actually is", not "this is okay").

# Credibility line

Write a ${
    classification.state_confidence === "moderate"
      ? "softened "
      : ""
  }≤14-word, third-person FACTUAL clause identifying ${speaker} — a credential or what they navigated, drawn ONLY from the facts above. It humanizes the attribution; it is NOT a second sentence of insight.
- GOOD: "the actor who walked away from $14.5M to get honest about his work"
- GOOD: "the Stanford neuroscientist who maps the dopamine system behind motivation"
- BAD (sentiment/advice): "someone who can help you find your way" / "a voice you need right now"
- Lowercase start, no trailing period, no quotes. No "you"/"your"/"I"/"we". No feelings, no advice, no stuck-state names.${
    classification.state_confidence === "moderate"
      ? ' Because the match is approximate, prefer hedged phrasing like "navigated something close to this".'
      : ""
  }
- Set credibility_line to null if you cannot write a purely factual clause.

Output the JSON schema.`;

  const structured = getLlm().withStructuredOutput(llmSchema, {
    name: "present_insight_parts",
  });

  const result = await structured.invoke([{ role: "user", content: prompt }]);

  const notes: string[] = [];

  // ---- bridge handling ----
  let bridge = includeBridge ? result.bridge_sentence ?? null : null;
  if (bridge) {
    const violations = detectGuardrailViolations(bridge);
    if (violations.length > 0) {
      notes.push(`bridge dropped (banned fragments: ${violations.join(", ")})`);
      bridge = null;
    } else if (!whyContainsSpecificDetail(bridge, specificityTokens)) {
      // Bridges without a concrete hook are weaker than no bridge.
      notes.push("bridge dropped (no concrete reference)");
      bridge = null;
    } else if (bridge.split(/\s+/).length > 24) {
      notes.push("bridge exceeded 20-word soft cap");
    }
  }

  // ---- why handling, with specificity retry ----
  let why = result.why_this_applies.trim();
  const whyViolations = detectGuardrailViolations(why);
  let needRetry = whyViolations.length > 0;
  let specificEnough = whyContainsSpecificDetail(why, specificityTokens);
  if (!specificEnough) {
    needRetry = true;
    notes.push("why_this_applies retry: lacks concrete reference");
  }
  if (whyViolations.length > 0) {
    notes.push(`why_this_applies retry: banned ${whyViolations.join(", ")}`);
  }

  if (needRetry) {
    const retryPrompt =
      prompt +
      `\n\n# Retry\n` +
      (whyViolations.length
        ? `Previous draft contained banned fragments: ${whyViolations.join(", ")}. Avoid them.\n`
        : "") +
      (!specificEnough
        ? `Previous draft was too topical. It did not reference any of the concrete details (${specificityTokens.slice(0, 6).join(", ")}). Rewrite to ground in at least one specific detail from the speaker's story or claim.\n`
        : "");
    const retry = await structured.invoke([
      { role: "user", content: retryPrompt },
    ]);
    why = retry.why_this_applies.trim();
    const stillBanned = detectGuardrailViolations(why);
    const stillGeneric = !whyContainsSpecificDetail(why, specificityTokens);
    if (stillBanned.length > 0) {
      notes.push(`why_this_applies still violated after retry: ${stillBanned.join(", ")}`);
    }
    if (stillGeneric) {
      notes.push("why_this_applies still lacks concrete reference after retry");
    }
  }

  if (why.split(/\s+/).length > 40) {
    notes.push("why_this_applies exceeded 35-word soft cap");
  }

  // ---- credibility line: clean + drop on any guardrail failure ----
  // Suppress entirely on low confidence (too uncertain to assert a credential).
  const credibility_line =
    classification.state_confidence === "low"
      ? null
      : cleanCredibilityLine(result.credibility_line, specificityTokens, notes);

  return {
    bridge_sentence: bridge,
    why_this_applies: why,
    credibility_line,
    notes,
  };
}

import { FEEDBACK_MARKER_TEXT } from "./feedbackMarker";
export { FEEDBACK_MARKER_TEXT };

function renderMarkdown(
  p: Omit<PresentationObject, "rendered_markdown">,
  keyClaimLead: string | null
): string {
  const parts: string[] = [];
  if (p.bridge_sentence) parts.push(p.bridge_sentence);
  if (keyClaimLead) parts.push(`**${keyClaimLead}**`);
  parts.push(`> ${p.excerpt.split("\n").join("\n> ")}`);
  parts.push(`— ${p.attribution}`);
  parts.push(p.why_this_applies);
  const link = sourceLink(p.media);
  if (link) parts.push(link);
  parts.push(FEEDBACK_MARKER_TEXT);
  return parts.join("\n\n");
}

function shouldLeadWithKeyClaim(
  m: Record<string, unknown>,
  excerpt: string
): boolean {
  const insightType = String(m.insight_type ?? "");
  if (insightType !== "mechanism" && insightType !== "reframe") return false;
  const wordCount = excerpt.split(/\s+/).length;
  return wordCount >= 180;
}

export async function presentInsight(
  insightId: string,
  classification: StateClassification,
  userQuery: string
): Promise<PresentationResult> {
  const doc = getSIOById(insightId);
  if (!doc) {
    logAgentStep("presentation_skip", {
      insight_id: insightId,
      reason: "SIO not loaded",
    });
    return { ok: false, reason: `SIO not loaded: ${insightId}`, insight_id: insightId };
  }

  const m = doc.metadata;

  // Hard gate: attribution completeness per Component 7 §15 case 8.
  const attrIssue = attributionComplete(m);
  if (attrIssue) {
    logAgentStep("presentation_skip", {
      insight_id: insightId,
      reason: attrIssue,
    });
    return {
      ok: false,
      reason: `Attribution incomplete: ${attrIssue}`,
      insight_id: insightId,
    };
  }

  const media = buildMedia(m);
  const attribution = buildAttribution(m);
  const excerpt = pickExcerpt(doc);
  const state = String(m.primary_state_tag ?? "");
  const includeBridge = shouldIncludeBridge(classification, state);

  const llmParts = await generateLlmParts(
    doc,
    classification,
    userQuery,
    includeBridge
  );

  const sourceConfidence =
    classification.state_confidence === "high"
      ? "strong"
      : classification.state_confidence === "moderate"
      ? "acceptable"
      : "hedged";

  // Suppress the credibility line if the why-sentence already carries the same
  // fact (avoid stacking two interpretive lines). Heuristic: a shared distinctive
  // token (≥5 chars or a number) between the two lines.
  let credibilityLine = llmParts.credibility_line;
  if (credibilityLine && whyDuplicatesCredibility(llmParts.why_this_applies, credibilityLine)) {
    llmParts.notes.push("credibility_line suppressed (duplicates why_this_applies)");
    credibilityLine = null;
  }

  const obj: Omit<PresentationObject, "rendered_markdown"> = {
    insight_id: insightId,
    speaker: String(m.speaker ?? ""),
    bridge_sentence: llmParts.bridge_sentence,
    excerpt,
    attribution,
    why_this_applies: llmParts.why_this_applies,
    next_step: null,
    feedback_prompt: "Did this land?",
    media,
    source_confidence: sourceConfidence,
    confidence_label: confidenceLabelFor(sourceConfidence),
    verification_label: deriveVerificationLabel(m),
    credibility_line: credibilityLine,
    presentation_notes: llmParts.notes,
  };

  const keyClaim = String(m.key_claim ?? "").trim();
  const keyClaimLead = shouldLeadWithKeyClaim(m, excerpt) && keyClaim ? keyClaim : null;
  if (keyClaimLead) {
    obj.presentation_notes.push("led with key_claim (long mechanism/reframe excerpt)");
  }
  const rendered = renderMarkdown(obj, keyClaimLead);
  const final: PresentationObject = { ...obj, rendered_markdown: rendered };

  logAgentStep("presentation_built", {
    insight_id: insightId,
    state,
    display_mode: media.display_mode,
    has_bridge: !!final.bridge_sentence,
    notes: final.presentation_notes,
  });

  return { ok: true, presentation: final };
}
