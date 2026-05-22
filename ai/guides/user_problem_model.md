# Silhouette — User Problem Model

> **How to use this document:** This is the foundational reference for the entire Silhouette product. Before making any decision about source strategy, retrieval design, intake flow, or corpus structure, consult this model. Every component downstream of this one is calibrated against the stuck states defined here. If a component decision cannot be traced back to a state in this taxonomy, question whether that decision is grounded.

---

## Purpose of This Model

The User Problem Model defines the universe of stuck states Silhouette is built to serve. It is not a user persona document. It is not a market segmentation framework. It is a taxonomy of the specific internal experiences that drive a young professional (22–32) to reach for Silhouette — and it exists so that every other system component can be built against something concrete.

Silhouette's retrieval engine can only work well if it knows what it is retrieving *for*. The clarifying question can only work well if it knows which states it is disambiguating between. The corpus can only be curated well if its tags correspond to real, distinct stuck states. The presentation layer can only frame content correctly if it knows which state the user is actually in.

This model is the input to all of those decisions.

**What this model is not:**
- It is not a clinical framework. These states are not diagnoses.
- It is not exhaustive. It covers the states most common and most tractable for the MVP — not every possible struggle a 22–32 year old might face.
- It is not permanent. As Silhouette learns from real users, this taxonomy will be refined. The MVP version exists to make the first prototype buildable and evaluable.

---

## 1. Raw Description Pool

The following 15 descriptions are written in first-person, in the voice and emotional register of the target user. They are not categories — they are raw moments. The clustering that follows derives from asking one question: **would addressing these two descriptions require fundamentally different content?**

**Description 1**
"I'm good at my job. I get positive feedback. I keep getting small promotions. But when I wake up on Monday, I feel nothing. Not dread exactly — just nothing. I don't know when this stopped feeling like something I actually chose."

**Description 2**
"I used to know what I was working toward. There was always a clear next thing. Now I've hit the thing I said I wanted and I feel exactly the same as before. Actually maybe worse — because now I don't have the next thing to point to."

**Description 3**
"Everyone I know seems to have figured something out that I haven't. My coworkers seem fine. My friends seem to know what they want. And I'm sitting here googling 'how do I find my purpose' at 11pm like that's going to help."

**Description 4**
"I have ideas. I know I want to do something different. I've had the same 'I should start something' conversation with myself for two years. I never start. I don't know if I'm scared, lazy, or if the idea actually isn't good."

**Description 5**
"I feel like I'm living someone else's life. I made all the right decisions — good school, good job, stable income — and now I'm here and it feels like someone else's life I somehow ended up in. I don't know how to want differently than I was taught to want."

**Description 6**
"I know what I should be doing. I literally know the answer. I've read the books, listened to the podcasts, made the plans. And then nothing happens. I go right back to what I was doing. I'm tired of knowing what I need to do and not doing it."

**Description 7**
"I'm exhausted but not because I'm working too hard. I'm exhausted because nothing I'm doing feels like it matters. I have energy for things that excite me but I can't find anything that excites me right now. It's like a motivation drought."

**Description 8**
"I feel like I peaked early. My first job was exciting. I learned a lot. Now I'm three years in and I understand how everything works and it doesn't do anything for me anymore. I used to love the challenge. Now I'm just coasting."

**Description 9**
"I'm comparing myself to people my age who seem to have this momentum I don't. The one who started a company. The friend who moved abroad and built something. I don't want their specific lives — I want that feeling. Like I'm actually going somewhere."

**Description 10**
"I have a list of things I tell myself I want to pursue — writing, a business idea, getting serious about my health, going back to school. I'm not doing any of them. I don't know which one is real and which are fantasies I use to feel better about not doing anything."

**Description 11**
"I went through a big thing — a breakup, leaving a job, a move — and for a while that was the thing I was dealing with. Now I'm through it and I don't know who I am on the other side. The thing that used to organize my life is gone and I haven't figured out what comes next."

**Description 12**
"My work is fine but I feel totally disconnected from any larger purpose. I don't care about the company's mission. I don't know why it matters if I do a good job. I'm trading time for money and I know that's what most people do — but I thought I'd have figured out something better by now."

**Description 13**
"I'm good at performing wellness. I do the gym, the good sleep, the right things. But underneath the performance I feel like I'm just going through the motions. I'm not growing. I'm just maintaining. And maintaining feels like dying slowly."

**Description 14**
"I have this vague sense that I'm capable of significantly more than what I'm currently doing. Not in an arrogant way — I'm just not challenged. And instead of making a move I just keep thinking about making a move. The gap between what I think I'm capable of and what I'm actually doing is demoralizing."

**Description 15**
"My social life feels thin. My work life feels fine. My personal projects don't exist anymore. At some point I traded depth for stability and I don't remember making that trade consciously. I feel like I've become someone smaller than I used to be."

---

## 2. Clustering Logic

Descriptions were grouped by asking: **would these two situations need fundamentally different content to shift?** If two descriptions could be addressed by the same type of insight, they are the same state. If they require meaningfully different types of insight, they are different states.

This is a retrieval clustering exercise, not a psychological one. The goal is states that generate meaningfully different metadata tags and meaningfully different corpus queries.

| Cluster | Descriptions | Core content need |
|---|---|---|
| Direction Collapse | 2, 3, 5, 12 | Constructing personal direction when external goals no longer provide it |
| Engagement Drought | 1, 7, 8, 13 | Re-engaging when intrinsic motivation has faded and work has gone flat |
| Inaction Loop | 6, 14 | The gap between knowing and doing — starting despite psychological resistance |
| Possibility Paralysis | 4, 10 | Choosing among real options when optionality itself has become the blocker |
| Identity Transition | 11, 15 | Navigating identity after a major change has removed a prior organizing structure |
| Momentum Gap | 9 | Redirecting comparison-triggered anxiety into something directional |

