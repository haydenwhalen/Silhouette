# Silhouette — Component 9: Feedback / Quality Signal Loop

> **Summary:** This document defines how Silhouette learns from real usage. Component 7 (Presentation Layer) delivers an insight and asks "Did this land?" Component 9 is what happens with the answer — how that signal is collected, interpreted, classified by failure type, and routed into corpus improvement, retrieval tuning, resonance calibration, and product decisions. Without this component, Silhouette operates blind: it can produce results but has no honest basis for knowing whether those results work. With it, every session that produces feedback is a data point in a learning flywheel that improves future sessions.

> **How to use this document:** Read after all prior components, especially Component 3 (Retrieval Philosophy, which already defines session-level update rules and corpus gap detection), Component 6 (Retrieval Engine, which logs every retrieval decision), Component 7 (Presentation Layer, which defines the feedback prompt design), and Component 8 (Trust Architecture, which monitors behavioral trust signals that overlap with but are distinct from quality signals). This document operationalizes and extends the feedback handling sketched in those components.

> **Important constraint:** Silhouette is an intermittent-use, high-signal product. Users are not expected to return daily. The feedback loop must measure whether insights land — not whether users return frequently. Quality metrics optimized for daily engagement would measure the wrong thing and could distort product decisions.

---

## 1. Purpose and Scope

### What the Feedback / Quality Signal Loop Is

The Feedback / Quality Signal Loop is the system that answers Silhouette's most important operational question: **Is the product actually working?**

It does this by:
- Collecting the primary user signal ("Did this land?") and secondary implicit signals from every session
- Interpreting those signals correctly — distinguishing positive signal from polite response, noise from pattern, and retrieval failure from corpus failure from presentation failure
- Routing actionable signals to the right improvement destination: corpus, retrieval, resonance weights, presentation, or product
- Aggregating signals at the right level — SIO, state, source, system — before acting
- Defining the sample thresholds that make the signal meaningful enough to act on
- Producing the metrics that tell Silhouette's team whether quality is improving, stable, or degrading

### What the Feedback Loop Is Not

- **Not a user engagement system.** The loop does not track DAU, session frequency, push notification response rates, or gamified return mechanics. These are wrong metrics for an intermittent-use product.
- **Not a personalization engine.** Cross-session preference learning is a V2 concern. The MVP loop aggregates signals at the population level to improve the shared system, not to build individual user profiles.
- **Not a survey tool.** The loop does not append rating scales, open-field text prompts, or follow-up questions to the core experience. Every additional ask reduces signal quality by creating friction.
- **Not a real-time tuning system.** The loop produces signals that are reviewed and acted on by a human on a regular cadence — it is not an automated system that changes retrieval weights in response to individual sessions.
- **Not able to distinguish all failure types from feedback alone.** The feedback loop identifies patterns. Diagnosis requires combining feedback signals with retrieval logs, intake context, and human review.

### Why the Loop Is the Only Ground Truth

Every other component in Silhouette operates on assumptions: that the state taxonomy is right, that the corpus contains high-quality SIOs, that the matching algorithm finds the best one, that the framing makes it land. The feedback loop is the first place where reality checks those assumptions. Without it:
- Retrieval quality is guessed, not measured
- Corpus gaps are invisible until users leave without returning
- Resonance defaults are hypotheses that are never invalidated or confirmed
- Presentation failures look identical to retrieval failures

With it, Silhouette has the raw material to improve continuously without requiring constant product overhauls.

---

## 2. Feedback Signal Types

Silhouette collects two types of signals: explicit and implicit.

### Explicit Signals

Explicit signals are deliberate user responses. At MVP, there is exactly one explicit signal event per session.

| Signal | Trigger | What It Measures |
|---|---|---|
| `feedback_yes` | User selects "Yes" on "Did this land?" | Positive match quality signal |
| `feedback_different` | User selects "Show me something different" | Negative match quality signal |
| `feedback_none` | No response to "Did this land?" before session ends | Weak negative or disengagement signal |

**Note on `feedback_yes` reliability:** A "Yes" response does not guarantee a genuine aha moment. Users may respond positively out of politeness, because the insight was interesting rather than transformative, or because they disengaged before the prompt resolved. Dwell time is the primary disambiguator. See Section 5.

### Implicit Signals

Implicit signals are behavioral measurements that do not require the user to make a deliberate choice.

| Signal | Definition | What It Measures |
|---|---|---|
| `dwell_time_seconds` | Time from insight presentation to first action (feedback, close, or navigation) | Engagement depth; helps qualify explicit signals |
| `skip_without_response` | Session ends without any feedback response | Weak negative or trust/engagement issue |
| `second_retrieval_triggered` | User selected "Show me something different" and a second retrieval ran | Confirms active rejection, not just passive skip |
| `second_retrieval_feedback` | Response to second result's "Did this land?" | Differential signal: if second lands → first was wrong type/register |
| `session_abandoned_at_intake` | Session ends before any insight is shown | Trust or scope issue — not a retrieval signal |

### What Is Not Collected at MVP

- Open-field text ("What was off about this?") — high signal per response, but adds friction and is not needed for pattern detection at MVP scale
- Rating scales (1–5 on helpfulness, relevance, etc.) — adds survey feel, reduces response rate, produces finer-grained signal that cannot be acted on until volume is sufficient
- Follow-up session surveys — out of scope at MVP

---

## 3. Minimum Viable Feedback Prompt

The prompt is defined in Component 7. This section confirms the design choices and their rationale for the quality signal interpretation.

### The Prompt

