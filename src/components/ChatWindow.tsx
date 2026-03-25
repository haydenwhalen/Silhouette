"use client";

import { useState, useRef, useEffect } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "anonymous";
  let id = sessionStorage.getItem("silhouette-session");
  if (!id) {
    id = "s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem("silhouette-session", id);
  }
  return id;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(text: string) {
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: getSessionId() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 8rem)" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "1rem" }}>
        <MessageList messages={messages} loading={loading} />
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
