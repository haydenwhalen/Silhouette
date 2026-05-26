"use client";

import { useState, useRef, useEffect } from "react";
import { MessageList, type Message } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { BetaPreamble, useBetaPreambleAccepted } from "./BetaPreamble";

function sanitizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
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

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>("anonymous");
  const handleRef = useRef<string | null>(null);
  const [preambleAccepted, acceptPreamble] = useBetaPreambleAccepted();

  useEffect(() => {
    handleRef.current = getBetaUserHandle();
    sessionIdRef.current = getSessionId(handleRef.current);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendToApi(text: string, source: "text" | "button" = "text") {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          user_handle: handleRef.current,
          feedback_source: source,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          insight_id: data.last_insight_id ?? null,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: msg, insight_id: null },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(text: string) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    await sendToApi(text);
  }

  // Per Component 9 §14, post-feedback should be quiet. Don't push a synthetic
  // "yes" / "show me something different" bubble to the transcript.
  async function handleFeedbackText(text: string) {
    await sendToApi(text, "button");
  }

  // null = not yet resolved on client; render an empty shell to keep layout stable
  // and avoid flashing either the chat (for first-timers) or the preamble (for returnees).
  if (preambleAccepted === null) {
    return <div style={{ minHeight: "calc(100vh - 8rem)" }} />;
  }
  if (!preambleAccepted) {
    return <BetaPreamble onAccept={acceptPreamble} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 8rem)" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "1rem" }}>
        <MessageList
          messages={messages}
          loading={loading}
          sessionId={sessionIdRef.current}
          onFeedbackText={handleFeedbackText}
          feedbackDisabled={loading}
        />
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
