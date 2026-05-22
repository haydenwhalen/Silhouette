# Silhouette — System Map & Component Reference

> **How to use this document:** This is a conceptual reference, not a build plan. Use it when you are about to start work on any component and need to understand where that component sits, what it depends on, and what depends on it. Use it to prevent tunnel vision when building any one piece. Use it to orient new collaborators or AI tools to the product's structure before they write a line of code.

---

## What Silhouette Is

A personalized insight retrieval engine for young professionals (22–32) in career, purpose, or motivation ruts. The user describes their situation briefly. The system asks one clarifying question if needed. It returns one real, human-sourced insight — a quote or passage from a credible person who navigated something similar — with one sentence explaining why it applies.

Success is one thing: the user has a genuine aha moment. Not a good experience. Not an interesting response. A real shift in how they see their situation.

---

## The Major Components

### 1. User Problem Model
**What it is:** The structured taxonomy of stuck states Silhouette is designed to address.

**Job:** Define the universe of user problems before anything else is built. Every other component is calibrated against this model — what content to source, what questions to ask, what retrieval signal to use, what success looks like.

**Key sub-questions:**
- What are the 4–6 distinct states inside "career/purpose rut"?
- What does each state look and feel like for the 22–32 cohort?
- Which states are most common? Which are hardest to serve?

**Type:** Product problem.

**Depends on:** Nothing — this comes first.
**Everything else depends on:** This.

---

### 2. Content / Source Strategy
**What it is:** The editorial criteria that govern which sources belong in Silhouette — which creators, shows, books, and interviews are eligible, and why.

**Job:** Define the universe of content before any content is ingested. This is Silhouette's editorial judgment. It determines what the product can and cannot retrieve. It is also a trust signal — a curated library from credible sources is a different product than an aggregated one.

**Key sub-questions:**
- What makes a source high-signal for the 22–32 career/purpose audience?
- Which creators speak to which stuck states?
- What minimum insight density justifies ingesting a source?
- Is this a closed, curated set or eventually semi-open?

**Type:** Product problem + data problem.

**Depends on:** User Problem Model.
**Feeds into:** Corpus / Ingestion Pipeline.

---

### 3. Retrieval Philosophy
**What it is:** The conceptual design of how retrieval works — what signal the system uses, what the unit of retrieval is, and how "well-matched" is defined — before any technical implementation.

**Job:** Answer the hardest design questions before writing retrieval code. Is the unit of retrieval a raw text chunk? A curated excerpt? A structured insight object with tags? What signals matter — semantic similarity, stuck-state category, source credibility, insight type? This shapes the corpus data model, the index design, and the intake flow requirements all at once.

**Key sub-questions:**
- What is the unit of retrieval?
- What metadata must every retrievable insight carry?
- Is embedding similarity alone sufficient, or does retrieval need structured filters?
- What does "well-matched" mean, measurably?

**Type:** AI/retrieval problem + data problem.

**Depends on:** User Problem Model, Source Strategy.
**Feeds into:** Corpus / Ingestion Pipeline, Retrieval Engine, Intake Flow.

---

### 4. Intake / Diagnostic Flow
**What it is:** The interaction logic that translates a user's vague emotional description into a specific, retrievable signal.

**Job:** Produce a retrieval-ready understanding of the user's situation. The intake flow exists entirely to serve retrieval. Its design is determined backward from what the retrieval engine needs to find a well-matched insight.

**Key sub-questions:**
- What is the minimum information needed to retrieve a well-matched insight?
- What is the best single clarifying question for each major stuck state?
- How do you detect when you have enough signal vs. when you need to ask more?
- How do you handle users who are too vague even after one clarifying question?

**Type:** UX problem + AI/retrieval problem.

**Depends on:** User Problem Model, Retrieval Philosophy.
**Feeds into:** Retrieval Engine (provides the query signal).

---

### 5. Corpus / Ingestion Pipeline
**What it is:** The process by which approved source content is transformed into retrievable units — raw content becomes indexed, metadata-tagged insight chunks.

**Job:** Produce the actual data that lives in the index. The corpus is the ceiling of retrieval quality. No retrieval algorithm compensates for a bad corpus. The ingestion pipeline must know what a high-value insight looks like before it processes anything.

**Key sub-questions:**
- How much of chunking and curation is automated vs. editorial?
- What metadata lives on every chunk: speaker, show, topic tags, insight type, stuck-state match, timestamp?
- How do you handle content with mixed insight density (gold buried in filler)?
- What does the data model for a "retrievable insight" actually look like?

**Type:** Data problem + editorial problem.

**Depends on:** Source Strategy, Retrieval Philosophy (defines the data model).
**Feeds into:** Retrieval Engine.

---

