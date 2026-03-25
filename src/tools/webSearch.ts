import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";
import { logToolCall } from "../logging/logger";
import { requireKey } from "../lib/config";

function getClient() {
  return tavily({ apiKey: requireKey("tavilyApiKey") });
}

export const webSearchTool = tool(
  async (input) => {
    const query = input.query.trim();
    if (!query) {
      const msg = "Error: search query cannot be empty.";
      logToolCall("web_search", input, { error: msg });
      return msg;
    }

    try {
      const client = getClient();
      const response = await client.search(query, { maxResults: 5 });

      if (!response.results || response.results.length === 0) {
        const msg = `No results found for "${query}".`;
        logToolCall("web_search", input, { resultCount: 0 });
        return msg;
      }

      const formatted = response.results
        .map(
          (r: { title?: string; url?: string; content?: string }, i: number) =>
            `${i + 1}. ${r.title ?? "Untitled"}\n   ${r.url ?? ""}\n   ${r.content ?? ""}`.trim()
        )
        .join("\n\n");

      logToolCall("web_search", input, { resultCount: response.results.length });
      return formatted;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown web search error";
      logToolCall("web_search", input, { error: message });
      return `Error searching the web: ${message}`;
    }
  },
  {
    name: "web_search",
    description:
      "Searches the web for current information and returns a list of results with titles, URLs, and snippets. " +
      "Use this when the knowledge base does not have a strong match, or when the user asks about something " +
      "outside the curated resource library. Prefer the knowledge base tool first — use web search as a fallback.",
    schema: z.object({
      query: z
        .string()
        .describe("The search query, e.g. 'short podcast clip about overcoming avoidance in your 20s'"),
    }),
  }
);
