# Silhouette — MVP Architecture

> This document describes the high-level agent architecture for the assignment version of Silhouette.
> It is designed to satisfy the BYU multi-tool AI agent course requirements while preserving the product vision for future development.

---

## Architecture Purpose

Silhouette's MVP must serve two goals simultaneously:

1. **Assignment compliance.** The BYU course requires a multi-tool chatbot agent using LangChain.js that demonstrates the ReAct pattern. The agent must include a calculator tool, a web search tool, and a RAG tool over at least 5 real documents with source attribution. It must also support conversation memory and a web UI.

2. **Product credibility.** The MVP should still feel like a real guided reset tool for young adults who are stuck, not just a demo stitched together to meet a rubric. The tools should have clear, natural jobs within the Silhouette experience.

This architecture document defines how both goals are met with a single, simple agent design.

---

## Why An Agent Is Justified

Not everything in Silhouette requires agent-level reasoning. Here is a clear breakdown.

### What could be single-shot prompting
- Generating an empathetic acknowledgment of the user's feelings
- Writing a next-step suggestion from a fixed template
- Producing the final formatted output once all information is gathered

### Why the MVP still uses agent behavior
- The assignment requires a ReAct-style agent that reasons over multiple tools.
- Silhouette genuinely benefits from multi-step reasoning: the agent must interpret the user's emotional state, decide whether the curated knowledge base has a good match, optionally supplement with a web search, and sometimes use the calculator to make a next step concrete. These decisions depend on each other and on the conversation so far.
- The agent must choose which tool to invoke based on the user's input, not follow a hardcoded sequence. That is real tool-selection reasoning, not artificial.

The agent earns its complexity by combining intake interpretation, retrieval, and response generation across turns — not by doing any one of those things alone.

---

## Required Assignment-Aligned Tools

The MVP includes exactly three tools, matching the assignment requirements.

---

### Tool 1: `knowledge_base_rag`

**What it does:**
Performs vector similarity search over a curated set of documents — transcripts, articles, short guidance pieces, and custom insight cards — and returns the most relevant chunk(s) with source attribution.

**Why it exists in the assignment version:**
The assignment requires a RAG tool over at least 5 real documents with source attribution in every response.

**How it fits naturally into Silhouette:**
This is the core value tool. Silhouette's entire promise is surfacing the right hope-building resource for the user's exact stuck moment. RAG is how the agent finds that resource from a curated library instead of generating generic advice from the base model.

**Likely inputs:**
- A search query derived from the user's described stuck moment and emotional state (e.g., "overcoming avoidance and fear of starting after procrastinating")

**Likely outputs:**
- One or more relevant text chunks
- Source metadata: title, author/creator, type (podcast transcript, article, custom insight), and a link or reference identifier

**When the agent should use it:**
On every session where the user describes a stuck moment. This is the default first retrieval step. The agent should always check the curated knowledge base before falling back to web search.

---

### Tool 2: `web_search`

**What it does:**
Searches the public web for relevant resources using a search API (e.g., Tavily). Returns titles, snippets, and URLs.

**Why it exists in the assignment version:**
The assignment requires a web search tool.

**How it fits naturally into Silhouette:**
Web search supplements the curated knowledge base. If RAG results are weak or if the user asks about something outside the curated library, web search can find a relevant podcast episode, article, or short video that the knowledge base does not yet contain.

**Likely inputs:**
- A targeted search query based on the user's stuck moment and what kind of resource might help (e.g., "short podcast clip about getting out of a rut after feeling behind in your 20s")

**Likely outputs:**
- Titles, snippets, and URLs from public results
- The agent selects the most relevant result and presents it with context

**When the agent should use it:**
- When RAG returns low-confidence or poorly matched results
- When the user asks for something specific the curated library does not cover
- When the user requests a different resource after the first recommendation

Web search should not be the default path. The curated knowledge base should be checked first. Web search is a fallback and supplement, not the primary retrieval mechanism, because unfiltered web results risk returning generic, low-quality, or off-tone content.

---

### Tool 3: `calculator`

**What it does:**
Evaluates mathematical expressions and returns numeric results.

**Why it exists in the assignment version:**
The assignment requires a calculator tool.

**How it fits naturally into Silhouette:**
The calculator is not the emotional core of Silhouette, but it has a genuine supporting role. When the agent suggests a practical next step, it can use the calculator to make that step concrete and quantified.

**Realistic use cases within Silhouette:**
- Breaking down an overwhelming task into time blocks: "If you have 3 hours before your deadline and 6 sections to review, that is about 30 minutes per section."
- Estimating a small commitment: "If you spend 15 minutes a day for the next 5 days, that is 75 minutes total — just over an hour."
- Helping the user see that a next step is smaller than it feels: "You said the assignment is 2000 words. If you write 250 words tonight, you are already 12.5% done."
- Simple scheduling math for a reset plan: "If you start at 7 PM and want to be done by 9 PM, you have 120 minutes."

