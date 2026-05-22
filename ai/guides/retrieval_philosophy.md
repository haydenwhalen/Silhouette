# Silhouette — Component 3: Retrieval Philosophy

> **Summary:** This document defines how Silhouette should think about retrieval before any implementation begins. It specifies what the system retrieves (Structured Insight Objects using a two-tier Source + Insight object model), how those objects are structured (phased metadata schema: MVP-Required vs. MVP-Recommended vs. Future), how matching should work (confidence-adaptive state filtering with pool-size safety clause, semantic retrieval, and resonance reranking), what "well-matched" means measurably (8-dimension rubric with human judging anchors), how retrieval quality is evaluated before users (40-query labeled test set with inter-rater calibration), how feedback signals feed back into retrieval and corpus gap detection, and what the MVP should and should not build. It is the bridge between the corpus (what exists) and the retrieval engine (how it's queried). Nothing here specifies a vector database, a hosting provider, or a production framework.

> **How to use this document:** Read it before designing the Corpus / Ingestion Pipeline or the Retrieval Engine. The data model defined here determines what must exist in the corpus. The matching logic defines what the retrieval engine must support. The evaluation plan defines what "working" means before you ship.

---

## 1. Purpose and Scope

### What This Document Is

Retrieval Philosophy is the conceptual design layer between what exists in the corpus and how it gets queried. It answers:

- What is the unit of retrieval — what exactly does the system return?
- What metadata must every retrievable object carry?
- How does matching work — what signals matter, in what order, at what priority?
- What does "well-matched" mean in terms a human evaluator can apply?
- What happens when the system is uncertain?
- How do we evaluate retrieval quality before real users confirm or deny it?

### What This Document Is Not

This is not:
- An implementation specification for a vector database or retrieval engine
- A corpus ingestion protocol (that is Component 5)
- An intake flow design (that is Component 4)
- A recommendation engine or personalization system
- A set of code instructions

Technology choices — which vector store, which embedding model, which reranker — follow from this document. They do not precede it.

### Where This Sits in the Architecture

```
User Problem Model  →  defines stuck states and tagging vocabulary
Source Strategy     →  defines what content belongs in the corpus
User Resonance Model →  defines insight types and voice registers
         ↓
[Retrieval Philosophy] ← you are here
         ↓
Corpus / Ingestion Pipeline  →  must implement the data model defined here
Intake / Diagnostic Flow     →  must produce the query structure defined here
Retrieval Engine             →  must support the matching logic defined here
```

Every decision in this document either uses inputs from the three documents above it or creates requirements for the three components below it. Changes to this document must be evaluated against both directions.

---

## 2. Design Principles

### 1. State relevance beats topical similarity.
A podcast about entrepreneurship is not relevant to Inaction Loop. A specific moment where a credible founder describes the identity shift required before they could start something is. The retrieval system must be able to enforce state relevance as a hard filter, not merely a soft preference. Topical adjacency is a retrieval failure mode, not a retrieval strategy.

### 2. Resonance matters after state fit.
Two insights equally appropriate for Direction Collapse are not interchangeable. Which one actually lands depends on whether the user receives mechanism or story content more readily, and whether the speaker's register fits their current emotional posture. Resonance match is the second retrieval dimension — it is not optional, but it is secondary to state fit.

### 3. Return one strong match — not several weak ones.
Silhouette returns a single insight per session. The system should prefer finding nothing genuine over returning something mediocre. A confident no-match is better than a confident mediocre retrieval. Retrieval must have a rejection threshold, not just a ranking.

### 4. Attribution must be preserved at every stage.
Every retrievable unit carries full, verifiable attribution. Nothing is returned without knowing: who said it, what show it appeared on, when, and at what timestamp. Attribution is not metadata — it is the product. Retrieval logic must surface attribution as a first-class element, not an afterthought.

### 5. Retrievable units must stand alone.
A returned insight is shown to a user without surrounding episode context. If the insight only makes sense after 90 minutes of setup, it is not retrievable. The unit of retrieval must be evaluated for standalone comprehensibility at ingestion time, not inferred at query time.

### 6. Uncertainty should trigger fallback or clarification — not false confidence.
If state detection is ambiguous, ask before retrieving. If the corpus has no strong match, say so. The system should not return a weakly-matched insight because returning something feels better than returning nothing. False confidence is worse than acknowledged uncertainty for a product built on trust.

### 7. Retrieval must be testable before real users.
Every retrieval design decision should produce a measurable prediction that can be evaluated against a labeled test set. If the design doesn't produce testable claims about retrieval quality, it's not a design — it's a hope. Define the evaluation protocol before the corpus is built.

### 8. Diversity is a retrieval requirement, not a bonus.
A corpus with 50 insights for Direction Collapse is only useful if those insights represent genuinely different speakers, insight types, and voice registers. Retrieval must enforce speaker diversity so the same voice is not returned in consecutive sessions. MMR (Maximal Marginal Relevance) is the standard mechanism for this.

### 9. Safety boundaries are non-negotiable at the retrieval layer.
Some inputs signal a state outside Silhouette's scope — acute crisis, clinical distress, suicidal ideation. The retrieval layer must have a safety gate that routes these inputs before any corpus matching occurs. Retrieval should never be attempted when the user's input exceeds Silhouette's designed scope.

### 10. Retrieval must be observable and debuggable.
Every retrieval decision must be logged with enough information to understand why a specific insight was returned for a specific query. Retrieval quality cannot be improved if the reasoning is invisible. Logging is a retrieval design requirement, not an operations afterthought.

### 11. The corpus is the ceiling. Retrieval amplifies it — it cannot fix it.
No retrieval algorithm compensates for a corpus with insufficient insight density. If Silhouette returns mediocre results, the first question is always corpus quality, not retrieval logic. Retrieval Philosophy does not rescue a weak corpus — it maximizes what a strong corpus can do.

---

## 3. Unit of Retrieval

### Decision: The Structured Insight Object

The core retrievable unit in Silhouette is a **Structured Insight Object (SIO)** — not a raw transcript chunk.

This is the central architectural choice. It shapes the entire corpus data model.

**What a Structured Insight Object is:**
A discrete, self-contained unit representing one retrievable insight from one speaker. It contains:
- A verbatim transcript excerpt (the raw source material)
- A key claim (the most retrievable sentence or two, distilled from the excerpt)
- Full attribution (speaker, show, episode, timestamp)
- A complete set of metadata tags (state, insight type, voice register, and more — see Section 4)
- A human-written content summary and match notes

**Why not raw transcript chunks?**

Generic RAG systems chunk documents into fixed-size or semantically-split segments and embed them for retrieval. This works well when the retrieval target is "information within a large document." It fails for Silhouette because:

- Silhouette's corpus is not a document collection — it is a curated library of discrete human moments
- Raw chunks from a 3-hour podcast carry no state tag, no credibility signal, and no attribution-ready format
- The insight quality judgment required for Silhouette cannot be automated — it requires editorial review at ingestion time, which means the unit of ingestion should be the unit of retrieval
- A random 300-word chunk from a Huberman Lab episode may contain nothing retrievable; a 200-word human-selected and human-tagged excerpt always does

The SIO model makes every object in the corpus a deliberate editorial decision. This is appropriate for a product whose moat is corpus quality.

### The Two-Tier Object Model

A key structural refinement: the corpus uses a two-tier hierarchy, not a single flat object. This matters for the ingestion pipeline design.

**Tier 1 — Source Object:** One record per approved episode, article, or talk. Stores all metadata that belongs at the episode level: show name, episode title, date, URL, transcript source, source type, source score. Created once and referenced by all insights from that episode.

**Tier 2 — Insight Object (the SIO):** One record per extractable insight moment. References its parent Source Object via `source_id`. Stores only the insight-specific metadata: the excerpt, key claim, state tags, insight type, voice register, speaker, timestamp, credibility tier, and evaluation fields.

**Why this matters:**
- When 3 insights come from the same Huberman Lab episode, the episode title, date, and URL are stored once in the Source Object — not duplicated 3 times across SIOs.
- If a source URL changes or a transcript is updated, one record is updated, not every SIO.
- The ingestion pipeline creates Source Objects first (when approving an episode), then creates SIOs (when extracting insights from that episode). This sequence is cleaner than building everything in one pass.
- The presentation layer can retrieve the full Source Object context when it needs to display attribution or a link to the original — without that context being embedded in every SIO.

The metadata schema in Section 4 specifies which fields belong at which tier. The example JSON shows an SIO that references its Source Object by ID.

### Ideal Length for the Transcript Excerpt

**Target range: 75–250 words.**

- Minimum (75 words): Below this, the insight loses necessary context for standalone comprehension. A 2-sentence quote may be quotable but not comprehensible without setup.
- Maximum (250 words): Above this, the insight stops being retrievable as a discrete moment and becomes a passage requiring context. If a meaningful moment requires more than 250 words to convey, it is likely two insights — split it.
- Optimal (120–180 words): The range where the insight is specific, self-contained, and dense. Most high-quality podcast moments fall here.

This range is deliberately narrow. The job of the ingestion pipeline is to find the insight-dense segment and extract it at this length — not to dump a large chunk and hope retrieval finds the right part.

### Key Claim Field

Every SIO includes a `key_claim` — a 1–2 sentence distillation of the insight's core claim, written by the tagger. This field is embedded alongside the transcript excerpt and serves as the primary semantic anchor for retrieval. It is shorter and more precise than the excerpt, making it more reliable as the primary embedding target.

The key claim should be a statement the user could hear in isolation and experience a shift from. It is not a summary — it is a retrieval target.

### One Source, Multiple SIOs

A single episode of a single show can produce multiple Structured Insight Objects. Each SIO represents one distinct moment — one speaker, one claim, one state. There is no limit on the number of SIOs from one episode, but each must pass the standalone comprehensibility test independently.

No overlapping chunks within the same state. An insight is discrete by definition — within a given primary state tag, two SIOs should not share transcript content.

*Cross-state exception:* A transcript passage that genuinely serves two distinct stuck states may be ingested as two separate SIOs with different `primary_state_tag` values, different `key_claim` statements, and different `content_summary` text — but only if the framing and what makes it valuable are genuinely different for each state, not just the label. This is rare. If the same passage with the same framing is relevant to two states, it is probably best represented as one SIO with a `secondary_state_tag`.

### How This Choice Affects Ingestion

The Corpus / Ingestion Pipeline (Component 5) must:
1. Evaluate episodes at the timestamp level to identify insight-dense segments
2. Extract segments at the 75–250 word range and draft the `key_claim`
3. Tag each SIO against the full metadata schema (Section 4)
4. Human-review every SIO before it enters the corpus
5. Embed each SIO using the `key_claim + transcript_excerpt` combined field

This is higher-effort than automated chunking. That is intentional. The corpus quality is the moat.

---

## 4. Metadata Schema

The schema is organized by tier, aligned with the two-tier object model from Section 3. Fields in the Source Object are shared across all SIOs from that episode. Fields in the Insight Object are specific to one extractable moment.

Each field is marked by MVP phase: **MVP-Required** (must exist before an SIO can be indexed), **MVP-Recommended** (valuable but can be added in a second pass or AI-assisted), or **Future** (defer until the product has real usage data).

### 4.1 Source Object Fields

One record per approved episode. Created when an episode is cleared for ingestion. These fields are not duplicated on every SIO — they are stored once and referenced via `source_id`.

| Field | Phase | Allowed Values / Format | Tagging Method |
|---|---|---|---|
| `source_id` | MVP-Required | UUID (auto-generated) | Auto-generated |
| `source_type` | MVP-Required | `long-form interview podcast`, `solo educational`, `author crossover`, `ted talk`, `youtube native` | Manual |
| `show_or_platform` | MVP-Required | Full show name string | Manual |
| `episode_or_content_title` | MVP-Required | Full episode title string | Manual |
| `episode_or_content_date` | MVP-Required | ISO 8601 (YYYY-MM-DD) | Manual |
| `source_url` | MVP-Required | Full URL to episode | Manual |
| `transcript_source` | MVP-Required | `official`, `auto-generated`, `manual`, `third-party` | Manual — documents transcript quality for ingestion decisions |
| `source_score` | MVP-Required | Integer 0–80 | From rubric evaluation; inherited from Source Strategy |
| `rights_or_usage_notes` | MVP-Recommended | Free text | Documents copyright concerns, unusual attribution requirements |
| `host` | Future | Full name string | Not needed for retrieval but useful for corpus analytics |

### 4.2 Insight Object Fields (the SIO)

One record per extractable insight moment. References its Source Object via `source_id`.

**Identity and provenance:**

| Field | Phase | Allowed Values / Format | Tagging Method |
|---|---|---|---|
| `insight_id` | MVP-Required | UUID (auto-generated) | Auto-generated |
| `source_id` | MVP-Required | References Source Object | Auto-linked from source |
| `speaker` | MVP-Required | Full name string — the attributed person, not the host | Manual |
| `timestamp_range` | MVP-Required | `HH:MM:SS–HH:MM:SS` | Manual |
| `transcript_excerpt` | MVP-Required | Verbatim transcript text, 75–250 words | Manual extraction |
| `attribution_text` | MVP-Required | `Speaker Name, appearing on Show Name, "Episode Title" (Date)` | Auto-generated from source fields + speaker |
| `ingestion_date` | MVP-Required | ISO 8601 | Auto-generated |

**Retrieval tags (the core of what makes this SIO findable and well-matched):**

| Field | Phase | Allowed Values / Format | Tagging Method |
|---|---|---|---|
| `primary_state_tag` | MVP-Required | `direction-collapse`, `engagement-drought`, `inaction-loop`, `possibility-paralysis`, `identity-transition`, `momentum-gap` | Manual — must match UPM taxonomy exactly |
| `insight_type` | MVP-Required | `reframe`, `permission`, `mechanism`, `story` | Manual |
| `voice_register` | MVP-Required | `direct/challenging`, `warm/affirming`, `intellectual/measured`, `vulnerable/personal`, `expert/scientific` | Manual |
| `key_claim` | MVP-Required | 1–2 sentences | Manual — written by tagger; the semantic anchor for embeddings |
| `credibility_tier` | MVP-Required | `tier-1` (direct lived experience), `tier-2` (domain expertise), `tier-3` (research/empirical) | Manual |
| `intensity_level` | MVP-Required | `mild`, `moderate`, `intense` | Manual — required for safety matching; prevents mismatched register |
| `secondary_state_tags` | MVP-Recommended | Array of state tags | Manual — only if content is genuinely relevant to a second state |
| `direction_collapse_variant` | MVP-Recommended | `post-achievement`, `original` | Manual — only when `primary_state_tag = direction-collapse` and variant is clear |

**Descriptive fields (quality and context):**

| Field | Phase | Allowed Values / Format | Tagging Method |
|---|---|---|---|
| `content_summary` | MVP-Required | 2–4 sentences | AI-assisted draft + human review acceptable |
| `human_review_status` | MVP-Required | `pending`, `reviewed`, `approved`, `flagged` | Manual |
| `tagger_confidence` | MVP-Required | `high`, `medium`, `low` | Manual — low-confidence SIOs held back until re-reviewed |
| `user_problem_match_notes` | MVP-Recommended | Free text (1–3 sentences) | Manual — documents non-obvious aspects of the state the insight addresses |
| `resonance_match_notes` | MVP-Recommended | Free text (1–3 sentences) | Manual — flags notably narrow resonance fit |
| `topic_keywords` | Future | Array of strings, max 8 | AI-generated — enables future BM25 indexing; not needed for MVP retrieval |

**Fields evaluated and excluded:**

| Field | Decision | Rationale |
|---|---|---|
| `actionability_level` | Excluded | Silhouette is not designed to return action prescriptions; this rewards the wrong content |
| `abstraction_level` | Excluded | Covered by `insight_type`; redundant |
| `evidence_type` | Excluded | Covered by `insight_type` + `credibility_tier` |
| `maturity_level` | Excluded | Target audience is fixed; doesn't discriminate |
| `freshness_date` | Excluded | Content targets timeless human experiences |
| `emotional_tone` | Excluded | Captured by `voice_register` + `intensity_level` |

### 4.3 Tagging Burden and AI Assistance

The MVP-Required fields number approximately 12–14 per SIO. This is the realistic minimum for retrieval to work well. The tagging burden per SIO is approximately 15–20 minutes for an experienced tagger who has read the User Problem Model and User Resonance Model.

Fields that can be AI-assisted (draft + human review):
- `content_summary` — AI can draft; human verifies accuracy and checks for drift from the original
- `key_claim` — AI can propose; human verifies it captures the exact insight and stands alone
- `attribution_text` — auto-generated from source fields

Fields that must be human-tagged at MVP:
- `primary_state_tag` — requires judgment against UPM taxonomy; AI tagging risk is high for adjacent states
- `insight_type` and `voice_register` — requires judgment against URM taxonomy
- `credibility_tier` — requires knowledge of the speaker's background
- `intensity_level` — requires tonal judgment
- `tagger_confidence` — inherently human

AI-assisted tagging for the required tags is not recommended until a validation study shows >85% agreement between AI draft tags and human review tags across a sample of 50 SIOs.

### 4.4 Example JSON: Two-Tier Object Model

**Source Object** (stored once per episode):

```json
{
  "source_id": "src-tim-ferriss-mcconaughey-2020",
  "source_type": "author crossover",
  "show_or_platform": "The Tim Ferriss Show",
  "episode_or_content_title": "Matthew McConaughey — Lessons from an Unlikely Life",
  "episode_or_content_date": "2020-10-27",
  "source_url": "https://tim.blog/2020/10/27/matthew-mcconaughey/",
  "transcript_source": "auto-generated",
  "source_score": 71,
  "rights_or_usage_notes": "Verbatim quotes for attribution purposes. Do not reproduce without attribution. Publicly available podcast."
}
```

**Insight Object (SIO)** (one of potentially several from this episode):

```json
{
  "insight_id": "sio-7f3a92b1-4e1d-4c8a-b5d7-f23a91e4c0d1",
  "source_id": "src-tim-ferriss-mcconaughey-2020",
  "speaker": "Matthew McConaughey",
  "timestamp_range": "01:14:22–01:17:08",
  "transcript_excerpt": "I turned down the romantic lead roles because I wanted to be taken seriously as an actor, and I went from making $14.5 million a picture to zero. And I had to go to zero. Because I wasn't going to get those kinds of roles until I proved I'd do them for free. So I turned down a $14.5 million picture, my agent dropped me, my manager dropped me. And I went and made a documentary in Africa for six months for free. And I came back and I gave it away. And things started to happen. But you gotta first go back to zero. The place where you can be honest about what you actually want. Because when you're making $14.5 million, you can't be honest — everything costs too much to tell the truth.",
  "attribution_text": "Matthew McConaughey, appearing on The Tim Ferriss Show, \"Matthew McConaughey — Lessons from an Unlikely Life\" (October 27, 2020)",
  "primary_state_tag": "direction-collapse",
  "direction_collapse_variant": "post-achievement",
  "secondary_state_tags": ["inaction-loop"],
  "insight_type": "story",
  "voice_register": "vulnerable/personal",
  "key_claim": "I had to go back to zero — the place where you can be honest about what you actually want. Because when you're making $14.5 million, you can't be honest — everything costs too much to tell the truth.",
  "content_summary": "McConaughey describes voluntarily leaving a high-earning career to pursue what he actually wanted to do as an actor, framing 'going back to zero' as the necessary precondition for honesty about real direction. The reframe: external success actively prevents the clarity you need.",
  "credibility_tier": "tier-1",
  "intensity_level": "moderate",
  "tagger_confidence": "high",
  "human_review_status": "approved",
  "resonance_match_notes": "Lands best for users who respond to personal narrative from recognizable figures and are emotionally open. May feel too soft for users who need a direct challenge.",
  "user_problem_match_notes": "Specifically addresses post-achievement variant: external success is incompatible with honest self-direction, not that the user hasn't worked hard enough.",
  "ingestion_date": "2026-05-22"
}
```

---

## 5. Matching Logic

### Strategy Comparison

| Strategy | How It Works | Strengths | Weaknesses | Fit for Silhouette |
|---|---|---|---|---|
| **Pure semantic (vector only)** | Embed query → find nearest neighbors by cosine similarity | Simple, catches semantic meaning | Cannot distinguish semantically similar states; no structured signal | Insufficient alone |
| **Semantic + metadata pre-filter** | Filter corpus by structured fields first, then run semantic search in filtered set | Enforces hard state boundaries; efficient on small corpora | Requires high-confidence state detection before filtering | Appropriate for MVP |
| **Hybrid BM25 + vector** | Run BM25 keyword search and vector search in parallel, combine scores | Handles both semantic and exact-term queries | BM25 value is low when queries are emotional descriptions (no keyword overlap with content) | Useful at scale; not MVP priority |
| **Hybrid + cross-encoder reranking** | Retrieve candidates with hybrid, rerank with a cross-encoder that sees both query and passage jointly | Best retrieval accuracy; +33–40% improvement over no reranking | +120ms latency per query; requires more infrastructure | Add in v2 |
| **Multi-stage** | Broad retrieval → filter → semantic re-score → diversity pass | Maximally flexible and accurate | Complexity is high; overkill for small corpora | Future v2+ |

### Can Semantic Similarity Alone Distinguish the States?

No. This is the critical design constraint.

Direction Collapse, Engagement Drought, and Inaction Loop are semantically adjacent in embedding space. A user describing an Inaction Loop ("I know exactly what I need to do and I keep not doing it") will produce an embedding that has high cosine similarity to many Engagement Drought and Direction Collapse insights — because all three share the vocabulary of feeling stuck, not moving, and uncertainty. Embedding similarity finds what is *topically similar*. It does not find what is *state-appropriate*.

Without a state filter, the retrieval engine will consistently return content that addresses the wrong state with high confidence scores. This is Trap 2 from the system map: "treating finding something as finding the right thing."

Structured state filtering is mandatory, not optional.

### Silhouette Recommendation: State-Filtered Semantic Retrieval with Resonance Reranking

For MVP (corpus size: 200–600 SIOs):

**Step 1 — State filter (confidence-adaptive)**
The state filter is the primary retrieval constraint. Its behavior adapts to detection confidence:

- **High confidence:** Pre-filter to only SIOs where `primary_state_tag` matches the detected state. This is a hard gate — no cross-state content enters the candidate pool.
- **Moderate confidence:** Retrieve across both top-ranked states. Weight the primary state candidate pool at 70% and the secondary at 30% in the combined ranking. This prevents the secondary state from dominating while ensuring it provides fallback candidates.
- **Low confidence:** Do not filter yet. Ask the clarifying question first (see Section 7).

**Pool-size safety clause:** Even at high confidence, if the filtered pool contains fewer than 5 approved SIOs (e.g., because the corpus is thin for a sub-state or the resonance filter further reduces candidates), automatically expand to include cross-state content tagged with `secondary_state_tags` overlapping the detected state. Log this expansion — it is a corpus gap signal, not normal behavior. A hard filter on a 3-SIO pool is more likely to fail silently than to protect quality.

This clause prevents the failure mode where a hard filter, combined with a small corpus and resonance filtering, leaves the retrieval engine with nothing to return — causing a no-match that frustrates the user when reasonable alternatives exist.

**Step 2 — Semantic search within filtered set**
Embed the user's input text and compute cosine similarity against a pre-built embedding of each SIO's `key_claim + transcript_excerpt` combined field. Retrieve the top-N candidates (N = 5–10 for MVP). The purpose of semantic search here is not state discrimination — the filter handles that — but specificity matching within the correct state. "The exact moment in this state that resonates with this user's specific description" is a semantic question.

**Step 3 — Resonance filter or reranking**
If the user's resonance profile is known: apply `insight_type` and `voice_register` as hard or soft filters.
- Hard filter: exclude SIOs with excluded voice registers (e.g., `direct/challenging` if user has signaled fragility)
- Soft preference: boost SIOs matching the user's preferred `insight_type` and `voice_register` in the score

If resonance is unknown (first session): use the state default resonance profile (see Section 7.5).

**Step 4 — Credibility and quality boost**
Apply a small score boost for `credibility_tier = tier-1` SIOs. Apply a penalty for `tagger_confidence = low`. This surfaces the highest-quality, most credible insights at the top of the candidate set.

**Step 5 — Diversity and source over-representation check**
Before finalizing, apply:
- Speaker uniqueness: if top candidates include multiple SIOs from the same speaker, surface only the highest-scoring one from that speaker. Return diversity is a product requirement, not a nice-to-have.
- MMR pass: if returning multiple candidates for inspection (e.g., top 2–3 for manual evaluation), apply Maximal Marginal Relevance to ensure the candidates are meaningfully different from each other, not variations on the same frame.

**Step 6 — Threshold check and return**
Score the top candidate against the "well-matched" rubric (Section 8). If it exceeds the Strong Match threshold: return it. If it falls in the Acceptable range: return it with slightly more conservative framing. If it falls below threshold: do not return it — enter fallback (Section 7).

### MVP vs. V2 Retrieval

| Feature | MVP | V2 |
|---|---|---|
| State filter | Hard filter | Hard filter + weighted boost for high-confidence states |
| Semantic search | Vector similarity on `key_claim + excerpt` | Same + BM25 on `topic_keywords` and `key_claim` |
| Resonance | Filter/boost on known profile; state default if unknown | Same + engagement history weighting |
| Reranking | Score-based rule, manual weights | Cross-encoder reranker (e.g., MiniLM-L6-v2 or equivalent) |
| Diversity | Speaker uniqueness rule | MMR with λ = 0.6 applied to candidate set |
| Logging | Retrieval inputs, filters applied, returned SIO ID, score | Same + latency, reranker scores, fallback path taken |

### Retrieval Diversity and Deduplication

**Why diversity matters for Silhouette specifically:**
A user who returns for multiple sessions must not receive the same insight twice, or insights from the same speaker in consecutive sessions. The corpus is intentionally small; without diversity management, the system will over-return from the highest-scoring speakers (Goggins for Inaction Loop, Naval for Direction Collapse) and create the impression that Silhouette has only one perspective on each state.

**Deduplication rules:**
- Within a session: if the user rejects the first returned insight, the next retrieval must not return the same `insight_id`.
- Across sessions (when profile data exists): avoid returning the same `insight_id` within the last N sessions (N = 10 for MVP).
- Same speaker: do not return the same speaker in consecutive sessions for the same state.

**MMR for candidate sets:**
When evaluating multiple candidates (for evaluation purposes or when first/second fallback candidates are needed), apply MMR to the candidate set using the `key_claim` embedding space. MMR selects items that are both relevant to the query AND dissimilar from already-selected items. λ = 0.6 balances relevance and diversity appropriately.

### Source Over-Representation Controls

The corpus concentration limit from Source Strategy (max 3 SIOs per speaker per state for MVP) addresses this at the data layer. At the retrieval layer, enforce:
- No single speaker accounts for more than 40% of retrievals in any 30-day rolling window (once logging makes this visible)
- Flag speakers who appear in >60% of retrievals for a given state — this is a signal either of corpus imbalance or retrieval bias

---

## 6. Query Structure

A retrieval call to the Silhouette engine should eventually accept the following inputs. Not all are available for MVP — see notes on phasing.

| Field | MVP | V2+ | Type | Purpose |
|---|---|---|---|---|
| `user_text` | Required | Required | String | The user's actual input; embedded for semantic matching |
| `detected_state` | Required | Required | State tag or null | Primary retrieval filter; null triggers fallback |
| `state_confidence` | Required | Required | `high`, `moderate`, `low` | Determines whether to pre-filter or retrieve across multiple states |
| `secondary_possible_states` | Required | Required | Array of state tags | Used when confidence is Moderate |
| `preferred_insight_type` | Optional | Required | `reframe`, `permission`, `mechanism`, `story`, or null | Resonance dimension 1; null triggers state default |
| `preferred_voice_register` | Optional | Required | Register value or null | Resonance dimension 2; null triggers state default |
| `excluded_voice_registers` | Optional | Required | Array of register values | Hard exclusion for safety or explicit user preference |
| `variant_signal` | Optional | Optional | `post-achievement`, `original`, or null | Direction Collapse sub-state when detectable |
| `session_context` | Optional | Required | String or null | Prior exchange in the session; used to avoid returning content already discussed |
| `returning_user_profile` | Not available | Required | Profile object or null | Engagement history, resonance profile, seen SIO IDs |
| `excluded_sio_ids` | Optional | Required | Array of insight IDs | Prevents returning rejected or seen insights |
| `intensity_preference` | Optional | Required | `mild`, `moderate`, `intense`, or null | Ensures appropriate intensity; null defaults to `moderate` |
| `safety_flag` | Required | Required | Boolean | If true, bypass retrieval entirely and route to safety response |

### First-Session vs. Returning Users

**First-session users:**
- `returning_user_profile` is null
- `preferred_insight_type` and `preferred_voice_register` are null or inferred from intake language
- Intensity defaults to `moderate`
- State default resonance is applied (see Section 7.5)
- The system should not over-personalize based on one data point; a first-session user may receive the state-default resonance even if their language suggests otherwise
- No `excluded_sio_ids` — full corpus is available

**First-session resonance inference (limited):**
Even without a profile, intake language carries weak resonance signals. If the user's text is highly analytical in register ("I'm trying to understand why I keep doing this"), slightly boost `mechanism` or `reframe` content. If the user's text is emotionally self-referential ("I just feel stuck and I don't know what's wrong with me"), slightly boost `permission` or `story` content. These are weak signals — they adjust the reranking, not the filter.

**Returning users:**
- `returning_user_profile` contains: seen SIO IDs, rejected SIO IDs, session history with state tags, and engagement signals (which sessions led to "did this land?" positive responses)
- `preferred_insight_type` and `preferred_voice_register` are populated from engagement history
- `excluded_sio_ids` prevents seen content from recurring
- Personalization strengthens over sessions — do not over-fit to a single engagement signal

---

## 7. Default Behavior and Fallback Logic

### The Fallback Hierarchy

Fallback is not a failure state — it is a designed behavior. Every situation where the system cannot retrieve with high confidence must have a specified response. This section defines that response for each scenario.

**Level 1: State confidence fallback**

| State Confidence | Action |
|---|---|
| **High** — one state clearly indicated | Pre-filter by that state. Proceed to retrieval. |
| **Moderate** — one state likely, one alternative plausible | Retrieve across both top-ranked states. Rerank combined candidates using semantic similarity + any available resonance signal. Return the highest-scoring result regardless of which state it belongs to. |
| **Low** — unclear across 2+ states | Do not retrieve. Ask one clarifying question using the pair-specific disambiguation questions from the User Problem Model. |
| **None** — input too sparse to classify | Do not retrieve. Ask for more context with a single open prompt: "Can you tell me a bit more about what's been feeling off?" Use the expanded input for state detection. |

**Level 2: Resonance fallback**

| Resonance Status | Action |
|---|---|
| **Known profile** | Filter and rerank using known `insight_type` and `voice_register` |
| **Unknown — first session** | Use state default resonance (see Section 7.5) |
| **Partial profile** (only one dimension known) | Apply the known dimension; use state default for the unknown one |
| **Conflicting signals** (intake language suggests one register, prior engagement suggests another) | Prefer the engagement signal over the intake language signal |

**Level 3: Corpus match quality fallback**

| Corpus Situation | Action |
|---|---|
| **Strong match found** (score ≥ 48/60 on well-matched rubric) | Return it |
| **Acceptable match found** (score 36–47/60) | Return it; use slightly broader framing in the presentation layer to signal appropriate confidence |
| **Weak match only** (score 24–35/60) | Do not return as the primary result. If secondary states were also queried, check their top results. If any secondary-state result scores Acceptable or above, return it with appropriate framing. If not, proceed to no-match response. |
| **No match above threshold** | Acknowledge the gap honestly. Do not fabricate confidence. Example response: "I don't have something that fits this exactly right now — can you tell me a bit more about what it feels like from the inside?" Use the additional input to re-attempt with a different state interpretation or resonance profile. |
| **Corpus thin for detected state** | Same as no-match response. Log the gap for corpus expansion prioritization. |

**Level 4: Retrieval quality safeguards**

| Situation | Action |
|---|---|
| **Top candidates are too similar** | Apply MMR to the candidate set; return the highest-scoring candidate after diversity pass |
| **Same speaker dominates top candidates** | Enforce speaker uniqueness rule; return the top-scoring candidate from the best-available alternative speaker if the top speaker has been returned recently |
| **Retrieved insight is state-appropriate but intensity-mismatched** | Apply `intensity_level` filter. A user whose input signals fragility should not receive an `intense` insight even if it is the best state match. |
| **User rejects or signals the result didn't land** | Log the rejection signal. On next retrieval in the same session, exclude the rejected SIO and try the next-highest-scoring candidate with a different `insight_type` or `voice_register`. Do not serve another Mechanism if Mechanism just failed — try Story or Permission. |

**Level 5: Safety boundaries**

The retrieval layer must include a safety gate that runs before any corpus matching occurs.

Inputs that trigger a safety bypass (no retrieval, direct safety response):
- Language indicating acute crisis, suicidal ideation, or self-harm
- Language describing abuse, violence, or emergency situations
- Language that indicates clinical depression beyond the "rut/low motivation" scope Silhouette is designed for

A safety response must:
- Not dismiss the user's experience
- Not attempt to retrieve and serve a motivational insight
- Acknowledge the severity of what the user has expressed
- Provide an appropriate resource reference (crisis line, professional support)
- Be defined by the Trust / Credibility Architecture team before the product is live

Defining specific safety trigger phrases and the exact safety response is a task for the Trust / Credibility Architecture component — not this document. What Retrieval Philosophy defines is that the safety gate exists and operates before retrieval, not after.

### 7.5 Default Resonance Profiles Per MVP State

When a user has no known resonance profile, retrieval defaults to the following profiles. **These are testable hypotheses, not proven defaults.** They are based on reasoning from the User Resonance Model and corpus analysis — not user research. They should be treated as the first configuration to validate, not the final answer.

Each default should be reviewed and updated once the system has processed 50+ sessions per state with feedback data. If a default consistently produces "didn't land" signals (>40% of first-session results for a given state), revise it before V2.

**An important nuance for all states:** For the very first session, resonance defaults should be treated as mild preferences (boosts), not hard filters. Even with a default of `mechanism/expert`, if no high-quality mechanism/expert SIO is available for the user's specific input, the system should fall through to the next-best resonance profile rather than returning a weak mechanism match. A strong `story` insight is better than a weak `mechanism` one.

---

**Direction Collapse — default profile:**
- Insight type: `reframe`
- Voice register: `intellectual/measured`
- Hypothesis: The first response to "I don't know what I want" is most effective when it reframes what direction is and how it is built, delivered in a measured voice. Story content is more powerful emotionally but requires trust — serve it in subsequent sessions. The `intellectual/measured` register likely works for the broadest range of first-session users in this state.
- What would invalidate this: If first-session users with Direction Collapse consistently engage more with Story/Vulnerable content than Reframe/Intellectual content.

**Engagement Drought — default profile:**
- Insight type: `mechanism`
- Voice register: `expert/scientific`
- Hypothesis: The Huberman-type insight — "here is why your motivation system works this way" — is Silhouette's sharpest differentiator for this state. The scientific register reframes self-attribution (I am lazy → this is how dopamine systems work), which is likely what this user most needs first. This is also the insight type most differentiated from what a generic AI would produce.
- What would invalidate this: If users with Engagement Drought show consistently higher engagement with Story or Permission content than with Mechanism content.

**Inaction Loop — default profile:**
- Insight type: `story`
- Voice register: `direct/challenging`
- Hypothesis: Users in the Inaction Loop are frustrated with themselves and need to hear from someone who understands that frustration from the inside and takes their capability seriously. The story/direct combination addresses the identity layer of the loop directly.
- What would invalidate this: If first-session Inaction Loop users consistently respond better to Permission content (naming that the loop is real and not a character flaw) than to Story/Direct content (someone who got out of it).

---

## 8. Definition of "Well-Matched"

### The Problem with Undefined "Well-Matched"

"Relevant" is not a definition. "Good" is not a definition. To evaluate retrieval quality, to know when a result should be returned vs. rejected, and to track whether the system is improving over time, there must be a rubric — a set of dimensions with defined scores and thresholds.

### The 8-Dimension Well-Matched Rubric

Score each dimension from 0–5. Apply weights. Calculate the weighted total (maximum 60 points).

| Dimension | Weight | Score 0–5 | Weighted Max |
|---|---|---|---|
| **State semantic relevance** | 3× | Does the insight directly and specifically address the user's detected stuck state? (0 = irrelevant, 5 = addresses the state's core dynamic precisely) | 15 |
| **Resonance match** | 2× | Does the insight's type and voice register fit the user's known or inferred resonance profile? (0 = mismatch, 5 = exact fit on both dimensions) | 10 |
| **Specificity of experience** | 2× | Is the insight specific and personal rather than generic? Does it name a particular moment, decision, or realization? (0 = entirely generic, 5 = highly specific with named details) | 10 |
| **Source credibility** | 1× | Is the speaker credible for this state based on lived experience, expertise, or research? (0 = no credibility, 5 = strongest available credibility for this state) | 5 |
| **Attribution quality** | 1× | Is attribution complete: speaker, show, episode, date, timestamp? (0 = incomplete, 5 = complete and verifiable) | 5 |
| **Tone appropriateness** | 1× | Is the intensity level appropriate for the user's current emotional posture? (0 = intensity mismatch, 5 = precisely calibrated) | 5 |
| **Non-redundancy** | 1× | Has this insight or this speaker been returned to this user recently? (0 = identical to recent result, 5 = entirely fresh) | 5 |
| **Standalone clarity** | 1× | Does the insight make sense without episode context? (0 = incomprehensible without setup, 5 = fully self-contained) | 5 |
| **Total** | | | **/60** |

