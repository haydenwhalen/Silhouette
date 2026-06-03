"use client";

import { useState } from "react";
import { Wordmark } from "./Wordmark";
import { PromptInput } from "./PromptInput";

// The opening surface — wordmark + subhead + the "What feels stuck right now?"
// textarea + the submit button. Cmd/Ctrl+Enter submits.

interface WelcomePanelProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function WelcomePanel({ onSubmit, disabled }: WelcomePanelProps) {
  const [inputValue, setInputValue] = useState("");
  const hasInput = inputValue.trim().length > 0;
  const canSubmit = hasInput && !disabled;

  const handleSubmit = () => {
    if (canSubmit) onSubmit(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-12 w-full animate-sil-fade-in">
      <div className="flex flex-col items-center gap-5 animate-sil-rise-in">
        <Wordmark />
        <p className="text-sil-muted text-sm max-w-sm leading-relaxed">
          One moment from a real person who navigated something close.
        </p>
      </div>

      <div className="w-full flex flex-col gap-6 animate-sil-rise-in-slow">
        <div className="flex flex-col gap-2 text-left">
          <label
            htmlFor="stuck-input"
            className="text-sil-text text-lg font-medium"
          >
            What feels stuck right now?
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <PromptInput
            value={inputValue}
            onChange={setInputValue}
            onKeyDown={handleKeyDown}
            placeholder="I know what I should do, but I keep putting it off…"
          />
          <p className="text-sil-subtle text-xs leading-relaxed">
            A few sentences is enough. You don&apos;t have to make it perfect.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3.5 px-6 rounded-sil-button text-sm font-medium
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
          Find a moment
        </button>
      </div>
    </div>
  );
}
