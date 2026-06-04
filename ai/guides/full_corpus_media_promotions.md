# Full Corpus Media Promotions — 2026-06-04

Every SIO changed in this media backfill pass, and why. All embeds were verified
by a per-SIO research agent: official channel confirmed against
`trusted_youtube_channels.json`, and the insight confirmed present in the video's
auto-captions (pulled via `yt-dlp`, android-client path). Applied via
`scripts/apply-media-promotions.ts` (the 10 no-media SIOs) plus targeted edits
(the 2 `needs_review` SIOs).

## Summary

- **12 SIOs promoted** to a verified YouTube embed (audio/text-only → video).
- **2 SIOs deliberately NOT promoted** (honest fallback — see bottom).
- Verified embeds corpus-wide: **25 → 37**. YouTube embeds: **9 → 21**.

## Promotions — exact_quote_match (verbatim body, transcript_verified: true)

| SIO | Speaker | Video (channel) | Source | Timestamp |
|---|---|---|---|---|
| `direction_collapse_millman_busy_decision` | Debbie Millman | `ZoF55SXO6ik` (Tim Ferriss) | TFS #304, official full episode | 847–855 (auto-pinned) |
| `inaction_loop_clear_trajectory` | James Clear | `T2r1jyhT2vg` (Tim Ferriss) | TFS #648, official full episode | 434–443 (auto-pinned) |
| `inaction_loop_jocko_discipline` | Jocko Willink | `PQvTQebCqxQ` (Tim Ferriss) | TFS #187, official full episode | 3341–3353 (auto-pinned) |

These three already had `transcript_verified: true` (verbatim bodies). The video
is the cited source episode, the body was found verbatim in the captions, and the
timestamp was pinned by `extract-video-timestamps` (HIGH gate, ≥13 contiguous words).

## Promotions — talking_point (official video, reconstruction/secondary body)

| SIO | Speaker | Video (channel) | Why talking_point | Timestamp |
|---|---|---|---|---|
| `identity_transition_rich_roll_recovery_reinvention` | Rich Roll | `bR6JHIZKJdI` (Tim Ferriss) | IS source ep #561; body is prototype_only reconstruction | 2972–3025 |
| `inaction_loop_pressfield` | Steven Pressfield | `tC44dTV0kKo` (Tim Ferriss) | **secondary** — ep #501, not cited #84 (audio-only, 404) | 4109–4170 |
| `possibility_paralysis_sivers_hell_yeah_or_no` | Derek Sivers | `gnk4sgOFjBQ` (Tim Ferriss) | **secondary** — ep #128, not cited #125 (no official video) | 3456–3542 |
| `momentum_gap_fogg_shrink_the_restart` | BJ Fogg | `AdKUJxjn-R8` (TEDx Talks) | IS source talk; body is reconstruction. **Metadata flag: SIO points at 2019 book, video is 2012 talk** | 390–425 |
| `momentum_gap_neff_lapse_not_identity` | Kristin Neff | `IvtZBUSplr4` (TEDx Talks) | IS source talk; body is the author's habit-lapse application. **Metadata flag: actual date 2013, SIO says 2020** | 906–935 |
| `momentum_gap_huberman_limbic_friction_reentry` | Andrew Huberman | `Wcs2PFz5q6g` (Huberman Lab) | IS source ep #53; body is reconstruction. **Metadata flag: actual date 2022-01-03, SIO says 2020** | 837–905 |
| `identity_transition_renfrew_post_exit_identity` | Gregg Renfrew | `9hHAuPRdHws` (Rich Roll) | IS source ep #954; body is reconstruction; quoted phrase is from the episode description | 2178–2245 |
| `engagement_drought_huberman` | Andrew Huberman | `QmOF0crdyRU` (Huberman Lab) | was `needs_review`; body reconstruction. **Timestamp CORRECTED 2700→3180 (45:00 was wrong content)** | 3180–3460 |
| `inaction_loop_goggins_huberman` | David Goggins | `nDLb8_wgX50` (Huberman Lab) | was `needs_review`; **candidate conflict RESOLVED** (rival `pTB51K96vFs` is an unofficial clip) | 4735–5040 |

talking_point timestamps are "context starts" — the moment where the speaker
genuinely expresses the idea (agent-confirmed in captions). The UI shows "Watch
near this moment." `transcript_verified` left `false` (bodies are reconstructions).

## NOT promoted (honest fallbacks)

| SIO | Speaker | Why |
|---|---|---|
| `engagement_drought_easter_comfort_crisis` | Michael Easter | `fallback_only` — original is audio-only Art of Manliness #708 (quote verified verbatim there); no official video carries this specific reframe in Easter's own words. Rich Roll appearances discuss other books / the line is the host speaking. **Kept audio-primary.** |
| `momentum_gap_robbins_jealousy_future_self` | Mel Robbins | Weak `official_secondary` — the SIO's specific framing ("invitation from your future self") is from her **book** *The Let Them Theory*, not the candidate video (only a related variant). Her channel isn't in the trusted registry. Per "a bad media match is worse than no media," **kept text-only**; flagged for review. |

## Book-sourced SIOs left text-only (12, `secondary_source_possible`)

Manson, McConaughey (*Greenlights*), Newport, Brown ×3, Agassi, Grant ×2, Howes,
Clear (*Atomic Habits*), Martell. These quote books; a secondary author talk could
be attached as talking_point in a future pass, but none was promoted here — the
honest default for a book quote is the source link.
