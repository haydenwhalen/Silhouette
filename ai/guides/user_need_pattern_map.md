# User Need Pattern Map — Methodology

> **How to use this document:** This is the methodology guide for the user-side discovery layer.
> Read it before adding or editing anything in `corpus/user_need_patterns.yaml` or
> `corpus/user_query_patterns.yaml`. It defines what a need pattern is, the controlled vocabularies,
> the rules for creating/merging/rejecting patterns, and the hypothesis-vs-observed discipline that
> keeps this layer honest. It is a companion to `user_problem_model.md` (states) and
> `user_resonance_model.md` (form), and it feeds the SIO Discovery Agent's harvesting.

---

## 1. What a User Need Pattern is

A **User Need Pattern** is a structured representation of a *recurring user situation* — the felt
experience, the words the user uses, the belief underneath, the emotional texture, and the *form* of
insight that would land — together with a measured account of whether the current corpus actually
serves it.

It is **not** a persona, a demographic segment, or a real user. It is a curator-authored hypothesis
about a situation, grounded in the project's existing user research, and **falsifiable** by real beta
data later.

A need pattern answers: *"When a real person in this exact situation arrives and types what they'd
actually type, does Silhouette return something that lands — and if not, what must we go find?"*

The unit is deliberately **narrower than a state** and **wider than a single SIO**. A state
(e.g. `engagement-drought`) contains several distinct need patterns (numb-and-guilty vs.
resentful-and-trapped vs. coasting-and-bored). Each need pattern should map to a small, coherent
region of `state × insight_type × voice_register × intensity` — not the whole state.

## 2. Four distinct kinds of "gap"

These are easy to conflate. Keep them separate — they have different causes and different fixes.

