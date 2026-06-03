// Atmospheric backdrop for every Silhouette state.
//
// Two decorative layers, both fixed and pointer-events-none, both purely
// decorative (aria-hidden):
//
//   1. A soft purple-blue radial glow at the top-center of the viewport,
//      ~700px wide and faint. Suggests "horizon light" without committing
//      to a literal horizon graphic. This is the single biggest visceral
//      cue that sets the "quiet night sky" feeling.
//
//   2. A faint horizontal accent line near the bottom — barely visible.
//      Implicit "there is somewhere this is going" cue without becoming
//      a literal horizon metaphor or a wellness signifier.
//
// Both layers live inside the page shell, BEHIND the content. They never
// interfere with scrolling, layout, or interaction.
export function PageAtmosphere() {
  return (
    <>
      {/* Top horizon glow — radial, purple-blue, low opacity. Mounted as a
       * fixed element so it stays anchored to the viewport regardless of
       * how tall the current state's content is. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[60vh] z-0"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 0%, oklch(0.55 0.15 280 / 0.18) 0%, oklch(0.55 0.15 280 / 0.06) 35%, transparent 70%)",
        }}
      />

      {/* Secondary bluer wash that crosses the radial at a slight offset,
       * adds depth without becoming a single solid glow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[40vh] z-0"
        style={{
          background:
            "radial-gradient(50% 60% at 35% 10%, oklch(0.50 0.10 240 / 0.10) 0%, transparent 70%)",
        }}
      />

      {/* Bottom horizon hairline — a single faint accent line about 1/3
       * up from the viewport bottom. So subtle it reads as atmosphere
       * rather than a divider. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[28vh] z-0"
        style={{
          background:
            "linear-gradient(to top, oklch(0.55 0.15 280 / 0.05) 0%, transparent 85%)",
        }}
      />
    </>
  );
}
