---
# ══════════════════════════════════════════════════════════════════
# SILHOUETTE — SIO TEMPLATE (Structured Insight Object)
# One file = one retrievable insight moment.
# ══════════════════════════════════════════════════════════════════
#
# EMBEDDING INPUT (what the retrieval engine searches against):
#   key_claim + ". " + content_summary + " " + transcript_excerpt
#   key_claim leads — it is the primary semantic anchor. Write it first.
#   If using E5/instruction-tuned models, prepend: "passage: " to this string.
#
# REQUIRED FIELDS CHECKLIST (all 14 must be complete before: approved)
#   [ ] insight_id         [ ] source_id          [ ] speaker
#   [ ] primary_state_tag  [ ] insight_type        [ ] voice_register
#   [ ] credibility_tier   [ ] intensity_level     [ ] key_claim
#   [ ] content_summary    [ ] attribution_text    [ ] tagger_confidence
#   [ ] human_review_status [ ] ingestion_date
#
# Fields marked REQUIRED = must be complete before approved
# Fields marked OPTIONAL = add in second pass; improve retrieval but not blocking
# Fields marked CONDITIONAL = only fill when explicitly noted
# ══════════════════════════════════════════════════════════════════

# ── IDENTITY ──────────────────────────────────────────────────────
insight_id: ""
# REQUIRED. Format: sio-[speaker-slug]-[topic-slug]-[year]
# Example: sio-mcconaughey-go-to-zero-2020

source_id: ""
# REQUIRED. Must match a Source Object file in corpus/sources/
# Format: src-[show-slug]-[episode-slug]-[year]
# Example: src-tim-ferriss-mcconaughey-2020

# ── SOURCE ────────────────────────────────────────────────────────
source_type: ""
# REQUIRED. One of:
# long-form interview podcast | solo educational | author crossover | ted talk | youtube native

speaker: ""
# REQUIRED. The attributed person — not the host.

show_or_platform: ""
# REQUIRED. Full show name as published.

episode_or_content_title: ""
# REQUIRED. Full episode title as published.

episode_or_content_date: ""
# REQUIRED. YYYY-MM-DD

timestamp_range: ""
# REQUIRED. HH:MM:SS–HH:MM:SS
# If approximate, append " (approx)" and mark human_review_status: pending

source_url: ""
# REQUIRED. Canonical URL to episode or content.

transcript_verified: false
# REQUIRED. true = excerpt is verbatim from transcript. false = paraphrase or reconstruction.
# Only approved SIOs may have false if transcript accuracy is non-critical.
# Prefer true for all production SIOs.

# ── MEDIA (PRESENTATION LAYER ONLY) ───────────────────────────────
# ⚠️ These fields are NOT used for retrieval.
# Retrieval is text-based: key_claim + content_summary + transcript_excerpt + state tags.
# These fields tell the UI how to present the insight after retrieval has already occurred.
#
# Full schema, status vocabulary, embed formats, confidence model, and the
# human-in-the-loop verification workflow live in:
#   ai/guides/video_source_finder_design.md
#
# HONESTY RULE: never fabricate a video_id, timestamp, or URL. A blank field with an
# honest media_verification_status (needs_review / unverified) always beats a guess.
# Tooling: `npm run find-video-sources` (inventory + search targets),
#          `npm run validate-media` (format + honesty checks).

source_media_type: ""
# What is the original source format?
# Options: youtube-video | podcast-video | podcast-audio | ted-talk | article | book | other

video_provider: ""
# Options: ted | youtube | vimeo | spotify | none
# "ted"  = official TED talk; embed via embed.ted.com (uses a slug, NOT a video_id)
# "none" = audio-only or text source; no embeddable video exists

video_id: ""
# Provider-specific video ID. YOUTUBE ONLY (11 chars): the string after ?v= in the watch URL.
# Example: https://youtube.com/watch?v=dQw4w9WgXcQ  →  video_id: dQw4w9WgXcQ
# TED uses a slug inside embed_url, so video_id stays BLANK for TED sources.
# Leave blank until playback-verified on the OFFICIAL channel. Do not guess.

video_url: ""
# OPTIONAL. Canonical public watch URL (e.g. https://www.youtube.com/watch?v=<id>,
# or the ted.com/talks/<slug> page). Informational; may hold a candidate URL pending review.

