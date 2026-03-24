# Silhouette

A guided micro-reset agent for young adults who feel stuck. Silhouette helps users regain momentum through one context-matched hope-building resource and one small next step.

Built with LangChain.js as a multi-tool ReAct agent for the BYU agentic development course.

## Assignment Requirements

| Requirement | Status |
|---|---|
| Calculator tool | Placeholder |
| Web search tool (Tavily) | Placeholder |
| RAG tool (5+ real documents, source attribution) | Placeholder |
| Conversation memory | Placeholder |
| Web UI | Shell created |
| Structured logging | Implemented |
| context.md / PRD / Roadmap | Done |
| .gitignore | Done |
| README | This file |
| Incremental git history | In progress |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file from the example
cp .env.example .env

# 3. Add your API keys to .env
#    OPENAI_API_KEY=...
#    TAVILY_API_KEY=...
```

## Running Locally

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

## Scripts

```bash
# Ingest source documents into the vector store
npm run ingest

# Smoke-test individual tools
npm run test-tools
```

## Project Structure

```
Silhouette/
  aiDocs/          — project context, PRD, MVP definition, architecture
  ai/roadmaps/     — planning and implementation roadmaps
  docs/sources/     — curated source documents for the RAG knowledge base
  scripts/          — ingestion and testing scripts
  src/
    agent/          — ReAct agent setup and system prompt
    tools/          — calculator, web search, and knowledge base tools
    rag/            — document loading, chunking, and vector store
    memory/         — session-scoped conversation memory
    logging/        — structured logging for tool calls
    lib/            — shared config and utilities
    app/            — Next.js pages and API routes
    components/     — React UI components
```

## Current Status

Project skeleton is in place. Tools, agent, and RAG are placeholders awaiting implementation.

## Roadmap

See `ai/roadmaps/2026-03-23-ideation-and-mvp-roadmap.md` for the full phased plan.