### 6. Retrieval Engine
**What it is:** The system that takes a structured user signal and finds the single best insight from the corpus.

**Job:** Match. Take the intake output and return the most relevant insight from the index. This is the mechanical core of the product. Everything else exists to give it good inputs and present its outputs well.

**Key sub-questions:**
- What retrieval method: pure semantic, hybrid (semantic + metadata filters), re-ranking?
- How is retrieval quality evaluated — what is the benchmark?
- What happens when the corpus has nothing genuinely good for a user's situation?
- At what corpus size does the approach degrade?

**Type:** AI/retrieval problem.

**Depends on:** Retrieval Philosophy, Corpus / Ingestion Pipeline, Intake / Diagnostic Flow.
**Feeds into:** Insight Presentation Layer.

---

### 7. Insight Presentation Layer
**What it is:** The format and framing of how the retrieved insight is delivered to the user.

**Job:** Maximize the probability of an aha moment from a retrieved result. The same content can land completely differently depending on how it's framed, attributed, and connected to the user's specific situation. Presentation is a multiplier on retrieval quality.

**Key sub-questions:**
- What format makes a direct quote feel most credible and alive?
- How specific should the "why this applies" sentence be?
- How do you present attribution in a way that signals credibility without feeling academic?
- Is text the right delivery format, or does a linked timestamp to the original audio/video change the experience?

**Type:** UX problem.

**Depends on:** Retrieval Engine (produces the content), User Problem Model (determines tone and framing).
**Feeds into:** User experience outcome.

---

### 8. Trust / Credibility Architecture
**What it is:** The design choices across onboarding, copy, attribution, and visual design that determine whether a first-time user trusts Silhouette enough to be honest about their situation.

**Job:** Lower the vulnerability barrier at the entry point. Users will only input a real, honest description of their situation if they trust the product. Without trust, the intake signal is sanitized and retrieval fails.

**Key sub-questions:**
- What does the product communicate in the first 10 seconds?
- How does the attribution model (real person, real source) signal differently than "AI said this"?
- What does the product explicitly disclaim — and how do you say it without sounding like a legal footer?
- What design choices signal this is not a therapy tool, not a social product, not a chatbot?

**Type:** UX problem + product problem.

