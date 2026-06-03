"use client";

import { useState } from "react";
import {
  type InsightMedia,
  hasVerifiedEmbed,
  isAllowedEmbedHost,
} from "@/lib/media";

/**
 * InsightMediaCard
 *
 * Click-to-play embedded media card rendered inside the InsightCard, below
 * the attribution line.
 *
 * Behavior preserved from the inline-styled version:
 *   - Initial state: a placeholder showing the speaker, source, and a play
 *     button. NO iframe loaded. No third-party requests fire before click.
 *   - On click: replaces the placeholder with an <iframe> at the embed URL
 *     (already carrying ?start=… for YouTube when timestamp is set).
 *   - The provider host is checked against the allowlist a SECOND time at
 *     render (hasVerifiedEmbed + isAllowedEmbedHost). A media object with
 *     an unrecognised host never mounts an iframe — it falls back to a
 *     plain source link.
 *   - When media is unverified or unembeddable, the component renders a
 *     clean fallback link (Watch / Listen / Read).
 *   - Never autoplay. Never multiple videos. Never a video without speaker
 *     attribution visible.
 *
 * This is the runtime safety boundary: do not weaken the allowlist check.
 */

interface Props {
  media: InsightMedia;
}

function providerLabel(p: InsightMedia["provider"]): string {
  if (p === "youtube") return "YouTube";
  if (p === "ted") return "TED";
  if (p === "vimeo") return "Vimeo";
  return "source";
}

function FallbackLink({ media }: { media: InsightMedia }) {
  const url = media.fallback_url;
  if (!url) return null;
  const verb =
    media.fallback_label === "Watch"
      ? `Watch on ${providerLabel(media.provider)}`
      : media.fallback_label === "Listen"
      ? "Listen to the full episode"
      : "Read the source";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sil-accent text-sm
                 hover:underline underline-offset-2 w-fit"
    >
      {verb} →
    </a>
  );
}

function Placeholder({
  media,
  onPlay,
}: {
  media: InsightMedia;
  onPlay: () => void;
}) {
  const hasYouTubeThumb = media.provider === "youtube" && !!media.thumbnail_url;
  const ariaLabel = `Play ${media.speaker ?? "video"}${
    media.timestamp_label ? ` from ${media.timestamp_label}` : ""
  }`;

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={ariaLabel}
      className="absolute inset-0 w-full h-full group focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-sil-accent focus-visible:ring-inset"
    >
      {hasYouTubeThumb && (
        // The YouTube thumbnail is a deterministic public URL — no API key
        // required. Loading it does not register a play count.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.thumbnail_url ?? undefined}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      {!hasYouTubeThumb && (
        // TED (and others) have no stable public per-slug thumbnail. Render
        // a styled placeholder with a hint of purple toward the corner —
        // never a fabricated image.
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.19 0.018 280) 0%, oklch(0.16 0.015 285) 60%, oklch(0.24 0.05 285) 100%)",
          }}
        />
      )}
      {/* Soft scrim for legibility against varied thumbnail content. */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
      {/* Optional "from M:SS" pill — only when a verified timestamp exists.
       * Surfacing this in chrome (vs hiding it in aria) lets the user see
       * the offered moment before they click play. Soft, low-emphasis. */}
      {media.timestamp_label && (
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md text-[11px] tracking-wide
                        bg-sil-bg/70 backdrop-blur-sm text-sil-muted border border-sil-border/60">
          from {media.timestamp_label}
        </div>
      )}
      {/* Centered play glyph — ringed with a faint purple halo so it reads
       * as an offered moment rather than a generic player widget. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-full bg-sil-bg/85 backdrop-blur-sm
                     ring-1 ring-sil-accent/30 flex items-center justify-center
                     group-hover:scale-105 group-hover:ring-sil-accent/55
                     transition-all duration-300"
          style={{
            boxShadow: "0 0 32px oklch(0.55 0.15 280 / 0.25)",
          }}
        >
          <svg
            className="w-5 h-5 text-sil-text ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function Player({ media }: { media: InsightMedia }) {
  const url = media.embed_url;
  // Belt-and-suspenders: if somehow we got here without a safe embed_url,
  // render the fallback link instead of mounting anything.
  if (!url || !isAllowedEmbedHost(url)) {
    return <FallbackLink media={media} />;
  }

  const iframeTitle = `${media.speaker ?? "Source"} — ${
    media.source_title ?? "video"
  }`;
  // Provider-specific allow attribute. We DON'T set a restrictive
  // sandbox=""; overly tight sandboxes break YouTube playback. The host
  // allowlist is the policy boundary we rely on.
  const allow =
    media.provider === "youtube"
      ? "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      : "autoplay; fullscreen; encrypted-media; picture-in-picture";

  return (
    <iframe
      src={url}
      title={iframeTitle}
      loading="lazy"
      allow={allow}
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="absolute inset-0 w-full h-full"
    />
  );
}

export function InsightMediaCard({ media }: Props) {
  const [playing, setPlaying] = useState(false);

  // If we don't have a verified embed, render only a quiet source link
  // (or nothing if there's no URL at all).
  if (!hasVerifiedEmbed(media)) {
    if (!media.fallback_url) return null;
    return (
      <div className="text-sm">
        <FallbackLink media={media} />
      </div>
    );
  }

  // Label honesty:
  //   - exact_quote_match or close_paraphrase + timestamp → "Watch the moment"
  //     (the user is being pointed at the moment the insight came from)
  //   - talking_point + timestamp → "Watch near this moment"
  //     (we have a sensible spot to start, but the SIO captures the broader idea
  //     rather than a single verbatim moment; "the moment" would overclaim)
  //   - no timestamp → "Watch the source"
  //     (the embed plays from the start of the source; never imply pinpoint)
  let mediaLabel: string;
  if (!media.timestamp_label) {
    mediaLabel = "Watch the source";
  } else if (media.clip_match_type === "talking_point") {
    mediaLabel = "Watch near this moment";
  } else {
    mediaLabel = "Watch the moment";
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <p className="text-sil-subtle text-xs tracking-wide">{mediaLabel}</p>

      <div className="relative aspect-video rounded-lg overflow-hidden bg-sil-surface border border-sil-border">
        {playing ? (
          <Player media={media} />
        ) : (
          <Placeholder media={media} onPlay={() => setPlaying(true)} />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sil-text text-sm">{media.speaker}</p>
        <p className="text-sil-subtle text-xs tracking-wide">
          {media.show_or_platform}
          {media.provider && media.provider !== "none" && (
            <> · {providerLabel(media.provider)}</>
          )}
        </p>
      </div>
    </div>
  );
}
