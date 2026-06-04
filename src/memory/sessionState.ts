// Session-scoped non-chat state: which SIOs the user has been shown, retry
// counter, last presentation context (for feedback routing). In-memory only —
// MVP scope; persistence comes when we add a real backing store.

export interface PresentationContext {
  insight_id: string;
  shown_sio_id: string;
  detected_state: string | null;
  state_confidence: string | null;
  insight_type: string | null;
  voice_register: string | null;
  retrieval_score: number | null;
  retrieval_rank: number | null;
  alternate_sio_ids: string[];
  user_query: string;
  // Classifier hints — captured at presentation time so retry can re-run
  // retrieval with the same context (excluding the seen SIO).
  intake_insight_type: string | null;
  intake_voice_register: string | null;
  direction_collapse_variant: string | null;
  // Tier-1 structural display fields (research report §3). Stashed here so the
  // agent can surface them to the UI on the same turn (the tool builds the
  // PresentationObject; the agent assembles the response). Optional — absent on
  // older records / non-presentation turns; read defensively.
  confidence_label?: string | null;
  verification_label?: string | null;
  credibility_line?: string | null;
}

interface SessionState {
  seen_sio_ids: string[];
  retry_count: number;
  last_presentation: PresentationContext | null;
  user_handle: string | null;
}

const states = new Map<string, SessionState>();

function blank(): SessionState {
  return {
    seen_sio_ids: [],
    retry_count: 0,
    last_presentation: null,
    user_handle: null,
  };
}

function get(sessionId: string): SessionState {
  if (!states.has(sessionId)) states.set(sessionId, blank());
  return states.get(sessionId)!;
}

export function recordPresentation(
  sessionId: string,
  ctx: PresentationContext
): void {
  const s = get(sessionId);
  if (!s.seen_sio_ids.includes(ctx.shown_sio_id)) {
    s.seen_sio_ids.push(ctx.shown_sio_id);
  }
  s.last_presentation = ctx;
}

export function getSeenSIOIds(sessionId: string): string[] {
  return [...get(sessionId).seen_sio_ids];
}

export function getLastPresentation(sessionId: string): PresentationContext | null {
  return get(sessionId).last_presentation;
}

export function incrementRetryCount(sessionId: string): number {
  const s = get(sessionId);
  s.retry_count += 1;
  return s.retry_count;
}

export function getRetryCount(sessionId: string): number {
  return get(sessionId).retry_count;
}

export const MAX_RETRIES_PER_SESSION = 1;

export function canRetry(sessionId: string): boolean {
  return get(sessionId).retry_count < MAX_RETRIES_PER_SESSION;
}

export function resetSession(sessionId: string): void {
  states.set(sessionId, blank());
}

export function setUserHandleForSession(sessionId: string, handle: string): void {
  const s = get(sessionId);
  s.user_handle = handle;
}

export function getUserHandleForSession(sessionId: string): string | null {
  return get(sessionId).user_handle;
}
