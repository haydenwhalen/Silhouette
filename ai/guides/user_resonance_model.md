# Silhouette — User Resonance Model

> **How to use this document:** This is a companion to `user_problem_model.md`. The User Problem Model defines the *stuck state* — what the user needs content about. This document defines the *resonance profile* — what form of content will actually land for them. Before designing retrieval logic or intake flow, read both. They define the two primary matching dimensions.

---

## Purpose

The User Problem Model identifies which stuck state a user is in. That is necessary but not sufficient for retrieval. Two users in Direction Collapse may need completely different content to experience a shift:

- User A is analytical, skeptical of emotional content, trusts evidence and intellectual rigor. Cal Newport reframing how direction is built will land. Matthew McConaughey's vulnerable personal narrative will feel irrelevant to them.
- User B is emotionally driven, currently in pain, needs to feel seen before they can receive any reframe at all. McConaughey lands. Newport feels cold and abstract.

Both are excellent sources for Direction Collapse. Only one will land for each user.

The stuck state determines the *topic*. The resonance profile determines the *form*. Without knowing the form, the retrieval engine has no principled basis for choosing between two equally state-appropriate sources — and the difference between a landed insight and a near-miss depends entirely on that choice.

---

## The Two Resonance Dimensions

### Dimension 1: Insight Type

What form of truth does this user receive most readily?

| Type | What it does | Example sources |
|---|---|---|
| **Mechanism** | Explains *why* the experience happens — neuroscience, psychology, systems | Huberman Lab, Hidden Brain |
| **Story** | First-person narrative from a credible person who lived through the state | Goggins, McConaughey, How I Built This |
| **Reframe** | A conceptual frame that changes how the user understands their situation | Naval Ravikant, Cal Newport, Ryan Holiday |
| **Permission** | Validates that the experience is real, coherent, and not a character flaw | Brené Brown, Feel Better Live More |

This taxonomy already exists in the corpus tagging schema (`user_problem_model.md`, Section 6). What the Resonance Model adds is the claim that different users are differently receptive to these types — and that retrieval must account for this.

A user whose intake language is analytical ("I'm trying to understand why I keep doing this") will receive mechanism or reframe content more readily than permission or story. A user whose language is emotional and self-critical ("I just feel stuck and I don't know what's wrong with me") needs permission or story before anything else can land. The insight type must match the user's current mode of reception, not just the state's content category.

### Dimension 2: Voice Register

What kind of speaker does this user find credible and worth listening to?

| Register | Characteristic | Primary sources |
|---|---|---|
| **Direct/Challenging** | Confrontational, high-accountability, no coddling | Goggins, Manson |
| **Warm/Affirming** | Supportive, generous, meets the user where they are | Howes, Chatterjee |
| **Intellectual/Measured** | Analytical, precise, argues its case carefully | Newport, Parrish, Naval |
| **Vulnerable/Personal** | Confessional, emotionally exposed, shares the inside | McConaughey, Brown |
| **Expert/Scientific** | Evidence-based, clinical precision, authority from research | Huberman, Vedantam |

Voice register is the harder dimension to detect from a short input. But the effect is real: a user who needs to hear something hard will not receive a warm/affirming voice — they'll dismiss it as soft. A user who is already being hard on themselves will not receive a direct/challenging voice — they'll experience it as an attack. The register must fit the user's current emotional posture.

---

## How This Differs From the User Problem Model

| | User Problem Model | User Resonance Model |
|---|---|---|
| **Question answered** | What stuck state is the user in? | What form of content will land for this user? |
| **Function** | Defines the retrieval topic | Defines the retrieval form |
| **Determined by** | The user's situation | The user's character and current emotional posture |
| **Changes** | Relatively stable within a session | Can shift across sessions and over time |
| **Structure** | Six defined states | Two dimensions with defined variants |

The models are orthogonal. State tells you *what* to retrieve. Resonance tells you *how* to deliver it. A good retrieval decision requires both.

---

## How Resonance Affects Source Strategy

