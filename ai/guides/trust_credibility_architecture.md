# Silhouette — Component 8: Trust / Credibility Architecture

> **Summary:** This document defines the design choices that determine whether a user trusts Silhouette enough to be honest during intake — both first-time and returning. It covers the trust chain (trust → honest input → retrieval → aha moment), what the product communicates in the first 10 seconds, how it earns disclosure without triggering therapy-app or chatbot associations, the returning-user trust and repair architecture, positive design vocabulary, how attribution and source credibility are introduced before and after retrieval, how scope and safety boundaries are communicated without clinical language, design patterns to avoid, behavioral trust health monitoring, and an evaluation plan. Trust is not a feature — it is the condition under which the product functions.

> **How to use this document:** Read after Components 1–7. Component 8 is a design constraint, not a technical one. It does not define retrieval logic, corpus structure, or intake classification. It defines the context in which the user-facing experience must operate. Every copy decision, framing choice, and interaction pattern in the user-facing product should be checked against the principles in this document before shipping.

> **What this document is not:** It is not final marketing copy. It is not legal/compliance documentation. It is not a visual design specification. It is not a full UX spec for the onboarding flow. It is the conceptual architecture that those artifacts must conform to.

---

## 1. Purpose and Scope

### The Trust Problem Silhouette Must Solve

Silhouette asks users to do something uncomfortable: describe a vulnerable internal state — purposelessness, inaction, professional flatness, comparison anxiety — to a product they've never used. That disclosure is the product's input. Without it, retrieval cannot work. If the user sanitizes ("things have been a little off lately"), retrieval returns a topically adjacent insight that misses. If the user is honest ("I've known for two years that I need to leave this job and I can't do it — I'm starting to think something is fundamentally wrong with me"), retrieval can find something that lands.

The trust gap in Silhouette is not "can I trust this product with my data?" — that's a privacy concern, and it's table stakes, not a differentiator. The trust gap is: **is it worth being honest here?**

The cost of being honest is vulnerability. The payoff — an insight that lands — is invisible until after the user has already disclosed. That sequencing is the structural trust problem. The user must pay the vulnerability cost before seeing the benefit.

Component 8 exists to lower that cost.

### What Component 8 Covers

- What the product communicates in the first 10 seconds and why those 10 seconds determine intake honesty
- The specific trust signals (source names, example insights, framing language) that lower the disclosure cost before the user types anything
- How the intake prompt itself functions as a trust signal
- How attribution and source credibility should appear before and after retrieval
- How to communicate scope limitations (not therapy, not crisis support, not a chatbot) without clinical language
- Which visual, copy, and interaction patterns must be avoided — and which categories of product they mistakenly resemble
- How safety-adjacent moments must be handled without losing trust or scaring users away
- The trust failure modes that must be monitored after launch
- An evaluation plan for measuring whether trust is working before drawing conclusions from user data

### The Dependency Chain

Trust is upstream of every other component.

```
Trust → Honest intake → Accurate state detection → Correct retrieval → Aha moment
```

A retrieval system that works perfectly on a sanitized input produces a mediocre result. The same system on an honest input produces an aha moment. Trust is the multiplier that makes everything else function. This is why Component 8 is more important than it appears on a system diagram.

---

## 2. Relationship to Prior Components

### User Problem Model (Component 1)
The six stuck states carry different vulnerability loads. A user in Identity Transition is describing an ending they haven't processed yet — they may be more fragile than a user in Inaction Loop, who is frustrated rather than sad. A user in Direction Collapse may feel embarrassed that they "don't know what they want" after being educated, employed, and supposedly sorted. Trust architecture must protect against the specific shame and vulnerability patterns each state carries — not just generic emotional safety.

### Content / Source Strategy (Component 2)
The curated source library is the primary trust asset. "This came from Andrew Huberman on Huberman Lab" is a trust signal that "this came from an AI" is not. The names in the corpus — Huberman, Tim Ferriss, Diary of a CEO — are names the target demographic already respects. Surfacing those names before the user discloses, not just after retrieval, is a meaningful trust lever.

### Retrieval Philosophy (Component 3)
The Structured Insight Object model — verbatim human excerpt, full attribution, specific speaker, specific show — is what makes the product's human-source claim substantive. The trust architecture must make that model visible and legible to users at the moment it matters most.

### Intake / Diagnostic Flow (Component 4)
The intake prompt defined in Component 4 ("What's been feeling stuck or off lately? Write a few sentences — don't worry about making it perfect.") is simultaneously a retrieval input and a trust signal. The phrasing, the permission to be imperfect, the absence of clinical language — these are all trust choices. Component 8 governs the principles those choices must follow. Where Component 4 defines what the system needs from intake, Component 8 defines what the user needs to trust the intake enough to respond honestly.

### Corpus / Ingestion Pipeline (Component 5)
Attribution completeness — accurate speaker names, show names, episode dates — is a trust requirement, not just a quality requirement. An insight attributed to "an entrepreneur in a 2022 podcast interview" is less trustworthy than one attributed to "Dan Martell, appearing on School of Greatness, October 2022." Ingestion must produce complete attribution because the trust architecture depends on it.

### Insight Presentation Layer (Component 7)
The presentation of the retrieved insight is the primary trust payoff. If it feels generic, algorithmic, or AI-generated, trust is lost — regardless of how good the onboarding was. Component 7 and Component 8 are deeply linked: Component 8 creates the conditions for disclosure; Component 7 determines whether the product was worth trusting. They must be designed in alignment.

---

## 3. Design Principles

### 1. Trust is earned through evidence, not promise.
Telling users "Silhouette is different from AI advice" is less effective than showing them an example insight from a real person before asking for disclosure. Evidence builds trust. Claims invite skepticism.

### 2. The vulnerability cost must be lowered before the product asks for disclosure.
The user must see something credible before they decide to share something vulnerable. Onboarding that asks "what's wrong in your life?" before demonstrating what the product does is backwards.

### 3. The product must not trigger four incorrect associations: therapy app, AI chatbot, motivational quote app, or wellness platform.
Each of these categories carries a preloaded expectation the product cannot overcome. If Silhouette is mistaken for any of them in the first 10 seconds, the trust problem compounds — the user is now oriented toward a product experience that won't be delivered.

### 4. Scope boundaries are trust signals, not disclaimers.
Saying "Silhouette isn't therapy, and it's not for crisis moments" is not a legal footer — it is a trust signal. It tells the user exactly what space they're in. Users who know what a product is not are more comfortable trusting it with what it is.

### 5. The human source is the primary credibility mechanism.
"Matthew McConaughey navigated this" is a qualitatively different trust signal than "here is a relevant insight." The named, credible, real person is the product's core differentiator. The trust architecture must make that visible at every stage — before intake, during intake, and at the result.

### 6. Speed is a trust signal.
A result in under two minutes demonstrates that the product is confident in its retrieval and respects the user's time. Long loading states, multi-step onboarding, and friction before the result make the product feel like it's stalling — and stalling breaks trust.

### 7. The product must never perform emotional intimacy it doesn't have.
Phrases like "I can see you're really struggling" or "you're not alone in your journey" are dishonest from a product. The system matched a user's moment to a human-sourced insight — that is the genuine thing the product can offer. Performing emotional connection the system doesn't have is detectible and undermines trust.

### 8. Honest acknowledgment of limitations builds trust.
If retrieval cannot produce a strong match, saying "I don't have something that fits this well right now" is more trustworthy than returning a mediocre result with confident framing. Users trust a product that knows its limits over one that always has something.

### 9. The intake prompt must feel like a thoughtful question, not a form field.
"Describe your career situation" is a form field. "What's been feeling stuck or off lately?" is a question from someone who might actually understand. The phrasing signals whether the product has thought carefully about the human it's trying to help.

