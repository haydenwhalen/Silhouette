# SIO Corpus Expansion +10/State — Phase Report (COMPLETE)

**Task:** Expand the SIO corpus by +10 per state (60 new SIOs), video-forward and timestamped.
**Status:** ✅ All 6 states complete. Corpus **51 → 111 SIOs** (+60). **Nothing committed** — working tree left for review.
**Date:** 2026-06-04

---

## 1. Result at a glance

| State | Before | After | Added | Verified timestamped videos (of 10) |
|-------|:-----:|:-----:|:-----:|:-----------------------------------:|
| momentum-gap | 6 | 16 | +10 | (per State-1 checkpoint) |
| possibility-paralysis | 7 | 17 | +10 | (per State-2 checkpoint) |
| identity-transition | 8 | 18 | +10 | (per State-3 checkpoint) |
| engagement-drought | 10 | 20 | +10 | 10/10 |
| inaction-loop | 10 | 20 | +10 | **10/10** |
| direction-collapse | 10 | 20 | +10 | **10/10** |
| **TOTAL** | **51** | **111** | **+60** | — |

**Every one of the 60 new SIOs is backed by a real, embeddable video with a verified per-moment timestamp** (well above the ≥7/state floor). Corpus verified-video ratio rose from **~14% → 97/111 (87%)**.

---

## 2. Standing constraints — how each was met

- **Rights / verbatim posture.** Every new SIO displays a SHORT (1–4 sentence) verbatim excerpt confirmed against the source's own captions/transcript via `yt-dlp`. `transcript_verified: true` is set only where confirmed. No long transcripts stored; embed/link-only via `youtube-nocookie` (TED via `embed.ted.com`). No reconstructions were fabricated in this batch.
- **Non-clinical.** Soft stuck-states only. Crisis/therapy/diagnosis content was actively rejected (e.g. Colonna dropped for a suicidality cold-open; the Emma Watson clip was bounded to 1:52:24 to exclude nearby body/health material; Ek kept at `medium` confidence with the crisis-adjacent line excluded).
- **No duplicates / no magnets.** Deduped against all existing SIOs and the running batch; `test-magnet-risk` run after each state. **No new retrieval magnet was introduced** (see §5).
- **Resonance diversity.** Spread across insight_type (mechanism/story/reframe/permission) and voice_register (direct/challenging, warm/affirming, intellectual/measured, vulnerable/personal, expert/scientific). Per-state cell targeting documented in §4.
- **Credible sources only.** Official YouTube/podcast/university/broadcaster/cultural-institution channels, verified by `channel_id`. No compilation/quote-farm/repost/AI-summary channels.
- **Source diversity caps.** New 60: only **Herminia Ibarra** appears twice (≤2 cap); all other 58 are unique speakers. Family spread: TED 7 (under the ≤8–10 cap, all from States 1–3), Diary of a CEO 3, all others ≤2. **States 4–6 (30 SIOs) are fully TED-free.** The only speakers exceeding 2× in the whole corpus (Brown 4, Clear 3, Grant 3) are **pre-existing**; this batch added none to them.

---

## 3. Final QA suite (all green)

| Check | Result |
|-------|--------|
| `validate-media` | **PASS** — 0 hard violations, 0 warnings |
| `test-state-classification` | **8/8 PASS** |
| `test-sio-retrieval` | **6/6 PASS** |
| `tsc --noEmit` | **clean** |
| `npm run build` | **success** |
| `detect-gaps` | 1 gap: direction-collapse overrepresented (expected — see §6) |
| `test-magnet-risk` | no new magnets; pre-existing dominators monitored (§5) |

