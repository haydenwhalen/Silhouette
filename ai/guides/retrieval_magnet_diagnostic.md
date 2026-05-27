# Retrieval Magnet Diagnostic

> Phase 1 of the magnet/diversity fix. Data from `npm run diagnose-magnets` (per-state probe
> bank in `scripts/lib/magnet-probes.ts`, run through the real `scoredSearch` with the per-state
> default profile and NO intake hint, to isolate semantic + default dominance). The regenerable
> data tables live in `retrieval_magnet_diagnostic_data.md`. Date 2026-05-26.

## 1. What exactly is the magnet issue?
A single SIO wins a **disproportionate share of a state's queries** — even queries where a more
specific SIO (better matched to the user's tone, variant, or insight need) should win. The magnet
isn't necessarily the *best* answer; it's the *broadest* one. It collapses within-state
discrimination, so users with different needs in the same state all get the same SIO.

## 2. Which SIO/candidate exposed it?
**Greg McKeown** (held candidate, supermarket-floor disengagement image). Injected into
engagement-drought it won **6/10** ED probes (vs Huberman 3/10, Pink 1/10), and in the
WITH-classifier calibration it had beaten Huberman on a *why-mechanism* query and broken 8 ED cases.
Correctly held, not served.

## 3. Why did McKeown dominate Engagement Drought queries?
Its excerpt is **pure, prototypical ED affect** ("no energy, nothing interesting, not one part of
me wants to do this"). User ED queries express that *same* generic affect, so McKeown's embedding
sits very close to almost every ED query — it is a **query-magnet** (broadly relevant), not a
specifically-relevant answer to any one query.

## 4. What is the issue caused by? (measured, not guessed)
- **High query-affinity / broad wording** — ✅ the primary cause.
- **High semantic centrality?** — ❌ **the opposite.** McKeown has the **lowest** ED centrality
  (cosine-to-state-centroid **0.720**; Huberman 0.832, Pink 0.801) yet the **highest** win-rate.
  **Headline finding: a centroid-centrality penalty would be exactly backwards** — it would
  penalize Huberman and reward McKeown, worsening the magnet. Centrality (SIO↔SIO) ≠ query-magnetism
  (SIO↔queries). Rejected as a fix.
- **High Human Resonance Score?** — correlated, not causal (resonance doesn't drive retrieval).
- **Default-profile boost amplification** — ✅ contributing. Under the no-hint path the
  default-matching SIO gets +0.09 and tends to be broad → **Newport 7/10 DC**, **Huberman 8/10 ED**.
  The intake-hint layer (tone-tuning phase) suppresses the default for hinted dimensions, which is
  why WITH the classifier calibration is 27/27 — the magnet is largely a *no-hint* phenomenon.
- **Weak promotion gates** — ✅ the real structural gap: there was no offline dominance check
  before serving a candidate.

## 5. Are any currently-served SIOs already behaving like magnets?
Yes under the **no-hint default path**: **Newport (DC, 7/10)** and **Huberman (ED, 8/10)** — but
these are the states' *default-profile* SIOs, so it is partly **intended** (a tone-less DC query
reasonably gets Newport; a tone-less ED query gets Huberman). It is **benign in production**
because the classifier emits intake hints for tonal queries, which diversify the winner
(calibration with hints = 27/27). Flagged for **monitoring**, not treated as a bug.
**Inaction-loop has no magnet** (Goggins 5/10, then spread) — its SIOs are more distinct.

## 6. Which states are most vulnerable?
**Direction Collapse** and **Engagement Drought** (each has one broadly-worded, default-aligned
SIO). **Inaction Loop** is the most robust.

## 7. What tests currently catch this?
`test-retrieval-calibration.ts` (WITH the classifier) catches a candidate that beats a *hint-matched*
SIO on a specific query — how McKeown was caught and held.

## 8. What tests were missing (now added)?
An **offline, no-hint dominance test** over a *diverse probe bank* that measures each SIO's
**win-rate** per state — the only metric that reliably surfaces a query-magnet (centrality does
not). Added: `scripts/diagnose-retrieval-magnets.ts` (`npm run diagnose-magnets`) and
`scripts/test-magnet-risk.ts` (`npm run test-magnet-risk`, a promotion gate that **fails** when a
`--candidate` wins > threshold of its state's probes — McKeown 6/10 → blocked).

## Diagnostics run
- top-k retrieval across 30 diverse probes (10/state) · per-SIO win-rate · winner-vs-runner-up
  margin (DC 0.056, ED 0.023, IL 0.053) · top-3 all-distinct (100% every state — no near-duplicate
  collapse today) · per-SIO centroid-centrality.

## Fix chosen (Phase 3)
- **Layer A (primary): win-rate magnet-risk gate** at promotion (the proven detector).
- **Layer B (serving-time, conservative): MMR on returned positions 2..k** — keeps the #1 winner
  (calibration unaffected) but diversifies the alternatives the agent sees; a guardrail for as the
  corpus grows and near-duplicates appear.
- **Rejected: a centrality penalty** (the data proves it inverts).
- Keep the intake-hint layer (the production within-state discriminator) and add corpus-imbalance
  guardrails.
