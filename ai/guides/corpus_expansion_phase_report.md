# Silhouette — Corpus Expansion Phase Report (+10 SIOs / video metadata)

> Companion to `corpus_gap_report.md` (the pre-expansion baseline). Covers the scoring,
> weaknesses, research, and fixes for the batch that took the corpus from 9 → 19 SIOs.
> Date: 2026-05-25.

## What this phase did

Added 10 TED/TEDx-sourced SIOs to fill the gaps identified in the gap report (thin voice
registers, low tier-3, no per-state mechanism/permission coverage), and introduced the first
**functional video embeds** in the corpus using TED's official `embed.ted.com` player. No
quotes, video IDs, or timestamps were fabricated; all 10 excerpts are clearly-marked
reconstructions pending verbatim transcript ingestion.

## Coverage delta (9 → 19)

| Dimension | Before (9) | After (19) |
|---|---|---|
| State | DC 3 / ED 3 / IL 3 | **DC 7 / ED 6 / IL 6** |
| insight_type | perm 2, story 3, reframe 2, mech 2 | **perm 5, story 4, reframe 6, mech 4** |
| voice_register | direct 3, intel 3, vuln 1, warm 1, expert 1 | **direct 4, vuln 4, intel 4, warm 3, expert 4** |
| credibility_tier | t1 3, t2 5, t3 1 | **t1 7, t2 8, t3 4** |
| intensity | mild 3, moderate 5, intense 1 | **mild 9, moderate 9, intense 1** |
| functional video embeds | 0 | **10** |
| verbatim (transcript_verified) | 0 / 9 | **0 / 19** |

## Step 10 — Initial score: 8 / 10

**Strengths:** 10 well-differentiated SIOs; all load cleanly (0 skipped); near-even state
balance; all three thin registers filled and tier-3 raised 1→4; first official video embeds;
strict sourcing honesty (no fabricated quotes/IDs/timestamps); calibration expanded to 21
cases at 95%; tsc/build/all corpus tests green; doc hygiene done (gap report, source objects,
`source_candidates.md` decisions).

**Why not higher:** the register-diversity gain is largely *on paper* — see weakness #1.
Sourcing is still 100% reconstruction. The calibration set is self-authored.

## Step 11 — Top 3 weaknesses

### W1 — Resonance selectivity didn't improve as much as corpus balance did
The engagement-drought **default-resonance profile** (+0.05 mechanism, +0.04 expert) plus
weak/absent classifier resonance inference means the new warm/permission/vulnerable ED SIOs
(Brown, Huffington, Achor) are systematically out-ranked by the mechanism/expert SIOs
(Huberman, Pink) even when the user's language clearly signals warmth/permission.
- **Evidence:** calibration `ed-4` (burnout / "rest feels like failing") retrieves Huberman,
  not the ideal Huffington; Pink/Huberman won 5 of the ED-side cases. Left as a documented
  failing **canary** in the suite.
- **Why it matters:** the users who most need warm/permission content (self-critical,
  depleted, ashamed) are precisely the ones the default profile routes to mechanism content.
- **If ignored:** the diversity investment doesn't reach the users it was for; "more balanced
  corpus" overstates the real-world improvement.

### W2 — Sourcing integrity ceiling: all reconstructions, embeds-only video, no timestamps/IDs
All 19 SIOs are `transcript_verified: false` / `prototype_only`; this batch adds 10 more. The
video metadata is **embed-only** — official TED embeds play from talk start; there is no
verified per-moment timestamp and no playback-verified YouTube `video_id`.
- **Why it matters:** Silhouette's trust positioning depends on accurate, attributable
  sourcing; a paraphrase that drifts risks misattribution, and a non-timestamped embed makes
  the user hunt for the moment.
- **If ignored:** credibility/legal exposure on drift; weaker "hear it from the source" payoff.

### W3 — The calibration set is entirely self-authored (circularity)
The same author wrote both the SIOs and the 21 calibration queries that retrieve them, so the
95% pass rate measures internal consistency, not real-user validity. Secondary distribution
note: Direction Collapse is now reframe-heavy (4/7) with a dense 3-SIO post-achievement
cluster, and `intense` intensity remains at 1 (only Goggins) — no "hard push" option in DC/ED.
- **Why it matters:** a high score on a self-authored set can mask retrieval gaps that only
  real, messy user phrasing exposes.
- **If ignored:** false confidence going into user testing.

## Step 12 — Research (best practices) and how they apply

