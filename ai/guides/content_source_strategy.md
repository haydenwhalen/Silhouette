# Silhouette — Content / Source Strategy

> **How to use this document:** This document defines what content Silhouette draws from, how sources are evaluated, and what the philosophy of the corpus is. Read it before adding any source to the corpus. Every source ingestion decision should be traceable to the framework defined here. Use the companion documents — `source_scoring_rubric.md` and `source_candidates.md` — alongside this one when evaluating actual sources.

---

## Purpose of This Component

Content / Source Strategy defines the editorial universe Silhouette retrieves from. It is not a list of sources. It is the judgment system that determines what belongs in that list, how those decisions get made, and what the corpus is designed to become over time.

This component exists because the corpus is the ceiling of retrieval quality. No retrieval algorithm, intake flow, or presentation layer can compensate for a corpus that is poorly curated. If Silhouette's library is full of generic, low-density, or mismatched content, the system will consistently return results that feel adjacent to what the user needs — but not the thing itself. The corpus is the moat. Its editorial quality is what differentiates Silhouette from a user simply asking ChatGPT the same question.

**The job of this component is to answer four questions:**
1. What makes a source worthy of the Silhouette corpus?
2. What disqualifies a source, regardless of its popularity or apparent relevance?
3. What are the source categories and which should be prioritized?
4. What is the philosophy of the corpus itself — how curated, how large, and how it grows?

---

## What Goes Wrong Without This Component

**You ingest content without editorial judgment.** Without a defined framework, source selection becomes intuitive and inconsistent — shaped by whatever is convenient, familiar, or appears popular. "Seems like a good podcast" is not an editorial criterion. The result is a corpus of uneven quality, undefined scope, and no meaningful standard for whether content actually serves the stuck states in the User Problem Model.

**You optimize for volume over quality.** Without a defined threshold for insight density, the natural tendency is to add more content. A corpus of 5,000 mediocre chunks will consistently underperform 200 curated, high-density insights. More content makes the corpus larger and retrieval harder — not better.

**You have no basis for rejecting sources.** Without explicit exclusion criteria, sources that feel vaguely relevant accumulate. Over time this dilutes the corpus with content that is topically adjacent but not genuinely useful for the states Silhouette is built around.

**You lose attributability as a differentiator.** Silhouette's core differentiator is that its insights come from real, named, credible people — not AI-generated text. Without source strategy, this erodes: content enters from unclear sources, attribution becomes inconsistent, and the product becomes a content aggregator rather than a curated insight library.

---

## 1. Source Eligibility Framework

### What Makes a Source Eligible

A source is eligible for the Silhouette corpus if it meets all of the following:

**It produces real, human-attributed insight.**
Every piece of content in the corpus must be traceable to a specific, named human being with relevant credibility. The insight must come from their direct experience, research, or perspective — not AI-generated, ghostwritten at scale, or unattributed. This is non-negotiable. It is Silhouette's core differentiator.

**It directly addresses one or more User Problem Model states.**
The source must produce content that addresses at least one of the defined stuck states with enough specificity to produce a retrievable insight — not merely topical adjacency. A podcast about entrepreneurship is not automatically relevant to Inaction Loop. A specific episode where a credible founder describes the identity shift required before they could start something is relevant. Topic proximity is not state relevance.

**Its speaker has credibility meaningful to the target audience.**
The speaker must be someone a 22–32 year old young professional would find worth listening to — not because they are universally famous, but because they have relevant lived experience or documented expertise in the domain Silhouette serves. A former addict turned entrepreneur speaking about the inaction loop has credibility. A social media influencer offering generic advice does not.

**It has sufficient insight density to justify ingestion.**
The source must produce retrievable insights at a rate that justifies the effort of finding, transcribing, and tagging them. Minimum threshold: at least 2–3 genuinely retrievable insights per hour of content in its best episodes. Below this, the source-level effort cost exceeds the corpus benefit.

**Its content can stand alone without full context.**
A retrieved insight must be understandable without requiring the user to have consumed the full episode. If an insight only makes sense after 90 minutes of setup, it is not retrievable in Silhouette's model.

**Its format allows accurate text extraction.**
The source must be available in a format that allows text extraction — transcript, caption file, or structured text — with sufficient quality for accurate attribution. Audio-only content without transcripts is not automatically excluded but carries higher processing cost.

