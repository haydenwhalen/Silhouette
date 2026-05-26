# YouTube Data API Integration Design

**Component:** SIO Discovery Agent — Video Source Enrichment  
**Module:** `scripts/lib/youtube.ts`  
**Status:** Foundation complete; channel_ids pending human/API verification

---

## What the API Can and Cannot Do

### Can Do
- Search for videos by keyword or within a specific channel (`search.list`, part=snippet)
- Fetch full video metadata by ID (`videos.list`, part=snippet,contentDetails,statistics)
- Return video title, description, channel name, publish date, view/like counts, and duration
- Confirm a video's `channelId` (a stable, opaque 24-character identifier that does not change even if the channel handle or display name changes)
- Provide embed-ready `videoId` values for building watch and embed URLs

### Cannot Do
- Return transcript text. The YouTube Data API v3 does **not** expose transcript or caption text through any endpoint. Captions can be listed via `captions.list` (returns metadata only), but downloading caption files requires OAuth 2.0 with the channel owner's authorization — not available for third-party corpus building. **Never set `transcript_verified: true` based solely on API data.**
- Guarantee a video is an official upload vs. a re-upload or mirror. Channel ID matching against the trusted registry is the only reliable signal.
- Detect clip timestamps or chapters within a video from search results alone.

---

## Security and Quota Concerns

### API Key Safety
- The API key is read **only** from `process.env.YOUTUBE_API_KEY`. It is never printed, logged, or interpolated into user-visible strings.
- All requests use HTTPS. The key is passed only as a URL query parameter (standard for YouTube Data API v3).
- The module never throws raw errors — all async functions return `YouTubeApiResult<T>` and catch all exceptions internally.

### Quota Budget (critical)
The YouTube Data API v3 has a **default quota of 10,000 units per day** (per Google Cloud project). Quota costs:

| Operation | Cost |
|---|---|
| `search.list` (any part) | **100 units/call** |
| `videos.list` (any part) | **1 unit/call** |
| `channels.list` (any part) | **1 unit/call** |

At 100 units per `search.list` call, a default quota allows only **100 search calls per day**. This is the primary constraint for Discovery Agent usage.

**Recommended caching strategy:**
1. Cache `search.list` results by `(query, channelId)` to a local JSON file or in-memory map within a session. Identical queries within a run should never re-hit the API.
2. Prefer `videos.list` over `search.list` when you already know the video ID (1 unit vs 100 units).
3. Batch `videos.list` calls: the `id` parameter accepts a comma-separated list of up to 50 video IDs per request, still costing only 1 unit.
4. The module exposes `hasYouTubeApiKey()` so callers can skip API calls gracefully when no key is configured — all discovery scripts should check this before building enrichment loops.

Official quota documentation: https://developers.google.com/youtube/v3/getting-started#quota

---

## Official-Channel Verification Architecture

### Why Channel ID Matters
YouTube channel handles (`@hubermanlab`) and display names ("Huberman Lab") are user-controlled and can change. The `channelId` (a 24-character string beginning with `UC`) is a stable, immutable identifier assigned at channel creation. **Matching on title alone is insufficient and will produce false positives.**

### The Trust Registry
`corpus/sources/trusted_youtube_channels.json` holds the trusted channel registry. Each entry has:
- `channel_id`: initially blank (`""`), must be set to the real `UCxxxx...` string only after human or API verification
- `trust_level`: `"needs_review"` until `channel_id` is confirmed; only then set to `"high"` or `"medium"`

### How to Verify a Channel ID
1. Visit the channel's YouTube page (e.g., `https://www.youtube.com/@hubermanlab`)
2. View page source or use a browser tool to find `"channelId"` or `"externalId"` in the page JSON-LD/metadata, OR
3. Call `channels.list?part=id&forHandle=hubermanlab` with your API key — the response `items[0].id` is the canonical channel ID (costs 1 unit)
4. Update `channel_id` in the registry and change `trust_level` to `"high"` once confirmed

### Matching Logic in `isLikelyOfficialChannel`
- Only entries with a **non-empty** `channel_id` are candidates for matching
- Matching is **exact string equality** on `channelId`
- A blank `channel_id` in the registry never matches anything — this prevents unverified channels from being flagged as official

---

## Embed and Timestamp Patterns

