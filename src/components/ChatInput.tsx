"use client";

import { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What's going on for you right now?"
        disabled={disabled}
        style={{
          flex: 1,
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          border: "1px solid #333",
          background: "#1a1a1a",
          color: "#e8e8e8",
          fontSize: "0.9rem",
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={disabled}
        style={{
          padding: "0.75rem 1.25rem",
          borderRadius: "0.5rem",
          border: "none",
          background: disabled ? "#333" : "#4a6fa5",
          color: "#e8e8e8",
          fontSize: "0.9rem",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        Send
      </button>
    </form>
  );
}
