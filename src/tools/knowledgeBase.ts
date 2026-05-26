import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { scoredSearch, similaritySearchWithState } from "../rag/vectorStore";
import { logToolCall } from "../logging/logger";
import {
  getDetectedStateForRetrieval,
  getIntakeHintForRetrieval,
  requestContext,
} from "../agent/requestContext";
import { getSeenSIOIds } from "../memory/sessionState";
import type { MvpState } from "../rag/retrievalConfig";

const STATE_VALUES = [
  "direction-collapse",
  "engagement-drought",
  "inaction-loop",
] as const;

export const knowledgeBaseTool = tool(
  async (input) => {
    const query = input.query.trim();
    if (!query) {
      const msg = "Error: search query cannot be empty.";
      logToolCall("knowledge_base", input, { error: msg });
      return msg;
    }

    const llmProvidedState = input.state ?? undefined;
    const contextState = getDetectedStateForRetrieval();
    const effectiveState = (llmProvidedState ?? contextState ?? undefined) as
      | MvpState
      | undefined;

    const stateSource = llmProvidedState
      ? "llm"
      : contextState
      ? "request-context"
      : "none";

    try {
      // When state is known, use scored search (state filter + Component 6 boosts).
      // When no state, fall back to broad unfiltered semantic search.
      if (effectiveState) {
        const intakeHint = getIntakeHintForRetrieval();
        const ctx = requestContext.getStore();
        const sessionId = ctx?.sessionId;
        const excluded = sessionId ? getSeenSIOIds(sessionId) : [];
        const result = await scoredSearch({
          query,
          state: effectiveState,
          k: 3,
          intakeHint,
          excluded_sio_ids: excluded,
        });
        // Stash candidate ids in request context so present_insight can record alternates.
        if (ctx) {
          ctx.lastRetrievalCandidateIds = result.candidates.map((c) =>
            String(c.doc.metadata.insight_id)
          );
        }

        if (result.candidates.length === 0) {
          const msg = `No SIOs found for state "${effectiveState}" matching this query.`;
          logToolCall("knowledge_base", input, {
            resultCount: 0,
            effectiveState,
            stateSource,
          });
          return msg;
        }

        const formatted = result.candidates
          .map((c, i) => {
            const m = c.doc.metadata;
            const boostNote = c.boosts
              .map((b) => `+${b.amount.toFixed(2)} ${b.reason}`)
              .join("; ");
            return [
              `[${i + 1}] ${m.speaker ?? "(unknown speaker)"} — ${m.show_or_platform ?? "(unknown show)"}`,
              `    Episode: ${m.episode_or_content_title ?? "(unknown episode)"}`,
              `    State: ${m.primary_state_tag} | Type: ${m.insight_type} | Register: ${m.voice_register} | Credibility: ${m.credibility_tier}`,
              `    Key claim: ${m.key_claim ?? "(missing)"}`,
              `    Attribution: ${m.attribution_text ?? "(missing)"}`,
              `    Source: ${m.source_url ?? "(missing)"}`,
              `    insight_id: ${m.insight_id}`,
              `    Score: semantic=${c.semantic_score.toFixed(3)} → final=${c.final_score.toFixed(3)} (${c.label}). Boosts: ${boostNote || "none"}`,
            ].join("\n");
          })
          .join("\n\n");

        const insightIds = result.candidates.map((c) => c.doc.metadata.insight_id);
        logToolCall("knowledge_base", input, {
          resultCount: result.candidates.length,
          effectiveState,
          stateSource,
          insightIds,
          resonanceUsed: result.resonance_profile_used,
          scores: result.candidates.map((c) => ({
            id: c.doc.metadata.insight_id,
            sem: Number(c.semantic_score.toFixed(3)),
            fin: Number(c.final_score.toFixed(3)),
            label: c.label,
          })),
        });
        return formatted;
      }

      // No state available — fall back to plain semantic search.
      const docs = await similaritySearchWithState(query, undefined, 2);
      if (docs.length === 0) {
        const msg = "No SIOs found matching this query.";
        logToolCall("knowledge_base", input, {
          resultCount: 0,
          effectiveState,
          stateSource,
        });
        return msg;
      }
      const formatted = docs
        .map((doc, i) => {
          const m = doc.metadata;
          return [
            `[${i + 1}] ${m.speaker ?? "(unknown speaker)"} — ${m.show_or_platform ?? "(unknown show)"}`,
            `    Episode: ${m.episode_or_content_title ?? "(unknown episode)"}`,
            `    State: ${m.primary_state_tag} | Type: ${m.insight_type} | Register: ${m.voice_register}`,
            `    Key claim: ${m.key_claim ?? "(missing)"}`,
            `    Attribution: ${m.attribution_text ?? "(missing)"}`,
            `    Source: ${m.source_url ?? "(missing)"}`,
            `    insight_id: ${m.insight_id}`,
            `    Score: (unfiltered semantic search, no state, no scoring boosts)`,
          ].join("\n");
        })
        .join("\n\n");
      logToolCall("knowledge_base", input, {
        resultCount: docs.length,
        effectiveState,
        stateSource,
        insightIds: docs.map((d) => d.metadata.insight_id),
      });
      return formatted;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown knowledge base error";
      logToolCall("knowledge_base", input, { error: message });
      return "Error searching the knowledge base: " + message;
    }
  },
  {
    name: "knowledge_base",
    description:
      "Searches Silhouette's curated library of Structured Insight Objects (SIOs). " +
      "Each SIO is one retrievable insight tagged with state, type, voice register, and credibility. " +
      "Returns ranked candidates with scores so you can pick the best fit. " +
      "Call this FIRST whenever the user describes feeling stuck. " +
      "If a state has been classified upstream you will be told in the system context — leave the " +
      "`state` arg unset; the system applies the detected state automatically. Only set `state` " +
      "to override the upstream classification.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "A natural language query describing the user's situation in their words or close paraphrase."
        ),
      state: z
        .enum(STATE_VALUES)
        .nullable()
        .optional()
        .describe(
          "Optional. Override the upstream-detected state. Leave unset (or null) to use the detected state."
        ),
    }),
  }
);
