# Silhouette — Corpus & Retrieval Video Diagnostic

> Baseline snapshot produced 2026-05-25. Read-only analysis; no SIO files were edited.
> All counts derived from parsing YAML frontmatter of every `corpus/sios/*.md` file via a
> throwaway Node script (deleted on completion). Scoring analysis reads
> `src/rag/retrievalConfig.ts` and `src/rag/vectorStore.ts` directly.

---

## 1. Total SIO Count

**19 SIOs** across 19 files in `corpus/sios/`.
Companion source objects: 19 JSON files in `corpus/sources/`.

---

## 2. Count by `primary_state_tag`

| State | Count |
|---|---|
| direction-collapse | 7 |
| engagement-drought | 6 |
| inaction-loop | 6 |
| **Total** | **19** |

Matches the planned post-expansion target (7/6/6). Distribution is near-even.

---

## 3. Count by `insight_type`

| insight_type | Count |
|---|---|
| reframe | 6 |
| permission | 5 |
| mechanism | 4 |
| story | 4 |
| **Total** | **19** |

Matches the expected distribution (reframe 6, permission 5, story 4, mechanism 4).
`reframe` is the plurality type — relevant to the scoring over-favoring analysis in section 10.

---

## 4. Count by `voice_register`

| voice_register | Count |
|---|---|
| direct/challenging | 4 |
| expert/scientific | 4 |
| intellectual/measured | 4 |
| vulnerable/personal | 4 |
| warm/affirming | 3 |
| **Total** | **19** |

Matches expected (direct 4, expert 4, intellectual 4, vulnerable 4, warm 3).
`warm/affirming` remains the thinnest register — one fewer than the other four.

---

## 5. Count by Source / Provider

### By `source_type`

| source_type | Count |
|---|---|
| ted talk | 11 |
| book | 3 |
| long-form interview podcast | 2 |
| article | 1 |
| author crossover | 1 |
| solo educational | 1 |
| **Total** | **19** |

Note: Robbins (`sio-robbins-5-second-rule-2011`) is classified `source_type: ted talk` because
it is a TEDx talk, but its SIO has `video_provider: none` and a blank `embed_url` — it does
not participate in the functional embed pool.

### By `video_provider`

| video_provider | Count | Notes |
|---|---|---|
| ted | 10 | The 10 new TED/TEDx SIOs; all have verified `embed.ted.com` URLs |
| none | 6 | Book/article/podcast sources; text-only delivery |
| youtube | 3 | McConaughey, Huberman, Goggins; blank embed_url and video_id |
| **Total** | **19** | |

### TED vs TEDx breakdown (the 10 `video_provider=ted` SIOs)

| Platform | Count | SIOs |
|---|---|---|
| TED (main stage) | 7 | dgilbert, huffington (TEDWomen), pink (TEDGlobal), saujani, smith, urban, gilbert (TED2009) |
| TEDx | 3 | achor (TEDxBloomington), sinek (TEDxPugetSound), waldinger (TEDxBeaconStreet) |

TEDWomen and TEDGlobal are curated TED events (not independent TEDx), so 7 of 10 are main-platform TED, 3 are TEDx. Robbins is also TEDx (TEDxSF) but is treated separately due to missing embed.

---

## 6. Quality Signal Counts

### transcript_verified

| Value | Count |
|---|---|
| true | 0 |
| false | 19 |

Zero verbatim transcripts across the entire corpus. All SIOs are reconstructed excerpts.

### human_review_status

| Value | Count |
|---|---|
| prototype_only | 19 |
| approved | 0 |
| needs_review | 0 |

Every SIO is `prototype_only`. No SIO has been approved for production.

### media_available

| Value | Count |
|---|---|
| true | 18 |
| null/blank | 1 (McConaughey) |
| false | 0 |

`sio-mcconaughey-go-to-zero-2020` has `media_available: null` — the field was left blank,
which YAML deserializes as null rather than boolean false. The SIO's media situation (podcast
audio only, no embed) makes the logical value `false`, but the field is inconsistently set.

### `embed_url` present vs blank

| Value | Count |
|---|---|
| Non-empty embed_url | 10 |
| Blank/missing | 9 |

The 10 functional embeds are all the `video_provider=ted` SIOs, using official
`https://embed.ted.com/talks/<slug>` URLs. The remaining 9 have no embed.

### `video_id` present vs blank

| Value | Count |
|---|---|
| Non-empty video_id | 0 |
| Blank/missing | 19 |

`video_id` is intentionally blank across all 19 SIOs. For the TED SIOs, the official
YouTube channel ID was not playback-verified; for the 3 YouTube SIOs (McConaughey, Huberman,
Goggins), IDs were never populated. No youtube-nocookie timestamped embed is possible today.

