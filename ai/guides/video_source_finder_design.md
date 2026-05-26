# Video Source Finder — Design & Media Verification System

**Status:** Component (Part 3) complete.
**Purpose:** A repeatable, honesty-first system for finding, verifying, and recording
the *media* (video / audio / source) layer of every SIO so the presentation layer can
eventually SHOW the person speaking — via official embeds only — whenever a verified one
exists, and degrade gracefully when one does not.

This document is the source of truth for:

1. The SIO media field schema.
2. The source-object media field schema.
3. The `media_verification_status` vocabulary.
4. Embed-URL formats (TED, YouTube).
5. The confidence model.
6. The human-in-the-loop workflow.

---

## 0. First principles (non-negotiable)

These come straight from the project's honesty/safety boundaries and shape every rule below.

- **Never fabricate** a video ID, timestamp, transcript line, or URL. A blank field is
  always better than a guessed one.
- **Embed/link only from the original public source.** Never download, clip, re-host, or
  re-upload. TED → `embed.ted.com`. YouTube → official channel via `youtube-nocookie`.
- **Unofficial re-uploads are never treated as official.** They are marked `unofficial`
  and excluded from `video-primary` presentation.
- **Verification is a claim, not a default.** `media_verification_status: verified` means a
  human (or the finder, with a documented machine signal) actually confirmed the artifact.
  Everything else stays `needs_review` / `unverified` with the gap documented in notes.

---

## 1. SIO media field schema

These fields live in each `corpus/sios/*.md` YAML frontmatter, under the
`── MEDIA (PRESENTATION LAYER ONLY) ──` section. **They are NOT used for retrieval** —
retrieval is text-only (`key_claim + content_summary + transcript_excerpt + state tags`).
They tell the UI how to present an insight *after* it has already been retrieved.

| Field | Type | Meaning |
|---|---|---|
| `source_media_type` | enum | Original format: `youtube-video` \| `podcast-video` \| `podcast-audio` \| `ted-talk` \| `article` \| `book` \| `other` |
| `video_provider` | enum | `ted` \| `youtube` \| `vimeo` \| `spotify` \| `none`. `none` = audio-only or text source. |
| `video_id` | string | Provider-specific playback ID. **YouTube only** (11-char). Leave **blank** until playback-verified on the official channel. TED uses a slug in `embed_url`, not an id, so `video_id` stays blank for TED. |
| `video_url` | string | Canonical public watch URL (e.g. `https://www.youtube.com/watch?v=<id>` or the `ted.com/talks/<slug>` page). Optional; informational. |
| `embed_url` | string | Full iframe-ready embed URL. TED: `https://embed.ted.com/talks/<slug>`. YouTube: `https://www.youtube-nocookie.com/embed/<id>?start=<s>&end=<e>`. Leave blank until the underlying artifact is verified. |
| `official_channel` | string | Human name of the official channel/show (e.g. `Huberman Lab`, `The Tim Ferriss Show`, `TED`). |
| `official_channel_url` | string | URL of the official channel (e.g. `https://www.youtube.com/@hubermanlab`). |
| `timestamp_range` | string | `HH:MM:SS–HH:MM:SS`. Append ` (approx)` if not transcript-verified. |
| `timestamp_start_seconds` | int \| null | Seconds from start where the insight begins. `null` when not verified. **Never guessed** to a false precision; an approximate value derived from an approximate `timestamp_range` must be flagged in notes. |
| `timestamp_end_seconds` | int \| null | Seconds where it ends. `null` when not verified. |
| `display_mode` | enum | `video-primary` \| `audio-primary` \| `text-only`. How the UI should render. |
| `media_available` | bool \| null | `true` = publicly accessible & embeddable now. `false` = private/removed/geo-blocked. `null` = not yet checked. |
| `media_verification_status` | enum | See §3. The single source of truth for "how much do we trust this media block." |
| `media_verification_notes` | string | What was verified, by what method, on what date; and exactly what remains unverified. Honest gaps go here. |
| `media_rights_notes` | string | Embedding/usage constraints beyond the general source rights. |

