# User Need Coverage Layer — Implementation Plan

_Status: build plan. Created 2026-05-26. This is the planning artifact for the user-side
half of the SIO Discovery Agent. It does not change runtime behavior and adds no intake
questions._

---

## 1. What the user-side layer is

A **back-office harvesting and evaluation layer** for the SIO Discovery Agent. It represents
realistic user *situations* as structured **need patterns**, attaches realistic **query
patterns** (the words a user would actually type) to each, runs those queries through the
**real retrieval engine**, and reports where the current corpus fails to serve a real user —
then turns those failures into **enriched harvesting targets** the existing Source Scout can act on.

It is not a runtime feature, not a user-facing label, not a persona system, and not a source of
"observed" user data. Everything it produces is explicitly a **hypothesis** until real beta data exists.

## 2. What problem it solves

Today the Discovery Agent answers a **supply** question in the team's own vocabulary:
*"Which cells in my `state × insight_type × voice_register × intensity` matrix are empty?"*
A real user never speaks that vocabulary. The translation from *"I used to love this job and now I
feel like a fraud for not caring"* into a metadata coordinate currently happens silently in a
curator's head — with no artifact, no coverage check, and no way to harvest against it.

This layer makes that translation **explicit, auditable, and testable against real retrieval**, so
the agent can harvest for *"a resentful, checked-out worker who feels trapped by sunk cost"* rather
than for *"engagement-drought + direct/challenging."*

## 3. How it differs from corpus gap detection

| | Corpus gap detection (`detect-corpus-gaps.ts`) | User need coverage (this layer) |
|---|---|---|
| Question | Which metadata cells are empty? | Which real user situations get nothing that lands? |
| Vocabulary | Internal tags | User phrasing + beliefs + emotion |
| Method | Deterministic counts over `corpus/sios/` | Static metadata match **+ real retrieval probe** |
| Satisfied by | Presence (≥1 SIO in a cell) | Resonant discrimination (right register, not an excluded one, not a magnet) |
| Failure it catches | "ED has no direct/challenging SIO" | "Every ED query returns the same magnet; the self-critical user is served a register that attacks them" |

The two are **complementary and both kept**. Corpus gaps tell us which shelves are empty; user-need
gaps tell us what real users are reaching for and not finding.

## 4. What it should NOT do yet

- No feedback mining, query-log clustering, or real-user analytics.
- No personas or demographic segments. Needs are **situational only**.
- No new intake questions; no change to live runtime retrieval behavior.
- No weakening of any honesty/integrity gate.
- No claim that any need is "observed." Seeds are `status: hypothesis`.

## 5. How it connects to the existing Discovery Agent

```
[Stage 0]  analyze-user-need-coverage.ts   → user_need_coverage_report.md
                                            → user_need_harvesting_targets.md   (enriched, user-voiced)
                │ (enriched targets, NOT a replacement)
                ▼
[Stage 1]  detect-corpus-gaps.ts            → corpus_gap_detection_report.md    (unchanged)
[Stage 2]  find-source-candidates.ts        → source_candidate_discovery_report.md
                                              (+ pointer to user-need targets)
[Stage 3+] evaluate → novelty → verify → review → draft → HUMAN gate            (unchanged)
```

- Reuses the production retrieval path (`loadSIODocuments` + `scoredSearch`) so coverage reflects
  what users would actually receive.
- Reuses controlled vocabularies and helpers from `scripts/lib/discovery.ts` (MVP_STATES,
  INSIGHT_TYPES, VOICE_REGISTERS, INTENSITIES, loadSioMetas).
- Reuses the magnet win-rate idea from `test-magnet-risk.ts` to flag query-magnets from the user side.
- New orchestrator mode `npm run discover-sios -- --user-needs`; `--full-local` runs it as Stage 0.

## 6. Files/scripts created or modified

**Created**
- `ai/guides/user_need_coverage_layer_plan.md` (this file)
- `ai/guides/user_need_pattern_map.md` (methodology)
- `corpus/user_need_patterns.yaml` (12–18 hypothesis need patterns)
- `corpus/user_query_patterns.yaml` (20–30 query patterns)
- `scripts/analyze-user-need-coverage.ts` (analyzer + harvesting-target generator)
- `ai/guides/user_need_coverage_report.md` (generated)
- `ai/guides/user_need_harvesting_targets.md` (generated)

**Modified (light, additive)**
- `package.json` — add `analyze-user-needs` script.
- `scripts/run-sio-discovery-agent.ts` — add `--user-needs` mode + Stage 0 in `--full-local`.
- `scripts/find-source-candidates.ts` — additive pointer to the user-need targets file (no behavior change).

## 7. What data is hypothesis-labeled

**All of it.** Every need pattern carries `status: hypothesis`. The query library marks each query's
`source` (`raw_pool | intake_example | resonance_example | calibration_case | magnet_probe |
curator_hypothesis`). The reports state up front that coverage gaps are computed against
**hypothesis** needs and **author-written** queries, not observed demand. Only real beta data may
later promote a need to `status: observed`.

## 8. Existing docs that seed the first need patterns

- `ai/guides/user_problem_model.md` — the 15-item **Raw Description Pool**, the per-state
  "how the user describes it" lines, the internal variants, and the disambiguation pairs.
- `ai/guides/intake_diagnostic_flow.md` — the "Examples of Good User Input" table, the
  resonance-inference examples (analytical / vulnerable / frustrated / skeptical / burned-out),
  and the exclusion principle (exclusion > preference in session one).
- `ai/guides/user_resonance_model.md` — insight-type and voice-register definitions + which sources serve which.
- `scripts/lib/magnet-probes.ts` — 10 author-written probes per state (already labeled "not real user logs").
- Live corpus signals: the held McKeown magnet candidate; the Inaction-Loop register concentration
  (4/9 `direct/challenging`) flagged in `corpus_gap_detection_report.md`.

Every seeded need cites its provenance in `source_provenance`. Nothing is invented without being
labeled a curator hypothesis.

## 9. How the layer avoids imagined-user overreach

- **Provenance required:** every need traces to a real doc line; pure inventions are flagged
  `curator_hypothesis` and capped in number.
- **Hard caps:** ≤6 needs per state (≤18 total), ≤30 queries. No sprawling taxonomy.
- **Reuse, don't invent vocabularies:** needs map onto the *existing* states / insight types /
  voice registers. No new state or register is ever created here.
- **Merge rule:** two needs sharing the same metadata profile + resonance + anti-pattern are merged.
- **Situational only:** schema forbids demographic/persona fields.
- **Coverage is computed, not asserted:** the analyzer measures coverage against real retrieval; the
  curator's seeded `coverage_strength` is only an initial estimate the report overwrites.

## 10. How it later accepts real beta data without pretending we have it now

- The query library is a **separate file** from need patterns precisely so seeded queries can be
  swapped for real ones without touching the need model.
- `status: hypothesis → observed` is the one-way upgrade reserved for real data; a future
  `source: beta_real` query value and an `observed_frequency` field are anticipated but **not
  populated now**.
- Until then, `harvesting_priority` is derived from coverage gap × curator demand-weight only; the
  long-term formula multiplies in real demand frequency and landing-failure rate. The plan names
  this future formula but does not fake its inputs.
- Feedback mining, clustering, and persona/segment coverage remain explicitly **deferred** to the
  post-beta phase (see `feedback_quality_signal_loop.md`).

---

_Next: Phase 2 — `ai/guides/user_need_pattern_map.md` (methodology), then the catalog, query
library, analyzer, harvesting targets, and light wiring._
