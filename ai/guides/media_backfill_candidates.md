# Media Backfill — Candidate Report (Non-Promoted SIOs)

_Generated 2026-06-03. Companion docs: `media_backfill_inventory.md`,
`media_backfill_discovery.md`, `media_backfill_promotions.md`._

This report covers every SIO that was **NOT** promoted to a verified embed in
the 2026-06-03 backfill, with an honest rationale per candidate. Source
honesty rules required us to reject many discovered candidates rather than
attach the wrong episode.

## Why the user's constraint mattered

The discovery script returned an API-confirmed top hit from a verified
channel for 12 of 12 podcast searches. But honesty inspection rejected 5/12
because the top hit was the **wrong episode**:

- Speaker has multiple appearances on the channel.
- The newest upload is rarely the SIO's source episode.
- Date mismatches between the SIO (an earlier appearance) and the YouTube
  upload (a later return appearance) indicate different content.

Attaching the wrong episode would mean the user clicks "Watch the source"
and hears something unrelated to the SIO. That damages trust irreparably.
**No embed beats a wrong embed.**

---

## Rejected — discovered candidate is the wrong episode

### `sio-jocko-discipline-not-motivation-2016`

- **SIO source**: TFS #187 (2016-09-21), "Jocko Willink on Discipline,
  Leadership, and Overcoming Doubt"
- **Top hit**: "Jocko Willink Returns" (video_id `5upGP_t81sA`, 2017-11-09)
  — this is TFS #257 or similar return appearance, NOT the original.
- **Why rejected**: Jocko has appeared on TFS multiple times. The 2017
  "Returns" episode is a different conversation. The SIO body paraphrases
  TFS #187 content; attaching #257 would misattribute.
- **Recommended action**: `manual_research_needed`. Manually verify whether
  TFS #187 itself has a YouTube upload (older episodes are inconsistent —
  some have video uploads from earlier years, some don't). If found and the
  audio matches the SIO excerpt, promote.

### `sio-millman-busy-is-a-decision-2018`

- **SIO source**: TFS #304 (early 2018), Debbie Millman on busy as decision
- **Top hit**: "Debbie Millman Interview" (`8S_Ims5oX-s`, 2017-02-25) — TFS
  #218 or earlier appearance, NOT #304.
- **Why rejected**: Millman has had multiple TFS appearances. The 2017
  upload predates the SIO's source episode.
- **Recommended action**: `manual_research_needed`. Search Tim Ferriss
  channel specifically for "TFS 304" or "busy is a decision" phrase to find
  the right episode upload (if it exists).

### `sio-pressfield-resistance-2015`

