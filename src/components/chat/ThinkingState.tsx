"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";
import { UserRecap } from "./UserRecap";

// Calm two-stage loading. No spinner. "Listening…" first; after ~800ms the
// label transitions to "Finding a moment…". A single small accent dot
// breathes gently next to the label — one signal, not a row of dots.

export function ThinkingState({ userInput }: { userInput: string }) {
  const [phase, setPhase] = useState<"listening" | "finding">("listening");

  useEffect(() => {
    const timer = setTimeout(() => setPhase("finding"), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 w-full animate-sil-fade-in">
      <Wordmark />

      <div className="flex flex-col gap-6 w-full">
        <UserRecap text={userInput} />

        <div className="flex items-center gap-3 text-sil-muted">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full bg-sil-accent animate-sil-breath"
          />
          <span
            className="text-sm transition-opacity duration-500"
            aria-live="polite"
          >
            {phase === "listening" ? "Listening…" : "Finding a moment…"}
          </span>
        </div>
      </div>
    </div>
  );
}
