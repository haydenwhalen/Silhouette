# Silhouette — System Architecture

> This document describes Silhouette's technical architecture across four development phases,
> from the assignment prototype through the scalable platform vision.

---

## Architecture Overview

Silhouette is a hybrid recommendation and retrieval system with a conversational interface. The user interacts through a guided chat experience. Behind the conversation, a recommendation engine classifies the user's emotional state, retrieves candidate resources from internal and external sources, ranks them by fit, and delivers one explained recommendation with one actionable step.

The architecture evolves across four phases:

| Phase | Focus | Key Capabilities |
|---|---|---|
| **Phase 1** | Assignment prototype | LangChain ReAct agent, 3 tools, in-memory RAG, session memory, chat UI |
| **Phase 2** | Stronger internal library | Persistent store, richer metadata, basic personalization, feedback signals |
| **Phase 3** | Hybrid retrieval | Internal + external discovery, quality filters, metadata-filtered search, reranking |
| **Phase 4** | Scalable platform | Ingestion pipelines, learning-to-rank, embedding-based personalization, creator partnerships |

---

## Phase 1 Architecture (Assignment MVP)

### What was built

A single LangChain.js ReAct agent with three tools, session-scoped conversation memory, a system prompt encoding Silhouette's personality and safety boundaries, and a simple Next.js chat UI.

### Stack

- **Runtime:** Next.js (React 19, App Router)
- **Agent framework:** LangChain.js (`createToolCallingAgent` + `AgentExecutor`)
- **LLM:** OpenAI GPT-4o-mini
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Vector store:** LangChain `MemoryVectorStore` (in-memory, non-persistent)
- **Web search:** Tavily API
- **Memory:** LangChain `ChatMessageHistory` with `RunnableWithMessageHistory`, session-scoped
- **UI:** React components with a simple chat layout

### Tools

| Tool | Role | Implementation |
|---|---|---|
| `knowledge_base_rag` | Core retrieval — vector similarity search over curated documents | `MemoryVectorStore.similaritySearch(query, 2)` with source metadata |
| `web_search` | Fallback discovery — public web search via Tavily | Tavily API returning titles, snippets, URLs |
| `calculator` | Supporting tool — makes next steps concrete with numbers | Expression evaluator for time breakdowns, progress estimates |

### Data flow

```
User message
  → POST /api/chat { message, sessionId }
  → Agent (system prompt + conversation history + tool access)
  → Agent reasons about which tool(s) to call
  → Tool execution (RAG, web search, and/or calculator)
  → Agent synthesizes response
  → JSON response { reply, sessionId, toolsUsed }
  → UI renders in chat
```

### Knowledge base

- 5 curated markdown documents in `docs/sources/`
- Chunked with `RecursiveCharacterTextSplitter` (800 tokens, 150 overlap)
- Embedded and stored in `MemoryVectorStore` on first request
- Each chunk carries metadata: title, author, publisher, URL, tags

### Conversation memory

- Session-scoped using `ChatMessageHistory` keyed by `sessionId`
- Remembers: user's described feelings, classified stuck moment, recommended resources, next steps, follow-up context
- Resets when the session ends (no cross-session persistence)

### System prompt

The system prompt encodes:

