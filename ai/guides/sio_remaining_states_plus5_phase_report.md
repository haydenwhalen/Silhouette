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

## identity-transition — DONE (4/5 — honest shortfall)  · commit: <filled at commit>

**Selected slots:** IT-2 (matrescence/new parenthood), IT-3 (cultural/immigration), IT-4 (generative
reinvention), IT-1 (ordinary work-identity loss), IT-6/IT-10 (health / career-beginner — attempted, unfilled).

**New SIOs (4)**

| filename | speaker | source (family) | video @ ts | type/register | slot |
|---|---|---|---|---|---|
| identity_transition_sacks_matrescence | Alexandra Sacks | TED | 2:49–3:11 | mechanism · warm | IT-2 |
| identity_transition_conley_chrysalis | Chip Conley | Rich Roll | 0:00–0:18 | reframe · warm | IT-4 |
| identity_transition_selasi_multilocal | Taiye Selasi | TED | 4:58–5:09 | reframe · intellectual | IT-3 |
| identity_transition_debotton_job_snobbery | Alain de Botton | Big Think | 0:37–0:51 | reframe · intellectual | IT-1 |

**Source diversity:** 4 new speakers, all new to the corpus; families TED (×2, at cap), Rich Roll, Big Think;
4/4 video-backed + timestamped. Adds a reproductive psychiatrist, a midlife-reinvention founder, a
multicultural writer (Ghanaian-Nigerian-British-American), and a philosopher. Both TED clips use the TED
YouTube channel so the timestamp embeds honor per-moment start.

**Honest shortfall — 4 of 5.** The lived-story / health-driven / career-beginner slots (IT-1 lived, IT-6,
IT-10) did not yield a clean, verbatim, non-overused moment from an official channel within budget; and the
four found are type-clustered (3 reframe + 1 mechanism), nudging IT's already-largest type. Rejected/held:
Selasi's abstract passages (ASR-mangled proper nouns — only one clean narrated line was usable); Ira Glass /
Will Smith / Tom Vanderbilt / Maya Angelou / Michelle Obama (fan reposts or third-party summaries only — no
official channel); John O'Donohue (only small church channels); Suleika Jaouad (cancer-memoir, clinical risk +
no clean video); Ethan Hawke / Pico Iyer (would be TED #3 / corpus repeat); Herminia Ibarra (corpus repeat).

**QA:** validate-media PASS (0 hard); ingest 201; magnet — no new magnet, pre-existing Shankar 4/8 unchanged;
classification 8/8; retrieval 6/6; target-question closure — 3/4 new SIOs are #1 for their query (de Botton #2,
behind Tony Hawk), control athlete-retirement probe unaffected.

**Spot-check first:** de Botton (confirm IT vs status-comparison) and Sacks (excerpt held inside non-clinical boundary).

## engagement-drought — DONE (5/5)  · commit: <filled at commit>

**Selected slots:** ED-1 (awe), ED-3 (generative boredom), ED-9 (play), ED-2 (relational flatness),
ED-8 (over-stimulation) — five distinct white-space areas the corpus (saturated with languishing-naming +
dopamine/movement science + mastery-boredom) did not cover.

**New SIOs (5)**

| filename | speaker | source (family) | video @ ts | type/register | slot |
|---|---|---|---|---|---|
| engagement_drought_keltner_awe | Dacher Keltner | The Aspen Institute | 1:00–1:17 | mechanism · expert | ED-1 |
| engagement_drought_zomorodi_boredom_default_mode | Manoush Zomorodi | TED | 3:15–3:31 | reframe · intellectual | ED-3 |
| engagement_drought_brown_designed_to_play | Stuart Brown | TED | 13:38–13:48 | permission · warm | ED-9 |
| engagement_drought_turkle_alone_together | Sherry Turkle | Talks at Google | 24:08–24:17 | reframe · intellectual | ED-2 |
| engagement_drought_lembke_dopamine_deficit | Anna Lembke | Stanford Alumni | 4:21–4:37 | mechanism · expert | ED-8 |

