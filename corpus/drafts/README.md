# corpus/drafts/ — SIO Draft Staging

This folder holds **draft SIOs** produced by `npm run draft-sio-from-candidate` from a
reviewed candidate. Drafts are **not served to users** — the SIO loader only reads
`corpus/sios/`.

## The hard rule

A draft here is **never** production. A **human** must:

1. Read the draft and the candidate's evidence.
2. Capture/confirm the **verbatim** transcript excerpt + real timestamp from the official source.
3. Set `transcript_verified: true` only with that evidence.
4. Set `human_review_status: approved` only after a final word-for-word check.
5. **Manually move** the file from `corpus/drafts/` to `corpus/sios/`.

Until then, every draft carries `human_review_status: prototype_only` (or `needs_review`)
and `transcript_verified: false`. The drafting script never sets `approved`, never sets
`transcript_verified: true`, and never writes into `corpus/sios/`.