These calculations are simple, but having the agent compute them live within the conversation makes next steps feel more real and less abstract. The calculator should be invoked naturally when a next step benefits from a number, not forced into every conversation.

**Likely inputs:**
- A math expression as a string (e.g., "2000 / 250", "15 * 5", "180 / 6")

**Likely outputs:**
- A numeric result the agent weaves into its response

**When the agent should use it:**
When the suggested next step involves a quantity, time estimate, or breakdown that would be more useful as a concrete number than a vague suggestion. The agent should not use the calculator gratuitously — only when the math genuinely helps the user see that the step is doable.

---

## Conversation Memory

### How it works
The agent maintains conversation history within a single session using LangChain's built-in memory (e.g., `BufferMemory` or `ConversationBufferMemory`). Each user message and agent response is appended to the history and included in subsequent LLM calls.

### What should be remembered between turns
- What the user said about how they are feeling
- What stuck moment was identified
- What resource was already recommended (so the agent does not repeat itself)
- What next step was given
- Any follow-up questions or clarifications from the user

### How memory improves the experience
- The user can say "tell me more about that" or "can you give me a different resource" and the agent understands the context.
- The agent can build on earlier turns: "Earlier you mentioned you have been avoiding your assignment — here is something specifically about re-entering after avoidance."
- Follow-up questions feel natural instead of resetting the conversation.

### MVP simplicity
For the assignment version, memory is session-scoped only. There is no cross-session persistence, no user profiles, and no long-term storage. When the user closes the browser or starts a new conversation, memory resets. This is sufficient for the MVP and avoids unnecessary complexity.

---

## MVP User Flow

```
1. User opens the web UI.
2. Silhouette greets the user briefly and asks a low-effort intake question.
   Example: "Hey — what is going on for you right now?"
3. User describes their stuck moment in 1–3 sentences.
4. Agent may ask one clarifying follow-up.
   Example: "Is this more about avoiding something specific, or a general heavy feeling?"
5. Agent internally classifies the stuck pattern (avoidance spiral, post-doomscroll slump,
   "I'm behind" paralysis, or comparison crash).
6. Agent calls knowledge_base_rag to retrieve a matching resource.
7. If RAG results are strong:
   → Agent presents the resource, a "why this" explanation, and one next step.
   → If the next step benefits from a number, agent calls calculator.
8. If RAG results are weak:
   → Agent calls web_search to find a supplemental public resource.
   → Agent presents the best result with honest framing.
9. User can ask a follow-up, request a different resource, or end the session.
10. Memory keeps the full conversation coherent across turns.
```

The agent decides which tools to call based on the conversation, not a fixed script. This is the ReAct reasoning loop the assignment requires.

---

## RAG Design

### Document requirements
The assignment requires at least 5 real documents. Silhouette should aim for 15–30 quality sources at launch, organized around the 3–4 supported stuck moments.

### What goes into the knowledge base
Acceptable source types:
- Podcast transcripts or transcript excerpts (e.g., Mel Robbins, Dr. K / HealthyGamerGG, Jay Shetty, Brené Brown, Ali Abdaal)
- Short articles or blog posts from credible voices
- Custom "insight cards" — original short documents summarizing a key idea, written by the developer, that distill practical advice for a specific stuck moment
- Excerpts from free public resources (TED talks, commencement speeches, short essays)

### Source quality criteria
A source belongs in the knowledge base if it:
- Addresses a specific stuck moment, not vague inspiration
- Comes from a trusted, recognizable, or credible voice
- Is practical or perspective-shifting, not just motivational fluff
- Is short enough to excerpt meaningfully (under 10 minutes of audio, under 2000 words of text)
- Can be attributed clearly (title, creator, link)

### Chunking and tagging
Each document should be chunked into passages of roughly 300–500 tokens. Each chunk should carry metadata:
- `source_title` — name of the podcast episode, article, etc.
- `source_author` — creator or speaker
- `source_type` — podcast_transcript, article, custom_insight, talk_excerpt
- `source_url` — link to the original resource (if available)
- `stuck_moment_tags` — one or more of: avoidance, doomscroll, behind_in_life, comparison, overwhelm, low_confidence, loneliness, directionlessness
- `tone` — practical, gentle, direct, story-based

### Source attribution in responses
Every resource recommendation must include the source title, author, and type. If a URL is available, it should be included so the user can access the full resource. This satisfies the assignment's source attribution requirement and is also core to the product experience.

### Why RAG is the core value tool
The calculator helps with numbers. Web search helps with fallback discovery. But RAG is what makes Silhouette feel like Silhouette. The curated knowledge base is the product's moat — it is the reason the agent can surface something relevant, trustworthy, and well-matched instead of generating generic advice or returning noisy search results.

