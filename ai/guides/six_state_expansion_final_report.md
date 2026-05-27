# Expanded Six-State Corpus Buildout — Final Report (Phase 10)

> Date: 2026-05-27. Closes the Six-State Buildout. Honest scoring, top weaknesses, fixes applied,
> and what remains deferred. Companion docs: `six_state_corpus_expansion_plan.md`,
> `remaining_states_sio_strategy.md`, `six_state_sio_harvesting_plan.md`,
> `six_state_expansion_quality_review.md`.

## What this phase did (plain terms)

Expanded Silhouette from the 3 validated MVP states to all **6** User Problem Model states by
(1) finishing the planning/strategy/harvesting docs, (2) harvesting real-source candidates for the 3
new states via the Discovery pipeline, (3) scoring/verifying them honestly, (4) human-gated promotion
of the ones that passed every quality gate to the served corpus as `prototype_only`, (5) **fixing a
latent bug that made the new states unreachable at runtime**, and (6) adding calibration so the new
states retrieve correctly and the full test suite is green.

## Corpus before → after

| state | before | after | notes |
|---|---|---|---|
| direction-collapse | 9 | 9 | unchanged (over-represented; not added to) |
| engagement-drought | 9 | 9 | unchanged |
| inaction-loop | 9 | 9 | unchanged |
| possibility-paralysis | 0 | **6** | new |
| identity-transition | 0 | **7** | new |
| momentum-gap | 0 | **5** | new (comparison-spike thin) |
| **total** | **27** | **45** | +18 served |

- **Verbatim-verified:** 7 (unchanged — all 18 new SIOs are honest reconstructions/paraphrases).
- **Reconstruction/prototype count:** 38/45 (84%, up from 74% — predicted).
- **Media/video-ready (verified embed):** 11 (unchanged — all 18 new SIOs are `text-only`, no fabricated embeds).
- **Held (needs_review, not served):** 3 candidates (honest reasons; see quality review §"Held").

## The linchpin fix

`src/agent/stateClassifier.ts` was still pinned to the 3 MVP states: the system prompt described all
six, but the structured-output Zod enum was built from a 3-state `MVP_STATES`, so the model **could
not emit** the new states and silently coerced every new-state query into an MVP state. The entire
expansion was inert at runtime. Found by **behavioral validation** (a classification probe), not by
trusting the handoff note that claimed the vocabulary was already widened. Fixed by widening
`MVP_STATES` to all six (in sync with `retrievalConfig.ts`; runtime-pin comment added). Two follow-on
disambiguation rules were added to handle the boundaries the new states created:
- **PP vs direction-collapse:** "can't figure out what I want / no concrete options" → direction-collapse, not possibility-paralysis.
- **momentum-gap vs direction-collapse:** comparison about *pace/being ahead* → momentum-gap; comparison about *others having direction* → direction-collapse.

## Tests run and results