Every source in the corpus serves a specific resonance profile — not just a specific stuck state. The state-to-source fit map in `source_candidates.md` shows which sources cover which states. The resonance-to-source map in the same document shows which sources serve which kinds of users.

This matters at two levels:

**Corpus-level:** The corpus must have resonance diversity within each MVP state, not just speaker diversity. If Direction Collapse coverage is dominated by Reframe/Intellectual sources (Newport, Naval, Ryan Holiday), users who need Story or Permission content for the same state will consistently receive a near-miss. The corpus must cover multiple resonance profiles per state — this should be an explicit build target alongside state coverage.

**Retrieval-level:** For a user with a known resonance profile, retrieval should filter by (state + insight_type + voice_register) rather than state alone. This requires that `insight_type` and `voice_register` be metadata tags on every corpus chunk — not inferred at retrieval time. Both must be defined before the corpus data model is finalized.

---

## Resonance Detection Signals

The intake flow does not yet exist. When it is designed, the following signals should inform resonance inference. These are signals, not a detection protocol — the intake flow design will determine how they are collected.

**Insight type — detectable from the user's writing register:**
- Analytical, explanatory language ("I'm trying to figure out why...") → mechanism or reframe preference likely
- Emotional, self-referential language ("I just feel...") → story or permission more likely to land first
- "I know I should, but I still..." → permission or identity-level reframe most needed
- "I've read everything about it..." → story or direct challenge more likely to land than more information

**Voice register — proxies from intake tone:**
- Self-critical or ashamed tone → warm/affirming or vulnerable/personal register first; direct/challenging is risky
- Frustration-oriented language ("I'm so sick of...") → direct/challenging may land; warm/affirming may feel dismissive
- Precise, analytical vocabulary → intellectual/measured register
- No strong signal → default to the register most common in the corpus for that state (defined in Retrieval Philosophy)

**For first-session users with no known profile:** Serve state-matched content with a default insight type and voice register for that state. Build the resonance profile from engagement signals across subsequent sessions.

---

## What This Means for Retrieval Philosophy

This document creates three specific requirements that Retrieval Philosophy must address:

**1. Every corpus chunk must carry a `voice_register` tag.**
This tag must be assigned at ingestion time, alongside `insight_type`, `state_tag`, and `source_credibility`. It cannot be added retroactively without re-tagging the full corpus. The vocabulary is the five registers defined above.

**2. The retrieval query must support resonance filtering.**
The retrieval engine must be able to express: find the best match for this state, where `insight_type` = X and `voice_register` = Y. For a first-session user, retrieval defaults to state-only matching. For a returning user with a known profile, resonance dimensions become active filters or reranking signals.

**3. A default resonance profile per state must be defined.**
Retrieval Philosophy must specify which insight type and voice register to default to for each MVP state when no user profile is known. This is a design decision — the default that most reliably lands for a first-session user is not obvious, and it may differ by state.

---

## What This Does Not Yet Solve

- **How to explicitly gather resonance preference** — the intake flow may include a lightweight signal (a question, a choice between examples), but this is an intake design decision outside this document's scope.
- **How the resonance profile is stored and updated across sessions** — user account model and session persistence are product infrastructure decisions.
- **How resonance shifts over time** — a user who needed permission content during a difficult period may need reframe content six months later. Dynamic profile updating is a future design problem.
- **Conflict between resonance and state needs** — a user who would prefer a direct/challenging voice but whose emotional state actually requires permission content first. Handling this gap is an intake and presentation design problem.
- **Resonance at the sub-source level** — for multi-guest shows (Tim Ferriss, Modern Wisdom), resonance type varies by guest, not by show. Episode-level and guest-level tagging handles this; the intake flow does not need to know which show an insight came from.

---

## When to Revise This Document

- When real user engagement data reveals patterns in which insight types and voice registers land for specific user profiles
- When intake flow design reveals a more reliable detection signal than the proxies described above
- When the corpus reaches a size where resonance-stratified retrieval experiments are feasible
- When new source types introduce voice registers not covered by the five defined here