**Key clustering decision — Inaction Loop vs. Possibility Paralysis:**
These are kept as separate states because the content that would shift them is different. Inaction Loop = "I know which thing, I'm just not doing it." The blocker is psychological resistance. Possibility Paralysis = "I have multiple things I could pursue and I can't choose." The blocker is clarity and commitment. An Inaction Loop user needs insight about starting despite resistance. A Possibility Paralysis user needs insight about how to choose and commit. Same surface appearance — not doing things — but very different retrieval targets.

**Key clustering decision — Momentum Gap kept separate:**
Momentum Gap is real and distinct but is a *spike* state (comparison-triggered, often transient) rather than a chronic state. It has the thinnest corpus match of the six. Included in the taxonomy for future corpus expansion and tagging but is not MVP priority.

---

## 3. The Final State Taxonomy

### State 1: Direction Collapse

**Internal name:** Direction Collapse
**User-facing name:** "I don't know what I'm building toward"

**What it feels like from the inside:**
The user has achieved what they set out to achieve — or arrived at the life they were told to want — and discovered it doesn't feel like they expected. There is no clear next target. The external goals that previously organized their identity (degree, job title, salary milestone, relationship) have either been reached or revealed themselves as insufficient. What remains is a vague, low-grade disorientation: they are functional, competent, and by all external measures fine — but they feel purposeless. This is not depression. It is the specific discomfort of someone who has run out of inherited goals and hasn't yet built their own.

**How the user describes it:**
"I've hit everything I said I wanted and I still feel like something's missing." / "I don't know what I'm actually working toward anymore." / "I feel like I'm living someone else's life." / "I know I should figure out my purpose but I don't even know what that means."

**Typical situation or trigger:**
- Hitting a major milestone (graduation, first promotion, target income level) and feeling flat instead of fulfilled
- Late-20s drift — the sense that early-career momentum has delivered them somewhere but they don't know if it's where they wanted to go
- Quiet periods — weekends, vacation — when the absence of external structure makes the emptiness more visible
- Comparison to others who seem to have a clearer sense of direction (though the root cause is internal, not comparative)

**What kind of insight would actually shift it:**
The insight must name the experience of directionlessness as coherent and real before offering any reframe — it cannot open with advice, a framework, or a call to action. It should NOT tell the user to "follow their passion," build a values list, or use any process-oriented approach to direction-finding.

*Speaker credibility:* The speaker must have personal experience of not knowing what they wanted — or of discovering that a goal they reached didn't provide what they expected. A speaker who arrived at their purpose early and clearly, or who is speaking theoretically about how people find direction, will not land for this user.

*The reframe should address one of two things:* (a) how direction is actually built through doing and noticing rather than through introspection alone, or (b) why the absence of clear direction is not a character flaw but a developmental state that resolves through action and attention over time.

*A good retrieved insight would:* name the internal experience accurately before reframing it; offer a specific, grounded claim about how direction works — not "clarity comes through action" as a slogan, but a concrete version of that idea from someone who lived it; and come from a speaker whose credibility on this topic derives from their own navigation of it, not from a coaching or research background. A retrieved insight that opens with advice, prescribes a self-discovery exercise, or uses the word "passion" without irony does not meet this criterion.

**Internal Variants**

Direction Collapse encompasses two meaningfully different experiences. At the corpus tagging and retrieval level, distinguish between them when the intake signal is clear enough:

*Variant A — Post-Achievement Flatness*
The user reached a goal they worked toward and felt empty or flat on arrival. The problem is not the absence of a target but the discovery that the target was hollow. Descriptions 2 and 12 map here.
Sounds like: "I've hit everything I said I wanted and I still feel like something's missing." / "I got the promotion, I'm making good money, and I feel nothing."
What a good retrieval result looks like: The insight should address what achievement is in relation to direction — specifically, that reaching a goal reveals whether the goal was the right target. The reframe treats post-achievement flatness as useful signal, not failure. The speaker must have personally experienced reaching something they worked toward and feeling the emptiness on the other side.

*Variant B — Original Directionlessness*
The user has never had a strong, clear pull toward anything. They are not flat after reaching a goal — they have no clear goal and never have. Descriptions 3 and 5 map here.
Sounds like: "Everyone seems to know what they want. I don't." / "I followed the expected path and I have no idea what mine would even look like."
What a good retrieval result looks like: The insight should address how people who started without clear direction actually built one — through doing, noticing, and iterating, not through introspection or a purpose-finding exercise. The speaker should be credible specifically because they were also directionless early, not because they always knew what they wanted.

*Corpus tagging note:* When tagging chunks for Direction Collapse, add a secondary tag of `direction-collapse/post-achievement` or `direction-collapse/original` where the distinction is clear. When it is not clear, use `direction-collapse` alone.

**Sources and creators most likely to address it:**
- School of Greatness: High. Lewis Howes has interviewed many guests (Matthew McConaughey, Jay Shetty, Brendon Burchard and others) who have specifically navigated this state from the inside.
- Dan Martell: High. Direct frameworks on building career clarity, identifying what you actually want vs. what you were told to want, and taking agency over direction.
- Huberman Lab: Moderate. Episodes on goal-setting, the neuroscience of motivation and meaning touch this — but Huberman tends toward biological mechanism rather than the identity reframe this state most needs.

