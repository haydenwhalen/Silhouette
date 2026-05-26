# SIO Discovery Agent — Build Phase Report (score / weaknesses / research / fixes)

> Companion to `agentic_sio_discovery_system_design.md` (architecture) and
> `agentic_sio_discovery_workflow.md` (operator guide). Records Phases H–K of the build.
> Date: 2026-05-25.

## What was built

A local, agentic-but-human-gated SIO Discovery Agent: a shared contract lib
(`scripts/lib/discovery.ts`), 8 module scripts + an orchestrator, a candidate inbox
(`corpus/candidates/`) + draft staging (`corpus/drafts/`), 2 design/workflow docs, and 3
example candidates. npm scripts: `detect-gaps`, `find-source-candidates`, `evaluate-candidate`,
`score-candidate-novelty`, `verify-candidate-source`, `review-candidates`,
`draft-sio-from-candidate`, `discover-sios` (orchestrator).

## End-to-end run (Phase G) — the system works as designed

Ran `npm run discover-sios` on the 3 example candidates:

| Candidate | Resonance | Novelty | Outcome | Why this is correct |
|---|---|---|---|---|
| Generic positivity clip | 0 (anti-generic gate: non_genericness=1, state_specificity=1) | novel | **REJECT** | The differentiator working — a generic motivational line is killed regardless of novelty. |
| Newport "skill over passion" dup | 85 (strong content) | **duplicate** (0.854 vs `sio-newport-skill-not-passion-2012`) | **REJECT** | Dedup catches a well-sourced but redundant candidate. |
| Susan David — emotional courage | 85 (capped) | novel | **NEEDS WORK** → `needs_stronger_source` | Strong + gap-filling, but gated on missing verbatim/source evidence. |

No candidate auto-advanced; the agent stopped for human review. Drafter refuses non-ready
candidates (exit 2) and `--force` produces only `prototype_only` drafts in `corpus/drafts/`
with `transcript_verified: false`.

## Phase H — Initial score: 8 / 10

Strong: genuinely agentic in scoring (LLM-as-judge Human Resonance) + drafting; deterministic
where correctness matters (gap/novelty/verify/review); honesty invariants enforced in code;
the anti-generic gate + dedup + evidence gating all demonstrably fire; tsc + build clean; full
8-module + orchestrator coverage; the Human Resonance Score (10 evidence-anchored dims,
resonance-dominant 0.40 weight) is a real differentiator from generic relevance-only RAG.

Capped at 8 because: discovery is still query-generation not autonomous fetching; the LLM judge
was over-generous on polished paraphrases (Susan David 100/100); novelty thresholds are
corpus-size-sensitive; it's CLI scripts, not a review UI.

## Phase I — Top weaknesses

1. **LLM-judge calibration / over-generosity (single judge, no human-rated set).** Observed: a
   clean paraphrase scored 100/100. LLM judges are known to be mis-calibrated and reward polish.
   *If ignored:* the queue's scores mislead a human skimmer; weak candidates look elite.
   *Fix:* see Phase K (verification cap); later add a small human-rated calibration set.
2. **Source discovery is query-generation, not autonomous.** The Source Scout emits ranked
   official-source queries; a human/agent runs them. No YouTube Data API / web fetch wired.
   *If ignored:* the "find new sources" step stays manual, slowing the path to 40–50 SIOs.
   *Fix:* deliberate for honesty/safety now; integrate YouTube Data API (`search.list` →
   `channelId` match) behind a key later.
3. **Novelty thresholds are corpus-size-sensitive.** Calibrated on 19 SIOs (duplicate ≥0.85,
   similar ≥0.72). The embedding space densifies as the corpus grows.
   *If ignored:* false "duplicate" flags at scale. *Fix:* recalibrate at ~60 and ~200 SIOs.
4. **CLI, not a review dashboard.** Practical for one operator via terminal; review at 40–50+
   candidates would want a lighter surface. *Fix:* defer; the candidate YAML is already a clean,
   append-only review record a UI could read.
5. **Carried constraint: ted.com transcripts aren't machine-fetchable.** So the verbatim step
   for the most common verified source (TED) still needs a human paste or an API — the gate
   between `ready_for_sio_draft` and `approved`. *Fix:* human paste / transcript API (deferred).

## Phase J — Research → application

- **LLM-as-judge** (Agenta, Evidently, RULERS/arXiv): lock the rubric, anchor each dim with
  concrete examples, REQUIRE evidence, accept mis-calibration, calibrate against human ratings.
  → *Kept:* evidence-anchored locked rubric + anti-generic gate. *Changed now:* added a
  verification cap (Phase K). *Deferred:* human-rated calibration set + multi-judge ensemble.
- **HITL agentic pipelines** (iMerit, production-RAG patterns): agents draft, humans approve;
  confidence routes to a review queue; approval records must be structured + append-only.
  → *Kept:* candidate YAML as the structured approval record; statuses as gates; drafts→staging.
  *Deferred:* dashboard.
- **Official-source verification** (YouTube Data API docs): match `channelId`, don't trust titles.
  → *Deferred:* API integration; *Kept:* never write an unverified `video_id`; `needs_review` default.
- **Novelty/embeddings:** thresholds drift with corpus size → recalibration cadence documented.

## Phase K — Fix applied + rescore

**Applied:** a **verification cap** (`UNVERIFIED_RESONANCE_CAP = 85` in the shared lib,
`applyVerificationCap`). When a candidate has no VERIFIED VERBATIM excerpt
(`quote_type === "verbatim"` AND `transcript_verification_status === "verified"`), the
`human_resonance_score` is capped — because the evaluator is otherwise scoring the reviewer's
paraphrase, not the speaker's actual moment. Verified on Susan David: raw 95 → capped 85, with a
visible "⚑ capped … (no verified verbatim excerpt yet)" note. The recommendation gate already
independently blocked drafting; the cap makes the *displayed score* honest too.

**Deferred (documented, not built):** YouTube Data API source verification; human-rated judge
calibration set; novelty-threshold recalibration at 60/200 SIOs; review dashboard.

**Revised score: 8.5 / 10.** +0.5 for the calibration cap (directly fixes the one observed
mis-behavior) and for the E2E proving the anti-generic gate + dedup + evidence gating all fire
correctly. Not higher because discovery is still semi-manual by design and the judge calibration
is unvalidated against human ratings.

## Is it ready to support building toward 40–50 SIOs?

Yes, as a **research-and-triage assistant** with a human at the gate. It reliably (a) tells you
what to source next, (b) generates official-source queries, (c) scores resonance + flags
generic/duplicate candidates, (d) verifies what's honestly verifiable, (e) queues for review,
and (f) drafts safely to staging. The human still verifies verbatim quotes and approves — which
is exactly the invariant that keeps the corpus from filling with junk.