embed_url: ""
# Full iFrame embed URL. Leave blank until the underlying artifact is verified.
# TED format:     https://embed.ted.com/talks/<slug>
# YouTube format: https://www.youtube-nocookie.com/embed/{video_id}?start={start_s}&end={end_s}
# Use youtube-nocookie.com (privacy-enhanced mode — no cookies until user clicks play).

official_channel: ""
# OPTIONAL. Human name of the official channel/show (e.g. TED, Huberman Lab,
# The Tim Ferriss Show). Used to distinguish official uploads from re-uploads.

official_channel_url: ""
# OPTIONAL. URL of the official channel (e.g. https://www.youtube.com/@hubermanlab).

timestamp_start_seconds: null
# Integer or null. Seconds from video start where this insight begins.
# Derive from timestamp_range: HH×3600 + MM×60 + SS
# Example: 01:14:22  →  1×3600 + 14×60 + 22 = 4462. Used for YouTube ?start=.
# Leave null when not transcript-verified rather than committing a false precision.

timestamp_end_seconds: null
# Integer or null. Seconds where the insight ends.
# Example: 01:17:08  →  1×3600 + 17×60 + 8 = 4628. Used for YouTube ?end=.
# YouTube's end parameter is approximate — soft cue only, do not rely on it for hard stop.

display_mode: ""
# How should the presentation layer render this SIO?
# video-primary — embed video player; transcript below for accessibility and skimming
# audio-primary — source is audio-only; link or audio embed if available; transcript primary
# text-only     — no embeddable media; transcript and attribution only

media_available: null
# true  = video/audio is publicly accessible and embeddable right now
# false = video is private, taken down, or geo-restricted
# null  = not yet verified

media_verification_status: ""
# REQUIRED for media-bearing sources. One of:
# verified       — official artifact confirmed (TED canonical slug, or official channel
#                  links the exact video). Only this status may drive a video-primary embed.
# needs_review   — plausible official candidate found, but the playback artifact
#                  (esp. YouTube video_id) is not machine-confirmed. video_id stays blank.
# unverified     — not yet checked / existence unknown.
# unofficial     — only a non-official re-upload is available. Never embedded as official.
# not_applicable — source has no embeddable video by nature (book / article / audio-only).

media_verification_notes: ""
# What was verified, by what method + date, and exactly what remains unverified.
# Honest gaps go here. Required when media_verification_status is anything but unverified.

media_rights_notes: ""
# OPTIONAL. Video-specific rights or usage notes beyond the general source rights.
# Standard note for YouTube: "Embed only from official channel. Do not download or re-host."
# Standard note for TED:     "Embed via embed.ted.com only. Do not download or re-host."

# ── RETRIEVAL TAGS ─────────────────────────────────────────────────
primary_state_tag: ""
# REQUIRED. One of:
# direction-collapse | engagement-drought | inaction-loop
# possibility-paralysis | identity-transition | momentum-gap
#
# Tag from the USER's perspective: who in which state benefits from this?
# NOT from the speaker's topic. Use the decision tree in corpus_ingestion_pipeline.md §7.1.
# Complete this test before tagging: "A user in [state] benefits because it addresses [UPM signal]."

secondary_state_tags: []
# OPTIONAL. Other states this genuinely serves. Use sparingly — rare for a well-cut excerpt.

direction_collapse_variant: ""
# CONDITIONAL — only fill when primary_state_tag: direction-collapse AND variant is clear.
# Options: post-achievement | original
# Leave blank if variant is unclear.

insight_type: ""
# REQUIRED. One of:
# reframe    — changes what the situation IS or means
# permission — licenses a feeling or choice the user has been blocking
# mechanism  — explains WHY something happens (shifts attribution from personal failure to process)
# story      — someone's narrative of navigating a similar state
#
# Tag the function that makes this valuable for the primary state, not a secondary feature.

voice_register: ""
# REQUIRED. One of:
# direct/challenging   — confrontational; assumes capability; does not let user off the hook
# warm/affirming       — compassionate, validating; meets user where they are
# intellectual/measured — analytical, precise; value is in the quality of thinking
# vulnerable/personal  — speaker reveals their own struggle or uncertainty from the inside
# expert/scientific    — authority from credentials or research; explaining from expertise
#
# Tag the DOMINANT register. Tag HOW it's delivered — not the topic or what it says.
# Most common error: tagging direct/challenging just because the speaker sounds confident.

