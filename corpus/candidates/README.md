# corpus/candidates/ — SIO Candidate Inbox

This folder is the **staging inbox** for the SIO Discovery Agent. Each `*.yaml` file is
**one proposed insight moment** that is being researched, scored, and verified *before* it
could ever become a real SIO.

**Nothing in this folder is served to users.** Candidates are not in the retrieval index.
The SIO loader only reads `corpus/sios/`.

## The pipeline (and where humans gate it)

```
propose a candidate (human or Source Scout)
        │
        ▼
corpus/candidates/<id>.yaml   ── status: proposed
        │
        ├─ npm run evaluate-candidate      → Human Resonance Score (LLM-as-judge)
        ├─ npm run score-candidate-novelty → novelty vs existing corpus (embeddings)
        ├─ npm run verify-candidate-source → honest source/media/transcript checks
        │
        ▼
   status advances (needs_* → promising → ready_for_sio_draft)
        │
        ▼
npm run draft-sio-from-candidate  → corpus/drafts/<id>.md   (prototype_only, NOT served)
        │
        ▼
   ★ HUMAN reviews the draft, verifies the verbatim quote, then manually
     moves it to corpus/sios/ and sets human_review_status: approved ★
```

A human is **required** at the final gate. No script writes to `corpus/sios/` or sets
`human_review_status: approved` / `transcript_verified: true`.

## Candidate statuses

| Status | Meaning |
|---|---|
| `proposed` | Newly added; not yet scored/verified |
| `needs_source_verification` | Source URL / official channel not yet confirmed |
| `needs_transcript_verification` | Quote not yet confirmed verbatim against an official transcript |
| `needs_quote_review` | A human should sanity-check the chosen moment |
| `ready_for_sio_draft` | Passed scores + has the evidence needed to draft |
| `drafted` | A draft SIO exists in `corpus/drafts/` |
| `approved` | A human approved + moved it into `corpus/sios/` |
| `rejected` | Failed the bar (generic, weak source, duplicate, …) |
| `archived` | Kept for record but not pursued |

## Honesty rules (non-negotiable)

- **Never** fill `transcript_excerpt`, `timestamp_*`, `video_id`, or `embed_url` unless you
  actually have the evidence. Blank beats guessed.
- `quote_type` must be honest: `verbatim` only when the text is copied from an official
  transcript; otherwise `paraphrase` or `unknown`.
- `media_verification_status` / `transcript_verification_status` default to `needs_review`.
- Re-uploads are never `verified` — mark `unofficial`.

## How to add a candidate

1. Copy `candidate_template.yaml` to `cand-<speaker>-<topic>.yaml`.
2. Fill targeting + source identity + the moment summary + `key_claim`. Leave scores blank.
3. Run the scripts (or `npm run discover-sios --candidate <path>`).
4. Read the review queue (`npm run review-candidates`) and decide.

See `ai/guides/agentic_sio_discovery_workflow.md` for the full guide and
`ai/guides/agentic_sio_discovery_system_design.md` for the architecture.
