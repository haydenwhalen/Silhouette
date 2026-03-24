# Silhouette — MVP Definition

> This file defines what version 1 of Silhouette is, what it does, and what it deliberately does not do.
> When in doubt about scope, default to this document.

---

## MVP Goal

Prove that a low-friction, guided reset experience can help a young adult move from a specific stuck moment to a slightly more hopeful, slightly more actionable state — through one curated, context-matched resource and one small next step.

The MVP does not need to be feature-rich. It needs to be tight, believable, and good at its one job.

---

## MVP Wedge

Young adults in transition-heavy seasons who are caught in a short-term overwhelm-and-avoidance loop — overwhelmed, emotionally foggy, avoiding something meaningful — and need a fast, practical reset in under 5 minutes.

This wedge is narrow enough to build well in version 1 and broad enough to include college students, recent graduates, and early-career adults without being limited to any single life stage.

---

## Supported Stuck Moments

The MVP will support the following three primary stuck moments, plus one optional fourth moment if capacity allows.

### Moment 1: The Avoidance Spiral (Primary)
**What is happening:** The user has something meaningful to do and has been putting it off. The longer they avoid it, the worse they feel about themselves, and the harder it becomes to start.
**Core need:** Break the freeze. Give them permission to start small and one tiny action that gets them back in.
**Silhouette output:** One resource about avoidance, re-entry, or momentum + one micro first step (e.g., "open the document and write one sentence").

### Moment 2: The Post-Doomscroll Slump (Primary)
**What is happening:** The user spent too long on their phone and now feels numb, drained, or worse than before.
**Core need:** Interrupt the cycle without judgment. Redirect toward something real without requiring a lot of energy.
**Silhouette output:** One short, honest resource about reclaiming a moment + one small physical or mental redirect action.

### Moment 3: The "I'm Behind In Life" Paralysis (Primary)
**What is happening:** The user has a heavy, foggy sense that they are not where they should be by now — in career, habits, relationships, or direction. No single triggering event, just accumulated weight.
**Core need:** Reduce noise. Name the feeling. Return to one concrete thing that matters today.
**Silhouette output:** One grounding, perspective-restoring resource + one clarity action (e.g., "name one thing you actually care about right now").

### Moment 4: The Comparison Crash (Optional, if time allows)
**What is happening:** The user compared themselves to someone else — on social media, in conversation, or in their own head — and now feels deflated and inadequate.
**Core need:** A quiet perspective reset that restores belief in their own path without being preachy.
**Silhouette output:** One identity-grounding resource about comparison or self-worth + one reconnecting action.

---

## Basic User Workflow

```
1. User opens Silhouette
2. Agent greets the user and asks a short, low-effort intake question
   ("What's going on for you right now?" or a simple multiple-choice prompt)
3. Agent asks 1–2 follow-up questions to clarify the stuck moment
4. Agent classifies the stuck pattern (internally — not shown to user as a label)
5. Agent retrieves one resource from the curated knowledge base via RAG
6. Agent presents:
   - the resource (title, type, brief excerpt or description)
   - a short "why this" explanation
   - one concrete next step
7. User can ask a follow-up question or request a different resource
8. Session ends when the user has what they need
```

The entire session from opening to output should take under 3 minutes.

---

## MVP Output Format

Each Silhouette session should produce exactly this:

**One resource**, including:
- title and source (e.g., "Mel Robbins — 4-minute clip from The Mel Robbins Podcast")
- a 1–2 sentence description of what it covers
- a short "why this fits your moment" explanation

**One next step**, including:
- a single action described in one sentence
- the action should be completable in 5–15 minutes
- the action should feel realistic for someone with low energy

**Optional:** a one-sentence acknowledgment of how the user feels before delivering the output.

---

## Must-Have Features

- Guided conversational intake (3–5 turns maximum)
- Stuck moment classification (internal, not shown to user)
- RAG retrieval from a curated, tagged knowledge base
- One resource output with explanation
- One next step output
- Multi-turn conversation memory within the session
- Safety routing: if the user describes a crisis state, Silhouette responds clearly and redirects to appropriate resources without continuing the reset flow
- Simple web UI with a chat interface

---

## Nice-to-Have (Post-MVP)

- User preference for resource type (podcast clip, short article, transcript, etc.)
- "Show me something different" option for alternate resource retrieval
- Streaming response display in the UI
- Persistent vector store (documents survive server restarts)
- Session rating or feedback signal
- Expanded stuck moment coverage (Moment 4 and beyond)
- Mobile-friendly responsive design

---

## Explicit Non-Goals for V1

- No user accounts or session persistence across visits
- No daily streaks, habit tracking, or gamification
- No browsable content library
- No diagnosis, clinical framing, or mental health assessment
- No crisis response beyond a clear boundary message and resource redirect
- No push notifications or re-engagement features
- No social or multi-user features
- No attempt to cover the "motivation drought" pattern (too diffuse and too close to therapeutic territory for V1)
- No mobile app

---

## Why This Is Narrow Enough for Version 1

The MVP asks the agent to do one thing well: identify a stuck moment and match it to one resource plus one action.

That requires:
- a small, curated knowledge base (3 stuck moments × 10–15 quality sources each = roughly 30–45 sources to start)
- 3–5 agent tools (intake, classification, RAG retrieval, response formatting, safety routing)
- one simple web UI
- conversation memory within a single session

This is achievable as a solo student project within the course timeline. The scope is constrained by design. Version 1 is not trying to help everyone feel better about everything. It is trying to reliably help a young adult stuck in three specific moments move from frozen to slightly moving.

---

## MVP Decision Filter

Before adding any feature or expanding scope, ask:
1. Does this help the user go from stuck to slightly moving in under 5 minutes?
2. Does this stay within the three supported stuck moments?
3. Does this keep activation energy low?

If the answer to any of these is no, it does not belong in the MVP.
