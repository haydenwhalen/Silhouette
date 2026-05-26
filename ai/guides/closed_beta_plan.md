# Silhouette Closed Beta — Operating Guide

A practical plan for running the first small beta. Read this once, then follow the checklist.

## Purpose

Turn the working prototype into real feedback data. The goal isn't validation or growth — it's **20+ honest feedback events** from real users that will name what to build next.

Without this, every Phase 7 decision is a guess. With it, the analysis script reads the log and tells you which lever matters.

## Who to recruit

**Target audience:**
- Young professionals, roughly 22–32
- Employed, reasonably functional
- Articulate enough to describe what's stuck and why something landed (or didn't)
- Tolerant of prototypes — comfortable with rough edges

**Bias toward:**
- People who experience the "in-between" stuck feeling Silhouette is for (not crisis, not thriving)
- Friends/colleagues whose judgment you trust on what feels honest vs. generic
- A mix of registers — some who like Huberman-style analysis, some who like Brené-style permission, some who like Goggins-style directness. You want their reactions to reveal which SIOs land for whom.

**Do NOT recruit:**
- Anyone currently in acute distress or actively in mental health crisis
- Anyone who'd interpret a prototype's reconstructed quote as a final verbatim source for citation
- People you'd be embarrassed to apologize to if the system breaks (yet)
- More than 10 people for the first round

## How many

- **First round (this week):** 3 friendly testers — people who'll tell you the truth and don't mind if it's rough
- **Second round (week 2 if round 1 went OK):** 5–10 broader trusted testers
- Stop expanding until you've read the feedback analysis

## How often each user should engage

- 2–3 sessions over 1 week
- Each session: one real moment of feeling stuck → type a few sentences → click Yes or Show me something different
- Don't manufacture sessions. Real moments only.

## What to tell them (sample invite)

Copy-paste, edit lightly:

> Hey [name] —
>
> I've been building a small prototype called Silhouette. It's a retrieval engine for those moments when you feel stuck about work, direction, or motivation — the in-between feeling of being functional but not engaged. You type a few sentences about what's off, and it surfaces one insight from a real person (Brené Brown, Cal Newport, Huberman, etc.) who navigated something close to that.
>
> I'm doing a closed beta with a few people I trust. Would you be up for trying it 2–3 times over the next week when something actually feels off for you? It's an early prototype — some of the source quotes are paraphrased reconstructions of documented work by these speakers, not verified verbatim transcripts. Worth flagging up front.
>
> The most useful thing you can do is click **Yes** if an insight lands and **Show me something different** if it doesn't. Those clicks are what tells me what to fix.
>
> One important note: this is not therapy and isn't built for crisis. If you're in a tough place that needs more than career-stuckness reframing, please reach out to 988 or someone you trust.
>
> Link: [paste URL here]
>
> Optional: want to do a 15-min voice call at the end of the week so I can hear what surprised you? No pressure if not.
>
> Thanks for trying this.

## What to tell them after the week

Optional 15-minute voice debrief per user. Ask:
- What did you try it for?
- Was there a moment when an insight landed? What did the landing feel like?
- Was there a moment when it didn't land? Can you point at why?
- Did the source attribution feel believable, or did anything feel off?
- Would you reach for this again?

**Don't** ask:
- "What features should we add?"
- "What did you think of the design?"
- "Was it useful?"

Stay focused on landing/not-landing and source credibility.

## Deployment options

Pick one before sending invites:

### Option 1 — Vercel deploy (recommended for >3 users)
- One-click deploy from the existing repo
- Users get a real URL they can use on their own time
- **Cost:** rough estimate $0.50–$2 per active user per week at gpt-4o-mini pricing
- **Pro:** scalable, async, fewer logistics
- **Con:** invites real-world failure modes (cold starts, edge cases)

**Quick-start steps:**
1. Push the repo to GitHub (if not already)
2. In Vercel: New Project → Import the repo → keep all defaults
3. Set required env vars in Vercel Project Settings → Environment Variables:
   - `OPENAI_API_KEY` — your OpenAI key
   - `TAVILY_API_KEY` — your Tavily key (only if web_search tool is in use; can be omitted otherwise)
4. In OpenAI dashboard → Limits: set a hard usage cap (e.g. $20/mo) so a buggy beta can't run up cost
5. (Optional simplest gate) Add a `BETA_PASSWORD` env var, then add a tiny check in `src/app/api/chat/route.ts` that rejects requests missing a matching `x-beta-key` header — and have your beta URL include it as a query param the frontend forwards. This is light security, not real auth — fine for a friendly beta. For anything more sensitive, use Vercel's password protection feature on the project (paid plan).
6. Deploy. Visit the URL to confirm the preamble loads.

