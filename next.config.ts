import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "langchain",
    "@langchain/core",
    "@langchain/openai",
    "@langchain/classic",
    "@langchain/community",
    "@langchain/textsplitters",
    "@tavily/core",
  ],
};

export default nextConfig;
