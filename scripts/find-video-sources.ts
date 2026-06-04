/**
 * find-video-sources.ts — Video Source Finder (Stage B)
 *
 * Repeatable inventory + search-target generator for the SIO media layer.
 *
 * Reads every corpus/sios/*.md (YAML frontmatter) and corpus/sources/*.json.
 * For each SIO it reports:
 *   - current media status (provider / embed / display_mode / verification status)
 *   - which media fields are missing
 *   - for anything not already a VERIFIED video: structured search targets
 *     (speaker, title, show, source_url, likely official channels, exact query strings)
 *   - a recommended next action + confidence note
 *
 * Output: BOTH a JSON report to stdout AND a markdown report written to
 * ai/guides/video_source_candidates_report.md.
 *
 * IMPORTANT (honesty boundary): this script NEVER fabricates a video_id, timestamp,
 * or URL. It only reports what is already in the corpus and emits search targets for
 * a human (or an agent with web tools) to verify. Anything it cannot confirm from the
 * existing files is explicitly flagged as "needs human review."
 *
 * Optional YouTube API enrichment: if YOUTUBE_API_KEY is configured, for unverified
 * YouTube SIOs with a known trusted channel_id, calls searchOfficialChannel and
 * surfaces candidate videos as "needs_review" (confidence-labeled). Candidates are
 * NEVER written into the SIO or auto-set to "verified" — human must confirm.
 * When no key is present, prints "(YouTube API not configured — using manual queries)"
 * and behavior is exactly as before.
 *
 * Run: tsx scripts/find-video-sources.ts
 */

import "dotenv/config";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";
import {
  hasYouTubeApiKey,
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
  searchOfficialChannel,
  type YouTubeVideo,
} from "./lib/youtube";

const ROOT = process.cwd();
const SIOS_DIR = join(ROOT, "corpus", "sios");
const SOURCES_DIR = join(ROOT, "corpus", "sources");
const REPORT_PATH = join(ROOT, "ai", "guides", "video_source_candidates_report.md");

type Fm = Record<string, unknown>;

const MEDIA_FIELDS = [
  "source_media_type",
  "video_provider",
  "video_id",
  "video_url",
  "embed_url",
  "official_channel",
  "official_channel_url",
  "timestamp_range",
  "timestamp_start_seconds",
  "timestamp_end_seconds",
  "display_mode",
  "media_available",
  "media_verification_status",
  "media_verification_notes",
  "media_rights_notes",
] as const;

