# Phase Report — Next Verified SIOs + YouTube API Foundation

> Covers the phase that added verified SIOs via the Discovery Agent and built the YouTube
> Data API integration foundation. Date: 2026-05-25.

## What this phase did
1. Used the SIO Discovery Agent to create verified SIOs from fetchable official transcripts.
2. Built a safe, optional YouTube Data API layer for official-video verification (helper +
   trusted-channel registry + fixtures + tests + design doc + `.env.example` + integration into
   the discovery scripts), with graceful no-key fallback.

## Objective 1 — verified SIOs

Targeted the live top gaps; sourced from **tim.blog** (the proven WebFetch-readable official
transcript). Ran each candidate through evaluate → novelty → verify → review → promote.

**Promoted (verbatim-verified, served):**
- `sio-jocko-discipline-not-motivation-2016` — Jocko Willink, TFS #187 → **inaction-loop + direct/challenging + intense** (fills the chronic intensity gap). Resonance 80, novel.
- `sio-clear-habits-trajectory-2023` — James Clear, TFS #648 → **inaction-loop + mechanism + expert/scientific** (fills the IL-expert gap). Resonance 80, novel.

**Held (verified but NOT served) — a real quality finding:**
- `cand-mckeown-floor-disengagement` — Greg McKeown, TFS #355 (supermarket-floor disengagement
  image). Resonance 90, verbatim-verified — but calibration showed it is a **generic
  engagement-drought RETRIEVAL MAGNET**: its pure flat-feeling text semantically dominated ALL
  ED queries (it wrongly beat Huberman on a why-mechanism query and broke 8 ED/boundary cases).
  Held (`candidate_status: needs_review`) until diversity-aware reranking (e.g. MMR) exists.

**Integrity catches this phase:**
- Avoided a misattribution: the famous "you fall to the level of your systems" line is NOT
  James Clear's in #648 (Tim Ferriss says it in the intro) — deliberately not used.
- The McKeown magnet was caught by the system's own calibration, not shipped.

Corpus: **22 SIOs** (DC 7 / ED 6 / IL 9), **3 verbatim-verified** (Colonna, Jocko, Clear),
11 verified video embeds. Calibration **27/27**. Remaining top gap: **engagement-drought +
direct/challenging** (direct voices on flatness are rare on fetchable transcripts).

## Objective 2 — YouTube API foundation
- `scripts/lib/youtube.ts` — pure helpers (extract id, normalize, build watch/embed URLs,
  `isLikelyOfficialChannel`, `loadTrustedChannels`, `hasYouTubeApiKey`) + async `search.list`/
  `videos.list` wrappers with mock mode and graceful `{ok:false, reason:"no_api_key"}` fallback.
  Never logs the key.
- `corpus/sources/trusted_youtube_channels.json` — 9 families; **all real channel_ids blank /
  `needs_review`** (not guessed) + one clearly-labeled synthetic test entry.
- `scripts/fixtures/youtube-*.json` + `scripts/test-youtube-api.ts` — **41/41 pass with no key**.
- `ai/guides/youtube_api_integration_design.md`, `.env.example` (key + optional channel vars).
- Integrated (optionally, behind `hasYouTubeApiKey()`) into `find-source-candidates`,
  `find-video-sources`, `verify-candidate-source`, `validate-media-metadata` — all still run
  cleanly with NO key.
- **Fix applied:** a subagent had hardcoded 11 unverified `UC…` channel IDs into two scripts
  (fabrication); these were blanked. Channel IDs live only in the registry, all `needs_review`
  until a human/API verifies them. The test even asserts the real channels stay blank.

## Objective 4 — Score: initial 8 → revised 8.5 / 10
Strong: 2 genuinely verbatim, gap-filling SIOs; an honest hold (McKeown) caught by calibration;
a complete, safe, tested YouTube foundation with graceful no-key behavior; two integrity catches
(misattribution + fabricated channel IDs). Capped by: only 2 promoted (disciplined, but under
the 3–5 ask); ED+direct still unfilled; IL now heavy (9); YouTube path unexercised with a real
key; the magnet reveals a within-state diversity weakness.

## Objective 5 — Top weaknesses
1. **Within-state retrieval diversity (the magnet problem).** A vivid-but-generic SIO can
   dominate a state and collapse discrimination. *Fix:* MMR / diversity-aware reranking, or a
   centrality penalty, before serving such SIOs. (Deferred — retrieval-engine work.)
2. **Corpus imbalance + the ED+direct/challenging gap.** IL is now 9 vs ED 6 / DC 7; a direct
   voice on engagement-drought remains unfound on fetchable transcripts. *Fix:* target ED-direct
   and DC next; cap IL additions.
3. **YouTube API unexercised with a real key.** Helper + integration are mock-tested only;
   registry channel_ids are all blank. *Fix:* Hayden adds `YOUTUBE_API_KEY`, verifies the 9
   channel IDs (`channels.list?forHandle`), populates the registry.
4. **Verbatim still depends on lossy WebFetch + manual cross-check; timestamps still null.**
   *Fix:* a transcript/caption API; per-moment timestamp capture; TED still needs human paste.
5. **Delegated-coding integrity risk** (a subagent fabricated channel IDs — caught + fixed) and
   a minor UX bug: `review-candidates` groups by `recommendation`, so a HELD candidate (McKeown)
   still shows under "ready". *Fix:* group by `candidate_status`; always integrity-review agent output.

## Objective 6 — Research + fixes
Research: YouTube Data API quota (10k units/day; search.list = 100 units → cache) + official
channel verification by `channelId` (titles insufficient) — captured in the design doc; MMR for
diversity; transcript-API limits. Fixes applied this phase: blanked fabricated channel IDs;
held the McKeown magnet; reused the `not_applicable`-counts-as-source-verified gate so
audio/transcript sources can be draft-ready. Deferred (documented, not overbuilt): MMR reranking;
real-key YouTube verification; transcript/timestamp API. **Revised score holds at 8.5/10.**

## Readiness for the next 10
Yes — the factory reliably produces verified, gap-filling SIOs and now has an (optional, safe)
YouTube verification layer. Watch two things while scaling: the **magnet problem** (run
calibration after each promotion; hold SIOs that collapse a state) and **corpus balance**
(target ED-direct + DC next, not more IL).
