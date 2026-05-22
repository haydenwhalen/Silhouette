# Silhouette — Component 6: Retrieval Engine

> **Summary:** This document defines how the Silhouette retrieval engine executes a retrieval decision — from receiving a structured RetrievalQuery to returning a single Structured Insight Object or a fallback response. Component 3 (Retrieval Philosophy) defines the conceptual matching strategy: state-filtered semantic retrieval with resonance reranking, the well-matched rubric, and the fallback hierarchy. Component 6 translates those concepts into a concrete execution flow, a scored candidate ranking model, and a prototype roadmap that a coding agent can implement against 10–30 SIOs without production infrastructure. This document is implementation-ready, not abstract. If Component 3 is the architecture blueprint, Component 6 is the construction drawing.

> **How to use this document:** Read after `retrieval_philosophy.md` (Component 3), `intake_diagnostic_flow.md` (Component 4), and `corpus_ingestion_pipeline.md` (Component 5). Component 3 defines what the engine should do and why. This document defines how it does it, step by step, with enough precision to build from. Start at Section 6 (MVP Retrieval Flow) if you are about to write code. Start at Section 15 (Local Prototype Roadmap) if you are about to build the first working version.

---

## 1. Purpose and Scope

### What the Retrieval Engine Is

The Retrieval Engine takes a structured RetrievalQuery from the intake layer and returns the best-matching Structured Insight Object from the corpus, or a defined fallback response if no acceptable match exists. It is the system responsible for:

- Applying the safety guard before any corpus access
- Routing retrieval based on state confidence level
- Generating a filtered candidate set from the corpus
- Ranking candidates by semantic similarity, resonance fit, quality signals, and diversity
- Applying a threshold check to decide whether a result is returnable
- Executing fallback logic when no acceptable match is found
- Logging every retrieval decision with enough detail to diagnose failures

### What the Retrieval Engine Is Not

- **Not the ingestion pipeline.** The corpus it queries was produced by Component 5. If a SIO is missing or malformed, that is an ingestion problem.
- **Not the intake system.** The RetrievalQuery it receives was produced by Component 4. If the state classification is wrong, that is an intake problem.
- **Not the presentation layer.** The engine returns a SIO and metadata. What the user sees is determined downstream by Component 7.
- **Not the final infrastructure decision.** The MVP prototype can run without a vector database. Technology choices (Pinecone, pgvector, Chroma, etc.) are deferred until retrieval quality is validated on a real corpus.
- **Not a personalization engine.** Cross-session profile-based retrieval is deferred to V2. The engine is stateless for MVP.

### Where This Component Sits

```
User Problem Model     →  defines state tags used for filtering
User Resonance Model   →  defines insight_type and voice_register used for scoring
Retrieval Philosophy   →  defines the matching philosophy this component executes
Intake / Diagnostic Flow →  produces the RetrievalQuery this component receives
Corpus / Ingestion Pipeline →  produces the indexed SIOs this component searches
         ↓
[Component 6: Retrieval Engine] ← you are here
         ↓
Insight Presentation Layer (C7)  →  receives the returned SIO and framing metadata
Feedback / Quality Loop (C9)     →  receives retrieval logs; identifies corpus gaps
```

---

## 2. Relationship to Existing Components

### User Problem Model (C1)

The state taxonomy from C1 is the controlled vocabulary for the hard state filter. The values `"direction-collapse"`, `"engagement-drought"`, `"inaction-loop"`, `"possibility-paralysis"`, `"identity-transition"`, and `"momentum-gap"` are the only valid values for `primary_state_tag` filtering. Any SIO not tagged with a valid state is excluded from retrieval. Any query that arrives without a valid `detected_state` (and is not explicitly set to broad mode) triggers fallback, not retrieval.

### User Resonance Model (C2 supporting layer)

The `insight_type` and `voice_register` tags on every SIO come from the User Resonance Model taxonomy. The retrieval engine uses these fields in the scoring model (Section 9) to boost SIOs that match the user's resonance hypothesis. It also uses `voice_register` for hard exclusion when `excluded_voice_registers` are present in the query.

### Content / Source Strategy (C2)

The `source_score` field on each Source Object (inherited by its SIOs) is used as a quality boost in the scoring model. Source quality judgments made during source evaluation (Component 2) flow through the corpus into retrieval scoring.

### Retrieval Philosophy (C3)

Component 3 defines the complete retrieval strategy that this document executes. Key C3 decisions that this component implements:

- State-filtered semantic retrieval as the primary matching approach
- Pool-size safety clause (fewer than 5 SIOs → expand to cross-state content)
- Resonance as a boost, not a hard filter at moderate confidence
- The 8-dimension well-matched rubric and /60 scoring thresholds (Section 8 of C3)
- Default resonance profiles per MVP state when no profile is known
- Speaker diversity enforcement (no same speaker in consecutive sessions)
- MMR for candidate set inspection (evaluation, not primary retrieval)
- The complete logging schema

**What this document adds to C3:** concrete execution logic, a proxy scoring formula with starting weights, the exact embedding input format, prototype-specific implementation guidance, and a phased prototype roadmap.

### Intake / Diagnostic Flow (C4)

The engine receives a `RetrievalQuery` produced by Component 4. The exact field contract is defined in Section 4 of this document. The intake system is responsible for state classification, confidence scoring, resonance capture, safety routing, and query construction. The retrieval engine does not re-run any of these processes — it trusts the query object it receives.

One exception: the engine validates that `human_review_status` of returned SIOs is "approved" and that `safety_flag` is processed before any corpus access. The engine should not assume the safety check was correctly applied by upstream systems.

### Corpus / Ingestion Pipeline (C5)

The engine queries the corpus that Component 5 produces. For an SIO to be retrievable:
- `human_review_status` must be `"approved"`
- All MVP-Required metadata fields must be populated
- An embedding must have been generated from the correct combined field
- The Source Object must exist and be linked via `source_id`

The engine does not validate corpus completeness — that is Component 5's responsibility. But the engine must handle gracefully any SIO that is missing a required field (by excluding it, not by crashing).

### Insight Presentation Layer (C7)

The retrieval engine returns to the presentation layer: the matched SIO (including `key_claim`, `transcript_excerpt`, `attribution_text`, `content_summary`, and `source_id`), the retrieval confidence level (`"strong"` or `"acceptable"`), and the retrieval log ID. The presentation layer uses these to frame the result for the user. The engine does not make presentation decisions.

### Feedback / Quality Loop (C9)

Retrieval logs are the primary input to the feedback loop. Every retrieval attempt must produce a log record (Section 13) so that the feedback loop can identify which states are consistently producing weak retrievals, which fallbacks are being triggered frequently, and which SIOs are consistently underperforming.

---

## 3. Design Principles

### 1. Execute the philosophy — do not reinvent it.
Component 3 is the authority on what the retrieval strategy should be. Component 6 implements that strategy. If something in C3 is wrong, change C3. Do not introduce retrieval behaviors in C6 that contradict or bypass C3's design without updating C3 first.

### 2. State fit gates retrieval; semantic similarity ranks within it.
Semantic embedding similarity cannot distinguish Direction Collapse from Engagement Drought. These states are semantically adjacent in embedding space — a query about feeling stuck will produce high cosine similarity to content from both states. The state filter is mandatory and runs before semantic search. Semantic similarity does its job only within an already-state-filtered set.

### 3. Safety bypass runs before corpus access — always.
If `safety_flag` is true or `scope_status` is `"out_of_scope"`, the engine exits before loading, filtering, or scoring any SIO. This is non-negotiable. No corpus access should occur for safety-flagged inputs.

### 4. A weak match must not be returned.
The engine must have an explicit rejection threshold. Returning something mediocre because returning nothing feels worse is a product trust failure. If no candidate exceeds the Acceptable threshold, the engine enters fallback — it does not degrade silently to a Weak match.

### 5. Resonance boosts; it does not (usually) hard-filter at MVP.
For first-session users with inferred resonance hypotheses, resonance is a scoring boost, not a hard exclusion. A strong state-appropriate SIO with a slightly mismatched insight type is better than a weaker SIO with a perfectly matched type. The exception is `excluded_voice_registers` — these are applied as hard gates when present, because they represent safety-related or tone-sensitive exclusions.

### 6. The prototype should be debuggable.
Every retrieval decision must produce a human-readable log entry: which state was filtered for, how many candidates were in the pool, what the top scores were, and why the returned SIO was selected. If a result looks wrong, a developer should be able to trace the decision in under 5 minutes.