| command | result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npm run validate-media` | PASS (0 hard violations; 8 honest warnings) |
| `npm run detect-gaps` | 45 SIOs, full 6-state matrix |
| `npm run analyze-user-needs` | **0 corpus_gaps**, 2 retrieval_gaps, 29 well_served (was 15 corpus_gaps) |
| `npm run review-candidates` | clean (ready=0, promising=4, held=1, done=25, reject=2 fixtures) |
| `npm run test-sio-retrieval` | 6/6 |
| `npm run test-state-classification` | 8/8 |
| `npm run test-present-insight` | 3/3 |
| `npm run test-retrieval-calibration` | **45/45 = 100%** (target ≥70%) |
| `npm run test-magnet-risk` | exit 0 (no real magnet; defaults monitored) |

## Score: initial → revised

- **Initial (had the run stopped at promotion, before behavioral validation): 6/10.** The corpus
  would have been expanded and honestly labeled, but **inert** — the classifier could never route to
  the new states, so the 18 new SIOs would never be served. Calibration/classification unproven.
- **Revised (after the classifier fix + disambiguation rules + full green suite + honest holds):
  8.5/10.** Functional, tested, honest. Held back from higher by the residual weaknesses below.

## Top weaknesses (why it matters / what breaks / fix applied)

1. **Classifier was 3-state at runtime (CRITICAL).** *Why:* new SIOs unreachable. *Breaks:* the
   whole expansion is invisible to users. *Fix:* widened the enum to 6 + added boundary rules;
   verified 8/8 classification, 45/45 calibration. **Resolved.**
2. **Reconstruction ratio rose to 84%.** *Why:* trust depends on verbatim accuracy. *Breaks:* a
   paraphrase shown as if it were the speaker's exact words erodes credibility. *Fix/мitigation:*
   every new SIO is honestly `prototype_only` + `transcript_verified: false` with an in-body
   reconstruction note; the unverified-resonance cap (85) prevents an unverified SIO from displaying
   as flawless; verbatim verification is the named next workstream. **Mitigated, not eliminated.**
3. **momentum-gap comparison-spike is thin (1 served SIO).** *Why:* a common real situation. *Breaks:*
   comparison-spike users get a single angle. *Fix:* documented as the top follow-up harvest target;
   held the weak/duplicate comparison candidates rather than padding. **Documented gap.**
4. **Type gaps:** PP has no `story`, IT no `mechanism`, MG no `story`. *Why:* register/type diversity
   aids resonance. *Breaks:* slightly narrower tonal coverage within a state. *Fix:* the magnet/hint
   layer still diversifies on the registers present; gaps logged for the next batch. **Documented.**
5. **IT ↔ direction-collapse boundary is genuinely fuzzy** for "achieved-the-thing-and-feel-empty"
   phrasing. *Why:* "sold my company, feel hollow" reads as either post-success identity loss or
   post-achievement direction-collapse. *Breaks:* occasional cross-state routing. *Fix:* encoded as an
   explicit boundary calibration case accepting both sides (honest), not force-fit. **Mitigated.**
6. **Sub-agent harvest stalled** (stream watchdog) before scoring; I scored/verified/promoted in the
   main thread. *Why:* reliability of long autonomous sub-agents. *Fix:* the candidate files survived;
   the deterministic verifier + manual review backstopped quality. **Worked around.**

## Research themes applied (best practices)

- **State-taxonomy expansion needs explicit *negative* disambiguation**, not just positive
  definitions — adding a state makes it compete for adjacent queries; the fix is rules of the form
  "X is NOT Y when …" (added PP↔DC and MG↔DC rules).
- **LLM-as-judge calibration:** keep the unverified-resonance cap so a polished paraphrase can't score
  as a perfect SIO; anti-generic hard gate on the two genericness dimensions.
- **Human-in-the-loop content review:** autonomous harvest produces candidates/drafts; a reviewer
  gates promotion; `approved`/`transcript_verified` stay separate evidence-backed steps.
- **RAG corpus diversity:** per-state speaker/platform caps + a magnet-risk gate (win-rate, not
  centrality) + an intake-hint layer that diversifies register-specific queries away from the
  no-hint default dominator.

## What remains limited / deferred

- Verbatim verification of the 18 new reconstructions (and the existing 31) — separate workstream.
- A second harvest pass to fill momentum-gap comparison-spike, PP `story`, IT `mechanism`, MG `story`,
  and to take each new state from ~6 toward 9.
- The 3 held candidates (`pp-huberman-dopamine-uncertainty`, `mg-howes-behind-at-23`,
  `mg-robbins-envy-as-signal`) await human verbatim/extension review.
- Exact dates on several new SIO frontmatters (flagged APPROXIMATE in-file).
- **Runtime-pin decision:** all 6 states are live. Before the first friendly-user test, decide
  deliberately whether to keep all 6 live or pin to MVP-3 (the comment in `stateClassifier.ts` /
  `retrievalConfig.ts` makes this a two-line change). Recommendation: keep all 6 live — calibration is
  100% and the new states materially improve user-need coverage (0 corpus gaps).

## Is the 6-state corpus ready for manual smoke testing?

**Yes.** All six states classify and retrieve correctly, the full suite is green, media/honesty
checks pass, and the new SIOs are honestly labeled `prototype_only`. Recommended next step: a human
verbatim-verification pass on the highest-traffic new SIOs (Schwartz, Chang, Brown, Clear, Neff,
Renfrew) to convert the strongest reconstructions to verified, then a friendly-user smoke test across
all six states.
</content>
