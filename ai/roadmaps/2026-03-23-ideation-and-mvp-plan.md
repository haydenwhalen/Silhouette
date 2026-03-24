# 2026-03-23 — Ideation and MVP Plan

> This document records all product decisions, constraints, and scope boundaries established during the ideation phase of Silhouette.

---

## Project Goal

Build a working multi-tool AI agent called Silhouette that helps young adults in a rut regain momentum through one context-matched hope-building resource and one small next step. The agent must satisfy the BYU multi-tool agent course assignment and serve as a credible foundation for a real product.

---

## Assignment Constraints

The course requires a chatbot agent built with LangChain.js that demonstrates the ReAct pattern. The submission must include:

| Requirement | Status |
|---|---|
| Calculator tool | Planned |
| Web search tool (Tavily) | Planned |
| RAG tool over at least 5 real documents | Planned |
| Source attribution in RAG responses | Planned |
| Conversation memory (multi-turn context) | Planned |
| Web UI (chat page; terminal fallback acceptable but not target) | Planned |
| context.md | Done |
| PRD | Done |
| Roadmap with progress tracking | Done (this file + roadmap file) |
| .gitignore (no secrets, no node_modules) | Planned |
| Structured logging (tool calls, arguments, results) | Planned |
| Incremental git history (5+ meaningful commits) | Planned |
| README.md | Planned |
| 2-minute demo video | Planned |

**Stretch goals (extra credit):**
- Streaming in the web UI
- 4th custom tool
- Persistent vector store (documents survive restarts)

**Due date:** March 25, 2026 at 12:59 PM MDT

---

## Current Product Direction

### Product thesis
For young adults caught in an overwhelm-and-avoidance loop, Silhouette acts as an episodic micro-reset that restores hope and momentum better than journaling apps, generic motivational content, or open-ended chatbots — because it matches the user's exact stuck moment with one curated, explained resource and one concrete next step.

### Broad audience
Young adults in transition-heavy seasons of life who feel overwhelmed, discouraged, low-confidence, lonely, directionless, or stuck — but are still capable of acting.

### MVP audience
Young adults in a short-term overwhelm-and-avoidance loop who need the right hope-building resource plus one small next step to restart momentum.

### Supported stuck moments (MVP)
1. The Avoidance Spiral — putting off something meaningful, shame-and-freeze loop
2. The Post-Doomscroll Slump — spent too long on phone, feels worse
3. The "I'm Behind In Life" Paralysis — heavy feeling of not being where they should be
4. The Comparison Crash (optional) — deflated after comparing to others

### What Silhouette is not
- Not therapy or clinical support
- Not a crisis app
- Not a diagnosis tool
- Not a journaling platform
- Not a habit tracker
- Not a general chatbot

---

## Required MVP Features

### Must-have
- Guided conversational intake (3–5 turns max)
- Stuck moment interpretation (internal, not labeled to user)
- RAG retrieval from curated knowledge base with source attribution
- One resource output with "why this" explanation
- One next step output (completable in 5–15 minutes)
- Web search as fallback when RAG results are weak
- Calculator for quantifying next steps when relevant
- Session-scoped conversation memory
- Safety boundary routing for crisis-adjacent input
- Simple web chat UI
- Structured logging of tool calls and results
- README with setup and run instructions

### Nice-to-have if time allows
- Streaming responses in the UI
- "Show me something different" resource swap
- Resource type preference (podcast clip vs. article vs. short read)

---

## Technical Requirements

| Component | Decision |
|---|---|
| Runtime | Node.js with LangChain.js |
| LLM | OpenAI (GPT-4o or GPT-3.5-turbo, depending on cost) |
| RAG vector store | In-memory (e.g., MemoryVectorStore or Chroma local) |
| Embeddings | OpenAI embeddings |
| Web search | Tavily API |
| Calculator | LangChain built-in calculator or custom expression evaluator |
| Memory | LangChain ConversationBufferMemory (session-scoped) |
| Web UI | Simple frontend — HTML/CSS/JS or lightweight framework, served alongside the agent backend |
| Logging | Structured console or file logging of every tool invocation |

---

## Main Risks

| Risk | Impact | Mitigation |
|---|---|---|
| RAG quality is poor with too few documents | Core experience fails; recommendations feel generic | Curate 15–30 quality sources before building; tag carefully |
| Time pressure — due March 25 | Incomplete submission | Follow the phased roadmap strictly; cut stretch goals early if behind |
| Calculator feels forced | Grading penalty or awkward UX | Tie calculator to time breakdowns and step quantification; do not force it into every conversation |
| Web search returns noisy results | Agent presents irrelevant or off-tone content | Use web search only as fallback; add prompt guidance to filter results |
| Scope creep during build | Incomplete core features | Use mvp.md decision filter: does it help the user go from stuck to moving in under 5 minutes? |
| Safety edge cases | User inputs crisis-level content | System prompt includes clear boundary instructions and resource redirect |

---

## Assumptions

1. A curated set of 15–30 documents can be gathered and chunked before implementation begins.
2. In-memory vector storage is sufficient for the assignment (no persistence needed).
3. OpenAI API costs will be manageable for development and demo.
4. A simple web UI without a framework is sufficient to meet the assignment requirement.
5. Session-scoped memory is enough to demonstrate multi-turn conversation.
6. The three supported stuck moments cover enough user scenarios to make the demo believable.

---

## What "Done" Looks Like

The assignment is complete when:

- [ ] The agent runs in a web UI and accepts user input
- [ ] The agent conducts a guided intake conversation (2–4 turns)
- [ ] The agent uses `knowledge_base_rag` to retrieve a resource with source attribution
- [ ] The agent uses `web_search` as a fallback when RAG results are weak
- [ ] The agent uses `calculator` to quantify a next step when relevant
- [ ] The agent presents one resource + one next step per session
- [ ] Conversation memory works across turns within a session
- [ ] Safety boundaries redirect crisis-adjacent input
- [ ] Structured logging captures all tool calls and results
- [ ] README explains what Silhouette is and how to run it
- [ ] .gitignore excludes secrets and node_modules
- [ ] Git history shows 5+ incremental, meaningful commits
- [ ] A 2-minute demo video is recorded showing the web UI and at least 2 tools in action

---

## What To Postpone Until After The Assignment

These are real product goals but not assignment goals. Do not build them before submission.

- User accounts or cross-session memory
- Persistent vector store
- Feedback or rating system
- Expanded stuck moment coverage beyond the initial 3–4
- Mobile-responsive or native UI
- Content management system for the knowledge base
- Analytics or usage tracking
- Resource type preference controls
- Any form of monetization or onboarding flow