```
Did this land?   [Yes]   [Show me something different]
```

### Why This Phrasing

- **"Did this land?"** asks whether the aha moment happened — not whether the content was useful, relevant, or interesting. This is the right question for Silhouette's core goal. "Helpful" would produce inflated positives. "Relevant" conflates topical match with experiential resonance. "Did this land?" is honest.
- **"Yes"** is the lowest-friction positive response. No multi-word commitment. No rating.
- **"Show me something different"** is honest about what happens next — it signals that rejection triggers another retrieval attempt, not just a logged failure. It also commits the user to continuing engagement, which is useful behavioral signal.

### Why Not a Third Option at MVP

Adding a third option ("Not quite," "Sort of," "Tell me more") converts a natural check-in into a survey. It also creates ambiguous middle signals that cannot be routed without more volume than MVP will produce. Two options maximize response rate and produce clean binary signal.

### Response Rate Target

Component 8 (Trust Architecture) flags response rates below 40% as a system-level concern. The target for MVP is **≥ 50% response rate** on the feedback prompt. Below 40% signals a trust or engagement problem upstream of feedback — not a feedback design problem.

---

## 4. Feedback Placement in the User Flow

Feedback placement is defined in Component 7, Section 14. This section confirms the decisions relevant to signal quality.

### Position: Immediately After the Insight

The feedback prompt appears as the final element of the 5-part presentation — after the "why this applies" sentence and source link. It does not appear:
- Before the user has seen the full insight (which would interrupt the reading experience)
- After a delay or scroll-gate (which reduces response rate)
- In a follow-up notification after session end (which introduces recall bias and reduces response rate to near-zero)

### Timing

The prompt is visible from the moment the insight is presented. It does not auto-dismiss or auto-submit. The user decides when to respond — or not.

### The "Show Me Something Different" Path

When the user selects the negative option, the feedback is logged immediately. A second retrieval runs with the rejected SIO excluded and a different `insight_type` and/or `voice_register` targeted. The second result is presented with the same structure. If the second result also receives a negative or no-response, the session ends gracefully — no third attempt.

**Why this path matters for signal quality:** The differential between first-result feedback and second-result feedback is the sharpest diagnostic signal for failure type. If the second result lands and the first did not, the first result's `insight_type` or `voice_register` was wrong — not the state classification or the corpus. This is Silhouette's primary method for distinguishing retrieval failure from resonance failure without open-field feedback.

---

## 5. Positive Feedback Interpretation

### What "Yes" Can Mean

A "Yes" response is not unambiguous. It can indicate:

1. **Genuine aha moment** — the insight shifted something; the user's understanding of their situation changed
2. **Strong resonance, softer shift** — the insight felt true and relevant but didn't necessarily change anything
3. **Polite acknowledgment** — the insight was acceptable; the user responded positively to avoid conflict
4. **Mild positive** — the content was good, not transformative

These four outcomes have different implications for retrieval quality. The system must use dwell time to segment them.

### Qualifying "Yes" with Dwell Time

Dwell time thresholds must account for excerpt length. At average adult reading speed (~220 words per minute), a 120-word excerpt takes approximately 33 seconds to read; a 180-word excerpt takes approximately 49 seconds. A flat dwell threshold ignores this variability.

**Excerpt-length-adjusted thresholds:**

| Excerpt Length | Strong Positive Dwell | Moderate Positive Dwell | Weak / Polite Positive Dwell |
|---|---|---|---|
| 75–120 words | ≥ 35s | 18–34s | < 18s |
| 120–180 words | ≥ 50s | 25–49s | < 25s |
| 180–250 words | ≥ 65s | 35–64s | < 35s |

The retrieval log should record both `dwell_time_seconds` and `excerpt_word_count` so the signal can be evaluated with length normalization.

| Signal Combination | Interpretation | Routing |
|---|---|---|
| `feedback_yes` + dwell ≥ strong threshold | Strong positive — insight held full attention before response | High-confidence positive signal for SIO, state, resonance profile |
| `feedback_yes` + dwell in moderate range | Moderate positive — read, responded positively | Moderate-confidence positive signal |
| `feedback_yes` + dwell below moderate threshold | Weak positive — may be polite or skimmed | Log only; do not count as quality confirmation until pattern across sessions |

**These thresholds are calibration hypotheses.** At MVP, log all dwell times with excerpt lengths and review the distribution after the first 50 sessions. If short-dwell "Yes" responses predict voluntary return at the same rate as long-dwell ones, the thresholds are not discriminating — flatten to a simpler binary. If they do discriminate, the thresholds are validated.

### What Positive Feedback Confirms (and Doesn't)

Positive feedback confirms that the insight, as delivered in this session, worked for this user. It does not confirm:
- That the same SIO will work for different users in the same state
- That the state classification was correct (a well-matched SIO can land even with a slightly wrong state detection)
- That presentation was the driver (vs. corpus or retrieval quality)

Strong positive signals (≥ 45s dwell + Yes) across multiple different users with the same `primary_state_tag` and `insight_type` confirm both retrieval quality and resonance profile appropriateness for that state.

---

## 6. Negative Feedback Interpretation

### What "Show Me Something Different" Can Mean

A negative response can indicate any of the following failure types:
1. **State misclassification** — the wrong stuck state was detected; the insight addresses a different situation entirely
2. **Resonance mismatch** — right state, wrong `insight_type` or `voice_register` for this user
3. **Corpus gap** — right state and resonance, but no SIO in the corpus is genuinely well-matched for this specific variant of the state
4. **Weak SIO quality** — the SIO was retrieved correctly but is not a high-quality insight
5. **Presentation failure** — the SIO was right, but the "why this applies" framing failed to connect it to the user's situation
6. **Inherent non-resonance** — the insight is genuinely good but not for this particular person's way of processing information

