# Silhouette — Retrieval-Tone + Video-Finder Phase Report

> Covers the phase that (1) fixed retrieval tone/register selectivity and (2) built the
> repeatable video-source-finder + media-validation foundation. Date: 2026-05-25.
> Companion docs: `corpus_retrieval_video_diagnostic.md` (Part 1 baseline),
> `retrieval_tone_tuning_report.md` (Part 2 detail), `video_source_finder_design.md` (Part 3
> schema), `video_source_candidates_report.md` (Part 3 generated candidates).

## What this phase did (plain terms)

Two things. (1) Made Silhouette retrieve the right *emotional tone* within a state — a burned-out
user now gets warm/permission content (Huffington) instead of a clinical mechanism lecture
(Huberman), while an analytical "explain the science" user still gets the mechanism. (2) Built a
repeatable, honesty-first system for finding and verifying official video/source metadata, and
ran it across all 19 SIOs — which also caught a real misattribution in an existing SIO.

## Part 4 — Initial score: 8 / 10

Strong on both fronts and fully tested, but capped by: tone fix is entirely classifier-hint
dependent (and a hint can misfire); video verification for YouTube is still manual; all 19
excerpts remain reconstructions; timestamps still unverified.

## Part 5 — Top 3 weaknesses

### W1 — Tone selectivity depends entirely on the classifier hint, with no confidence gating
The fix works by having the state classifier emit a resonance hint (insight_type/voice_register)
that, when present, suppresses the generic state-default boost and adds a stronger (+0.06/dim)
hint boost. But: (a) when the classifier returns `null` (unanticipated phrasing), retrieval
silently falls back to the old default-profile behavior; (b) a single hint *fully* suppresses the
default and applies full boost with no confidence scaling, so a misread flips the winner. Observed:
calibration `il-4` (a procrastination query ending "I quietly hate myself for it") now resolves to
Saujani (permission) instead of Urban (procrastination story) because the classifier reads the
self-blame coda as permission/warm. That is a *defensible* tonal read but a *less precise* state
answer — and it shows the hint can over-steer.
- **Matters because:** real users phrase things unpredictably and LLMs are poorly calibrated
  (research: models routinely assign high confidence to wrong answers).
- **If ignored:** tone-fit degrades silently outside the 24-case calibration surface, or over-corrects.
- **Recommendation:** add a `resonance_hint_confidence` and scale the hint boost (and the default
  suppression) by it; expand few-shot tone examples; later use multi-turn context as a cue.

### W2 — Video discovery/verification is semi-automated; YouTube official-ID verification is still manual
`find-video-sources.ts` generates structured search targets and `validate-media-metadata.ts`
enforces honesty, but confirming that a YouTube `video_id` belongs to the show's *official channel*
still needs a human — YouTube watch pages don't expose the channel to an unauthenticated fetch, and
search titles mislabel re-uploads. So 11/19 SIOs are video-ready (all via TED, a single provider),
and Huberman/Goggins remain `needs_review` with blank `video_id`s. Timestamps are universally
unverified (TED embeds play from start).
- **Matters because:** the product is meant to be video-forward and will scale to 40–50 SIOs sourced
  from Huberman Lab / Tim Ferriss / Diary of a CEO / etc. (YouTube-heavy).
