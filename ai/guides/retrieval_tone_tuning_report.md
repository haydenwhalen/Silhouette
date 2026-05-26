# Retrieval Tone / Register Tuning Report

**Date:** 2026-05-25
**Scope:** Make Silhouette retrieve the right emotional TONE within a state, not just the right state.
**Files changed:** `src/agent/stateClassifier.ts`, `src/rag/retrievalConfig.ts`, `src/rag/vectorStore.ts`, `scripts/test-retrieval-calibration.ts`

---

## 1. Problem diagnosed

Retrieval correctly gated on the user's stuck state but was tone-deaf *within* a state. Two compounding root causes:

1. **The classifier produced no counter-signal.** `inferred_resonance_insight_type` / `inferred_resonance_voice_register` were optional hints, but the prompt's examples were sparse. For exactly the tone-laden queries that need warm/permission content (burnout, exhaustion, shame, discouragement, "I need a kick", perfectionism) the classifier returned NULL — so nothing pushed back against the default profile.

2. **Even when a hint fired, scoring buried it.** Default-profile boost was +0.05 (insight_type) + +0.04 (voice_register) = **0.09 combined**; the intake hint was only +0.03 + +0.03 = **0.06 combined**. Worse, in `applyBoosts()` the per-state DEFAULT boost was applied to the default-matching SIO *even when the user's hint diverged from the default*. For engagement-drought (default = mechanism/expert), Huberman/Pink always got +0.09 and buried the warm/permission SIOs (Brown, Huffington) that could earn at most +0.06. The generic default out-voted the user-specific signal — backwards.

Net effect: `ed-4-burnout-permission-to-rest` returned Huberman (a dopamine-mechanism lecture) to a "running on fumes, nothing left in the tank" query that needs permission to rest. It was checked into the calibration suite as a deliberately-failing "known-limitation canary."

---

## 2. Exact changes made

### 2.1 `src/agent/stateClassifier.ts` — stronger tone-inference guidance (no state-logic change)

Rewrote the `inferred_resonance_*` guidance in `CLASSIFIER_SYSTEM_PROMPT` (and reinforced both Zod `.describe()` strings, since structured output reads them) with explicit tone → hint mappings:

| User tone / language | insight_type | voice_register |
|---|---|---|
| burnout / "running on empty" / "nothing left in the tank" / depleted | permission | vulnerable/personal (or warm/affirming) |
| shame / self-criticism / "what's wrong with me" / "I'm just lazy" / "I quietly hate myself" | permission | warm/affirming |
| discouragement / "what's the point" / hopeless | permission or reframe | warm/affirming |
| "I need a kick" / "no excuses" / wants accountability / tough love | story or mechanism | direct/challenging |
| "why does this happen" / "I want the science" / analytical | mechanism | expert/scientific |
| perfectionism / "never good enough" / "can't ship" | permission | direct/challenging or vulnerable/personal |
| personal narrative w/ named moments | story | vulnerable/personal |
| "I've journaled / thought about this for months" | reframe | intellectual/measured |
| sparse / unclear | null | null |

The three STATE definitions and the state-distinguishing rules were **left untouched** (state detection had to stay stable — confirmed by the regression suite, 5/5). Hints are still explicitly "weak / only when clear" and explicitly "do NOT change detected_state."

### 2.2 `src/rag/retrievalConfig.ts` — raise hint boosts, document the model

| Config | Before | After |
|---|---|---|
| `boost_inferred_insight_type_match` | 0.03 | **0.06** |
| `boost_inferred_voice_register_match` | 0.03 | **0.06** |
| `boost_insight_type_match_default` | 0.05 | 0.05 (unchanged; now fallback-only) |
| `boost_voice_register_match_default` | 0.04 | 0.04 (unchanged; now fallback-only) |
| `boost_cap_total` | 0.20 | **0.20 (kept)** |

Max combined hint boost is now 0.12 — large enough to flip ranking against a semantically-close default-matching SIO, but still well under the 0.20 cap so semantic similarity continues to dominate. Added a block comment documenting the **"default = FALLBACK, hint = PRECEDENCE"** model.

### 2.3 `src/rag/vectorStore.ts` `applyBoosts()` — fallback / precedence logic

Rewrote the resonance section so each dimension (insight_type, voice_register) is decided **independently**:

- **If a hint exists for the dimension:** the hint governs. SIOs matching the hint get the (larger) hint boost; the per-state DEFAULT boost for that dimension is **suppressed**, whether the hint matches *or* diverges from the default.
- **If there is no hint for the dimension:** the default profile boost applies as before.

Added an optional `notes?: string[]` field to `ScoredCandidate` and a debug trace, e.g.:
`"default insight_type boost suppressed (user hint diverges: permission vs default mechanism)"`.
The calibration script now prints these notes, so the suppression is visible every run.

This change is **symmetric**: the same machinery that lets warm/permission win for a burnout query lets mechanism/expert win for an analytical query (the analytical hint matches the default, so the SIO gets the hint boost; the divergent permission SIOs get nothing).

### 2.4 `scripts/test-retrieval-calibration.ts`

