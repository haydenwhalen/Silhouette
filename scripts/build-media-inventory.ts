/**
 * build-media-inventory.ts — one-shot snapshot of every SIO's media state.
 *
 * Output: ai/guides/media_backfill_inventory.md + JSON to stdout.
 * Pure read; never writes to SIOs.
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";

const ROOT = process.cwd();
const SIOS_DIR = join(ROOT, "corpus", "sios");
const OUT = join(ROOT, "ai", "guides", "media_backfill_inventory.md");

interface Row {
  file: string;
  insight_id: string;
  state: string;
  speaker: string;
  source_type: string;
  show: string;
  episode_title: string;
  source_url: string;
  video_provider: string;
  video_id: string;
  embed_url: string;
  media_verification_status: string;
  display_mode: string;
  ts_start: number | null;
  ts_label: string;
  clip_match_type: string;
  human_review_status: string;
  transcript_verified: boolean;
  has_verified_embed: boolean; // derived: status === verified AND embed_url present
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function readFm(raw: string): Record<string, unknown> {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = raw.slice(3, end).trim();
  const parsed = parseYaml(yaml);
  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : {};
}

function classify(r: Row): {
  bucket:
    | "verified_embed"
    | "needs_review_with_candidate"
    | "source_link_only"
    | "text_only_no_media"
    | "missing_everything";
  reason: string;
} {
  if (r.has_verified_embed) return { bucket: "verified_embed", reason: "ready" };
  const status = r.media_verification_status;
  const hasUrl = !!r.source_url;
  const isText =
    r.source_type === "book" ||
    r.source_type === "article" ||
    r.source_type === "ted talk"; // ted talk handled separately below
  if (status === "needs_review") {
    return {
      bucket: "needs_review_with_candidate",
      reason: "verification pending",
    };
  }
  if (status === "not_applicable") {
    return {
      bucket: "text_only_no_media",
      reason: `${r.source_type} source — no embeddable video by nature`,
    };
  }
  if (hasUrl) {
    return {
      bucket: "source_link_only",
      reason: isText
        ? "text source with source_url fallback"
        : "audio/podcast with source_url fallback",
    };
  }
  return { bucket: "missing_everything", reason: "no embed and no source_url" };
}

function main() {
  const files = readdirSync(SIOS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const rows: Row[] = [];
  for (const f of files) {
    const raw = readFileSync(join(SIOS_DIR, f), "utf-8");
    const fm = readFm(raw);
    const insightId = str(fm.insight_id);
    if (!insightId) continue;

    const tsStartRaw = fm.timestamp_start_seconds;
    const tsStart =
      typeof tsStartRaw === "number" && Number.isFinite(tsStartRaw)
        ? tsStartRaw
        : null;

    const row: Row = {
      file: f,
      insight_id: insightId,
      state: str(fm.primary_state_tag),
      speaker: str(fm.speaker),
      source_type: str(fm.source_type),
      show: str(fm.show_or_platform),
      episode_title: str(fm.episode_or_content_title),
      source_url: str(fm.source_url),
      video_provider: str(fm.video_provider),
      video_id: str(fm.video_id),
      embed_url: str(fm.embed_url),
      media_verification_status: str(fm.media_verification_status),
      display_mode: str(fm.display_mode),
      ts_start: tsStart,
      ts_label: str(fm.timestamp_range),
      clip_match_type: str(fm.clip_match_type),
      human_review_status: str(fm.human_review_status),
      transcript_verified: fm.transcript_verified === true,
      has_verified_embed:
        str(fm.media_verification_status) === "verified" && !!str(fm.embed_url),
    };
    rows.push(row);
  }

  // ── Summaries ────────────────────────────────────────────────────────
  const by = <K extends string>(key: (r: Row) => K) =>
    rows.reduce((acc: Record<string, number>, r) => {
      const k = key(r);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

  const byProvider = by((r) => r.video_provider || "(none)");
  const byStatus = by((r) => r.media_verification_status || "(unset)");
  const byState = by((r) => r.state || "(unset)");
  const byBucket = by((r) => classify(r).bucket);
  const byHasTimestamp = by((r) =>
    r.has_verified_embed ? (r.ts_start !== null ? "embed+ts" : "embed-no-ts") : "no-embed"
  );

  const verified = rows.filter((r) => r.has_verified_embed);
  const needsBackfill = rows.filter(
    (r) =>
      classify(r).bucket === "source_link_only" ||
      classify(r).bucket === "needs_review_with_candidate"
  );
  const textOnly = rows.filter(
    (r) => classify(r).bucket === "text_only_no_media"
  );

  // ── Markdown ─────────────────────────────────────────────────────────
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push("# Media Backfill — Corpus Inventory");
  lines.push("");
  lines.push(`_Generated by \`scripts/build-media-inventory.ts\` on ${today}._`);
  lines.push("");
  lines.push(
    "Snapshot of media state for every SIO in the corpus. Read-only; this script never edits SIOs."
  );
  lines.push("");

  lines.push("## Headline numbers");
  lines.push("");
  lines.push(`- Total SIOs: **${rows.length}**`);
  lines.push(`- Verified embed (UI will render the card): **${verified.length}**`);
  lines.push(`- Needs backfill (source_link_only OR needs_review): **${needsBackfill.length}**`);
  lines.push(`- Text-only by nature (book/article/audio-only, not_applicable): **${textOnly.length}**`);
  lines.push("");

  const fmtBy = (title: string, obj: Record<string, number>) => {
    lines.push(`### ${title}`);
    lines.push("");
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    for (const [k, v] of entries) lines.push(`- ${k}: ${v}`);
    lines.push("");
  };

  fmtBy("By bucket", byBucket);
  fmtBy("By video_provider", byProvider);
  fmtBy("By media_verification_status", byStatus);
  fmtBy("By primary_state_tag", byState);
  fmtBy("Verified embed × timestamp presence", byHasTimestamp);

  // ── Full table ───────────────────────────────────────────────────────
  lines.push("## All SIOs — by bucket");
  lines.push("");

  const buckets = [
    "verified_embed",
    "needs_review_with_candidate",
    "source_link_only",
    "text_only_no_media",
    "missing_everything",
  ] as const;

  for (const b of buckets) {
    const group = rows.filter((r) => classify(r).bucket === b);
    lines.push(`### ${b} (${group.length})`);
    lines.push("");
    if (group.length === 0) {
      lines.push("_None._");
      lines.push("");
      continue;
    }
    lines.push(
      "| insight_id | speaker | source_type | show / talk | provider | status | timestamp |"
    );
    lines.push(
      "|---|---|---|---|---|---|---|"
    );
    for (const r of group) {
      const tsCell = r.ts_start !== null ? `${r.ts_start}s` : "—";
      const provCell = r.video_provider || "—";
      lines.push(
        `| \`${r.insight_id}\` | ${r.speaker} | ${r.source_type} | ${r.show}${
          r.episode_title ? " — " + r.episode_title.slice(0, 50) + (r.episode_title.length > 50 ? "…" : "") : ""
        } | ${provCell} | ${r.media_verification_status || "—"} | ${tsCell} |`
      );
    }
    lines.push("");
  }

  // ── Backfill-priority lists ──────────────────────────────────────────
  lines.push("## Backfill priority shortlists");
  lines.push("");

  // Likely easy wins — TED talks NOT yet embedded (recognized by source_type)
  const tedNotEmbedded = rows.filter(
    (r) =>
      !r.has_verified_embed &&
      (r.source_type === "ted talk" ||
        r.show.toLowerCase().includes("ted")) &&
      r.source_url
  );
  lines.push(`### TED talks not yet embedded (${tedNotEmbedded.length})`);
  lines.push("");
  if (tedNotEmbedded.length === 0) {
    lines.push("_None — all TED-typed SIOs already have verified embeds._");
  } else {
    for (const r of tedNotEmbedded)
      lines.push(`- \`${r.insight_id}\` — ${r.speaker} · ${r.episode_title || r.show}`);
  }
  lines.push("");

  // Podcast interviews on shows that have a verified YouTube channel
  // (Tim Ferriss, Huberman Lab, SoG, Diary, Modern Wisdom, Rich Roll, Impact Theory)
  const TRUSTED_SHOW_NAMES = new Set([
    "the tim ferriss show",
    "huberman lab",
    "the school of greatness",
    "school of greatness",
    "diary of a ceo",
    "modern wisdom",
    "rich roll",
    "impact theory",
  ]);
  const podcastNotEmbedded = rows.filter(
    (r) =>
      !r.has_verified_embed &&
      TRUSTED_SHOW_NAMES.has(r.show.toLowerCase()) &&
      r.source_type === "long-form interview podcast"
  );
  lines.push(
    `### Podcast interviews on trusted channels, not yet embedded (${podcastNotEmbedded.length})`
  );
  lines.push("");
  if (podcastNotEmbedded.length === 0) {
    lines.push("_None._");
  } else {
    for (const r of podcastNotEmbedded)
      lines.push(`- \`${r.insight_id}\` — ${r.speaker} on ${r.show}: "${r.episode_title}"`);
  }
  lines.push("");

  // Book/article SIOs — these are secondary-video territory; the original
  // source is text, but a talk by the same author may exist.
  const textSources = rows.filter(
    (r) =>
      !r.has_verified_embed &&
      (r.source_type === "book" || r.source_type === "article")
  );
  lines.push(`### Book/article SIOs (secondary-video territory only) (${textSources.length})`);
  lines.push("");
  if (textSources.length === 0) {
    lines.push("_None._");
  } else {
    for (const r of textSources)
      lines.push(`- \`${r.insight_id}\` — ${r.speaker} · ${r.source_type}: "${r.episode_title}"`);
  }
  lines.push("");

  // SIOs with timestamps already set
  const withTs = rows.filter((r) => r.has_verified_embed && r.ts_start !== null);
  lines.push(`### Verified embeds with a timestamp set (${withTs.length})`);
  lines.push("");
  if (withTs.length === 0) {
    lines.push("_None — no SIO has a per-moment timestamp set yet._");
  } else {
    for (const r of withTs)
      lines.push(`- \`${r.insight_id}\` — ${r.ts_start}s (${r.clip_match_type || "no clip_match_type"})`);
  }
  lines.push("");

  writeFileSync(OUT, lines.join("\n") + "\n", "utf-8");
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total: rows.length,
        verified_embed: verified.length,
        needs_backfill: needsBackfill.length,
        text_only: textOnly.length,
        by_provider: byProvider,
        by_status: byStatus,
        by_bucket: byBucket,
        tier1_ted_not_embedded: tedNotEmbedded.map((r) => r.insight_id),
        tier1_podcast_not_embedded: podcastNotEmbedded.map((r) => r.insight_id),
        text_sources: textSources.map((r) => r.insight_id),
        with_timestamp: withTs.map((r) => r.insight_id),
        rows,
      },
      null,
      2
    )
  );
  console.error(`\n[build-media-inventory] wrote → ${OUT}`);
}

main();
