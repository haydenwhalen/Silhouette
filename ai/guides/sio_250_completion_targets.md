# 250-Completion Target Slots (the contract)

> **STATUS (2026-06-05): PAUSED — awaiting YouTube Data API quota reset.** Corpus is at **214/250**; **no
> SIOs were authored in this pass** (only this contract was written). The YouTube **Search Queries per day**
> quota was exhausted (`429 rateLimitExceeded`), which throttles candidate discovery; to keep this final
> push **video-forward** (high verified-video ratio, minimal non-video filler), sourcing is deferred until
> the quota resets (daily, ~midnight Pacific). **Resume order: direction-collapse → identity-transition →
> momentum-gap → possibility-paralysis → engagement-drought → inaction-loop.** Same rules: quality over
> padding · prefer verified video + timestamp · non-video only when clearly stronger · no fabricated
> quotes/timestamps/URLs/IDs/transcript-verification · commit one state at a time · stop rather than fill to
> 250. (yt-dlp captions + the `videos` metadata endpoint remained available; only API *search* was blocked.)


_Final MVP pass: +6/state (36 total) to take the corpus 214 → 250. Built from the unfilled/thin gaps in
`sio_remaining_states_plus5_phase_report.md` and `user_testing_readiness_report.md`. Source leads are
unverified search targets — the SIO's quote is whatever a real, caption-verified moment (or a verified
published text) actually says. Quality/honesty > hitting 6. Note: YouTube **search** API quota is exhausted
this session — discovery via WebSearch → yt-dlp verification; `videos`/metadata endpoint + yt-dlp still work._

**Cross-cutting:** avoid over-used families (TED ≤2/state and already heavy across prior batches — minimize;
no SoG/Ferriss/Huberman-Lab/DoaC/Rich-Roll dominance); ≤2 repeats/speaker; ≤5/family in batch. Aim ≥4
video/state; non-video allowed when it fills a gap better (document + flag for backfill). Prior batch leaned
heavily reframe in DC/IT — **prioritize STORY/vulnerable and permission/direct registers** this pass.

---

## direction-collapse (+6)  — last pass only 3/5, all reframe; needs lived stories + the non-celebrity angles
- **DC-A** "I did everything right — good job, ticked the boxes — and I feel nothing. No dramatic peak, just empty." · corpus_gap · story · vulnerable/personal · moderate · avoid Brady/Bartlett/Sharma (celebrity peaks) · lead: an essayist/worker on the ordinary checklist-life emptiness · video optional · **the #1 young-professional DC moment, currently unserved.**
- **DC-B** "I gave years to a cause/field I believed in and lost faith in it." · corpus_gap · story · vulnerable/personal · moderate · avoid Wilkinson/Burroughs (sport) · lead: a clinician/teacher/nonprofit voice on disillusionment/moral injury (non-clinical framing) · video optional.
- **DC-C** "Since a loss/death, nothing feels like it matters." · corpus_gap · story · vulnerable/personal · moderate · avoid BJ Miller (death-as-teacher) · lead: a grief→meaning voice (non-clinical, non-crisis) · video optional.
- **DC-D** "I walked away from the dream/the money and it still felt empty." · quality gap · story · direct/challenging · moderate · avoid McConaughey (go-to-zero) · lead: a founder/artist who left golden handcuffs · video preferred.
- **DC-E** "Being directionless makes me feel broken — is something wrong with me?" · voice gap (expert thin) · reframe · expert/scientific · mild · avoid Epstein/Sinek · lead: a psychologist reframing lostness as an exploratory search state · video preferred.
- **DC-F** "I want my life to mean something but I don't have a grand purpose." · source-diversity gap · permission · warm/affirming · mild · avoid Damon/Smith · lead: a non-Western or contemplative voice on meaning in the ordinary/small · video optional.

