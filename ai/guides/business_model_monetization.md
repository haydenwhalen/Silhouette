# Silhouette — Component 10: Business Model / Monetization

> **Summary:** This document defines how Silhouette could become financially sustainable without distorting what makes the product work. It is deliberately the last component. Business model decisions made before insight quality is validated tend to introduce perverse incentives that damage the core experience — engagement mechanics for an occasional-use product, volume metrics for a quality-first product, buyer-user misalignment for a trust-first product. This document's job is to think seriously about monetization while protecting the product from that trap.

> **How to use this document:** Read after all prior components. The constraints in Components 3, 7, 8, and 9 are not negotiable. Any monetization model that requires violating them is the wrong model. This document maps the option space, identifies the risks in each path, and proposes a validation sequence — not a final pricing decision.

> **What this document is not:** It is not a financial model. It is not a pricing deck. It is not final legal or licensing advice. It is not a final business model selection. It is the design constraint space within which those decisions must eventually be made.

---

## 1. Purpose and Scope

### Why Monetization Is Component 10

Silhouette's system map places Business Model / Monetization last for a deliberate reason: **the business model should not be allowed to distort the product before the core experience is validated.**

This is easier said than done. The pressure to monetize early is real — from investors, from operational sustainability, from the founder's own anxiety. But the cost of premature monetization is high and often invisible: it introduces incentives that quietly reshape what gets built, what gets measured, and what gets optimized. A subscription product that needs to justify monthly charges optimizes for frequency of use. A volume-based B2B product optimizes for number of sessions logged. A freemium product with a limited free tier optimizes for conversion pressure. All three of these incentive structures are wrong for Silhouette.

Silhouette's product goal — producing a genuine aha moment in an occasional-use, high-vulnerability session — requires optimizing for session quality, not session volume. No business model that conflicts with that goal is viable in the long term, because a Silhouette with declining insight quality is a Silhouette with no users.

This document maps the option space carefully, defines the conditions under which each model becomes viable, and recommends a sequencing that protects the product from premature monetization pressure.

### What This Document Covers

- Product principles that no monetization model may violate
- Validation gates that must pass before monetization decisions are made
- Viable B2C models: analysis of fit, risk, and appropriate timing
- Viable B2B models: analysis of fit, risk, and the trust model implications
- Why the right metrics for Silhouette are not engagement metrics
- Pricing hypotheses for each model (labeled as rough hypotheses, not final decisions)
- Business model risks and perverse incentive patterns to monitor
- Trust and privacy implications of each model
- Content licensing implications of commercial-scale use
- A sequenced monetization experiment roadmap
- MVP recommendation: what to decide now, what to defer

---

## 2. Product Principles That Monetization Must Not Violate

These principles are derived from prior components. A monetization model that requires violating any of them is not a viable model for Silhouette — it is a model for a different product.

### Principle 1: Session quality over session volume.

The product is designed to be used when the user is in a genuine stuck moment — not daily. Monetization must not create pressure to manufacture artificial use occasions. This means: no streak mechanics, no push notifications designed to manufacture return sessions, no "you haven't checked in this week" language, and no business model that requires high session frequency to justify its price.

**What this rules out:** Business models where revenue per user depends on session count. Volume-based B2B contracts where the buyer pays per session logged. Any free-to-paid conversion mechanic that creates pressure to use the product before the user has a genuine need.

### Principle 2: User honesty is the product's primary input.

If the user sanitizes their intake — describes their situation carefully rather than honestly — retrieval fails. Intake honesty depends on trust. Trust depends on the user believing that their disclosure is safe and serves only their interests. Any business model that introduces doubt about who benefits from the user's disclosure damages the core input quality.

**What this rules out:** B2B models where the user's employer or institution pays for access and the user is aware of this relationship. Any model where session-level data (what states were detected, what was retrieved) is visible to a third-party buyer.

### Principle 3: Attribution is the product's trust signal and differentiator.

Silhouette is not an AI-generated advice product. Its value comes from the human-sourced content in its corpus. Any monetization model that incentivizes replacing curated human-sourced content with AI-generated content to reduce costs — or that weakens the attribution model to simplify licensing — destroys the product's differentiation.

**What this rules out:** Sponsored content, brand partnerships where a company's spokesperson is inserted into the corpus to promote their perspective, or any model where content decisions are made on commercial rather than editorial grounds.

### Principle 4: The feedback loop measures whether the product works — not how often it is used.

Component 9 defines the right metrics: insight landing rate, voluntary return rate, strong positive rate. These are quality metrics, not engagement metrics. The business model must not introduce a parallel set of metrics that compete with or override these. If an investor or B2B buyer insists on DAU, session frequency, or streak rates as success metrics, those metrics will eventually distort what the team builds.

**What this rules out:** Business models that require reporting engagement metrics to a buyer or investor that do not align with Silhouette's quality metrics.

### Principle 5: The corpus is the moat — it must remain editorially independent.

The corpus's value comes from the fact that it reflects genuine editorial judgment: the sources were selected because they produce high-quality, state-relevant insights, not because they have commercial relationships with Silhouette. The moment commercial considerations influence which sources are included or prioritized, the editorial moat degrades.

**What this rules out:** Affiliate content arrangements, sponsored source inclusions, revenue-sharing deals that give sources influence over what SIOs are created from their content.

---

## 3. Validation Gates Before Monetization

Monetization decisions made before these gates are passed are premature. The risk is not that the product will fail to earn money — it's that monetization pressure will reshape the product before anyone knows whether it works.

### Gate 1: Insight quality is validated at baseline.

**Definition:** The product reliably produces a genuine aha moment across at least two of the three MVP priority states (Direction Collapse, Engagement Drought, Inaction Loop).

**Measurement:** Component 9's insight landing rate ≥ 55% across all three states, at n ≥ 30 sessions per state. Strong positive rate ≥ 30%.

**Why this gate must come first:** If insight quality is not validated, every subsequent business model decision is built on a foundation that may need to be rebuilt. A subscription product launched before this gate passes will churn users who experience mediocre results. A B2B product sold before this gate passes will produce case studies of non-use.

**Approximate timeline:** After the corpus is built (Component 5), the retrieval engine is tuned (Component 6), and sufficient real-user sessions have run (approximately 90–150 sessions across the three MVP states).

---

### Gate 2: Voluntary return is established.

**Definition:** At least 20% of users return without prompting within 30–60 days of their first session.

**Measurement:** Component 9's voluntary return rate metric (Section 14), tracked using session continuity tokens at MVP, or user accounts if available.

**Why this gate matters for pricing:** The single most important question for subscription pricing is: "Does the user come back when they need it?" If voluntary return is below 15%, users are not finding the product valuable enough to keep in their behavioral repertoire — which means a subscription model will produce high churn even if the first session was good. A value proposition validated by voluntary return is a defensible subscription business. One without it is not.

**Approximate timeline:** Requires 30–60 days of live user data after Gate 1 is passed.

---

### Gate 3: The user identifies the product as categorically different.

**Definition:** In qualitative research or the evaluation protocol from Component 8, ≥ 75% of users can correctly describe what Silhouette does in their own words, and ≤ 15% misidentify it as therapy, a chatbot, or a motivational quote product.

