"use client";

import { useEffect, useRef, useState } from "react";
import { BetaPreamble, useBetaPreambleAccepted } from "./BetaPreamble";
import { Wordmark } from "./chat/Wordmark";
import { UserRecap } from "./chat/UserRecap";
import { WelcomePanel } from "./chat/WelcomePanel";
import { ThinkingState } from "./chat/ThinkingState";
import { InsightCard } from "./chat/InsightCard";
import { ClarifyingQuestion } from "./chat/ClarifyingQuestion";
import { PageAtmosphere } from "./chat/PageAtmosphere";
import type { InsightMedia } from "@/lib/media";

// ─── Types ──────────────────────────────────────────────────────────────

type Mode = "welcome" | "thinking" | "insight" | "clarify" | "message" | "error";

interface ChatResponse {
  reply: string;
  sessionId: string;
  toolsUsed: string[];
  last_insight_id: string | null;
  feedback_handled: string | null;
  media: InsightMedia | null;
}

// ─── Helpers (preserved verbatim from the previous ChatWindow) ──────────

function sanitizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

function getBetaUserHandle(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("user");
  if (!raw) return null;
  const clean = sanitizeHandle(raw);
  return clean || null;
}

function getSessionId(handle: string | null): string {
  if (typeof window === "undefined") return "anonymous";
  const storageKey = handle
    ? `silhouette-session-${handle}`
    : "silhouette-session";
  let id = sessionStorage.getItem(storageKey);
  if (!id) {
    const prefix = handle ? `s-${handle}-` : "s-";
    id = prefix + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem(storageKey, id);
  }
  return id;
}

// ─── Component ──────────────────────────────────────────────────────────

