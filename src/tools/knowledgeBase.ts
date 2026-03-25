import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { similaritySearch } from "../rag/vectorStore";
import { logToolCall } from "../logging/logger";

const MAX_CHUNK_LENGTH = 600;

export const knowledgeBaseTool = tool(
  async (input) => {
    const query = input.query.trim();
    if (!query) {
      const msg = "Error: search query cannot be empty.";
      logToolCall("knowledge_base", input, { error: msg });
      return msg;
    }

    try {
      const results = await similaritySearch(query, 2);

      if (results.length === 0) {
        const msg = "No relevant resources found in the knowledge base for this query.";
        logToolCall("knowledge_base", input, { resultCount: 0 });
        return msg;
      }

      const formatted = results
        .map((doc, i) => {
          const m = doc.metadata;
          const text =
            doc.pageContent.length > MAX_CHUNK_LENGTH
              ? doc.pageContent.slice(0, MAX_CHUNK_LENGTH) + "..."
              : doc.pageContent;
          return [
            `[${i + 1}] "${m.source_title}" by ${m.source_author}`,
            `    Source: ${m.source_url}`,
            `    Tags: ${m.tags}`,
            `    Excerpt: ${text}`,
          ].join("\n");
        })
        .join("\n\n");

      const titles = results.map((d) => d.metadata.source_title);
      logToolCall("knowledge_base", input, { resultCount: results.length, titles });
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
      "Searches Silhouette's curated library of hope-building and practical guidance resources. " +
      "Returns the most relevant excerpt(s) with source attribution (title, author, URL). " +
      "Use this FIRST whenever the user describes feeling stuck, overwhelmed, avoidant, lonely, " +
      "or low-confidence. Only fall back to web_search if this tool returns no relevant results.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "A natural language query describing what the user is struggling with, " +
          "e.g. 'feeling ashamed about avoiding important work' or 'lonely and disconnected'"
        ),
    }),
  }
);
