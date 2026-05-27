# Retrieval Magnet / Diversity Fix — Phase Report (score, weaknesses, research, fixes)

> Companion to `retrieval_magnet_diagnostic.md` + `retrieval_diversity_research.md`. Date 2026-05-26.

## What this phase did
Diagnosed and mitigated the "magnet" problem — one broadly-relevant SIO winning a
disproportionate share of a state's queries and collapsing within-state diversity — plus fixed a
review-queue mislabel and added corpus-imbalance guardrails. No new SIOs.

## Phase 8 — Score: initial 8.5 / 10
- **Diagnosed clearly** (with a non-obvious, data-proven finding: the biggest magnet had the
  LOWEST centrality, so a centrality penalty would invert — rejected it).
- **Sensible two-layer fix:** Layer A win-rate **promotion gate** (the proven detector — blocks
  McKeown at 6/10) + Layer B **MMR on positions 2..k** (conservative; #1 winner preserved so
  calibration is unaffected). Avoided overfitting and a massive rewrite.
- **Quality preserved:** calibration 27/27; Jocko/Clear/Colonna still retrieve for their cases
  (il-9/10/11); all suites green.
- **Review-queue bug fixed**; **imbalance guardrails added**.
- Capped at 8.5 because Layer B is essentially a no-op at 22 SIOs (top-3 already distinct), so the
  real magnet defense is the promotion gate (which automates a previously-manual practice), and the
  gate + probes are author-written.

## Phase 9 — Top weaknesses
1. **Gate + probe bank are self-authored.** The win-rate threshold (>50%) and probe diversity are
   heuristics, not validated against real user queries. *Risk:* a real magnet slips if the probes
   miss the affect real users express, or a good SIO is wrongly flagged. *Rec:* seed the probe bank
   with real tester queries; keep the gate as a **human-review trigger**, not auto-reject.
2. **Layer B (MMR) is preventive, not active.** At 22 SIOs top-3 are already distinct → MMR is a
   no-op today; the winner-magnet defense rests entirely on Layer A (gate) + the hint layer. *Risk:*
   if a magnet is served (gate too lenient), serving-time has no winner-level defense. *Rec:* monitor;
   add a winner-level mitigation (exposure-aware / confidence-scaled) only with real-usage data.
3. **No-hint default-dominance remains** (Newport DC ~7/10, Huberman ED ~8/10 of no-hint probes).
   Documented as benign (state defaults; the classifier's hints diversify tonal queries, calibration
   27/27), but a genuinely tone-less query always gets the default SIO. *Rec:* improve classifier
   hint coverage; consider light no-hint winner diversification later.
   (Carry-overs: Human Resonance single-judge; no real-user data; ED+direct/challenging gap unfilled.)

## Phase 10 — Research → application
- **MMR** (Azure/Elastic/Medium): post-hoc top-k rerank, λ tunes relevance↔diversity; fixes
  near-duplicate sets, not the single winner. → *Implemented* on positions 2..k, λ=0.7 (high
  relevance); *keep* λ conservative; *defer* aggressive diversity.
- **Recommender popularity-bias / exposure modeling** (arXiv 2007.12230, 2503.23630): magnets ≈
  popularity bias; mitigate via calibration / exposure-aware inference scoring. → our win-rate gate
  is an offline exposure check; *keep*; *defer* inference-time exposure penalties (need usage data).
- **Centrality/centroid penalty** — *rejected*: the data showed it inverts here (lowest-centrality
  SIO was the biggest magnet).
- **Calibration overfitting** (golden-dataset guidance): author sets overfit → *treat the gate as a
  human-review signal, supplement with real queries* (deferred to first testers).

## Phase 11 — Fixes applied + rescore
Applied: Layer A gate (`test-magnet-risk.ts`, `--candidate` blocks magnets, exit 1); Layer B MMR
(retrievalConfig + vectorStore, winner preserved); `held_for_retrieval_risk` candidate status +
review-queue routes by status (held/done no longer shown as "ready"); corpus-imbalance warning +
target-state recommendation in `detect-corpus-gaps`; McKeown set to `held_for_retrieval_risk`.
Deferred (documented, not overbuilt): winner-level serving-time mitigation; real-query probe seeding;
classifier hint-coverage improvements.

**Revised score: 9 / 10** — +0.5 for the evidence-driven rejection of a harmful centrality penalty,
the clean review-queue/imbalance fixes, and full green validation. Not higher because the active
magnet defense is the promotion gate (detect-and-hold), not a served-time winner fix, and the gate
is still validated only on author-written probes.

## Readiness
Safe to add the next 3–5 verified SIOs: each must pass `npm run test-magnet-risk -- --candidate <path>`
before promotion, the gap detector now steers toward under-represented states (target
direction-collapse + engagement-drought, esp. ED + direct/challenging), and held magnets are clearly
quarantined in the review queue.
