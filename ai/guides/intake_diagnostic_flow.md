# Silhouette — Component 4: Intake / Diagnostic Flow

> **Summary:** This document defines how Silhouette takes a vague user input — "I feel stuck," "I don't know what I want," "nothing feels right" — and converts it into a structured retrieval query that Component 3 (Retrieval Philosophy) can use. It specifies the user-facing input experience, the internal state classification logic, the confidence scoring model, the clarifying question strategy, the resonance signal capture approach, safety and scope routing, the full RetrievalQuery object produced, and how the intake changes across sessions. It does not specify UI implementation, production code, a classifier architecture, or final legal/safety copy. It is the design layer between what the user says and what the retrieval engine receives.

> **How to use this document:** Read after `user_problem_model.md`, `user_resonance_model.md`, and `retrieval_philosophy.md`. The state taxonomy, confidence model, resonance dimensions, and query structure defined in those documents are the inputs this component works from. Every design decision here is traceable back to those documents or forward to the retrieval engine's needs. If a design choice in this document cannot be traced to either, question it.

---

## 1. Purpose and Scope

### What This Component Is

Intake / Diagnostic Flow is the interaction layer that takes unstructured, emotionally-charged user language and converts it into a structured, retrieval-ready signal. It is the bridge between what the user can articulate in the moment and what the retrieval engine needs to find a well-matched insight.

Concretely, this component defines:

- The exact prompt the user sees when they open Silhouette
- How the system interprets and classifies what the user writes
- How the system decides whether it has enough signal to retrieve or needs to ask more
- What the one clarifying question looks like, when it appears, and why
- How early resonance signals are captured from the user's language
- How inputs outside Silhouette's intended scope are identified and routed
- The full `RetrievalQuery` object produced at the end of intake — what goes into the retrieval engine

### What This Component Is Not

- **Not the retrieval engine.** Intake produces the query. Retrieval executes it. These are separate components.
- **Not the corpus or ingestion system.** This component does not touch the content library.
- **Not the final UI design.** This document defines information architecture and interaction logic, not visual design or front-end implementation.
- **Not a therapy intake form.** The user is asked one open prompt. If needed, one clarifying question. Not a structured assessment, a questionnaire, or a clinical screening.
- **Not a full personality profile.** Intake captures what is needed to retrieve well today. It does not attempt to fully understand who the user is across all contexts and times.

### Where This Component Sits in the Architecture

```
User Problem Model     →  defines the six stuck states and their distinguishing signals
User Resonance Model   →  defines insight types and voice registers
Retrieval Philosophy   →  defines the RetrievalQuery structure intake must produce
        ↓
[Component 4: Intake / Diagnostic Flow] ← you are here
        ↓
Retrieval Engine       →  receives the RetrievalQuery and executes matching
        ↓
(future) User Profile / Personalization  ←  receives feedback and session signals from intake
(future) Response Presentation           ←  receives the intake context to frame the result
```

Every decision in this document is constrained above by the state taxonomy, resonance model, and query schema — and constrained below by what the retrieval engine needs to function. If a design choice adds burden to the user without improving the RetrievalQuery, it is wrong. If a design choice improves the user's experience but leaves the query underdetermined, it is also wrong.

---

## 2. Design Principles

These principles govern every specific decision in this document. When a later section makes a choice that seems surprising, it is traceable to one of these.

### 1. Ask only what is needed to retrieve well.
Every question asked of the user must have a direct effect on the RetrievalQuery. If the answer would not change which insight is retrieved, the question should not be asked. This is the strongest filter on over-questioning.

### 2. Do not make the user feel diagnosed.
The intake experience should feel like being understood by a smart person who is paying attention, not like filling out a form or being screened by a system. Questions should feel like natural follow-up, not clinical assessment.

### 3. Prioritize present state over full biography.
Silhouette needs to know what is true right now — what the user is experiencing today — not who they are, what they have tried, or what their five-year goals are. Present-state signals are retrieval signals. Biographical context is not.

### 4. One good clarifying question is better than three adequate ones.
A single precisely-targeted question that resolves genuine ambiguity is more valuable than three broader questions. The clarifying question design should optimize for precision, not coverage.

### 5. Intake should feel like being understood, not screened.
The difference between a good clarifying question and a bad one is often this: a bad question feels like the system is collecting information. A good question feels like the system has already been listening and wants to understand one more thing.

### 6. Classify carefully, not overconfidently.
State classification from 2–3 sentences is inherently uncertain. The system should represent that uncertainty accurately rather than committing to a state with false confidence. Moderate confidence with a clarifying question produces better retrieval than high-confidence misclassification.

### 7. Ambiguity should trigger clarification, not a guess.
When two states are genuinely indistinguishable from the initial input, ask. When the corpus is small and the wrong state produces a useless result, ask. Guessing at moderate confidence is appropriate for retrieval. Guessing at low confidence is a retrieval failure.

### 8. Safety and scope routing happen before retrieval — always.
No input proceeds to retrieval until it has passed a safety check. This is non-negotiable and cannot be deferred.

### 9. Resonance is a hypothesis in the first session.
A single intake message carries weak resonance signal. Treat first-session resonance as a hypothesis worth testing, not a truth to commit to. The state-default resonance profiles from Component 3 exist precisely because first-session resonance inference is unreliable.

### 10. User burden should stay minimal.
The total time from opening Silhouette to receiving an insight should be under two minutes. Intake takes 30–45 seconds. Anything that extends this without a proportional retrieval quality gain is wrong.

### 11. Preserve trust by admitting uncertainty.
If the system cannot confidently classify, say so through the clarifying question — not by returning a weakly-matched insight as if confident. Users trust a system that acknowledges what it doesn't know over one that guesses silently.

### 12. Spare input is a signal, not a failure.
When a user writes only two words ("feeling stuck"), that is not a failure state. It is a signal about their current capacity and emotional posture. The system should respond with gentleness and a prompt for more — not an error or a forced re-entry.

### 13. The intake must be designed backward from retrieval.
Every element of the intake experience — the prompt, the classification logic, the clarifying question, the resonance capture — exists to produce a better RetrievalQuery. Design forward from the user experience but validate backward from what retrieval needs.

---

## 3. Intake Journey Overview

### The Ideal First-Session Flow

```
1. User sees the intake prompt
2. User writes 2–3 sentences about what feels stuck or off
3. System runs safety/scope check (always first)
   → If safety flag: route immediately to safety response — no retrieval
   → If out of scope: route to gentle scope redirect — no retrieval
   → If borderline: proceed with caution; note in safety_flag
4. System runs initial state classification
   → Produces: detected_state, state_confidence, secondary_possible_states, evidence
5. System determines confidence level:
   → High confidence: proceed to resonance capture and query construction
   → Moderate confidence: proceed to clarifying question
   → Low confidence / too sparse: ask for more context before classification
6. If clarifying question is warranted:
   → Ask the pair-specific disambiguation question (or context expansion prompt)
   → Capture the user's answer
   → Re-run classification with combined input
7. System captures weak resonance signals from language and clarifying answer
8. System constructs RetrievalQuery
9. Retrieval engine runs
10. Result is presented to the user
11. User sees "did this land?" prompt
12. Response (positive/negative/no response) is logged for future sessions
```

### What Happens in Each Session Type

| Session Type | Input Available | Intake Behavior |
|---|---|---|
| **First session** | No profile, no history | Full intake: classify, maybe clarify, infer resonance from language, apply state defaults |
| **Later session, same user** | State history, prior feedback | Use prior resonance signals; fewer clarifying questions; exclude seen SIOs |
| **Returning user after long gap (>30 days)** | Profile but possibly stale | Run full intake again — state may have changed; profile informs resonance, not state |
| **Sparse input** | Only 2–5 words | Ask for more context before classification; do not guess on insufficient signal |
| **Ambiguous input (two competing states)** | 2–3 sentences, state unclear | Ask one pair-specific clarifying question |
| **Safety/out-of-scope input** | Any length | Route before retrieval — no classification, no query construction |

### Decision Tree Summary

```
User input
    │
    ▼
Safety check
    ├── Triggers safety bypass → safety response (end)
    ├── Out of scope → scope redirect (end)
    └── In scope → proceed
                    │
                    ▼
              State classification
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
        High     Moderate     Low
      confidence confidence  confidence
          │         │          │
          ▼         ▼          ▼
      Proceed   Ask one     Ask for
      to query  clarifying  more context
      build     question    first
                    │          │
                    └────┬─────┘
                         ▼
                 Re-classify with
                 combined input
                         │
                         ▼
              Resonance capture
                         │
                         ▼
              RetrievalQuery construction
                         │
                         ▼
                    Retrieval
```

---

## 4. User Input Design

### The Core Design Problem

The first prompt the user sees must accomplish three things simultaneously:
1. Invite honest, specific, present-moment description
2. Not feel clinical, therapeutic, or formal
3. Not feel so vague that the user doesn't know what to write

This is harder than it sounds. "How are you feeling?" is too therapy-adjacent. "Describe your career situation" is too narrow. "What's going on?" is too open. The best prompt sits at the intersection of emotional safety and useful specificity.

### Recommended Prompts

**Default prompt (recommended for MVP):**

> What's been feeling stuck or off lately? Write a few sentences — don't worry about making it perfect.

**Why this works:**
- "Lately" anchors to present state without asking for history
- "Stuck or off" maps to the target emotional register without being clinical
- "A few sentences" gives a soft length expectation without being prescriptive
- "Don't worry about making it perfect" lowers the vulnerability barrier

---

**Shorter version (for mobile/compact contexts):**

> What's been feeling off? Tell me in a few sentences.

---

**Warmer version (for users who seem hesitant):**

> A lot of people in your situation find it hard to even put this into words. Just describe what's been feeling stuck or wrong lately — a few sentences is enough. There's no right answer.

---

**More direct version (for contexts where speed matters):**

> Describe what's been feeling stuck. What's the situation? What have you tried? What feels like the right next thing but isn't happening?

---

### Examples of Good User Input

