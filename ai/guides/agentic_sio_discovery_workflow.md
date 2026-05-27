# Silhouette — SIO Discovery Agent: Operator Workflow Guide

> **Summary.** This is the practical guide for using the SIO Discovery Agent. It covers every action an operator takes: running scripts, adding candidates, interpreting scores, verifying sources, reviewing candidates, drafting SIOs, and moving the corpus toward 40–50 approved SIOs. Read alongside `agentic_sio_discovery_system_design.md` (the architecture reference) and `corpus_ingestion_pipeline.md` (the manual quality standard that applies once a draft reaches final review).

> **Scope update (2026-05-26 — Expanded Six-State Corpus Buildout):** the controlled state vocabulary used throughout this workflow has expanded from the 3 MVP states to all **6** User Problem Model states (added: possibility-paralysis, identity-transition, momentum-gap). The pipeline, gates, and honesty invariants are unchanged — only the set of `target_state` values the agent harvests against is larger. See `six_state_corpus_expansion_plan.md`, `remaining_states_sio_strategy.md`, and `six_state_sio_harvesting_plan.md`.

---

## 1. What the Agent Does

The SIO Discovery Agent reduces the manual effort of corpus building by automating the parts that are time-consuming but not judgment-sensitive:

- It reads the existing corpus and tells you exactly what is missing (state-register gaps, thin intensity, too many reconstructions).
- It generates ranked search queries targeting Silhouette's approved source families, so you search with intent rather than browsing.
- It scores candidate moments on 10 Human Resonance dimensions using an LLM judge, surfacing which candidates genuinely land for the target stuck state and which are merely topically adjacent.
- It checks candidates against the existing corpus for near-duplicate detection, so you don't accumulate slightly reworded versions of the same insight.
- It runs deterministic honesty checks on source and media fields, catching fabricated values before they reach the corpus.
- It drafts SIO structure from candidates that have passed all gates, so the human verbatim verification step is the only thing blocking an approved SIO.
- It renders the candidate review queue in priority order so you can make decisions across all candidates efficiently.

What it produces is a well-prioritized, pre-scored inbox of candidates for human decision. What it does not produce is an approved SIO — that always requires a human.

---

## 2. What It Does Not Do

Understanding the system's limits is as important as understanding its capabilities.

- **It does not find candidates for you automatically.** The Source Scout generates search queries; a human (or supervised web-search step) runs them and creates the candidate YAML.
- **It does not verify verbatim text.** Verbatim verification requires a human with access to the official transcript. TED transcripts are not machine-fetchable.
- **It does not approve or publish anything.** No orchestrator mode writes to `corpus/sios/` or sets `human_review_status: approved`.
- **It does not fabricate quotes.** If a quote is unverified, it stays `quote_type: unknown` or `paraphrase`, and the draft is explicitly marked as a reconstruction.
- **It does not confirm YouTube video IDs.** Machine search returns candidates; a human confirms which is the official-channel upload.
- **It does not crawl the web.** The Source Scout produces search query strings. Running those queries is a human or agentic web-search step.
- **It does not score creative quality.** It scores Human Resonance — whether the moment will land for the target user — but it does not evaluate whether the excerpt is well-written prose. That judgment is human.
- **It does not update the retrieval index.** Indexing happens separately after a human approves and moves the SIO to `corpus/sios/`.

---

## 3. How to Run the Agent

### Prerequisites

- Node.js installed; `npm install` run from project root.
- `.env` file with `OPENAI_API_KEY` set (required for the Evaluator module; other modules run without it).
- Working directory: project root (`/Users/haydenwhalen/Desktop/Silhouette`).

### Individual Module Scripts

```bash
# Step 1: Find gaps in the current corpus
npm run detect-gaps
# → writes ai/guides/corpus_gap_detection_report.md
# → JSON output to stdout

# Step 2: Generate search queries for the top gaps
npm run find-source-candidates
# → stdout: ranked query targets for approved source families

# Step 3a: Score a specific candidate (Human Resonance + quote quality)
npm run evaluate-candidate -- --candidate corpus/candidates/cand-<id>.yaml

# Step 3b: Check novelty vs. existing corpus
npm run score-candidate-novelty -- --candidate corpus/candidates/cand-<id>.yaml

# Step 3c: Run source/media honesty checks
npm run verify-candidate-source -- --candidate corpus/candidates/cand-<id>.yaml

# Step 4: Review all candidates in priority order
npm run review-candidates
# → writes ai/guides/candidate_review_queue.md

# Step 5: Draft an SIO from a ready candidate (writes to corpus/drafts/ only)
npm run draft-sio-from-candidate -- --candidate corpus/candidates/cand-<id>.yaml
```

