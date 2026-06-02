# Silhouette Video Media Layer — Developer Guide

> The single end-to-end reference for how video/clip media works in Silhouette:
> what it does, what "clip extraction" means here, how to add a new media-backed
> SIO, how to verify, how to test. Read this before touching media code.

## What this layer does (plain terms)

When Silhouette presents an insight, if the SIO carries a **verified embed**, the
answer renders an embedded video card right below the attribution line. The card
shows a click-to-play placeholder (with the speaker's name + timestamp label),
and when clicked, loads the official platform's embed (YouTube via
`youtube-nocookie.com`, or TED via `embed.ted.com`) starting at the verified
moment. When no verified embed exists, the answer falls back to a clean source
link — never a broken iframe, never a fabricated thumbnail.

## What "clip extraction" means here

It does **not** mean downloading the source video and creating our own MP4. It
means:

1. Identifying the official source video (YouTube or TED, currently).
2. Verifying the official channel / talk slug.
3. Identifying the specific moment that expresses the SIO (`timestamp_start_seconds` and optionally `timestamp_end_seconds`).
4. Recording structured metadata on the SIO that lets the presentation layer
   render the platform's official embed at that moment.

The user clicks play; the embed loads from the official platform; the video
plays from the verified timestamp. We never host, re-encode, or re-publish
third-party video.

## The honesty invariants (do not relax)

- **No fabricated quotes.** SIO excerpts that aren't verbatim from a verified
  transcript must be labeled as reconstructions (`transcript_verified: false`).
- **No fabricated timestamps.** Most podcast transcripts (tim.blog,
  artofmanliness.com) do not carry per-moment timestamps; for those, a human
  must identify the timestamp by listening. We never invent one.
- **No fabricated channel IDs / video IDs / embed URLs / slugs.** Discovery
  scripts emit candidates flagged `needs_human_review`; nothing is written into
  an SIO without human review.
- **`clip_match_type: exact_quote_match` requires `transcript_verified: true`.**
  Enforced at validation time.
- **Provider allowlist.** Only `youtube-nocookie.com`, `embed.ted.com`, and
  `player.vimeo.com` are mountable as iframes. Enforced at validation time AND
  at render time (defense in depth in `InsightMediaCard`).

## End-to-end pipeline

```
SIO frontmatter (corpus/sios/*.md)
    │  (loaded by src/rag/sioLoader.ts)
    ▼
normalizeMediaMetadata(fm)               ← src/lib/media.ts (shared)
    │   (computes has_verified_embed, builds canonical embed_url
    │    with ?start=, picks fallback_url + fallback_label)
    ▼
PresentationObject.media                 ← src/presentation/presentInsight.ts
    │   (legacy PresentationMedia shape still produced for
    │    rendered_markdown; runtime UI uses the new InsightMedia)
    ▼
AgentResponse.media (InsightMedia | null) ← src/agent/index.ts
    │   (derived per-turn from getSIOById(last_insight_id))
    ▼
/api/chat response: { reply, media, ... } ← src/app/api/chat/route.ts
    ▼
ChatWindow Message.media                  ← src/components/ChatWindow.tsx
    ▼
MessageList renders InsightMediaCard      ← src/components/MessageList.tsx
    │   (positioned between attribution line and why-this-applies)
    ▼
InsightMediaCard                          ← src/components/InsightMediaCard.tsx
    - Placeholder (thumbnail + speaker + timestamp + play glyph)
    - On click → <iframe> from embed_url (allowlist re-checked)
```

## SIO frontmatter — media fields

All optional unless noted. The full list is the source of truth in
`src/rag/sioLoader.ts:22-57`.

