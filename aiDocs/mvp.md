# Silhouette — Phase 1: Assignment MVP

> This file defines the Phase 1 prototype of Silhouette, built as a BYU multi-tool AI agent course project.
> It describes what this version is, what it proves, what it does not prove, and how it connects to the long-term product vision.

---

## Why the MVP Is Intentionally Narrow

Silhouette's long-term vision is a scalable hybrid recommendation platform with personalized ranking, external discovery, feedback loops, and a curated content graph. That system cannot be built in a semester.

The Phase 1 MVP exists to validate one thing: **the core micro-reset loop works.** A user in a stuck moment can describe how they feel, receive one relevant resource with an explanation, and get one concrete next step — and that experience feels meaningfully better than asking ChatGPT or browsing YouTube.

Everything else — personalization, external discovery, ranking sophistication, scale — is deliberately deferred. Phase 1 is a proof of concept for the interaction model, not a proof of the full platform.

---

## Role of the BYU Class Prototype

The assignment version was built for a BYU course on multi-tool AI agents. The course required:

- A LangChain.js ReAct agent
- At least three tools: calculator, web search, and RAG over at least 5 real documents
- Source attribution in responses
- Conversation memory
- A web UI
- Structured logging of tool calls

Silhouette was designed to satisfy these requirements authentically — every required component has a natural role in the product:

- **RAG** is the core value tool (resource retrieval from the curated library).
- **Web search** is the fallback discovery mechanism.
- **Calculator** supports making next steps concrete (time breakdowns, progress estimates).
- **Memory** enables coherent multi-turn conversations.
- **The web UI** is the product interface.

The assignment constraints aligned with the product needs. Phase 1 is not a demo stitched together for a rubric — it is the first functional version of a real product idea, scoped to what can be built and validated in a course timeline.

---

## What Phase 1 Proves

1. **The intake loop works.** Users can describe their stuck moment in a few sentences, and the agent can ask useful clarifying questions.
2. **Emotional-state classification is feasible.** The agent can internally identify which stuck pattern the user is experiencing and use that to guide retrieval.
3. **RAG retrieval over a curated library produces relevant results.** A small, well-tagged knowledge base can surface resources that feel matched to the user's moment.
4. **The one-resource-plus-one-step format is a valid unit of value.** Users receive something concrete instead of a generic pep talk.
5. **Source attribution builds trust.** Explaining why a resource was chosen and who created it makes the recommendation feel credible.
6. **The experience feels different from ChatGPT.** Guided intake plus curated retrieval plus explained recommendation is a distinct experience from open-ended prompting.
7. **Safety routing is implementable.** The agent can detect crisis signals and respond appropriately without continuing the normal flow.

---

## What Phase 1 Does Not Prove

1. **Personalization.** Phase 1 has no user profiles, preference learning, or cross-session memory. Every session starts cold.
2. **Recommendation ranking quality at scale.** With 5 documents and basic similarity search, retrieval is functional but not optimized. There is no reranking, no emotional-fit scoring, no format or duration matching.
3. **External discovery quality.** Web search is available as a fallback but has no quality filters, trust scoring, or normalized schema.
4. **Retention and return behavior.** Phase 1 cannot measure whether users return for the next stuck moment.
5. **Action follow-through.** There is no mechanism to track whether users actually take the suggested next step.
6. **Library coverage.** Five documents across 3–4 stuck moments is enough to demonstrate the loop, not enough to serve users reliably.
7. **Business viability.** Phase 1 validates the interaction model, not the business model.

---

## Current Tools

### Tool 1: `knowledge_base_rag`

Performs vector similarity search over a curated set of documents and returns the most relevant chunks with source metadata (title, author, type, URL). This is the core value tool — it is how Silhouette finds the right resource for the user's stuck moment.

### Tool 2: `web_search`

Searches the public web via Tavily for relevant resources. Used as a fallback when RAG results are weak or when the user asks for something outside the curated library. Web search supplements the internal library but is not the primary retrieval path.

### Tool 3: `calculator`

Evaluates mathematical expressions. Used to make next steps concrete and quantified — breaking tasks into time blocks, estimating commitments, showing that a first step is smaller than it feels.

---

## Current User Flow

```
1. User opens the web UI.
2. Silhouette greets the user and asks a low-effort intake question.
3. User describes their stuck moment in 1–3 sentences.
4. Agent may ask one clarifying follow-up.
5. Agent internally classifies the stuck pattern.
6. Agent calls knowledge_base_rag to retrieve a matching resource.
7. If RAG results are strong:
   → Agent presents the resource, a "why this" explanation, and one next step.
   → If the next step benefits from a number, agent calls calculator.
8. If RAG results are weak:
   → Agent calls web_search for a supplemental resource.
   → Agent presents the best result with honest framing.
9. User can ask a follow-up, request a different resource, or end the session.
10. Memory keeps the conversation coherent across turns.
```

The entire session takes under 3 minutes.