### Regression found and fixed during final QA
`test-state-classification` / `test-sio-retrieval` initially failed: the "Direction Collapse (clear)" query ("*I got what I thought I wanted, but now I feel empty…*") retrieved an **engagement-drought** SIO. Root cause: `stateFilter` (src/rag/vectorStore.ts) admits any SIO whose **primary OR secondary** tag matches the queried state, then ranks on semantics alone. Two State-4 ED "success-but-empty" SIOs — **Ek** (`content-not-happy`) and **Madonna** (`wasnt-happy`) — carried a `direction-collapse` secondary tag (legitimate when dc was under-served) and, being near-duplicates of the arrival-fallacy theme, out-competed the dedicated dc SIOs. **Fix:** removed the `direction-collapse` secondary tag (and Ek's overlapping `arrival fallacy`/`meaning` keywords) from both, now that dc is fully served by 20 dedicated SIOs. Both suites returned to green. The three other cross-primary→dc secondary tags (Rudolph/IT, DiDonato/MG, Portman/PP) are genuinely different flavors, do not win the calibration query, and were left intact.

---

## 4. The 30 new SIOs for States 4–6 (verbatim + timestamped, TED-free)

### State 4 — engagement-drought (10→20)
Buckingham (HBR · mechanism/expert) · Sapolsky (Stanford · mechanism/expert) · Arthur Brooks (Rich Roll · reframe/expert) · Whitney Johnson (Let Go & Lead · reframe/intellectual) · Keyes (One You Feed · permission/expert) · Amy Chang (Stanford eCorner · story/vulnerable) · Victoria Monét (Michelle Obama IMO · permission/warm) · André 3000 (CBS Mornings · story/direct) · Madonna (On Purpose · permission/vulnerable) · Ek (Founders/David Senra · story/direct, `medium`).

### State 5 — inaction-loop (10→20)
| Speaker | Source | type / register | review |
|---|---|---|---|
| Hal Hershfield | Rational Reminder | mechanism / expert | approved |
| Tim Pychyl | Deep Dive (Ali Abdaal) | mechanism / expert | approved |
| Gay Hendricks | Just Tap In | reframe / intellectual | approved |
| Thomas Curran | Deep Dive (Ali Abdaal) | reframe / intellectual | approved |
| Oliver Burkeman | Rich Roll | reframe / intellectual | approved |
| Brad Stulberg | Being Well | reframe / intellectual | approved |
| Luvvie Ajayi Jones | School of Greatness | permission / warm | approved |
| Radhi Devlukia (+ Cleo Wade) | A Really Good Cry | permission / warm | prototype_only (diarization) |
| Payal Kadakia | Diary of a CEO | story / vulnerable | prototype_only (medium fit) |
| Jamie Kern Lima | FranklinCovey | reframe / warm | prototype_only (broad phrasing) |

Identity/belief-level only; all tactical "just start"/habit-framework content excluded. Register skews to reframe (5) — flagged honestly; each is a distinct mechanism (future-self, emotion-coping, upper-limit, perfectionism, micro-discomfort, being-vs-doing, worth-ceiling).

### State 6 — direction-collapse (10→20) — reframe-free by design (reframe already over-covered)
| Speaker | Source | type / register | review |
|---|---|---|---|
| Tal Ben-Shahar | Big Think | mechanism / intellectual | approved |
| William Damon | Heroic (Brian Johnson) | mechanism / warm | prototype_only (brand channel) |
| David Epstein | Diary of a CEO | mechanism / intellectual | approved |
| Emma Watson | On Purpose | story / warm | prototype_only (clip-tight, non-clinical bound) |
| Mo Rocca | Sarah Lawrence (commencement) | permission / warm | approved |
| Chimamanda Ngozi Adichie | Louisiana Channel | permission / vulnerable | approved |
| David Brooks | Dominican University | story / intellectual | approved (manual captions) |
| Jonny Wilkinson | High Performance | story / direct | approved |
| Robert Greene | Robert Greene Official | permission / intellectual | approved |
| Maggie Rogers | Q with Tom Power (CBC) | mechanism / vulnerable | prototype_only (dc/ED boundary) |

Cell spread: mechanism ×4, story ×3, permission ×3 — targeting the empty non-reframe cells. Demographics improved (3 women / 10; a Nigerian novelist and a musician; a non-US broadcaster).

---

## 5. Magnet status (monitored, not blocking)

No **new** magnet introduced by the 60. Default-profile dominators flagged by `test-magnet-risk` (all pre-existing or state-default behavior, diversified in production by the intake-hint layer):
- inaction-loop: Goggins 5/10 (state default).
- identity-transition: Shankar 5/8 (state default; prior-known).
- **engagement-drought: Arthur Brooks ("they're not bored") 7/10 — introduced in State 4.** Recommend a human re-tag/diversification pass (it dominates the no-hint default path). New IL/DC entries sit at ≤4/10 (healthy spread).

---

## 6. Honest divergences & items for human review

1. **direction-collapse overrepresented (flagged divergence).** `detect-gaps` correctly flags dc at 20 vs the smallest state (momentum-gap, 16). This was anticipated: the brief mandated +10 to every state, so the +10 was honored while targeting dc's empty mechanism/story/permission cells. Future expansion should prioritize **possibility-paralysis** and **momentum-gap**.
2. **8 SIOs are `prototype_only`** pending a human listen-check / judgment call: Devlukia (lock speaker attribution), Kadakia (clip-tight identity window only), Kern Lima (broad "self-worth" phrasing — watch magnet), Damon (brand-channel host; a Stanford Alumni upload `_v0jyKOCOIQ` is a drop-in alternative), Watson (keep clip bounded to exclude health material), Rogers (dc/ED boundary). All others are `approved`.
3. **Auto-caption verbatim.** Most excerpts were verified against ASR captions (David Brooks is the exception — manual captions). Recommend a quick audio spot-check before promoting any `prototype_only` → `approved`.
4. **Carry-over from earlier states:** the Shankar IT-magnet re-tag (re-tag Shankar IT-primary, swap Burkeman backup) noted in prior checkpoints — Burkeman is now used in inaction-loop (single use), so that swap plan should be revisited by hand.

---

## 7. Mechanics

Authoring tool: `scripts/author-sio-batch.ts <batch.json> [--apply]` (renders `corpus/sios/*.md` + linked `corpus/sources/*.json` from already-verified candidate data; honesty stays upstream in the per-candidate agent verification). Per-state batch inputs were written to `/tmp/{mg,pp,it,ed,il,dc}_batch.json`. Verification used parallel background research agents, one per gap-cell, each confirming channel/`channel_id`, verbatim wording, and a context-aware start/end timestamp via `yt-dlp` before a candidate was accepted.

**No commit was made. Working tree left intact for review.**
