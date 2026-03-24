# 2026-03-23 — Ideation and MVP Roadmap

> This document tracks the phased implementation plan for Silhouette.
> Update the status column as work progresses.

---

## Timeline

**Start:** March 23, 2026
**Due:** March 25, 2026 at 12:59 PM MDT
**Available time:** ~2 working days
**Builder:** 1 student

---

## Phase Overview

| Phase | Objective | Status |
|---|---|---|
| Phase 1 | Repo and environment setup | Not started |
| Phase 2 | Tool implementation (calculator, web search, RAG) | Not started |
| Phase 3 | RAG knowledge base — document curation and ingestion | Not started |
| Phase 4 | Agent integration and conversation memory | Not started |
| Phase 5 | Web UI | Not started |
| Phase 6 | Logging, safety, and polish | Not started |
| Phase 7 | README, demo prep, and final checks | Not started |

---

## Phase 1: Repo and Environment Setup

**Objective:** Create a clean, working project structure with all dependencies installed and environment variables configured.

**Key tasks:**
- Initialize the repo with `npm init`
- Install core dependencies: `langchain`, `@langchain/openai`, `@langchain/community`, `tavily`, and any web server package
- Create `.env` with `OPENAI_API_KEY` and `TAVILY_API_KEY`
- Create `.gitignore` (exclude `node_modules/`, `.env`, `dist/`, OS files)
- Verify the project runs a basic "hello world" LLM call to confirm API access
- Copy existing `aiDocs/` and `ai/` folders into the repo if not already tracked

**Deliverables:**
- Working repo with dependencies installed
- `.gitignore` in place
- `.env` configured (not committed)
- Successful test LLM call

**Dependencies:** None

**Notes:** This phase should take under 30 minutes. Do not over-engineer the folder structure. Keep it flat until complexity demands otherwise.

---

## Phase 2: Tool Implementation

**Objective:** Build and individually test all three tools before connecting them to the agent.

**Key tasks:**

### Calculator tool
- Implement a simple expression evaluator (LangChain built-in or custom)
- Define the tool name, description, and input schema
- Test with sample expressions: `2000 / 250`, `15 * 5`, `180 / 6`

### Web search tool
- Connect to Tavily API
- Define the tool name, description, and input schema
- Test with a sample query: "short podcast clip about getting unstuck in your 20s"
- Verify results return title, snippet, and URL

### RAG tool (structure only — documents come in Phase 3)
- Set up the vector store (in-memory or Chroma local)
- Set up the OpenAI embeddings pipeline
- Define the tool name, description, and input schema
- Create a placeholder test with 1–2 dummy documents to verify retrieval works
- Verify returned chunks include source metadata

**Deliverables:**
- Three working tools, each independently testable
- Each tool has a clear name, description, and schema

**Dependencies:** Phase 1 complete

**Risks:** Tavily API key issues; embedding model cost surprises. Test early.

---

## Phase 3: RAG Knowledge Base — Document Curation and Ingestion

**Objective:** Gather, chunk, tag, and ingest the curated source documents that power Silhouette's core recommendation engine.

**Key tasks:**
- Gather 15–30 source documents across the three primary stuck moments
  - Podcast transcript excerpts (Mel Robbins, Dr. K, Brené Brown, Ali Abdaal, etc.)
  - Short articles or blog posts
  - Custom insight cards (original short docs written by the developer)
  - TED talk or commencement speech excerpts
- Chunk each document into passages of roughly 300–500 tokens
- Attach metadata to each chunk:
  - `source_title`, `source_author`, `source_type`, `source_url`
  - `stuck_moment_tags` (avoidance, doomscroll, behind_in_life, comparison, overwhelm, low_confidence)
  - `tone` (practical, gentle, direct, story-based)
- Ingest all chunks into the vector store
- Test retrieval with sample queries for each stuck moment
- Verify source attribution appears in results

**Deliverables:**
- 15–30 curated, tagged source documents ingested into the vector store
- RAG retrieval returns relevant chunks with full source metadata for each stuck moment

**Dependencies:** Phase 2 RAG tool structure complete

**Risks:** This is the most time-consuming phase if documents are not gathered beforehand. Start collecting sources during Phase 1 and 2. Quality matters more than quantity — 15 strong sources beat 50 weak ones.

---

## Phase 4: Agent Integration and Conversation Memory

**Objective:** Connect all three tools to a single ReAct agent with a system prompt and session-scoped memory.