export function ChatWindow() {
  // Beta-preamble gate — first-visit acceptance, persisted in localStorage.
  const [preambleAccepted, acceptPreamble] = useBetaPreambleAccepted();

  // Identity refs — established once after hydration.
  const sessionIdRef = useRef<string>("anonymous");
  const handleRef = useRef<string | null>(null);
  useEffect(() => {
    handleRef.current = getBetaUserHandle();
    sessionIdRef.current = getSessionId(handleRef.current);
  }, []);

  // State machine.
  const [mode, setMode] = useState<Mode>("welcome");
  // The user's original "What feels stuck?" answer — shown in UserRecap on
  // every subsequent state. Preserved across feedback / clarify turns.
  const [originalInput, setOriginalInput] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [clarifyQuestion, setClarifyQuestion] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");

  async function sendToApi(
    text: string,
    feedbackSource?: "text" | "button"
  ): Promise<void> {
    setMode("thinking");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          user_handle: handleRef.current,
          feedback_source: feedbackSource ?? "text",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as ChatResponse;
      routeResponse(data);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Something went wrong.");
      setMode("error");
    }
  }

  // Route a successful response into a UI state:
  //   - last_insight_id present  → render the insight card
  //   - reply ends with "?"      → render the clarifying-question state
  //   - everything else          → render a calm message state with the reply
  function routeResponse(data: ChatResponse) {
    setResponse(data);
    if (data.last_insight_id) {
      setMode("insight");
      return;
    }
    if (data.reply.trim().endsWith("?")) {
      setClarifyQuestion(data.reply.trim());
      setMode("clarify");
      return;
    }
    setMessageText(data.reply.trim());
    setMode("message");
  }

  // Welcome submit — first message of a session, set the originalInput
  // that will be echoed back via UserRecap on subsequent turns.
  async function handleWelcomeSubmit(text: string) {
    setOriginalInput(text);
    await sendToApi(text, "text");
  }

  // Clarifying-question submit — the agent's question becomes the next
  // /api/chat message. originalInput stays the same so UserRecap remains
  // anchored on the user's original stuck moment.
  async function handleClarifySubmit(answer: string) {
    await sendToApi(answer, "text");
  }

  // Feedback row — "yes" or "show me something different". The agent's
  // detectFeedbackIntent recognises these literal phrases. feedback_source
  // is "button" so the analytics layer can distinguish click-vs-text.
  async function handleFeedbackText(text: string) {
    await sendToApi(text, "button");
  }

  // Reset back to the welcome state. Used by the message/error states.
  function handleReset() {
    setMode("welcome");
    setOriginalInput("");
    setResponse(null);
    setClarifyQuestion("");
    setMessageText("");
    setErrorText("");
  }

  // ── Render gating ────────────────────────────────────────────────────
  //
  // The page shell + PageAtmosphere is always rendered so the radial glow
  // and bottom horizon line are present from the first paint, including
  // behind the beta preamble. The atmosphere never depends on state.

  // Tri-state preamble: null = not yet resolved on the client. Render the
  // empty shell (with atmosphere) to avoid both: first-time users briefly
  // seeing the chat behind the preamble, and returning users seeing the
  // preamble flash on top of the chat.

  return (
    <main className="relative min-h-screen bg-sil-bg flex flex-col overflow-x-hidden">
      <PageAtmosphere />

      {preambleAccepted === null && <div className="min-h-screen" />}

      {preambleAccepted === false && (
        <div className="relative z-10 flex-1 flex items-start justify-center px-5 py-12 md:py-20">
          <BetaPreamble onAccept={acceptPreamble} />
        </div>
      )}

      {preambleAccepted === true && (
        <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-16 md:py-24">
          <div className="w-full max-w-[720px]">
            {mode === "welcome" && (
              <WelcomePanel onSubmit={handleWelcomeSubmit} />
            )}

            {mode === "thinking" && (
              <ThinkingState userInput={originalInput} />
            )}

            {mode === "insight" && response && response.last_insight_id && (
              <InsightCard
                reply={response.reply}
                media={response.media}
                insightId={response.last_insight_id}
                sessionId={sessionIdRef.current}
                userInput={originalInput}
                onFeedbackText={handleFeedbackText}
              />
            )}

            {mode === "clarify" && (
              <ClarifyingQuestion
                userInput={originalInput}
                question={clarifyQuestion}
                onSubmit={handleClarifySubmit}
              />
            )}

            {mode === "message" && (
              <CalmMessageState
                userInput={originalInput}
                text={messageText}
                onReset={handleReset}
              />
            )}

            {mode === "error" && (
              <CalmMessageState
                userInput={originalInput}
                text={errorText}
                onReset={handleReset}
                tone="error"
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ─── CalmMessageState (private) ─────────────────────────────────────────
// Shown for non-insight replies: positive acks ("Glad it landed."),
// no-retry messages ("I'm not finding something else right now."), and
// transport errors. Always offers a "Start over" path home.

function CalmMessageState({
  userInput,
  text,
  onReset,
  tone,
}: {
  userInput: string;
  text: string;
  onReset: () => void;
  tone?: "error";
}) {
  return (
    <div className="flex flex-col items-center gap-8 w-full animate-sil-fade-in">
      <Wordmark />

      {userInput && <UserRecap text={userInput} />}

      <div className="relative w-full animate-sil-rise-in">
        {/* Same halo treatment as the insight card, slightly fainter so the
         * message state feels quieter than a full insight surface. */}
        <div
          aria-hidden="true"
          className="absolute -inset-6 pointer-events-none"
          style={{
            background:
              "radial-gradient(55% 70% at 50% 40%, oklch(0.55 0.15 280 / 0.10) 0%, transparent 75%)",
          }}
        />
        <div
          className={`relative bg-sil-elevated rounded-sil-card border p-6 md:p-8 ${
            tone === "error" ? "border-sil-danger/40" : "border-sil-border"
          }`}
        >
          <p className="text-sil-text text-sm leading-relaxed text-center">
            {text}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="group inline-flex items-center gap-1.5 text-sil-muted text-sm
                   hover:text-sil-text transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-sil-accent
                   focus-visible:ring-offset-2 focus-visible:ring-offset-sil-bg
                   rounded px-2 py-1"
      >
        <span aria-hidden="true" className="group-hover:-translate-x-0.5 transition-transform">
          ←
        </span>
        <span>Start over</span>
      </button>
    </div>
  );
}