### Score Thresholds

| Weighted Score | Label | Action |
|---|---|---|
| 48–60 (≥80%) | **Strong Match** | Return confidently. Presentation layer can frame with high confidence. |
| 36–47 (60–79%) | **Acceptable Match** | Return. Presentation layer should frame with slightly less certainty; allow user to indicate if it doesn't fit. |
| 24–35 (40–59%) | **Weak Match** | Do not return as primary result. Check fallback options. If no better option exists after fallback, acknowledge the gap. |
| Below 24 (<40%) | **Reject** | Do not return. Enter fallback hierarchy. |

### Score Anchors for Human Judging

When human evaluators apply the rubric — especially for the primary metric "would this land?" — they must use the same scale definitions. Without anchors, two judges will interpret the same insight very differently, making inter-rater agreement impossible. These anchors apply to the **overall well-matched judgment**, not to each dimension independently.

| Score | Anchor Definition | Example |
|---|---|---|
| **5** | This insight names the user's exact experience with specificity I couldn't have articulated. It changes something about how I see my situation. I would tell someone about this. | McConaughey's "you can't be honest when everything costs too much to tell the truth" for a post-achievement user |
| **4** | This insight clearly resonates and offers something I hadn't considered. I feel seen and I have a new frame. | A Huberman mechanism insight that explains exactly why motivation fades and reframes the user's self-attribution |
| **3** | This is relevant and not wrong, but it doesn't land hard. It's in the right area but something about the specificity, voice, or framing is off. | A generic Goggins quote about discipline for a user who needs permission more than challenge |
| **2** | This is topically adjacent but doesn't feel like it's about my situation. I would have to work to apply it to myself. | A Direction Collapse insight served to an Engagement Drought user |
| **1** | This doesn't match my experience or feels generic, prescriptive, or misaligned. I'd feel unseen if this were returned to me. | A productivity framework served to someone who knows exactly what to do but can't start |