**Why this gate matters for monetization:** Users who understand what Silhouette is can assign value to it. Users who have misidentified it are valuing something other than what it delivers. Willingness-to-pay research conducted before this gate passes will produce misleading signals.

**Approximate timeline:** Component 8 evaluation (Section 13) should be run before any pricing research. Assume 4–6 weeks of early user sessions.

---

### Gate 4: The content licensing risk is assessed and managed.

**Definition:** Legal review has determined what the commercial use of verbatim excerpts from the corpus sources means for Silhouette's legal exposure, and a licensing strategy is in place before the first paid transaction.

**Why this gate must precede monetization:** Operating on fair use and non-commercial attribution is defensible at low volume and zero revenue. The moment Silhouette charges money, the legal landscape shifts. Some sources (large media companies, major podcast networks) actively monitor for commercial use of their content without licensing. This must be resolved before any paid tier launches.

**Approximate timeline:** Legal review should begin in parallel with product development — not after the first user complains.

---

## 4. Possible B2C Models

### Model A: Freemium (Free First Session, Paid Continuation)

**Structure:** The user's first session is completely free — no account, no credit card, no friction. After the first session, a lightweight account creation is requested (email or SSO), and continued access requires a paid plan.

**Why this fits:** The first session is Silhouette's best argument for itself. The example insight format (Component 7) and the trust design (Component 8) are designed specifically to make the first interaction high-quality. Giving the first session away free maximizes the proportion of users who experience the product working before they're asked to pay.

**Revenue mechanism:** Subscription or session pack, after account creation.

**Risk: Free tier sets quality expectations the paid tier must match.** If the first session returns a mediocre insight (the corpus is thin, the state was misclassified), the user converts to "free trial gave bad results" — not "I'd like to pay for better results." The product must be good before the freemium mechanic is meaningful. This is why Gate 1 must pass before launching any freemium model.

**Risk: Conversion friction at the account creation step.** Requiring an account after the first session introduces friction at a vulnerable moment — the user just disclosed something personal, received an insight, and is now asked to commit. The ask must be designed around trust (Component 8 principles), not conversion optimization. "Save this to come back to it" is a better frame than "unlock unlimited access."

**The session continuity design:** The freemium model requires an explicit decision about what happens when a user without an account returns for a second session. Three options:

- *Option A: Session 2 is free, account creation gated to Session 3.* Gives users one additional experience before committing. Risk: delays conversion by a session; two free sessions increases the per-acquired-user cost.
- *Option B: Session 2 requires account creation, but first session result is shown as the reason to create one.* A session continuity token (stored in browser) preserves the Session 1 insight display and shows it alongside the account creation prompt: "Your Session 1 insight is saved — create an account to retrieve it in future sessions." This converts account creation from friction into continuity.
- *Option C: Session 2 is blocked without account.* Highest conversion pressure, most likely to feel extractive. Conflicts with the trust model. Not recommended.

Option B is the recommended design: the continuity token uses the product's own insight as the account creation incentive. The account prompt never says "upgrade to continue" — it says "this is yours, here's how to keep it."

**When appropriate:** After Gates 1 and 2 pass. This is the most natural B2C starting point.

**Rough pricing hypothesis (labeled as hypothesis):** Free first session. Paid continuation at $6–10/month or $50–80/year. Hypothesis only — requires willingness-to-pay research after Gate 3.

---

### Model B: Session Packs (Pay Per Block of Sessions)

**Structure:** Users purchase a pack of sessions (e.g., 5 or 10) upfront. Sessions are consumed on demand. No recurring subscription. No pressure to maintain frequency.

**Why this fits:** Session packs match the product's actual use pattern better than a subscription. Users in a genuine stuck moment are willing to pay for one focused intervention. A pack model says: "buy what you need, use it when you need it." This is honest about the product's intermittent nature and avoids the subscription guilt dynamic (paying monthly for something you use every six weeks).

**Revenue mechanism:** Pay once per pack. Repurchase when pack is exhausted.

**Risk: Irregular revenue.** Pack purchases are lumpy — they occur when users decide they need the product, not on a monthly cadence. This makes revenue predictability lower than a subscription model and may create investor concerns about revenue quality.

**Risk: Orphan sessions.** Users may buy a 10-session pack, use 3, and forget the rest — leading to either low perceived value-per-dollar (only 3 sessions from a 10-session purchase) or churn.

**Risk: Low barrier to not repurchasing.** When a pack runs out, the user must actively choose to repurchase. If their current moment has passed, they may not. A subscription keeps the product in the user's budget even between use occasions; a pack model requires re-commitment each time.

**When appropriate:** If Gate 2 fails to show adequate voluntary return — users who return voluntarily are good subscription candidates; users who don't return voluntarily may be better served by a low-stakes pack purchase when need arises again.

**Rough pricing hypothesis:** 5-session pack at $15–25 ($3–5/session). 10-session pack at $25–40. Hypothesis only.

---

### Model C: One-Time Purchase / Lifetime Access

**Structure:** A one-time payment for unlimited or capped-session access. No recurring billing.

**Why this fits:** The product's intermittent-use model creates subscription churn risk. A one-time purchase removes the monthly re-commitment cost and may produce stronger user commitment to actually using the product when needs arise.

**Revenue mechanism:** Single payment per user. Revenue from new user acquisition only.

**Risk: No recurring revenue.** One-time purchase models require constant new user acquisition to grow revenue. Without a subscription base, revenue is entirely acquisition-dependent and hard to predict or compound.

**Risk: Low price ceiling.** Users are willing to pay more in subscription installments than as a lump sum, particularly for a product they expect to use occasionally. A one-time price that feels high enough to be sustainable ($50–100) may feel too high for users who don't yet have a track record with the product.

**When appropriate:** As an early-access or founding member offer, before subscription infrastructure is built. Useful for the first 50–200 users who want to support the product. Not a scalable long-term model.

**Rough pricing hypothesis:** $40–70 lifetime access during early access. Hypothesis only.

---

### Model D: Low-Cost Subscription

**Structure:** A monthly or annual subscription at a price low enough to survive intermittent use without producing cancellation guilt.

**Why this fits:** If the voluntary return rate (Gate 2) is above 20% at 30 days, users are finding ongoing value in the product even without daily habit formation. A subscription model that acknowledges intermittent use — a $5–7/month price point that corresponds roughly to one or two coffee purchases — may produce low enough churn that recurring revenue is sustainable.

**Revenue mechanism:** Monthly or annual subscription.

**Risk: The Netflix cancellation problem.** Users who subscribe but use the product infrequently feel they're not getting value from their subscription — especially users who aren't in a stuck moment most months. This produces a predictable cancellation pattern: subscribe during a stuck moment, use 2–3 times, exit the stuck moment, cancel. Churn will be higher than products used daily unless the price is low enough that subscription retention doesn't require active use justification.

**Risk: Subscription pressure creating bad product incentives.** Once a subscription model is in place, there is implicit pressure to demonstrate ongoing value to subscribers — which can manifest as "weekly insights," "reflection prompts," or other engagement mechanics that contradict the product's design. The team must actively resist this pressure.

