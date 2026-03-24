"use client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
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
            lineHeight: 1.5,
          }}
        >
          {msg.content}
        </div>
      ))}
    </div>
  );
}
