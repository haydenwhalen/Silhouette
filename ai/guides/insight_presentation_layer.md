# Silhouette — Component 7: Insight Presentation Layer

> **Summary:** This document defines how Silhouette presents a retrieved Structured Insight Object (SIO) to the user so that the insight is most likely to land. Component 6 (Retrieval Engine) selects the right insight. Component 7 determines how that insight reaches the user — what they see, in what order, in what voice, with what attribution, and how they respond. Presentation is a multiplier on retrieval quality. A well-matched insight framed generically will feel algorithmic and be dismissed. The same insight framed specifically, with real attribution and one sharp "why this applies" sentence, can shift something in under two minutes.

> **How to use this document:** Read after `retrieval_philosophy.md` and `intake_diagnostic_flow.md`. The SIO schema defined in Component 3 determines what fields are available to the presentation layer. The state taxonomy and resonance dimensions from Components 1 and the Resonance Model determine how framing should adapt. Every decision here is backward-designed from one question: what increases the probability of a genuine aha moment?

> **Version note:** This is v1. A reconciliation pass with Component 6 (Retrieval Engine) should be performed once C6 is complete, to incorporate any retrieval metadata fields (match score, retrieval mode, fallback reason) that presentation should optionally use.

---

## 1. Purpose and Scope

### What the Insight Presentation Layer Is

The Insight Presentation Layer is the design specification for how Silhouette delivers a retrieved insight to the user. It defines:

- What the user sees after retrieval — the exact elements and their order
- How the retrieved quote or excerpt is formatted and displayed
- How context is introduced (or not introduced) before the insight
- How attribution is presented in a way that builds trust
- How Silhouette connects the insight to the user's specific situation ("why this applies")
- How source links and timestamps are handled
- How the feedback prompt is positioned and phrased
- How tone and framing adapt by stuck state, insight type, and voice register
- What happens when retrieval cannot produce a strong result

### What the Insight Presentation Layer Is Not

- **Not the retrieval engine.** Component 6 selects the insight. Component 7 presents it. These are separate responsibilities. The presentation layer does not re-retrieve, re-rank, or modify the selected insight.
- **Not the corpus ingestion system.** Attribution accuracy and excerpt quality are determined at ingestion time. Component 7 inherits them.
- **Not final visual UI design.** This document defines information hierarchy, content elements, and interaction logic. It does not specify colors, typography, layout, or front-end code.
- **Not a copywriting guide for every possible state.** This document defines structural rules and principles. Response generation follows these rules — it does not template every possible output.
- **Not therapy or clinical framing.** The presentation layer never diagnoses, never labels the user's state explicitly in the response, and never uses clinical vocabulary.
- **Not a motivational quote generator.** Silhouette returns human-sourced insights with specific attribution. The framing must make the source visible and credible — not flatten it into generic encouragement.
- **Not a long-form coaching response.** The total presentation is short. One insight. One attribution. One sentence of framing. One feedback prompt. Nothing more for MVP.

---

## 2. Relationship to Existing Components

### User Problem Model (Component 1)
The detected stuck state is the primary driver of presentation tone and framing. Each state has a different emotional need from the user and a different risk pattern in how an insight can miss. Component 7 adapts:
- How much setup is given before the quote (more for Identity Transition; less for Inaction Loop)
- What the "why this applies" sentence should acknowledge first
- What tone the framing voice should take
- What patterns the framing must actively avoid (e.g., no prescriptions for Direction Collapse; no shame language for Inaction Loop)

### User Resonance Model
The retrieved SIO's `insight_type` and `voice_register` tags determine how the presentation frames the content. A mechanism insight is introduced differently than a permission insight. A direct/challenging speaker should not be wrapped in a warm/affirming frame. The framing voice should support and amplify the source voice — not contradict it.

### Content / Source Strategy (Component 2)
Source Strategy establishes that attribution is the product's core differentiator. Presentation must make attribution visible and trust-building — not a footnote. The specific attribution format defined here (Section 8) implements that commitment. Component 2's credibility tiers also inform how much credibility context to include in attribution (e.g., Tier-1 lived experience speakers may need less credibility scaffolding than lesser-known Tier-2 experts).

### Retrieval Philosophy (Component 3)
Component 3 defines the SIO schema that Component 7 receives. All presentation input fields in Section 4 of this document are drawn from or derived from the schema defined in Component 3. The `key_claim`, `transcript_excerpt`, `attribution_text`, `insight_type`, `voice_register`, and `credibility_tier` fields are defined there. If Component 3's schema changes, Section 4 of this document must be updated.

Component 3 also defines the "acceptable match" retrieval tier (score 36–47/60), which triggers "slightly broader framing" in presentation. Section 15 (Fallback) implements this.

### Intake / Diagnostic Flow (Component 4)
The intake produces `detected_state`, `clarified_user_text`, `state_confidence`, `resonance_hypothesis_insight_type`, and `resonance_hypothesis_voice_register`. These inform:
- How specifically the "why this applies" sentence can be written (higher confidence → more specific framing)
- Whether to use `user_text` or `clarified_user_text` as the reference for framing
- Whether the retrieved insight is presented as a strong match or a "something that might fit" frame (moderate confidence)

### Corpus / Ingestion Pipeline (Component 5)
Attribution completeness and transcript excerpt quality are ingestion-time decisions. If `attribution_text` is incomplete or `transcript_excerpt` contains uncleaned transcript errors, the presentation layer will surface those errors to the user. Component 7 cannot compensate for ingestion quality failures. This is why Section 4 specifies required vs. optional fields — some fields must exist for an insight to be shown at all.

### Retrieval Engine (Component 6 — in progress)
Component 6 may pass metadata alongside the returned SIO: match score, retrieval mode, fallback reason, state match reason, confidence tier. This document treats those fields as optional and future-compatible. Section 4.C documents the full list of retrieval context fields that Component 7 can optionally use when available. The reconciliation pass after Component 6 is complete should determine which of these fields affect presentation framing.

### Trust / Credibility Architecture (Component 8 — future)
The presentation layer is the primary trust-building moment. The first result the user receives determines whether they believe in the product. Component 8 will define the onboarding experience, copy tone, and broader trust signals. Component 7 must ensure that the presentation structure it defines is consistent with the trust signals Component 8 is designed to create. Specifically: the framing must make the human source visible, must not over-claim match quality, and must not sound like AI-generated advice.

### Feedback / Quality Signal Loop (Component 9 — future)
The feedback prompt defined in Section 14 produces the primary signal for Component 9. The phrasing, positioning, and options of that prompt determine signal quality. Vague prompts produce weak signals. Binary prompts produce high response rates. This document makes those design choices to support Component 9's needs.

---

## 3. Design Principles

### 1. The human source is the hero — not the AI.
The user should feel that Silhouette found something, not generated something. The framing language must make the source — the speaker, the show, the specific moment — visible and credible. "Matthew McConaughey navigated this from the inside" is a different experience than "Here's something that might help." The attribution must feel like the point, not the footnote.

### 2. Lead with the insight, not the setup.
For most states, the quote or excerpt should come first. Setup paragraphs that explain what the insight is about before showing it are a common over-engineering trap. If the insight is good, it speaks for itself. The "why this applies" sentence comes after — it deepens, it doesn't preview.

Exception: States where the user needs to feel understood before they can receive a reframe (Identity Transition, severe Engagement Drought) may benefit from a single grounding sentence before the quote. That exception is specified per state in Section 10.

### 3. One thing at a time.
The presentation returns one insight. Not a list of related quotes. Not a "here's another angle" secondary result. Not a summary paragraph followed by three insights. One insight, presented with care, is the product. Silhouette's value proposition is that the one thing it returns is worth receiving — not that it returns a lot.

### 4. The "why this applies" sentence must be specific, not topical.
Topical: "This insight addresses feeling stuck in your career."
Specific: "She left a job that looked right on paper for the same reason you described — not knowing what she'd built it *for*."

Topical framing makes the system feel algorithmic. Specific framing makes it feel like someone was paying attention. The sentence must reference something concrete from the user's input or the speaker's story — not just the general topic area.

### 5. Attribution should increase trust without feeling academic.
The attribution format must be readable, not formal. "Matthew McConaughey on The Tim Ferriss Show, October 2020" is readable. "McConaughey, Matthew (2020). Interviewed by Tim Ferriss. 'Lessons from an Unlikely Life,' October 27, 2020, The Tim Ferriss Show, 01:14:22–01:17:08." is a citation, not a trust signal.

Attribution should feel like a recommendation from a friend ("I heard this on...") rather than a bibliographic reference.

### 6. The framing voice must not fight the source voice.
If the retrieved SIO has `voice_register = direct/challenging`, the framing should not be warm and gentle. That mismatch is disorienting — it signals that the framing writer didn't understand the source. The "why this applies" sentence should match the register of the speaker it's introducing.

