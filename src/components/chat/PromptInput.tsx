"use client";

// Shared textarea used in the WelcomePanel and the ClarifyingQuestion.
// Soft border that warms to the accent on focus. Comfortable for 2–3
// sentences without auto-growing aggressively.

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}

export function PromptInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  rows = 4,
  id = "stuck-input",
}: PromptInputProps) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={rows}
      className="w-full p-4 rounded-sil-input bg-sil-surface text-sil-text placeholder:text-sil-subtle
                 border border-sil-border resize-none
                 transition-all duration-200
                 focus:outline-none focus:border-sil-accent focus:ring-1 focus:ring-sil-accent/30
                 text-sm leading-relaxed font-sans"
    />
  );
}