| Field                          | Type           | Purpose                                                                                          |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------------------------ |
| `video_provider`               | `youtube\|ted\|vimeo\|none` | The platform. Required for any embed.                                              |
| `video_id`                     | string         | 11-char YouTube ID (only for YouTube). Validated by format check.                                |
| `video_url`                    | URL            | Canonical watch page (e.g. `youtube.com/watch?v=...` or `ted.com/talks/...`).                    |
| `embed_url`                    | URL            | The actual URL the iframe mounts. **Must be on the allowlist.**                                 |
| `source_url`                   | URL            | Canonical source page (episode page, talk page, article).                                        |
| `display_mode`                 | `video-primary\|audio-primary\|text-only` | Declared mode; degrades honestly if embed unavailable.            |
| `media_verification_status`    | `verified\|needs_review\|unverified\|unofficial\|not_applicable` | Gates `has_verified_embed`.    |
| `timestamp_start_seconds`      | number\|null   | Verified start moment. **null is honest; 0 is "starts at the top".**                            |
| `timestamp_end_seconds`        | number\|null   | Verified end moment. Used to build `?start=&end=` on YouTube embeds.                            |
| `timestamp_range`              | string         | Legacy human-readable label (e.g. "14:05–15:30"). Optional; `formatTimestamp` derives a label.   |
| `clip_match_type`              | `exact_quote_match\|close_paraphrase\|talking_point` | How closely the SIO excerpt matches the moment. |
| `transcript_verified`          | boolean        | Required `true` for `clip_match_type: exact_quote_match`.                                       |
| `media_rights_notes`           | string         | Per-source rights notes (e.g. "Embed via embed.ted.com only; do not download.")                  |
| `media_verification_notes`     | string         | Free-text notes explaining how the embed was verified.                                          |

### Worked example — verified TED SIO

```yaml
source_type: ted talk
speaker: Dan Gilbert
show_or_platform: TED
episode_or_content_title: "The surprising science of happiness"
source_url: "https://www.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness"

video_provider: ted
video_url: "https://www.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness"
embed_url: "https://embed.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness"
timestamp_start_seconds: null   # TED embeds always play from start
timestamp_end_seconds: null
display_mode: video-primary
media_verification_status: verified
media_verification_notes: "TED embed VERIFIED: canonical slug confirmed via web search."
media_rights_notes: "Official TED talk. Embed via embed.ted.com only. Do not download."
```

### Worked example — verified YouTube SIO with timestamp

```yaml
video_provider: youtube
video_id: "dQw4w9WgXcQ"            # 11 chars, A-Za-z0-9_-
video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
                                    # ?start= added at runtime from timestamp_start_seconds
timestamp_start_seconds: 845
timestamp_end_seconds: 905
display_mode: video-primary
media_verification_status: verified
clip_match_type: exact_quote_match   # requires transcript_verified: true
transcript_verified: true
media_verification_notes: |
  Official-channel verified via YouTube Data API (channel matches trusted
  registry). Timestamp identified by listening to the source on 2026-06-01.
```

## How to add media to a new SIO

1. **Find the official video.**
   - YouTube: confirm it's on the show's official channel. Use
     `npm run verify-youtube-channels` (one-time, requires `YOUTUBE_API_KEY`)
     to populate `corpus/sources/trusted_youtube_channels.json` with real
     channel IDs. Then use `npm run find-video-sources` to surface candidates.
   - TED: locate the talk slug from `ted.com/talks/<slug>`.
2. **Verify the moment.**
   - Run `npm run find-clip-moments -- --insight-id <id>` to search the
     transcript (where available) and identify a candidate moment. Output goes
     to `ai/guides/clip_moment_discovery_report.md`.
   - For verified moments: listen/watch the source and confirm timestamp.
3. **Edit the SIO** to add the fields above. Set
   `media_verification_status: verified` only after the embed actually plays
   the right moment.
4. **Validate**: `npm run validate-media`. Fails loudly on any honesty rule.
5. **Smoke test**: `npm run dev`, send a query that retrieves the SIO, confirm
   the card renders and click-to-play works.

## Verification levels

The `media_verification_status` ladder, strictest → loosest:

- `verified` — embed confirmed to play; for YouTube, official channel verified
  via Data API. **Only `verified` SIOs render the embedded card.**
- `needs_review` — candidate found but not human-confirmed. UI falls back to
  the source link.
- `unverified` — not yet attempted.
- `unofficial` — known to be a re-upload or unofficial source. Do not promote.
- `not_applicable` — text source (book, article) or audio-only podcast with no
  official video.

## Rights limitations (do not bend)

- Do not download / re-encode / re-host third-party video.
- Always use the platform's official embed URL.
- Always link back to the official source page.
- Always preserve speaker attribution above the fold.
- Do not autoplay. Do not stack multiple videos in one answer.
- Do not present `needs_review`-status video as official.

## Commands

