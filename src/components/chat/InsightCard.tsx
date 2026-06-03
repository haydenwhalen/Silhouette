"use client";

import { Wordmark } from "./Wordmark";
import { UserRecap } from "./UserRecap";
import { FeedbackRow } from "./FeedbackRow";
import { InsightMediaCard } from "../InsightMediaCard";
import { FEEDBACK_MARKER_TEXT } from "@/presentation/feedbackMarker";
import type { InsightMedia } from "@/lib/media";

// ─── Parser ─────────────────────────────────────────────────────────────
//
// The agent returns `reply` as a Markdown string with a fixed structure:
//
//   [optional bridge sentence]
//
//   > excerpt line 1
//   > excerpt line 2
//
//   — Speaker, appearing on Show, "Episode" (YYYY)
//
//   Why-this-applies sentence
//
//   Watch the talk → https://www.youtube.com/watch?v=...
//
//   <!--SILHOUETTE-FEEDBACK-MARKER-->
//
// We split it into structural fields so the card can render each part in its
// own visual slot (serif excerpt, tracked attribution, muted why, etc.).

interface ParsedInsight {
  bridge: string | null;
  excerpt: string;
  attribution: string;
  why: string;
  sourceLabel: string;
  sourceUrl: string;
}

function parseInsightReply(reply: string): ParsedInsight {
  // Strip the feedback marker first — it's a server→client contract that
  // the agent appends to insight turns; the user should never see it.
  const cleaned = reply.replace(FEEDBACK_MARKER_TEXT, "").trim();
  const lines = cleaned.split("\n");

  let bridge: string | null = null;
  let attribution = "";
  let sourceLabel = "";
  let sourceUrl = "";

  const excerptLines: string[] = [];
  const whyLines: string[] = [];

  type Section = "start" | "excerpt" | "after-attribution";
  let currentSection: Section = "start";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // The source-link line: "Watch the talk → https://…"
    if (trimmed.includes("→") && trimmed.includes("http")) {
      const arrowIdx = trimmed.indexOf("→");
      sourceLabel = trimmed.slice(0, arrowIdx).trim();
      sourceUrl = trimmed.slice(arrowIdx + 1).trim();
      continue;
    }

    // The attribution line: "— Speaker, appearing on Show, …"
    if (/^[—–-]\s/.test(trimmed)) {
      attribution = trimmed.replace(/^[—–-]\s*/, "");
      currentSection = "after-attribution";
      continue;
    }

    // Excerpt lines all begin with "> "
    if (trimmed.startsWith(">")) {
      excerptLines.push(trimmed.replace(/^>\s?/, ""));
      currentSection = "excerpt";
      continue;
    }

    // Everything else is either the bridge (before the excerpt) or the
    // why-this-applies sentence (after the attribution).
    if (currentSection === "start") {
      if (!bridge) bridge = trimmed;
    } else if (currentSection === "after-attribution") {
      whyLines.push(trimmed);
    }
  }

  return {
    bridge,
    excerpt: excerptLines.join(" "),
    attribution,
    why: whyLines.join(" "),
    sourceLabel: sourceLabel || "View source",
    sourceUrl,
  };
}

// "Apolo Ohno, appearing on The School of Greatness, \"Title\" (April 12, 2017)"
// → "Apolo Ohno · The School of Greatness · 2017"
function formatAttribution(attr: string): string {
  if (!attr) return "";
  const match = attr.match(
    /^([^,]+),?\s*(?:appearing on\s*)?([^,]+)?,?\s*(?:"[^"]*")?\s*\(([^)]+)\)?/i
  );
  if (!match) return attr;
  const [, speaker, source, date] = match;
  const year = date?.match(/\d{4}/)?.[0] ?? date;
  return [speaker?.trim(), source?.trim(), year?.trim()]
    .filter(Boolean)
    .join(" · ");
}

// ─── Component ──────────────────────────────────────────────────────────

interface InsightCardProps {
  reply: string;
  media: InsightMedia | null;
  insightId: string;
  sessionId: string;
  userInput: string;
  onFeedbackText: (text: string) => void;
  disabled?: boolean;
}