**What makes it distinct from adjacent states:**
- vs. Engagement Drought: Direction Collapse is about the *absence* of a target. Engagement Drought is about losing the *feeling* of motivation toward a target that still exists. A Direction Collapse user says "I don't know what I want." An Engagement Drought user says "I know what I should want, but I don't feel it anymore."
- vs. Inaction Loop: Direction Collapse users are not stuck on *doing* — they are stuck on *knowing what to do*. The problem is upstream of action. Inaction Loop users know what to do; they just aren't doing it.
- vs. Identity Transition: Identity Transition requires a discrete external change event. Direction Collapse is chronic and gradual — it accumulates without a clear trigger.
- vs. Possibility Paralysis: Direction Collapse is an absence of options. Possibility Paralysis is an excess of options. The emotional texture is different: Direction Collapse feels empty; Possibility Paralysis feels anxious and crowded.

---

### State 2: Engagement Drought

**Internal name:** Engagement Drought
**User-facing name:** "I used to care and now I don't feel anything"

**What it feels like from the inside:**
The user is not new to their work, role, or life situation — they have been here long enough to understand the system and get good at the routine. What they have lost is intrinsic motivation. The work that once provided challenge, learning, or a sense of progress has gone flat. They are not burned out in the clinical sense — they are not depleted or in crisis. They are going through the motions competently. They still show up. They still perform. But the internal experience of the work has gone grey. They can no longer locate what they are supposed to care about or why. The days feel interchangeable.

**How the user describes it:**
"I used to love this. Now I just feel nothing." / "I'm good at what I do but I don't care about it at all." / "I feel like I peaked early." / "It's like a motivation drought — I have energy but I can't find anything to point it at." / "I'm performing but not growing. And maintaining feels like dying slowly."

**Typical situation or trigger:**
- 2–4 years into the same role or organization — past the learning curve, before the next meaningful step
- Having mastered the job enough that challenge has been replaced by competence and routine
- Loss of a mentor, a change in team, or a manager shift that removed the relational energy that previously sustained the work
- Hitting a plateau after early-career momentum — the sense of ascending that characterized the first year has stopped without a clear reason

**What kind of insight would actually shift it:**
The insight must name the experience of performing competently while feeling nothing — specifically distinguishing it from burnout, laziness, or lack of work ethic — before offering any reframe. It cannot begin with advice, a call to action, or a prescription for re-engagement.

It should NOT: offer motivation tips, tell the user to find what excites them, recommend a new hobby or side project, or prescribe any behavioral change before the naming is complete.

*Speaker credibility:* The speaker should have personally experienced professional flatness at a high level of external performance — not someone who has only studied motivation or who has never been in the position of performing well while caring very little. Exception: a Huberman Lab insight on this state gains credibility from empirical mechanism (why motivation systems work this way), not from lived experience — this is valid but should be tagged differently, as a mechanism insight rather than a story insight.

*The reframe should address one of two things:* (a) what the plateau is actually signaling — that the user has outgrown the current container, and the discomfort is directional rather than a verdict — or (b) the mechanism by which motivation and engagement work and how they can be restored, addressed at the systems level, not the behavioral level.

*A good retrieved insight would:* name the specific experience accurately (competent performance, no internal engagement); offer a reframe that makes the flatness coherent rather than pathological; and not prescribe action as the first or primary response. A retrieved insight that opens with "here's how to get your motivation back" or lists re-engagement strategies fails this criterion regardless of how relevant the topic appears.

**Sources and creators most likely to address it:**
- Huberman Lab: Very high. Andrew Huberman has produced extensive content on dopamine, motivation systems, how the brain's reward mechanisms work and how to restore them. Rare among the hypothesized sources for addressing the neuroscience of why engagement fades.
- School of Greatness: High. Guests with reinvention arcs — people who left careers at peak performance, who walked away from money or status to rebuild — speak directly to the plateau experience.
- Dan Martell: Moderate. Addresses momentum and performance but is better calibrated to the Inaction Loop than to Engagement Drought.

**What makes it distinct from adjacent states:**
- vs. Direction Collapse: Engagement Drought users still have a target — they just can't feel it anymore. A Direction Collapse user would say "I don't know if I want the promotion or something else." An Engagement Drought user would say "I know I should want the promotion. I just don't feel anything about it."
- vs. Inaction Loop: Engagement Drought is about motivation failing. Inaction Loop is about resistance to a specific action. An Engagement Drought user is often not even trying to act on anything — the motivation to try has gone flat. An Inaction Loop user is actively frustrated by their own inaction.
- vs. Momentum Gap: Engagement Drought is chronic and internally generated — the flatness is always there. Momentum Gap is spike-triggered by comparison to others.
- vs. Identity Transition: Engagement Drought occurs within an otherwise stable life. Identity Transition involves external structural disruption.

---

### State 3: Inaction Loop

**Internal name:** Inaction Loop
**User-facing name:** "I know what I need to do and I'm not doing it"

**What it feels like from the inside:**
The user is not confused about what they should do. They have thought about it, planned it, read about it, maybe even talked about it with people they trust. They know. And they are not doing it. This is not laziness in the pejorative sense — it is a specific, frustrating experience of watching themselves not act on something they genuinely want to do. The longer the gap between knowing and doing, the more corrosive it becomes to self-image. They begin to wonder if they are fundamentally someone who doesn't follow through, if the resistance is a signal the idea is wrong, or if there is something about them that simply cannot change. The loop itself becomes the problem.

**How the user describes it:**
"I know exactly what I need to do. I'm just not doing it." / "I've been having the same conversation with myself for two years." / "I read all the right things and then go right back to what I was doing." / "I don't know if I'm scared or just not serious about this." / "There's a version of myself I'm trying to become and I keep not becoming it."