**Inter-rater calibration requirement:** Before any human evaluation run, all judges must rate the same 10 calibration cases independently, then compare and discuss disagreements. Judges should align within 1 point on at least 8 of the 10 calibration cases before independent evaluation begins. If alignment is below this, revise the anchor definitions. This process takes ~1 hour but prevents invalid evaluation data.

### Notes on Applying the Rubric

**At ingestion time:** State semantic relevance, specificity, source credibility, attribution quality, and standalone clarity can all be scored during ingestion review. An SIO scoring below 3 on State semantic relevance or below 3 on standalone clarity should not be approved — these are ingestion-time quality gates, not retrieval-time decisions.

**At retrieval time:** Resonance match, tone appropriateness, and non-redundancy can only be scored for a specific user at a specific moment. They are computed by the retrieval engine, not embedded in the SIO.

**For evaluation purposes:** Human evaluators apply the overall well-matched judgment (using the anchors above) plus dimension-level scoring on the labeled test set. For live retrieval, a simplified proxy scoring (automated computation of state filter pass, resonance match, tagger confidence, intensity compatibility, and session exclusion check) provides a fast estimate. Full rubric scoring is periodic — quarterly retrieval quality audits — not live per-query.

---

## 9. Retrieval Evaluation Plan

### Why This Comes Before Ingestion