- **SIO source**: TFS appearance from 2015 (around TFS #98), Pressfield on
  the War of Art / Resistance
- **Top hit**: "Become a Conduit for Beauty | Steven Pressfield on The Tim
  Ferriss Show Podcast" (`0v9tiHOnRCc`, 2022-12-20)
- **Why rejected**: Different episode by ~7 years. The 2022 upload covers
  newer Pressfield material (around his "Govt Cheese" book).
- **Recommended action**: `manual_research_needed`. The 2015 Pressfield
  episode may not have an official video upload (Tim Ferriss didn't
  routinely upload videos that early).

### `sio-derek-sivers-hell-yeah-or-no-2015`

- **SIO source**: TFS from ~2015, Sivers on developing confidence
- **Top hit**: "Derek Sivers — Finding Paths Less Traveled" (`0BaDQCjqUHU`,
  2023-04-21)
- **Why rejected**: Different episode by ~8 years. The 2023 upload is
  Sivers' recent return to TFS.
- **Recommended action**: `manual_research_needed`. Older Sivers TFS
  appearances may exist on his own channel `sive.rs` page rather than as
  Tim Ferriss YouTube uploads.

### `sio-rich-roll-roll-recovery-reinvention-2022`

- **SIO source**: Rich Roll discussing his own recovery / reinvention arc
- **Top hit**: "Chris Herren on Addiction, Sobriety & Redemption" — GUEST
  interview, not Rich's own story
- **Why rejected**: Wrong content TYPE. The SIO is about Rich Roll's
  personal story (which he discusses as a guest on other podcasts and in
  the book "Finding Ultra"). His own podcast features guests, not himself.
- **Recommended action**: `manual_research_needed`. Search for Rich Roll
  appearing AS A GUEST on another podcast (e.g. Tim Ferriss, Joe Rogan)
  discussing his own recovery story. That's a SECONDARY supporting media
  situation per the workflow.

---

## Rejected — Huberman Lab matches are clips or different episodes

### `sio-goggins-identity-of-inaction-2023`

- **SIO source**: Huberman Lab Goggins episode (2023)
- **Top hit**: "David Goggins on Controlling the Multi-Voice Dialogue in
  Your Mind" (`CuzL1qxUyHw`, 2024-01-09)
- **Why rejected**: This looks like a CLIP from the full Goggins/Huberman
  episode, not the full episode itself (title is one specific theme; date
  is post-episode-original). The full episode is likely a different ID.
- **Recommended action**: `manual_research_needed`. Search Huberman Lab
  channel specifically for the FULL Goggins interview episode.

### `sio-andrew-huberman-limbic-friction-reentry-2020`

- **SIO source**: Huberman Lab solo episode on limbic friction (2020)
- **Top hit**: "How to Increase Your Willpower & Tenacity"
  (`cwakOgHIT0E`, 2023-10-09)
- **Why rejected**: 2023 episode, SIO references the 2020 original. The
  2023 episode covers similar territory but is different content.
- **Recommended action**: `manual_research_needed`. The original 2020
  episode title was likely something like "Understanding and Controlling
  Aggression / Limbic Friction." Search the channel by date range or
  episode number.

### `sio-huberman-dopamine-baseline-2021`

- **SIO source**: Huberman Lab dopamine baseline episode (2021)
- **Top hit**: "Controlling Your Dopamine for Motivation, Focus &
  Satisfaction | Huberman Lab Essentials" (`XeN6eGO6FVQ`, 2025-08-14)
- **Why partially rejected**: The "Essentials" version is a re-edited
  shorter cut of the same 2021 episode. Honest framing: the content
  matches, but it's a re-edit not the original.
- **Recommended action**: `promote_needs_review`. Could be promoted as
  EITHER (a) the Essentials re-edit (slightly different framing, shorter,
  but same Huberman, same content) or (b) the original 2021 full episode
  if found by manual search. Currently NOT promoted because the
  Essentials/original distinction is a human-judgment call.

### `sio-clear-habits-trajectory-2023`

- **SIO source**: TFS #648 (2023-01-04), James Clear on habits
- **Top hit**: "Join Groups Where Your Desired Behavior is The Normal
  Behavior | Atomic Habits Author James..." (`CttjBw-V4IY`, 2023-01-09)
- **Why partially rejected**: This appears to be a CLIP from TFS #648 (the
  date is very close; the title is one specific habits theme from the
  episode). Tim Ferriss often uploads clip-style edits of recent
  episodes to YouTube rather than the full audio.
- **Recommended action**: `manual_research_needed`. Confirm whether the
  full TFS #648 episode exists as a separate YouTube upload, OR accept the
  clip with clip_match_type: talking_point and notes explaining the
  upload-is-a-clip status.

---

## Not attempted — book / article SIOs (secondary-video territory)

Per the workflow's caution about secondary supporting media: if the SIO's
original source is a book or article, attaching a video of the author
discussing related themes is **secondary supporting media**, not the
original source. We should not blur attribution.

These are all candidates where a thoughtful human could attach a secondary
video with `clip_match_type: talking_point` and explicit "secondary
supporting media" notes — but it requires the human to confirm the video
truly matches the SIO's specific claim, not just the broader topic.