### What Disqualifies a Source

A source is not eligible if any of the following are true:

- Content is AI-generated, aggregated without attribution, or ghostwritten at scale
- Creator's primary credibility is follower count, controversy, or celebrity — not relevant lived experience or expertise
- Content is primarily entertainment with thin insight (casual conversation, talk show format, no depth)
- Content promotes harmful ideologies, MLM structures, clinical pseudoscience, or conspiracy theories
- Content is primarily generic self-help without personal depth, narrative, or mechanism — the "10 tips for productivity" format
- Creator is known primarily for controversy or has made public statements that would undermine Silhouette's trust positioning with the target audience
- Format is not text-extractable (purely visual content, non-verbal formats)
- Content is predominantly negative without redemptive arc or useful reframe (doom, hopelessness, resentment content)

### What "Insight Density" Means in Silhouette's Context

Insight density is not about how much information a source contains. It is the ratio of genuinely retrievable, state-relevant moments to total content volume.

A retrievable insight must:
- Be attributable to a specific named person
- Address one of the defined stuck states directly
- Offer something — a reframe, a mechanism, a permission, a story — that a user in that state would not already know
- Stand alone without requiring full episode context
- Come from genuine personal experience or credible research, not generic advice

**Low density:** Long sponsor reads, extensive biographical backstory without insight, tangential topics, motivational content without mechanism or reframe, anecdotes that are engaging but don't change how the user sees their situation.

**High density:** A guest speaking from direct experience of a relevant stuck state, naming the internal experience precisely before offering a reframe; a host asking questions that elicit specific, personal turning points; a speaker who goes beyond encouragement into genuine mechanism or frame-shift.

### What "Positive Influence" Means for Evaluation Purposes

"Positive influence" is not about popularity or mainstream recognition. It means: the content has a track record of shifting how people see their situations — not by providing temporary motivation, but by offering a new frame, mechanism, or permission that allows the user to understand their situation differently.

Evidence of positive influence:
- Listener testimonials describing real decisions or life changes attributed to specific content
- Academic or research backing for the claims made (especially relevant for scientific sources)
- Widely shared moments from the source that spread because they named something people felt but couldn't articulate
- The creator's track record of producing content that provides genuine insight rather than encouragement

Positive influence does not mean: high listener counts, celebrity endorsements, mainstream awards, or association with the popular self-help category.

---

## 2. Source Quality Tiers

### Great Source
All of the following:
- Directly addresses two or more stuck states (including at least one MVP state)
- Insight density: 4+ retrievable insights per hour in best episodes
- Speaker credibility is strong with the target demographic
- Produces both emotional resonance and intellectual insight
- Format is readily extractable
- Content ages well — insights remain relevant 2+ years

Approach: Evaluate episode by episode to find highest-density segments. Not all episodes will be ingested — only those that have been pre-evaluated for relevance and density.

### Usable Source
At least the following:
- Directly addresses at least one MVP stuck state
- Insight density: 2–3 retrievable insights per hour in best episodes
- Adequate speaker credibility with the target demographic
- Some emotional resonance present, even if inconsistent

Approach: Selective ingestion only — specific pre-evaluated episodes. Not a source to ingest broadly.

### Not Eligible
Any of the following:
- Does not clearly address any MVP stuck state
- Insight density is consistently below threshold across the source
- Speaker credibility is low or mismatched for the target audience
- Content primarily produces motivation or entertainment without genuine reframe
- Meets any disqualification criterion above

Approach: Document the rejection with reasoning. Do not revisit without new information.

---

## 3. Source Category Landscape and Priority

### Category 1: Long-Form Interview Podcasts — PRIMARY

**What it is:** Conversations between a host and a guest, typically 45–120 minutes. The guest has a relevant story, credential, or body of work. The interview format produces natural narrative arcs, personal revelations, and quotable moments.

**Why it's valuable:** Interview format allows a credible speaker to describe their own experience in their own words — the form of content most likely to produce the "this person understood something I couldn't name" recognition that drives an aha moment. The best interviews surface specific, personal moments from a speaker's experience in the exact stuck states Silhouette serves.

**Strengths:** High emotional resonance when the host is skilled at eliciting personal depth. Natural quotability — conversation produces moments that stand alone well. Large existing catalog across many shows. Transcripts increasingly available.

