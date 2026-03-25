import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/agent/index";
import { logAgentStep } from "@/logging/logger";

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const message: string = body.message?.trim();
    const sessionId: string = body.sessionId || "anonymous";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    logAgentStep("api_request", { sessionId, message });

    const result = await chat(message, sessionId);

    logAgentStep("api_response", {
      sessionId,
      toolsUsed: result.toolsUsed,
      durationMs: Date.now() - start,
    });

    return NextResponse.json({
      reply: result.output,
      sessionId: result.sessionId,
      toolsUsed: result.toolsUsed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    logAgentStep("api_error", { error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