**When appropriate:** After Gates 1, 2, and 3 pass. Annual subscription pricing (which reduces the per-month churn surface) should be offered alongside monthly from the start.

**Rough pricing hypothesis:** $6–9/month or $50–70/year. Hypothesis only.

---

## 5. Possible B2B Models

### B2B Model A: Corporate Wellness / HR

**Structure:** Companies purchase access for their employees as part of a wellness or career development benefit. Billing is at the organizational level (per seat or per active user). Employees access Silhouette as a company-sponsored tool.

**The appeal:** B2B sales are often faster paths to revenue than consumer growth. A single enterprise deal replaces thousands of individual B2C conversions. HR and corporate wellness budgets are large and relatively stable.

**The trust model problem — and why it may be fatal for this product:**

When users know their employer is paying for Silhouette, several trust dynamics shift immediately:

1. **"Is my employer seeing what I type?"** Even if Silhouette's privacy is technically sound, the perception of employer visibility will cause self-censorship. An employee who is disclosing that they are in an Inaction Loop about leaving their current company — to a tool their current company is paying for — will sanitize their input. The result: the intake is dishonest, state classification fails, retrieval fails, and the aha moment doesn't happen.

2. **Reporting to the buyer:** In B2B relationships, the buyer (HR department) typically expects reporting on usage and outcomes. If Silhouette provides any session-level reporting to the employer (even anonymized aggregate), it introduces doubt about what the employer can see. That doubt is enough to damage intake honesty.

3. **Employer interest alignment:** An employer's interest in an employee's "career clarity" product may not align with the employee's interest. An employer might hope Silhouette helps employees become more engaged in their current role. An employee in an Inaction Loop about leaving might need exactly the opposite. If the employer ever perceives Silhouette as helping employees exit, the commercial relationship is at risk — creating pressure on Silhouette's editorial independence.

**When B2B wellness might be viable — carefully:**

The trust model conflict is not necessarily fatal if the product is offered with structural protections clearly visible to employees:
- No session-level data visible to the employer (technical guarantee, not just a policy)
- No aggregate reporting that could identify small groups
- The user initiates and controls their own account — the employer provides a code or subsidy, not an administered tool
- The employer "offers" Silhouette as a benefit; employees choose whether to use it — similar to how an EAP (Employee Assistance Program) is offered

Even with these protections, the trust problem may persist as a perception issue. Whether employees believe the privacy protections are real depends on the trust they have in their employer — not in Silhouette. This is a structural limitation.

**When appropriate:** Not in MVP. Possibly in V2, only if the employer-funded-but-employee-controlled model can be clearly designed, communicated, and verified. Requires significant trust design work in Component 8 before pursuing.

**Rough pricing hypothesis (hypothesis only):** $8–15/user/month, annual contract, minimum seat count. Or per-active-user billing to align with intermittent use.

---

### B2B Model B: Career Coaches and Independent Coaches

**Structure:** Coaches embed Silhouette as a tool they recommend or provide to their clients. Billing is at the coach level (a coaching practice subscription that includes client seats or session credits).

**Why this fits better than corporate wellness:**

The coach-user relationship has a fundamentally different trust structure than the employer-user relationship. A coach's interest is aligned with the client's growth, not with retaining the client in a specific role. Coaches who recommend Silhouette are doing so to provide value to the client — not to monitor them. This alignment makes the trust model less conflicted.

A coach who has used Silhouette themselves and found it valuable is the best distribution channel. Coaches frequently share tools they use with clients. A product that a coach vouches for carries trust transferred from the coach-client relationship — which is already a high-trust environment.

**What the coach-channel enables:** Warm referrals, validated testimonials from practitioners, a B2B revenue stream that doesn't compromise the user trust model, a customer (the coach) who understands and values insight quality rather than session volume.

**How coaches discover and adopt tools:**

Coaches do not find new tools through ads. The adoption path is almost always peer referral: a coach experiences a tool themselves, finds value in it, mentions it to a colleague or in a professional community, and it spreads through practitioner networks. The ICF (International Coach Federation) and its regional chapters, LinkedIn coaching communities, and coach-specific forums (Coaching Space, ICF Global) are the primary discovery channels. Cold outreach to coaches is low-ROI; warm introductions via the founder's existing network are the right starting point.

**The sequencing requirement — coaches must experience the product first:**

A coach who has not personally had an aha moment from Silhouette will not recommend it to clients. The first step in the coach channel is not selling a coach subscription — it is giving coaches access to the product as users. Coaches in the 28–40 age range often occupy the same stuck-moment territory as their clients (Direction Collapse, Engagement Drought) and are strong candidates for experiencing the product's core value before recommending it.

**Concrete 3-step outreach:**

1. *Identify 5–10 coaches in the founder's network* who serve the 22–32 demographic (career coaches, life coaches serving young professionals, executive coaches for early-career clients). Not Fortune 500 HR coaches — independent practitioners whose clients' problems overlap with Silhouette's MVP states.
2. *Offer free personal access* — not a client seat. Frame it as: "I'd love your perspective on whether this is something you'd consider sharing with clients." This is a research ask, not a sales ask. Coaches are accustomed to giving feedback on tools.
3. *If the coach finds personal value, offer a pilot coach subscription* — 5 client seats, 60-day structured pilot, feedback debrief at the end. The coach's willingness to pay should follow naturally from their own experience, not precede it.

**Risks:**
- Coaches have limited budgets. A $30–50/month coach subscription needs to demonstrate client value quickly.
- Coaches as a distribution channel require relationship-building — higher customer acquisition cost than direct B2C.
- Coach client volume is variable. A coach with 10 clients and a coach with 40 clients have very different usage economics.
- Independent coaches who experience the product personally may convert to direct B2C users rather than practice subscribers — which is fine for validation but doesn't build the coach channel.

**When appropriate:** After Gate 1 is passed and the product is clearly working. Personal access outreach to 3–5 coaches can begin earlier, during the free validation phase, as a qualitative feedback channel.

**Rough pricing hypothesis (hypothesis only):** $25–50/month for a coach subscription with up to 10 active client seats. Additional seats at $3–5 each. Hypothesis only.

---

### B2B Model C: Universities and Career Development Programs

**Structure:** Universities, career centers, or MBA programs provide Silhouette access to students as part of career development resources.

**Why this fits:** The 22–32 target demographic overlaps significantly with students in professional programs. Career centers have budgets for tools and resources. Students in professional programs often experience Direction Collapse (post-achievement flatness after completing a degree), Possibility Paralysis (which career path to choose), or Momentum Gap (watching peers land impressive roles).

