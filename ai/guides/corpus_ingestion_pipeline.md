# Silhouette — Component 5: Corpus / Ingestion Pipeline

> **Summary:** This document defines the operational process by which approved source content becomes production-ready Structured Insight Objects (SIOs) stored in the retrieval index. It covers the full pipeline from source pre-evaluation through transcript acquisition, AI-assisted triage, human insight extraction, metadata tagging, human review and approval, embedding generation, and indexing. It also defines the tagging guidelines for each controlled vocabulary field, the quality gates at each pipeline stage, failure handling, and the corpus health processes that sustain quality over time. This document is the operational bridge between the editorial decisions of Component 2 (Source Strategy) and the retrieval architecture of Component 3 (Retrieval Philosophy). It does not specify vector database technology, embedding model, or production tooling.

> **How to use this document:** Read after `content_source_strategy.md`, `retrieval_philosophy.md`, and `user_problem_model.md`. This document implements the data model defined in Component 3 — every SIO field referenced here is defined there. This document defines how taggers produce those fields consistently, how the pipeline enforces quality gates, and what must be true before any SIO enters the index. If you are about to ingest your first episode, start at Section 5 (Main System Flow).

---

## 1. Purpose and Scope

### What This Component Is

The Corpus / Ingestion Pipeline is the process layer responsible for transforming approved source content into the indexed, metadata-tagged Structured Insight Objects that the retrieval engine queries. It is the operational answer to the question: given an approved podcast episode or interview, how do we turn that episode into a set of retrievable insights?

Concretely, this component defines:

- How to evaluate an episode before committing to full ingestion
- How to acquire and prepare a transcript for extraction
- How to identify insight-dense candidate segments within a transcript
- How to extract a well-formed insight excerpt at the right length
- How to write a high-quality key claim
- How to apply each metadata tag correctly and consistently
- What the human review process checks for and how approval works
- How Source Objects and Insight Objects are created in sequence
- How embeddings are generated and SIOs are indexed
- How corpus health is monitored and maintained over time

### What This Component Is Not

- **Not the source evaluation framework.** Source eligibility, the scoring rubric, and the approved source list are defined in Component 2. This component begins after a source has been approved.
- **Not the retrieval engine.** Indexing ends the pipeline. What happens when the index is queried is Component 6.
- **Not the SIO data model.** The complete metadata schema — every field, its allowed values, and its MVP phase — is defined in Component 3. This document defines how to produce those fields correctly during ingestion.
- **Not a production build specification.** This document defines what the pipeline must accomplish. It does not specify the technology stack, automation tooling, or code architecture.
- **Not the evaluation framework for retrieval quality.** The pipeline produces the corpus. Retrieval quality — whether the corpus enables good matches — is evaluated by Component 6's evaluation plan and Component 9's feedback loop.

### Where This Component Sits in the Architecture

```
User Problem Model     →  defines state taxonomy for primary_state_tag
User Resonance Model   →  defines insight_type and voice_register vocabularies
Source Strategy        →  defines which sources are approved and what makes content eligible
Retrieval Philosophy   →  defines the SIO data model, embedding target, and quality thresholds
         ↓
[Component 5: Corpus / Ingestion Pipeline] ← you are here
         ↓
Retrieval Engine       →  queries the indexed corpus
Feedback / Quality Loop →  logs retrieval failures; references corpus gaps
```

---

## 2. Design Principles

### 1. The unit of ingestion is the unit of retrieval.
Every SIO that enters the pipeline should be treated as a product decision, not a data processing task. An ingested SIO will be shown to a real user in a stuck moment. Every judgment about what to extract, how to write the key claim, and how to tag it should be made with that user in mind. Editorial quality is not a constraint on ingestion speed — it is the point of the process.

### 2. AI assistance accelerates curation; it does not replace judgment.
AI tools can help identify candidate segments, draft key claims and content summaries, and flag potential tagging mismatches. They cannot reliably make the judgments that matter most: whether an insight is genuinely state-relevant, whether it stands alone, or whether a credibility tier assignment is accurate. The boundary between AI assistance and human judgment must be explicit and enforced.

### 3. Consistency requires calibration, not just guidelines.
Tagging guidelines reduce variance. They do not eliminate it. Two experienced taggers reading the same excerpt will still disagree on primary_state_tag and voice_register without a shared calibration set and agreement measurement. Building calibration into the pipeline before the corpus is large enough for inconsistency to cause problems is cheaper than fixing a mistagged corpus later.

### 4. Gate quality at entry — do not clean up the corpus after indexing.
A weak SIO inside the index is harder to identify and remove than a rejected SIO that never entered. Every quality decision — excerpt length, key claim clarity, tagging accuracy, standalone comprehensibility — must be made before an SIO is approved for indexing, not retroactively during a retrieval audit. The review step is not optional overhead; it is the quality gate.

### 5. Concentration limits must be monitored in real time.
The corpus concentration limit (max 3 SIOs per speaker per state, per Component 3) is meaningless if it is checked only at the end of a batch. Taggers must see the current speaker/state count during tagging to make informed decisions about whether a new SIO adds genuine diversity or exceeds the limit.

### 6. Transcripts are source material, not finished text.
Auto-generated and third-party transcripts contain errors. The pipeline must define a cleaning standard — what can be corrected and what constitutes the verbatim record — so that tagger-to-tagger variance in transcript cleaning does not create inconsistent corpus text. A fixed cleaning standard applied uniformly is more valuable than "best effort" cleaning done differently each time.

### 7. Source Objects come before Insight Objects.
The two-tier data model (Component 3) requires Source Objects to exist before any SIO from that episode is created. Creating an SIO without a parent Source Object is a data integrity error. The pipeline must enforce this sequence.

### 8. The pipeline serves the corpus state of which the retrieval engine is aware.
Every pipeline action — creating, updating, or removing an SIO — must be reflected in the retrieval index. Approved SIOs that are not indexed are invisible to retrieval. Removed SIOs that remain indexed will be returned to users from removed content. Index state and corpus state must stay in sync.

### 9. Sparse coverage is worse than no coverage.
If a state has only 2 approved SIOs, the retrieval engine's pool-size safety clause (Component 3) will trigger constantly for that state, and the fallback behavior will dominate. An under-built state creates a worse user experience than a state that is honestly not yet served. Do not add low-quality SIOs just to fill a state. Set minimum viable coverage targets and build to them with quality.

### 10. The pipeline is itself a learning artifact.
Every tagging session, every calibration disagreement, and every rejected SIO is information about where the pipeline is inconsistent or where the source strategy needs refinement. This information should be logged and reviewed periodically, not discarded. The pipeline produces a corpus and a record of how it was built — both have value.

---

## 3. Relationship to Existing Components

### User Problem Model (Component 1)

The state taxonomy — six stuck states with controlled vocabulary (`direction-collapse`, `engagement-drought`, `inaction-loop`, `possibility-paralysis`, `identity-transition`, `momentum-gap`) — is the primary classification system that every SIO must use. Taggers must have read Component 1 before tagging any SIO. The state definitions, distinguishing signals, and confusion pairs defined there determine when `direction-collapse` is right versus `engagement-drought`. The pipeline does not define the states — it applies them.

The MVP priority states (Direction Collapse, Engagement Drought, Inaction Loop) mean that corpus building should prioritize reaching minimum viable coverage for those three states before expanding to Possibility Paralysis, Identity Transition, and Momentum Gap.

### User Resonance Model

The insight_type taxonomy (`reframe`, `permission`, `mechanism`, `story`) and voice_register taxonomy (`direct/challenging`, `warm/affirming`, `intellectual/measured`, `vulnerable/personal`, `expert/scientific`) are used by taggers during metadata tagging. Taggers must have read the User Resonance Model. This document adds tagging guidelines (Section 7) that clarify how to apply each taxonomy value to a specific excerpt — the User Resonance Model defines what the values mean; this document defines how to decide which one applies.