### 7. Corpus gaps must be visible through retrieval.
When the pool-size safety clause triggers, when no-match fallbacks occur, and when retrieval consistently underperforms for a specific state — these should all appear in logs. The retrieval engine is the system that makes corpus gaps observable. Surfacing gaps is part of its job.

### 8. Avoid premature infrastructure.
For a corpus of 10–100 SIOs, all candidate scoring can be done in memory without a vector database. Building on Pinecone or Weaviate before the prototype proves retrieval quality is premature. The infrastructure should follow the validation, not precede it.

### 9. Tune weights from evaluation data — not intuition.
The starting scoring weights in Section 9 are reasonable initial values, not proven optima. They must be calibrated against the first labeled evaluation set (Section 14). Do not treat them as correct until calibrated.

### 10. Local JSON is a legitimate prototype corpus.
For the initial prototype, SIOs can be stored as JSON files and loaded into memory at startup. This is not a technical limitation — it is an appropriate choice for a corpus of under 100 SIOs. Do not add a database before the retrieval logic is proven.

---

## 4. Input Contract: RetrievalQuery

The engine receives a `RetrievalQuery` produced by Component 4's intake system. Fields are split into categories by how the engine uses them.

### A. Required MVP Retrieval Fields

These fields must be present for any retrieval attempt. Missing or null values have defined behavior.

| Field | Type | Source | How Engine Uses It | If Missing |
|---|---|---|---|---|
| `safety_flag` | Boolean | C4 intake | If `true`: exit immediately, return safety bypass | Treat as `false` with warning in log |
| `scope_status` | `"in_scope"` / `"out_of_scope"` / `"borderline"` | C4 intake | If not `"in_scope"`: exit without retrieval | Treat as `"in_scope"` with warning |
| `retrieval_mode` | `"standard"` / `"broad"` / `"safety_bypass"` / `"no_retrieval"` | C4 intake | Gates which retrieval path to execute | Default to `"no_retrieval"`, log |
| `detected_state` | State tag or null | C4 classification | Primary state filter; null requires low-confidence handling | Enter fallback if null + mode is standard |
| `state_confidence` | `"high"` / `"moderate"` / `"low"` | C4 classification | Determines filtering behavior (hard / weighted / broad) | Default to `"low"` |
| `secondary_possible_states` | Array of state tags | C4 classification | Used in moderate-confidence 70/30 candidate generation | Default to empty array |
| `user_text` | String | User input | Embedded for semantic matching (fallback if no clarified text) | Cannot proceed without this |
| `excluded_sio_ids` | Array of SIO IDs | Session context | Hard exclusion — these IDs are never returned | Default to empty array |

### B. Optional MVP Retrieval Fields

These fields affect scoring and filtering but do not gate the retrieval flow.

| Field | Type | Source | How Engine Uses It | If Missing or Null |
|---|---|---|---|---|
| `clarified_user_text` | String or null | C4 (post-clarification) | Replaces `user_text` as semantic anchor when present | Fall back to `user_text` |
| `variant_signal` | `"post-achievement"` / `"original"` / null | C4 classification | Soft preference signal for Direction Collapse sub-state | Ignored; no sub-state filtering |
| `resonance_hypothesis_insight_type` | Type tag or null | C4 resonance capture | Scoring boost for matching SIOs | Apply state default from C3 Section 7.5 |
| `resonance_hypothesis_voice_register` | Register tag or null | C4 resonance capture | Scoring boost for matching SIOs | Apply state default from C3 Section 7.5 |
| `resonance_source` | Source tag | C4 resonance capture | Controls how hard to apply resonance boost (see Section 10) | Treat as `"default"` |
| `excluded_voice_registers` | Array of register tags | C4 resonance + safety | Hard exclusion — SIOs with this register are never returned | Default to empty array |
| `intensity_preference` | `"mild"` / `"moderate"` / `"intense"` / null | C4 context signals | Intensity mismatch check before scoring | Default to `"moderate"` |
| `session_context` | String or null | C4 session state | Logged; not currently used by scoring in MVP | Ignored in MVP |

### C. Logging-Only Fields

These fields are passed through for logging but are not used in retrieval logic.

| Field | Logged For |
|---|---|
| `classification_reason` | Debugging state classification errors |
| `clarification_used` | Evaluating whether clarifying questions improve retrieval |
| `clarifying_question` | Evaluating question quality |
| `clarifying_answer` | Evaluating answer usability |
| `resonance_confidence` | Evaluating resonance hypothesis accuracy |
| `safety_tier_triggered` | Safety audit |

### D. Future Personalization Fields (Not MVP)

These fields arrive as null for MVP. The engine must handle null gracefully without crashing.

| Field | Future Use |
|---|---|
| `returning_user_profile` | Cross-session personalization |
| `preferred_insight_type` (confirmed) | Learned resonance preference (≥2 positive signals) |
| `preferred_voice_register` (confirmed) | Learned resonance preference |
| `seen_sio_ids` | Cross-session deduplication |

---

## 5. Corpus Contract: SIO Requirements

For an SIO to participate in retrieval, the following fields must be present and valid.

### A. Hard Gates — SIOs Excluded if Any Field Fails

| Field | Required Value | What Happens if Invalid |
|---|---|---|
| `human_review_status` | Must be `"approved"` | Excluded from candidate pool entirely |
| `insight_id` | Must be a non-empty UUID | Excluded — cannot be tracked or deduplicated |
| `source_id` | Must reference a valid Source Object | Excluded — attribution incomplete without source |
| `primary_state_tag` | Must be a valid state tag from C1 taxonomy | Excluded — cannot be state-filtered |
| `attribution_text` | Must be non-empty and follow format | Excluded — attribution is non-negotiable |
| `transcript_excerpt` | Must be non-empty | Excluded — no content to return |
| `key_claim` | Must be non-empty | Excluded — no embedding anchor |

### B. Required for MVP Retrieval (but handled gracefully if missing)

| Field | How Used | If Missing |
|---|---|---|
| `insight_type` | Resonance scoring boost | No boost applied; SIO remains in pool |
| `voice_register` | Resonance scoring boost + exclusion check | No boost; exclusion check skipped |
| `credibility_tier` | Credibility boost in scoring | No boost applied |
| `intensity_level` | Intensity mismatch check | Mismatch check skipped; no penalty |
| `tagger_confidence` | Quality gate and scoring | Treat as `"medium"` |
| `content_summary` | Combined embedding field | Use `key_claim + transcript_excerpt` only |
| `speaker` | Speaker diversity check | Diversity check skipped for this SIO |

### C. Source Object Fields (from parent Source Object)

The engine retrieves these from the Source Object linked by `source_id` when presenting the result.

| Field | Used For |
|---|---|
| `source_score` | Scoring boost |
| `show_or_platform` | Presentation attribution |
| `episode_or_content_title` | Presentation attribution |
| `episode_or_content_date` | Presentation attribution |
| `source_url` | Presentation (link to original) |

### D. Embedding Requirement

Every approved SIO must have a precomputed embedding generated from:

```
embedding_input = f"{sio.key_claim}. {sio.content_summary}. {sio.transcript_excerpt}"
```

The dot-space separator between fields is the standard format. This combined field is embedded as a single string. The `key_claim` appears first because it is the primary semantic anchor — it should have the highest weight in what the embedding captures.

If an SIO lacks a precomputed embedding, the engine computes it at retrieval time (acceptable for a prototype; must be precomputed at scale).

---

## 6. MVP Retrieval Flow

The full retrieval flow, step by step. Each step defines its purpose, inputs, decision rule, output, failure mode, and prototype implementation note.

---

### Step 1 — Safety Guard

**Purpose:** Prevent corpus access for any safety-flagged or out-of-scope input.

**Decision rule:**
- If `query.safety_flag == true` → return `safety_bypass_response` immediately (no corpus access)
- If `query.scope_status == "out_of_scope"` → return `scope_redirect_response` immediately
- Otherwise → proceed to Step 2

**Output:** Either an immediate exit response, or clearance to continue.

**Failure mode:** Safety guard is skipped or checked after corpus access. This must never happen.

**Prototype note:** This is a simple conditional. It must be the first line of the retrieval function, before any corpus loading or filtering.

---

### Step 2 — Retrieval Mode Gate

**Purpose:** Determine whether retrieval should proceed, and in which mode.

**Decision rule:**
- `retrieval_mode == "no_retrieval"` → return `expansion_prompt_response` (user input was too sparse; intake is waiting for more)
- `retrieval_mode == "safety_bypass"` → should have been caught in Step 1; return safety bypass
- `retrieval_mode == "standard"` or `"broad"` → proceed to Step 3