**Risks:**
- Institutional sales cycles are long (6–18 months from introduction to contract). This is incompatible with MVP cash-flow needs.
- The buyer (university administration) and user (student) split creates the same trust model pressure as corporate wellness, though with lower stakes — students may not self-censor as strongly as employees.
- Reporting requirements from institutional buyers (demonstrate ROI to the provost's office) can conflict with the privacy model.

**When appropriate:** V2 or later, after the product is well-validated and B2C revenue is established. University partnerships may be more valuable as distribution and validation than as revenue at early stage.

---

### B2B Model D: Creator Partnerships (Revenue Sharing)

**Structure:** Rather than using creator content unilaterally, Silhouette establishes formal revenue-sharing arrangements with the source creators. A percentage of subscription revenue goes to creators whose content is in the active corpus.

**Why this might matter:**

This is not primarily a business model — it is a licensing and trust architecture. Creator partnerships serve several functions:

1. **Legal protection:** Revenue sharing converts potential copyright liability into a licensed commercial arrangement.
2. **Creator distribution:** Creators have audiences that overlap directly with Silhouette's target demographic. A creator who has a commercial relationship with Silhouette has an incentive to mention it.
3. **Editorial integrity:** Formalizing the creator relationship does not need to compromise editorial independence — the agreement can be structured as "revenue share for content already in the corpus based on editorial merit" rather than "pay to be included."
4. **Trust signal:** "The people whose insights you're receiving have agreed to be part of this" is a stronger attribution model than unilateral use.

**Risks:**
- Creator partnerships require outreach and negotiation. This is not a simple commercial arrangement.
- Some creators may demand editorial influence over which content is included — which conflicts with Principle 5.
- Revenue share rates must be established before scale makes them meaningful. Negotiating at zero-revenue with well-known creators is difficult.

**When appropriate:** Early and ongoing — the content licensing implications in Section 11 make this a prerequisite for commercial scale, not a nice-to-have.

---

## 6. Intermittent-Use Product Metrics

Standard startup metrics are optimized for daily-habit products. Silhouette is not one. Using the wrong metrics will produce bad decisions.

### Metrics That Are Wrong for Silhouette

| Metric | Why It's Wrong |
|---|---|
| **Daily Active Users (DAU)** | Silhouette is designed for occasional use — a high DAU would suggest either the product is being misused or the use case has expanded beyond its design intent |
| **D7 / D30 Retention** | Traditional retention measures whether users return on day 7 or day 30. For an intermittent-use product, users may not be in a stuck moment on day 7 or 30 — this measures need occurrence, not product quality |
| **Session frequency / week** | More sessions ≠ more value. A user who has one aha moment and doesn't need the product again for six weeks has been better served than a user who uses it weekly out of habit without breakthrough moments |
| **Streak count** | Streak mechanics are antithetical to Silhouette's purpose — they incentivize using the product when there is no genuine need |
| **Push notification response rate** | A product that needs notifications to create return sessions is a product that is failing to create voluntary return |
| **Time in app per session** | Longer time in app = worse for Silhouette (slower retrieval, more friction). The goal is under two minutes to value |

### Metrics That Are Right for Silhouette

These are drawn from Component 9 and adapted for the business model context.

| Metric | Definition | Target | Business Relevance |
|---|---|---|---|
| **Insight landing rate** | `feedback_yes` / sessions with feedback response | ≥ 55% | The primary product quality signal; the only metric that validates the subscription premise |
| **Strong positive rate** | High-dwell `feedback_yes` / total sessions | ≥ 30% | Separates genuine aha moments from polite responses; the metric that tracks genuine product differentiation |
| **Voluntary 30-day return rate** | Users returning unprompted within 30 days | ≥ 20% | The primary indicator that the product is worth paying for; the subscription retention proxy |
| **Voluntary 90-day return rate** | Users returning unprompted within 90 days | ≥ 35% | More appropriate than D30 for intermittent use — users with less frequent need will appear here |
| **Net Promoter Score (NPS)** | "How likely are you to recommend Silhouette to someone you know who is going through something similar?" | ≥ 40 | Word-of-mouth is the natural distribution channel for a product that works in a vulnerable moment — users don't search for it, they hear about it from someone who's used it |
| **Attribution trust rate** | % who believe the attribution is genuine (Component 8 eval) | ≥ 85% | Core differentiation; declining attribution trust = failing product |
| **Session completion rate** | Sessions that reach the insight / sessions started | ≥ 70% | Combines trust and intake quality; measures whether users who start the product trust it enough to finish |
| **Corpus gap rate** | Sessions triggering pool-size safety clause / total | < 20% | As the corpus grows, this should decline; high rate suggests monetization is outpacing corpus development |

### The Word-of-Mouth Flywheel

For a product used in a vulnerable personal moment, word-of-mouth is the dominant organic distribution channel. People don't search for "insight retrieval engine for purpose ruts." They hear from a friend: "I was going through something similar and this was actually useful." NPS ≥ 40 combined with a lightweight referral mechanism is likely to produce better growth than any paid channel, at a fraction of the cost.

This matters for business model design: **the product that produces the most aha moments will grow faster than the product with the best conversion funnel.** Optimizing for session quality is optimizing for the growth channel.

### Corpus Economics — A Unit Economics Input

The corpus is not free to build or maintain. Component 5 estimated approximately 58 hours to build a 60-SIO MVP corpus — roughly 1 hour per SIO, including source selection, excerpt identification, metadata tagging, state classification, and pre-eval review. This is not a one-time cost: the corpus must expand as the user base grows and gap rate rises, and existing SIOs require periodic review as source context ages.

| Corpus size | Estimated labor (hours) | At $25/hr | At $40/hr |
|---|---|---|---|
| 60 SIOs (MVP) | ~60 hrs | ~$1,500 | ~$2,400 |
| 200 SIOs (V1.5) | ~200 hrs | ~$5,000 | ~$8,000 |
| 500 SIOs (V2) | ~500 hrs | ~$12,500 | ~$20,000 |
| 1,000 SIOs (scale) | ~1,000 hrs | ~$25,000 | ~$40,000 |

These are rough estimates, not binding projections. The per-SIO labor cost may decline as curation tooling improves and the process is refined. But the corpus is a cost of goods — it is not a fixed asset that amortizes to zero. Ongoing expansion and maintenance must be budgeted as a recurring operational cost, not a one-time build.

**Implication for business model:** A subscription model that reaches 500 subscribers at $70/year generates ~$35,000 ARR. If the corpus requires $10,000–20,000 in expansion labor to serve those 500 users without degrading gap rate, the effective gross margin is not 90%+ (as software businesses typically assume) — it is closer to 40–70%. Business model sustainability calculations must include corpus expansion as an ongoing COGS line.

---

## 7. Pricing Hypotheses

These are hypotheses, not decisions. They must be validated against user willingness-to-pay research conducted after Gate 3 passes.

### Anchoring the Willingness-to-Pay Frame

The most useful pricing anchor is not "what does a similar app charge?" — it is "what does the user currently spend on alternatives that are doing a worse job?"

For the target demographic (22–32, employed):
- A single session with a career coach: $150–400
- A self-help book: $15–25 (mostly unread)
- A podcast premium subscription: $5–10/month (not state-matched)
- A productivity app subscription: $5–15/month (wrong use case)

Silhouette's value proposition — one well-matched insight in under two minutes, from a credible real person, for a specific stuck moment — is worth significantly more than $5 if it actually works. The question is not whether users can be charged $50–100 for what Silhouette does when it works; it's whether the product works reliably enough to justify that price and whether users believe it before they try it.

### B2C Pricing Hypotheses

| Model | Price Hypothesis | Rationale |
|---|---|---|
| Free first session | $0 | Trust-building; demonstrates value before commitment |
| Monthly subscription | $6–9/month | Low enough to survive dormant periods without cancellation guilt; $72–108/year |
| Annual subscription | $50–75/year | ~30% discount vs. monthly; drives lower churn |
| 5-session pack | $15–25 | $3–5/session; appropriate for users who expect low frequency |
| 10-session pack | $25–40 | $2.50–4/session; volume discount |
| Founding/lifetime access | $50–80 one-time | Early adopter offer; creates committed early user base |

**Important:** These numbers are deliberately set low relative to the product's value when it works. The risk of under-pricing (users don't perceive value) is real but secondary to the risk of over-pricing before insight quality is validated. Price can always be raised after validation. Trust lost from overcharging before the product is ready is harder to recover.