---

## Supported Stuck Moments (Phase 1)

Phase 1 supports three primary stuck moments, with an optional fourth.

### 1. The Avoidance Spiral

The user has something meaningful to do and has been avoiding it. The avoidance creates compounding guilt and shame.

**Output:** One resource about avoidance or re-entry + one micro first step (e.g., "open the document and write one sentence").

### 2. The Post-Doomscroll Slump

The user spent too long on their phone and now feels numb, drained, or worse.

**Output:** One short resource about reclaiming a moment + one small physical or mental redirect action.

### 3. The "I'm Behind in Life" Paralysis

A heavy, foggy sense of falling behind — no single trigger, just accumulated weight.

**Output:** One grounding, perspective-restoring resource + one clarity action (e.g., "name one thing you actually care about right now").

### 4. The Comparison Crash (Optional)

The user compared themselves to someone and now feels deflated and inadequate.

**Output:** One identity-grounding resource + one reconnecting action.

---

## Current Knowledge Base

Phase 1 includes 5 curated source documents:

1. *Overwhelmed by Suffering? Here's How to Act Anyway* — Greater Good Magazine
2. *Why We Avoid Our Feelings* — on avoidance and emotional processing
3. *Am I Doing Enough?* — on the "behind in life" feeling
4. *Why Do We Feel Lonely?* — on loneliness and disconnection
5. *The Case for Self-Compassion* — on self-compassion and recovery

Documents are chunked (800 tokens, 150 overlap), embedded with OpenAI `text-embedding-3-small`, and stored in an in-memory vector store. Each chunk carries metadata: title, author, publisher, URL, and tags.

---

## MVP Output Format

Each session produces exactly this:

**One resource**, including:

- Title and source (e.g., "Elizabeth Svoboda — *Overwhelmed by Suffering?*, Greater Good Magazine")
- A 1–2 sentence description of what it covers
- A short "why this fits your moment" explanation

**One next step**, including:

- A single action described in one sentence
- Completable in 5–15 minutes
- Realistic for someone with low energy

**Optional:** A one-sentence acknowledgment of how the user feels before delivering the output.

---

## Limitations of Phase 1

| Limitation | Impact | Addressed in |
|---|---|---|
| In-memory vector store (resets on restart) | Documents must be re-ingested on every server start | Phase 2 |
| No persistent user profiles or preferences | Every session is a cold start; no personalization | Phase 2 |
| 5 documents only | Library coverage is minimal; many stuck moments will get weak matches | Phase 2 |
| Basic similarity search only | No reranking, no emotional-fit scoring, no metadata filtering | Phase 2–3 |
| No feedback mechanism | Cannot learn from user ratings or follow-through | Phase 2 |
| No external quality filters | Web search fallback returns unfiltered results | Phase 3 |
| Session-scoped memory only | No cross-session context; user must re-describe their state every visit | Phase 2 |
| No streaming responses | Responses arrive all at once, which can feel slow | Phase 2 |
| No mobile-responsive design | UI is desktop-first | Phase 2 |

---

## What Must Come Next After Phase 1

### Phase 2 — Stronger internal library + basic personalization

- Expand the curated knowledge base to 30–50+ resources across all stuck moment categories.
- Add richer metadata: emotional-state tags, format tags, duration, tone, safety/suitability, licensing info.
- Implement persistent vector store (documents survive server restarts).
- Add basic user preferences (format, tone, length) via lightweight onboarding.
- Add session-end feedback signal (relevance rating, action follow-through).
- Implement streaming responses.
- Mobile-responsive UI.

### Phase 3 — Hybrid retrieval

- Add external discovery with quality filters, allow/deny lists, and trust scoring.
- Normalize external results into the same schema as internal resources.
- Clearly distinguish curated vs. external recommendations in the UI.
- Implement metadata-filtered retrieval (not just similarity search).
- Add reranking based on emotional fit, format preference, and duration.

### Phase 4 — Scalable platform

- Build ingestion pipeline for new content (discovery, cleaning, auto-tagging, embedding, review).
- Implement learning-to-rank from user feedback and behavior signals.
- Develop embedding-based personalization from usage history.
- Explore creator partnerships and licensed content.
- Establish business model (freemium, premium personalization, B2B partnerships).

---

## How the MVP Ladders Into the Business Vision

Phase 1 validates the core loop: intake → classification → retrieval → explanation → action.

If users report that the recommended resource felt relevant, that they understood why it was chosen, and that they attempted the next step — then the interaction model is validated, and the remaining work is improving the recommendation engine underneath it.

Every subsequent phase makes the same loop better:

- Phase 2 makes retrieval more precise through richer metadata and early personalization.
- Phase 3 makes coverage broader through hybrid search with quality controls.
- Phase 4 makes the entire system smarter through feedback-driven ranking and scale.

The MVP is the simplest credible version of the loop. The business is built by making the loop progressively harder to replicate.
