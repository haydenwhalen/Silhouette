"use client";

import React from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
}

function renderSimpleMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
  return tokens.map((token, i) => {
    const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6fa8dc", textDecoration: "underline" }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    const boldMatch = token.match(/^\*\*(.*?)\*\*$/);
    if (boldMatch) {
      return <strong key={i}>{boldMatch[1]}</strong>;
    }
    return token;
  });
}

export function MessageList({ messages, loading }: MessageListProps) {
  if (messages.length === 0 && !loading) {
    return (
      <div style={{ color: "#555", fontSize: "0.875rem", padding: "2rem 0", textAlign: "center" }}>
        Tell Silhouette what is going on for you right now.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            background: msg.role === "user" ? "#1a1a2e" : "#162028",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            maxWidth: "85%",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {msg.role === "assistant"
            ? renderSimpleMarkdown(msg.content)
            : msg.content}
        </div>
      ))}
      {loading && (
        <div
          style={{
            alignSelf: "flex-start",
            color: "#666",
            fontSize: "0.85rem",
            padding: "0.75rem 1rem",
            fontStyle: "italic",
          }}
        >
          Silhouette is thinking...
        </div>
      )}
    </div>
  );
}