Without additional signal, a single negative response cannot be routed to a specific cause. The system must aggregate across sessions and use differential signals (second retrieval, state patterns) to isolate failure type.

### The Second Retrieval as Diagnostic Tool

When "Show me something different" triggers a second retrieval:
- If the second result receives "Yes" → the first result's `insight_type` or `voice_register` was wrong. Resonance failure, not state or corpus failure.
- If the second result also receives "Show me something different" → the state, corpus, or presentation is the issue. Log both rejections as a probable corpus gap or state misclassification for the detected state.
- If the second result receives no response → ambiguous. Log as double-skip, treat as soft corpus gap signal.

### Interpreting Negative Feedback at Scale

A single negative response is noise. Patterns are signal.

| Pattern | Likely Failure Type |
|---|---|
| Same state receiving > 35% negative across many users | State-level corpus gap or consistent resonance mismatch |
| Same SIO receiving > 50% negative across different users | Weak SIO quality — flag for re-review or removal |
| Same `insight_type` + state combination consistently negative | Resonance profile miscalibration for that state default |
| Negative rates similar across all states | Presentation or intake failure, not corpus or retrieval |
| High negative rate on first sessions, declining over time | Normal cold-start signal; resonance defaults need calibration |

---

## 7. No-Response Interpretation

### What No Response Means

When the user exits a session without responding to "Did this land?", there are several possible explanations:
1. The insight arrived and the user absorbed it without needing to respond — their engagement was complete
2. The user read the insight and moved on without committing to a judgment
3. The insight did not land but the user chose not to engage with the feedback prompt
4. The user was interrupted or distracted before responding

Unlike "Show me something different," a skip is not active rejection. Unlike "Yes," it is not positive confirmation. It is a null signal that should be treated as weak negative until sufficient volume reveals whether skip-rate correlates with return rate (if users who skip return later at the same rate as users who say "Yes," skips may be closer to neutral than negative).

### Implicit Signal from Dwell Time + Skip

| Signal Combination | Interpretation |
|---|---|
| `skip_without_response` + `dwell_time ≥ 45s` | Absorbed and moved on — possibly positive; treat as weak neutral |
| `skip_without_response` + `dwell_time 20–44s` | Read, then disengaged — weak negative |
| `skip_without_response` + `dwell_time < 20s` | Likely disengaged before absorbing — moderate negative |

### Skip Rate as a System-Level Signal