| SIO | Original source | Possible secondary media |
|---|---|---|
| `sio-manson-no-singular-calling-2016` | Manson's "The Subtle Art" book | Manson author talks; not a 1:1 quote source |
| `sio-mcconaughey-go-to-zero-2020` | TFS interview ($14.5M/picture) | Already on YouTube? Different episode than greenlights-direction SoG |
| `sio-newport-skill-not-passion-2012` | Newport's "So Good They Can't Ignore You" book | Cal Newport TEDx talks exist; not 1:1 |
| `sio-brown-numbing-not-failing-2021` | Brown's "Atlas of the Heart" book | Brown has many talks; not 1:1 to the book passage |
| `sio-grant-languishing-2021` | NYT op-ed by Adam Grant | Grant TED talks exist on adjacent topics |
| `sio-andre-agassi-open-identity-vacuum-2009` | Agassi's "Open" memoir | Agassi interviews exist; promo tour material |
| `sio-bren-brown-braving-wilderness-2017` | Brown's "Braving the Wilderness" book | Brown's TED talks (already in corpus) cover adjacent themes |
| `sio-adam-grant-identity-as-structure-2021` | Grant's "Think Again" book | Grant TED talks exist on adjacent themes |
| `sio-lewis-howes-athlete-identity-floor-2015` | Howes' "School of Greatness" book | Howes' own podcast appearances; already a separate SoG SIO |
| `sio-james-clear-never-miss-twice-2020` | Clear's "Atomic Habits" book ch. 13 | Same content as Clear SoG SIO (already verified) |
| `sio-bren-brown-vulnerability-commitment-2012` | Brown's "Daring Greatly" book | Brown's TED talks cover adjacent themes |
| `sio-dan-martell-research-avoidance-2023` | Martell's "Buy Back Your Time" book | Martell YouTube channel exists |

**Recommended action for all 12**: `manual_research_needed` — a thoughtful
human can attach a secondary video per SIO using the workflow in
`aiDocs/video-moment-timestamp-workflow.md` § "Secondary supporting media."
Each one needs separate judgment about whether the video material supports
the same specific claim or just the broader topic.

---

## Not attempted — TEDx talks not on the main TED channel

### `sio-bj-fogg-shrink-the-restart-2019`

- **Original source**: TinyHabits.com book + TEDxFremont talk
- **Why not promoted**: TEDxFremont is independently-organized; uses the
  TEDx Talks YouTube channel rather than TED.com's embed system. The
  TEDxFremont talk may exist but won't have a ted.com slug; would embed
  via YouTube on the TEDx Talks channel (`UCsT0YIqwnpJCM-mx7-gSA4Q`).
- **Recommended action**: `promote_needs_review`. Search TEDx Talks
  channel for "BJ Fogg Tiny Habits"; if found and verified, promote as
  YouTube embed.

### `sio-kristin-neff-lapse-not-identity-2020`

- **Original source**: self-compassion.org + TEDxCentennialParkWomen talk
- **Why not promoted**: TEDxCentennialPark is independent; uses TEDx Talks
  YouTube channel. The original TEDx video should be findable on the
  channel.
- **Recommended action**: `promote_needs_review`. Search TEDx Talks
  channel for "Kristin Neff self-compassion"; if found, promote as YouTube
  embed.

---

## Summary

| Category | Count |
|---|---|
| Promoted to verified embed (this batch) | 8 |
| Rejected — wrong episode | 5 (Jocko, Millman, Pressfield, Sivers, Rich Roll) |
| Rejected — Huberman clip / re-edit / wrong year | 4 (Goggins, Huberman limbic, Huberman dopamine, Clear-TFS) |
| Not attempted — book/article secondary | 12 |
| Not attempted — TEDx (needs TEDx channel search) | 2 (Fogg, Neff) |
| **Total non-promoted** | **23** |

**The 8 promotions are the high-confidence floor.** Every other candidate
either had wrong-episode risk or required secondary-source human judgment.
Promoting more would have meant attaching wrong embeds — strictly worse
than the current "Watch the source" fallback the UI already shows.