### Privacy-Enhanced Embeds
All embed URLs use `youtube-nocookie.com` instead of `youtube.com`. This prevents YouTube from setting third-party cookies until the user actively plays the video, reducing tracking of users who simply load a page containing an embedded video.

```
https://www.youtube-nocookie.com/embed/<videoId>
```

Relevant Google documentation: https://support.google.com/youtube/answer/171780

### Timestamp Parameters
- **Watch URL:** `&t=<seconds>s` (e.g., `&t=120s` for 2:00) — appended only when a start time is known
- **Embed URL:** `?start=<seconds>&end=<seconds>` — both are optional; `end` is only appended when `end > start`

These are set via `buildYouTubeWatchUrl(videoId, startSeconds?)` and `buildYouTubeEmbedUrl(videoId, startSeconds?, endSeconds?)` respectively. Start/end timestamps in SIO candidates come from human transcript review, not from the API.

### Captions / Transcript Limitation (critical)
The `contentDetails.caption` field in `videos.list` returns `"true"` or `"false"` to indicate whether captions exist — **not the caption text itself**. Retrieving actual caption text requires:
1. `captions.list` to get the caption track ID (returns metadata only, no text)
2. `captions.download` — which requires **OAuth 2.0 authorization from the channel owner**

Because the Discovery Agent is a third-party tool without channel owner OAuth, transcript text cannot be retrieved via the API. The `transcript_verified` field on SIOs and candidates must only be set `true` by a human who has manually verified a verbatim quote against the actual audio/video.

---

## Integration with the Discovery Agent

The YouTube helper integrates into four existing discovery scripts as an optional enrichment layer:

### `find-video-sources.ts`
Use `searchYouTubeVideos(query, { channelId })` to find candidate video URLs. All calls are gated by `hasYouTubeApiKey()`. When no key is available, the script falls back gracefully (searches Tavily/web only, skips YouTube enrichment).

### `find-source-candidates.ts`
After identifying a promising podcast/talk, use `searchOfficialChannel(channelId, episodeTitle)` to find the official YouTube upload, then populate `video_url`, `embed_url`, `official_channel_url` in the candidate YAML. Only update `media_verification_status` to `"verified"` if `isOfficialChannelMatch` is `true`.

### `verify-candidate-source.ts`
Use `getVideoDetails(videoId)` to confirm a video ID is valid, retrieve the canonical channel ID, and cross-check against the registry via `isLikelyOfficialChannel`. This is the only API call that costs 1 unit (not 100), so it's safe to run on every candidate.

### `run-sio-discovery-agent.ts`
The agent orchestrator should call `hasYouTubeApiKey()` at startup and report YouTube API status in its preamble. All video-enrichment steps should be skipped (not errored) when no key is present.

### Graceful Fallback Contract
```ts
if (!hasYouTubeApiKey()) {
  // log a single notice, then continue without YouTube enrichment
  return;
}
const result = await searchYouTubeVideos(query, { maxResults: 5 });
if (!result.ok) {
  // result.reason is "quota_exceeded" | "api_error" — log and continue
  return;
}
// use result.data
```

---

## Setup Instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select an existing one)
3. Navigate to **APIs & Services → Library**, search for "YouTube Data API v3", and click **Enable**
4. Navigate to **APIs & Services → Credentials**, click **Create Credentials → API key**
5. (Recommended) Restrict the key: under **API restrictions**, select "YouTube Data API v3"; under **Application restrictions**, consider IP or HTTP referrer restrictions for production use
6. Copy the API key into your local `.env` file:
   ```
   YOUTUBE_API_KEY=AIzaSy...your-key-here
   ```
7. Verify the setup by running (with mock mode, no key required):
   ```
   npx tsx scripts/test-youtube-api.ts
   ```
8. To verify channel IDs, run a one-off `channels.list` call or check the YouTube page source, then update `corpus/sources/trusted_youtube_channels.json` with confirmed `channel_id` values and set `trust_level` accordingly.

---

## Open Items

- [ ] Verify and populate `channel_id` for all 9 real channel entries in `trusted_youtube_channels.json`
- [ ] Implement result caching in discovery scripts to stay within 10,000 unit/day quota
- [ ] Decide whether to expose `captions.list` (metadata only) in a future iteration
- [ ] Consider requesting a quota increase via Google Cloud Console once usage patterns are known (default 10k units/day is low for active corpus building)