## identity-transition (+6)  — last pass 4/5, all reframe/mechanism; needs lived stories + life-stage range
- **IT-A** "I got laid off and I don't know who I am without the job." (lived) · quality gap · story · vulnerable/personal · moderate · avoid de Botton (job-snobbery reframe), Wambach/Agassi (sport) · lead: a worker/writer's lived layoff story · video preferred.
- **IT-B** "An illness/diagnosis forced me to become someone new." · corpus_gap · story · vulnerable/personal · moderate · avoid Shankar (injury, MG) · lead: a person on health-driven identity change (non-clinical) · video preferred.
- **IT-C** "I changed careers and I feel like a fraud/beginner again." · voice gap (direct thin) · reframe · direct/challenging · mild · avoid Garmus · lead: a mid-career switcher · video preferred.
- **IT-D** "My kids left / my main role changed and I don't know who I am now." (empty nest) · corpus_gap · reframe · warm/affirming · mild · avoid Shields (caregiving) · lead: a parent on the role transforming · video optional.
- **IT-E** "The relationship that defined me ended and I lost my 'us'." (divorce/breakup) · quality gap · story · vulnerable/personal · moderate · avoid Brown (braving) · lead: a post-divorce self-rediscovery voice · video preferred.
- **IT-F** "I'm finally claiming a self I hid for years." (coming out / authenticity) · corpus_gap + diversity · permission · warm/affirming · moderate · avoid Kadakia (stopped-hiding, IL) · lead: a voice on becoming visibly yourself · video preferred.

## momentum-gap (+6)  — last pass 5/5; needs public-failure, identity-momentum, the grind, life-paused
- **MG-A** "I had a public failure and I can't make myself start again." · quality gap · story · direct/challenging · moderate · avoid Galloway (wealth-cycles) · lead: a clean public-flop → restart story · video preferred.
- **MG-B** "How do I become someone who actually follows through?" (identity-based) · voice gap (direct thin) · reframe · direct/challenging · mild · avoid Clear/Goggins · lead: a fresh identity-momentum voice · video preferred.
- **MG-C** "I'm sick of hearing about consistency — what does the unglamorous grind actually look like?" · quality gap · reframe · direct/challenging · mild · avoid Frisella/Clear · lead: a maker/athlete on years-not-weeks · video preferred.
- **MG-D** "I came back from injury/illness and my drive is just gone." (distinct from Liu/Shankar) · quality gap · story · vulnerable/personal · moderate · avoid Liu/Shankar · lead: an athlete/person on rebuilding *want* · video preferred.
- **MG-E** "Life knocked me off track (caregiving/loss) and I need permission to restart gently." · corpus_gap · permission · warm/affirming · mild · avoid Dyer (creative fallow) · lead: a voice on life-forced pauses · video optional.
- **MG-F** "I keep comparing myself online and it kills my drive." (fresh take) · quality gap · reframe · intellectual/measured · mild · avoid Bloom/Sinek/Santos · lead: a fresh comparison/social-media voice · video preferred.