### B2B Pricing Hypotheses

| Model | Price Hypothesis | Rationale |
|---|---|---|
| Coach subscription (≤10 clients) | $30–50/month | Per-practitioner; must exceed B2C cost to justify the commercial relationship |
| Coach per-seat add-on | $3–6/seat/month | For coaches with larger practices |
| Corporate wellness per-user | $8–15/user/month | Requires negotiated privacy protections; minimum seat count |
| University license | $2,000–8,000/year | Per-institution; highly variable by institution size |

---

## 8. Business Model Risks

### Risk 1: Subscription guilt drives engagement mechanics.

**Description:** Once a subscription model is live, there is implicit pressure to demonstrate ongoing value to subscribers who haven't used the product recently. The natural response is to introduce engagement mechanics: weekly prompts, reflection nudges, "it's been 14 days — how are you doing?" notifications. These mechanics are wrong for Silhouette (they manufacture sessions out of genuine use occasions) but they are predictable responses to subscription pressure.

**Monitoring:** If anyone on the product team proposes an engagement mechanic (streak, notification, weekly check-in), this is the risk manifesting. The response is not to reject the mechanic automatically — it is to ask: "does this improve the quality of the session when the user has a genuine stuck moment, or does it manufacture a session?" If the latter, it violates Principle 1.

**Mitigation:** Define in advance what Silhouette will never build. A "product anti-roadmap" that explicitly rules out streaks, check-in notifications, habit formation features, and daily use design. Document it and treat it as a constraint, not a preference.

---

### Risk 2: B2B pressure distorts the product toward frequency reporting.

**Description:** If Silhouette pursues B2B buyers (employers, institutions), those buyers will expect ROI metrics. ROI for a wellness product is typically measured in engagement (sessions per month, active users, time in app). These are the wrong metrics. Accepting them in a contract creates pressure to optimize for them — which means engineering return visits rather than engineering aha moments.

**Monitoring:** If any B2B contract includes engagement metrics as KPIs — sessions per user, login frequency, app opens — the risk has materialized.

**Mitigation:** If pursuing B2B, define the contract KPIs upfront. The right KPIs are: insight landing rate (aggregate, anonymized), voluntary return rate, NPS from user surveys. A B2B buyer who insists on engagement metrics is not the right customer for Silhouette.

---

### Risk 3: Content licensing exposure at commercial scale.

**Description:** Silhouette's current approach — verbatim excerpts with attribution — is defensible at non-commercial scale. At commercial scale (a product charging users money), the fair use argument weakens. This creates legal exposure, particularly from large media companies and podcast networks whose content is in the corpus.

**Monitoring:** Track which sources are in the corpus and what their parent organizations' enforcement postures are. A Tim Ferriss Show clip used in a paid product is a different risk profile than a small independent podcast.

**Mitigation:** See Section 11 (Content / Source Rights Implications). Begin licensing conversations before the paid tier launches, not after.

---

### Risk 4: Premature monetization before insight quality is validated.

**Description:** The pressure to generate revenue before Gates 1 and 2 pass leads to charging users for a product that isn't reliably working yet. The first 50–100 users who pay will have a higher-than-average probability of a mediocre experience (thin corpus, early retrieval calibration, cold-start resonance defaults). A bad paid experience is worse than a bad free experience — it actively destroys willingness to repurchase and generates negative word-of-mouth.

**Monitoring:** If monetization is launched before insight landing rate ≥ 55% across all three MVP states, this risk has materialized.

**Mitigation:** Enforce the validation gates in Section 3. Do not launch a paid tier before Gate 1 and Gate 2 pass. Use the early period as a fully-free or invite-only validation phase.

---

### Risk 5: Viral growth pressure pushes toward social features.

**Description:** A subscription product with slow organic growth creates pressure for features designed to produce viral loops: "share this insight," "invite a friend," "post to LinkedIn." These features are not inherently wrong, but for Silhouette they carry specific risks:
- Sharing an insight strips it of the session context in which it was meaningful. A quote from McConaughey shared to LinkedIn looks like a motivational quote — exactly what Silhouette is designed to be different from.
- "Invite a friend" mechanics require the user to explain what Silhouette does to someone who hasn't experienced it — which is difficult for a product whose value is experiential.
- Social features introduce social dynamics into what is supposed to be a private, honest, one-person experience.

**Monitoring:** If investors or advisors push for social features, viral loops, or referral mechanics that compromise the private session model, this risk is manifesting.

**Mitigation:** Design referral mechanics around the experience, not the content. "Tell a friend who is going through something similar" is aligned with the product. "Share this insight on social media" is not.

---

## 9. Perverse Incentives to Avoid

These are business model structures or metrics that, once adopted, quietly reshape what the product builds toward — even without anyone deciding to damage the product deliberately.

### Perverse Incentive 1: Volume-based revenue → optimizing for session count

**Structure:** Any business model where revenue scales with number of sessions (per-session B2B billing, pay-per-session B2C, advertising revenue tied to impression volume).

**How it distorts:** Creates pressure to manufacture sessions that weren't organic — push notifications, habit-forming onboarding, "return for your weekly insight." Each of these is a bet against Silhouette's core design.

**Alternative:** Price on value, not volume. A subscription where revenue is determined by whether users maintain their subscription (which depends on genuine value) aligns incentives better than volume-based pricing.

---

### Perverse Incentive 2: Buyer-user split → reporting to the payer

**Structure:** B2B models where an employer, institution, or coach pays and an employee, student, or client uses the product.

**How it distorts:** Even with strong privacy protections, the perception of employer visibility causes self-censorship. The worse the self-censorship, the worse the insight landing rate — but the sessions continue (the buyer is paying, whether or not the product is working). This can mask product failure for months while the commercial relationship appears healthy.

**Alternative:** Any B2B model must design for the user's privacy first, with the buyer's interest served by aggregate quality data rather than session-level reporting.

---

### Perverse Incentive 3: Investor engagement metrics → building for frequency

**Structure:** Any investment agreement that includes engagement KPIs (DAU, D7 retention, session frequency) as success metrics.

**How it distorts:** The team builds features that increase engagement metrics even if those features don't improve session quality. This is how intermittent-use products get turned into daily-habit products against their own design — not by a single bad decision, but by incremental pressure to move the metric that investors are watching.

**Alternative:** The right investor KPIs for Silhouette are voluntary return rate, NPS, insight landing rate, and corpus quality improvement over time. Any investor who cannot be brought to agree on these metrics is the wrong investor for this product.

---

### Perverse Incentive 4: Freemium limitations designed for conversion pressure

