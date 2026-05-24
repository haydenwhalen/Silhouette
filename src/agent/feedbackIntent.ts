// Lightweight, deterministic feedback intent detection.
// Per Phase 5 spec: keep it simple and explicit; no sentiment models.
// Only fire on short messages — long messages assume the user has typed a new query.

export type FeedbackIntent = "positive" | "negative" | "none";

const POSITIVE_PATTERNS = [
  /^yes\b/,
  /^yep\b/,
  /^yeah\b/,
  /^yup\b/,
  /^that landed\b/,
  /^landed\b/,
  /^helpful\b/,
  /^that('?s)? helpful\b/,
  /^that was helpful\b/,
  /^this (was )?helpful\b/,
  /^that resonated\b/,
  /^thanks?,? that('?s)? helpful\b/,
  /^👍/,
];

const NEGATIVE_PATTERNS = [
  /^no\b/,
  /^nope\b/,
  /^not (quite|really|it)\b/,
  /^show me (something )?different\b/,
  /^something different\b/,
  /^different\b/,
  /^try (another|again|something else)\b/,
  /^miss(ed)?\b/,
  /^👎/,
  /^this isn'?t (it|right|landing)\b/,
];

const MAX_FEEDBACK_WORDS = 10;

export function detectFeedbackIntent(message: string): FeedbackIntent {
  const trimmed = message.trim().toLowerCase().replace(/[.!]+$/, "");
  if (!trimmed) return "none";
  if (trimmed.split(/\s+/).length > MAX_FEEDBACK_WORDS) return "none";
  if (POSITIVE_PATTERNS.some((re) => re.test(trimmed))) return "positive";
  if (NEGATIVE_PATTERNS.some((re) => re.test(trimmed))) return "negative";
  return "none";
}
