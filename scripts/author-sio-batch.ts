/**
 * author-sio-batch.ts — Writes verified SIO candidates to corpus/sios/ + corpus/sources/.
 *
 * Input: a JSON file (path arg) = array of fully-specified, ALREADY-VERIFIED candidate
 * objects (verbatim excerpt + official video + context-aware timestamp confirmed by a
 * human/agent verification pass). This tool does NOT verify — it only renders the
 * corpus-format files from data you have already checked. Honesty stays upstream.
 *
 * For each candidate it writes:
 *   corpus/sios/<filename>.md           (SIO template frontmatter + verbatim excerpt body)
 *   corpus/sources/<source_id>.json     (source object, linked back to the insight_id)
 *
 * Usage: npx tsx scripts/author-sio-batch.ts <batch.json> [--apply]
 *        (dry-run prints what it would write; --apply writes the files)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const SIOS = join(ROOT, "corpus", "sios");
const SOURCES = join(ROOT, "corpus", "sources");

interface Cand {
  insight_id: string; filename: string; source_id: string;
  source_type: string; speaker: string; show_or_platform: string;
  episode_or_content_title: string; episode_or_content_date: string; source_url: string;
  transcript_verified: boolean;
  source_media_type: string; video_provider: string; video_id?: string; ted_slug?: string;
  video_url?: string; official_channel?: string; official_channel_url?: string; channel_id?: string;
  transcript_url?: string;
  timestamp_start_seconds: number | null; timestamp_end_seconds: number | null; timestamp_range: string;
  display_mode: string; media_verification_status: string; media_verification_notes: string;
  media_rights_notes?: string; clip_match_type?: string;
  primary_state_tag: string; secondary_state_tags?: string[]; direction_collapse_variant?: string;
  insight_type: string; voice_register: string; credibility_tier: string; intensity_level: string;
  key_claim: string; content_summary: string; attribution_text: string;
  tagger_confidence: string; human_review_status: string; ingestion_date: string;
  rights_or_usage_notes?: string; topic_keywords?: string[];
  user_problem_match_notes: string; resonance_match_notes: string;
  excerpt: string;
}

function buildEmbed(c: Cand): string {
  if (c.video_provider === "youtube" && c.video_id) {
    const base = `https://www.youtube-nocookie.com/embed/${c.video_id}`;
    const p: string[] = [];
    if (typeof c.timestamp_start_seconds === "number" && c.timestamp_start_seconds >= 0)
      p.push(`start=${c.timestamp_start_seconds}`);
    if (typeof c.timestamp_end_seconds === "number" && c.timestamp_end_seconds > (c.timestamp_start_seconds ?? 0))
      p.push(`end=${c.timestamp_end_seconds}`);
    return p.length ? `${base}?${p.join("&")}` : base;
  }
  if (c.video_provider === "ted" && c.ted_slug) return `https://embed.ted.com/talks/${c.ted_slug}`;
  return "";
}
function watchUrl(c: Cand): string {
  if (c.video_url) return c.video_url;
  if (c.video_provider === "youtube" && c.video_id) return `https://www.youtube.com/watch?v=${c.video_id}`;
  if (c.video_provider === "ted" && c.ted_slug) return `https://www.ted.com/talks/${c.ted_slug}`;
  return "";
}
const q = (s: string) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const arr = (a?: string[]) => `[${(a ?? []).map((x) => q(x)).join(", ")}]`;

function sioMarkdown(c: Cand): string {
  const embed = buildEmbed(c);
  const watch = watchUrl(c);
  const L: string[] = ["---"];
  L.push(`insight_id: ${c.insight_id}`);
  L.push(`source_id: ${c.source_id}`);
  L.push("");
  L.push(`source_type: ${c.source_type}`);
  L.push(`speaker: ${q(c.speaker)}`);
  L.push(`show_or_platform: ${q(c.show_or_platform)}`);
  L.push(`episode_or_content_title: ${q(c.episode_or_content_title)}`);
  L.push(`episode_or_content_date: ${q(c.episode_or_content_date)}`);
  L.push(`timestamp_range: ${q(c.timestamp_range)}`);
  L.push(`source_url: ${q(c.source_url)}`);
  L.push(`transcript_verified: ${c.transcript_verified}`);
  L.push("");
  L.push("# ── MEDIA (PRESENTATION LAYER ONLY) ───────────────────────────────");
  L.push(`source_media_type: ${c.source_media_type}`);
  L.push(`video_provider: ${c.video_provider}`);
  L.push(`official_channel: ${q(c.official_channel ?? "")}`);
  L.push(`official_channel_url: ${q(c.official_channel_url ?? "")}`);
  if (c.channel_id) L.push(`channel_id: ${q(c.channel_id)}`);
  L.push(`video_id: ${q(c.video_id ?? "")}`);
  L.push(`video_url: ${q(watch)}`);
  L.push(`embed_url: ${q(embed)}`);
  L.push(`timestamp_start_seconds: ${c.timestamp_start_seconds ?? "null"}`);
  L.push(`timestamp_end_seconds: ${c.timestamp_end_seconds ?? "null"}`);
  L.push(`display_mode: ${c.display_mode}`);
  L.push(`media_available: true`);
  L.push(`media_verification_status: ${c.media_verification_status}`);
  if (c.clip_match_type) L.push(`clip_match_type: ${c.clip_match_type}`);
  L.push(`media_verification_notes: ${q(c.media_verification_notes)}`);
  L.push(`media_rights_notes: ${q(c.media_rights_notes ?? "")}`);
  L.push("");
  L.push(`primary_state_tag: ${c.primary_state_tag}`);
  L.push(`secondary_state_tags: ${arr(c.secondary_state_tags)}`);
  if (c.direction_collapse_variant) L.push(`direction_collapse_variant: ${c.direction_collapse_variant}`);
  L.push("");
  L.push(`insight_type: ${c.insight_type}`);
  L.push(`voice_register: ${q(c.voice_register)}`);
  L.push(`credibility_tier: ${c.credibility_tier}`);
  L.push(`intensity_level: ${c.intensity_level}`);
  L.push("");
  L.push(`key_claim: ${q(c.key_claim)}`);
  L.push("");
  L.push(`content_summary: ${q(c.content_summary)}`);
  L.push("");
  L.push(`attribution_text: ${q(c.attribution_text)}`);
  L.push("");
  L.push(`tagger_confidence: ${c.tagger_confidence}`);
  L.push(`human_review_status: ${c.human_review_status}`);
  L.push(`ingestion_date: ${q(c.ingestion_date)}`);
  L.push(`rights_or_usage_notes: ${q(c.rights_or_usage_notes ?? "")}`);
  L.push(`topic_keywords: ${arr(c.topic_keywords)}`);
  L.push("");
  L.push(`user_problem_match_notes: ${q(c.user_problem_match_notes)}`);
  L.push("");
  L.push(`resonance_match_notes: ${q(c.resonance_match_notes)}`);
  L.push("---");
  L.push("");
  L.push(c.excerpt.trim());
  L.push("");
  return L.join("\n");
}

function sourceJson(c: Cand): string {
  const obj: Record<string, unknown> = {
    source_id: c.source_id,
    source_type: c.source_type,
    speaker: c.speaker,
    show_or_platform: c.show_or_platform,
    episode_or_content_title: c.episode_or_content_title,
    episode_or_content_date: c.episode_or_content_date,
    source_url: c.source_url,
    video_provider: c.video_provider,
    video_id: c.video_id ?? "",
    video_url: watchUrl(c),
    embed_url: buildEmbed(c),
    official_channel: c.official_channel ?? "",
    official_channel_url: c.official_channel_url ?? "",
    channel_id: c.channel_id ?? "",
    transcript_url: c.transcript_url ?? "",
    transcript_available: !!c.transcript_url || c.transcript_verified,
    transcript_verified: c.transcript_verified,
    timestamp_verified: c.timestamp_start_seconds !== null,
    media_available: true,
    media_verification_status: c.media_verification_status,
    source_confidence: "high",
    verification_notes: c.media_verification_notes,
    rights_or_usage_notes: c.rights_or_usage_notes ?? c.media_rights_notes ?? "",
    sios: [c.insight_id],
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

function main() {
  const args = process.argv.slice(2);
  const path = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");
  if (!path) { console.error("usage: author-sio-batch <batch.json> [--apply]"); process.exit(1); }
  const cands: Cand[] = JSON.parse(readFileSync(path, "utf-8"));
  for (const c of cands) {
    const sioPath = join(SIOS, `${c.filename}.md`);
    const srcPath = join(SOURCES, `${c.source_id}.json`);
    const sioExists = existsSync(sioPath);
    console.log(`${apply ? "WRITE" : "DRY"}  ${c.filename}.md  (${c.primary_state_tag} · ${c.insight_type}/${c.voice_register} · ${c.video_provider} @ ${c.timestamp_range})${sioExists ? "  [OVERWRITE]" : ""}`);
    if (apply) {
      writeFileSync(sioPath, sioMarkdown(c), "utf-8");
      writeFileSync(srcPath, sourceJson(c), "utf-8");
    }
  }
  console.log(`\n${apply ? "WROTE" : "DRY-RAN"} ${cands.length} SIOs + sources.`);
}
main();