### Orchestrator Modes

```bash
# Run gap analysis only
npm run discover-sios -- --gap-only

# Run evaluate + novelty + verify on a single candidate
npm run discover-sios -- --candidate corpus/candidates/cand-<id>.yaml

# Render the review queue
npm run discover-sios -- --review

# Draft all candidates currently at ready_for_sio_draft status
npm run discover-sios -- --draft-ready

# Full local run: gap analysis → source scout queries → review queue
npm run discover-sios -- --full-local
```

### Typical Session Flow

1. Run `npm run detect-gaps` to see what the corpus needs.
2. Check `ai/guides/corpus_gap_detection_report.md` for the top target profiles.
3. Run `npm run find-source-candidates` to get search queries for those profiles.
4. Use the queries to find a promising moment; create a candidate YAML.
5. Run evaluate + novelty + verify on the candidate.
6. Run `npm run review-candidates` to see the full queue and decide.
7. For candidates that pass review: run the drafter.
8. Open the draft in `corpus/drafts/`, complete verbatim verification, move to `corpus/sios/`, set `human_review_status: approved`.

---

## 4. How to Add a Candidate

A candidate represents one proposed insight moment before it has been evaluated, verified, or drafted. Each candidate lives in `corpus/candidates/<id>.yaml`.

### Step-by-step

1. Copy `corpus/candidates/candidate_template.yaml` to a new file:
   ```
   corpus/candidates/cand-<speaker>-<topic>.yaml
   ```
   Use kebab-case. Example: `cand-brene-brown-belonging-vs-fitting-in.yaml`

2. Fill in the required fields:

   ```yaml
   candidate_id: "cand-brene-brown-belonging-vs-fitting-in"
   candidate_status: proposed

   target_state: "engagement-drought"
   target_gap: "engagement-drought + warm/affirming + permission"
   proposed_insight_type: "permission"
   proposed_voice_register: "warm/affirming"
   proposed_intensity_level: "mild"

   source_title: "The Power of Vulnerability"
   source_url: "https://www.ted.com/talks/brene_brown_the_power_of_vulnerability"
   source_platform: "TED"
   speaker: "Brené Brown"
   official_channel_url: "https://www.ted.com"

   quote_type: unknown        # verbatim | paraphrase | unknown — be honest
   candidate_moment_summary: "Brown distinguishes belonging (being accepted as you are) from fitting in (changing yourself to be accepted). Fitting in, she argues, is the greatest barrier to belonging — which reframes the Engagement Drought experience of going through the motions as a form of self-erasure rather than just disengagement."

   key_claim: "Fitting in is about assessing a situation and becoming who you need to be to be accepted. Belonging doesn't require you to change who you are — it requires you to be who you are."

   why_it_might_land: "For a user in Engagement Drought who is going through the motions at work or in relationships, the distinction between fitting in and belonging names the source of the flatness precisely. The permission: stop performing and see what's actually there."

   media_verification_status: needs_review
   transcript_verification_status: needs_review
   ```

3. Leave all score fields blank. The scripts fill them.

4. Save the file. Run the evaluation scripts.

### Rules when creating a candidate

- `quote_type: verbatim` only if you have the exact text from an official transcript. Otherwise use `paraphrase` or `unknown`.
- Never fill `video_id` or `embed_url` unless you have confirmed the official-channel artifact.
- `transcript_excerpt` should only contain text you can actually attribute to the official transcript. If you are summarizing from memory, use `candidate_moment_summary` instead and leave `transcript_excerpt` blank.
- `source_url` must be the canonical official URL — not a re-upload, YouTube clip, or third-party summary page.

---

## 5. How to Evaluate a Candidate

Evaluation runs three scripts in sequence. Each writes its results back to the candidate YAML.

```bash
# Run all three on a single candidate
npm run evaluate-candidate -- --candidate corpus/candidates/cand-<id>.yaml
npm run score-candidate-novelty -- --candidate corpus/candidates/cand-<id>.yaml
npm run verify-candidate-source -- --candidate corpus/candidates/cand-<id>.yaml
```

Or use the orchestrator:
```bash
npm run discover-sios -- --candidate corpus/candidates/cand-<id>.yaml
```

After running, open the YAML and review:

1. **`human_resonance_score`** (0–100): is it ≥ 75? If not, is it ≥ 65 (promising)?
2. **`resonance_breakdown`**: read the evidence phrases per dimension. Do they reflect the actual moment? Do any dimensions show a score without convincing evidence?
3. **`novelty_rating`**: is it `novel`, `similar_but_useful`, or `duplicate`?
4. **`novelty_nearest`**: which existing SIOs are closest? Would this candidate genuinely add something they don't?
5. **`recommendation`**: what does the system suggest? Note that `ready_for_sio_draft` still requires your manual gate.
6. **Verification flags**: are there hard errors on source or media fields?

---

## 6. How to Interpret the Human Resonance Score

The Human Resonance Score (HRS) is the most important number in the evaluation. It answers: *will this moment actually land for a user in this stuck state?*

### What the score ranges mean

| Score | Interpretation | What to do |
|---|---|---|
| < 45 | Reject. The moment is not resonant enough for Silhouette. | Reject the candidate. Do not invest more sourcing effort on it. |
| 45–64 | Weak. Some resonance dimensions are present but the source or framing is insufficient. | Consider a stronger source for the same insight, or a better moment from the same episode. |
| 65–74 | Promising. The moment has genuine resonance potential, but evidence is incomplete or source is unverified. | Advance only if you can fill the evidence gaps (get the verbatim text, confirm the source). |
| ≥ 75 + evidence | Ready to draft. This is the threshold. Score alone is not enough — see evidence gates below. | Advance to `ready_for_sio_draft` after human review. |

### Evidence gates

A score ≥ 75 does not automatically unlock `ready_for_sio_draft`. The system also checks:

- **`sourceVerified`**: the source URL is present and the official channel is identified.
- **`transcriptVerified`**: the verbatim text or an honest paraphrase summary is present.

If either gate is unmet, the recommendation is `needs_stronger_source` or `needs_transcript_verification`. You need to fill the evidence before the candidate advances, regardless of score.

### The Anti-Generic Hard Gate

If `non_genericness` or `state_specificity` scores ≤ 2 (on the 1–5 dimension scale), the candidate is rejected regardless of any other scores. This rule is applied before the overall score calculation.

Read the `non_genericness` evidence phrase critically. Ask: does this pass the Instagram test? If the key claim could appear on a motivational account with no source attribution and still seem normal, it is not an SIO.

### Reading the dimension evidence

Each dimension in `resonance_breakdown.evidence` should cite a specific phrase from the candidate moment. If an evidence entry says something vague like "the speaker discusses feeling stuck," that is a sign the LLM judge pattern-matched on topic rather than evaluating the specific language. Treat low-confidence evidence phrases as yellow flags — review the candidate yourself.

Red flags in evidence phrases:
- Circular ("this is emotionally precise because it is precise about emotion")
- Topic-matching without language-grounding ("the speaker addresses engagement drought")
- Missing (a dimension with a score but no evidence phrase)

---

## 7. How to Interpret the Novelty Score

The novelty score and rating tell you how distinct a candidate is from the SIOs already in `corpus/sios/`.

| Rating | Score range | Interpretation |
|---|---|---|
| `duplicate` | Low | This candidate says essentially the same thing as an existing SIO. Only advance if it is substantially better quality — better source, verbatim vs. reconstruction, stronger register match. |
| `similar_but_useful` | Medium | Overlaps thematically but brings something genuinely different: a different speaker, a different register, a different credibility tier, or a meaningfully different framing. Can advance if HRS is strong. |
| `novel` | High | Fills a gap the corpus doesn't currently address. High priority — advance if HRS is also strong. |

### How to use `novelty_nearest`

Read the list of nearest SIOs. For each:
- Is the existing SIO approved or prototype_only? (A prototype_only SIO that is better than this candidate is not a reason to reject — the prototype_only might itself be replaced.)
- Does the nearest SIO actually cover the same ground, or is the similarity embedding-surface-level (same vocabulary, different insight)?
- Would serving a user this candidate AND the nearest SIO feel redundant?

The novelty check is a signal, not a hard gate (unlike the anti-generic gate). A `duplicate` rating is a strong reason to reject, but the human reviewer can override it if the candidate is substantially better than the SIO it duplicates.

---

## 8. How to Verify Source, Media, and Transcript Fields

Verification is the gate between a promising candidate and a ready-to-draft candidate. The system checks for format errors and fabricated values; humans confirm the actual evidence.

### Source URL verification

