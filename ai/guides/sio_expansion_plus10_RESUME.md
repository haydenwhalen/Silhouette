# SIO Expansion (+10 per state) — RESUME Checkpoint

**Purpose:** Allow this corpus-expansion batch to be resumed cleanly by *either* the Claude CLI
or the Cursor agent after any interruption (e.g. usage-limit reset). Progress checkpoints to disk
**state-by-state**; only the in-flight state can be lost.

_Last updated: 2026-06-03 (during the build). Re-derive live counts before resuming — see "How to resume" step 1._

---

## The goal of this batch

Add **+10 SIOs per state (60 total)** to take the corpus from 51 → ~111, as the final content
push before the first closed beta. Each new SIO must be:

- **Verbatim-verified** (`transcript_verified: true`) with a real excerpt.
- Backed by an **official source** with a linked `corpus/sources/*.json` record.
- Where possible, a **verified, timestamped video embed** — target **≥7 video SIOs per state**.
- Authored via `scripts/author-sio-batch.ts` (renders SIO `.md` + source `.json` from a checked
  candidate data file). The generator does **not** verify — honesty stays upstream (human-confirmed).
- Served: `human_review_status` in {`approved`, `prototype_only`, `needs_review`}; verified video
  SIOs use `approved` + `transcript_verified: true` + `clip_match_type: exact_quote_match`.

## Quality bar / diversity rules (apply per state at the fan-in step)

- Fill **empty type × register cells** (insight_type: mechanism/story/reframe/permission;
  voice_register: direct, expert/scientific, warm/affirming, vulnerable/personal, intellectual/measured).
- **Cap TED/TEDx family at ≤3 per state**; prefer non-TED for story/warm/permission slots.
- Avoid at-cap / already-overused speakers; maximize distinct source families and unique speakers.
- Must pass `validate-media` (0 hard violations) and `test-magnet-risk` (no candidate wins >50% of a
  state's probes) before promotion.

---

## State-by-state status

| # | State | Baseline | Target | Status |
|---|-------|---------:|-------:|--------|
| 1 | momentum-gap          | 6  | 16 | ✅ DONE (on disk, committed) |
| 2 | possibility-paralysis | 7  | 17 | ✅ DONE (on disk, committed) |
| 3 | identity-transition   | 8  | 18 | ⏳ TODO (+10) |
| 4 | engagement-drought    | 10 | 20 | ⏳ TODO (+10) |
| 5 | inaction-loop         | 10 | 20 | ⏳ TODO (+10) |
| 6 | direction-collapse    | 10 | 20 | ⏳ TODO (+10) |

**Remaining work: 4 states × +10 = 40 SIOs.**

---

## How to resume (works for CLI or Cursor agent)

1. **Re-derive live truth from disk** (don't trust this table blindly):
   ```bash
   ls -1 corpus/sios/*.md | wc -l
   grep -h "^primary_state_tag:" corpus/sios/*.md | sort | uniq -c | sort -rn
   ```
   Any state below its target above is unfinished; resume at the first such state.

2. **Find the gaps to fill** for the next state:
   ```bash
   npm run detect-gaps      # ranked empty type×register/intensity cells per state
   ```

3. **Research + verify candidates** for that state's empty cells (official source, verbatim excerpt,
   timestamp). Honesty gate is human-confirmed — never auto-set `transcript_verified: true`.

4. **Author the batch** (dry-run, then apply):
   ```bash
   npx tsx scripts/author-sio-batch.ts <candidate_batch>.json        # dry-run
   npx tsx scripts/author-sio-batch.ts <candidate_batch>.json --apply
   ```

5. **QA the batch before moving on:**
   ```bash
   npm run validate-media
   npm run test-magnet-risk
   npm run ingest            # confirm new SIOs load & serve
   ```

6. **Commit the completed state** before starting the next (insurance):
   ```bash
   git add corpus/sios/<state>_*.md corpus/sources/<new sources>
   git commit -m "Corpus expansion: <state> N→M (+10 verified SIOs)"
   ```

7. Repeat for each remaining state. When all six are at target, hand back for report finalization
   (fill `[[PENDING]]` markers in `ai/reports/silhouette_project_report.html`, then export the PDF).

---

## Notes

- The Claude CLI's in-memory plan does **not** survive a hard stop; this file + disk state are the
  source of truth for resumption.
- `scripts/author-sio-batch.ts` was created mid-build and is the canonical authoring path for this batch.
- Branch: `business-work-beyond-assignment`.