### 7. Avoid fake intimacy.
The system does not know the user. It should not speak as though it does. Phrases like "Based on your journey..." or "I can see you're really struggling with..." are presumptuous and unearned. The system matched a user's current moment to a human-sourced insight — that is honest. Performing emotional connection that the system doesn't have is dishonest and users can feel it.

### 8. Uncertainty should be visible, not hidden.
When retrieval is operating at moderate confidence or acceptable-match quality, the framing should reflect that: "Something that might fit..." rather than "This is exactly what you need." Overclaiming match confidence destroys trust when the insight doesn't land. Honest framing that acknowledges uncertainty maintains trust even when the insight is imperfect.

### 9. Never name the stuck state in the response.
Silhouette uses the state taxonomy internally, not externally. The presentation should never say "You're experiencing Direction Collapse" or "This is an Inaction Loop insight." Users did not come to be classified. The framing should acknowledge the experience, not label it.

### 10. Keep the total experience short.
The total presentation — bridge sentence, quote, attribution, why sentence, source link, feedback prompt — should take under 60 seconds to read. If it takes longer, something has been over-written. The aha moment happens during the quote, not the framing around it.

### 11. The source link should deepen the experience, not distract from it.
The link to the original source/timestamp should be secondary to the insight itself. It should say "hear it in context" not "click here." The user's attention should land on the insight first. The link provides depth for users who want to go further.

### 12. The feedback prompt should be as low-friction as possible.
"Did this land?" is more natural than "Rate this result" or "Was this helpful?" The feedback prompt should feel like a natural conclusion to the experience — a brief check-in — not an evaluation form.

---

## 4. Presentation Inputs

The following tables define what Component 7 receives. Fields marked **Required** must exist for an insight to be shown. Fields marked **Optional** are used when available but do not block presentation. Fields marked **MVP** are available at launch; fields marked **Future** are planned but not available at MVP.

### 4.A — Structured Insight Object Fields

These come from the SIO returned by the retrieval engine.

| Field | Required/Optional | MVP/Future | How It Affects Presentation | Shown to User? |
|---|---|---|---|---|
| `transcript_excerpt` | Required | MVP | Primary display content — the verbatim human-sourced text | Yes — the main quote |
| `key_claim` | Required | MVP | Lead display element when excerpt is long; always shown when excerpt is suppressed | Yes — as display lead or fallback |
| `attribution_text` | Required | MVP | Attribution line shown below the quote; must be complete for insight to be shown | Yes |
| `speaker` | Required | MVP | Used in "why this applies" sentence framing; used in attribution line | Indirectly (via attribution) |
| `show_or_platform` | Required | MVP | Used in attribution line and source link context | Yes (via attribution) |
| `episode_or_content_title` | Required | MVP | Used in attribution line | Yes (via attribution) |
| `episode_or_content_date` | Required | MVP | Year shown in compact attribution; full date in expanded attribution | Indirectly |
| `source_url` | Optional | MVP | Source link if available; insight can be shown without it | Yes — as "hear it" or "read it" link |
| `timestamp_range` | Optional | MVP | Used to construct a deep-link or timestamp display | Yes — "at [timestamp]" if available |
| `insight_type` | Required | MVP | Determines presentation structure (Section 11); not shown explicitly | No |
| `voice_register` | Required | MVP | Determines framing tone (Section 12); not shown explicitly | No |
| `primary_state_tag` | Required | MVP | Determines state-specific presentation rules (Section 10); not shown explicitly | No |
| `credibility_tier` | Optional | MVP | May inform credibility context in attribution (Tier 2/3 experts may need one additional line) | Indirectly |
| `intensity_level` | Optional | MVP | Confirms appropriate framing intensity for the user's detected state | No |
| `content_summary` | Optional | MVP | Available for use in "why this applies" sentence or bridge sentence construction | No (internal use) |
| `user_problem_match_notes` | Optional | MVP | Surfaces non-obvious match relevance for "why this applies" framing | No (internal use) |
| `resonance_match_notes` | Optional | MVP | Flags notably narrow resonance fit; can inform framing confidence | No (internal use) |
| `source_type` | Optional | MVP | Determines attribution format (podcast vs. TED vs. article — Section 8) | No (internal) |
| `human_review_status` | Required | MVP | Must be `approved` — no insight shown unless approved | No |

**Minimum required to show an insight:** `transcript_excerpt` or `key_claim`, `attribution_text`, `speaker`, `show_or_platform`, `insight_type`, `voice_register`, `primary_state_tag`, `human_review_status = approved`.

### 4.B — Intake Context Fields

These come from the RetrievalQuery produced by Component 4.

| Field | Required/Optional | MVP/Future | How It Affects Presentation |
|---|---|---|---|
| `user_text` | Optional | MVP | Available for "why this applies" framing; do not quote verbatim |
| `clarified_user_text` | Optional | MVP | Preferred over `user_text` when available; captures the more specific signal |
| `detected_state` | Required | MVP | Primary driver of Section 10 state-specific rules |
| `state_confidence` | Required | MVP | High confidence → specific framing; moderate confidence → broader "something that might fit" framing |
| `resonance_hypothesis_insight_type` | Optional | MVP | Confirms the retrieved insight type was a match; informs framing confidence |
| `resonance_hypothesis_voice_register` | Optional | MVP | Confirms voice register match; informs framing tone |
| `retrieval_mode` | Required | MVP | If `broad_semantic` or `safety_bypass`, triggers fallback framing (Section 15) |
| `intensity_preference` | Optional | MVP | Confirms intensity calibration |
| `scope_status` | Required | MVP | If not `in_scope`, triggers scope redirect or safety response |

### 4.C — Retrieval Context Fields (if available from Component 6)

These fields may be passed by the retrieval engine. They are not yet confirmed — this list is a placeholder for the Component 6 reconciliation pass.

| Field | MVP/Future | How It Could Affect Presentation |
|---|---|---|
| `match_score` | Future | Could signal framing confidence (high score → specific framing; borderline → "something that might fit") |
| `retrieval_mode` | MVP | Already in intake context; confirm whether C6 echoes or overrides |
| `fallback_reason` | Future | Informs fallback framing language (Section 15) |
| `state_match_reason` | Future | Could inform "why this applies" specificity |
| `resonance_match_reason` | Future | Could confirm resonance match quality |
| `top_candidate_rank` | Future | Useful for logging; not presentation-relevant |

**Reconciliation note:** After Component 6 is complete, review this table. Add any C6 fields that presentation should consume and update Section 15 fallback logic accordingly.

---

## 5. Core Presentation Structure

### The Default 5-Part MVP Structure

For a strong-match retrieval with high state confidence:

```
[1] Bridge sentence (optional — state-dependent)
[2] Quote / Excerpt
[3] Attribution line
[4] "Why this applies" sentence
[5] Source link (if available)
[6] Feedback prompt
```

Parts 2, 3, 4, and 6 are always present. Parts 1 and 5 are conditional.

---

### Part 1 — Bridge Sentence

**Purpose:** Orient the user — signal that what follows is specific to their situation, not a generic result. Not used for all states.

**When to include:** Identity Transition (user needs to feel understood before the reframe lands); Engagement Drought (scientific mechanism content benefits from one line of setup); low-state-confidence presentations. Skip for Direction Collapse, Inaction Loop, Possibility Paralysis, Momentum Gap — the quote should open directly.

**Length:** One sentence. Maximum 20 words.

**Tone:** Calm, observational. Never presumptuous. Never "I can see you're struggling."

**Required fields:** None — written from state + intake context.

**What to avoid:**
- Summarizing the user's situation back to them ("You mentioned feeling empty after your promotion...")
- Therapist tone ("It sounds like you're going through a difficult time")
- Preview of the insight ("This speaker talks about exactly what you described")
- Starting with "I" or "We"

**Examples:**
- Good: "A lot of people who've built something meaningful have been exactly here."
- Good: "There's a reason this feeling doesn't respond to motivation."
- Bad: "Based on what you shared, this insight seemed relevant."
- Bad: "Here is something I thought you might find helpful."

---

### Part 2 — Quote / Excerpt

**Purpose:** The insight itself. The primary content of the experience. The moment where the aha happens — or doesn't.

**Default:** Display `transcript_excerpt` verbatim. The speaker's words, unmodified.

**Visual treatment:** Clearly distinguished from the framing text. Block quote format or equivalent visual treatment. Should read as "this person's words, not ours."

**Length:** See Section 6 for full format rules.

**What to avoid:**
- Paraphrasing or summarizing the speaker's words
- Presenting a paraphrase as a quote
- Adding "..." without indicating the full excerpt is available
- Cleaning transcript imperfections without noting it

---

### Part 3 — Attribution Line

**Purpose:** Establish who said it, where, and when. This is the trust signal. It should be prominent enough to read naturally — not buried below the fold or greyed out.

**Default format (compact):** `— [Speaker name], [Show name], [Year]`

Example: `— Matthew McConaughey, The Tim Ferriss Show, 2020`

**With episode title (standard):** `— [Speaker name], appearing on [Show name], "[Episode title]" ([Year])`

