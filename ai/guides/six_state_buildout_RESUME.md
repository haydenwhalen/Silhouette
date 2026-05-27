# RESUME — Expanded Six-State Corpus Buildout (handoff for a fresh session)

> **Why this file exists.** The Six-State Buildout run was started in a session that is being
> relaunched in `--permission-mode bypassPermissions` (fresh context). This file is the handoff so
> the new session can continue with no lost work. Everything below "done" is already on disk.
> **Original task prompt:** `/Users/haydenwhalen/Downloads/silhouette_expand_remaining_3_states_prompt.md`
> **Authorization:** Hayden explicitly approved running the full 10-phase task autonomously, in
> bypass mode, while away. Honesty/safety boundaries from the prompt remain in force.

## The goal
Expand Silhouette from the 3 MVP states to all **6** User Problem Model states (add:
possibility-paralysis, identity-transition, momentum-gap), target ~9 SIOs/state (~54 total).
**Quality over count** — never force weak/fabricated SIOs through. Plan doc:
`ai/guides/six_state_corpus_expansion_plan.md`. State definitions for harvesting:
`ai/guides/remaining_states_sio_strategy.md`.

## NON-NEGOTIABLE honesty/safety boundaries (from the prompt)
- No fabricated quotes / transcript text / timestamps / video IDs / source URLs.
- No quote-site or aggregator as a source or as verification. Canonical official URLs only.
- `quote_type` honest; `transcript_verified: true` ONLY with genuinely confirmed verbatim text.
- `human_review_status: approved` ONLY with real evidence + review. Autonomous harvest produces
  `prototype_only` drafts in `corpus/drafts/`; **a human gates the move to `corpus/sios/`.**
- If uncertain → `needs_review`. If useful but unverifiable → honest reconstruction/prototype only.
- Do not weaken any existing honesty/integrity/magnet gate. No push to GitHub. No deploy. No reading/printing `.env`.

## STATUS (as of handoff, 2026-05-26)

