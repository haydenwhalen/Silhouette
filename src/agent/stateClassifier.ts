import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { requireKey } from "../lib/config";
import { logAgentStep } from "../logging/logger";

export const MVP_STATES = [
  "direction-collapse",
  "engagement-drought",
  "inaction-loop",
] as const;

export type MvpState = (typeof MVP_STATES)[number];
export type ClassifiedState = MvpState | "unknown";
export type Confidence = "high" | "moderate" | "low";

export const stateClassificationSchema = z.object({
  detected_state: z.enum([...MVP_STATES, "unknown"] as [string, ...string[]]),
  state_confidence: z.enum(["high", "moderate", "low"]),
  secondary_possible_states: z.array(z.enum([...MVP_STATES] as [string, ...string[]])),
  needs_clarification: z.boolean(),
  classification_reason: z.string(),
  // Optional intake signals — light, may be null if not inferable.
  direction_collapse_variant: z
    .enum(["post-achievement", "original"])
    .nullable()
    .describe(
      "Only when detected_state is direction-collapse. post-achievement = user names a milestone they reached and feel hollow at; original = user has never had a clear pull."
    ),
  inferred_resonance_insight_type: z
    .enum(["mechanism", "story", "reframe", "permission"])
    .nullable()
    .describe(
      "Optional weak resonance hint from user-language register per Component 3 §6.5. analytical posture ('why does this happen', 'I've thought about this') → mechanism/reframe; self-referential or shame ('what's wrong with me') → permission/story. Null if unclear."
    ),
  inferred_resonance_voice_register: z
    .enum([
      "direct/challenging",
      "warm/affirming",
      "intellectual/measured",
      "vulnerable/personal",
      "expert/scientific",
    ])
    .nullable()
    .describe(
      "Optional weak resonance hint per Component 3 §6.5. Null if unclear. Lean intellectual/measured for analytical posture; warm/affirming for self-criticism; vulnerable/personal for emotionally exposed personal narrative."
    ),
});

export type StateClassification = z.infer<typeof stateClassificationSchema>;

const CLASSIFIER_SYSTEM_PROMPT = `You are a state classifier for Silhouette, a retrieval engine for young professionals (22–32) who feel stuck.

Classify the user's message into ONE of three MVP stuck states, or "unknown" if the signal is too weak.

## States

### direction-collapse
Core question: Has the user lost the sense of what they're building toward?
Signals:
- "I don't know what I want" / "I don't know what comes next"
- "I got what I wanted and feel empty" / "I hit the goal and feel nothing"
- "Successful but unclear" / "doing fine but something is missing"
- "Living someone else's life" / "everyone has it figured out except me"
- Purpose/direction confusion, often after achievement or a transition
- Quiet confusion, existential flatness — not crisis

### engagement-drought
Core question: Does the user still have a target but lost the feeling of caring about it?
Signals:
- "I used to care about this but now I don't"
- "I feel flat / numb / disconnected from my work"
- "Going through the motions"
- "I know I should care but I can't feel it"
- A specific job/role/project is named or implied; the problem is absence of feeling, not absence of direction
- Chronic flatness, not triggered by a specific event

### inaction-loop
Core question: Does the user know what they should do but keep not doing it?
Signals:
- "I know what to do, I just don't do it" / "I keep avoiding it"
- "I procrastinate even though it matters"
- "I've been having this conversation with myself for months/years"
- "I'm stuck in my own way"
- A specific action is named or implied as the thing being avoided
- Active frustration, self-judgment, awareness of the gap

## Distinguishing rules
- Direction Collapse = no target. Engagement Drought = target exists, feeling is gone. Inaction Loop = target exists, motivation exists, action does not.
- "I feel stuck" alone is NOT enough signal — return "unknown" with low confidence.
- If two states are roughly equally plausible, set needs_clarification: true and pick the slightly stronger one as detected_state, listing the other in secondary_possible_states.
- Classify carefully, not overconfidently. Moderate confidence is the right answer more often than high.

## Confidence calibration
- high: explicit language matching one state; no real competing signals.
- moderate: clear leaning toward one state but some ambiguity, or limited input length.
- low: too sparse, too vague, or genuinely indistinguishable across states.

## Output rules
- detected_state: one of "direction-collapse", "engagement-drought", "inaction-loop", "unknown".
- state_confidence: "high" | "moderate" | "low".
- secondary_possible_states: zero or more MVP states (no "unknown").
- needs_clarification: true if confidence is moderate or low, or if two states are competing.
- classification_reason: 1–2 sentences citing the specific user-language signal you used.
- direction_collapse_variant: only set when detected_state is direction-collapse. "post-achievement" if the user names a specific milestone or external achievement they reached and feel empty at ("I got the promotion", "I hit my income goal"). "original" if no milestone is named. Otherwise null.
- inferred_resonance_insight_type / inferred_resonance_voice_register: optional weak signals from user-language register. Only set when the signal is clear. Examples:
  - "Why does this happen?" → mechanism + expert/scientific
  - "What's wrong with me?" / shame language → permission + warm/affirming
  - Personal narrative with named moments → story + vulnerable/personal
  - "I've thought about this for months, I've journaled, etc." → reframe + intellectual/measured
  - Sparse or unclear input → null for both.`;

let classifier: ChatOpenAI | null = null;

function getClassifier(): ChatOpenAI {
  if (classifier) return classifier;
  classifier = new ChatOpenAI({
    openAIApiKey: requireKey("openaiApiKey"),
    modelName: "gpt-4o-mini",
    temperature: 0,
  });
  return classifier;
}

export async function classifyState(
  userMessage: string
): Promise<StateClassification> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    const empty: StateClassification = {
      detected_state: "unknown",
      state_confidence: "low",
      secondary_possible_states: [],
      needs_clarification: true,
      classification_reason: "Empty input.",
      direction_collapse_variant: null,
      inferred_resonance_insight_type: null,
      inferred_resonance_voice_register: null,
    };
    logAgentStep("state_classification", { input: "", ...empty });
    return empty;
  }

  const llm = getClassifier().withStructuredOutput(stateClassificationSchema, {
    name: "classify_state",
  });

  try {
    const result = await llm.invoke([
      { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
      { role: "user", content: trimmed },
    ]);

    // Normalize: if detected_state is "unknown" but confidence isn't low, force low.
    const normalized: StateClassification = {
      ...result,
      state_confidence:
        result.detected_state === "unknown" ? "low" : result.state_confidence,
      needs_clarification:
        result.detected_state === "unknown"
          ? true
          : result.state_confidence !== "high"
          ? true
          : result.needs_clarification,
    };

    logAgentStep("state_classification", {
      inputPreview: trimmed.slice(0, 200),
      ...normalized,
    });
    return normalized;
  } catch (err) {
    const message = err instanceof Error ? err.message : "classifier error";
    logAgentStep("state_classification_error", { error: message });
    return {
      detected_state: "unknown",
      state_confidence: "low",
      secondary_possible_states: [],
      needs_clarification: true,
      classification_reason: `Classifier failed: ${message}`,
      direction_collapse_variant: null,
      inferred_resonance_insight_type: null,
      inferred_resonance_voice_register: null,
    };
  }
}

export function shouldApplyStateFilter(
  classification: StateClassification
): boolean {
  if (classification.detected_state === "unknown") return false;
  return (
    classification.state_confidence === "high" ||
    classification.state_confidence === "moderate"
  );
}
