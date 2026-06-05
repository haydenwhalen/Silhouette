# User-Testing Readiness Report

_Generated 2026-06-05, after the possibility-paralysis +5 and remaining-states +22 commits.
Review/testing pass only — no SIOs added, nothing pushed._

## Verdict at a glance

**Ready for a closed user-testing round.** The corpus is balanced across all six states (34–38 each),
media validation is clean (0 hard violations, 0 warnings), classification and retrieval regressions are
green, and a 15-prompt realistic test returned **9 strong / 5 acceptable / 1 weak** matches with **media
present on all 15**. One classifier edge (relational-drift prompt routed to direction-collapse) and one
known corpus thin-spot (a career-fork-specific PP SIO) are the only things worth tuning before a wider beta.

---

## 1. Current corpus totals by state

| State | SIOs |
|---|---|
| inaction-loop | 38 |
| engagement-drought | 37 |
| direction-collapse | 36 |
| identity-transition | 35 |
| possibility-paralysis | 34 |
| momentum-gap | 34 |
| **Total** | **214** SIOs (212 source records) |

Balanced (largest 38, smallest 34; spread of 4). `validate-media`: **200 / 214 ready for video presentation**;
the 14 non-video are older text/needs-review entries, not from these batches.

## 2. Summary of the recent additions

| Pass | Added | Notes |
|---|---|---|
| possibility-paralysis (prior) | **+5** | Langer, Welch, Burkeman, Klein, Wapnick |
| momentum-gap | +5 | Amabile, Wood, Dalton-Smith, Lorde, Lamott |
| identity-transition | +4 | Sacks, Conley, Selasi, de Botton (4/5 — honest shortfall) |
| engagement-drought | +5 | Keltner, Zomorodi, Brown, Turkle, Lembke |
| inaction-loop | +5 | Perry, Eyal, Rubin, Tracy, Allen (zero TED) |
| direction-collapse | +3 | Steindl-Rast, Dunn, Solomon (3/5 — honest shortfall) |
| **Total added** | **27** | corpus 187 → 214 |

**Source / video / timestamp split:** **27 / 27** are video-backed with a **verified per-moment timestamp**
(`media_verification_status: verified`, `clip_match_type: exact_quote_match`, `transcript_verified: true`),
all caption-confirmed via yt-dlp. **27 distinct new speakers**, ~20 distinct source families, only one
speaker repeat in the whole effort (Burkeman, across two different states). TED/TEDx held to ≤2 per state.
Deliberate widening into Big Think, Talks at Google, BBC Radio 1, Aspen Institute, Stanford Alumni,
DO Lectures, Harvard Business School, The Knowledge Project, and creators' own channels — away from the
prior School-of-Greatness / Huberman-Lab concentration.

## 3. Review of the flagged SIOs

| SIO | Source-honest | Non-clinical | Not too generic | OK for testing | Verdict |
|---|---|---|---|---|---|
| Lorde — momentum-gap | ✅ | ✅ (clip bounded 8:44–9:11, excludes sensitive context) | ✅ | ✅ | **Keep** |
| Solomon — direction-collapse | ✅ | ✅ (clip starts after illness ref) | ◑ slightly lofty | ✅ | **Keep** |
| Sacks — identity-transition | ✅ | ✅ ("not a disease"; ends pre-PPD) | ✅ | ✅ | **Keep** |
| Brian Tracy — inaction-loop | ✅ | ✅ | ◑ well-worn tactic | ✅ | **Keep (watch)** |

**Lorde (`momentum_gap_lorde_creative_drought`).** Verbatim from the official BBC Radio 1 upload; the clip is
deliberately bounded to end at 9:11, before the interview turns to disordered eating, and the verification
notes disclose both that boundary and the elided verbal fillers. Excerpt is purely about creative drought
("I just didn't think that I had anything to offer. I didn't know what my voice was."). Honest, non-clinical,
specific, and it fills MG's thin vulnerable/personal cell with a young-artist voice. **Keep as-is.** Only
nit: the opening "I was just … not in a great way on a lot of levels" is mildly vague — acceptable and honest.

