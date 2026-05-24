import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { presentInsight } from "../presentation/presentInsight";
import { requestContext } from "../agent/requestContext";
import { logToolCall } from "../logging/logger";
import { recordPresentation } from "../memory/sessionState";
import { getSIOById } from "../rag/sioLoader";
import type { StateClassification } from "../agent/stateClassifier";

const UNKNOWN_CLASSIFICATION: StateClassification = {
  detected_state: "unknown",
  state_confidence: "low",
  secondary_possible_states: [],
  needs_clarification: true,
  classification_reason: "No upstream classification available.",
  direction_collapse_variant: null,
  inferred_resonance_insight_type: null,
  inferred_resonance_voice_register: null,
};

export const presentInsightTool = tool(
  async (input) => {
    const { insight_id, user_query } = input;
    const ctx = requestContext.getStore();
    const classification = ctx?.classification ?? UNKNOWN_CLASSIFICATION;

    const result = await presentInsight(insight_id, classification, user_query);

    if (!result.ok) {
      logToolCall("present_insight", input, {
        ok: false,
        reason: result.reason,
      });
      return `Presentation failed: ${result.reason}. Do not fabricate one — invite more context from the user instead.`;
    }

    logToolCall("present_insight", input, {
      ok: true,
      insight_id: result.presentation.insight_id,
      has_bridge: !!result.presentation.bridge_sentence,
      display_mode: result.presentation.media.display_mode,
    });

    // Record presentation context so chat() retry can use it on negative feedback.
    if (ctx?.sessionId) {
      const sio = getSIOById(insight_id);
      const m = sio?.metadata ?? {};
      const alternates = (ctx.lastRetrievalCandidateIds ?? []).filter(
        (id) => id !== insight_id
      );
      const rank = (ctx.lastRetrievalCandidateIds ?? []).indexOf(insight_id);
      recordPresentation(ctx.sessionId, {
        insight_id,
        shown_sio_id: insight_id,
        detected_state: classification.detected_state,
        state_confidence: classification.state_confidence,
        insight_type: (m.insight_type as string) ?? null,
        voice_register: (m.voice_register as string) ?? null,
        retrieval_score: null,
        retrieval_rank: rank >= 0 ? rank : null,
        alternate_sio_ids: alternates,
        user_query,
        intake_insight_type: classification.inferred_resonance_insight_type,
        intake_voice_register: classification.inferred_resonance_voice_register,
        direction_collapse_variant: classification.direction_collapse_variant,
      });
    }

    return result.presentation.rendered_markdown;
  },
  {
    name: "present_insight",
    description:
      "Formats a retrieved SIO into the user-facing presentation per Silhouette's Component 7 spec " +
      "(bridge / quote / attribution / why-this-applies / source link / feedback prompt). " +
      "Returns final markdown ready to return to the user verbatim — do not edit, add, or summarize. " +
      "Call this AFTER knowledge_base has returned an SIO. Pass the insight_id of the SIO you want " +
      "to present, plus the user's original message (so the formatter can write a specific 'why this " +
      "applies' line). If this tool returns a failure message, do not fabricate a presentation — " +
      "ask the user for more context.",
    schema: z.object({
      insight_id: z
        .string()
        .describe(
          "The insight_id of the SIO to present, copied verbatim from knowledge_base output."
        ),
      user_query: z
        .string()
        .describe(
          "The user's most recent message that triggered the retrieval. Used by the formatter " +
          "to write a specific 'why this applies' line — do not paraphrase, pass the user's words."
        ),
    }),
  }
);