If the skip rate is consistently above 50% (i.e., the majority of sessions produce no feedback response), this is a presentation or trust problem — not a signal to interpret per session. High skip rates indicate:
- The feedback prompt is not visible enough or positioned poorly (presentation issue)
- The user doesn't understand what "Did this land?" is asking (copy issue)
- The user has disengaged before reaching the prompt (insight didn't land, or it was too long to read)

A skip rate above 60% at MVP is a flag for Component 7 and Component 8 review, not for Component 9 tuning.

---

## 8. Feedback Routing Map

Every session produces one or more signals. Each signal type has a defined routing destination.

```
Session completes
       │
       ├── feedback_yes (+ dwell data)
       │         ├── strong positive (≥45s) → SIO positive registry
       │         │                          → State resonance confirmation
       │         │                          → Resonance profile reinforcement
       │         └── weak/moderate positive → Logged, no immediate action
       │
       ├── feedback_different
       │         ├── First rejection logged → SIO negative count incremented
       │         │                          → State-level rejection count incremented
       │         └── Second retrieval outcome:
       │                   ├── Second lands → First = resonance failure → resonance review queue
       │                   └── Second fails → Probable corpus gap → corpus expansion backlog
       │
       ├── skip_without_response
       │         ├── High dwell → Weak neutral, log only
       │         └── Low dwell  → Soft negative, increment SIO soft-negative count
       │
       └── session_abandoned_at_intake
                 → Trust / engagement signal (Component 8 territory, not C9)
                 → Log separately; do not route into retrieval quality
```

### Routing Destinations

| Destination | What Gets Routed There | Who Reviews |
|---|---|---|
| **SIO review queue** | SIOs with > 50% negative rate at n ≥ 10 | Human corpus reviewer |
| **Corpus expansion backlog** | State + variant combinations with consistent corpus gap signal | Corpus curator |
| **Resonance profile review** | State resonance defaults with > 40% negative rate at n ≥ 15 | Retrieval/product team |
| **Retrieval config review** | Consistent pattern of wrong-type retrieval (second result outperforming first) | Retrieval team |
| **Presentation review** | Positive SIO ratings in offline evaluation + negative product feedback (possible framing failure) | Product/UX team |
| **Trust/intake review** | High abandonment at intake, low word count, high skip rate | Component 4/8 owners |

---

## 9. Corpus Improvement Signals

The corpus is the ceiling of retrieval quality. Component 9's most important long-term function is identifying where the corpus needs to grow, improve, or prune.

### Corpus Gap Detection

A corpus gap occurs when the system cannot find a well-matched SIO for a legitimate user need. Gaps are detected through three signals:

**1. Pool-size safety clause triggers** (defined in Component 3)
When fewer than 5 SIOs pass the state filter for a given `primary_state_tag`, the system expands to cross-state retrieval. Each trigger is logged as a potential corpus gap signal. If the same state triggers this clause in 3+ sessions within a two-week period, it is added to the corpus expansion backlog with priority.

**2. Double-rejection patterns**
When a user rejects both the first and second result, and both were retrieved for the same `primary_state_tag`, this is logged as a probable corpus gap for that state variant. If 3+ users in the same state produce double rejections within a two-week period, the state is flagged for corpus expansion review.

**3. Consistent state-level negative rate**
If a `primary_state_tag` has a negative response rate > 35% at n ≥ 20 sessions, the corpus for that state is under-performing. This may indicate:
- Insufficient SIO count for the state (need more sources)
- Low-quality SIOs for the state (need better curation)
- A specific state variant (e.g., `direction-collapse/post-achievement`) that is not well-represented

### SIO-Level Corpus Signals

Individual SIOs also generate quality signals.

| Signal | Threshold | Action |
|---|---|---|
| SIO negative rate > 50% | n ≥ 10 sessions | Flag for human re-review; consider removal or re-tagging |
| SIO negative rate > 30% | n ≥ 20 sessions | Add to watchlist; review if threshold increases |
| SIO positive rate ≥ 70% | n ≥ 10 sessions | Mark as high-performing; prioritize for similar state/resonance combinations |
| SIO never retrieved | n/a after 30 sessions | Review tagging — may be miscategorized or unreachable by current retrieval logic |

### Corpus Expansion Prioritization

When signals identify corpus gaps, the expansion backlog should be prioritized by:
1. **State coverage gap** (a state that consistently triggers pool-size clause or double rejections) — highest priority
2. **State variant gap** (a specific sub-variant of a state with high negative rates) — high priority
3. **Resonance gap** (a state that has SIOs but systematically lacks a needed insight_type or voice_register) — medium priority
4. **General quality improvement** (SIOs with high negative rates that need replacement) — lower priority

---

## 10. Retrieval Tuning Signals

The retrieval engine's behavior is governed by parameters in `RETRIEVAL_CONFIG` (defined in Component 6). Component 9's signals can inform adjustments to those parameters, but only when signal volume is sufficient and the failure mode is clearly identified.

### Parameters That Can Be Tuned Based on Feedback

| Parameter | Current Default | Feedback Signal That Informs Tuning |
|---|---|---|
| Resonance boost weights (`insight_type`, `voice_register`) | Equal weights at MVP | Consistent negative on one insight_type for a state → reduce that type's default boost |
| State confidence thresholds (high/moderate/low cutoffs) | Defined in C4 | High state-confidence sessions with high negative rates → may indicate over-confident classification |
| Pool-size safety clause threshold (5 SIOs) | 5 | If expansions consistently produce no improvement → raise threshold |
| Second retrieval `insight_type` switching logic | Always try different type | If second results rarely land either → issue is state or corpus, not type |

### What Retrieval Tuning Is Not

Retrieval tuning is not a response to individual session feedback. A single negative response from one user does not justify changing any parameter. Tuning decisions require:
- A clear failure pattern (not a single instance)
- Sufficient volume at the relevant level (state, SIO, resonance profile) — see Section 13
- Human review of the pattern before any parameter change
- Logging of the change and the expected improvement for later validation

### Retrieval Failure vs. Corpus Failure

These two failure types produce similar signals (high negative rates) but require different responses. Distinguishing them:
- **Retrieval failure:** The corpus contains well-matched SIOs for this state, but the engine is not selecting them. Diagnosis: review retrieval logs for sessions in this state — is the top-ranked SIO actually the best available candidate?
- **Corpus failure:** The corpus does not contain well-matched SIOs for this state. Diagnosis: manually review all SIOs tagged to this state — are any of them genuinely strong matches? If not, this is a corpus problem.

If retrieval logs show the engine ranking and selecting the best available SIO, and that SIO is still producing negative feedback, the problem is the corpus — not the algorithm.

---

## 11. Resonance / Personalization Signals

### What Resonance Signals Tell the System

The resonance model (defined in the User Resonance Model) has two dimensions: `insight_type` (reframe, permission, mechanism, story) and `voice_register` (direct/challenging, warm/affirming, intellectual/measured, vulnerable/personal, expert/scientific). At MVP, the system uses default resonance profiles per state (defined in Component 3) because no user-level profile exists.

Feedback signals are the raw material for testing whether those defaults are correct and, eventually, for building lightweight preference signals at the user level.

### Default Resonance Profile Validation

Component 3 established three default resonance hypotheses for MVP states:
- Direction Collapse → reframe + intellectual/measured
- Engagement Drought → mechanism + expert/scientific
- Inaction Loop → story + direct/challenging

These are hypotheses. Component 9 validates or invalidates them.

**Validation criteria:** If sessions matching the default resonance profile (e.g., `insight_type = reframe` for Direction Collapse) produce positive rates ≥ 60% at n ≥ 15, the default is confirmed.

**Invalidation criteria:** If sessions matching the default resonance profile produce negative rates > 40% at n ≥ 15, the hypothesis is invalidated. Review the distribution of positive sessions for that state — which insight_type and voice_register are the positive sessions using? Update the default.

### MVP Resonance Personalization (Within-Session)

At MVP, the only personalization that happens is within a single session: if the first result is rejected, the second retrieval attempts a different `insight_type` and/or `voice_register`. This is the minimal form of resonance adaptation.

### V2 Resonance Personalization (Cross-Session — Deferred)

Cross-session resonance learning requires user identification and profile storage, which are deferred to V2. When implemented, the rules from Component 3 apply:
- 2+ strong positive signals with the same `insight_type` → begin treating as mild preference
- 1 negative from a `voice_register` → slight downweight
- 3+ negatives from the same register → soft exclusion, flag for human review

**Why deferred:** At MVP session volume, personalization from one or two sessions is more likely to overfit than to improve retrieval. Population-level pattern detection is the right priority first.

---

## 12. Presentation Quality Signals

### Isolating Presentation from Retrieval

Presentation failure occurs when the retrieved SIO is well-matched but the framing makes it fail to land. This is the hardest failure type to detect from feedback alone because a presentation failure looks identical to a retrieval failure in the signals.

The primary diagnostic: if the same SIO performs significantly better in one session than another, and the retrieval inputs (state, confidence, resonance) were similar, the difference may be in the framing — specifically the "why this applies" sentence, which is generated per-session.

### Presentation Quality Detection Approaches

**1. Offline evaluation (Component 7 evaluation plan):** The strongest method for detecting presentation failure is the offline evaluation defined in Component 7, Section 17. If gold-set SIOs score well in controlled evaluation but produce negative feedback in live sessions for similar queries, framing may be the variable.

**2. SIO quality vs. session quality comparison:** If a SIO that evaluators rate highly (in offline evaluation) is producing negative feedback in live sessions, the mismatch warrants investigation. Check the "why this applies" sentences generated for those sessions — are they specific or generic? Topical or personal?

**3. Presentation anti-pattern auditing:** On a regular cadence (monthly at MVP), audit a random sample of "why this applies" sentences generated in sessions that received negative feedback. Are banned patterns (defined in Component 7, Section 13) appearing? Is the framing specific or generic?

### What Component 9 Does Not Do for Presentation

Component 9 does not rewrite or score "why this applies" sentences in real time. Presentation quality improvement is a human review process, not an automated feedback loop. The signals Component 9 provides are inputs for that review — not automated corrections.

---

## 13. Sample Size and Confidence Thresholds

Acting on small samples produces false patterns and bad tuning decisions. The following thresholds define when a signal is large enough to act on.

### Per-SIO Thresholds

| Action | Required Sample | Trigger Condition |
|---|---|---|
| Flag SIO for watchlist | n ≥ 5 sessions | Negative rate > 60% |
| Flag SIO for re-review | n ≥ 10 sessions | Negative rate > 50% |
| Remove SIO from corpus | n ≥ 15 sessions | Negative rate > 50% + human reviewer confirms weak quality |
| Mark SIO as high-performing | n ≥ 10 sessions | Positive rate ≥ 70% (with ≥ 50% strong positive via dwell) |

### Per-State Thresholds

| Action | Required Sample | Trigger Condition |
|---|---|---|
| Flag state for monitoring | n ≥ 10 sessions | Negative rate > 40% |
| Add state to corpus expansion backlog | n ≥ 20 sessions | Negative rate > 35% |
| Invalidate resonance default for state | n ≥ 15 sessions with default resonance profile | Negative rate > 40% on default-resonance sessions |
| Confirm resonance default for state | n ≥ 15 sessions with default resonance profile | Positive rate ≥ 60% on default-resonance sessions |

### Per-Source Thresholds

| Action | Required Sample | Trigger Condition |
|---|---|---|
| Flag source for content quality review | n ≥ 20 sessions across that source's SIOs | Source-attributed SIOs average negative rate > 45% |
| Remove source from active retrieval | n ≥ 30 sessions + human review | Source-attributed SIOs consistently below acceptable match threshold |

### System-Level Thresholds

| Metric | Threshold for Review |
|---|---|
| Overall positive rate (feedback_yes / total with response) | Below 40% at n ≥ 50 sessions |
| Feedback response rate | Below 40% at n ≥ 50 sessions |
| Pool-size safety clause trigger rate | Above 30% of sessions at any state |
| Double-rejection rate | Above 20% of sessions system-wide |

### Why These Thresholds

These thresholds are starting hypotheses calibrated against statistical signal reliability, not empirical evidence from Silhouette's own history (which doesn't yet exist). At n=10 with a 50% negative rate, the 95% confidence interval is approximately 19–81% — wide enough to avoid action. At n=15 with 50% negative, the interval narrows to approximately 26–74%. At n=20 with 35% negative, the interval is approximately 17–57%. The thresholds are set conservatively to avoid false tuning decisions at low volume.