**Structure:** A freemium model where the free tier is artificially limited in ways designed to create frustration and drive paid conversion ("You've used your 1 free session this month — upgrade to continue").

**How it distorts:** The user's experience of the product is now partially shaped by deprivation mechanics rather than genuine value delivery. This is antithetical to the trust model (Component 8). A user who feels the product is withholding value to extract payment is not in a trusting relationship with the product.

**Alternative:** The free tier should be designed around the validation and demonstration of value, not around conversion pressure. "Your first session is free, here's what it looks like, here's how to continue if it was useful" is aligned with the product. "You've run out — pay up" is not.

---

### Perverse Incentive 5: Sponsored or affiliated content

**Structure:** Revenue from content creators who pay to be featured in the corpus, or affiliate relationships where Silhouette earns commission for driving users to a creator's paid content.

**How it distorts:** Once commercial relationships exist between Silhouette and its sources, editorial independence is compromised. An SIO from a source that has a commercial relationship with Silhouette cannot be trusted by users to have been selected on editorial merit alone. The corpus's value as a curated, trust-worthy resource depends entirely on it being free of commercial influence.

**Alternative:** If creator partnerships are pursued, structure them as post-selection revenue sharing (Silhouette selects sources on editorial merit; creators who are selected share in the revenue their content generates) rather than pre-selection payment.

---

## 10. Trust and Privacy Implications

### The Central Privacy Question

Silhouette collects emotionally sensitive personal information — descriptions of career distress, purposelessness, paralysis, identity disruption — as its primary input. The privacy implications of this data under each business model must be designed explicitly, not as an afterthought.

### What Data Silhouette Collects

**Session data (Component 9 logging):** `detected_state`, `state_confidence`, `sio_id_returned`, `insight_type_returned`, `voice_register_returned`, `feedback_response`, `dwell_time_seconds`, `pool_size_safety_clause_triggered`.

**User input text:** The verbatim intake description and clarifying answer, if any.

**Implicit behavioral signals:** Session abandonment events, time at intake, source link click events.

**What is NOT collected at MVP:** Long-term profile data, cross-session behavioral history, user-identified resonance preferences (V2).

### Privacy Principles Under Monetization

**1. User input text should not be stored longer than necessary for the session.**

The intake description is sensitive. It is needed to classify the state and construct the retrieval query. After the session is complete and the feedback is logged, the verbatim intake text does not need to be retained. Retaining it creates legal exposure (data breach liability) and trust risk (what if it becomes discoverable?). Define a retention period and enforce it.

**2. Session-level data should not be identifiable to a specific user in B2B contexts.**

In any B2B arrangement, aggregate-only reporting to the buyer must be technically enforced, not just promised. If the data schema allows the buyer to identify that "employee ID 4732 had 3 sessions in the Direction Collapse state this month," the privacy protection is nominal. Anonymization must be cryptographically sound, not just label-removal.

**3. Users must have the right to delete their session data.**

GDPR (if Silhouette operates in Europe), CCPA (if in California), and general trust design (Component 8) all require that users can request deletion. The data architecture must support this before any paid tier launches.

**4. Monetization must not introduce data sharing with third parties.**

The moment Silhouette shares session data with third parties — advertisers, analytics partners, data brokers — the trust model is violated permanently. "Your data is never sold or shared" must be a technical guarantee, not just a policy commitment.

**5. Safety data requires special handling.**

Sessions that triggered a Tier 1 safety bypass contain the most sensitive data in the product. This data should be handled with the highest protection level, retained for the shortest period, and never included in any form of aggregated reporting — even internal.

---

## 11. Content / Source Rights Implications

### The Current Legal Position

At non-commercial scale with zero revenue, Silhouette's use of verbatim excerpts with attribution is defensible under several legal theories:

- **Fair use (US):** The four-factor test considers whether the use is commercial; whether it is transformative; how much of the copyrighted work is used; and whether the use affects the market for the original. At zero revenue, with attributed quotes used for commentary/insight purposes, fair use is plausible.
- **Fair dealing (UK/EU equivalent):** Similar logic applies in most common-law jurisdictions.
- **No systematic reproduction:** Using excerpts from hundreds of different sources, rather than systematically reproducing any one source, reduces the risk that any single rights holder has a substantial complaint.

### How Monetization Changes the Position

The moment Silhouette charges money, the "non-commercial" argument for fair use weakens. Specifically:

- **Commercial use is the first factor in the fair use test** — and it weighs against Silhouette in a commercial context.
- **SIOs are carefully curated excerpts**, not brief quotes in a critical work. The transformativeness argument depends on how retrieval and framing is characterized.
- **Some sources have explicit commercial use policies.** Certain podcast networks and media companies actively monitor for commercial use of their content and send cease-and-desist letters before escalating. The legal cost of defending even a weak claim is high.

### The Licensing Strategy

**Pre-launch commercial licensing audit:**

Before any paid tier launches, identify each source in the corpus and research:
1. Who owns the rights to the content (the host/creator? a network? a publisher?)
2. What their stated policy is on commercial use of excerpts
3. Whether existing licensing frameworks exist (CCLI for audio, similar)

**Creator partnership as the preferred path:**

The cleanest long-term path is formal revenue-sharing agreements with the source creators. This:
- Converts legal exposure into a commercial arrangement
- Aligns creator incentives with Silhouette's distribution goals
- Is consistent with emerging creator economy norms (podcast networks are accustomed to licensing their content for various uses)
- Can be structured as "post-selection revenue share" to preserve editorial independence

**Shorter excerpts reduce risk:**

The SIO standard (75–250 words) may be on the longer end of what is defensible without licensing at commercial scale. Reducing excerpt length to 75–120 words and supplementing with `key_claim` display (which is a Silhouette-written distillation, not a verbatim excerpt) reduces the amount of copyrighted material used per session and strengthens the transformativeness argument.

**Audio and video clips require a different strategy:**

If Silhouette ever moves to embedding or streaming actual audio/video content (as proposed in Component 7, Open Question Q4), the licensing requirement becomes unavoidable. Audio clip embedding is categorically different from text excerpt display and requires explicit negotiation with content owners.

**Licensing triage protocol — what to do before commercial launch:**

Step 1: **Classify each corpus source into one of three tiers.**

| Tier | Description | Examples | Action |
|---|---|---|---|
| **Tier 1: Independent creator** | Creator owns their own content; no network affiliation; can be approached directly | Tim Ferriss (independent), most solo podcast hosts | Warm outreach; revenue-share conversation via founder network |
| **Tier 2: Network-affiliated creator** | Creator is distributed by a major network or produced by a third party | Huberman Lab (Scicomm Media), Diary of a CEO (Studio71) | Formal licensing request; contact the production company, not just the host |
| **Tier 3: Corporate-owned content** | Content is owned by a media company, publisher, or large employer | Major newspaper columns, Harvard Business Review, Simon & Schuster books | Highest legal risk; either remove before commercial launch or engage IP counsel for formal licensing |

Step 2: **For each Tier 1 source in the corpus:** identify a warm introduction path before commercial launch. Do not approach cold. If the founder has no direct introduction, find one through the network before the paid tier goes live.