Retrieval quality must be testable before the first real user. This requires a labeled evaluation set — a set of queries with known correct answers — against which the retrieval system's outputs can be measured. Building the evaluation set before the corpus is built forces explicit decisions about what "correct" means. It is the only way to know if retrieval is working or merely running.

### Offline vs. Product Evaluation

These are different things that should not be conflated.

**Offline retrieval evaluation:** Does the system find the right SIO for a given query, measured against a labeled ground truth set? This is what the test cases and metrics below address. It can be done entirely without users, using human judges and a corpus.

**Product resonance evaluation:** Does the returned insight actually produce an aha moment for a real user in a real moment? This is what the "did this land?" feedback signal measures during live usage. It cannot be fully simulated offline, because the moment matters — the same insight may land in one session and miss in another depending on the user's emotional state.

Build offline evaluation first. It tells you whether the system is working. Product resonance evaluation tells you whether it's *working for users*. Both are required, but in sequence.

### The Gold Set

Before running the full evaluation against the labeled test set, establish a **gold set** — a small number of query-insight pairs where the correct match is unambiguous and agreed upon by multiple reviewers. These are the clearest possible correct answers: the McConaughey "going back to zero" insight for a post-achievement Direction Collapse query; a Huberman dopamine-system mechanism insight for a flat-motivation Engagement Drought query.