### 10. Don't explain the product more than necessary before the first experience.
Long "how it works" explanations before the first interaction are trust killers. They signal that the product is complicated, or that it's trying to convince the user of something before they've decided to engage. The best explanation of Silhouette is Silhouette working.

### 11. Safety-adjacent moments are trust-critical, not trust-breaking.
When a user inputs something outside Silhouette's scope — clinical distress, grief, crisis — the response is the most important trust moment in the product. Done well, it builds permanent trust. Done poorly (clinical, dismissive, or redirecting too quickly), it destroys it.

### 12. Authenticity requires restraint.
The product should not over-promise ("find your purpose in 2 minutes"), over-claim ("our AI understands you"), or over-explain ("our proprietary matching algorithm analyzes..."). Restraint in the product voice signals confidence. Confidence is a trust signal.

---

## 4. First 10-Second Product Framing

### Why the First 10 Seconds Are the Whole Game

A first-time user decides whether to engage honestly within the first 10 seconds of the product experience. In those seconds, they are not reading carefully — they are scanning for category cues. Their brain is answering two questions:

1. "What is this?" — Does this fall into a known category (therapy app, AI chatbot, meditation app, motivational poster), or is it something genuinely different?
2. "Is this for me?" — Does this product understand the specific kind of stuck I'm in?

If the answer to question 1 is a wrong category, the user has already filtered the product out — even if they keep scrolling. If the answer to question 2 is "no," they disengage or produce sanitized input. The first 10 seconds cannot recover from either failure.

### What Must Be Communicated in 10 Seconds

**What Silhouette is:** A tool that finds one real human insight — from a named, credible person — that applies to what you're going through right now.

**Who it's for:** Someone in a career, purpose, or direction rut — not in crisis, not needing therapy, but not thriving either.

**How it works at the surface level:** You describe what's off in a few sentences. Silhouette finds one thing from someone who has been there. Done in under two minutes.

**What makes it different from ChatGPT:** The content comes from real people, not generated by AI. The difference is not trivial — it is the product.

**That it is not therapy and not a chatbot:** This should be communicated through the product's framing, not through an explicit disclaimer in the first screen. The tone, vocabulary, and visual design should not read as clinical, supportive, or chat-interface.

### The Single-Sentence Product Statement

The product needs one sentence that answers "what is this?" before the user has typed anything. Evaluate any candidate statement against four criteria:

**Scoring criteria for product statement candidates:**

| Criterion | Weight | What to test for |
|---|---|---|
| **Functional specificity** | 3× | Does it say exactly what happens (find one insight) rather than what might result (find clarity, find direction)? |
| **Source honesty** | 3× | Does it signal real human source — explicitly or by implication — before the user can assume AI? |
| **Format commitment** | 2× | Does it commit to one insight, not "insights," "content," or "answers"? |
| **Category avoidance** | 2× | Does it avoid triggering therapy-app, chatbot, or motivational-quote associations on a quick read? |

Apply these criteria to each candidate: 5 if the criterion is strongly met, 3 if partially met, 1 if missed. A statement should score ≥ 36/50 to be considered.

**Candidates evaluated:**

Strong (score ≥ 36):
> "One insight from someone who navigated what you're describing — in under two minutes."
*Functional specificity: 5. Source honesty: 4 (implied). Format commitment: 5. Category avoidance: 5. Score: 46/50.*

Strong:
> "Describe what's stuck. Get one specific thing from someone who's been there."
*Functional specificity: 5. Source honesty: 4 (implied). Format commitment: 5. Category avoidance: 5. Score: 46/50.*

Weaker (score < 36):
> "Personalized insights for your career and purpose."
*Functional specificity: 2. Source honesty: 1. Format commitment: 1. Category avoidance: 2. Score: 16/50 — too general, sounds like a content platform.*

> "AI-powered insight retrieval for moments when you feel stuck."
*Source honesty: 1 — signals AI before human. Score: disqualified on source criterion.*

> "Support for young professionals navigating life's hard seasons."
*Category avoidance: 1 — reads as a wellness/coaching product. Score: disqualified on category criterion.*

The single-sentence product statement is the first trust signal. It should not be buried below a hero image or placed after a tagline. It should be the first thing a user reads.

### The Example Insight as Pre-Disclosure Trust Signal

The most effective trust signal before the user types anything is a demonstrated example of what the product returns — a specific, attributed insight from a real person, in the exact format the product will deliver.

**Why this works:**
- It makes the "real human source" claim concrete rather than abstract
- It demonstrates the product's specificity and quality before asking the user to trust it
- It shows what "one insight" means — a real excerpt, a real attribution, a real reason it applies
- It reduces the user's uncertainty about what disclosure will produce

**Example display before intake:**

> "I turned down the romantic lead roles because I wanted to be taken seriously, and I went from making $14.5 million a picture to zero. I had to go to zero. Because I wasn't going to get those roles until I proved I'd do them for free."
>
> — Matthew McConaughey, The Tim Ferriss Show, 2020
>
> *He reached what he'd built toward and found it cost him the ability to be honest about what he actually wanted.*

This example should not be introduced as "here's how it works" or "here's an example." It should appear as the thing itself — the user should feel like they walked into a bookstore and picked up a book already opened to a relevant page.

### What Must Not Appear in the First 10 Seconds

**Must not appear:**
- "Powered by AI" or any AI attribution before the human-source framing is established
- Testimonials in wellness-app format ("5 stars — changed my life")
- Stock images of people looking thoughtfully into the distance, hiking, or doing yoga
- A "How it works" three-step diagram
- "Sign up free" as the primary CTA before demonstrating value
- A cookie/data consent modal as the first user-facing screen
- Any language suggesting clinical support ("we're here to help you through difficult times")
- "Your safe space" or "safe, judgment-free zone" — these are therapy-app cues
- A chat interface bubble ("Hi! I'm Silhouette, your personal insight guide!")

---

## 5. Landing / Onboarding Trust Signals

### The Onboarding Trust Sequence

The sequence in which trust signals appear matters as much as the signals themselves. The user builds a mental model of the product incrementally. Getting the sequence wrong means the user has already categorized the product before the most important trust signal arrives.

**Recommended sequence:**

```
1. Product statement (one sentence — what this is, for whom)
2. Example insight (one real, attributed result — evidence of what you get)
3. Source context (brief signal that the content comes from named, credible people)
4. Intake prompt (the question itself — designed to feel like a thoughtful ask, not a form)
```

This sequence prioritizes evidence before disclosure. The user sees what they'll receive before they're asked to share anything.

### The Product Statement Position

The product statement must appear above the fold and before any image, hero graphic, or secondary copy. It is the first text element the user reads. On a mobile first-screen, it should be the headline — not a subheading or supporting text.

### Source Context Before Intake

Directly above or below the intake prompt, a brief line signaling the source library establishes that what the product retrieves comes from real, named people rather than AI:

> "From conversations with people like Andrew Huberman, Matthew McConaughey, Cal Newport, and others who've navigated what you're describing."

This is not a feature list. It is a trust signal. The names signal credibility and specificity to the target demographic before they've committed to disclosure.

**What this line must not say:**
- "Our curated library of X,000 insights" — sounds like a content platform
- "Powered by leading experts in psychology, business, and more" — sounds like a wellness platform
- "Access top creators and thought leaders" — sounds like a subscription content product

### The Intake Prompt as Trust Signal

The intake prompt (defined in Component 4) is simultaneously the first retrieval input and the product's most important trust signal. How it's phrased determines whether the user feels invited or assessed.

**The recommended prompt from Component 4:**
> "What's been feeling stuck or off lately? Write a few sentences — don't worry about making it perfect."

**Why each part of this phrase carries trust weight:**
- "What's been feeling stuck or off" — normalized language, not clinical ("struggling," "experiencing")
- "Lately" — anchors to present state, signals this isn't a biography request
- "Write a few sentences" — lowers the barrier (not an essay, not a form)
- "Don't worry about making it perfect" — explicit permission to be imperfect, signals the system is flexible and patient