### Summary table

| Signal | true/present | false/blank/missing |
|---|---|---|
| transcript_verified | 0 | 19 |
| human_review_status = approved | 0 | 19 (all prototype_only) |
| media_available (strict true) | 18 | 1 (null) |
| embed_url non-empty | 10 | 9 |
| video_id non-empty | 0 | 19 |

---

## 7. Strongest SIOs

Criteria: well-differentiated state/type/register fit, high tagger_confidence, verified embed,
tier-1 or tier-3 credibility, clean secondary-state logic.

| insight_id | Reason |
|---|---|
| `sio-gilbert-elusive-genius-2009` | Tier-1, high confidence, verified TED embed, unique IL/permission/vulnerable slot — no other SIO competes for this combination; the "genius as external visitant" frame is highly distinct. |
| `sio-urban-instant-gratification-monkey-2016` | Tier-1, verified TED embed, IL/story/vulnerable — narrative clarity and cultural recognizability make it a strong cold-start anchor; broad semantic reach for procrastination queries. |
| `sio-saujani-brave-not-perfect-2016` | Tier-1, high confidence, verified TED embed, IL/permission/direct — the only permission SIO in a direct/challenging register; directly serves users who need to be told to act imperfectly, not given permission warmly. |
| `sio-pressfield-resistance-2015` | Tier-1, high confidence, IL/reframe/intellectual — sole TF podcast SIO; distinctive "Resistance as capital-R force" vocabulary discriminates it cleanly from generic advice even without an embed. |
| `sio-waldinger-good-life-relationships-2015` | Tier-3, high confidence, verified TED embed, DC/reframe/expert — the Harvard longitudinal study gives it unique credibility in the DC post-achievement cluster; most research-grounded DC SIO. |
| `sio-pink-autonomy-mastery-purpose-2009` | Tier-3, high confidence, verified TED embed, ED/mechanism/expert — well-known research anchor for engagement-drought; the AMP framework is distinctive and well-defined. |

---

## 8. Weakest SIOs

| insight_id | Reason |
|---|---|
| `sio-mcconaughey-go-to-zero-2020` | `media_available: null` (should be false); blank embed_url and video_id; video_provider declared youtube but unplayable; tier-1 but podcast audio only. Most metadata inconsistency of any SIO. |
| `sio-huberman-dopamine-baseline-2021` | tagger_confidence medium; blank embed despite declaring youtube; tier-3 but no embed path; the mechanism/expert slot it occupies is partly duplicated by Pink (also expert/mechanism, but with a verified embed and high confidence). |
| `sio-goggins-identity-of-inaction-2023` | tagger_confidence medium; blank embed despite declaring youtube; the "intense" intensity slot makes it irreplaceable, but the absence of an embed and medium confidence limits retrieval quality. The state fit is strong but presentation-layer delivery is degraded. |
| `sio-dgilbert-synthetic-happiness-2004` | tagger_confidence medium; the state fit (DC/post-achievement/mechanism) is slightly stretchy — "synthetic happiness" reframes direction collapse but mechanism is unusual for DC. Medium confidence reflects real tagger ambiguity. Embed is present (a strength), but the claim density is lower than Waldinger or Sinek. |
| `sio-brown-numbing-not-failing-2021` | tagger_confidence medium; blank embed (book source, text-only); the warm/affirming ED slot is occupied but delivery is text-only and the SIO is also a canary victim — it can't surface for users who need it due to the ED default-profile boost (see §10). |

---

## 9. Thin States / Registers

### States

Direction-collapse (7) is slightly over-represented vs. engagement-drought (6) and
inaction-loop (6). This is by design per the gap-report recommendation and is not a concern.

Within direction-collapse: **post-achievement** is dense (dgilbert, mcconaughey, waldinger =
3 SIOs) vs. **original** (manson, newport, sinek, smith = 4 SIOs). The post-achievement
cluster may cause inter-SIO competition (dgilbert, waldinger, and mcconaughey overlap
semantically for "I achieved the goal and feel empty" queries).

### Registers

`warm/affirming` has only **3 SIOs** (smith, achor, brown) vs. 4 for every other register.
This is the persistent register gap. The 3 warm/affirming SIOs span three different states
(DC/ED/ED), so intra-register competition is low — but any user whose resonance profile
prefers warm/affirming has fewer candidates to choose from, especially if the default-profile
boost (§10) is suppressing them in ED.

### insight_type

