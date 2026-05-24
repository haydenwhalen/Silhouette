// Single source of truth for the feedback marker text. Lives in its own module
// so client components (which can't import server-side fs / langchain code) can
// import the constant without dragging in the rest of the presentation layer.

export const FEEDBACK_MARKER_TEXT =
  "**Did this land?**   [Yes]   [Show me something different]";