**What must surround the prompt:**
- No form labels above the text field ("Your situation:", "Describe your problem:")
- No character counter unless users naturally produce text that is too long
- No placeholder text that mirrors the prompt ("e.g., 'I've been feeling stuck in my career...'") — placeholder examples invite templated responses, which produce weaker retrieval signals
- A quiet, unobtrusive text field — not a prominent bordered box or red-outlined "required field" indicator

### What Onboarding Must Not Include

- **Account creation before the first insight.** Requiring an account before value is delivered is a conversion-killer and a trust signal that the product is extractive rather than generous. The first insight should be available without signing up.
- **Preference surveys or intake forms.** "Tell us about your goals," "What areas of life are you focusing on?", "How often do you want to use this?" — these are wellness-app patterns. Silhouette infers what it needs from the user's description. It should not ask separate questions.
- **Progress bars during classification.** "Analyzing your response..." with a loading bar is a chatbot pattern that signals the product is processing rather than matching. The result should appear without a dramatic wait signal.

---

## 6. Intake-Adjacent Trust and Reassurance

### The Trust State During Intake

The moment a user begins typing is the highest-vulnerability point in the product experience. They have decided to try being honest — but the decision isn't final until they hit send. At this moment, anything that feels clinical, judgmental, or indifferent can cause them to pull back and sanitize.

The design at this moment must be:
- **Quiet.** No UI elements competing for attention.
- **Patient.** No time-limit signals, no "most people respond in X characters."
- **Neutral.** No visible judgment, no real-time response indicators, no "thinking..." animations.

### The Clarifying Question as Trust Event

When a clarifying question is asked (Component 4, Section 8), it is a trust-critical moment. Done well, it signals that the system was listening and wants to understand one specific thing before it tries to help. Done poorly, it signals that the system didn't understand and is gathering more data.

**Trust signals in a good clarifying question:**
- It acknowledges what the user said before asking more ("It sounds like you've been at this for a while")
- It asks something specific — not a generic "can you tell me more?"
- It is clearly one question, not two disguised as one
- It doesn't use clinical vocabulary ("Can you tell me more about your emotional state?")

**Trust failures in a clarifying question:**
- Asking something the user already answered
- Asking a question that sounds like a diagnostic assessment
- Using language that implies the user's description was insufficient ("I need a bit more information to help you")
- Asking a question that mirrors a therapy intake form

### What Surrounds the Clarifying Question

The clarifying question should appear in the same flow as the intake — not in a new screen, not in a popup. The continuity signals that this is one conversation, not a step in a multi-stage process.

Do not add text like:
- "Just one more question..." — implies there could be more
- "To help me better understand..." — implies the system, not the user, is the subject
- "Thanks for sharing!" — hollow affirmation, chatbot-adjacent

A single, natural follow-up is the right feel. No framing, no affirmation, no preamble.

### The "Nothing Found" Moment as Trust Event

When retrieval cannot produce a strong match, the response is a trust moment. The system is being asked to admit a gap rather than produce something mediocre. If it handles this honestly — "I don't have something that fits this well right now" — it signals honesty and curbs over-promising. If it produces a weak result with confident framing, it signals that the system cannot be trusted to know the difference.

Trust architecture requires a fallback response that:
- Does not apologize excessively (excessive apology is chatbot-adjacent)
- Does not explain the retrieval system ("unfortunately, our index doesn't have...")
- Does not suggest the user rephrase their input (implies the failure is theirs)
- Invites more context in a natural, non-mechanical way

From Component 7, the correct response is: **"I don't have something that fits this exactly — can you tell me a bit more about what it feels like from the inside?"**

This response works because it signals: the system knows when something fits and when it doesn't. That discrimination is itself a trust signal.

---

## 6A. Returning-User Trust and Continuity

### Why the Returning User Is a Distinct Trust Problem

A first-time user doesn't know what Silhouette can do. The trust gap is: is this worth being honest about? A returning user does know — from one prior session. Their trust gap is different: is this better than last time? Did the system learn anything?

The trust research literature distinguishes two types of trust failures:
- **Competence-based failures:** The system couldn't do what it promised (poor retrieval result). These are recoverable if the product signals that it has improved.
- **Integrity-based failures:** The system behaved in a way that felt dishonest or manipulative (e.g., the result felt AI-generated when the product claimed human sources). These are much harder to recover from.

For Silhouette, a returning user who received a mediocre result (competence failure) is more recoverable than one who felt the attribution was misleading. The returning user trust architecture must handle competence failures differently from integrity failures.

### Returning User Who Had a Positive First Session

This is the easy case. The user has prior trust. The primary risk is that the second session doesn't live up to the first — creating a deflation that's worse than if the first session had been mediocre.

**Design principles for this user:**
- Do not re-explain the product. The returning user knows what it is.
- Do not ask them to re-establish context from scratch. The intake prompt can acknowledge that they've been here before, in a single quiet way — not by surfacing their prior session, but through a slightly warmer framing of the prompt if available.
- Show a different example insight than they received in session one. The example insight is both a trust signal and evidence of corpus breadth. A returning user who sees the same example as session one begins to think the corpus is thin.

**Intake prompt option for returning users (after one prior session):**
> "What's been feeling stuck or off since last time? Write a few sentences."

This acknowledges continuity without requiring memory of what the prior session addressed.

### Returning User Who Had a Mediocre or Negative First Session

This is the harder case. The user is returning despite a bad experience, which signals either high tolerance or high motivation. The trust recovery design must signal: the system knows it can do better.

**What trust repair requires (from Lewicki & Brinsfield):**
1. Acknowledge the failure (not effusively, not clinically — briefly)
2. Demonstrate understanding of why it mattered
3. Provide behavioral evidence it won't happen again

For Silhouette, this translates to:

**1. Acknowledging the failure:** If the user selected "Show me something different" in session one and didn't receive a satisfying result, a light acknowledgment in session two is appropriate:

> "Last time didn't quite land — let's try again."

This is the right tone: honest, not apologetic, forward-looking. Do not: "We're sorry your last experience wasn't great. We've been working hard to improve." That is corporate language, not trust language.

**2. Behavioral evidence of improvement:** The second session should be visibly different. If session one returned a `reframe/intellectual` insight for a Direction Collapse user who responded "show me something different," session two should return a `story/vulnerable` SIO from a different speaker. The difference should be perceivable without explanation.

**What the returning-negative-session user must NOT see:**
- A repeat of the same insight from session one (obvious failure)
- The same SIO metadata (same speaker, same show, even if different clip)
- An apology that implies the product is perpetually below par

### Returning User After a Long Gap (>30 Days)

Component 4 defines the retrieval behavior (run fresh intake; use profile for resonance context only). The trust architecture adds: do not assume the prior session's emotional state is still the present one.

A user who returned after a long gap is likely in a different moment than the last session. Acknowledge the gap without implying Silhouette has been tracking them. The intake prompt should not say "Welcome back — last time you were feeling stuck about your direction." That crosses into surveillance-adjacent territory and damages trust.

**Appropriate returning-after-gap experience:**
- Same intake prompt as first session ("What's been feeling stuck or off lately?")
- Example insight that may differ from session one — signals that the corpus is living
- No explicit "last time you..." references

### Trust Continuity Signal: Corpus Breadth

For users who return multiple times, the depth and breadth of the corpus becomes a trust signal in itself. A user who receives the same speaker twice in three sessions begins to suspect the library is small. Speaker diversity across sessions is a trust requirement — not just a retrieval quality requirement.

**Implication for retrieval:** The `excluded_sio_ids` and `preferred_speakers` fields in the user profile (Component 4, Section 12) serve a trust function, not just a personalization function. Showing the user that Silhouette has something different each time it is trusted with a moment is itself a trust-building gesture.

---

## 7. Human-Source Credibility and Attribution Model