// Known official channels by show/platform (used to emit likely-channel hints
// and for optional YouTube API enrichment when channel_id is present).
const OFFICIAL_CHANNELS: Record<string, { name: string; url: string; channel_id?: string }> = {
  "Huberman Lab": {
    name: "Huberman Lab",
    url: "https://www.youtube.com/@hubermanlab",
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  "The Tim Ferriss Show": {
    name: "The Tim Ferriss Show",
    url: "https://www.youtube.com/@timferriss",
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  "Diary of a CEO": {
    name: "Diary of a CEO",
    url: "https://www.youtube.com/@TheDiaryOfACEO",
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  "Modern Wisdom": {
    name: "Modern Wisdom",
    url: "https://www.youtube.com/@ChrisWillx",
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
};

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function readFrontmatter(raw: string): Fm {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = raw.slice(3, end).trim();
  const parsed = parseYaml(yaml);
  return parsed && typeof parsed === "object" ? (parsed as Fm) : {};
}

// Candidate videos surfaced by the YouTube API (never auto-verified)
interface ApiVideoCandidate {
  title: string;
  channelTitle: string;
  watchUrl: string;
  embedUrl: string;
  confidence: string;
  isOfficialChannelMatch: boolean;
  note: string;
}

interface SioReport {
  insight_id: string;
  source_id: string;
  speaker: string;
  show_or_platform: string;
  episode_or_content_title: string;
  episode_or_content_date: string;
  source_url: string;
  source_type: string;
  current_media: {
    source_media_type: string;
    video_provider: string;
    video_id: string;
    embed_url: string;
    display_mode: string;
    media_available: unknown;
    media_verification_status: string;
  };
  missing_media_fields: string[];
  is_verified_video: boolean;
  candidate_official_channel: { name: string; url: string; channel_id?: string } | null;
  suggested_queries: string[];
  confidence: "high" | "medium" | "low" | "n/a";
  needs_human_review: string[];
  recommended_next_action: string;
  // Optional: populated when YouTube API is configured + channel_id known + SIO not verified
  api_video_candidates?: ApiVideoCandidate[];
}

function isVerifiedVideo(fm: Fm): boolean {
  const status = str(fm.media_verification_status);
  const provider = str(fm.video_provider);
  const embed = str(fm.embed_url);
  return (
    status === "verified" &&
    (provider === "ted" || provider === "youtube" || provider === "vimeo") &&
    embed.length > 0
  );
}

function missingMediaFields(fm: Fm): string[] {
  const missing: string[] = [];
  for (const f of MEDIA_FIELDS) {
    const v = fm[f];
    // null is an intentional "not verified" for the timestamp/media_available fields;
    // only count empty strings + undefined as missing for string fields.
    if (v === undefined) {
      missing.push(f);
      continue;
    }
    if (typeof v === "string" && v.trim() === "") missing.push(f);
  }
  return missing;
}

function buildQueries(fm: Fm): string[] {
  const speaker = str(fm.speaker);
  const show = str(fm.show_or_platform);
  const title = str(fm.episode_or_content_title);
  const provider = str(fm.video_provider);
  const type = str(fm.source_type);
  const shortTitle = title.split(/[—\-:]/)[0].trim();
  const q: string[] = [];

  if (provider === "ted" || type === "ted talk") {
    q.push(`${speaker} TED talk "${shortTitle}" site:ted.com`);
    q.push(`${speaker} "${shortTitle}" ted.com canonical slug`);
  } else if (provider === "youtube") {
    const ch = OFFICIAL_CHANNELS[show];
    q.push(`${show} "${shortTitle}" official YouTube channel`);
    if (ch) q.push(`${shortTitle} ${ch.url}`);
    // Note: use extractYouTubeVideoId / buildYouTubeEmbedUrl (from ./lib/youtube)
    // when the source_url or embed_url is already known — keep query honest here.
    const existingEmbed = str(fm.embed_url);
    if (existingEmbed) {
      const videoId = extractYouTubeVideoId(existingEmbed);
      if (videoId) {
        const canonicalEmbed = buildYouTubeEmbedUrl(videoId);
        q.push(`Existing embed — canonical nocookie URL: ${canonicalEmbed} (confirm this matches official channel before setting verified)`);
      }
    }
    q.push(`${speaker} ${show} ${shortTitle} youtube official upload video id`);
  } else if (type === "book") {
    q.push(`${speaker} "${title}" official author or publisher page`);
  } else if (type === "article") {
    q.push(`${speaker} "${shortTitle}" original article canonical URL`);
  } else {
    // audio podcast / other
    q.push(`${show} "${shortTitle}" official episode page`);
    q.push(`${show} "${shortTitle}" official video footage exists?`);
  }
  return q;
}

function classify(fm: Fm): {
  confidence: SioReport["confidence"];
  needs: string[];
  action: string;
} {
  const status = str(fm.media_verification_status);
  const provider = str(fm.video_provider);
  const type = str(fm.source_type);
  const embed = str(fm.embed_url);
  const videoId = str(fm.video_id);

  const needs: string[] = [];

  if (isVerifiedVideo(fm)) {
    if (provider === "ted") {
      if (!videoId) {
        needs.push(
          "TED embed verified; official-channel YouTube video_id deferred (optional)."
        );
      }
      return {
        confidence: "high",
        needs,
        action:
          "DONE — verified TED embed. Optionally verify a YouTube official video_id later (not required).",
      };
    }
    return {
      confidence: "high",
      needs,
      action: "DONE — verified video embed present.",
    };
  }

  // Not a verified video.
  if (type === "book" || type === "article") {
    return {
      confidence: "n/a",
      needs: [],
      action:
        status === "not_applicable"
          ? "DONE — text source, no video applicable. Source-link only."
          : "Set media_verification_status: not_applicable (text source).",
    };
  }

  if (provider === "ted" && embed) {
    return {
      confidence: "high",
      needs:
        status === "verified"
          ? []
          : ["TED embed present but not marked verified — confirm slug + set verified."],
      action:
        "Confirm canonical ted.com slug loads, then set media_verification_status: verified.",
    };
  }

  if (provider === "youtube") {
    needs.push(
      "Official-channel YouTube video_id NOT machine-confirmable from search titles."
    );
    needs.push("Confirm official channel + exact episode video; do NOT guess video_id.");
    return {
      confidence: "medium",
      needs,
      action:
        "Record official channel + episode page as candidates; set media_verification_status: needs_review; leave video_id blank until playback-verified.",
    };
  }

  // audio / other
  if (type.includes("ted")) {
    needs.push("Source declares TED but no embed — find canonical ted.com slug.");
    return {
      confidence: "high",
      needs,
      action:
        "Find canonical ted.com slug via web; if found, add embed.ted.com URL + set verified.",
    };
  }

  needs.push("Audio/other source — confirm whether an official video exists at all.");
  return {
    confidence: "low",
    needs,
    action:
      "Verify official episode page; if no official video, set display_mode audio-primary + media_verification_status needs_review/not_applicable.",
  };
}

function buildSioReport(fm: Fm): SioReport {
  const show = str(fm.show_or_platform);
  const { confidence, needs, action } = classify(fm);
  return {
    insight_id: str(fm.insight_id),
    source_id: str(fm.source_id),
    speaker: str(fm.speaker),
    show_or_platform: show,
    episode_or_content_title: str(fm.episode_or_content_title),
    episode_or_content_date: str(fm.episode_or_content_date),
    source_url: str(fm.source_url),
    source_type: str(fm.source_type),
    current_media: {
      source_media_type: str(fm.source_media_type),
      video_provider: str(fm.video_provider),
      video_id: str(fm.video_id),
      embed_url: str(fm.embed_url),
      display_mode: str(fm.display_mode),
      media_available: fm.media_available ?? null,
      media_verification_status: str(fm.media_verification_status),
    },
    missing_media_fields: missingMediaFields(fm),
    is_verified_video: isVerifiedVideo(fm),
    candidate_official_channel: OFFICIAL_CHANNELS[show] ?? null,
    suggested_queries: buildQueries(fm),
    confidence,
    needs_human_review: needs,
    recommended_next_action: action,
  };
}

function renderMarkdown(reports: SioReport[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const verified = reports.filter((r) => r.is_verified_video);
  const needsReview = reports.filter(
    (r) =>
      !r.is_verified_video &&
      r.current_media.media_verification_status === "needs_review"
  );
  const notApplicable = reports.filter(
    (r) => r.current_media.media_verification_status === "not_applicable"
  );
  const other = reports.filter(
    (r) =>
      !r.is_verified_video &&
      r.current_media.media_verification_status !== "needs_review" &&
      r.current_media.media_verification_status !== "not_applicable"
  );

  const lines: string[] = [];
  lines.push(`# Video Source Candidates Report`);
  lines.push("");
  lines.push(`_Generated by \`scripts/find-video-sources.ts\` on ${now}._`);
  lines.push("");
  lines.push(
    `This report is **machine-generated from the current corpus**. It reports what is ` +
      `already recorded and emits structured search targets for the items that still need ` +
      `verification. **Nothing here is a fabricated ID, URL, or timestamp.** Items flagged ` +
      `"needs human review" require a human (or an agent with web tools) to confirm an ` +
      `official source before any \`video_id\` is written.`
  );
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Total SIOs: **${reports.length}**`);
  lines.push(`- Verified video (ready for video-primary): **${verified.length}**`);
  lines.push(`- Needs review (official video candidate, ID unconfirmed): **${needsReview.length}**`);
  lines.push(`- Not applicable (text/audio-only source): **${notApplicable.length}**`);
  lines.push(`- Other / unverified: **${other.length}**`);
  lines.push("");

  const section = (title: string, rs: SioReport[]) => {
    lines.push(`## ${title} (${rs.length})`);
    lines.push("");
    if (rs.length === 0) {
      lines.push("_None._");
      lines.push("");
      return;
    }
    for (const r of rs) {
      lines.push(`### \`${r.insight_id}\` — ${r.speaker}`);
      lines.push("");
      lines.push(`- **Source:** ${r.show_or_platform} — "${r.episode_or_content_title}" (${r.episode_or_content_date})`);
      lines.push(`- **Type / provider:** ${r.source_type} / ${r.current_media.video_provider || "(none)"}`);
      lines.push(`- **Display mode:** ${r.current_media.display_mode || "(unset)"}`);
      lines.push(`- **Verification status:** \`${r.current_media.media_verification_status || "(unset)"}\``);
      lines.push(`- **embed_url:** ${r.current_media.embed_url || "(none)"}`);
      lines.push(`- **video_id:** ${r.current_media.video_id || "(blank — by design unless verified)"}`);
      lines.push(`- **source_url:** ${r.source_url || "(none)"}`);
      if (r.candidate_official_channel) {
        lines.push(
          `- **Likely official channel:** ${r.candidate_official_channel.name} — ${r.candidate_official_channel.url}`
        );
      }
      if (r.missing_media_fields.length) {
        lines.push(`- **Missing media fields:** ${r.missing_media_fields.join(", ")}`);
      }
      lines.push(`- **Confidence:** ${r.confidence}`);
      if (r.needs_human_review.length) {
        lines.push(`- **Needs human review:**`);
        for (const n of r.needs_human_review) lines.push(`  - ${n}`);
      }
      if (r.suggested_queries.length) {
        lines.push(`- **Suggested search queries:**`);
        for (const q of r.suggested_queries) lines.push(`  - \`${q}\``);
      }
      lines.push(`- **Recommended next action:** ${r.recommended_next_action}`);
      // Optional: YouTube API candidates (only present when API was configured at run time)
      if (r.api_video_candidates && r.api_video_candidates.length > 0) {
        lines.push(`- **YouTube API candidates (verify before use — NOT written to SIO):**`);
        for (const ac of r.api_video_candidates) {
          const matchLabel = ac.isOfficialChannelMatch ? "official channel match" : "channel unconfirmed";
          lines.push(`  - "${ac.title}" — ${ac.channelTitle} (${matchLabel}) | confidence: ${ac.confidence} | [watch](${ac.watchUrl})`);
          lines.push(`    - ${ac.note}`);
        }
      }
      lines.push("");
    }
  };

  section("Verified video — ready for video-primary", verified);
  section("Needs review — official candidate, ID/artifact unconfirmed", needsReview);
  section("Not applicable — text / audio-only source", notApplicable);
  section("Other / unverified", other);

  return lines.join("\n");
}

async function main() {
  const sioFiles = readdirSync(SIOS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  // Index source objects for cross-reference (currently informational).
  const sourceIndex: Record<string, Fm> = {};
  for (const f of readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const obj = JSON.parse(readFileSync(join(SOURCES_DIR, f), "utf-8")) as Fm;
      if (str(obj.source_id)) sourceIndex[str(obj.source_id)] = obj;
    } catch {
      /* skip unparseable source */
    }
  }

  const reports: SioReport[] = [];
  for (const file of sioFiles) {
    const raw = readFileSync(join(SIOS_DIR, file), "utf-8");
    const fm = readFrontmatter(raw);
    if (!str(fm.insight_id)) continue;
    reports.push(buildSioReport(fm));
  }

  // ── Optional YouTube API enrichment ─────────────────────────────────────────
  // For SIOs whose video_provider is "youtube" and media_verification_status is
  // NOT "verified", optionally surface candidate videos from the official channel.
  // Results are surfaced as candidates (confidence-labeled, needs_review).
  // NEVER written into the SIO. NEVER auto-set to "verified".
  if (!hasYouTubeApiKey()) {
    console.error("(YouTube API not configured — using manual queries)");
  } else {
    for (const report of reports) {
      // Only enrich unverified YouTube SIOs
      if (
        report.current_media.video_provider !== "youtube" ||
        report.is_verified_video
      ) continue;
      // Only when a trusted channel_id is known for the show
      const ch = report.candidate_official_channel;
      if (!ch?.channel_id) continue;

      const searchTerm = report.episode_or_content_title || report.speaker;
      try {
        const result = await searchOfficialChannel(ch.channel_id, searchTerm, { maxResults: 3 });
        if (result.ok && result.data && result.data.length > 0) {
          report.api_video_candidates = result.data.map((video: YouTubeVideo) => ({
            title: video.title,
            channelTitle: video.channelTitle,
            watchUrl: video.watchUrl,
            embedUrl: video.embedUrl,
            confidence: video.confidence,
            isOfficialChannelMatch: video.isOfficialChannelMatch,
            note: "API candidate — needs human review. Do NOT write video_id or set verified without confirming official channel, timestamps, and transcript.",
          }));
        } else if (!result.ok) {
          console.error(`[find-video-sources] YouTube API search failed for ${report.insight_id}: ${result.reason ?? "unknown reason"}`);
        }
      } catch (err) {
        console.error(`[find-video-sources] YouTube API error for ${report.insight_id}: ${String(err)}`);
      }
    }
  }

  const jsonReport = {
    generated_at: new Date().toISOString(),
    total_sios: reports.length,
    verified_video: reports.filter((r) => r.is_verified_video).map((r) => r.insight_id),
    needs_review: reports
      .filter(
        (r) =>
          !r.is_verified_video &&
          r.current_media.media_verification_status === "needs_review"
      )
      .map((r) => r.insight_id),
    not_applicable: reports
      .filter((r) => r.current_media.media_verification_status === "not_applicable")
      .map((r) => r.insight_id),
    sources_indexed: Object.keys(sourceIndex).length,
    sios: reports,
  };

  // JSON to stdout.
  console.log(JSON.stringify(jsonReport, null, 2));

  // Markdown report to file.
  writeFileSync(REPORT_PATH, renderMarkdown(reports) + "\n", "utf-8");
  console.error(`\n[find-video-sources] wrote markdown report → ${REPORT_PATH}`);
  console.error(
    `[find-video-sources] verified=${jsonReport.verified_video.length} ` +
      `needs_review=${jsonReport.needs_review.length} ` +
      `not_applicable=${jsonReport.not_applicable.length} total=${reports.length}`
  );
}

main().catch((err) => {
  console.error("[find-video-sources] Unexpected error:", err);
  process.exit(1);
});