**Review trigger:** After the first 100 sessions with feedback data, review the threshold calibration. If many SIOs are flagged that turn out to be false positives upon human review, raise the thresholds. If clear failure patterns are being missed, lower them.

### Cold-Start Period

For approximately the first 20–30 sessions, no threshold-based action is appropriate. Session volume is too low for patterns to emerge reliably. During the cold-start period:
- **Log everything** — don't skip logging to simplify the build; the cold-start data is the first calibration material
- **Do not tune retrieval parameters** — changing weights from 10 sessions produces noise-based tuning
- **Do watch for obvious outliers** — a SIO that receives 5 negatives in its first 5 retrievals is a signal worth investigating manually, even below threshold
- **Do track pool-size safety clause triggers** — if a state is triggering the clause in the cold-start period, the corpus for that state was under-built before launch

**Cold-start end condition:** After 30 sessions with feedback responses, begin applying thresholds. Flag but do not act on patterns observed before this point without human review of the raw session logs.

---

## 14. Quality Metrics and Dashboards

### The Right Metrics for an Intermittent-Use Product

Silhouette is not a daily-use product. Users may return every few weeks or months when a relevant need arises. The following metrics are meaningful for this usage pattern.

**Do not use:** DAU, D1/D7/D30 retention, session frequency, push notification response rate, engagement streak. These metrics measure daily habit formation — the wrong product goal.