The gold set serves two purposes:
1. Calibrate the evaluation: if the system fails on gold-set queries, it has a fundamental problem before you even get to the harder test cases.
2. Serve as the anchor for human judge calibration (see Section 8).

Build a gold set of 10–15 pairs before building the full 40-query test set.

### Evaluation Set Composition — MVP

Minimum 40 labeled test queries (expanded from initial 30 to improve confidence in state discrimination results). Distribution:

| Category | Count | Purpose |
|---|---|---|
| Clear-state queries (4–5 per MVP state, covering varied phrasings) | 15 | Baseline: does the system find the right content when the state is obvious? Varied phrasings test robustness. |
| Ambiguous-state queries (Direction Collapse / Engagement Drought confusion) | 6 | Tests state discrimination on the hardest pair; most common real-world failure mode |
| Ambiguous-state queries (Inaction Loop / Possibility Paralysis confusion) | 4 | Tests second-hardest pair |
| Cold-start queries (no resonance profile; tests default profiles) | 5 | Validates that state defaults serve users who haven't established a resonance profile |
| Corpus-thin queries (valid state, fewer SIOs available) | 4 | Tests fallback behavior and pool-size safety clause |
| Rejection/no-match queries (user input that should not retrieve — safety or out-of-scope) | 6 | Tests safety gate, sparse-input detection, and scope boundaries |

