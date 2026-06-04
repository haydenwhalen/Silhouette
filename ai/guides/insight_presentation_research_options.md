# Insight Presentation Layer — Research-Backed Redesign Options

_Research + proposal document. No code, no SIO edits, no implementation. Author: presentation-layer research pass, 2026-06-04._

> **Scope.** This evaluates how Silhouette should present its **one insight per session** so the user (a) absorbs and learns from it, (b) leaves with more hope/agency/momentum, and (c) wants to return because the moment felt human and useful. It ends with **three fully specified options** for you to choose from. It does not implement any of them.

---

## Table of Contents

1. [Current Baseline Summary (Step 0)](#1-current-baseline-summary)
2. [Research Synthesis (Step 1)](#2-research-synthesis)
   - [A. Learning, comprehension, retention](#a-learning-comprehension-retention)
   - [B. Motivation, hope, agency](#b-motivation-hope-agency)
   - [C. Framing, persuasion, credibility](#c-framing-persuasion-credibility)
   - [D. Emotional design & calm technology](#d-emotional-design--calm-technology)
   - [Cross-cutting verdict: the "small agency beat"](#cross-cutting-verdict-the-small-agency-beat)
3. [Three Presentation Options](#3-three-presentation-options)
   - [Option A — One Human Moment](#option-a--one-human-moment)
   - [Option B — Context · Quote · Carry (the Pathway Card)](#option-b--context--quote--carry-the-pathway-card)
   - [Option C — The Witness (person-forward / source-immersive)](#option-c--the-witness-person-forward--source-immersive)
4. [Comparison Table](#4-comparison-table)
5. [Recommendation](#5-recommendation)
6. [What to Validate With Real Users](#6-what-to-validate-with-real-users)
7. [References](#7-references)

---

## 1. Current Baseline Summary

What exists today, before any proposal (read from `presentInsight.ts`, `feedbackMarker.ts`, `InsightCard.tsx`, `FeedbackRow.tsx`, `media.ts`, `InsightMediaCard.tsx`, Component 7 spec, Component 9 spec, and real SIOs):

1. **Format — a 5-part card.** The agent emits a fixed Markdown string parsed into slots: `[optional bridge sentence]` → `> excerpt (the centerpiece)` → `— attribution` → `why-this-applies` → `source link (Watch/Listen/Read → URL)` → hidden feedback marker. Parts 2/3/4 + feedback are always present; bridge and source link are conditional. Visual hierarchy: serif excerpt is largest; attribution is small/tracked/uppercase with an accent hairline ("this is a real person"); why-this-applies is muted after a divider; source link is a soft accent arrow.

2. **Data shape (`PresentationObject`).** `insight_id, speaker, bridge_sentence (nullable), excerpt, attribution, why_this_applies, next_step: null, feedback_prompt, media, source_confidence: "strong"|"acceptable"|"hedged", presentation_notes[], rendered_markdown`. Note `next_step` exists but is **hard-wired to `null`** — the schema already anticipated an agency beat and the spec deliberately turned it off.

3. **Two LLM-generated parts, heavily guardrailed.** Only `bridge_sentence` (≤20 words, engagement-drought + identity-transition only, dropped unless it contains a concrete hook) and `why_this_applies` (≤35 words, must name a *specific* moment/mechanism, retried once if it's too topical or trips a banned fragment). `BANNED_FRAGMENTS` blocks `journey`, `struggle`, `it sounds like`, `I see you`, `you are not alone`, `this will help you`, `as an ai`, etc. Everything else (excerpt, attribution) comes verbatim from the SIO.

4. **Media/source behavior (`media.ts` + `InsightMediaCard`).** `normalizeMediaMetadata` resolves an honest `display_mode` and a single boolean `has_verified_embed` (true only when `verification_status === verified` AND `embed_url` host is on a 4-host allowlist). Click-to-play placeholder; no iframe or third-party request until click; YouTube thumbnail vs. styled TED placeholder. Label honesty ladder: timestamp + exact/close → "Watch the moment"; timestamp + talking_point → "Watch near this moment"; no timestamp → "Watch the source"; non-embed → "Watch on YouTube / Listen to the full episode / Read the source". A `from M:SS` pill shows on timestamped placeholders. Graceful degradation: a declared `video-primary` without a usable embed collapses to `audio-primary` or `text-only`.

5. **Source confidence is computed but barely surfaced.** `source_confidence` is derived from `state_confidence` (high→strong, moderate→acceptable, low→hedged) and currently expresses itself only by making the why-sentence *hedged in wording* ("Something that might fit…"). There is no visible confidence chrome.

6. **Feedback behavior (`FeedbackRow`).** Two statement buttons — **"This landed"** / **"Show me something different"** — no thumbs, no rating, no open field. On click it posts a dwell signal (`dwell_ms`, `dwell_qualified` = was-tab-visible-the-whole-time) to `/api/feedback-signal`, then runs the follow-up. After click: "Noted — thank you." **What happens after "Yes" is deliberately quiet** — Component 7 says: _"Do not add a prompt to journal, reflect, share, or act. The aha moment is the product. The post-aha experience should be quiet."_

7. **Measurement (Component 9).** 8 MVP metrics: insight-landing rate (≥55%), strong-positive rate (Yes + dwell ≥45s, ≥30%), session-completion, feedback-response, double-rejection (<20%), corpus-gap rate, state-coverage balance, voluntary-return rate (≥20% at 30–60 days). Dwell is qualified against **excerpt length** (longer excerpt → higher dwell bar for a "strong" Yes). 6-type failure taxonomy ends in **Presentation Failure** ("why this applies framing fails to connect"). Explicit anti-bloat stance: **no streaks, no open-field prompts, no engagement mechanics, no source/media click tracking yet**; "voluntary return is the signal — engineering return undermines it."

8. **Product invariants that constrain every option.** One insight per session; the human source is the hero (never "an AI generated advice"); non-clinical (never name the state, no fake intimacy, no diagnosis); under ~60s read; source honesty (don't visually overclaim precision); must work across 6 states × 4 insight types × 5 registers × 5 media conditions; optimize the single session, not retention.

9. **The raw material is uneven and often a paraphrase.** Many SIOs are `prototype_only` reconstructions with `⚠️ RECONSTRUCTION NOTE` blocks the presenter strips. Bodies range from a tight verbatim line (Colonna) to a longer paraphrased passage (Robbins, McConaughey). `clip_match_type` (exact_quote_match / close_paraphrase / talking_point) and `transcript_verified` already encode how literal the excerpt is — a signal the presentation layer currently **does not** use beyond the media label.

10. **Known weak spots.** (a) **Media inequality** — a timestamped YouTube card is visually "premium"; a text-only SIO gets a thin link, which can read as a lesser result. (b) **Source confidence is invisible** — the hedge lives only in word choice, easy to miss. (c) **The why-sentence carries the entire interpretive + hope load** in one muted line; if it misses, the card has no other hope mechanism. (d) **The ending is abrupt** — "This landed / Show me something different" is the last thing the user sees, which by peak-end logic makes *evaluation*, not the *insight*, the final beat. (e) The card cannot distinguish a verbatim quote from a paraphrase for the reader, a latent honesty gap.

---

## 2. Research Synthesis

Evidence strength is flagged **[strong]**, **[moderate]**, **[mixed/contested]**, or **[weak/qualitative]**. Where a famous idea has failed or shaky replications, that is stated rather than hidden.

### A. Learning, comprehension, retention

**Cognitive Load Theory (Sweller 1988; Sweller, van Merriënboer & Paas 2019). [strong]** Working memory is sharply limited; learning fails when *extraneous* load (irrelevant decoration, competing elements, hunting for structure) crowds out *germane* load (the actual sense-making). A user in a low-energy stuck state has even less spare working memory. _Implication:_ ruthless reduction of extraneous elements — one focal object (the quote), no competing CTAs, no decorative chrome that demands attention. This is the strongest single argument *for* Silhouette's minimalism and *against* stacking an insight with advice, exercises, or multiple modules.

**Mayer's Multimedia Learning principles (Mayer 2009; 2021). [strong]** The relevant ones for a text + embedded-clip card:
- **Coherence** — exclude extraneous words/graphics; they depress learning. _→ kill ornamental UI; every element must earn its place._
- **Signaling** — cueing the essential material (highlighting, a lead line) improves retention. _→ a bolded key-claim lead, or a visual "this is the line" cue, helps._
- **Redundancy** — narrated identical on-screen text *hurts* (don't duplicate the same words in two channels simultaneously). _→ if a clip plays the same sentence the user just read, that's redundancy; mitigate by making the clip the moment after the read, not a simultaneous duplicate._
- **Segmenting** — user-paced chunks beat a continuous stream. _→ click-to-play (already built) and a read-then-watch sequence are correct._
- **Modality / dual-channel** — words + compatible imagery/audio in *separate* channels can beat words alone. _→ a real human voice/face adds a second channel the text can't._
- **Spatial/temporal contiguity** — keep related elements close in space/time. _→ attribution next to the quote; the "why" near the quote, not paragraphs away._

**Dual-Coding Theory (Paivio 1971; 1986). [strong-moderate]** Information encoded both verbally and visually/episodically is recalled better than single-coded. _Implication:_ pairing the quoted line with the *episodic trace of a real person* (a face in a thumbnail, a voice in a clip, even a vivid attributional image like "$14.5M he turned down") gives a second retrieval route. This is a direct argument that media and vivid attribution aren't decoration — they're a second memory channel. **Caveat:** it must be *compatible* imagery (the actual speaker), not generic stock; incompatible images add load (coherence violation).

**Generation effect (Slamecka & Graf 1978; meta-analysis Bertsch et al. 2007). [strong]** Material a person partially *generates* is retained better than material read passively. **Self-reference effect (Rogers, Kuiper & Kinker 1977; meta-analysis Symons & Johnson 1997). [strong]** Information related to the self is encoded and recalled better than otherwise-equivalent information. _Implication (the crux of the agency-beat debate):_ a *tiny* prompt that makes the user generate or self-relate — even a single silent question they answer in their head — should measurably improve stickiness. This is the strongest learning-science argument *for* a small reflective beat. The counter-pressure is load (CLT) and tone (below).

**Elaboration (Craik & Lockhart 1972; Craik & Tulving 1975). [strong]** Deeper, more connected processing yields durable memory. A one-line "why this applies" that ties the source to the user's situation *is* elaboration scaffolding — its specificity (already enforced) is what makes it work.

**Chunking / working-memory limits (Miller 1956; Cowan 2001). [strong]** Capacity is ~4 chunks, not 7. _→ a presentation with >~4 distinct "things to hold" (bridge + quote + attribution + why + media + action + feedback) is already near the ceiling; adding modules risks overflow, especially for a depleted user._

**Processing fluency & typography (Reber, Schwarz & Winkielman 2004; Alter & Oppenheimer 2009). [moderate, with a contested twist]** Easy-to-process text feels *truer*, more likable, and is judged more confidently — fluent typography and clean layout raise perceived credibility. The famous *dis*fluency-aids-learning finding (Diemand-Yauman, Oppenheimer & Vaughan 2011 — harder fonts → better recall) **failed to replicate** at scale (e.g., large classroom replications found no benefit). _Implication:_ default to high legibility (serif quote, generous leading — already done); do **not** deliberately degrade readability to "make it stick." Fluency also means a confident, clean card is trusted more — relevant to source honesty (don't let hedging make the card look broken).

> **Section A takeaway:** The learning science *endorses Silhouette's minimalism* and supports (i) a signaled focal quote, (ii) a real-person second channel (media/vivid attribution), and (iii) — in tension with load — a *very small* generative/self-referential beat. It warns against module-stacking and against duplicating the same words across read + clip.

### B. Motivation, hope, agency

**Snyder's Hope Theory (Snyder et al. 1991; Snyder 2002). [strong]** Hope = **agency thoughts** ("I can move toward this") + **pathways thoughts** ("there is a route"). Crucially, hope is built by perceiving *a* viable pathway — not by receiving a full plan. _Implication:_ Silhouette can raise hope without giving advice by making the user *perceive that a route exists* — the source is living proof a route exists (pathways) and the framing can imply the user's own next perception is small and doable (agency). This is the central mechanism for "more hope" without becoming a coach.

**Bandura's self-efficacy, esp. vicarious experience / modeling (Bandura 1977; 1997). [strong]** Efficacy beliefs rise from four sources; the second-most-powerful is **vicarious experience** — watching a *credible, similar* model succeed ("if someone like me navigated this, I can"). This is **the single best-supported reason Silhouette's source-forward design works**: the user isn't told they can; they *see* someone who was in the same place get through. Similarity and credibility of the model amplify the effect. _Implication:_ maximize perceived similarity ("was in exactly this spot") and credibility (who they are, what they navigated) — that is where vicarious agency comes from, far more than from any exhortation.

**Self-Determination Theory (Deci & Ryan 1985; Ryan & Deci 2000; 2017). [strong]** Three needs: **autonomy, competence, relatedness**. **Autonomy-supportive** framing (offering, informing, acknowledging the person's perspective, minimizing controlling language like "you should/must") sustains motivation; controlling framing undermines it. _Implication:_ Silhouette's no-advice stance is *SDT-correct* — advice is controlling; an offered insight the user interprets themselves is autonomy-supportive. **Relatedness** is served by the human source (feeling connected to a real person who's been there). **Competence** is served by leaving the user feeling the next perception is within reach (not by tasks). Banned phrases like "you should" / "this will help you" align with autonomy support.

**Dweck's growth-mindset framing (Dweck 2006; Yeager et al. 2019). [mixed/contested — flag honestly]** The core claim (believing abilities are malleable supports persistence) has **small average effects and meaningful replication problems**: a meta-analysis (Sisk et al. 2018) found weak overall correlations and small intervention effects; the large pre-registered National Study of Learning Mindsets (Yeager et al. 2019) found a *real but small* benefit concentrated in lower-achieving students and supportive contexts. _Implication:_ a *light* malleability frame ("this is a state that shifts, not who you are") is defensible and aligns with the corpus's "not a character flaw" framing — but **do not oversell it** or build the design around mindset-flipping. Use it as a quiet undertone, not a thesis.

**Steele's self-affirmation theory (Steele 1988; Cohen & Sherman 2014). [mixed].** Affirming a valued part of the self reduces defensiveness and can open people to threatening information; effects are real but **moderated** (work best for the threatened, can backfire if heavy-handed). _Implication:_ a stuck user is mildly self-threatened; a *light* validating frame ("this is a real and coherent experience") lowers defensiveness so the insight can land — but explicit "you're great" affirmation is off-brand and risky. The corpus's "name the experience as coherent before reframing" rule is essentially applied self-affirmation.

**Moral elevation & awe (Haidt 2003; Algoe & Haidt 2009; Keltner & Haidt 2003; Stellar et al. 2017). [moderate].** Witnessing another person's courage, integrity, or recovery elicits **elevation** — warmth, uplift, motivation to be better; **awe** (including from a vast/insightful idea) promotes humility, present-focus, and prosociality. _Implication:_ a well-chosen *story* SIO (McConaughey going to zero; Goggins; a recovery arc) can produce elevation — a genuine hope/uplift beat that needs no advice. The *experience of the source* is itself the emotional payload. This argues for letting strong story/character SIOs breathe.

**Shame reduction / permission (Brown 2006; 2012). [weak/qualitative — flag].** Brené Brown's shame/vulnerability work is **grounded theory from qualitative research**, influential but not the same evidence tier as the experimental findings above. The translatable, defensible kernel: normalizing an experience as *common and non-defective* reduces the shame that blocks change — which converges with self-affirmation [mixed] and SDT relatedness [strong]. _Implication:_ a permission-type insight should *name the experience as real and not a flaw* (corpus already requires this) — but keep it in the **source's** voice, never the system's ("you're not broken" from Silhouette = fake intimacy; the *speaker* saying it = credible).

> **Section B takeaway:** Silhouette's hope/agency engine is **vicarious efficacy (Bandura) + perceived pathway (Snyder) + autonomy-support (SDT) + occasional elevation (Haidt)** — all of which work *through the source*, none of which require advice. Growth-mindset and self-affirmation give light, well-flagged undertones, not load-bearing structure.

### C. Framing, persuasion, credibility

**Gain vs. loss framing (Tversky & Kahneman 1981; meta-analysis Gallagher & Updegraff 2012; O'Keefe & Jensen 2007). [moderate, context-dependent].** Prospect theory predicts framing effects, but for *behavioral* messaging the evidence is nuanced: **gain-framed** appeals modestly outperform loss-framed for *prevention/approach* behaviors; differences are often small and moderated. _Implication:_ Silhouette should lean **gain/approach** ("what this opens up") over **loss/threat** ("what you'll lose") — but the effect is small, so don't over-engineer. The bigger lesson is *attribute framing*: describe the state as a coherent signal (approach frame) rather than a deficit (loss frame).

**Construal-Level Theory / psychological distance (Trope & Liberman 2010; Fujita et al. 2006). [strong-moderate].** Psychologically distant things are construed abstractly; near things concretely. A source's story is *distant* (another person, another context). To make it *applicable* without overclaiming similarity, reduce distance via **concrete, vivid specifics** (the $14.5M, the "two years," the exact mechanism) — concreteness pulls the story closer. _Implication:_ the why-sentence's "name a specific moment" rule is CLT-correct; it shrinks the distance between a celebrity's story and the user's Tuesday. But beware overclaiming similarity ("just like you") — that's a different, dishonest move; use *concreteness*, not *forced equivalence*.

**Elaboration Likelihood Model (Petty & Cacioppo 1986). [strong].** Persuasion travels a **central route** (effortful processing of strong arguments → durable attitude change) or a **peripheral route** (cues like credibility, attractiveness → fragile change). A motivated, depleted user is an unusual case: high personal relevance (motivates central processing) but low cognitive energy (pushes peripheral). _Implication:_ give **both** — a genuinely strong, specific insight (central) *and* clear credibility cues (peripheral: who the source is, that it's verified). The card should reward whichever route the user has energy for.

**Source credibility (Hovland & Weiss 1951; review Pornpitakpan 2004). [strong].** Persuasion rises with perceived **expertise + trustworthiness**; relatability/similarity adds a liking dimension. Credibility effects can fade over time (sleeper effect) but matter most at the moment of reception. _Implication:_ attribution is not metadata — it's the **peripheral-route engine** and the **vicarious-model credential**. Making *who this person is and what they navigated* legible (without academic clutter) directly raises landing. This argues for elevating attribution from a small tracked line to a load-bearing credibility beat.

**Peak-End Rule (Kahneman et al. 1993; Redelmeier & Kahneman 1996; Fredrickson & Kahneman 1993). [strong, with scope caveats].** Retrospective evaluation of an experience is dominated by its **emotional peak** and its **end**, not its average or duration. **Caveat:** mostly established for affective/pain experiences; applying it to a 60-second insight is reasonable but extrapolative. _Implication (important):_ today the session **ends on the feedback buttons** — i.e., it ends on *evaluation/admin*, not on the insight's emotional peak. Peak-end predicts the user will remember Silhouette as "a thing that asked me to rate it." A redesign should ensure the **end beat carries warmth/hope or the source**, with feedback either de-emphasized or positioned so the *last felt thing* is the insight, not the rating.

**Trust & credibility in interfaces (Fogg 2003; Nielsen Norman Group, source-transparency guidance). [moderate].** Perceived credibility online rises with transparency, verifiability, and *not overclaiming*; it falls with hype and with hidden uncertainty. _Implication:_ **visible, calm source-confidence and verification** ("verified source," honest "near this moment" vs "the moment") *builds* trust; hiding uncertainty (today's invisible hedge) risks a credibility cliff when a hedged match misses. Show confidence as quiet chrome, not as an apology.

> **Section C takeaway:** Lead with concreteness (CLT) and credibility (ELM peripheral + source-credibility), frame as approach/gain, end on the insight's peak not on admin (peak-end), and make uncertainty *visible and calm* (interface trust).

### D. Emotional design & calm technology

**Norman's three levels (Norman 2004). [moderate, framework].** **Visceral** (immediate look/feel), **behavioral** (usability of the interaction), **reflective** (the meaning/story the user tells afterward). _Implication:_ Silhouette already nails visceral (the warm dark card, the halo) and behavioral (one tap). The opportunity is **reflective** — the lingering "a real person reached me" story. The reflective layer is where return-intent is born, and it's mostly carried by the *source* and the *ending*, not the chrome.

**Calm Technology (Weiser & Brown 1996; Case 2015). [moderate, design philosophy].** Good ambient tech keeps most information in the **periphery** and moves only what's needed to the **center**; it informs without demanding. _Implication:_ source-confidence, verification, media-type, and feedback should sit in the **periphery** (quiet, glanceable) and the **insight** owns the center. This is a direct design rule for the media-inequality problem: never let a *video player* grab the center over the *human's words*.

**Aesthetic-Usability Effect (Kurosu & Kashimura 1995; Tractinsky, Katz & Ikar 2000). [moderate].** Beautiful interfaces are *perceived* as more usable and are more forgiving of friction. _Implication:_ Silhouette's aesthetic investment is not vanity — it buys tolerance and trust, especially for a vulnerable user. Keep it.

**Interface warmth / emotional safety (Norman 2004; SDT relatedness; general affective-computing). [moderate].** Warmth comes from human voice/imagery, generous space, soft motion, and *low demand* — not from emoji or chummy copy. A "cold dashboard" feeling comes from density, controls, and metrics. _Implication:_ preserve the black/purple/blue palette but keep **warmth = a human + space + calm motion**, and keep **anything that smells of a dashboard (counts, streaks, dense metadata) out**.

> **Section D takeaway:** Center the human's words; periphery-ize everything else (confidence, media-type, feedback); protect the reflective "a real person reached me" afterglow; warmth = human + space, not chumminess.

### Cross-cutting verdict: the "small agency beat"

Should each insight end with a tiny takeaway / reflective / agency line ("One small way this shifts the frame: …", "Try asking: …", "Hold this line: …")?

**The case FOR (evidence-backed):**
- **Generation + self-reference effects [strong]** — even a silent one-line prompt the user answers internally should improve retention and personal relevance.
- **Snyder pathways + agency [strong]** — a single reflective line can create *felt* forward motion without a plan.
- **Peak-end [strong]** — a warm/hopeful final line is a better last beat than feedback buttons.

**The case AGAINST (equally real):**
- **CLT / chunking [strong]** — it's one more chunk for a depleted user; risks overflow and dilutes the quote.
- **SDT autonomy [strong]** + **non-clinical invariant** — any line that drifts into advice ("try…", "the next move is…") becomes *controlling* and *coach-like*, the exact thing Silhouette must not be. Component 7 already excludes it: _"The aha moment is the product. The post-aha experience should be quiet."_
- **Fake-intimacy / cheese risk [product]** — system-authored reflection ("Hold this line:") spoken in Silhouette's voice is the highest-risk move in the whole product for sounding like a therapy app or a fortune cookie.

**Verdict:** The evidence says a *correctly constrained* beat would help learning and hope — **but the failure modes are severe and the current spec deliberately forbids it.** This is a genuine, unresolved tension, so the three options below take **three different stances on purpose**, which is the most useful thing this document can give you:
- **Option A rejects it** (purity; the source + a better ending carry hope).
- **Option B includes it under strict rules** — but framed as a **reflective *question*** or a **frame the source itself implies**, never system advice, ≤ ~12 words, drawn from the SIO, not invented.
- **Option C replaces it with a non-verbal absorption micro-action** (a "sit with this" / "this clicked" gesture) — capturing the generation/self-reference benefit and the peak-end benefit *without* any system-authored sentence.

If a beat is included, the universal guardrails are: **never imperative advice; never first-person system intimacy ("I…"); never reference the user's words or state; ≤ ~12–14 words; question or source-derived observation only; suppress entirely on low confidence and on safety paths; counts as a chunk so something else must give.**

---

## 3. Three Presentation Options

Each option is fully specified against the task's 10 requirements. All three respect every product invariant (one insight, source-forward, non-clinical, <60s, source-honest, all 6 states × 4 types × 5 registers × 5 media levels).

A shared device used by B and C, defined once: the **Source Confidence chip** — a tiny, calm, peripheral label (Calm Tech; interface trust) with three honest states derived from existing `source_confidence` + `clip_match_type` + `transcript_verified`:
- **"Closely matched"** (strong) · **"A nearby match"** (acceptable/hedged) · and an orthogonal verification cue **"Verified source"** / **"Reconstructed — paraphrase"** (from `transcript_verified` / `clip_match_type`). Never an apology; always one glanceable line.

And the **Source-level ladder** (the media-inequality solution, used by all three) — every level gets an equally intentional verb + framing, so none reads as "degraded":

| Source level | Verb / label | What carries "completeness" |
|---|---|---|
| Timestamped video | **Watch the moment** (`from M:SS`) | the pinpointed human moment |
| Verified video, no timestamp | **Watch the source** | the whole talk/episode is the artifact |
| TED embed | **Watch the talk** | a complete, canonical talk |
| Audio / source-link | **Listen to the source** ("Hear it at M:SS" if known) | the voice is the artifact |
| Text / book / article | **Read the source** | the *words themselves* are the artifact — and for text-only, the **excerpt is foregrounded larger** so the page itself is the hero |
| Secondary supporting media | **Watch the source discuss this idea** | honestly framed as the speaker on the same idea, elsewhere |

The principle (all options): **completeness comes from the human, not the player.** A text-only SIO is not "a card missing its video" — it's "the page where someone said the thing," and the typography treats it that way.

---

### Option A — One Human Moment

**Thesis:** Do the current thing, but *perfected* — strip it to the single human moment, make source-confidence and source-level visibly intentional, fix the ending so the last felt beat is the insight (not the rating), and add **no agency beat at all**; hope comes entirely from the credible human and a warm close.

#### 1. Name + thesis
**One Human Moment.** The most source-pure option: one quote, one person, one reason, one quiet exit — engineered so every source level feels complete and the user leaves on the source's warmth, not on a feedback prompt.

#### 2. Research basis
- **CLT / coherence / chunking [strong]** → maximal reduction; the quote is the only center.
- **Bandura vicarious efficacy + Hovland source credibility [strong]** → the entire hope mechanism is "a credible, similar person got through this"; so attribution gets a one-clause *credibility micro-line* (who they are / what they navigated) — the single highest-leverage upgrade.
- **Peak-end [strong]** → the redesign's core change: a one-line **warm close in the source's frame** becomes the last beat; feedback is demoted to a quieter position so the session *ends on the insight*, not on evaluation.
- **SDT autonomy [strong] + Component 7 exclusion** → no action, no reflection prompt; the insight stands alone.
- **Calm Tech [moderate]** → confidence + media-type live in the periphery.

#### 3. Information architecture
Screen order (top → bottom), with size weights:
1. **Wordmark + UserRecap** (unchanged; tiny).
2. **Bridge sentence** — *small, italic, muted*, only when the state/type rules call for it (unchanged trigger logic).
3. **Excerpt** — **largest element**, serif, open-quote glyph. For `mechanism`/`reframe` long bodies, a **bolded key-claim lead line** (signaling) sits above the quote. _For text-only sources, the excerpt is rendered one step larger and given more vertical space — it is the artifact._
4. **Attribution + credibility micro-line** — name · source · year (tracked, small) **plus** a new ≤10-word clause: _"the actor who walked away from $14.5M to get honest about his work."_ This is the only addition; it is drawn from SIO fields, not invented prose. Accent hairline above (kept).
5. **Source Confidence chip** (periphery): "Closely matched · Verified source" etc. — one glanceable line, low contrast.
6. **Media module** — only when `has_verified_embed`; the existing click-to-play card with the honest label ladder. When no embed: a single quiet source-level link (Watch/Listen/Read) in the same slot, *styled identically in weight* so its absence isn't a "hole."
7. **Why-this-applies** — muted, after a hairline (kept), ≤35 words, specific (kept).
8. **Warm close** — **NEW, replaces the abrupt ending.** One short line *in the source's frame*, not advice and not system-authored reflection — e.g. a calm restatement of the insight's gift: _"He needed the quiet before the honest work could arrive."_ Drawn from `content_summary`/`key_claim`, ≤14 words, declarative, third-person about the *source*, never about the user. (This is **not** an agency beat directed at the user — it's a closing cadence on the source's story. See risks.)
9. **Feedback** — moved **below** the warm close and visually quieted (smaller, lower contrast) so it reads as an afterthought, not the finale. Same two statements + dwell signal.

What's large: the quote. What's small/peripheral: confidence chip, media-type, feedback. What appears only when available: bridge, media embed, source link, credibility micro-line (omit if SIO lacks the data).

#### 4. Hope/agency mechanism
- **Vicarious agency:** the credibility micro-line makes the model *legibly similar and credible* ("was exactly here, got through") — Bandura's strongest lever, currently underused.
- **Pathway (Snyder):** the existence of a real person who navigated it *is* the visible pathway; no plan needed.
- **Ending supports movement via peak-end:** the user's last felt beat is a warm, hopeful line about the source — not a rating — so the remembered affect is uplift.
- **No overwhelm:** literally nothing is added for the user to do; CLT load is *reduced* vs. today (one focal object, periphery-ized chrome).

#### 5. Adaptation rules
**By state (what each needs from the close + framing):**
- **inaction-loop** — no bridge; direct; the warm close lands on *identity not tactics* ("he had to change who he thought he was, not what he did"). Never "just start."
- **engagement-drought** — bridge allowed (mechanism); close names the flatness as signal ("the plateau was information, not a verdict").
- **direction-collapse** — no bridge; calm; close honors the emptiness as coherent ("the zero was the price of getting honest"), never "find your passion."
- **possibility-paralysis** — no bridge; intellectual/direct; close on the cost of non-commitment or commitment-makes-clarity — never a decision framework.
- **identity-transition** — bridge allowed ("the space after a big ending is its own kind of place"); close honors disorientation as appropriate, never "chapter two" advice.
- **momentum-gap** — no bridge; close reframes comparison as signal to decode, never "stop comparing."

**By insight_type:** `mechanism` → key-claim lead + close names the mechanism's relief ("not willpower — timing"). `story` → quote-first, no lead; close = elevation beat on the arc. `reframe` → key-claim lead; close = the new frame in one line. `permission` → bridge often; close echoes what the *speaker* named as okay (never the system saying "you're okay").

**By voice_register:** match the source — direct (no cushioning on the close), warm (close can carry gentle warmth), intellectual (close stays measured, no emotion added), vulnerable (close honors without dramatizing), expert (close stays precise; name the science). The warm close inherits the SIO's register; it never imposes warmth on a deliberately cool source.

**By media availability:** use the Source-level ladder verbatim; the media slot keeps constant visual weight whether it's an embed or a link, so text-only never looks emptier. Secondary media → "Watch the source discuss this idea" + the confidence chip notes it's the same idea elsewhere.

**By source confidence:** strong → confident micro-line + "Closely matched"; acceptable/hedged → softer micro-line wording ("navigated something close to this") + "A nearby match"; the why-sentence hedge (existing) stays. Confidence is now *visible* (chip), not just implied.

#### 6. Two worked examples

**Example A1 — Huberman, engagement-drought, mechanism, expert, timestamped YouTube (`from 53:00`).**
> _(small, muted)_ There's a reason this doesn't respond to willpower.
>
> **Each high spike drops your baseline a little lower than before.**
> > "When you chase peak after peak, the system that registers reward resets *below* where it started. Eventually the things that used to light you up feel flat — not because you've lost discipline, but because your baseline has dropped."
>
> — Andrew Huberman · Huberman Lab · 2021 · _the Stanford neuroscientist who maps the dopamine system behind motivation_
> `Closely matched · Verified source`
>
> ▶ **Watch the moment** · from 53:00 — Andrew Huberman · Huberman Lab · YouTube
>
> _(muted)_ Huberman names the exact reward-system mechanism behind the flatness — and why it isn't a willpower failure.
>
> _(warm close)_ The grey isn't weakness; it's a baseline that needs to recover.
>
> _(quiet, demoted)_ This landed · Show me something different

**Example A2 — McConaughey, direction-collapse, story, vulnerable, text-only book.** _(Excerpt foregrounded larger; no media slot — the page is the artifact. Quote uses the one documented line + compliant paraphrase, matching the SIO's copyright posture.)_
> > "If I couldn't do what I wanted, I wasn't going to keep doing what I didn't — no matter the price." He turned down $14.5M, let the offers go quiet, and waited at zero until the honest work could come.
>
> — Matthew McConaughey · _Greenlights_ · 2020 · _who walked away from $14.5M and a fallow stretch to get honest about his work_
> `A nearby match · Reconstructed — paraphrase`
>
> 📖 **Read the source** — _Greenlights_ (Crown, 2020)
>
> _(muted)_ McConaughey was at the career peak most people aim for when he found the target itself was the problem.
>
> _(warm close)_ Going to zero was the price of getting honest — not a failure to avoid.
>
> _(quiet, demoted)_ This landed · Show me something different

#### 7. Mapping to current code
- `PresentationObject`: add `credibility_micro_line: string | null` and `closing_line: string | null` (both LLM-generated under guardrails, both droppable). Keep `next_step: null`. Add `confidence_label` + `verification_label` (derived, not LLM).
- `presentInsight.ts`: two new small guarded generations (micro-line from `content_summary`/`speaker`; closing-line from `key_claim`/`content_summary`) with the same banned-fragment + specificity + drop-on-fail discipline already in place. New derivation of confidence/verification labels from existing fields. `renderMarkdown`: insert the micro-line into attribution, the confidence chip after attribution, the closing line before feedback.
- `media.ts`: no change (already produces everything needed).
- `InsightCard.tsx`: add the confidence chip slot, the credibility clause in attribution, the closing-line slot above a **restyled (quieter, lower) FeedbackRow**. Equalize the media-slot weight for the link fallback.
- Feedback marker: unchanged contract.
- **Cost flag:** low. No backend rebuild; two new optional fields + small UI re-order.

#### 8. Tradeoffs, risks, failure modes
- **The "warm close" is the danger zone.** If it drifts to second person or imperative ("Hold this line"), it becomes the fake-intimate coach the product forbids. **Mitigation:** hard rule — third-person about the *source/insight* only, no "you", no "try", reuse the banned-fragment gate, drop on any violation (fail to *nothing*, reverting to today's ending).
- **Over-explaining:** micro-line + why + close could stack into three interpretive lines. **Mitigation:** if `why_this_applies` already contains the credibility fact, suppress the micro-line; never show all three at full weight (close is short, micro-line is a clause not a sentence).
- **Text-only feeling inferior:** mitigated by larger excerpt + equal-weight source slot, but **still the residual risk** if users have learned to expect video. **Mitigation:** copy that treats the page as the artifact ("Read the source") + the credibility micro-line doing the work a thumbnail would.
- **Cheesiness:** lowest of the three (no user-directed beat), but the close can still tip cheesy if generic. **Mitigation:** require a concrete hook (same specificity gate as the why-line); drop if generic.
- **Source feeling less important:** not a risk here — this option *increases* source primacy.
- **Trust:** visible confidence chip is a net trust gain, but a "Reconstructed — paraphrase" label could spook users. **Mitigation:** pair with "Verified source" wording where true; keep it calm/peripheral, not a warning banner.

#### 9. Measurement
- Reuse: landing rate, strong-positive (Yes + dwell), double-rejection, voluntary return.
- The peak-end hypothesis is testable: compare **voluntary-return rate** and **strong-positive rate** before/after moving feedback below a warm close.
- New lightweight, justified signal: **source/media click event** (Component 9 currently omits it) — does the credibility micro-line increase source clicks? One event, no PII, no bloat.
- Watch for a *rise* in dwell without a rise in Yes → could mean the close adds reading time without value (over-explaining); that's the kill signal for the close.

#### 10. Implementation cost
**Low.** ~3 files (`presentInsight.ts`, `InsightCard.tsx`, a media-slot tweak), 3–4 new optional fields (2 derived, 2 LLM), new banned-fragment tests for the close, no migration (SIOs unchanged), reuses the entire media pipeline.

---

### Option B — Context · Quote · Carry (the Pathway Card)

**Thesis:** Keep the source as hero, but deliberately engineer **felt forward motion** by adding one tightly-constrained closing beat — a **reflective question or a frame the source themselves implies** (never system advice) — that gives the user a small pathway and a moment of self-referential generation, then ends on it.

#### 1. Name + thesis
**Context · Quote · Carry.** Three movements — a one-line *context* that frames why this person, the *quote* as centerpiece, and a *carry* line that hands the user something to walk out with — built to convert "I read a nice quote" into "I see a small way forward."

#### 2. Research basis
- **Snyder pathways + agency [strong]** → the "carry" line's explicit job is to create a *felt route* in one sentence.
- **Generation effect + self-reference [strong]** → when the carry is a *question*, the user generates their own answer internally — the strongest learning lever, applied at the peak-end moment.
- **Peak-end [strong]** → the carry is the last beat by design; it ends on agency, not admin.
- **SDT autonomy [strong]** → the carry is phrased as an *offer/question*, never "you should" — autonomy-supportive, not controlling.
- **CLT [strong] (as a constraint)** → because this adds a chunk, the option *removes* the separate why-line in some configs (the carry can absorb it) to stay under the load ceiling.
- **CLT/Bandura context line** → a single "context" line elevates the source's credibility/similarity up front (vicarious efficacy primed before the quote).

#### 3. Information architecture
1. Wordmark + UserRecap (tiny).
2. **Context line** — one calm line establishing *why this person for this* (credibility + similarity), e.g. _"From someone who hit the number and felt nothing on the other side."_ Replaces the optional bridge; always present but ≤16 words, third-person, no "you".
3. **Excerpt** — largest; key-claim lead for mechanism/reframe; text-only enlarged.
4. **Attribution** — name · source · year (+ confidence chip in periphery).
5. **Media module** — same click-to-play ladder; equal weight for the link fallback.
6. **Carry** — **the defining element.** One line, ≤12 words, in one of two sanctioned forms only:
   - **(a) a reflective question** the insight raises — _"What would going to zero look like, just a little?"_ — user answers internally (generation/self-reference), **no answer shown**; or
   - **(b) a source-implied frame** restated as a portable line — _"The quiet is the price, not the failure."_
   It is **labeled almost invisibly or not at all** (no "Takeaway:" header — that's coach-coded); it simply sits as the final line in a slightly warmer weight. Never imperative, never "you should/try", never references the user's input.
7. **Feedback** — below the carry, quiet. (Carry is the peak-end beat; feedback is admin.)

The why-this-applies sentence is **merged into either the context line or the carry** depending on type (see adaptation), to keep total chunks ≤ ~5.

#### 4. Hope/agency mechanism
- **Pathway made felt:** the carry gives a *route the size of a thought* — Snyder's pathway without a plan; agency without a task.
- **Generation/self-reference:** the question form makes the user *do* a micro-act of meaning-making about their own life — the deepest encoding + the most ownership, at zero UI cost.
- **Peak-end:** ends on the user's own internal "huh, what would that look like for me" — the most agentic possible final beat.
- **Avoids overwhelm:** exactly one line, ≤12 words, no input field, nothing to submit; the user can ignore it and still have a complete card.

#### 5. Adaptation rules
**By state — the carry must respect each state's prohibition on advice:**
- **inaction-loop** — carry = identity question, never tactic ("Who would you have to be to move on this?"), never "just start".
- **engagement-drought** — carry = signal reframe ("What if the flatness is pointing somewhere?"), never "find a hobby".
- **direction-collapse** — carry honors the emptiness ("What would honest look like, even at zero?"), never "find your passion".
- **possibility-paralysis** — carry = commitment-makes-clarity question ("What would committing teach you that waiting can't?"), never a decision matrix.
- **identity-transition** — carry honors disorientation ("What part of you is still here, underneath?"), never "build chapter two".
- **momentum-gap** — carry = decode-the-signal ("What is the comparison actually pointing at?"), never "stop comparing".

**By insight_type:** `mechanism` → carry = (b) source-frame restatement ("Not willpower — timing"), because a mechanism's gift is the reframe, not a question. `story` → carry = (a) reflective question (elevation → "what would that look like for me"). `reframe` → carry = (b) the new frame as a portable line. `permission` → carry = (b) the speaker's permission restated ("This is a real thing, not a flaw") — in the *source's* frame, attributed feeling.

**By voice_register:** direct → carry is blunt, no softening; warm → carry may be gently warm; intellectual → carry stays a crisp question/frame, no emotion; vulnerable → carry honors feeling without dramatizing; expert → carry restates the mechanism precisely (form b), rarely a question.

**By media availability:** Source-level ladder, equal weight. The carry is **media-independent** — it's text — which is a feature: it makes text-only SIOs feel *more* complete than video ones in some cases (the carry is the payload, not the player). Secondary media → carry leans form (a) question, since the video is only adjacent.

**By source confidence:** strong → carry can be a confident frame (form b). Acceptable/hedged → carry **must** be a question (form a) or be **suppressed entirely** — never assert a portable "truth" off a shaky match. Low confidence / safety path → **no carry**.

#### 6. Two worked examples

**Example B1 — Robbins, inaction-loop, mechanism, direct, TED embed (no timestamp → "Watch the talk").**
> _(context)_ From someone who studied why the moment to act keeps slipping away.
>
> > "There's a five-second window between the impulse to do the hard thing and your brain handing you a reason not to. Miss it, and the rationalization wins. You're not weak — you're losing a race to your own hesitation."
>
> — Mel Robbins · TEDxSF · 2011 · `A nearby match · Reconstructed — paraphrase`
>
> ▶ **Watch the talk** — Mel Robbins · TED
>
> _(carry, form b — mechanism)_ It isn't discipline. It's timing.
>
> _(quiet)_ This landed · Show me something different

**Example B2 — McConaughey, direction-collapse, story, vulnerable, text-only book.**
> _(context)_ From someone who hit the number and felt nothing on the other side.
>
> > "If I couldn't do what I wanted, I wasn't going to keep doing what I didn't — no matter the price." He turned down $14.5M, let it all go quiet, and waited at zero.
>
> — Matthew McConaughey · _Greenlights_ · 2020 · `Closely matched · Reconstructed — paraphrase`
>
> 📖 **Read the source** — _Greenlights_ (Crown, 2020)
>
> _(carry, form a — story → reflective question)_ What would going to zero look like for you — even a little?
>
> _(quiet)_ This landed · Show me something different

#### 7. Mapping to current code
- `PresentationObject`: **activate `next_step`** (rename to `carry_line: string | null` for honesty — it is not a step), add `context_line: string | null`, add `carry_form: "question" | "frame" | null`. Possibly drop the standalone `why_this_applies` in story/mechanism configs (absorbed) — keep the field but allow null.
- `presentInsight.ts`: the carry generation is the **highest-guardrail LLM call in the product** — new banned set (`/^\s*(try|ask yourself|remember to|you should|your next)/i`, any imperative verb lead, any second-person subject, any "Takeaway/Action/Tip" header), length ≤12 words, **must** be a question (ends `?`) or a source-derived frame (must reuse a token from `key_claim`), drop on any failure, **suppress on hedged/low confidence** for form (b). Context line = a guarded credibility generation.
- `InsightCard.tsx`: new context slot (top), carry slot (bottom, above quiet feedback), confidence chip.
- Feedback marker: unchanged.
- **Cost flag:** medium — the carry's guardrail + eval surface is real work, and it changes the card's rhythm meaningfully.

#### 8. Tradeoffs, risks, failure modes
- **This is the highest-risk option for tone.** A carry line is *one bad generation away from a fortune cookie or a therapy prompt.* This is the central bet. **Mitigations:** (i) two sanctioned forms only; (ii) ≤12 words; (iii) question-or-source-token requirement; (iv) suppress on hedged confidence; (v) drop-to-nothing on any banned hit; (vi) **human-review the carry on the first N sessions** before trusting it (cold-start rule already exists).
- **Coach creep:** even a perfect question can accumulate into "Silhouette always asks me a reflective question" — which *is* a coaching pattern. **Mitigation:** vary form by type; allow the card to ship with *no* carry when confidence/type don't warrant it (so it's not a guaranteed ritual).
- **Fake intimacy:** form (a) questions risk "you/your" intimacy. **Mitigation:** allow "you/your" *only* in the reflective question (it's the one place second-person is autonomy-supportive, not diagnostic) and **never** elsewhere; ban any question that paraphrases the user's input.
- **Too long / over-explaining:** context + quote + carry + why can bloat. **Mitigation:** merge why into context/carry; hard 5-chunk ceiling.
- **Text-only inferiority:** *least* at risk of the three (carry is the payload). 
- **Trust/cheese:** the biggest cheese risk of the three; mitigated only by discipline + measurement. If the carry can't be made consistently non-cheesy in testing, **fall back to Option A.**

#### 9. Measurement
- Primary: does the carry **raise strong-positive and voluntary-return** vs. Option A's warm close? A/B the carry on/off.
- **New justified signal:** if form (a) questions are used, a single optional **"this gave me something to think about"** tap (one event) — but *only* if it doesn't add visible chrome that pressures the user; otherwise rely on dwell + return. Avoid an open text field (Component 9 forbids it).
- Watch **double-rejection** and qualitative "felt preachy" signals; a rising "Show me something different" after the redesign is the kill signal.
- Dwell-after-carry: a small dwell bump is good (generation), a large one may mean confusion.

#### 10. Implementation cost
**Medium.** ~3 files + a substantial new guardrail/eval module for the carry, ~3 new fields (one is `next_step` repurposed), heavy test coverage for the carry's banned forms, cold-start human-review process, no SIO migration.

---

### Option C — The Witness (person-forward / source-immersive)

**Thesis:** Reorganize the card around the **experience of encountering a real human** — elevate *who the person is* to the emotional center so that whether or not a video exists, the user feels they *met someone* who'd been where they are; capture generation + peak-end with a **non-verbal absorption gesture** instead of any system-authored line.

#### 1. Name + thesis
**The Witness.** The user isn't reading a quote card — they're being *introduced to a person* who navigated this; the design foregrounds the human (face/voice/credential when available, vivid identity when not) so text-only and video feel equally like "meeting someone," and ends on a quiet, optional gesture of absorption.

#### 2. Research basis
- **Bandura vicarious experience [strong] + source credibility [strong]** → make the *model* the centerpiece: who they are, what they navigated, why they're credible and similar. This is the most direct possible expression of the one mechanism that makes Silhouette work.
- **Moral elevation / awe [moderate]** → foregrounding a person's character/arc is what elicits elevation; the design gives the human room to produce uplift.
- **Dual-coding [strong-moderate]** → a face (thumbnail) or a vivid identity image plus the words = two channels; for text-only, the *vivid credential* is the second channel.
- **Norman reflective level [moderate]** → engineers the "a real person reached me" afterglow that drives return-intent.
- **Generation + peak-end [strong]** → a one-tap **"sit with this"** absorption gesture (or "this clicked") at the end captures self-referential processing and a warm final beat **without a system sentence** — sidestepping the cheese risk entirely.
- **Calm Tech [moderate]** → the player/metadata stay peripheral; the *human* owns the center.

#### 3. Information architecture
1. Wordmark + UserRecap (tiny).
2. **Source header — NEW, elevated.** A compact "who you're hearing from" block at the **top**: speaker name (prominent), a ≤14-word credential/identity line (vicarious credibility), and — when media exists — a small round thumbnail/voice affordance; when text-only, a **typographic monogram / source-mark** (no fabricated image; honest) plus the vivid credential. This is the visceral + relatedness hook *before* the words.
3. **Excerpt** — large, serif, centerpiece (still the hero line). Key-claim lead for mechanism/reframe.
4. **Confidence chip** (periphery) under the quote.
5. **Media module** — when embed exists, the click-to-play card sits here, but framed as "hear them say it" (continuity with the source header, dual-coding). When no embed: the source-level link, same weight.
6. **Why-this-applies** — muted, specific (kept).
7. **Absorption gesture — NEW, replaces both the agency beat and the prominent feedback.** A single quiet, optional control: **"Sit with this"** (or "This clicked") — a non-verbal, low-pressure gesture. Tapping it = a soft acknowledgment animation + it doubles as the positive feedback signal (so feedback is *absorbed into* a non-evaluative gesture). "Show me something different" remains as a secondary, quieter link.
8. (No system-authored closing sentence at all — the *person* is the closing emotional beat.)

What's large: the human (header) + the quote. Peripheral: confidence, media-type, the "different" link. Text-only parity is structural: the **source header is identical in weight** whether or not a video follows.

#### 4. Hope/agency mechanism
- **Vicarious agency, maximized:** by introducing the *person* first and making credibility/similarity legible, the user forms the "someone like me got through" belief *before* and *during* the quote — Bandura at full strength.
- **Elevation:** giving the human room produces uplift directly from character/arc (Haidt), independent of any advice.
- **Pathway:** the person *is* the existence proof of a route (Snyder), now centered.
- **Generation + peak-end without cheese:** the "Sit with this" gesture is a self-directed micro-act of absorption (light generation) and a warm, non-evaluative final beat — the user ends on *their own choice to hold the thought*, not on a rating or a system line.
- **No overwhelm:** fewer words than today (no closing sentence), one optional gesture.

#### 5. Adaptation rules
**By state:** the *credential line* in the source header adapts to what each state needs to find credible:
- **inaction-loop** — credential emphasizes *they were in the loop and got out* ("spent two years knowing before he moved").
- **engagement-drought** — credential emphasizes *flatness at high performance* ("left at peak, not from failure") or *the science* (for mechanism/expert).
- **direction-collapse** — credential emphasizes *reached the goal and felt empty* ("had the career most aim for and found it hollow").
- **possibility-paralysis** — credential emphasizes *a real, costly commitment they made*.
- **identity-transition** — credential emphasizes *rebuilt on the far side, with distance to see it*.
- **momentum-gap** — credential emphasizes *felt behind and decoded the signal*.
The absorption gesture copy is **constant** across states ("Sit with this") — deliberately, so it never becomes state-specific advice.

**By insight_type:** `mechanism`/`expert` → header leans *authority* (the scientist), thumbnail optional, key-claim lead. `story` → header leans *arc/character* (the person's journey), thumbnail/face strongest here (elevation). `reframe` → header leans *the thinker*; `permission` → header leans *been-there relatability*.

**By voice_register:** the header's tone matches register (expert = precise credential; vulnerable = human, first-name warmth; direct = blunt credential). The gesture stays neutral.

**By media availability — this option's signature strength:** completeness is decoupled from media because the **human is foregrounded as a person, not a player.**
- Timestamped video → thumbnail in header + "Watch the moment" (from M:SS) below.
- Verified video, no timestamp → thumbnail + "Watch the source".
- TED → TED placeholder + "Watch the talk".
- Audio/source-link → a small voice/wave affordance + "Listen to the source".
- Text/book/article → **typographic source-mark** (monogram/initials in the accent palette — honest, never a fake face) + the vivid credential line + "Read the source"; the *credential* is the second channel a thumbnail would have been. This is the design that most makes text-only feel intentional — the user still "meets the person."
- Secondary media → header notes "speaks to this idea here" + "Watch the source discuss this idea".

**By source confidence:** the credential line softens on hedged matches ("navigated something close to this"); the confidence chip is visible; absorption gesture unchanged. Low confidence/safety → no header embellishment, fall to the simplest card.

#### 6. Two worked examples

**Example C1 — Huberman, engagement-drought, mechanism, expert, timestamped YouTube.**
> ◯ _(thumbnail)_  **Andrew Huberman**
> _Stanford neuroscientist mapping the dopamine system behind motivation_
>
> **Each high spike resets your baseline a little lower.**
> > "Chase peak after peak and the reward system resets below where it began. The things that used to light you up feel flat — not lost discipline, a dropped baseline."
> `Closely matched · Verified source`
>
> ▶ Hear him say it — **Watch the moment** · from 53:00
>
> _(muted)_ He names the exact mechanism behind the flatness — and why it isn't willpower.
>
> ❍ **Sit with this**     ·     show me something different

**Example C2 — McConaughey, direction-collapse, story, vulnerable, text-only book.** _(No video; the human is still centered via the source-mark + credential.)_
> ⟦MC⟧ _(typographic source-mark, accent palette)_  **Matthew McConaughey**
> _walked away from $14.5M and a fallow stretch to get honest about his work_
>
> > "If I couldn't do what I wanted, I wasn't going to keep doing what I didn't — no matter the price." He turned it down, let it go quiet, and waited at zero.
> `Closely matched · Reconstructed — paraphrase`
>
> 📖 **Read the source** — _Greenlights_ (Crown, 2020)
>
> _(muted)_ He was at the peak most people aim for when he found the target itself was the problem.
>
> ❍ **Sit with this**     ·     show me something different

#### 7. Mapping to current code
- `PresentationObject`: add `source_header: { credential_line: string | null; mark_kind: "thumbnail" | "voice" | "typographic" }`. Keep `next_step: null`. Add `confidence_label`/`verification_label` (derived).
- `media.ts`: add a derived `mark_kind` (thumbnail when YouTube thumb exists; voice when audio-primary; typographic otherwise) and expose `monogram`/initials helper. No allowlist change.
- `presentInsight.ts`: one new guarded generation (credential line from `content_summary`/`user_problem_match_notes`/`speaker`, ≤14 words, third-person, banned-fragment gated, droppable).
- `InsightCard.tsx`: **the largest UI change of the three** — new source-header component at top (thumbnail/voice/typographic variants), restructured order (person → quote → media → why → gesture), and a new **absorption-gesture control** that merges the positive-feedback signal with a non-evaluative gesture (the dwell signal logic from `FeedbackRow` is preserved, "yes" maps to "Sit with this").
- `FeedbackRow.tsx`: reworked into the gesture + a quiet "different" link; dwell/visibility logic preserved.
- Feedback marker contract: the "yes" path is now triggered by the gesture — **measurement parity must be preserved** (Sit-with-this == positive). Document this so Component 9 metrics stay comparable.
- **Cost flag:** medium-high — real UI work (header variants, source-mark, gesture), and a feedback-semantics change that needs careful metric-continuity handling.

#### 8. Tradeoffs, risks, failure modes
- **Foregrounding the person can *overclaim similarity*** ("a celebrity is just like you") — the dishonest move CLT warns against. **Mitigation:** credential line states *what they navigated* (concrete), never "just like you"; lean on concreteness, not equivalence.
- **Media inequality could *invert*** — a face/thumbnail is so much richer than a typographic monogram that text-only could feel even more second-class than today. **This is the option's central risk.** **Mitigation:** invest in a genuinely beautiful, intentional typographic source-mark and make the *credential line* (which text-only has equally) the real hook; user-test specifically whether text-only "feels like meeting someone."
- **"Sit with this" can read as twee/therapy.** **Mitigation:** test alternative neutral copy ("This clicked", "Keep this"); make it optional and quiet; if it tests cheesy, the gesture degrades to the plain two-button row (Option-A ending) with no other change.
- **Fake intimacy:** a person-forward header risks parasocial warmth. **Mitigation:** keep it *factual* (credential, not "your friend Matthew"); no first names in warm-coercive ways for expert sources; no system voice in the header.
- **Feedback-semantics change risks measurement discontinuity** (a non-evaluative gesture may raise "yes" rates artificially). **Mitigation:** keep dwell-qualification; treat the redesign as a new baseline; run a hold-out.
- **Over-explaining / length:** header + quote + why is fine; ensure the credential line replaces (not adds to) verbosity elsewhere.
- **Cheese:** moderate (lower than B's sentence, higher than A's silence — the gesture is the variable).

#### 9. Measurement
- Reuse landing/strong-positive/return; **critical new check:** does **text-only strong-positive rate** reach parity with video SIOs? (The whole option lives or dies on this.) Segment metrics by media level.
- **Source/media click** becomes a first-class signal here (the header invites it) — justified, one event.
- "Sit with this" tap rate vs. old "This landed" rate — watch for inflation; keep dwell as the truth check.
- Reflective-afterglow proxy: voluntary-return rate is the long-run metric; a short post-session (research-only, not in-product) "did it feel like you met someone?" during user testing.

#### 10. Implementation cost
**Medium-high.** ~4–5 files (`InsightCard`, `FeedbackRow`, `media.ts`, `presentInsight.ts`, a new SourceHeader component), 2–3 new fields + derived `mark_kind`/monogram, a feedback-semantics change requiring metric-continuity care, new tests (header variants, gesture, dwell parity). No SIO migration, but the most design/QA surface of the three.

---

## 4. Comparison Table

| Dimension | **A — One Human Moment** | **B — Context · Quote · Carry** | **C — The Witness** |
|---|---|---|---|
| Hope/agency strength | Moderate–High (vicarious + warm close) | **High** (felt pathway + generation) | **High** (vicarious maxed + elevation) |
| Learning/retention strength | Moderate (signaling + dual-coding) | **High** (generation + self-reference) | High (dual-coding + elaboration) |
| Source-forward purity | **Highest** | High (carry is system-voiced) | High (person centered, but heavy chrome) |
| Works with text-only SIOs | High (enlarged excerpt) | **Highest** (carry is the payload) | Medium–High (risk: monogram < face) |
| Works with timestamped video | High | High | **Highest** (player + person integrated) |
| Risk of cheesiness | **Lowest** | **Highest** (the carry sentence) | Medium (the gesture) |
| Risk of therapy-like tone | **Lowest** | High (questions/reflection) | Medium (person-forward warmth) |
| Read-time fit (<60s) | **Best** (fewest elements) | Good (one extra line) | Good (header adds, gesture saves) |
| Implementation cost | **Low** | Medium | Medium–High |
| Fit with current architecture | **Best** (additive) | Good (`next_step` activated) | Moderate (UI + feedback semantics) |
| Measurement clarity | High (clean A/B on close + click) | Medium (carry effect is subtle/qualitative) | Medium (feedback-semantics change needs care) |

---

## 5. Recommendation

**Recommended path: ship Option A now; treat Option B's carry and Option C's source-header as two independently-testable experiments layered on top of A. The final choice is yours.**

Reasoning:
- **Option A is strictly dominant as a baseline.** Every product invariant is honored, it *reduces* cognitive load, it fixes the two clearest current defects (invisible confidence; the session ending on a rating instead of the insight via **peak-end**), it strengthens the one mechanism the research most endorses (**vicarious efficacy** via the credibility micro-line), and it costs little. Nothing in A is regrettable; B and C both build cleanly on it.
- **Option B is the highest-upside, highest-risk move.** The learning + hope evidence for a *generative reflective beat* is genuinely strong, but it collides head-on with Silhouette's non-clinical, non-coach identity and the explicit Component-7 exclusion. I would **not** ship the carry blind. I'd ship A, then A/B-test B's carry **as a question-only, story-only variant first** (the safest, most evidence-backed slice), with human review during cold-start. If it lifts strong-positive and return without raising "preachy" rejection, expand it; if it tests cheesy, you've lost nothing.
- **Option C has the best *theoretical* fit with Silhouette's core moat** (the human is the product, so center the human) and the best media-integration story — but it carries the real danger of making **text-only feel worse**, and it changes feedback semantics. It's the most exciting long-term direction and the one most worth prototyping, but it should be validated specifically on text-only parity before committing.

Net: **A is the floor and the immediate ship. B and C are two divergent bets on the ceiling** — B bets on a constrained agency beat, C bets on person-forward immersion. They are not mutually exclusive (a future card could have C's source header *and* A's warm close), but I'd resolve them one experiment at a time, starting from A.

If you want a single answer instead of a sequence: **A.** It is the most defensible, most on-brand, and lowest-risk way to make every insight — across every source level — feel complete, human, and quietly hopeful.

---

## 6. What to Validate With Real Users

Short, friendly-user tests (qualitative first, then the metric A/Bs):

1. **Completeness without video:** Show a text-only SIO and a timestamped-video SIO to different users. Ask: did either feel like a *lesser* result? (Kills/confirms the media-inequality fix.)
2. **Human vs. metadata:** After a card, ask "whose insight was that, and what had they been through?" If they can answer, the source landed as a *person*, not a citation (tests the credibility micro-line / source header).
3. **Hope vs. information:** "Do you feel any different than before you read it — even slightly?" vs. "Did you just learn a fact?" (Tests the hope/agency beat across A's warm close, B's carry, C's gesture.)
4. **The ending beat:** For B, "did the last line feel useful or preachy?" For C, "did 'Sit with this' feel right or twee?" For A, "what was the last thing you remember feeling?" (Peak-end + cheese check.)
5. **Under 60 seconds:** Time real reads; confirm the card still clears the brevity bar with the added elements.
6. **Why this source:** "Did it make sense *why this person* was chosen for you?" (Tests confidence chip + why-line + credential.)
7. **Media/source click intent:** Do users click the source/media, and does foregrounding the person change that? (One new event; tests whether the source is inviting.)
8. **Return intent:** "Would you come back here next time you felt this way — and why?" (The reflective-afterglow / voluntary-return proxy.)
9. **Confidence honesty:** Show a hedged match with the "A nearby match" chip. Does visible uncertainty *build* trust or *undermine* it? (Tests the interface-trust hypothesis.)
10. **The carry, specifically (B):** Run the carry past 10–15 users blind. Count how many describe it as "wise/useful" vs. "cheesy/coachy/therapy." If the cheesy count is non-trivial, do not ship the carry.

---

## 7. References

_Evidence-strength tags from §2 in brackets. Links provided where a stable public source exists; canonical books are cited by publisher._

**A. Learning, comprehension, retention**
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. _Cognitive Science_, 12(2), 257–285. [strong] https://doi.org/10.1207/s15516709cog1202_4
- Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. _Educational Psychology Review_, 31, 261–292. [strong] https://doi.org/10.1007/s10648-019-09465-5
- Mayer, R. E. (2009 / 2021). _Multimedia Learning_ (2nd / 3rd ed.). Cambridge University Press. [strong]
- Paivio, A. (1986). _Mental Representations: A Dual Coding Approach._ Oxford University Press. [strong-moderate]
- Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. _Journal of Experimental Psychology: Human Learning and Memory_, 4(6), 592–604. [strong]
- Bertsch, S., Pesta, B. J., Wiscott, R., & McDaniel, M. A. (2007). The generation effect: A meta-analytic review. _Memory & Cognition_, 35(2), 201–210. [strong] https://doi.org/10.3758/BF03193441
- Rogers, T. B., Kuiper, N. A., & Kirker, W. S. (1977). Self-reference and the encoding of personal information. _Journal of Personality and Social Psychology_, 35(9), 677–688. [strong]
- Symons, C. S., & Johnson, B. T. (1997). The self-reference effect in memory: A meta-analysis. _Psychological Bulletin_, 121(3), 371–394. [strong]
- Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. _Journal of Verbal Learning and Verbal Behavior_, 11(6), 671–684. [strong]
- Craik, F. I. M., & Tulving, E. (1975). Depth of processing and the retention of words in episodic memory. _Journal of Experimental Psychology: General_, 104(3), 268–294. [strong]
- Miller, G. A. (1956). The magical number seven, plus or minus two. _Psychological Review_, 63(2), 81–97. [strong]
- Cowan, N. (2001). The magical number 4 in short-term memory. _Behavioral and Brain Sciences_, 24(1), 87–114. [strong]
- Reber, R., Schwarz, N., & Winkielman, P. (2004). Processing fluency and aesthetic pleasure. _Personality and Social Psychology Review_, 8(4), 364–382. [moderate]
- Alter, A. L., & Oppenheimer, D. M. (2009). Uniting the tribes of fluency. _Personality and Social Psychology Review_, 13(3), 219–235. [moderate]
- Diemand-Yauman, C., Oppenheimer, D. M., & Vaughan, E. B. (2011). Fortune favors the bold (and the italicized). _Cognition_, 118(1), 111–115. [mixed — later large replications largely null; cite as cautionary]

**B. Motivation, hope, agency**
- Snyder, C. R., et al. (1991). The will and the ways: Development and validation of an individual-differences measure of hope. _Journal of Personality and Social Psychology_, 60(4), 570–585. [strong]
- Snyder, C. R. (2002). Hope theory: Rainbows in the mind. _Psychological Inquiry_, 13(4), 249–275. [strong]
- Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. _Psychological Review_, 84(2), 191–215. [strong]
- Bandura, A. (1997). _Self-Efficacy: The Exercise of Control._ W. H. Freeman. [strong]
- Deci, E. L., & Ryan, R. M. (1985). _Intrinsic Motivation and Self-Determination in Human Behavior._ Plenum. [strong]
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. _American Psychologist_, 55(1), 68–78. [strong]
- Ryan, R. M., & Deci, E. L. (2017). _Self-Determination Theory: Basic Psychological Needs in Motivation, Development, and Wellness._ Guilford. [strong]
- Dweck, C. S. (2006). _Mindset: The New Psychology of Success._ Random House. [mixed/contested]
- Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent and under which circumstances are growth mind-sets important to academic achievement? Two meta-analyses. _Psychological Science_, 29(4), 549–571. [the key replication-caveat source] https://doi.org/10.1177/0956797617739704
- Yeager, D. S., et al. (2019). A national experiment reveals where a growth mindset improves achievement. _Nature_, 573, 364–369. [small-but-real, targeted] https://doi.org/10.1038/s41586-019-1466-y
- Steele, C. M. (1988). The psychology of self-affirmation: Sustaining the integrity of the self. _Advances in Experimental Social Psychology_, 21, 261–302. [mixed]
- Cohen, G. L., & Sherman, D. K. (2014). The psychology of change: Self-affirmation and social psychological intervention. _Annual Review of Psychology_, 65, 333–371. [moderate]
- Haidt, J. (2003). Elevation and the positive psychology of morality. In C. L. M. Keyes & J. Haidt (Eds.), _Flourishing_ (pp. 275–289). APA. [moderate]
- Algoe, S. B., & Haidt, J. (2009). Witnessing excellence in action: The "other-praising" emotions of elevation, gratitude, and admiration. _Journal of Positive Psychology_, 4(2), 105–127. [moderate]
- Keltner, D., & Haidt, J. (2003). Approaching awe, a moral, spiritual, and aesthetic emotion. _Cognition & Emotion_, 17(2), 297–314. [moderate]
- Stellar, J. E., et al. (2017). Self-transcendent emotions and their social functions. _Emotion Review_, 9(3), 200–207. [moderate]
- Brown, B. (2012). _Daring Greatly._ Gotham Books. [weak/qualitative — grounded theory; flagged]

**C. Framing, persuasion, credibility**
- Tversky, A., & Kahneman, D. (1981). The framing of decisions and the psychology of choice. _Science_, 211(4481), 453–458. [strong for the phenomenon; behavioral application moderate]
- Gallagher, K. M., & Updegraff, J. A. (2012). Health message framing effects on attitudes, intentions, and behavior: A meta-analytic review. _Annals of Behavioral Medicine_, 43(1), 101–116. [moderate]
- O'Keefe, D. J., & Jensen, J. D. (2007). The relative persuasiveness of gain-framed and loss-framed messages. _Journal of Communication_, 57, 613–631. [moderate]
- Trope, Y., & Liberman, N. (2010). Construal-level theory of psychological distance. _Psychological Review_, 117(2), 440–463. [strong-moderate]
- Fujita, K., Trope, Y., Liberman, N., & Levin-Sagi, M. (2006). Construal levels and self-control. _Journal of Personality and Social Psychology_, 90(3), 351–367. [moderate]
- Petty, R. E., & Cacioppo, J. T. (1986). _Communication and Persuasion: Central and Peripheral Routes to Attitude Change._ Springer. [strong]
- Hovland, C. I., & Weiss, W. (1951). The influence of source credibility on communication effectiveness. _Public Opinion Quarterly_, 15(4), 635–650. [strong]
- Pornpitakpan, C. (2004). The persuasiveness of source credibility: A critical review of five decades' evidence. _Journal of Applied Social Psychology_, 34(2), 243–281. [strong, review]
- Kahneman, D., Fredrickson, B. L., Schreiber, C. A., & Redelmeier, D. A. (1993). When more pain is preferred to less: Adding a better end. _Psychological Science_, 4(6), 401–405. [strong]
- Redelmeier, D. A., & Kahneman, D. (1996). Patients' memories of painful medical treatments. _Pain_, 66(1), 3–8. [strong]
- Fredrickson, B. L., & Kahneman, D. (1993). Duration neglect in retrospective evaluations of affective episodes. _Journal of Personality and Social Psychology_, 65(1), 45–55. [strong]
- Fogg, B. J. (2003). _Persuasive Technology: Using Computers to Change What We Think and Do._ Morgan Kaufmann. [moderate]
- Nielsen Norman Group. Source transparency & trust guidance (practitioner literature, e.g., "Trustworthiness in Web Design"). [moderate, practitioner] https://www.nngroup.com/

**D. Emotional design & calm technology**
- Norman, D. A. (2004). _Emotional Design: Why We Love (or Hate) Everyday Things._ Basic Books. [moderate, framework]
- Weiser, M., & Brown, J. S. (1996). The coming age of calm technology. Xerox PARC. [moderate, philosophy] https://calmtech.com/papers/coming-age-calm-technology.html
- Case, A. (2015). _Calm Technology: Principles and Patterns for Non-Intrusive Design._ O'Reilly. [moderate]
- Kurosu, M., & Kashimura, K. (1995). Apparent usability vs. inherent usability. _CHI '95 Conference Companion_, 292–293. [moderate]
- Tractinsky, N., Katz, A. S., & Ikar, D. (2000). What is beautiful is usable. _Interacting with Computers_, 13(2), 127–145. [moderate]

---

_End of report. No option implemented. Awaiting your selection (A, B, or C — or a sequence)._