**Typical situation or trigger:**
- A creative project, side business, health change, or career move that has been deferred repeatedly
- A clear goal with a clear first step that keeps not being taken
- Having consumed a lot of content *about* the thing (podcasts, books, courses) without doing the thing
- Self-awareness without self-efficacy — they can diagnose the problem, they just cannot act on the diagnosis
- Often accompanied by a shrinking of self-belief: each iteration of the loop reinforces the narrative that they are not someone who follows through

**What kind of insight would actually shift it:**
The insight must first validate the frustration of knowing without doing — naming it as a specific, real, and not-shameful experience — before offering any reframe. It cannot begin with a framework, a tactic, a productivity approach, or a prescription to "just start."

It should NOT: offer accountability structures, planning methods, habit-building frameworks, or behavioral advice. More information about how to start is not what this user needs and will not land.

*Speaker credibility:* The speaker must have personally been in the loop — they know from the inside what it feels like to know exactly what to do and not do it — and must have gotten out in a way they can describe specifically. A speaker who offers this as external advice ("here's what people in this situation should do") rather than as internal experience ("here's what I had to believe differently before I could move") does not have the credibility this state requires.

*The reframe should work at the identity level, not the tactical level.* The most effective insight for this state addresses the gap not as a behavior problem but as a belief problem: who the user thinks they are versus who they would need to be to take the action. A reframe that shifts the user's self-concept is more powerful than one that shifts their to-do list.

*A good retrieved insight would:* (1) name the loop from the inside without judgment, (2) offer a claim about identity or belief — not behavior — that the user hasn't heard framed this way before, (3) describe what the speaker actually had to change in how they saw themselves or the situation, not what they did tactically. A retrieved insight that is fundamentally a "how to start" or "just do it" message does not meet this criterion.

**Sources and creators most likely to address it:**
- Dan Martell: Very high. Dan Martell's content model is built around execution, starting, identity shifts, and the gap between knowing and doing. This is his strongest territory and where his content is most distinctive.
- Huberman Lab: High. Huberman has produced extensive work on procrastination, executive function, the neuroscience of habit formation, and the biology of resistance and inertia. More mechanistic than Dan Martell, but highly actionable.
- School of Greatness: Moderate. Guests with execution-heavy arc stories — people who made the move after years of hesitation — can speak to this, but it is not the show's primary focus.

**What makes it distinct from adjacent states:**
- vs. Possibility Paralysis: Inaction Loop users know *which* thing. The blocker is psychological resistance to starting, not lack of clarity about the choice. "I know I should start the newsletter but I keep not starting it" = Inaction Loop. "I don't know whether to start the newsletter or pursue the job change" = Possibility Paralysis. Telling an Inaction Loop user to "figure out which thing first" is more avoidance. Telling a Possibility Paralysis user to "just start something" without addressing the clarity problem is unhelpful.
- vs. Engagement Drought: Inaction Loop users are motivated — they feel the pull of the thing they're not doing. Engagement Drought users have lost the pull entirely.
- vs. Direction Collapse: Inaction Loop users have a specific thing they want to do. Direction Collapse users do not.

---

### State 4: Possibility Paralysis

**Internal name:** Possibility Paralysis
**User-facing name:** "I have too many real options and I can't choose"

**What it feels like from the inside:**
The user is not without options. That is exactly the problem. They have several genuine possibilities — a career pivot, a business idea, a creative direction, a geographic move — and they are choosing none of them. They might frame it as "keeping options open" but beneath that framing is a specific anxiety: choosing means foreclosing other options, and they are not sure which option is actually right. The longer they wait for certainty, the more the waiting itself starts to feel like the answer. They are not lazy and not without ambition — they are paralyzed by having too many things they could genuinely care about. The optionality that once felt like freedom now feels like a cage.

**How the user describes it:**
"I have a list of things I want to pursue and I'm not doing any of them." / "I don't know which idea is the real one and which are just distractions I use to feel better." / "I keep thinking that if I wait long enough I'll know which path is right." / "Every time I get close to committing to something, another possibility appears."

**Typical situation or trigger:**
- Early-to-mid career with enough experience to have real options but not enough clarity about identity to know which ones actually fit
- Post-achievement: having succeeded at something that unlocked new possibilities but not knowing which to pursue
- Personality pattern: creative, curious, high-aspiration — good at generating ideas, harder at executing on one
- Fear of regret as the primary decision driver — more concerned with choosing wrong than with the cost of not choosing

**What kind of insight would actually shift it:**
The insight must first acknowledge that having multiple real options and being unable to choose among them is a genuine problem — not a privilege to be grateful for, not a matter of lacking a decision framework. It cannot open by minimizing the difficulty or immediately offering a method for choosing.

It should NOT: offer a pros/cons exercise, a decision matrix, a "test and iterate" approach, or tell the user to "just pick one." It should also not moralize about optionality as a form of luck.

*Speaker credibility:* The speaker must have personally navigated a genuine commitment decision where multiple options were real and foreclosing them had real cost — and must be able to speak to what the act of committing actually felt like, not just that they committed. A speaker who naturally defaults to decisiveness and has never experienced genuine option paralysis will not land for this user.

*The reframe should address one of two things:* (a) the actual cost of not choosing — not as a productivity argument but as a real claim about what perpetual optionality does to a person's sense of self and forward momentum — or (b) how clarity and commitment actually relate: that commitment tends to generate clarity rather than requiring it first.

*A good retrieved insight would:* (1) validate the genuine difficulty of choosing when multiple options are real, (2) offer a specific claim about what choosing means or what optionality costs — grounded in the speaker's experience, not in theory, (3) not prescribe a decision method. A retrieved insight that offers a framework for deciding or jumps straight to action advice without first addressing the user's relationship to commitment does not meet this criterion.

