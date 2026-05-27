# Six-State SIO Harvesting Plan — possibility-paralysis · identity-transition · momentum-gap

> **Phase:** Expanded Six-State Corpus Buildout — Phase 4 deliverable (the mechanical "what to
> harvest" artifact). Created 2026-05-26.
> **Reads from:** `corpus_gap_detection_report.md`, `source_candidate_discovery_report.md`,
> `user_need_harvesting_targets.md`, and `remaining_states_sio_strategy.md` (state definitions +
> §14 target profiles). **Strategy parent:** `six_state_corpus_expansion_plan.md`.
> **This plan is specific by design.** It assigns each planned SIO a slot id, a target
> insight_type/register/intensity, the user need it serves, candidate source families, the expected
> verification posture, and per-SIO acceptance criteria. It is NOT "make 27 generic SIOs."

---

## 1. Current corpus count by all 6 states

| state | SIOs in `corpus/sios/` | status |
|---|---|---|
| direction-collapse | 9 | built (MVP) |
| engagement-drought | 9 | built (MVP) |
| inaction-loop | 9 | built (MVP) |
| possibility-paralysis | 0 | **harvest target** |
| identity-transition | 0 | **harvest target** |
| momentum-gap | 0 | **harvest target** |
| **total** | **27** | |

## 2. Target count by all 6 states

| state | near-MVP target | delta to harvest |
|---|---|---|
| direction-collapse | ~9 (hold — over-represented; do NOT add) | 0 |
| engagement-drought | ~9 (hold) | 0 |
| inaction-loop | ~9 (hold) | 0 |
| possibility-paralysis | ~9 | up to 9 |
| identity-transition | ~9 | up to 9 |
| momentum-gap | ~9 | up to 9 |
| **total** | **~54** | **up to 27** |

**9-per-state is a target, not a quota.** Quality gates (HRS, anti-generic, novelty, source
integrity, magnet) override the count. Shipping 6 excellent SIOs for a state beats 9 with weak fits.

## 3. Verification posture (honest, up front)

Fetchable official transcripts → a chance at **verbatim-verified**: `tim.blog` (Tim Ferriss Show),
`artofmanliness.com`. **NOT** fetchable here: `ted.com`/`embed.ted.com` transcripts, most podcast
sites, books. Anything from a non-fetchable source enters as an **honest reconstruction**
(`quote_type: paraphrase`, `transcript_verified: false`, `human_review_status: prototype_only`) — the
same standard as the existing 20 reconstructions in the corpus. We expect **most** new SIOs to be
reconstructions; we will get verbatim only where we actually fetched and confirmed a continuous block.
Per-slot expectation is noted below. The reconstruction ratio will rise — reported honestly in Phase 10.

---

## 4. Per-SIO target profiles

Legend — **type**: reframe/permission/mechanism/story · **reg**: voice_register · **int**: intensity ·
**need**: served `need_id` from `user_need_harvesting_targets.md` · **verif**: expected verification
(verbatim-plausible only via tim.blog/artofmanliness).

### State A — possibility-paralysis (target 9)
§14: mechanism (Schwartz) ×1–2; reframe (Chang / commitment-creates-clarity) ×2–3; direct reframe on
cost of optionality ×1–2; story of a real high-cost commitment ×1–2; ≤1 permission. Lead
intellectual/measured + direct/challenging; ≥1 vulnerable/personal. Mostly moderate, ≥1 mild.

| slot | type | reg | int | need | candidate source family / speaker | verif |
|---|---|---|---|---|---|---|
| PP-1 | mechanism | intellectual/measured | mild | pp-maximizer-never-satisfied | Barry Schwartz — *Paradox of Choice* (maximizer vs satisficer) | reconstruction (TED/book) |
| PP-2 | reframe | intellectual/measured | moderate | pp-commitment-creates-clarity | Ruth Chang — "hard choices, we make ourselves" | reconstruction (TED) |
| PP-3 | reframe | direct/challenging | moderate | pp-too-many-options-none-chosen | Derek Sivers — "Hell Yeah or No" (Tim Ferriss Show) | **verbatim-plausible (tim.blog)** |
| PP-4 | reframe/mechanism | direct/challenging | moderate | pp-research-as-avoidance | Dan Martell / direct founder-coach — research = avoidance, cost of not choosing | reconstruction |
| PP-5 | story | vulnerable/personal | moderate | pp-fear-choosing-wrong-regret | Tim Ferriss guest who made a high-stakes pivot fearing regret | verbatim-plausible if tim.blog |
| PP-6 | reframe | intellectual/measured | moderate | pp-too-many-options-none-chosen | Tim Ferriss "fear-setting" / decision-defining framing | verbatim-plausible (tim.blog) |
| PP-7 | permission | vulnerable/personal | mild | pp-fear-choosing-wrong-regret | a credible voice granting "choose without certainty" | reconstruction |
| PP-8 | mechanism | expert/scientific | moderate | pp-maximizer-never-satisfied | Huberman — decision-making under uncertainty (secondary) | reconstruction |
| PP-9 | story/reframe | vulnerable/personal | moderate | pp-commitment-creates-clarity | someone who committed at real cost and describes how it felt | reconstruction |

> **PP disambiguation gate (every slot):** the body must make clear this is *excess of options + fear
> of foreclosing*, NOT a single avoided action (inaction-loop) and NOT absence of options
> (direction-collapse). State-specificity sentence required. Exclude **warm/affirming** for PP-4
> (research-as-avoidance — comfort validates stalling).

### State B — identity-transition (target 9)
§14: story ×3–4 (different domains); permission ×2; reframe (disorientation-is-appropriate) ×2; ≤1
measured mechanism. Lead vulnerable/personal + warm/affirming; ≥1 intellectual/measured. **Cap
direct/challenging at 0–1, never for fresh grief.** Intensity mild–moderate (intense rare).

| slot | type | reg | int | need | candidate source family / speaker | verif |
|---|---|---|---|---|---|---|
| IT-1 | story | vulnerable/personal | moderate | it-career-exit-who-am-i | someone who left a defining career and rebuilt (DOAC / SoG / Tim Ferriss) | verbatim-plausible if tim.blog |
| IT-2 | permission/story | warm/affirming | moderate | it-relationship-end-stranger | Brené Brown lineage — post-relationship identity loss | reconstruction (TED/book) |
| IT-3 | story | vulnerable/personal | moderate | it-role-retirement-structure-gone | retired elite athlete / founder — identity vacuum after the role (Agassi *Open*; Rich Roll guest) | reconstruction |
| IT-4 | reframe/permission | intellectual/measured | mild | it-in-between-cant-see-next | Bruce Feiler — *Life Is in the Transitions* ("lifequake", liminal) / Brené "wilderness" | reconstruction |
| IT-5 | story/reframe | vulnerable/personal | moderate | it-post-success-lost | founder post-exit / performer post-summit who felt unmoored | reconstruction |
| IT-6 | reframe | intellectual/measured | moderate | it-in-between-cant-see-next | Adam Grant — rethinking/identity-is-a-structure framing | reconstruction |
| IT-7 | permission | warm/affirming | mild | it-relationship-end-stranger | warm voice granting permission to grieve the old self | reconstruction |
| IT-8 | story | vulnerable/personal | moderate | it-career-exit-who-am-i | reinvention after addiction/recovery (Rich Roll's own arc) | reconstruction |
| IT-9 | story | vulnerable/personal | moderate | it-role-retirement-structure-gone | second domain of role-loss (military/mission/graduation) | reconstruction |

> **IT disambiguation gate (every slot):** there must be a **discrete triggering event** with a
> before/after — distinct from direction-collapse (chronic, gradual, no trigger). Keep within
> "functional but disoriented"; any candidate edging into clinical grief/crisis is **rejected for
> state-fit, not softened**. No "what's next" rush before naming the current state.

### State C — momentum-gap (target 9; two sub-states)
§14: comparison-spike → reframe (comparison-as-signal) ×2, story ×1–2. restart-friction → mechanism
(never-miss-twice / reduce restart cost / tiny re-entry) ×2, permission (lapse ≠ identity) ×1–2,
reframe ×1. Lead warm/affirming + intellectual/measured + ≥1 expert/scientific. **Cap
direct/challenging ≤1, restart-friction only.** Watch James-Clear/habit concentration.

| slot | sub-state | type | reg | int | need | candidate source / speaker | verif |
|---|---|---|---|---|---|---|---|
| MG-1 | comparison-spike | reframe | warm/affirming | mild | mg-comparison-spike-behind | warm voice: comparison as signal to decode (SoG / TED) | reconstruction |
| MG-2 | comparison-spike | reframe/story | warm/affirming | mild | mg-want-the-feeling-not-their-life | "want the feeling, not their life" decoded as values signal | reconstruction |
| MG-3 | restart-friction | mechanism | expert/scientific | mild | mg-lost-rhythm-cant-restart | BJ Fogg — Tiny Habits, shrink the restart | reconstruction |
| MG-4 | restart-friction | permission | warm/affirming | moderate | mg-lapse-became-shame-spiral | Kristin Neff — self-compassion, lapse ≠ identity | reconstruction |
| MG-5 | restart-friction | mechanism/permission | expert/scientific | mild | mg-reduce-restart-cost | Huberman — habit re-entry / activation energy | reconstruction |
| MG-6 | restart-friction | reframe | intellectual/measured | mild | mg-lost-rhythm-cant-restart | James Clear — "never miss twice" (≤1 Clear; restart-friction only) | **verbatim-plausible (tim.blog #648 — must be a DISTINCT moment from sio-clear-habits-trajectory)** |
| MG-7 | comparison-spike | story | vulnerable/personal | mild | mg-comparison-spike-behind | someone who felt behind peers and what they did with it | reconstruction |
| MG-8 | restart-friction | permission | warm/affirming | moderate | mg-lapse-became-shame-spiral | warm coach: restarting without the shame of falling off | reconstruction |
| MG-9 | comparison-spike | reframe | intellectual/measured | mild | mg-want-the-feeling-not-their-life | measured: everyone's timeline is different / decode envy | reconstruction |

> **MG disambiguation gate (CRITICAL — Phase 9 calibrates hardest here):** restart-friction
> ≠ inaction-loop. The body must establish **prior motion that was lost** (re-entry), never a
> first-time/never-started avoided action. comparison-spike ≠ direction-collapse (triggered + recent +
> outward, not chronic + internal). **Exclude direct/challenging for comparison-spike** (piling on);
> never moralize ("comparison is the thief of joy", "get off social media").

---

## 5. Desired distribution (soft targets that serve diversity)

Across the ~27 new SIOs, per state aim for:

- **insight_type:** ≥1 of each of reframe/permission/mechanism/story where the state supports it; the
  state's dominant type (PP→reframe, IT→story, MG→split reframe|mechanism) may carry 3–4.
- **voice_register:** ≥3 of 5 registers per state; ≤4 sharing one register. Honor the per-state
  **register exclusions** above (they are the part a metadata gap can't express).
- **intensity:** majority moderate, ≥1 mild per state; `intense` only where genuinely warranted
  (rare in IT/MG — these states need gentleness).
- **transcript_verified:** prefer fetchable (tim.blog/artofmanliness) for ≥1–2 verbatim per state;
  expect the rest as honest reconstructions.
- **media/video:** most will be text-only / audio-primary / not_applicable. Never fabricate a
  `video_id`/`embed_url`. Video-primary only if a real official embed is confirmed (it usually won't be).
- **source diversity:** **no single speaker >2 in a state; no single show/platform >3 in a state.**
  Force diversity especially on MG (habit content) and IT (Brené Brown).

## 6. Recommended source families (official channels/domains only)

- **possibility-paralysis:** Barry Schwartz, Ruth Chang, Derek Sivers (TFS), Dan Martell, Tim Ferriss,
  Huberman (decision neuroscience), Modern Wisdom, TED/TEDx.
- **identity-transition:** Brené Brown, Adam Grant, Bruce Feiler, Rich Roll, retired athletes
  (Agassi), founders post-exit, Diary of a CEO, School of Greatness, TED/TEDx.
- **momentum-gap:** James Clear (≤1), BJ Fogg, Huberman (habit/routine), Kristin Neff /
  self-compassion, Rich Roll, School of Greatness, TED/TEDx.

**Integrity rules (unchanged):** canonical official URLs only; no re-uploads/aggregators/clip
channels/quote sites as source or verification; the speaker must actually appear in the cited content;
the host is not the speaker.

## 7. Risks and how this plan mitigates them

| risk | mitigation in this plan |
|---|---|
| **Generic content** | Each slot is anchored to a *specific* thinker's *specific* framing + a state-specificity sentence; anti-generic gate (`non_genericness`/`state_specificity` ≤2 → reject) runs on every candidate. |
| **Source concentration** | Per-state caps (speaker ≤2, platform ≤3); MG explicitly caps James Clear/habit content at ≤1 and forces register diversity. |
| **Reconstruction ratio** | Already 74%; will rise. Prefer fetchable transcripts for ≥1–2 verbatim/state; report the ratio honestly; never upgrade a reconstruction to verbatim/approved without real evidence. |
| **Magnet candidates** | `npm run test-magnet-risk -- --candidate <p>` gates every promotion; a candidate winning >50% of its state's diverse probes is `held_for_retrieval_risk`, not served. |
| **Poor disambiguation** | Per-state disambiguation gates above; Phase 9 adds calibration cases, hardest for MG restart-friction ↔ inaction-loop and IT ↔ direction-collapse. |
| **Weak verification** | Honest `quote_type`/status; deterministic verifier FAILs verbatim-without-verified-transcript; verbatim only from a fetched continuous block. |
| **Register harm** | Register exclusions enforced per need (PP-4 no warm; IT no direct for grief; MG comparison-spike no direct). |

## 8. Per-SIO acceptance criteria (applied to every slot)

A slot is **promotable** only if ALL hold:

1. **Real source.** The speaker genuinely holds/expressed this idea in a real, cited, official work
   (verifiable via web search). No fabricated quote/URL/timestamp/video-id.
2. **Honest verification labels.** `quote_type` truthful; verbatim ⇒ fetched + confirmed +
   `transcript_verification_status: verified` + `transcript_url`; otherwise paraphrase + reconstruction.
3. **HRS ≥ 75** with evidence (the differentiator) AND **anti-generic gate passes**
   (`non_genericness` & `state_specificity` ≥ 3).
4. **Novelty:** not a `duplicate` (sim < 0.85) against the existing corpus; `similar_but_useful` only
   if it adds a distinct register/source/angle.
5. **State fit + disambiguation:** passes the state's disambiguation gate above; correct primary state.
6. **Register fit:** matches the slot register and honors exclusions.
7. **Magnet gate:** PASS (`test-magnet-risk -- --candidate`) — does not dominate its state.
8. **Within "functional but stuck":** no clinical-grief/crisis content (esp. IT); route true crisis to
   the safety layer instead of harvesting it.

Anything failing 1–2 is **rejected** (honesty). Failing 3–7 → **hold/needs_review** with notes.
Promotion is to `corpus/sios/` as **`prototype_only`** (never `approved`); `transcript_verified: true`
only with a genuinely confirmed verbatim excerpt.

---

## 9. Execution note (Phases 5–7)

Harvest order (hardest last): **identity-transition → possibility-paralysis → momentum-gap**. Per SIO:
research a real source moment → `corpus/candidates/cand-<speaker>-<topic>.yaml` (honest fields) →
`evaluate-candidate` + `score-candidate-novelty` + `verify-candidate-source` → if it clears the gates,
draft to `corpus/drafts/` (prototype_only) → `test-magnet-risk -- --candidate`. Phase 8 reviews every
draft and promotes only the clearly-passing ones to `corpus/sios/` as prototype_only, with honest
labels; the rest are held/needs_review/rejected with reasons.
</content>
</invoke>
