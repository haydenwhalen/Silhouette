# Silhouette — Project Context

> Orients collaborators and AI tools to what Silhouette is, who it is for, and what decisions are already locked.

---

## What Silhouette Is

Silhouette is a **personalized insight retrieval** product for young professionals who feel stuck, unclear, or low on motivation.

A user describes their situation in 2–3 sentences. Silhouette asks **one clarifying question**. Then it returns **one specific insight** — a real quote, curated passage, or key line from a podcast or interview — matched to that moment, plus one sentence on why it applies. No playlist. No course. No AI-generated advice.

**Product category:** Context-aware insight retrieval. Not meditation, journaling, coaching, or mental health.

**Core belief:** The right insight from the right person can close the gap between "I'm stuck" and "I have a new way to think about this" in seconds. Today that gap often takes 20–40 minutes of unfocused searching — or never closes.

---

## Target User

**Who:** Young professionals, roughly **22–32**, early-to-mid career. College educated. Employed and functional — not in clinical crisis — but in a **gray zone**: low motivation, unclear direction, sense that something is off.

**Life season:** Post-achievement plateau. Graduated, got a job, built stability — but disconnected from purpose, progress, or identity beyond job title. Days feel repetitive; social life may be thin. In a rut and knows it.

**Fit signals:**

- Already consumes self-improvement content (podcasts, YouTube, newsletters) but without direction
- Overwhelmed by volume of advice; does not know what to prioritize
- Tried journaling, habit trackers, or meditation apps and dropped them (sustained commitment, not a single answer)
- In a hard moment, wants a **fast answer** — not a program or 12-step framework

**Why this wedge (not "anyone in a rut"):** A specific cohort allows one content library, one tone, one set of use cases. Sources like School of Greatness, Huberman Lab, and Dan Martell already speak to this audience.

---

## Core Problem

**Pain:** In a low-energy, unclear season, the user cannot effectively search for what they need. Finding the right insight requires clarity they do not have. Helpful content exists; **discovery cost is too high at the moment they need it most.**

**Stuck moment (typical):** Sunday night before another identical week. After a bad workday when they feel they should be further along. Late night when it seems everyone else has figured something out. They open YouTube, Reddit, or a podcast app and leave ~30 minutes later roughly unchanged.

**Job Silhouette does:** Close that gap **immediately** with one human-sourced, situation-matched insight.

---

## Why Current Alternatives Fail

| Alternative | Gap |
|---|---|
| **ChatGPT / general AI** | Answer is AI-generated, not a named human who lived something similar. "What Dan Martell said about this" ≠ chatbot advice. |
| **YouTube** | User must know what to search; high effort, low signal-to-noise. |
| **Podcasts** | Right episode exists; no app indexes by emotional/situational context. |
| **Journaling apps** | Inward-facing; no outside perspective or curated wisdom. |
| **Headspace / Calm** | Stress/sleep/regulation — not purpose, direction, or getting unstuck. |
| **Books / generic self-help** | Non-contextual; activation energy too high when motivation is low. |

---

## Value Proposition

**Uniquely:** Takes specific emotional/situational input → returns one high-quality, **human-sourced** insight with no search effort.

**Why use it:** In a hard moment, one concrete useful thing from a real person who navigated something similar — in under two minutes.

**Differentiators:**

1. Starts from emotional state, not topic browse
2. One targeted insight — not a list, course, or feed
3. Real curated sources — not generated text
4. Removes discovery burden when burden is highest

---

## What Silhouette Is Not

- **Not therapy or mental health.** No diagnosis, treatment, or clinical framing.
- **Not crisis intervention.** Target is rut/low motivation — not acute crisis, suicidal ideation, or severe depression.
- **Not a wellness platform.** No meditation, sleep, fitness, habit tracking.
- **Not a content feed.** Not Spotify for self-improvement; one thing per session.
- **Not an AI coach or open-ended chatbot.** Retrieval product, not sustained dialogue or emotional support across sessions.
- **Not for everyone in a rut.** Scoped to young professionals in **career, purpose, and motivation** ruts until the wedge is proven.

---

## Strategic Decisions (Locked)

- **One insight per session** for MVP — not ranked lists.
- **Curated corpus** — start with 3–5 high-signal sources; avoid broad scrape before retrieval quality is proven.
- **Emotional/situational context** is the primary retrieval signal — not topic keywords alone.
- **One clarifying question** is a retrieval feature — disambiguates vague input; design it deliberately.
- **Real named human sources** — core differentiator vs. ChatGPT.
- **"Did this land?" feedback** — required to evaluate retrieval; treat as MVP-critical (see implementation status in `mvp.md`).
- **Content licensing:** MVP uses attributed quotes and summaries; full clip serving needs rights before scale.
- **Optimize single session quality** — not daily active users or streak mechanics.
- **No cross-session personalization in MVP** — stateless single session first; assignment may use session memory only for clarifying-turn flow within one visit.

---

## Assignment Prototype vs. Product Direction

The BYU course required a LangChain.js multi-tool agent (calculator, web search, RAG), conversation memory, web UI, and structured logging. That stack is the **delivery vehicle** for the insight-retrieval loop above.

The **assignment MVP** must prove one thing: users in the target state get a genuine **"aha moment"** — insight feels specific, well-matched, and useful. Everything else (personalization, scale, hybrid ranking) is deferred until that is true.

Current prototype corpus: 5 Greater Good Science Center articles (`docs/sources/`). Strategic target corpus: School of Greatness, Huberman Lab, Dan Martell, and similar — to be ingested as retrieval is validated.

---

## Open Validation Questions

1. Can retrieval reliably produce a well-matched insight for real users in real rut states?
2. Is one insight enough, or do users want 2–3 options?
3. Right starting corpus and chunk granularity for retrieval?
4. How do users actually phrase input — vague vs. specific?
5. Does "real human source" matter vs. AI-generated in the moment?
6. Licensing path for audio/video clips at scale?
7. Will new users describe emotional state without prior trust?
8. Is session-only memory enough, or is cross-session history needed for usefulness?
9. What does success look like for an intermittent use case (repeat over months vs. referrals)?
10. B2B (wellness, HR, coaches) — evaluate separately; not MVP scope.
