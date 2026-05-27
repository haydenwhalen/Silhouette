# Six-State Expansion — Quality Review (Phase 8)

> **Scope.** Critical review of the 21 new-state candidates harvested in Phases 5–7
> (possibility-paralysis, identity-transition, momentum-gap) and the promotion decision for each.
> Reviewer: the agent acting as the delegated human reviewer (per the original prompt's "promote
> SIOs that meet standards" + "personally review each draft"). Date: 2026-05-26.
>
> **Honesty posture.** Promotion is to `corpus/sios/` as **`prototype_only`** only — never `approved`.
> `transcript_verified` stays **false** (these are honest reconstructions/paraphrases of documented
> ideas; none had a continuous verbatim block fetched). The verbatim-verification + `approved`
> upgrade remains a separate, evidence-backed human step. No quote/URL/timestamp/video-id was
> fabricated; the deterministic verifier reported **0 FAILs** across all 21 candidates.

## Outcome at a glance

| state | promoted | held (needs_review) | served total |
|---|---|---|---|
| possibility-paralysis | 6 | 1 | 6 |
| identity-transition | 7 | 0 | 7 |
| momentum-gap | 5 | 2 | 5 |
| **total** | **18** | **3** | corpus 27 → **45** |

**Scoring summary (all 21):** every candidate passed the **anti-generic gate** (non_genericness &
state_specificity ≥ 3; 0 triggers), all scored **HRS 85** (capped by the unverified-resonance cap —
none verbatim-verified), overall 87–93, all rated **NOVEL** (max corpus similarity 0.44–0.71, well
under the 0.72 similar / 0.85 duplicate thresholds), and all passed deterministic source
verification with **0 FAILs** (WARNs only — the expected "no verbatim excerpt / no confirmed video"
flags for reconstructions).

---

## Critical fix surfaced during review (linchpin)

Behavioral validation (not the handoff note) found that **`src/agent/stateClassifier.ts` was still
pinned to the 3 MVP states**: the system prompt described all six, but the Zod
`detected_state` enum was built from a 3-state `MVP_STATES`, so `withStructuredOutput` physically
coerced every new-state query into an MVP state (PP→inaction-loop, IT→direction-collapse,
MG→direction-collapse/inaction-loop). **The entire expansion was inert at runtime.** Fixed by
widening `MVP_STATES` to all six (kept in sync with `retrievalConfig.ts` MvpState; runtime-pin
comment added). Post-fix, all 10 probe queries classify into the correct new state at high
confidence and retrieve register-appropriately. This is the single most important change in the
phase — the corpus work would have been wasted without it.

---

## The 15 review dimensions

1. **State fit.** Every promoted SIO carries an explicit state-fit + disambiguation sentence in
   `user_problem_match_notes`. Post-fix classification probe: 10/10 correct state at high confidence.
2. **Disambiguation from existing states.** PP-vs-inaction-loop, IT-vs-direction-collapse, and
   MG/restart-friction-vs-inaction-loop are each covered by a dedicated calibration boundary case
   (Phase 9). The IT↔DC boundary is genuinely fuzzy for "achieved-and-feel-empty" phrasing (a "sold
   my company, feel hollow" query can read as post-achievement direction-collapse) — documented as a
   known limitation; unambiguous IT signals (discrete role-loss + identity) classify correctly.
3. **Source integrity.** All sources are real, official, and verifiable (Schwartz/Chang/Ferriss TED;
   Sivers/Rich Roll tim.blog; Brown/Agassi/Grant/Feiler books; Huberman/Fogg/Neff official
   talks/episodes; Renfrew verified Rich Roll #954; Robbins Let Them Theory). No aggregators/re-uploads.
   Deterministic verifier: 0 FAILs.
4. **Transcript verification.** None claimed as verbatim — all `quote_type: paraphrase`,
   `transcript_verified: false`, honest reconstructions. (tim.blog fetch attempts for Sivers/Rich Roll
   confirmed the *ideas* but did not yield a clean continuous block, so paraphrase was kept — the
   correct honest call.)
5. **Media/video metadata honesty.** All promoted as `text-only`; `video_id`/`embed_url` empty (never
   fabricated); `media_verification_status` honest (`not_applicable` for books/audio, `needs_review`
   for the TED talks where a video exists but no embed was confirmed). `validate-media`: PASS, 0 hard
   violations (3 honest "link, no verified video" warnings for the TED sources).
6. **Human Resonance.** All HRS 85 (capped). Dimension detail shows 5/5 on state_specificity,
   felt_recognition, reframe_power, emotional_precision for nearly all — strong content quality.
7. **Novelty.** All NOVEL vs the existing corpus. Note: the two Mel Robbins candidates overlapped
   *each other* (novelty only compares to served SIOs); the weaker (`envy-as-signal`) was held.
8. **Magnet risk.** No-hint report flags Chang (PP 5/8) and Renfrew (IT 5/8) as default-path
   dominators — but the intake-hint layer fully diversifies in production (the hinted probe routes the
   direct PP query to Martell, the mechanism one to Schwartz, etc.; Chang won 0 of the 3 hinted PP
   probes). This is the same monitored-not-blocked posture as the existing Newport/Huberman defaults.
   **No demotion required**; confirmed by the hinted calibration cases.
9. **Corpus balance.** 9/9/9/6/7/5 across the six states. New states are below the existing 9 (quality
   over count) — acceptable; documented as a follow-up harvest target.
10. **Source concentration.** No speaker > 2 in any state. James Clear capped at 1 in momentum-gap
    (and is a *distinct* moment — "never miss twice" — from the existing inaction-loop Clear SIO).
    Two Mel Robbins comparison-spike reframes collapsed to one (dedup). Howes appears once in IT
    (promoted) and once in MG (held — see below).
11. **Voice/register diversity.** PP: intellectual×3, direct×2, vulnerable×1. IT: vulnerable×4,
    intellectual×2, warm×1. MG: expert×2, warm×2, intellectual×1. Register **exclusions** honored
    (PP-4 excludes warm; IT excludes direct for grief; MG comparison-spike excludes direct).
12. **Insight_type diversity.** PP: reframe×4, mechanism×1, permission×1 (no story — gap). IT:
    story×4, reframe×2, permission×1 (no mechanism — gap). MG: mechanism×2, reframe×2, permission×1
    (no story — howes-behind held). Gaps documented, not padded.
13. **Presentation readiness.** All are `text-only` with a clean key_claim + content_summary +
    attribution_text + honest reconstruction-note body. They render through the existing presentation
    layer with no new code. Dates are flagged APPROXIMATE pending human verification.
14. **Calibration strength.** Phase 9 adds 13 retrieval-calibration cases + 3 classification cases for
    the new states, including the three hardest disambiguation boundaries. (Results in Phase 9.)
15. **Likely user mismatch / harmful register risk.** Register exclusions enforce the "do no harm"
    rules (no direct/challenging tough-love on fresh identity grief or comparison-spike; no
    warm-validation of decision-avoidance). Identity-transition candidates were screened to stay within
    "functional but disoriented" — none edge into clinical grief/crisis.

---

## Promotion decisions (per candidate)

### Promoted → `corpus/sios/` (prototype_only)

**possibility-paralysis (6)**
- `pp-schwartz-paradox-of-choice` — mechanism / intellectual — maximizer-vs-satisficer. Canonical, tier-1.
- `pp-chang-hard-choices` — reframe / intellectual — "on a par; we make ourselves by committing." Tier-1.
- `pp-ferriss-fear-setting` — reframe / intellectual — define the fear, deflate the inflated worst-case.
- `pp-martell-research-avoidance` — reframe / **direct** — research-as-avoidance, cost of not choosing.
- `pp-sivers-hell-yeah-or-no` — reframe / **direct** — if it's not a hell-yeah, it's a no; threshold not tie-break.
- `pp-brown-vulnerability-commitment` — **permission** / vulnerable — choose without controlling the outcome.

**identity-transition (7)**
- `it-renfrew-post-exit-identity` — story / vulnerable — founder forced out post-sale; "identity crisis."
- `it-agassi-open-identity-vacuum` — story / vulnerable — hated tennis, yet it organized his whole self.
- `it-howes-athlete-identity-floor` — story / vulnerable — career-ending injury; "didn't know who I was without sports."
- `it-rich-roll-recovery-reinvention` — story / vulnerable — sobriety + leaving law; "never without a track."
- `it-brown-braving-wilderness` — **permission** / warm — wilderness; belonging to yourself after a relationship ends.
- `it-feiler-lifequake-messy-middle` — reframe / intellectual — the messy middle is structural, not failure.
- `it-grant-identity-as-structure` — reframe / intellectual — identity is a structure; anchor to values, not roles.

**momentum-gap (5)**
- `mg-huberman-limbic-friction-reentry` — mechanism / expert — limbic friction; don't double-compensate, just restart.
- `mg-fogg-shrink-the-restart` — mechanism / expert — you lost automaticity, not knowledge; make re-entry tiny.
- `mg-clear-never-miss-twice` — reframe / intellectual — missing once is an accident; never miss twice (distinct from the inaction-loop Clear SIO).
- `mg-neff-lapse-not-identity` — **permission** / warm — the lapse is not your identity; talk to yourself like a friend.
- `mg-robbins-jealousy-future-self` — reframe / warm — jealousy/envy is a values signal; go a layer deeper.

### Held → `needs_review` (kept in `corpus/candidates/`, not served), honest reasons

- **`pp-huberman-dopamine-uncertainty`** — its own notes flag the "perpetual optionality = dopamine
  seeking loop" application as a *reconstruction-by-extension* of Huberman's documented dopamine
  mechanism (the mechanism is real; applying it specifically to choice-paralysis is the reviewer's
  synthesis). Holding to avoid over-attribution. Re-evaluate if the episode is confirmed to make the
  optionality link explicitly.
- **`mg-howes-behind-at-23`** — self-flagged "Flag for human review": the internal "I decoded the
  feeling as a signal" framing is a paraphrase-reconstruction of the period, not a documented quote;
  and it reuses the same biographical moment as the (promoted) IT Howes SIO. Held to avoid
  same-story double-dip + an unverified internal framing.
- **`mg-robbins-envy-as-signal`** — de-dup against `mg-robbins-jealousy-future-self` (both Mel
  Robbins, warm/reframe/comparison-spike). Kept the stronger, more distinctive one (quote_quality
  100 vs 75; "go a layer deeper to your values" vs the more generic "insecurity putting a lid").

### Consistent rule applied
Any candidate whose **own notes** request human review of the *core framing* (reconstruction-by-
extension) was held, not served. This kept momentum-gap's comparison-spike sub-state thin (1 served
SIO) — accepted as an honest gap rather than padded.

---

## Known limitations carried into Phase 10

- **Reconstruction ratio rose to 84% (38/45).** Predicted; all new SIOs are honest paraphrases. The
  verbatim-verification workstream is the trust priority.
- **Type gaps:** PP has no `story`, IT has no `mechanism`, MG has no `story` (howes-behind held).
- **MG comparison-spike is thin** (1 served SIO). Follow-up harvest target.
- **IT↔direction-collapse boundary** is fuzzy for "achieved-and-empty" phrasing — a real classifier
  limitation, mitigated but not eliminated.
- **Approximate dates** on several SIO frontmatters (flagged in-file; human to verify exact YYYY-MM-DD).
</content>
