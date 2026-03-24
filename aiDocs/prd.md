# Silhouette — Product Requirements Document

> This file defines the product problem, user, features, and success criteria.
> It is the source of truth for what Silhouette is and why it exists.

---

## Product Name

**Silhouette**

---

## Product Thesis

For young adults caught in an overwhelm-and-avoidance loop, Silhouette acts as an episodic micro-reset that restores hope and momentum better than journaling apps, generic motivational content, or open-ended chatbots — because it matches the user's exact stuck moment with one curated, explained resource and one concrete next step they can take right now.

---

## Problem Statement

Young adults in transition-heavy seasons frequently get stuck in short cycles of overwhelm, discouragement, and avoidance. In these moments, the gap is not access to advice or content — there is more of that than ever. The gap is relevance, timing, and actionability.

Existing alternatives fail in the stuck moment because:
- Journaling apps require energy to write and emphasize reflection over action.
- Motivational content platforms offer unlimited choice with no guidance on what fits the user's current state.
- Mental wellness apps are structured as ongoing programs that assume the user already has some momentum.
- General AI chatbots are flexible but generic unless the user already knows how to prompt well.
- AI companions provide conversation but rarely produce a clear next step.

The result is that users either doom-scroll, feel worse, or abandon the attempt. The right input at the right moment is available somewhere — but no product is built to find it efficiently for a person in a low-energy, avoidant state.

---

## Target User

### Primary User
A young adult between roughly 18 and 28 years old who is in a transition-heavy season of life — navigating school, early career, identity, independence, or relationships — and who regularly experiences short cycles of overwhelm, avoidance, discouragement, or loss of momentum.

They are:
- still capable of acting, even if they feel stuck
- already using digital tools to try to feel better or get motivated
- frustrated by content that feels generic, preachy, or irrelevant to their moment
- not in crisis, but genuinely discouraged and losing traction

They are not:
- seeking clinical support or therapy
- in a mental health emergency
- looking for a journaling habit or ongoing self-improvement program

### Secondary User
A slightly older young adult (late 20s to early 30s) navigating post-college life transitions: career pivots, creative blocks, social rebuilding, or post-setback discouragement. This user is a natural expansion audience once the core loop is proven.

---

## Primary Use Case

A young adult opens Silhouette in a moment of stuckness — after doomscrolling, before a task they have been avoiding, or during a heavy "I'm behind in life" feeling. They answer a small number of guided questions about how they feel and what is going on. The agent identifies their stuck pattern, retrieves one relevant hope-building resource from a curated knowledge base, explains why it was chosen, and gives them one small next step they can take in the next 5–15 minutes.

The session should take under 3 minutes to begin and leave the user with something concrete.

---

## User Pain Points

1. **Overwhelm without direction** — they feel stuck but cannot identify what would actually help.
2. **Avoidance shame** — the longer they avoid something, the harder it becomes to re-enter.
3. **Content noise** — they open YouTube or search for advice and find too many options, none clearly right.
4. **Lack of actionability** — even when they find an inspiring resource, they do not know what to do with it.
5. **Generic or preachy tone** — self-help content often feels unrealistic, surface-level, or condescending.
6. **High activation energy** — when they are in a rut, every solution requires more energy than they have.

---

## Desired Transformation

The user arrives feeling: overwhelmed, foggy, ashamed, avoidant, or low-confidence.

The user leaves with:
- a slight but real shift in emotional state — less alone, less frozen
- one resource that feels genuinely relevant to their moment
- one next step that feels small enough to actually attempt
- a sense that this was worth opening instead of scrolling

This transformation does not need to be dramatic. Silhouette is not trying to fix a life. It is trying to move someone from stuck to slightly moving.

---

## Core Value Proposition

Silhouette is the only tool built specifically for the stuck moment — not for ongoing habit-building, not for open-ended advice, and not for browsing a library. It narrows the entire universe of helpful content down to one thing and gives the user one action, matched to exactly where they are right now.

---

## What Makes It Different

| Comparison | Silhouette's difference |
|---|---|
| vs. ChatGPT | Purpose-built for the stuck moment; guided intake; curated knowledge base; one output, not open conversation |
| vs. journaling apps | Action-oriented, not reflection-first; low writing requirement; outputs a resource and next step |
| vs. YouTube / podcasts | Curated, not browsed; matched to the user's current state; explained recommendation |
| vs. wellness apps | Episodic, not routine-based; low friction; no program to maintain |
| vs. AI companions | Moves toward action; not just conversation; gives a concrete resource and step |

---

## Success Criteria

### MVP success signals (qualitative)
- Users report that the recommended resource felt relevant to their stuck moment.
- Users understand why the resource was chosen for them.
- Users attempt or complete the suggested next step.
- Users say the experience felt more useful than opening YouTube or asking ChatGPT.
- Users say they would return to Silhouette in another stuck moment.

### Longer-term metrics (post-MVP)
- Session completion rate (user reaches the resource + next step output)
- User-reported relevance rating per session
- Return usage in future stuck moments
- Qualitative feedback on tone and actionability

---

## In-Scope Features

### Must-have for MVP
- Guided intake — a small set of conversational questions to identify the user's stuck moment
- Stuck moment classification — the agent identifies which of the 3–5 supported patterns fits best
- RAG-powered resource retrieval — one curated, tagged resource matched to the classified moment
- Resource explanation — a brief "why this" explanation for the chosen resource
- One next step — a concrete, realistic action the user can take in the next 5–15 minutes
- Conversation memory — the agent remembers the conversation context for follow-up questions
- Safety boundary — clear, non-judgmental routing if the user describes a crisis state
- Web UI — a simple chat interface (terminal fallback is acceptable but not the goal)

### Nice-to-have for MVP
- User-controlled resource type preference (e.g., podcast clip, short article, transcript excerpt)
- Simple "show me something else" option to retrieve a different resource
- Streaming responses in the web UI

---

## Out-of-Scope Features

- User accounts, login, or persistent profiles across sessions
- Daily streaks, habit tracking, or gamification
- Diagnosis or clinical assessment of any kind
- Crisis counseling or referral workflow beyond a simple boundary message
- A browsable content library or search interface
- Push notifications or re-engagement messaging
- Feedback learning loop (saving user ratings to improve future retrieval)
- Multi-user or social features
- Mobile app

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Recommendations feel generic or poorly matched | Build a small, high-quality, well-tagged knowledge base; prioritize specificity over size |
| Product drifts toward therapy-adjacent expectations | Strong, consistent boundary language; clear scope definition in onboarding |
| Users use it once and never return | Frame Silhouette as episodic by design; measure session value, not daily retention |
| Undifferentiated from ChatGPT | Lean into the guided intake, curated knowledge base, and explained one-recommendation format as the specific differentiators |
| Content knowledge base is too thin at launch | Start with 3 stuck moments and 10–15 high-quality sources per moment; expand after validation |
| Scope creep during development | Use mvp.md as the decision filter; add nothing not listed under must-have |
