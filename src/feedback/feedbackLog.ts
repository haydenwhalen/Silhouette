import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { logAgentStep } from "../logging/logger";

const FEEDBACK_LOG_PATH = join(process.cwd(), "corpus", "feedback.jsonl");

export type FeedbackResponseType =
  | "landed"
  | "show_different"
  | "no_response"
  | "retry_presented"
  | "stray_feedback" // user signaled feedback when no insight had been presented
  | "dwell_signal"; // UI-captured how long the user viewed an insight before clicking

export interface FeedbackEvent {
  event_id: string;
  session_id: string;
  user_handle?: string | null;
  // "button" if the event originated from a UI button click (via the chat API),
  // "text" if the user typed a feedback phrase, "api" if posted directly by a
  // script (test / programmatic). Null when the source can't be determined.
  source?: "button" | "text" | "api" | null;
  timestamp: string;
  response_type: FeedbackResponseType;
  insight_id: string | null;
  shown_sio_id: string | null;
  alternate_sio_ids?: string[];
  retry_count: number;
  detected_state: string | null;
  state_confidence: string | null;
  insight_type: string | null;
  voice_register: string | null;
  retrieval_score: number | null;
  retrieval_rank: number | null;
  // dwell_signal fields — populated only when response_type = "dwell_signal"
  dwell_ms?: number;
  dwell_qualified?: boolean;
  notes?: string;
}

function ensureLogDir() {
  const dir = dirname(FEEDBACK_LOG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function appendFeedbackEvent(
  partial: Omit<FeedbackEvent, "event_id" | "timestamp">
): FeedbackEvent {
  const event: FeedbackEvent = {
    event_id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...partial,
  };
  ensureLogDir();
  appendFileSync(FEEDBACK_LOG_PATH, JSON.stringify(event) + "\n");
  logAgentStep("feedback_logged", {
    event_id: event.event_id,
    session_id: event.session_id,
    response_type: event.response_type,
    insight_id: event.insight_id,
  });
  return event;
}

export function getFeedbackLogPath(): string {
  return FEEDBACK_LOG_PATH;
}
