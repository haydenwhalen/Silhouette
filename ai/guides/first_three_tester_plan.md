# Silhouette — First Three Tester Plan

The smallest possible step from prototype to data. Three friendly testers, one week, enough real feedback events that the Phase 7 decision script can name a path with evidence instead of guesswork.

If you've already read `closed_beta_plan.md`, this is the short version with the next-action checklist on top.

## TL;DR — what to do this week

1. **Today**: Start `npm run dev`. In another terminal: `npm run warm`. Then run the [manual smoke test](./manual_beta_smoke_test.md) end-to-end against `http://localhost:3000?user=smoketest`. Fix any blockers.
2. **This week**: Send the invite below to three people. Default round-1 deployment is localhost + screen-share (you watch them click). Run `npm run warm` once before each session.
3. **End of week**: Run `npm run analyze-feedback`. If under thresholds → expand to 5–10 in round 2. If over thresholds → execute the named Phase 7 path.

## Who — three friendly testers

Pick three people who fit all of:

- Age roughly 22–32 (Silhouette's primary audience)
- Employed or actively early-career
- Articulate enough to tell you what landed and what didn't, in their own words
- Comfortable with prototypes — they will see rough edges
- **Not** someone you suspect would use the system during acute distress (no safety routing yet; pre-screen them out)
- **Not** a hostile/skeptical critic for round 1 — you want signal on landing, not on whether they like the idea

A good round-1 mix: one analytical/mechanism-leaning (likes Huberman/Newport), one warm/permission-leaning (likes Brené/Brown), one direct/identity-leaning (likes Goggins/Pressfield). Their different reactions to the same SIO library is the most useful early signal.

## How — deployment

Round-1 default: **localhost + screen-share**. Run `npm run dev`, share your screen, watch them click. You catch UX bugs no log captures (confusion, double-clicking, scroll behavior, "where do I type"). Slow, but the highest signal-per-session of any setup.

Round-2 default (if round 1 passes): **Vercel deploy** following the 6-step quick-start in `closed_beta_plan.md` §Deployment Option 1. Set the OpenAI usage cap *before* sending invites. Use a `BETA_PASSWORD` query-param gate for light protection. Be aware: `corpus/feedback.jsonl` lives in serverless `/tmp` and isn't persistent across cold starts — pull the log frequently or swap in object storage.

## Handles

Assign a stable handle per tester via the `?user=` URL param:
- `http://localhost:3000?user=alice`
- `http://localhost:3000?user=ben`
- `http://localhost:3000?user=carol`

Real names not needed — pick what they recognize. Handle gets sanitized server-side (lowercase, alphanumeric + dash/underscore, 32-char cap) and stamped on every feedback event.

**Reserved test handles** — do NOT use `smoketest`, `probe`, `test`, or `dev` for real testers. The analysis script filters those automatically.

## Sample invite (copy + edit lightly)

> Hey [name] —
>
> I've been building a small prototype called Silhouette. It's a retrieval engine for those moments when you feel stuck about work, direction, or motivation — the in-between feeling of being functional but not engaged. You type a few sentences about what's off, and it surfaces one insight from a real person (Brené Brown, Cal Newport, Huberman, etc.) who navigated something close to that.
>
> I'm doing a closed beta with a few people I trust. Would you be up for trying it 2–3 times over the next week, when something actually feels off for you? It's an early prototype — some of the source quotes are paraphrased reconstructions of documented work by these speakers, not verified verbatim transcripts. Worth flagging up front.
>
> The most useful thing you can do is click **Yes** if an insight lands and **Show me something different** if it doesn't. Those clicks are what tells me what to fix.
>
> One important note: this is not therapy and isn't built for crisis. If you're in a tough place that needs more than career-stuckness reframing, please reach out to 988 or someone you trust.
>
> Link: [paste URL here, e.g. `http://localhost:3000?user=alice` for live walkthroughs, or your Vercel URL with `?user=alice&key=...` for async]
>
> Optional: want to do a 15-min voice call at the end of the week so I can hear what surprised you? No pressure if not.
>
> Thanks for trying this.

## What to watch for during/after each session

Things that mean something:
- **Confusion about what to type** → intake flow may not invite real moments; current preamble may be wrong tone
- **Few or no button clicks** → feedback prompt isn't visible enough → 7-D signal
- **"This quote feels off / I don't think they said that"** → reconstructed-SIO trust gap → 7-B signal
- **"Show me different" pressed repeatedly** → retrieval picking wrong SIO → 7-C signal
- **An insight that *clearly* doesn't fit a category** ("I love this work, I just don't know what to do next") → corpus gap → 7-A signal
- **Emotional/safety-adjacent use** ("I'm having a really rough time, not just bored at work") → pause and pre-brief the next tester more carefully; this is Component 8 territory and not yet routed in code
- **UI bugs** (buttons unresponsive, duplicate messages, raw markdown leaking) → must-fix before round 2

Things to deliberately *not* read into:
- One tester loving / hating one SIO → noise, not signal, until repeated
- Slow response time on the very first message → cold-start, ignore
- A "yes" reply that produces "Tell me what's been feeling stuck or off lately" *as the first interaction after dev server boot* — this is a known cold-start quirk where the in-memory session map resets during initial route compilation. Warm BOTH routes before the tester arrives (see `manual_beta_smoke_test.md` for the exact warmup commands).

## What to ask in the optional 15-minute debrief

Good questions:
- What did you actually try it for?
- Was there a moment when an insight landed? What did the landing feel like?
- Was there a moment when one didn't land? Can you point at why?
- Did the source attribution feel believable, or did anything feel off?
- Would you reach for this again?

Don't ask:
- "What features should we add?"
- "What did you think of the design?"
- "Was it useful?" (Too abstract; landing/not-landing is what you're measuring.)

## End-of-week analysis

```bash
npm run analyze-feedback
```

The script:
- Reads `corpus/feedback.jsonl`
- **Filters out test/smoke events** automatically (sessions starting with `test-`, handles `smoketest`/`probe`/`test`/`dev`, or sessions named after those handles)
- Aggregates per-state and per-SIO metrics
- Prints a Phase 7 path recommendation: `7-A` / `7-B` / `7-C` / `7-D` / `collect-more` / `no-clear-signal`

Pass `--include-test` to see test events for debugging.

You're ready for a real recommendation when:
- **≥20 explicit feedback events** (`landed` or `show_different`)
- **≥3 unique user handles**
- **≥2 sessions per user on average**
- **Events across ≥2 of the 3 MVP states** (Direction Collapse, Engagement Drought, Inaction Loop)

Below those thresholds, the script will recommend `collect-more`. Listen to it — running a Phase 7 path on weak signal is worse than waiting.

## What changes in round 2

Only if round 1 passes the smoke test and the three testers produce reasonably honest signal (a few yeses, a few "show different"s, no broken-system reports):

- Move to Vercel deployment with budget cap
- Expand to 5–10 testers
- Don't aggregate the round-1 + round-2 data carelessly — different environments (screen-share vs async) produce subtly different signal. Run analysis separately for each round first.

## What still doesn't exist (don't pretend otherwise to testers)

- Real safety routing in code — only preamble + system-prompt mentions of 988
- Persistent storage across server restarts (in-memory session state)
- Real auth — beta key is light protection only
- Verbatim sources for 6 of 9 SIOs — reconstructions in real speakers' voices
- Component 8 trust/credibility architecture
- Component 10 monetization

The decision to ship the beta despite these is intentional: the only way to know which to build next is real feedback. But be honest with testers about what's prototype and what's missing.

## Stop conditions

Pause and fix before recruiting more testers if:
- A tester reports the system responded harmfully to genuine distress
- A tester reports a quote that the speaker didn't actually say (i.e. fabrication, not paraphrase)
- Cost per active tester materially exceeds estimate
- The dev server or Vercel function is erroring on >10% of requests
