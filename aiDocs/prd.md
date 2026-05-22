# Silhouette — Product Requirements Document

> Decision-oriented requirements. Supersedes earlier "hybrid recommendation platform" framing.

---

## Product Thesis

Silhouette is **personalized insight retrieval** for young professionals (22–32) in a career, purpose, or motivation rut. The user describes their situation briefly; the system asks one clarifying question if needed; it returns **one real, human-sourced insight** with one sentence on why it applies — not AI-generated advice, not a content list.

Success means the user has an **aha moment**: the insight feels specific, well-matched, and useful in under two minutes.

---

## Problem Statement

When a young professional is in a low-energy, unclear season, they cannot search effectively for help because search requires clarity they lack. Content that could help exists (podcasts, interviews, articles). **Discovery cost at the moment of need is the failure mode** Silhouette removes.

---

## Target User

### Primary

- **Age:** 22–32  
- **State:** Employed, functional, high-aspirational, **low-momentum**  
- **Rut type:** "Doing fine but something feels off" — purpose, career direction, motivation — **not** clinical burnout or crisis  
- **Behavior:** Consumes self-improvement content inconsistently; wants one answer now, not a program  

### Explicitly out of scope (MVP)

- Users in clinical distress, crisis, or needing therapeutic intervention  
- General audience "anyone stuck" before wedge is proven  
- Users seeking meditation, habit tracking, or ongoing wellness programs  

---

## Core Job to Be Done

**"I'm in a rut and I need the right thing from the right person — now."**

Sub-jobs:

1. Help me name what kind of stuck this is (via one clarifying question when input is vague).  
2. Surface one insight I would not have found on my own in this state.  
3. Show me it comes from a credible human source, not a chatbot.  
4. Tell me why this applies to my situation in one sentence.  

**Not in scope for this job:** sustained coaching, diagnosis, habit formation, content browsing.

---

## MVP Scope (What Must Ship to Validate)

| Element | Requirement |
|---|---|
| Input | User describes situation in 2–3 sentences |
| Clarifying question | **One** question when input is vague; skip when specific |
| Output | **One** insight: quote or passage from curated source + one-sentence relevance |
| Corpus | Small, well-indexed library; strategic targets: School of Greatness, Huberman Lab, Dan Martell (minimum); current build uses 5 Greater Good articles |
| Feedback | **"Did this land?"** — required for evaluating retrieval quality |
| Session | Optimize quality of **one visit**; no accounts, profiles, or preference settings |
| Safety | Crisis boundary + redirect; no clinical positioning |

### MVP must prove

Reliable **aha moment** on the narrow wedge (career/purpose gray zone). Until that works, expanding audience, library size, or features does not matter.

### MVP must avoid

- Multiple insights or ranked lists per session  
- User accounts, profiles, preference settings  
- Habit tracking, streaks, re-engagement mechanics  
- Broad content ingestion before retrieval quality on narrow corpus  
- B2C growth features before product-market fit on insight quality  
- Cross-session personalization (beyond assignment-required in-session memory for clarifying dialogue)  

---

## User Flow (MVP)

```
1. User opens chat UI.
2. User describes situation (2–3 sentences), or vague one-liner.
3. If vague → Silhouette asks one clarifying question (no tools yet).
4. User answers → Silhouette retrieves via knowledge_base (primary).
5. Silhouette returns:
   - Short acknowledgment / reframe (optional, brief)
   - One key insight (quote or paraphrase from tool result)
   - Source: title, author, link
   - One sentence: why this applies now
   - One small next step (5–15 min) — keeps assignment demo actionable
6. Optional: "Did this land?" (required in PRD; implement if not present)
7. If knowledge_base weak → web_search fallback (assignment tool)
8. If math helps next step → calculator (assignment tool)
```

First request may be slow while RAG vector store initializes.

---

## Functional Requirements (Assignment + Product)

### Must have

- Multi-tool agent: `knowledge_base`, `web_search`, `calculator`  
- RAG over ≥5 real documents with **source attribution** in every insight response  
- Conversation memory **within session** (clarifying Q + follow-up)  
- Web UI: send message, see response, persist `sessionId` in browser session  
- Structured logging: request, tool calls, inputs/outputs, final response, errors  
- Crisis routing in system prompt (988, Crisis Text Line; stop normal flow)  
- Vague vs. specific input handling (clarifying questions only when vague)  

### Should have (product-critical per strategy)

- **Insight extraction:** Pull best quote/idea from retrieved chunk, not only link to article  
- **"Did this land?"** feedback on insight  

### Deferred

- Cross-session user memory and personalization  
- Persistent vector DB (in-memory OK for prototype)  
- School of Greatness / Huberman / Dan Martell corpus (until licensed/summarized)  
- Audio/video clip playback  
- Ranking, reranking, metadata-filtered retrieval beyond tags + embedding similarity  

---

## Success Metrics

### MVP (qualitative — primary)

- User describes insight as **specific and well-matched** to their situation  
- User can articulate **why** the insight was chosen (system's one-sentence + source)  
- User prefers experience to 20–40 min of random YouTube/podcast browsing for same moment  
- Retrieval logs show `knowledge_base` used with real titles/URLs from corpus (no fabricated citations)  

### MVP (quantitative — when feedback ships)

- % sessions with positive "did this land?"  
- % vague inputs that complete clarifying Q → insight path  

### Not MVP goals

- Daily active users, streaks, time-in-app  

---

## Non-Goals

- Therapy, diagnosis, crisis counseling beyond redirect  
- General wellness (meditation, sleep, fitness)  
- Content platform / recommendation feed  
- AI coach or open-ended companion  
- Serving all rut types before career/purpose wedge works  
- Monetization before insight quality is validated  

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Retrieval does not produce aha moments | Narrow corpus; emotional/situational queries; one clarifying Q; measure with "did this land?" |
| LLM fabricates sources | Force tool call before citations; log tool outputs |
| Product confused with ChatGPT | Emphasize named human sources and curated retrieval in UX and copy |
| Copyright at scale | MVP: quotes + summaries + links; document clip licensing before scale |
| Vague user input | Mandatory clarifying question path; no tools until specific enough |
| Assignment memory vs. strategy | Session memory for multi-turn clarifying flow only; no preference profiles |

---

## Dependencies and Constraints

- OpenAI API (LLM + embeddings)  
- Tavily API (web search fallback)  
- `.env` secrets not in git  
- Content: third-party text in prototype for class RAG; production path is metadata + attributed excerpts + outbound links unless licensed  

---

## Document Alignment

- **context.md** — audience, problem, alternatives, what we are not  
- **mvp.md** — assignment build, current implementation, gaps (feedback, corpus)  
- **architecture.md** — tools, data flow, logging, licensing, phase roadmap  