**Output:** Confirmation to proceed with retrieval; the mode (`"standard"` or `"broad"`) is carried forward.

**Prototype note:** Check the mode enum value. Default to `"no_retrieval"` if mode is null or unrecognized.

---

### Step 3 — Select Semantic Input Text

**Purpose:** Choose the best available text to embed for semantic matching.

**Decision rule:**
- If `query.clarified_user_text` is non-null → use `clarified_user_text` as the semantic input
- Otherwise → use `query.user_text`

**Why:** The clarified text includes the original input plus the clarifying answer. It is a richer semantic representation and should always be preferred when available.

**Output:** A single string `query_text` used for embedding in Step 7.

---

### Step 4 — Load and Pre-Filter Corpus

**Purpose:** Produce the initial candidate pool by applying hard gates that exclude any SIO that should never appear in results.

**Hard exclusion rules (applied before state filtering):**

1. `human_review_status != "approved"` → exclude
2. `insight_id` in `query.excluded_sio_ids` → exclude
3. `voice_register` in `query.excluded_voice_registers` (if non-empty) → exclude
4. Any required attribution field missing (`attribution_text`, `source_id`, `speaker`) → exclude
5. `tagger_confidence == "low"` → exclude for MVP (too risky to return to users)

**Output:** `approved_pool` — all SIOs that pass every hard gate.

**Failure mode:** `approved_pool` is empty (corpus has no approved SIOs). Log as a critical corpus gap.

**Prototype note:** In a local prototype, this is a filter pass over a list of SIO objects loaded from JSON. In production, this is a vector database query with metadata filters.

---

### Step 5 — Apply State Routing

**Purpose:** Filter or weight the candidate pool by detected state, adapting behavior to confidence level.

**Decision rules by confidence level:**

**High confidence:**
```
state_filtered = approved_pool where primary_state_tag == query.detected_state
```
This is a hard filter. No cross-state content enters at high confidence unless the pool-size safety clause triggers (Step 6).

**Moderate confidence:**
```
primary_candidates = approved_pool where primary_state_tag == query.detected_state
secondary_candidates = approved_pool where primary_state_tag in query.secondary_possible_states
                                       OR secondary_state_tags contains query.detected_state

# Mark origin for scoring:
mark primary_candidates with state_match_type = "primary"  (no penalty)
mark secondary_candidates with state_match_type = "secondary" (-0.05 score penalty at Step 8)

state_filtered = primary_candidates + secondary_candidates
```
Both state pools enter the candidate set. Scoring applies a small penalty to secondary-state candidates.

**Low confidence (broad mode only):**
```
state_filtered = approved_pool  # all states; no filtering
```
This path is only reached when intake has set `retrieval_mode = "broad"` after a failed clarification attempt. Log that broad mode was triggered.

**Low confidence (standard mode):**
This case should have been caught by Step 2 (`retrieval_mode = "no_retrieval"`). If it reaches Step 5, treat as `"no_retrieval"` and return the expansion prompt.

**Output:** `state_filtered` — a candidate pool filtered (or weighted) by state.

---

### Step 6 — Pool-Size Safety Clause

**Purpose:** Prevent retrieval failure when the state-filtered pool is too small to produce a meaningful semantic search.

**Decision rule:**
- Count `len(state_filtered)`
- If count < 5:
  - Expand `state_filtered` to include SIOs from `approved_pool` where `secondary_state_tags` contains `query.detected_state`
  - Log: `"pool_size_safety_clause_triggered"`, include state and pre-expansion count
  - If expanded count is still < 3: log `"corpus_gap_critical"` and return `no_match_corpus_gap_response`

**Why the threshold is 5:** Below 5 approved SIOs in a filtered pool, the semantic search has no meaningful range to operate across. A pool of 2–3 SIOs will return one of them regardless of semantic quality. The pool-size clause ensures a minimum meaningful candidate set.

**Prototype note:** This should be explicitly tested in the prototype evaluation — use a small corpus and confirm the clause triggers correctly.

---

### Step 7 — Semantic Similarity

**Purpose:** Rank candidates in the state-filtered pool by semantic relevance to the user's input.

**Process:**
1. Embed `query_text` using the selected embedding model
2. For each SIO in `state_filtered`: compute cosine similarity between `query_embedding` and `sio.embedding`
3. Sort `state_filtered` by cosine similarity, descending
4. Take top N candidates: N = 10 for MVP (adjust down to 5 if corpus is very small)

**Embedding format:** The query text and each SIO embedding must use the same embedding model. The SIO embedding was generated at ingestion time from: `f"{key_claim}. {content_summary}. {transcript_excerpt}"`. The query embedding is generated from `query_text` at retrieval time.

**Output:** `top_candidates` — the top-N SIOs by cosine similarity, carrying their similarity scores.

**Prototype note:** For a corpus of ≤100 SIOs, compute cosine similarity across all state-filtered SIOs in memory. Use `numpy` or any linear algebra library. No vector database needed. Expected runtime: <100ms for 100 SIOs.

---

### Step 8 — Intensity Mismatch Check

**Purpose:** Apply the intensity hard gate before scoring — prevent returning an inappropriately intense insight to a fragile user.

**Decision rule:**
- If `query.intensity_preference` is null or `"moderate"`: no exclusion
- If `query.intensity_preference == "mild"`: exclude any `top_candidates` where `intensity_level == "intense"`
- If user input signals fragility (inferred from intake): exclude `direct/challenging` register (should already be in `excluded_voice_registers`, but check again)

**Output:** `intensity_checked_candidates` — top candidates with intensity mismatches removed.

**Empty-pool contingency:** If `intensity_checked_candidates` is empty after applying the intensity gate, do not proceed to Step 9 with an empty list. Instead: log `fallback_reason: "intensity_mismatch_all"`, set `corpus_gap_signal: true`, and return a no-match response immediately. This is a corpus gap — the state has approved content, but none of it is appropriate for this user's intensity level. The log signals that more mild-intensity SIOs are needed for this state.

**Failure mode:** An intense SIO is returned to a user who is fragile. The intensity gate prevents this. It is a hard gate, not a soft penalty.

---

### Step 9 — Score and Rank

**Purpose:** Apply the full scoring model to produce a ranked candidate set.

**Scoring formula:**

```
final_score = semantic_similarity_score + sum(boosts) - sum(penalties)
```

**Boosts (additive):**

| Condition | Boost | Notes |
|---|---|---|
| `insight_type` matches `resonance_hypothesis_insight_type` AND `resonance_source` is `"explicit"` or `"learned"` | +0.10 | Strong resonance signal |
| `insight_type` matches AND `resonance_source` is `"inferred"` or `"default"` | +0.05 | Weak resonance boost |
| `voice_register` matches `resonance_hypothesis_voice_register` AND `resonance_source` is `"explicit"` or `"learned"` | +0.08 | Strong resonance signal |
| `voice_register` matches AND `resonance_source` is `"inferred"` or `"default"` | +0.04 | Weak resonance boost |
| `credibility_tier == "tier-1"` | +0.05 | Lived experience premium |
| `credibility_tier == "tier-2"` | +0.02 | Domain expertise |
| `source_score >= 70` | +0.03 | High-quality approved source |
| `source_score >= 50` (and < 70) | +0.01 | Acceptable source |
| `tagger_confidence == "high"` | +0.02 | High ingestion quality |

**Penalties (subtractive):**

| Condition | Penalty | Notes |
|---|---|---|
| `state_match_type == "secondary"` (moderate confidence only) | -0.05 | Cross-state candidate |
| `speaker` was returned in most recent session (if session tracking active) | -0.10 | Speaker diversity |
| `tagger_confidence == "medium"` | -0.03 | Below-optimal ingestion quality |

**Hard gates (already applied in Steps 4, 6, 8 — not penalties):**
- `tagger_confidence == "low"` → excluded before scoring (Step 4)
- Intensity mismatch → excluded before scoring (Step 8)
- Excluded voice register → excluded before scoring (Step 4)
- Missing attribution → excluded before scoring (Step 4)

**Total boost cap:** All additive boosts combined must not exceed +0.20. If the sum of applicable boosts exceeds +0.20, apply +0.20 flat. This is a hard rule, not a guideline.

