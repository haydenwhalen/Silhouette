# Manual Beta Smoke Test

A 10-minute browser checklist to run before exposing Silhouette to anyone outside your own laptop. This is **not an automated test** — it catches the class of bugs that show up only when a real human is clicking in a real browser.

## Setup

```bash
npm run dev
```

Open `http://localhost:3000` in a clean browser window. Open DevTools → Network tab.

If you've added beta user handle support and want to test it, use `http://localhost:3000?user=smoketest`.

**Cold-start warmup:** the very first request to each API route after `npm run dev` boots triggers Next.js to compile that route, and during compilation the in-memory session state map can reset. This can produce a false "stray feedback" on the first Yes click. To avoid it, warm both routes once before running the flows:

```bash
npm run warm
```

(This runs `scripts/warm-dev-server.sh`, which hits both `/api/chat` and `/api/feedback-signal` with throwaway payloads.)

Or just send any throwaway message AND click any button in the UI once, then refresh and start Flow 1 fresh.

**Optional automated pre-check:** after warming, you can run `npm run test-smoke-flows` to drive the HTTP API through all 8 flows automatically (no browser needed). This catches API-layer regressions but doesn't catch UI rendering issues — you still need to do the browser walk-through below.

## Flows

### Flow 1 — Direction Collapse → Yes
1. Type: `I got the promotion I'd been working toward for two years. Should feel great. I just feel empty. I don't know what comes next.`
2. **Expect:** A response within ~5–10 seconds containing:
   - A block-quote-styled excerpt (left border, italic)
   - An attribution line beginning with `—`
   - A "Did this land?" prompt with two real buttons (`Yes` + `Show me something different`)
   - A source link
3. Click **Yes**.
4. **Expect:**
   - Brief acknowledgment ("Glad it landed. Take what's useful and leave the rest.")
   - Buttons on the prior insight grey out / become inert
   - The literal word "yes" does NOT appear as a typed message in the transcript

### Flow 2 — Engagement Drought → Show me something different → retry
1. Type: `I used to love this work. Now I open my laptop and feel nothing. Not bad, just flat. It's been like this for months.`
2. Wait for the insight to appear.
3. Click **Show me something different**.
4. **Expect:**
   - "Let me find something else." appears
   - A *different* SIO is presented (different speaker / different excerpt) — verify by reading
   - The new SIO has its own fresh feedback buttons
   - The old insight's buttons are now inert

### Flow 3 — Inaction Loop → Yes
1. Type: `I know exactly what I need to do. I've known for months. I just keep not starting.`
2. Click **Yes** after the insight appears.

### Flow 4 — Sparse query → no buttons / clarifier
1. Type: `I feel stuck`.
2. **Expect:** Either a clarifying question (e.g., "When you say stuck — is it more that…") OR a broader response with **no feedback buttons** (because no SIO was presented).

### Flow 5 — Old buttons stay inert after new insight
1. Continue from Flow 4. Now type a real query like `I used to care about my work, but now I feel flat.`
2. After the new insight appears, scroll up to the first insight from Flow 1.
3. **Expect:** Buttons on the first insight are not interactive. Only the latest insight has live buttons.

### Flow 6 — Network activity sanity check
While clicking through Flows 1–3, watch the Network tab:
- Every send/click → POST to `/api/chat` returning 200
- Every button click → ALSO a POST to `/api/feedback-signal` returning 200
- No 4xx or 5xx errors

### Flow 7 — Feedback log received the events
After completing the flows:

```bash
cat corpus/feedback.jsonl | tail -20
```

Verify you see a mix of `response_type`: `landed`, `show_different`, `retry_presented`, and `dwell_signal` events.

### Flow 8 — Visual sanity
Scrolling through the conversation, confirm:
- No raw `**bold**` markdown showing as literal asterisks
- No `>` characters at the start of lines (block quotes should be styled, not raw)
- No `[Yes]` / `[Show me something different]` plain-text remnants once buttons render
- No raw `insight_id: sio-...` or `[1]` tool-output leakage
- Source link is clickable and opens in a new tab

## What to fix vs. note before beta

**Must fix before any user sees it:**
- Crashes or 500 errors
- Buttons that don't respond to clicks
- Insights that don't appear
- Feedback events not landing in the log

**Note for follow-up (don't block beta):**
- Visual polish gaps
- Slow responses (>10s) when network is fine
- Edge-case rendering quirks

## After smoke test

If all 8 flows pass, you're ready for the [closed beta plan](./closed_beta_plan.md).