**Important caveat about logs on Vercel:**
- `corpus/feedback.jsonl` lives in the serverless function's `/tmp` — **not persistent**. It gets wiped on cold starts (~15 min of inactivity) and on every redeploy.
- For a 1-week beta with regular traffic, the function may stay warm enough to hold a useful log. But don't rely on it.
- Safer: have a small script that periodically downloads the log via an admin endpoint, OR swap in S3/Supabase storage for the log. Either is post-MVP; for the first beta, accept the risk and read the log frequently.

### Option 2 — Localhost + screen share
- You run `npm run dev` and screen-share during scheduled sessions
- Lower cost, no deployment risk
- **Pro:** you watch in real time, catch reactions you'd miss from the log alone
- **Con:** slow, doesn't scale past 3 users, prevents organic moments-of-stuck usage

### Option 3 — ngrok tunnel
- Run dev locally, expose via ngrok during scheduled windows
- Mostly the same tradeoffs as Option 2

**Recommended:** Option 2 for the first 3 testers (you'll catch UX bugs faster watching them). Then Option 1 for the broader round.

## Per-user URL convention

If you're using Vercel deploy:
- Add `?user=alice`, `?user=bob`, etc. to the URL when sending invites
- The system sanitizes the handle and tags every event with it
- Lets the analysis script slice by user without accounts

If you're on localhost:
- Just visit `http://localhost:3000?user=alice` while they're with you

## Setting expectations honestly

The system has known limits. Tell users up front:
- 9 SIOs total in the prototype corpus — they might see the same one twice across sessions
- Server restart loses session state (the "seen SIOs" memory) — if you redeploy or restart, the retry/exclusion can repeat
- 6 of 9 SIOs are reconstructions in real speakers' voices, not verbatim quotes
- It's a prototype — bugs will appear

## What "enough signal" looks like

You're ready to run the Phase 7 decision script when:
- **≥20 explicit feedback events** (`landed` or `show_different`) in the log
- **≥3 users** identified in the log
- **≥2 sessions per user** on average
- The events span at least 2 of the 3 MVP states

Below those thresholds, the analysis script will recommend "collect more" — listen to it.

## Reading the analysis

```bash
npm run analyze-feedback
```

You'll get a human-readable report ending with a Phase 7 path recommendation. The recommendation is conservative — it won't fire unless the signal is loud. If it says "no clear signal", expand the beta or wait for more data.

The four possible paths the script can recommend, and what each means:
- **7-A (Corpus Quality)** — specific SIOs are weak; rewrite or replace them
- **7-B (Verbatim Transcript Pass)** — reconstructed SIOs underperform verbatim ones; do the transcript verification work
- **7-C (Retrieval Mitigation)** — retries land more than first picks; the ranking is wrong, try HyDE or alternative embedding
- **7-D (Trust/UX Work)** — users aren't engaging with the feedback prompt; fix engagement before measuring quality

## Privacy posture

- No accounts, no PII collection
- User handle is whatever the URL `?user=` param contains; you control the mapping
- The feedback log lives at `corpus/feedback.jsonl` on the server (gitignored)
- The log captures: insight_id, state, scores, dwell time, response type. It does NOT capture the user's raw query text (only an event triggered by it)
- If you deploy to Vercel: the log lives in `/tmp` on the serverless function, which is **not persistent across cold starts**. For real persistence you'd need to swap in a small upload-to-object-storage step. For a 1-week beta this may be fine if the dyno stays warm; for anything beyond, plan to capture the log differently

## Safety boundary

The current system has the safety language in the preamble and the system prompt but does NOT enforce safety routing in code (Component 8 deferred). This means:
- If a user describes acute distress, the system will respond with a career-stuckness reframe (wrong)
- Pre-screen users to exclude anyone you suspect would use it during acute distress
- Pre-brief users explicitly in the invite that this is not for crisis

## Pre-launch checklist

- [ ] Run [manual smoke test](./manual_beta_smoke_test.md) start to finish in `npm run dev`
- [ ] Decide deployment surface
- [ ] If Vercel: set `OPENAI_API_KEY` + budget cap + (optional) password gate
- [ ] Send invites to first 3 friendly testers
- [ ] Set a calendar reminder for ~1 week out to run `npm run analyze-feedback`

## Stop-the-world conditions

Pause the beta and fix before continuing if:
- A user reports the system gave them harmful content
- A user reports the system told them a quote that the speaker didn't actually say (verbatim verbatim — different from "this is a paraphrase of their concept")
- The cost per user is materially higher than estimate
- Server errors are dropping >10% of requests