**Why a cap is necessary:** Without a cap, a SIO with semantic similarity of 0.50 (below Acceptable threshold) can accumulate enough metadata boosts (+0.10 insight_type + 0.08 voice_register + 0.05 credibility + 0.03 source + 0.02 tagger = +0.28) to score 0.78, which is above the Strong threshold. Metadata should *refine* the rank among semantically strong candidates — it should not *rescue* semantically weak ones. A SIO that the embedding model doesn't consider semantically relevant should never be returned as a Strong match, regardless of metadata quality. If the cap feels too restrictive after calibration, raise it — but start from a position that protects semantic signal.

**Score range:** Base semantic similarity is 0.0–1.0. Maximum possible score with cap: 1.20. Do not normalize — keep the absolute values for debugging transparency.

**Output:** `ranked_candidates` — top candidates sorted by `final_score` descending.

**Important:** These weights are tunable starting values, not proven optima. They should be calibrated against the first evaluation set (Section 14). Treat them as initial configuration parameters, not hard-coded constants. Externalize them in a config object so they can be adjusted without code changes.

---

### Step 10 — Diversity Check

**Purpose:** Ensure the top-ranked candidate is not a speaker or SIO the user has recently seen.

**Decision rule:**
- Check `insight_id` of `ranked_candidates[0]` against `query.excluded_sio_ids` (already excluded in Step 4 — this is a belt-and-suspenders check)
- Check `speaker` of `ranked_candidates[0]` against recent speakers (if session context is available): if the speaker was just returned in the immediately preceding session, and `ranked_candidates[1]` has a `final_score` within 0.05 of `ranked_candidates[0]`, use `ranked_candidates[1]` instead

**Why within 0.05:** Only swap to the next candidate for diversity reasons if the quality cost is minimal. A significant score difference means the top candidate is meaningfully better and should not be sacrificed for diversity alone.

**Output:** `selected_candidate` — the SIO that will go to the threshold check.

---

### Step 11 — Threshold Check and Return

**Purpose:** Decide whether the selected candidate meets the returnable quality threshold.

**Decision rules:**

| `selected_candidate.final_score` | Label | Action |
|---|---|---|
| ≥ 0.75 | **Strong** | Return SIO with `confidence = "strong"` |
| 0.55 – 0.74 | **Acceptable** | Return SIO with `confidence = "acceptable"` |
| < 0.55 | **Below threshold** | Do not return; enter fallback (Step 12) |

**Important calibration note:** The 0.75 and 0.55 thresholds are initial values derived from reasoning about semantic similarity distributions. They are not validated. After running the first 20 evaluation queries and having human judges rate results, plot the distribution of `final_score` against human ratings (1–5 scale). Find the score boundary where human ratings go from ≥3.5 to <3.5 — set the Acceptable threshold at that boundary. Set the Strong threshold approximately 0.15 above it. Do this calibration before considering the thresholds stable.

**Output:** `RetrievalResult` with: `sio` (the selected SIO), `confidence` ("strong" or "acceptable"), `retrieval_log_id`.

---

### Step 12 — Fallback Execution

**Purpose:** Handle gracefully all cases where no acceptable match was found.

See Section 12 (Fallback and No-Match Behavior) for the full fallback specification.

---

### Step 13 — Log Retrieval Decision

**Purpose:** Produce a structured log record for every retrieval attempt.

See Section 13 (Logging and Observability) for the full logging schema.

The log must be written regardless of whether retrieval succeeded or fell back.

---

## 7. Candidate Generation Strategy

This section elaborates on Steps 4–6 for implementation clarity.

### Hard Filters vs. Soft Filters

**Hard filters (Steps 4, 6, 8):** Applied before scoring. An SIO that fails a hard filter is entirely excluded — it receives no score and cannot be returned regardless of semantic quality. Hard filters:
- `human_review_status != "approved"`
- Missing required attribution fields
- SIO ID in `excluded_sio_ids`
- Voice register in `excluded_voice_registers`
- `tagger_confidence == "low"`
- Intensity mismatch (when fragility is signaled)

**Soft filters (Step 9):** Applied as scoring penalties. An SIO that triggers a soft filter can still be returned if it is the best available candidate. Soft filters:
- Secondary-state match (–0.05)
- Recent speaker repeat (–0.10)
- Medium tagger confidence (–0.03)

### When to Broaden Candidate Generation

The engine should broaden candidate generation in these specific situations:

| Situation | Broadening Action | What to Log |
|---|---|---|
| State-filtered pool has < 5 SIOs | Expand to include `secondary_state_tags` overlapping detected state | `"pool_size_safety_clause"` |
| No candidates remain after hard exclusions | Log corpus gap; return no-match | `"corpus_gap_post_exclusion"` |
| Top scored candidate < 0.55 and ≥3 candidates remain | Do not broaden — enter fallback instead. Do not lower the threshold to avoid returning nothing. | `"below_threshold_fallback"` |
| `retrieval_mode == "broad"` (low confidence, explicit) | Search all states; do not restrict by detected_state | `"broad_mode_retrieval"` |

**What NOT to do:** Do not progressively lower the threshold to avoid a no-match. A no-match with a logged gap is more valuable than a weak match served to the user.

### Minimum Candidate Count for Meaningful Semantic Search

The semantic search in Step 7 needs enough candidates to produce a meaningful ranking. Operating minimums:
- **Ideal:** 15–30 state-filtered SIOs (enough to differentiate on semantic similarity)
- **Acceptable:** 5–14 SIOs (limited but workable)
- **Below minimum:** < 5 SIOs (pool-size safety clause triggers)

This is why Component 5's MVP corpus target (20 SIOs per state) is the right floor, not a nice-to-have.

---

## 8. Semantic Matching Strategy

### What to Embed

**Query embedding input:** The best available user text:
```
query_text = clarified_user_text if present else user_text
```

**SIO embedding input (generated at ingestion, stored on SIO):**
```
sio_embedding_input = f"{key_claim}. {content_summary}. {transcript_excerpt}"
```

The `key_claim` leads because it is the most semantically precise element — the 1–2 sentence distillation of the insight that the tagger judged most retrievable. The `content_summary` provides framing context. The `transcript_excerpt` provides the full verbatim content that gives the embedding its specificity.

**Why not embed fields separately:** Separate embeddings for `key_claim` vs. `transcript_excerpt` would allow weighted combination at retrieval time. This is more flexible but adds engineering complexity without a proven benefit at MVP corpus sizes. Revisit when the corpus exceeds 500 SIOs and semantic precision problems are documented.

### Query-Document Language Asymmetry (Highest Technical Risk)

Silhouette has a structural mismatch between query language and SIO language. User queries are emotional and vague: "I feel like I'm just going through the motions," "I got what I wanted but feel empty." SIO embeddings are prescriptive and analytical: key claims like "The reason high achievers stall after a milestone is that achievement and meaning are separate systems." Standard bi-encoder embedding models trained on symmetric retrieval tasks — where queries and documents use similar vocabulary — perform worse on this kind of emotional→analytical gap. This is the most likely failure mode in Phase 4 evaluation, and it has nothing to do with scoring weights or state filtering.

**Three mitigations — test all three in Phase 4:**

**Option A — Query framing prefix (lowest effort, try first):**
Before embedding, prepend a task-framing sentence to the query:
```
query_text = f"A young professional describes their situation: {user_text}"
```
This shifts the query embedding toward the semantic neighborhood of the corpus content without changing the embedding model. Cost: one string concatenation. Test whether this prefix improves cosine similarity scores on the calibration set before trying more complex approaches.

**Option B — HyDE (Hypothetical Document Embeddings):**
Use an LLM (GPT-4o or Claude Haiku) to generate a hypothetical ideal SIO that would match the user's query — then embed the hypothetical SIO instead of the raw query. The hypothetical document is in the same language register as real SIOs, closing the asymmetry gap.
```
hypothetical_sio_text = llm_call(
    prompt=f"Write a 2-sentence insight that would help someone who says: '{user_text}'. Write it as a general observation from a credible person, not as advice."
)
query_embedding = embed(hypothetical_sio_text)
```
This adds an LLM call to every retrieval (latency + cost), but meaningfully improves retrieval precision for vague queries. Test against Option A in Phase 4 evaluation.

**Option C — Instruction-tuned embedding model:**
Models like `e5-base-v2` (`intfloat/e5-base-v2`) and `INSTRUCTOR` accept task prefix instructions natively. Instead of `all-MiniLM-L6-v2`, embed queries with:
```
query_embedding = embed("Represent the emotional situation for retrieval: " + user_text)
sio_embedding = embed("Represent the personal development insight: " + sio_text)
```
This is a model-level solution rather than a preprocessing solution. Test if task-prefixed embedding significantly outperforms the Option A framing prefix — if the delta is small, keep `all-MiniLM-L6-v2` and use Option A.