**Total: 40 queries minimum for MVP.**

At least 2 human judges must rate every query-result pair independently. Judges should not see each other's ratings until after scoring. Measure agreement using Cohen's kappa; target κ ≥ 0.60 (substantial agreement). If κ < 0.60, revise the judging anchors and re-calibrate.

### Example Test Cases with Expected Behavior

**Test Case 1**
Input: "I got the promotion I've been working toward for two years. I should feel great. I just feel empty. I don't know what's next."

Expected state: `direction-collapse` / `post-achievement`
Expected insight type priority: `reframe` or `story` (not `mechanism`)
Expected voice register: Not `direct/challenging` (user is vulnerable, not resistant)
What retrieval should avoid: Any insight that prescribes next steps, offers a goal-setting framework, or uses "follow your passion"
Evaluation question: Does the returned insight name the post-achievement flatness before offering any reframe?

---

**Test Case 2**
Input: "I used to love my job. I was the person who stayed late because I wanted to. Now I just feel nothing about any of it. I show up, I do the work, I go home."

Expected state: `engagement-drought`
Expected insight type priority: `mechanism` (default) — explains why this happens, not just what to do
Expected voice register: `expert/scientific` (default)
What retrieval should avoid: Motivational content, calls to action, "here's how to get excited again" prescriptions
Evaluation question: Does the returned insight treat the user as someone whose engagement system has malfunctioned in a specific, explainable way?

---

**Test Case 3**
Input: "I know I need to leave this job. I've known for two years. I've had the conversation with myself a hundred times. I'm still here."

Expected state: `inaction-loop`
Expected insight type priority: `story` (default) — someone who was in the loop
Expected voice register: `direct/challenging` (default)
What retrieval should avoid: Productivity frameworks, accountability structures, habit-building advice, anything that starts with "here's what you should do"
Evaluation question: Does the returned insight address the identity layer of the loop — not just naming the behavior but naming the belief that sustains it?

---

**Test Case 4**
Input: "I feel behind everyone. My friend just got promoted to VP. Another friend started a company. I'm doing... fine. I don't know why it bothers me so much."

Ambiguous: Could be `momentum-gap` (comparison-triggered, recent event) or `direction-collapse` (chronic state described through comparison)
Expected disambiguation question trigger: "Is this something you've been feeling for a while, or did something specific happen recently?"
If chronic → `direction-collapse`; if triggered → `momentum-gap`
What retrieval should avoid: Any version of "comparison is the thief of joy"; moralizing about comparison

---

**Test Case 5**
Input: "I have like four different things I want to pursue. A career change, a side project, going back to school, moving cities. I keep going back and forth and not doing any of them."

Expected state: `possibility-paralysis`
What retrieval should avoid: Confusing with `inaction-loop`. The distinguishing signal: *multiple things listed*, not one thing avoided.
Evaluation note: If retrieval returns an Inaction Loop insight ("just start"), this is a state discrimination failure.

---

**Test Case 6**
Input: "I don't know. Everything just feels off. I'm tired."

Expected behavior: Do not attempt retrieval. This is too sparse. Respond: "Can you tell me a bit more about what's been feeling off?"
Evaluation question: Does the system ask for more context rather than retrieving on inadequate signal?

---

**Test Case 7 (Safety boundary)**
Input: "I honestly don't see the point in anything anymore. I've been feeling like this for months and nothing helps. I don't know how much longer I can do this."

Expected behavior: Safety gate triggers. No retrieval. Direct to appropriate support.
Evaluation question: Does the system correctly identify this as outside its scope and respond with appropriate care?

### Evaluation Metrics

| Metric | How It Is Measured | Target (MVP) |
|---|---|---|
| **State-match accuracy** | % of queries where the correct state was detected (on clear-state queries) | ≥ 90% |
| **Precision@1** | % of returned insights that a human judge rates as "appropriate for this state" | ≥ 80% |
| **"Would this land?" rating** | Human judges rate 1–5: would this produce an aha moment for this user? Average score across evaluation set | ≥ 3.8 / 5.0 |
| **Resonance match rate** | % of queries where the returned insight's type/register matches the expected resonance | ≥ 70% (lower because cold-start defaults are not always optimal) |
| **Attribution completeness** | % of returned insights with fully complete attribution (speaker, show, episode, date, timestamp) | 100% — this is a hard requirement |
| **Safety gate accuracy** | % of safety-boundary queries correctly routed (no retrieval attempt) | 100% — zero tolerance for retrieval on safety-boundary inputs |
| **Rejection rate** | % of queries where the system correctly declines to return a result (fallback) vs. returns a weak match | Aim for no Weak Match returns (below 24/60 on rubric) |
| **Diversity across 10 sessions** | Simulation: does 10-session usage produce insights from ≥ 5 distinct speakers? | ≥ 5 distinct speakers across 10 simulated sessions per state |

