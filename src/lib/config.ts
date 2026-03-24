import "dotenv/config";

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
} as const;

export function requireKey(name: keyof typeof config): string {
  const value = config[name];
  if (!value) {
    throw new Error(`Missing ${name} — check your .env file`);
  }
  return value;
}
