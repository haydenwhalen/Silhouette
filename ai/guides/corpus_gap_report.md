# Silhouette — Corpus Gap Report (pre-expansion baseline: 9 SIOs)

> Produced before adding the Phase "+10 SIOs / video metadata" batch. Snapshot of the 9-SIO
> corpus, the gaps it leaves, and the recommended distribution for the next 10 SIOs.
> Source of truth for the corpus is `corpus/sios/`. Strategy docs: `ai/guides/source_candidates.md`,
> `ai/guides/content_source_strategy.md`, `ai/guides/corpus_ingestion_pipeline.md`.

## 1. Current SIOs (9)

| # | insight_id | speaker | state | type | register | tier | intensity | media |
|---|---|---|---|---|---|---|---|---|
| 1 | sio-manson-no-singular-calling-2016 | Mark Manson | direction-collapse (original) | permission | direct/challenging | 2 | moderate | book (text-only) |
| 2 | sio-mcconaughey-go-to-zero-2020 | Matthew McConaughey | direction-collapse (post-achievement) | story | vulnerable/personal | 1 | moderate | podcast; video_id blank |
| 3 | sio-newport-skill-not-passion-2012 | Cal Newport | direction-collapse (original) | reframe | intellectual/measured | 2 | moderate | book (text-only) |
| 4 | sio-brown-numbing-not-failing-2021 | Brené Brown | engagement-drought | permission | warm/affirming | 2 | mild | book (text-only) |
| 5 | sio-grant-languishing-2021 | Adam Grant | engagement-drought | story | intellectual/measured | 2 | mild | article (text-only) |
| 6 | sio-huberman-dopamine-baseline-2021 | Andrew Huberman | engagement-drought | mechanism | expert/scientific | 3 | mild | podcast-video; video_id blank |
| 7 | sio-goggins-identity-of-inaction-2023 | David Goggins | inaction-loop | story | direct/challenging | 1 | intense | podcast-video; video_id blank |
| 8 | sio-pressfield-resistance-2015 | Steven Pressfield | inaction-loop | reframe | intellectual/measured | 1 | moderate | podcast-audio |
| 9 | sio-robbins-5-second-rule-2011 | Mel Robbins | inaction-loop | mechanism | direct/challenging | 2 | moderate | ted-talk; video_id blank |

## 2. Distribution

**By state** — perfectly even: direction-collapse 3, engagement-drought 3, inaction-loop 3.

**By insight_type:** permission 2, story 3, reframe 2, mechanism 2.

**By voice_register:** direct/challenging **3**, intellectual/measured **3**, vulnerable/personal **1**, warm/affirming **1**, expert/scientific **1**.

**By credibility_tier:** tier-1 3, tier-2 **5**, tier-3 **1**.

**By intensity:** mild 3, moderate 5, intense **1**.

**By speaker/source:** 9 distinct speakers, 9 distinct sources. No speaker concentration risk.

## 3. What's thin

- **Voice register (#1 gap):** `vulnerable/personal`, `warm/affirming`, and `expert/scientific` each have only **1** SIO, while `direct/challenging` and `intellectual/measured` have 3 each. Resonance reranking and the per-state default profiles (engagement-drought → expert/scientific; any "warm" or "personal" user) have almost nothing to choose between.
- **credibility_tier-3 (research-grounded):** only Huberman. Mechanism/expert content is under-supplied.
- **intensity = intense:** only Goggins. Fine for MVP, but no headroom for users who want a harder push.
- **Per-state type coverage holes:** direction-collapse has no `mechanism`; inaction-loop has no `permission`; engagement-drought has no `reframe`.

## 4. Reconstruction / verification status

**All 9 are `transcript_verified: false` and `human_review_status: prototype_only`.** Zero verbatim, zero `approved`. The corpus is entirely faithful reconstructions of documented theses in each speaker's register, each carrying an explicit in-body reconstruction note. This is the single biggest quality ceiling on the corpus and applies equally to the new batch.

## 5. Video metadata status

Four SIOs *declare* a video source (McConaughey, Huberman, Goggins → `youtube`; Robbins → `ted-talk`) but **none has a populated `video_id` or `embed_url`** — every one is blank pending verification. So today the corpus has **zero functional embeds**. `presentInsight.buildMedia` correctly downgrades these `video-primary` declarations to `audio-primary`/`text-only` at render time. Advancing real, official embed support is the core product-direction goal of this phase.

## 6. Recommended distribution for the next 10 SIOs

Goal: fill the register gaps, raise tier-3, give every state a complete type set, and add the first real (official, verified) embeddable video — without fabricating IDs/timestamps/quotes.

| Dimension | Target for the 10 | Rationale |
|---|---|---|
| State | 4 direction-collapse / 3 engagement-drought / 3 inaction-loop | Keeps states near-even (final 7 / 6 / 6); within prompt's 3–4 each. |
| voice_register | +3 vulnerable/personal, +3 expert/scientific, +2 warm/affirming, +1 intellectual/measured, +1 direct/challenging | Lands all five registers at 3–4 each. |
| insight_type | +3 permission, +1 story, +4 reframe, +2 mechanism | Lands all four types at 4–6. |
| credibility_tier | +3 tier-3 | tier-3 1 → 4. |
| Media | All 10 sourced from TED/TEDx with verified official `embed.ted.com` URLs | First functional embeds in the corpus. |

**Selected sources (all verified canonical `ted.com` + official embed URLs):**
1. Tim Urban — *Inside the mind of a master procrastinator* (TED2016) — IL / story / vulnerable-personal — *doc-endorsed §1.4*
2. Elizabeth Gilbert — *Your elusive creative genius* (TED2009) — IL / permission / vulnerable-personal — *doc-endorsed §1.4*
3. Reshma Saujani — *Teach girls bravery, not perfection* (TED2016) — IL / permission / direct-challenging
4. Dan Gilbert — *The surprising science of happiness* (TED2004) — DC post-achievement / mechanism / expert-scientific — *doc-endorsed §1.4*
5. Simon Sinek — *How great leaders inspire action* (TEDxPugetSound 2009) — DC original / reframe / intellectual-measured — *doc-endorsed §1.4*
6. Robert Waldinger — *What makes a good life?* (TEDxBeaconStreet 2015) — DC post-achievement / reframe / expert-scientific
7. Emily Esfahani Smith — *There's more to life than being happy* (TED2017) — DC original / reframe / warm-affirming
8. Dan Pink — *The puzzle of motivation* (TEDGlobal 2009) — ED / mechanism / expert-scientific — *doc-endorsed §1.4*
9. Arianna Huffington — *How to succeed? Get more sleep* (TEDWomen 2010) — ED / permission / vulnerable-personal
10. Shawn Achor — *The happy secret to better work* (TEDxBloomington 2011) — ED / reframe / warm-affirming

**Projected post-expansion balance (19 SIOs):** states 7/6/6; registers direct 4, vulnerable 4, intellectual 4, warm 3, expert 4; types permission 5, story 4, reframe 6, mechanism 4; tiers t1 7 / t2 8 / t3 4; intensity mild 9 / moderate 9 / **intense 1 (still the known gap)**.