**Source diversity:** 5 new speakers, all new to the corpus; families Aspen Institute, TED (×2, at cap),
Talks at Google, Stanford Alumni; 5/5 video-backed + timestamped. Type/register intentionally balanced
(2 mechanism/expert, 2 reframe/intellectual, 1 permission/warm) to avoid worsening ED's already-large
expert cell. Two excerpts held inside the non-clinical boundary (Brown's 'opposite of play is depression'
line excluded; Lembke's excerpt ends before the 'addiction' clause).

**QA:** validate-media PASS (0 hard); ingest 206; magnet — NO new magnet (each new SIO ≤1/10 on the default
probes); the pre-existing Brooks dominator (7/10) is the monitored state default, unchanged in nature, and
Zomorodi now gives the retriever a boredom alternative; classification 8/8; retrieval 6/6; target-question
closure — ALL 5 new SIOs are the #1 hit for their query; control 'numb at a job I'm good at' still returns
existing flatness SIOs (Brooks/Brené/Irving).

**Rejected/held:** Crawford (FORA/TEDx clips didn't contain the craft-attention moment); O'Donohue-style
craft/contribution voices unfound cleanly. Lembke's excerpt is slightly technical (flagged).

**Spot-check first:** Lembke (technical excerpt — confirm it reads for a lay user) and Turkle (confirm relational-ED fit).

## inaction-loop — DONE (5/5)  · commit: <filled at commit>

**Selected slots (the subtle gaps in the corpus's richest state):** IL-8 (productive procrastination),
IL-10 (distraction/avoidance), IL-7 (accountability), IL-1 (overwhelm-freeze), plus a concrete
do-worst-first tactic. All chosen for novelty against the corpus's heavy procrastination-science coverage.

**New SIOs (5)** — note: **zero TED**, saving the cap.

| filename | speaker | source (family) | video @ ts | type/register | slot |
|---|---|---|---|---|---|
| inaction_loop_perry_structured_procrastination | John Perry | Penny Zenker (interview) | 5:07–5:18 | reframe · intellectual | IL-8 |
| inaction_loop_eyal_distraction_internal | Nir Eyal | Big Think | 0:06–0:22 | story · vulnerable | IL-10 |
| inaction_loop_rubin_outer_accountability | Gretchen Rubin | own channel | 0:09–0:34 | reframe · warm | IL-7 |
| inaction_loop_tracy_eat_the_frog | Brian Tracy | own channel | 0:28–0:41 | mechanism · direct | (tactic) |
| inaction_loop_allen_mind_for_ideas | David Allen | DO Lectures | 8:41–8:53 | mechanism · intellectual | IL-1 |

**Source diversity:** 5 new speakers, all new to the corpus; 5 distinct families; 5/5 video-backed + timestamped;
**0 TED/TEDx**. Excellent type/register spread (2 reframe, 2 mechanism, 1 story; intellectual/vulnerable/warm/direct).

**QA:** validate-media PASS (0 hard); ingest 211; magnet — no dominant magnet (top 2/10, well distributed; new
SIOs ≤1/10); classification 8/8; retrieval 6/6; target-question closure — ALL 5 new SIOs are the #1 hit for
their query; control 'I know what to do and keep not doing it' still returns existing IL SIOs (Mel Robbins/
Goggins/Burkeman).

**Rejected/held:** Marie Forleo ('figureoutable' not in captions), Dan Ariely (TED content didn't match the
friction angle), Sendhil Mullainathan / overwhelm & self-forgiveness voices (only clinical/ADHD-coaching or
repost channels — non-clinical boundary). Tracy is tier-3 popular productivity (flagged).

**Spot-check first:** Perry (host-channel attribution) and Tracy (confirm it clears the 'not generic' bar).

## direction-collapse — pending
