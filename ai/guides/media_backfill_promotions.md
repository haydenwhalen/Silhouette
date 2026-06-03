# Media Backfill — Promotion Report (2026-06-03)

_Generated 2026-06-03 alongside `media_backfill_inventory.md`,
`media_backfill_discovery.md`, `media_backfill_candidates.md`._

## Headline

**8 SIOs promoted** from `needs_review` / `not_applicable` to
`media_verification_status: verified` with allowlisted embed URLs.

Corpus media coverage:

| Metric | Before | After | Δ |
|---|---|---|---|
| SIOs with verified embed | 17 | **25** | +8 |
| SIOs the UI will render the video card for | 17 | **25** | +8 |
| TED embeds | 11 | 16 | +5 |
| YouTube embeds | 6 | 9 | +3 |
| SIOs with a per-moment timestamp | 0 | 0 | unchanged |
| Hard validator violations | 0 | 0 | unchanged |

`npm run test-media-e2e` will now show 25 render-ready SIOs (was 17).

## The 8 promoted SIOs

### 5 TED talks (provider: ted)

The canonical TED slug was already present in each SIO's `source_url` —
the backfill just adopted the existing slug as the `embed_url`. Honest
because the slug had been in the SIO's frontmatter since ingestion.

| SIO | Speaker | Talk | Embed URL |
|---|---|---|---|
| `sio-barry-schwartz-paradox-of-choice-2005` | Barry Schwartz | The Paradox of Choice (TED 2005) | `embed.ted.com/talks/barry_schwartz_the_paradox_of_choice` |
| `sio-ruth-chang-hard-choices-2014` | Ruth Chang | How to make hard choices (TED 2014) | `embed.ted.com/talks/ruth_chang_how_to_make_hard_choices` |
| `sio-tim-ferriss-fear-setting-2017` | Tim Ferriss | Why you should define your fears (TED 2017) | `embed.ted.com/talks/tim_ferriss_why_you_should_define_your_fears_instead_of_your_goals` |
| `sio-david-emotional-courage-2017` | Susan David | The gift and power of emotional courage (TED 2017) | `embed.ted.com/talks/susan_david_the_gift_and_power_of_emotional_courage` |
| `sio-bruce-feiler-lifequake-messy-middle-2021` | Bruce Feiler | The Secret to Mastering Life's Biggest Transitions (TED 2021) | `embed.ted.com/talks/bruce_feiler_the_secret_to_mastering_life_s_biggest_transitions` |

For each:
- `video_provider`: `none` → `ted`
- `display_mode`: `text-only` → `video-primary`
- `media_verification_status`: `needs_review` / `not_applicable` → `verified`
- `clip_match_type`: added as `talking_point` (reconstruction body; no
  per-moment match)
- `media_available`: `null` → `true`
- `media_verification_notes`: rewritten to explain the backfill
- `media_rights_notes`: standardised to "Official TED talk. Embed via
  embed.ted.com only. Do not download or re-host."

### 3 Tim Ferriss YouTube uploads (provider: youtube)

Each SIO's body is a **verbatim quote from the official tim.blog
transcript** (`transcript_verified: true` was already set). The backfill
linked the same episode's YouTube video (the audio is the same content
distributed on YouTube as a video), API-confirmed on the official Tim
Ferriss channel.

| SIO | Speaker | Episode | video_id | Upload date | clip_match_type |
|---|---|---|---|---|---|
| `sio-bj-miller-attend-to-death-2016` | BJ Miller | TFS #153 (May 2016) | `1eLfGgOjHRU` | 2016-05-09 | `exact_quote_match` |
| `sio-perel-survival-vs-revival-2017` | Esther Perel | TFS #241 (May 2017 audio; Nov 2017 video upload) | `EyopAlh04iA` | 2017-11-10 | `exact_quote_match` |
| `sio-colonna-complicit-conditions-2019` | Jerry Colonna | TFS #373 (June 2019) | `cgc0CMRyOws` | 2019-06-26 | `exact_quote_match` |

For each:
- `source_media_type`: `podcast-audio` → `podcast-video`
- `video_provider`: `none` → `youtube`
- `video_id`: empty → the API-confirmed 11-char ID
- `video_url`, `embed_url`: built canonical
- `channel_id`: `UCznv7Vf9nBdJYvBagFdAHWw` (verified Tim Ferriss channel)
- `display_mode`: `audio-primary` → `video-primary`
- `media_verification_status`: `not_applicable` → `verified`
- `clip_match_type`: added as `exact_quote_match` — honest because the
  SIO body is verbatim from the tim.blog transcript of the SAME episode