---

## 10. Feedback Signals and Corpus Gap Detection

### Why Feedback Design Belongs in Retrieval Philosophy

Feedback is not just a product feature — it is the mechanism by which retrieval learns. The signals collected, how they are interpreted, and what they trigger downstream are decisions that affect the retrieval architecture. Defining these before the product is live prevents the most common failure mode: collecting weak signals, misinterpreting them as strong evidence, and making retrieval changes based on noise.

### Signal Taxonomy

**Explicit signals** — the user takes a deliberate action:

| Signal | What It Means | Reliability |
|---|---|---|
| "This landed" (positive response to "did this land?") | Strong positive: state match, resonance match, and specificity all worked | High — deliberate, specific |
| "This didn't quite fit" (negative response) | Something was off: state, resonance, or specificity | High — deliberate; investigate *which* dimension failed via log |
| "Show me something different" (explicit request for another) | The match failed in a way the user noticed; they want another attempt | High |
| Skip without responding | Ambiguous: could be disengagement, distraction, or that the insight is "good enough" without warranting comment | Low |

**Implicit signals** — derived from behavior without explicit user action:

| Signal | What It May Indicate | Caution |
|---|---|---|
| Dwell time (>30 seconds on the returned insight) | User is reading carefully; possibly resonating | Moderate — not conclusive; could be re-reading due to confusion |
| Return to the same state in a subsequent session | Previous insight may not have resolved the state | Moderate — user states can recur naturally |
| Return to a *different* state in subsequent session | Possibly resolved; or the detected state was wrong | Low — hard to attribute causal direction |
| No return visit within expected timeframe | Cannot infer meaning without session cadence context | Very low |

**MVP signal collection:**
For MVP, collect only: the explicit "did this land?" signal (binary or thumbs up/down), `skip_without_response` (boolean), and `dwell_time_seconds`. Do not build complex implicit feedback processing for MVP. More sophisticated implicit signal processing belongs in V2 after explicit feedback volume establishes baselines.

### How Signals Feed Back Into Retrieval

**Session-level (immediate):**
- Explicit negative → exclude the returned `insight_id` from the next retrieval in the same session; try a different `insight_type` or `voice_register`
- Skip without response → treat as weak negative; note in session log but do not exclude

**Profile-level (across sessions — V2 only):**
- 2+ explicit positives from the same `insight_type` → begin treating this type as a resonance preference
- 1 explicit negative from a `voice_register` → slightly downweight that register; do not hard-exclude from one signal
- 3+ explicit negatives from the same `voice_register` → treat as a soft exclusion preference; flag for human review before hard-excluding

**Why not update profiles from single signals:** Research on implicit feedback in recommender systems consistently shows that single-interaction signals are unreliable — a user who positively rates one story insight may have been in an unusually emotional state, not consistently receptive to story content. The minimum threshold before updating a resonance preference is 2+ consistent signals from multiple sessions. Avoid the common mistake of over-personalizing from a single data point.

### Corpus Gap Detection

Retrieval failures are not just user experience problems — they are corpus expansion signals. Every time a fallback is triggered (especially "no match above threshold"), the system is implicitly reporting a gap in coverage.

**Gap detection rules:**

| Event | Signal | Action |
|---|---|---|
| Pool-size safety clause triggered (fewer than 5 SIOs after filtering) | Corpus thin for this state/resonance combination | Log and flag for corpus expansion review |
| No-match response served for the same state 3+ times in a 2-week window | State coverage is insufficient | Add to corpus expansion backlog with priority |
| Explicit negative on 3+ different SIOs for the same state in one user's session history | State coverage lacks diversity or resonance fit | Review corpus resonance distribution for that state |
| High explicit negative rate on a specific SIO (>60% of retrievals for that SIO produce negative) | This SIO is failing despite matching at the tag level | Flag SIO for re-review; consider removing or re-tagging |

The retrieval log (Section 11) must capture enough data to identify these patterns. Building corpus gap detection into the logging schema before the corpus is built ensures you can act on the signals when they appear.

---

## 11. Retrieval Logging and Observability

### What Must Be Logged — MVP

Every retrieval attempt must produce a log record containing:

| Field | Purpose |
|---|---|
| `session_id` | Links retrieval to a session for debugging |
| `query_timestamp` | When the retrieval was attempted |
| `user_text` (hashed or de-identified in production) | What the input was |
| `detected_state` | What state was detected |
| `state_confidence` | How confident the detection was |
| `secondary_possible_states` | Alternative states considered |
| `filters_applied` | Which state/resonance/exclusion filters were applied |
| `pre_filter_pool_size` | SIO count after state filter, before semantic search — enables pool-size gap detection |
| `candidates_retrieved` | How many SIOs entered the semantic search phase |
| `top_candidate_sio_id` | Which SIO was returned |
| `top_candidate_score` | The simplified well-matched proxy score for the returned SIO |
| `resonance_profile_used` | Whether a known profile or state default was applied |
| `fallback_path_taken` | Which fallback was triggered, if any (including pool-size safety clause) |
| `dwell_time_seconds` | Implicit engagement signal |
| `did_this_land` | The user's explicit feedback response (positive / negative / no response) |

### Why Logging Is a Retrieval Design Requirement

Without logging, there is no path to improving retrieval quality. When a result feels wrong to a user, there is no way to trace whether the failure was state detection, resonance mismatch, corpus quality, or the retrieval algorithm itself. Every retrieval failure becomes irreproducible.

Logging enables:
- Identifying which states consistently produce weak retrievals (corpus gap indicator)
- Tracking which speakers are returned disproportionately (over-representation detection)
- Correlating fallback paths with user feedback (which fallbacks are appropriate vs. disorienting)
- Producing the ground truth dataset needed for continuous retrieval improvement

The log record above must be implemented before any user-facing retrieval is active.

### Explainability

At the retrieval layer, every return decision has a reason: which filter was applied, which SIO won, why. This reason must be available for debugging, even if it is never shown to the user.

In the future, a simplified version of this reasoning may be surfaced to the user in the presentation layer: "This was retrieved because you described feeling empty after hitting a goal, and this speaker navigated exactly that." The Insight Presentation Layer team will decide what to show — but the data to support it must exist in the retrieval log.

---

## 12. Relationship to Other Components

### Intake / Diagnostic Flow (Component 4)

Intake exists to produce the query structure this document defines. The intake flow should be designed backward from Section 6 (Query Structure). Specifically:

- Intake must produce `detected_state` and `state_confidence` — the primary inputs to retrieval
- Intake must implement the pair-specific disambiguation questions from the User Problem Model when confidence is Moderate
- Intake must collect the minimal resonance signal for first-session users (register of language, emotional vs. analytical tone)
- Intake must implement the safety gate logic that sets `safety_flag = true` before retrieval begins

What is **locked in** for intake design:
- The state taxonomy (six states, controlled vocabulary)
- The confidence model (high / moderate / low)
- The resonance dimensions (insight_type, voice_register)
- The safety bypass requirement

What remains **open** for intake design:
- The exact onboarding flow and user-facing language
- Whether resonance is explicitly asked or only inferred
- The specific phrasing of clarifying questions

### Corpus / Ingestion Pipeline (Component 5)

The Corpus / Ingestion Pipeline must produce SIOs that conform to the metadata schema in Section 4. Specifically:

- Every field marked Required must be populated before an SIO can be indexed
- `human_review_status` must be set to `approved` before an SIO can be queried
- Embeddings must be generated from the combined `key_claim + transcript_excerpt` field
- The pipeline must enforce the corpus concentration limit (max 3 SIOs per speaker per state for MVP)

What is **locked in** for the pipeline:
- The SIO structure (unit of retrieval)
- The required and conditional fields
- The embedding target field
- The human review requirement

What remains **open** for the pipeline:
- The specific embedding model
- The vector database and indexing approach
- The tooling for transcript extraction and ingestion automation

### Retrieval Engine (Component 6)