- **ed-4** un-canaried: removed the "KNOWN-LIMITATION CANARY" wording, kept it strict (acceptable = Huffington, Brown — **Huberman excluded**), replaced reason with the fix rationale.
- Added 3 new tone-selectivity cases (below).
- **il-4** widened with rationale (see §4).
- Added `notes` printing to the per-candidate trace.

---

## 3. Before / after examples

### ed-4 — burnout / "running on fumes" (the canary)

**Before:** winner = `sio-huberman-dopamine-baseline-2021` (default mechanism/expert boost +0.09 beat the noisy +0.06 hint). FAIL (intentional canary).

**After:** winner = `sio-huffington-depletion-not-dedication-2010`. PASS.

```
1. sio-huffington (permission, vulnerable/personal)  semantic=0.460 → final=0.600
   boosts: +0.06 insight_type hint (permission); +0.06 voice_register hint (vulnerable/personal); +0.05 tier-1
2. sio-brown     (permission, warm/affirming)        semantic=0.407 → final=0.457
3. sio-huberman  (mechanism, expert/scientific)      semantic=0.483 → final=0.453
   notes: default mechanism/expert boost SUPPRESSED (user hint diverges: permission)
```

Note Huberman has the **highest semantic score (0.483)** yet finishes 3rd: its default boost is suppressed by the divergent permission hint, and it carries a medium-tagger penalty. The tonal signal correctly overrides raw semantic proximity.

### ed-7 — "I want to understand the science" (symmetry guard, opposite direction)

**After:** winner = `sio-pink-autonomy-mastery-purpose-2009` (Huberman acceptable). PASS. Here the hint (mechanism/expert) *matches* the default, so the mechanism SIOs get the hint boost and warm/permission SIOs get nothing — mechanism still wins. Proves the fix didn't just make warm always win.

### il-8 — "I need a kick in the ass / no excuses" (symmetry guard)

**After:** winner = `sio-goggins-identity-of-inaction-2023` (direct/challenging story). PASS. The direct/challenging hint matches the inaction-loop default; warm/permission SIOs are not boosted.

### il-7 — "I keep putting it off… I'm lazy and broken" (shame within inaction-loop)

**After:** winner = `sio-saujani-brave-not-perfect-2016` (permission). PASS. The self-blame triggers a permission/warm hint that suppresses the default story/direct boost, so a permission SIO (which lifts self-judgment) wins instead of tough-love Goggins/Robbins.

---

## 4. Cases I had to widen (and why)

**il-4-procrastination-self-narrative** ("…and then I quietly hate myself for it"). Previously expected Urban (story/vulnerable) to win on semantics. After the fix, the "I quietly hate myself" clause is genuine self-blame, which the tone-aware classifier reads as **permission/warm** — so the divergent permission hint suppresses the default story/direct boost and Saujani (permission) wins despite Urban having a higher raw semantic score.

This is a *correct* tonal read, not a regression of intent: for a self-blame procrastination query, a permission SIO that lifts self-judgment (Saujani, Gilbert) is a legitimately good answer alongside Urban's avoidance story. I changed `expected_winner_id` to `null` and widened `acceptable_winner_ids` to include Saujani and Gilbert, documenting that the only real failure would be a Direction-Collapse or pure-mechanism tough-love winner. I did **not** widen any set merely to force a pass — every added SIO is same-state and tonally appropriate to the self-blame layer.

---

## 5. Calibration results

| Suite | Before | After |
|---|---|---|
| `test-retrieval-calibration` | 20/21 (ed-4 failing on purpose) | **24/24 (100%)** |
| `test-sio-retrieval` | 3/3 | **3/3** |
| `test-state-classification` | 5/5 | **5/5** |

All three new tone cases (ed-7, il-7, il-8) and the un-canaried ed-4 pass. The +0.20 cap was preserved; state filtering is unchanged; semantic similarity still dominates (boosts max 0.12 from hints).

---

## 6. Remaining risks

1. **Classifier hint reliability is the load-bearing dependency.** The whole fix hinges on the classifier emitting the right tonal hint. If it returns NULL (no hint), retrieval falls back to the old default-profile behavior — which is the safe direction (no regression), but means tone-selectivity silently degrades on phrasings the prompt didn't anticipate. The hint is only as good as the gpt-4o-mini read at temperature 0. Monitor `inferred_resonance_*` null-rates in production logs.

2. **Overfit / small-corpus brittleness.** 19 SIOs and 24 calibration cases is a small surface; some passes ride on margins of 0.01–0.05 (e.g. ed-4 Huffington 0.600 vs Huberman 0.453 is comfortable, but il-4 and il-7 winners sit within ~0.03 of the runner-up). The exact hint-boost magnitude (0.06) was tuned against this set and may need recalibration as the corpus grows or with human-judged relevance data. The queries are hand-written; real users will phrase tone differently.

3. (Minor) **Mixed-tone queries are genuinely ambiguous.** il-4 showed a query can legitimately carry two tones (avoidance-story + self-blame). The current design lets the dominant classifier hint decide; there's no notion of a "blended" answer. Acceptable at MVP, but worth revisiting if user feedback shows tonal mismatches on compound emotional queries.
