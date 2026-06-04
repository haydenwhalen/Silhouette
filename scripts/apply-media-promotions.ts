/**
 * apply-media-promotions.ts — Applies a vetted batch of media embed promotions.
 *
 * Each promotion was researched + verified by a per-SIO agent (official channel
 * confirmed, quote/concept confirmed in the video's captions via yt-dlp). This
 * script applies ONLY the media-layer fields with safe, targeted line edits —
 * it never touches the SIO body, key_claim, or non-media frontmatter.
 *
 * Honesty: clip_match_type is exact_quote_match ONLY where transcript_verified
 * is already true (verbatim body). Reconstruction / paraphrase / secondary-
 * episode bodies get talking_point and keep transcript_verified untouched.
 *
 * Dry-run by default; pass --apply to write. Run: tsx scripts/apply-media-promotions.ts --apply
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const SIOS = join(ROOT, "corpus", "sios");
const CH = {
  timferriss: { name: "The Tim Ferriss Show", id: "UCznv7Vf9nBdJYvBagFdAHWw" },
  tedx: { name: "TEDx Talks", id: "UCsT0YIqwnpJCM-mx7-gSA4Q" },
  huberman: { name: "Huberman Lab", id: "UC2D2CMWXMOVWx7giW1n3LIg" },
  richroll: { name: "Rich Roll", id: "UCpjlh0e319ksmoOD7bQFSiw" },
};

interface Promo {
  file: string;
  video_id: string;
  channel: { name: string; id: string };
  source_media_type: string;
  clip_match_type: "exact_quote_match" | "talking_point";
  note: string; // replaces media_verification_notes
}

// The 10 no-media (not_applicable) SIOs. Goggins + Huberman-dopamine are
// needs_review (they already carry partial media + a timestamp) and are handled
// in a separate targeted pass below, NOT here.
const PROMOS: Promo[] = [
  {
    file: "direction_collapse_millman_busy_decision.md",
    video_id: "ZoF55SXO6ik", channel: CH.timferriss,
    source_media_type: "podcast-video", clip_match_type: "exact_quote_match",
    note: "Official Tim Ferriss YouTube upload of the full episode #304 (video_id ZoF55SXO6ik, channel UCznv7Vf9nBdJYvBagFdAHWw). The SIO body ('Busy is a decision. We do the things we want to do, period.') is confirmed verbatim in the video's auto-captions at ~14:08 and in the official tim.blog transcript — exact_quote_match honest (transcript_verified: true). Promoted from audio-only 2026-06-04 after per-SIO agent verification (captions pulled via yt-dlp). An unofficial re-upload was removed by Tim Ferriss copyright claim, confirming this is the authoritative source. Timestamp pinned separately by extract-video-timestamps.",
  },
  {
    file: "inaction_loop_clear_trajectory.md",
    video_id: "T2r1jyhT2vg", channel: CH.timferriss,
    source_media_type: "podcast-video", clip_match_type: "exact_quote_match",
    note: "Official Tim Ferriss YouTube upload of the full episode #648 (video_id T2r1jyhT2vg, channel UCznv7Vf9nBdJYvBagFdAHWw). The SIO body ('Can my current habits carry me to my desired future...') is confirmed verbatim in the auto-captions at ~07:10 and in the official tim.blog transcript, spoken by James Clear — exact_quote_match honest (transcript_verified: true). Promoted 2026-06-04 after per-SIO agent verification via yt-dlp captions. Timestamp pinned separately by extract-video-timestamps.",
  },
  {
    file: "inaction_loop_jocko_discipline.md",
    video_id: "PQvTQebCqxQ", channel: CH.timferriss,
    source_media_type: "podcast-video", clip_match_type: "exact_quote_match",
    note: "Official Tim Ferriss YouTube upload of the full episode #187 (video_id PQvTQebCqxQ, channel UCznv7Vf9nBdJYvBagFdAHWw). The SIO body ('Motivation is fickle... don't count on motivation. Count on discipline.') is confirmed near-verbatim in the auto-captions at ~55:32 and in the official tim.blog transcript — exact_quote_match honest (transcript_verified: true). NOTE: YouTube upload_date 2016-10-25 lags the SIO's stated episode date 2016-09-21 (same episode #187, confirmed by the verbatim listener-Q&A quote match). Promoted 2026-06-04 after agent verification via yt-dlp. Timestamp pinned separately.",
  },
  {
    file: "identity_transition_rich_roll_recovery_reinvention.md",
    video_id: "bR6JHIZKJdI", channel: CH.timferriss,
    source_media_type: "podcast-video", clip_match_type: "talking_point",
    note: "Official Tim Ferriss YouTube upload of the full episode #561 (video_id bR6JHIZKJdI, channel UCznv7Vf9nBdJYvBagFdAHWw). This IS the source episode and the core claim is confirmed in the captions at ~49:36, but the SIO body is a prototype_only reconstruction (not verbatim), so clip_match_type is talking_point and transcript_verified stays false until the body is replaced with the verbatim passage. Promoted 2026-06-04 after agent verification via yt-dlp. Timestamp = context start of the confirmed moment.",
  },
  {
    file: "inaction_loop_pressfield.md",
    video_id: "tC44dTV0kKo", channel: CH.timferriss,
    source_media_type: "podcast-video", clip_match_type: "talking_point",
    note: "OFFICIAL SECONDARY video. Tim Ferriss YouTube upload of episode #501 (video_id tC44dTV0kKo, channel UCznv7Vf9nBdJYvBagFdAHWw), where Pressfield defines 'Resistance with a capital R' / 'the force of self-sabotage' in his own voice (confirmed in captions at ~58:22 and ~1:08:29). This is NOT the SIO's cited 2015 source episode #84 (audio-only; its tim.blog page now 404s), so it is a same-speaker secondary on the same idea → talking_point, transcript_verified false. Promoted 2026-06-04 after agent verification via yt-dlp. Timestamp = confirmed moment.",
  },
  {
    file: "possibility_paralysis_sivers_hell_yeah_or_no.md",
    video_id: "gnk4sgOFjBQ", channel: CH.timferriss,
    source_media_type: "podcast-video", clip_match_type: "talking_point",
    note: "OFFICIAL SECONDARY video. Tim Ferriss YouTube upload of episode #128 'Derek Sivers Reloaded' (video_id gnk4sgOFjBQ, channel UCznv7Vf9nBdJYvBagFdAHWw), where Sivers states the 'hell yeah or no' filter near-verbatim (confirmed in captions ~57:36-59:02). This is NOT the SIO's cited episode #125 (audio-only, no official video), so it is classified secondary → talking_point, transcript_verified false. Sivers' TED talks are unrelated to this idea. Promoted 2026-06-04 after agent verification via yt-dlp. Timestamp = confirmed moment.",
  },
  {
    file: "momentum_gap_fogg_shrink_the_restart.md",
    video_id: "AdKUJxjn-R8", channel: CH.tedx,
    source_media_type: "youtube-video", clip_match_type: "talking_point",
    note: "Official TEDx Talks YouTube upload 'Forget big change, start with a tiny habit: BJ Fogg at TEDxFremont' (video_id AdKUJxjn-R8, channel UCsT0YIqwnpJCM-mx7-gSA4Q, 2012). The talk expresses the SIO's automaticity mechanism (confirmed in captions at ~06:42: 'You already know how to floss all your teeth... what you're lacking is the automaticity'). SIO body is a prototype_only reconstruction → talking_point, transcript_verified false. METADATA FLAG: the SIO's title/date/source_url currently point at the 2019 'Tiny Habits' book, not the 2012 talk — reconcile in a later pass. Promoted 2026-06-04 after agent verification via yt-dlp.",
  },
  {
    file: "momentum_gap_neff_lapse_not_identity.md",
    video_id: "IvtZBUSplr4", channel: CH.tedx,
    source_media_type: "youtube-video", clip_match_type: "talking_point",
    note: "Official TEDx Talks YouTube upload 'The Space Between Self-Esteem and Self-Compassion: Kristin Neff at TEDxCentennialParkWomen' (video_id IvtZBUSplr4, channel UCsT0YIqwnpJCM-mx7-gSA4Q, 2013). The talk expresses the SIO's permission (confirmed in the official manual captions at ~15:06: 'it's there for you precisely when you fail. Just when self-esteem deserts you, self-compassion steps in'). The SIO's specific 'falling off a habit' framing is the author's application; the underlying idea is present → talking_point, transcript_verified false. METADATA FLAG: actual talk date is 2013-02-07 (SIO records 2020). Avoid the non-official re-uploads pKEtknqHTjo / wh8ffxvM1eg. Promoted 2026-06-04 after agent verification via yt-dlp.",
  },
  {
    file: "momentum_gap_huberman_limbic_friction_reentry.md",
    video_id: "Wcs2PFz5q6g", channel: CH.huberman,
    source_media_type: "podcast-video", clip_match_type: "talking_point",
    note: "Official Huberman Lab YouTube upload, full episode #53 (video_id Wcs2PFz5q6g, channel UC2D2CMWXMOVWx7giW1n3LIg), linked from the official hubermanlab.com episode page. This IS the cited episode; the 'limbic friction' mechanism is confirmed in the captions (definition at ~13:57; no-compensation/restart guidance ~1:21:26). SIO body is a reconstruction → talking_point, transcript_verified false. METADATA FLAG: actual publication 2022-01-03 (SIO records approximate 2020). Promoted 2026-06-04 after agent verification via yt-dlp. Timestamp = confirmed concept moment.",
  },
  {
    file: "identity_transition_renfrew_post_exit_identity.md",
    video_id: "9hHAuPRdHws", channel: CH.richroll,
    source_media_type: "podcast-video", clip_match_type: "talking_point",
    note: "Official Rich Roll YouTube upload of the full episode #954 (video_id 9hHAuPRdHws, channel UCpjlh0e319ksmoOD7bQFSiw), embedded on the richroll.com episode page. Renfrew expresses the post-exit identity-collapse insight in her own words at ~36:22 ('who am I without Beautycounter? Who am I as not a CEO...'); the SIO's quoted 'identity crisis of existential proportions' is from the official episode description. SIO body is a reconstruction → talking_point, transcript_verified false. Promoted 2026-06-04 after agent verification via yt-dlp. Timestamp = confirmed moment.",
  },
];

function applyOne(p: Promo, apply: boolean): string[] {
  const path = join(SIOS, p.file);
  let raw = readFileSync(path, "utf-8");
  const warns: string[] = [];
  const url = `https://www.youtube.com/watch?v=${p.video_id}`;
  const embed = `https://www.youtube-nocookie.com/embed/${p.video_id}`;

  const sub = (re: RegExp, to: string, label: string) => {
    if (!re.test(raw)) { warns.push(`${p.file}: could not match ${label}`); return; }
    raw = raw.replace(re, to);
  };

  sub(/^source_media_type:.*$/m, `source_media_type: ${p.source_media_type}`, "source_media_type");
  sub(/^video_provider:\s*none\s*$/m, `video_provider: youtube`, "video_provider:none");
  sub(/^video_id:\s*""\s*$/m, `video_id: "${p.video_id}"`, 'video_id:""');
  sub(/^video_url:\s*""\s*$/m, `video_url: "${url}"`, 'video_url:""');
  sub(/^embed_url:\s*""\s*$/m, `embed_url: "${embed}"`, 'embed_url:""');
  sub(/^display_mode:\s*(?:audio-primary|text-only)\s*$/m, `display_mode: video-primary`, "display_mode");
  sub(/^media_verification_status:\s*not_applicable\s*$/m, `media_verification_status: verified`, "media_verification_status");

  // Insert channel_id after official_channel_url (if not already present).
  if (!/^channel_id:/m.test(raw)) {
    sub(/^(official_channel_url:.*)$/m, `$1\nchannel_id: "${p.channel.id}"`, "channel_id insert anchor");
  }
  // Point official_channel_url at the actual YouTube channel.
  sub(/^official_channel_url:.*$/m, `official_channel_url: "https://www.youtube.com/channel/${p.channel.id}"`, "official_channel_url");

  // Insert clip_match_type after media_verification_status (if absent).
  if (!/^clip_match_type:/m.test(raw)) {
    sub(/^(media_verification_status:\s*verified\s*)$/m, `$1\nclip_match_type: ${p.clip_match_type}`, "clip_match_type insert anchor");
  } else {
    sub(/^clip_match_type:.*$/m, `clip_match_type: ${p.clip_match_type}`, "clip_match_type");
  }

  // Replace media_verification_notes value (single-line greedy).
  const escaped = p.note.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  sub(/^(media_verification_notes:\s*")(.*)("\s*)$/m, `$1${escaped}$3`, "media_verification_notes");

  if (apply) writeFileSync(path, raw, "utf-8");
  return warns;
}

function main() {
  const apply = process.argv.includes("--apply");
  const allWarns: string[] = [];
  for (const p of PROMOS) {
    allWarns.push(...applyOne(p, apply));
    console.log(`${apply ? "APPLIED" : "DRY"} ${p.file} → ${p.video_id} (${p.clip_match_type})`);
  }
  if (allWarns.length) {
    console.log("\nWARNINGS:");
    for (const w of allWarns) console.log("  - " + w);
  } else {
    console.log("\nNo warnings — all fields matched.");
  }
}

main();
