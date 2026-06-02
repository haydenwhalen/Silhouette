"use client";

import React from "react";
import { FeedbackButtons } from "./FeedbackButtons";
import { InsightMediaCard } from "./InsightMediaCard";
import { FEEDBACK_MARKER_TEXT } from "@/presentation/feedbackMarker";
import type { InsightMedia } from "@/lib/media";

export interface Message {
  role: "user" | "assistant";
  content: string;
  // Insight metadata for the latest insight presentation; null on other turns.
  // Buttons only render for the latest assistant message that has this set.
  insight_id?: string | null;
  // Structured media for the SIO presented this turn. Null when no media
  // applies (clarifying question, feedback ack, etc.). The InsightMediaCard
  // is rendered between the excerpt blockquote and the why-this-applies line.
  media?: InsightMedia | null;
}

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
  sessionId: string;
  onFeedbackText: (text: string) => void;
  feedbackDisabled?: boolean;
}

// Marker constant comes from the presentation layer — single source of truth.
function hasFeedbackMarker(content: string): boolean {
  return content.trimEnd().endsWith(FEEDBACK_MARKER_TEXT);
}

function stripFeedbackMarker(content: string): string {
  const idx = content.lastIndexOf(FEEDBACK_MARKER_TEXT);
  if (idx === -1) return content.trim();
  return content.slice(0, idx).trim();
}

// Renders inline text with:
//   **bold**          → <strong>
//   [text](url)       → markdown link
//   bare http(s) URL  → autolink
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Tokenize on: markdown link, bold, or bare URL. Order matters — markdown
  // link first so we don't double-match URLs inside (...)
  const tokenRegex =
    /(\[[^\]]+?\]\([^)]+?\)|\*\*[^*]+?\*\*|https?:\/\/[^\s)]+)/g;
  const parts = text.split(tokenRegex);
  return parts.map((part, i) => {
    if (!part) return null;
    const linkMatch = part.match(/^\[([^\]]+?)\]\(([^)]+?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6fa8dc", textDecoration: "underline" }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    const boldMatch = part.match(/^\*\*([^*]+?)\*\*$/);
    if (boldMatch) {
      return <strong key={`${keyPrefix}-${i}`}>{boldMatch[1]}</strong>;
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6fa8dc", textDecoration: "underline", wordBreak: "break-all" }}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

// Splits content into logical blocks (block quote, attribution line, plain
// paragraph) and renders each with appropriate styling.
//
// When `media` is provided, the InsightMediaCard is injected immediately AFTER
// the attribution line (the `— ` paragraph) and BEFORE the why-this-applies
// paragraph. This puts the speaker/source identification first, then the
// optional video, then the framing — matching the product principle that the
// reader processes text first and the video is an opt-in deepening.
function renderBlocks(
  content: string,
  idx: number,
  media?: InsightMedia | null
): React.ReactNode[] {
  // Normalize: collapse 3+ blank lines to 2.
  const normalized = content.replace(/\n{3,}/g, "\n\n").trim();
  // Split into paragraphs by blank line.
  const paragraphs = normalized.split(/\n\s*\n/);
  const out: React.ReactNode[] = [];
  let mediaInserted = false;

  paragraphs.forEach((para, pIdx) => {
    const keyPrefix = `m${idx}-p${pIdx}`;
    const lines = para.split("\n");

    // Block quote: every line starts with `>`
    if (lines.every((l) => /^>\s?/.test(l))) {
      const inner = lines.map((l) => l.replace(/^>\s?/, "")).join("\n");
      out.push(
        <blockquote
          key={keyPrefix}
          style={{
            margin: "0.75rem 0",
            padding: "0.5rem 0 0.5rem 1rem",
            borderLeft: "3px solid #4a6fa5",
            fontStyle: "italic",
            color: "#d8d8d8",
            whiteSpace: "pre-wrap",
          }}
        >
          {renderInline(inner, keyPrefix)}
        </blockquote>
      );
      return;
    }

    // Attribution line: starts with `— ` (em-dash + space)
    if (/^—\s/.test(para)) {
      out.push(
        <p
          key={keyPrefix}
          style={{
            margin: "0.5rem 0",
            fontSize: "0.85rem",
            color: "#aaa",
            fontWeight: 500,
          }}
        >
          {renderInline(para, keyPrefix)}
        </p>
      );
      // Inject the media card immediately after attribution.
      if (media && !mediaInserted) {
        out.push(<InsightMediaCard key={`m${idx}-media`} media={media} />);
        mediaInserted = true;
      }
      return;
    }

    out.push(
      <p
        key={keyPrefix}
        style={{ margin: "0.5rem 0", whiteSpace: "pre-wrap" }}
      >
        {renderInline(para, keyPrefix)}
      </p>
    );
  });

  // Fallback: if media exists but no attribution line was found, append at end
  // so we never silently drop a verified embed.
  if (media && !mediaInserted) {
    out.push(<InsightMediaCard key={`m${idx}-media`} media={media} />);
  }

  return out;
}

export function MessageList({
  messages,
  loading,
  sessionId,
  onFeedbackText,
  feedbackDisabled,
}: MessageListProps) {
  if (messages.length === 0 && !loading) {
    return (
      <div style={{ color: "#555", fontSize: "0.875rem", padding: "2rem 0", textAlign: "center" }}>
        Tell Silhouette what is going on for you right now.
      </div>
    );
  }

  // Determine which message is the latest assistant insight (the only one
  // that should have active feedback buttons).
  let latestInsightIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.insight_id && hasFeedbackMarker(m.content)) {
      latestInsightIdx = i;
      break;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
      {messages.map((msg, i) => {
        const isAssistant = msg.role === "assistant";
        const isLatestInsight = i === latestInsightIdx;
        const displayedContent = isAssistant ? stripFeedbackMarker(msg.content) : msg.content;

        return (
          <div
            key={i}
            style={{
              alignSelf: isAssistant ? "flex-start" : "flex-end",
              background: isAssistant ? "#162028" : "#1a1a2e",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              maxWidth: "85%",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {isAssistant ? renderBlocks(displayedContent, i, msg.media) : (
              <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
            )}
            {isLatestInsight && msg.insight_id && (
              <FeedbackButtons
                insightId={msg.insight_id}
                sessionId={sessionId}
                onFeedbackText={onFeedbackText}
                disabled={feedbackDisabled}
              />
            )}
          </div>
        );
      })}
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
