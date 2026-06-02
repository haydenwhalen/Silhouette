"use client";

import React, { useState } from "react";
import {
  type InsightMedia,
  hasVerifiedEmbed,
  isAllowedEmbedHost,
} from "@/lib/media";

/**
 * InsightMediaCard
 *
 * Click-to-play embedded media card rendered between the attribution line and
 * the why-this-applies framing in a Silhouette insight answer.
 *
 * Behavior:
 *   - Initial state: a placeholder showing the speaker, source, timestamp
 *     label, and a play button. NO iframe is loaded. This is the click-to-play
 *     promise — no third-party requests fire before the user opts in.
 *   - On click: replaces the placeholder with an <iframe> at the embed URL,
 *     which (for YouTube) already carries ?start=<seconds> so playback opens
 *     at the verified moment.
 *
 * Trust posture:
 *   - The provider host is checked against the allowlist a SECOND time at
 *     render (hasVerifiedEmbed). A media object with an unrecognized host
 *     never mounts an iframe — it falls back to a plain source link.
 *   - When media is unverified or unembeddable, the component renders a clean
 *     fallback link (Watch on TED / Watch on YouTube / Listen / Read).
 *   - Never autoplay. Never multiple videos. Never a video without speaker
 *     attribution visible.
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

function fallbackLink(media: InsightMedia): React.ReactNode {
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
      style={{
        display: "inline-block",
        marginTop: "0.5rem",
        fontSize: "0.8rem",
        color: "#6fa8dc",
        textDecoration: "underline",
      }}
    >
      {verb} →
    </a>
  );
}

/**
 * Renders the unloaded placeholder. For YouTube we have a deterministic public
 * thumbnail URL (i.ytimg.com/vi/<id>/hqdefault.jpg) — using it is a single
 * background request, no script. For TED we have no stable thumbnail URL so we
 * render a styled placeholder (TED brand color hint + speaker glyph).
 */
function Placeholder({
  media,
  onPlay,
}: {
  media: InsightMedia;
  onPlay: () => void;
}) {
  const hasYouTubeThumb = media.provider === "youtube" && !!media.thumbnail_url;

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${media.speaker ?? "video"}${
        media.timestamp_label ? ` from ${media.timestamp_label}` : ""
      }`}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        background: hasYouTubeThumb
          ? `#000 url(${media.thumbnail_url}) center/cover no-repeat`
          : "linear-gradient(135deg, #1f2a36 0%, #2b3a4d 100%)",
        border: "1px solid #2a3a4a",
        borderRadius: "0.5rem",
        cursor: "pointer",
        padding: 0,
        overflow: "hidden",
        display: "block",
      }}
    >
      {/* Dim overlay for legibility on thumbnails */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Play glyph — centered */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(0, 0, 0, 0.65)",
          border: "2px solid rgba(255, 255, 255, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            display: "block",
            width: 0,
            height: 0,
            borderTop: "10px solid transparent",
            borderBottom: "10px solid transparent",
            borderLeft: "16px solid rgba(255, 255, 255, 0.95)",
            marginLeft: "4px", // optical centering for triangle
          }}
        />
      </span>

      {/* Bottom-left identity strip: speaker · timestamp · provider */}
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0.5rem 0.75rem",
          color: "#e8e8e8",
          fontSize: "0.8rem",
          fontWeight: 500,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          alignItems: "center",
          textAlign: "left",
        }}
      >
        {media.speaker && <span>{media.speaker}</span>}
        {media.timestamp_label && (
          <>
            <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
            <span style={{ opacity: 0.85 }}>from {media.timestamp_label}</span>
          </>
        )}
        <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
        <span style={{ opacity: 0.7, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {providerLabel(media.provider)}
        </span>
      </span>
    </button>
  );
}

/**
 * Renders the actual <iframe> after the user has clicked play. Provider host
 * is checked one more time before mount — defense in depth.
 */
function Player({ media }: { media: InsightMedia }) {
  const url = media.embed_url;
  if (!url || !isAllowedEmbedHost(url)) {
    // This is the belt-and-suspenders path: if somehow we got into Player
    // state without a safe embed_url, render the fallback link instead of
    // mounting anything.
    return <div style={{ padding: "0.5rem 0" }}>{fallbackLink(media)}</div>;
  }

  const iframeTitle = `${media.speaker ?? "Source"} — ${
    media.source_title ?? "video"
  }`;

  // Provider-specific allow attribute (controls fullscreen / PiP). YouTube
  // needs encrypted-media for DRM-licensed content. We DON'T set
  // sandbox="" — too restrictive sandboxes break YouTube playback, and the
  // host allowlist is the policy boundary we actually rely on.
  const allow =
    media.provider === "youtube"
      ? "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      : "autoplay; fullscreen; encrypted-media; picture-in-picture";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#000",
        borderRadius: "0.5rem",
        overflow: "hidden",
        border: "1px solid #2a3a4a",
      }}
    >
      <iframe
        src={url}
        title={iframeTitle}
        loading="lazy"
        allow={allow}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </div>
  );
}

export function InsightMediaCard({ media }: Props) {
  const [playing, setPlaying] = useState(false);

  // If we don't have a verified embed, render a clean fallback link (or
  // nothing, if there's no URL to link). The card is intentionally absent
  // when there's nothing trustworthy to mount.
  if (!hasVerifiedEmbed(media)) {
    const link = fallbackLink(media);
    if (!link) return null;
    return (
      <div
        style={{
          margin: "0.5rem 0 0.75rem 0",
          fontSize: "0.85rem",
          color: "#aaa",
        }}
      >
        {link}
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "0.75rem 0",
        // Keep the card visually contained — sits naturally inside the
        // assistant message bubble (max-width 85% per ChatWindow).
      }}
    >
      {playing ? <Player media={media} /> : <Placeholder media={media} onPlay={() => setPlaying(true)} />}

      {/* Secondary caption under the card: source title only.
          The "Watch on Provider" link lives in the rendered_markdown source
          line below — keeping one canonical text link rather than two. */}
      {media.source_title && (
        <div
          style={{
            marginTop: "0.4rem",
            fontSize: "0.75rem",
            color: "#999",
            fontStyle: "italic",
          }}
        >
          {media.source_title}
        </div>
      )}
    </div>
  );
}