### ✅ DONE
1. **Phase 1 — planning docs.** Created `six_state_corpus_expansion_plan.md`. Added status notes to
   `user_problem_model.md §4` and `agentic_sio_discovery_workflow.md`. Deliberately did NOT rewrite
   `silhouette_strategic_summary.md` (its wedge/anti-roadmap is the discipline we don't want to undercut).
2. **Phase 2 — state strategy.** Created `remaining_states_sio_strategy.md` (14 dims × 3 states,
   incl. register-exclusion rules and 9-SIO target profiles).
3. **Vocabulary expansion to 6 states (code).** `tsc --noEmit` is GREEN. Edited:
   `src/rag/retrievalConfig.ts` (MvpState union + STATE_DEFAULT_RESONANCE: pp→reframe/intellectual-measured,
   it→story/vulnerable-personal, mg→reframe/warm-affirming), `src/agent/stateClassifier.ts` (MVP_STATES +
   schema + system prompt: added 3 state blocks + disambiguation rules + output enum),
   `scripts/lib/discovery.ts` (MVP_STATES→6), `scripts/lib/magnet-probes.ts` (MAGNET_PROBES + ALL_STATES,
   8 probes/new-state), `src/tools/knowledgeBase.ts` (STATE_VALUES), `scripts/evaluate-sio-candidate.ts`
   (detected_state enum + "6 Stuck States" prompt), `scripts/find-source-candidates.ts`
   (STATE_TOPIC_SEEDS + extended family strong_states), `scripts/analyze-user-need-coverage.ts`
   (display map + source families), `corpus/candidates/candidate_template.yaml` (target_state comment).
   **Runtime-pin note:** to pin runtime back to MVP-3, comment out the 3 added states in
   `retrievalConfig.ts` MvpState and `stateClassifier.ts` MVP_STATES (clearly delimited in-file).
4. **Phase 3 — user-need + query patterns.** Added 15 needs (5/new state) to
   `corpus/user_need_patterns.yaml` and 30 queries to `corpus/user_query_patterns.yaml` (all
   `status: hypothesis`). `npm run analyze-user-needs` runs clean: the 15 new-state needs correctly
   show `🔴 none / corpus_gap`.
5. **Phase 4 (partial) — gap detection.** `npm run detect-gaps` correctly maps the 6-state matrix
   (new states = top targets; direction-collapse over-represented; 20/27 = 74% reconstructions).
   Report: `ai/guides/corpus_gap_detection_report.md`. `analyze-user-needs` reports also written.

### 🔄 REMAINING (do these in order)
- **Phase 4 finish:** run `npm run find-source-candidates` (writes
  `ai/guides/source_candidate_discovery_report.md`). Then WRITE
  `ai/guides/six_state_sio_harvesting_plan.md`: current/target counts by all 6 states; specific
  per-SIO target profiles for the 3 new states (insight_type/register/intensity/verification/media/
  source diversity per `remaining_states_sio_strategy.md §14`); which need pattern each planned SIO
  serves; recommended source families; risks (generic content, source concentration, reconstruction
  ratio, magnets, weak disambiguation); per-SIO acceptance criteria. Must be specific, not generic.
- **Phases 5–7 — harvest** possibility-paralysis, identity-transition, momentum-gap (up to 9 each,
  quality over count). Per SIO: research a REAL source moment (WebSearch/WebFetch) → create
  `corpus/candidates/cand-<speaker>-<topic>.yaml` (honest fields; verbatim only if actually fetched —
  artofmanliness.com & tim.blog are WebFetch-readable; TED transcripts are NOT) → run
  `npm run evaluate-candidate -- --candidate <p>`, `score-candidate-novelty`, `verify-candidate-source`
  (or `npm run discover-sios -- --candidate <p>`) → if it passes gates, `draft-sio-from-candidate`
  (writes `prototype_only` to `corpus/drafts/`) → run `npm run test-magnet-risk`. Recommended harvest
  order: identity-transition, then possibility-paralysis, then momentum-gap (hardest: 2 sub-states +
  restart-friction↔inaction-loop confusion + source-concentration on habit content).
  Suggested sources by state are in `remaining_states_sio_strategy.md §9` and the plan doc §5.
  **Parallelization option:** run 3 background sub-agents (one per state); each ONLY writes its own
  cand-/draft- files and runs read/scoring scripts; it must NOT edit shared files (lib/discovery.ts,
  calibration tests, the query/need yaml, gap reports, package.json) and must NOT approve or move
  anything to corpus/sios/. Reconcile shared edits yourself.
- **Phase 8 — quality review + serve-gate.** WRITE `ai/guides/six_state_expansion_quality_review.md`
  (15 review dims from the prompt). Personally review each draft; move only quality-passing ones to
  `corpus/sios/` as `prototype_only` (`transcript_verified: false` unless genuinely verbatim-confirmed).
  Hold/needs_review/reject the rest with honest notes. Then update candidate_status accordingly.
- **Phase 9 — calibration + tests.** Add calibration + disambiguation + tone cases for the new
  states (esp. momentum-gap/restart-friction vs inaction-loop; identity-transition vs
  direction-collapse/post-achievement; possibility-paralysis vs inaction-loop). Run and make green:
  `npx tsc --noEmit`, `npm run build`, `npm run validate-media`, `npm run detect-gaps`,
  `npm run analyze-user-needs`, `npm run review-candidates`, `npm run test-sio-retrieval`,
  `npm run test-state-classification`, `npm run test-present-insight`,
  `npm run test-retrieval-calibration`, `npm run test-magnet-risk`. (Calibration/classification test
  files: `scripts/test-retrieval-calibration.ts`, `scripts/test-state-classification.ts`,
  `scripts/test-sio-retrieval.ts` — they import `MvpState`, so widening is fine; ADD new-state cases.)
- **Phase 10 — score, weakness review, final report.** Score /10, top 3–5 weaknesses (why it
  matters / what breaks / fix), research best practices, apply fixes, rescore. Produce the 21-point
  final response from the prompt. Be honest about prototype vs verbatim counts and what's deferred.

## Key risks already identified (carry forward)
- **momentum-gap restart-friction ↔ inaction-loop** is the sharpest disambiguation; calibrate hard.
- **identity-transition vs direction-collapse/post-achievement** (discrete event vs chronic drift).
- **Source concentration** on James Clear / habit content for momentum-gap restart — force diversity.
- **Reconstruction ratio** is already 74%; new prototype_only SIOs raise it. Prefer fetchable-transcript
  sources where possible; report the ratio honestly.
- Expanding the classifier to 6 states **changes live retrieval behavior**; the runtime-pin option exists.

## Verification state at handoff
- `npx tsc --noEmit`: GREEN. Full `npm run build` + test suite: NOT yet run (Phase 9).
