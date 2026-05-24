"use client";

import { useEffect, useRef, useState } from "react";

interface FeedbackButtonsProps {
  insightId: string;
  sessionId: string;
  onFeedbackText: (text: string) => void;
  disabled?: boolean;
}

type ButtonState = "ready" | "sending-positive" | "sending-negative" | "sent";

export function FeedbackButtons({
  insightId,
  sessionId,
  onFeedbackText,
  disabled,
}: FeedbackButtonsProps) {
  const [state, setState] = useState<ButtonState>("ready");
  const presentedAtRef = useRef<number>(Date.now());
  // Track whether the tab went hidden between presentation and click.
  const becameHiddenRef = useRef<boolean>(false);

  useEffect(() => {
    presentedAtRef.current = Date.now();
    becameHiddenRef.current = false;

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
      // Dwell signal is best-effort — do not block the user-facing flow.
    }
  }

  async function handleClick(text: string, nextState: ButtonState) {
    if (state !== "ready" || disabled) return;
    setState(nextState);
    await postDwellSignal();
    onFeedbackText(text);
    setState("sent");
  }

  const buttonsDisabled = state !== "ready" || disabled;

  const buttonStyle = (active: boolean) => ({
    padding: "0.4rem 0.85rem",
    borderRadius: "0.4rem",
    border: "1px solid #2a3a4a",
    background: active ? "#1f2c38" : "#162028",
    color: "#cccccc",
    fontSize: "0.8rem",
    cursor: buttonsDisabled ? "not-allowed" : "pointer",
    opacity: buttonsDisabled ? 0.5 : 1,
  });

  return (
    <div
      style={{
        marginTop: "0.85rem",
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: "0.8rem", color: "#888", marginRight: "0.25rem" }}>
        Did this land?
      </span>
      <button
        type="button"
        onClick={() => handleClick("yes", "sending-positive")}
        disabled={buttonsDisabled}
        style={buttonStyle(state === "sending-positive")}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => handleClick("show me something different", "sending-negative")}
        disabled={buttonsDisabled}
        style={buttonStyle(state === "sending-negative")}
      >
        Show me something different
      </button>
      {state === "sending-positive" && (
        <span style={{ fontSize: "0.75rem", color: "#666" }}>logging…</span>
      )}
      {state === "sending-negative" && (
        <span style={{ fontSize: "0.75rem", color: "#666" }}>finding another…</span>
      )}
    </div>
  );
}