### Why Attribution Is a Trust Mechanism, Not Just an Ethical Requirement

Attribution in Silhouette serves two functions: it is an ethical obligation (the content comes from real human beings whose words are being used), and it is the product's primary trust mechanism. "Matthew McConaughey said this on The Tim Ferriss Show in 2020" is fundamentally different from "here's a relevant insight." The named source converts the content from information to testimony.

For the target demographic (22–32 year olds who consume podcasts and creator content), recognizable names carry pre-existing trust. Hearing that Andrew Huberman named the exact mechanism behind their Engagement Drought activates prior credibility they already have for him — credibility the product hasn't had to earn.

### Where Attribution Must Appear in the Experience

Attribution must be visible at three points:

**1. Before intake (as a trust signal):**
Source names should appear as a trust signal before the user types anything. Not as a "featured sources" section with logos — as a natural mention of who the content comes from. See Section 5.

**2. In the returned result (as evidence):**
The attribution line in the presentation (Component 7, Section 8) must be prominent — same visual weight as the framing sentence, positioned directly after the quote, before the "why this applies" sentence. Attribution that is greyed out, small, or below the fold fails as a trust signal.

**3. Via the source link (as verification):**
The "Hear it at [timestamp]" link in the presentation offers the user a path to verify the attribution. The existence of that link — regardless of whether the user clicks it — signals that the product is confident the attribution is real.

### The Trust Hierarchy by Source Type

Not all source attribution carries equal credibility for the target demographic. The trust architecture should apply the right level of framing for each tier.

**Tier 1 — Named, highly recognizable:**
Matthew McConaughey, Andrew Huberman, Tim Ferriss, Brené Brown, Cal Newport. The name alone signals credibility. Minimal additional context needed.

**Tier 2 — Credible but less universally recognized:**
Lewis Howes (School of Greatness host), Rangan Chatterjee (practicing physician), Dan Martell (founder), Steven Bartlett (Diary of a CEO). The name is credible but a one-line credential may help for users unfamiliar: "Dan Martell, founder and investor" in the attribution is enough. Not a paragraph bio.

**Tier 3 — Guest speakers on recognized shows:**
A specific guest on The Tim Ferriss Show or Diary of a CEO carries the show's credibility even if the speaker is less well-known. Attribution format: "[Speaker Name], appearing on [Show Name]" is sufficient. The show name is doing the credibility work.

### What Attribution Must Not Look Like

- A footnote in 9pt grey italic at the bottom of the screen
- A bibliographic citation ("McConaughey, M. (2020)...")
- "Source: The Tim Ferriss Show" without the speaker name (the speaker is the trust signal, not the show alone)
- "Curated from top podcasts and interviews" (too vague to signal anything specific)
- A small logo of the show/platform next to the quote (visual noise, not a trust signal for this audience)

### The "AI vs. Human" Distinction in Attribution

Silhouette's core positioning — real human source, not AI-generated — must be legible from the attribution model. The user should never wonder whether the quote was generated. The quote is verbatim (Component 7, Section 6), the attribution is specific (Component 7, Section 8), and the source link exists (when available). Together, these three elements make the "this is real" claim provable rather than asserted.

If Silhouette ever paraphrases a speaker rather than quoting directly — and attributes it as a quote — it destroys this trust signal permanently. Verbatim-or-nothing is a trust requirement, not just a quality standard.

---

## 8. Disclaimers and Scope Boundaries

### The Purpose of Scope Communication

A product that clearly communicates what it is not builds trust with the users who need what it is. "Silhouette is not therapy, and it is not the right resource if you're in a crisis moment" is not a limitation disclaimer — it is a trust signal that says: the product knows what it is, and it won't try to be everything to everyone.

This is especially important for the target demographic. A 26-year-old in a purpose rut who is approached by yet another product claiming to solve all their problems is rightfully skeptical. A product that says "this is what we do, and this is where we stop" is credible in a way that over-promising products are not.

### The Four Scope Boundaries to Communicate

**1. Not therapy.**
Silhouette is not a mental health resource, not a therapist, not a clinical tool. This must be communicated through the product's framing and tone — not primarily through a disclaimer. The intake prompt, the returned result, and the product voice should all signal "smart, curated insight" rather than "emotional support." The explicit communication should be available on demand (FAQ, about page) but does not need to be prominent in the first-session experience.

Exception: in the safety response (Section 11), this must be stated clearly and warmly.

**2. Not a crisis resource.**
If someone is in acute distress, Silhouette is not the right resource — and it should say so with care. This is not a legal disclaimer; it is a compassionate acknowledgment that some moments need something more than an insight. The safety response (Component 4, Section 10) handles this interaction. Component 8 governs the language and tone of that response.

**3. Not a chatbot.**
The product does not sustain open-ended conversation. It does not have memory of what the user said last week. It does not generate advice. It finds one specific human-sourced insight per session. This should be communicated through the product experience (the flow ends after the result is delivered) rather than through an explicit "this is not a chatbot" announcement — which would be unnecessarily defensive.

**4. Not a general-purpose life advice tool.**
Silhouette is built for career, purpose, and motivation moments in young professionals. It is not equipped for relationship advice, financial decisions, medical questions, or general existential reflection. This scope boundary is communicated in the intake prompt (which is specific to "stuck or off") and the out-of-scope redirect (Component 4, Section 10).

### How Disclaimers Should Sound

**Good framing:**
- "Silhouette works best for career, purpose, and motivation moments — if what you're going through feels bigger than that, here are some resources that are built for it."
- "This isn't therapy, and it's not trying to be — it's one specific thing from someone who's been there."

**Bad framing:**
- "Silhouette is not a substitute for professional mental health care." (legal boilerplate — sounds like a liability footer)
- "If you are experiencing a mental health crisis, please contact a licensed professional." (clinical, scary)
- "Important: Silhouette cannot provide medical or therapeutic advice." (defensive, over-formal)
- "Disclaimer: The content provided is for informational purposes only." (indistinguishable from a terms-of-service footer)

### Where Scope Boundaries Belong in the Experience

**Not prominent in first-session onboarding.** A new user doesn't need to be told what the product isn't before they've seen what it is. Leading with disclaimers signals defensiveness, not confidence.

**Present in the safety/out-of-scope response.** When the product encounters an input that falls outside its scope, that is the moment for clear, warm scope communication. See Section 11.

**Available on demand.** An FAQ or "about Silhouette" section should clearly define scope. This is for users who want to understand the product before engaging — not for users who are already mid-session.

**Implicit throughout.** The best scope communication is a product that does one thing clearly and well. A product that returns one specific, attributed insight from a named human source is implicitly communicating that it is not a therapist, not a chatbot, and not a motivational poster generator — without needing to say it.

---

## 9. "What This Is / What This Is Not" Messaging

### The Positive Definition

Silhouette needs a clear, honest positive definition that is narrow enough to be credible. Over-broad positive definitions invite skepticism ("we help you live better"). Narrow, specific definitions invite trust ("we find one thing from someone who has been exactly where you are right now").

**Working positive definition (to be validated with users):**

> Silhouette finds one real insight — from someone who's navigated what you're describing — and tells you why it applies to your situation right now. Not a list. Not AI advice. One specific thing from a real person.

**What makes this credible:**
- "One" — specific and committed; not "the best insights for your life"
- "Real insight" — signals human source before the user can misread it as AI
- "From someone who's navigated" — implies personal experience, not expert opinion
- "Why it applies to your situation right now" — signals specificity, not topical matching
- "Not a list. Not AI advice." — direct negative definition, not defensive

### The Negative Definition

The negative definition is as important as the positive one for the target demographic, who have been burned by products that over-promise. The negative definition should appear in the product's "about" section and in the response to direct questions ("is this therapy?").

**What Silhouette is not (in product language, not legal language):**