**Prototype recommendation:** Start with Option A (query framing prefix) as the default. It adds no latency or cost. Test Option B (HyDE) on the 5 most ambiguous calibration queries and compare results. If HyDE meaningfully improves precision, add it as a conditional path for low-confidence or very vague queries.

### Recommended Models for the Prototype

| Model | Provider | Quality | Speed | Cost | Notes |
|---|---|---|---|---|---|
| `all-MiniLM-L6-v2` | HuggingFace / sentence-transformers | Good | Fast (CPU usable) | Free | Best choice for prototype — runs locally |
| `all-mpnet-base-v2` | HuggingFace / sentence-transformers | Better | Moderate (CPU slow) | Free | Better quality; acceptable for small corpus |
| `text-embedding-3-small` | OpenAI API | Very good | Fast (API call) | ~$0.02 per 1M tokens | Good for prototype if OK with API dependency |
| `text-embedding-3-large` | OpenAI API | Best available | Fast (API call) | ~$0.13 per 1M tokens | Overkill for ≤100 SIOs |

**Prototype recommendation:** Start with `all-MiniLM-L6-v2` via `sentence-transformers`. It runs locally, requires no API key, and is adequate for the semantic similarity task. Switch to `text-embedding-3-small` if local model quality is insufficient, or if OpenAI is already in the stack.

**Do not choose the final production embedding model until retrieval quality is validated.** The prototype should make it easy to swap the embedding model.

### Top-N Retrieval Before Scoring

Retrieve the top N candidates by semantic similarity before scoring. N values:

| Corpus size | N |
|---|---|
| ≤ 30 SIOs | All state-filtered SIOs (skip top-N, score all) |
| 30–100 SIOs | Top 10 |
| 100–500 SIOs | Top 15 |
| > 500 SIOs | Top 20 |

For a corpus of 10–30 SIOs (prototype phase), score all state-filtered candidates. The overhead of computing cosine similarity for 10–30 items is negligible.

### Hybrid Search (BM25 + Semantic)

Hybrid keyword + semantic retrieval improves precision when users include specific terms that appear in the corpus content. For Silhouette's MVP, BM25 adds minimal value because:
- User queries are emotional descriptions without specific content keywords
- The corpus is small enough that vector similarity has adequate signal
- BM25 requires additional indexing infrastructure

Revisit when: (a) the corpus exceeds 500 SIOs and semantic search precision starts to degrade, or (b) evaluation data shows a systematic failure mode where users mention specific names or concepts that match corpus content but semantic similarity misses them.

---

## 9. Scoring and Ranking Model

### The Proxy Score and the /60 Rubric

Component 3 defines an 8-dimension, 60-point rubric for "well-matched" used by human evaluators. The retrieval engine cannot compute the full rubric at query time — some dimensions (like "specificity of experience" and "standalone clarity") are judgments made at ingestion, not at retrieval. The proxy scoring model implemented here approximates the rubric using fields that can be computed automatically at retrieval time.

**Rubric dimension → proxy mapping:**

| Rubric Dimension (C3) | Proxy at Retrieval Time |
|---|---|
| State semantic relevance (3×) | State filter pass + semantic similarity score (primary driver) |
| Resonance match (2×) | insight_type + voice_register boost |
| Specificity of experience (2×) | tagger_confidence (high = more specific insight) |
| Source credibility (1×) | credibility_tier boost |
| Attribution quality (1×) | attribution_text completeness gate |
| Tone appropriateness (1×) | intensity_level mismatch gate |
| Non-redundancy (1×) | excluded_sio_ids gate + speaker diversity penalty |
| Standalone clarity (1×) | Checked at ingestion (approved status implies pass) |

### Full Scoring Table

| Dimension | Type | Value | When Applied |
|---|---|---|---|
| Semantic similarity | Base score | 0.0–1.0 | Always (after state filter) |
| insight_type match (strong resonance) | Boost | +0.10 | resonance_source = explicit/learned |
| insight_type match (weak resonance) | Boost | +0.05 | resonance_source = inferred/default |
| voice_register match (strong resonance) | Boost | +0.08 | resonance_source = explicit/learned |
| voice_register match (weak resonance) | Boost | +0.04 | resonance_source = inferred/default |
| credibility_tier = "tier-1" | Boost | +0.05 | Always |
| credibility_tier = "tier-2" | Boost | +0.02 | Always |
| source_score ≥ 70 | Boost | +0.03 | Always |
| source_score 50–69 | Boost | +0.01 | Always |
| tagger_confidence = "high" | Boost | +0.02 | Always |
| State match = secondary | Penalty | -0.05 | Moderate confidence only |
| Speaker repeated recently | Penalty | -0.10 | When session tracking active |
| tagger_confidence = "medium" | Penalty | -0.03 | Always |
| Intensity mismatch | Hard gate | Excluded | Before scoring |
| tagger_confidence = "low" | Hard gate | Excluded | Before scoring |
| Missing attribution | Hard gate | Excluded | Before scoring |
| In excluded_sio_ids | Hard gate | Excluded | Before scoring |
| In excluded_voice_registers | Hard gate | Excluded | Before scoring |

### Score Thresholds (Initial — Requires Calibration)

| Score | Label | Action |
|---|---|---|
| ≥ 0.75 | **Strong Match** | Return with `confidence = "strong"` |
| 0.55–0.74 | **Acceptable Match** | Return with `confidence = "acceptable"` |
| < 0.55 | **Below Threshold** | Fallback |

**Calibration process (required before treating thresholds as stable):**
1. Run 20–30 evaluation queries against the prototype corpus
2. Have human judges rate each returned result 1–5 ("would this land?")
3. Map proxy `final_score` to human rating for each query
4. Find the boundary: at what `final_score` does average human rating fall below 3.5?
5. Set Acceptable threshold at that boundary. Set Strong threshold at Acceptable + 0.15.
6. If variance is high (same score yields ratings of both 2 and 5), re-examine whether the base semantic similarity model is the problem.

---

## 10. Resonance Handling

### The First-Session Problem

For most MVP users, there is no confirmed resonance profile. Resonance signals from intake are hypotheses inferred from language register — weak signals, not confirmed preferences. The engine must not treat first-session resonance as authoritative.

**The resonance hierarchy (from C4):**

```
1. Explicit safety exclusion (hard gate — always enforced)
2. User explicitly stated preference in intake (override defaults)
3. Learned profile preference (V2 — from ≥2 consistent positive signals)
4. Inferred hypothesis from first-session language (weak boost)
5. State-default resonance profile (baseline)
```

Most first-session users operate at Level 4 or 5. The `resonance_source` field tells the engine which level to apply.

### Resonance by Source Type

| `resonance_source` | What it means | How to apply |
|---|---|---|
| `"explicit"` | User directly stated a preference | Apply as strong boost (+0.10 / +0.08) |
| `"learned"` | Confirmed from ≥2 positive engagement signals (V2) | Apply as strong boost (V2 only) |
| `"inferred"` | Inferred from intake language register | Apply as weak boost (+0.05 / +0.04) |
| `"default"` | State-default resonance applied; no signal available | Apply as weak boost (+0.05 / +0.04) using state default values |
| `"excluded"` | A register has been identified as harmful or excluded | Apply as hard gate for `excluded_voice_registers` |

### State Default Resonance Profiles

When `resonance_source = "default"`, use these profiles (from C3 Section 7.5):

| State | Default insight_type | Default voice_register |
|---|---|---|
| Direction Collapse | `reframe` | `intellectual/measured` |
| Engagement Drought | `mechanism` | `expert/scientific` |
| Inaction Loop | `story` | `direct/challenging` |
| Possibility Paralysis | `reframe` | `intellectual/measured` |
| Identity Transition | `permission` | `warm/affirming` |
| Momentum Gap | `reframe` | `direct/challenging` |

These are testable hypotheses. Treat them as initial configuration values. If evaluation data shows consistent low ratings for a state's default profile, revise the default.

### What Resonance Should Not Do

- **Never block retrieval entirely.** If no SIO matches the resonance hypothesis, return the best state-appropriate SIO regardless. A strong state match with mismatched resonance is better than a no-match response.
- **Never override state filtering.** A resonance-perfect SIO in the wrong state is not a valid result.
- **Never hard-filter on inferred resonance.** Only `"explicit"` or `"excluded"` resonance sources justify hard filtering. Inferred and default resonance only boost.

---

## 11. State Confidence Routing

### High Confidence Routing

