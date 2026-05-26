# Silhouette — Agentic SIO Discovery System: Architecture & Design

> **Summary.** This document describes the architecture of the SIO Discovery Agent: an 8-module system that uses deterministic analysis, LLM-as-judge scoring, and embedding-based deduplication to surface high-quality SIO candidates for human review. It is agentic in research, scoring, and drafting — and human-controlled at every approval gate. Nothing reaches the active corpus without a human.

> **How to use this document.** Read alongside `agentic_sio_discovery_workflow.md` (the operator guide), `corpus_ingestion_pipeline.md` (the manual ingestion standard), and `video_source_finder_design.md` (media verification). This document explains *what* the system is and *why* it is designed the way it is.

---

## 1. Purpose

The SIO Discovery Agent automates the research-intensive, time-consuming parts of corpus building — finding gaps, identifying candidate moments, scoring resonance, checking for duplicates, and drafting SIO structure — while preserving the human judgment gates that Silhouette's quality and trust model require.

Concretely, it exists to solve this problem: getting from 19 prototype SIOs to a production-quality corpus of 40–50 approved SIOs requires identifying specific moments from specific speakers on specific topics that fill specific gaps. That process is expensive if done fully manually (the manual pipeline estimates ~58 hours for a 60-SIO corpus). The discovery agent reduces the research burden by identifying *where* the gaps are, *what* to look for, and *which candidates* are worth a human's time — while never making the judgment calls that only a human can make.

---

## 2. Why Silhouette Needs It

Silhouette's core value proposition is source-forward, human-attributed insight retrieval — not generic AI advice. Every SIO must be:

- A real, attributable moment from a real, named person.
- State-specific: it genuinely addresses one of the six stuck states the user is in.
- Emotionally resonant, not just topically adjacent.
- Distinct: not a duplicate of what the corpus already contains.
- Sourced honestly: no fabricated timestamps, no misattributed quotes, no unofficial re-uploads.

None of these properties can be checked cheaply by hand at scale. But none of them can be reliably auto-approved by a machine either — the trust and quality bar is too high.

The discovery agent solves this by being agentic where humans are slow (pattern analysis, search query generation, LLM scoring, embedding comparison, draft structuring) and human-controlled where machines are untrustworthy (final quote verification, approval, and corpus write).

Without the agent, corpus building relies entirely on the manual pipeline, which is the right standard for quality but too slow to reach 40–50 SIOs without an unreasonable time investment. With the agent, that investment is focused on the tasks that only humans can do.

---

## 3. What the Agent Is Allowed to Do

The discovery agent may:

- Read `corpus/sios/` to compute distributions, gaps, and concentration counts.
- Generate ranked search query strings for a human or agent to run against trusted source families.
- Score candidate moments using an LLM judge (gpt-4o-mini) on 10 Human Resonance dimensions with required evidence per score.
- Compute embedding similarity between a candidate and the existing corpus to detect duplicates or near-duplicates.
- Run deterministic honesty checks on source/media/transcript fields (format, internal consistency, presence of fabricated values).
- Write draft SIO files to `corpus/drafts/` only, always with `human_review_status: prototype_only` and `transcript_verified: false`.
- Read and render the candidate review queue from `corpus/candidates/*.yaml`.
- Update a candidate's status and scores in its `.yaml` file as evidence is gathered.

---

## 4. What It Is Never Allowed to Do

These are hard invariants enforced by the code, not just conventions:

- **Never write to `corpus/sios/`.** Only a human manually moves a draft from `corpus/drafts/` to `corpus/sios/`.
- **Never set `human_review_status: approved` or `transcript_verified: true`.** Both require a human with direct evidence. The agent sets these to `prototype_only` / `false` and leaves notes for what evidence is needed.
- **Never fabricate a quote, timestamp, video_id, URL, or official-channel claim.** A blank field with an honest `needs_review` status always beats a guessed one. This rule is inherited from `video_source_finder_design.md` §0 and enforced throughout the discovery pipeline.
- **Never auto-publish.** No orchestrator mode triggers corpus ingestion without human review.
- **Never scrape or crawl.** The system generates search queries for humans to run; it does not autonomously fetch, parse, or download media.
- **Never treat a re-upload as official.** `unofficial` is the only valid status for non-official-channel media; it is never embedded as official.
- **Never upgrade verification status without evidence.** `verified` requires a human confirmation. When unsure, the system downgrades to `needs_review`.

---

## 5. Core Workflow

At a high level, the discovery cycle proceeds through five phases:

```
1. GAP ANALYSIS (deterministic)
   detect-corpus-gaps.ts reads corpus/sios/
   → ranked gap list + target candidate profiles
   → ai/guides/corpus_gap_detection_report.md

2. CANDIDATE SOURCING (deterministic)
   find-source-candidates.ts turns gaps into ranked search queries
   → structured query targets for trusted source families
   A human or agent runs the queries and creates candidate YAML files
   in corpus/candidates/

3. EVALUATION (LLM-as-judge + embeddings)
   evaluate-sio-candidate.ts → Human Resonance Score (10 dimensions, gpt-4o-mini)
   score-candidate-novelty.ts → novelty vs. existing corpus (embeddings)
   verify-candidate-source.ts → deterministic honesty checks

4. HUMAN REVIEW GATE
   review-candidates.ts renders the queue in priority order
   → ai/guides/candidate_review_queue.md
   A human inspects scores, evidence, and source fields
   → advances promising candidates or rejects weak ones

5. DRAFT ONLY (not publish)
   draft-sio-from-candidate.ts writes corpus/drafts/<id>.md
   (prototype_only, transcript_verified: false, never in sios/)
   A human verifies the verbatim quote, then manually moves
   the file to corpus/sios/ and sets human_review_status: approved
```

The system stops for human review between phases 3 and 5. It never runs phase 5 without phase 4 completing first, and phase 4 is always a human decision.

---

## 6. Agent Architecture

The system is composed of 8 modules implemented as local TypeScript scripts, a shared contract library, and an orchestrator that chains them. There is no persistent server, no cloud execution environment, and no autonomous crawler. All scripts run locally with `npm run <script-name>`.

### Shared Contract: `scripts/lib/discovery.ts`

This is the single source of truth imported by every script. It defines:

- Controlled vocabularies: `MVP_STATES`, `INSIGHT_TYPES`, `VOICE_REGISTERS`, `INTENSITIES`
- Candidate lifecycle statuses: `CANDIDATE_STATUSES`
- Scoring weights and thresholds: `SCORE_WEIGHTS`, `SCORE_THRESHOLDS`, `ANTI_GENERIC_FLOOR`
- The 10 Human Resonance dimensions: `RESONANCE_DIMENSIONS`
- The `Candidate` interface (the shared data model for all `.yaml` files)
- Candidate IO helpers: `loadCandidateFromPath`, `saveCandidate`, `listCandidateFiles`
- SIO frontmatter reader: `loadSioMetas` (reads `corpus/sios/` without embeddings)
- Score aggregation: `aggregateOverall`, `recommendationFor`, `dimsToScore`

Because all 8 modules import from this lib, changes to scoring weights, vocabulary, or thresholds propagate consistently.

### Orchestrator: `scripts/run-sio-discovery-agent.ts`

The orchestrator chains stages, stops for human review, and never auto-publishes.

| Mode | What it does |
|---|---|
| `--gap-only` | Run Gap Analyst only; write the gap report |
| `--candidate <path>` | Run Evaluate + Novelty + Verify on a single candidate YAML |
| `--review` | Render the review queue from all candidates |
| `--draft-ready` | Draft SIOs for all candidates currently in `ready_for_sio_draft` status |
| `--full-local` | Gap → Source Scout queries → review queue (does not run evaluate automatically) |

Run with: `npm run discover-sios -- --<mode>`

---

## 7. Sub-Agents and Modules

### Module 1 — Gap Analyst

**Script:** `scripts/detect-corpus-gaps.ts`  
**npm script:** `npm run detect-gaps`  
**Type:** Deterministic. No LLM, no network.

**Purpose.** Reads the full `corpus/sios/` directory and reports the corpus's distribution across every dimension that matters for coverage and balance. Ranks gaps by priority and outputs concrete target candidate profiles that the Source Scout can act on.

**Inputs.** All `*.md` files in `corpus/sios/` (YAML frontmatter parsed by `loadSioMetas`).

**Outputs.**
- JSON to stdout with full distribution data, matrices, and ranked gaps.
- Markdown report at `ai/guides/corpus_gap_detection_report.md` with human-readable tables.
- Prioritized target candidate profiles (e.g., `engagement-drought + direct/challenging`) used to focus sourcing.

**What it measures.**
- SIO count per state, per insight_type, per voice_register, per credibility tier, per intensity level.
- State × insight_type matrix: empty cells flag entire resonance lanes absent from a state.
- State × voice_register matrix: empty cells flag tones a state cannot serve at all.
- Speaker concentration: flags any speaker with ≥3 SIOs in a given state (the corpus concentration limit from `corpus_ingestion_pipeline.md`).
- Reconstruction rate: flags when `transcript_verified=false` exceeds 60% of the corpus.
- Verified video count: flags when fewer than 8 SIOs have verified video.

**Gap priority scale.** Missing state × type combos (priority 100) > empty state × register cells (80) > thin states (70) > thin global registers (60) > thin intensity (55) > reconstruction rate (50) > thin tier-3 (45) > concentration at limit (30).

---

### Module 2 — Source Scout

**Script:** `scripts/find-source-candidates.ts`  
**npm script:** `npm run find-source-candidates`  
**Type:** Deterministic. No LLM, no network. Outputs search queries only.