**Fields the finder must never touch on an SIO** (owned by content/retrieval, not media):
`key_claim`, `content_summary`, the body/excerpt, `primary_state_tag`,
`secondary_state_tags`, `insight_type`, `voice_register`, `credibility_tier`,
`intensity_level`, `attribution_text`, `tagger_confidence`, `human_review_status`,
`transcript_verified`.

---

## 2. Source-object media field schema

These live in each `corpus/sources/*.json`. A source object is the *episode/talk/book*
that one or more SIOs are cut from. Media fields here describe the artifact once; SIOs
inherit/echo what they need for presentation.

| Field | Type | Meaning |
|---|---|---|
| `video_provider` | enum | Same vocabulary as the SIO field. |
| `video_id` | string | Official-channel playback ID (YouTube). Blank until verified. |
| `video_url` | string | Canonical watch URL. |
| `embed_url` | string | Same format rules as the SIO field. |
| `official_channel` | string | Official channel/show name. |
| `official_channel_url` | string | Official channel URL. |
| `media_available` | bool \| null | As above. |
| `media_verification_status` | enum | As §3. Status for the *artifact* (the SIO can be no more verified than its source). |
| `verification_notes` | string | Method + date + remaining gaps. |
| `rights_or_usage_notes` | string | Existing field; embedding constraints. |

Existing non-media fields on source objects (`source_id`, `source_type`,
`show_or_platform`, `episode_or_content_title`, `episode_or_content_date`, `source_url`,
`transcript_source`, `transcript_verified`, `source_score`, `source_confidence`, `sios`)
are left intact.

---

## 3. `media_verification_status` vocabulary

A single controlled enum, ordered from most to least trustworthy:

| Status | Meaning | Presentation effect |
|---|---|---|
| `verified` | A human or the finder confirmed the exact official artifact (e.g. the canonical `ted.com`/`embed.ted.com` page loads for this exact talk; or an official channel page links the exact video). | May be presented `video-primary` with the embed. |
| `needs_review` | A plausible official candidate was found but the *specific playback artifact* (e.g. official-channel YouTube `video_id`) could not be machine-confirmed. URLs are recorded as candidates. | Falls back to `audio-primary`/source-link; never embeds an unverified video_id. |
| `unverified` | No verification attempted yet, or the artifact's existence/accessibility is unknown. | Source-link or text-only fallback. |
| `unofficial` | The only available media is a re-upload not from the official channel. | **Never** embedded as official; link only with an explicit unofficial flag, or omit. |
| `not_applicable` | The source has no embeddable video by nature (book, paywalled article, audio-only podcast with no official video). | `text-only` / `audio-primary`; source-link only. |

Rule of thumb: **only `verified` may drive a `video-primary` embed.** Everything below it
must degrade. The validator enforces this (§ validate-media: a `video-primary` SIO with an
`embed_url` whose status is below `verified` is a hard violation).

---

## 4. Embed-URL formats

### TED
```
embed_url:  https://embed.ted.com/talks/<slug>
watch page: https://www.ted.com/talks/<slug>
```
- `<slug>` is TED's canonical talk slug (e.g. `dan_pink_the_puzzle_of_motivation`,
  `mel_robbins_how_to_stop_screwing_yourself_over`).
- TED has **no per-video `video_id`** in our schema; the slug *is* the identifier. `video_id`
  stays blank for TED sources.
- TED embeds play from the talk start. Per-moment `?t=` timestamping is unreliable across
  TED's player versions, so we leave `timestamp_*` null for TED unless transcript-verified.

### YouTube (privacy-enhanced)
```
embed_url:  https://www.youtube-nocookie.com/embed/<id>?start=<s>&end=<e>
watch page: https://www.youtube.com/watch?v=<id>
```
- `<id>` is the 11-character YouTube video id (`[A-Za-z0-9_-]{11}`).
- Use `youtube-nocookie.com` (no cookies set until the user hits play).
- `?start=` / `?end=` are the soft timestamp cues (seconds). `end` is approximate — the UI
  must not rely on it for a hard stop.
- **Only build a YouTube `embed_url` once the `video_id` is playback-verified on the official
  channel.** Search-result titles are not sufficient verification (see §6 limitation).

---

## 5. Confidence model

The finder assigns each media candidate a confidence level. Confidence is about **how sure
we are this is the official artifact**, independent of how nice the candidate looks.