**Sources and creators most likely to address it:**
- Dan Martell: High. Frameworks on decision-making, committing to a direction, and understanding the real cost of optionality. Direct and non-therapy-adjacent.
- School of Greatness: Moderate. Occasional guests who have navigated major creative or career direction decisions speak to this, but it is not a consistent theme.
- Huberman Lab: Low. Decision neuroscience is present but not a primary content lane.

**What makes it distinct from adjacent states:**
- vs. Inaction Loop: Possibility Paralysis = "I don't know which thing." Inaction Loop = "I know which thing, I'm just not doing it." Superficially similar (both involve not moving), but the intervention is different.
- vs. Direction Collapse: Direction Collapse is an absence of options — no clear target, no sense of what would be worth pursuing. Possibility Paralysis is an excess of options. The emotional texture is entirely different: Direction Collapse feels empty; Possibility Paralysis feels anxious and crowded.
- vs. Engagement Drought: Possibility Paralysis users are often energized and motivated — they just cannot channel it. Engagement Drought users have lost access to motivation itself.

---

### State 5: Identity Transition

**Internal name:** Identity Transition
**User-facing name:** "Something changed and I don't recognize myself anymore"

**What it feels like from the inside:**
A discrete external event — a breakup, a job loss, a move, a friendship ending, a health scare, leaving a community or belief system — has removed a structure that previously organized the user's sense of self. Before the event, they knew who they were in relation to that thing (partner, company, city, community). After the event, that organizing structure is gone and they have not yet built a new one. They are not in acute crisis but they feel disoriented in a way that is hard to name. They may feel like they have regressed or become smaller. They feel the gap between who they were and who they are becoming, but cannot yet see who that is. The disorientation is real and correct — it is not a malfunction. But it feels like one.

**How the user describes it:**
"I went through a big thing and now I don't know who I am on the other side." / "The thing that used to give my life structure is gone and I don't know what replaces it." / "I feel like I've become someone smaller than I used to be." / "I know I'm supposed to be in some kind of chapter two but I can't see what it looks like."

**Typical situation or trigger:**
- Requires a discrete triggering event — this is the defining characteristic that differentiates it from the other states, which are chronic rather than event-triggered
- The event does not have to be negative: a major success, a marriage, or the end of a demanding period can also remove a prior organizing structure
- Typically appears 3–12 months after the event — not immediately, but once the acute phase has passed and the reorganization hasn't yet happened

**What kind of insight would actually shift it:**
The insight must begin by naming the disorientation of identity transition as a coherent, real experience — not a problem to be fixed, not a regression, not a sign that the user is handling the change poorly. It cannot offer a recovery plan, prescribe a "chapter two" strategy, or move toward advice before the naming is complete.

It should NOT: offer a rebuilding framework, tell the user who they should become next, prescribe action steps, or rush toward the resolution. Any insight that begins on the far side of the difficulty — with what's possible after the transition — without first accurately naming the transition itself will not land.

*Speaker credibility:* The speaker must have personally navigated post-disruption identity reconstruction with enough time elapsed to speak about both sides honestly. A speaker who is still inside the transition does not have the right credibility here. A speaker who was never seriously disrupted and is speaking theoretically does not either. The credibility comes from the combination: lived through it, enough distance to see it clearly, specific enough to name it without minimizing it.

*The reframe should address what the transition state actually is — not how to end it.* The most useful reframe treats the disorientation as structurally appropriate: the old self was organized around something that is now gone, and the disorientation is not a malfunction but the correct response to a real structural change. This reframe is more useful than any advice about what comes next.

*A good retrieved insight would:* (1) name the disorientation without pathologizing it, (2) offer a frame for understanding why the state feels this way — making it coherent rather than alarming, (3) not rush to resolution or prescribe a path forward. A retrieved insight that focuses primarily on "what comes next" or offers a rebuilding framework without first accurately naming the experience fails this criterion.

**Sources and creators most likely to address it:**
- School of Greatness: High. The show has a deep inventory of reinvention stories — guests who rebuilt after serious disruption (career collapse, divorce, illness, public failure). This is some of the show's strongest material and most emotionally resonant content.
- Huberman Lab: Low. Less in this lane.
- Dan Martell: Low. Better calibrated to execution and direction than to identity reconstruction narratives.

**What makes it distinct from adjacent states:**
- vs. Direction Collapse: Direction Collapse is chronic and gradual — no external trigger, slow accumulation. Identity Transition is event-triggered and has a clear before-and-after. The emotional experience is also different: Direction Collapse is a quiet drift; Identity Transition has the quality of aftermath.
- vs. Engagement Drought: Identity Transition involves structural disruption. Engagement Drought occurs within an otherwise stable situation.
- vs. Momentum Gap: Identity Transition is inward-facing (who am I now?). Momentum Gap is outward-facing (why am I not going somewhere?).

---

### State 6: Momentum Gap

**Internal name:** Momentum Gap
**User-facing name:** "I feel behind. Everyone else is going somewhere."

**What it feels like from the inside:**
The user has a specific moment — a LinkedIn post, a dinner party conversation, a friend's announcement — that makes their own progress feel insufficient by comparison. This is not chronic low motivation. It is a spike: a specific, triggered experience of falling behind relative to a perceived peer standard. The user does not necessarily want the specific thing that triggered the comparison, but they want the feeling attached to it — the sense of momentum, of going somewhere, of being a person whose life is building toward something. The spike often passes, but it leaves a residue of vague dissatisfaction that is hard to act on directly.

**How the user describes it:**
"Everyone I know seems to have figured something out that I haven't." / "I feel like I'm standing still while everyone else is moving." / "I don't want their specific life, I want that *feeling* of going somewhere." / "Why does it feel like everyone got a roadmap except me?"