| Term | Definition | How detected | Fix |
|---|---|---|---|
| **Corpus gap** | A metadata cell has no SIO. | `detect-corpus-gaps.ts` (deterministic counts). | Harvest any valid SIO for the cell. |
| **User need gap** | A real user situation has no SIO that would land for it. | This layer: static metadata match **+** retrieval probe. | Harvest a *specific* source moment matching the need's form and exclusions. |
| **Retrieval failure** | An SIO that *would* land exists, but retrieval doesn't surface it (wrong winner, near-duplicate magnet, asymmetry, below threshold). | This layer's retrieval probe; `test-magnet-risk.ts`; calibration. | Fix retrieval (rerank/threshold/hint), not the corpus. |
| **Resonance mismatch** | Retrieval surfaces a *state-correct* SIO whose **form is wrong** for the user (e.g. a `direct/challenging` insight to a self-critical user, or a `mechanism` to someone who's read everything). | This layer's probe: register/type vs. `expected_resonance` and `excluded_voice_registers`. | Harvest the missing *form* for that need; never relax the exclusion. |

A user-need gap can be caused by any of the lower three. The layer's job is to **tell them apart** so
the agent harvests when the corpus is the problem and flags retrieval when it isn't — instead of
harvesting redundant SIOs to paper over a ranking bug.

## 3. Controlled vocabularies

Use only these values. Do not invent ad hoc tags (mirrors the corpus rule in `user_problem_model.md`
§6.3). If a real situation doesn't fit, that is signal to discuss — not to silently extend the list.

### 3.1 `hidden_beliefs` (free text, but drawn from these recurring families)
The blocking thought the user holds as if it were fact. Author them in the user's voice. Recurring families:
- **Self-verdict:** "I'm lazy / not disciplined" · "I'm someone who doesn't follow through" · "Something is wrong with me."
- **Missed-window:** "I missed my chance" · "It's too late to change direction" · "I peaked early."
- **Sunk-cost / trapped:** "Leaving wastes what I built" · "I can't justify walking away from this."
- **Should-gratitude:** "I have no right to feel this — I should be grateful" · "Other people have real problems."
- **Identity-loss:** "I don't know who I am anymore" · "I've become someone smaller."
- **Resistance-as-signal:** "If I really wanted it I'd have done it by now" · "The fact that I'm scared means it's wrong."
- **Effort-myth:** "I just need more information / the right system / more motivation first."

### 3.2 `emotional_texture` (closed list)
`guilt · shame · numbness · frustration · fear · grief · resentment · disappointment · restlessness · pressure · confusion · exhaustion · boredom · self-criticism`

### 3.3 `situational_context` (closed list)
`career · post-achievement · post-mastery · burnout · faith-meaning · creative-block · health-routine · relationships-adjacent · school-education · early-career · mid-career · identity-shift`
(`relationships-adjacent` = only where it surfaces as a career/purpose/motivation question;
relationship *conflict* itself is out of Silhouette's scope per `intake_diagnostic_flow.md` §10.)

### 3.4 `resonance_need` (closed list — the form the user most needs *first*)
`direct-challenge · warm-permission · expert-mechanism · vulnerable-story · intellectual-reframe`
These map onto the resonance model: a `resonance_need` implies a `recommended_insight_type` +
`recommended_voice_register`, but is recorded separately because it captures *sequence* ("name it
before you challenge") that the raw tags don't.

## 4. Rules for creating a need pattern

1. **Provenance first.** Every need cites `source_provenance` pointing to a real line in
   `user_problem_model.md`, `intake_diagnostic_flow.md`, `user_resonance_model.md`, the magnet
   probes, or a documented live-corpus signal. A need with no provenance must be labeled
   `curator_hypothesis` in its provenance and is subject to the cap in Rule 7.
2. **User-voiced.** Author `user_question_under_it` and the linked query patterns in the user's
   actual words, not in tag language. "Is this just who I am now?" — not "user exhibits trait-attribution."
3. **One coherent form.** A need maps to a small region of the metadata space. If it needs three
   different registers to satisfy, it is probably two or three needs.
4. **Carry the exclusion.** If a register would *harm* this user (the exclusion principle: worse to
   serve `direct/challenging` to a self-critical user than to serve a non-preferred warm one), record
   it in `excluded_voice_registers`. Exclusions matter more than preferences (per `intake` §9).
5. **Name the anti-pattern.** `anti_pattern_notes` states what a *near-miss* looks like — the
   plausible-but-wrong SIO this need attracts (e.g. "a 'just start' tactic," "a gratitude reframe").
6. **Map the neighbors.** `disambiguation_neighbors` lists adjacent states/needs this is confused
   with, reusing the intake confusion pairs.
7. **Caps.** ≤6 needs per MVP state, ≤18 total for MVP. Pure `curator_hypothesis` needs (no doc
   provenance) ≤1 per state. Stay small.

## 5. Rules for rejecting or merging need patterns

- **Merge** two needs when they share the same `state` + overlapping `recommended_insight_type` +
  same `recommended_voice_register` + same `excluded_voice_registers` + same `anti_pattern_notes`.
  Keep the more user-voiced phrasing; union the query patterns.
- **Reject** a proposed need if: it has no provenance and isn't clearly a distinct situation; it is
  really a demographic/persona slice; it restates a whole state without narrowing the form; or it
  would push a state over the cap without displacing a weaker need.
- **Split** a need only when the retrieval probe shows a single need's queries genuinely require
  different, mutually-excluding forms (e.g. half want a challenge, half must exclude it).

## 6. Rules for avoiding fake personas

- Needs are **situational, never demographic.** No age, gender, job-title, income, or
  personality-type fields. (Schema does not include them; do not add them.)
- Describe the *moment and the belief*, not "the type of person." "A user who hit a milestone and
  felt nothing" is a situation; "ambitious 28-year-old strivers" is a persona — banned.
- Do not multiply needs to cover imagined variety. If two situations differ only in surface detail
  (industry, city) and need the same insight form, they are **one** need.
- Stereotype check: if a need's beliefs/emotions encode an assumption about a group rather than a
  situation, reject it.

## 7. Hypothesis vs. observed

- Every seeded need is `status: hypothesis`. This is a **structured guess** about demand, grounded
  in research, not a measurement of real users.
- `status: observed` is reserved for needs validated by **real beta data** (recurring real queries,
  failed retrievals, "show me something different" signals). We have none yet, so **no need is
  `observed`** and none should be marked so.
- The reports and harvesting targets must always carry the word *hypothesis* so no reader mistakes
  modeled demand for measured demand.
- When real data arrives: a `source: beta_real` query value and per-need `observed_frequency` get
  populated, and only then may a need flip to `observed`. Promotion is one-way and human-gated.

## 8. How user need patterns drive SIO harvesting

The analyzer (`analyze-user-need-coverage.ts`) computes, per need:
`covered_by_sio_ids`, `coverage_strength` (`none|weak|partial|strong`), `coverage_evidence`, and
`harvesting_priority`. It measures coverage two ways and prefers the production-faithful one:

- **Static** — metadata match of served SIOs (state / type / register / *excluded* registers).
- **Hinted probe** — the REAL retrieval engine run with the intake resonance hint this need
  implies (what the user actually receives in production), inspecting the top-3. A separate
  **no-hint** pass feeds magnet detection only (matching `test-magnet-risk`).

From these it assigns a **`gap_kind`** that decides the *remedy* (methodology §2):
`well_served` (no action) · `corpus_gap` (the right *form* genuinely isn't in the corpus → **harvest**) ·
`retrieval_gap` (a register-appropriate SIO exists but isn't delivered even with the hint → **tune
retrieval / discoverability**, don't harvest). Only `corpus_gap` (and, secondarily, `retrieval_gap`)
needs become **enriched harvesting targets** in `user_need_harvesting_targets.md` — full, user-voiced
source briefs, e.g.:

> *"We need a verified **direct/challenging** Engagement Drought reframe for a user who feels
> resentful and trapped in work they used to care about — the insight must name sunk cost and
> meaning-loss without dismissing their fatigue, from a speaker who left mastered/high-status work.
> Exclude warm/affirming (reads as dismissive). Distinguish from the held McKeown 'supermarket floor'
> moment, which names numbness but not resentment."*

…instead of the bare `engagement-drought + direct/challenging`. These targets feed the existing
Source Scout (`find-source-candidates.ts`) and downstream evaluation, novelty, verification, and the
unchanged human gates. The layer **raises harvesting priority and sharpens targets**; it never lowers
a verification bar or auto-approves anything.

## 9. How they should NOT drive runtime retrieval (yet)

- Need patterns are a **harvesting and evaluation** tool, not a runtime filter. Live retrieval stays
  soft/semantic with the existing state filter + resonance hints. We do **not** turn need patterns
  into hard query-time constraints — that would make retrieval rigid and overfit to a hypothetical taxonomy.
- The layer adds **no intake questions** and changes **no** runtime scoring. It runs offline, in the
  back office, against the *same* retrieval code the product uses, purely to observe.

**Known limitation (read the probe honestly):** the probe judges *form* — does the engine surface a
SIO in the right (non-excluded) register/type for the query — not whether the surfaced SIO's *content*
truly addresses this need's specific belief (e.g. resentment vs. numbness). A "lands" means "right form
delivered," not "perfect content fit." True content-fit judgment needs a human or an LLM judge scoring
each (query, returned SIO) pair against the need — deliberately deferred (it is the heavier evaluation
this layer is not yet building). Treat `well_served` as "no *form* gap," and still spot-check content.

## 10. Examples across the 3 MVP states

**Direction Collapse — post-achievement flatness (`dc-post-achievement-hollow`)**
Situation: hit the milestone they organized their twenties around, felt nothing on arrival.
Belief: "I got what I wanted and feel nothing — something's wrong with me." Texture: numbness,
confusion, disappointment. Form: `vulnerable-story` or `intellectual-reframe`; **exclude
expert/scientific** (too cold for the felt moment); must not open with advice or the word "passion."
Near-miss to avoid: a goal-setting framework. Neighbor: engagement-drought.

**Engagement Drought — resentful & trapped (`ed-resentful-trapped`)**
Situation: work that used to matter now feels like a trap; staying for sunk-cost reasons.
Belief: "Leaving wastes the years I put in." Texture: resentment, numbness, feeling-trapped.
Form: `direct-challenge` reframe; **exclude warm/affirming** (dismissive to a resentful user).
Near-miss: motivation tips, "find a hobby." Neighbor: direction-collapse, identity-transition.
(Live signal: McKeown 'supermarket floor' names the numbness but is **held as a magnet** and doesn't
touch resentment — a real coverage hole.)

**Inaction Loop — self-critical & ashamed (`il-self-critical-ashamed`)**
Situation: keeps not doing the thing and has concluded it proves a character defect.
Belief: "I'm someone who never follows through." Texture: shame, self-criticism, fear.
Form: `warm-permission` or `vulnerable-story` / identity reframe; **exclude direct/challenging**
(it confirms the self-attack). Near-miss: accountability/discipline content, "just start." Neighbor:
possibility-paralysis. (Live signal: the corpus is **4/9 `direct/challenging` in Inaction Loop** — over-indexed
on exactly the register this need must avoid, so a "covered" state still fails this user.)

---

_This methodology governs `corpus/user_need_patterns.yaml` and `corpus/user_query_patterns.yaml`.
Revise it when real beta data lets needs become `observed`, when the retrieval probe reveals a
recurring failure mode the vocabularies don't capture, or when a controlled vocabulary genuinely
needs a new value (discuss; do not extend silently)._
