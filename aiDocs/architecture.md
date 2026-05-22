# Silhouette — System Architecture

> Technical architecture for the **insight retrieval** MVP and assignment prototype. Describes what is built now and what changes only after the aha moment is validated.

---

## System Purpose

Silhouette is a **retrieval product with a chat interface**, not a general chatbot. The conversation classifies situational/emotional context, retrieves one curated excerpt, and formats it as one insight with attribution.

```
User input (2–3 sentences)
  → [vague?] clarifying question(s) — no tools
  → emotional/situational query
  → knowledge_base (primary)
  → [weak?] web_search (fallback)
  → [optional] calculator for concrete next step
  → one insight + source + why it applies
```

---

## Phase 1 — Current Build (Assignment MVP)

### Stack

| Layer | Choice |
|---|---|
| Runtime | Next.js 15 (App Router) |
| Agent | LangChain.js `createToolCallingAgent` + `AgentExecutor` |
| LLM | OpenAI `gpt-4o-mini` |
| Embeddings | OpenAI `text-embedding-3-small` |
| Vector store | `@langchain/classic` `MemoryVectorStore` (in-memory, per process) |
| Web search | Tavily (`@tavily/core`) |
| Memory | `@langchain/community` `ChatMessageHistory`, keyed by `sessionId` |
| UI | React client components — `ChatWindow`, `MessageList`, `ChatInput` |

### Repository layout

```
src/agent/index.ts          — chat(message, sessionId), RAG init, executor
src/agent/systemPrompt.ts   — identity, vague/specific rules, tool rules, safety
src/tools/knowledgeBase.ts  — RAG tool
src/tools/webSearch.ts      — Tavily tool
src/tools/calculator.ts     — safe math eval
src/rag/documents.ts        — load + chunk docs/sources/*.md
src/rag/vectorStore.ts      — embed + similaritySearch
src/memory/conversationMemory.ts — session history map
src/logging/logger.ts       — JSON structured logs
src/app/api/chat/route.ts   — POST handler
src/components/*            — chat UI
docs/sources/               — 5 curated markdown sources
```

### Tools — role in product

| Tool | Product role | When agent should call |
|---|---|---|
| `knowledge_base` | **Core** — curated insight retrieval | User has enough context; any insight response |
| `web_search` | Fallback when corpus has no match | Weak/empty RAG; user asks for external/current content |
| `calculator` | Make next step concrete | Time splits, percentages, quantified steps |

Tool descriptions in code steer the LLM: knowledge_base first; web_search second; calculator only when math helps.

### RAG pipeline

1. On first `chat()` call: `loadAndChunkDocuments()` reads `docs/sources/*.md`.  
2. Metadata parsed from file headers: title, URL, author, publisher, tags.  
3. `RecursiveCharacterTextSplitter`: chunk 800, overlap 150.  
4. `MemoryVectorStore.fromDocuments` with OpenAI embeddings.  
5. `knowledge_base` tool: `similaritySearch(query, k=2)`, trim excerpts, return title/author/URL/tags.

**Retrieval signal:** Natural-language query reflecting user's **situation and emotion**, not keyword topic only. Clarifying questions exist to improve query quality for vague input.

**Attribution:** Tool output includes `source_title`, `source_author`, `source_url`. System prompt requires citing only tool-returned sources.

### API

`POST /api/chat`

```json
{ "message": "string", "sessionId": "string" }
```

Response:

```json
{ "reply": "string", "sessionId": "string", "toolsUsed": ["knowledge_base", ...] }
```

Errors: `400` missing message; `500` with `{ "error": "..." }`.

### Session memory

- Client generates `sessionId`, stores in `sessionStorage` (`silhouette-session`).  
- Server: `getSessionHistory(sessionId)` → prior `HumanMessage` / `AIMessage` passed as `chat_history`.  
- **Scope:** Same browser tab/session only. No user accounts. No cross-session personalization (per product strategy).  
- **Purpose:** Clarifying Q → user answer → insight; follow-ups ("shorter", "more practical").

### Vague vs. specific handling

Implemented in `systemPrompt.ts`:

- **Vague** (e.g. "in a rut", "feel off") → clarifying questions only; **no tool calls**.  
- **Specific** (named emotion/situation) → full insight path with tools.

Note: Strategic doc specifies **one** clarifying question; current prompt allows 2–3 — tighten when UX is validated.

### Structured logging

All logs: JSON lines to stdout with `timestamp` and `event`.

