# Silhouette — Project Context

> This file orients AI tools, collaborators, and stakeholders to the Silhouette project.
> Read this before making any product, technical, or content decisions.

---

## What Silhouette Is

Silhouette is a hybrid recommendation and retrieval platform that helps people navigate recurring "stuck moments" — episodes of overwhelm, avoidance, burnout, low confidence, or directionlessness — by surfacing the right resource at the right time and pairing it with one concrete next step.

The core product belief: when someone is stuck, they do not need more content. They need the *right* content, matched to their exact emotional state and context, delivered with low friction and a clear path forward. Silhouette exists to close the gap between "I feel stuck" and "I know what to do next."

Silhouette is not a wellness app, a therapy tool, or a content library. It is a guided micro-reset system — a focused intervention designed for the moment of stuckness itself, not for ongoing habit-building or general self-improvement.

---

## Why the Problem Matters

Young adults and early-career professionals experience recurring cycles of overwhelm, avoidance, and lost momentum. These are not rare events — they are structural features of modern life during high-transition periods.

The evidence is consistent:

- Procrastination affects 50–70% of students and is increasingly understood as an emotion-regulation failure, not a time-management problem.
- Over 80% of Gen Z workers report burnout symptoms. Among knowledge workers in their 20s and early 30s, the rate is similarly high.
- More than 55% of college students report academic burnout, with the highest rates in the first year and during demanding programs.
- The self-help content market exceeds $13 billion annually, yet most users churn quickly because the tools are not designed for the specific moment of stuckness.

The problem is not a lack of helpful content. The internet is saturated with podcasts, articles, videos, and AI tools that could theoretically help. The problem is that in a low-energy, avoidant state, users cannot efficiently find, evaluate, and act on the right resource. Discovery is fragmented, relevance is low, and actionability is almost zero.

---

## Who the Broad Audience Is

Silhouette's addressable audience includes anyone who experiences recurring stuck moments and is capable of taking action but struggles to initiate. This spans:

- College students in demanding programs
- Recent graduates navigating early independence
- Early-career knowledge workers managing ambition alongside burnout
- Creative professionals dealing with blocks and self-doubt
- Anyone in a transition-heavy season of life — career change, relocation, post-setback rebuilding

The common thread is not a demographic. It is a behavioral pattern: repeated episodes of stuckness, existing self-improvement intent, comfort with digital tools, and a gap between wanting to act and actually acting.

---

## Who the Initial Wedge Is

The strongest first wedge is **early-career knowledge workers in their 20s to early 30s** — ambitious, digitally native, already consuming self-help and productivity content (podcasts, YouTube, newsletters, Reddit, ChatGPT), but regularly hitting walls of overwhelm, avoidance, or burnout.

This wedge is strong because:

- They experience stuck moments frequently and repeatedly.
- They already seek digital solutions, so acquisition is natural.
- They have strong self-improvement behavior, so they will engage with a purposeful tool.
- They can articulate their emotional states with reasonable accuracy.
- They are underserved: existing tools either require too much activation energy or are too generic.

A second plausible wedge is **students in demanding academic programs** — high achievers who cycle between productivity and avoidance, and whose stuck moments cluster around deadlines, comparison, and identity pressure.

High-risk clinical users (active suicidal ideation, severe depression, crisis states) are explicitly not the initial focus. Silhouette is designed for functional stuckness, not clinical intervention.

---

## What Recurring Stuck Moments Are

A "stuck moment" is a short-duration episode where a person feels unable to act on something that matters to them. It is not a personality trait, a diagnosis, or a permanent state. It is a temporary emotional-behavioral loop — and it recurs.

Stuck moments share common features:

- The person knows they should act but cannot initiate.
- Emotional friction (shame, fear, overwhelm, numbness) exceeds available activation energy.
- The moment is usually triggered by a specific context: a deadline, a social comparison, a period of doomscrolling, or an accumulated sense of falling behind.
- The person is still fundamentally capable of acting — they are stuck, not broken.

Silhouette's initial taxonomy of stuck moments:

| Stuck Moment | Description |
|---|---|
| **Overwhelm** | Too many inputs, obligations, or decisions. The person feels paralyzed by volume. |
| **Avoidance / Procrastination with guilt** | The person has something specific to do and has been avoiding it. The delay creates compounding shame. |
| **Low confidence / Imposter feelings** | The person doubts their ability or belonging. They hesitate to act because they feel inadequate. |
| **Directionlessness** | No clear next step or priority. A foggy sense of "I don't know what I'm doing with my life." |
| **Burnout** | Chronic depletion. The person has been pushing too hard and has hit a wall. |
| **Post-rejection** | A specific setback — a failed application, a breakup, a criticism — has deflated them. |
| **Loneliness** | Social isolation or disconnection. The person feels unseen or unsupported. |

These categories are treated as soft clusters, not rigid diagnoses. Users should be able to correct or refine how Silhouette classifies their moment.

---

## What Current Substitutes Exist and Why They Fall Short

When stuck, people reach for whatever is available. None of the current options are built for the stuck moment itself.

| Substitute | What it does | Why it falls short for stuck moments |
|---|---|---|
| **YouTube / podcasts** | Long-form perspective and motivation | Not curated to the moment; requires browsing energy the user does not have |
| **Reddit** | Peer stories and advice | Inconsistent quality; can amplify comparison and doomscrolling |
| **ChatGPT / general AI** | Broad advice, planning, pep talks | Generic unless the user already knows exactly what to ask; no curated library; no emotional-state matching |
| **Journaling apps** | Emotional offloading and reflection | Reflection-first, not action-first; requires writing energy; rarely produces a concrete next step |
| **Mental wellness apps** | Mood tracking, CBT exercises, habit programs | Course-based and ongoing; high activation energy; assumes the user already has momentum |
| **AI companions** | Emotional support and conversation | Passive; lacks direction toward action; no resource curation |
| **Self-help books / newsletters** | Ideas and frameworks | Not moment-specific; consuming a book is the opposite of a micro-reset |
| **Doomscrolling** | Avoidance and distraction | Leaves users feeling worse; the most common actual substitute |