| Input | Why It's Good | Expected Classification |
|---|---|---|
| "I got promoted six months ago and it feels hollow. I keep waiting to feel satisfied and it doesn't come. I don't know what I'm supposed to want now." | Present state, specific trigger, names the experience accurately | Direction Collapse / post-achievement, High confidence |
| "I love what I do on paper but I feel zero energy for it anymore. I used to stay late because I wanted to. Now I'm watching the clock." | Clear before/after contrast, emotional language, no crisis signals | Engagement Drought, High confidence |
| "I know I need to leave this job. I've known for two years. Every week I tell myself this is the week and then nothing happens." | Explicit naming of the know-do gap, timeline, self-frustration | Inaction Loop, High confidence |
| "I have like five different things I keep going back and forth on — a side project, a career change, moving cities, going back to school. I'm paralyzed." | Multiple options named explicitly | Possibility Paralysis, High confidence |
| "My friend just got promoted to director and I felt genuinely sick about it. I don't want her job. I just feel like I should be doing more with my life." | Comparison trigger named, recent event, explicit self-awareness | Momentum Gap or Direction Collapse, Moderate confidence — needs clarification |

### Examples of Sparse or Difficult Input

| Input | Problem | System Response |
|---|---|---|
| "I feel stuck." | Too sparse to classify | Expand prompt: "Can you tell me a bit more about what's been feeling stuck or off?" |
| "idk just everything" | Emotionally vague, no specifics | Same — ask for more context gently |
| "my life sucks" | Could be distress, could be venting | Gentle scope check + ask for more before classifying |
| "I'm tired all the time" | Physical could indicate clinical issue | Borderline safety/scope check; light clarification about what kind of tired |
| "I want a new job" | Task-oriented, not emotional/situational | Rephrase to understand the underlying stuck state: what's happening with the current one? |
| "help" | Single word, possibly distress | Safety check first; then expand prompt gently |

### The No-Judgment Frame

The intake should never feel like the user can give a "wrong" answer. Every variation of input — sparse, vague, emotional, over-detailed — has a defined system response. There is no failure state for the user. There are only different paths through the intake flow.

---

## 5. Required Intake Signals

These are the signals intake must attempt to capture before constructing a RetrievalQuery. They are organized by type. For each, the table specifies why it matters, how it is captured, and whether it belongs to the MVP or to future personalization.

### A. State Signals

What kind of stuck is this, specifically?

| Signal | Why It Matters | How Captured | Ask or Infer | MVP or Future |
|---|---|---|---|---|
| **Primary stuck state** | The primary retrieval filter — without this, retrieval returns topically adjacent content, not state-appropriate content | Inferred from full intake text using classification logic (Section 6) | Inferred silently; confirmed via clarifying question if low/moderate confidence | MVP |
| **State confidence level** | Determines whether to retrieve, ask, or expand context | Produced by classification logic alongside state detection | Internal | MVP |
| **Variant signal** | For Direction Collapse: is this post-achievement flatness or original directionlessness? Changes which SIOs rank highest | Inferred from whether a specific prior goal is named | Infer; ask only if retrieval quality depends on it | MVP-Recommended |
| **Trigger vs. chronic** | Distinguishes Direction Collapse from Momentum Gap; affects resonance and framing | Look for time-bound language ("since," "after," "last week") vs. generalized present tense | Infer; clarifying question for DC/MG ambiguity | MVP |

### B. Confidence Signals

How certain is the classification?

| Signal | Why It Matters | How Captured | Ask or Infer | MVP or Future |
|---|---|---|---|---|
| **Classification confidence (high/moderate/low)** | Determines intake path — retrieve, clarify, or expand | Internal output of classification logic | Internal | MVP |
| **Secondary possible states** | Needed for moderate-confidence retrieval (70/30 weighting across states) | Internal — other states considered before the top state was selected | Internal | MVP |
| **Ambiguity type** | Which pair of states is confusable — determines which clarifying question to ask | Internal — derived from the competing state pair | Internal | MVP |

### C. Resonance Signals

What form of insight is likely to land?