**Typical situation or trigger:**
- A visible peer achievement: a promotion, a company launch, a press feature, a move
- A birthday, year-end, or reunion that prompts comparison against an imagined personal timeline
- Heavy LinkedIn or social media consumption during a low-momentum period
- A conversation where the other person's energy or trajectory contrasts sharply with the user's current experience

**What kind of insight would actually shift it:**
The insight must first acknowledge that the comparison feeling is real and that it carries genuine signal — it cannot begin by dismissing it, moralizing about it, or prescribing distance from it. Any version of "comparison is the thief of joy" fails this criterion immediately.

It should NOT: advise the user to get off social media, remind them that other people's lives aren't as good as they look, or moralize about the harmfulness of comparison. It also should not immediately redirect to "here's what you should focus on instead" without first naming what the comparison is actually pointing to.

*Speaker credibility:* The speaker must have personally felt behind their peers at some point and navigated that feeling in a way they can describe specifically. A speaker who has always felt ahead or has never experienced the comparison spike will not land. Credibility here comes from honest acknowledgment of the feeling followed by a specific account of what they did with it.

*The reframe should help the user distinguish:* (a) what the comparison is actually pointing to — a real signal about the user's own values, desires, or standards that is worth decoding — from (b) what it is not pointing to — an accurate measure of their progress relative to others. A good reframe treats comparison as signal to decode, not noise to eliminate.

*A good retrieved insight would:* (1) validate the comparison feeling without endorsing it as an accurate measure, (2) offer a specific reframe about what the signal is actually pointing to in terms of the user's own situation, not others', (3) not prescribe "stop comparing." A retrieved insight that moralizes about comparison or jumps to redirecting the user's attention without naming the experience first does not meet this criterion.

**Sources and creators most likely to address it:**
- Dan Martell: High. Strong on high-performance identity, who you need to become, and redirecting ambition productively.
- School of Greatness: Moderate. Some guest content on comparison, on building something vs. watching others build.
- Huberman Lab: Low. Not a primary content lane.

**What makes it distinct from adjacent states:**
- vs. Direction Collapse: Momentum Gap is comparison-triggered and often transient. Direction Collapse is chronic and internally generated without an external trigger.
- vs. Inaction Loop: Momentum Gap is about how the user feels relative to others. Inaction Loop is about the user's relationship to their own goals and resistance.
- vs. Engagement Drought: Momentum Gap users are not unmotivated — they are motivated but without a clear target for that motivation. Engagement Drought users have lost access to motivation itself.

---

## 3.5 Detection Difficulty and Disambiguation Guide

This section exists because the intake flow cannot be designed without knowing where detection breaks down. The six states above are conceptually distinct. In practice, real user inputs — typically 2–3 sentences describing a stuck moment — will often be ambiguous. This guide identifies where ambiguity is most likely, which states are most commonly confused, and what the system should do when detection fails.

### Detection Difficulty by State

| State | Difficulty | Why |
|---|---|---|
| Inaction Loop | Low | Users tend to self-diagnose explicitly: "I know what I need to do but I'm not doing it." The distinguishing language is usually present. |
| Momentum Gap | Low–Moderate | Comparison language ("everyone else," "feel behind," "they have") is fairly distinctive and uncommon in the other states. |
| Possibility Paralysis | Moderate | "List of things, not doing any of them" is fairly specific, but can be confused with Inaction Loop when the list isn't named explicitly. |
| Identity Transition | Moderate | The triggering event is often named ("after my breakup," "since I left my job"), making detection easier. But users 6–12 months post-event may no longer reference it. |
| Engagement Drought | Moderate–Hard | Language overlaps heavily with Direction Collapse. The critical distinguishing signal — whether a target still exists — is frequently absent from the first input. |
| Direction Collapse | Hard | The most common state and the most ambiguous language. "I feel stuck," "I don't know what I want," and "something feels off" could each map to Direction Collapse, Engagement Drought, or Momentum Gap. |

### Most Likely Confusion Pairs

**Direction Collapse vs. Engagement Drought — most common confusion**
Both produce language like "I feel stuck," "I don't know what I want," and "something is off." The critical distinction: does the user still have a target, or have they lost the target itself?
- *Direction Collapse signal:* No target is mentioned. Language centers on not knowing what to do or what they want. "I don't know what I'm building toward." No specific goal, role, or project is referenced.
- *Engagement Drought signal:* A target still exists but caring about it has gone flat. Language centers on not feeling anything about something that still exists. "I know I should care about this but I don't." A specific job, role, or goal is often present in the description.
- *Disambiguation question:* "Is there a specific thing you're working toward right now — a goal, a role, a project — even if it doesn't feel meaningful?"
  - Yes → likely Engagement Drought
  - No → likely Direction Collapse

**Inaction Loop vs. Possibility Paralysis — second most common confusion**
Both produce language around not doing things. The distinction: does the user know which thing they should be doing?
- *Inaction Loop signal:* One specific thing is named or clearly implied. "I keep not starting the business." "I know I need to leave this job."
- *Possibility Paralysis signal:* Multiple things are listed or implied, with uncertainty about which one is real. "I have a bunch of ideas but I can't figure out which one matters."
- *Disambiguation question:* "If you had to name the one thing you most feel like you should be doing right now, could you?"
  - Names it clearly → likely Inaction Loop
  - Lists several, deflects, or says "that's the problem" → likely Possibility Paralysis

