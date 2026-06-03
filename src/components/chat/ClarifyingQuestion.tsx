"use client";

import { useState } from "react";
import { Wordmark } from "./Wordmark";
import { UserRecap } from "./UserRecap";
import { PromptInput } from "./PromptInput";

// Optional follow-up before retrieval — the agent occasionally returns
// exactly one clarifying question to disambiguate the user's state. The
// surface is intentionally calmer than the welcome state: a small framing
// line, the question in a soft surface box, a smaller submit button.

interface ClarifyingQuestionProps {
  userInput: string;
  question: string;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function ClarifyingQuestion({
  userInput,
  question,
  onSubmit,
  disabled,
}: ClarifyingQuestionProps) {
  const [answer, setAnswer] = useState("");
  const hasAnswer = answer.trim().length > 0;
  const canSubmit = hasAnswer && !disabled;

  const handleSubmit = () => {
    if (canSubmit) onSubmit(answer.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-sil-fade-in">
      <Wordmark />

      <div className="flex flex-col gap-6 animate-sil-rise-in">
        <UserRecap text={userInput} />

        <div className="flex flex-col gap-3">
          <p className="text-sil-subtle text-xs">
            One quick distinction so I can find the right kind of source.
          </p>
          <div className="relative bg-sil-surface rounded-sil-card border border-sil-border p-5 overflow-hidden">
            {/* Soft top-edge accent — matches the insight card so the
             * clarify state visually echoes the destination. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sil-accent/30 to-transparent"
            />
            <p className="relative text-sil-text text-sm leading-relaxed">
              {question}
            </p>
          </div>
        </div>

        <PromptInput
          value={answer}
          onChange={setAnswer}
          onKeyDown={handleKeyDown}
          placeholder="Your response…"
          id="clarify-input"
          rows={3}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 px-6 rounded-sil-button text-sm font-medium
                      transition-shadow transition-colors duration-300
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-sil-accent
                      focus-visible:ring-offset-2 focus-visible:ring-offset-sil-bg
                      ${
                        canSubmit
                          ? "bg-sil-accent text-sil-bg cursor-pointer " +
                            "shadow-[0_8px_24px_-8px_oklch(0.55_0.15_280/0.5),inset_0_1px_0_oklch(0.85_0.06_280/0.4)] " +
                            "hover:shadow-[0_14px_32px_-8px_oklch(0.55_0.15_280/0.7),inset_0_1px_0_oklch(0.85_0.06_280/0.55)]"
                          : "bg-sil-accent-soft text-sil-muted cursor-not-allowed opacity-50"
                      }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
