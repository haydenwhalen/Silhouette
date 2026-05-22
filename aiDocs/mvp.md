# Silhouette — MVP Definition

> Assignment prototype scoped to prove **one insight, one aha moment** for young professionals in a career/purpose rut. Not the full platform vision.

---

## MVP Goal

Prove that Silhouette can consistently deliver a **genuine aha moment**: one human-sourced insight that feels specific, well-matched, and useful to a user in the target state (22–32, gray-zone career/purpose rut).

If retrieval cannot do this on a **narrow wedge**, nothing else matters yet.

---

## Narrow Wedge

| Dimension | MVP choice |
|---|---|
| **Who** | Young professionals, 22–32 |
| **Moment** | "Doing fine but something feels off; don't know how to move" |
| **Not** | Burnout crisis, clinical mental health, general life advice for all ages |
| **Delivery** | One insight per session + one sentence why it applies + one small next step (keeps demo actionable; next step is secondary to insight) |

---

## What the MVP Includes

### User experience

1. User describes situation (2–3 sentences or vague line).  
2. **If vague** → 2–3 short clarifying questions (current implementation); strategic target is **one** clarifying question — align when refining UX.  
3. **If specific enough** → agent calls `knowledge_base`, extracts key quote/idea from excerpt, cites title/author/URL.  
4. Optional small next step (5–15 minutes).  
5. **Target:** "Did this land?" feedback — **not yet implemented**; required by product strategy (see Gaps below).

### Technical (BYU assignment — implemented)

| Requirement | Status |
|---|---|
| LangChain.js tool-calling agent | Done — `createToolCallingAgent` + `AgentExecutor` |
| `calculator` tool | Done |
| `web_search` tool (Tavily) | Done |
| `knowledge_base` RAG (≥5 docs, attribution) | Done — 5 Greater Good articles |
| Conversation memory (session) | Done — `sessionId` + `ChatMessageHistory` |
| Web UI | Done — `/` + `POST /api/chat` |
| Structured logging | Done — JSON events in server console |
| `.env` / `.gitignore` | Done |

### Agent behavior (implemented)

- Vague input → clarifying questions only, no tools  
- Specific input → `knowledge_base` first; `web_search` fallback; `calculator` when useful  
- Must cite only tool-returned sources (prompt-enforced)  
- Crisis boundary in system prompt  

---

## What the MVP Does Not Include

- Multiple insights or ranked lists per turn  
- User accounts, profiles, saved preferences  
- Cross-session personalization or history  
- Habit tracking, streaks, notifications  
- Broad corpus before narrow retrieval works  
- Full audio/video clips (licensing)  
- Production-grade persistent vector DB  
- B2B or growth features  

---

## Current Corpus

**In repo (`docs/sources/`):** 5 Greater Good Science Center articles (overwhelm, avoidance, "doing enough," loneliness, self-compassion). Chunked 800 / overlap 150; embedded with `text-embedding-3-small`; in-memory vector store at runtime.

**Strategic target corpus (not yet ingested):** School of Greatness, Huberman Lab, Dan Martell — dense insight per minute; align with 22–32 career/purpose rut. Requires summarization/attribution strategy and licensing review before scale.

---

## Output Format (Per Session)

When delivering an insight (after clarifying, if needed):

1. **Brief reframe** (1–2 sentences) — optional, not preachy  
2. **One key insight** — quote or tight paraphrase from retrieved excerpt  
3. **Source** — title, author, clickable URL  
4. **Why this applies** — one sentence tied to user's words  
5. **One next step** — 5–15 minutes, realistic for low energy  

Under ~250 words total.

---

## Assignment User Flow (As Built)

```
User → POST /api/chat { message, sessionId }
     → Agent (system prompt + chat_history)
     → [vague?] clarifying questions only
     → [specific?] knowledge_base → (optional web_search, calculator)
     → JSON { reply, sessionId, toolsUsed }
     → UI renders markdown links
```

**Test prompts:**

- Vague: "I feel like I'm in a rut" → clarifying questions  
- Specific: "I feel overwhelmed and avoiding what matters" → RAG + attribution  
- Memory: answer clarifying Q, then "give me something more practical"  
- Calculator: "Break 4 hours into 3 chunks"  
- Web: "Find a recent TED talk on procrastination" (fallback path)  

---

## Gaps vs. Strategic MVP

| Gap | Priority |
|---|---|
| **"Did this land?" feedback** | High — only way to measure retrieval quality |
| **Reduce to one clarifying question** | Medium — UX alignment with strategy |
| **Corpus shift to podcast/interview sources** | Medium — after retrieval validated on current 5 docs |
| **System prompt + docs tone** | Ongoing — center 22–32 career/purpose examples |

---

## What Phase 1 Proves vs. Does Not Prove

### Proves

- User can describe a rut moment and get a cited, excerpt-backed insight via agent + RAG  
- Clarifying path improves vague input handling  
- Tool-calling agent selects tools appropriately in demo scenarios  
- Session memory supports multi-turn clarifying → insight flow  

### Does not prove

- Insight quality at scale or across real user cohort  
- School of Greatness / Huberman / Dan Martell retrieval  
- Feedback-driven improvement loop  
- Cross-session personalization  
- Business model or retention definition for intermittent use  

---

## How to Run and Test

```bash
npm install
cp .env.example .env   # add OPENAI_API_KEY, TAVILY_API_KEY
npm run dev            # http://localhost:3000
```

CLI: `npx tsx scripts/test-agent.ts`  
Tools: `npx tsx scripts/test-tools.ts [calculator|web-search|knowledge-base]`

Watch terminal for structured logs (`api_request`, `tool_call`, `agent_response`, etc.).

---

## Next Steps After MVP Validation

1. Ship "did this land?" and run 10–20 real user tests in target demographic.  
2. If match rate is weak → fix retrieval (chunking, tags, clarifying Q) before expanding corpus.  
3. Ingest 3–5 strategic sources as summaries + attributed quotes.  
4. Resolve clip licensing before serving audio/video.  
5. Only then consider cross-session memory or personalization.