**Direction Collapse vs. Momentum Gap — third most common confusion**
Comparison language can surface inside what is actually a Direction Collapse. A user in Direction Collapse will sometimes describe it through comparison ("everyone else seems to know what they want") rather than naming it directly.
- *Direction Collapse signal:* The comparison is an illustration of a chronic internal state. The user is describing how they feel generally, not a reaction to a specific recent event.
- *Momentum Gap signal:* The comparison is the event. Something specific happened recently that triggered the feeling. The language is more reactive and recent.
- *Disambiguation question:* "Is this something you've been feeling for a while, or did something specific happen recently that brought it up?"
  - Chronic → likely Direction Collapse
  - Recent trigger → likely Momentum Gap

### When State Detection Is Unclear

**Situation 1 — Input is too sparse to detect any state**
Examples: "I feel stuck," "I don't know what to do," "I need help."
*Recommended response:* Do not attempt state disambiguation yet. Prompt for more context first: "Can you tell me a bit more about what's been feeling off?" Use the expanded input to attempt detection before asking a disambiguating question.

**Situation 2 — Input maps equally to two states**
The most common case: Direction Collapse and Engagement Drought are indistinguishable from the first input alone.
*Recommended response:* Ask the targeted disambiguation question for that specific pair. Do not ask a generic clarifying question — generic questions produce generic answers that do not help with state detection.

**Situation 3 — Input maps plausibly to three or more states**
Rare but real. The user has written something genuinely ambiguous across multiple states.
*Recommended response:* Default to Direction Collapse. It is the most common MVP state, has the broadest corpus coverage, and a Direction Collapse insight served to a user in a slightly different state is the least harmful mismatch among the three MVP options. Log the case — a recurring pattern of three-way ambiguity in real user inputs is signal to revisit the intake flow design.

### Detection Confidence and Retrieval

State detection does not need to be certain to be useful. The intake flow should operate on three confidence levels:
- **High** — one state is clearly indicated. Proceed to retrieval.
- **Moderate** — one state is likely but one alternative is plausible. Ask the pair-specific disambiguation question.
- **Low** — unclear across multiple states. Use the expanded context prompt first, then the pair-specific question if needed.

The goal is not perfect classification. The goal is enough signal to retrieve an insight that lands for this specific user in this specific moment.

---

## 4. Priority Ranking

### MVP Priority States

Build the corpus, retrieval, and intake flow around these three states first.

**Priority 1 — Direction Collapse**
Most universally applicable state in the 22–32 cohort, especially the 26–30 window. Does not require a triggering event — it accumulates gradually and is almost universally recognizable. Best supported by all three hypothesized corpus sources. The "Sunday night feeling" version of Direction Collapse is the most common entry point for the target user and the most clearly differentiated from what a generic AI would produce.

**Priority 2 — Engagement Drought**
Extremely common, particularly 2–5 years into a first professional role. The experience of going through the motions competently without caring is near-universal in the cohort. Very well served by Huberman Lab (motivation neuroscience) and School of Greatness (reinvention arcs). Offers one of the strongest differentiators from generic AI advice: Huberman Lab content on dopamine and the reward system is qualitatively different from anything ChatGPT would generate in response to the same input.

**Priority 3 — Inaction Loop**
Third-most common entry point and the most specifically served by Dan Martell's content. Gives Silhouette a retrieval target where the difference between a well-matched insight and a generic AI response is sharpest: generic AI gives another framework, Silhouette returns a specific human source naming the exact psychological dynamic.

### Non-MVP States

Include in the taxonomy for corpus tagging and future expansion. Do not build retrieval evaluation or intake disambiguation around these in the first prototype.

**Possibility Paralysis** — Real and distinct, but corpus coverage is thinner. Add in second iteration once MVP states are validated.

**Identity Transition** — High-value but narrower trigger requirement. Excellent School of Greatness coverage exists but single-source coverage is not sufficient for reliable retrieval. Add in second iteration with supplemental sources.

**Momentum Gap** — Spike state, not chronic. Thinnest corpus match. Tag in corpus as encountered, but do not build retrieval logic around it for the MVP.

---

## 5. Content Match Check

Against the hypothesized MVP corpus: **School of Greatness, Huberman Lab, Dan Martell**

| State | School of Greatness | Huberman Lab | Dan Martell | Overall MVP viability |
|---|---|---|---|---|
| Direction Collapse | High | Moderate | High | **Strong — proceed** |
| Engagement Drought | High | Very High | Moderate | **Strong — proceed** |
| Inaction Loop | Moderate | High | Very High | **Strong — proceed** |
| Possibility Paralysis | Moderate | Low | High | Partial — add in second iteration |
| Identity Transition | High | Low | Low | Single-source — add in second iteration with supplemental sources |
| Momentum Gap | Moderate | Low | High | Thin — tag in corpus; do not prioritize |

**Notes on coverage by source:**

*School of Greatness* is the strongest source for Direction Collapse and Identity Transition. The interview format produces long-form narrative content from guests who have navigated purpose and direction questions explicitly. Rich in quotable, attributable moments from named, credible people. This source's competitive advantage is story — guests who have lived through the state and can name it from the inside.

*Huberman Lab* is the strongest source for Engagement Drought (dopamine, motivation systems, reward) and Inaction Loop (procrastination, executive function, habit formation). The show's scientific framing means insights carry a different kind of credibility — empirical rather than anecdotal. This is the source most differentiated from what a generic AI would produce. The competitive advantage is mechanism — Huberman names *why* something works, not just what to do.

*Dan Martell* is the strongest source for Inaction Loop and Possibility Paralysis. His content is the most direct and prescriptive of the three — less narrative, more framework — which makes it well-suited for users who need a clear reframe rather than a story. The competitive advantage is precision — Dan Martell often names the exact dynamic a user is in before they've named it themselves.