**Position:** Immediately after the quote, before the "why this applies" sentence.

**See Section 8 for full format rules by source type.**

---

### Part 4 — "Why This Applies" Sentence

**Purpose:** Connect the insight to the user's specific situation. The framing that makes the match feel personal, not algorithmic. The hardest element to write well.

**Length:** One sentence. Maximum 35 words.

**Required:** Yes — always present.

**See Section 7 for full rules and examples.**

---

### Part 5 — Source Link

**Purpose:** Give the user who wants to go deeper a path to the original source. Secondary — the experience should be complete without it.

**Format:**
- If `timestamp_range` and `source_url` are available: "Hear it at [HH:MM] →" (links to timestamped URL if the platform supports it)
- If `source_url` only: "Listen to the full episode →" or "Read the full piece →"
- If neither: Omit entirely. Do not show a broken or missing link.

**Position:** After the "why this applies" sentence. Before the feedback prompt.

**What to avoid:**
- Making the link the primary CTA (it is secondary to the insight)
- Showing a link to a paywalled resource without noting it
- Generic "click here" language

---

### Part 6 — Feedback Prompt

**Purpose:** Collect the primary signal for the Feedback / Quality Loop. Must be present at MVP. Must feel like a natural conclusion, not a survey.

**Default phrasing:** "Did this land?"

**Options:**
- "Yes" (or thumbs up)
- "Show me something different" (or thumbs down)

**Position:** After the source link (or after "why this applies" if no source link).

**See Section 14 for full feedback design.**

---

### What the Full MVP Presentation Looks Like

```
[Bridge sentence — for ED and IT only]

"[Verbatim transcript excerpt or key claim, displayed as a block quote]"

— Speaker Name, Show Name, Year

[One sentence connecting this insight to the user's situation.]

Hear it at 1:14 →

Did this land?   [Yes]   [Show me something different]
```

---

## 6. Quote / Excerpt Format

### When to Use Transcript Excerpt vs. Key Claim

**Default: Use `transcript_excerpt`.**
The speaker's verbatim words carry more weight than a distillation. The user should feel they are receiving a real human moment, not an AI-generated summary of one.

**Use `key_claim` as the primary display element when:**
- The excerpt is at the upper end of its allowed range (200+ words) and reading it all would take more than 30 seconds
- The excerpt contains substantial transcript imperfections that could not be cleaned at ingestion without altering meaning
- The excerpt requires significant context from the episode that reduces standalone clarity

**Use `key_claim` as the lead with excerpt below when:**
- The insight type is `mechanism` — the key claim states the finding precisely before the speaker explains it
- The excerpt is long and the strongest sentence is buried partway through

### Length in Presentation

The SIO excerpt is 75–250 words (ingestion standard from Component 3). For display:

| Excerpt Length | Display Treatment |
|---|---|
| 75–120 words | Show full excerpt. No trimming. |
| 120–180 words | Show full excerpt. This is the ideal presentation length. |
| 180–220 words | Show full excerpt. Consider leading with `key_claim` to anchor before the full read. |
| 220–250 words | Either trim to a 150-word display version with "[full excerpt]" expand option, or lead with `key_claim` and offer "more context" link to the full excerpt |

Never trim below the standalone-comprehensibility threshold. A 90-word display excerpt that loses its meaning is worse than a 220-word one that reads long.

### Source Format Variations

**Podcast / audio source:**
Display format: verbatim transcript excerpt in block quote. Attribution includes show, speaker, year, timestamp. Source link says "Hear it at [HH:MM]" if platform supports deep-linking.

**Article / written source:**
Display format: verbatim excerpt in block quote. Attribution includes publication, author, title, year. Source link says "Read the full piece."

**Book (deferred at MVP per Component 2):**
Not applicable for MVP. If ever included: treat as article format with publisher attribution.

**TED Talk:**
Display format: verbatim transcript in block quote. TED talks have official transcripts — excerpt should be drawn from those. Attribution: "Speaker, TED Talk, '[Title]' (Year)." Source link: "Watch the talk."

**YouTube-native:**
Treat as podcast audio for display purposes. Attribution includes channel name. Timestamp deep-links are available via YouTube.

### Handling Transcript Imperfections

At ingestion, the pipeline should have cleaned obvious transcription errors. But light imperfections may remain (filler words, incomplete sentences at boundaries). Rules for the presentation layer:

- Do not re-edit transcript text at presentation time. If the text has issues, return it to the corpus pipeline for correction.
- Acceptable presentation-time adjustment: removing leading/trailing filler words at excerpt boundaries ("Um, so...") if this was not caught at ingestion. Note this in the session log.
- Not acceptable: changing word order, correcting grammar, or modifying meaning, even slightly.
- If an excerpt has a significant uncorrected error that affects readability, suppress the insight and log the issue for corpus review.

### Distinguishing Human Source from Silhouette Framing

The visual design (not specified here, but required from future UI implementation) must make clear which text is the speaker's words and which is Silhouette's framing. The block quote format accomplishes this visually. The attribution line must appear immediately after the quote and before the framing sentence — not at the end where it reads as a citation.

This sequencing matters: **Quote → Attribution → Framing.** Not: Framing → Quote → Attribution.

---

## 7. "Why This Applies" Sentence

This is the most important single element in the presentation. It is also the most common failure point.

### What It Must Do