`reframe` (6) dominates Direction Collapse (4 of the 7 DC SIOs are reframe). If a DC user's
language does not semantically match a reframe frame, the state-filter pass will return a
reframe-heavy pool by default. No DC `permission` SIO exists; DC users who need permission
to stop optimizing are not served.

### intensity

`intense` remains at **1 SIO** (Goggins / inaction-loop only). No intense-register option
exists for direction-collapse or engagement-drought. Users who want a hard push in those
states will not get one.

---

## 10. Scoring Over-Favoring Analysis

### Configuration (from `src/rag/retrievalConfig.ts`)

```
boost_insight_type_match_default:     +0.05  (state default resonance)
boost_voice_register_match_default:   +0.04  (state default resonance)
boost_inferred_insight_type_match:    +0.03  (intake-hint resonance)
boost_inferred_voice_register_match:  +0.03  (intake-hint resonance)
```

### Per-state default resonance profiles

| State | Default insight_type | Default voice_register | Combined default boost |
|---|---|---|---|
| direction-collapse | reframe | intellectual/measured | +0.09 |
| engagement-drought | mechanism | expert/scientific | +0.09 |
| inaction-loop | story | direct/challenging | +0.09 |

### The problem

The generic state-default resonance boost (+0.09 combined if both type and register match)
**outweighs** the user-specific intake-hint boost (+0.06 combined). This means:

1. An SIO that matches the state's default type+register gains +0.09 regardless of whether
   the user's language signals that preference.
2. An SIO that matches what the user actually seems to need (via intake hint) gains at most
   +0.06 — and only if the classifier infers a hint.
3. If the default type/register is the same as the intake hint, the code avoids double-boost
   (it credits the intake hint path only), so the boost is +0.06. But if they diverge — i.e.,
   the user signals a different type/register than the state default — the state-default SIO
   still wins its +0.09 while the user-preferred SIO earns at most +0.06.

### Over-favoring by state

**engagement-drought** is the most visible victim. Default: mechanism/expert (+0.09).
New warm/permission/vulnerable SIOs (Brown, Huffington, Achor) can earn at most +0.06 from
intake hints, but only if the classifier infers a resonance hint — which the current classifier
frequently does not do for warm or permission signals.

Result: in ED, Huberman and Pink reliably beat Brown, Huffington, and Achor even on queries
where the user's language is clearly warm/permission-coded (e.g., burnout + "stopping feels
like failing" → should retrieve Huffington; retrieves Huberman instead).

**direction-collapse** over-favors reframe/intellectual. Newport and Sinek have a structural
advantage over McConaughey (story/vulnerable) or Manson (permission/direct) for DC queries.

**inaction-loop** over-favors story/direct. Urban and Goggins have a structural advantage over
Gilbert (permission/vulnerable) and Pressfield (reframe/intellectual) for IL queries.

### Why the boost logic is sound in principle but wrong in magnitude

The logic in `vectorStore.ts` correctly avoids double-boosting when the intake hint matches
the state default. But the asymmetry — 0.09 for the state default vs. 0.06 for the
user-specific hint — inverts the intended priority. For a system designed to surface the
**right insight for this user**, the intake-inferred signal should be at least equal to, and
arguably larger than, the generic state-population default.

The hard +0.20 boost cap and state filtering are both correct and should be retained.

---

## 11. Known Failing / Canary Cases

### Canary: `ed-4-burnout-permission-to-rest`

From `scripts/test-retrieval-calibration.ts` (lines 265–280):

```
id: "ed-4-burnout-permission-to-rest"
query: "I'm running on fumes. I keep pushing because stopping would feel like failing,
        but there's nothing left in the tank and I've stopped caring about any of it."
expected_state: engagement-drought
expected_winner_id: sio-huffington-depletion-not-dedication-2010
acceptable_winner_ids: [huffington, brown, grant]
resonance_signal: depletion + "stopping = failing" → permission to rest / permission-warm
```

**What actually wins:** `sio-huberman-dopamine-baseline-2021` (mechanism/expert/scientific).

**Why:** Huberman earns the full +0.09 state-default boost (ED default: mechanism + expert).
Huffington is permission/vulnerable — the ED default provides zero boost for these dimensions.
A resonance hint for warm/permission from the classifier would give Huffington +0.06, but the
classifier does not currently infer such a hint reliably for this query type. The net result:
a user whose language shouts "I'm depleted and ashamed to stop" gets a dopamine-mechanism
explanation instead of the permission-to-rest insight they need.

This case is **intentionally left failing** in the calibration suite as a visibility canary.
The suite passes overall (>70% bar) because this one case is documented as a known limitation.