1. Open `source_url` in a browser. Confirm it loads the correct episode or content.
2. Confirm the speaker matches: the attributed person actually appears in this episode.
3. Confirm the show/platform matches: this is the official channel or publisher, not an aggregator.
4. If verified: update `source_url` to the canonical URL (not a redirect or short link) and note in `human_review_notes`.

### Media verification (video)

For YouTube sources:
1. Go to the official show's YouTube channel (e.g., `https://www.youtube.com/@hubermanlab`).
2. Search for the episode by title. Look for the official upload — check that the channel name matches exactly.
3. If you find the official video: record the `video_id` (the 11-character string after `?v=` in the watch URL). Write it to the candidate YAML.
4. Set `media_verification_status: needs_review` (not `verified` — verification requires playback confirmation).
5. Do not write `embed_url` until `video_id` is confirmed. Do not build an embed from a guessed ID.

For TED sources:
1. Go to `https://www.ted.com/talks/<slug>` where `<slug>` is the canonical TED talk slug.
2. If the page loads the correct talk: the embed URL is `https://embed.ted.com/talks/<slug>`. Write this to `embed_url`.
3. Set `media_verification_status: verified` (TED canonical slug confirmation is sufficient for this status).
4. `video_id` stays blank for TED sources — TED uses a slug, not a video ID.

### Transcript verification

1. Find the official transcript source:
   - TED: `https://www.ted.com/talks/<slug>/transcript`
   - Huberman Lab / Tim Ferriss: episode page often has a transcript link.
   - YouTube: auto-generated captions accessible via the video page.
2. Find the passage matching your `candidate_moment_summary`. Use the `key_claim` as a search phrase.
3. Copy the exact verbatim text including the surrounding setup and resolution. Target 120–180 words (see SIO template for length guidance).
4. Paste the verbatim text into `transcript_excerpt`. Set `quote_type: verbatim`.
5. Note the timestamp shown next to the passage.
6. Update `transcript_verification_status: verified` (this is the one verification field the human sets directly on the candidate).

**TED note.** TED transcripts are rendered by JavaScript. The automated web fetch tool cannot retrieve the transcript text or timestamps. You must open the TED transcript page in a browser and paste the relevant passage manually. This is the step the `verbatim_verification_checklist.md` is designed for.

### What to do when evidence is unavailable

- If the official transcript is behind a paywall or unavailable: set `transcript_verification_status: needs_review`, leave `transcript_excerpt` blank, and use `candidate_moment_summary` only. Do not advance to `ready_for_sio_draft` until verbatim text can be obtained.
- If only a re-upload exists for a YouTube episode: set `media_verification_status: unofficial`. Never embed an unofficial re-upload. The source link can point to the episode page; note in `media_verification_notes` that only an unofficial upload was found.
- If the source URL is no longer accessible: mark `media_available: false` and note in `human_review_notes`. The candidate may still be worth drafting if verbatim text was obtained earlier and is documented.

---

## 9. How to Review Candidates

```bash
npm run review-candidates
# or
npm run discover-sios -- --review
```

This generates `ai/guides/candidate_review_queue.md` with all candidates sorted by `overall_candidate_score`, grouped by status.

### Reading the queue

The queue surface for each candidate:
- `candidate_id`, `target_state`, `target_gap`, `speaker`
- `overall_candidate_score` and `human_resonance_score`
- `recommendation` (from the system)
- `novelty_rating` and nearest SIOs
- `candidate_status` and any pending verification flags
- `human_review_notes` (if previously set)

### Decisions to make per candidate

**Advance to `ready_for_sio_draft`:** Score ≥ 75, evidence gates met (source + verbatim text), no hard errors from verifier, novelty is `novel` or `similar_but_useful`. Manually change `candidate_status: ready_for_sio_draft` in the YAML.

**Hold as `promising`:** Score 65–74, or score ≥ 75 but evidence gaps remain. Set `human_review_notes` with what still needs to be done (e.g., "need verbatim TED transcript paste, timestamp unknown").

**Reject:** Score < 45, anti-generic gate triggered, `duplicate` novelty with no quality advantage, source cannot be confirmed, quote is clearly mis-attributed. Change `candidate_status: rejected`. Add `human_review_notes` with the rejection reason (this is useful for later reference — patterns in rejections inform sourcing).

**Archive:** Score is marginal and the gap has been filled by another candidate. The moment is legitimate but lower priority. Change `candidate_status: archived`. Unlike `rejected`, archived means "not now, not never."