**Condition:** `state_confidence = "high"` AND `detected_state` is valid

**Behavior:** Hard state filter on `primary_state_tag == detected_state`. Secondary states ignored unless pool-size safety clause triggers.

**When pool-size clause triggers:** Expand to include SIOs where `secondary_state_tags` contains `detected_state`. Mark as pool expansion in log. Do not change `state_confidence` — it was high; the corpus is just thin.

---

### Moderate Confidence Routing

**Condition:** `state_confidence = "moderate"` AND `detected_state` + `secondary_possible_states` are valid

**Behavior:** Generate candidates from both primary and secondary states. Mark secondary candidates with a -0.05 penalty in scoring (Section 9). Let scoring determine which state's content ranks highest — do not pre-weight the 70/30 ratio at the filtering stage. The 70/30 emerges naturally from the combination of state filter (hard for primary) and penalty (soft for secondary).

**Key difference from C3:** C3 describes the 70/30 ratio as a retrieval weighting. In practice, this is best implemented as a candidate pool merge with a scoring penalty on secondary-state candidates, which produces approximately 70/30 behavior without requiring explicit ratio logic.

---

### Low Confidence Routing

**Condition:** `state_confidence = "low"` OR `detected_state = null`

**Standard mode behavior:** This case should have been caught by intake — `retrieval_mode` should be `"no_retrieval"`. If it reaches the engine with `retrieval_mode = "standard"`, return `expansion_prompt_response` and log as a routing error.

**Broad mode behavior (when intake explicitly sets this after failed clarification):**
- Search all states: `state_filtered = approved_pool`
- Do not apply any state penalty to any candidate (no state to penalize relative to)
- Log: `"broad_mode_low_confidence"`
- Apply stricter threshold: Strong Match only (≥ 0.78 to account for the reduced state discrimination). Do not return an Acceptable Match in broad mode — the state uncertainty is too high.

---

### Safety and Scope Routing

**Safety flag (`safety_flag = true`):** Exit immediately in Step 1. No corpus access.

**Out of scope (`scope_status = "out_of_scope"`):** Exit in Step 1. No corpus access.

**Borderline (`scope_status = "borderline"`):** The engine treats this as in-scope but applies `intensity_preference = "mild"` regardless of what intake specified. This is the conservative behavior: serve if possible, but with the gentlest available content.

---

## 12. Fallback and No-Match Behavior

When the engine cannot return a result that meets the Acceptable threshold, it enters the fallback hierarchy defined in C3 Section 7. This section translates that hierarchy into concrete engine behavior.

### Fallback Cases and Engine Behavior

| Case | Engine Behavior | Log Signal |
|---|---|---|
| `safety_flag = true` | Exit Step 1. Return safety bypass response. | `fallback_reason: "safety_bypass"` |
| `scope_status = "out_of_scope"` | Exit Step 1. Return scope redirect. | `fallback_reason: "out_of_scope"` |
| `retrieval_mode = "no_retrieval"` | Exit Step 2. Return expansion prompt. | `fallback_reason: "no_retrieval_mode"` |
| `detected_state = null` + standard mode | Exit Step 5. Return expansion prompt. | `fallback_reason: "no_state_detected"` |
| Approved pool empty after hard gates | Return no-match corpus critical. | `fallback_reason: "corpus_empty"`, `corpus_gap_signal: true` |
| State-filtered pool < 5, expansion also < 3 | Return no-match corpus gap. | `fallback_reason: "corpus_too_thin"`, `corpus_gap_signal: true` |
| All top-N candidates below 0.55 threshold | Return no-match retrieval response. Do not lower threshold. | `fallback_reason: "below_threshold"` |
| Secondary state candidates only (moderate confidence, all primary excluded) | Use secondary-state candidates without penalty. If below threshold: no-match. | `fallback_reason: "primary_state_empty"` |
| All candidates intensity-mismatched | Return no-match. Log state + intensity combination. | `fallback_reason: "intensity_mismatch_all"`, `corpus_gap_signal: true` |
| Attribution incomplete on top candidate | Exclude that SIO; try next. If none: no-match. | `fallback_reason: "attribution_failure"` |
| Speaker diversity: top-2 candidates same speaker and both < 0.55 | No-match. Do not return speaker just because they're available. | `fallback_reason: "diversity_no_match"` |

### No-Match Response

When a no-match fallback is reached, the engine returns a structured `NoMatchResult` rather than an SIO:

```json
{
  "result_type": "no_match",
  "fallback_reason": "below_threshold",
  "corpus_gap_signal": false,
  "suggested_action": "ask_for_more_context",
  "retrieval_log_id": "..."
}
```

The presentation layer uses `suggested_action` to determine what to show the user. Common suggested actions:
- `"ask_for_more_context"` — user input was valid but retrieval failed; prompt for more detail
- `"acknowledge_corpus_gap"` — retrieval genuinely had nothing; honest acknowledgment
- `"safety_redirect"` — safety flag triggered
- `"scope_redirect"` — out of scope

**What not to do on fallback:** Do not generate an AI-produced response as a substitute for a retrieved insight. If the corpus has nothing, say so honestly.

---

## 13. Logging and Observability

Every retrieval attempt — success or failure — produces a structured log record. This record is the primary input to the feedback loop and the primary tool for debugging retrieval failures.

### Log Schema (MVP)

| Field | Type | Purpose |
|---|---|---|
| `retrieval_log_id` | UUID | Links this log to the returned result |
| `session_id` | String | Links retrieval to the session for debugging |
| `query_timestamp` | ISO 8601 | When the retrieval was attempted |
| `user_text_hash` | SHA-256 hash of user_text | Privacy-safe reference to the input |
| `detected_state` | State tag or null | What state was detected |
| `state_confidence` | Confidence level | How confident the detection was |
| `secondary_possible_states` | Array | Alternative states considered |
| `retrieval_mode` | Mode string | Which mode was executed |
| `safety_flag` | Boolean | Whether safety bypass was triggered |
| `filters_applied` | Array of strings | List of hard gates applied and how many SIOs each excluded |
| `pre_state_filter_count` | Integer | SIOs in approved_pool before state filter |
| `post_state_filter_count` | Integer | SIOs after state filter (before exclusions) |
| `post_exclusion_count` | Integer | SIOs after all hard exclusions |
| `pool_size_clause_triggered` | Boolean | Whether expansion was needed |
| `post_expansion_count` | Integer | SIOs after pool expansion (if triggered) |
| `top_n_semantic_count` | Integer | How many candidates entered scoring |
| `top_candidate_sio_id` | SIO ID | Which SIO was selected |
| `top_candidate_score` | Float | The final_score of the selected SIO |
| `top_candidate_semantic_similarity` | Float | Base semantic similarity of selected SIO |
| `result_confidence` | `"strong"` / `"acceptable"` / `"fallback"` | Threshold outcome |
| `fallback_reason` | String or null | If fallback: why |
| `corpus_gap_signal` | Boolean | Whether this retrieval revealed a corpus gap |
| `resonance_source_used` | Resonance source tag | Which resonance source was applied |
| `resonance_hypothesis_applied` | Boolean | Whether resonance changed any scoring |
| `did_this_land` | `"positive"` / `"negative"` / `"no_response"` / null | User feedback (populated after response; null at retrieval time) |

### Privacy Considerations

- `user_text` must NOT be stored in the log in plaintext. Store only the SHA-256 hash.
- The hash allows correlating logs with evaluation data without storing personally identifiable emotional content.
- `session_id` must not be linked to user identity in the log store without explicit consent and jurisdiction-appropriate data policy.
- Retention: retrieval logs should have a defined retention policy. Raw logs beyond 90 days should be aggregated into summary statistics rather than retained in full.

### Why Logging Is Non-Negotiable

Without logs, a failed retrieval is untraceable. When a result feels wrong in evaluation, the log answers: was the state filter wrong? Was the semantic similarity too low? Was the correct SIO excluded for the wrong reason? Did the pool-size clause trigger? Was the tagger_confidence penalty too aggressive?

Every retrieval quality improvement depends on log data. Logging must be active before the first evaluation run.

---

## 14. Retrieval Evaluation Plan

### Two-Phase Evaluation

**Phase 1 — Prototype evaluation (offline, before any users):**
Test the engine against a labeled set of queries using the prototype corpus. Human judges rate each result. Target metrics define readiness to move to production infrastructure.

**Phase 2 — Product resonance evaluation (live, with real users):**
Did the returned insight actually land? Measured through the `did_this_land` feedback signal. Cannot be simulated offline. Follows Phase 1 only after the prototype proves the engine works.

