"use client";

import { useEffect, useRef, useState } from "react";

// Low-pressure feedback row that lives inside the InsightCard.
// Two statement buttons ("This landed" / "Show me something different") —
// no question, no thumbs-up/down, no rating.
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

  return (
    <div className="pt-5 border-t border-sil-border/50 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleClick("yes")}
        disabled={buttonsDisabled}
        className="px-4 py-2 rounded-full bg-sil-surface text-sil-muted text-sm
                   border border-sil-border
                   transition-all duration-300
                   hover:bg-sil-accent-soft hover:border-sil-border-strong hover:text-sil-text
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sil-surface
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-sil-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sil-elevated"
      >
        This landed
      </button>
      <button
        type="button"
        onClick={() => handleClick("show me something different")}
        disabled={buttonsDisabled}
        className="px-4 py-2 rounded-full bg-sil-surface text-sil-muted text-sm
                   border border-sil-border
                   transition-all duration-300
                   hover:bg-sil-accent-soft hover:border-sil-border-strong hover:text-sil-text
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sil-surface
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-sil-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sil-elevated"
      >
        Show me something different
      </button>
    </div>
  );
}
