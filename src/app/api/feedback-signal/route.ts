import { NextRequest, NextResponse } from "next/server";
import { appendFeedbackEvent } from "@/feedback/feedbackLog";
import { logAgentStep } from "@/logging/logger";

interface SignalRequest {
  session_id?: string;
  insight_id?: string;
  dwell_ms?: number;
  dwell_qualified?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SignalRequest;
    const session_id = (body.session_id ?? "").trim();
    const insight_id = (body.insight_id ?? "").trim();
    const dwell_ms =
      typeof body.dwell_ms === "number" && Number.isFinite(body.dwell_ms)
        ? Math.max(0, Math.round(body.dwell_ms))
        : null;
    const dwell_qualified =
      typeof body.dwell_qualified === "boolean" ? body.dwell_qualified : null;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }
    if (!insight_id) {
      return NextResponse.json(
        { error: "insight_id is required" },
        { status: 400 }
      );
    }
    if (dwell_ms === null) {
      return NextResponse.json(
        { error: "dwell_ms is required (number)" },
        { status: 400 }
      );
    }
    if (dwell_qualified === null) {
      return NextResponse.json(
        { error: "dwell_qualified is required (boolean)" },
        { status: 400 }
      );
    }

    // Read user handle from session state if we have one cached from /api/chat.
    let userHandle: string | null = null;
    try {
      const { getUserHandleForSession } = await import("@/memory/sessionState");
      userHandle = getUserHandleForSession(session_id);
    } catch {
      userHandle = null;
    }

    const event = appendFeedbackEvent({
      session_id,
      user_handle: userHandle,
      source: "button",
      response_type: "dwell_signal",
      insight_id,
      shown_sio_id: insight_id,
      retry_count: 0,
      detected_state: null,
      state_confidence: null,
      insight_type: null,
      voice_register: null,
      retrieval_score: null,
      retrieval_rank: null,
      dwell_ms,
      dwell_qualified,
    });

    logAgentStep("dwell_signal_logged", {
      session_id,
      insight_id,
      dwell_ms,
      dwell_qualified,
      event_id: event.event_id,
    });

    return NextResponse.json({ ok: true, event_id: event.event_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    logAgentStep("dwell_signal_error", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