### Prototype Evaluation Setup

**Corpus:** 15–30 approved SIOs (5–10 per MVP state). All required fields complete. All embeddings pre-generated.

**Test query set:** 20–30 labeled queries. Distribution:

| Category | Count | Purpose |
|---|---|---|
| Clear-state (5–7 per MVP state, varied phrasing) | 15 | Baseline: does the engine find the right content when state is obvious? |
| Ambiguous DC/ED (hardest pair) | 3 | State discrimination under the most common confusion |
| Ambiguous IL/PP | 2 | Second confusion pair |
| Corpus-thin (valid state, very few available SIOs) | 2 | Tests pool-size safety clause behavior |
| No-match / safety (should not retrieve) | 3 | Tests fallback + safety bypass |
| Broad-mode (low confidence) | 2 | Tests broad mode behavior |

Each query includes:
- `expected_state`: what state should be detected
- `expected_insight_type_preference`: what resonance the query implies
- `acceptable_sio_ids`: list of SIO IDs that would be an acceptable result
- `rejected_sio_ids`: list of SIO IDs that would be a clear retrieval failure
- `expected_result_type`: `"return"` or `"no_match"` or `"fallback"`

### Evaluation Metrics and MVP Targets

| Metric | How Measured | MVP Target |
|---|---|---|
| **State match accuracy** | % of clear-state queries where returned SIO matches expected state | ≥ 90% |
| **Acceptable match rate** | % of queries where returned SIO is in `acceptable_sio_ids` | ≥ 80% |
| **"Would this land?" rating** | Human judges rate 1–5; average across all non-safety queries | ≥ 3.8 / 5.0 |
| **Safety bypass accuracy** | % of safety/no-match queries correctly not returned | 100% — zero tolerance |
| **Attribution completeness** | % of returned SIOs with complete attribution | 100% |
| **Pool-size clause behavior** | Clause triggers correctly on thin-corpus queries | Pass/fail |
| **Log completeness** | % of retrieval attempts with complete log record | 100% |
| **Threshold calibration check** | Human rating ≥ 3.5 for all "Acceptable" results | ≥ 80% of Acceptable results |

**Do not move to production infrastructure until all MVP targets are met.** These are not aspirational — they are gates.

### Corpus-First Calibration Set Design (Recommended Approach for Small Corpora)