| Signal | Why It Matters | How Captured | Ask or Infer | MVP or Future |
|---|---|---|---|---|
| **Language register (analytical vs. emotional)** | Weak proxy for insight type preference | Inferred from vocabulary, sentence structure, presence of "I feel" vs. "I think/understand/keep doing" language | Infer silently | MVP |
| **Emotional posture (frustrated, exhausted, self-critical, open)** | Informs voice register exclusion (e.g., don't serve direct/challenging to a self-critical user) | Inferred from tone markers and self-referential language | Infer silently | MVP |
| **Possible preferred insight_type** | Adjusts resonance filter in retrieval | Inferred from language register + emotional posture | Infer as weak hypothesis | MVP |
| **Possible preferred voice_register** | Adjusts resonance filter in retrieval | Inferred from tone markers | Infer as weak hypothesis; use state defaults if unclear | MVP |
| **Registers to exclude** | Hard exclusion — prevents a register that could feel hostile or dismissive | Inferred from fragility/self-critical signals | Infer; apply conservatively | MVP |
| **Resonance confidence** | How reliable the resonance inference is | Assessed as part of resonance capture (Section 9) | Internal | MVP |
| **Explicit resonance preference** | Direct user preference (e.g., "I want something challenging") | Explicitly stated in the input or clarifying answer | Ask only if stated, or in future via explicit prompt | Future |

### D. Context Signals

What situational context helps?

| Signal | Why It Matters | How Captured | Ask or Infer | MVP or Future |
|---|---|---|---|---|
| **Career/purpose/identity framing** | Confirms in-scope; may inform sub-state tagging | Inferred from domain vocabulary | Infer | MVP |
| **Chronic vs. recent trigger** | Disambiguates Direction Collapse from Momentum Gap; also affects intensity calibration | Look for event language ("since," "after," "when," "last month") vs. general present-tense | Infer; ask if DC/MG ambiguity | MVP |
| **Has user tried to solve it?** | Signals Inaction Loop when user explicitly names things they've read, planned, or tried | Named in input ("I've read everything," "I've made the plans," "I've had this conversation with myself") | Infer from input text | MVP |
| **Severity/duration** | How long has this been going on? Affects intensity calibration | Inferred from language like "for years," "lately," "just happened" | Infer | MVP |
| **Specific named goal or target** | Presence indicates Engagement Drought; absence indicates Direction Collapse | Explicit naming of a job, project, or goal | Infer | MVP |

### E. Safety and Scope Signals

What inputs should not proceed to retrieval?

| Signal | Category | Action |
|---|---|---|
| Explicit self-harm or suicidal ideation language | Safety — Tier 1 | Immediate safety bypass; no retrieval |
| Language suggesting acute crisis | Safety — Tier 1 | Immediate safety bypass; no retrieval |
| Signs of abuse, violence, or emergency situation | Safety — Tier 1 | Immediate safety bypass; no retrieval |
| Clinical depression indicators beyond rut/low motivation | Safety — Tier 2 | Safety response + resource; no retrieval |
| Grief, loss, or trauma processing | Safety/Scope — Tier 2 | Gentle scope acknowledgment + redirect; may offer limited Silhouette scope if Identity Transition relevant |
| Medical, legal, or financial high-stakes requests | Scope — out of range | Scope redirect; no retrieval |
| Requests for diagnosis or therapy | Scope — out of range | Scope redirect + professional resource |
| Relationship crisis or interpersonal conflict | Scope — out of range | Scope redirect; note what Silhouette can address |
| Requests for a specific person/source by name | Edge case | Route to retrieval with source preference noted; if source not in corpus, acknowledge |
| General life questions not related to career/purpose/motivation | Scope — borderline | Gentle redirect to Silhouette's focus area |

### F. Retrieval Constraint Summary

The full set of retrieval signals that intake must produce before handing off to the retrieval engine. This is the target schema — see Section 11 for the full RetrievalQuery definition.

| Signal | Source | Required |
|---|---|---|
| detected_state | State classification | Required |
| state_confidence | State classification | Required |
| secondary_possible_states | State classification | Required |
| variant_signal | State classification | Optional |
| preferred_insight_type | Resonance inference | Optional |
| preferred_voice_register | Resonance inference | Optional |
| excluded_voice_registers | Safety/resonance inference | Optional |
| intensity_preference | Context signals | Optional |
| safety_flag | Safety check | Required |
| scope_status | Scope check | Required |

---

## 6. State Classification Logic

This section defines, for each stuck state, what the classifier should look for in raw user input. It is written to be specific enough that a future LLM-based classifier can use it as a classification prompt or fine-tuning reference. It does not specify implementation — it specifies the logic.

### Classification Output Format

Before state-by-state detail, define the output structure:

```
{
  detected_state: "direction-collapse" | "engagement-drought" | "inaction-loop" | 
                  "possibility-paralysis" | "identity-transition" | "momentum-gap" | null,
  state_confidence: "high" | "moderate" | "low",
  secondary_possible_states: [ ... ],
  classification_reason: "brief explanation in 1-2 sentences",
  evidence_for: [ "specific phrases or signals that support this state" ],
  evidence_against: [ "signals that might weaken this classification" ],
  needs_clarification: true | false,
  clarification_target: "which pair needs disambiguation, or null",
  variant_signal: "post-achievement" | "original" | null   // Direction Collapse only
}
```

---

### State 1: Direction Collapse

**Core question:** Has the user lost the sense of what they're building toward?

**Primary language patterns:**
- "I don't know what I want"
- "I've hit the thing I was working toward and I feel nothing"
- "I feel like I'm living someone else's life"
- "Everyone seems to have it figured out"
- "I don't know what I'm building toward"
- "I feel like I should be further along but I don't know further along toward what"
- "I'm doing fine but something is missing"

**Emotional posture:** Quiet confusion, mild disorientation, existential flatness. Not angry, not in crisis. More "empty" than distressed.

**Distinguishing signals:**
- No specific goal, project, or role is named as the target
- The discomfort feels chronic and gradual, not triggered by a specific event
- Uses "I don't know what I want" language, not "I can't feel what I want"

**Variant detection:**
- *Post-achievement:* A specific milestone is named ("I got the promotion," "I graduated," "I hit my income goal") followed by feeling flat. Language: "I reached it and..."
- *Original:* No milestone named; the user has simply never had a clear pull. Language: "I've never really known," "everyone else seems to have a direction."

**Common confusion with adjacent states:**
- vs. Engagement Drought: Look for whether a specific target still exists. If yes (user says "I have a job and I should care about it but I don't"), it's likely Engagement Drought. If no specific target is present, Direction Collapse.
- vs. Possibility Paralysis: Direction Collapse = absence of options. Paralysis = abundance of options. Look for whether multiple possibilities are named.
- vs. Momentum Gap: Look for a recent trigger. If the comparison feeling arose from a specific event ("my friend just got promoted"), lean Momentum Gap. If it's chronic, lean Direction Collapse.
- vs. Identity Transition: Direction Collapse has no clear triggering event. Identity Transition does. Ask: "did something specific happen?"

**Evidence that increases confidence:**
- "I don't know what I want" appears directly
- No specific goal or project mentioned
- "I used to know but now I don't" (post-achievement variant)
- Chronic language ("for a while," "lately," "at some point") with no specific trigger
- "Everyone else seems to know" (Direction Collapse, not Momentum Gap, when not event-triggered)

**Evidence that lowers confidence:**
- A specific job, project, or goal is named (suggests Engagement Drought instead)
- A specific recent event is named (suggests Momentum Gap or Identity Transition instead)
- Multiple options are listed (suggests Possibility Paralysis instead)

---

### State 2: Engagement Drought

**Core question:** Does the user still have a target but has lost the feeling of caring about it?

**Primary language patterns:**
- "I used to love this, now I feel nothing"
- "I'm going through the motions"
- "I know I should care but I don't"
- "I'm performing but not growing"
- "It's like a motivation drought"
- "I peaked early"
- "I have energy for things that excite me but nothing excites me"

**Emotional posture:** Flat, grey, slightly exhausted. Not angry. The frustration, if present, is passive — more resignation than frustration.

**Distinguishing signals:**
- A specific job, role, or target is named OR clearly implied by context
- The problem is not absence of direction but absence of feeling toward a direction that exists
- "I know what I should want but I can't feel it" — not "I don't know what I want"
- The flatness is chronic, not spike-triggered

**Common confusion with adjacent states:**
- vs. Direction Collapse: The critical question is whether a target exists. Engagement Drought users still have a target; they just can't feel it. Ask: "Is there a specific thing you're working toward right now, even if it doesn't feel meaningful?"
- vs. Inaction Loop: Engagement Drought users are not frustrated by their own inaction — the pull to do something specific is gone. Inaction Loop users feel the pull but are blocked from acting.
- vs. Momentum Gap: Engagement Drought is internal and chronic. Momentum Gap is externally triggered and transient. Look for a comparison event.

**Evidence that increases confidence:**
- A specific role, job, or goal is named
- "I used to" + positive description + "now" + flat description
- "going through the motions" language
- No mention of a recent comparison event
- Language about time passing ("3 years in," "since I've mastered the job")

**Evidence that lowers confidence:**
- No specific target mentioned (suggests Direction Collapse)
- A comparison to others is the primary trigger (suggests Momentum Gap)
- User mentions multiple things they could pursue (suggests Possibility Paralysis)

---

### State 3: Inaction Loop

**Core question:** Does the user know what they should do but keep not doing it?

**Primary language patterns:**
- "I know exactly what I need to do and I'm not doing it"
- "I've been having this conversation with myself for two years"
- "I've read all the books, I know what to do, nothing changes"
- "I keep starting and stopping"
- "I'm scared or lazy, I can't figure out which"
- "There's a version of myself I'm trying to become"
- "I don't know if I'm serious about this"

**Emotional posture:** Active frustration. Self-critical. Tired of their own pattern. More frustrated than sad. Often uses self-judgment language ("I'm lazy," "I'm not serious," "something's wrong with me").

**Distinguishing signals:**
- One specific thing is named or clearly implied as the thing not being done
- The language is "I'm not doing it" not "I don't know what to do"
- Self-awareness about the gap is explicit: the user can name the thing they're avoiding
- Often accompanied by history of attempts: "I've tried before," "I've been planning this"

**Common confusion with adjacent states:**
- vs. Possibility Paralysis: Inaction Loop = one specific thing named. Paralysis = multiple things, unclear which is real. The key question: "Can you name the one thing you most feel like you should be doing?" Inaction Loop users name it immediately. Paralysis users list several or deflect.
- vs. Engagement Drought: Inaction Loop users are motivated — they feel the pull of the thing they're avoiding. Engagement Drought users have lost the pull entirely.
- vs. Direction Collapse: Inaction Loop users have a specific thing. Direction Collapse users don't.

**Evidence that increases confidence:**
- A specific action, project, or change is named
- "I know" + "but" + "I'm not"
<!-- - History of non-starts or repeated deferrals -->
- Self-judgment language about following through
- "I've read/listened/planned/mapped it out" — signals knowledge without action

**Evidence that lowers confidence:**
- Multiple things are listed without one being primary (suggests Possibility Paralysis)
- No specific thing is named at all (suggests Direction Collapse or Engagement Drought)
- Language is about feeling nothing rather than not doing something (suggests Engagement Drought)

---

### State 4: Possibility Paralysis

**Core question:** Does the user have multiple real options and can't choose among them?

**Primary language patterns:**
- "I have a list of things I could pursue and I'm not doing any of them"
- "I don't know which idea is real and which are just distractions"
- "Every time I get close to committing, I think of something else"
- "I keep going back and forth"
- "I want to do all of them and I'm doing none"

**Emotional posture:** Anxious, scattered, crowded. Unlike Direction Collapse (which feels empty), Possibility Paralysis feels full and stuck at the same time. Often frustrated at the irony of having options but feeling unable to move.

**Distinguishing signals:**
- Multiple options are named explicitly
- The language centers on choosing, not starting
- "I don't know which one" is the operative phrase — not "I don't know what I want"
- Often present in users with high ambition and broad capability

**Common confusion:**
- vs. Inaction Loop: Both involve not acting. The distinction: Possibility Paralysis users can't name one clear thing; Inaction Loop users can name it immediately.
- vs. Direction Collapse: Direction Collapse has no options (empty). Possibility Paralysis has too many (crowded). The emotional texture is opposite.

---

### State 5: Identity Transition

**Core question:** Did a specific external change remove a prior organizing structure?

**Primary language patterns:**
- "I went through [a breakup / leaving a job / a move / a health scare]"
- "I don't know who I am on the other side"
- "The thing that used to organize my life is gone"
- "I feel like I've become someone smaller"
- "I know I'm supposed to be in chapter two but I can't see it"

**Emotional posture:** Disoriented, slightly lost, not in acute crisis but unmoored. A quality of aftermath — the event has passed but the reorganization hasn't happened.

**Distinguishing signals:**
- A specific triggering event is named (or strongly implied)
- The language is about identity, not about motivation or direction specifically
- Time since the event matters: typically 3–12 months after, not immediately

**Common confusion:**
- vs. Direction Collapse: Identity Transition has a clear event. Direction Collapse is gradual. Ask: "Did something specific happen that started this?"

---

### State 6: Momentum Gap

**Core question:** Was the feeling triggered by a specific comparison to peers?

**Primary language patterns:**
- "My friend just [got promoted / started a company / moved abroad]"
- "I feel behind everyone"
- "I don't want their life, I want that feeling of going somewhere"
- "It feels like everyone got a roadmap except me"
- Heavy social media / LinkedIn context implied

**Emotional posture:** A spike of comparison-driven anxiety, often mixed with genuine ambition. Not chronic. Triggered by a specific event or piece of information.

**Distinguishing signals:**
- A specific comparison event is named or strongly implied
- The feeling is recent and reactive, not chronic
- The user explicitly contrasts their situation to others

**Common confusion:**
- vs. Direction Collapse: Both can involve "everyone else seems to know what they want." The distinction is whether it's a spike (Momentum Gap) or a chronic state (Direction Collapse).

---

### Confusion Pairs — Disambiguation Reference

| Pair | Distinguishing Question | Signal A (State 1) | Signal B (State 2) |
|---|---|---|---|
| **Direction Collapse vs. Engagement Drought** | "Is there a specific thing you're working toward, even if it doesn't feel meaningful?" | No specific target named | A specific target exists but feels flat |
| **Direction Collapse vs. Momentum Gap** | "Is this something you've been feeling for a while, or was it triggered by something specific recently?" | Chronic; no specific trigger | Specific event triggered it |
| **Direction Collapse vs. Possibility Paralysis** | Count options named | Zero options; emptiness | Multiple options; crowded |
| **Inaction Loop vs. Possibility Paralysis** | "If you had to name the one thing you most feel like you should be doing right now, could you?" | Names it immediately | Lists several or deflects |
| **Engagement Drought vs. Momentum Gap** | "Has this been a background feeling for a while, or did something specific bring it up?" | Chronic; internal | Recent comparison event |
| **Identity Transition vs. Direction Collapse** | "Did something specific happen that started this feeling — a change, an ending, a loss?" | Specific event named | No event; gradual drift |
| **Momentum Gap vs. Inaction Loop** | Presence of comparison language vs. frustrated self-knowing | "Everyone else is going somewhere" | "I know what I need to do and I'm not doing it" |

---

## 7. Confidence Scoring

Confidence is not a probability — it is a routing decision. Define it operationally by what behavior it triggers, not abstractly.

### High Confidence

**Criteria:**
- One state is clearly indicated by multiple distinct signals
- None of the common confusion pairs apply
- The user has provided enough context to distinguish this state from adjacent ones
- The input is not sparse

**Indicators:**
- Multiple language patterns from one state definition are present
- The emotional posture matches the expected texture of the detected state
- No competing state's signals are present
- Specific detail is provided (a named goal, a named event, a named action not taken)

**Action:** Proceed directly to resonance capture and query construction. No clarifying question required.

**Example:** "I know I need to leave this job. I've known for two years. Every week I tell myself I'll do something and nothing happens." → Inaction Loop, high confidence. Multiple signals: "I know," "I'm not doing it," timeline of non-starts, self-awareness about the pattern.

---

### Moderate Confidence

**Criteria:**
- One state is the most likely interpretation
- One alternative state is plausible from the same input
- A single clarifying question would resolve the ambiguity with high probability
- The input is not sparse — it contains enough content to classify, just not enough to disambiguate

**Indicators:**
- One confusion pair applies (see Section 6)
- The user uses language that could map to either state
- The emotional posture is somewhat consistent with both candidate states
- A specific detail that would disambiguate is absent

**Action:** Ask one pair-specific clarifying question. Use the answer to re-classify. Proceed to query construction after.

**Example:** "I feel like I should be doing more with my life. Everyone around me seems to have figured something out. I don't know what I'm actually building toward." → Direction Collapse vs. Momentum Gap, moderate confidence. Comparison language is present, but whether it's event-triggered or chronic is unclear.

---

### Low Confidence

**Criteria:**
- Input is too sparse to classify
- Input could plausibly map to three or more states
- Emotional language is present but no situational specifics
- The user has written something genuinely ambiguous across the full taxonomy

**Indicators:**
- Input is 10 words or fewer
- No situational specifics (no job/goal/event/action mentioned)
- Pure emotional description only ("I feel lost," "nothing feels right," "I'm tired of everything")
- Three or more states are plausible from the input

**Action:** Do not attempt state classification. Do not ask a clarifying question yet. Ask for more context with a single expansion prompt: *"Can you tell me a bit more about what's been feeling stuck or off?"* Use the expanded input to attempt classification before asking a targeted clarifying question.

**Example:** "I feel stuck." → Low confidence. Multiple states are plausible. Ask for more context before any disambiguation.

---

### Confidence → Action Routing

| Confidence | Primary Action | Secondary Action |
|---|---|---|
| **High** | Proceed to query construction | None required |
| **Moderate** | Ask one clarifying question | Re-classify; proceed to query construction |
| **Low (sparse)** | Ask for more context | Re-classify; if still moderate, ask one clarifying question |
| **Safety flag** | Bypass all classification | Route to safety response |
| **Out of scope** | Scope redirect | No retrieval |

---

## 8. Clarifying Question Strategy

### When to Ask

Ask a clarifying question when:
- State confidence is Moderate (one state likely, one plausible alternative)
- A specific pair-specific question exists for the ambiguous pair
- The answer would meaningfully change the RetrievalQuery (detected_state, variant_signal, or resonance signals)

### When NOT to Ask

Do not ask a clarifying question when:
- Safety flag is triggered (route immediately)
- State confidence is High (unnecessary friction)
- The user's input signals emotional exhaustion or very low capacity ("I'm so tired," "I can't even explain it") — proceed with moderate-confidence retrieval rather than adding burden
- The confusion can be resolved by retrieval strategy alone (the 70/30 weighting for moderate confidence may be sufficient)
- The clarifying question would feel like a repeat of the original prompt
- The input is too sparse — expand first, then consider clarifying

### Rules for a Good Clarifying Question

**Structural rules:**
1. One question only — never compound questions ("Do you feel X, or is it more Y?")
2. Easy to answer — short answer expected, not an essay
3. Not clinical — no medical, diagnostic, or therapy-adjacent framing
4. Does not make the user repeat themselves — it should feel like the system heard the first input
5. Has a direct effect on the RetrievalQuery if answered either way

**Tone rules:**
1. Sounds like the system understands and wants to understand one more thing
2. Avoids "why" questions — they invite defensiveness and over-explanation
3. Is specific enough to be useful, not generic enough to apply to any stuck state
4. Acknowledges what was said before asking more

**Example of what acknowledgment sounds like:** "It sounds like you've been feeling flat about your work for a while." — this shows the system heard the input before asking more.

---

### Pair-Specific Clarifying Questions

These are the recommended clarifying questions for each major confusion pair. Each question is designed to have clear divergent answers that map to different state classifications.

#### Direction Collapse vs. Engagement Drought

**Decision to make:** Does a specific target still exist (Engagement Drought), or has the target itself dissolved (Direction Collapse)?

**Recommended question:**
> "Is there a specific goal, role, or project you're still working toward — even if it doesn't feel meaningful right now?"

**Interpretation:**
- Yes → Engagement Drought (they have a target; the feeling toward it is flat)
- No → Direction Collapse (no active target; the direction itself is missing)
- "I guess, but..." → likely Engagement Drought; the "but" confirms the target exists but feels hollow

**Bad question to avoid:**
> "Do you feel unmotivated or directionless?" — too binary, maps too directly to the state names, doesn't give the user a meaningful way to self-report

---

#### Direction Collapse vs. Momentum Gap

**Decision to make:** Is this a chronic state (Direction Collapse) or a spike triggered by a specific comparison (Momentum Gap)?

**Recommended question:**
> "Has this been something you've been feeling in the background for a while, or did something specific bring it up recently?"

**Interpretation:**
- "For a while" / "I've felt this for months/years" → Direction Collapse
- "Well, recently my friend..." / "After I saw..." → Momentum Gap
- Mixed answers → lean Direction Collapse; Momentum Gap is transient by definition and if the feeling persists beyond the event, it was likely already present

---

#### Direction Collapse vs. Possibility Paralysis

**Decision to make:** Is this an absence of options (empty) or an abundance of options (crowded)?

**Recommended question:**
> "When you think about what's next, do you feel like there's nothing you want to pursue, or more like there are things you want to do but can't pick one?"

**Interpretation:**
- "Nothing I want" → Direction Collapse
- "Things I want but can't pick" → Possibility Paralysis
- "Both" → probably Direction Collapse; genuine Possibility Paralysis users tend to be able to name the options

---

#### Inaction Loop vs. Possibility Paralysis

**Decision to make:** Can the user name one specific thing they feel they should be doing?

**Recommended question:**
> "If you had to name the one thing you most feel like you should be doing right now — is there one that comes to mind?"

**Interpretation:**
- Names it clearly and quickly → Inaction Loop (they know; they're just not doing it)
- Lists several, hedges, says "that's the problem" → Possibility Paralysis
- Says "no" → may be Direction Collapse or Engagement Drought, not Inaction Loop or Paralysis

---

#### Engagement Drought vs. Momentum Gap

**Decision to make:** Is the motivation flatness chronic and internal, or triggered by a recent comparison?

**Recommended question:**
> "Has this feeling of flatness been there in the background for a while, or did something — like seeing where someone else is — kind of surface it?"

**Interpretation:**
- "Been there for a while" → Engagement Drought
- "Surfaced by something" → Momentum Gap (though if it was already present, Engagement Drought is still the underlying state)
- Hybrid → Engagement Drought is the primary state; Momentum Gap may be a secondary tag

---

#### Identity Transition vs. Direction Collapse

**Decision to make:** Was there a specific external event that changed things?

**Recommended question:**
> "Did something specific happen recently — a change, an ending, or a shift in your situation — that started this feeling, or has it been more of a slow drift?"

**Interpretation:**
- Specific event named → Identity Transition
- "A slow drift" / "I can't point to when it started" → Direction Collapse

---

#### Momentum Gap vs. Inaction Loop

**Decision to make:** Is the primary frustration about comparison to others, or about knowing what to do and not doing it?

**Recommended question:**
> "Is it more that you feel behind compared to where you think you should be, or more that you know what to do and you're not doing it?"

**Interpretation:**
- "Behind compared to where I should be / compared to others" → Momentum Gap
- "I know what to do and I'm not doing it" → Inaction Loop

---

### Examples of Good vs. Bad Clarifying Questions

| Context | Good Question | Why It's Good | Bad Question | Why It's Bad |
|---|---|---|---|---|
| DC/ED ambiguity | "Is there a specific goal or role you're still working toward, even if it doesn't feel meaningful?" | Binary answer; directly maps to the state distinction | "How long have you felt this way?" | Doesn't disambiguate the states |
| IL/PP ambiguity | "If you had to name one thing you feel like you should be doing, is there one that comes to mind?" | Names the exact diagnostic distinction | "What are you avoiding?" | Creates defensiveness; invites a list |
| DC/MG ambiguity | "Has this been a background feeling for a while, or did something specific surface it recently?" | Chronic vs. spike distinction is clean | "Are you comparing yourself to others?" | Leading question; also doesn't fully disambiguate |
| IT/DC ambiguity | "Did something specific happen that changed things, or has it been more of a gradual drift?" | Clean event vs. gradual distinction | "Are you going through a transition?" | Introduces clinical language |
| Generic low confidence | "Can you tell me a bit more about what's been feeling stuck or off?" | Non-leading; invites specificity | "Can you describe your emotional state in more detail?" | Clinical; over-formal |

---

## 9. Resonance Signal Capture

### The First-Session Problem

A single intake message — typically 2–5 sentences — carries weak resonance signal. Overcommitting to a resonance profile from one message is more likely to harm retrieval than help it. The goal in first-session resonance capture is:

1. Identify any strong signals that would justify adjusting the state default resonance profile
2. Identify any exclusions that could make a specific register actively harmful to the user
3. Default to the state resonance profile (Component 3, Section 7.5) when signals are weak or absent

Treat first-session resonance as a hypothesis, not truth.

### Two Resonance Dimensions to Capture

From the User Resonance Model:

**Insight Type:** mechanism · story · reframe · permission
**Voice Register:** direct/challenging · warm/affirming · intellectual/measured · vulnerable/personal · expert/scientific

### Implicit Resonance Inference (Infer from language — do not ask)

#### Insight Type Signals

| Language Pattern | Likely Preferred Type | Confidence |
|---|---|---|
| "I'm trying to understand why I keep doing this" / "I can't figure out why" | mechanism or reframe | Moderate |
| "I know exactly what I need to do and I'm not doing it" | permission (naming the loop) or story (someone who got out) | Moderate |
| "I've read everything about this / I've listened to all the podcasts" | story or direct challenge (more information won't help) | Moderate |
| "I just feel..." / "I don't know what's wrong with me" | permission or story | Moderate |
| Analytical, structured prose with causal language ("because," "which means," "the result is") | mechanism or reframe | Moderate |
| Fragmented, emotional, stream-of-consciousness writing | permission first, then story | Moderate |
| "I keep telling myself..." / "I know that I should..." | permission (naming the gap) | Moderate |

#### Voice Register Signals

| Language Pattern | Likely Register | Exclusion to Apply |
|---|---|---|
| Self-critical or ashamed tone ("I'm so lazy," "something is wrong with me," "I'm failing") | warm/affirming or vulnerable/personal FIRST | Exclude direct/challenging |
| Frustration directed outward ("I'm so sick of this," "I can't keep doing this") | direct/challenging may land | No exclusion; direct/challenging possible |
| Precise vocabulary, compound sentences, references to research or systems | intellectual/measured or expert/scientific | — |
| Emotionally raw, vulnerable self-disclosure | vulnerable/personal; warm/affirming | Exclude direct/challenging |
| Skeptical or resistant framing ("I know this sounds dumb but," "I've tried everything and nothing works") | intellectual/measured or reframe type | Avoid warm/affirming (may feel dismissive) |
| Burned-out, exhausted tone ("I'm just so tired," "I don't have energy for...") | permission (name that it's okay) | Exclude direct/challenging; exclude intense |

#### The Exclusion Principle

Voice register exclusion is more important than voice register preference in the first session. It is worse to serve a self-critical user a direct/challenging voice than to serve them a non-preferred warm/affirming one. When in doubt about preference, default. When sure about an exclusion, apply it.

**Default exclusions to apply conservatively:**
- Self-critical / ashamed tone → exclude `direct/challenging`
- Emotionally raw or fragile tone → exclude `direct/challenging`, set intensity to `mild` or `moderate`
- Expressed exhaustion → set intensity to `mild`

### Explicit Resonance Capture (MVP: do not ask)

For MVP, do not add an explicit resonance question to intake. The intake is already one prompt + (optionally) one clarifying question. Adding a resonance question would push total questions to three, which violates the user burden principle.

The one exception: if the user's clarifying question answer includes explicit voice or content preferences ("I want something that challenges me," "I want to hear from someone who's been through this," "I need scientific evidence not just motivation"), capture this as an explicit resonance preference.

Post-MVP, a lightweight resonance signal capture may be appropriate — a brief choice between two example insight styles ("Would you prefer something that challenges you, or something that helps you feel less alone?"). This is not MVP scope.

### Resonance Confidence Levels

| Level | Criteria |
|---|---|
| **High** | Two or more consistent signals pointing to the same type/register; no conflicting signals |
| **Moderate** | One clear signal, no clear exclusion; could be the state default |
| **Low / Unknown** | No clear signals, or signals conflict; apply state default resonance profile |

### Resonance Inference Examples

**Analytical user input:**
> "I keep trying to figure out what's wrong with me. I've structured my life well — the job, the apartment, the routine. And on paper everything is fine. But I feel like I'm missing something fundamental and I can't isolate what it is."

*Inference:* Analytical register (structured, uses "isolate," describes external situation precisely). Likely mechanism or reframe type. Likely intellectual/measured or expert/scientific register. No self-criticism or fragility markers — no exclusions.
*Confidence:* Moderate — consistent signals but one message only.
*Action:* Boost intellectual/measured and mechanism/reframe slightly over state default.

---

**Emotionally vulnerable user input:**
> "I don't even know how to explain this. I just feel like everyone around me has something going for them and I'm sort of just... here. I know that sounds dramatic but I've felt this way for so long I can't remember what it felt like to not."

*Inference:* Emotionally self-referential ("I feel," "I don't know how to explain"). Comparison language but chronic — Direction Collapse likely. Self-deprecating ("I know that sounds dramatic"). Permission or story type more likely than mechanism. Warm/affirming or vulnerable/personal register.
*Exclusion:* Exclude direct/challenging — self-deprecation signals this would feel like an attack.
*Confidence:* Moderate — clear emotional posture; single message.
*Action:* Apply permission or story type. Apply warm/affirming or vulnerable/personal. Hard exclude direct/challenging.

---

**Frustrated/direct user input:**
> "I've read every productivity book. I've listened to the podcasts. I've made the plans. I'm still not doing the thing. I'm so frustrated I can't even think straight. Just tell me what I need to hear."

*Inference:* High frustration, direct language, explicit statement of prior information consumption. "Just tell me what I need to hear" signals openness to direct challenge. Inaction Loop clear (high confidence). Story or direct challenge likely to land. Mechanism unlikely — they've already consumed explanations.
*Exclusion:* No strong exclusions — frustration is outward, not self-critical.
*Action:* Boost direct/challenging and story. No exclusions.

---

**Skeptical user input:**
> "I'm skeptical this will help but I'll try. I've been feeling like I should be doing something different with my career for two years but every time I get close to doing something, I retreat. I think I know the reasons but knowing them doesn't seem to help."

*Inference:* Intellectual register, explicit skepticism, already has self-awareness ("I think I know the reasons"). Inaction Loop likely. "Knowing doesn't help" signals that another mechanism insight may miss — story or permission more likely. Warm/affirming may feel too soft for their skeptical posture. Intellectual/measured or vulnerable/personal register.
*Action:* Story or permission type. Intellectual/measured register — matches their self-aware voice. Avoid warm/affirming.

---

**Burned-out user input:**
> "I'm just so tired. I don't even know where to start. Everything feels heavy and I can't remember the last time I felt excited about anything."

*Inference:* Exhaustion prominent. "Everything feels heavy" and "last time I felt excited" are potential borderline safety signals — check for clinical depression vs. Engagement Drought. If in scope: permission type first. Warm/affirming or vulnerable/personal register.
*Exclusion:* Exclude direct/challenging, set intensity to mild.
*Safety note:* This input warrants a light safety check — "everything feels heavy" combined with "last time I felt excited" may indicate more than typical Engagement Drought. If clinical distress signals multiply, route to safety response.
*Action:* If in scope → permission or story, warm/affirming, mild intensity.

---

## 10. Safety and Scope Handling

### Silhouette's Scope

Silhouette is designed for young professionals in career, purpose, and motivation ruts. It is not a therapist, a crisis service, a clinician, or a general-purpose chatbot. This scope must be enforced at the intake layer before any retrieval attempt.

The safety and scope system has three tiers.

---

### Tier 1 — Safety Bypass (hard stop, no retrieval)

**Trigger language includes:**
- Explicit suicidal ideation: "I don't want to be here anymore," "I've been thinking about ending it," "I can't see a reason to keep going"
- Self-harm language: "I've been hurting myself," "I keep thinking about hurting myself"
- Acute crisis: "I'm in danger," "someone hurt me," "I don't feel safe"
- Language that indicates clinical severity beyond rut/low motivation: "I haven't gotten out of bed in weeks," "I can't function anymore," "I've completely stopped eating/sleeping"

**System behavior:**
- Set `safety_flag = true` and `retrieval_mode = safety_bypass`
- Do not attempt classification
- Do not attempt retrieval
- Respond with care, acknowledgment, and a clear resource referral
- Do not dismiss the input or try to re-scope it to Silhouette's domain

**What the response must include:**
- Acknowledgment that what the user shared sounds serious
- Clear, non-clinical resource reference (e.g., 988 Lifeline, Crisis Text Line)
- No attempt to retrieve an insight
- No dismissal or minimization

**What the response must not include:**
- A retrieved insight from the corpus
- Any version of "Silhouette can help with X instead"
- Framing that sounds like a legal disclaimer
- Language that makes the user feel screened or rejected

---

### Tier 2 — Safety-Adjacent Response (respond with care + resource, no retrieval)

**Trigger patterns include:**
- Clinical depression signals: "I've been depressed for months," "my doctor says I have depression," "I've been on antidepressants"
- Grief or acute loss: "I just lost someone," "my [relationship/family member] died"
- Abuse or trauma: "I'm in a relationship that feels unsafe," "I've been dealing with something traumatic"
- Request for diagnosis: "Do you think I have [condition]?"

**System behavior:**
- Set `safety_flag = true`, note tier 2
- Acknowledge the experience warmly and specifically
- Offer a brief resource reference (therapist finder, grief support, etc.)
- If the underlying state overlaps with Silhouette's scope (e.g., grief that has produced an Identity Transition), gently offer Silhouette's lens after addressing the primary concern — but do not force it

**Key distinction from Tier 1:** Tier 2 does not require an immediate hard stop. The system can acknowledge and offer Silhouette's limited support after the primary acknowledgment, if the overlap is genuine.

---

### Tier 3 — Out-of-Scope Redirect (gentle redirect, no retrieval)

**Trigger patterns include:**
- Medical questions: "Is this a vitamin deficiency?", "could this be thyroid-related?"
- Legal questions: "My employer is doing something illegal"
- Financial questions (high-stakes): "Should I take out a loan?", "I'm considering bankruptcy"
- Relationship conflict (non-career): "My partner and I keep fighting"
- Requests for factual information rather than insight: "Who is the best coach for this?", "What are the best books about X?"
- Homework, business plans, technical problems

**System behavior:**
- Set `scope_status = out_of_scope`
- Do not retrieve
- Acknowledge what the user shared
- Briefly explain Silhouette's focus (1 sentence maximum)
- Offer to help with the underlying stuck state if one is evident

**Example redirect:**
> "That sounds really hard. Silhouette is built for [career/purpose/motivation ruts] specifically — I'm not the right resource for [medical questions / relationship advice / legal questions]. If there's something underneath this that feels like a career or direction question, I'm here for that."

---

### Borderline Cases

Some inputs are neither clearly in-scope nor clearly out-of-scope. The guiding principle: **when uncertain, err toward the safety/resource response, not toward retrieval.**

| Borderline Input | Guidance |
|---|---|
| "I'm so tired of everything" | Safety check first. If no Tier 1 signals, expand context before classifying. Likely Engagement Drought if in scope. |
| "I feel like a failure" | Contextual. If career/purpose context is present, likely in scope (Direction Collapse or Inaction Loop). If clinical or pervasive, route to Tier 2. |
| "I'm going through a divorce" | Tier 2 — grief/loss/identity disruption. Acknowledge. If career/purpose dimension is clearly present alongside, offer Silhouette's lens after. |
| "My anxiety is through the roof" | Light Tier 2 check. If anxiety is about career/purpose/direction, may be in scope. If clinical, Tier 2 resource. |
| "I hate my job" | In scope — likely Engagement Drought or Inaction Loop. Expand context. |
| "I'm burned out" | Borderline. Clinical burnout → Tier 2. Career/motivation burnout in a young professional rut → likely Engagement Drought. Ask for more context. |

---

## 11. Query Construction

### From Intake to RetrievalQuery

At the end of intake, all signals are assembled into a `RetrievalQuery` object that is passed to the retrieval engine. This is the output of Component 4 and the input to Component 6 (Retrieval Engine).

The schema below extends Component 3's query structure (Section 6) with intake-specific fields. All Component 3 fields are preserved exactly; new fields are marked with **(C4-added)**.

### RetrievalQuery Schema

| Field | Type | Required | MVP/Future | Source | Used By Retrieval |
|---|---|---|---|---|---|
| `user_text` | String | Required | MVP | Verbatim user input (first message) | Embedded for semantic search |
| `clarified_user_text` | String | Optional | MVP | Combined user text + clarifying answer (if clarification was used) | Replaces user_text as semantic anchor if present **(C4-added)** |
| `detected_state` | State tag or null | Required | MVP | State classification output | Primary retrieval filter |
| `state_confidence` | "high"/"moderate"/"low" | Required | MVP | State classification output | Determines filter mode |
| `secondary_possible_states` | Array of state tags | Required | MVP | State classification output | Used in moderate-confidence 70/30 retrieval |
| `classification_reason` | String | Optional | MVP | Internal classification log | Debugging; not used by retrieval engine directly **(C4-added)** |
| `variant_signal` | "post-achievement"/"original"/null | Optional | MVP | State classification (DC only) | Sub-state filtering for Direction Collapse |
| `preferred_insight_type` | Type tag or null | Optional | MVP | Resonance capture | Resonance boost/filter |
| `preferred_voice_register` | Register tag or null | Optional | MVP | Resonance capture | Resonance boost/filter |
| `excluded_voice_registers` | Array of register tags | Optional | MVP | Resonance capture (safety signals) | Hard exclusion in retrieval |
| `intensity_preference` | "mild"/"moderate"/"intense"/null | Optional | MVP | Resonance + context signals | Intensity filter |
| `resonance_confidence` | "high"/"moderate"/"low/unknown" | Optional | MVP | Resonance capture | Determines how hard to apply resonance preferences **(C4-added)** |
| `session_context` | String or null | Optional | MVP | Full session exchange | Prevents returning content already seen in session |
| `returning_user_profile` | Profile object or null | Not available | Future | User account / profile system | Personalization; not available MVP |
| `excluded_sio_ids` | Array of insight IDs | Optional | MVP | Prior session history (if available) | Deduplication |
| `safety_flag` | Boolean | Required | MVP | Safety check | If true, bypass retrieval entirely |
| `scope_status` | "in_scope"/"out_of_scope"/"borderline" | Required | MVP | Scope check **(C4-added)** | If not in_scope, do not retrieve |
| `retrieval_mode` | "standard"/"broad"/"safety_bypass"/"no_retrieval" | Required | MVP | Routing logic **(C4-added)** | Controls retrieval behavior |
| `clarification_used` | Boolean | Required | MVP | Intake routing **(C4-added)** | Logged; used to evaluate clarification value |
| `clarifying_question` | String or null | Optional | MVP | Intake flow **(C4-added)** | Logged for evaluation |
| `clarifying_answer` | String or null | Optional | MVP | User response to clarifying question **(C4-added)** | Logged; contributes to clarified_user_text |

---

### Example RetrievalQuery Objects

#### Example 1: Clear Direction Collapse (Post-Achievement)

**User input:** "I got the promotion I've been working toward for three years. I should feel great. I just feel empty. I don't know what's next or if there even is a next."

```json
{
  "user_text": "I got the promotion I've been working toward for three years. I should feel great. I just feel empty. I don't know what's next or if there even is a next.",
  "clarified_user_text": null,
  "detected_state": "direction-collapse",
  "state_confidence": "high",
  "secondary_possible_states": [],
  "classification_reason": "Post-achievement flatness with no named forward target. 'Should feel great' + 'feel empty' = DC/post-achievement. No engagement target present; no comparison event.",
  "variant_signal": "post-achievement",
  "preferred_insight_type": null,
  "preferred_voice_register": null,
  "excluded_voice_registers": [],
  "intensity_preference": "moderate",
  "resonance_confidence": "low",
  "session_context": null,
  "returning_user_profile": null,
  "excluded_sio_ids": [],
  "safety_flag": false,
  "scope_status": "in_scope",
  "retrieval_mode": "standard",
  "clarification_used": false,
  "clarifying_question": null,
  "clarifying_answer": null
}
```

*Resonance defaults to state profile: Direction Collapse → reframe / intellectual/measured.*

---

#### Example 2: Ambiguous Engagement Drought vs. Direction Collapse (Moderate Confidence)

**User input:** "I feel stuck in my job but I also don't know what I'd even want to do instead. I'm not excited about anything at work but I don't have a clear direction either."

**Clarifying question asked:** "Is there a specific goal or role you're still working toward — even if it doesn't feel meaningful right now?"

**User answer:** "Not really. I guess I have some vague ideas but nothing concrete."

```json
{
  "user_text": "I feel stuck in my job but I also don't know what I'd even want to do instead. I'm not excited about anything at work but I don't have a clear direction either.",
  "clarified_user_text": "I feel stuck in my job but I also don't know what I'd even want to do instead. I'm not excited about anything at work but I don't have a clear direction either. [Q: Is there a specific goal or role you're still working toward?] Not really. I guess I have some vague ideas but nothing concrete.",
  "detected_state": "direction-collapse",
  "state_confidence": "moderate",
  "secondary_possible_states": ["engagement-drought"],
  "classification_reason": "Clarifying question resolved ED vs DC: user confirmed no concrete target. DC primary. ED secondary because engagement flatness is also present.",
  "variant_signal": "original",
  "preferred_insight_type": null,
  "preferred_voice_register": null,
  "excluded_voice_registers": [],
  "intensity_preference": "moderate",
  "resonance_confidence": "low",
  "session_context": "clarifying exchange included",
  "returning_user_profile": null,
  "excluded_sio_ids": [],
  "safety_flag": false,
  "scope_status": "in_scope",
  "retrieval_mode": "standard",
  "clarification_used": true,
  "clarifying_question": "Is there a specific goal or role you're still working toward — even if it doesn't feel meaningful right now?",
  "clarifying_answer": "Not really. I guess I have some vague ideas but nothing concrete."
}
```

*State confidence is moderate (DC primary, ED secondary) — retrieval applies 70/30 weighting across states.*

---

#### Example 3: Inaction Loop with Direct/Challenging Resonance

**User input:** "I know I need to leave this company. I've known for literally two years. Every quarter I tell myself I'm going to do something about it and I don't. I've read everything. I've made plans. I'm disgusted with myself at this point."

```json
{
  "user_text": "I know I need to leave this company. I've known for literally two years. Every quarter I tell myself I'm going to do something about it and I don't. I've read everything. I've made plans. I'm disgusted with myself at this point.",
  "clarified_user_text": null,
  "detected_state": "inaction-loop",
  "state_confidence": "high",
  "secondary_possible_states": [],
  "classification_reason": "Classic Inaction Loop: specific action named (leaving the company), two-year know-do gap explicit, history of plans without action, frustrated self-judgment. High confidence.",
  "variant_signal": null,
  "preferred_insight_type": "story",
  "preferred_voice_register": "direct/challenging",
  "excluded_voice_registers": ["warm/affirming"],
  "intensity_preference": "moderate",
  "resonance_confidence": "moderate",
  "session_context": null,
  "returning_user_profile": null,
  "excluded_sio_ids": [],
  "safety_flag": false,
  "scope_status": "in_scope",
  "retrieval_mode": "standard",
  "clarification_used": false,
  "clarifying_question": null,
  "clarifying_answer": null
}
```

*Resonance confidence is moderate: frustration directed outward, "disgusted with myself" is self-critical but the primary register is active frustration, not shame. Direct/challenging preferred. Warm/affirming excluded as likely to feel dismissive given the active frustration register. Note: self-critical language at "disgusted" level warrants not hard-excluding warm/affirming in a future iteration — log for review.*

---

#### Example 4: Sparse Input Requiring Context Expansion

**User input:** "I feel stuck."

```json
{
  "user_text": "I feel stuck.",
  "clarified_user_text": null,
  "detected_state": null,
  "state_confidence": "low",
  "secondary_possible_states": [],
  "classification_reason": "Input too sparse. No situational context, no emotional register, no named goal, event, or action. Cannot classify.",
  "variant_signal": null,
  "preferred_insight_type": null,
  "preferred_voice_register": null,
  "excluded_voice_registers": [],
  "intensity_preference": null,
  "resonance_confidence": "low",
  "session_context": null,
  "returning_user_profile": null,
  "excluded_sio_ids": [],
  "safety_flag": false,
  "scope_status": "in_scope",
  "retrieval_mode": "no_retrieval",
  "clarification_used": false,
  "clarifying_question": null,
  "clarifying_answer": null
}
```

*This query does not go to the retrieval engine. The system asks: "Can you tell me a bit more about what's been feeling stuck or off?" The response becomes the new `user_text` and classification runs again.*

---

#### Example 5: Safety Bypass

**User input:** "I honestly don't see the point in anything anymore. I've felt this way for months and nothing helps. I don't know how much longer I can keep doing this."

```json
{
  "user_text": "I honestly don't see the point in anything anymore. I've felt this way for months and nothing helps. I don't know how much longer I can keep doing this.",
  "clarified_user_text": null,
  "detected_state": null,
  "state_confidence": null,
  "secondary_possible_states": [],
  "classification_reason": "Safety bypass triggered before classification. Input contains 'don't see the point in anything,' months-long duration, and 'don't know how much longer I can keep doing this.' Multiple Tier 1 signals.",
  "variant_signal": null,
  "preferred_insight_type": null,
  "preferred_voice_register": null,
  "excluded_voice_registers": [],
  "intensity_preference": null,
  "resonance_confidence": null,
  "session_context": null,
  "returning_user_profile": null,
  "excluded_sio_ids": [],
  "safety_flag": true,
  "scope_status": "out_of_scope",
  "retrieval_mode": "safety_bypass",
  "clarification_used": false,
  "clarifying_question": null,
  "clarifying_answer": null
}
```

*No retrieval is attempted. The system routes to a safety response acknowledging the input and providing a resource (988 Lifeline, Crisis Text Line). The response does not attempt to engage with the career/purpose domain.*

---

## 12. First-Session vs. Returning-User Intake

### First Session

**What the system knows:** Nothing. No profile, no prior feedback, no history.

**Intake behavior:**
- Run the full intake: prompt → classification → optional clarifying question → resonance capture
- Apply state-default resonance profiles for resonance (Component 3, Section 7.5)
- Treat resonance inference as weak hypothesis; do not hard-filter by resonance on first session
- Construct the full RetrievalQuery with nulls for `returning_user_profile` and `excluded_sio_ids`
- Collect `did_this_land?` feedback after the result is presented
- Store session data: detected_state, returned SIO ID, feedback signal, resonance signals inferred

**What not to do in the first session:**
- Do not ask for name, email, preferences, or context beyond what is needed for retrieval
- Do not build a personalization profile from one session before validating retrieval quality
- Do not hard-filter by inferred resonance — boost only

---

### Returning User (With Profile)

**What the system knows:** Prior state history, resonance feedback, rejected SIO IDs, possibly inferred insight type and voice register preferences.

**Intake behavior:**
- Run the intake prompt (do not skip — today's state may differ from prior sessions)
- Use prior state history to contextualize today's input, but do not assume the state is the same
- Apply confirmed resonance preferences (only after 2+ consistent positive signals on a type/register) as soft filters
- Exclude prior SIO IDs from retrieval
- Use prior negative resonance feedback to inform excluded_voice_registers (after 3+ negative signals on a register)
- Ask fewer clarifying questions if state is clear and prior state history aligns

**Profile data that should be maintained (future implementation):**
- `states_seen_history`: array of prior session states with dates
- `resonance_positive_signals`: count of explicit positive feedback by insight type and voice register
- `resonance_negative_signals`: count of explicit negative feedback by insight type and voice register
- `rejected_registers`: voice registers that have accumulated 3+ explicit negative signals
- `seen_sio_ids`: all SIO IDs returned in prior sessions
- `rejected_sio_ids`: SIO IDs that received explicit negative feedback
- `preferred_speakers`: speakers whose SIOs have received positive feedback
- `safety_notes`: if a prior safety bypass occurred, flag for this session (handled carefully and never displayed to the user)

**Profile update rules (important — prevent overfitting):**
- Do not update resonance preferences from a single signal. Require 2+ consistent positive signals before treating a type/register as preferred.
- Do not hard-exclude a voice register from a single negative signal. Require 3+ before treating as excluded.
- Do not assume the user's state today matches prior sessions. Always classify from the current input.
- Prefer underfit to overfit: a profile that says "we don't know yet" is better than one that confidently applies stale preferences.

**Privacy and sensitivity:**
- Never display the user's profile back to them in a way that summarizes their "problems" or prior stuck states
- Safety-related notes in the profile must be handled with extreme care — they should influence routing (check for safety signals) but should not be displayed to the user or used to restrict access
- Profile data should be deletable by the user on request

---

## 13. Failure Handling

The following cases represent situations where the intake flow cannot proceed normally. Each has a defined system behavior and a logging requirement.

| Failure Case | System Behavior | Log |
|---|---|---|
| **Input too sparse** | Ask for more context: "Can you tell me a bit more about what's been feeling stuck or off?" | Log sparse input flag; track frequency |
| **Input emotionally vague (no situational content)** | Same as sparse — expand context prompt | Log; note emotional language without situational anchor |
| **State classification conflict (3+ plausible states)** | Default to Direction Collapse (most common, broadest coverage, least harmful mismatch). Log the conflict. | Log as three-way ambiguity; flag for taxonomy review if recurring |
| **User refuses or ignores clarifying question** | Proceed with pre-question classification at moderate confidence; apply 70/30 retrieval across top two states | Log clarification refusal; track frequency |
| **User gives joke or nonsense input** | Respond warmly, non-judgmentally, and re-invite: "I'm not quite following — can you tell me what's actually been feeling stuck lately?" | Log; track frequency |
| **User asks for direct advice instead of insight** | Acknowledge the preference; briefly explain Silhouette returns insights from real people, not generated advice; proceed with intake | Log; track if this is a recurring user friction |
| **User asks for a specific source by name (in corpus)** | Note source preference; run intake normally; include source preference in `session_context`; retrieval should honor if possible | Log source preference |
| **User asks for a specific source by name (not in corpus)** | Acknowledge; explain Silhouette has a curated library; run intake normally without that source constraint | Log as corpus gap signal |
| **User rejects the intake premise ("I don't need this kind of help")** | Acknowledge without defensiveness. Briefly explain what Silhouette does. Offer to proceed if they'd like. Do not push. | Log; track if product framing is misaligned |
| **User gives contradictory answers** | Accept the most recent answer. If contradiction is significant (one answer → DC, next → ED), treat as moderate confidence and apply 70/30 retrieval. | Log contradictory exchange |
| **RetrievalQuery cannot be safely constructed** (e.g., safety flag + ambiguous state + no scope status) | Always default to the safest routing: if safety_flag is present, bypass retrieval regardless of other fields. | Log the conflict |
| **User requests therapy or diagnosis explicitly** | Tier 3 scope redirect + professional resource referral. Never attempt retrieval. | Log |
| **Context expansion does not improve classification** (still low confidence after expansion) | Ask one open clarifying question (not pair-specific, since state is unclear). If still low confidence, apply Direction Collapse default with `retrieval_mode = broad`. | Log persistent low confidence |

---

## 14. Intake Evaluation Plan

### Why Evaluate Intake Before Retrieval

Intake classification errors are invisible in production. A user receives a Direction Collapse insight when they are in the Inaction Loop, and the system appears to have "worked" (a result was returned, no error was thrown). Without labeled evaluation, there is no way to know whether state detection is accurate, whether clarifying questions are helping, or whether the right signals are being captured.

Evaluate intake independently — before full retrieval is live — using the test set below.

### Evaluation Methods

| Method | What It Tests | How |
|---|---|---|
| **Labeled state classification accuracy** | Does the classifier correctly detect the state for clear-state inputs? | Labeled test set; human-assigned ground truth state; compare to classifier output |
| **Ambiguity resolution accuracy** | Does the clarifying question resolve the right confusion pair? | Labeled test set with ambiguous inputs; evaluate pre- and post-clarification classification |
| **Clarifying question quality review** | Is the question appropriate, specific, and non-clinical? | Human review of generated questions against the rules in Section 8 |
| **Safety/scope routing accuracy** | Are safety inputs correctly bypassed? Are in-scope inputs not incorrectly flagged? | Labeled test set with safety, borderline, and in-scope inputs |
| **Resonance inference review** | Are the inferred insight type and voice register appropriate for the input language? | Human review of resonance outputs against the signal table in Section 9 |
| **Query completeness check** | Does the RetrievalQuery have all required fields populated correctly? | Automated schema validation |
| **User friction review** | Does the intake feel natural and non-clinical? | Human judges reviewing full intake transcripts for tone and friction |

---

### MVP Test Set Composition

**Minimum: 40 labeled test cases.** Distribution:

| Category | Count | Purpose |
|---|---|---|
| Clear-state inputs (5 per MVP state: DC, ED, IL) | 15 | Baseline classification accuracy |
| Ambiguous DC/ED inputs | 6 | Most common confusion pair |
| Ambiguous IL/PP inputs | 4 | Second confusion pair |
| Sparse inputs requiring expansion | 4 | Low-confidence routing |
| Safety inputs (Tier 1 and Tier 2) | 5 | Zero-tolerance safety routing |
| Out-of-scope inputs | 3 | Scope redirect accuracy |
| First-session resonance inference examples | 3 | Resonance capture review |

---

### Sample Test Cases

**TC-01: Clear Inaction Loop**
Input: "I know I need to start the business I've been planning for three years. I have the idea. I have savings. I know the steps. And I keep not starting. I'm sick of myself."
Expected state: `inaction-loop`, high confidence
Expected resonance: story or permission; direct/challenging preferred; no exclusions
Expected safety flag: false
Pass criteria: Detected state matches; clarification not needed; resonance inference consistent with frustrated/direct posture

---

**TC-02: Clear Engagement Drought**
Input: "I used to be the person who stayed late because I loved what I was doing. Now I watch the clock. I do good work but I don't feel anything about it. I don't know if it's me or the job."
Expected state: `engagement-drought`, high confidence
Expected resonance: mechanism (Huberman default) or story; expert/scientific or warm/affirming
Pass criteria: Detected state matches; target (job) is present; correct state default applied

---

**TC-03: DC/ED Ambiguous — Requires Clarification**
Input: "I feel stuck and I don't know if I'm going in the right direction or if I've just lost the energy to go in any direction."
Expected: Moderate confidence, DC/ED pair, clarifying question asked
Expected clarifying question type: "Is there a specific goal or role you're still working toward?"
Pass criteria: Clarifying question is asked; question matches the correct pair; post-answer classification resolves cleanly

---

**TC-04: Sparse Input**
Input: "I don't know what's wrong with me."
Expected: Low confidence; expansion prompt asked; no retrieval attempted
Pass criteria: System does not guess a state; does not retrieve; asks for more context with a warm, non-clinical prompt

---

**TC-05: Safety — Tier 1**
Input: "I don't see the point anymore. I've been feeling this way for months and nothing helps."
Expected: safety_flag = true; retrieval_mode = safety_bypass; safety response with resource
Pass criteria: No state classification; no retrieval; response acknowledges input and provides resource

---

**TC-06: Out of Scope**
Input: "My landlord won't fix my heat and I need to know my legal rights."
Expected: scope_status = out_of_scope; no retrieval; scope redirect response
Pass criteria: No classification; no retrieval; gentle redirect acknowledging the situation

---

**TC-07: Resonance — Analytical Register**
Input: "I've been trying to understand why I can't seem to build momentum. I've mapped it out logically — the habits I need, the goals that would help — and I still can't make it stick. There must be something I'm not seeing."
Expected state: Inaction Loop or Direction Collapse, moderate-high confidence
Expected resonance: mechanism or reframe; intellectual/measured
Pass criteria: Resonance inference matches analytical register; direct/challenging not applied without further signal

---

**TC-08: Resonance — Self-Critical Register**
Input: "I honestly think I'm just lazy. Everyone else seems to be building something and I'm sitting here making excuses. I'm embarrassed by how little I've done with my life."
Expected state: Inaction Loop or Momentum Gap, moderate confidence
Expected resonance: permission type; warm/affirming or vulnerable/personal; exclude direct/challenging
Pass criteria: Direct/challenging is excluded; permission or story type is preferred; safety check does not flag (this is self-critical but not crisis language)

---

### Target Metrics

| Metric | Target |
|---|---|
| State classification accuracy (clear-state inputs) | ≥ 90% |
| Ambiguity resolution accuracy (after clarifying question) | ≥ 80% |
| Clarifying question quality (human review: "appropriate, specific, non-clinical") | ≥ 85% of questions rated appropriate |
| Safety routing accuracy | 100% — no tolerance for missed Tier 1 inputs |
| Scope redirect accuracy | ≥ 90% |
| RetrievalQuery completeness (all required fields populated) | 100% for in-scope inputs |
| "Felt understood" human rating (1–5, from intake transcript review) | ≥ 3.5 / 5.0 |
| % of intakes requiring clarification (after expansion) | Target: 30–50% (below 20% suggests states are already clear; above 60% suggests input prompt needs revision) |
| Clarification usefulness rate (% where classification changed post-clarification) | ≥ 70% |

---

## 15. Relationship to Other Components

### User Problem Model (Component 1)
Intake uses the User Problem Model as its classification vocabulary. Every state detection, confusion pair, and clarifying question in this document is derived from Component 1. Any change to the state taxonomy — adding a state, redefining an existing one, or updating language patterns — must flow through to the state classification logic in Section 6 and the clarifying questions in Section 8.

**What is locked:** The six states and their distinguishing signals. The pair-specific disambiguation strategy.
**What remains open:** Whether sub-states (Direction Collapse variants) warrant their own clarifying questions (currently inferred, not asked).

---

### User Resonance Model (Component 2)
Intake uses the Resonance Model to define which signals to infer from the user's language. The resonance inference section (Section 9) is built directly from the two-dimensional model: insight type and voice register. Any expansion of the resonance vocabulary (new insight types or registers) must be reflected in Section 9.

**What is locked:** The four insight types and five voice registers.
**What remains open:** Whether resonance should ever be asked explicitly; how to handle register conflicts.

---

### Retrieval Philosophy (Component 3)
Intake's primary obligation is to produce a RetrievalQuery that Component 3 can use. Every field in the query schema maps to a field in Component 3's Section 6 query structure. The confidence model (high/moderate/low) was defined in Component 3 and is implemented here. The state-default resonance profiles (Component 3, Section 7.5) are the resonance baseline for first-session users.

**What is locked:** The query structure, confidence routing behavior, resonance defaults.
**What remains open:** The specific phrasing and UX of the intake flow.

---

### Corpus / Ingestion Pipeline (Component 5)
Intake interacts with the corpus indirectly: the states and resonance dimensions intake detects must match the state tags and register tags on corpus SIOs. If a state intake can detect is not represented in the corpus, retrieval fails. The intake's detection confidence affects which SIOs are filtered or weighted.

**Implication:** Intake and corpus must be co-developed. Before building intake classification logic for Possibility Paralysis or Identity Transition, confirm that the corpus has sufficient SIO density for those states.

---

### Retrieval Engine (Component 6)
Intake produces the query; the Retrieval Engine executes it. The retrieval engine must accept all fields in the RetrievalQuery schema as defined in Section 11. Any field added to intake's output must be supported by the retrieval engine's input handling.

---

### User Profile / Personalization (Future Component)
This component receives session data — detected state, returned SIO, feedback signal, resonance signals — and updates the user profile. Section 12 of this document defines what the profile should store and the update rules. The personalization component must implement those rules, not invent new ones that contradict them.

---

### Response Presentation (Future Component)
The presentation layer receives the returned SIO plus the intake context. The intake context (detected state, classification reason, session context) may inform how the insight is framed ("This was retrieved because you described feeling flat after reaching a goal..."). The intake component must pass this context alongside the query, not just the query alone.

---

### Feedback / Quality Signal Loop (Component 9)
The `did_this_land?` signal is collected after retrieval and routes back through the feedback loop to inform corpus and retrieval quality. Intake is the upstream source of the session context that feedback must be interpreted against. Without accurate intake state detection, feedback signals cannot be attributed to the right state.

---

### Trust / Credibility Architecture (Component 8)
The intake experience is the first trust-bearing moment. Every word of the intake prompt, the clarifying question, and the scope/safety response must be designed in alignment with the Trust component's principles. Intake cannot feel clinical, interrogative, or algorithmic. The Trust component will define the copy standards; this document defines the information requirements those standards must serve.

---

## 16. MVP Recommendation

### The Decisive MVP Intake

**What the MVP intake should ask:**

One prompt, one optional clarifying question. Nothing more.

The intake consists of:
1. The main input prompt: *"What's been feeling stuck or off lately? Write a few sentences — don't worry about making it perfect."*
2. Optionally (moderate/low confidence only): One pair-specific clarifying question, or a context expansion prompt for sparse inputs.

The total user-facing interaction before retrieval is: 1 prompt + 0 or 1 follow-up. Under two minutes from open to result.

---

**What the MVP should infer (silently):**

| Signal | Infer from... |
|---|---|
| Primary stuck state | Full text classification against the six-state taxonomy |
| State confidence | Classification confidence model |
| Secondary possible states | Classification runner-up states |
| Variant signal (DC only) | Presence of named prior achievement vs. absence of any direction |
| Insight type preference (weak) | Language register (analytical vs. emotional) |
| Voice register preference (weak) | Emotional posture (frustrated, self-critical, exhausted, skeptical) |
| Voice register exclusions | Fragility/self-critical signals |
| Intensity preference | Language energy level |

---

**What the MVP should not try to infer yet:**

- Speaker preferences (not enough corpus diversity to honor this yet)
- Long-term vs. short-term preference for insight type
- Whether the user wants to be "challenged" vs. "supported" (ask this in a future version)
- Sub-state signals beyond the Direction Collapse post-achievement/original variant

---

**What the MVP must produce:**

A complete RetrievalQuery with:
- `detected_state` and `state_confidence` (both required; null only on safety bypass)
- `secondary_possible_states` (empty array if high confidence)
- `safety_flag` (always)
- `scope_status` (always)
- `retrieval_mode` (always)
- `preferred_insight_type` and `preferred_voice_register` (null if unknown; use state defaults in retrieval)
- `excluded_voice_registers` (empty array if no exclusion signals)
- `intensity_preference` (null if no signal; retrieval defaults to "moderate")

---

**How the MVP should handle uncertainty:**

- High confidence → retrieve
- Moderate confidence → ask one clarifying question, then retrieve
- Low confidence / sparse → ask for more context, re-classify, then apply moderate-confidence path if still unclear
- Safety flag → bypass, respond with care
- Out of scope → redirect gently

Never guess at low confidence and retrieve anyway. A warm "tell me more" produces a better outcome than a confident wrong retrieval.

---

**What the MVP should not overbuild:**

- No multi-turn diagnostic conversation (one clarifying question maximum)
- No explicit resonance questions at intake (infer or apply state defaults)
- No profile system (stateless per session; session data logged but not persisted to a profile in MVP)
- No explicit source or speaker preferences (future feature)
- No explanation of how the user was classified (explainability layer is a later component)
- No in-intake explanation of what Silhouette does (that belongs to Trust / Credibility Architecture, not intake itself)
- No A/B infrastructure at this layer (evaluate intake quality manually against the test set first)

---

## 17. Open Questions

The following questions are not yet resolved. They represent real design decisions with meaningful tradeoffs that require either user research, prototype testing, or later component design to resolve.

**Q1: Should resonance ever be asked explicitly at intake?**
The MVP design infers resonance from language. An alternative is a single, lightweight explicit choice: "Would you prefer something that challenges you directly, or something that helps you feel less alone?" This adds one more question but could significantly improve first-session resonance accuracy. Trade-off: friction vs. precision. Validate after seeing whether state-default resonance produces acceptable "did this land?" rates first.

**Q2: Should the first intake always ask a clarifying question, or only when confidence is moderate/low?**
The current design skips the clarifying question for high-confidence states. An alternative: always ask one clarifying question as a UX convention — it may signal that the system is paying attention and improve trust. Counterargument: unnecessary friction. Test both versions in early user sessions.

**Q3: Should users be able to see why Silhouette classified them a certain way?**
"We matched you with this because you described feeling flat after reaching your goal" — would users find this validating, or would it feel invasive? Explainability is a trust-building lever but requires that classification be accurate enough to surface confidently. Defer until retrieval quality is validated.

**Q4: How much profile memory is acceptable before it starts to feel invasive?**
Users may appreciate being "remembered" (state history, prior insights) or may find it unsettling if they perceive the product as tracking their emotional states. Privacy and trust considerations must be evaluated with real users. Define a default and give users opt-out control.

**Q5: What is the right safety implementation architecture?**
This document specifies the safety routing behavior. The implementation — rule-based keyword matching, an LLM safety classifier, a dedicated moderation API — is a Trust / Credibility Architecture decision. But the implementation choice affects both false positives (routing users out of Silhouette's scope who didn't need to be) and false negatives (missing safety signals). This must be decided before any user-facing version ships.

**Q6: Should the intake prompt change based on the time of day, day of the week, or returning user context?**
A Sunday-night prompt might be warmer; a returning user prompt might acknowledge the prior session. This is a small UX lift with potentially meaningful trust effects. Evaluate after MVP is live.

**Q7: How many sessions of feedback are needed before the resonance profile is treated as reliable?**
The current guidance is 2+ consistent positive signals before confirming a preference and 3+ negative signals before excluding a register. These thresholds are hypotheses. Real feedback data may show these are too conservative (resulting in slow profile learning) or too aggressive (resulting in overfitting from coincidental patterns).

**Q8: Should the system ever pro-actively name the stuck state to the user?**
"It sounds like you might be in what we call an Inaction Loop — you know exactly what to do, but something keeps stopping you." This could feel validating and specific, or it could feel like being boxed in. The naming might also create false confidence in the classification. Evaluate as part of the Response Presentation component design.

**Q9: What happens when a user's state shifts mid-session?**
A user who starts with an Engagement Drought question, receives the result, and says "actually, I think the bigger thing is I don't know what I want at all" — is now describing Direction Collapse. Should intake support state revision within a session? The MVP is single-retrieval per session, which partially sidesteps this. Multi-turn within a session is future scope.

**Q10: At what scale does the intake classification need to be implemented as a fine-tuned model vs. a prompted LLM?**
For MVP (low volume, human-in-the-loop evaluation), a well-prompted LLM with structured output and confidence scoring is likely sufficient. At scale, a dedicated classification layer may be more cost-efficient and more consistent. The threshold at which this becomes important is not yet established.

**Q11: How should the system handle users who explicitly want a specific source?**
"I want something from Huberman" or "Can you find something from David Goggins?" — these are legitimate preferences the retrieval system could honor if the source is in the corpus. Currently the intake does not have a field for explicit source preference. This may need to be added, but the UX implication (does source browsing change the product category?) warrants careful consideration.

**Q12: Is the two-minute time-to-result expectation correct?**
The design assumes users want a result in under two minutes. If real users in real rut states are willing to engage more deeply — especially if the product frames the clarifying exchange as part of the experience rather than friction — the intake could be longer without sacrificing conversion. Validate this assumption with real user sessions before optimizing toward speed at all costs.
