# Silhouette — Prompt Library

> Reusable prompts for **Cursor**, **Claude Code**, and manual AI sessions.
>
> **Product truth** lives in `ai/guides/` and `aiDocs/`. This file is for *how to work on* the project — not what Silhouette is.

---

## How to use

1. **Building the next system-map component?** → Use **[Component Builder + Review](#silhouette-component-builder--review-prompt)** (primary workflow below).
2. Read `ai/guides/silhouette_system_map.md` for component number, dependencies, and output file names.
3. Paste the full Component Builder prompt (or tell the agent: *"Follow the Component Builder prompt in `ai/prompts/silhouette_prompt_library.md` for Component {N}: {Name}."*).
4. Prefer **one owner per task** — don't run the same job in Cursor and terminal Claude at once on the same branch.

| Tool | Best for |
|------|----------|
| **Cursor Agent** (this chat) | Edits in-repo, reviewing diffs, shorter follow-ups after a component doc is drafted |
| **Claude Code** (terminal) | Full Component Builder pass (long doc + review + research + revision in one session) |

### Quick invoke (after the agent has the repo open)

```
Follow the "Silhouette Component Builder + Review Prompt" in
ai/prompts/silhouette_prompt_library.md.

Build Component {N}: {Component Name}.
```

Example:

```
Follow the "Silhouette Component Builder + Review Prompt" in
ai/prompts/silhouette_prompt_library.md.

Build Component 5: Corpus / Ingestion Pipeline.
```

---

## Orientation (paste first when context is thin)

```
You are working on Silhouette — a personalized insight retrieval product for young
professionals (22–32) in career/purpose/motivation ruts. One insight per session from
real human sources, not AI-generated advice.

Read ai/guides/silhouette_system_map.md for component boundaries.
Read ai/guides/silhouette_strategic_summary.md for current product direction.

Do not redesign the assignment MVP unless I ask. Stay decision-oriented; no marketing fluff.
```

---

## Component status (planning docs)

| # | Component | Guide path | Status |
|---|-----------|------------|--------|
| 1 | User Problem Model | `ai/guides/user_problem_model.md` | Done |
| — | User Resonance Model | `ai/guides/user_resonance_model.md` | Done |
| 2 | Content / Source Strategy | `ai/guides/content_source_strategy.md` (+ rubric, candidates) | Done |
| 3 | Retrieval Philosophy | `ai/guides/retrieval_philosophy.md` | Done |
| 4 | Intake / Diagnostic Flow | `ai/guides/intake_diagnostic_flow.md` | Done |
| 5 | Corpus / Ingestion Pipeline | `ai/guides/corpus_ingestion_pipeline.md` (expected) | Next |
| 6+ | See system map | `ai/guides/silhouette_system_map.md` | — |

---

## Vision and strategy

### Sharpen product vision

Use the full prompt in **`ai/guides/silhouette_vision_prompt.md`** (founding story + structured output sections). Do not duplicate it here.

### Strategic summary → aiDocs alignment

```
Read ai/guides/silhouette_strategic_summary.md in full. Use it as the source of truth to
rewrite aiDocs/context.md, aiDocs/prd.md, aiDocs/mvp.md, and aiDocs/architecture.md.

The strategic summary supersedes anything currently in those docs. Keep rewrites specific
and decision-oriented — no marketing language or vague platform framing.
```

---

## Code (assignment MVP)

### Wire agent behavior to a guide

```
Read ai/guides/{GUIDE_NAME}.md and src/agent/systemPrompt.ts.

Update systemPrompt.ts so runtime behavior matches the guide for:
- intake (vague vs specific, clarifying questions)
- retrieval (when to call knowledge_base first)
- response format (one insight, attribution, why it applies)

Keep changes minimal. Do not add new tools. Preserve crisis routing.
After edits, tell me what test prompts to run in the browser and CLI.
```

### Implement intake flow (when ready for code)

```
Read ai/guides/intake_diagnostic_flow.md and ai/guides/user_resonance_model.md.

Implement the smallest change in src/agent/systemPrompt.ts (and UI if needed) to match
the guide's intake rules. Assignment stack: LangChain tool-calling agent, session memory,
knowledge_base RAG.

Prioritize: one clarifying question when vague, retrieval-ready signal before tools.
Do not add accounts, feedback UI, or new dependencies unless I ask.
```

### Corpus / RAG

```
Read ai/guides/content_source_strategy.md and docs/sources/ existing .md format.

Add {N} new source document(s) under docs/sources/ with correct metadata headers.
Run or verify: npx tsx scripts/ingest-docs.ts

Do not change chunking defaults unless the guide requires it.
```

### Test agent end-to-end

```
Start from assignment test checklist:
- Vague: "I feel like I'm in a rut" → clarifying question(s), no fabricated citations
- Specific: "I feel overwhelmed and avoiding what matters" → knowledge_base + attribution
- Memory: follow-up in same session uses prior context
- Calculator: "Break 4 hours into 3 chunks"
- Web: query that should fall back to web_search

Run: npm run dev and/or npx tsx scripts/test-agent.ts
Report tool names from logs and whether citations came from tool output.
```

---

## Docs and commits

### Commit guides only

```
Commit my latest ai/guides/ changes to branch {BRANCH_NAME}.
Message should summarize what component or guide was added/updated.
Do not include .env. Push to origin.
```

### README / assignment status

```
Update README.md to reflect current implementation status and ai/guides/ structure.
Keep it assignment-demo friendly: setup, env vars, how to test, where RAG sources live.
Concise; no marketing.
```

---

## Silhouette Component Builder + Review Prompt

Use this prompt whenever we are ready to build the next major component of the Silhouette system architecture.

### Purpose

You are helping build Silhouette component by component.

For the component I specify, complete the full process in one pass:

1. Identify and summarize the component.
2. Define its major subcomponents.
3. Build the full component as a planning/system-design document.
4. Critically review the completed document.
5. Score it out of 10.
6. Identify the top 3–5 weaknesses.
7. Research best practices for fixing those weaknesses.
8. Revise the document so those weaknesses become strengths.
9. Finish with a clear summary of what changed and why.

This process should create a strong first serious version of each component, followed immediately by the same review/refinement process we have been using manually.

---

### Project Context

Silhouette is a personalized insight and guidance product for young professionals who feel stuck in career, purpose, momentum, motivation, or identity-related ruts.

The product retrieves highly relevant human-sourced insights that match both:

1. The user's current stuck state
2. The kind of insight, voice, and delivery style that will actually land for them

Silhouette is not generic AI advice. It is not therapy. It is not a motivational quote engine.

The core product idea is:

A user describes what feels stuck. Silhouette diagnoses the current stuck state, understands enough about what kind of insight may resonate, retrieves a high-quality human-sourced insight from a curated corpus, and presents it in a way that feels timely, relevant, and useful.

We are still in planning/system-design mode unless I explicitly say otherwise.

Do not write production code.
Do not implement app logic.
Do not build UI screens.
Do not create scripts unless I specifically ask.
Do not choose final infrastructure unless the component requires technology decision framing.

The goal is to create strong product/system architecture documents that future implementation can follow.

---

### Current Completed Components

Before working on any new component, review the existing project docs.

Read all relevant files, especially:

- `aiDocs/context.md` if it exists
- `ai/guides/user_problem_model.md`
- `ai/guides/user_resonance_model.md`
- `ai/guides/content_source_strategy.md`
- `ai/guides/source_scoring_rubric.md`
- `ai/guides/source_candidates.md`
- `ai/guides/retrieval_philosophy.md`
- `ai/guides/intake_diagnostic_flow.md`
- any other existing component docs
- any strategic summary, system map, architecture map, or component roadmap docs related to Silhouette

Do not assume all of these files exist. Read what exists and use it as source-of-truth context.

The completed work so far includes:

#### Component 1 — User Problem Model

Defines the stuck states Silhouette serves.

Current states include:

- Direction Collapse
- Engagement Drought
- Inaction Loop
- Possibility Paralysis
- Identity Transition
- Momentum Gap

MVP priority states:

- Direction Collapse
- Engagement Drought
- Inaction Loop

Core idea:

The User Problem Model defines the user's current stuck state, not the whole person.

#### Component 2 — Content / Source Strategy

Defines what Silhouette retrieves from.

Includes:

- source eligibility
- weak/ineligible sources
- source scoring
- attribution principles
- source candidates
- source governance
- corpus quality
- source density
- maintenance rules

#### Supporting Layer — User Resonance Model

Defines how different users receive insight differently.

Insight Type:

- mechanism
- story
- reframe
- permission

Voice Register:

- direct/challenging
- warm/affirming
- intellectual/measured
- vulnerable/personal
- expert/scientific

Core idea:

Two users can be in the same stuck state but need different kinds of insight to actually experience a shift.

#### Component 3 — Retrieval Philosophy

Defines how Silhouette thinks about retrieval before implementation.

Includes:

- unit of retrieval
- Structured Insight Object
- metadata schema
- semantic search vs structured filtering
- resonance-aware matching
- fallback logic
- definition of "well-matched"
- retrieval evaluation
- logging
- RetrievalQuery structure

#### Component 4 — Intake / Diagnostic Flow

Defines how raw user input becomes a structured RetrievalQuery.

Includes:

- input design
- state classification
- confidence scoring
- clarifying question strategy
- resonance signal capture
- safety/scope handling
- first-session vs returning-user intake
- failure handling
- intake evaluation

---

### Instructions for the New Component

When I tell you the next component number and name, follow this process.

Example:

"Use this prompt to build Component 5: Corpus / Ingestion Pipeline."

You should then infer the correct output file name based on the component.

Examples:

- Component 5: `ai/guides/corpus_ingestion_pipeline.md`
- Component 6: `ai/guides/retrieval_engine.md`
- Component 7: `ai/guides/response_presentation.md`
- Component 8: `ai/guides/trust_safety_credibility.md`
- Component 9: `ai/guides/feedback_quality_loop.md`

If the file name is unclear, choose a clear snake_case name and tell me what you chose.

---

### Phase 1 — Component Summary

Before building the document, summarize the component.

Include:

1. What this component is
2. Why it matters
3. How it connects to the previous components
4. What future components depend on it
5. The major subcomponents it should include
6. The biggest design risks
7. What decisions this component needs to lock in
8. What should remain open for later implementation

Keep this section brief but useful.

Do not build the full document until this summary is complete.

---

### Phase 2 — Build the Full Component Document

Create or update the relevant component document in `ai/guides/`.

The document should be a planning/system-design artifact, not implementation code.

Use this general structure unless the component clearly requires a better one:

#### Component [Number]: [Component Name]

##### Summary

Briefly explain what this document defines and how to use it.

##### 1. Purpose and Scope

Explain what this component is and is not.

Clarify:

- what decisions this component owns
- what decisions belong to earlier components
- what decisions belong to later components
- what should not be implemented yet

##### 2. Relationship to Existing Components

Explain how this component connects to:

- User Problem Model
- User Resonance Model
- Content / Source Strategy
- Retrieval Philosophy
- Intake / Diagnostic Flow
- any other completed component

Be specific. Do not give generic "it connects to everything" language.

##### 3. Design Principles

Define the principles that should guide this component.

These should be practical, decision-making principles, not motivational statements.

Each principle should explain:

- what it means
- why it matters
- what bad behavior it prevents

##### 4. Subcomponent Overview

List and define the major subcomponents.

For each subcomponent, explain:

- what it is
- why it matters
- inputs
- outputs
- major decisions
- failure modes
- MVP vs future scope

##### 5. Main System Flow

Define how this component works from beginning to end.

Use a step-by-step flow.

For each step, include:

- goal
- input
- output
- owner or responsible layer
- quality gate
- common failure modes

##### 6. Data / Object Model

If this component produces, consumes, or modifies structured objects, define them.

Include:

- object names
- fields
- required vs optional
- MVP vs future
- source of each field
- where the field is used later

If the component does not require a data model, explain why.

##### 7. Decision Rules

Define the key decision logic.

Examples:

- when to continue vs stop
- when to ask vs infer
- when to retrieve vs fallback
- when to approve vs reject
- when to log vs ignore
- when to route to another component

Make these rules specific enough that future implementation can follow them.

##### 8. Quality Gates

Define how this component prevents bad outputs from moving downstream.

Include:

- required checks
- human review points if applicable
- AI-assisted review points if applicable
- rejection criteria
- rework criteria
- approval criteria

##### 9. Failure Handling

Define what happens when this component cannot proceed normally.

Include:

- common failure cases
- system behavior
- what should be logged
- whether the user is affected
- whether the issue requires human review

##### 10. Evaluation Plan

Define how we will test this component before relying on it.

Include:

- test set design
- target metrics
- examples of passing and failing cases
- manual review requirements
- edge cases
- how real failures should be fed back into the evaluation set

##### 11. MVP Recommendation

End with a clear practical MVP recommendation.

In plain language, define:

- what to build first
- what to avoid overbuilding
- what must be true before moving to implementation
- what should be deferred
- what is "good enough" for the first serious prototype

##### 12. Open Questions

List unresolved questions.

For each, explain:

- why it matters
- what decision is needed later
- which future component or prototype test should resolve it

---

### Phase 3 — Critical Review

After building the full document, review it critically.

Do not treat your own first draft as correct.

Score the document out of 10 as a foundational product/system artifact.

Give:

1. Overall score out of 10
2. One-paragraph justification
3. Whether it is too high-level, detailed enough, or overly complex
4. Whether it is strong enough to guide future implementation
5. Whether it is too implementation-specific anywhere
6. Whether it creates any contradictions with earlier components
7. Whether it leaves any important decisions unresolved
8. Whether it adds unnecessary complexity

Be direct and critical. Do not give vague praise.

---

### Phase 4 — Identify Top 3–5 Weaknesses

Identify the top 3–5 weaknesses, blind spots, risky assumptions, or missing pieces in the component document.

Do not list minor issues.

Focus on issues that could cause:

- weak product logic
- bad user experience
- implementation confusion
- unreliable retrieval
- poor personalization
- poor source quality
- safety/trust problems
- overengineering
- under-specification
- misalignment with earlier components
- future scalability problems

For each weakness, write:

#### Weakness [Number]: [Name]

##### Why it matters

Explain why this weakness is important.

##### What could break if ignored

Explain what would likely go wrong later.

##### Initial recommendation

Briefly state what likely needs to change.

---

### Phase 5 — Research Best Practices

After identifying the weaknesses, research diligently how to fix them.

Use available research tools if configured:

- web research
- Perplexity
- Context7
- Firecrawl
- academic/web sources
- product design resources
- UX resources
- recommender system resources
- RAG/retrieval resources
- conversational AI resources
- trust/safety resources
- data labeling resources
- evaluation resources
- system architecture resources

Be resource-intensive if needed. This is a design-critical process.

For each weakness, research best practices relevant to that weakness.

Summarize:

1. Best practices found
2. How those best practices apply to Silhouette specifically
3. What current document decision should be kept
4. What current document decision should be changed
5. What should be deferred to a later component or implementation phase

Do not copy generic advice. Translate research into Silhouette-specific decisions.

---

### Phase 6 — Revise the Component

After the review and research, update the component document.

Do not rewrite the entire document from scratch unless necessary.

Refine it by:

- preserving strong decisions
- weakening overconfident claims
- adding missing sections or clarifications
- simplifying anything too heavy for MVP
- strengthening anything future implementation depends on
- clarifying MVP vs V2 vs future
- clarifying what is locked in vs open
- improving alignment with previous components
- improving evaluation and quality gates
- making the component more practical and useful

The revised document should be stronger, not just longer.

Avoid creating theoretical bloat.

---

### Phase 7 — Final Review Summary

After updating the file, provide a concise but clear summary with:

1. Component name and file created/updated
2. Original score out of 10
3. Revised score out of 10
4. Top weaknesses found
5. Best-practice research themes used
6. Main changes made
7. Remaining open questions
8. Dependencies on earlier or future components
9. Decisions that should be revisited later

---

### Global Rules

Follow these rules every time this prompt is used:

- Do not write production code unless explicitly asked.
- Do not implement the system yet.
- Do not create scripts unless explicitly asked.
- Do not build UI screens.
- Do not choose final infrastructure unless the component requires a technology decision framework.
- Do not over-engineer.
- Do not make the document longer just to seem thorough.
- Prefer clear decisions over endless options.
- Label MVP vs future clearly.
- Preserve Silhouette's core differentiation:
  - state-matched insight
  - resonance-aware retrieval
  - human-sourced content
  - high-quality curated corpus
  - low-friction user experience
  - trust through attribution and clarity
- Be critical, specific, and practical.
- When uncertain, state the uncertainty and explain what would resolve it.
- Make the final document useful enough that a future implementation agent can build from it.

---

### Final Output Required

When complete, return:

1. The component summary
2. Confirmation that the component document was created or updated
3. The critical review score
4. The top weaknesses found
5. The best-practice research themes used
6. The main changes made after revision
7. Remaining open questions
8. Any recommended next component or follow-up action

---

## Placeholders for your own prompts

Add sections above this line or in a new `ai/prompts/` file as you discover what works.

---

## Related files (not IDE prompts)

| File | Role |
|------|------|
| `src/agent/systemPrompt.ts` | **Runtime** LLM instructions for the live app |
| `ai/guides/silhouette_vision_prompt.md` | One-shot vision sharpening session |
| `ai/guides/silhouette_strategic_summary.md` | Handoff doc for doc rewrites |
| `ai/guides/silhouette_system_map.md` | Component list and dependencies |
| `aiDocs/*.md` | Assignment-aligned PRD, context, architecture, MVP |
| `ai/roadmaps/*.md` | Phased implementation plan |
