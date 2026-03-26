# Silhouette — Product Requirements Document

> This document defines the product problem, user, features, success criteria, and strategic direction.
> It is the source of truth for what Silhouette is, why it exists, and where it is going.

---

## Product Thesis

Silhouette is a hybrid recommendation and retrieval platform that helps people navigate recurring stuck moments — episodes of overwhelm, avoidance, burnout, low confidence, or directionlessness — by matching their current emotional state to one curated resource and one concrete next step.

For early-career knowledge workers and ambitious young adults caught in recurring cycles of stuckness, Silhouette delivers a micro-reset that restores hope, clarity, and forward motion better than generic AI, motivational content, or wellness apps — because it combines emotional-state classification, curated retrieval, personalized ranking, and low-friction actionability into a single focused experience.

---

## Product Vision

Silhouette should become the go-to tool for "I'm in a rut" moments — known for the precision of its recommendations, the quality of its curated library, and the reliability of its micro-reset experience.

Long-term, Silhouette is not a chatbot. It is a recommendation system with a conversational interface — a platform that gets better at matching people to resources as it learns more about stuck moments, content, and individual preferences.

The conversation is the intake mechanism. The recommendation engine is the product. The curated library is the moat.

---

## Target User

### Primary user

An early-career knowledge worker in their 20s to early 30s who is ambitious, digitally native, and already consuming self-help and productivity content. They experience recurring stuck moments — overwhelm before a deadline, avoidance spirals, burnout after a demanding stretch, imposter feelings before a presentation, directionlessness after a setback.

They are:

- Functional but intermittently stuck — capable of acting when the friction is low enough
- Already seeking solutions digitally (podcasts, YouTube, Reddit, ChatGPT, productivity newsletters)
- Frustrated by the gap between the volume of available content and the relevance of what they actually find in the moment
- Willing to engage with a purposeful tool if it delivers value quickly
- Not in clinical crisis, but genuinely struggling to break out of avoidance and overwhelm cycles

### Secondary user

Students in demanding academic programs — high achievers who cycle between intense productivity and avoidance, experiencing stuck moments around deadlines, academic comparison, identity pressure, and post-failure recovery.

### Expansion audience

The same emotional patterns exist in creative professionals, career changers, new parents, post-layoff rebuilders, and anyone navigating a high-transition season. These audiences are valid long-term targets once the core recommendation loop is proven with the initial wedge.

---

## Initial Wedge

The first wedge is narrow by design: **ambitious early-career knowledge workers who already consume self-help content but regularly hit walls of overwhelm, avoidance, or burnout.**

This group is ideal for initial traction because:

- They experience stuck moments frequently and repeatedly (high need).
- They already seek digital tools to address these moments (proven behavior).
- They can articulate their emotional states clearly enough for the system to classify (good signal quality).
- They are underserved by existing tools, which are either too generic, too high-friction, or too ongoing (clear gap).
- They are a self-similar group, which makes early content curation and recommendation tuning more tractable.

The wedge is not "everyone who feels stuck." It is a specific, reachable group with a specific, repeated need that Silhouette can serve well from day one.

---

## Core Jobs to Be Done

When users come to Silhouette, they are hiring it for one of these jobs:

1. **"I'm stuck and I need something to get me moving."** The user is in a specific stuck moment and needs a fast reset — not a program, not a conversation, not a content feed. One thing, right now.

2. **"I need something that actually fits what I'm feeling."** The user has tried searching for help before and been disappointed by generic, off-tone, or irrelevant results. They want a recommendation that feels like it was chosen for them.

3. **"I need a step small enough that I'll actually take it."** The user knows they should act but everything feels too big. They need the action broken down to the point where resistance drops below their available energy.

4. **"I want to feel less alone in this."** The user is not seeking therapy. They want to feel seen, understood, and normalized — and then pointed toward action.

---

## Desired Transformation

The user arrives feeling: overwhelmed, foggy, ashamed, avoidant, depleted, or directionless.

The user leaves with:

- A slight but real shift in emotional state — less alone, less frozen, less hopeless
- One resource that feels genuinely relevant to their moment and emotional state
- One next step that feels small enough to actually attempt
- A clear reason why this resource was chosen for them
- A sense that this was worth opening instead of scrolling

This transformation does not need to be dramatic. Silhouette is not trying to fix a life. It is trying to move someone from stuck to slightly moving — and to do that reliably enough that they return the next time they are stuck.

---

## Core Value Proposition

Silhouette is the only tool built specifically for the recurring stuck moment. It narrows the entire universe of helpful content down to one resource, matched to the user's exact emotional state and preferences, and pairs it with one realistic action — in under three minutes.

The value is not in the conversation. The value is in the match.

---

## Why Silhouette Is Different

| Comparison | Silhouette's difference |
|---|---|
| vs. ChatGPT | Purpose-built for stuck moments; guided intake instead of open prompting; curated library instead of generated advice; explained recommendations with source attribution |
| vs. YouTube / podcasts | Matched to the user's current emotional state, not browsed; one recommendation instead of infinite scroll; explained why it fits |
| vs. Reddit | Quality-controlled, curated sources instead of crowdsourced advice; actionable output instead of open discussion |
| vs. journaling apps | Action-first, not reflection-first; low writing requirement; produces a resource and a step, not a journal entry |
| vs. wellness apps (Calm, Headspace) | Episodic, not routine-based; designed for the stuck moment, not ongoing practice; low friction with no program to maintain |
| vs. AI companions (Replika, Character.ai) | Moves toward action, not just conversation; resource-backed recommendations instead of generated empathy; concrete output |
| vs. self-help books / newsletters | Moment-specific, not general; matched to emotional state; immediately actionable |

---

## Success Metrics

### Phase 1 (Assignment MVP) — Qualitative validation

- Users report that the recommended resource felt relevant to their stuck moment.
- Users understand why the resource was chosen for them.
- Users attempt or complete the suggested next step.
- Users say the experience felt more useful than opening YouTube or asking ChatGPT.
- Users say they would return to Silhouette in a future stuck moment.
- The agent correctly classifies stuck moments and retrieves appropriate resources in test scenarios.

### Phase 2 — Early product metrics

- **Episode completion rate:** percentage of sessions where the user reaches the resource + next step output.
- **Self-reported emotional shift:** pre/post emotional state comparison within a session.
- **Action follow-through:** user reports whether they attempted the suggested next step.
- **Recommendation relevance rating:** user-reported quality of the match.
- **Return rate:** percentage of users who return for a second stuck moment within 30 days.

### Long-term — Platform metrics

- **Recommendation precision:** measured by relevance ratings, action follow-through, and resource engagement.
- **Longitudinal recovery improvement:** users report feeling stuck less often or recovering faster over time.
- **Personalization lift:** recommendations improve measurably as the system learns user preferences.
- **Library coverage:** percentage of stuck moments where the internal library produces a strong match without external fallback.
- **Trust and NPS:** users trust the system and would recommend it.

---

## Product Principles

1. **Low friction above all.** Every interaction should require less energy than the user's current state can provide. If it feels like work, it is wrong.
2. **One resource, one step.** The unit of value is a single matched recommendation plus a single action. Not a list, not a program, not a feed.
3. **Match quality is the product.** The system is only as good as the relevance of what it surfaces. Everything else is infrastructure.
4. **Episodic by design.** Users come when they are stuck and leave when they have what they need. Daily retention is not the goal. Session value is.
5. **Honest over confident.** If the system does not have a good match, it says so. Trust erodes faster from a bad recommendation than from an honest admission.
6. **Non-clinical, non-preachy.** Silhouette is practical, direct, and human. It is not a therapist, a coach, or a motivational speaker.
7. **Trust-centered.** User emotional data is sacred. Monetization must never compromise recommendation integrity or user trust.

---

## Scope Boundaries

### In scope — Full product vision

- Guided conversational intake for emotional-state classification
- Internal curated resource library with rich metadata
- External search/discovery as fallback and enrichment
- Hybrid retrieval and ranking system
- Personalization based on preferences and behavior
- Explained recommendations with source attribution
- One-step actionable output
- Safety boundaries and crisis routing
- Feedback signals for recommendation improvement
- Simple web interface (conversation is the product)