If the RAG tool works well, the product works. If it does not, nothing else compensates.

---

## Low-Confidence and Failure Behavior

### Agent is unsure what stuck moment the user is in
The agent should ask one more clarifying question. If still unclear after two follow-ups, the agent should offer a general grounding resource and a simple next step without pretending to understand more than it does.

### RAG returns weak results
If the best retrieved chunk has low relevance, the agent should:
1. Acknowledge honestly: "I do not have a perfect match in my library for what you are describing."
2. Fall back to web search for a supplemental resource.
3. If web search also returns nothing strong, offer a general next-step suggestion and invite the user to describe their situation differently.

### Web search results are not useful
The agent should not present a web result it is not confident about. Instead, it should say something like: "I could not find something that feels right for this moment. Here is a small next step you can try anyway."

### General principle
Silhouette should never fake confidence. Honest uncertainty with a simple fallback is better than a poorly matched recommendation that erodes trust.

---

## Safety Boundaries

### What Silhouette is designed for
Helping young adults who feel stuck, overwhelmed, discouraged, or avoidant — but who are still functional and able to act — regain momentum through one resource and one next step.

### What Silhouette is not designed for
- Active suicidal ideation or self-harm
- Clinical depression, anxiety disorders, or other diagnosable conditions
- Crisis intervention of any kind
- Replacing therapy or counseling

### How the MVP should handle boundary cases
If the user's input suggests they may be in crisis or need clinical support, the agent should:
1. Acknowledge what they shared with empathy and without judgment.
2. Clearly state that Silhouette is not equipped to help with what they are describing.
3. Provide a short list of real resources: 988 Suicide and Crisis Lifeline (call or text 988), Crisis Text Line (text HOME to 741741), and a suggestion to reach out to a counselor or trusted person.
4. Not continue the normal reset flow.

This routing should be implemented in the system prompt as a clear instruction, not as a separate tool. It does not need to be complex — just reliable and respectful.

### Tone guideline
Silhouette should always be:
- supportive without being clinical
- practical without being cold
- honest without being preachy
- encouraging without being fake

---

## MVP Implementation Philosophy

- **Three tools, no more.** The assignment requires calculator, web search, and RAG. That is exactly what Silhouette needs. Do not add a fourth tool unless going for the stretch goal.
- **Simple web UI.** A clean chat interface is sufficient. No dashboards, no sidebars, no complex layouts. The conversation is the product.
- **Working memory over polish.** Conversation memory that actually makes follow-ups coherent is more valuable than visual design.
- **Clean source attribution.** Every resource recommendation should clearly cite its source. This satisfies the assignment and is also the right product behavior.
- **Structured logging.** Log tool calls, their arguments, and their results so the agent's reasoning is visible and debuggable. This is an assignment requirement and good engineering practice.
- **Incremental commits over big bangs.** The repo should show progression: setup → tools → RAG → agent → UI. Not one massive commit.
- **Finish over feature-creep.** A working 3-tool agent with good RAG, clean memory, and a simple UI is a better submission than a half-finished 5-tool agent with streaming and persistent storage.

---

## Required Supporting Repo Pieces

These are not tools or architecture components, but they are required by the assignment and should be created alongside the agent:

| Item | Purpose |
|---|---|
| `README.md` | What Silhouette does, how to install and run it |
| `.gitignore` | Exclude node_modules, .env, and other non-repo files |
| Structured logging | Log tool calls, arguments, and results so reasoning is traceable |
| Roadmap | Phased plan with progress tracking (already started in `ai/roadmaps/`) |
| Incremental git history | 5+ meaningful commits showing progression: setup → tools → RAG → agent → UI |
| `aiDocs/context.md` | Already created — orients AI tools to the project |
| `aiDocs/prd.md` | Already created — defines the product |
| `aiDocs/mvp.md` | Already created — defines the MVP scope |

---

## Recommended MVP Architecture Decision

### Best architecture for the assignment version
A single LangChain.js ReAct agent with three tools (`calculator`, `web_search`, `knowledge_base_rag`), session-scoped conversation memory, a system prompt that encodes Silhouette's personality and safety boundaries, and a simple web chat UI.

### Exact first toolset
1. `knowledge_base_rag` — vector search over 15–30 curated documents, returning chunks with source metadata
2. `web_search` — Tavily-based web search as a fallback and supplement
3. `calculator` — expression evaluator for making next steps concrete

### What to postpone until after the class project
- Persistent vector store across server restarts
- User accounts or cross-session memory
- Resource type preferences or "show me something else" controls
- Feedback learning loop
- Expanded stuck moment coverage beyond the initial 3–4
- Mobile-responsive or native UI
- Streaming responses (stretch goal for extra credit if time allows)
- Fourth custom tool (stretch goal for extra credit if time allows)

Build the assignment version first. Make it work, make it clean, make it credible. Expand toward the real product vision after submission.