**Critical corpus gap:**
Identity Transition has strong School of Greatness coverage but low coverage from the other two sources. If this state is added to the second iteration, supplemental sources should be evaluated before ingesting — candidates include Tim Ferriss Show, Diary of a CEO, and We Can Do Hard Things, each of which has relevant guest content in this lane.

---

## 6. How This Model Should Guide Future Work

### Source Strategy

The User Problem Model is the primary filter for source evaluation. A source belongs in the Silhouette corpus if it produces high-density insights that address one or more of the defined states with specificity. When evaluating a new source, ask: which states does this source address? Which specific episodes or segments have the highest insight density for those states? A source that doesn't clearly address at least one MVP state does not belong in the first corpus.

The content match check in Section 5 is the starting point for source evaluation, not the end point. Each source must be mapped at the episode/segment level — not just the source level — before ingestion. "Huberman Lab addresses Engagement Drought" is not enough. "Episode 120 on dopamine contains three high-density moments specifically relevant to Engagement Drought" is the level of specificity needed.

### Retrieval Philosophy

Each retrievable insight in the corpus should carry a stuck-state tag — at minimum, the primary state it addresses, optionally a secondary state if genuinely applicable. The taxonomy defined here is the controlled vocabulary for that tagging.

Retrieval should be able to use stuck-state tags as a filter layer on top of semantic similarity, so that a user clearly in the Engagement Drought state does not receive content calibrated for the Inaction Loop — even if the semantic similarity scores are close. The definitions in this document — especially the "What kind of insight would shift it?" and "What makes it distinct from adjacent states?" sections — should directly inform the evaluation criteria for retrieval quality. "Well-matched" means: the retrieved insight is appropriate for the user's specific state, not just topically adjacent.

### Intake / Diagnostic Flow

The clarifying question exists to disambiguate between states when the user's initial input is ambiguous. This means the intake flow must be designed backward from the taxonomy: what single question, for each pair of easily-confused states, would most reliably distinguish which state the user is in?

The most important disambiguation pairs, based on surface similarity, are:
- **Direction Collapse vs. Engagement Drought:** Does the user still have a target, or have they lost the target itself?
- **Inaction Loop vs. Possibility Paralysis:** Does the user know what they should do, or are they unclear which thing to pursue?
- **Engagement Drought vs. Momentum Gap:** Is the motivation flat chronically, or was it triggered by a specific comparison event?

The "how the user describes it" examples in each state definition are the raw material for training intake detection and designing the clarifying question. Real user inputs will map to these examples — the closer the match, the clearer the state.

### Corpus Tagging

Every chunk ingested into the Silhouette corpus should be tagged with:
- **Primary stuck state** — one of the six states above
- **Secondary stuck state** — optional; only if the content is genuinely relevant to a second state, not just topically adjacent
- **Insight type** — one of: *reframe* (changes how the user sees the situation), *permission* (names something the user was afraid to say), *mechanism* (explains why the experience happens), *story* (a credible person who navigated this and describes what shifted)
- **Source credibility signal** — what specifically makes this speaker credible for this state: relevant lived experience, domain expertise, or empirical research

The stuck-state taxonomy defined here is the controlled vocabulary. Do not invent new tags ad hoc during ingestion. If content doesn't clearly map to one of the six states, that is signal either that the content isn't high enough quality for the corpus, or that the taxonomy needs revisiting — document the case and decide deliberately rather than creating ad hoc tags.

A fifth required tag — `voice_register` — is defined in `user_resonance_model.md`. Every corpus chunk must also carry this tag at ingestion time. The controlled vocabulary for voice register is: direct/challenging, warm/affirming, intellectual/measured, vulnerable/personal, expert/scientific.

### Resonance Profile

The User Problem Model defines the *stuck state* — what topic of insight to retrieve. It does not define the *form* of content that will land for a specific user in that state.

Two users in Direction Collapse may need completely different insight types and voice registers to experience a genuine shift. A user who receives analytical content well will not be moved by a vulnerable personal narrative. A user who needs emotional permission before any reframe can land will not be moved by an intellectual argument. Knowing the state is not enough to make a good retrieval decision.

The layer that defines what form of content lands for a given user is the **User Resonance Model**, defined in `user_resonance_model.md`. The User Problem Model and the Resonance Model are orthogonal: state tells the system *what* to retrieve; resonance tells it *how* to deliver it. Retrieval quality depends on both.

When designing the intake flow: collect enough signal to infer both the user's stuck state and their basic resonance profile. When designing retrieval: the retrieval query must support filtering by both state and resonance dimensions. State detection alone is not sufficient.

---

## Appendix: Quick Reference

| State | In one line | Primary content need |
|---|---|---|
| Direction Collapse | Lost the sense of what I'm building toward | How people construct direction when inherited goals run out |
| Engagement Drought | Used to care, now feel nothing | Re-engagement after motivation has faded — not tips, a real reframe |
| Inaction Loop | Know what to do, can't make myself do it | The psychology underneath the knowing-doing gap |
| Possibility Paralysis | Too many real options, choosing none | Reframing commitment; the cost of optionality |
| Identity Transition | Something ended and I don't know who I am now | Navigating the space between an old self and a new one |
| Momentum Gap | Everyone else is going somewhere and I'm not | Redirecting comparison-triggered anxiety into something directional |

---

## When to Revise This Document

Revise this model when:
- Real user intake data reveals patterns that don't fit the current taxonomy
- A new source is added whose content consistently addresses a state not currently covered
- Retrieval evaluation reveals that two states are being confused by the system in practice — this may indicate the states need clearer differentiation at the intake level
- The MVP states have been validated and scope expansion to non-MVP states is being considered
- User language in actual intake sessions differs significantly from the "how the user describes it" examples — update those examples to match real input patterns