> Silhouette isn't therapy — it doesn't diagnose, and it doesn't track your wellbeing over time. It's not a coach, a chatbot, or a feed of content. It won't remember what you said last week. It's not a crisis resource. For moments that need more than insight, there are people trained for that.

> What it does: one session, one insight, one honest reason it applies.

**What this accomplishes:**
- Directly names and dismisses all four wrong-category associations (therapy, chatbot, content feed, crisis support)
- Is honest about limitations without being apologetic
- Pivots back to the positive definition ("what it does") quickly
- Uses plain language, not legal language

### The Tone of This Messaging

The tone throughout should be confident and specific — not defensive or hedged. A product that leads with what it can't do, in apologetic language, has already signaled that it's unsure of itself. Silhouette's negative definition should read like a product that knows exactly what it is and is proud of being narrow.

Compare:
- Hedged: "While we can't provide the full range of support that a therapist might, we try our best to..."
- Confident: "This isn't therapy. For moments that need that, there are people trained for it. Silhouette does one specific thing."

---

## 10. Visual and Interaction Anti-Patterns

### Categories of Misidentification

The trust architecture must protect against four specific category errors. Each category has a signature visual and interaction vocabulary that Silhouette must avoid.

### Category 1: Wellness / Mental Health App

**Visual patterns to avoid:**
- Soft color palettes: sage green, muted lavender, warm cream
- Illustrations of people in nature, holding mugs, doing yoga, or sitting in sunlight
- Rounded, friendly serif fonts
- "Check-in" vocabulary ("How are you feeling today?")
- Mood sliders or emotional wheels
- "Streak" counters or habit tracking elements
- "Achievements" or "milestones" for consistent use

**Copy patterns to avoid:**
- "Take care of yourself"
- "You deserve to feel better"
- "Begin your wellness journey"
- "We're here to support you"
- "Your daily moment of clarity"
- "Practice self-reflection"