**Broader pattern:** Pink (ED/mechanism/expert) also wins ED cases it should lose to warm/
permission SIOs. Achor (ED/reframe/warm) is the third victim — its warm/affirming register
earns no default boost in engagement-drought.

### Secondary canary risk

Any inaction-loop user whose resonance profile is warm or vulnerable (e.g., Gilbert) faces
the same dynamic: the IL default (+0.09 for story/direct) structurally advantages Urban and
Goggins over Gilbert (permission/vulnerable) and Pressfield (reframe/intellectual).

---

## Appendix: Full SIO Inventory

| insight_id | state | type | register | tier | intensity | conf | embed | vid_id |
|---|---|---|---|---|---|---|---|---|
| sio-dgilbert-synthetic-happiness-2004 | DC | mechanism | expert/scientific | t3 | mild | med | YES | NO |
| sio-manson-no-singular-calling-2016 | DC | permission | direct/challenging | t2 | moderate | high | NO | NO |
| sio-mcconaughey-go-to-zero-2020 | DC | story | vulnerable/personal | t1 | moderate | high | NO | NO |
| sio-newport-skill-not-passion-2012 | DC | reframe | intellectual/measured | t2 | moderate | high | NO | NO |
| sio-sinek-start-with-why-2009 | DC | reframe | intellectual/measured | t2 | moderate | med | YES | NO |
| sio-smith-meaning-over-happiness-2017 | DC | reframe | warm/affirming | t2 | mild | high | YES | NO |
| sio-waldinger-good-life-relationships-2015 | DC | reframe | expert/scientific | t3 | mild | high | YES | NO |
| sio-achor-happiness-advantage-2011 | ED | reframe | warm/affirming | t2 | mild | med | YES | NO |
| sio-brown-numbing-not-failing-2021 | ED | permission | warm/affirming | t2 | mild | med | NO | NO |
| sio-grant-languishing-2021 | ED | story | intellectual/measured | t2 | mild | high | NO | NO |
| sio-huberman-dopamine-baseline-2021 | ED | mechanism | expert/scientific | t3 | mild | med | NO | NO |
| sio-huffington-depletion-not-dedication-2010 | ED | permission | vulnerable/personal | t1 | mild | med | YES | NO |
| sio-pink-autonomy-mastery-purpose-2009 | ED | mechanism | expert/scientific | t3 | moderate | high | YES | NO |
| sio-gilbert-elusive-genius-2009 | IL | permission | vulnerable/personal | t1 | mild | high | YES | NO |
| sio-goggins-identity-of-inaction-2023 | IL | story | direct/challenging | t1 | intense | med | NO | NO |
| sio-pressfield-resistance-2015 | IL | reframe | intellectual/measured | t1 | moderate | high | NO | NO |
| sio-robbins-5-second-rule-2011 | IL | mechanism | direct/challenging | t2 | moderate | high | NO | NO |
| sio-saujani-brave-not-perfect-2016 | IL | permission | direct/challenging | t1 | moderate | high | YES | NO |
| sio-urban-instant-gratification-monkey-2016 | IL | story | vulnerable/personal | t1 | moderate | med | YES | NO |

DC = direction-collapse, ED = engagement-drought, IL = inaction-loop

---

## Distribution Verification vs. Planned Targets

| Dimension | Planned (gap report) | Observed | Match? |
|---|---|---|---|
| States: DC/ED/IL | 7/6/6 | 7/6/6 | Yes |
| reframe | 6 | 6 | Yes |
| permission | 5 | 5 | Yes |
| story | 4 | 4 | Yes |
| mechanism | 4 | 4 | Yes |
| direct/challenging | 4 | 4 | Yes |
| vulnerable/personal | 4 | 4 | Yes |
| intellectual/measured | 4 | 4 | Yes |
| warm/affirming | 3 | 3 | Yes |
| expert/scientific | 4 | 4 | Yes |
| tier-1 | 7 | 7 | Yes |
| tier-2 | 8 | 8 | Yes |
| tier-3 | 4 | 4 | Yes |
| intensity mild | 9 | 9 | Yes |
| intensity moderate | 9 | 9 | Yes |
| intensity intense | 1 | 1 | Yes |
| media_available true | — | 18 (1 null) | Note: mcconaughey null |
| functional embeds | 10 | 10 | Yes |
| transcript_verified true | 0 | 0 | Yes |

**One discrepancy:** `sio-mcconaughey-go-to-zero-2020` has `media_available: null` instead
of `false`. The planned distribution assumed all non-TED SIOs without embeds would have
`media_available: false`; McConaughey's field is inconsistently blank.

All other dimensions match the planned post-expansion distribution exactly.