credibility_tier: ""
# REQUIRED. One of:
# tier-1 — speaker has direct lived experience of this specific stuck state
# tier-2 — domain expertise (coach, psychologist, career strategist)
# tier-3 — research/empirical basis (scientist citing published data)
#
# Tag the EXCERPT's framing, not the speaker's overall biography.
# A tier-1 speaker citing research in this excerpt → tag tier-3.

intensity_level: ""
# REQUIRED. One of: mild | moderate | intense
# mild     — gentle, inviting; low pressure on the listener
# moderate — direct but not confrontational; default for most excerpts
# intense  — forceful; places direct accountability on the listener
#
# Intense ≠ enthusiastic or serious. Intensity = pressure on the listener.

# ── KEY CONTENT ───────────────────────────────────────────────────
key_claim: ""
# REQUIRED. 1–2 sentences.
# The most retrievable distillation. The primary semantic anchor.
#
# Test before finalizing:
#   (1) Read it cold. Does someone in the primary state feel a shift from this alone?
#   (2) Is it a concrete CLAIM or an abstract description? Concrete retrieves better.
#   (3) Does it stand alone without the excerpt? If it needs context, rewrite.
#
# Write in the speaker's voice (first-person or declarative), not from outside it.
# Bad: "McConaughey discusses why career transitions require honesty."
# Bad: "This insight argues that external success prevents direction."
# Good: "You can't be honest about what you want when everything costs too much to tell the truth."

content_summary: ""
# REQUIRED. 2–4 sentences.
# What is this insight + why does it matter for the primary state?
# Name the reframe, mechanism, or narrative arc explicitly.
# Describe the value for a user in the target stuck state.

attribution_text: ""
# REQUIRED. Format: "Speaker Name, appearing on Show Name, 'Episode Title' (Month DD, YYYY)"
# This is presented verbatim to users. Completeness is non-negotiable.
# If episode title is long, use a shortened version only if unambiguous.

# ── QUALITY AND REVIEW ─────────────────────────────────────────────
tagger_confidence: ""
# REQUIRED. One of: high | medium | low
# high   — all tags clear; excerpt verbatim; standalone test passes confidently
# medium — one or more tags uncertain; transcript may need verification
# low    — significant uncertainty; SIO held back from index until re-reviewed

human_review_status: ""
# REQUIRED. One of: pending | reviewed | approved | flagged
# Only approved SIOs are indexed and served to users.
# pending  — not yet reviewed
# reviewed — reviewed but not yet approved
# approved — passes all quality gates; ready to index
# flagged  — issue identified; correction note required

ingestion_date: ""
# REQUIRED. YYYY-MM-DD

rights_or_usage_notes: ""
# OPTIONAL. Copyright concerns, unusual attribution requirements, or usage restrictions.

topic_keywords: []
# OPTIONAL. Up to 8 terms. Not used in MVP retrieval — reserved for future BM25 indexing.

# ── MATCH NOTES ────────────────────────────────────────────────────
user_problem_match_notes: ""
# RECOMMENDED. 1–3 sentences.
# What specific aspect of the stuck state does this address?
# Especially useful for non-obvious state fit or sub-state targeting.

resonance_match_notes: ""
# RECOMMENDED. 1–3 sentences.
# Who will this land with? Who might it miss?
# Flag if register is notably narrow or if intensity may clash with certain user profiles.
---

<!-- ══════════════════════════════════════════════════════════════
TRANSCRIPT EXCERPT — REQUIRED
Target: 120–180 words. Range: 75–250 words (hard limits).

Rules:
- Verbatim from transcript. Never paraphrased. Never restructured.
- Start just before the insight's setup. End after it naturally resolves.
- Standalone test: read cold with zero episode context. Does it make sense?
  Does it contain the full insight? If no — retrim or reject the candidate.
- Must be attributable to the named speaker (not someone they are describing).

⚠️ If transcript is not verified verbatim:
   - Set transcript_verified: false
   - Set tagger_confidence: medium or low
   - Set human_review_status: pending
   - Add a note below explaining what needs verification
═══════════════════════════════════════════════════════════════ -->

[Paste verbatim transcript excerpt here]
