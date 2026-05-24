import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/agent/index";
import { logAgentStep } from "@/logging/logger";
import { setUserHandleForSession } from "@/memory/sessionState";

function sanitizeHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  return clean || null;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const message: string = body.message?.trim();
    const sessionId: string = body.sessionId || "anonymous";
    const userHandle = sanitizeHandle(body.user_handle);

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // Cache the handle on the session before chat() runs so feedback events
    // can include it.
    if (userHandle) setUserHandleForSession(sessionId, userHandle);
    const feedbackSource: "button" | "text" | undefined =
      body.feedback_source === "button"
        ? "button"
        : body.feedback_source === "text"
        ? "text"
        : undefined;

    logAgentStep("api_request", { sessionId, userHandle, message, feedbackSource });

    const result = await chat(message, sessionId, feedbackSource);

    logAgentStep("api_response", {
      sessionId,
      userHandle,
      toolsUsed: result.toolsUsed,
      durationMs: Date.now() - start,
      last_insight_id: result.last_insight_id ?? null,
      feedbackHandled: result.feedbackHandled ?? null,
    });

    return NextResponse.json({
      reply: result.output,
      sessionId: result.sessionId,
      toolsUsed: result.toolsUsed,
      last_insight_id: result.last_insight_id ?? null,
      feedback_handled: result.feedbackHandled ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    logAgentStep("api_error", { error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