### For W1 — metadata boosts vs. semantic intent / re-ranking
- **Found:** Retrievers rank on surface similarity, "what looks right, not what means right";
  the standard fix is a **second-stage re-ranker** and **hybrid** (semantic + metadata)
  scoring tuned so structured boosts don't override intent. Metadata is most useful *fused
  into the embedding* and/or applied via a dedicated reranker rather than as flat additive
  boosts. (Qdrant reranking guide; NVIDIA "Enhancing RAG with Re-ranking"; arXiv 2510.24402
  metadata-driven RAG.)
- **Apply:** Silhouette's flat additive boost (`RETRIEVAL_CONFIG`) is exactly the failure mode
  — a fixed +0.09 default-profile boost can rescue a semantically-weaker mechanism SIO over a
  better-matched warm one.
- **Keep:** the hard +0.20 boost cap and state filtering (sound).
- **Change (deferred):** make the default-profile boost *conditional* — suppress or shrink it
  when the query's inferred register diverges from the state default; strengthen the
  classifier's resonance inference so warm-signaling queries produce an intake hint.
- **Defer:** introducing a true cross-encoder re-ranker — over-engineering for a 19-SIO MVP.

### For W2 — transcript verification + timestamped embeds
- **Found:** TED publishes official transcripts for essentially all talks (low-effort
  verbatim source). For deep-linking, the standard is `youtube-nocookie.com/embed/{id}?start={s}&end={e}`
  with times in seconds; the `end` param works only on embeds; nocookie is the privacy default.
  (Stornaway URL-parameter guide; Autodidacts `end`-param; YouTube Help embed docs.)
- **Apply:** the SIO schema already encodes `embed_url`, `timestamp_start_seconds`,
  `timestamp_end_seconds`, youtube-nocookie format — the data is simply unfilled.
- **Keep:** the TED official embed as the verified interim embed; honest blank `video_id`.
- **Change:** ingest TED official transcripts to convert top SIOs to verbatim + real
  timestamps; verify official-TED-channel `video_id`s, then populate youtube-nocookie embeds.
- **Defer:** a full automated transcript-ingestion pipeline (explicitly out of scope).

### For W3 — eval-set design / circularity
- **Found:** Don't build and evaluate with the same process; use **human-verified** golden
  answers, audit overlap/contamination, and combine **LLM-as-judge** (broad coverage, with
  known biases — length/position/self-preference) with **targeted human review of failures**.
  (Microsoft "path to a golden dataset"; Patronus RAG metrics; CCRS arXiv 2506.20128.)
- **Apply:** the first 3 friendly testers (see `first_three_tester_plan.md`) are the natural
  source of *real* queries; their verbatim phrasings should seed held-out calibration cases.
- **Keep:** the structured case format (query / expected state / acceptable set / reason) and
  the discriminator design.
- **Change:** label cases by author origin; add tester-sourced cases as they arrive; consider
  an LLM-as-judge relevance pass over top-k to supplement winner-match.
- **Defer:** a formal human-judged relevance dataset until there is real usage.

## Step 13 — Fixes applied this phase (MVP-appropriate) + rescore

Applied now (in-scope, low-risk):
- Widened 4 stale calibration acceptable-sets to include the new valid answers (documented in
  each `reason`); added the `ed-4` **canary** so W1 stays visible every run.
- Marked all 10 new SIOs honestly: `transcript_verified: false`, `prototype_only`,
  in-body reconstruction notes, `media_rights_notes` documenting the `video_id` deferral, no
  invented timestamps.
- Doc hygiene: gap report, 10 source objects with verification notes, `source_candidates.md`
  decisions, this report.

Deliberately deferred (would be over-engineering / out of scope this phase):
- Retrieval-engine retuning for W1 (conditional default-profile boost / classifier resonance
  inference) — needs a dedicated tuning pass with human-judged data.
- Verbatim transcript + timestamp + `video_id` ingestion for W2 — needs the transcript
  pipeline that is explicitly out of scope.
- Real-user / held-out calibration for W3 — needs the first testers.

**Revised score: 8.5 / 10.** +0.5 for surfacing W1 as a transparent canary and documenting
the deferred fixes with researched, concrete recommendations rather than masking them. Not
higher because the three weaknesses are real and remain structurally open by design.

## Net readiness

The corpus is meaningfully **less thin and better balanced**, and now demonstrates real video
embedding — a clear step toward user-testability. The main caveat for testing: warm/permission
ED content may not surface for the users who need it until W1 is addressed, so watch retrieval
register-fit during the first-tester sessions.
