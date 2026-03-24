// Config — loads and validates environment variables.

import "dotenv/config";

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
} as const;

export function validateConfig() {
  if (!config.openaiApiKey) throw new Error("Missing OPENAI_API_KEY in .env");
  if (!config.tavilyApiKey) throw new Error("Missing TAVILY_API_KEY in .env");
}
