# Next SIO Batch — Research & Plan (5 SIOs)

> Date 2026-05-26. Companion to `corpus_gap_detection_report.md`, `candidate_review_queue.md`,
> `retrieval_magnet_diagnostic.md`, `verbatim_verification_checklist.md`.
> Goal: add 5 high-quality, source-backed SIOs that **fill the real gaps** (ED + direction-collapse),
> **improve balance** (stop the inaction-loop over-weighting), and **raise the verified ratio** —
> not just grow the file count. Quality/verification > hitting 5.

---

## 1. Current corpus snapshot (22 SIOs)

### By state
| state | count |
|---|---|
| direction-collapse | 7 |
| engagement-drought | **6 (smallest)** |
| inaction-loop | **9 (largest — over-weighted)** |

### By state × insight_type
| | reframe | permission | mechanism | story |
|---|---|---|---|---|
| direction-collapse | **4** | 1 | 1 | 1 |
| engagement-drought | 1 | 2 | 2 | 1 |
| inaction-loop | 3 | 2 | 2 | 2 |

DC is reframe-heavy (4/7); its permission/mechanism/story cells are thin (1 each).

### By state × voice_register
| | direct/challenging | warm/affirming | intellectual/measured | vulnerable/personal | expert/scientific |
|---|---|---|---|---|---|
| direction-collapse | 1 | 1 | 2 | 1 | 2 |
| engagement-drought | **0 (EMPTY)** | 2 | 1 | 1 | 2 |
| inaction-loop | **4** | 1 | 1 | 2 | 1 |

### By intensity / verification / media
- **transcript_verified:** 3 true (Colonna, Jocko, Clear — all tim.blog) / 19 false (reconstructions). **86% reconstructed.**
- **verified_video:** 11 (TED official embeds).
- **Source/speaker concentration:** TED/TEDx dominate the reconstructions; The Tim Ferriss Show backs the 3 verified ones (+ Pressfield, + McConaughey re-sourced to his book). No single living speaker is over-represented yet.

## 2. Top gaps (from `npm run detect-gaps`, ranked)

1. **(P80) engagement-drought + direct/challenging — 0 SIOs.** The single empty state×register cell. Headline target.
2. **(P65) inaction-loop over-weighted (9 vs ED 6, gap 3 > 2).** Do **not** add IL unless exceptional. Prioritize DC + ED.
3. **(P50) 86% reconstructed.** Verbatim verification is the trust priority — prefer sources with fetchable official transcripts.

Derived sub-gaps to favor: **DC story / permission / direct-challenging / warm / vulnerable** (all thin), **ED direct-challenging (empty) + ED reframe (1)**.

States to **avoid** this batch: **inaction-loop** (and IL + direct/challenging especially — already 4, and the magnet-dense cell).

## 3. Target profile for each of the 5 SIOs

> Verification feasibility drove selection: **tim.blog and Art of Manliness transcripts are
> WebFetch-readable** (verifiable verbatim); **ted.com is not** (JS-rendered) — so any TED-sourced
> SIO stays an honest reconstruction. All 5 verbatim claims below were spot-verified against the
> official transcript (guest, not host) before this plan was written.

| # | speaker / source | target_state | target_gap (cell) | insight_type | voice_register | intensity | video? | verbatim feasible? |
|---|---|---|---|---|---|---|---|---|
| 1 | **Michael Easter** — *The Comfort Crisis* / Art of Manliness #708 | engagement-drought | **ED + direct/challenging** (empty) | reframe | direct/challenging | moderate–intense | maybe (AoM yt) | ✅ AoM transcript fetchable |
| 2 | **BJ Miller** — Tim Ferriss #153 | direction-collapse | DC + story + vulnerable/personal | story | vulnerable/personal | moderate | no (audio) | ✅ tim.blog |
| 3 | **Debbie Millman** — Tim Ferriss #304 | direction-collapse | DC + permission + direct/challenging | permission | direct/challenging | moderate | no (audio) | ✅ tim.blog |
| 4 | **Esther Perel** — Tim Ferriss #241 | engagement-drought | ED + reframe (aliveness, non-direct register) | reframe | intellectual/measured | moderate | no (audio) | ✅ tim.blog |
| 5 | **Susan David** — TED, *emotional courage* | engagement-drought | ED + permission + warm/affirming | permission | warm/affirming | mild | no (TED, blocked) | ❌ reconstruction (prototype_only) |