The sentence must connect the retrieved insight to the user's specific situation in a way that:
- Feels like the system was actually paying attention — not just matching on keywords
- Names something specific about the speaker's story or the insight's claim (not just its topic)
- Does not repeat the user's words back to them verbatim
- Does not name or label the stuck state
- Does not overstate certainty about the match
- Does not perform emotional intimacy the system doesn't have
- Does not explain the insight (that is the insight's job)
- Helps the user understand why *this speaker* was chosen — not just why the topic is relevant

### Rules for Writing It

1. Reference something specific from the speaker's story or the insight's claim — not just the subject matter.
2. The subject of the sentence should usually be the speaker, not the system and not the user.
3. Do not begin with "You" or "I" or "Based on."
4. Do not use the word "stuck" (too on-the-nose), "journey" (generic), or "struggle" (clinical-adjacent).
5. One sentence only. If two things need to be said, the second one is over-explaining.
6. If `state_confidence = moderate`, hedge slightly: "Something that might fit..." or "She navigated something close to this..."
7. Use `clarified_user_text` over `user_text` when available, but never quote it directly.
8. If `resonance_match_notes` indicates a narrow fit, add a qualifier: "Depending on how you receive it..."

### Examples by State

**Direction Collapse — post-achievement variant:**
- Good: "McConaughey was at the career peak most people work toward when he discovered the target itself was the problem."
- Good: "She reached exactly what she'd planned for — and had to go back to zero to figure out what she actually wanted."
- Bad: "This insight is about feeling lost after achieving your goals." (topical, not specific)
- Bad: "Based on what you shared, I thought this might resonate." (fake intimacy + "based on")

**Direction Collapse — original variant:**
- Good: "Newport spent years watching people who'd never had a clear passion build meaningful direction anyway — by watching what they noticed."
- Good: "He argues that clarity comes from engagement, not from introspection — which is a different starting point than most direction-finding advice offers."
- Bad: "You might not know what you want, and this speaker talks about that." (vague, low-specificity)

**Engagement Drought:**
- Good: "Huberman's research names the exact mechanism behind what you're describing — and why it's not a willpower problem."
- Good: "She left a role at peak performance not because she failed at it but because mastery had made it invisible to her."
- Bad: "This is about losing motivation at work, which seems relevant to your situation." (topical)
- Bad: "Many people feel this way — you are not alone." (therapy language)

**Inaction Loop:**
- Good: "Goggins spent two years knowing exactly what he needed to do before he understood what was actually keeping him in place."
- Good: "She describes the moment she realized the block wasn't discipline — it was the story she was telling herself about what starting would mean."
- Bad: "This insight might help you take action." (prescriptive)
- Bad: "You know what to do and aren't doing it — this addresses that." (repeats classification logic)

**Possibility Paralysis:**
- Good: "He'd had the same four options on the table for a year when he finally understood that waiting for certainty was its own kind of choice."
- Good: "She makes the case that optionality has a cost most people don't account for — and names it specifically."
- Bad: "This might help you decide between your options." (prescriptive)
- Bad: "Choosing between multiple good options is hard — this insight addresses that." (topical)

**Identity Transition:**
- Good: "She was two years past the ending when she finally had language for what the space between had actually felt like."
- Good: "He describes the disorientation of the post-transition period without rushing toward what came next — which is rare."
- Bad: "After going through a big change, it can be hard to know who you are." (generic, therapy-adjacent)
- Bad: "This speaker went through something similar." (too vague)

**Momentum Gap:**
- Good: "He was watching peers move for three years before he understood that the comparison was pointing to something in him, not at them."
- Good: "She distinguishes between wanting what someone has and wanting what their forward motion means — which is a different question."
- Bad: "Comparison is natural — don't be too hard on yourself." (therapy language; also wrong tone)
- Bad: "You feel behind your peers and this insight addresses that." (repeats the classification)

### Patterns to Always Avoid

| Pattern | Why It Fails |
|---|---|
| "Based on your journey..." | Presumes intimacy; generic; "journey" is hollow |
| "You are not alone in..." | Therapy language; does not add information |
| "This powerful quote..." | Editorial intrusion; "powerful" is for the user to decide |
| "Here is an insight that might help you..." | Algorithmic framing; makes the system the subject |
| "I thought this might resonate because..." | Fake intimacy; attributes intent to the system |
| "You mentioned [verbatim user phrase]..." | Overly literal; clinical feel |
| "This is exactly what you need." | Overclaims certainty; sets up failure if it doesn't land |
| "You seem to be [stuck state label]." | Diagnoses the user; names an internal classification explicitly |

---

## 8. Attribution Design

### Why Attribution Is Non-Negotiable

Attribution is both an ethical requirement (all content is sourced from real human beings) and the product's core differentiator (Silhouette returns human-sourced insights, not AI-generated text). If attribution is present but visually weak — small, greyed out, buried — the product loses its differentiating signal. Users should immediately see who said what and where.

### Required Fields for Attribution to Be Complete

An insight cannot be shown if any of the following are missing:
- `speaker` (the person whose words are displayed)
- `show_or_platform` (the show, publication, or venue)
- `episode_or_content_title` (the specific episode or piece — at minimum the year if title is unavailable)

Optional but strongly preferred:
- `episode_or_content_date` (year minimum; full date in expanded format)
- `timestamp_range` (enables "hear it at" links for audio/video content)

### Attribution Formats

**Compact attribution (default — most presentations):**
```
— [Speaker], [Show], [Year]
```
Example: `— Matthew McConaughey, The Tim Ferriss Show, 2020`

Use for: Known speakers with clear show affiliation. Standard podcast and YouTube content.

**Standard attribution (for episode-level specificity):**
```
— [Speaker], appearing on [Show], "[Episode Title]" ([Year])
```
Example: `— Matthew McConaughey, appearing on The Tim Ferriss Show, "Lessons from an Unlikely Life" (2020)`

Use for: When the episode title adds meaningful credibility context; when the user might want to find the episode themselves.

**Expanded attribution (optional reveal):**
```
— [Speaker], appearing on [Show], "[Episode Title]"
   [Month Year] · [timestamp if available]
```
Use for: An "expand attribution" interaction if the user taps a "details" element. Not shown by default.

**Author crossover (book author on a podcast):**
```
— [Speaker], appearing on [Show], "[Episode Title]" ([Year])
```
Same as standard. The speaker's credibility is established by their name and the show context, not by explicitly naming their book unless the host's question references it. The content summary and match notes may reference the book context internally, but attribution format does not need to.

**TED Talk:**
```
— [Speaker], TED, "[Talk Title]" ([Year])
```
Example: `— Brené Brown, TED, "The Power of Vulnerability" (2010)`

**Article / written source:**
```
— [Author], [Publication], "[Title]" ([Year])
```
Example: `— Cal Newport, Medium, "Follow Your Career Passion? Don't" (2019)`

**Source link format (appears below attribution, not part of the attribution line):**
- Audio with timestamp: `Hear it at [H:MM] →`
- Audio without timestamp: `Listen to the full episode →`
- Video with timestamp: `Watch it at [H:MM] →`
- Article: `Read the full piece →`
- No URL available: Omit. Do not show a placeholder.

### Attribution Position and Visual Weight

Attribution belongs immediately after the quote and before the "why this applies" sentence. It should be readable without squinting — approximately the same visual weight as the "why" sentence text. Attribution that is set in 9px grey italic below a block of framing text will not be seen by most users, which defeats the core differentiator.

Avoid:
- Attribution below the "why this applies" sentence (reads as a footnote)
- Attribution in parentheses within the "why this applies" sentence
- Using only the show name without the speaker name when the speaker is the credibility signal

---

## 9. Delivery Format

### MVP Delivery Format

For MVP, Silhouette delivers text + source link + feedback prompt. No embedded media. No multi-insight comparison. No save/share.

**Text-only presentation:** The full 5-part structure (Section 5) delivered as a clean, readable text response. No media widgets.

**Source link:** A linked text element ("Hear it at 1:14 →") pointing to the original source. If the platform supports deep-linking to a timestamp (Spotify, YouTube), use it. If not, link to the episode-level URL.

**Feedback prompt:** "Did this land?" with two options — "Yes" and "Show me something different." (See Section 14 for full design.)

### What Not to Build at MVP

- **No embedded audio/video player.** Hosting or embedding third-party media in MVP adds licensing complexity and engineering scope. The source link is sufficient — it opens the original in the user's preferred app.
- **No save/favorite functionality.** Build after the core presentation pattern is validated and users show behavioral intent to save.
- **No share functionality.** Build after core experience is validated. Sharing without context from the intake session may produce out-of-context shares.
- **No multi-insight display.** Silhouette returns one insight. Showing two options "in case the first didn't fit" undermines the product's promise and trains users to evaluate rather than receive.
- **No "related insights" sidebar or "you might also like."** This is a content feed pattern. Silhouette is a retrieval product.
- **No explanation of the matching system.** Do not expose internal retrieval logic, state detection, or confidence scores to the user. The experience should feel like being understood — not like watching a system run.

### Information Hierarchy

The visual hierarchy should enforce the content hierarchy:
1. Quote / excerpt (largest visual weight — this is the insight)
2. Attribution (prominent — this is the differentiator)
3. "Why this applies" sentence (readable — this is the connection)
4. Source link (accessible but secondary)
5. Feedback prompt (present but quiet — don't let it compete with the insight)

---

## 10. State-Specific Presentation Guidance

### Direction Collapse

**What the user likely needs:** To have the experience of directionlessness named as coherent and real before anything is reframed. They do not need advice. They do not need to be told what to do next. They need to feel that what they're experiencing is not a character flaw.

**What to lead with:** Quote first. No bridge sentence. The reframe or story should open directly — Direction Collapse users are often analytical and do not need to be warmed up.

**Tone:** Calm, measured, non-prescriptive. Intellectual/measured or story/vulnerable work well. Direct/challenging is risky — the user may interpret challenge as judgment.

**"Why this applies" sentence:** Should reference something specific about the speaker's experience of post-goal flatness or original directionlessness — not just the general topic.

**What the "why" sentence must avoid:** Prescriptions ("this will help you find direction"), process references ("through this reframe, you can..."), or anything that implies the user should now know what to do.

**Next-step/feedback prompt:** Standard "Did this land?" The user should not be prompted to journal, plan, or act. If the insight landed, they have what they came for.

**Post-achievement variant (specific):** The framing should acknowledge arriving somewhere and finding it hollow — not the absence of a target. "She reached exactly what she'd planned for" is specific; "this is about feeling lost" is generic.

**Original directionlessness variant:** Framing should reference how direction is built (through action and noticing) rather than how it's found (through introspection). Avoid any framing that implies the user simply hasn't looked hard enough for their passion.

---

### Engagement Drought

**What the user likely needs:** To have the experience named as a real, explainable phenomenon — not a moral failing. The mechanism insight ("this is how motivation systems work") is the strongest opening for this state because it converts self-blame into system understanding.

**What to lead with:** For mechanism insights — one short bridge sentence before the quote: "There's a reason this feeling doesn't respond to willpower." Then the quote. For story insights — quote first.

**Tone:** Expert/scientific or story/vulnerable. The expert register works because it converts a personal failing into a system property. The vulnerable personal register works because it names the experience from the inside without judgment. Warm/affirming can feel dismissive ("you'll feel better soon") — use with care.

**"Why this applies" sentence:** For mechanism content — name the specific mechanism the speaker is describing ("Huberman's research names the exact system behind what you're describing"). For story content — name the specific form of professional flatness the speaker experienced ("She was at peak performance when it stopped feeling like anything").

**What the "why" sentence must avoid:** Suggesting the insight will restore motivation ("this will help you get your energy back"), moralizing about the plateau, or framing the insight as motivational content.

**Next-step/feedback prompt:** Standard. Do not suggest actions or re-engagement strategies in the presentation framing.

---

### Inaction Loop

**What the user likely needs:** To have the knowing-doing gap named without shame — and then a reframe at the identity level, not the tactical level. The user does not need another framework for starting. They need to hear from someone who was in the loop and understands it from the inside.

**What to lead with:** Quote first. The direct/challenging register of story content works best when it opens without preamble. Setup can feel like more information the user doesn't need.

**Tone:** Direct/challenging or story (first-person narrative from someone who was in the loop). The framing must not be contemptuous ("you just need to start") or falsely gentle ("it's okay if you're not ready"). Direct without shame.

**"Why this applies" sentence:** Should name the specific psychological dynamic the speaker describes, not just the behavior. "Goggins was in the loop for two years before he understood what was actually keeping him there" is better than "this is about not taking action."

**What the "why" sentence must avoid:** Implying the insight will fix the loop ("this will help you start"), naming the behavior in a way that feels shaming ("you keep not doing what you know you should"), or framing the insight as a productivity solution.

**Next-step/feedback prompt:** Standard. Absolutely no action prompts in the presentation framing. The insight is the intervention — not a plan.

---

### Possibility Paralysis

**What the user likely needs:** To have the genuine difficulty of choosing named — not dismissed as a good problem to have, not solved with a decision framework. Then a specific reframe on what commitment means or what optionality costs.

**What to lead with:** Quote first. The user needs to feel the insight is in their corner before it challenges them.

**Tone:** Intellectual/measured or direct/challenging. Reframe content works well here. The framing should not be warm/affirming ("it's okay to take your time") — this reinforces the paralysis rather than reframing it.

**"Why this applies" sentence:** Should name what the speaker says about commitment or optionality specifically — not just "this is about having too many choices."

**What the "why" sentence must avoid:** Moralizing about the privilege of having options, offering a decision framework, implying the user should now be able to choose.

---

### Identity Transition

**What the user likely needs:** To have the disorientation named as structurally appropriate — not a regression, not a sign of poor coping, not a problem to be fixed. The space between an old self and a new one is real and uncomfortable. Content that validates this before naming what comes next is what this state requires.

**What to lead with:** Bridge sentence first. A single grounding sentence before the quote acknowledges the state without diagnosing it: "The space after a major ending is its own kind of place." Then quote.

**Tone:** Vulnerable/personal or warm/affirming. Story content from someone who has been through the transition and come out the other side — not theorizing about it, but living it. The speaker must have enough distance to name both sides.

**"Why this applies" sentence:** Should reference the speaker's specific transition — the ending they navigated and the disorientation on the other side. "She was two years past the ending when she finally had language for what the space in between had actually been" is specific. "This is about going through a big change" is not.

**What the "why" sentence must avoid:** Rushing toward resolution ("this will help you figure out what comes next"), prescribing chapter-two thinking, or implying the transition should now make sense.

---

### Momentum Gap

**What the user likely needs:** To have the comparison feeling validated as a real signal — not dismissed, not moralized about — and then a specific reframe that converts the signal into something useful. "Comparison is the thief of joy" will be felt as dismissive. The comparison points to something real about the user's own values or standards; the framing should help the user see what it's actually pointing to.

**What to lead with:** Quote first.

**Tone:** Direct/challenging or intellectual/measured. The user is feeling competitive and a little ashamed of feeling competitive — they need someone who takes that seriously, not someone who tells them not to worry about it.

**"Why this applies" sentence:** Should reference the specific reframe the speaker offers about comparison — what it's pointing to vs. what it's not measuring. "He distinguishes between wanting what someone has and wanting what their momentum means — which is a different question" is specific.

**What the "why" sentence must avoid:** Any variation of "comparison is normal" or "everyone feels behind sometimes" — normalizing the feeling without adding a reframe is not useful. Also avoid moralizing about social media.

---

## 11. Insight-Type Presentation Guidance

### Mechanism

**What it is:** The insight explains why something happens — a scientific, psychological, or systems-level account of the experience. Primary sources: Huberman Lab, Hidden Brain, research-backed speakers.

**How to present:**
- Leading with the key claim often works well: the finding stated first, then the speaker's explanation.
- A one-sentence bridge may help orient the user before a mechanism explanation: "There's a reason this feeling doesn't respond to willpower."
- The "why this applies" sentence names the specific mechanism — not just the topic. "Huberman's research maps the exact system behind what you're describing" is specific.

**Avoid:**
- Over-explaining the mechanism in the framing (the insight does the explaining)
- Making the framing sentence sound more scientific than the source
- Using academic vocabulary in the framing when the source is accessible

**Default structure:** `[Short bridge] → [Key claim lead] → [Transcript excerpt] → [Attribution] → [Why sentence names mechanism]`

**Example:**
> There's a reason this feeling doesn't respond to trying harder.
>
> "[Key claim from Huberman, then excerpt...]"
>
> — Andrew Huberman, Huberman Lab, 2023
>
> His research names the exact dopamine system behind what you're describing — and why it's not a motivation problem.

---

### Story

**What it is:** First-person narrative from someone who lived through the state. The power is in the specificity of the experience and the credibility of the speaker. Primary sources: School of Greatness guests, Dan Martell, McConaughey on Ferriss.

**How to present:**
- Quote first. Always. The story is the thing — don't preview it.
- No bridge sentence needed. The narrative speaks for itself.
- The "why this applies" sentence places the speaker in the specific situation — tells the user which chapter of the speaker's story is being retrieved.

**Avoid:**
- Over-explaining the story's lesson in the framing ("this story shows that...")
- Giving away the narrative arc before the quote
- Framing the story as "inspirational" or using words like "powerful" or "moving"

**Default structure:** `[Quote / excerpt] → [Attribution] → [Why sentence places speaker in situation]`

---

### Reframe

**What it is:** A conceptual shift — a new frame for understanding the situation. Not advice. Not mechanism. A different way of seeing. Primary sources: Naval Ravikant, Cal Newport, Ryan Holiday, reframe-type content from any source.

**How to present:**
- Key claim as lead: the reframe is often most powerful as a single claim, followed by the explanation.
- No bridge sentence unless the state requires it.
- The "why this applies" sentence names the specific new frame — not just "this offers a different perspective."

**Avoid:**
- Softening the reframe in the framing sentence ("some might say...")
- Hedging a direct claim that the speaker makes directly
- Making the reframe sound like a slogan or poster text

**Default structure:** `[Key claim lead] → [Excerpt] → [Attribution] → [Why sentence names the specific frame]`

---

### Permission

**What it is:** Validates that the user's experience is real, coherent, and not a character flaw. The insight does not reframe the situation — it names it and grants permission to be in it. Primary sources: Brené Brown, warmly credible speakers, any source that names an experience without pathologizing it.

**How to present:**
- Bridge sentence often appropriate: a quiet, grounding line before the quote.
- The "why this applies" sentence should note the specific form of naming the speaker offers — what exactly they named and why it's different from how most people frame it.

**Avoid:**
- Therapy language in the framing ("this validates your feelings")
- Over-softening ("it's okay to feel this way")
- Making the permission feel like reassurance rather than naming

**Default structure:** `[Short bridge] → [Excerpt] → [Attribution] → [Why sentence names what the speaker specifically named]`

---

## 12. Voice Register Presentation Guidance

The framing voice should support and amplify the source voice. It should never fight it.

### Direct / Challenging

**Characteristic:** The speaker confronts, challenges, holds high standards. Goggins. Manson. Some Dan Martell. Content that respects the user's capability enough to be direct.

**Framing should:** Match the directness without adding contempt. Brief. No cushioning. The "why this applies" sentence can be direct too.

**What to avoid:** Over-softening a direct speaker's framing ("while this might seem intense..."). Adding qualifiers that the speaker deliberately didn't add. Warm/affirming framing around a direct/challenging quote is jarring.

**Tone of "why this applies":** Direct and specific. Subject = the speaker or the claim.

---

### Warm / Affirming

**Characteristic:** Supportive, meets the user where they are, generous register. Lewis Howes, Rangan Chatterjee.

**Framing should:** Warm bridge is appropriate. The "why this applies" sentence can have slightly more room for emotional resonance.

**What to avoid:** Making warm/affirming content sound clinical or detached through cold framing. But also: don't let warmth drift into fake intimacy.

**Tone of "why this applies":** Grounded and specific — not "you're going to be okay" generic warmth, but naming something the speaker specifically named.

---

### Intellectual / Measured

**Characteristic:** Analytical, precise, argues a case carefully. Newport, Shane Parrish, Naval Ravikant.

**Framing should:** Match the register — measured, specific, non-emotional. The "why this applies" sentence names the intellectual claim directly.

**What to avoid:** Adding emotional warmth to a speaker who is deliberately non-emotional. The framing should feel like someone who read the argument, not someone who felt it.

---

### Vulnerable / Personal

**Characteristic:** Confessional, emotionally exposed, shares the inside. McConaughey, Brené Brown.

**Framing should:** Honor the vulnerability without narrating it. The bridge sentence (if used) is quiet and grounding. The "why this applies" sentence places the speaker in the specific moment without dramatizing it.

**What to avoid:** Over-explaining the emotional arc of the story ("and then she discovered..."). Adding emotional interpretation to content that is already emotionally transparent. Let the speaker's voice do the work.

---

### Expert / Scientific

**Characteristic:** Evidence-based, clinical precision, authority from research. Huberman, Vedantam.

**Framing should:** Match the precision — name the mechanism, the research, or the system without over-simplifying it. The bridge sentence for mechanism content works well here: a single line before the quote sets up why the science matters.

**What to avoid:** Making scientific content sound soft or motivational. The expert register earns credibility through precision — softening it in the framing undermines the credibility signal.

---

## 13. Trust, Credibility, and Non-Generic Feel

### How Silhouette Avoids Sounding Like Generic AI Advice

The core mechanism: real source attribution, specific match framing, and language that makes the system feel like it found something rather than generated something.

**Real source attribution:** The speaker's name, show, and year are in the attribution line at eye level — not buried below the fold. Attribution should read like a recommendation from someone who found this specifically for you, not a bibliography.

**Specific match framing:** The "why this applies" sentence references something specific from the speaker's story or claim — not just the general topic area. Generic topic framing is indistinguishable from AI-generated content. Specific moment framing is not.

**Not over-explaining:** The insight doesn't need three paragraphs of setup. The less framing text surrounds the quote, the more the quote stands as a human moment rather than an AI output.

**Preserving the speaker's words:** The transcript excerpt must be verbatim. Paraphrasing or summarizing the speaker in the display position removes the core differentiator.

### Banned Patterns and Better Alternatives

| Banned Pattern | Why It Fails | Better Alternative |
|---|---|---|
| "Based on your journey..." | Hollow; presumes intimacy; "journey" is generic | "[Speaker name] navigated something close to what you described..." |
| "This powerful quote reminds us..." | Editorial intrusion; "powerful" is for the user to decide | Just show the quote. Let the user decide. |
| "You are not alone in your struggle..." | Therapy language; doesn't add information | "[Speaker] was in exactly this position at [specific point in career/life]..." |
| "Here is an inspirational thought..." | Motivational-poster framing; defeats the differentiation | (Just show the quote; the framing is in the "why" sentence) |
| "As an AI, I found this insight for you..." | Destroys the human-source differentiator | Drop the AI reference entirely |
| "I can see you're really struggling with..." | Fake intimacy; performs emotional connection the system doesn't have | Omit. Show the insight. |
| "This is exactly what you need." | Overclaims certainty; sets up failure | "Something that might fit." or no qualifier at all |
| "You seem to be experiencing [state name]" | Labels the user with an internal classification | Never name the state in the response |
| "This will help you..." | Prescriptive framing; the insight isn't a prescription | The insight stands alone — it doesn't need a use-case explanation |
| "Many people feel this way, and..." | Normalizes without adding information | Either name something specific, or say nothing |
| "It sounds like you're going through a really hard time." | Therapist voice; not what Silhouette is | (Don't say this. Show the insight.) |

---

## 14. Feedback Prompt

### Why the Feedback Prompt Matters

The "Did this land?" signal is the primary ground truth for retrieval quality. Without it, there is no way to know if Silhouette is working. The prompt must be present at MVP and must be designed to maximize honest, low-friction responses.

### MVP Feedback Design

**Phrasing:** "Did this land?"

This phrasing is:
- Natural (not survey language)
- Binary-adjacent (yes/no framing)
- Honest about what Silhouette is trying to accomplish (did it land — an aha moment — not "was this useful" or "rate this result")
- Short enough not to feel like work

**Options:**
- "Yes" (or equivalent thumbs-up)
- "Show me something different" (or equivalent thumbs-down)

Do not add a third option at MVP. A three-option prompt becomes a survey. Two options is a natural response.

**Position:** After the source link (if present), or after the "why this applies" sentence (if no source link). Below the full insight — not above or beside the quote where it competes with the reading experience.

**Timing:** Present the feedback prompt immediately with the insight. Do not delay it. Do not make the user scroll to find it.

**What happens after "Show me something different":**
This triggers a second retrieval attempt in the same session. The rejected SIO is excluded. The system attempts to retrieve the next-best candidate with a different `insight_type` or `voice_register`. A brief "Let me find something else" acknowledgment appears before the second result. The user gets one additional attempt. If the second result also doesn't land, the session ends gracefully — not with a third forced retrieval.

**What happens after "Yes":**
Simple positive acknowledgment. Nothing more. Do not add a prompt to journal, reflect, share, or act. The aha moment is the product. The post-aha experience should be quiet.

### What Is Logged

Every session logs:
- Whether "Did this land?" was responded to (binary)
- Which option was selected ("Yes" / "Show me something different" / no response)
- `dwell_time_seconds` on the insight before response (implicit signal)
- Whether a second retrieval was triggered (from "Show me something different")

Do not log:
- Specific user text about why something didn't land (no open-field feedback at MVP)
- Any follow-up survey items

### What Feedback Means for Future Retrieval

**"Yes":** Strong positive signal. Logs the `insight_type`, `voice_register`, and `primary_state_tag` of the returned SIO. After 2+ "Yes" responses with the same `insight_type` across sessions, begin treating that type as a mild resonance preference for future retrievals.

**"Show me something different":** Strong signal that something was off. Logs the same SIO metadata. Excludes the specific SIO from future retrievals. Does not immediately adjust resonance profile from one rejection — see Component 3's guidance on single-signal reliability.

**No response (skip):** Treat as weak neutral. Log but do not adjust profile. High skip rate on a specific SIO across many users is a signal for corpus review.

---

## 15. Fallback / No-Match Presentation

### Design Principle for All Fallback Cases

Fallback should not feel like system failure. It should feel like the system being honest and careful. A product that says "I don't have something that fits this well right now" is more trustworthy than one that returns something mediocre with false confidence.

### Case 1: No Strong Match (Weak Match Only)

**Situation:** Retrieval returned a candidate but it scores below the acceptable threshold (below 36/60 on the well-matched rubric).

**What the user sees:** "I don't have something that fits this exactly — can you tell me a bit more about what it feels like from the inside?"

**Do not:** Return the weak match with confident framing. Do not say "Here's something, though it may not be perfect."

**Log:** The fallback trigger, the state, and the top candidate score.

---

### Case 2: Low State Confidence (No Clarifying Question Yet Answered)

**Situation:** `state_confidence = low` — the initial input was too sparse to classify.

**What the user sees:** The intake context prompt — "Can you tell me a bit more about what's been feeling off?" This is intake behavior, not presentation. The presentation layer does not activate until state confidence is at least moderate.

---

### Case 3: Moderate State Confidence Presentation

**Situation:** `state_confidence = moderate` — retrieval has run across two states at 70/30 weighting.

**What the user sees:** Standard 5-part presentation, but the "why this applies" sentence frames with slightly less certainty: "Something that might fit..." or "She navigated something close to this..."

**Do not:** Use full-confidence framing on a moderate-confidence retrieval. The hedged framing is honest and maintains trust.

---

### Case 4: Safety Bypass

**Situation:** `safety_flag = true` — input triggered Tier 1 or Tier 2 safety routing.

**What the user sees:** A care-first response defined by the Trust / Credibility Architecture (Component 8). This is not a presentation layer decision — Component 7 does not define the safety response content. What Component 7 defines: the presentation layer must check `safety_flag` before rendering any insight. If `safety_flag = true`, do not render an SIO under any circumstances.

---

### Case 5: Out-of-Scope Redirect

**Situation:** `scope_status = out_of_scope` — the user's input is outside Silhouette's intended scope but not a safety concern.

**What the user sees:** A brief, honest redirect: "This sounds like something outside what Silhouette is built for. Silhouette works best for career, purpose, and motivation moments — [brief description of what those look like]."

Do not attempt retrieval. Do not apologize at length.

---

### Case 6: Corpus Gap (No SIOs Above Threshold for This State)

**Situation:** The retrieval engine triggered the pool-size safety clause or returned no candidates above threshold for the detected state.

**What the user sees:** "I don't have something that fits this well right now — can you tell me a bit more about what it feels like from the inside?"

Same response as Case 1. The user does not need to know whether the gap is a state classification issue or a corpus coverage issue. The appropriate response is to invite more context, not explain the indexing state.

**Log:** This as a corpus gap signal for expansion prioritization.

---

### Case 7: User Rejects First Result

**Situation:** User selects "Show me something different."

**What the user sees:** Brief acknowledgment — "Let me find something else." Then a second result from the same session, excluding the rejected SIO and attempting a different insight_type or voice_register.

**Rules:**
- Maximum one additional retrieval attempt per session
- If the second result also doesn't land: "I'm not finding something that fits well right now. This might be a good moment to come back to." Do not force a third attempt.

---

### Case 8: Attribution Incomplete

**Situation:** The returned SIO is missing required attribution fields (`speaker`, `show_or_platform`, or `episode_or_content_title`).

**What the user sees:** Nothing. Do not show an insight without attribution. Route to corpus review and log the SIO ID.

**This should not happen in production** if the ingestion pipeline quality gates are working correctly. If it does, it indicates a pipeline failure.

---

### Case 9: Source Link Missing

**Situation:** `source_url` is null or unavailable.

**What the user sees:** Standard 5-part presentation without Part 5 (source link). Omit the link element entirely. Do not show a broken or placeholder link.

No framing change. The insight presentation is complete without the source link.

---

## 16. Example Presentations

Each example includes: user input summary, retrieved insight metadata, and the full user-facing presentation. Quotes are illustrative — they are not copyrighted source material.

---

### Example 1: Direction Collapse / Reframe / Intellectual-Measured

**User input summary:** "I've spent three years building toward a promotion. I got it last month. I thought I'd feel settled. I feel more lost than before."

**Retrieved insight metadata:**
- `speaker`: Cal Newport
- `insight_type`: reframe
- `voice_register`: intellectual/measured
- `primary_state_tag`: direction-collapse / post-achievement
- `key_claim`: "Goals are not directions — they're waypoints. When you reach one, you haven't arrived; you've run out of map."

**User-facing presentation:**

> "Goals are not directions — they're waypoints. When you reach one, you haven't arrived; you've run out of map. The disorientation you feel after achieving something isn't a sign that the goal was wrong — it's the correct response to discovering that the goal was never the destination."
>
> — Cal Newport, Deep Questions, 2022
>
> Newport distinguishes between what goals do (mark progress) and what they can't do (provide direction) — which is a different framing than "I should have wanted something more."
>
> Listen to the episode →
>
> Did this land?   [Yes]   [Show me something different]

---

### Example 2: Direction Collapse / Story / Vulnerable-Personal

**User input summary:** "I don't know what I actually want. Everyone around me seems to have figured it out. I feel like I missed a memo."

**Retrieved insight metadata:**
- `speaker`: Matthew McConaughey
- `insight_type`: story
- `voice_register`: vulnerable/personal
- `primary_state_tag`: direction-collapse / original

**User-facing presentation:**

> "I turned down the romantic lead roles because I wanted to be taken seriously, and I went from making $14.5 million a picture to zero. I had to go to zero. Because I wasn't going to get those roles until I proved I'd do them for free... But you gotta first go back to zero — the place where you can be honest about what you actually want. Because when you're making $14.5 million, you can't be honest. Everything costs too much to tell the truth."
>
> — Matthew McConaughey, The Tim Ferriss Show, "Lessons from an Unlikely Life" (2020)
>
> He navigated the same opacity — not knowing what he actually wanted — by removing the external stakes that were preventing honest self-direction.
>
> Hear it at 1:14 →
>
> Did this land?   [Yes]   [Show me something different]

---

### Example 3: Engagement Drought / Mechanism / Expert-Scientific

**User input summary:** "I used to love my work. I stayed late because I wanted to. Now I show up, I do the job, I go home. Nothing engages me."

**Retrieved insight metadata:**
- `speaker`: Andrew Huberman
- `insight_type`: mechanism
- `voice_register`: expert/scientific
- `primary_state_tag`: engagement-drought

**User-facing presentation:**

> There's a reason this doesn't respond to motivation tips.
>
> "The dopamine system isn't designed to sustain engagement — it's designed to pursue novelty and reward prediction error. Once you've mastered something, the brain literally reduces its dopamine response to that activity. The flatness you feel isn't burnout or laziness. It's the correct output of a nervous system that has finished learning this particular thing."
>
> — Andrew Huberman, Huberman Lab, 2023
>
> His research names the exact mechanism behind what you're describing — and reframes it as a system property, not a personal failing.
>
> Listen to the episode →
>
> Did this land?   [Yes]   [Show me something different]

---

### Example 4: Inaction Loop / Story / Direct-Challenging

**User input summary:** "I know exactly what I need to do. I've known for two years. I keep finding reasons to wait. I'm starting to wonder if I'm just not someone who follows through."

**Retrieved insight metadata:**
- `speaker`: David Goggins
- `insight_type`: story
- `voice_register`: direct/challenging
- `primary_state_tag`: inaction-loop

**User-facing presentation:**

> "I spent years telling myself I wasn't ready yet. I had the list of reasons memorized. And at some point I had to ask: is the not-readiness real, or is the not-readiness the story I'm telling myself so I don't have to find out what happens if I actually try and it doesn't work? Because those are two different problems. One is a preparation problem. The other one is a fear problem. And fear will always give you more reasons."
>
> — David Goggins, [Show Name], [Year]
>
> He spent years in the same loop before he identified the actual block — not preparation, but the story about what failure would mean.
>
> Hear it at [timestamp] →
>
> Did this land?   [Yes]   [Show me something different]

---

### Example 5: Possibility Paralysis / Reframe

**User input summary:** "I have four real options in front of me. I've been going back and forth for eight months. I can't commit to any of them."

**Retrieved insight metadata:**
- `speaker`: Dan Martell
- `insight_type`: reframe
- `voice_register`: intellectual/measured
- `primary_state_tag`: possibility-paralysis

**User-facing presentation:**

> "Optionality has a price most people don't calculate. Every month you keep four doors open is a month you're running four different internal simulations of four different lives. That's not strategic — that's expensive. Commitment doesn't foreclose options; it generates information. Indecision forecloses everything and generates nothing."
>
> — Dan Martell, [Show Name], [Year]
>
> Martell names what keeping options open actually costs — not in regret, but in the present-tense tax of running parallel possibilities.
>
> Did this land?   [Yes]   [Show me something different]

---

### Example 6: Identity Transition / Permission

**User input summary:** "I left a job I'd been at for six years. I thought I'd feel relieved. I feel like a stranger in my own life. I don't know who I am without that structure."

**Retrieved insight metadata:**
- `speaker`: Brené Brown
- `insight_type`: permission
- `voice_register`: warm/affirming
- `primary_state_tag`: identity-transition

**User-facing presentation:**

> The space after a big ending is its own kind of place.
>
> "We're taught to treat transition as something to get through — a tunnel you pass through to get back to solid ground. But the middle is its own experience. It's not a failure of adjustment. It's the correct response to having organized yourself around something that's no longer there. The disorientation isn't a sign that something's wrong with you. It's a sign that the thing that was organizing you was real."
>
> — Brené Brown, [Show Name], [Year]
>
> She names the structural reason for the disorientation — not as a coping problem, but as the accurate response to a real loss of organizing structure.
>
> Did this land?   [Yes]   [Show me something different]

---

### Example 7: Momentum Gap / Story or Reframe

**User input summary:** "My friend just got promoted to VP. Another just launched a company. I'm doing fine but I feel weirdly hollow about my own progress."

**Retrieved insight metadata:**
- `speaker`: Dan Martell
- `insight_type`: reframe
- `voice_register`: direct/challenging
- `primary_state_tag`: momentum-gap

**User-facing presentation:**

> "Comparison is directional data. When you feel behind someone else, that feeling is pointing to something — not at them, but at what you value. The person who launched a company and feels nothing about it. The person who got the VP title and feels nothing about it. They're not data points on your timeline. They're mirrors showing you what momentum means to you. That feeling is signal. The question is what you do with it."
>
> — Dan Martell, [Show Name], [Year]
>
> He reframes the comparison as information about your own values rather than a verdict on your progress relative to someone else's.
>
> Did this land?   [Yes]   [Show me something different]

---

### Example 8: No Strong Match Fallback

**User input summary:** "I feel behind but I can't articulate where. Everything is fine but something feels off."

**Retrieval result:** No candidates above the acceptable match threshold (state is ambiguous between DC and MG; corpus has thin coverage for this specific combination).

**User-facing presentation:**

> I don't have something that fits this exactly — can you tell me a bit more about what it feels like from the inside?

*Simple. No apology. No explanation of why. No suggestion that the user is doing anything wrong. Just an invitation to say more.*

---

## 17. Presentation Evaluation Plan

### What Evaluation Proves

Presentation evaluation cannot tell you whether the retrieval was correct — that is retrieval evaluation (Component 3). Presentation evaluation tests whether, given a correct retrieval, the framing makes the insight land better or worse.

This means evaluation must use cases where the retrieval quality is controlled — i.e., gold-set SIOs with known strong match quality — to isolate the presentation variable.

### Evaluation Dimensions

| Dimension | What It Measures | Evaluation Method |
|---|---|---|
| **"Did this feel like it was for me?"** | Specificity of the presentation | Human review 1–5 |
| **"Did the framing feel authentic or generic?"** | Whether the "why this applies" sentence felt human or algorithmic | Human review 1–5 |
| **Trust signal strength** | Did the attribution make you more likely to engage? | Human review 1–5 |
| **Source credibility** | Did you recognize or feel confident about the speaker/show? | Human review 1–5 |
| **Tone appropriateness** | Did the framing voice match the emotional register of your situation? | Human review 1–5 |
| **Resistance to generic AI feel** | Could this have come from ChatGPT? | Yes/No + explanation |
| **Feedback prompt response rate** | Did evaluators respond to "Did this land?" | Response rate % |
| **Presentation variant comparison** | Does structure A land better than structure B? | A/B scoring |

### MVP Evaluation Set

- **10–15 SIOs** drawn from the gold set (Component 3's evaluation plan)
- **20 sample user inputs** covering all six states (including 3–4 MVP priority states at multiple phrasings)
- **2–3 presentation variants** per state (e.g., quote-first vs. bridge-first; standard attribution vs. expanded)
- **5–8 human evaluators** who match the target user profile (22–32, employed, in or near a stuck moment)
- Each evaluator rates the full 5-part presentation, not isolated elements

### Scoring Targets

| Metric | MVP Target |
|---|---|
| "Did this feel like it was for me?" | ≥ 3.8 / 5.0 average |
| "Did the framing feel authentic or generic?" | ≥ 3.5 / 5.0 average |
| Trust signal strength | ≥ 3.5 / 5.0 |
| "Could this have come from ChatGPT?" | < 20% "yes" responses |
| Feedback prompt response rate | ≥ 60% (in evaluation sessions) |

### Inter-Rater Reliability

The same calibration requirement from Component 3 applies here: evaluators must rate the same 5 calibration presentations before independent evaluation begins. Target agreement within 1 point on at least 4 of 5 calibration cases.

### What Evaluation Cannot Tell You

- Whether retrieval was correct (separate evaluation — Component 3)
- Whether real users in real stuck moments respond the same as evaluators (only product usage reveals this)
- Whether a presentation that evaluated well will consistently land in live sessions (the moment matters; a controlled evaluation doesn't fully replicate it)

---

## 18. MVP Recommendation

### What to Build

**Default presentation structure:**
1. Bridge sentence (only for ED and IT states, and only one sentence)
2. Verbatim transcript excerpt in block quote (or key claim when excerpt is long)
3. Compact attribution line: `— Speaker, Show, Year`
4. One "why this applies" sentence (specific to speaker's story, not topical)
5. Source link if `source_url` is available ("Hear it at [timestamp]" or "Listen to the episode →")
6. "Did this land?" feedback prompt with two options

**Length:** The full presentation should take under 60 seconds to read. If it's taking longer, the excerpt is too long or the framing is over-written.

**Must always be included:**
- The verbatim excerpt or key claim
- The attribution line (cannot be suppressed or de-emphasized)
- The "why this applies" sentence
- The "Did this land?" feedback prompt

**Optional (include when available):**
- Bridge sentence (state-dependent)
- Source link (include when URL is available)

### What Not to Build at MVP

- No embedded audio/video player
- No save/favorite functionality
- No share features
- No multi-insight display
- No "related insights" sidebar
- No open-field text feedback
- No explanation of how the matching system works
- No explicit stuck-state label in the presentation

### What Must Pass Before Shipping

- Presentation evaluation set complete (Section 17): ≥ 3.8 / 5.0 on "felt like it was for me"
- Attribution completeness: 100% — no insight shown without attribution
- Banned pattern check: manual review of all framing copy against Section 13 banned patterns
- Feedback prompt response rate in testing: ≥ 60%
- Fallback cases tested: all 9 cases in Section 15 verified to display correctly

---

## 19. Open Questions

### Q1: Should the presentation lead with the quote or with context — for every state?

**Why it matters:** Section 10 defines this per state, but it's based on reasoning from the User Problem Model rather than user data. A user in Direction Collapse who receives a cold quote (no bridge) may disengage before the attribution makes the speaker's credibility visible.

**What would resolve it:** Presentation variant testing with target-demographic evaluators. A/B: quote-first vs. bridge-first for Direction Collapse specifically.

**Which component resolves it:** Component 17 evaluation plan; inform Component 8 (Trust Architecture) if bridge sentences are systematically needed across more states.

---

### Q2: Should the user see why the insight matched?

**Why it matters:** Transparency about matching logic could increase trust ("this was retrieved because you described feeling empty after an achievement"). But it could also feel algorithmic, clinical, or presumptuous — the system naming what it thinks the user's problem is.

**What would resolve it:** Qualitative user testing. Show the same result with and without a visible match rationale. Measure "felt understood" vs. "felt watched."

**Which component resolves it:** Component 8 (Trust/Credibility Architecture). This is fundamentally a trust design question.

---

### Q3: Should source links be prominent or secondary?

**Why it matters:** A prominent source link could drive users to the original content (which deepens the experience and validates the attribution). But it could also pull users out of the insight moment before the aha has settled.

**What would resolve it:** Behavioral data: do users who click through have higher "Did this land?" response rates than those who don't? Which comes first — the click or the land?

**Which component resolves it:** Usage data from MVP sessions.

---

### Q4: Should audio/video moments be embedded in a future version?

**Why it matters:** Hearing a speaker's voice is a different experience than reading their words. A McConaughey clip is more emotionally immediate than a transcript. But embedding media requires licensing, hosting, and content rights decisions.

**What would resolve it:** A/B test: text-only vs. clip-linked presentation for the same insight. Measure "Did this land?" response rate difference.

**Which component resolves it:** Content licensing decisions (Component 2 governance), then product decision.

---

### Q5: Should the feedback prompt ask "Did this land?" or something more specific?

**Why it matters:** "Did this land?" is natural but abstract. Some users may not know what "landed" means in this context. A more specific prompt ("Did this feel relevant to your situation?") might produce higher-quality signal at the cost of slightly more friction.

**What would resolve it:** A/B test prompt phrasing in early sessions. Measure response rate and downstream retrieval improvement per phrasing.

**Which component resolves it:** Component 9 (Feedback / Quality Loop) design.

---

### Q6: How much attribution is enough for an unfamiliar speaker?

**Why it matters:** A well-known speaker (McConaughey, Huberman) provides credibility by name. A lesser-known but highly credible speaker (Dr. Rangan Chatterjee, a specific Diary of a CEO guest) may need one additional line of credibility context ("host of Feel Better Live More, practicing physician") to land with the same trust signal.

**What would resolve it:** Evaluator ratings on attribution trust across known vs. unknown speakers. If trust scores are systematically lower for unfamiliar speakers, add a credibility context line for Tier 2 sources.

**Which component resolves it:** Present decision in Section 8 is conservative (no extra line by default). Revise if evaluation reveals the gap.

---

### Q7: Should Silhouette name the stuck state in the response?

**Why it matters:** Naming the state explicitly ("This is about feeling purposeless after achieving a goal") could help the user feel understood and see the match logic. But it could also feel like a diagnosis, could be wrong (if the classification was moderate confidence), and could undermine trust if the user doesn't identify with the label.

**Decision:** No. Current design avoids naming the state. The "why this applies" sentence does the work of connecting the insight to the user's situation without labeling it.

**Evidence that would change this:** If users consistently ask "why was this chosen?" or feel the match is unclear, limited transparency about the match rationale might be appropriate. Revisit after Component 8 (Trust Architecture) is designed.

---

### Q8: What happens when the retrieved source is credible but unfamiliar?

**Why it matters:** The attribution line signals credibility. "Matthew McConaughey, The Tim Ferriss Show" is a strong signal even for users unfamiliar with the episode. "Liz Wiseman, appearing on WorkLife with Adam Grant, 'The Rookie Mindset' (2019)" is credible but may require more context for users unfamiliar with either name.

**What would resolve it:** Credibility context line for Tier-2 sources (brief credibility note below the attribution: "author of Multipliers, leadership researcher"). Evaluate whether this improves or complicates the experience.

**Which component resolves it:** Presentation variant test; inform Component 2 (Source Strategy) if attribution format needs to differentiate by credibility tier.

---

### Q9: Should the presentation adapt visibly by state in the UI?

**Why it matters:** A more minimal, quieter visual presentation for Identity Transition (where the user needs stillness) might land differently than an energetic layout for Inaction Loop. But adapting visual design by state requires the UI to know the detected state — which raises a trust question (should the UI visibly respond to what it detected?).

**What would resolve it:** User testing on whether state-aware visual adaptation is perceptible and positive, or uncanny and clinical.

**Which component resolves it:** Component 8 (Trust/Credibility Architecture).

---

### Q10: What should happen if the user wants to ask a follow-up question after receiving an insight?

**Why it matters:** Some users will want to respond to the insight — ask a question, say "but what about..." or "does this mean..." Silhouette is not designed as a conversational chatbot, but refusing to engage with a natural conversational response could feel abrupt.

**Decision:** Not defined in MVP. The product is a retrieval product, not a dialogue system. Follow-up questions are out of scope for MVP.

**Evidence that would change this:** If a significant proportion of users attempt follow-up questions (behavioral data from sessions), evaluate whether a limited "tell me more about what this brought up" intake path for a second retrieval would add value.

**Which component resolves it:** Product decision after MVP usage data. Does not belong in Component 7.

---

## When to Revise This Document

- After Component 6 (Retrieval Engine) is complete: review Section 4.C and Section 15 against C6's output schema and fallback hierarchy
- After presentation evaluation reveals systematic failures in a specific state or presentation element
- After early user sessions reveal that the "why this applies" sentence formula is not landing
- After Component 8 (Trust / Credibility Architecture) resolves the transparency questions in Section 19
- After the feedback prompt is validated and Component 9's design is finalized
- If new insight types or voice registers are added to the Resonance Model