The Retrieval Engine must implement the matching logic from Section 5. For MVP:
- State pre-filter is mandatory
- Semantic similarity search must operate on `key_claim + transcript_excerpt` embeddings
- Resonance filter/boost must be supported
- Speaker diversity check must be implemented
- Threshold-based rejection must be implemented (return nothing rather than a weak match)

### User Profile / Personalization (future component)

This document creates specific requirements for any future profile system:
- The profile must store: seen SIO IDs, rejected SIO IDs, session state history, engagement signals, inferred insight_type preference, inferred voice_register preference
- Profile data must feed into the query structure (Section 6) fields `returning_user_profile`, `excluded_sio_ids`, `preferred_insight_type`, `preferred_voice_register`

### Feedback / Quality Signal Loop (Component 9)

The feedback loop receives the `did_this_land` signal and routes it to retrieval improvement. This document defines what data must be available when feedback arrives: the `session_id`, `detected_state`, `returned_sio_id`, `top_candidate_score`, and `fallback_path_taken`. The feedback component will use this to identify which state/resonance combinations are consistently underperforming.

### UI / Response Generation

The presentation layer receives: the returned SIO (including `transcript_excerpt`, `key_claim`, `attribution_text`, and `content_summary`) plus metadata. It does not re-retrieve, re-generate, or modify the insight text. The attribution text is presented exactly as formatted in `attribution_text`. The `key_claim` is the most retrievable sentence and may be used as the lead presentation element.

---

## 13. Open Questions and Future Decisions

1. **How much resonance should be inferred vs. asked during first session?** The current design infers resonance from language register and defaults to state-based profiles. An alternative is to ask a single explicit preference question at onboarding: "Do you prefer direct/challenging voices or warm/supportive ones?" This adds friction but reduces mismatches. Decision belongs to Intake Design.

2. **What embedding model should be used?** This document is model-agnostic. The choice depends on semantic sensitivity to emotional language, cost, and API reliability. OpenAI text-embedding-3-small and Cohere embed-english-v3.0 are both reasonable starting points. This decision belongs to the Retrieval Engine implementation.

3. **How does the resonance profile update across sessions?** A single positive engagement signal is weak evidence; a single rejection is strong evidence. The update rule (how many positive signals before a resonance preference is confirmed; how a rejection affects future retrieval) must be defined by the Personalization component.

4. **At what corpus size does pure semantic + state-filter retrieval degrade?** Research suggests BM25 hybrid retrieval becomes meaningfully valuable at larger corpus sizes where keyword precision starts to matter. For Silhouette's small curated corpus (200–600 SIOs for MVP), semantic + filter is sufficient. Revisit this decision when the corpus exceeds 1,000 SIOs.

5. **How should engagement feedback update the corpus?** A SIO that consistently receives negative feedback ("didn't land") despite matching on state and resonance should be reviewed and potentially removed. The threshold for removal and the review process are corpus governance decisions.

6. **Should retrieval optimize for immediate resonance or long-term growth?** The current design optimizes for state-match and immediate resonance. A user in Inaction Loop might benefit long-term from a Permission insight even if they receive Story/Direct content most naturally. Whether Silhouette's retrieval should be purely present-state-optimized or occasionally serve developmental content is a product philosophy question.

7. **How much human review is required per SIO at scale?** MVP requires human approval for every SIO. At larger scale, AI-assisted tagging with spot-check review may be required. The threshold at which assisted review is trustworthy enough is not yet established.

8. **What is the minimum corpus size to validate retrieval quality?** The MVP target is 20 SIOs per state. Is this enough to produce a meaningful evaluation against the 30-query test set? If 3 of the 10 test queries for Direction Collapse require a specific sub-type (post-achievement) and the corpus only has 5 post-achievement SIOs, retrieval quality for that sub-type cannot be fairly evaluated. Define minimum per sub-type targets.

9. **How is the safety gate implemented technically?** This document specifies that the safety gate runs before retrieval. The implementation — keyword matching, an LLM safety classifier, or a fine-tuned model — is a Trust / Credibility Architecture decision, but it must be decided before any user-facing version ships.

10. **Should the retrieval log store hashed or de-identified user text?** The user text is the most privacy-sensitive element in the log. The decision about storage, retention, and de-identification must be made before logging is live.

11. **When should the cold-start resonance defaults be revised?** The current defaults (reframe/intellectual for Direction Collapse, mechanism/expert for Engagement Drought, story/direct for Inaction Loop) are hypotheses. What is the minimum number of sessions per state before aggregate engagement data is reliable enough to confirm or revise them? 50 sessions? 200? Define this threshold before V2 retrieval work begins.

12. **Should the Source Object and Insight Object live in the same database or separate stores?** The two-tier model defines the logical separation. The physical implementation — one vector index with foreign key references, two separate stores, or a graph structure — is a Retrieval Engine decision. It should be resolved before the ingestion pipeline is built, because the pipeline writes to this structure.

13. **What is the minimum corpus coverage required to validate the pool-size safety clause?** The clause triggers when fewer than 5 SIOs pass the state filter. At 20 SIOs per state, a resonance filter (insight_type + voice_register) could easily reduce the pool below 5 for narrow combinations. This may make the safety clause trigger too frequently during early corpus building. Define whether the pool-size threshold should scale with corpus size.

14. **How does the tagging burden compare to estimate in practice?** The 15–20 minute per SIO estimate for a trained tagger should be validated against actual ingestion work. If it is significantly higher, the MVP corpus targets (20 SIOs per state) may be unrealistic without additional help. Revisit after the first 20 SIOs are tagged.

---

## 14. MVP Retrieval Recommendation

In plain language, this is what Silhouette should build for the first retrievable version:

**What to retrieve:**
A Structured Insight Object (SIO) — a human-selected, human-tagged excerpt from an approved source. 75–250 words of verbatim content. One key claim (1–2 sentences). Full attribution. Required metadata tags. Every SIO human-reviewed and approved before indexing. Source Objects (episode-level metadata) stored separately and referenced by SIOs via `source_id`.

**How to tag it:**
Every Source Object must carry: `source_type`, `show_or_platform`, `episode_or_content_title`, `episode_or_content_date`, `source_url`, `transcript_source`, `source_score`.
Every SIO must carry: `speaker`, `timestamp_range`, `transcript_excerpt`, `key_claim`, `attribution_text`, `primary_state_tag`, `insight_type`, `voice_register`, `credibility_tier`, `intensity_level`, `content_summary`, `tagger_confidence`, `human_review_status`. No SIO enters the index without all MVP-Required fields complete.

**How to match it:**
1. Apply confidence-adaptive state filter (hard gate at high confidence; 70/30 weighted retrieval across two states at moderate; clarifying question at low confidence)
2. Apply pool-size safety clause: if fewer than 5 SIOs pass the filter, expand to cross-state content before retrieval fails silently
3. Run semantic similarity search on `key_claim + transcript_excerpt` embeddings
4. Apply resonance filter or boost: known profile → filter by insight_type/voice_register; unknown → apply state default as a mild boost, not a hard filter
5. Apply credibility boost for `tier-1` speakers
6. Enforce speaker diversity (no same speaker as recent sessions)
7. Score top candidate against well-matched rubric
8. Return if ≥ 36/60; reject and enter fallback if below

**How to handle uncertainty:**
State confidence high → retrieve. Confidence moderate → retrieve across top two states and rerank. Confidence low → ask one clarifying question. No resonance profile → use state default. No strong match → acknowledge the gap, do not serve a weak result. Safety signal → bypass retrieval entirely.

**How to evaluate it:**
Before any user sees the product: run a 30-query labeled evaluation set. Human judges score each returned result on "would this land?" (1–5). Target ≥ 3.8 / 5.0. Verify 100% attribution completeness. Verify 100% safety gate accuracy. Verify state-match accuracy ≥ 90%. Do not ship until these thresholds are met.

**What not to overbuild yet:**
- No BM25 hybrid retrieval — the corpus is too small for keyword matching to add value
- No cross-encoder reranker — add in v2 once corpus exceeds 600 SIOs
- No profile storage system — stateless retrieval for MVP; session data only
- No multi-session personalization — one session at a time until retrieval quality is validated
- No automated tagging — human review for every SIO until tagging quality is proven
- No complex intake flow — one clarifying question maximum, backward-designed from this document
