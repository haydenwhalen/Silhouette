/**
 * audit-corpus-media.ts — Full-corpus media inventory + backfill categorization.
 *
 * Reads every corpus/sios/*.md and emits a categorized inventory used to plan a
 * media backfill pass. Pure read; NEVER writes to SIOs.
 *
 * Backfill categories (per SIO):
 *   - already_good            verified embed (TED) or verified embed + timestamp
 *   - needs_timestamp_only    verified YouTube embed, no timestamp yet
 *   - needs_video_embed       no embed, but source is a podcast/talk likely to
 *                             have an official video (official channel exists)
 *   - needs_source_fallback   no embed, text source, has a source_url to link
 *   - secondary_source_possible  book/article where the speaker likely has a
 *                             secondary talk/podcast (talking_point only)
 *   - probably_text_only      book/article with no plausible official video form
 *   - integrity_issue         a known/flagged correctness problem
 *
 * Output: ai/guides/full_corpus_media_inventory.md (+ JSON to stdout).
 *
 * Run: npm run audit-corpus-media
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";

const ROOT = process.cwd();
const SIOS_DIR = join(ROOT, "corpus", "sios");
const OUT = join(ROOT, "ai", "guides", "full_corpus_media_inventory.md");

// Podcast/show domains whose publishers run an official YouTube channel that
// posts full episodes (so a verified, timestampable embed is plausible).
const PODCAST_DOMAINS = new Set([
  "tim.blog",
  "richroll.com",
  "hubermanlab.com",
  "artofmanliness.com",
  "lewishowes.com",
  "melrobbins.com",
]);

// Known integrity flags (insight_id → reason). Surfaced as integrity_issue so
// the inventory never silently presents a suspect SIO as healthy.
const INTEGRITY_FLAGS: Record<string, string> = {
  // sio-perel-survival-vs-revival-2017 RESOLVED 2026-06-04: video corrected from
  // EyopAlh04iA to the verified Hu-sCM0eXaw (quote confirmed at ~24:11).
};

type Fm = Record<string, unknown>;

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}
function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
function readFm(raw: string): Fm {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const parsed = parseYaml(raw.slice(3, end).trim());
  return parsed && typeof parsed === "object" ? (parsed as Fm) : {};
}
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface Row {
  file: string;
  insight_id: string;
  speaker: string;
  source_title: string;
  source_type: string;
  source_url: string;
  domain: string;
  state: string;
  provider: string;
  video_id: string;
  embed_url: string;
  media_status: string;
  clip_match_type: string;
  transcript_verified: boolean;
  ts_start: number | null;
  ts_end: number | null;
  human_review_status: string;
  has_rights_notes: boolean;
  has_verified_embed: boolean;
  category: string;
  category_reason: string;
}

function categorize(r: Row): { category: string; reason: string } {
  if (INTEGRITY_FLAGS[r.insight_id]) {
    return { category: "integrity_issue", reason: INTEGRITY_FLAGS[r.insight_id] };
  }
  if (r.has_verified_embed) {
    if (r.provider === "ted") {
      return { category: "already_good", reason: "verified TED embed (cannot deep-link; timestamp N/A)" };
    }
    if (r.ts_start !== null) {
      return { category: "already_good", reason: "verified YouTube embed with timestamp" };
    }
    return { category: "needs_timestamp_only", reason: "verified YouTube embed, no timestamp yet" };
  }
  // No verified embed below.
  const isPodcast =
    r.source_type.includes("podcast") ||
    r.source_type.includes("interview") ||
    r.source_type === "solo educational";
  const isTedSourced = r.source_type === "ted talk";
  const isText = r.source_type === "book" || r.source_type === "article";

  if (r.media_status === "needs_review") {
    return { category: "needs_video_embed", reason: "media_verification_status: needs_review — candidate channel known, video_id unconfirmed" };
  }
  if (isTedSourced) {
    return { category: "needs_video_embed", reason: "source is a TED/TEDx talk but no embed mounted — official TED or YouTube TEDx embed likely available" };
  }
  if (isPodcast && PODCAST_DOMAINS.has(r.domain)) {
    return { category: "needs_video_embed", reason: `podcast source on ${r.domain} — publisher runs an official YouTube channel; full-episode embed + timestamp plausible` };
  }
  if (isPodcast) {
    return { category: "needs_source_fallback", reason: `podcast source on ${r.domain || "unknown domain"} — official video channel not confirmed; source-link fallback` };
  }
  if (isText) {
    return { category: "secondary_source_possible", reason: `${r.source_type} source — original is text; speaker may have a secondary talk/podcast (talking_point only), else text-only` };
  }
  return { category: "probably_text_only", reason: "no embeddable official video by nature of source" };
}

function main() {
  const files = readdirSync(SIOS_DIR).filter((f) => f.endsWith(".md")).sort();
  const rows: Row[] = [];

  for (const file of files) {
    const fm = readFm(readFileSync(join(SIOS_DIR, file), "utf-8"));
    const provider = str(fm.video_provider);
    const embed = str(fm.embed_url);
    const status = str(fm.media_verification_status);
    const r: Row = {
      file,
      insight_id: str(fm.insight_id),
      speaker: str(fm.speaker),
      source_title: str(fm.episode_or_content_title),
      source_type: str(fm.source_type),
      source_url: str(fm.source_url),
      domain: domainOf(str(fm.source_url)),
      state: str(fm.primary_state_tag),
      provider,
      video_id: str(fm.video_id),
      embed_url: embed,
      media_status: status,
      clip_match_type: str(fm.clip_match_type),
      transcript_verified: fm.transcript_verified === true,
      ts_start: num(fm.timestamp_start_seconds),
      ts_end: num(fm.timestamp_end_seconds),
      human_review_status: str(fm.human_review_status),
      has_rights_notes: !!str(fm.media_rights_notes),
      has_verified_embed: status === "verified" && !!embed,
      category: "",
      category_reason: "",
    };
    const c = categorize(r);
    r.category = c.category;
    r.category_reason = c.reason;
    rows.push(r);
  }

  // ── Summary counts ──
  const count = (pred: (r: Row) => boolean) => rows.filter(pred).length;
  const byCat = rows.reduce<Record<string, number>>((a, r) => {
    a[r.category] = (a[r.category] ?? 0) + 1;
    return a;
  }, {});

  const summary = {
    total: rows.length,
    verified_embeds: count((r) => r.has_verified_embed),
    youtube_embeds: count((r) => r.has_verified_embed && r.provider === "youtube"),
    ted_embeds: count((r) => r.has_verified_embed && r.provider === "ted"),
    timestamped: count((r) => r.ts_start !== null),
    needs_media_backfill: count((r) =>
      ["needs_video_embed", "needs_source_fallback", "secondary_source_possible"].includes(r.category)
    ),
    needs_timestamp_review: count((r) => r.category === "needs_timestamp_only"),
    probably_text_only: count((r) => r.category === "probably_text_only"),
    integrity_issues: count((r) => r.category === "integrity_issue"),
    by_category: byCat,
  };

  // ── Markdown ──
  const today = new Date().toISOString().slice(0, 10);
  const L: string[] = [];
  L.push("# Full Corpus Media Inventory");
  L.push("");
  L.push(`_Generated by \`scripts/audit-corpus-media.ts\` on ${today}. Pure read — never writes to SIOs._`);
  L.push("");
  L.push("## Corpus-level summary");
  L.push("");
  L.push(`- Total SIOs: **${summary.total}**`);
  L.push(`- Verified embeds: **${summary.verified_embeds}** (YouTube **${summary.youtube_embeds}**, TED **${summary.ted_embeds}**)`);
  L.push(`- Timestamped: **${summary.timestamped}**`);
  L.push(`- Needs media backfill: **${summary.needs_media_backfill}**`);
  L.push(`- Needs timestamp review (verified YouTube, no ts): **${summary.needs_timestamp_review}**`);
  L.push(`- Probably text-only: **${summary.probably_text_only}**`);
  L.push(`- Integrity issues: **${summary.integrity_issues}**`);
  L.push("");
  L.push("### By backfill category");
  L.push("");
  for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    L.push(`- \`${k}\`: **${v}**`);
  }
  L.push("");

  // ── Per-category sections ──
  const CATEGORY_ORDER = [
    "integrity_issue",
    "needs_timestamp_only",
    "needs_video_embed",
    "secondary_source_possible",
    "needs_source_fallback",
    "probably_text_only",
    "already_good",
  ];
  for (const cat of CATEGORY_ORDER) {
    const items = rows.filter((r) => r.category === cat);
    if (items.length === 0) continue;
    L.push(`## \`${cat}\` (${items.length})`);
    L.push("");
    for (const r of items) {
      L.push(`### ${r.insight_id} — ${r.speaker}`);
      L.push("");
      L.push(`- **file:** \`corpus/sios/${r.file}\``);
      L.push(`- **state:** ${r.state} · **source_type:** ${r.source_type} · **domain:** ${r.domain || "(none)"}`);
      L.push(`- **source_title:** ${r.source_title || "(none)"}`);
      L.push(`- **source_url:** ${r.source_url || "(none)"}`);
      L.push(`- **media:** provider=${r.provider || "(none)"} · video_id=${r.video_id || "(none)"} · status=${r.media_status || "(none)"}`);
      L.push(`- **clip_match_type:** ${r.clip_match_type || "(unset)"} · **transcript_verified:** ${r.transcript_verified} · **timestamp:** ${r.ts_start ?? "null"}${r.ts_end !== null ? `–${r.ts_end}` : ""}`);
      L.push(`- **human_review_status:** ${r.human_review_status || "(none)"} · **rights_notes:** ${r.has_rights_notes ? "present" : "MISSING"}`);
      L.push(`- **why this category:** ${r.category_reason}`);
      L.push("");
    }
  }

  writeFileSync(OUT, L.join("\n") + "\n", "utf-8");
  console.log(JSON.stringify({ generated_at: today, summary, rows }, null, 2));
  console.error(`\n[audit-corpus-media] wrote → ${OUT}`);
  console.error(`[audit-corpus-media] ${JSON.stringify(summary.by_category)}`);
}

main();