## possibility-paralysis (+6)  — last pass 5/5; readiness report flagged career-fork as top gap
- **PP-A** "I'm terrified I picked / will pick the wrong career path." (lived) · corpus_gap (flagged in readiness #3) · story · vulnerable/personal · moderate · avoid Issa Rae (too-scared) · lead: a lived career-decision story · video preferred · **top priority.**
- **PP-B** "Which option is most *me*? I want to decide by values, not pros/cons." · corpus_gap · reframe · warm/affirming · mild · avoid Whyte (give-up-worlds) · lead: a values-led-choice voice · video preferred.
- **PP-C** "Should I trust my gut on this?" · corpus_gap · reframe · intellectual/measured · mild · avoid Barrett (affective-realism caution) · lead: an intuition-as-data voice (non-overused) · video preferred.
- **PP-D** "I optimize every choice to death — how do I just accept 'good enough'?" · quality gap · permission · warm/affirming · mild · avoid Schwartz/Burnett · lead: a satisficing/good-enough voice · video preferred.
- **PP-E** "What if the choice is irreversible and I ruin everything?" · corpus_gap · reframe · direct/challenging · moderate · avoid Bezos/Westover · lead: a reversibility / two-way-door voice (non-Bezos) · video preferred.
- **PP-F** "Too many tiny daily decisions are draining me." (decision fatigue) · corpus_gap · mechanism · expert/scientific · mild · avoid Schwartz/Iyengar · lead: a decision-fatigue voice (frame honestly given replication debates) · video optional.

## engagement-drought (+6)  — last pass 5/5; needs craft/contribution/nature/flow/rest
- **ED-A** "I want to feel alive in my work again — through depth, not novelty." · corpus_gap · story · vulnerable/personal · mild · avoid Buckingham · lead: a craftsperson/maker on depth/mastery joy · video preferred.
- **ED-B** "I want to care about something again." (contribution/meaning) · corpus_gap · reframe · warm/affirming · mild · avoid Smith (DC) · lead: a meaning-via-contribution voice · video preferred.
- **ED-C** "Being outside makes me feel alive — what's that about?" (nature, non-Huberman) · source-diversity gap · mechanism · expert/scientific · mild · avoid Huberman sunlight · lead: a nature-and-mind researcher (Florence Williams-type) · video preferred.
- **ED-D** "I'm flat — how do I actually get from languishing to flourishing?" (the path, non-Grant/Keyes) · corpus_gap · mechanism · intellectual/measured · mild · avoid Grant/Keyes · lead: a flourishing/positive-psych voice · video preferred.
- **ED-E** "Is rest the answer or am I just lazy?" (rest legitimate) · quality gap · permission · direct/challenging · mild · avoid Huffington (collapse) · lead: a rest-ethics voice (non-grind) · video preferred.
- **ED-F** "When I'm absorbed in something I feel alive — how do I get there on purpose?" (flow) · corpus_gap · mechanism · expert/scientific · mild · avoid Pink (autonomy/mastery) · lead: a flow voice (Csikszentmihalyi-type) · video preferred.

## inaction-loop (+6)  — last pass 5/5 (richest state); needs self-forgiveness, pointlessness, tiny-start, half-start
- **IL-A** "I beat myself up for procrastinating and it makes it worse." (self-forgiveness) · corpus_gap · reframe · warm/affirming · mild · avoid Devlukia/Neff (MG) · lead: a self-forgiveness-as-mechanism voice · video preferred.
- **IL-B** "The task feels pointless, so I can't make myself start." · corpus_gap · reframe · direct/challenging · moderate · avoid Sinek (DC) · lead: a meaning-in-the-mundane voice · video preferred.
- **IL-C** "Make it absurdly small — the two-minute start." (in IL, not MG) · corpus_gap for IL · mechanism · expert/scientific · low · avoid Fogg/Diviney (MG) · lead: a tiny-start/2-minute-rule voice · video preferred.
- **IL-D** "I've spent years almost-quitting and still keep showing up." (the half-start) · quality gap · story · vulnerable/personal · moderate · avoid Hadley (nothing-good-enough) · lead: a second lived almost-quit voice · video preferred.
- **IL-E** "I'm scared to finish — done means it gets judged." (fear of finishing) · corpus_gap · reframe · intellectual/measured · mild · avoid Curran/Saujani (perfectionism) · lead: a fear-of-completion voice · video preferred.
- **IL-F** "Stop waiting — just begin." (fresh direct voice, non-Goggins/Jocko/Mylett/Tracy) · voice gap · permission · direct/challenging · moderate · avoid Goggins/Jocko/Mylett/Tracy/Mel-Robbins · lead: a fresh decisive voice · video preferred.

---

## Selection discipline
1. Caption-verified (yt-dlp) or published-text-verified (WebFetch) — or it doesn't ship.
2. Novel vs the named avoid-dup SIOs + the whole corpus.
3. Narrow `key_claim`/keywords — no magnets; don't worsen ED-Brooks or IT-Shankar.
4. Diversity — new speakers/families; widen gender/culture/field/age; minimize TED (already heavy).
5. Honesty fields — `transcript_verified`/`exact_quote_match` only when truly confirmed; document every non-video SIO + flag for backfill.