**Key tasks:**
- Create the ReAct agent using LangChain's agent executor with the three tools
- Write the system prompt that encodes:
  - Silhouette's identity and tone (supportive, practical, non-judgmental)
  - The guided intake behavior (ask about the user's stuck moment, clarify if needed)
  - Instructions for when to use each tool (RAG first, web search as fallback, calculator when quantifying)
  - The output format (one resource with attribution + one next step)
  - Safety boundary instructions (redirect crisis-adjacent input)
- Add `ConversationBufferMemory` for session-scoped multi-turn context
- Test the full agent loop in the terminal:
  - User describes a stuck moment
  - Agent asks a follow-up
  - Agent calls RAG, retrieves a resource, presents it with attribution
  - Agent suggests a next step (uses calculator if appropriate)
  - User asks a follow-up; memory keeps context

**Deliverables:**
- Working ReAct agent with all three tools connected
- System prompt that produces the right Silhouette behavior
- Conversation memory that makes follow-ups coherent
- Terminal-testable end-to-end flow

**Dependencies:** Phase 2 and Phase 3 complete

**Risks:** System prompt tuning may take several iterations. Start with a simple prompt and refine. Do not over-engineer the prompt on the first pass.

---

## Phase 5: Web UI

**Objective:** Build a simple web chat interface that connects to the agent backend.

**Key tasks:**
- Set up a basic HTTP server (Express or similar)
- Create a simple chat page: input field, send button, message display area
- Connect the frontend to the agent via an API endpoint (POST a message, return the response)
- Display agent responses in the chat, including resource attribution
- Ensure conversation memory persists across turns within a single browser session
- Keep the design clean and minimal — no frameworks required

**Deliverables:**
- Working web chat UI at `localhost`
- User can type a message, see the agent's response, and continue the conversation
- Source attribution is visible in agent responses

**Dependencies:** Phase 4 complete

**Risks:** Do not spend too much time on styling. A clean, functional chat page is sufficient. The product is the conversation, not the UI.

---

## Phase 6: Logging, Safety, and Polish

**Objective:** Add structured logging, verify safety boundaries, and fix any rough edges.

**Key tasks:**
- Add structured logging for every tool invocation:
  - Log tool name, input arguments, and output/result
  - Log agent reasoning steps if accessible from LangChain's verbose mode
  - Output logs to the console or a log file
- Test safety boundaries:
  - Submit a message that implies crisis-level distress
  - Verify the agent redirects with empathy and real resources (988, Crisis Text Line)
  - Verify the agent does not continue the normal reset flow
- Test low-confidence behavior:
  - Submit a vague or off-topic message
  - Verify the agent asks a clarifying question or offers a general fallback
- Fix any broken flows, bad formatting, or unclear outputs

**Deliverables:**
- Structured logs visible for every tool call
- Safety boundary verified and working
- Low-confidence fallback verified and working
- No broken conversation flows

**Dependencies:** Phase 5 complete

**Notes:** This phase is about reliability, not new features. Resist adding anything.

---

## Phase 7: README, Demo Prep, and Final Checks

**Objective:** Prepare all submission materials and verify everything works end-to-end.

**Key tasks:**
- Write `README.md`:
  - What Silhouette is and what it does
  - How to install dependencies
  - How to set up environment variables
  - How to run the app
  - What the three tools are and what they do
- Final end-to-end test:
  - Run a full conversation through the web UI
  - Verify all three tools are invoked at least once across the conversation
  - Verify source attribution appears in RAG responses
  - Verify memory works across turns
  - Verify logs capture tool calls
- Record the 2-minute demo video:
  - Show the web UI
  - Walk through a stuck-moment conversation
  - Show at least 2 tools being used
  - Keep it unpolished but clear
- Final git commit with clean history

**Deliverables:**
- README.md
- 2-minute demo video
- Clean, working submission

**Dependencies:** All previous phases complete

---

## Suggested Incremental Commit Sequence

The assignment requires 5+ meaningful commits showing clear progression. Here is a recommended sequence.

| # | Commit message | What it includes |
|---|---|---|
| 1 | `setup: initialize repo, dependencies, and project docs` | package.json, .gitignore, .env.example, aiDocs/, ai/roadmaps/ |
| 2 | `tools: implement calculator and web search tools` | Calculator tool with tests, Tavily web search tool with tests |
| 3 | `rag: add knowledge base tool with curated documents` | Vector store setup, document ingestion, RAG tool with source attribution |
| 4 | `agent: integrate ReAct agent with memory and system prompt` | Agent executor, system prompt, conversation memory, terminal-testable flow |
| 5 | `ui: add web chat interface` | Express server, chat page, API endpoint connecting frontend to agent |
| 6 | `polish: add structured logging, safety routing, and README` | Logging for all tool calls, safety boundary handling, README.md |
| 7 | `final: end-to-end verification and demo prep` | Any last fixes, verified working state |

Commits 1 through 6 are the core progression. Commit 7 is a final cleanup. This sequence maps directly to the phases and shows the kind of incremental history the assignment asks for: setup → tools → RAG → agent → UI → polish.

---

## Decision Rules During Implementation

- If a phase is taking longer than expected, cut scope from later phases, not from the current one. A working subset is better than a broken whole.
- If RAG quality is poor, add more documents rather than more code.
- If the UI is taking too long, fall back to terminal-only and note in the README that terminal is the primary interface.
- If a stretch goal (streaming, 4th tool, persistent store) threatens the core submission, drop it immediately.
- Every commit should leave the project in a runnable state.