The resonance diversity requirement from Component 2 — at least two distinct insight types and two distinct voice registers per MVP state — must be checked during corpus planning, not just during indexing. If all ingested Direction Collapse SIOs are tagged `intellectual/measured`, the corpus will fail users who need `vulnerable/personal` content.

### Content / Source Strategy (Component 2)

This component begins where Source Strategy ends. A source that has been approved, scored against the rubric, and added to the candidates list is ready for the episode-level pre-evaluation step of this pipeline. Source Strategy defines the "what" — what is eligible. The Ingestion Pipeline defines the "how" — how eligible content becomes an SIO.

The insight density standard from Component 2 (2–3 genuinely retrievable insights per hour) applies at the episode level. If a pre-evaluated episode doesn't meet this threshold during content triage, it should not proceed to full extraction even if the source overall is approved.

### Retrieval Philosophy (Component 3)

Component 3 defines the complete data model this pipeline must produce. The following Component 3 decisions are binding constraints on this pipeline:

- **The two-tier object model:** Source Objects must exist before Insight Objects. One Source Object per episode; multiple SIOs per episode are permitted.
- **The metadata schema:** All MVP-Required fields must be complete before any SIO is approved. No exceptions. The field list, allowed values, and tagging method columns from Component 3's schema are the authoritative tagging reference.
- **The embedding target:** Embeddings are generated from the combined `key_claim + transcript_excerpt` field. No other embedding strategy should be used without revising Component 3 first.
- **The excerpt length:** 75–250 words. Below 75, the insight loses standalone context. Above 250, the excerpt is not a discrete moment.
- **Human review requirement:** `human_review_status` must be set to `approved` before any SIO is indexed.
- **Concentration limit:** Maximum 3 SIOs per speaker per state. This is enforced during the tagging step.
- **AI-assistance boundary:** `content_summary` and `key_claim` may be AI-drafted (draft + human review). `primary_state_tag`, `insight_type`, `voice_register`, `credibility_tier`, `intensity_level`, and `tagger_confidence` must be human-tagged at MVP. This rule holds until a validation study shows >85% AI-human agreement on a 50-SIO sample.

### Intake / Diagnostic Flow (Component 4)

The state taxonomy and resonance dimensions that intake produces in the RetrievalQuery must exactly match the taxonomy the pipeline applies during tagging. If intake classifies a user as `direction-collapse` and the corpus has SIOs tagged `Direction-Collapse` (capital D) or `dc`, the state filter will fail silently. Controlled vocabulary consistency between intake and the corpus is a pipeline enforcement responsibility: the pipeline must validate that all tags match the exact allowed values in the schema.

---

## 4. Subcomponent Overview

### 4.1 Source & Episode Pre-Evaluation

**What it is:** A lightweight assessment of a specific episode (or piece of content) from an approved source before committing to full transcript acquisition and ingestion.

**Why it matters:** Episode quality varies significantly within even the best sources. A 3-hour Tim Ferriss episode with 20 minutes of high-density content and 2.5 hours of sponsor reads and tangential biography is not worth full ingestion effort. Pre-evaluation protects pipeline capacity.

**Inputs:** An approved source (from Component 2), a specific episode candidate.

**Outputs:** An episode disposition: `approved for ingestion`, `conditionally approved` (specific segments worth extracting), or `not this episode`.

**Pre-Evaluation Checklist — answer each question before committing to full ingestion:**

| Question | Answer | Decision |
|---|---|---|
| **1. Does the guest / speaker have relevant credibility for the target audience?** (lived career/purpose experience, domain expertise, or research background) | Yes / No | No → not this episode |
| **2. Does the episode topic connect to at least one MVP state** (Direction Collapse, Engagement Drought, Inaction Loop) based on the title and description? | Yes / Possibly / No | No → not this episode; Possibly → proceed to #3 |
| **3. In a 5-minute skim of the auto-generated transcript, can you find at least one candidate segment where the speaker describes their own internal experience** (not just giving advice)? | Yes / No | No → not this episode |
| **4. Is the estimated content-to-filler ratio reasonable?** (Rough rule: if sponsor reads + biographical setup + tangential topics appear to consume >60% of the transcript, skip) | Yes / No | No → not this episode or mark specific segments only |
| **5. Is transcript acquisition feasible?** (Official transcript, reliable auto-caption, or clean audio for third-party transcription) | Yes / With effort / No | No → defer until transcript available |
| **6. Is there a known concern** (primarily promotional tone, credibility event pending, content primarily generic advice without personal depth)? | None / Yes | Yes → document and skip unless specific countervailing segment identified |

**Disposition:**
- All 6 questions pass → `approved for ingestion`
- Questions 1–3 pass but #4 or #5 are conditional → `conditionally approved` (note the specific segments or transcript concern)
- Any of questions 1–3 fail → `not this episode` (document the reason)

**Failure modes:** Over-qualifying episodes (too cautious, resulting in corpus gaps) or under-qualifying (committing to ingestion of low-density episodes that waste tagging effort).

**MVP vs. future:** MVP — manual pre-evaluation using the checklist above. Future — lightweight AI pre-screening of transcripts to estimate density before human review.

---

### 4.2 Transcript Acquisition & Cleaning

**What it is:** Obtaining a text version of the episode content and preparing it for use as source material for insight extraction.

**Why it matters:** The `transcript_excerpt` field is verbatim source text. The quality of the transcript directly affects the quality of excerpts in the corpus. A transcript with significant errors produces excerpts that misrepresent what was said, which damages both attribution accuracy and user trust.

**Inputs:** An approved episode.

**Outputs:** A cleaned transcript ready for triage, with `transcript_source` documented.

**Transcript source types (from Component 3 schema):**
- `official` — Host or show provides a transcript. Highest quality. Use when available.
- `auto-generated` — Platform-generated captions (YouTube, Spotify, Whisper). Variable quality. Requires cleaning.
- `third-party` — Services like Rev.com, Otter.ai, or Whisper-based tools. Quality depends on audio clarity.
- `manual` — Human transcription. Highest effort; reserved for critical segments without other options.

**Cleaning standard:**
- **Correct:** Speaker identification errors, obvious mishearing errors (wrong word that makes no sense in context), timestamp format inconsistencies, run-on sentence boundaries.
- **Acceptable:** Removing filler words ("um", "uh", "like" as filler) only when they interrupt the sense of the excerpt. Note this in `transcript_source`: `auto-generated (light filler removal)`.
- **Not acceptable:** Restructuring sentences, paraphrasing, adding words not present, or correcting factual errors in what was said (the speaker said it; it belongs in the transcript).

**Quality threshold:** If more than ~15% of a transcript segment requires substantial reconstruction (not just light cleaning), the transcript source should be upgraded (try a different transcription service or manual re-transcription of the target segment) before proceeding. Do not extract from low-quality source text.

**Failure modes:** Proceeding with a transcript too corrupted to produce clean verbatim excerpts; applying inconsistent cleaning across sessions; losing attribution information during transcript processing.

**MVP vs. future:** MVP — manual acquisition and light cleaning. Future — a lightweight transcript cleaning pass using a small language model (flag errors, suggest corrections, human confirms).

---

### 4.3 AI-Assisted Content Triage

**What it is:** A review of the cleaned transcript to identify candidate segments that may contain high-density, state-relevant insight moments worth extracting. AI assistance is explicitly permitted at this step.

**Why it matters:** A 90-minute transcript is approximately 12,000–16,000 words. Human review of the full text to find 3–5 extractable insight moments is time-consuming. AI pre-screening can flag candidate timestamps in minutes, reducing the human review burden to evaluating candidates rather than scanning the full transcript.

**Inputs:** A cleaned transcript, the list of target states for this episode, the insight density threshold.

**Outputs:** A set of candidate timestamp ranges (approximately 3–10 per episode) flagged for human review, with a brief note on why each was flagged.

**AI triage prompt template (adapt to the specific transcript and episode context):**