- **If ignored:** manual verification becomes the scaling bottleneck; provider concentration on TED.
- **Recommendation:** integrate the YouTube Data API `search.list` (match returned `channelId` to the
  show's known official channel) behind an API key; keep human-in-the-loop for the final `verified`
  flag; keep `needs_review` whenever there's no match.

### W3 — Sourcing is still 100% reconstruction, and attribution can be wrong (now demonstrated)
All 19 excerpts are `transcript_verified: false`. The new verification workflow caught that
`sio-mcconaughey-go-to-zero-2020`'s excerpt ("$14.5M/picture, go to zero, agent dropped me, Africa
documentary") is **not in its cited episode #474** — the official transcript was fetched and does not
contain that story. It is real McConaughey lore from elsewhere (likely *Greenlights* or another
interview) and is now flagged `needs_review` for re-sourcing.
- **Matters because:** Silhouette's trust positioning; misattribution is now a demonstrated risk, not
  hypothetical.
- **If ignored:** presenting a reconstructed quote as if from an episode that doesn't contain it is a
  credibility/legal hazard.
- **Recommendation:** ingest official transcripts (TED and tim.blog both publish them) to convert top
  SIOs to verbatim + real timestamps; re-source McConaughey; make `transcript_verified: true` a gate
  for any future `approved` status.

## Part 6 — Research (best practices) → apply / keep / change / defer

### W1 — intent/tone classification reliability
- **Found:** few-shot examples + structured output improve intent reliability; LLMs are systematically
  *mis-calibrated* (high confidence on wrong answers); emotion/intent detection improves materially
  with conversational context and explicit dialog-act/label cues; confidence-probing methods cut
  calibration error. (MDPI emotion+intention; Voiceflow intent-prompt tips; arXiv calibration papers.)
- **Apply:** we already added richer few-shot tone mappings; next add an explicit hint-confidence
  signal and scale boosts by it. **Keep:** the safe fallback to default when no hint. **Change:**
  make hint strength confidence-weighted instead of all-or-nothing. **Defer:** a learned calibration
  model / multi-turn context fusion until there's real usage data.

### W2 — official video verification
- **Found:** the YouTube Data API `search.list` returns `videoId` + `channelId`; the recommended
  pattern is to match the result's `channelId` against the target show's *known official* channel ID,
  not trust titles. (Google YouTube Data API docs.)
- **Apply:** add an optional API-keyed verifier path to `find-video-sources.ts`. **Keep:** the honest
  `needs_review` default and the "never write an unverified video_id" rule. **Change:** auto-verify
  only on a confirmed channelId match. **Defer:** full automation / playlist crawling.

### W3 — transcript + timestamp verification
- **Found:** official transcripts (TED, tim.blog) are free verbatim sources; deep-linking uses
  `youtube-nocookie.com/embed/{id}?start={s}&end={e}` (times in seconds). (Prior-phase research +
  tim.blog transcript pages.)
- **Apply:** convert highest-traffic SIOs to verbatim from official transcripts and capture real
  timestamps; re-source McConaughey. **Keep:** TED official embeds as the verified interim. **Change:**
  gate `approved` on `transcript_verified`. **Defer:** a full automated transcript-ingestion pipeline
  (explicitly out of scope this phase).

## Part 7 — Fixes applied this phase + rescore

Applied now (in-scope, MVP-appropriate):
- The tone fix itself: classifier tone→hint mappings; default-profile boost is now FALLBACK-only
  (suppressed per-dimension when a user hint exists, match or diverge); hint boosts 0.03→0.06;
  per-candidate suppression trace for debuggability. Calibration 20/21 → 24/24; `ed-4` flips
  Huberman→Huffington; symmetry preserved (analytical→mechanism, "need a kick"→direct/challenging).
- Media honesty guardrails: `validate-media` fails on false "verified" claims / bad embed formats;
  11 SIOs verified, 3 `needs_review`, 5 `not_applicable`; Robbins upgraded to a verified TED embed.
- Surfaced + honestly flagged the McConaughey misattribution (not silently patched) with the decisive
  transcript evidence — the verification workflow working as intended.

Deliberately deferred (avoiding "a giant production media ingestion system"):
- `resonance_hint_confidence` scaling (W1); YouTube Data API integration (W2); transcript/timestamp
  ingestion + McConaughey re-source (W3).

**Revised score: 8.5 / 10.** +0.5 over the initial 8 for catching and honestly flagging the
McConaughey misattribution, confirming the tone fix is *symmetric* (not just "warm always wins"), and
grounding every deferred item in researched, concrete recommendations. Not higher because the three
weaknesses are real and remain structurally open by design.

## Net readiness
Retrieval now matches tone, not just state — the headline gap from the previous phase is closed and
tested. The corpus has a repeatable, honest media pipeline and 11 video-ready SIOs. The main caveats
for user testing: tone selectivity can misfire on phrasings outside the calibration set (watch it),
and most SIOs still need verbatim transcript + timestamp verification before any "approved" status.
