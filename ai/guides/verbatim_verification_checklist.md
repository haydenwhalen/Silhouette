# Silhouette — Verbatim Verification Checklist (top TED SIOs)

> **Why this exists.** The trust goal is to convert the best reconstructed SIOs into *verified
> verbatim* excerpts with *real timestamps*. The blocker: ted.com transcripts are rendered by a
> JavaScript app, and the automated fetch tool available in-session returns only the page's
> title/metadata — **not** the transcript text or timestamps. So the verbatim/timestamp step
> cannot be completed automatically without either (a) a human paste of the official transcript,
> or (b) an API (YouTube Data API for the official-channel video, or a transcript source).
>
> Faking verbatim from memory is disallowed (it would alter quotes while stamping them
> "verified"). So each SIO below stays an honest reconstruction (`transcript_verified: false`)
> until the official text is pasted. This checklist makes that final step a 5-minute task each.

## How to complete one SIO (per row)

1. Open the official transcript URL.
2. Find the passage that matches the **target idea** (and the **distinctive phrase** to search for).
3. Copy 1–3 **verbatim** sentences that carry the insight (keep it brief — fair use; always attributed + source-linked).
4. Note the **timestamp** shown next to that passage (TED transcripts show clickable MM:SS markers).
5. Paste the verbatim text + timestamp back to Claude (or edit directly). Claude will then, for that SIO:
   - replace the body excerpt with the verbatim quote (drop the `⚠️ RECONSTRUCTION NOTE`),
   - set `timestamp_range`, `timestamp_start_seconds`, `timestamp_end_seconds` (MM:SS → seconds),
   - set `transcript_verified: true`, and `human_review_status: approved` after a final human word-check (NOTE: the SIO loader only serves `{approved, prototype_only, needs_review}` — do **not** use `reviewed`/`pending`/`flagged`, which the loader silently skips; keep `prototype_only` until the word-check, then `approved`),
   - add a `media_verification_notes` line citing the transcript URL + timestamp,
   - update the source object: `transcript_url`, `transcript_available: true`, `timestamp_verified: true`.

## Checklist (5 clean TED SIOs + Robbins)

| insight_id | Transcript URL | Target idea / distinctive phrase to find |
|---|---|---|
| `sio-urban-instant-gratification-monkey-2016` | https://www.ted.com/talks/tim_urban_inside_the_mind_of_a_master_procrastinator/transcript | "Instant Gratification Monkey" + "Panic Monster"; the closing point that procrastination on things with **no deadline** is the dangerous kind |
| `sio-waldinger-good-life-relationships-2015` | https://www.ted.com/talks/robert_waldinger_what_makes_a_good_life_lessons_from_the_longest_study_on_happiness/transcript | 75-year study; "good relationships keep us happier and healthier" — **not** wealth or fame |
| `sio-smith-meaning-over-happiness-2017` | https://www.ted.com/talks/emily_esfahani_smith_there_s_more_to_life_than_being_happy/transcript | meaning over happiness; the **four pillars** (belonging, purpose, transcendence, storytelling) |
| `sio-pink-autonomy-mastery-purpose-2009` | https://www.ted.com/talks/dan_pink_the_puzzle_of_motivation/transcript | the candle problem; if-then rewards **fail** for creative tasks; **autonomy, mastery, purpose** |
| `sio-gilbert-elusive-genius-2009` | https://www.ted.com/talks/elizabeth_gilbert_your_elusive_creative_genius/transcript | "have a genius" vs **"be a genius"**; the unbearable pressure; "just show up and do your part" |
| `sio-robbins-5-second-rule-2011` | https://www.ted.com/talks/mel_robbins_how_to_stop_screwing_yourself_over/transcript | the **5-second window** / 5-4-3-2-1; note the detailed prefrontal-cortex mechanism is expanded in her 2017 book — verify which wording is actually in the 2011 talk |

## Status of the chosen "top 6 + McConaughey"

- **McConaughey** — DONE this pass (different path): the cited Tim Ferriss episode #474 transcript was fetchable and was verified to **not** contain the story, so the SIO was **re-sourced** to its true origin, McConaughey's memoir *Greenlights* (2020), with a documented faithful paraphrase + the one widely-documented quote. (`transcript_verified: false`, `human_review_status: prototype_only` — book paraphrase; promote to `approved` after a brief verbatim quote + page citation.)
- **Urban, Waldinger, Smith, Pink, Gilbert, Robbins** — blocked on transcript access; complete via the table above.

## Faster alternatives to the manual paste (recommended next)

- **Paste the 6 transcripts** (or just the matched passages + timestamps) → Claude finishes all 6 precisely in one pass.
- **Enable the YouTube Data API** (key in `.env`) → the `find-video-sources` workflow can verify the official-channel `video_id` via `search.list` (match `channelId`), unlocking real `youtube-nocookie` embeds with `?start=` timestamps for these talks too.
- Either path flips these from "reconstructed, video-ready" to "verbatim, timestamped, trust-grade."