| Event | When |
|---|---|
| `api_request` | Incoming message + sessionId |
| `user_input` | Agent receives message |
| `rag_init_start` / `rag_load` / `rag_chunk` / `rag_init_complete` | Corpus load |
| `tool_call` | Inside tool implementations (input + output summary) |
| `tool_used` | Agent intermediate steps |
| `agent_response` | Final output, toolsUsed, clarifying flag, preview |
| `api_response` | HTTP success + durationMs |
| `api_error` | Failure |

Sufficient for assignment demo and debugging fabricated citations.

### Safety

System prompt only (no separate classifier):

- Not therapy/crisis tool  
- On crisis signals → empathy, scope limit, 988 + Crisis Text Line, stop reset flow  

### UI

- Empty state: title + subtitle + input centered  
- After first message: compact header, scrollable messages, input at bottom  
- Assistant messages: simple markdown for `**bold**` and `[text](url)`  

### Phase 1 limitations

| Limitation | Notes |
|---|---|
| In-memory vector store | Re-embeds on cold start; slow first message |
| 5 articles, one publisher | Proves loop, not strategic corpus |
| No "did this land?" UI | PRD gap |
| LLM may skip tools on some follow-ups | Mitigate via prompt; monitor logs |
| No reranking / metadata filters | Top-k similarity only |
| Full article text in chunks | OK for class prototype; shift to excerpts + links at scale |

---

## Content and Licensing Architecture

### MVP (now)

- Store curated markdown with metadata + body text for RAG (assignment).  
- Present **quotes and short excerpts** in chat with **outbound links** to originals.  
- Do not imply Silhouette owns the content.

### Scale (before public growth)

| Content type | Storage | Delivery |
|---|---|---|
| Licensed / in-house | Full text or transcript chunks | In-app excerpt + link |
| Third-party (default) | Metadata + short non-substitutive summary + tags | Attributed quote + link to source |
| Audio/video clips | Requires explicit rights | Not in MVP |

Strategic sources (Huberman, School of Greatness, Dan Martell): ingest as **summarized passages and attributed quotes** until licensing allows clips.

---

## What Not to Build in MVP (Architecture)

- Persistent vector DB (unless ops require it)  
- User preference store or embedding profiles  
- Learning-to-rank / feedback training pipeline — until "did this land?" exists  
- External search quality filters beyond Tavily defaults  
- Streaming responses  
- Multi-insight response schema  

---

## Phase 2+ (After Aha Moment Validated)

Only pursue when qualitative tests show reliable match quality on the narrow wedge.

| Capability | Purpose |
|---|---|
| Persistent vector store | Stable corpus without re-embed every deploy |
| Corpus expansion | School of Greatness, Huberman, Dan Martell-style sources |
| Richer metadata | emotional_state, format, duration, tone on chunks |
| "Did this land?" storage | Measure and iterate retrieval |
| Metadata + similarity hybrid | Filter by rut type before vector search |
| One clarifying question (refined) | Tighter disambiguation |

**Still defer:** cross-session personalization, feed UI, accounts, ranking ML.

---

## Phase 3+ (If Wedge Holds)

- Reranking on emotional fit + format + feedback history  
- External discovery with allow/deny domains and normalized schema  
- Clear UI label: curated vs. web-found  

---

## Phase 4+ (Platform — speculative)

- Ingestion pipeline: discover → clean → tag → embed → review  
- Learning-to-rank from feedback  
- Creator partnerships and licensed transcripts  
- B2B distribution (wellness, HR) — separate validation track  

---

## Assignment Compliance Map

| Assignment requirement | Implementation |
|---|---|
| Multi-tool agent | `src/agent/index.ts` |
| Calculator | `src/tools/calculator.ts` |
| Web search | `src/tools/webSearch.ts` |
| RAG ≥5 docs + attribution | `docs/sources/` + `knowledgeBase.ts` |
| Conversation memory | `conversationMemory.ts` + `sessionId` in UI |
| Web UI | `src/app/page.tsx`, components, `/api/chat` |
| Structured logging | `logger.ts` + route/agent logs |
| README | Root `README.md` |
| context / PRD / roadmap | `aiDocs/`, `ai/roadmaps/` |
| Incremental git history | Feature branches + commits on `main` |

---

## Key Architectural Principles (from strategy)

1. **One insight per session** — response schema and prompt enforce single recommendation.  
2. **Emotional/situational retrieval** — queries and clarifying Q designed for context, not topic browse.  
3. **Human-sourced truth** — tools are source of record; LLM formats, does not invent citations.  
4. **Session quality over retention** — no streak architecture.  
5. **Validate retrieval before scale** — corpus size and features grow only after match quality is proven.
