# Full Corpus Timestamp Report — 2026-06-04

Corpus timestamped SIOs: **4 → 14**. Method: `extract-video-timestamps` for
exact_quote_match (auto-pinned from ASR captions, HIGH gate ≥10 contiguous words);
agent-verified context-start moments for talking_point.

## Timestamps added/changed this pass (12)

### Auto-pinned from captions (exact_quote_match, HIGH)
| SIO | Start | End | Words matched |
|---|---|---|---|
| Millman | 847 (14:07) | 855 | 13 |
| Clear (trajectory) | 434 (7:14) | 443 | 19 |
| Jocko | 3341 (55:41) | 3353 | 24 |

### Agent-verified context starts (talking_point)
| SIO | Start | End | Basis |
|---|---|---|---|
| Rich Roll | 2972 (49:32) | 3025 | "compelled to repair… blinders on" confirmed in captions |
| Pressfield | 4109 (1:08:29) | 4170 | "Resistance… aimed at your weak spot" |
| Sivers | 3456 (57:36) | 3542 | "hell yeah… then just say no" |
| Fogg | 390 (6:30) | 425 | "you already know how… what you lack is automaticity" (06:42) |
| Neff | 906 (15:06) | 935 | "it's there for you precisely when you fail" |
| Huberman (limbic) | 837 (13:57) | 905 | limbic-friction definition |
| Renfrew | 2178 (36:18) | 2245 | "who am I without Beautycounter?" |

### Corrected timestamps
| SIO | Was | Now | Reason |
|---|---|---|---|
| Huberman (dopamine) | 2700 (45:00) | 3180 (53:00) | 45:00 landed on the substances-vs-baseline list, not the SIO's baseline-depletion mechanism (~53:00) |
| Goggins | 4800 (1:20:00) | 4735 (1:18:55) | nudged to open on the thematic peak ("why aren't you doing it") |

## Already timestamped before this pass (2, unchanged)
- Colonna `1274–1337` (exact_quote_match, ASR-verified 2026-06-03)
- BJ Miller `1303–1310` (exact_quote_match, ASR-verified 2026-06-04)

## No timestamp — verbatim match not found (6, `needs_timestamp_only`)
These are verified YouTube embeds whose bodies are **paraphrases** (talking_point),
so the extractor found no verbatim caption match. Honest default: no timestamp
("Watch the source"). Pin by human listening if desired.
- McConaughey (greenlights, SoG) · Brené Brown (numbness) · Ed Mylett (SoG)
- Apolo Ohno · James Clear (never-miss-twice, SoG) · Adam Grant (procrastinate, SoG)

## No timestamp possible — TED (16)
TED's `embed.ted.com` player cannot deep-link to a moment. All 16 TED SIOs
correctly carry no timestamp; the validator WARNs on TED+timestamp by design.

## No timestamp — text/audio-only (13 book + Easter)
Book quotes and the Easter audio-only podcast carry no video timestamp.

## Method notes
- ASR timestamps are accurate to ~1–2 seconds.
- exact_quote_match auto-apply is gated: only fires when the verbatim body is found
  contiguously in the captions at HIGH confidence. Paraphrase bodies never auto-apply.
- talking_point starts were chosen as the moment the speaker expresses the idea
  (context start), per the Phase-5 principle, and documented in each SIO's
  `media_verification_notes`.
