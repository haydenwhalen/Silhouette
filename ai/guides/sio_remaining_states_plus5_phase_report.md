# +5/remaining-state coverage batch — phase report

_Working standard (per the user): **5 excellent, verified, coverage-closing SIOs per state is better than
11 uneven ones.** Reject rather than pad. One state at a time, QA + commit + checkpoint per state._

## 1. Starting point

- Corpus before this task: **192 SIOs** (after possibility-paralysis +5 in the prior pass).
- Counts before: possibility-paralysis 34, inaction-loop 33, direction-collapse 33, engagement-drought 32,
  identity-transition 31, momentum-gap 29.
- Possibility-paralysis is **complete (5/5)** from the prior pass — not touched here.
- Target order: momentum-gap → identity-transition → engagement-drought → inaction-loop → direction-collapse.
- Verification pipeline: yt-dlp caption fetch (`python3 -m yt_dlp`) + a dependency-free VTT search helper;
  every video-backed SIO is caption-confirmed for verbatim wording + timestamp before authoring.

---

## momentum-gap — DONE (5/5)  · commit: <filled at commit>

**Selected 5 target slots** (from the 11-slot contract; chosen for biggest real gap + verifiable source +
register diversity; MG is comparison-saturated, so all five avoid the comparison framing):

| Slot | User question | gap type | intended type/register/intensity | avoid-dup |
|---|---|---|---|---|
| MG-3 | "I need one small win to believe I can get going again" | corpus_gap | mechanism · intellectual · mild | Fogg, Diviney, Milkman |
| MG-10 | "Why can't I just will myself to restart?" | source-diversity | mechanism · expert · mild | Huberman limbic-friction/task-bracketing |
| MG-2 | "I'm not behind, I'm empty — and sleep isn't fixing it" | corpus_gap | reframe · warm · mild | Santos, Bloom (comparison) |
| MG-1 | "I lost my drive and fear it's gone for good" (lived) | corpus_gap | story · vulnerable · moderate | Liu, Felix, Shankar |
| MG-9 | "I'm stalled and grinding harder isn't working" | corpus_gap | permission · warm · mild | Neff, Clear, Dyer |

**New SIOs**

| filename | speaker | source (family) | video @ ts | verbatim | type/register |
|---|---|---|---|---|---|
| momentum_gap_amabile_progress_principle | Teresa Amabile | Talks at Google | 20:02–20:21 | exact, captions | mechanism · intellectual |
| momentum_gap_wood_willpower_vs_context | Wendy Wood | Big Think | 2:52–3:14 | exact (ASR 'willpower power'→'willpower') | mechanism · expert |
| momentum_gap_dalton_smith_rest_deficit | Saundra Dalton-Smith | TEDxAtlanta | 0:26–0:37 | exact, captions | reframe · warm |
| momentum_gap_lorde_creative_drought | Lorde | BBC Radio 1 | 8:44–9:11 | exact (fillers elided; clip bounded pre-sensitive-content) | story · vulnerable |
| momentum_gap_lamott_unplug_reset | Anne Lamott | TED | 3:06–3:22 | exact ('number two' marker omitted) | permission · warm |

**Source diversity:** 5 new speakers, all new to the corpus; 5 distinct families (Talks at Google, Big Think,
TEDxAtlanta, BBC Radio 1, TED); 2 TED/TEDx (at the per-state cap); 5/5 video-backed + timestamped. No
over-used speaker or family. Adds a young-woman artist (Lorde), two women scientists/physicians (Amabile,
Wood, Dalton-Smith), and a beloved essayist (Lamott).

**QA:** validate-media PASS (0 hard violations); ingest 197 docs, 0 skipped; magnet-risk — no new magnet
(top new SIO share 1/8 < 50%; pre-existing Blakely 2/8 unchanged); classification 8/8; retrieval 6/6;
target-question closure — 4/5 new SIOs are the #1 hit for their target question (Amabile #3 but present),
control "everyone's ahead of me" probe still returns only comparison SIOs (no hijack).

**Rejected/held (notable):** Nagoski TED (couldn't confirm "stress cycle" verbatim cleanly); Tricia Hersey &
Devon Price (disfluent/messy verbatim, no clean self-contained excerpt); Alex Pang (conversational, no crisp
line; Dalton-Smith covered rest better); Ira Glass "the gap" & Will Smith "one brick" (only fan reposts — no
official channel, can't honestly embed); Astro Teller (org-framed); Gigerenzer (not self-contained, prior pass).

**Manual spot-check first:** Lorde (sensitive surrounding context excluded; confirm framing) and Dalton-Smith
(confirm it reads as momentum vs engagement-drought).

---

## identity-transition — pending
## engagement-drought — pending  (lead: Lembke @ Stanford Alumni for ED-8 over-stimulation)
## inaction-loop — pending
## direction-collapse — pending
