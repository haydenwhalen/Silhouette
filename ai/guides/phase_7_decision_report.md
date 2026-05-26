# Phase 7 Decision Report

## Status

**Phase 7 is NOT executed in this commit.** Insufficient real beta data exists to choose a path from evidence. Per the data-gated rule in the Phase 7 prompt, this document captures the decision framework so that running `npm run analyze-feedback` after the beta will name the path automatically.

## Data available at time of writing

- `corpus/feedback.jsonl` currently contains only test-script and smoke-flow events
- The analysis script filters those automatically (sessions prefixed `test-`, reserved handles `smoketest` / `probe` / `test` / `dev`, or sessions named after reserved handles)
- After filtering: 0 events from real beta participants
- Minimum threshold for credible recommendation: 20 events, ≥3 beta users, ≥2 sessions per user, events across ≥2 MVP states

**Conclusion:** the Phase 7 decision script will recommend `collect-more` until real beta data accrues. Any Phase 7 path executed before then is speculative.

To verify the current pre-beta state at any time:

```bash
npm run analyze-feedback                 # filters test/smoke events
npm run analyze-feedback -- --include-test   # debug view of all events
```

## Decision framework (encoded in `scripts/analyze-feedback.ts`)

The analysis script reads `corpus/feedback.jsonl`, aggregates per-state and per-SIO metrics, and recommends one of four paths plus two fallbacks. The selection order is intentional — `7-D` is checked first because low engagement makes the other signals unreadable.

### 7-D — Trust / UX Work (checked first)
**Triggers when:** response rate to feedback prompt < 40% (clicks per presentation).
**Reasoning:** without click signal, no other metric is reliable. Improve the surface before measuring the substrate.
**Work:** preamble refinement, feedback prompt visibility, source link prominence, possibly Component 8 first-impression work.

### 7-C — Retrieval Mitigation
**Triggers when:** retry success rate (retries that became Yes) ≥ 55% AND overall yes-rate < 70%.
**Reasoning:** users keep finding a better SIO on retry. That means a better SIO was in the corpus all along — the ranking picked the wrong one first.
**Work:** test query framing variants and HyDE (Component 6 §8) against the failure cases only. Implement the smallest winning approach.

### 7-B — Verbatim Transcript Pass
**Triggers when:** verbatim SIOs (3 of 9: McConaughey, Newport, Manson) outperform reconstructed SIOs (6 of 9) by ≥20 percentage points in yes-rate, with ≥3 presentations per side.
**Reasoning:** source authenticity is the dominant variable. Fix the content before tuning anything else.
**Work:** find and verify transcripts for the 6 reconstructed SIOs; update `transcript_verified: true`, fill `video_id`/`embed_url`/timestamps. Replace any that can't be verified.

### 7-A — Corpus Quality
**Triggers when:** any SIO has ≥3 presentations and 0 Yes, OR ≥1 SIO shows ≥60% "show different" rate.
**Reasoning:** specific corpus entries are weak. Targeted retirement/rewrite, not systemic change.
**Work:** retire/rewrite the flagged SIOs, expand the corpus with 12–18 new candidates targeting register/insight-type gaps the data reveals, extend the calibration set, re-run.

### Fallback paths
- `collect-more` — < 20 events in the log
- `no-clear-signal` — ≥20 events but no path criterion triggered loudly; weak default to 7-A

## How to run the decision

```bash
npm run analyze-feedback
```

The script:
- Reads the local log
- Computes the per-path metrics
- Prints a human-readable report
- Ends with a single-line recommendation: path, confidence, why, why-not-others
- Exits 0 on success, 2 on unreadable log

## What to do once a path is named

Each path has a stub plan in this document. When `analyze-feedback` names a path, expand the corresponding stub into a phase prompt and execute. Don't run a Phase 7 path because of intuition — only because the decision rule fired.

### If recommended: 7-A
- Read the report's "flagged SIOs" list
- For each flagged SIO: read the file, decide retire / rewrite / keep
- From `ai/guides/source_candidates.md`, pick 12–18 new candidates prioritizing the register/insight_type gaps the report names
- Author new SIOs against the template; verify with conservative attribution
- Extend `scripts/test-retrieval-calibration.ts` with 4–6 new test cases covering the new SIOs
- Re-run calibration with the bigger corpus
- Confirm scoring still discriminates and the +0.20 boost cap doesn't start binding misleadingly
- Sizing: 3–4 days

### If recommended: 7-B
- For each of the 6 reconstructed SIOs:
  - Acquire transcript (YouTube captions / hubermanlab.com / NYT / ted.com / Tim Ferriss show notes / Brown's & Manson's published works)
  - Verify the speaker actually said the words; record the timestamp
  - Update the SIO file: set `transcript_verified: true`, `human_review_status: approved`, fill `video_id` / `embed_url` / `timestamp_start_seconds` / `timestamp_end_seconds`
- For SIOs where no verbatim quote can be found, REPLACE the SIO with a different verifiable excerpt from a related source — do NOT fabricate
- Re-run presentation tests + calibration
- Sizing: 1–2 days

### If recommended: 7-C
- From the log, extract every case where "show different" fired and the retry landed
- Build a failure-only calibration set (`scripts/test-retrieval-failures.ts`)
- Test three variants on the failure set:
  1. Baseline (current: query framing prefix Option A)
  2. + HyDE (Option B from Component 6 §8) — LLM generates a hypothetical SIO from the user query, embed that
  3. (Optional) swap embedding model to `intfloat/e5-base-v2`
- Pick the variant with the highest recovery rate that doesn't regress the existing calibration
- If HyDE wins: implement as a conditional path (only fires for low-confidence / vague queries to limit added latency/cost)
- Sizing: 2 days

### If recommended: 7-D
- Audit the preamble — does it scare users off?
- Audit the feedback button visibility — are they below the fold? Too small?
- Audit the dwell qualified rate — are users staying engaged at all?
- Consider Component 8 elements: stronger source-credibility framing, returning-user flow
- Implement minimal changes — broad redesign is wrong response to low signal
- Re-run beta with the changes; compare response rate before/after
- Sizing: variable, lean small

## Calibration thresholds — known weaknesses

The thresholds in `analyze-feedback.ts` are starting heuristics, not tuned:
- 20 events as the recommendation minimum is arbitrary; real statistical power needs more
- The 20-point reconstructed/verbatim gap threshold is generous (may miss subtler patterns)
- Bimodal detection is naive — flags binary cases (`flagged_no_yes`), not distribution shape
- Once real data exists, re-examine these and adjust

## What this report does NOT do

- It does not pretend evidence exists for a path
- It does not pre-commit you to any path before the data names it
- It does not include Phase 8+ planning (corpus to 20+ per state, all 6 states, Component 8 trust architecture, monetization — all post-MVP)
