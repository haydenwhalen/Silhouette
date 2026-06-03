// Quiet receipt of what the user said. Truncated, italic, muted.
// NOT a chat bubble — a calm acknowledgment that they were heard.

export function UserRecap({ text }: { text: string }) {
  const truncated = text.length > 100 ? text.slice(0, 100) + "…" : text;
  return (
    <p className="text-sil-subtle text-xs">
      Based on what you shared: &ldquo;{truncated}&rdquo;
    </p>
  );
}
