# Silhouette

A guided micro-reset agent for young adults who feel stuck. Silhouette uses a multi-tool LangChain.js ReAct-style agent to help users move from overwhelmed and avoidant to slightly hopeful and slightly moving.

Built for the BYU agentic development course.

## What This Demonstrates

- **Multi-tool agent** that autonomously selects between three tools based on user input
- **RAG over real documents** with source attribution (5 curated articles from Greater Good Science Center)
- **Conversation memory** that preserves context across turns within a session
- **Guided clarifying questions** when user input is vague
- **Structured logging** of every request, tool call, and response
- **Web UI** for chatting with the agent in a browser

## Tools

| Tool | Purpose | When Used |
|---|---|---|
| `knowledge_base` | RAG search over curated hope-building articles | User describes feeling stuck, overwhelmed, avoidant, lonely, or low-confidence |
| `web_search` | Tavily web search for current information | Knowledge base has no relevant match, or user asks for external info |
| `calculator` | Evaluates math expressions | User needs to quantify a next step or break time into chunks |

## Tech Stack

- **Agent framework**: LangChain.js with `createToolCallingAgent` and `AgentExecutor`
- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector store**: In-memory MemoryVectorStore
- **Web search**: Tavily API
- **Frontend**: Next.js 15, React 19
- **Language**: TypeScript

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file from the example
cp .env.example .env

# 3. Add your real API keys to .env
#    OPENAI_API_KEY=sk-...
#    TAVILY_API_KEY=tvly-...
```

### Environment Variables

| Variable | Required | Source |
|---|---|---|
| `OPENAI_API_KEY` | Yes | [platform.openai.com](https://platform.openai.com/api-keys) |
| `TAVILY_API_KEY` | Yes | [app.tavily.com](https://app.tavily.com/) |

## Running Locally

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

The first message takes a few extra seconds while the RAG vector store initializes. Subsequent messages are faster.

## Testing

### Browser testing

Open `http://localhost:3000` and try these prompts:

1. **RAG tool**: "I feel overwhelmed and I'm avoiding what matters"
2. **Clarifying questions**: "I feel off"
3. **Memory**: Follow up with "That didn't help, give me something more practical"
4. **Calculator**: "Help me break 4 hours into 3 manageable chunks"
5. **Web search**: "Find me a recent TED talk about overcoming procrastination"

### CLI testing

```bash
# Interactive agent CLI
npx tsx scripts/test-agent.ts

# Test individual tools
npx tsx scripts/test-tools.ts calculator
npx tsx scripts/test-tools.ts web-search
npx tsx scripts/test-tools.ts knowledge-base
```

## RAG Source Documents

Five curated articles live in `docs/sources/`. Each file includes metadata (title, author, URL, publisher, tags) and cleaned article content:

1. **Overwhelmed by Suffering? Here's How to Act Anyway** — Greater Good Science Center
2. **Four Ways We Avoid Our Feelings—and What to Do Instead** — Greater Good Science Center
3. **Five Ways to Feel Like You're Doing Enough** — Greater Good Science Center
4. **11 Things to Do When You Feel Lonely** — Greater Good Science Center
5. **Five Science-Backed Strategies for More Self-Compassion** — Greater Good Science Center

Documents are chunked (800 chars, 150 overlap) and embedded at startup using OpenAI's `text-embedding-3-small` model.

## Project Structure

```
Silhouette/
  aiDocs/              — context.md, prd.md, mvp.md, architecture.md
  ai/roadmaps/         — planning and implementation roadmaps
  docs/sources/        — curated RAG source documents (5 articles)
  scripts/             — test-agent.ts, test-tools.ts, ingest-docs.ts
  src/
    agent/             — agent entry point (index.ts) and system prompt
    tools/             — calculator, web search, knowledge base tools
    rag/               — document loader, chunker, vector store
    memory/            — session-scoped conversation memory
    logging/           — structured JSON logging
    lib/               — config and environment variable validation
    app/               — Next.js pages and /api/chat route
    components/        — ChatWindow, MessageList, ChatInput
```

## Structured Logging

All agent activity is logged as JSON to stdout. Each log entry includes a timestamp and event type:

- `api_request` — incoming HTTP request with session ID and message
- `user_input` — message passed to the agent
- `rag_init_start` / `rag_init_complete` — RAG vector store initialization
- `tool_call` — individual tool execution with input and output
- `tool_used` — tool selected by the agent (from intermediate steps)
- `agent_response` — final response with tools used, clarifying question flag, output preview
- `api_response` — HTTP response with duration
- `api_error` — error details if request failed

View logs in the terminal running `npm run dev`.

## Project Documents

| Document | Path |
|---|---|
| Project context | `aiDocs/context.md` |
| Product requirements | `aiDocs/prd.md` |
| MVP definition | `aiDocs/mvp.md` |
| Architecture | `aiDocs/architecture.md` |
| Implementation plan | `ai/roadmaps/2026-03-23-ideation-and-mvp-plan.md` |
| Implementation roadmap | `ai/roadmaps/2026-03-23-ideation-and-mvp-roadmap.md` |