```
I have a transcript of [podcast name], episode "[episode title]", featuring [speaker name].

I need to find 3–8 segments in this transcript that contain high-value, standalone insights 
for young professionals who feel stuck in their career, purpose, or motivation.

For each candidate segment, I am looking for:
- The speaker describes their OWN internal experience of a difficult transition, stuck period, 
  or moment of realization — not generic advice directed at the audience
- The segment is 90–300 words and could be understood by someone who hasn't heard the episode
- The insight involves a specific moment, named experience, or concrete claim — not a general 
  statement about mindset or productivity
- The speaker is the primary voice (not summarizing someone else's story)

For each candidate segment you identify:
1. Provide the approximate timestamp range
2. State in one sentence what makes this segment valuable
3. Rate your confidence: HIGH (clearly meets all criteria), MEDIUM (meets most criteria but 
   has some filler or context dependency), or LOW (speculative — may need human review)
4. Name the type of insight: STORY (speaker's narrative), MECHANISM (explanation of why 
   something works), REFRAME (changes what something means), or PERMISSION (licenses a 
   feeling or choice)

Return HIGH-confidence candidates first, then MEDIUM, then LOW.
Limit to 10 candidates maximum.

Transcript:
[paste transcript here]
```

**After receiving AI output:** Human reviews all HIGH-confidence candidates, then MEDIUM if more candidates are needed. LOW-confidence candidates are reviewed only if the episode appears under-served by HIGH/MEDIUM finds. Reject any AI candidate that, on human review, is clearly generic advice rather than personal experience.

**Human role at this step:** Review all AI-flagged candidates. The human may reject flagged candidates (AI overflagged), add candidates the AI missed, and add preliminary notes on why each candidate is promising.

**Output format per candidate:**
```
Episode: [title]
Timestamp: [HH:MM:SS – HH:MM:SS]
Speaker: [name]
Preliminary state: [suspected state]
Triage note: [why this segment is worth reviewing]
Status: [accepted for extraction / rejected with reason / uncertain]
```

**Failure modes:** AI flagging too many candidates (reviewer fatigue), AI missing the highest-quality moments (too narrow a prompt), human reviewing candidates uncritically without applying state-relevance judgment.

**MVP vs. future:** MVP — AI triage prompt applied manually; human reviews output. Future — a structured triage tool with side-by-side transcript and candidate review UI.

---

### 4.4 Human Insight Extraction

**What it is:** The step where a human tagger selects the exact transcript segment for each approved candidate and trims it to the 75–250 word range that will become the `transcript_excerpt`.

**Why it matters:** This is the primary editorial judgment call in the pipeline. Two excerpts from the same timestamp range can be very different in quality depending on where the human tagger begins and ends the cut. The goal is to find the tightest window that includes the insight's full setup and resolution without unnecessary preamble or aftermath.

**Inputs:** Triage-approved candidate timestamps, cleaned transcript.

**Outputs:** A verbatim `transcript_excerpt` (75–250 words) for each candidate SIO.

**Extraction guidelines:**
- **Start:** Begin immediately before the speaker introduces the specific experience or claim that makes this moment retrievable. Do not include setup that belongs to a different topic.
- **End:** End after the moment resolves — after the insight, reframe, or story completes its natural conclusion. Cut before the conversation shifts to a new topic.
- **Target length:** 120–180 words is the optimal range. Below 75 words: too short to stand alone. Above 250 words: split into two SIOs or tighten.
- **Standalone test:** Read the excerpt cold, with no episode context. Does it make sense? Does it contain the full insight? Would a user in the target state understand its relevance? If no: expand slightly, restructure the cut, or reject the candidate.

  *Passing example:* "I turned down the romantic lead roles because I wanted to be taken seriously as an actor, and I went from making $14.5 million a picture to zero... Because when you're making $14.5 million, you can't be honest — everything costs too much to tell the truth." — A user in Direction Collapse reads this cold and immediately understands what it's saying about external success preventing honest self-direction. No episode context required.

  *Failing example:* "And that's when I realized what he had been talking about in the first part of our conversation." — This references something from earlier in the episode. A user reading it cold has no idea what "he had been talking about" means. The excerpt fails the standalone test. Expand backward to include the referenced content, or find a different candidate.

**When to split a candidate into two SIOs:** If a transcript segment contains two distinct insights that happen to be adjacent — different speakers, or the same speaker addressing two different aspects of the stuck state — extract as two separate SIOs. Each must independently pass the standalone test.

**When to reject a candidate after extraction attempts:** If, after 2–3 trimming attempts, the excerpt cannot be made standalone or within the length range without losing the insight, reject the candidate. Log the rejection reason.