The prototype query set described above assumes queries are written before the corpus exists. For small corpora (15–30 SIOs), this produces an inflated acceptable match rate: with only 5 SIOs per state, the correct SIO often ranks first for trivial reasons (it's the only candidate in the pool), making the engine appear more capable than it is.

**Better approach for the prototype phase: build queries from the corpus out.**

After completing Phase 1 (15 SIOs), for each approved SIO:
1. Read the SIO's `key_claim` and `transcript_excerpt`
2. Write 2 query variations that a user in the target stuck state would plausibly say *if* this insight would resonate with them — without referencing the SIO's specific language
3. Write 1 query that should *not* retrieve this SIO (tests specificity)
4. Record `"ground_truth_sio_id"` on each query

This produces a retrieval ground-truth map: for each SIO, you know which queries should find it. Use these SIO-anchored queries as the primary calibration set (≈30–45 queries for 15 SIOs at 2–3 per SIO). Supplement with 5 user-generated queries for realism.

**What this catches that the query-first approach misses:**
- An SIO that no plausible user query retrieves (it's in the corpus but effectively unreachable)
- Semantic clustering failures (two SIOs that should be distinct but are retrieved by the same queries)
- Threshold calibration is more honest: you know the "right answer" and can see exactly what score it received

This approach is more work upfront but produces a far more informative evaluation at small corpus sizes. Revisit the query-first approach when the corpus exceeds 50 SIOs and the ground-truth map becomes impractical to maintain manually.

### Human Evaluation Process

At least 2 human judges rate every query-result pair independently using the 1–5 anchors from C3 Section 8. Judges should not see each other's ratings before scoring.

Before the evaluation run, complete an inter-rater calibration session (≈1 hour): judges independently rate 10 calibration cases, then discuss disagreements until they agree within 1 point on at least 8 of the 10. Then proceed to independent rating of the full set.

Measure inter-rater agreement using Cohen's kappa. Target κ ≥ 0.60 (substantial agreement). If κ < 0.60, revise the judging anchors and re-calibrate before drawing conclusions.

---

## 15. Local Prototype Roadmap

This section defines exactly how to build a working local prototype. It does not define production architecture. The prototype exists to prove retrieval behavior before infrastructure decisions are made.

### Phase 1 — Build Initial Corpus (15 SIOs)

Target: 5 approved SIOs per MVP state (Direction Collapse, Engagement Drought, Inaction Loop).

Follow Component 5's ingestion pipeline. Use the pre-evaluation checklist. Start with Tim Ferriss, Diary of a CEO, or Huberman Lab (highest density sources per Component 2). Store each SIO as a JSON file in `corpus/sios/`.

Each SIO must have all MVP-Required fields complete (from C3 Section 4.2) and `human_review_status = "approved"`. Generate embeddings using `all-MiniLM-L6-v2` and store as a vector field in the JSON.

Store each Source Object as a JSON file in `corpus/sources/`.

**Validation before Phase 2:** Manually read all 15 SIOs. Confirm each passes the standalone test (comprehensible without episode context). Confirm concentration limits respected (max 3 per speaker per state).

### Phase 2 — Build Calibration Query Set (20–30 queries)

For each query, create a JSON object:
```json
{
  "query_id": "q001",
  "user_text": "I got the promotion I've been working toward for three years...",
  "expected_state": "direction-collapse",
  "expected_confidence": "high",
  "expected_result_type": "return",
  "acceptable_sio_ids": ["sio-xxxx", "sio-yyyy"],
  "rejected_sio_ids": ["sio-zzzz"],
  "notes": "Post-achievement variant; should not return mechanism content"
}
```

Use the test cases from C3 Section 9 (Example Test Cases) as starting points. Add queries specific to the 15 SIOs in the prototype corpus.

### Phase 3 — Build Local Retrieval Prototype

The prototype can be built in Python, TypeScript, or any language with embedding library support.

**Prototype structure:**
```
src/
  retrieval/
    corpus_loader.py     # Load SIOs + Source Objects from JSON
    embedder.py          # Embed query text using sentence-transformers
    state_filter.py      # Apply state routing logic (Steps 4–6)
    scorer.py            # Apply scoring model (Step 9)
    retriever.py         # Full retrieval flow (Steps 1–13)
    logger.py            # Log retrieval decisions
    config.py            # Scoring weights (externalized, tunable)
```

**config.py — scoring weights (externalized as a configuration object):**
```python
RETRIEVAL_CONFIG = {
    "insight_type_boost_strong": 0.10,
    "insight_type_boost_weak": 0.05,
    "voice_register_boost_strong": 0.08,
    "voice_register_boost_weak": 0.04,
    "credibility_tier1_boost": 0.05,
    "credibility_tier2_boost": 0.02,
    "source_score_high_boost": 0.03,   # source_score >= 70
    "source_score_mid_boost": 0.01,    # source_score 50-69
    "tagger_high_boost": 0.02,
    "tagger_medium_penalty": 0.03,
    "secondary_state_penalty": 0.05,
    "speaker_repeat_penalty": 0.10,
    "threshold_strong": 0.75,
    "threshold_acceptable": 0.55,
    "threshold_strong_broad_mode": 0.78,
    "max_total_boost": 0.20,           # cap on additive boosts — protects semantic signal
    "pool_size_minimum": 5,
    "pool_size_critical": 3,
    "top_n_candidates": 10,
    "embedding_model": "all-MiniLM-L6-v2",
    "query_framing_prefix": "A young professional describes their situation: "  # Option A asymmetry mitigation
}
```

**Do not hardcode these values in retrieval logic.** Every weight must be readable from and writable to this config. This makes calibration (Phase 4) possible without code changes.

**What the prototype should output for every query:**
1. The selected SIO (full object) or a structured no-match response
2. A human-readable debug log showing: state filtered for, candidate count at each step, top-3 candidates with scores broken down by dimension, which candidate was selected and why

### Phase 4 — Evaluate Results

Run all 20–30 calibration queries through the prototype. For each result:
- Compare returned SIO against `acceptable_sio_ids` and `rejected_sio_ids`
- Have human judges rate the result 1–5 using C3's judging anchors
- Record the `final_score` that produced this result
- Record the fallback reason if no result was returned

Compute evaluation metrics from Section 14. If any metric falls below its target, identify the failure type before proceeding to Phase 5.

**Common failure types and their root causes:**

| Failure Type | Root Cause | Fix Target |
|---|---|---|
| Wrong state returned | State filter not working correctly | Retrieval engine (Step 5) |
| Right state, wrong SIO within state | Semantic similarity too low | Embedding quality or corpus quality |
| Right SIO, wrong resonance | Scoring weights need calibration | config.py |
| Safety bypass not triggering | Step 1 logic error | Retrieval engine (Step 1) |
| Pool-size clause not triggering | Step 6 threshold wrong | config.py |
| Acceptable result rated < 3.5 | Threshold calibration needed | config.py (threshold_acceptable) |
| No-match on clearly valid query | Corpus too thin | Corpus building (Component 5) |

### Phase 5 — Iterate Corpus and Scoring

Based on Phase 4 results:

- If failures are corpus quality problems (wrong SIOs, thin state coverage) → add SIOs per Component 5 pipeline, re-evaluate
- If failures are scoring weight problems → update `config.py`, re-run evaluation
- If failures are threshold calibration problems → run calibration process from Section 9, update thresholds
- If failures are engine logic problems → fix retrieval flow, re-run evaluation

**Do not proceed to production infrastructure until Phase 4 metrics are met.** The prototype validates the retrieval approach. Infrastructure comes after, not before.

---

## 16. Integration with Corpus Creation

**Start corpus and retrieval engine design in parallel, not in sequence.**

Component 5's ingestion pipeline produces the corpus. Component 6 consumes it. These should begin in parallel:
- While the first 5–10 SIOs are being ingested, the retrieval engine prototype can be built against mock/placeholder SIOs
- Once the first 10 real SIOs are available, run the prototype against them immediately — even if only 2–3 per state
- Early retrieval failures against a small corpus are more valuable than a perfect design against a hypothetical corpus

**What the first 10 SIOs will reveal:**
- Whether the embedding approach actually distinguishes the three MVP states from each other
- Whether the scoring weights produce sensible rankings on real content
- Whether the tagging quality (key_claim, insight_type, voice_register) is consistent enough for retrieval to work
- Whether the threshold values are calibrated appropriately

**Corpus-retrieval interaction rule:** Do not finalize the retrieval architecture until the first 15 SIOs have been tested against 10 real queries. What fails on real SIOs will reveal problems that any amount of design review would miss.

**Required SIO fields for prototype retrieval (minimum bar before testing):**
- `insight_id`, `primary_state_tag`, `key_claim`, `transcript_excerpt`, `content_summary`, `insight_type`, `voice_register`, `speaker`, `credibility_tier`, `intensity_level`, `human_review_status = "approved"`, `attribution_text`, `tagger_confidence`
- A precomputed embedding from `f"{key_claim}. {content_summary}. {transcript_excerpt}"`

If any of these are missing from a SIO, it will be excluded from retrieval by the hard gates in Step 4.

**Recommended next action after this document is reviewed:**
1. Build the first 5 SIOs (1–2 per MVP state) from the highest-density source available
2. Run them through the prototype retrieval engine against 5 test queries
3. Review the debug logs — identify what the engine gets right and wrong
4. Use those results to calibrate corpus build priorities and scoring weights before building the full 60-SIO corpus

---

## 17. MVP Recommendation

**What to build first:**

1. A local prototype retrieval engine that loads SIOs from JSON files, embeds queries using `all-MiniLM-L6-v2`, applies the state filter, computes cosine similarity, applies the scoring model from Section 9, enforces the threshold from Section 11, logs to a structured JSON file, and returns a SIO or a no-match response.

2. A corpus of 15 real, approved SIOs (5 per MVP state) built using Component 5's pipeline.

3. A calibration query set of 20 labeled queries per Section 14.

4. Run the evaluation. Calibrate thresholds and weights. Repeat until MVP metrics are met.

**What not to build yet:**
- No vector database — JSON in memory is sufficient for ≤100 SIOs
- No BM25 hybrid search — add after corpus exceeds 500 SIOs and semantic precision degrades
- No cross-encoder reranker — add in V2 after baseline is validated
- No multi-session personalization — stateless for MVP
- No production API or deployment — validate retrieval locally first
- No complex UI integration — test via script or CLI first
- No automated ingestion pipeline — manual ingestion per Component 5 for MVP corpus

**What must be true before implementation:**
- Component 5 has produced at least 5 approved SIOs per MVP state (15 total)
- All 15 SIOs have embeddings precomputed using the selected model
- The calibration query set (20 queries) exists with labeled expected results
- The scoring config is externalized and editable without code changes

**What "good enough" looks like for the first prototype:**
- State match accuracy ≥ 90% on clear-state queries
- Acceptable match rate ≥ 80% against the labeled query set
- Human rating ≥ 3.5/5 for all Acceptable-level results
- Safety bypass 100% accurate
- Attribution completeness 100%
- A human developer can trace any retrieval decision in the log in under 5 minutes

---

## 18. Open Questions

**1. Which embedding model should be used for the prototype?**
`all-MiniLM-L6-v2` is the starting recommendation. But semantic sensitivity to the specific emotional language in Silhouette's queries — "I feel stuck," "going through the motions" — may vary by model. Test both `all-MiniLM-L6-v2` and `text-embedding-3-small` on the calibration set and compare Acceptable match rates before committing. Resolution: evaluation data from Phase 4.

**2. What is the right semantic field to embed on the SIO?**
The current recommendation is `key_claim + content_summary + transcript_excerpt`. An alternative is embedding `key_claim` alone (simpler, faster, more precise) and using `transcript_excerpt` only for full-text return. Test both in the prototype. Resolution: evaluation data comparing hit rates.

**3. When should BM25 hybrid search be added?**
When the corpus exceeds 500 SIOs and evaluation data shows systematic failures where users mention specific names, concepts, or technical terms that appear verbatim in the corpus but semantic similarity misses them. Resolution: not triggered until this failure pattern appears in evaluation logs.

**4. What is the right pool-size safety clause threshold?**
Currently set at 5 SIOs. This may be too conservative for a 15-SIO prototype corpus (5 per state leaves little room for filtering). If the clause triggers on every query in early prototype testing, lower to 3 for the prototype phase. Resolution: prototype evaluation data.

**5. How should the engine handle a state where the corpus has 0 approved SIOs?**
This is a critical corpus gap. The fallback hierarchy currently handles it as "no match, corpus gap signal." But should the engine attempt broad-mode retrieval across all states as a last resort? Or should it acknowledge the gap honestly? This is a product philosophy question. Resolution: decide before the product is live; default for now is honest acknowledgment.

**6. When should the engine move to a vector database?**
When the corpus exceeds 100 SIOs and in-memory cosine similarity adds noticeable latency (>500ms). At that point, migrate to `pgvector` (if already using Postgres) or `Chroma` (lightweight, local-first). Defer Pinecone/Weaviate until real traffic justifies the operational complexity. Resolution: latency measurements at 100+ SIOs.

**7. How should resonance weights be tuned beyond initial calibration?**
The current scoring weights are derived from reasoning. After the first 100 real sessions with feedback, use `did_this_land` signal aggregated by `insight_type` and `voice_register` to validate or revise the boost values. Do not tune weights from fewer than 50 feedback signals — the sample is too small. Resolution: first 100 real sessions.

**8. What happens when the selected SIO's content is stale (speaker credibility event)?**
If a speaker whose SIOs are in the corpus becomes associated with a credibility event (per Component 2's governance rules), their SIOs must be removed or flagged before retrieval. The engine should support a `flagged_sio_ids` list in the configuration that overrides `human_review_status = "approved"`. Implement this before any user-facing retrieval is active. Resolution: add to engine before production; treat as a blocking requirement.

**9. How much logging is safe from a privacy standpoint?**
The current logging schema stores `user_text_hash` rather than plaintext. Whether this is sufficient for the applicable jurisdiction and use case has not been reviewed by a privacy counsel. The logging schema should be reviewed before any user data is collected. Resolution: legal/privacy review before launch.

**10. What is the minimum corpus size before the prototype can yield meaningful evaluation data?**
At 5 SIOs per state (15 total), the semantic search has very limited range — for many queries, the correct SIO will rank first simply because there are so few alternatives. Meaningful evaluation of the semantic similarity and scoring model requires at least 10–15 SIOs per state (30–45 total). Build to 30 SIOs before treating evaluation data as informative about scoring. Resolution: build to 30 SIOs, then run evaluation.
