# Video Moment Timestamp Workflow

> How to add an honest per-moment timestamp to a Silhouette SIO, what the UI
> shows for each level of confidence, and what evidence each level requires.

## The product promise this serves

When the user reads an SIO and clicks the embedded video, they should land
**at the moment the insight came from**. Not the top of a 90-minute episode.
Not a random clip. The specific moment where the speaker says, demonstrates,
or argues the thing the SIO captures.

That promise depends on three pieces of metadata working together:

1. `timestamp_start_seconds` — integer, when the moment starts.
2. `clip_match_type` — how closely the SIO matches that moment.
3. `media_verification_notes` — what evidence backs the claim.

If any of these is wrong, the user notices: they click "Watch the moment" and
hear something that has nothing to do with the SIO. Trust dissolves quickly.

## Confidence ladder (strictest → loosest)

| `clip_match_type` | What it means | What evidence is required | UI label |
|---|---|---|---|
| `exact_quote_match` | The SIO's excerpt is **verbatim** from the source at this timestamp. | `transcript_verified: true` + `media_verification_notes` describing how the transcript was verified + a citation. **Enforced by `validate-media`.** | "Watch the moment" |
| `close_paraphrase` | The moment captures the speaker's documented argument; the excerpt is a faithful paraphrase, not a direct quote. | `media_verification_notes` describing what the human heard at the timestamp. | "Watch the moment" |
| `talking_point` | The SIO captures the broader idea; the timestamp is a sensible starting point but not a pinpoint. | A note explaining why this timestamp is a fair place to begin. | "Watch near this moment" |
| _(unset)_ + no timestamp | No moment claimed; the video plays from the start. | Just the verified embed itself. | "Watch the source" |

**Rule of thumb**: when in doubt, go one step looser. An over-claimed
`exact_quote_match` that turns out to be a paraphrase is worse than a calmly
labeled `close_paraphrase`. The system is designed so the looser claim still
lands; over-claiming damages trust irreparably.

## The five-step manual workflow

You can use this for any SIO with a verified video embed.

### 1. Find a candidate timestamp

Try the automated tool first:

```bash
npm run find-video-moments -- --insight-id sio-xxx
```

This will, for YouTube SIOs:

- Fetch the official video description via the YouTube Data API.
- Look for channel-supplied chapter markers (lines like `0:00 Intro`, `1:23 — Topic`).
- Match each chapter against the SIO's `key_claim` and excerpt using string-level
  cue extraction.
- Emit candidates ranked HIGH / MEDIUM / LOW with the evidence.
- Write the report to `ai/guides/video_moment_candidates_report.md`.

The tool **never** writes timestamps into SIOs. It only proposes.

If the tool emits `manual_review_required`, the description has no chapters
(this is the common case for podcasts like School of Greatness). Continue to
step 2 manually.

### 2. Listen for the moment

Open the SIO's `video_url` in a browser. Use the **listen-for cues** from the
tool's report (or read the SIO's `key_claim` yourself) and scrub the player
until you hear the speaker say something close to it.

YouTube tip: hover the timeline to preview the audio waveform — long silences
are usually intros/outros, dense waveforms are usually high-content moments.

When you hear the moment, **note the start time in seconds**. YouTube's
timeline shows `H:MM:SS` — convert to seconds:

- `14:05` → `14 * 60 + 5 = 845`
- `1:23:45` → `1 * 3600 + 23 * 60 + 45 = 5025`

### 3. Choose `clip_match_type`

After listening, ask yourself:

- **Did the speaker say a sentence that matches the SIO's excerpt verbatim?**
  → `exact_quote_match`. You also need an official transcript or captions
  open while you confirmed it. Set `transcript_verified: true` and cite the
  source in `media_verification_notes`.
- **Did the speaker make essentially this argument at this moment, but in
  different words?** → `close_paraphrase`. Note what you heard in
  `media_verification_notes`.
- **Did the speaker get to this idea over a longer arc, and you're picking a
  sensible starting point?** → `talking_point`. Note "starting point for the
  broader argument about X" in `media_verification_notes`.

### 4. Edit the SIO frontmatter

Open `corpus/sios/<your-sio>.md` and update:

```yaml
timestamp_start_seconds: 845
timestamp_end_seconds: null  # or an integer end if you want to bound a window
clip_match_type: close_paraphrase
media_verification_notes: |
  Confirmed by listening 2026-06-XX. At 14:05, Speaker argues
  <one-line summary>. Faithful paraphrase, not verbatim.
human_review_status: prototype_only  # leave prototype_only until QA confirms
```

**Do NOT set** `timestamp_label` manually. The label is derived from
`timestamp_start_seconds` at render time via `formatTimestamp()` so labels
and seconds can never drift apart. (Validator warns if both are set and
disagree.)

### 5. Validate + smoke test

```bash
npm run validate-media
```

Should report 0 hard violations. If it complains:

- `timestamp_start_seconds must be a number` → quote the number, not a string.
- `timestamp_end_seconds must be greater than start` → check ordering.
- `exact_quote_match requires transcript_verified: true` → either set the
  flag with notes, or step down to `close_paraphrase`.

Then smoke test in the UI:

```bash
npm run dev
```

Send the query that retrieves this SIO. The card should now say "Watch the
moment" (for exact/close) or "Watch near this moment" (for talking_point),
and a small "from M:SS" pill should appear in the placeholder bottom-left.
Click play — the iframe should jump to your timestamp.

## What the UI shows the user

The full label-and-chrome decision tree in
`src/components/InsightMediaCard.tsx`:

| Condition | Label above card | Pill in placeholder | Embed start |
|---|---|---|---|
| Verified embed + `exact_quote_match` or `close_paraphrase` + timestamp | "Watch the moment" | "from M:SS" | `?start=<seconds>` |
| Verified embed + `talking_point` + timestamp | "Watch near this moment" | "from M:SS" | `?start=<seconds>` |
| Verified embed + no timestamp | "Watch the source" | _(none)_ | from start |
| No verified embed | _(link fallback)_ | _(no card)_ | _(no iframe)_ |

The user never sees `prototype_only`, `needs_review`, `talking_point`, or any
other internal vocabulary. The label and pill are the only honesty signals.

## Per-provider notes

### YouTube
- Embed: `youtube-nocookie.com/embed/<id>?start=<seconds>` (and optional `&end=<seconds>`).
- Honored: yes. Embed jumps to the timestamp.
- Watch link: also gets `&t=<seconds>s` so users can deep-link the moment.

### TED
- Embed: `embed.ted.com/talks/<slug>` — does NOT honor `?start=`.
- **Do not set `timestamp_start_seconds`** on a TED source. The validator warns.
- The "moment" for TED talks is effectively "the whole talk." Use the source
  link to call attention to a specific topic in the why-this-applies sentence
  instead.

### Vimeo
- Embed: `player.vimeo.com/video/<id>#t=<seconds>s` would work in theory but
  not all hosts configure it. Not currently supported by the helper. If you
  add a Vimeo SIO with a timestamp, expect to verify in-browser.

### Other providers
- Not on the allowlist. Don't add them without explicit review of tracking
  and content-security implications.

## What never to do

- **Never fabricate a timestamp.** "Probably around 15:00" is not a timestamp.
  Listen first, then set.
- **Never set `transcript_verified: true` without a verified transcript.** The
  validator will fail you, but more importantly: a single misattribution
  damages user trust across the entire corpus.
- **Never set `clip_match_type: exact_quote_match` for a paraphrase.** Step
  down to `close_paraphrase`.
- **Never edit `timestamp_label`.** It is derived. If you want a different
  label, change the seconds.
- **Never weaken `isAllowedEmbedHost`** to accommodate a new provider. Add
  the host to the allowlist properly, with a code-review pass.
- **Never download or re-host** the source video. Embed the official player
  at the verified moment. Nothing else.

## When the tool says `manual_review_required` and you can't find the moment

This is a real outcome — sometimes the human just can't pinpoint the moment
in a 90-minute episode. **That's fine.** The honest answer is:

```yaml
timestamp_start_seconds: null
clip_match_type: talking_point
media_verification_notes: |
  Moment not pinpointed. SIO captures the broader argument the
  speaker makes across the episode.
```

The UI will say "Watch the source." The video plays from the start. The user
gets the official source — credible, embeddable, attribution intact — and the
SIO still lands on its excerpt + attribution + why-this-applies.

A calm "Watch the source" beats a confident "Watch the moment" that's wrong.