- `media_available`: stays `true`
- `media_verification_notes`: rewritten to explain the channel/episode
  match and why `exact_quote_match` is appropriate

The 8 source records in `corpus/sources/` were updated in parallel with
the SIO frontmatter so the standalone source metadata stays consistent.

## Timestamps

**No timestamps were added.** Running `npm run find-video-moments` against
all 25 verified embeds returns:

- 16 `not_video_source` — the 16 TED SIOs (TED embeds don't honor `?start=`)
- 9 `manual_review_required` — all 9 YouTube SIOs have **zero** chapter
  markers in their official video descriptions

Per-moment timestamps for these need a human to listen (cues are in the
generated `video_moment_candidates_report.md`). Once you set a timestamp,
the UI label flips from "Watch the source" to "Watch the moment" (for the
3 Tim Ferriss SIOs, since they have `clip_match_type: exact_quote_match`)
or "Watch near this moment" (for `talking_point` SIOs).

## What the user sees now

For the 8 newly promoted SIOs, the chat UI will now render:

- A click-to-play media card (was previously just a "Listen to the full
  episode → tim.blog/..." text link or "Read the source → ...").
- For TED SIOs: a styled TED placeholder card (no thumbnail because TED
  doesn't expose deterministic public thumbnails per slug). Label: "Watch
  the source". Iframe plays the TED talk from the start.
- For Tim Ferriss YouTube SIOs: a YouTube thumbnail from
  `i.ytimg.com/vi/<id>/hqdefault.jpg`. Label: "Watch the source"
  (timestamp not yet set). Iframe plays the YouTube upload from 00:00.

All cards retain the speaker name and source-title chrome below the
placeholder, and the source link in the rendered_markdown remains for the
text fallback.

## Source-honesty audit

For each promotion, the rules I checked:

- ✅ `isAllowedEmbedHost(embed_url)` returns true (embed.ted.com or
  youtube-nocookie.com).
- ✅ Channel identity API-verified (Tim Ferriss `UCznv7Vf9nBdJYvBagFdAHWw`)
  or canonical TED.com URL pre-existed in source_url.
- ✅ Speaker matches the SIO's `speaker` field.
- ✅ Episode title or talk title matches the SIO's `episode_or_content_title`.
- ✅ Episode date is consistent with the SIO's `episode_or_content_date`
  (Tim Ferriss video uploads sometimes follow the audio publish date by
  weeks; this is documented per SIO).
- ✅ `clip_match_type` is honest:
  - TED SIOs: `talking_point` (reconstruction body, no transcript
    verification → can't claim exact or close)
  - Tim Ferriss SIOs: `exact_quote_match` (already `transcript_verified:
    true` against the tim.blog transcript)
- ✅ `transcript_verified: true` was already set on the 3 Tim Ferriss
  SIOs; the new `exact_quote_match` claim is therefore consistent with the
  existing validator rule.
- ✅ `rights_notes` standardized to embed-only, no-rehost policy.
- ✅ No video_id, slug, channel_id, or timestamp was fabricated.

## What WAS NOT done (and why)

See `media_backfill_candidates.md` for the per-SIO rationale, but
summarized:

- 5 podcast SIOs (Jocko, Millman, Pressfield, Sivers, Rich Roll) had a
  discovered top-hit on a verified channel — but the upload was the
  **wrong episode** (return appearance, later year, or wrong content
  type). Rejecting these instead of attaching the wrong episode is the
  honest answer.
- 4 SIOs (Goggins-on-Huberman, Huberman limbic friction, Huberman dopamine,
  Clear-TFS) had ambiguous matches — clip vs. full episode, or
  Essentials re-edit vs. original. Held for human judgment.
- 12 book/article SIOs would need **secondary supporting media**
  treatment per the workflow — author talks discussing related themes,
  attached with explicit "secondary" notes. These need human judgment per
  SIO and shouldn't be auto-promoted.
- 2 TEDx SIOs (BJ Fogg, Kristin Neff) would need a search of the TEDx
  Talks YouTube channel (`UCsT0YIqwnpJCM-mx7-gSA4Q`); not done in this
  pass because the candidate report names them explicitly.

## Validation result

```
$ npm run validate-media
RESULT: PASS — no hard violations (17 honest warning(s), allowed).
```

Hard violations: 0. Warnings (17): all are pre-existing prototype gaps
unrelated to this backfill (the 9 unembedded YouTube SIOs warning about
missing clip_match_type, plus the prototype reconstruction notes on book
SIOs).