**Override a system recommendation:** The system's recommendation is advisory. If the LLM judge scored a candidate low but you have read the moment and believe it is genuinely resonant, set `human_review_notes` to document your reasoning and advance manually. If the system scored a candidate high but you identify a source concern the scripts didn't catch, reject it. Human judgment supersedes the score.

---

## 10. How to Draft an SIO Safely

```bash
npm run draft-sio-from-candidate -- --candidate corpus/candidates/cand-<id>.yaml
# or
npm run discover-sios -- --draft-ready  # drafts all ready_for_sio_draft candidates
```

The drafter writes a draft SIO to `corpus/drafts/<candidate_id>.md`. It is always `human_review_status: prototype_only` and `transcript_verified: false`. It is never written to `corpus/sios/`.

### What the draft contains

- All SIO frontmatter fields populated from candidate data.
- `key_claim` from the candidate (the human should verify this is the best 1–2 sentence semantic anchor).
- `content_summary` drafted from `candidate_moment_summary` and scoring notes.
- `transcript_excerpt` populated from `transcript_excerpt` in the candidate (verbatim if available; if not, from `candidate_moment_summary` with a clear reconstruction note).
- All media fields: `video_provider`, `video_id` (blank if unverified), `embed_url` (blank if `video_id` unverified), `media_verification_status`, `display_mode`.
- A `⚠️ RECONSTRUCTION NOTE` at the top of the body if the excerpt is a paraphrase.

### Completing a draft and moving it to the active corpus

This is the final human gate. After the draft is generated:

1. Open `corpus/drafts/<candidate_id>.md`.
2. Read the transcript excerpt. Is it verbatim or paraphrase?
   - If verbatim and you have confirmed it matches the official transcript: set `transcript_verified: true`.
   - If paraphrase: do not set `transcript_verified: true`. Get the verbatim text first (see §8 for how).
3. Apply the SIO template quality checklist from `corpus_ingestion_pipeline.md §4.7`:
   - Is the excerpt 75–250 words?
   - Does it pass the standalone test (comprehensible with no episode context)?
   - Is the `key_claim` standalone — produces a shift without needing the excerpt?
   - Is the `primary_state_tag` correct from the user's perspective?
   - Is `attribution_text` complete and formatted per the template?
4. If all checks pass: set `human_review_status: approved`.
5. Copy or move the file from `corpus/drafts/` to `corpus/sios/`.
6. Update the candidate YAML: set `candidate_status: approved`.
7. Run `npm run detect-gaps` to confirm the corpus has moved in the right direction.

Do not set `human_review_status: approved` before steps 2–4 are complete. The approval status is the final trust claim — the corpus loader serves `approved` SIOs to real users in real stuck moments.

---

## 11. How to Reject Weak Candidates

Rejection is a first-class action. A rejected candidate provides two things: (1) a clear record that this moment was evaluated and did not meet the bar, and (2) pattern data about what kinds of moments fail, which informs sourcing.

### When to reject

- `overall_candidate_score` < 45 with no clear path to improvement.
- Anti-generic gate triggered (`non_genericness` or `state_specificity` ≤ 2).
- `novelty_rating: duplicate` and the candidate is not clearly better than the existing SIO it duplicates.
- Source cannot be confirmed: the episode does not exist as claimed, the speaker does not appear in it, or the source URL points to unofficial content.
- Quote is clearly mis-attributed: the moment belongs to someone the speaker is describing, not the speaker themselves.
- Verbatim text is unobtainable and the moment cannot be honestly documented without fabricating language.
- The moment is topically relevant to the state but generically framed — it could appear on any motivational platform without attribution and still seem normal.

### How to reject

1. Change `candidate_status: rejected` in the YAML.
2. Add a clear `human_review_notes` entry with the specific rejection reason.
3. Do not delete the file. Rejected candidates stay in `corpus/candidates/` as a record.

### Common rejection patterns and what they signal

| Rejection reason | What it signals |
|---|---|
| Generic framing (anti-generic gate) | Source family may lean toward motivational rather than specific; adjust sourcing toward more personal narrative episodes |
| Duplicate (novelty check) | The corpus already has good coverage of this speaker's content for this state; look for a different speaker or a different moment type |
| Source not confirmed | Candidate was created from memory or a secondary reference; improve sourcing by confirming the episode before creating a YAML |
| Verbatim unobtainable | The moment may have been originally identified from a summary or clip; trace it to a source with an official transcript |

---

## 12. How Feedback Data Should Eventually Guide Discovery