**Depends on:** Core experience being defined (you can't design the onboarding until you know what the experience is).
**Feeds into:** Intake quality (trust determines honesty of user input).

---

### 9. Feedback / Quality Signal Loop
**What it is:** The mechanism by which the system learns whether a retrieved insight actually worked.

**Job:** Produce the only ground truth signal on retrieval quality. Without it, you are guessing about whether the product works. With it, you have a data flywheel and an honest basis for roadmap decisions.

**Key sub-questions:**
- What is the minimum viable feedback signal?
- Where in the flow does it appear, and how do you avoid response bias?
- How does negative feedback route into corpus or retrieval improvements?
- What sample size makes the signal meaningful?

**Type:** Data problem + product problem.

**Depends on:** Core experience being shipped and used.
**Feeds into:** Corpus quality decisions, retrieval tuning, roadmap prioritization.

---

### 10. Business Model / Monetization
**What it is:** How Silhouette eventually makes money — pricing model, customer relationship (B2C vs. B2B), and revenue levers consistent with the product's positioning.

**Job:** Determine who the real customer is, which shapes product priorities and what "success" means from a business perspective. Importantly: getting this wrong early creates perverse incentives that distort the product.

**Key sub-questions:**
- Can an intermittent-use product sustain a subscription model?
- Is the B2B angle (HR, coaches, corporate wellness) worth pursuing early as a faster revenue path?
- What engagement metrics are meaningful for a product used once every few weeks or months?

**Type:** Business problem.

**Depends on:** Product-market fit validation.
**Should not influence:** Core product design decisions until the insight quality is validated.

---

## Major Workstreams

| Workstream | Components |
|---|---|
| **User understanding** | User Problem Model, Intake / Diagnostic Flow |
| **Content & retrieval** | Source Strategy, Corpus / Ingestion Pipeline, Retrieval Philosophy, Retrieval Engine |
| **Output & delivery** | Insight Presentation Layer |
| **Trust & safety** | Trust / Credibility Architecture, Safety / Boundary System |
| **Learning & improvement** | Feedback / Quality Signal Loop |
| **Business** | Business Model / Monetization |

---

## Core Systems vs. Supporting Systems

### True core — if these are wrong, nothing else works
1. User Problem Model
2. Content / Source Strategy
3. Retrieval Philosophy
4. Retrieval Engine

### Important but secondary — amplify the core
5. Intake / Diagnostic Flow
6. Insight Presentation Layer
7. Trust / Credibility Architecture
8. Feedback / Quality Signal Loop

### Can wait — do not build yet
9. Business Model / Monetization
10. Corpus / Ingestion Pipeline at scale (relevant once source strategy and retrieval philosophy are decided)

---

## Best Order to Think Through the Project

This is intellectual order, not build order.

**1 → User Problem Model**
Define the taxonomy of stuck states before anything else. You cannot design intake, source strategy, or retrieval without knowing precisely what you're retrieving *for*.

**2 → Content / Source Strategy**
Once you know what states you're serving, decide which sources speak to which states. This is where Silhouette's editorial judgment lives.

**3 → Retrieval Philosophy**
Before building anything, decide what the retrieval signal is, what the unit of retrieval is, and what "well-matched" means measurably. These are design decisions, not engineering decisions.

**4 → Intake / Diagnostic Flow**
Design the intake flow backward from what the retrieval engine needs. The clarifying question exists to produce a better retrieval signal — so you can't design it well until you know what signal retrieval needs.

**5 → Insight Presentation Layer**
Once you know what a good retrieved insight looks like, decide how to present it. Format follows content.

**6 → Trust / Credibility Architecture**
Once the core experience is defined, work backward to ask: what does a first-time user need to see and feel in the first 10 seconds to trust this enough to be honest?

**7 → Feedback / Quality Signal Loop**
Once real sessions are producing real outputs, build the measurement system before drawing any conclusions from usage.

**8 → Business Model**
Last. Don't let business model questions distort product decisions before the core experience is validated.

---

## What Silhouette's Real Engine Is

**The engine is the combination of the User Problem Model and the Retrieval System — but the true competitive moat is the corpus.**

The intake flow can be improved over time. The presentation layer can be polished. The trust architecture is a design problem. But the corpus — a curated, high-signal, insight-dense library of real human content matched to specific stuck states — is the thing that is hardest to replicate and most directly determines whether the product works.

Anyone can build a RAG pipeline. Anyone can write a clarifying question. Nobody else has a hand-curated, intentionally structured index of the exact moments where real, credible people named the exact things a 26-year-old in a career rut needs to hear.

That corpus is not just a technical asset. It is the editorial judgment baked into the product. It is what makes Silhouette different from asking ChatGPT the same question.

**If you get the corpus right, the engine works. If you get the corpus wrong, nothing else fixes it.**

---

## The Likely Traps

**Trap 1 — Building retrieval before defining the resource model.**
The most common error. You build a vector store, ingest content, write a nice pipeline — and then realize the chunks don't carry enough metadata to retrieve by stuck state, and the insight density is too low. You'd have to rebuild the corpus from scratch. Define what a "retrievable insight" looks like before ingesting anything.

**Trap 2 — Treating "finding something" as "finding the right thing."**
The retrieval engine will always return *something*. The gap between topically adjacent and genuinely well-matched is enormous and invisible in logs. Without a feedback mechanism and real user testing, you will fool yourself into thinking retrieval is working when it is mediocre.

**Trap 3 — Over-investing in intake before validating retrieval quality.**
It is tempting to keep refining the diagnostic flow, the clarifying question logic, the multi-turn conversation. But none of it matters if the corpus can't produce a well-matched insight. Validate retrieval quality first. Fix intake afterward.

**Trap 4 — Confusing volume with quality.**
A corpus of 10,000 mediocre chunks will consistently underperform a corpus of 200 curated, high-density insights. Insight density per chunk is what matters. More content is worse if the average quality goes down.

**Trap 5 — Solving trust with copy instead of experience.**
You cannot write your way to user trust. If the first 10 seconds feel generic, blank, or clinical, copy won't fix it. Trust is built through the quality of the first interaction — which means retrieval and presentation have to work before you worry about onboarding language.

**Trap 6 — Letting business model questions distort the product too early.**
Retention metrics, DAU targets, engagement mechanics — all wrong for an intermittent-use product. Don't let business framing push you toward features that contradict what the product is supposed to be.

---

## How the Components Interact

```
User Problem Model
        │
        ▼
Source Strategy ──────────────────────────────────────┐
        │                                              │
        ▼                                              ▼
Retrieval Philosophy ────────────────────► Corpus / Ingestion Pipeline
        │                                              │
        ▼                                              │
Intake / Diagnostic Flow                              │
        │                                              │
        └──────────────────┐                           │
                           ▼                           ▼
                     Retrieval Engine ◄────────── Corpus Index
                           │
                           ▼
                  Insight Presentation
                           │
                           ▼
                      User aha moment
                           │
                           ▼
                  Feedback / Quality Loop ──► Corpus + Retrieval improvement
```

Trust / Credibility Architecture wraps the entire user-facing experience.
Safety / Boundary System gates the intake before the flow starts.
Business Model sits outside the product loop until core validation is complete.
