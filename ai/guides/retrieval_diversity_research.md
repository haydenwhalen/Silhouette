# Retrieval Diversity — Research & Decisions

> Phase 2 of the magnet/diversity fix. Grounds the chosen approach in best practice + the
> measured data from `retrieval_magnet_diagnostic.md`.

## 1. Best practices found
- **MMR (Maximal Marginal Relevance)** — post-processing rerank of the top-k that balances
  relevance vs. redundancy via λ∈[0,1] (λ=1 pure relevance, λ=0 pure diversity). Fixes "top
  results are near-duplicates," not "the single best item is wrong." Keep λ high to avoid
  over-diversification. (Azure AI Search MMR guide; Elastic MMR; Medium MMR primers.)
- **Popularity-bias mitigation in recommenders** — the magnet *is* popularity bias (a few items
  dominate). Mitigations: distribution **calibration**, **exposure-aware scoring** (adjust ranking
  at inference by modelling how often an item is surfaced — conceptually our win-rate gate), and
  embedding-norm normalization (TTEN). (arXiv 2007.12230 calibration; 2503.23630 exposure modeling;
  2308.11288 TTEN.)
- **Promotion gates for content libraries** — vet a candidate against a held-out probe set before
  it enters the served index, rather than cleaning up after.
- **Calibration overfitting caution** — author-written eval sets overfit; treat them as smoke
  tests, supplement with real usage.

## 2. Which apply to Silhouette
- **Exposure/win-rate gating** maps directly: our diagnostic measured per-SIO win-rate over a
  diverse probe bank, which is the only metric that surfaced the magnet (McKeown 6/10).
- **MMR** applies to the *returned top-k set* (so the agent sees diverse alternatives), but NOT to
  the single winner the magnet problem is about.
- **A centrality/centroid penalty is NOT applicable** — the data disproves it: McKeown had the
  **lowest** ED centrality yet the highest win-rate, so penalizing centrality would reward the
  magnet. (This is the most important finding.)

## 3. What to implement now
- **Layer A — win-rate magnet-risk gate** (`test-magnet-risk.ts`): the proven detector; gate
  `--candidate` promotions (fail when win-rate > threshold). Primary fix.
- **Layer B — MMR on returned positions 2..k** (winner #1 = highest final_score is preserved, so
  calibration is unaffected): diversifies the *alternatives*, a guardrail for as the corpus grows
  and near-duplicates appear. Conservative λ≈0.7.
- Keep the **intake-hint layer** (the production within-state discriminator; calibration 27/27).
- **Corpus-imbalance guardrails** in the gap detector (a state over-filling raises magnet risk).

## 4. What to defer
- Changing the *winner* logic (centrality penalty / specificity tiebreak / exposure-tax baked into
  serving) — the evidence shows the winner logic + hints are correct for tonal queries, and a naive
  penalty would harm. Revisit only with **real user query logs** + human relevance labels.
- Learned reranking / embedding normalization — over-engineering at 22 SIOs.

## 5. Risks of over-diversifying
- A diversity penalty can **suppress the genuinely best SIO** (the prompt's explicit caution). Our
  conservative choices avoid this: MMR never touches the #1 winner, and we did **not** add a
  centrality penalty (which would have actively mis-ranked, per the data).
- Author-written probes can **overfit** — the gate threshold is a coarse dominance signal for human
  review, not an automated reject-and-forget.

## 6. Risks of leaving magnets unfixed
- One vivid/broad SIO becomes the de-facto answer for an entire state, so users with different
  tones/variants all get the same insight → erodes the "right insight for THIS person" promise and
  the trust positioning. McKeown would have done this to engagement-drought had it been served.
- As the corpus grows, magnets compound (a new broad SIO can silently displace specific ones) —
  hence the promotion gate before each addition.