Step 3: **For each Tier 2 source:** research the production company's stated commercial use policy. Draft a licensing inquiry letter. Determine whether the production company has an existing licensing framework (many podcast networks do).

Step 4: **For each Tier 3 source:** make a binary decision — negotiate (with IP counsel) or remove from corpus before commercial launch. Do not carry Tier 3 sources into a paid product without one of these decisions made.

Step 5: **Document the rights status of every source in the corpus.** This becomes a living registry that is updated when new sources are added. Any new source added after commercial launch must be classified before the first SIO from that source is served in a paid session.

**Decision rule when a source cannot be licensed:**

If a source is Tier 2 or Tier 3 and licensing cannot be secured before commercial launch, remove all SIOs from that source from the paid corpus (they may remain in a free-tier corpus if the free-tier legal exposure is lower). Do not carry unlicensed Tier 2–3 content into a paid product. The corpus gap this creates must be addressed by adding licensed Tier 1 sources — not by serving unlicensed content and hoping no one notices.

**What to build before the first paid transaction:**

- Licensing triage protocol completed for all current corpus sources (Tier classification done)
- Warm outreach to at least 2 Tier 1 creators in the corpus — relationship initiated, revenue-share framework drafted
- Formal licensing inquiry sent to Tier 2 production companies for all Tier 2 sources with > 5 SIOs
- Tier 3 sources either licensed or removed from paid corpus
- Rights status registry document created and assigned to a team member to maintain
- Retention policy defined: how long verbatim intake text is stored, when it is deleted, who has access

---

## 12. Monetization Experiment Roadmap

This is a sequenced plan for moving from free validation to paid model selection. Each step is gated on the prior validation criteria.

### Phase 0: Pre-Validation (Current)

**Objective:** Build and validate the core product. Do not monetize.

**Scope:** Free access to all users. Session data collected. Feedback loop running. No revenue.

**Duration:** Until Gate 1 passes (insight landing rate ≥ 55% across MVP states at n ≥ 30/state).

**Exit criteria:** Gate 1 passed. Proceeding to Phase 1.

---

### Phase 1: Founding Member / Early Access

**Objective:** Generate early revenue without a subscription model. Test whether users will pay at all before building subscription infrastructure.

**Structure:** One-time founding member purchase ($50–70 lifetime access). Limited to first 100–200 users who have already experienced the product for free. Framed as: "Support what this is becoming" not "unlock features."

**Experiment questions:**
- What conversion rate from free to paid do first-session-positive users show?
- What does the user articulate as their reason for paying?
- Does paying change subsequent session behavior (dwell time, feedback rate, voluntary return)?

**Duration:** Until Gate 2 passes (voluntary 30-day return ≥ 20%).

---

### Phase 2: Willingness-to-Pay Research

**Objective:** Establish what the target demographic is willing to pay for Silhouette across multiple pricing models before committing to a structure.

**Method:** Van Westendorp price sensitivity analysis with 20–30 target-demographic users who have completed at least one session. Ask four questions: at what price is the product too expensive? Too cheap to be taken seriously? A bargain? Expensive but worth it? The intersection produces a pricing corridor.

**Parallel track:** Begin creator partnership conversations with 2–3 corpus sources before the paid tier launches.

**Duration:** 4–6 weeks. Produces a pricing corridor that informs Phase 3.

---

### Phase 3: Freemium Launch

**Objective:** Launch the first paid tier. Test subscription vs. pack purchase as an A/B.

**Structure:**
- Free first session (no account required)
- After first session: account creation prompt ("Save this to come back to it")
- On account creation: present two options: Monthly/Annual Subscription vs. 5-Session Pack
- No feature differentiation between models — differentiation is only in billing structure

**Experiment questions:**
- Which billing structure does the user prefer? (Pack vs. subscription selection rate)
- What is the conversion rate from free first session to paid?
- What is the month-2 churn rate for subscription users?
- Are pack users purchasing follow-on packs?

**Duration:** 60–90 days of data before drawing conclusions.

---

### Phase 4: Coach Channel Pilot

**Objective:** Test the coach-as-distribution-channel model with 5–10 coaches in the target demographic's network.

**Structure:** Invite coaches to a dedicated pilot program. Offer a coaching practice subscription (5 client seats included). Gather structured feedback from coaches and their clients over 60 days.

**Experiment questions:**
- Do coached clients have higher insight landing rates than direct B2C users? (Prior trust transfer effect)
- What do coaches value in the product? How do they use it with clients?
- What is the coach's willingness to pay for a practice subscription?
- Does the coach channel produce client referrals to direct B2C?

**Duration:** 60-day pilot, structured debrief.

---

### Phase 5: B2B Assessment

**Objective:** Decide whether to pursue corporate wellness or institutional sales.

**Timing:** Only after Phase 4 (coach channel) is running successfully and the product is well-validated. Not before.

**Decision framework:**

Pursue B2B corporate wellness if:
- The trust model conflict (employee self-censorship) can be structurally mitigated
- Buyer KPIs can be aligned with Silhouette's quality metrics (not engagement metrics)
- A privacy architecture is in place that is verifiable and credible to users

Do not pursue B2B corporate wellness if:
- Insight landing rates are lower in employer-funded sessions than B2C sessions (confirmed by comparing pilot data)
- Employers insist on engagement metrics or session-level reporting
- Legal review flags data sharing requirements incompatible with the privacy model

---

## 13. MVP Recommendation

### What to Decide Now

**1. Do not monetize during validation.**
No paid tier while insight quality is unvalidated (Gate 1). Any revenue before this point comes at the cost of a user who may have a mediocre experience and will not return.

**2. Commit to the product anti-roadmap.**
Explicitly rule out: streaks, push notification return mechanics, daily-habit design, social sharing of insights, sponsored content, employer-visible session data. Write this down before the first commercial conversation, because those conversations will create pressure to add them.

**3. Begin the content licensing audit now.**
Legal review of the top 5 corpus sources should happen before the product is ready to charge — not after. The audit takes time and negotiations take more. Start early.

**4. Design the founding member offer now.**
When Gate 1 passes, the path to the first revenue is clear: founding member offer to users who have experienced the free product. This offer should be designed and ready before the gate is passed — not improvised after.

**5. Define the right investor KPIs now.**
Any fundraising conversations should be anchored to Silhouette's actual quality metrics, not standard SaaS engagement metrics. If raising capital, define insight landing rate, voluntary return rate, and NPS as the key indicators before signing any term sheet.

### What to Defer

- Final pricing decisions — defer until Gate 3 (willingness-to-pay research)
- B2C model selection (subscription vs. pack) — defer until Phase 3 data
- B2B model decisions — defer until Phase 4 and Phase 5
- Creator partnership negotiations (beyond initial conversations) — defer until corpus is stable and commercial launch is imminent
- Financial projections — defer until Phase 3 data provides a meaningful conversion rate basis

### Operational Sustainability Thresholds

The validation gates protect the product. They do not protect the team. A solo founder or small team operating pre-revenue needs to understand what subscriber counts make the business viable at different stages — not as a projection, but as a minimum viable target to plan runway around.

