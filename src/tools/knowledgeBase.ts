import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { similaritySearchWithState } from "../rag/vectorStore";
import { logToolCall } from "../logging/logger";

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

    const state = input.state ?? undefined;

    try {
      const results = await similaritySearchWithState(query, state, 2);

      if (results.length === 0) {
        const msg = state
          ? `No SIOs found for state "${state}" matching this query.`
          : "No SIOs found matching this query.";
        logToolCall("knowledge_base", input, { resultCount: 0, state });
        return msg;
      }

      const formatted = results
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
          ].join("\n");
        })
        .join("\n\n");

      const insightIds = results.map((d) => d.metadata.insight_id);
      logToolCall("knowledge_base", input, {
        resultCount: results.length,
        state,
        insightIds,
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
      "Searches Silhouette's curated library of Structured Insight Objects (SIOs) " +
      "from podcast interviews and educational content. Each SIO is one retrievable " +
      "insight tagged with the stuck state it serves. " +
      "Returns the most relevant SIO(s) with speaker, show, key claim, and attribution. " +
      "Use this FIRST whenever the user describes feeling stuck — directionless, " +
      "disengaged, or avoiding action. Pass a `state` argument when you can classify " +
      "the user's stuck state confidently.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "A natural language query describing what the user is struggling with, " +
          "in their own words or paraphrased. Example: 'I got what I wanted but feel empty'."
        ),
      state: z
        .enum(STATE_VALUES)
        .optional()
        .describe(
          "Optional. The classified stuck state, if known. When provided, retrieval " +
          "is filtered to SIOs tagged for that state. Omit to search all states."
        ),
    }),
  }
);