| Confidence | Criteria |
|---|---|
| **high** | Canonical official URL confirmed to load for this exact item (TED canonical page/embed; or the official show's own website links the exact video). For TED, a confirmed canonical slug = high. |
| **medium** | Official channel/show identified and a plausible matching episode found, but the *exact playback artifact* (YouTube `video_id`) is not machine-confirmed, OR multiple candidate IDs conflict. |
| **low** | Only third-party/aggregator references found; official channel not confirmed; or the artifact may not exist as official video at all. |

Mapping confidence → status:
- TED canonical slug confirmed → `verified` (embed via `embed.ted.com`).
- YouTube official channel found, exact official `video_id` **not** machine-confirmed →
  `needs_review` (record candidate id(s) in notes, leave `video_id` blank).
- Source is inherently non-video (book/article/audio-only) → `not_applicable`.
- Re-upload only → `unofficial`.

---

## 6. Human-in-the-loop workflow

The finder is a **research assistant, not an autopublisher.** The loop:

1. **Inventory (machine).** `scripts/find-video-sources.ts` reads every SIO + source object,
   reports current media status, lists missing media fields, and — for anything not already
   `verified` video — emits **structured search targets**: speaker, episode/title,
   show/platform, `source_url`, likely official channels, and exact suggested search-query
   strings. Output goes to stdout (JSON) and to
   `ai/guides/video_source_candidates_report.md` (markdown).

2. **Verify (human + web tools).** A human (or this agent, with web search/fetch) runs the
   suggested queries, confirms canonical official URLs, and — crucially — distinguishes
   official-channel uploads from re-uploads. The report explicitly marks what was
   *machine-found* vs. what still *needs human review*.

3. **Record (human).** Verified results are written into the corpus media fields with
   `media_verification_status` set per §3 and `media_verification_notes` documenting the
   method + date + remaining gaps. **No `video_id` is written unless playback-verified.**

4. **Validate (machine).** `scripts/validate-media-metadata.ts` (`npm run validate-media`)
   checks format correctness, internal consistency, and — most importantly — that no SIO
   *claims* a verified official video while its status is below `verified`. Hard violations
   exit non-zero; honest `needs_review` gaps are warnings, not failures.

5. **Present (runtime).** `src/presentation/presentInsight.ts` reads the media block and
   renders a media-aware, never-broken source link (watch / listen / read / from-timestamp),
   degrading gracefully when no usable URL exists.

### Why YouTube official-ID verification stays manual

YouTube watch pages do not cleanly expose the owning channel to an unauthenticated fetch,
and search-result titles routinely mislabel re-uploads, clips, and "summary" videos as the
original. Even when the *official show's own website* links a `youtu.be/<id>`, that's a
strong signal we record as a **high-confidence candidate**, but we still hold it at
`needs_review` rather than auto-writing a `video_id`, because confirming the embed actually
plays the right segment from the official channel requires a human or the YouTube Data API
(out of scope here). This is a deliberate, honest gap — the system is designed to surface
the candidate, not to fake the confirmation.

---

## 7. Applied snapshot (2026-05 verification pass)

| Group | SIOs | Status | Notes |
|---|---|---|---|
| TED embeds (already present) | dgilbert, egilbert, urban, saujani, sinek, waldinger, smith, pink, huffington, achor | `verified` (TED embed) | `embed.ted.com/talks/<slug>` confirmed. YouTube `video_id` deferred (`needs_review` sub-note). |
| TED upgrade | robbins | `verified` (TED embed) | Canonical slug `mel_robbins_how_to_stop_screwing_yourself_over` confirmed via web (TEDxSF, June 2011). Upgraded this pass. |
| YouTube podcast-video | huberman, goggins | `needs_review` | Official channel + episode page confirmed; official site links a candidate `youtu.be/<id>`. `video_id` held blank pending playback confirmation. |
| Audio podcast (no official video) | mcconaughey | `needs_review` | Episode #474 recorded by phone → **no official video exists**. Stays `audio-primary`. `source_url` corrected to working canonical URL; title/date discrepancy documented. |
| Audio podcast | pressfield | `not_applicable` | Audio-only Tim Ferriss episode; link to episode page. |
| Books / article | manson, newport, brown, grant | `not_applicable` | Text source; link to author/publisher page. |