**Failure modes:** Excerpts that contain too much contextual preamble (first 50 words are setup that doesn't contain the insight); excerpts that are cut too short and lose the resolution; extracting a segment where the insight belongs to a third party the speaker is describing rather than the speaker themselves.

---

### 4.5 Source Object Creation

**What it is:** Creating the Tier 1 Source Object for the episode being ingested. This must happen before any SIOs from that episode are created.

**Why it matters:** Component 3's two-tier model requires every SIO to reference a parent Source Object via `source_id`. An SIO without a valid Source Object is an orphaned record that cannot provide full attribution context. Source Object creation is a one-time, per-episode action.

**When it happens:** Immediately after an episode is approved for full ingestion (after pre-evaluation, before transcript triage). Not at the end of the pipeline.

**Fields required for Source Object creation:**

| Field | Source | Notes |
|---|---|---|
| `source_id` | Auto-generated UUID | Format: `src-[show-slug]-[episode-slug]-[year]` (human-readable preferred over raw UUID) |
| `source_type` | Manual | One of: `long-form interview podcast`, `solo educational`, `author crossover`, `ted talk`, `youtube native` |
| `show_or_platform` | Manual | Full show name string |
| `episode_or_content_title` | Manual | Full episode title as published |
| `episode_or_content_date` | Manual | ISO 8601 (YYYY-MM-DD) |
| `source_url` | Manual | Canonical URL to episode |
| `transcript_source` | Manual | One of the four transcript_source values; updated if transcript source changes |
| `source_score` | From rubric | Inherited from Source Strategy evaluation |

**Failure modes:** Creating SIOs before a Source Object exists; creating multiple Source Objects for the same episode; using a non-canonical URL that may change.

---

### 4.6 Metadata Tagging

**What it is:** Applying the full SIO metadata schema to each extracted insight. This is the step where the `primary_state_tag`, `insight_type`, `voice_register`, `key_claim`, `credibility_tier`, `intensity_level`, and other fields are determined.

**Why it matters:** The retrieval engine's state filter, resonance filter, and scoring logic all depend on the accuracy and consistency of these tags. A mistagged `primary_state_tag` means a retrieval failure that is invisible in logs. Inconsistent `insight_type` tags across taggers mean resonance matching is unreliable.

**Inputs:** Approved `transcript_excerpt` for each SIO.

**Outputs:** A complete set of all MVP-Required and MVP-Recommended tags for each SIO, plus `tagger_confidence` for the overall tagging judgment.

**AI assistance permitted:** `content_summary` (draft + human review), `key_claim` (AI proposes; human validates — see Section 7.3). All other required tags must be human-applied at MVP.

**Concentration limit check — how to do it in a spreadsheet-based system:**
Before finalizing `primary_state_tag` for any SIO, check how many SIOs from the same speaker already exist in the corpus for that state. The limit is 3 per speaker per state.

In a spreadsheet tracking system:
1. Maintain a "Concentration Summary" tab with columns: `speaker_name | primary_state_tag | approved_count`.
2. Before tagging `primary_state_tag`, filter the Concentration Summary by the speaker and the state you are about to assign. Read the current count.
3. If count is already 3: do not tag this state for this speaker. Either tag a different state if the excerpt genuinely supports one, or reject this SIO.
4. After an SIO is approved: increment the corresponding count in the Concentration Summary.

This is a 2-minute lookup per SIO. It is not optional — a concentration violation that reaches the index is harder to fix than one caught during tagging.

**Full tagging guidelines are in Section 7.**

**Failure modes:** Tagging from personal resonance rather than user-perspective assessment; choosing a secondary state as the primary; applying `direct/challenging` to speaker register without checking for genuine confrontational intent; low `tagger_confidence` not flagged appropriately; skipping the concentration check because the lookup takes extra time.

---

### 4.7 Human Review & Approval

**What it is:** An independent review of each tagged SIO by a reviewer who did not extract or tag it. The reviewer applies the well-matched rubric dimensions that can be assessed at ingestion time (from Component 3, Section 8) and makes an approval decision.

**Why it matters:** Without independent review, all tagging errors become permanent corpus errors. The reviewer is the last quality gate before an SIO enters the index.

**Inputs:** A completed SIO with all MVP-Required fields populated.

**Outputs:** `human_review_status` transition from `pending` → `approved` or `flagged`.

**What the reviewer checks (at minimum):**
1. Is the `transcript_excerpt` verbatim and within the 75–250 word range?
2. Does the excerpt stand alone — is it comprehensible without episode context?
3. Does the `primary_state_tag` correctly represent the most specific state this insight addresses?
4. Is the `key_claim` truly standalone — does it produce a response on its own?
5. Are `insight_type` and `voice_register` accurately applied per the tagging guidelines?
6. Is `intensity_level` appropriate — would this excerpt feel right for a user at `moderate` intensity (or as tagged)?
7. Is `attribution_text` complete and formatted correctly?
8. Does this SIO pass the "would I show this to a user" test?

**Approval:** `human_review_status = approved`. SIO is queued for embedding and indexing.

**Flagged:** `human_review_status = flagged`. A note is added explaining what needs correction. Returns to the tagger for revision. If the core issue cannot be resolved (the excerpt doesn't stand alone, the state tag is contested), the SIO is rejected.

**Rejection criteria (do not approve, do not flag — remove):**
- Excerpt requires episode context to make sense — not fixable by shortening
- The insight belongs to a third party being described, not the attributed speaker
- `primary_state_tag` does not match any state this insight would genuinely help
- The attributed quote contains a transcription error that changes the meaning

**MVP vs. future:** MVP — a second human who understands the taxonomy reviews each SIO. Future — reviewer checklists in structured form, with required response fields that force explicit sign-off on each dimension.

---

### 4.8 Embedding Generation

**What it is:** Generating vector embeddings for each approved SIO using the embedding target defined in Component 3.

**Why it matters:** The embedding is the semantic representation that drives cosine similarity matching in the retrieval engine. The embedding target — what text is embedded — directly determines which queries will find which SIOs.

**Embedding target (from Component 3):** The combined string of `key_claim` + `transcript_excerpt`. These are concatenated with a separator:

```
[key_claim text]. [transcript_excerpt text]
```

**Why this format:** The `key_claim` is the most precise semantic anchor — the tagger's distillation of the insight's core claim. Prepending it to the excerpt ensures the embedding is anchored to the high-information sentence, not just the first 50 words of the excerpt which may be setup rather than insight.

**What is not embedded at MVP:**
- `content_summary` (descriptive prose, not the retrievable semantic content)
- Metadata tags (handled via structured filter, not semantic search)
- `attribution_text` (not part of semantic matching)

**Model choice:** Technology decision deferred to Component 6 (Retrieval Engine). The format of the embedding input string is specified here; the embedding model is not.

**Failure modes:** Embedding only the `key_claim` (loses excerpt specificity); embedding only the `transcript_excerpt` (loses the precision of the key claim anchor); embedding the `content_summary` instead (wrong semantic target); embedding before review approval.

---

### 4.9 Indexing & Storage

**What it is:** Writing the approved SIO (embedding + structured metadata) to the retrieval index, and writing the Source Object to the source store if not already present.

**Why it matters:** An approved, embedded SIO that is not indexed is invisible to retrieval. Index state must exactly reflect corpus state.

**What is written to the retrieval index (per SIO):**
- The vector embedding (from Step 4.8)
- All MVP-Required structured metadata fields (used for filtering and boosting)
- `insight_id` (primary key)
- `source_id` (foreign key to Source Object)
- `human_review_status = approved` (gate check — only approved SIOs are indexed)

**What is written to the Source Object store:**
- The full Source Object for the episode (if this is the first SIO from this episode)
- Updated `source_id` reference if any Source Object fields have changed

**Indexing gate:** Only SIOs where `human_review_status = approved` may be indexed. This check should be enforced by the indexing process itself, not just assumed.

**Failure modes:** Indexing unapproved SIOs; writing SIOs without a corresponding Source Object in the source store; indexing stale embeddings after a `key_claim` revision; failing to remove a rejected SIO from the index after it was previously indexed.

---

### 4.10 Corpus Health & Maintenance

**What it is:** Ongoing processes that sustain corpus quality after initial ingestion.

**Why it matters:** A corpus that is excellent on day 1 can degrade over time through speaker credibility events, under-serving states identified by retrieval gaps, and concentration imbalances that accumulate across ingestion sessions.

**Processes (see Section 9 for detailed rules):**
- Concentration limit audits (periodic counts of SIOs per speaker per state)
- Retrieval gap monitoring (which states trigger the pool-size safety clause most often)
- Performance-based review (SIOs flagged for consistent negative engagement in the Feedback Loop)
- Speaker credibility monitoring (removal when credibility events occur)
- Periodic rubric re-scoring of approved sources (every 18 months, per Component 2)

---

## 5. Main System Flow

The pipeline has three tracks that operate in sequence at the episode level: source/episode track, insight track, and technical track.

### Track 1: Source & Episode Level

**Step 1.1 — Episode Pre-Evaluation**

| Attribute | Detail |
|---|---|
| **Goal** | Determine whether a specific episode from an approved source is worth committing to full ingestion |
| **Input** | An approved source + a specific episode candidate |
| **Output** | Episode disposition: `approved`, `conditionally approved`, or `not this episode` |
| **Owner** | Pipeline operator (human) |
| **Quality gate** | Episode must address ≥1 MVP state; estimated insight density ≥2 retrievable insights per hour; transcript acquisition feasible |
| **Common failure modes** | Approving an episode based on source reputation rather than episode-level density; rejecting a conditionally-good episode rather than marking specific segments |

**Step 1.2 — Transcript Acquisition & Cleaning**

| Attribute | Detail |
|---|---|
| **Goal** | Produce a clean, attributed text version of the episode for insight extraction |
| **Input** | An approved episode |
| **Output** | Cleaned transcript with `transcript_source` documented; timestamp markers aligned |
| **Owner** | Pipeline operator |
| **Quality gate** | Fewer than ~15% of target segments require substantial reconstruction; `transcript_source` field documented; speaker attribution preserved throughout |
| **Common failure modes** | Proceeding with a heavily corrupted auto-generated transcript; inconsistent cleaning standards across sessions; losing timestamp alignment during cleaning |

**Step 1.3 — Source Object Creation**

| Attribute | Detail |
|---|---|
| **Goal** | Create the Tier 1 Source Object before any SIOs are created from this episode |
| **Input** | Episode metadata (title, date, URL, show, source_score) |
| **Output** | A completed Source Object stored in the source store, with a `source_id` for SIO referencing |
| **Owner** | Pipeline operator |
| **Quality gate** | All MVP-Required Source Object fields populated; `source_id` is unique and human-readable; `source_url` is canonical |
| **Common failure modes** | Creating SIOs before the Source Object exists; using a non-canonical URL; duplicate Source Objects for the same episode |

---

### Track 2: Insight Level

**Step 2.1 — AI-Assisted Content Triage**

| Attribute | Detail |
|---|---|
| **Goal** | Identify candidate insight-dense segments for human review |
| **Input** | Cleaned transcript; target states for this episode |
| **Output** | A set of candidate timestamp ranges (3–10 per episode) with triage notes |
| **Owner** | AI (draft) + human (review and refinement) |
| **Quality gate** | All candidates reviewed by a human; candidates that are clearly non-state-relevant are rejected at this step; candidates that are promising are marked `accepted for extraction` |
| **Common failure modes** | Treating all AI-flagged candidates as valid without human review; failing to add candidates the AI missed; triaging based on topic adjacency rather than state relevance |

**Step 2.2 — Human Insight Extraction**

| Attribute | Detail |
|---|---|
| **Goal** | Select and trim the transcript segment to a standalone, 75–250 word `transcript_excerpt` |
| **Input** | Triage-accepted candidates; cleaned transcript |
| **Output** | A verbatim `transcript_excerpt` per candidate; a rejection decision for candidates that don't yield a clean excerpt |
| **Owner** | Human tagger |
| **Quality gate** | Excerpt is 75–250 words; passes standalone test (comprehensible without episode context); insight is attributable to the named speaker (not a third party being described) |
| **Common failure modes** | Excerpts with too much non-insight preamble; excerpts that cut before the insight resolves; attributing an excerpt to the speaker when they are describing someone else's experience |

**Step 2.3 — Metadata Tagging**

| Attribute | Detail |
|---|---|
| **Goal** | Apply all MVP-Required metadata fields to each extracted SIO |
| **Input** | A `transcript_excerpt` and the source_id of its parent Source Object |
| **Output** | A fully tagged SIO with all MVP-Required fields populated |
| **Owner** | Human tagger (AI may draft `key_claim` and `content_summary`; all other required fields human-tagged) |
| **Quality gate** | All MVP-Required fields present; concentration limit checked (≤3 SIOs per speaker per state currently in corpus); tags use exact controlled vocabulary values |
| **Common failure modes** | Assigning a state based on topic rather than the specific stuck-state being addressed; applying `direct/challenging` register to any forceful speaker without checking for genuine confrontational intent; `key_claim` that requires the excerpt to make sense |

**Step 2.4 — Human Review & Approval**

| Attribute | Detail |
|---|---|
| **Goal** | Independent review of each SIO against the quality criteria; final approval before indexing |
| **Input** | A fully tagged SIO |
| **Output** | `human_review_status = approved` or `flagged` (with correction note) |
| **Owner** | A different human than the tagger (independent reviewer) |
| **Quality gate** | All 8 review checks passed (Section 4.7); no rejection-criteria conditions present |
| **Common failure modes** | Reviewer rubber-stamping rather than independently evaluating; reviewer approving SIOs where `primary_state_tag` is contested without flagging for discussion |

---

### Track 3: Technical Level

**Step 3.1 — Embedding Generation**

| Attribute | Detail |
|---|---|
| **Goal** | Generate a vector embedding for each approved SIO |
| **Input** | `key_claim + transcript_excerpt` combined string (format: `[key_claim]. [transcript_excerpt]`) |
| **Output** | A vector embedding for each approved SIO |
| **Owner** | Automated (post-approval) |
| **Quality gate** | Only `human_review_status = approved` SIOs are embedded; embedding generated from the correct combined field string |
| **Common failure modes** | Generating embeddings before review approval; embedding only the `key_claim` or only the `transcript_excerpt`; regenerating stale embeddings without updating the index |

**Step 3.2 — Indexing**

| Attribute | Detail |
|---|---|
| **Goal** | Write the approved SIO and its embedding to the retrieval index; update the source store |
| **Input** | Approved SIO + embedding; Source Object (already in source store or being added) |
| **Output** | SIO queryable by the retrieval engine; Source Object resolvable by `source_id` |
| **Owner** | Automated (post-embedding) |
| **Quality gate** | Index gate check: `human_review_status = approved` is verified by the indexing process before write; `source_id` resolves to an existing Source Object |
| **Common failure modes** | Indexing unapproved SIOs; SIOs whose `source_id` has no matching Source Object; stale embeddings not regenerated after `key_claim` revision |

---

## 6. Data / Object Model

The complete metadata schema for Source Objects and Insight Objects (SIOs) is defined in Component 3 (Retrieval Philosophy), Sections 4.1 and 4.2. This document does not duplicate that schema. It adds pipeline-specific fields that are needed during ingestion but are not part of the retrieval metadata.

### 6.1 Pipeline-Specific SIO Fields

These fields are used during the pipeline process. They may be stored in a pipeline tracking system (not necessarily the retrieval index).

| Field | Type | Purpose |
|---|---|---|
| `pipeline_status` | Enum: `pending_triage`, `pending_extraction`, `pending_tagging`, `pending_review`, `approved`, `rejected` | Tracks where in the pipeline this SIO is |
| `tagger_id` | String | Which tagger applied the metadata tags |
| `reviewer_id` | String | Which reviewer conducted human review |
| `review_notes` | Free text | Reviewer's notes on corrections or concerns |
| `rejection_reason` | Free text | If rejected, the specific reason |
| `extraction_notes` | Free text | Tagger notes on any unusual extraction decisions |
| `key_claim_source` | Enum: `human`, `ai-draft-human-reviewed` | Documents whether key_claim was AI-assisted |
| `content_summary_source` | Enum: `human`, `ai-draft-human-reviewed` | Same for content_summary |
| `concentration_count_at_tagging` | Integer | Number of existing SIOs from this speaker in this state at the time of tagging — documents the concentration check |

### 6.2 Calibration Set

Before the first batch of ingestion, a calibration set of 10–15 pre-tagged SIOs should exist. These are reference examples that show the correct application of each controlled vocabulary value in real excerpts. They are not part of the retrieval index — they are a shared reference for taggers.

The calibration set should include:
- At least 2 examples per MVP state
- Examples that distinguish adjacent states (e.g., a Direction Collapse vs. Engagement Drought pair from similar excerpts)
- Examples of each insight_type
- Examples that distinguish voice_register values that are easy to confuse (intellectual/measured vs. expert/scientific; warm/affirming vs. vulnerable/personal)
- At least 1 example where the AI draft of `key_claim` was incorrect and required human revision — to illustrate the judgment being delegated to human review

### 6.3 Embedding Input Format

The final format for the embedding input string:

```
[key_claim text]. [transcript_excerpt text]
```

Example:
```
I had to go back to zero — the place where you can be honest about what you actually want. Because when you're making $14.5 million, you can't be honest — everything costs too much to tell the truth. I turned down the romantic lead roles because I wanted to be taken seriously as an actor, and I went from making $14.5 million a picture to zero. And I had to go to zero. Because I wasn't going to get those kinds of roles until I proved I'd do them for free...
```

The period-space separator ensures the key claim and excerpt are treated as a single coherent text by the embedding model, while the natural sentence break still demarcates the two elements.

---

## 7. Tagging Guidelines

These guidelines are specific instructions for applying each controlled vocabulary field during the tagging step. They supplement, not replace, the full definitions in Component 1 (states), the User Resonance Model (insight_type and voice_register), and Component 3 (schema).

### 7.1 Primary State Tag

**Tag from the user's perspective, not the speaker's topic.**
Ask: "A user in [state X] reads this excerpt. Does it address the specific internal experience of that state?" Not: "Is this speaker talking about topics associated with that state?"

**Use this decision tree for the six states — work through it top-down:**

```
Step 1 — Does the excerpt describe or respond to a specific external triggering event 
         (job loss, breakup, major success, move, life change)?
    YES → Identity Transition. Confirm: does the excerpt address identity disorientation 
          in the aftermath, not just the event itself? If yes: IT. If no: continue.
    NO  → Continue.

Step 2 — Was the stuck feeling triggered specifically by seeing where someone else is 
         (a comparison spike: a friend's promotion, a peer's company launch)?
    YES → Momentum Gap. Confirm: is the stuck feeling described as recent and spike-like 
          rather than chronic? If yes: MG. If no: continue.
    NO  → Continue.

Step 3 — Does the excerpt address the experience of having multiple real options 
         and being unable to choose among them?
    YES → Possibility Paralysis. Confirm: are multiple named options present? If yes: PP.
    NO  → Continue.

Step 4 — Does the excerpt address knowing specifically what to do and not doing it?
    YES → Consider Inaction Loop. Confirm: is one specific action or change named (not 
          multiple options)? If yes: IL. If no (multiple things / nothing specific): 
          reconsider PP or DC.
    NO  → Continue.

Step 5 — Does the excerpt respond to an experience where a specific job, role, or goal 
         still exists but the feeling of caring about it has gone flat?
    YES → Engagement Drought. Confirm: is the target still present — the speaker 
          is addressing someone who still has the goal but lost the feeling toward it?
          If yes: ED.
    NO  → Direction Collapse. The default for excerpts addressing lost direction, 
          absence of a forward target, or chronic low-level disorientation with no 
          named trigger.
```

**The most common tagging errors and their corrections:**

| Mistake | Why it happens | Correction |
|---|---|---|
| Tagging `inaction-loop` on "I kept not starting" language | Speaker uses inaction-like vocabulary but addresses uncertainty about what to pursue | Check Step 4: is one specific action named? If no, likely DC. |
| Tagging `engagement-drought` on "I feel flat at work" | Flatness language, but the speaker is addressing someone with no current target | Check Step 5: does a target still exist? If not, it's DC. |
| Tagging `direction-collapse` on comparison language | "Everyone else seems to have figured it out" appears chronic but was actually triggered by a specific event | Check Step 2: is there a named triggering comparison event? If yes, MG. |
| Tagging `identity-transition` on any major life change reference | Speaker is referencing a past event but the insight addresses chronic directionlessness | Check Step 1: is the excerpt about the disorientation of being in-between, or about general direction absence? |

**Minimum evidence for tagging a primary state:** The tagger must be able to complete this sentence before finalizing the tag: "A user in [state] would benefit from this excerpt because it directly addresses [specific stuck-state signal from C1]." If this sentence cannot be completed without generalizing, reconsider the primary state.

**When the same excerpt could serve two states equally:** This is rare. Apply the `secondary_state_tags` field. If the excerpt is genuinely addressing two distinct stuck states with equal force, consider whether it should be extracted as two SIOs (with different `key_claim` statements that frame the insight for each state).

---

### 7.2 Insight Type

Apply from the list: `reframe`, `permission`, `mechanism`, `story`.

**Decision rule — ask "what does this excerpt do for the user?"**

| If the excerpt... | Tag as |
|---|---|
| Changes what a concept means or what the situation IS — "what you're calling failure is actually information" | `reframe` |
| Grants the user explicit or implicit license to feel, want, or do something they've been blocking themselves from | `permission` |
| Explains WHY something happens — a causal mechanism that shifts attribution from personal failure to understandable process | `mechanism` |
| Narrates someone else's experience navigating a similar state — value comes from recognition and modeling | `story` |

**Common confusion pairs:**
- `reframe` vs. `mechanism`: A mechanism insight explains causation ("this is why your dopamine system does this"). A reframe changes the frame ("this isn't failure — it's course correction"). A mechanism insight may produce a reframe, but the primary tag is `mechanism` if the value is in the explanation, `reframe` if the value is in the reconceptualization.
- `story` vs. `permission`: A story is about someone else's journey. A permission insight is about what the speaker says is okay for the user to feel or be. If the excerpt is primarily narrative, tag `story`. If the speaker is explicitly granting a right or legitimizing an experience, tag `permission`.
- When an excerpt does two things: tag the one that makes it most valuable for users in the primary state. A story that also contains a mechanism is most useful as a `story` if the narrative is primary.

---

### 7.3 Voice Register

Apply from: `direct/challenging`, `warm/affirming`, `intellectual/measured`, `vulnerable/personal`, `expert/scientific`.

**Critical note:** Voice register is about HOW the insight is delivered, not what it says. Two excerpts can contain the same core reframe with completely different registers.

| Register | Definition | How to detect |
|---|---|---|
| `direct/challenging` | Confrontational; assumes capability; demands accountability; does not let the user off the hook | Speaker is pushing back on an excuse, naming a self-defeating pattern directly, or challenging the user's self-narrative |
| `warm/affirming` | Compassionate; validating; meets the user where they are; primarily affirming before guiding | Speaker is primarily saying "what you're feeling is real and understandable" — emphasis on normalizing |
| `intellectual/measured` | Analytical; precise; evidence-respecting; the value comes from the clarity of thinking, not emotional resonance | Speaker is reasoning through something carefully; value is in the logic or precision of the argument |
| `vulnerable/personal` | Speaker reveals their own struggle, uncertainty, fear, or confusion — not positioned as an expert looking back, but as someone inside the experience | First-person emotional disclosure; "I was terrified," "I didn't know either," "I still don't have this figured out" |
| `expert/scientific` | The authority comes from credentials, research, or systematic evidence — the speaker is explaining from expertise, not experience | "As a neuroscientist," "the research shows," "from what we know about dopamine systems" — authority is institutional or research-based |

**Most common error:** Tagging `direct/challenging` because the speaker sounds confident. Confidence alone is not `direct/challenging`. The register requires confrontational framing directed at the listener's behavior or belief.

**Second most common error:** Tagging `vulnerable/personal` because the speaker is speaking in first person. First-person narration of a past experience is not `vulnerable/personal` if the speaker has clear resolution and speaks from a position of retrospective confidence. `Vulnerable/personal` requires current or retrospective uncertainty, fear, or disclosure of struggle.

**When two registers are present:** This is common. Tag the register that is dominant. If 70% of the excerpt is warm affirmation followed by a brief direct challenge, tag `warm/affirming`.

---

### 7.4 Key Claim

The `key_claim` is the most retrievable 1–2 sentences from or about the excerpt — the semantic anchor for vector search.

**A good key claim:**
- Can be read cold by a user in the primary state and produce a shift
- Does not require the excerpt to make sense
- Names the insight's core claim, not the story or the mechanism's name
- Is a complete thought — not a fragment that relies on context

**A bad key claim:**
- Summarizes the excerpt ("McConaughey talks about having to give up a lucrative career")
- Uses the speaker's name as the grammatical subject ("McConaughey says that...")
- Is so general it could apply to any state ("You have to make difficult choices sometimes")
- Is so specific it would never match a user's query embedding ("Turning down $14.5 million to do an African documentary")

**AI-assistance policy:** The AI may draft a `key_claim` candidate. The human tagger must read it cold and apply the good/bad criteria above before accepting. The tagger should revise if the AI's draft is a summary rather than a claim. The final `key_claim` must be marked `ai-draft-human-reviewed` in the `key_claim_source` field if AI-drafted.

**Test:** Read the `key_claim` aloud. If someone in the primary state heard it as a standalone statement, would they feel something shift? If the answer requires the surrounding excerpt for context, the key claim is not yet right.

---

### 7.5 Credibility Tier

| Tier | Definition | Examples |
|---|---|---|
| `tier-1` | Speaker has direct lived experience of the specific stuck state being addressed | A founder who navigated losing direction after a first company exit; an athlete who experienced identity collapse after career-ending injury |
| `tier-2` | Speaker has domain expertise in career, psychology, performance, human behavior, or related fields without necessarily having lived the specific state | An executive coach, organizational psychologist, or career strategist speaking from expertise |
| `tier-3` | The insight is research-based — the speaker is citing empirical evidence, peer-reviewed research, or systematic data | A neuroscientist citing published research on dopamine and motivation; a professor citing longitudinal studies on purpose and career |

**Tagging from the excerpt's framing, not the speaker's overall biography.** A speaker with tier-1 credentials may be delivering a tier-3 insight in a specific excerpt if they're citing research rather than their own experience. Tag the excerpt, not the person's general background.

---

### 7.6 Intensity Level

| Level | Definition | Application |
|---|---|---|
| `mild` | Gentle, inviting, low-pressure; the insight doesn't challenge or demand | Appropriate for excerpts that primarily affirm, validate, or gently reframe without confrontation |
| `moderate` | Direct but not confrontational; standard delivery; most excerpts fall here | The default — applies when the insight is neither particularly gentle nor particularly demanding |
| `intense` | Forceful, demanding, high-energy; the insight confronts or demands accountability | Apply only when the excerpt would feel confrontational even to a user who is ready for challenge |

**Important:** `intense` does not mean "the speaker is enthusiastic" or "the topic is serious." Intensity is about the register's pressure on the listener. A speaker calmly saying "you don't need permission to stop — you're allowed to just stop" is `mild` even though the speaker may be emphatic. A speaker saying "you are choosing this loop every day you don't act on it" is `intense` because it places direct accountability on the listener.

---

## 8. Quality Gates

These are the required checks at each pipeline stage that prevent low-quality SIOs from advancing.

### Gate 1: Episode Pre-Evaluation Gate

| Check | Pass | Fail → Action |
|---|---|---|
| Episode addresses ≥1 MVP state | Yes | Not this episode |
| Estimated density ≥2 retrievable insights/hour | Yes | Not this episode (unless specific segment identified) |
| Transcript acquisition feasible | Yes | Defer until transcript is available |
| No known disqualifying concerns (primarily promotional, etc.) | None | Not this episode |

### Gate 2: Transcript Quality Gate

| Check | Pass | Fail → Action |
|---|---|---|
| Fewer than ~15% of target segments require substantial reconstruction | Yes | Upgrade transcript source or manual re-transcribe target segments |
| `transcript_source` field documented | Yes | Document before proceeding |
| Speaker attribution preserved | Yes | Repair before proceeding |

### Gate 3: Extraction Gate

| Check | Pass | Fail → Action |
|---|---|---|
| Excerpt is 75–250 words | Yes | Retrim or split |
| Excerpt passes standalone test | Yes | Re-extract or reject candidate |
| Insight is attributable to named speaker (not a third party) | Yes | Reject candidate |

### Gate 4: Tagging Gate

| Check | Pass | Fail → Action |
|---|---|---|
| All MVP-Required fields populated | Yes | Complete missing fields before review |
| Concentration limit check: ≤3 SIOs from this speaker in this state | Yes | Reject this SIO or remove a lower-quality existing one |
| All tags use exact controlled vocabulary values | Yes | Correct vocabulary before review |
| `key_claim` passes standalone test | Yes | Revise key_claim |

### Gate 5: Review Gate (human_review_status transition)

| Check | Pass → Status | Fail → Status |
|---|---|---|
| All 8 review checks passed (Section 4.7) | approved | flagged + correction note |
| No rejection criteria conditions present | approved | rejected + reason |

### Gate 6: Indexing Gate

| Check | Pass | Fail → Action |
|---|---|---|
| `human_review_status = approved` | Yes | Do not index; return to pipeline |
| `source_id` resolves to existing Source Object | Yes | Create Source Object or repair link before indexing |
| Embedding generated from correct field | Yes | Regenerate embedding |

---

## 9. Failure Handling

### At the Episode Level

| Failure Case | Action | Log |
|---|---|---|
| Episode transcript is too corrupt to use | Defer; attempt third-party transcription; if still inadequate, remove from approved episode queue | Log episode URL + transcript quality issue |
| Episode yields 0 accepted candidates after triage | Mark episode `not this episode` despite source approval | Log; may indicate triage prompt needs calibration |
| Episode yields 0 passed-extraction candidates | Same — mark episode | Log; may indicate density was overestimated at pre-evaluation |
| Episode exceeds concentration limit for all remaining candidate SIOs | Stop ingestion from this episode; flag for corpus balance review | Log speaker and state concentration counts |

### At the Insight Level

| Failure Case | Action | Log |
|---|---|---|
| `key_claim` cannot be written to meet standalone test after 2 attempts | Reject candidate; do not ingest | Log with rejection reason |
| Excerpt cannot be trimmed to 75–250 words without losing the insight | If >250: split into 2 SIOs; if <75 after minimal trim: reject | Log |
| `primary_state_tag` disputed between tagger and reviewer | Flagged; both tagger and reviewer document their reasoning; adjudicated by a third reviewer or escalated to calibration session | Log as calibration event |
| `insight_type` or `voice_register` tagged with low confidence | `tagger_confidence = low`; SIO flagged as `pending_review` with note; held back from index until re-reviewed | Log |
| AI-drafted `key_claim` fails human review | Tagger writes manually; marks `key_claim_source = human` | Log as AI-draft rejection |

### At the Corpus Level

| Failure Case | Action | Log |
|---|---|---|
| Speaker credibility event (misconduct, fraud, documented trust-breaking) | Remove all SIOs from that speaker from the index; mark as `removed_credibility_event` in corpus tracking | Log with public source for the event |
| SIO receives >60% explicit negative feedback in Feedback Loop | Flag for re-review; consider re-tagging or removing | Log with feedback data |
| State coverage falls below 5 approved SIOs (triggers pool-size safety clause in retrieval) | Prioritize corpus expansion for that state immediately | Log as critical corpus gap |
| Concentration limit violation discovered after indexing | Remove the lower-quality SIO (by `tagger_confidence` and review notes); update corpus tracking | Log as pipeline error |

---

## 10. Evaluation Plan

### What We Are Evaluating

The Corpus / Ingestion Pipeline has two evaluable properties:

**Pipeline consistency:** Do two taggers independently produce the same tags for the same excerpt? This is a direct measure of the pipeline's reliability. Inconsistent tagging means the retrieval engine is operating on an unreliable metadata signal.

**Pipeline output quality:** Is the resulting corpus dense, diverse, and well-matched enough to enable strong retrieval? This is measured by the retrieval evaluation plan (Component 3) and the Feedback Loop (Component 9), not directly by the pipeline. However, the pipeline sets the ceiling — a pipeline evaluation should catch quality problems before the retrieval evaluation discovers them.

### Pre-Build Calibration

**Before any production ingestion begins:**

1. Build the calibration set (Section 6.2): 10–15 pre-tagged SIOs as reference examples.
2. All taggers independently tag the same 5 calibration set examples that have known correct answers.
3. Measure agreement on `primary_state_tag`, `insight_type`, and `voice_register` across taggers.
4. Discuss disagreements. Revise tagging guidelines at the sections of greatest disagreement.
5. Target: ≥80% agreement on `primary_state_tag`; ≥75% on `insight_type` and `voice_register` before production tagging begins.

If agreement is below target after one calibration session, run a second session with revised guidelines. If agreement is still below target after two sessions, the taxonomy definitions may be too ambiguous — escalate to a component review.

### Post-Build Corpus Audit (Before Retrieval Testing)

After reaching minimum viable coverage (20 approved SIOs per MVP state), audit the corpus before running the retrieval evaluation:

| Audit Check | Pass | Fail → Action |
|---|---|---|
| No MVP-Required field missing in any approved SIO | 100% complete | Identify and complete missing fields |
| No duplicate `insight_id` or duplicate `source_id` per episode | 0 duplicates | Resolve before proceeding |
| State distribution: ≥20 approved SIOs per MVP state | ≥20 each | Continue ingestion for under-served states |
| Resonance distribution: ≥2 insight_types and ≥2 voice_registers per MVP state | Yes | Identify resonance gaps; ingest content to fill them |
| Concentration: no speaker with >3 SIOs in any single state | 0 violations | Remove or reclassify violating SIOs |
| Attribution completeness: `attribution_text` complete for all approved SIOs | 100% | Repair before retrieval testing |

### Tagging Inter-Rater Reliability (Periodic)

**Every 20 SIOs tagged, run a batch agreement check:**

1. Select 5 SIOs from the most recent batch.
2. A second tagger independently re-tags `primary_state_tag`, `insight_type`, and `voice_register` without seeing the original tags.
3. Calculate agreement rate.
4. If agreement rate drops below 70% on any dimension, pause ingestion and run a calibration session.

This process catches tagging drift before it contaminates a large portion of the corpus.

### Key Metrics

| Metric | Target |
|---|---|
| Pre-ingestion calibration agreement: primary_state_tag | ≥80% |
| Pre-ingestion calibration agreement: insight_type, voice_register | ≥75% |
| Periodic IRR check agreement | ≥70% ongoing |
| MVP-Required field completeness | 100% for all approved SIOs |
| Approved SIOs per MVP state | ≥20 at retrieval testing |
| Attribution completeness | 100% for all approved SIOs |
| Concentration limit compliance | 0 violations |

---

## 11. MVP Recommendation

In plain language, this is what the Silhouette corpus pipeline should build and do for the first ingestion-ready version.

**Sources to ingest first:**
Process 3–5 approved sources from the Component 2 source candidate list. The MVP core is Tim Ferriss Show, Diary of a CEO (Steven Bartlett), and Huberman Lab, as identified in Component 2. Within each, pre-evaluate specific episodes before committing to transcript acquisition.

**Episode pre-evaluation before transcript acquisition:**
Do a fast listen-through or skim of the auto-generated transcript before acquiring a clean copy. If no candidate timestamps emerge in the first scan, move to a different episode. Do not acquire and clean a full transcript for an episode that doesn't pass a 15-minute pre-evaluation.

**Transcripts:**
Use auto-generated transcripts (YouTube or Spotify) with light human cleaning for most content. This is sufficient quality for 80%+ of episodes. Acquire official transcripts where available. Do not invest in manual transcription at MVP scale.

**AI assistance:**
AI-assist the `content_summary` and `key_claim` drafts. Human review is required on both before approving. All other MVP-Required fields must be human-tagged. Do not use AI for `primary_state_tag`, `insight_type`, `voice_register`, `credibility_tier`, or `intensity_level` until a validation study is run.

**Build the calibration set first:**
Before any production tagging, invest 2–3 hours building the 10–15 SIO calibration set and running a single calibration session. This is not overhead — it is the difference between a consistent corpus and one that needs to be re-tagged.

**Minimum viable corpus before retrieval testing:**
20 approved SIOs per MVP state (Direction Collapse, Engagement Drought, Inaction Loop). 60 total minimum. Resonance distribution check must pass (≥2 insight_types and ≥2 voice_registers per state) before retrieval testing.

**Tracking:**
Use a simple spreadsheet or Airtable database to track pipeline_status, tagger_id, reviewer_id, and concentration counts during ingestion. Do not build a custom tool for the pipeline at MVP.

**What to avoid overbuilding:**
- Do not build automated tagging at MVP — human judgment on required fields is non-negotiable
- Do not build a custom ingestion toolchain — spreadsheet + manual embedding API calls are sufficient for 60 SIOs
- Do not aim for 50 SIOs per state before validating retrieval quality at 20
- Do not ingest content beyond the 3–5 approved sources before testing retrieval on the initial corpus
- Do not build a transcript cleaning pipeline — light manual cleaning is sufficient at this scale

**Capacity estimate for MVP corpus build:**
Using Component 3's estimate of 15–20 minutes per SIO for an experienced tagger who has completed calibration, and including time for pre-evaluation, transcript acquisition, and human review:

| Activity | Time per episode (estimate) | Time per SIO (estimate) |
|---|---|---|
| Pre-evaluation checklist | 15–20 minutes | — |
| Transcript acquisition + light cleaning | 30–60 minutes | — |
| AI triage + human review of candidates | 20–30 minutes | — |
| Human extraction (per SIO) | — | 10–15 minutes |
| Metadata tagging (per SIO, human) | — | 15–20 minutes |
| Human review + approval (per SIO) | — | 8–12 minutes |
| **Episode total** | **~90 minutes (fixed per episode)** | — |
| **Per-SIO total** | — | **~35–47 minutes** |

For a 3-episode-per-source pass producing approximately 5 SIOs per episode, building 60 SIOs (20 per MVP state) requires approximately:
- 12 episodes × 90 minutes fixed overhead = 18 hours
- 60 SIOs × ~40 minutes variable = 40 hours
- **Total estimate: ~58 hours** of focused ingestion work, split across multiple sessions

If one person is dedicating 10 hours/week to corpus building, the minimum viable corpus takes approximately 6 weeks. If 2 people are working in parallel (with calibration maintained), it takes 3 weeks. This estimate should be validated after the first 10 SIOs — if actual time is significantly higher, either the timeline or the MVP corpus target should be revised.

**What must be true before moving to Component 6:**
- Calibration set exists and initial agreement check passed
- Source Objects created for all ingested episodes
- All MVP-Required fields complete for all approved SIOs
- Corpus audit completed (see Section 10)
- Concentration limits verified
- Attribution completeness verified

---

## 12. Open Questions

**1. What is the realistic tagging time per SIO, including extraction and calibration overhead?**
Component 3 estimates 15–20 minutes per SIO for an experienced tagger. For first-time taggers, the actual time may be 30–40 minutes, especially for edge cases. At 60 SIOs minimum for MVP, this is 30–40 hours of tagging effort minimum. This should be validated after the first 10 SIOs and compared to the estimate — if it is significantly higher, the MVP corpus targets may need to be revised or the timeline extended.

**2. Should the `key_claim` be AI-drafted as the default or only as a fallback?**
The current guidance is that AI may draft the key_claim. An alternative is that humans always draft first and AI is a fallback check ("does this key_claim stand alone?"). The right answer depends on how accurately AI drafts key claims for this content type — this should be assessed in the first 20 SIOs. If AI drafts are rejected more than 40% of the time, the human-first approach is faster overall.

**3. What is the right format for the calibration set — physical document, examples database, or annotated SIOs in the tracking system?**
The calibration set needs to be accessible during tagging, with commentary on why each tag was assigned. The format (Notion page, Airtable view, annotated spreadsheet) should be decided before ingestion begins, since the calibration set informs the first tagging session.

**4. At what corpus size does the manual pipeline become unsustainable?**
The manual pipeline (AI-assisted triage + human extraction + human tagging + independent review) is appropriate for the MVP corpus of 60–150 SIOs. At what scale does this become a bottleneck? A rough estimate: at 5+ SIOs per week, manual review of every SIO by an independent reviewer may require a part-time resource. The pipeline design should specify a scale threshold at which an automated review assist (flagging likely errors rather than fully reviewing) becomes necessary.

**5. How should transcript errors be handled when they affect the verbatim text of a key passage?**
If an auto-generated transcript has a clear mishearing error in the target segment, the current guidance allows correction. But what if the error is ambiguous — could be a transcription error, could be the speaker actually used that word? The policy should specify: prefer the more conservative interpretation (the speaker probably said the more common word) when the audio is ambiguous, and note the correction in `extraction_notes`.

**6. How is the pipeline tracked and who owns it?**
The pipeline assumes a "pipeline operator," a "human tagger," and a "reviewer." For the MVP, these may be the same person at different times. As the project scales, the roles should be distinct. This requires a decision about who is responsible for each track and how handoffs are managed — a process decision for the implementation phase.

**7. Should the embedding be regenerated when `key_claim` is revised after initial embedding?**
If a tagger revises the `key_claim` of an already-indexed SIO, the embedding is stale. The pipeline should specify whether `key_claim` revisions trigger automatic re-embedding. The answer should be yes — a stale embedding on a revised key_claim silently degrades retrieval quality. The indexing process should detect when `key_claim` has changed and queue re-embedding.

**8. What is the escalation path for a calibration dispute that two reviewers cannot resolve?**
The pipeline describes a third reviewer for tag disputes. At MVP scale, there may not be a third reviewer available. Is the fallback to resolve with the lower-confidence tag and note the dispute? Or to defer the SIO until more context is available? Define the escalation path before the first dispute.
