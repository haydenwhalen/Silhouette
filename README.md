# Silhouette

**An insight-retrieval engine that answers "I feel stuck" with one precise, real human moment — not generic advice.**

A young professional types how they feel in plain language. Instead of generating a motivational paragraph, Silhouette classifies the underlying "stuck state," retrieves the single best-matched **Structured Insight Object (SIO)** from a hand-curated corpus, and presents it as a short verbatim excerpt backed by an embeddable, timestamp-verified video clip — chosen to make the person feel *seen* and capable of a small next move. The product is deliberately **non-clinical** (no therapy, diagnosis, or crisis content).

> Personal R&D project exploring retrieval quality, source honesty, and a corpus-as-product. Built with TypeScript + Next.js + LangChain.js.

---

## Demo

> _UI screenshot / demo GIF placeholder — run locally with `npm run dev` and open http://localhost:3000_
>
> `docs/demo.png` _(add a screenshot here before sharing)_

---

## The problem it solves

Most "self-help" surfaces flood you with generic encouragement. Silhouette does the opposite: it returns **exactly one** insight, matched to your specific emotional situation, sourced from a real person in a real interview/talk — and it can show you the moment on video. The bet is that *one precise human moment* shifts someone more than a wall of advice.

It is organized around **six "stuck states"** drawn from a user-problem model:

| State | The felt experience |
|---|---|
| `direction-collapse` | Got what I wanted / lost faith in the path — now I feel empty and directionless |
| `engagement-drought` | Functioning fine but flat, numb, going through the motions |
| `inaction-loop` | I know exactly what to do and I keep not doing it |
| `identity-transition` | An old role/identity ended and the new one hasn't formed |
| `possibility-paralysis` | Too many options / fear of choosing wrong / keeping all doors open |
| `momentum-gap` | Had momentum, lost it, can't get going again |

## Key features

- **Intake + diagnostic classifier** — maps one free-text prompt (plus an optional clarifying question) to a stuck state and a structured retrieval query, with a multi-tier safety check that keeps the experience non-clinical.
- **3-stage retrieval engine** (see below) — state filter → semantic similarity → resonance re-rank, returning a single insight rather than a list.
- **Video-forward presentation** — every promotable insight links to a real, embeddable clip (YouTube via `youtube-nocookie`) with a per-moment start/end timestamp; the large majority of SIOs are video-backed and timestamped.
- **Source-honesty invariants** — displayed quotes are short, **verbatim**, and confirmed against the source's own captions/transcript; a clip's timestamp and `transcript_verified` flag are only set when actually confirmed (enforced by a media validator).
- **Feedback / quality-signal loop** — captures dwell-adjusted feedback signals and routes weak matches for review.
- **An agentic, human-gated corpus pipeline** — ~37 CLI tools to discover, score, verify, gap-analyze, and validate SIO candidates before a human approves them (see _Tooling_).
- **Next.js chat UI** with conversation/session memory and structured request logging.

## How it works — the 3-stage retrieval engine

The core of the project is `scoredSearch()` in [`src/rag/vectorStore.ts`](src/rag/vectorStore.ts), which composes three stages:

1. **State filter.** The classifier picks the stuck state; the corpus is filtered to SIOs whose primary (or secondary) state tag matches. This keeps results inside the right emotional problem space before any semantic ranking.
2. **Semantic similarity.** The user's query is lightly re-framed (a HyDE-style prefix to reduce query↔document asymmetry) and run against an in-memory vector store (LangChain `MemoryVectorStore`, OpenAI `text-embedding-3-small` embeddings) over a candidate pool (~`k×4`).
3. **Resonance re-rank.** Candidates are re-scored with a **resonance model**: each state has a default _resonance profile_ (`insight_type` + `voice_register`), and the intake classifier may infer a per-query tone _hint_. Matching profiles get a bounded boost (capped to avoid over-weighting); a diverging user hint suppresses the default boost. A final MMR diversity pass guards against any single insight becoming a "retrieval magnet." Scoring weights are externalized in [`src/rag/retrievalConfig.ts`](src/rag/retrievalConfig.ts) so they can be tuned without code changes.

The retrieval health of every change is checked by an automated suite (state-classification, retrieval, magnet-risk, calibration).

## The corpus

The corpus *is* the product. Each SIO is a markdown file with rich YAML frontmatter linked to a source record:

- `corpus/sios/*.md` — **220+** source-backed Structured Insight Objects across the 6 states (state tags, `insight_type`, `voice_register`, credibility tier, verbatim excerpt, full media + timestamp metadata, resonance/match notes).
- `corpus/sources/*.json` — a linked source record per insight (speaker, show, official channel, verified video + embed URL, transcript-verification status).
- The large majority of SIOs are backed by a verified, timestamped video embed.

Speakers span athletes, founders, scientists, writers, poets, artists, and public figures, sourced across many families (TED, Huberman Lab, Louisiana Channel, Players' Tribune, On Being, NPR, commencements, and more) with deliberate diversity and anti-concentration checks.

## Tech stack

- **Language / runtime:** TypeScript, Node.js, `tsx`
- **Web:** Next.js 15 (App Router), React 19, Tailwind CSS v4
- **AI / retrieval:** LangChain.js (`@langchain/*` v1), OpenAI (`gpt-4o-mini` for classification, `text-embedding-3-small` for embeddings), LangChain `MemoryVectorStore`
- **Web search tool:** Tavily
- **Media verification:** YouTube Data API v3 + `yt-dlp` (caption mining for verbatim + timestamp confirmation)
- **Config:** `dotenv`

## Project structure

```
src/
  agent/         # intake classifier, system prompt, request context
  rag/           # vector store + 3-stage retrieval, retrievalConfig, SIO loader
  presentation/  # turns a chosen SIO into the user-facing answer
  feedback/      # quality-signal capture
  memory/        # conversation / session state
  lib/           # config (env), media helpers
  tools/         # knowledge base, web search, calculator, presentInsight
  components/    # React chat UI + InsightMediaCard
  app/           # Next.js app + /api/chat, /api/feedback-signal
corpus/
  sios/          # 220+ Structured Insight Objects (markdown + frontmatter)
  sources/       # linked source records (JSON)
  templates/     # SIO + candidate templates
scripts/         # ~37 CLI tools: discovery, evaluation, verification, gap analysis, QA tests
ai/guides/       # design docs + phase reports for each component
```

## Getting started

**Prerequisites:** Node.js 20+, an OpenAI API key. A Tavily key (web-search tool) and a YouTube Data API key (corpus media tooling) are optional for running the app but needed for those features.

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env and add your keys (OPENAI_API_KEY required)

# 3. Run the dev server
npm run dev
#    open http://localhost:3000
```

Production build:

```bash
npm run build && npm run start
```

### Environment variables

Copy `.env.example` → `.env` and fill in:

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | Classification + embeddings (core app) |
| `TAVILY_API_KEY` | optional | Web-search tool |
| `YOUTUBE_API_KEY` | optional | Corpus media-verification tooling |

`.env` is gitignored and never committed. Keys are read via `process.env` (`dotenv` + Next.js auto-load) — none are hardcoded.

## Tooling (the corpus pipeline)

The repo ships ~37 `npm` scripts that build and guard the corpus. A few highlights:

```bash
npm run ingest                    # build the vector store from the corpus
npm run validate-media            # enforce media/timestamp/verbatim invariants
npm run detect-gaps               # find under-served state × register × type cells
npm run analyze-user-needs        # which real user moments retrieve weakly
npm run test-magnet-risk          # detect any insight dominating a state's results
npm run test-sio-retrieval        # retrieval regression suite
npm run test-state-classification # classifier regression suite
npm run extract-video-timestamps  # yt-dlp caption mining (honesty-gated)
```

(See `package.json` for the full list.)

## Project status & roadmap

**Status:** working prototype with a 220+ SIO corpus and a green QA suite (media validation, state classification, retrieval, magnet-risk). Each subsystem — user-problem model, retrieval philosophy, intake flow, ingestion pipeline, retrieval engine, presentation, trust/credibility, feedback loop, and business model — has a design doc and phase report under `ai/guides/`.

**Roadmap:**
- Closed beta with instrumentation; a feedback-driven retrieval-tuning loop on real usage signals.
- Per-user resonance profiles (cold-start → personalized re-rank).
- Corpus growth toward broader cross-source and cross-cultural diversity; an evaluation harness + human-review playbook for promotion-to-production.
- B2C (freemium + curated insight packs) and B2B (insight tooling for coaches) experiments, gated behind defined validation milestones.

## A note on integrity

Two principles are enforced in code and process, because they're the whole point:
- **Non-clinical:** everyday physiology/psychology framed as supportive levers — never diagnosis, therapy, or crisis content; clips are bounded to exclude adjacent clinical material.
- **Source honesty:** no fabricated quotes, timestamps, or channel verification. Excerpts are short and verbatim, confirmed against the source's captions; `transcript_verified` is set only when truly confirmed.
