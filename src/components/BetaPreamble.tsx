"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "silhouette-beta-preamble-accepted-v1";

interface BetaPreambleProps {
  onAccept: () => void;
}

// First-visit gate. Copy is load-bearing trust architecture (Component 8):
// - the "this is not a crisis service" line + 988 link
// - the paraphrase disclosure
// - the "two things help most" feedback ask
// ALL COPY BELOW IS PRESERVED VERBATIM from the previous version. Visual
// chrome refined; words untouched.
//
// The page shell + PageAtmosphere is provided by ChatWindow; this component
// renders only the card itself.

export function BetaPreamble({ onAccept }: BetaPreambleProps) {
  return (
    <div className="relative max-w-xl w-full animate-in fade-in duration-400">
      {/* Soft purple halo behind the card — keeps the disclaimer from
       * reading like a cold legal box. */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 30%, oklch(0.55 0.15 280 / 0.12) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative bg-sil-elevated/95 backdrop-blur-sm border border-sil-border rounded-sil-card
                   p-6 md:p-8 text-sil-text text-sm leading-relaxed shadow-2xl shadow-black/40"
      >
        <p className="font-medium text-sil-text mb-3">
          A few things to know before you start.
        </p>

        <p className="text-sil-muted mb-3">
          Silhouette is built for moments of career, direction, motivation, or
          purpose stuckness — especially the in-between feeling of being
          functional but not engaged. It&apos;s most useful for early- and
          mid-career people navigating that quiet kind of stuck.
        </p>

        <div className="my-4 p-3.5 pl-4 bg-sil-surface/80 border-l-2 border-sil-danger/70 rounded-r-md">
          <p className="text-sil-muted m-0">
            <strong className="text-sil-text">This is not a crisis service.</strong>{" "}
            Silhouette is not a therapist or mental-health care. If you&apos;re
            in crisis or immediate danger, please reach out to{" "}
            <a
              href="https://988lifeline.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sil-danger font-semibold underline underline-offset-2 hover:text-sil-text transition-colors"
            >
              988
            </a>{" "}
            in the US or your local emergency resources.
          </p>
        </div>

        <p className="text-sil-muted mb-3">
          This is an early prototype. Some quotes are paraphrased
          reconstructions of documented work by real speakers, not verified
          verbatim transcripts. Treat the source moments as prototype
          material, not final citations.
        </p>

        <p className="text-sil-muted mb-5">
          Two things help most: click <strong className="text-sil-text">Yes</strong>{" "}
          if an insight lands, and{" "}
          <strong className="text-sil-text">Show me something different</strong>{" "}
          if it doesn&apos;t. That&apos;s the signal that makes the next
          version better.
        </p>

        <button
          type="button"
          onClick={onAccept}
          className="group relative px-5 py-2.5 rounded-sil-button bg-sil-accent text-sil-bg text-sm font-medium
                     shadow-[0_8px_24px_-8px_oklch(0.55_0.15_280/0.5),inset_0_1px_0_oklch(0.85_0.06_280/0.4)]
                     hover:bg-sil-accent hover:shadow-[0_12px_28px_-6px_oklch(0.55_0.15_280/0.6),inset_0_1px_0_oklch(0.85_0.06_280/0.5)]
                     transition-shadow
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-sil-accent
                     focus-visible:ring-offset-2 focus-visible:ring-offset-sil-elevated"
        >
          I understand — continue
        </button>
      </div>
    </div>
  );
}

// Tri-state: null = not yet resolved on the client (SSR + first paint),
// true = accepted, false = needs to accept. Prevents both: first-time users
// briefly seeing the chat behind the preamble, and returning users seeing
// the preamble flash on top of the chat.
export function useBetaPreambleAccepted(): [boolean | null, () => void] {
  const [accepted, setAccepted] = useState<boolean | null>(null);

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