export function InsightCard({
  reply,
  media,
  insightId,
  sessionId,
  userInput,
  onFeedbackText,
  disabled,
}: InsightCardProps) {
  const parsed = parseInsightReply(reply);
  const hasMediaCard = !!(media && media.has_verified_embed);

  return (
    <div className="flex flex-col gap-8 w-full animate-sil-fade-in">
      <Wordmark />
      <UserRecap text={userInput} />

      {/* Card wrapper — holds the outer glow halo + the article. */}
      <div className="relative">
        {/* Soft purple-blue halo behind the card — sense of warmth emanating.
         * Decorative, never interferes with layout or pointer events. */}
        <div
          aria-hidden="true"
          className="absolute -inset-8 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 70% at 50% 30%, oklch(0.55 0.15 280 / 0.18) 0%, oklch(0.50 0.10 240 / 0.06) 45%, transparent 75%)",
          }}
        />

        <article
          className="relative bg-sil-elevated rounded-sil-card border border-sil-border
                     p-7 md:p-9 flex flex-col gap-7 shadow-2xl shadow-black/30 overflow-hidden
                     animate-sil-rise-in"
        >
          {/* Top-edge purple horizon line. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sil-accent/40 to-transparent"
          />

          {/* Inner top wash — extends the horizon glow slightly into the
           * card so the surface itself feels lit from above. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-24 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, oklch(0.55 0.15 280 / 0.08) 0%, transparent 100%)",
            }}
          />

          {/* Bridge sentence — gentle handoff from user to source. */}
          {parsed.bridge && (
            <p className="relative text-sil-muted text-sm italic leading-relaxed">
              {parsed.bridge}
            </p>
          )}

          {/* Excerpt — the centerpiece. Serif, generous, with an elegant
           * open-quote glyph positioned to read as a real serif quote mark
           * rather than a decoration. */}
          <blockquote className="relative pl-6 md:pl-7">
            <span
              aria-hidden="true"
              className="absolute -left-1 -top-4 md:-left-2 md:-top-5 text-7xl md:text-8xl
                         text-sil-accent/30 font-serif leading-none select-none"
            >
              &ldquo;
            </span>
            <p
              className="font-serif text-sil-text text-lg md:text-xl leading-relaxed
                         animate-sil-rise-in-slow"
            >
              {parsed.excerpt}
            </p>
          </blockquote>

          {/* Attribution — proof of humanness. Tracked, muted, with a small
           * accent hairline above to give it the "this is a real person"
           * weight rather than reading as metadata. */}
          <div className="relative flex flex-col gap-2">
            <div className="h-px w-8 bg-sil-accent/40" aria-hidden="true" />
            <p className="text-sil-muted text-xs tracking-[0.08em] uppercase">
              {formatAttribution(parsed.attribution)}
            </p>
          </div>

          {/* Media card — only when there's a verified embed. */}
          {hasMediaCard && media && (
            <div className="pt-2">
              <InsightMediaCard media={media} />
            </div>
          )}

          {/* Why-this-applies — no label, just the muted interpretive line
           * after a hairline. Reads as a calm second voice rather than a
           * diagnostic section header. */}
          {parsed.why && (
            <div className="relative pt-5 border-t border-sil-border/40">
              <p className="text-sil-muted text-sm leading-relaxed">
                {parsed.why}
              </p>
            </div>
          )}

          {/* Source link — soft arrow that gently nudges on hover. */}
          {parsed.sourceUrl && (
            <a
              href={parsed.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-1.5 text-sil-accent text-sm
                         hover:text-sil-accent transition-colors w-fit"
            >
              <span className="underline-offset-4 group-hover:underline">
                {parsed.sourceLabel}
              </span>
              <span className="group-hover:animate-sil-arrow-nudge" aria-hidden="true">
                →
              </span>
            </a>
          )}

          <FeedbackRow
            insightId={insightId}
            sessionId={sessionId}
            onFeedbackText={onFeedbackText}
            disabled={disabled}
          />
        </article>
      </div>
    </div>
  );
}