- Silhouette's identity and personality (supportive, practical, honest, non-preachy)
- The guided intake flow (ask what's going on, clarify, classify, retrieve, present)
- Tool usage instructions (when to use RAG vs. web search vs. calculator)
- Safety boundaries (crisis detection, resource routing, scope limits)
- Output format (one resource with explanation + one next step)

### Logging

- Structured logging of tool calls, arguments, and results
- Agent reasoning steps are traceable for debugging

### Phase 1 limitations

- In-memory vector store resets on server restart
- No persistent user profiles or preferences
- No feedback mechanism
- No reranking or emotional-fit scoring
- No quality filters on external search
- No streaming responses
- 5 documents only

---

## Phase 2 Architecture (Stronger Internal Library + Basic Personalization)

Phase 2 upgrades the internal recommendation engine without yet adding external discovery.

### Persistent vector store

- Replace `MemoryVectorStore` with a persistent solution (Pinecone, Weaviate, Chroma, or PostgreSQL with pgvector)
- Documents survive server restarts
- Supports incremental additions without full re-ingestion

### Expanded knowledge base (30–50+ resources)

- Broader coverage across all stuck moment categories
- Richer metadata per resource (see schema below)
- Mix of curated third-party references (metadata + annotations + links) and in-house content (full text)

### Resource metadata schema

| Field | Type | Purpose |
|---|---|---|
| `resource_id` | string | Unique identifier |
| `title` | string | Resource title |
| `creator` | string | Author, speaker, or creator name |
| `source_platform` | string | Where the resource lives (YouTube, Spotify, blog, etc.) |
| `source_url` | string | Link to the original resource |
| `resource_type` | enum | podcast_episode, article, video, talk_excerpt, custom_insight, book_excerpt |
| `format` | enum | audio, video, text, interactive |
| `duration_minutes` | number | Estimated consumption time |
| `emotional_state_tags` | string[] | overwhelm, avoidance, low_confidence, directionlessness, burnout, post_rejection, loneliness |
| `topic_tags` | string[] | Specific topics covered |
| `tone` | enum | practical, gentle, direct, story_based, humorous, reflective |
| `safety_suitability` | enum | general, sensitive (requires care), not_for_crisis |
| `content_rights` | enum | in_house, licensed, metadata_only, public_domain |
| `annotation` | string | Short non-substitutive note on what the resource covers and why it is included |
| `full_text` | string (nullable) | Full text or transcript — only for in-house or licensed content |
| `created_at` | datetime | When the resource was added to the library |
| `quality_score` | number | Internal quality rating |

### Basic personalization

- **Lightweight onboarding:** emotional state, format preference, time budget, tone preference — collected in under 60 seconds
- **Storage:** simple user preference profile (local storage or basic server-side session)
- **Influence:** preferences filter retrieval (e.g., prefer audio under 10 minutes, prefer direct tone)
- **No login required:** preferences can be re-entered or skipped

### Feedback signals

- Session-end prompt: "Was this helpful?" (thumbs up/down or 1–5 scale)
- Optional: "Did you try the next step?" (yes/no)
- Feedback stored per session for quality analysis
- Not yet used for automated ranking; used for manual quality assessment and library curation decisions

### Streaming responses

- Token-level streaming for agent responses
- Improves perceived latency and conversational feel

### Mobile-responsive UI

- Chat interface adapts to mobile screen sizes
- Touch-friendly input and message display

---

## Phase 3 Architecture (Hybrid Internal + External Retrieval)

Phase 3 adds structured external discovery alongside the internal library.

### Hybrid retrieval model

```
User describes stuck moment
  → Emotional-state classification
  → Parallel retrieval:
      1. Internal library search (embeddings + metadata filters)
      2. External discovery (structured web search with quality filters)
  → Candidate merging and deduplication
  → Ranking (relevance, emotional fit, format match, trust level)
  → Top recommendation selected
  → Explanation generated
  → Presented to user with clear source labeling
```

### Internal retrieval upgrades

**Metadata-filtered search**

- Combine embedding similarity with metadata filters
- Example: "Find resources tagged avoidance + format:audio + duration < 10 minutes + tone:direct"
- Reduces false matches from pure semantic similarity

**Hybrid search (dense + sparse)**

- Combine dense retrieval (embeddings) with sparse retrieval (keyword/BM25)
- Better handling of specific terms, names, and concepts that embeddings can miss
- Weighted combination tuned by retrieval evaluation

**Reranking**

After initial retrieval, apply a reranking step that scores candidates on:

- Semantic relevance to the user's described moment
- Emotional-state fit (does the resource match the classified stuck moment?)
- Format preference match
- Duration fit (does it match the user's available time?)
- Historical helpfulness (if feedback data is available)
- Freshness (if relevant)

Early implementation: heuristic weighted scoring with tunable weights. Later: cross-encoder reranker or learned ranking model.

### External discovery

**Structured search, not random browsing**

- External search queries are constructed from the classified stuck moment and desired resource attributes, not from raw user input
- Queries include format and quality constraints (e.g., "short podcast episode about overcoming avoidance from a credible creator")

**Quality and trust filters**

- **Allow list:** trusted domains and creators (known podcasts, reputable publications, verified YouTube channels)
- **Deny list:** domains known for low-quality, clickbait, or harmful content
- **Quality signals:** domain authority, creator reputation, content freshness, absence of engagement-bait patterns
- **Normalized schema:** external results are mapped into the same metadata schema as internal resources before ranking

**Clear labeling**

- Internal curated recommendations are labeled distinctly from external discoveries
- Example: "From Silhouette's library" vs. "Found on the web — not yet reviewed by Silhouette"
- Users can distinguish between trusted curated content and supplemental external finds

### Source attribution and linking

- All recommendations include: title, creator, platform, and a link to the original
- Silhouette never presents external content as its own
- For third-party content: metadata + a short annotation, not full text

---

## Phase 4 Architecture (Scalable Platform)

Phase 4 evolves Silhouette from a tool into a platform with scalable ingestion, intelligent ranking, and business-model infrastructure.

### Ingestion pipeline

New content enters the system through a structured pipeline:

```
Discovery
  → Cleaning and normalization (strip boilerplate, normalize formatting)
  → Auto-tagging (emotional state, topic, format, tone via classifier models)
  → Chunking and embedding
  → Safety and quality review (automated filters + human review for edge cases)
  → Metadata enrichment (duration, creator info, licensing status)
  → Indexed into the resource store
  → Periodic rescoring and pruning (remove stale or underperforming resources)
```

**Discovery sources:**

- Manual submission by the Silhouette team
- API feeds from content platforms (podcast directories, blog RSS, video APIs)
- Crawlers for trusted domains
- User-suggested resources (enter the pipeline, not auto-trusted)

**Supported content types:**

- Articles and blog posts
- Podcast episodes (metadata + summaries; transcripts only if licensed)
- Video content (metadata + summaries; transcripts only if licensed)
- Talks and speeches (excerpts with attribution)
- In-house content (full text, fully controlled)

**Auto-tagging:**

- Classifier models assign emotional-state tags, topic tags, tone, and safety/suitability
- Human review validates auto-tags for borderline or sensitive content
- Tagging accuracy improves over time from correction data

### Learning-to-rank

Replace heuristic scoring with a learned ranking model:

- **Training signal:** user feedback (relevance ratings, action follow-through, return behavior, "show me something different" requests)
- **Features:** semantic similarity, emotional-state match, format preference, duration fit, creator affinity, resource quality score, freshness, diversity bonus
- **Model:** start with a gradient-boosted model (e.g., LambdaMART); evolve as data accumulates
- **Evaluation:** offline metrics (NDCG, precision@1) and online A/B testing
- **Guardrails:** ranking model recommendations are bounded by safety and quality floors — no resource that fails safety review can rank first regardless of predicted relevance

### Embedding-based personalization

Move beyond stored preferences to behavioral personalization:

- Build a user embedding from interaction history (which resources were helpful, which stuck moments recur, which formats work best)
- Use the user embedding as an additional signal in retrieval and ranking
- Enable collaborative filtering: "users with similar patterns also found this helpful"
- Privacy: user embeddings are derived from aggregated behavioral signals, not raw emotional transcripts; users can delete their data at any time

### Creator partnerships and licensed content

- Establish partnerships with podcasters, authors, educators, and content creators
- Licensed content can be stored as full text, enabling richer chunking and retrieval
- Creator relationships deepen the library and create exclusivity
- Revenue sharing or promotional value for creators whose content is recommended

### Business model infrastructure

- **Freemium tier:** core micro-reset experience (intake → one resource → one step) is free
- **Premium tier:** deeper personalization, preference profiles, session history, expanded resource access
- **B2B tier:** university partnerships, corporate wellness programs, coaching platform integrations
- **Trust-preserving constraints:** no sponsored recommendations disguised as organic; no emotional-data sales; transparent if any partnership influences content availability

---

## Emotional-State Classification

### Approach

Silhouette classifies stuck moments using soft clustering, not clinical diagnosis. The system identifies which emotional-behavioral pattern the user is experiencing to improve retrieval precision.

### Classification method by phase

- **Phase 1:** LLM-based classification via the system prompt. The agent reads the user's description and internally identifies the stuck pattern from a predefined set.
- **Phase 2–3:** Add structured classification with confidence scores. Use a lightweight classifier (fine-tuned embedding model or few-shot LLM classification) to produce a probability distribution over stuck moment categories.
- **Phase 4:** Learn classification boundaries from user feedback, correction data, and outcome signals.

### Stuck moment taxonomy

| Category | Description | Example Triggers |
|---|---|---|
| Overwhelm | Paralyzed by volume of obligations or decisions | Full inbox, multiple deadlines, "I don't know where to start" |
| Avoidance / Procrastination | Avoiding something specific; delay creates compounding guilt | Assignment due, email to send, conversation to have |
| Low confidence / Imposter | Doubting ability or belonging; hesitating to act | Before a presentation, after feedback, new role or environment |
| Directionlessness | No clear priority or purpose; foggy "what am I doing?" feeling | Post-graduation, career uncertainty, accumulated drift |
| Burnout | Chronic depletion after sustained effort | End of a demanding project, ongoing overwork, caregiving fatigue |
| Post-rejection | Deflated after a specific setback | Failed application, breakup, critical feedback, public failure |
| Loneliness | Social disconnection; feeling unseen or unsupported | New city, lost friendship, isolation during remote work |

### User correction

The system allows users to refine the classification:

- "That's not quite it — I'm more feeling [X]"
- The agent adjusts retrieval accordingly
- Over time, correction patterns inform classification improvements

---

## Explainability

Every recommendation includes a brief, trust-building explanation of why it was chosen. Explanations are a core product feature, not a technical afterthought.

### What to explain

- The emotional state the system identified: "It sounds like you're dealing with avoidance and the guilt that comes with putting something off."
- Why this resource fits: "This is a short piece about getting back in when you've been avoiding something — it's practical and direct, not preachy."
- Format and duration context: "It's a 6-minute read, which fits the time you mentioned having."
- Creator context (when relevant): "This is from [creator], who talks about this kind of thing in a no-nonsense way."

### What not to explain

- Internal ranking scores or algorithmic details
- Embedding distances or similarity metrics
- Technical classification labels or confidence scores

### Tone

Explanations should feel like a friend saying "I think this would be good for you because..." — short, specific, and honest.

---

## Retrieval Architecture (Cross-Phase Summary)

| Capability | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Internal vector search | MemoryVectorStore, similarity only | Persistent store, similarity + metadata filters | Hybrid dense + sparse search | Same + learned query expansion |
| External search | Tavily (unfiltered fallback) | Not yet upgraded | Structured search with quality filters and allow/deny lists | Crawlers, API feeds, auto-discovery |
| Reranking | None | Basic metadata-aware filtering | Heuristic weighted scoring | Learning-to-rank model |
| Personalization | None | Stored preferences (format, tone, duration) | Preference-aware ranking | Embedding-based behavioral personalization |
| Feedback loop | None | Manual review of session ratings | Ratings influence quality scores | Ratings train ranking model |
| Source attribution | Basic (title, author, URL) | Richer metadata displayed | Internal vs. external clearly labeled | Full provenance chain |

---

## Ranking Logic

Silhouette's real value is not just retrieval, but ranking. Finding candidate resources is necessary; selecting the best one for this user in this moment is the product.

### Candidate scoring dimensions

| Dimension | What it measures | Phase introduced |
|---|---|---|
| Semantic relevance | How well the resource content matches the user's described moment | Phase 1 (implicit via similarity search) |
| Emotional-state fit | How well the resource's emotional-state tags align with the classified stuck moment | Phase 2 |
| Format preference | Whether the resource format matches the user's stated or learned preference | Phase 2 |
| Duration fit | Whether the resource length fits the user's available time | Phase 2 |
| Historical helpfulness | How well this resource has performed for similar users or moments (from feedback) | Phase 3 |
| Completion rate | Whether users who receive this resource tend to finish their session positively | Phase 3 |
| Freshness | How recently the resource was added or last validated | Phase 3 |
| Exploration / diversity | Bonus for surfacing resources the user has not seen before or from underrepresented categories | Phase 3 |

### Evolution of ranking

- **Phase 1:** No explicit ranking. Agent receives top-2 similarity results and chooses one via LLM reasoning.
- **Phase 2:** Metadata-aware filtering narrows candidates before similarity search. Agent still makes final selection.
- **Phase 3:** Heuristic weighted scoring combines multiple dimensions into a single score. Weights are manually tuned based on feedback patterns.
- **Phase 4:** Learning-to-rank model trained on user feedback replaces heuristic scoring. Online A/B testing validates ranking changes.

---

## Personalization Architecture

### Cold start (new users)

The system must work well for first-time users. Early signals come from:

- **Micro-onboarding:** a quick emotional state choice, time budget, and format/tone preference — under 60 seconds, entirely optional
- **In-session signals:** what the user describes, how they respond to the first recommendation, whether they ask for something different
- **Sensible defaults:** the system has reasonable fallback behavior when no preferences are known

Avoid heavy onboarding. A user in a stuck moment has no energy for a 10-question quiz.

### Preference learning (returning users)

Over time, Silhouette learns:

- **Preferred format:** audio, video, text, or mixed
- **Content length:** quick (under 5 minutes) vs. moderate (5–15 minutes) vs. deep (15+ minutes)
- **Tone:** practical, gentle, direct, story-based, humorous
- **Creator preferences:** which voices resonate and which do not
- **Action style:** whether the user prefers physical actions, mental reframes, structured tasks, or social steps
- **Emotional patterns:** which stuck moments recur and what has helped before

### Personalization by phase

- **Phase 1:** None. Every session is a cold start.
- **Phase 2:** Stored preferences from onboarding. Simple tag-based filtering.
- **Phase 3:** Preferences influence ranking weights. Session history available for returning users.
- **Phase 4:** Embedding-based user profiles. Collaborative filtering. Behavioral personalization.

---

## Legal and Copyright Posture

Silhouette's content handling must respect copyright, licensing, and creator trust at every phase.

### What is stored as full text

- In-house content: original articles, insight cards, and guides written by the Silhouette team
- Licensed content: resources where explicit permission or license has been obtained
- Public domain or clearly open-licensed material

### What is stored as metadata + annotations

- Third-party articles, podcast episodes, videos, and talks
- Metadata: title, creator, platform, URL, format, duration, topic tags, emotional-state tags
- Annotation: a short (1–3 sentence) non-substitutive note explaining what the resource covers and why it is relevant — this does not replace the original content

### What is linked out

- All third-party content links to the original source
- Silhouette acts as a recommendation layer, not a content host
- Users consume the actual resource on the original platform

### Creator relationships

- Long-term, Silhouette should position itself as a distribution partner for creators
- Recommending content drives traffic and attention to original creators
- Licensed partnerships enable deeper integration (full transcripts, exclusive content)
- Creator trust is essential — Silhouette should never be perceived as extracting or replacing creator work

### Phase 1 exception

The Phase 1 prototype stores full text of 5 curated articles for the assignment's RAG requirement. This is acceptable for a class prototype with no public distribution. As the product moves toward real users, the content posture must shift to the metadata-and-link model for any content that is not in-house or explicitly licensed.

---

## Trust and Safety Boundaries

### Crisis detection and routing

- The system prompt includes instructions for detecting crisis signals (suicidal ideation, self-harm, acute danger)
- When triggered, the agent:
  1. Acknowledges what the user shared with empathy
  2. Clearly states that Silhouette is not equipped for this situation
  3. Provides resources: 988 Suicide and Crisis Lifeline (call or text 988), Crisis Text Line (text HOME to 741741), and a suggestion to contact a counselor or trusted person
  4. Does not continue the normal reset flow
- Phase 1: crisis routing is handled in the system prompt
- Phase 3+: may move to a dedicated safety classifier for more reliable detection

### Non-clinical positioning

- Silhouette never diagnoses, labels clinical conditions, or implies therapeutic capability
- Emotional-state categories are functional descriptions ("you seem to be dealing with avoidance"), not clinical terms
- Language is practical and human, not medicalized

### Data handling

- User conversation data is used only to improve the current session and (with consent) to improve recommendation quality
- Emotional-state data is never sold, shared with advertisers, or used for ad targeting
- If user profiles are introduced, users control what is stored and can delete their data

### Tone

Silhouette is always:

- Supportive without being clinical
- Practical without being cold
- Honest without being preachy
- Encouraging without being fake
- Brief without being dismissive
