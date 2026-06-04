# Full Corpus Media Integrity Sweep — 2026-06-04

Programmatic + manual sweep for media misalignments after the backfill pass.
Final state: **`validate-media` 0 warnings, 0 errors**; programmatic scan CLEAN
except the one flagged Perel issue (held for human approval).

## ✅ RESOLVED — Perel wrong embed FIXED 2026-06-04

`engagement_drought_perel_survival_revival` had `exact_quote_match` but its embedded
video `EyopAlh04iA` did **not** contain the quote (wrong cut). **FIXED** (approved):

- Swapped to `Hu-sCM0eXaw` (official Tim Ferriss channel `UCznv7Vf9nBdJYvBagFdAHWw`,
  full #241, 2:04:11) — the upload that actually contains the quote.
- `timestamp_start_seconds: 1451` / `timestamp_end_seconds: 1475` — the quote's cue
  start is `00:24:11.760`, independently confirmed by direct caption grep.
- Kept `exact_quote_match` + `transcript_verified: true` — honest: the body is
  verbatim in the tim.blog #241 transcript AND now present in the linked video
  (ASR renders "did not die"; same spoken line as the SIO's "didn't die").
- `media_verification_notes` rewritten to document the correction.
- `validate-media`: PASS, 0 warnings. Integrity issues corpus-wide: **0**.

## Misalignments fixed this pass

### Stale "left blank / pending verification" content (2 needs_review SIOs)
- `engagement_drought_huberman` — was `needs_review` with blank `video_id` and a
  "held blank pending API" comment. RESOLVED: `QmOF0crdyRU` playback-verified;
  stale comments replaced; **timestamp corrected 2700→3180** (wrong content at 45:00).
- `inaction_loop_goggins_huberman` — was `needs_review` with a candidate conflict.
  RESOLVED: `nDLb8_wgX50` is the official full episode; the rival `pTB51K96vFs` is
  an unofficial clip (rejected). Stale comments replaced; timestamp nudged 4800→4735.

### Stale timestamp notes (2)
- BJ Miller & Colonna notes said "until a timestamp is added"/"Watch the source"
  after a timestamp had actually been set — reworded to past tense so the note no
  longer contradicts the data. BJ Miller's top comment ("timestamp fields null")
  also corrected.

### clip_match_type unset on verified TED embeds (11)
Set `clip_match_type: talking_point` on all 11 (Dan Gilbert, Sinek, Smith,
Waldinger, Achor, Huffington, Pink, Elizabeth Gilbert, Robbins, Saujani, Urban).
TED bodies are reconstructions and TED can't deep-link, so talking_point is the
honest value. This cleared all 11 outstanding `validate-media` warnings.

## Checks run (all PASS after fixes)
- TED + timestamp set → none (TED can't deep-link). ✓
- exact_quote_match without transcript_verified → none (validator HARD rule). ✓
- verified embed with clip_match_type unset → none. ✓
- embed host not in allowlist (`youtube-nocookie.com`/`embed.ted.com`/`player.vimeo.com`) → none. ✓
- talking_point with transcript_verified: true → none. ✓
- verified YouTube embed with no video_id → none. ✓
- timestamp set but not video-primary → none. ✓

## Items left for human review (not auto-changed)
1. **Perel** — apply the verified fix above (approval pending).
2. **Metadata reconciliation** (embeds are correct; the SIO's title/date/source_url
   point at a different artifact than the confirmed video):
   - Fogg — SIO points at the 2019 *Tiny Habits* book; confirmed video is the 2012 TEDxFremont talk.
   - Neff — SIO date 2020; actual talk date 2013-02-07.
   - Huberman (limbic) — SIO date ~2020; actual publication 2022-01-03.
   - Huberman (dopamine) — SIO date 2021-04-26 vs YouTube publish 2021-09-27.
   - Jocko — SIO date 2016-09-21 vs YouTube upload 2016-10-25 (same episode #187).
3. **Robbins** — if her channel (`UCk2U-Oqn7RXf-ydPqfSxG5g`) is added to
   `trusted_youtube_channels.json`, Ep. 282 could be attached as a talking_point;
   otherwise keep text-only.
4. **Reconstruction bodies** (Rich Roll, Renfrew, Fogg, Neff, Huberman ×2, Goggins,
   Pressfield, Sivers) — `prototype_only`. Replacing the paraphrased body with the
   now-located verbatim passage would let several be upgraded talking_point →
   close_paraphrase / exact_quote_match.
