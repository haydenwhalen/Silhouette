// Chat API route — receives user messages and returns agent responses.

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: Parse the incoming message and session ID
  // TODO: Load or create conversation memory for the session
  // TODO: Run the agent with the user's message
  // TODO: Return the agent's response with any source attributions

  const { message } = await req.json();

  return NextResponse.json({
    reply: `[Silhouette placeholder] You said: "${message}". Agent not wired up yet.`,
  });
}
