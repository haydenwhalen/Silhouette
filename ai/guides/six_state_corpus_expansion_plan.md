# Expanded Six-State Corpus Buildout — Plan

> **Phase name:** Expanded Six-State Corpus Buildout (a.k.a. Near-MVP Six-State Coverage Expansion).
> **Status:** build plan. Created 2026-05-26.
> **One-line:** broaden Silhouette's corpus and retrieval vocabulary from the 3 validated MVP states to all 6 states in the User Problem Model, targeting ~9 SIOs per state (~54 total), **without lowering source-quality or verification standards.**

This document is the strategy artifact. The mechanical "what to harvest" detail lives in
`six_state_sio_harvesting_plan.md`; the per-state definitions live in
`remaining_states_sio_strategy.md`; the source of truth for the states themselves remains
`user_problem_model.md §3`.

---

## 1. Why we are expanding

The first three states were chosen as the MVP wedge because they are the most common, most
clearly differentiated, and best-covered by the hypothesized sources (see
`user_problem_model.md §4`). They are now built out to a balanced **9 / 9 / 9 = 27 approved/served
corpus** with tone-aware retrieval and calibration passing.

The User Problem Model always defined **six** states. The other three —
**possibility-paralysis, identity-transition, momentum-gap** — were deferred, not rejected: §4 of
the model explicitly tags them "add in second iteration." Three forces now make the second
iteration worth doing:

1. **Real user inputs will not respect the wedge.** A user describing "I have five ideas and can't
   pick one" (possibility-paralysis) or "I left my job and don't know who I am now"
   (identity-transition) is squarely in Silhouette's target cohort. Today the 3-state classifier
   either forces them into the nearest MVP state or returns `unknown`. Both are silent mismatches.
2. **The user-need coverage layer surfaced the gap.** The user-side discovery analyzer
   (`analyze-user-need-coverage.ts`) models real situations in user vocabulary; expanding it past 3
   states is blocked until the corpus and the controlled vocabulary support 6.
3. **The pipeline is ready.** The SIO Discovery Agent, magnet gate, novelty/dedup, and honesty
   invariants are all state-agnostic in design but state-limited in their hardcoded vocabulary.
   Expanding the vocabulary unlocks the existing machinery for the new states at low marginal cost.

### What this expansion is and is not

- **It broadens coverage and robustness.** More of the real cohort gets a state-appropriate
  insight instead of a forced-fit or a blank.
- **It does not replace the wedge.** The first prototype may still be tested on the original
  3-state experience. The new states can be pinned off at runtime if the 3-state classification
  proves cleaner for the first friendly-user test (see §7, runtime-pin note).
- **It does not lower the bar.** 9-per-state is a **target, not a quota.** It is better to ship
  6 excellent, honestly-labeled SIOs for a state than 9 that include weak or generic ones. The
  anti-generic gate, novelty gate, source-integrity checks, and magnet gate all stay in force.

---

## 2. Current state → target

| | Built today | Near-MVP target |
|---|---|---|
| States with retrieval/intake support | 3 (direction-collapse, engagement-drought, inaction-loop) | 6 |
| SIOs per built state | ~9 each (27 total in `corpus/sios/`) | ~9 each |
| New states to build | — | possibility-paralysis, identity-transition, momentum-gap |
| Approx. total corpus | 27 | ~54 |
| Verification posture | mixed: several verbatim-verified + honest reconstructions, all `prototype_only`/`approved` as evidence allows | unchanged standard — new SIOs honestly labeled; verbatim only where actually confirmed |

**Important:** the 27 existing SIOs are a mix of verbatim-verified and honest reconstructions
(`prototype_only`). The expansion does not retroactively change them. New SIOs follow the same
evidence-gated honesty rules — most will enter as `prototype_only` reconstructions until a human
verbatim-verifies them, exactly as the current corpus was built.

---

## 3. The three states being added

Full definitions are in `user_problem_model.md §3` and synthesized for harvesting in
`remaining_states_sio_strategy.md`. In brief:

### possibility-paralysis — "I have too many real options and I can't choose"
The blocker is **excess of options + fear of foreclosing**, not absence of direction and not
resistance to a known action. User needs covered: choosing among genuine options, the cost of
perpetual optionality, fear of regret/choosing-wrong, commitment-generates-clarity, decision
avoidance disguised as research. **Disambiguation risk:** vs. inaction-loop (one known thing vs.
several unchosen things) and vs. direction-collapse (excess vs. absence of options).

### identity-transition — "Something changed and I don't recognize myself anymore"
Defined by a **discrete triggering event** (breakup, job loss, move, exit, graduation, retirement
from a role) that removed a prior organizing structure. User needs covered: grief of the old self,
the in-between, identity after success/failure, rebuilding after change, fear of becoming someone
new. **Disambiguation risk:** vs. direction-collapse (event-triggered with a clear before/after vs.
chronic gradual drift).

### momentum-gap — "I feel behind; everyone else is going somewhere"
A **comparison-triggered spike** — outward-facing, often transient — about wanting the *feeling* of
momentum, not a specific peer's life. User needs covered: comparison anxiety, feeling behind a
peer timeline, restart after losing rhythm, reducing restart cost, getting back into motion without
shame. **Disambiguation risk:** vs. inaction-loop (lost rhythm to restart vs. a known action
avoided) and vs. engagement-drought (comparison-spiked vs. chronic internal flatness).