**Purpose.** Translates gap profiles into ranked, official-source search queries across Silhouette's approved source families. Produces queries a human or agentic web-search step can run to find specific candidate moments.

**Inputs.** Gap profiles from the Gap Analyst (or manual input); the approved source families.

**Outputs.** Ranked query targets per gap, including suggested search strings and official channel URLs. Does not scrape or fetch — outputs are search instructions.

**Trusted source families covered.**
- The Tim Ferriss Show
- Huberman Lab
- Diary of a CEO (Steven Bartlett)
- School of Greatness (Lewis Howes)
- Rich Roll Podcast
- Modern Wisdom (Chris Williamson)
- Impact Theory (Tom Bilyeu)
- TED / TEDx

The scout prioritizes queries toward sources with the highest state-to-source fit scores from `source_candidates.md`. For each gap profile, it generates speaker-specific queries (e.g., "David Goggins engagement-drought warm/affirming Huberman Lab") and show-level queries (e.g., "Diary of a CEO inaction loop permission warm/affirming").

---

### Modules 3 + 4 — Human Resonance Evaluator and Moment Scout

**Script:** `scripts/evaluate-sio-candidate.ts`  
**npm script:** `npm run evaluate-candidate -- --candidate <path>`  
**Type:** LLM-as-judge (gpt-4o-mini). Requires API key.

**Purpose.** This module implements the Human Resonance Score — the differentiating evaluation that distinguishes Silhouette's discovery from generic keyword or semantic relevance scoring. It scores a candidate moment on 10 dimensions using gpt-4o-mini as judge, requiring a specific evidence phrase for each score to prevent surface-level pattern matching.

**Inputs.** A candidate YAML file from `corpus/candidates/`.

**Outputs.** Scores written back to the candidate YAML:
- `human_resonance_score` (0–100, aggregated from dimension scores)
- `quote_quality_score` (0–100)
- `resonance_breakdown` (per-dimension scores + evidence phrases + landing/miss analysis)
- `recommendation` (one of: reject, needs_stronger_source, needs_transcript_verification, promising, ready_for_sio_draft)
- Updated `candidate_status` (advances toward `ready_for_sio_draft` if score and evidence pass)