| Command                                                    | What it does                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run validate-media`                                   | Lints all SIO media metadata. Fails on honesty violations.                                   |
| `npm run test-media-helpers`                               | Unit tests for `src/lib/media.ts` (allowlist, embed URL builders, normalizer, formatTimestamp). |
| `npm run test-youtube-api`                                 | Tests for `scripts/lib/youtube.ts` (YouTube Data API helpers, mock-mode).                    |
| `npm run verify-youtube-channels`                          | One-time: resolves trusted channel handles → channel_ids via YouTube API. Requires key.       |
| `npm run find-video-sources`                               | Inventory + structured search targets for SIOs missing verified embeds.                       |
| `npm run find-clip-moments`                                | Searches fetchable transcripts for SIO excerpts. Outputs candidate moments + evidence.        |
| `npm run find-clip-moments -- --insight-id <id>`           | Same, scoped to one SIO.                                                                      |
| `npm run find-clip-moments -- --all`                       | Same, all SIOs (not just ones with `embed_url`).                                              |
| `npm run dev`                                              | Local dev server. Use to smoke-test the card visually.                                        |

## How to test embeds manually

1. `npm run dev`
2. Open `http://localhost:3000`
3. Accept the beta preamble.
4. Send a message that retrieves a known media-backed SIO. Working examples:
   - **Dan Gilbert (TED)** — try: "I finally got the promotion I was chasing
     for years and I feel weirdly empty."
   - **Tim Urban (TED)** — try: "I know what to do and I just can't make myself
     start. I'm watching the deadline come at me."
   - **Mel Robbins (TED)** — try: "I keep second-guessing every decision until
     the moment passes."
5. The card should appear below the attribution line, showing the speaker's
   name + timestamp label (when set) + play glyph.
6. Click the card. The iframe should load and (for YouTube) jump to the
   verified timestamp.

## What is still prototype-only

- **Most SIOs are reconstructions** (`transcript_verified: false`). The
  card still renders, but the excerpt isn't yet verbatim.
- **No verified YouTube embeds yet.** All 11 current verified embeds are TED.
  YouTube path is plumbed end-to-end but requires running
  `verify-youtube-channels` (with `YOUTUBE_API_KEY`) and then promoting
  candidates from `needs_review` to `verified` after human confirmation.
- **Per-moment timestamps are not yet captured.** All current TED embeds play
  from the start of the talk. YouTube embeds will support `?start=<seconds>`
  the moment `timestamp_start_seconds` is filled in.
- **Clip-moment discovery is transcript-only.** YouTube caption extraction
  requires owner OAuth (Data API limitation) and is not implemented. For
  YouTube videos without an external transcript, the timestamp must be found
  manually.
- **TED has no thumbnail.** The TED placeholder is a styled gradient rather
  than a real talk thumbnail (TED doesn't expose a stable public thumbnail
  URL by slug). YouTube uses `i.ytimg.com/vi/<id>/hqdefault.jpg`.

## Where each piece of code lives

| File                                                     | Role                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/media.ts`                                       | Shared types, normalizer, allowlist, embed URL builders. Server + client.  |
| `src/presentation/presentInsight.ts`                     | Builds the rendered markdown including the source-link fallback line.      |
| `src/agent/index.ts`                                     | Derives `media` from `last_insight_id` and includes it in `AgentResponse`. |
| `src/app/api/chat/route.ts`                              | Forwards `media` in the `/api/chat` JSON response.                         |
| `src/components/MessageList.tsx`                         | Threads `media` into rendering; inserts the card after the attribution.    |
| `src/components/InsightMediaCard.tsx`                    | Click-to-play card; allowlist re-check at render; lazy iframe.             |
| `scripts/lib/youtube.ts`                                 | YouTube Data API helpers (search, video details, trusted channels).        |
| `scripts/validate-media-metadata.ts`                     | Honesty linter — fails the build on fabricated/inconsistent metadata.      |
| `scripts/find-video-sources.ts`                          | Discovery: candidate official videos per SIO.                              |
| `scripts/find-clip-moments.ts`                           | Discovery: candidate moments per SIO (transcript-grep).                    |
| `scripts/verify-youtube-channels.ts`                     | One-time: resolves @handle → channel_id via YouTube API.                   |
| `scripts/test-media-helpers.ts`                          | Unit tests for `src/lib/media.ts`.                                         |
| `scripts/test-youtube-api.ts`                            | Tests for `scripts/lib/youtube.ts`.                                        |
| `corpus/sources/trusted_youtube_channels.json`           | Verified-only registry. Real channel_ids blank until `verify-youtube-channels` runs. |