The current Gap Analyst works from corpus distribution data only: counts of SIOs per state, per register, per type. This is a structural measure — it tells you what the corpus *has*, not what the corpus *fails at* in real retrieval.

As the feedback quality loop (Component 9, `feedback_quality_signal_loop.md`) matures and retrieval failure data accumulates, the Gap Analyst can incorporate two additional signals:

**Signal 1: Retrieval failures by state.** When the retrieval engine triggers the pool-size safety clause frequently for a given state — meaning not enough candidates pass the quality threshold for that state — those states become higher-priority gap targets. This is a direct indicator that the corpus is under-serving real user queries.

**Signal 2: Dwell-length-adjusted negative signals.** When SIOs in a specific state/register combination are consistently receiving negative engagement signals (low dwell, explicit downvotes, immediate bounces), those register slots may need replacement SIOs — not just additional ones. The gap is not absence but quality failure.

The practical path: the feedback loop logs retrieval events with state, register, and insight_type fields. A simple aggregation script can surface which (state × register) combinations are generating the most negative signals. That aggregation becomes an additional input to the Gap Analyst, ranked alongside the structural gaps.

For now (19 SIOs, no retrieval failure data), the corpus distribution approach is the right method. Build it out with structural gaps first; incorporate feedback signals once there is real usage data to work with.

---

## 13. How to Avoid Generic Self-Help Content

The biggest risk in discovery is accumulating content that passes topical relevance checks but is not actually a Silhouette SIO. This section provides the practical heuristics for catching generic content before it reaches evaluation.

### The Instagram test

Read the `key_claim` or `candidate_moment_summary` without the speaker attribution. Would it appear normally on a motivational social media account, a generic career blog, or a productivity newsletter? If yes, it is generic self-help, not an SIO.

Examples of claims that fail the Instagram test:
- "Success is not a destination, it's a journey."
- "The first step to getting unstuck is deciding you want to change."
- "Your fear of failure is holding you back from your potential."
- "Find the thing that lights you up and do more of it."

None of these are wrong. All of them are generic. None of them belong in a Silhouette SIO.

### The specificity test

Ask: is there anything in this moment that is *specific to this speaker's experience* or *specific to this mechanism's explanation*? A claim anchored to a specific event, a specific named experience, a specific research finding, or a specific reframe carries specificity. A claim that could describe anyone's general wisdom does not.

Good specificity anchors:
- A named decision with documented consequences ("I turned down $14.5 million...")
- A specific mechanism with a named cause ("the dopamine system treats novelty-seeking as reward, which explains why...")
- A specific research result with a quantified claim ("the 75-year study found that the quality of relationships, not achievement, predicted...")
- A named internal experience that is genuinely uncommon ("the terror is not starting — it's the quiet moment after you've started when you realize you can't un-start...")

### The state-specificity test

Ask: would a user in the *specific target state* — not just someone interested in the general topic — feel seen by this moment?

For `engagement-drought`: the user still has their job, their relationship, their goal — but the feeling toward it has gone flat. A moment about "finding your passion" addresses someone without a direction. It does not address someone who has a direction and has stopped feeling it. That is not a state-specific fit.

For `inaction-loop`: the user knows exactly what to do and cannot start. A moment about "deciding what you want" addresses someone without clarity. It does not address someone who has clarity and is stuck at execution. That is not a state-specific fit.

Run the state-specificity sentence before accepting any candidate: "A user in [state] benefits from this because it directly addresses [specific UPM signal for that state]." If you cannot complete it without generalizing, the candidate is probably not state-specific.

### The voice check

Read the candidate out loud. Does it sound like a specific person speaking from a specific position — their own experience, their own expertise, their own research? Or does it sound like a composite of good-sounding advice that could have come from anywhere?

Silhouette's value is that the source is real and named. Content that sounds like it came from no one in particular fails the source-forward test at the voice level.

---

## 14. How to Prioritize Official Video, Source, and Transcript Evidence

The goal for every SIO is the highest-quality, most honest media and source record possible. The priority order:

### For transcript evidence