**Solomon (`direction_collapse_solomon_forge_meaning`).** Verbatim TED; clip starts at 4:56 ("Stories are the
foundation of identity…"), after an adjacent illness reference, keeping it non-clinical. "Forge meaning, build
identity" is a specific attributed mantra, not generic positivity, though the register is loftier than the
others. Good fit for the "I've lost my meaning" user. **Keep.**

**Sacks (`identity_transition_sacks_matrescence`).** Verbatim TED with the ASR mangling of "matrescence"
disclosed and restored; the excerpt is explicitly de-medicalizing ("matrescence is not a disease") and ends
before the postpartum-depression mention. Names a specific, novel concept; fills a real gap (no parenthood
entry existed). Relevant to the new-parent subset of the audience. **Keep.**

**Brian Tracy (`inaction_loop_tracy_eat_the_frog`).** Verbatim from his official channel; honest and a concrete
do-the-worst-first tactic the corpus lacked. It's the **least distinctive** of the batch — "eat that frog" is
a well-worn productivity cliché and tier-3 (popular, not research) — and reads more like a *useful tactic*
than "one precise human moment." It passes all bars, so **keep for now**, but it's the single best
**replace-later** candidate if you want to raise the average; a fresher initiation/overwhelm voice would beat it.
(No change made — flagging per your instruction to ask before edits.)

## 4. 15-prompt realistic user test

Method: production path — `classifyState(prompt)` → `shouldApplyStateFilter` → `similaritySearchWithState`.
Match strength is a judgment of top-1 fit. **All 15 returned a verified video-backed SIO; none missing media.**

| # | Prompt | Classified state (conf) | Top SIO | Match |
|---|---|---|---|---|
| 1 | losing connection with people closest to me | engagement-drought (mod) | Turkle — *I share therefore I am* | **Strong** |
| 2 | know what to do but keep avoiding it | inaction-loop (high) | Burkeman — micro-discomfort | **Strong** |
| 3 | scared I picked the wrong career path | possibility-paralysis (mod) | Ina Garten — something scary | Acceptable |
| 4 | emotionally flat, nothing sounds exciting | engagement-drought (high) | Justin Vernon — the motion stopped | **Strong** |
| 5 | too many options, terrified of choosing wrong | possibility-paralysis (high) | Iyengar — choose not to choose | **Strong** |
| 6 | made progress then completely fell off | momentum-gap (high) | Jesse Itzler — small wins restart | **Strong** |
| 7 | graduated, don't know who I am | identity-transition (high) | Maya Rudolph — I was lost | **Strong** |
| 8 | feel behind everyone my age | momentum-gap (high) | Barbara Kasten — recognition at 80 | **Strong** |
| 9 | keep waiting for clarity before I act | possibility-paralysis (high) | Ibarra — act into clarity | **Strong** |
| 10 | don't trust myself to follow through | inaction-loop (high) | Hershfield — future self a stranger | Acceptable |
| 11 | got what I wanted and still feel empty | direction-collapse (high) | Steven Bartlett — future emptiness | **Strong** |
| 12 | drifting from my friends, can't stop it | direction-collapse (mod) | Toby Hendy — same destination | **Weak** ⚠️ |
| 13 | want to change but not the cost of changing | inaction-loop (mod) | Brad Stulberg — act into being | Acceptable |
| 14 | tired of starting over | momentum-gap (high) | Katy Milkman — fresh-start effect | Acceptable |
| 15 | feel stuck but not in a dramatic way | unknown (low) → unfiltered | Justin Vernon — the motion stopped | Acceptable |

**Tally: 9 strong · 5 acceptable · 1 weak. Media present: 15/15.**

Observations:
- **#12 is the one weak match and it's a classifier issue, not a corpus gap.** "Drifting from my friends"
  is relational flatness — the corpus now answers that well (Turkle served #1 strongly) — but the classifier
  routed #12 to *direction-collapse*, so it retrieved Hendy (about not knowing your next destination), which
  misses. Fix is in classification/routing (or a resonance hint), not sourcing.
- **#15 behaved correctly:** a deliberately vague "stuck but not dramatic" prompt classified as `unknown / low`
  and triggered the unfiltered-fallback (the intended safety behavior), still landing on a sensible languishing
  SIO (Vernon). In production this would surface the clarifying-question path.
- **#3 (wrong career path)** is acceptable but is the known PP thin-spot — a career-fork-specific SIO (slot
  PP-6, unfilled) would beat Ina Garten's more general "choose the scary path."
- Most top hits on these *generic* prompts are established SIOs; the new additions win on more *specific*
  phrasings (confirmed by the per-state target-question probes during authoring — e.g., Turkle, Welch,
  Klein, Wapnick, Amabile, Wood, Dalton-Smith, Lamott, Perry, Eyal, Rubin, Allen, Dunn each ranked #1 for
  their niche query). The batch adds depth and alternatives rather than replacing the strong existing core.

## 5. QA results

| Check | Result |
|---|---|
| `validate-media` | **PASS** — 214 SIOs, **0 hard violations, 0 warnings**, 200 video-ready |
| `npm run ingest` | **PASS** — 214 loaded, 0 skipped, vector store built |
| `test-state-classification` | **PASS 8/8** (6 clear states high-confidence; 2 ambiguous correctly `unknown/low`) |
| `test-sio-retrieval` | **PASS 6/6** |
| `test-smoke-flows` | **N/A this run** — `ECONNREFUSED` (no dev server). Needs `npm run dev` on :3000 first; it exercises the live `/api/chat` + `/api/feedback-signal` surface, not the corpus. Re-run with the server up before beta. |

## 6. Readiness assessment & recommendations

**Go for closed user testing.** Corpus is balanced, media is honest and verified, retrieval is healthy, and
realistic prompts land well. Before a wider/public beta, three low-effort items:

1. **Classifier routing for relational prompts (highest value).** Prompt #12 shows "drifting from friends /
   losing people" can mis-route to direction-collapse. Add relational-drift cues to the engagement-drought
   side of the classifier (or a secondary-state check) so Turkle-type SIOs are reachable. Pure tuning — no sourcing.
2. **Fill PP-6 (career-fork) next.** "I picked the wrong career path" is a top-frequency real prompt and is
   currently served only adequately. A career-decision lived story would upgrade #3-type prompts.
3. **Run `test-smoke-flows` against a live server** (`npm run dev`) to confirm the end-to-end chat + feedback
   API before onboarding testers.

**Spot-check first (manual eyeball):** Lorde and Solomon (non-clinical clip boundaries) and Brian Tracy
(distinctiveness). All four pass; Tracy is the lone replace-later candidate.

**Optional later (not blocking):** the two honest shortfalls — identity-transition (4/5) and
direction-collapse (3/5) — remain the thinnest *new-coverage* areas; their open gaps (ordinary-professional
emptiness, disillusionment, grief, lived health/career transitions) are best sourced from reputable long-form
interviews in a future pass with fresh YouTube API quota.
