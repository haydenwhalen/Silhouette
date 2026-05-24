"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "silhouette-beta-preamble-accepted-v1";

interface BetaPreambleProps {
  onAccept: () => void;
}

export function BetaPreamble({ onAccept }: BetaPreambleProps) {
  return (
    <div
      style={{
        maxWidth: 560,
        margin: "1.5rem auto 0",
        padding: "1.5rem 1.25rem",
        background: "#13191f",
        border: "1px solid #1f2c38",
        borderRadius: "0.75rem",
        color: "#d8d8d8",
        fontSize: "0.9rem",
        lineHeight: 1.6,
      }}
    >
      <p style={{ marginTop: 0, marginBottom: "0.75rem", fontWeight: 600, color: "#e8e8e8" }}>
        A few things to know before you start.
      </p>

      <p style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>
        Silhouette is built for moments of career, direction, motivation, or
        purpose stuckness — especially the in-between feeling of being
        functional but not engaged. It's most useful for early- and
        mid-career people navigating that quiet kind of stuck.
      </p>

      <p style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>
        It is <em>not</em> a therapist, a crisis service, or mental-health care.
        If you're in crisis or immediate danger, please reach out to{" "}
        <a
          href="https://988lifeline.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6fa8dc", textDecoration: "underline" }}
        >
          988
        </a>{" "}
        in the US or your local emergency resources.
      </p>

      <p style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>
        This is an early prototype. Some quotes are paraphrased reconstructions
        of documented work by real speakers, not verified verbatim transcripts.
        Treat the source moments as prototype material, not final citations.
      </p>

      <p style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
        Two things help most: click <strong>Yes</strong> if an insight lands,
        and <strong>Show me something different</strong> if it doesn't. That's
        the signal that makes the next version better.
      </p>

      <button
        type="button"
        onClick={onAccept}
        style={{
          padding: "0.6rem 1.25rem",
          borderRadius: "0.4rem",
          border: "1px solid #4a6fa5",
          background: "#1f2c38",
          color: "#e8e8e8",
          fontSize: "0.9rem",
          cursor: "pointer",
        }}
      >
        I understand — continue
      </button>
    </div>
  );
}

export function useBetaPreambleAccepted(): [boolean, () => void] {
  // Default `accepted` to true during SSR / first hydration so the preamble
  // never flashes for returning users; we flip it to false on mount if no
  // localStorage flag exists.
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setAccepted(stored === "true");
  }, []);

  function accept() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
    setAccepted(true);
  }

  return [accepted, accept];
}