1. **Official published transcript** (TED transcript page, show's own website): highest trust. Copy verbatim, note the URL and timestamp.
2. **Official auto-generated captions** (YouTube auto-captions on the official channel): good quality for most shows. Use for verbatim with a note that captions are auto-generated and light cleaning may have been applied.
3. **Third-party transcript services** (Rev, Otter.ai, Whisper): acceptable if no official transcript exists. Note the service; apply the cleaning standard from `corpus_ingestion_pipeline.md §4.2`.
4. **Paraphrase from memory or secondary source**: honest last resort. Set `quote_type: paraphrase`, `transcript_verified: false`. Do not present it as verbatim.

Never mark `transcript_verified: true` from anything other than sources 1–3 above where you have actually compared the text to the official record.

### For video evidence

1. **TED embed with confirmed canonical slug**: full `verified` status. `embed_url: https://embed.ted.com/talks/<slug>`.
2. **Official YouTube channel with confirmed `video_id`**: full `verified` status. Build `embed_url` with `youtube-nocookie.com`.
3. **Official channel identified but `video_id` not playback-confirmed**: `needs_review`. Record the candidate ID in notes; hold `video_id` blank.
4. **Unofficial YouTube re-upload**: `unofficial`. Never embed as official. Source link to the official episode page only.
5. **Audio-only podcast episode**: `not_applicable` for video. `display_mode: audio-primary`. Link to official episode page.
6. **Book or article source**: `not_applicable` for video. `display_mode: text-only`. Link to publisher or author page.

### For source URL

Always link to the canonical, stable, official source. Not a short link (`youtu.be`), not an aggregator (`spotify.com/episode` embedded in another page), not a third-party summary. Canonical means: the URL that the show itself, the speaker's own website, or the publisher uses to reference this content.

For TED: `https://www.ted.com/talks/<slug>`  
For Huberman Lab: `https://www.hubermanlab.com/episode/<slug>`  
For Tim Ferriss: `https://tim.blog/yyyy/mm/dd/<episode-slug>/`  
For Diary of a CEO: the official episode page on stevenbartlett.com or the show's website.

---

## 15. How to Scale Toward 40–50 SIOs

The corpus currently has 19 SIOs (as of 2026-05-25), all `prototype_only` (reconstructions, not verbatim-verified). The path to 40–50 approved SIOs requires two parallel workstreams:

### Workstream A: Verbatim-verify the existing 19

The `verbatim_verification_checklist.md` identifies the top 6 TED SIOs pending verbatim paste. Completing these conversions (reconstruction → verbatim → `transcript_verified: true` → `approved`) is the highest-trust move. Each takes ~5 minutes with the transcript open. Completing all 19 would bring the corpus to a fully honest baseline before adding new SIOs.

Priority order from the checklist:
1. Tim Urban (procrastination) — TED transcript
2. Robert Waldinger (good life) — TED transcript
3. Emily Esfahani Smith (meaning) — TED transcript
4. Dan Pink (motivation) — TED transcript
5. Elizabeth Gilbert (creative genius) — TED transcript
6. Mel Robbins (5-second rule) — TED transcript + note about 2017 book expansion

### Workstream B: New SIOs for the ranked gaps

From the current `corpus_gap_detection_report.md`, the top gaps to fill:

| Priority | Gap profile | Suggested sources |
|---|---|---|
| 80 | `engagement-drought + direct/challenging` | David Goggins appearances on Diary of a CEO or School of Greatness; Mark Manson on engagement |
| 80 | `inaction-loop + warm/affirming` | School of Greatness (Lewis Howes); Elizabeth Gilbert (on Diary of a CEO, not TED) |
| 80 | `inaction-loop + expert/scientific` | Huberman Lab solo episode on procrastination neuroscience; Hidden Brain on self-sabotage |
| 55 | `intense` intensity (any state with < 2) | David Goggins appearances; Steven Pressfield; Mark Manson at his most direct |

### Pacing

A realistic target for a single operator session:
- 30 minutes: run detect-gaps, review the report, run find-source-candidates for the top 3 gaps.
- 60 minutes: identify 2–3 specific moments from approved sources, create candidate YAMLs.
- 30 minutes: run evaluate + novelty + verify on each candidate; review results.
- 60 minutes: verify source/transcript for the strongest candidates; advance to ready_for_sio_draft.
- 30 minutes: draft SIOs; complete any verbatim pastes; approve and move to corpus/sios/.

That's ~3.5 hours per session to add 2–3 fully approved SIOs with verbatim verification. Reaching 40–50 approved SIOs from the current 19 requires approximately 8–10 such sessions — realistic over a 4–6 week build period at 1–2 sessions per week.

---

## What Makes a Great Silhouette SIO?

A great SIO is a specific, emotionally precise, attributable human moment that fills a real gap in the corpus. All five of these properties matter; none is optional.

**Specific.** The moment is grounded in a real person's real experience or a real study's real finding. Not general wisdom — a specific claim anchored to specific evidence. McConaughey turning down $14.5 million. Goggins naming the identity layer beneath inaction. Waldinger citing the 75-year study. Specificity is what makes the source-forward presentation feel earned.

**Emotionally precise.** The language names the internal experience with uncommon accuracy. "The flatness you feel isn't boredom — it's your nervous system's way of telling you that you've stopped being honest with yourself." That precision produces the felt-recognition moment that is Silhouette's core user value. Generic empathy ("it's normal to feel stuck sometimes") does not.

**Attributable.** The quote is verbatim or documented-paraphrase, with speaker, show, episode, and date — all confirmed against the official source. Attribution is not a formality; it is the proof that the insight belongs to a real person's real experience, not to an AI generating plausible-sounding advice.

**State-filling.** The moment is tagged from the user's perspective, not the speaker's topic. A Direction Collapse SIO is one that a user in Direction Collapse — specifically — reads and thinks "this is about me." The test: "A user in [state] benefits because it directly addresses [specific UPM signal]." The state tag must pass this test.

**Gap-filling.** The corpus already has SIOs; a new one should address something the existing ones don't. A different speaker. A different register. A different insight type. A different intensity. Running `npm run detect-gaps` before sourcing ensures every candidate is deliberate, not duplicative.

**Signs of a great SIO:**
- The key claim makes a user feel something before they read the excerpt.
- The excerpt passes the standalone test cold.
- `tagger_confidence: high` — no tag uncertain.
- `transcript_verified: true` — verbatim, not reconstructed.
- `novelty_rating: novel` — genuinely additive to the corpus.
- The source is official and the media is verified.

---

## What Makes a Bad Silhouette SIO?

A bad SIO fails on at least one of the five properties above, and often fails in ways that are hard to see because the content looks right on the surface.

**Generic motivational content.** The most common failure. The moment is topically adjacent to the stuck state but says something any life coach, Instagram account, or productivity blog could have said. "You have to decide what you really want." "Fear is normal — act anyway." "The gap between knowing and doing is just a decision." These are not wrong. They are not state-specific, not emotionally precise, and not attributable to anyone's unique insight. The anti-generic hard gate catches many of these, but the best defense is identifying them before they reach evaluation.

**Mis-sourced.** The quote is attributed to the wrong person, the wrong episode, or an episode that doesn't contain it. This was the failure with the original McConaughey SIO (attributed to Tim Ferriss Episode #474, which did not contain the story; re-sourced to *Greenlights* in 2026-05). Mis-sourcing is a trust-model failure — it means Silhouette is presenting a false attribution to a user in a vulnerable state.

**Reconstructed-but-claimed-verbatim.** The text was generated from memory, reconstructed from secondary sources, or paraphrased, but the `transcript_verified: true` flag was set. This is the most dangerous failure because it is invisible to users. The corpus's `prototype_only` status for all 19 current SIOs is the honest acknowledgment that verbatim verification has not yet been completed.

**Duplicate.** The moment says essentially the same thing as an SIO already in the corpus. Two `direction-collapse + mechanism + expert/scientific` SIOs from Huberman Lab that address the same neurobiological framing of direction-finding do not double the corpus — they halve the diversity of user experience. The novelty check catches this; the human reviewer confirms it.

**Wrong state tag.** The SIO is tagged for a state it does not actually serve. An excerpt about "finding what lights you up" is tagged `direction-collapse` because Direction Collapse is about not knowing what you want — but the excerpt is actually addressing someone who doesn't have a goal at all, which is Direction Collapse Original; while if the user already has a goal and has lost the feeling toward it, this excerpt misses entirely (that's Engagement Drought). Wrong state tags produce retrieval failures that are invisible in logs but visible in user experience.

**Unattributable.** The source is a compilation clip, a re-upload, a secondary summary, or a paraphrase of a paraphrase. No chain of custody back to an official source exists. Without attribution, Silhouette cannot make the claim that this is a real human's real insight from a real moment — and that claim is what makes Silhouette different from generic AI advice.

**Signs of a bad SIO:**
- The key claim passes the Instagram test (could be anonymous motivational content).
- The excerpt requires episode context to make sense.
- `tagger_confidence: low` on any required tag.
- `transcript_verified: false` in `approved` status (a contradiction — approved SIOs need verbatim text or a documented exception).
- `novelty_rating: duplicate` with no human override rationale.
- `source_url` pointing to a re-upload, clip, or aggregator rather than the official source.
- `media_verification_status: verified` without a `media_verification_notes` entry documenting the evidence.