### MVP Quality Metrics

| Metric | Definition | Target (MVP) | Review Cadence |
|---|---|---|---|
| **Insight landing rate** | `feedback_yes` / total sessions with feedback response | ≥ 55% | Weekly |
| **Strong positive rate** | (`feedback_yes` + `dwell ≥ 45s`) / total sessions with feedback | ≥ 30% | Weekly |
| **Session completion rate** | Sessions that reach the insight + feedback prompt / total sessions started | ≥ 70% | Weekly |
| **Feedback response rate** | Sessions with any feedback response / total sessions that reached prompt | ≥ 50% | Weekly |
| **Double-rejection rate** | Sessions with two consecutive negative responses / total sessions | < 20% | Weekly |
| **Corpus gap rate** | Sessions triggering pool-size safety clause / total sessions | < 30% | Weekly |
| **State coverage balance** | % of sessions per state that retrieved a strong match (≥ 48/60) | ≥ 60% per state | Biweekly |
| **Voluntary return rate** | % of users who return without a prompt, 30–60 days after first session | ≥ 20% | Monthly |

### Voluntary Return Rate — The Long-Term Signal

Voluntary return rate (30–60 day window) is the strongest long-term indicator of product value for an intermittent-use product. If Silhouette is genuinely producing aha moments, users come back when they need it again — not because of notifications, streaks, or gamification.

A 20% voluntary 30-day return rate means 1 in 5 users returns on their own within a month. That is a meaningful benchmark for a product without engagement mechanics. Below 10% warrants investigation. Above 30% suggests genuine value delivery.

**Measurement without user accounts:** Silhouette's MVP may not require account creation before the first session. In that case, voluntary return is approximated using device-level or browser-level session continuity (persistent session token stored in local storage or a cookie). This approach undercounts returns (users on different devices won't match) but provides a directional signal. The return rate metric should be noted as a lower bound when measured this way. If account creation is implemented even lightly (e.g., optional email save), tracked return becomes more reliable. This is a product decision that affects measurement fidelity — Component 8 (Trust Architecture) governs whether and when to ask for an email or account.

### What Healthy vs. Concerning Looks Like

**Healthy state:**
- Insight landing rate ≥ 55%
- Feedback response rate ≥ 50%
- Corpus gap rate < 20%
- Voluntary return rate ≥ 20% at 30 days

**Concerning state (investigate cause before acting):**
- Insight landing rate < 40% — retrieval quality issue or trust issue (check abandonment rate)
- Feedback response rate < 40% — presentation or trust issue (check intake abandonment separately)
- Corpus gap rate > 40% — corpus under-built for active states
- Double-rejection rate > 25% — systematic state classification or corpus coverage problem

**Diagnostic pair:** Low insight landing rate + high session completion rate → retrieval problem. Low insight landing rate + low session completion rate → trust or intake problem (investigate Component 4 and 8 metrics first).

---

## 15. Failure Taxonomy

The following taxonomy maps failure types to their diagnostic signals, likely causes, and routing destinations. When a pattern is identified, this taxonomy guides the investigation before any change is made.

### Type 1: Misclassification Failure

**What it is:** The user's stuck state was detected incorrectly. The retrieved insight addresses a different state than the one the user is actually experiencing.

**Signals:**
- User describes a clearly different situation in the second retrieval prompt (if they engage with it)
- State-level negative rates are high, but neighboring states perform better in similar-wording sessions
- Double-rejection rate is high for a specific state, while corpus has adequate SIO count

**Cause:** Intake classification logic (Component 4) is failing on specific input patterns.

**Routing:** Component 4 review. Examine the intake text from flagged sessions. Are they genuinely ambiguous, or is the classifier systematically wrong on a specific pattern?

---

### Type 2: Corpus Gap Failure

**What it is:** The state is correctly identified, but the corpus does not have a well-matched SIO for this specific variant of the user's situation.

**Signals:**
- Pool-size safety clause triggered frequently for a state
- Double-rejection rate high for a state, second result also fails
- Retrieval logs show the engine selecting the top available SIO, but its well-matched score is marginal (36–42/60)

**Cause:** Not enough SIOs for this state, or the SIOs that exist are not specific enough.

**Routing:** Corpus expansion backlog. Identify which state variant needs more coverage and prioritize source ingestion accordingly.

---

### Type 3: Retrieval Failure

**What it is:** The state is correct, the corpus contains well-matched SIOs, but the engine is not selecting the best one.

**Signals:**
- Retrieval logs show a higher-scoring SIO was available but a lower-ranked one was returned
- Changing retrieval parameters (in an experiment) improves results without corpus changes
- Human review of rejected sessions identifies available SIOs that would have been stronger matches

**Cause:** Scoring weights, semantic similarity thresholds, or boost caps in RETRIEVAL_CONFIG are miscalibrated.

**Routing:** Retrieval config review. Analyze the scoring breakdown for failing sessions.

---

### Type 4: Resonance Failure

**What it is:** The state is correct, the corpus is adequate, the SIO is retrieved correctly, but the `insight_type` or `voice_register` does not match how this user processes information.

**Signals:**
- First result receives negative, second result (different insight_type or voice_register) receives positive — differential signal
- State-level negative rates concentrated in one insight_type or voice_register
- Default resonance profile for a state shows > 40% negative rate at n ≥ 15

**Cause:** The default resonance profile for this state is wrong, or this user's resonance preferences differ from the population default.

**Routing:** Resonance profile review. Update the state default if the invalidation threshold is reached.

---

