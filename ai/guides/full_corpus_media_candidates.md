# Full Corpus Media Candidates — 2026-06-04

Candidate-source discovery for the 14 `needs_video_embed` SIOs plus the 2
`needs_review` SIOs. Each was researched by a dedicated agent using WebSearch /
WebFetch + `yt-dlp` caption verification, with strict honesty rules (no
fabricated IDs; no compilation/fan/AI-summary/quote-card videos; reject if the
speaker in the video isn't the SIO speaker; allowlisted embed hosts only).

Verdict legend: **official_primary** = the video IS the quoted source;
**official_secondary** = official same-speaker video on the same idea, different
episode; **fallback_only** = no credible video, keep source link; **reject**.

## Confirmed & promoted (12)

| SIO | Verdict | Provider | video_id | Channel | Quote confirmed | Conf |
|---|---|---|---|---|---|---|
| Millman | official_primary | youtube | `ZoF55SXO6ik` | Tim Ferriss | yes, ~14:08 | high |
| Clear (trajectory) | official_primary | youtube | `T2r1jyhT2vg` | Tim Ferriss | yes, ~07:10 | high |
| Jocko | official_primary | youtube | `PQvTQebCqxQ` | Tim Ferriss | yes, ~55:32 | high |
| Rich Roll | official_primary | youtube | `bR6JHIZKJdI` | Tim Ferriss | yes, ~49:36 | high |
| Pressfield | official_secondary | youtube | `tC44dTV0kKo` | Tim Ferriss | yes (concept), ~1:08:29 | high |
| Sivers | official_secondary | youtube | `gnk4sgOFjBQ` | Tim Ferriss | yes, ~57:36 | high |
| Fogg | official_primary | youtube | `AdKUJxjn-R8` | TEDx Talks | yes, ~06:42 | high |
| Neff | official_primary | youtube | `IvtZBUSplr4` | TEDx Talks | yes, ~15:06 | high |
| Huberman (limbic) | official_primary | youtube | `Wcs2PFz5q6g` | Huberman Lab | yes, ~13:57 | high |
| Renfrew | official_primary | youtube | `9hHAuPRdHws` | Rich Roll | yes, ~36:22 | high |
| Huberman (dopamine) | official_primary | youtube | `QmOF0crdyRU` | Huberman Lab | yes, ~53:00 | high |
| Goggins | official_primary | youtube | `nDLb8_wgX50` | Huberman Lab | yes, ~1:19:00 | high |

## Not promoted (2)

| SIO | Verdict | Detail |
|---|---|---|
| Easter | fallback_only | No official video carries this comfort-crisis reframe in Easter's own words. Original = Art of Manliness #708 audio (quote verified). Inspected & rejected: Rich Roll #969 (`dsep3W6sfFY`, only passing mention), Rich Roll #814 (`MRWcY9Y8Xp8`, host speaking re: a different book), PowerfulJRE clip (`wh-LTVrdOPQ`, untrusted). |
| Robbins | official_secondary (weak) | Candidate `MOVQponoBmI` (Mel Robbins Ep. 282, official @melrobbins `UCk2U-Oqn7RXf-ydPqfSxG5g`) expresses a *related* jealousy-as-signal idea at ~48:02, but NOT the SIO's "invitation from your future self" framing — that's from her book. Channel not yet in `trusted_youtube_channels.json`. Rejected many motivational re-uploads. Recommend keep text-only. |

## Rejected candidates (logged for honesty)

- Perel: `EyopAlh04iA` — currently embedded but WRONG (see integrity sweep).
- Goggins: `pTB51K96vFs` — unofficial 9:16 clip on "Podcast Summaries", not the source.
- Millman: `PoBNbmpwcC8` — unofficial re-upload, removed by Tim Ferriss copyright claim.
- Neff: `pKEtknqHTjo` (Palouse Mindfulness), `wh8ffxvM1eg` (Kind Mind Academy) — non-official re-uploads.
- Sivers: `WwcGMb3M2pY` — non-allowlisted clip/quote-card; his TED talks are unrelated to this idea.
- Robbins: `X-5Xu9u6u5M` (Oprah clip), "@MelRobbinsOfficial-02", "Mel Robbins Clips" — re-upload/clip channels.

## Book-sourced SIOs (12) — not searched for video this pass

Manson, McConaughey *Greenlights*, Newport, Brown ×3, Agassi, Grant ×2, Howes,
Clear *Atomic Habits*, Martell. Original source is a book; an author talk could be
a future talking_point candidate. Left text-only/source-link for now.

## Tooling note

`scripts/find-video-sources.ts` was fixed this pass to load `dotenv/config` so its
optional YouTube Data API enrichment actually runs (it was silently printing "API
not configured"). Candidate discovery itself was done by the per-SIO agents.