**Why each improves Silhouette:**
1. **Easter** — fills the *only* empty cell. Names a distinct ED root cause: comfort/safety → numbness & "a lack of meaning"; the fix is engineered discomfort. Distinct from Goggins/Jocko (those are IL *discipline-vs-excuses*; Easter is ED *comfort-vs-aliveness*).
2. **BJ Miller** — a mortality-perspective *story* for the lost/searching DC user; vulnerable register the corpus is thin on; "pay attention to death to live better" reframes direction without preaching.
3. **Debbie Millman** — confronts the DC user hiding in busyness: "busy is a decision… too busy = not important enough." Permission + a direct challenge to *choose*. Fills two thin DC cells.
4. **Esther Perel** — "two groups: one that didn't die, and one that came back to life." A clean *surviving vs. truly living* reframe for ED, in a measured/reflective register (discriminates against Huberman-expert and Brown-vulnerable within ED).
5. **Susan David** — permission to stop performing positivity; the warm/affirming ED option. Honest reconstruction (TED transcript unreachable) — kept `prototype_only`, no fabricated verbatim.

**Resulting balance:** ED 6→9, DC 7→9, IL 9 → **9 / 9 / 9 (27 total)**. Verified-verbatim new: 4 (Easter, Miller, Millman, Perel). Reconstructed ratio 19/22 (86%) → 20/27 (74%).

## 4. Source strategy

- **The Tim Ferriss Show (tim.blog)** — official transcripts are WebFetch-readable; the proven path to verbatim. Backs #2/#3/#4.
- **The Art of Manliness (artofmanliness.com)** — publishes full official episode transcripts (fetchable). Backs #1 (Easter #708). Diversifies away from TFS.
- **TED** — transcripts JS-rendered → unreadable in-session; usable only as honest reconstruction (#5 Susan David) unless a human pastes the transcript.
- Sources chosen for *fit first*, not convenience: each maps to a specific empty/thin cell, and platform mix (AoM + TFS + TED) avoids over-concentrating one show.
- Books (*The Comfort Crisis* 2021) cited as corroborating origin where the podcast is the verbatim locus.

## 5. Risks & mitigations

| risk | mitigation |
|---|---|
| **More IL imbalance** | Batch adds **0 IL** by design; lands at 9/9/9. |
| **Generic ED content** | Each ED pick names a *specific* mechanism (comfort→numbness; survival-vs-revival; performed-positivity), not "just cheer up." Anti-generic gate + Human Resonance score enforce. |
| **Unverified paraphrase dressed as quote** | Only Easter/Miller/Millman/Perel get verbatim body excerpts (spot-verified, will re-confirm continuous block at draft). Susan David = paraphrase only, `transcript_verified: false`, `prototype_only`. |
| **Magnet candidates** (Easter "do hard things", Millman "busy is a decision" are punchy/broad) | Run `npm run test-magnet-risk -- --candidate <path>` on every candidate **before promotion**; hold any that win >50% of its state's probes (as McKeown is held). |
| **Weak video/timestamp evidence** | tim.blog/AoM = audio; no fabricated embeds/timestamps. `media_verification_status: not_applicable`; promote on transcript verification, not video. |
| **Esther Perel context drift** | Her "alive vs. dead" framing originates in relationships/eroticism; use the *survivor-community* passage (non-relational) and note original context honestly in the SIO. |
| **TFS over-concentration** | +3 TFS this batch; offset by AoM + TED; monitor speaker/show concentration in future batches. |

## 6. Execution order
Candidates → evaluate/novelty/verify → review → draft → human-review → promote (honest status) →
**magnet gate per SIO** → calibration cases → full validation → quality review → fixes → summary.
Hold (don't force) any candidate that fails verification, the anti-generic gate, novelty, or the magnet gate.