### Type 5: Presentation Failure

**What it is:** The SIO is well-matched and the resonance is correct, but the framing fails to connect the insight to the user's situation.

**Signals:**
- Same SIO performs well in offline evaluation but produces negative feedback in live sessions
- Human review of the "why this applies" sentences for failing sessions reveals generic or topical framing (not specific to speaker's story)
- Anti-patterns from Component 7 Section 13 appearing in failing sessions

**Cause:** The "why this applies" sentence generation is using topical matching rather than specific story-level connection.

**Routing:** Presentation quality review. Audit framing sentences from failing sessions. Update framing generation logic.

---

### Compound Failures

Real failures are often multi-causal. A slightly uncertain state classification + moderately thin corpus + generic "why this applies" framing can each be subcritical in isolation but together produce a consistent negative experience. The failure taxonomy above treats each type as isolated for diagnostic clarity, but compound failures are common.

**Diagnostic protocol for compound failures:**

When a state shows consistent negative rates that don't clearly map to a single failure type, apply this elimination sequence:

1. **Check state classification first.** Review the intake text from 5–10 flagged sessions. Does the user's description actually fit the detected state? If not → misclassification failure (Type 1). Investigate Component 4 before proceeding.

2. **Check corpus quality for that state.** Manually review all SIOs tagged to the state. Are any of them genuinely strong matches for the kind of input appearing in flagged sessions? If no SIO in the corpus is a strong match → corpus gap failure (Type 2). Investigate corpus before retrieval.

3. **Check which SIO was retrieved.** Review the retrieval log for flagged sessions. Was the highest-scored available SIO selected? If a better SIO was available but not selected → retrieval failure (Type 3). Investigate scoring weights.

4. **Check resonance alignment.** For flagged sessions where the retrieved SIO seems like a reasonable match but still failed — look at `insight_type` and `voice_register`. Does the second-retrieval differential signal suggest a resonance mismatch? If yes → resonance failure (Type 4).

5. **Check framing.** If corpus, retrieval, and resonance all look correct, review the "why this applies" sentence from flagged sessions. Is it specific or generic? → Presentation failure (Type 5).

When multiple factors contribute, address the most upstream failure first. State classification errors cascade through every downstream step — fixing corpus quality for the wrong state doesn't help.

### Type 6: Trust Failure

**What it is:** The user does not trust the product enough to be honest in the intake, which produces a sanitized input that leads to a mediocre retrieval.

**Signals:**
- Median intake word count < 30 words (Component 8 signal)
- Session abandonment at intake > 20% (Component 8 signal)
- Low feedback response rate (< 40%) despite reasonable insight landing rates in sessions that do respond

**Cause:** Component 8 (Trust Architecture) issue, not a retrieval or corpus problem.

**Routing:** Component 8 and Component 4 review. Trust failures produce surface-level inputs that look like retrieval failures but aren't.

---

## 16. MVP Feedback Loop Recommendation

### What to Build at MVP

**Logging (required):**
- Log every session with: `session_id`, `detected_state`, `state_confidence`, `sio_id_returned`, `insight_type_returned`, `voice_register_returned`, `match_score`, `retrieval_mode`, `feedback_response` (`yes` / `different` / `none`), `dwell_time_seconds`, `second_retrieval_triggered`, `second_sio_id` (if applicable), `second_feedback_response` (if applicable), `pool_size_safety_clause_triggered`

**Monitoring dashboard (manual at MVP, tooling later):**
- Weekly review of the 8 MVP quality metrics in Section 14
- Per-state quality breakdown by session count and feedback rate
- SIO-level negative rate watchlist (any SIO at > 30% negative, n ≥ 10)

**Corpus gap log:**
- Every pool-size safety clause trigger is added to a running log with `state`, `date`, `pre_filter_pool_size`
- Reviewed bi-weekly; triggers on same state within 2-week window → corpus expansion backlog

**Human review cadence and protocol:**

*Weekly (reviewer: retrieval/product lead)*
1. Pull quality metrics dashboard — record the 8 MVP metrics
2. Flag any metric outside target range; note whether it's a new deviation or continuing trend
3. Review SIO watchlist: any SIO crossing the flag threshold this week? Add to re-review queue.
4. Review state-level negative rates: any state crossing the monitoring flag threshold?
5. Log decisions made (none, watchlist addition, re-review scheduled) — do not tune parameters without biweekly review
6. Time budget: 30–45 minutes

*Biweekly (reviewer: retrieval/product lead + corpus curator)*
1. Review corpus gap log — any state triggering pool-size clause 3+ times in the past 2 weeks?
2. Update corpus expansion backlog with priority ranking per Section 9
3. Review SIO re-review queue — manually assess flagged SIOs against the original well-matched rubric; decide: retain, re-tag, or remove
4. If resonance default invalidation threshold reached for any state: discuss update with decision log entry
5. Log all changes made (SIO removals, corpus backlog updates, resonance default changes); note expected effect and when to check for improvement
6. Time budget: 60–90 minutes

*Monthly (reviewer: product team)*
1. Pull 20 random sessions from negative-feedback pool — review full intake text + "why this applies" sentence
2. Rate each sentence against a two-question rubric: (a) Is it specific to the speaker's story or generic to the topic? (b) Does it contain any banned patterns from Component 7 Section 13?
3. Calculate rate of specificity failures and banned pattern occurrences
4. If either rate exceeds 30% of sampled sessions: flag Component 7 framing logic for revision
5. Review voluntary return rate (30-day cohort); compare to prior month
6. Time budget: 90–120 minutes

### What NOT to Build at MVP

- **No automated parameter tuning.** All changes to RETRIEVAL_CONFIG are human decisions after pattern review. Automated tuning at MVP volume risks overfitting.
- **No user-level preference profiles.** Cross-session personalization requires user identification, profile storage, and session volume per user that MVP will not have.
- **No open-field feedback prompt.** Too much friction; insufficient volume to process responses meaningfully.
- **No engagement mechanics.** No streaks, points, re-engagement emails, or return prompts. Voluntary return is the signal — engineering return undermines it.
- **No A/B testing infrastructure.** Not needed until session volume is sufficient to power a statistically valid test (approximately 100+ sessions per variant per state). Deferred to V2.

### The Minimum Viable Learning Flywheel

At MVP, the feedback loop produces learning through a simple human-in-the-loop process:

```
Sessions produce logs
       ↓
Weekly metric review (human)
       ↓
Pattern identified (SIO, state, resonance)
       ↓
Human investigation (log review + SIO inspection)
       ↓
Change decision (corpus, retrieval, or presentation)
       ↓
Change implemented and logged
       ↓
Effect monitored over next 2–4 weeks
```

This is slow by engineering standards but appropriate for MVP volume. The automation layer can be built once the pattern-detection logic is validated against real signal.

---

## 17. Open Questions

### Q1: How do we distinguish a polite "Yes" from a genuine aha moment at scale?

**Why it matters:** Polite "Yes" responses inflate the insight landing rate and can mask retrieval quality problems. If 30% of positive responses are polite positives, the metric is misleading.

**What would resolve it:** Compare `feedback_yes` + low dwell time vs. high dwell time against voluntary return rate. If high-dwell positives predict return and low-dwell positives don't, dwell time is a valid discriminator. If neither predicts return, the metrics need revision.

**Which component resolves it:** Session data from MVP usage; revisit threshold calibration after 100 sessions.

---

### Q2: What is the minimum voluntary return rate that validates the product is working?

**Why it matters:** If nobody comes back, the product may not be producing lasting value. But what's the right baseline for a product users are expected to use occasionally? 20% at 30 days is a hypothesis.

**What would resolve it:** Benchmark against comparable intermittent-use products (reading apps, reference tools, professional resources). Then calibrate based on whether returning users show higher quality metrics in their second session.

**Which component resolves it:** MVP usage data + competitive benchmarking.

---

### Q3: Should Silhouette ever ask for qualitative feedback?

**Why it matters:** Open-field feedback ("What was off about this?") is the highest-signal input for diagnosing failure type but adds significant friction. The absence of qualitative feedback means all failure diagnosis must be inferred from behavioral signals and retrieval logs.

**When to reconsider:** If double-rejection rate stays above 25% after 60 sessions and retrieval logs cannot identify the failure type from quantitative signals alone, a limited optional qualitative prompt ("Anything specific that didn't fit? (Optional)") might be worth testing.

**What would resolve it:** A/B test: qualitative prompt vs. no prompt on second-result negative sessions. Measure response rate and actionability of responses.

**Which component resolves it:** Product decision after MVP usage; inform Component 7 if prompt is added.

---

### Q4: At what session volume per user does cross-session resonance personalization become more reliable than population defaults?

**Why it matters:** If the population default for Direction Collapse (reframe + intellectual/measured) is consistently wrong for 30% of users, cross-session personalization could significantly improve retrieval quality. But personalization from 2–3 sessions may produce worse results than the default.

**What would resolve it:** Analysis of whether the insight_type and voice_register preferences of positive sessions in a user's first 3 sessions predict their preferences in sessions 4–10. If yes, 3 sessions is the learning threshold. If no, wait for 5–7.

**Which component resolves it:** V2 design decision; requires user identification and session history storage.

---

### Q5: How do we detect corpus quality degradation if the corpus expands rapidly?

**Why it matters:** As more SIOs are ingested (beyond the MVP 60-SIO corpus), average insight quality may decline if ingestion quality gates are not maintained. This would show up as a gradual decline in insight landing rate, but the cause would be corpus dilution, not retrieval failure.

**What would resolve it:** Track insight landing rate segmented by SIO `ingestion_date`. If newer cohorts of SIOs produce systematically worse rates than older ones, ingestion quality has declined.

**Which component resolves it:** Corpus / Ingestion Pipeline quality controls (Component 5); monitor at Component 9 level as a diagnostic.

---

### Q6: Should the feedback signal drive corpus prioritization, or should corpus decisions be editorially driven?

**Why it matters:** Feedback-driven corpus prioritization means building content for the states that users are actually stuck in. Editorial prioritization means building the strongest corpus for the states the team believes matter most. These may diverge — users may disproportionately show up in a state the team didn't prioritize, or feedback may show that states with thin coverage are underperforming even if the team expected them to be secondary.

**Current decision:** Feedback-driven prioritization for gap-filling (corpus expansion backlog), editorial judgment for initial corpus build. Revisit after MVP shows whether user state distribution matches the team's prior.

**Which component resolves it:** MVP data; revisit corpus strategy after first 100 sessions.

---

## When to Revise This Document

- After the first 50 sessions produce feedback data: review all thresholds in Section 13 against actual signal distribution
- After the first monthly metric review: update the quality targets in Section 14 if they are systematically unachievable or trivially exceeded
- After V2 planning: incorporate cross-session resonance personalization design into Section 11
- If an automated pattern detection layer is built: update Section 16 to reflect reduced human review requirements
- If open-field qualitative feedback is added: update Sections 2, 3, 7, and 12 accordingly