The pattern across all substitutes: they either require too much energy (browsing, writing, maintaining a streak), are too generic (not matched to the specific stuck moment), or lack actionability (no concrete next step).

---

## Why a Hybrid Resource-Matching Model Is Compelling

Silhouette's core technical thesis is that a hybrid recommendation and retrieval system — combining an internal curated library with external discovery — is the right architecture for this problem.

**Why internal curation matters:**

- Quality control: every resource in the internal library has been vetted for tone, relevance, and actionability.
- Metadata richness: internal resources carry structured tags (emotional state, format, duration, tone, creator, licensing status) that enable precise matching.
- Consistency: the user experience depends on reliably high-quality recommendations. Unfiltered external results introduce noise.
- Legal safety: internal resources can be properly licensed, annotated, and attributed.

**Why external discovery matters:**

- Breadth: no curated library can cover every stuck moment, every context, every preference.
- Freshness: new content is published constantly; users benefit from recent, relevant resources.
- Diversity: external search can surface perspectives and creators the internal library has not yet indexed.

**Why hybrid is better than either alone:**

- Internal-only is too narrow at scale. Users will hit moments the library does not cover well.
- External-only is too noisy. Unfiltered web results for emotional queries return generic, low-quality, or off-tone content.
- Hybrid allows Silhouette to lead with quality (internal) and extend with breadth (external), clearly distinguishing between curated recommendations and supplemental discoveries.

Research on recommender systems confirms that users in overwhelmed states prefer curated, explained recommendations over open-ended exploration. A single well-chosen resource with a clear reason outperforms a library of options with no guidance.

---

## What Silhouette Is Not

- **Not therapy or clinical intervention.** Silhouette helps with functional stuckness, not diagnosable mental health conditions.
- **Not a crisis response tool.** If a user signals crisis, Silhouette acknowledges it, declines to continue as a support tool, and directs to appropriate resources.
- **Not a content library or search engine.** Users do not browse. The system surfaces one resource matched to their moment.
- **Not a habit tracker or streak-based app.** Usage is episodic by design.
- **Not a journaling or self-reflection platform.** The focus is action, not introspection.
- **Not a general-purpose chatbot.** Silhouette has a specific job: micro-reset for stuck moments.
- **Not a generic "AI wellness app."** The value is in the recommendation system, not in the conversation itself.

---

## Key Strategic Assumptions

1. **Stuck moments are recurring and classifiable.** Users experience the same types of stuckness repeatedly, and those types can be clustered into soft categories that improve retrieval.
2. **One resource plus one step is the right unit of value.** Users in stuck moments prefer a single explained recommendation over a list of options.
3. **Episodic usage is a valid engagement model.** Success is measured per session, not per day. Users return when they are stuck again, not on a schedule.
4. **Recommendation quality is the moat.** The system's long-term value comes from matching precision — the ability to surface the right resource for the right person in the right moment.
5. **A curated internal library is a defensible asset.** The combination of vetted content, rich metadata, and emotional-state tagging creates a proprietary content graph that improves over time.
6. **Personalization improves outcomes.** Learning a user's format preferences, tone affinity, and action style allows the system to improve recommendations across sessions.
7. **Trust is non-negotiable.** Users sharing vulnerable emotional states must trust that Silhouette will not exploit that data, serve disguised ads, or sell emotional profiles.

---

## Major Legal and Trust Constraints

Silhouette operates in a space where content rights and user trust are existential concerns.

**Content rights:**

- Third-party content (articles, transcripts, videos) should be stored as metadata and short non-substitutive annotations, not full text, unless explicitly licensed.
- Full text storage is reserved for in-house content, licensed material, or content with clear reuse permissions.
- The system should link out to original creators and platforms, not replace them.
- Creator trust matters: Silhouette should be a distribution partner, not a content extractor.

**User trust:**

- Emotional-state data is sensitive. It must never be sold, used for ad targeting, or shared with third parties.
- Sponsored content must never be disguised as organic recommendations. If monetization involves partnerships, it must be transparent.
- The product must avoid emotional exploitation — creating dependency, exaggerating problems, or withholding value to drive engagement.

**Safety:**

- Crisis detection must be reliable and respectful. When triggered, the system exits the normal flow and directs to real resources (988 Suicide and Crisis Lifeline, Crisis Text Line, etc.).
- Silhouette must not diagnose, label clinical conditions, or imply therapeutic capability.

---

## How the Assignment MVP Fits Into the Bigger Picture

Silhouette began as a class project for a BYU multi-tool AI agent course. The assignment required a LangChain.js ReAct agent with calculator, web search, and RAG tools, conversation memory, and a web UI.

The assignment MVP (Phase 1) is an internal-only prototype that validates the core interaction loop: understand the stuck moment, retrieve one resource, deliver one next step. It uses a small curated knowledge base, in-memory vector search, and session-scoped memory.

Phase 1 is intentionally narrow. It does not prove personalization, scale, ranking quality, or business viability. It proves that the fundamental micro-reset experience can be delivered through a conversational agent backed by curated retrieval — and that it feels meaningfully different from asking ChatGPT the same question.

The full product vision extends well beyond the assignment. Silhouette's long-term direction is a scalable hybrid recommendation platform with rich metadata, emotional-state-aware ranking, personalization, external discovery, and a trust-centered business model. The assignment MVP is the foundation, not the ceiling.