> **Naming note on momentum-gap.** The User Problem Model defines momentum-gap primarily as the
> *comparison spike* (Description 9). The harvesting prompt for this phase also folds in the
> **"lost rhythm / can't restart"** theme. These are treated as two sub-states of momentum-gap
> (`comparison-spike` and `restart-friction`); the restart-friction sub-state is the one most easily
> confused with inaction-loop and must be disambiguated carefully (restart vs. never-started). This
> is documented in `remaining_states_sio_strategy.md` and flagged as a calibration risk in Phase 9.

---

## 4. Target SIO mix per new state

Each new state targets ~9 SIOs with deliberate spread (exact per-SIO profiles in
`six_state_sio_harvesting_plan.md`). Guideline distribution per state:

- **insight_type:** at least one each of `reframe`, `permission`, `mechanism`, `story` where the
  state supports it; the state's dominant type (see strategy doc) may have 3–4.
- **voice_register:** ≥3 of the 5 registers represented; avoid >4 SIOs sharing one register.
- **intensity:** majority `moderate`, at least one `mild`, `intense` only where the state and source
  genuinely warrant it.
- **source diversity:** no single speaker >2 SIOs in a state; no single show/platform >3 in a state.
- **verification/media:** prefer sources with fetchable transcripts (e.g. artofmanliness.com,
  tim.blog) so some land verbatim-verified; record honest media status for the rest.

These are **soft targets that serve diversity**, not gates. A state that genuinely lacks a strong
`mechanism` source ships without one rather than forcing a weak fit.

---

## 5. Source strategy

Reuse the approved source families; extend only as each new state requires (per
`user_problem_model.md §5` and the harvesting prompt):

- **possibility-paralysis:** Barry Schwartz (paradox of choice), Ruth Chang (hard choices), Dan
  Martell (commitment/decision), Tim Ferriss guests, Huberman (decision neuroscience), credible
  philosophers/psychologists/founders on commitment.
- **identity-transition:** Brené Brown, Adam Grant, Rich Roll, Tim Ferriss, Diary of a CEO, School
  of Greatness reinvention arcs, athletes after retirement, founders post-exit, authors on
  reinvention.
- **momentum-gap:** James Clear, BJ Fogg, Huberman (habit/routine), Rich Roll, behavior-change and
  self-compassion researchers, coaches on rebuilding rhythm.

**Source integrity rules (unchanged):** canonical official URLs only; no re-uploads, aggregators,
clip channels, or quote sites as a source or as verification; speaker must actually appear in the
cited content; the host is not the speaker.

---

## 6. Quality, verification, and magnet gates (all unchanged)

Every new SIO passes the same gates as the existing corpus:

- **Human Resonance Score (HRS)** — 10 dimensions, 0.40 weight, the differentiator. Draft threshold
  ≥75 with evidence; <45 reject; 65–74 promising.
- **Anti-generic hard gate** — `non_genericness` or `state_specificity` ≤2 → reject regardless of
  other scores. Must pass the Instagram test and the state-specificity sentence.
- **Novelty/dedup** — `duplicate` against existing SIOs is a strong reject unless clearly better.
- **Source/media honesty checks** — deterministic verifier; no fabricated `video_id`/`embed_url`/
  timestamp/URL; `quote_type` honest; verbatim only from an actually-confirmed transcript.
- **Unverified-resonance cap** — resonance capped at 85 until a verbatim quote is verified, so an
  unverified paraphrase cannot display as a flawless SIO.
- **Magnet-risk gate** — `test-magnet-risk.ts` per candidate; a verified, high-scoring candidate
  that would dominate its state and collapse within-state diversity is `held_for_retrieval_risk`,
  not served.
- **Final human serve-gate** — only a human moves a draft from `corpus/drafts/` to `corpus/sios/`
  and sets `approved`/`transcript_verified: true`, and only with real evidence.

---

## 7. Validation plan

1. Expand the controlled vocabulary to 6 states in code (discovery lib + runtime classifier +
   dependents), keeping `npx tsc --noEmit` and `npm run build` green.
2. Add user-need + query patterns for the 3 new states; run `npm run analyze-user-needs`.
3. Run `npm run detect-gaps` (now reports against the 6-state matrix) and build the harvesting plan.
4. Harvest → score → draft per state (pipeline scripts; honesty invariants enforced in code).
5. Human review of every draft; promote only quality-passing ones to `corpus/sios/`, honestly
   labeled.
6. Add calibration + disambiguation + tone cases for the new states; run the full suite:
   `test-sio-retrieval`, `test-state-classification`, `test-present-insight`,
   `test-retrieval-calibration`, `test-magnet-risk`, `validate-media`.
7. Score the phase, fix the top weaknesses, rescore.

> **Runtime-pin note.** Expanding the classifier to 6 states changes live retrieval behavior: a user
> who would previously have been forced into an MVP state may now be classified into a new state
> with a thinner corpus. Before the first friendly-user test, decide deliberately whether to (a) run
> all 6 states live, or (b) pin the runtime classifier to the original 3 while keeping the new-state
> corpus/calibration in place for internal evaluation. The code change keeps both options open and
> the decision is documented in the Phase 10 report.

---

## 8. What remains deferred (explicitly out of scope for this phase)

- No feedback mining, query-log clustering, personas, or demographic segments — the user-need layer
  stays situational and `hypothesis`-labeled until real beta data exists.
- No retroactive re-verification of the existing 27 SIOs (separate verbatim-verification workstream).
- No UI/presentation changes for the new states beyond what the existing presentation layer already
  handles generically.
- No promotion of any new SIO to `approved`/`transcript_verified: true` without genuine verbatim
  evidence — autonomous harvest produces `prototype_only` drafts; verbatim verification stays human.
- No new states beyond the six in the User Problem Model. The controlled vocabulary is closed at six
  for this phase.