**Why these patterns break trust:** The target user is not looking for a wellness experience. They want one specific insight, not a supportive environment to grow in. If the product reads as a wellness app, users will either disengage (that's not what I need) or engage with the wrong expectations (I thought this was therapy-adjacent).

### Category 2: AI Chatbot / Conversational AI

**Visual patterns to avoid:**
- Chat bubble interface with the product sending the first message ("Hi! I'm here to help you today.")
- Avatar or persona for the system ("Meet Sage, your insight guide")
- Typing indicator animations
- Message thread UI
- "Ask me anything" framing in the input
- Response bubbles with timestamps

**Copy patterns to avoid:**
- "Hi! How can I help you today?"
- "I'm here to listen"
- "Great question!"
- "Based on what you've told me..."
- "I'd like to learn more about your situation"
- "Let me think about that..." (with loading animation)

**Why these patterns break trust:** A chatbot interface signals AI-generated responses. Silhouette's core differentiator is the opposite of that. If the product looks like a chatbot, the human-source claim becomes implausible before the user sees any attribution. The design must not look like the thing it is designed to be different from.

### Category 3: Motivational Quote / Content Discovery App

**Visual patterns to avoid:**
- Quote cards with decorative backgrounds
- "Quote of the day" format
- Swipe-through card interface
- "Explore quotes by topic" navigation
- Author headshot galleries
- "Popular quotes" trending section
- Share buttons prominently placed on the insight

**Copy patterns to avoid:**
- "Discover powerful quotes from inspiring leaders"
- "Be inspired by the wisdom of..."
- "Today's insight for you"
- "Swipe to explore more"

**Why these patterns break trust:** Motivational quote products are the exact experience Silhouette is trying to be different from — decontextualized, generic, algorithmically surfaced. If Silhouette looks like one, the "specific, matched, human-sourced" claim is undermined by the format. Format is content for trust purposes.

### Category 4: General Self-Help / Life Coaching Platform

**Visual patterns to avoid:**
- Course-like UI with progress tracking
- "Start your journey" CTA
- Before/after transformation language
- Five-star testimonials from users who "changed their life"
- Coach profiles or expert directory
- "Free trial" pricing language before value is demonstrated

**Copy patterns to avoid:**
- "Transform your career and life"
- "Unlock your potential"
- "Become the best version of yourself"
- "Expert-guided insights"
- "Start your transformation today"

**Why these patterns break trust:** The target user is sophisticated and allergic to self-help marketing language. They consume high-quality content but they are deeply skeptical of products that promise transformation. The more the product sounds like a life coaching platform, the less likely the user is to engage honestly — or at all.

### What to Do Instead: Positive Design Vocabulary

The positive direction for Silhouette's visual and copy design is best described by reference points that share the target sensibility — not as a design brief, but as a trust-category signal.

**Reference products in the right design category:**
- **Readwise / Reader** — text-forward, high information density, dark neutral palette, no illustration, typography that signals intelligence over warmth
- **Linear** — tool-mode product, nothing decorative, user is in command not the product
- **The Economist app** — serious magazine aesthetic, content is primary, no emotionality in the interface

These products trust the user. They do not decorate the experience. They do not perform care.

**Positive visual vocabulary:**

| Element | Guidance |
|---|---|
| Palette | Dark background or high-contrast neutral. Not white (#fff hospital white), not warm (#f5f0e8 wellness beige). Aim for: ink, slate, stone. |
| Typography | Readable, slightly serious. A refined sans-serif (not geometric bubbly sans) or a text-weight serif for the quote display. Avoid: rounded humanist fonts, extra-light weights. |
| Illustration | None. Photography only if the product ever uses it — and only of context, not of people being inspired. |
| Icons | Minimal and functional. No emoji-adjacent icons. No "growth" iconography (plants, mountains, sunrises). |
| Quote display | Block-quote style — visually distinguished from surrounding text, slightly indented or border-accented, readable weight. The quote should look like something worth reading, not a callout card. |
| Attribution | Same visual weight as the body text of the framing sentence. Not greyed out. Not italic at 9pt below the quote block. |
| Input field | Single, unbordered or lightly bordered text area. No label above it ("Your situation:"). Placeholder text should be empty or a single soft instruction — not an example to mimic. |
| Loading/wait state | Minimal — a single progress indicator, not an animation sequence with copy ("analyzing your response..."). |

**Positive copy vocabulary:**

| Use | Avoid |
|---|---|
| "What's been feeling stuck" | "How are you feeling today" |
| "Someone who navigated this" | "An inspiring leader" / "A top expert" |
| "Here's what we found" | "Here's what I found for you!" |
| "Did this land?" | "Was this helpful?" / "Rate your experience" |
| "One insight" | "Personalized guidance" / "Curated content" |
| Specific names ("McConaughey," "Huberman") | "Industry experts" / "Thought leaders" |
| Active verbs at the product level ("finds," "returns") | Active verbs at the emotional level ("supports," "nurtures," "guides") |
| Plain past tense for the speaker ("He described...") | Adjectival intensifiers ("This powerful insight shows...") |

**Positive interaction vocabulary:**

- The product does not speak first. The user inputs; the product returns. There is no welcome message, no introduction, no "Hi! What's on your mind today?"
- The result appears as a text block to be read, not as a message delivered by a persona.
- The source link is a low-key text link, not a button or card. It defers to the insight.
- The feedback prompt ("Did this land?") is quiet — below the result, not prominent. It should not compete with reading the insight.
- Session end is clean. After feedback, the product does not push onward ("here are three related insights," "explore more content"). It stops.

---

## 11. Safety-Sensitive Trust Language

### Why Safety Moments Are Trust-Critical

A user who inputs something that triggers a safety response is in a vulnerable moment. How the product responds to that moment determines whether they trust it permanently or never return. A safety response that is clinical, dismissive, or robotic is a deeper trust failure than a mediocre retrieval result — because it happens at exactly the moment the user was most honest.

The safety response is not a failure state. It is a designed product moment.

### What Safety Language Must Accomplish

1. **Acknowledge what was shared without minimizing it.** The user revealed something real. The first sentence of the response must reflect that it was heard.

2. **Be warm without being clinical.** "That sounds really hard" is warm. "I'm detecting distress signals in your input" is not. "We care about your wellbeing" is not warm — it is a corporate disclaimer.

3. **Provide a clear resource without being a redirect wall.** The resource (988 Lifeline, Crisis Text Line) should be named specifically and briefly — not embedded in a paragraph of explanation. The user should not have to work to find the resource in the response.

4. **Be honest about what Silhouette can and cannot do in this moment.** "Silhouette isn't the right resource for this, but here's who is" is honest. "Silhouette is here to help with all your needs — please also consider speaking with a professional" is not.

5. **Leave the door open without pushing.** If there is an underlying career/purpose dimension that Silhouette could address alongside the primary concern (Tier 2 safety — grief, identity disruption), the response can acknowledge that after the primary resource is provided. This is never forced.

### Tier 1 Safety Response Template (severe distress, crisis signals)

**What the user sees:**

> What you shared sounds serious, and I want to be honest: Silhouette isn't the right resource for moments like this one.
>
> If you're in a crisis or need to talk to someone right now:
> - 988 Suicide & Crisis Lifeline — call or text 988
> - Crisis Text Line — text HOME to 741741
>
> You don't have to be in a specific kind of crisis to reach out to either. They're designed for exactly these moments.

**What this response does:**
- First sentence acknowledges the weight of what was shared, directly
- Names the limitation without apologizing excessively or explaining the retrieval system
- Provides resources with enough context to use them without overwhelming the user
- Does not contain Silhouette branding after the first sentence
- Does not end with "Take care!" or a warm sign-off — the moment doesn't need punctuation

**What this response must not include:**
- "We're so sorry to hear that you're struggling"
- "Your feelings are valid and we understand them"
- "Please remember that help is always available"
- A follow-up CTA to "try Silhouette again when you're feeling better"
- Any explanation of why the retrieval system bypassed the normal flow
- A list of 6+ resources (choice overload at a crisis moment)

### Tier 2 Safety Response Template (clinical signals, grief, loss — not acute crisis)

**What the user sees:**

> What you're going through sounds like it's carrying real weight — more than a career question, at least right now.
>
> If you're dealing with grief, loss, or something that's feeling heavy in a way that's hard to put down, talking to a therapist who can sit with you through this is probably more useful than what Silhouette does.
>
> [Optional, only if genuine overlap exists:] If there's also something underneath this that feels like a direction or purpose question — not the heavy stuff, but the "who am I now" part — I can try to help with that piece if you want to come back to it.

**What this response accomplishes:**
- Acknowledges the weight without naming a clinical diagnosis or condition
- Gently redirects to professional support without being a liability footer
- Leaves the door open to partial scope overlap (Identity Transition may coexist with grief) without forcing it
- Doesn't end with a resource list — leaves the user with the option to seek what they need

### Out-of-Scope Redirect (not a safety moment — wrong category)

For inputs that are genuinely outside Silhouette's scope but not safety-adjacent:

**What the user sees:**

> That sounds genuinely hard — and it's also a bit outside what Silhouette is built for. Silhouette works best for career and purpose questions, not [medical questions / relationship advice / legal situations].
>
> If there's something underneath this that feels like a direction or motivation question — something about what you're building or where you're going — I can try to help with that part.

**What this response does:**
- Acknowledges the input without minimizing it
- Is honest about scope without using legal language
- Offers a path back into scope if one exists
- Does not apologize for the limitation

---

## 11A. Trust Repair Mechanisms

### When Trust Is Partially Eroded

Trust repair is distinct from trust building. A user who received a bad first result, or who felt the product misunderstood their situation, is not a new user. They have an existing negative belief about the product's competence. Repair requires behavioral evidence — not reassurance.

### Repair by Failure Type

**Competence failure (bad retrieval result):**
The repair mechanism is the second retrieval — if the user selects "Show me something different," the system has exactly one shot at trust repair. The second result must be visibly different (different insight type, different speaker, different voice register) and must land. If it doesn't, the session ends without forcing a third attempt (Component 7, Case 7). Do not apologize before the second result. The second result is the apology.

**Framing failure ("why this applies" sentence felt generic or off):**
This is harder to repair within the session. If the user's "show me something different" is clearly about the framing rather than the insight (behavioral signal: long dwell time on the quote before the rejection), the second retrieval should prioritize a different insight type — not just a different SIO with the same type. A user who rejected a mechanism insight should receive a story; a user who rejected a reframe should receive a permission.

**Attribution doubt (user doesn't believe the source is real):**
This is an integrity-based failure and is the hardest to repair. The repair signal is the source link — a live, timestamped link to the original episode that proves the quote is real. If the source link exists and the user clicks it, the doubt is resolved. If it doesn't exist, the doubt may persist. This is why source link availability is a trust requirement (Component 7, Section 5), not merely a nice-to-have.

**Category misidentification (user expected a chatbot / therapy tool):**
No in-session repair is effective once the expectation has been set. The product should not try to correct the user's expectation mid-session. Post-session, the repair path is improving the first-10-seconds framing for future users. The existing user has already formed a category impression; only delivering an unexpectedly good result can revise it.

**Safety response handling (user felt screened or rejected):**
This is an integrity failure. If the user felt that the safety response was clinical or dismissive, re-engagement in a future session requires a different framing at the entry point — demonstrating warmth before the user has a chance to trigger the safety response again. This is addressed in the returning-user trust framework (Section 6A), but the safety response copy itself (Section 11) is the primary repair surface.

### The One Rule of Trust Repair

Trust repair cannot be accomplished through explanation or reassurance. It requires behavioral evidence. The second retrieval result, the source link, the intake prompt in session two — these are the repair mechanisms. What the product says about itself is much less powerful than what the product does.

---

## 12. Trust Failure Modes

### Failure Mode 1: The Product Looks Like a Chatbot

**Symptoms:** Users ask it questions instead of describing their situation. Users expect a back-and-forth. Users are confused when it returns one result and stops.

**Leading indicators:** High rate of question-format inputs ("Can you help me figure out...?"), high rate of follow-up messages after the result is delivered, low intake completion rate.

**Resolution:** Review the first-10-seconds experience. Is the chat interface pattern in the visual design? Is the intake prompt phrased as a question the user is supposed to ask the system, rather than a prompt for the user to describe their own situation?

---

### Failure Mode 2: The Result Feels AI-Generated

**Symptoms:** "Did this land?" response rate is low. Explicit negative feedback ("this sounds like ChatGPT"). Users don't engage with the attribution or source link.

**Leading indicators:** Low dwell time on the result. Low click rate on source links. High "show me something different" rate that doesn't decrease with successive retrievals (suggesting the issue is presentation, not retrieval).

**Resolution:** Review the "why this applies" sentence against Component 7's banned patterns. Is it topical rather than specific? Is the attribution visual weight adequate? Is the excerpt verbatim, or has it been paraphrased?

---

### Failure Mode 3: The User Sanitizes Their Input

**Symptoms:** High retrieval volume with mediocre "did this land?" rates despite technically correct state classification. Intake inputs are short, vague, or phrased carefully rather than honestly.

**Leading indicators:** Average intake word count below 30 words (too short to produce specific state signals). High proportion of inputs that classify as Direction Collapse (the most generic state) relative to other states. High proportion of "moderate confidence" classifications.

**Resolution:** This is primarily a trust failure before or during intake. Review the first-10-seconds experience. Is the example insight specific enough to signal that honesty is worth it? Is the intake prompt inviting enough? Is anything in the first screen triggering a wellness-app or clinical association?

---

### Failure Mode 4: The Safety Response Scares Users Away

**Symptoms:** Sessions that end at the safety response without returning. Users who triggered Tier 2 safety (not Tier 1) never come back. Users rate Silhouette as "clinical" or "like a form."

**Leading indicators:** High session abandonment rate at the safety response step. User feedback that the product felt like a screening tool.

**Resolution:** Review safety response language against the principles in Section 11. Is it warm enough? Is it using clinical language ("distress indicators")? Is it a wall of resources rather than one specific, named resource?

---

### Failure Mode 5: Users Don't Trust the Attribution

**Symptoms:** Users ask "is this a real quote?" or "did someone actually say this?" Users don't engage with the source link. Users describe the result as feeling "made up" or "like AI wrote this."

**Leading indicators:** Low click rate on source links. Explicit feedback questioning attribution accuracy. Low trust scores in evaluation.

**Resolution:** Check attribution completeness in the corpus. Are speaker names complete and accurate? Are episode titles specific? Are source links live and correctly timestamped? This is a corpus quality failure that surfaces as a trust failure.

---

### Failure Mode 6: The Product Feels Like It's Therapizing

**Symptoms:** Users describe Silhouette as a "mental health app" or compare it to BetterHelp. Users are surprised that it returns an insight rather than a conversation. Users who needed therapy come to Silhouette and are disappointed.

**Leading indicators:** User feedback with therapy-adjacent vocabulary ("supportive," "healing," "safe space"). Intake inputs that describe clinical distress at rates higher than the safety routing can handle. User reviews that position Silhouette as mental health support.

**Resolution:** This is a first-10-seconds framing failure. Something in the product's visual design, copy, or positioning is triggering the therapy-app association before the product's actual function is clear. Review the anti-patterns in Section 10.

---

## 13. Evaluation Plan

### What Evaluation Must Answer

Before trusting user data from live sessions, evaluation must answer:

1. Do first-time users correctly understand what Silhouette is and is not within the first 10 seconds?
2. Do users feel safe enough to be honest in the intake?
3. Does the human-source framing register as genuinely human (not AI-generated) after seeing a result?
4. Does the product avoid triggering therapy-app, chatbot, or motivational-quote associations?
5. Is the safety response handled in a way that maintains trust rather than destroying it?

### Evaluation Method: First-10-Seconds Test

**Protocol:** Show 10–15 target-demographic participants (22–32, employed, not in acute distress) the product's first screen for 5 seconds. Cover it. Ask:
- "What does this product do?"
- "Who is it for?"
- "How is it different from asking ChatGPT?"
- "What category of product is this closest to?" (give options: meditation app, AI chatbot, therapy tool, content discovery, insight retrieval, other)

**Target outcomes:**
- ≥ 80% correctly identify the product as "finds insights from real people" rather than any other category
- ≥ 70% say it's different from ChatGPT because "the content is from real people"
- < 10% categorize it as a therapy tool, chatbot, or meditation app

### Evaluation Method: Disclosure Honesty Audit

**Protocol:** Review 20–30 intake transcripts from early sessions (with consent). For each, assess:
- Does the input include personal situational detail (specific job, event, emotional language)?
- Or is it vague/generic?
- Is the word count adequate to produce state classification? (Under 20 words suggests sanitization)

**Target:** ≥ 70% of intakes include enough specific situational detail to classify with high or moderate confidence.

**Note:** This metric is only interpretable if intake length correlates with classification confidence. If 70% produce high confidence classification, honesty is working. If most inputs require expansion prompts, investigate the first-10-seconds experience.

### Evaluation Method: Attribution Trust Test

**Protocol:** Show 10 participants the full result screen (quote, attribution, "why this applies" sentence). Ask:
- "Do you believe this is a real quote from a real person?"
- "Does knowing who said this make you trust it more?"
- "Would you want to listen to/read the full source?"

**Target:**
- ≥ 85% believe the attribution is genuine
- ≥ 70% say knowing the speaker increases trust in the insight
- ≥ 50% say they would engage with the source link

### Evaluation Method: Category Misidentification Test

**Protocol:** Show participants the result screen alongside 3 other product screenshots (a motivational quote card, a ChatGPT response, a Headspace screen). Ask:
- "Which of these four feels most like the others?"
- "Which is most different?"

**Target:** Silhouette should be identified as most different from all three comparisons by ≥ 75% of participants.

### Evaluation Method: Safety Response Test

**Protocol:** Show 5–8 participants a scripted safety response (Tier 1 and Tier 2 separately). Ask:
- "On a scale of 1–5, how warmly did this response acknowledge what you described?"
- "Did the response feel clinical, like a legal disclaimer, or like genuine care?"
- "Would this response make you trust or distrust Silhouette for future use?"

**Target:**
- Warmth rating ≥ 3.5 / 5.0
- ≤ 10% describe it as "clinical" or "like a disclaimer"
- ≥ 70% say it would maintain or increase their trust in the product

### Real-Time Trust Health Monitoring (Post-Launch)

Pre-launch evaluator studies cannot fully replicate the trust dynamic of a real user in a real stuck moment. Once live sessions are running, trust must be monitored through behavioral proxies — signals that correlate with trust without requiring users to evaluate the product explicitly.

**Behavioral signals that proxy for trust:**

| Signal | What It Measures | Threshold for Concern |
|---|---|---|
| **Intake word count** | Higher word count = more willingness to be honest. Low word count = sanitization or low trust. | Average < 30 words across sessions → investigate first-10-seconds framing |
| **Pre-submission dwell time** | Long dwell time in the text field with editing/deleting = second-guessing honesty. Fast submission = comfort. | Median dwell > 90s before submission → possible trust barrier at disclosure moment |
| **Session abandonment at intake** | Abandoning after the intake prompt is displayed but before submission = trust barrier at the vulnerability moment. | > 20% abandonment rate at intake → critical trust investigation |
| **Source link click rate** | Clicking the attribution link signals belief that the source is real. Low click rate signals doubt or disengagement. | < 15% click rate after 500 sessions → test attribution prominence and specificity |
| **Feedback prompt response rate** | Non-response to "Did this land?" signals disengagement. Engaged users respond. | < 40% response rate → investigate whether the result is landing (retrieval issue) or whether the prompt design is wrong (trust issue) |
| **"Show me something different" rate** | Tracks single-session rejection. High rejection rate could be retrieval quality or trust framing. | > 45% rejection rate → correlate with intake word count; if short intake = trust issue, not retrieval |
| **Return visit rate after first session** | The strongest trust signal: did the user trust the product enough to come back? | < 20% 30-day return rate → investigate first-session experience; compare positive-feedback vs. no-feedback users |
| **State distribution of intakes** | A corpus dominated by Direction Collapse classifications may signal sanitization (DC is the most generic state). If DC% >> expected base rate, users may be writing too vaguely. | DC% > 50% of all first-session classifications → possible sanitization signal |

**How to distinguish trust failures from retrieval quality failures:**

The two failure types produce overlapping behavioral signals. The following diagnostic helps separate them:

- If `intake word count is low` AND `rejection rate is high` → likely a trust failure (user didn't share enough to retrieve well)
- If `intake word count is adequate` AND `rejection rate is high` → likely a retrieval quality failure (user shared enough; the system chose poorly)
- If `intake word count is adequate`, `rejection rate is low`, AND `"did this land?" response rate is low` → likely a presentation failure (the result arrived but didn't register)
- If `session abandonment at intake is high` → trust failure, regardless of retrieval data

**Trust health dashboard (minimum viable):**

At MVP, track four metrics weekly:
1. Median intake word count
2. Session abandonment rate at intake
3. Feedback prompt response rate
4. 30-day return rate

These four together give a usable trust health signal without requiring any user interviews.

### What Evaluation Cannot Tell You

- Whether the trust design works in real sessions at scale — evaluation participants know they're evaluating
- Whether users who are genuinely in a stuck moment (vs. evaluators who are comfortable) respond differently to the trust signals
- Whether the behavioral trust proxies above are responding to trust specifically, or to retrieval quality, presentation quality, and other factors — isolation requires controlled experiments
- Whether trust translates into word-of-mouth referrals — only real session data over time can answer this

---

## 14. MVP Recommendation

### What to Build

**First-session experience (priority order):**

1. A single-sentence product statement that defines what Silhouette is and who it's for. Positioned as the first text element the user encounters.

2. One example insight — verbatim excerpt, attribution, one "why this applies" sentence — displayed before the intake prompt. This is the most important trust signal in the product. It should not be optional, collapsed, or skippable.

3. A one-line source context statement: "From conversations with people who've navigated what you're describing — including [2–3 recognizable names from the corpus]." This appears near the example insight, before the intake prompt.

4. The intake prompt: "What's been feeling stuck or off lately? Write a few sentences — don't worry about making it perfect." Text field below, quiet and unobtrusive.

5. No account creation before the first result is delivered.

**Result experience:**
- Attribution at full visual weight, positioned between the quote and the "why this applies" sentence (from Component 7, already specified)
- Source link when available ("Hear it at [timestamp]")
- "Did this land?" feedback prompt — quiet, after the result, not competing with the content

**Scope/safety language:**
- Inline, contextual — triggered by out-of-scope or safety inputs, not surfaced proactively
- Available in an FAQ or "about" section for users who seek it before engaging

### What to Defer

- **Explicit onboarding flow or tutorial.** The example insight is the tutorial. More onboarding before the first interaction adds friction without adding trust.
- **Account creation.** Defer until product-market fit is established or until personalization is valuable enough to justify the ask.
- **User-facing explanation of how the matching system works.** The experience should feel like being understood — not watching a system run.
- **Extensive FAQ or help documentation.** At MVP, users either engage or they don't. Extensive documentation suggests the product needs explaining, which is itself a trust signal.
- **State-adaptive visual design.** Adapting the visual design by detected stuck state (Section 19, Q9 in Component 7) is a trust experiment worth running — but only after the base trust architecture is validated.

### What Must Pass Before Shipping

- First-10-seconds test: ≥ 80% correct product identification (Section 13)
- Attribution trust test: ≥ 85% believe attribution is genuine (Section 13)
- Category misidentification test: Silhouette identified as most different from comparators by ≥ 75% (Section 13)
- Safety response test: warmth rating ≥ 3.5/5.0; ≤ 10% describe as "clinical" (Section 13)
- Anti-pattern audit: manual review of all copy against Section 10 banned patterns — zero violations
- The intake prompt does not read as clinical, interrogative, or wellness-adjacent: human review pass

---

## 15. Open Questions

### Q1: Should the example insight be static or retrieved for the user?

**Why it matters:** A static example (the same McConaughey or Huberman quote for every user) demonstrates quality but doesn't demonstrate personalization. A retrieved example (the system retrieves an insight for a generic "direction" or "motivation" scenario before intake) demonstrates both — but adds technical complexity and a cold-start retrieval problem.

**Resolution path:** A/B test static vs. retrieved example in early user sessions. Measure whether the type of example insight affects intake honesty (word count, specificity of user input).

---

### Q2: Does showing the example insight before intake bias the user's input?

**Why it matters:** If the example shows an Inaction Loop insight and the user actually has an Engagement Drought, will they frame their description to match the example they just saw? Anchoring effects in this direction could distort state classification and hurt retrieval quality.

**Resolution path:** Monitor whether the state distribution of first-session inputs correlates with the example insight being shown. If users in Direction Collapse states produce Inaction Loop inputs at higher-than-expected rates, the example insight may be anchoring.

---

### Q3: How much of the corpus should be visible before intake?

**Why it matters:** Showing 2–3 source names builds trust. Showing a full "source library" page might shift the product toward a content discovery category — or might build trust through transparency. The right level of source visibility is an open question.

**Resolution path:** Test the trust impact of three levels: (a) source names in one line, (b) a brief "sources we draw from" section with 6–8 names, (c) a full browsable source list. Measure which produces the most honest intake inputs.

---

### Q4: Should the product say "this came from a real person, not AI" explicitly?

**Why it matters:** For a demographic that has been conditioned to expect AI-generated content from digital products, making the human-source claim explicit may be necessary. But it could also sound defensive, or raise the question of why the product needs to say it.

**Resolution path:** Test two versions of the product statement — one that makes the human-source claim explicit ("from real people, not AI"), one that lets attribution make the claim implicitly. Measure whether explicit framing increases or decreases trust ratings.

---

### Q5: How should Silhouette handle users who explicitly ask "did AI write this?"

**Why it matters:** Some users will ask, especially early adopters who are AI-aware. The answer needs to be honest, specific, and non-defensive: the retrieval and framing use AI tools, but the content (the quote, the excerpt) is from a real person. The distinction matters.

**Resolution path:** Draft a response to this question that is honest about the use of AI in the retrieval process while being clear about what is and isn't AI-generated. Test it with users who ask the question directly.

---

### Q6: Should the intake prompt differ for returning users vs. first-time users?

**Why it matters:** A first-time user needs trust-building before they'll be honest. A returning user who had a positive first session has already extended trust — a different prompt (warmer, with reference to the prior session) might produce better signal. A returning user who had a neutral or negative session may need different framing to re-engage honestly.

**Resolution path:** Evaluate intake prompt variants for returning users after 30 days of live sessions. Measure whether returning-user intake input quality differs from first-session input quality.

---

### Q7: Should users be able to opt into more transparency about how the system works?

**Why it matters:** Some users will find it trust-building to know that "the system detected you might be in a Direction Collapse state and retrieved insights for that." Others will find it clinical and unsettling. A voluntary transparency toggle might satisfy both groups without alienating either.

**Resolution path:** Monitor how often users ask about the matching system (either in feedback or in explicit questions to the product). If ≥ 15% of users ask, build a lightweight transparency option.

---

### Q8: Is the trust architecture consistent across platforms (web, iOS, Android)?

**Why it matters:** The visual and interaction anti-patterns in Section 10 are easier to avoid on some platforms than others. iOS native design conventions (e.g., rounded UI, light pastels in dark mode) can inadvertently trigger wellness-app associations if not carefully managed.

**Resolution path:** Platform-specific design reviews against the anti-patterns in Section 10 before each platform launch.

---

### Q9: How should Silhouette communicate trust in contexts where the example insight might not land?

**Why it matters:** The example insight is the primary pre-disclosure trust signal. But if the example doesn't resonate with a specific user's situation, it may actively decrease trust ("this product seems to be for people with different problems than mine"). The example should be chosen to maximize resonance across the broadest range of the target demographic — which may mean rotating examples or personalizing them.

**Resolution path:** Test 3–5 different example insights with target-demographic evaluators. Select the one(s) that produce the highest "this seems relevant to me" rating across the broadest range of users.

---

### Q10: At what point does the trust architecture need to be revisited based on user data?

**Why it matters:** Trust signals that work for early adopters (who are more curious and forgiving) may not work for mainstream users who are less patient and more category-aware. The trust architecture should be reviewed after the first 100 real user sessions and again after 1,000.

**Resolution path:** Define a trust-review trigger: if the first-10-seconds test (re-run with real users, not just evaluators) shows ≥ 20% category misidentification after 100 sessions, the trust architecture needs revision before scale.

---

## When to Revise This Document

- After the first-10-seconds test reveals systematic category misidentification
- After real session data shows high intake sanitization rates (average input < 25 words, classification confidence consistently moderate or low)
- After the attribution trust test reveals doubts about the human-source claim
- After Component 9 (Feedback / Quality Loop) produces data on which session moments are associated with low "did this land?" rates that seem to have a trust rather than retrieval cause
- After Component 9 (Business Model) is designed — if a monetization model introduces trust-conflicting incentives (e.g., engagement mechanics, upsell prompts)
- After the product launches on a new platform and requires platform-specific trust design review