**Baseline operating costs (solo/2-person team, rough):** $3,000–5,000/month in personal costs, tools, and infrastructure. Excludes corpus expansion labor (see Section 6) and legal fees.

**Revenue milestones mapped to subscriber counts:**

| Revenue target | Annual sub ($70/yr) | Monthly sub ($7/mo, 5% churn) | 5-session pack ($20) |
|---|---|---|---|
| $1,000/month | ~170 subscribers | ~200 active subscribers | ~50 packs/month |
| $3,000/month | ~515 subscribers | ~600 active subscribers | ~150 packs/month |
| $5,000/month | ~860 subscribers | ~1,000 active subscribers | ~250 packs/month |

**The Default Alive question:** At the current rate of user acquisition (during free validation), is there a path to 500+ subscribers before the team's operating runway ends? If yes, the product can reach sustainability without external capital. If no, either the acquisition rate needs to accelerate or the team needs runway extension (part-time income, consulting, angel investment) to survive the validation period.

The founding member offer (100–200 users at $50–70) generates $5,000–14,000 — a few months of runway if operating lean. This is meaningful but not transformative. The subscription tier (Phase 3) is the path to baseline sustainability.

**Why this matters for business model sequencing:** The validation gates are correct constraints — they protect the product. But if the team runs out of runway before Gate 1 passes, the validation never happens. Operational sustainability planning is not an alternative to the validation gates; it is what makes the validation period survivable. Budget for the gap.

### What Success Looks Like Before Monetization

- Insight landing rate ≥ 55% across all three MVP states
- Voluntary 30-day return rate ≥ 20%
- First-10-seconds product identification ≥ 80% correct
- No active content licensing disputes
- One founding member offer designed and ready to launch
- Operating runway extends to Phase 3 freemium launch (estimated 4–8 months from corpus build completion)

---

## 14. Open Questions

### Q1: Does Silhouette's use case fit a subscription at any price?

**Why it matters:** The product is designed for occasional use. Subscription models require the user to maintain a recurring mental commitment to the product even between use occasions. For some intermittent products (professional reference tools, legal research services), subscriptions work because users value the availability even when they're not actively using it. Does Silhouette produce this kind of "I'm glad I have it, even when I'm not in a stuck moment" disposition?

**What would resolve it:** Phase 3 data on month-2 and month-3 churn. If churn is low (< 10% monthly) among users who have had a positive first session, the subscription premise is validated. If churn is high despite positive first sessions, the billing structure is misaligned with the use pattern.

---

### Q2: Does being paid for change what the product does, even if the team is careful?

**Why it matters:** Monetization creates implicit pressure even when no one is explicitly pushing to distort the product. The question is whether the team can sustain the discipline to optimize for session quality rather than session volume when the business depends on revenue.

**What would resolve it:** Team alignment and explicit commitment to the product anti-roadmap (Section 8, Risk 1 mitigation). Regular check-ins where the team asks: "has anything we've built in the last 30 days optimized for frequency rather than quality?" If the answer is yes — diagnose the incentive that produced it.

---

### Q3: What is the right relationship with source creators — licensing, partnership, or something else?

**Why it matters:** Creator partnerships are complex and could compromise editorial independence if structured incorrectly. But using creator content in a paid product without their knowledge or agreement creates both legal exposure and a trust deficit if creators object publicly.

**What would resolve it:** Conversations with 2–3 of the top corpus source creators (or their representatives) before commercial launch. What do they consider fair? What revenue share, if any, would they find acceptable? What editorial independence terms would protect Silhouette's curation model?

---

### Q4: Is Silhouette's value proposition defensible as a subscription to users who don't remember needing it between sessions?

**Why it matters:** Unlike a meditation app (daily use) or a productivity tool (weekly use), Silhouette is used when the user is in a genuine stuck moment. Between stuck moments, the subscription may feel like a payment for a tool they don't need. The question is whether the user's awareness that Silhouette exists — "I know where to go when I next need it" — is itself worth a subscription, or whether they'll cancel when the current stuck moment passes.

**What would resolve it:** Phase 3 data, specifically: do users who cancel their subscription in month 2 do so because they don't need it (temporarily resolved stuck moment) or because it didn't work? If most cancellations are "I'm doing fine right now" rather than "this didn't help," a pause-instead-of-cancel feature may retain a portion of them.

---

### Q5: Can the founding member / early access model create a committed user base without creating the wrong user expectations?

**Why it matters:** "Founding member" framing attracts users who are excited about the product concept — often early adopters who are more patient with imperfections and more willing to forgive a mediocre session. This is useful for validation, but founding members may have different expectations from mainstream users. Success metrics from the founding member cohort may overstate what a mainstream user cohort will experience.

**What would resolve it:** Design the founding member program to attract the target demographic (22–32, employed, in a current stuck moment) rather than "product people" or early adopter enthusiasts. The validation data must come from users who represent the real use case.

---

### Q6: At what point does the corpus need to scale beyond MVP to support a viable business?

**Why it matters:** The MVP corpus (~60 SIOs from 3–5 sources) is designed to validate retrieval quality, not to sustain a business. A business that serves thousands of users needs a corpus with enough depth that repeat users encounter new insights and edge-case states are covered. When does the corpus need to scale, and what does that cost?

**What would resolve it:** Track the corpus gap rate (Component 9) across user cohorts. When the gap rate begins to rise as the user base grows — indicating that the same SIOs are being retrieved repeatedly for the same users — the corpus needs to expand. Build the corpus expansion infrastructure before this threshold is reached.

---

### Q7: What does the business look like if Silhouette deliberately stays small?

**Why it matters:** Most startup frameworks assume the goal is scale. Silhouette's quality model — human curation, editorial judgment, intermittent use — may be more compatible with a smaller, high-margin, subscription-based business than with scale growth. A company with 5,000 subscribers paying $70/year is $350,000 ARR — viable as a small product business, but not as a venture-scale investment.

**What would resolve it:** A candid conversation about the intended scale before raising external capital. A product that works for 5,000 users paying $70/year is a good business. A product that takes venture capital and needs to serve 500,000 users to return the investment may face pressure to compromise the quality model to reach that scale.

---

### Q8: If Silhouette builds creator partnerships, who negotiates them and what are the deal terms?

**Why it matters:** Creator partnerships require legal expertise, negotiation capacity, and relationship access. The team must have access to legal counsel with entertainment/IP experience and relationships in the creator economy to structure these deals.

**What would resolve it:** Identify early which relationships already exist in the founding team's network. Tim Ferriss, Andrew Huberman, and Lewis Howes all have business teams, agents, or production companies managing commercial relationships. Starting with a warm introduction is significantly more efficient than a cold approach.

---

## When to Revise This Document

- After Gate 1 passes: review the founding member offer design and the content licensing audit status
- After Gate 2 passes: initiate willingness-to-pay research; begin Phase 3 planning
- After Phase 3 data: update the B2C model analysis with real conversion and churn data
- After Phase 4 (coach pilot): update the B2B model analysis with real coach adoption data
- If external fundraising is pursued: update investor KPI framework to match term sheet discussions
- If content licensing disputes arise: update Section 11 with the specific resolution and implications
- When the corpus exceeds 200 SIOs: reassess corpus gap rate and its effect on business model viability