**Weaknesses:** Highly variable quality within a show — not every episode of even the best podcast will be relevant. Host quality is the primary variable; some hosts extract, others fill airtime. Sponsor reads, off-topic segments, and thin biographical backstory lower average density.

**Retrievability:** Moderate-to-high. Spotify, YouTube auto-captions, and official transcripts on many shows provide reasonable starting text.

**Priority: Core source type. Start here.**

---

### Category 2: Solo Educational Podcasts — PRIMARY (for specific shows)

**What it is:** A single host teaching or reflecting, usually with clear structure. Episode-by-episode topics rather than guest interviews. Primary value is consistent voice, high density, and well-structured content.

**Why it's valuable:** When the host is both highly credible and a strong communicator, solo educational content produces the most consistent insight density of any format. Mechanism-driven content — explaining *why* something happens in the brain or in human behavior — is a distinct insight type that interview narrative cannot replicate.

**Strengths:** Very consistent density (host quality is the ceiling, and it's stable). Often structured with timestamps. Mechanism insights (the "why something works" type) differentiate Silhouette from general advice.

**Weaknesses:** Less emotionally resonant than personal narrative — the speaker is teaching, not confessing. The "naming the exact experience" quality that makes direction-collapse and identity-transition content land is less common.

**Retrievability:** Often excellent — structured shows tend to have better transcripts and clearer segment boundaries.

**Priority: Primary for specific shows (Huberman Lab especially). Secondary category otherwise.**

---

### Category 3: Author Interview Crossovers — PRIMARY

**What it is:** When a credible author appears on a strong podcast to discuss their work and related experiences. Not the book itself — the conversation about the book and the personal experience behind it.

**Why it's valuable:** Authors who have written a substantial book on a relevant topic have thought more deeply about it than most speakers. In a long-form interview format, they often speak from their own personal experience in ways a book doesn't — revealing the personal story behind the frameworks, the failures before the insight, the specific moment of realization. Some of the highest-density content available for Silhouette comes from this format.

**Strengths:** Combines depth (book-level thinking) with personal narrative (interview format). Speaker credibility is usually very high — authors of relevant books have been through an editorial validation process.

**Weaknesses:** Authors in interview mode can be promotional — in "sell the book" mode rather than genuine exploration. Interview quality depends heavily on the host.

**Retrievability:** Same as the interview podcast hosting the author — varies by show.

**Priority: Primary — not as a standalone category but as a curation filter applied across interview podcast sources. When evaluating interview shows, flag episodes featuring relevant authors.**

---

### Category 4: YouTube Long-Form Channels — SECONDARY

**What it is:** Video interviews or discussions published YouTube-first. Significant overlap with podcasts (most shows publish to both), but some shows are YouTube-native.

**Why it's valuable:** Some of the highest-credibility, highest-production content in personal development is YouTube-native. Visual credibility (seeing the person speak) can add an additional trust signal. The target demographic consumes this format heavily.

**Weaknesses:** Format challenges are real. Copyright exposure on video clips is higher than audio. YouTube auto-captions exist but quality varies. Some YouTube-native shows are optimized for retention (thumbnail-bait, high-energy cuts) rather than depth. For shows that also publish as podcasts, the podcast transcript is more reliable.

**Retrievability:** Moderate. Auto-captions are increasingly good but not clean for direct use without editing.

**Priority: Secondary — useful for specific creators and shows but not the primary source type for the first version.**

---

### Category 5: TED / Formal Talks — SECONDARY (selected)

**What it is:** Structured, rehearsed presentations, typically 15–20 minutes, with official transcripts.

**Why it's valuable:** TED Talks are the most consistently quotable content available. Every talk has a clear thesis, clean language, and official transcript. The format is also its own credibility signal — a TED Talk carries institutional validation. A well-chosen TED Talk can produce 3–5 exceptional standalone insights in 15 minutes.

**Weaknesses:** More intellectual than narrative — presenters are performing, not confessing. Emotional resonance is lower than long-form interview. Many of the most relevant talks are already extremely well-known, reducing their aha potential for users who have seen them. The catalog of directly relevant talks is finite.

**Retrievability:** Excellent. Official TED transcripts are the cleanest text content available for any source type.

**Priority: Secondary — very high value for specific, carefully selected talks. Not a primary category by volume.**

---

### Category 6: Books and Audiobooks — DEFERRED

**What it is:** Full-length books — memoirs, self-examination books, psychology and performance books. Audiobooks are the same content in voiced form.

**Why it's valuable long-term:** The insight density within a great book can be extraordinary. A single paragraph from the right source can shift someone's entire frame on their stuck state. Books represent the deepest thinking a person has done on a topic.

**Why it's deferred for MVP:** Copyright is the primary constraint. Quoting substantial passages from a published book as the basis for a commercial retrieval product requires a rights strategy that has not been resolved. The MVP should not depend on direct book text. Author interviews about their books (Category 3) are a safer and often richer path to the same content for now.

**Priority: Deferred — extremely valuable long-term, but copyright complexity makes this a post-MVP category.**

---

### Category 7: Newsletters and Written Ecosystems — LOW PRIORITY

**What it is:** Long-form Substack writers, essayists, and newsletter-format content from credible voices.

**Why it's lower priority:** Written content lacks the personal voice quality of spoken content. The "real person, real voice" differentiator is weaker when the content is carefully edited prose rather than a candid interview. Attribution and copyright for newsletter text is also less clear.

**Priority: Low for MVP. May be revisited for specific highly-regarded writers in a later version.**

---

## 4. Corpus Philosophy

### Start Small and Curated — Not Broad

The first version of the Silhouette corpus should be deliberately small. Not because small is easier to build, but because small-and-excellent will outperform large-and-mediocre in retrieval quality every time.

Target for the initial prototype: fewer than 10 approved sources, with specific episodes hand-curated for relevance and density before any ingestion occurs.

### All Sources Manually Approved Before Ingestion

No source enters the corpus without deliberate, explicit approval against the scoring rubric. This means:
- A source has been evaluated against all rubric dimensions and assigned a score and tier
- The source has been mapped to the specific MVP stuck states it can serve
- At least one person has reviewed content quality at the episode level, not just the show level
- The inclusion decision has been documented

Automated scraping or ingestion without human review is excluded for the MVP.

### The Corpus Is Closed, With a Defined Expansion Path

The MVP corpus is a closed, curated set. It does not expand automatically or continuously. New sources are added through the same explicit evaluation process: evaluated against the rubric, scored, approved, documented, then ingested. Expansion is triggered by retrieval quality evidence — identified gaps in specific states that the current corpus cannot fill well — not by a general desire for more content.

### Quality Over Coverage

If a stuck state has only 12 excellent insights available from approved sources, that is better than 150 mediocre ones. Every corpus expansion decision should answer: does this increase retrieval quality, or just volume? Volume without quality improvement is a negative trade — it adds noise to retrieval without adding signal.

### Target Volume and State Density

"Quality over coverage" is a principle, not a plan. The following targets translate it into a testable build goal.

**Initial prototype:** Minimum 20 genuinely distinct insights per MVP stuck state. Distinct means a different speaker, or the same speaker making a fundamentally different point — not a variation on the same frame.

**First full version:** 50 distinct insights per MVP state, 20 per non-MVP state.

**Speaker concentration limit:** No more than 3 insights from the same speaker per state in the MVP corpus. A product that surfaces the same voice five times for the same stuck state is not a library — it is one person's perspective presented as a curated corpus.

**Repeat-user protection:** At 20 distinct insights per state with one insight per session, the same insight recurs within a month for a weekly user. At 50 insights, it takes roughly a year. Build decisions should be made with this math in mind — the target volume is determined by the session cadence of the target user, not by what is easiest to collect.

These are planning targets, not hard gates. A state with 18 genuinely distinct, high-quality insights is better than 50 redundant ones. Use these as calibration points.

### Source Diversity Within Quality Constraints

The corpus should draw from multiple source types and multiple speaker perspectives. Over-indexing on a single creator's worldview — even a high-quality one — would mean the product returns variations on the same perspective for every session. The goal is a diverse library of credible voices who have navigated the stuck states from genuinely different angles.

### Attribution Is Non-Negotiable

Every chunk in the corpus must carry full attribution. Attribution is both the ethical requirement and the product's core differentiator.

**What a full attribution record includes:**
- Speaker name — the person whose words are being retrieved (not the host, unless the host is the speaker)
- Show name — the podcast, channel, or platform where the content appeared
- Episode title and date
- Timestamp range (start and end, in HH:MM:SS format) for the specific segment

**Attribution decisions in common edge cases:**

*Host-guest exchanges:* Attribute to the person whose words are being retrieved. If a guest says something meaningful in response to a host question, the attribution is to the guest. Note the conversational context in chunk metadata if useful, but credit belongs to the speaker.

*Crossover appearances:* Attribution follows the speaker, not the show. Format: "Speaker Name, appearing on Show Name, Episode Title (Date)." This makes the credibility signal visible at the chunk level.

*Mechanism content (Huberman-type):* Attribute to the communicator who is delivering the insight and lending their expertise to it. If the source cites a research paper, note it in chunk metadata as supporting evidence — the primary attribution is the person speaking.

*Paraphrased vs. direct quotes:* Prefer direct quotes. If light editing is required (removing filler words from a transcript), note this in chunk metadata. Do not present a paraphrase as a direct quote.

No anonymous insights, no composite quotes, no unattributed paraphrases.

### Corpus Maintenance and Governance

The corpus requires active maintenance once built. Three categories of events trigger re-evaluation:

**Speaker credibility events:** If a speaker whose content is in the corpus becomes associated with a credibility-affecting controversy — misconduct, documented fraud, or public statements that would undermine trust with the target demographic — remove their content from the corpus. Document the decision and the reasoning. This is not a punitive call; it is a product integrity requirement. The corpus's credibility is only as strong as its least trustworthy speaker. Define this protocol before it needs to be applied under pressure.

**Source quality events:** If an approved show significantly changes its host, format, or content direction, re-score the source against the rubric before ingesting further content. Previously ingested content from the earlier era of the show is evaluated separately — the era matters, because a show's quality is not fixed.

**Performance-based review:** Once the product has active users, run a retrieval audit quarterly: identify chunks that are consistently retrieved for relevant queries but never engaged with by users. Consistent low engagement is a signal that the content is not landing despite matching at the embedding level. Deprioritize or remove consistently underperforming content.

**Time-based review:** Re-score all approved sources against the rubric every 18 months. Shows drift. Credibility changes. Transcript availability improves or degrades. A source that scored MVP Priority in 2024 may have declined by 2026 — or improved.

---

## 5. Infrastructure Required Before Ingestion

The following reference artifacts should exist before any source content is ingested:

**`source_scoring_rubric.md`** — The quantified evaluation framework for assessing any potential source. Used to produce a score and tier assignment before inclusion or exclusion decisions are made.

**`source_candidates.md`** — The curated shortlist of source candidates with preliminary assessments. Tracks status for each candidate: under evaluation, approved, conditionally approved, deprioritized, or excluded. Includes a state-to-source fit map.

**Content Evaluation Template** (to be created when ingestion begins) — A per-episode and per-segment evaluation format used during ingestion to assess which moments within an approved source are high enough density to include. Not needed until active ingestion begins.

---

## 6. How This Component Connects to Adjacent Work

### User Problem Model
Source Strategy is calibrated directly against the User Problem Model. Every source evaluation begins with: which stuck states does this source address? Sources that cannot be mapped to at least one MVP state do not belong in the first corpus. The state-to-source fit map in `source_candidates.md` makes this relationship explicit.

### Retrieval Philosophy
Source Strategy defines what content exists in the corpus. Retrieval Philosophy defines how that content is indexed and queried. The metadata schema — chunk size, tag structure, insight type — must be compatible with the content formats approved here. Build Retrieval Philosophy with Source Strategy already defined.

### Corpus / Ingestion Pipeline
Source Strategy defines the *what*. The Ingestion Pipeline defines the *how* — how approved sources are transcribed, chunked, tagged, and indexed. Do not design the Ingestion Pipeline until Source Strategy has defined at least the first set of approved sources, because pipeline design depends on their formats.

### Intake / Diagnostic Flow
State tags only work if the corpus is tagged against the same stuck-state taxonomy the intake flow uses. Source Strategy establishes the tagging vocabulary by mapping approved sources to states before ingestion.

---

## When to Revise This Document

- When a new source category (books, newsletters) becomes viable and needs its own eligibility criteria
- When real retrieval data reveals that approved sources are not producing well-matched insights for specific states
- When a copyright or licensing path for book text is established
- When a significant new source type emerges that doesn't fit the existing category framework