### In scope — Phase 1 (Assignment MVP)

- Guided conversational intake (3–5 turns)
- Internal-only RAG retrieval from a small curated knowledge base
- Web search as fallback
- Calculator for making next steps concrete
- Session-scoped conversation memory
- Safety routing for crisis signals
- Simple chat UI
- Source attribution on every recommendation

### Out of scope — Not planned

- Clinical assessment, diagnosis, or treatment
- Crisis counseling beyond a clear boundary message and resource redirect
- Daily streaks, habit tracking, or gamification
- Push notifications or re-engagement messaging
- Social or multi-user features
- Native mobile app (web-first)

---

## Non-Goals

- Silhouette is not trying to replace therapy. It helps with functional stuckness, not clinical conditions.
- Silhouette is not trying to maximize time-in-app. Session brevity is a feature, not a bug.
- Silhouette is not trying to be a general-purpose chatbot. It has one job.
- Silhouette is not trying to build the largest content library. It is trying to build the best-matched one.
- Silhouette is not trying to be a content platform. It surfaces resources and links out to original creators.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Recommendations feel generic or poorly matched | Invest in metadata richness, emotional-state tagging, and ranking quality; prioritize match precision over library size |
| Product drifts toward therapy-adjacent expectations | Strong, consistent boundary language; clear scope definition; crisis routing |
| Users use it once and never return | Frame as episodic; measure session value, not daily retention; optimize for return-when-stuck, not return-every-day |
| Undifferentiated from ChatGPT | Guided intake, curated library, explained recommendations, and emotional-state matching are specific differentiators that open-ended chat cannot replicate |
| Content library too thin at launch | Start narrow (3–4 stuck moments, 15–30 sources); expand after validating match quality |
| Copyright risk from storing third-party content | Store metadata + short annotations for third-party content; full text only for licensed or in-house content; link out to originals |
| User trust erosion from monetization | Explicitly prohibit emotional exploitation, disguised sponsored content, and emotional-data selling; trust-centered business model from day one |
| Cold start problem for new users | Micro-onboarding (emotional state, format preference, time budget); system works well even without history |
| Scope creep during development | Phase-gated roadmap; MVP decision filter; strict feature discipline |

---

## Long-Term Moat

Silhouette's defensibility does not come from "using AI" — every competitor has access to the same models. The moat comes from:

1. **Proprietary content graph.** A curated, richly tagged library of resources organized by emotional state, format, tone, creator, and effectiveness — built over time and not easily replicated.
2. **Emotional-context recommendation quality.** The ability to match a user's specific stuck moment to the right resource, better than search engines, content platforms, or generic AI.
3. **Preference learning.** Accumulated knowledge of what works for individual users — format, tone, creator, action style — that makes recommendations more precise over time.
4. **Workflow design.** The guided micro-reset flow itself — intake, classification, retrieval, explanation, action — is a UX innovation that competitors would need to replicate deliberately.
5. **Trust and brand.** Being the tool people trust with vulnerable moments creates switching costs that features alone cannot.
6. **Creator partnerships.** Licensed content, exclusive resources, and creator relationships that deepen the library and cannot be copied by scraping.

---

## Business Model Direction

### Likely strongest options

- **Freemium consumer model:** Core micro-reset experience is free. Premium tier adds deeper personalization, session history, expanded resource access, and preference profiles.
- **B2B and institutional partnerships:** University counseling center integrations, corporate wellness programs, coaching platform partnerships.
- **Premium content experiences:** Licensed or exclusive content from trusted creators, available to premium users.

### Trust-preserving constraints

- No sponsored content disguised as organic recommendations.
- No selling or sharing of emotional-state data with advertisers or third parties.
- No emotional exploitation — creating dependency, exaggerating problems, or withholding value to drive upgrades.
- Monetization must strengthen trust, not erode it. If a revenue stream requires compromising recommendation integrity, it is off the table.