**On LLM-as-judge design.** LLM-as-judge is an established evaluation pattern (see: [Agenta guide to LLM-as-judge](https://agenta.ai/blog/llm-as-judge-guide-to-llm-evaluation-best-practices), [Evidently AI LLM-as-judge guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)) in which an LLM scores outputs along structured dimensions rather than generating free-form responses. The pattern works well when: dimensions are well-defined, rubrics are explicit, and human calibration confirms the scoring aligns with human judgment. The Human Resonance Score is designed to this standard: 10 named dimensions, 1–5 scale, required evidence per score, and a hard gate against generic content.

---

### Module 5 — Novelty and Deduplication Scorer

**Script:** `scripts/score-candidate-novelty.ts`  
**npm script:** `npm run score-candidate-novelty -- --candidate <path>`  
**Type:** Embedding-based comparison against `corpus/sios/`.

**Purpose.** Prevents the corpus from accumulating near-duplicate SIOs that say the same thing in slightly different words. Uses the same vector store as the retrieval engine to compute cosine similarity between the candidate's key claim + moment summary and every existing SIO.

**Inputs.** A candidate YAML file; the existing corpus embeddings.

**Outputs.** Written back to the candidate YAML:
- `novelty_score` (0–100: higher = more distinct from existing corpus)
- `novelty_rating`: one of `duplicate` / `similar_but_useful` / `novel`
- `novelty_nearest`: list of the nearest existing SIOs with similarity scores

**Decision rules.**
- `duplicate`: candidate says essentially the same thing as an existing SIO from a similar source. Candidate is rejected unless it's substantially higher quality.
- `similar_but_useful`: overlaps thematically but brings a meaningfully different speaker, register, or framing. Can advance if Human Resonance Score is strong.
- `novel`: fills a gap the corpus doesn't currently address. High value.

---

### Module 6 — Source and Media Verification

**Script:** `scripts/verify-candidate-source.ts`  
**npm script:** `npm run verify-candidate-source -- --candidate <path>`  
**Type:** Deterministic honesty checks. No LLM.

**Purpose.** Applies the honesty invariants from `video_source_finder_design.md` to the candidate's source fields. Checks for internal consistency, format validity, and the presence of fabricated or guessed values. Never upgrades a field to `verified` — that requires a human.

**Inputs.** A candidate YAML file.

**What it checks.**
- `video_id` format (must be 11 characters for YouTube; must be blank for TED sources).
- `embed_url` format and consistency with `video_provider`.
- `source_url` is present and non-empty.
- `quote_type` is honest (`verbatim` only when `transcript_excerpt` is actually present; otherwise `paraphrase` or `unknown`).
- `transcript_verification_status` is not `verified` unless `transcript_excerpt` is present and `quote_type: verbatim`.
- `media_verification_status` is not `verified` unless consistent with the field evidence.

**Outputs.** Validation warnings and errors written back to the candidate YAML. Hard errors block the candidate from advancing to `ready_for_sio_draft`.

**What it never does.** Upgrade any verification field to `verified`. Only set `needs_review`, flag missing fields, and document gaps honestly. The step is called "verification" in the sense of checking for errors and honesty — not in the sense of confirming the source is real. Real confirmation requires a human.

---

### Module 7 — Review Queue

**Script:** `scripts/review-candidates.ts`  
**npm script:** `npm run review-candidates`  
**Type:** Deterministic. Reads all `corpus/candidates/*.yaml`, renders a human-readable queue.

**Purpose.** Surfaces the full candidate inbox in a structured, priority-ordered format so a human reviewer can make efficient decisions across all candidates at once.

**Inputs.** All `.yaml` files in `corpus/candidates/`.

**Outputs.**
- Human-readable review queue at `ai/guides/candidate_review_queue.md`.
- Candidates sorted by `overall_candidate_score` (highest first), with statuses, flags, and evidence summaries visible.
- Calls out candidates at the `ready_for_sio_draft` threshold separately from `promising` and `needs_*` candidates.

**Human role.** The reviewer reads the queue, checks the evidence and source fields, decides whether to advance, reject, or archive each candidate. The queue renders what the system knows; the human decides what happens next.

---

### Module 8 — SIO Drafter

**Script:** `scripts/draft-sio-from-candidate.ts`  
**npm script:** `npm run draft-sio-from-candidate -- --candidate <path>`  
**Type:** LLM-assisted structuring (populates SIO fields from candidate data). Always prototype_only.

**Purpose.** Takes a candidate that has passed all scores and human review, and produces a structurally complete SIO draft in `corpus/drafts/`. The draft has all required SIO fields populated from the candidate data, ready for a human to complete the verbatim verification step.

**Inputs.** A candidate YAML file with status `ready_for_sio_draft`.

**Outputs.** An `*.md` file in `corpus/drafts/<candidate_id>.md` with:
- All SIO frontmatter fields populated from candidate data.
- `human_review_status: prototype_only` (hard-coded; never changed by this script).
- `transcript_verified: false` (hard-coded; never changed by this script).
- A clear `⚠️ RECONSTRUCTION NOTE` if the excerpt is a paraphrase rather than verbatim.
- Notes in `media_verification_notes` documenting exactly what still needs human verification.

**What it never does.**
- Write to `corpus/sios/`.
- Set `human_review_status: approved`.
- Set `transcript_verified: true`.
- Fabricate a verbatim quote from memory.
- Guess a `video_id`, timestamp, or `embed_url` not already verified in the candidate.

---

## 8. Candidate Lifecycle

Candidates live in `corpus/candidates/*.yaml` and progress through a defined set of statuses. Nothing in this folder is served to users. The SIO loader reads only `corpus/sios/`.

```
proposed
    │
    ├─ (evaluate-candidate)  →  needs_source_verification
    │                        →  needs_transcript_verification
    │                        →  needs_quote_review
    │
    ├─ (human + scripts)     →  ready_for_sio_draft
    │
    ├─ (draft-sio-from-candidate)  →  drafted
    │                                   [draft lives in corpus/drafts/, not sios/]
    │
    ▼
    ★ HUMAN GATE ★
    approved  (human manually moves to corpus/sios/, sets approved)
    rejected  (failed the bar: generic, weak source, duplicate, mis-sourced)
    archived  (kept for record but not pursued)
```

**Status definitions.**

| Status | Meaning |
|---|---|
| `proposed` | Newly added; not yet scored or verified |
| `needs_source_verification` | Source URL or official channel not yet confirmed |
| `needs_transcript_verification` | Quote not yet confirmed verbatim against an official transcript |
| `needs_quote_review` | A human should sanity-check the chosen moment |
| `ready_for_sio_draft` | Passed all score thresholds and has sufficient evidence to draft |
| `drafted` | A draft SIO exists in `corpus/drafts/` |
| `approved` | A human approved it and moved it into `corpus/sios/` |
| `rejected` | Failed the bar |
| `archived` | Kept for record; not pursued |

The lifecycle is defined in `scripts/lib/discovery.ts` (`CANDIDATE_STATUSES`) and enforced consistently across all modules.

---

## 9. Human Review Gates

The system has three mandatory human gates and several advisory checkpoints.

### Gate 1: Candidate Creation

**When.** Before any YAML is created in `corpus/candidates/`.  
**Who.** The operator creating the candidate.  
**What the human does.** Decides which gap to fill, selects the moment, writes the `candidate_moment_summary` and `key_claim`, sets `source_url`, and honestly marks `quote_type` and `media_verification_status`. The agent does not create candidates automatically — it creates search queries and drafts; a human or a supervised agent step creates the YAML.

### Gate 2: Score Review

**When.** After Evaluate + Novelty + Verify scripts have run.  
**Who.** The operator reviewing the candidate queue.  
**What the human does.** Reads the `human_resonance_score`, `overall_candidate_score`, `resonance_breakdown` evidence, `novelty_rating`, and source/media verification flags. Decides whether to advance the candidate to `ready_for_sio_draft`, send it back for more sourcing, or reject it. The human may also override any score or flag, adding `human_review_notes`.

This gate corresponds to the HITL design principle described in [iMerit's overview of agentic AI oversight](https://imerit.ai/resources/blog/the-rise-of-agentic-ai-why-human-in-the-loop-still-matters-una/): "humans handle judgment, accountability, and decisions that carry regulatory or material consequences." In Silhouette's case, the material consequence is showing a quote attributed to a real person to a user in a vulnerable stuck state.

### Gate 3: Verbatim Verification and Corpus Approval

**When.** After a draft exists in `corpus/drafts/`.  
**Who.** A human with access to the official source.  
**What the human does.**
- Opens the official transcript (TED transcript page, YouTube captions, official podcast transcript).
- Finds the passage matching the candidate moment.
- Copies the verbatim text and timestamp.
- Edits the draft: replaces the paraphrase with the verbatim excerpt, sets `transcript_verified: true`.
- Runs a final word-check: verifies the excerpt stands alone, the attribution is complete, the state tag is accurate.
- Manually moves the file from `corpus/drafts/` to `corpus/sios/`.
- Sets `human_review_status: approved`.

No script performs or assists with this gate. It is entirely human.

**Note on TED transcripts.** As documented in `verbatim_verification_checklist.md`, ted.com transcripts are rendered by a JavaScript application and are not machine-fetchable by the current web tool. The verbatim/timestamp step for TED SIOs requires a human to paste the official transcript text. The system surfaces the candidate and identifies the passage to find; the human completes the verbatim step.

---

## 10. Scoring Dimensions

The candidate scoring system has five component scores, each 0–100, combined into an `overall_candidate_score` via a weighted blend.

| Component | Weight | How computed |
|---|---|---|
| `human_resonance_score` | **0.40** | LLM-as-judge across 10 dimensions (see §11) |
| `quote_quality_score` | 0.20 | LLM evaluation of quote completeness, attribution clarity, standalone comprehensibility |
| `gap_fit_score` | 0.15 | How well the candidate fills the specific gap profile it was sourced for |
| `novelty_score` | 0.15 | Embedding-based distinctness from existing corpus |
| `source_credibility_score` | 0.10 | Speaker credibility + official source quality |

**Score thresholds.**

| Overall score | Recommendation |
|---|---|
| < 45 | `reject` |
| 45–64 | `needs_stronger_source` |
| 65–74 | `promising` (needs additional evidence to advance) |
| ≥ 75 + evidence satisfied | `ready_for_sio_draft` |

**Evidence gates.** Even a score ≥ 75 does not unlock `ready_for_sio_draft` if `sourceVerified` or `transcriptVerified` evidence is missing. The system returns `needs_stronger_source` or `needs_transcript_verification` as the recommendation. Score is necessary but not sufficient.

Human Resonance is weighted highest (0.40) deliberately. This makes *resonance* — not mere topical relevance — the deciding factor. A candidate that is topically on-target but emotionally flat or generic will score lower than one that is less topically precise but genuinely lands. This is how Silhouette's discovery differentiates from generic RAG or keyword scraping.

---

## 11. Human Resonance Score Design

The Human Resonance Score (HRS) is the differentiating mechanism of Silhouette's discovery system. It operationalizes the question: *will this moment actually land for a user in the target stuck state?* — not just: *is this topically related to that state?*

### The 10 Dimensions

Each dimension is scored 1–5 by the LLM judge. A specific evidence phrase is required for every score — the judge cannot assign a 4 on `felt_recognition` without quoting the exact line that produces felt recognition. This evidence requirement is the primary defense against surface-level pattern matching and score inflation.

| Dimension | What it measures | Why it matters for Silhouette |
|---|---|---|
| `state_specificity` | Does the moment address the specific internal experience of the target stuck state, not just a related topic? | SIOs that are topically adjacent but not state-specific retrieve for the wrong user at the wrong moment |
| `felt_recognition` | Does the language produce an immediate "that's me" response in a user at that state? | Recognition is the first moment of trust — without it, the user disengages |
| `emotional_precision` | Does the speaker name the emotional experience with uncommon precision rather than generic terms? | "Adrift" vs. "I don't know what I want" — precision creates the felt-recognition moment |
| `reframe_power` | If this is a reframe-type insight, does it actually shift what the situation IS? | A weak reframe just says "it's okay" — a strong reframe changes the meaning of the experience |
| `permission_relief` | Does the moment give the user license to feel or want something they've been blocking? | Permission insights fail if they feel performative or conditional |
| `actionability` | Does the moment suggest or imply a meaningful next move, even for the most overwhelmed user? | Not "3 steps" — something the user could hold and use even in a stuck moment |
| `human_credibility` | Does the speaker's visible experience or expertise make this moment more trustworthy? | Silhouette's value requires real human authority; a quote that could have come from any AI system fails this |
| `source_vividness` | Does the source context (specific story, specific moment, specific speaker) make this more vivid than a decontextualized claim? | Source-forward presentation requires source-vivid content |
| `non_genericness` | Does this moment read like something a real, specific human said — as opposed to generic motivational content? | This is the direct test for the anti-generic gate |
| `voice_register_clarity` | Is the delivery register (direct, warm, intellectual, vulnerable, expert) clearly discernible and appropriately matched to the target user? | Retrieval routes users to content by register — a mismatched register fails the user even if the content is correct |

### The Anti-Generic Hard Gate

If `non_genericness` or `state_specificity` scores ≤ 2 (on the 1–5 scale), the candidate is **rejected regardless of other scores**. This is enforced by `ANTI_GENERIC_FLOOR = 2` and `ANTI_GENERIC_DIMENSIONS` in `scripts/lib/discovery.ts`.

The gate exists because the core risk in content discovery is accumulating content that *looks* relevant but is actually generic enough to belong on a motivational Instagram account. A candidate that passes on nine dimensions but fails `non_genericness` is not a Silhouette SIO — it's the kind of content Silhouette is designed to be better than.

The rule of thumb: "If it could be a generic motivational Instagram post, it's not an SIO."

### Score Aggregation

```typescript
overall_candidate_score = (
  human_resonance_score * 0.40 +
  quote_quality_score * 0.20 +
  gap_fit_score * 0.15 +
  novelty_score * 0.15 +
  source_credibility_score * 0.10
)
```

Missing component scores are dropped and the remaining weights renormalized, so a partially evaluated candidate still produces a meaningful `overall_candidate_score`. The aggregation function (`aggregateOverall` in `discovery.ts`) handles this case.

### Dimension Score Conversion

Raw dimension scores (each 1–5, 10 dimensions, sum range 10–50) are converted to 0–100 via:

```
human_resonance_score = ((sum - 10) / (50 - 10)) * 100
```

This ensures the full 0–100 range is used, with 0 representing all dimensions at minimum and 100 representing all dimensions at maximum.

---

## 12. Source, Video, and Transcript Verification Approach

The discovery system inherits and extends the honesty framework from `video_source_finder_design.md`. Verification status is always a conservative, evidence-gated claim — never a default.

### Verification Statuses (shared with the SIO media schema)

| Status | Meaning | What the agent can set |
|---|---|---|
| `verified` | Confirmed by human with direct evidence | **Never** — human only |
| `needs_review` | Plausible candidate found; not machine-confirmed | Yes — the honest default when something looks right but isn't confirmed |
| `unverified` | Not yet checked | Yes — the starting state |
| `unofficial` | Only a non-official re-upload exists | Yes — always flag re-uploads |
| `not_applicable` | No embeddable video by nature (book, audio-only) | Yes |

### TED Sources

TED transcripts are rendered by a JavaScript application and are not machine-fetchable. Official `embed.ted.com` embed URLs can be constructed and confirmed for TED talks whose canonical slug is known. YouTube `video_id` values for TED official channels require human playback verification before being written.

As noted in `verbatim_verification_checklist.md`, the practical path for TED SIOs is:
1. The agent identifies the candidate and marks the verbatim step as pending.
2. A human opens the TED transcript page, finds the passage, and pastes the verbatim text + timestamp back.
3. The human sets `transcript_verified: true` and `human_review_status: approved`.

### YouTube Sources

Official channel URLs can be confirmed by searching the show's known channel. However, YouTube watch pages do not cleanly expose the owning channel to an unauthenticated fetch, and search results routinely surface re-uploads. Even when the official show's website links a specific `youtu.be/<id>`, this is recorded as a high-confidence `needs_review` candidate, not `verified`. The `video_id` field stays blank until a human confirms playback on the official channel.

### Audio-Only Sources

Episodes recorded by phone or without video (e.g., early Tim Ferriss podcast episodes) have `video_provider: none` and `display_mode: audio-primary`. No `video_id` or `embed_url` is attempted. The source link to the official episode page is the media artifact.

### Book and Article Sources

Text sources are `media_verification_status: not_applicable`. The source URL points to the official publisher or author page. Paraphrased excerpts must be flagged with `transcript_verified: false`; verbatim quotes require a page citation.

---

## 13. How the System Avoids Fake and Junk SIOs

The discovery system builds in multiple layers of protection against the failure modes that would undermine Silhouette's trust model.

**Layer 1: Honesty invariants in the shared lib.** The `discovery.ts` library enforces that drafts are always `prototype_only`, `transcript_verified: false`, and never written to `corpus/sios/`. Any script that violates these invariants must explicitly break the lib's contract, making violations visible.

**Layer 2: The Anti-Generic Hard Gate.** Non-genericness and state-specificity scoring ≤ 2 triggers automatic rejection regardless of overall score. This specifically targets the failure mode of accumulating motivational content that is topically adjacent but not genuinely state-specific.

**Layer 3: LLM evidence requirements.** The Human Resonance evaluator requires a specific evidence phrase for each dimension score. Scores without evidence phrases fail validation. This prevents the LLM judge from pattern-matching on surface features (the speaker is famous, the topic sounds right) rather than evaluating whether the moment actually works.

**Layer 4: Embedding-based novelty check.** Near-duplicate detection using the retrieval vector store prevents accumulating slightly reworded versions of the same insight from different sources — a subtle form of corpus degradation.

**Layer 5: Deterministic verification checks.** The source/media verifier catches fabricated values (a guessed `video_id` in the wrong format, a `transcript_verified: true` without a `transcript_excerpt`, an `embed_url` built before the `video_id` is confirmed).

**Layer 6: Human review gate.** No candidate advances to `ready_for_sio_draft` without a human inspecting the score evidence and source fields. No draft reaches the corpus without a human verifying the verbatim text and manually approving.

**Layer 7: The SIO loader's review status allowlist.** The production SIO loader (`src/rag/sioLoader.ts`) only serves SIOs with `human_review_status` in `{approved, prototype_only, needs_review}`. Status values like `pending`, `reviewed`, or `flagged` from the manual pipeline are silently skipped. This ensures that the production system never inadvertently serves a mis-statusd draft.

---

## 14. How It Differs From Generic Scraping

Standard web scraping and automated content aggregation pipelines produce content at volume by crawling, parsing, and indexing source material with minimal quality filtering. Silhouette's discovery pipeline differs structurally and philosophically on every dimension that matters.

| Dimension | Generic scraping / RAG | Silhouette discovery agent |
|---|---|---|
| **Primary filter** | Topical relevance (keyword or semantic similarity to query) | Human Resonance Score — state-specificity, felt recognition, emotional precision, non-genericness |
| **Unit of retrieval** | A chunk of text | A curated, standalone, human-attributed insight moment |
| **Attribution** | URL and title, auto-extracted | Verified speaker, show, episode, date — human-confirmed |
| **Quote accuracy** | Auto-extracted; verbatim not guaranteed | Verbatim verification required before approval; paraphrases explicitly flagged |
| **Generic content** | No filter; generic content passes topical relevance | Anti-generic hard gate; rejected regardless of other scores |
| **Duplicates** | Common; few pipelines deduplicate at the meaning level | Embedding-based novelty check against entire existing corpus |
| **Human gate** | Rare or absent | Mandatory at candidate creation, score review, and corpus approval |
| **Fabrication risk** | Low (text is auto-extracted, not generated) | Low by design (honesty invariants hard-coded; no quote fabrication permitted) |
| **Scale vs. quality** | High scale, variable quality | Deliberate curation; ~40–50 SIOs per iteration |
| **Media verification** | Not applicable | `verified` status requires human confirmation; YouTube video_id never guessed |

The key insight is that generic RAG improves retrieval *quantity* — more corpus = more recall. Silhouette's discovery improves retrieval *quality at the moment* — a smaller corpus of genuinely resonant, state-specific SIOs outperforms a large corpus of topically relevant but generically motivational content for the use case.

As noted in RAG evaluation research ([RAGalyst](https://arxiv.org/pdf/2511.04502), [Production RAG 2025](https://dextralabs.com/blog/production-rag-in-2025-evaluation-cicd-observability/)), the production failure mode of RAG systems is not recall failure (not enough content) but precision failure (the retrieved content doesn't actually serve the user's need). Silhouette's discovery pipeline is designed to prevent precision failure by making resonance, not volume, the primary quality signal.

---

## 15. How It Scales Later

The current system is designed for a single operator working locally with a corpus of 19–50 SIOs. The architecture supports scaling through several paths without structural redesign.

### Path 1: YouTube Data API Integration

Adding a YouTube Data API key to `.env` would enable `find-video-sources.ts` to verify official-channel `video_id` values automatically via `search.list` filtered by `channelId`. This removes the primary bottleneck in media verification (the manual YouTube video_id confirmation step), unlocking verified `youtube-nocookie` embeds with precise `?start=` timestamps at scale.

### Path 2: Transcript Sourcing Automation

Podcast transcripts from shows that publish them (Huberman Lab, Tim Ferriss, Diary of a CEO) can be fetched and parsed automatically. The verbatim verification step for these sources could be automated once reliable transcript access is established, reducing human effort at Gate 3 to a spot-check rather than a full paste.

### Path 3: Source Scout Web Execution

The Source Scout currently generates search queries for a human to run. The same queries could be executed by a supervised web-search agent, with results filtered against the approved source families and returned as pre-populated candidate YAMLs for human review. Human effort shifts from running queries to reviewing the pre-populated candidates.

### Path 4: LLM Judge Calibration

As the corpus grows to 50+ approved SIOs, a calibration study can be run: score the existing approved corpus with the LLM judge, compare to human ratings, and tune the dimension prompts for any dimensions showing low human-LLM agreement. This is the standard HITL calibration pattern recommended for LLM-as-judge systems ([Evidently AI](https://www.evidentlyai.com/llm-guide/llm-as-a-judge), [Agenta AI](https://agenta.ai/blog/llm-as-judge-guide-to-llm-evaluation-best-practices)).

### Path 5: Feedback-Driven Gap Detection

Once the feedback quality loop (Component 9) is producing retrieval failure data, the Gap Analyst can incorporate feedback signals — not just corpus distribution counts. States or register combinations that generate negative engagement signals (dwell-length-adjusted disengagement, explicit downvotes) become higher-priority gap targets than those inferred from counts alone.

### What Does Not Scale

The human verbatim verification gate at the final step does not scale automatically. As corpus size grows, verbatim verification becomes the primary bottleneck. The long-term solution is official transcript access (via API or partnership) rather than manual paste — but the gate itself should remain human-controlled. The trust model depends on it.

---

## 16. Implementation Plan

The 8 modules are implemented as local TypeScript scripts. All share the contract library at `scripts/lib/discovery.ts`.

| Module | Script | npm script | Status |
|---|---|---|---|
| Shared contract lib | `scripts/lib/discovery.ts` | — | Implemented |
| Gap Analyst | `scripts/detect-corpus-gaps.ts` | `npm run detect-gaps` | Implemented |
| Source Scout | `scripts/find-source-candidates.ts` | `npm run find-source-candidates` | Implemented |
| Evaluator / Moment Scout | `scripts/evaluate-sio-candidate.ts` | `npm run evaluate-candidate` | Implemented |
| Novelty / Dedup | `scripts/score-candidate-novelty.ts` | `npm run score-candidate-novelty` | Implemented |
| Source / Media Verifier | `scripts/verify-candidate-source.ts` | `npm run verify-candidate-source` | Implemented |
| Review Queue | `scripts/review-candidates.ts` | `npm run review-candidates` | Implemented |
| Drafter | `scripts/draft-sio-from-candidate.ts` | `npm run draft-sio-from-candidate` | Implemented |
| Orchestrator | `scripts/run-sio-discovery-agent.ts` | `npm run discover-sios` | Implemented |

**Candidate files.** Live in `corpus/candidates/*.yaml`. Template at `corpus/candidates/candidate_template.yaml`. See `corpus/candidates/README.md` for the full candidate lifecycle guide.

**Draft files.** Live in `corpus/drafts/*.md`. Never served to users. The SIO loader reads only `corpus/sios/`.

**Gap report.** Written by the Gap Analyst to `ai/guides/corpus_gap_detection_report.md`. Regenerated on every `npm run detect-gaps` run. The current report reflects 19 SIOs as of 2026-05-25.

**Review queue.** Written by the Review Queue module to `ai/guides/candidate_review_queue.md`. Regenerated on every `npm run review-candidates` run.

---

## 17. What Remains Human-Controlled

This section is a complete list of the decisions and actions that the discovery system never performs automatically. Any of these that are performed by a script would constitute a violation of the system's design.

| Decision or action | Why it is human-only |
|---|---|
| Writing any file to `corpus/sios/` | Active corpus write requires human accountability for quality and attribution |
| Setting `human_review_status: approved` | Approval requires independent human review against the full quality checklist |
| Setting `transcript_verified: true` | Verbatim claim requires a human who has read the official transcript |
| Choosing which gap to fill next | Strategic prioritization of corpus direction is a human editorial decision |
| Creating a candidate YAML | Deciding a moment is worth pursuing requires human judgment about its quality and gap-fit |
| Confirming a YouTube `video_id` as verified | Requires playback confirmation on the official channel; machine search is insufficient |
| Pasting a TED verbatim transcript | TED transcripts are JS-rendered; only a human can paste the official text |
| Overriding a score or recommendation | Human review notes may override any score; the human judgment supersedes the LLM judge |
| Rejecting a high-scoring candidate | A candidate may score well but have a source concern a human identifies; rejection is always human |
| Approving any candidate for production | The final gate is always a human who has read the draft and verified the source |

The design principle is: the agent accelerates the work a human would do and surfaces the decisions a human needs to make. The human makes all of them.
