"use client";

import { useEffect, useRef, useState } from "react";

// Low-pressure feedback row that lives inside the InsightCard.
// Two statement buttons ("This landed" / "Show me something different") —
// no question, no thumbs-up/down, no rating.
//
// TIER-1 PEAK-END NOTE: the styling here is deliberately QUIET (small, low
// contrast, text-button rather than a prominent pill CTA) so the emotional peak
// of the card stays the excerpt / source / why-line rather than the rating
// affordance. This is the *visual-recede* portion of the peak-end change only.
// The stronger peak-end move — a generated warm close / carry line / "Sit with
// this" gesture — is a deliberately DEFERRED Tier-2 bet (see
// ai/guides/insight_presentation_research_options.md). Behavior here (dwell
// signal, visibility qualification, payloads, feedback marker contract) is
// UNCHANGED — this is purely styling.
//
// Preserves the dwell-tracking behavior from the old FeedbackButtons:
//   - presentedAt timestamp is set per insight_id
//   - if the tab becomes hidden between presentation and click, the dwell
//     signal is marked unqualified
//   - on click, /api/feedback-signal is posted before the parent's
//     onFeedbackText callback fires (so the signal is recorded even if the
//     follow-up API call fails)

interface FeedbackRowProps {
  insightId: string;
  sessionId: string;
  onFeedbackText: (text: string) => void;
  disabled?: boolean;
}

type Phase = "ready" | "sending" | "sent";

export function FeedbackRow({
  insightId,
  sessionId,
  onFeedbackText,
  disabled,
}: FeedbackRowProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const presentedAtRef = useRef<number>(Date.now());
  const becameHiddenRef = useRef<boolean>(false);

  // Reset the dwell window whenever a new insight is presented.
  useEffect(() => {
    presentedAtRef.current = Date.now();
    becameHiddenRef.current = false;
    setPhase("ready");

    function onVisibility() {
      if (document.hidden) becameHiddenRef.current = true;
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [insightId]);

  async function postDwellSignal() {
    const dwell_ms = Date.now() - presentedAtRef.current;
    const dwell_qualified = !becameHiddenRef.current;
    try {
      await fetch("/api/feedback-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          insight_id: insightId,
          dwell_ms,
          dwell_qualified,
        }),
      });
    } catch {
      // Dwell signal is best-effort — never block the user-facing flow.
    }
  }

  async function handleClick(followUpText: string) {
    if (phase !== "ready" || disabled) return;
    setPhase("sending");
    await postDwellSignal();
    onFeedbackText(followUpText);
    setPhase("sent");
  }

  if (phase === "sent") {
    return (
      <div className="pt-5 border-t border-sil-border/50">
        <p className="text-sil-subtle text-sm text-center">
          Noted — thank you.
        </p>
      </div>
    );
  }

  const buttonsDisabled = phase !== "ready" || disabled;

  // Quiet, receding styling: small text-buttons (no shouty pill/border), low
  // contrast at rest, gently surfacing on hover/focus. Tap targets stay ≥ the
  // accessible minimum via py padding; focus ring preserved for keyboard users.
  const quietButton =
    "px-2 py-1.5 -mx-1 rounded-md bg-transparent text-sil-subtle text-xs " +
    "transition-colors duration-300 " +
    "hover:text-sil-text " +
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-sil-subtle " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sil-accent " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-sil-elevated";

  return (
    <div className="pt-5 border-t border-sil-border/40 flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        onClick={() => handleClick("yes")}
        disabled={buttonsDisabled}
        className={quietButton}
      >
        This landed
      </button>
      <span aria-hidden="true" className="text-sil-border text-xs">
        ·
      </span>
      <button
        type="button"
        onClick={() => handleClick("show me something different")}
        disabled={buttonsDisabled}
        className={quietButton}
      >
        Show me something different
      </button>
    </div>
  );
}
