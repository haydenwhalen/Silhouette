/**
 * find-video-moments.ts — Video timestamp discovery tool.
 *
 * For each target SIO with a verified video embed but no per-moment timestamp,
 * surface candidate timestamps from honest evidence:
 *
 *   1. The YouTube video description (channel-owner-supplied chapter markers).
 *   2. (Future) Show-note pages with their own timestamp lists.
 *   3. (Always present) A "what to listen for" cue list derived from the SIO's
 *      key_claim and excerpt, so a human can find the moment by listening.
 *
 * Honesty invariants:
 *   - NEVER writes timestamps into SIO files. Output is a markdown candidate
 *     report at ai/guides/video_moment_candidates_report.md (also JSON to stdout).
 *   - NEVER proposes a timestamp without an evidence source.
 *   - NEVER claims exact_quote_match. Every candidate is labeled either
 *     "chapter_marker" (from official description) or "manual_review_required".
 *   - The most likely outcome for SoG-style sources without published chapters
 *     is the manual_review_required path — which is the correct, honest output.
 *
 * Run:
 *     npm run find-video-moments                              # all SIOs with verified video embed but no timestamp
 *     npm run find-video-moments -- --insight-id sio-xxx      # one SIO
 *     npm run find-video-moments -- --all                     # every SIO (including those with timestamps)
 *
 * Requires YOUTUBE_API_KEY in .env to fetch full video descriptions. Without
 * a key the tool still runs — it just falls back to manual_review_required
 * for every YouTube SIO.
 */

import "dotenv/config";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";
import { getVideoDetails, hasYouTubeApiKey } from "./lib/youtube";
import { formatTimestamp } from "../src/lib/media";

// ─── Types ──────────────────────────────────────────────────────────────

interface ChapterMarker {
  start_seconds: number;
  label: string;
  source: "video_description";
}

interface ListenForCue {
  phrase: string;
  weight: "strong" | "weak"; // strong = distinctive multi-word phrase; weak = single word
}

interface MomentCandidate {
  rank: "high" | "medium" | "low";
  start_seconds: number;
  end_seconds: number | null;
  label: string;
  evidence: string;
  source: ChapterMarker["source"];
  matched_cues: string[];
}

interface SioReport {
  insight_id: string;
  speaker: string;
  source_id: string;
  video_id: string | null;
  watch_url: string | null;
  current_timestamp_start: number | null;
  current_clip_match_type: string | null;
  api_status: "fetched" | "no_key" | "fetch_failed" | "not_youtube" | "no_video_id";
  fetch_failure_reason: string | null;
  chapters_found: number;
  candidates: MomentCandidate[];
  listen_for_cues: ListenForCue[];
  recommendation:
    | "set_timestamp_with_review"
    | "manual_review_required"
    | "already_has_timestamp"
    | "not_video_source"
    | "skipped";
  recommendation_reason: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const ROOT = process.cwd();
const SIOS_DIR = join(ROOT, "corpus", "sios");
const REPORT_PATH = join(
  ROOT,
  "ai",
  "guides",
  "video_moment_candidates_report.md"
);

// Lines like "0:00 Intro" / "1:23 - Topic" / "(5:30) Title" / "00:14:22 Topic"
// At line start. Captures the timestamp string and the trailing label.
const CHAPTER_LINE_RE =
  /^\s*\(?\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*\)?\s*[-–—:|]?\s*(.+?)\s*$/;

// Stopwords for listen-for cue extraction — drop these so we don't suggest
// listening for "the", "that", etc.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "so", "of", "to", "in",
  "on", "at", "by", "for", "with", "as", "is", "was", "be", "are", "were",
  "this", "that", "these", "those", "it", "its", "i", "you", "he", "she",
  "we", "they", "my", "your", "his", "her", "our", "their", "me", "him",
  "them", "us", "what", "when", "where", "who", "why", "how", "which", "out",
  "up", "down", "into", "from", "about", "around", "over", "under", "between",
  "through", "after", "before", "during", "more", "less", "very", "just",
  "not", "no", "yes", "all", "some", "any", "every", "each", "one", "two",
  "first", "last", "next", "back", "again", "ever", "still", "even",
]);

// ─── Helpers ────────────────────────────────────────────────────────────

type Fm = Record<string, unknown>;

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function readFm(raw: string): Fm {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = raw.slice(3, end).trim();
  const parsed = parseYaml(yaml);
  return parsed && typeof parsed === "object" ? (parsed as Fm) : {};
}

function readFmAndBody(raw: string): { fm: Fm; body: string } {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  const parsed = parseYaml(yaml);
  return {
    fm: parsed && typeof parsed === "object" ? (parsed as Fm) : {},
    body,
  };
}

/**
 * Parses a "M:SS" or "H:MM:SS" timestamp string into seconds. Returns NaN
 * on malformed input; the caller filters.
 */
function parseTimestampToSeconds(s: string): number {
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

/**
 * Extracts chapter markers from a video description. Returns the list in the
 * order they appeared. We only treat a marker as valid if (a) at least 2
 * markers appear in the description, AND (b) the first marker is at or near
 * 0:00 — that's the YouTube convention for channel-owner chapters.
 */
function extractChapterMarkers(description: string): ChapterMarker[] {
  const lines = description.split("\n");
  const raw: { start_seconds: number; label: string }[] = [];
  for (const line of lines) {
    const m = line.match(CHAPTER_LINE_RE);
    if (!m) continue;
    const ts = parseTimestampToSeconds(m[1]);
    if (!Number.isFinite(ts) || ts < 0 || ts > 21600) continue;
    const label = m[2].trim();
    // Drop chapter "labels" that are URLs / look like bookkeeping noise.
    if (!label || label.length < 2 || label.length > 200) continue;
    if (/^https?:\/\//.test(label)) continue;
    raw.push({ start_seconds: ts, label });
  }
  // Require ≥2 markers AND first one ≤ 30s — YouTube's chapter convention.
  if (raw.length < 2) return [];
  if (raw[0].start_seconds > 30) return [];
  return raw.map((m) => ({ ...m, source: "video_description" as const }));
}

/**
 * Picks distinctive listen-for cues from the SIO's key_claim + first sentence
 * of the body. Returns multi-word phrases (strong) before single words.
 */
function extractListenForCues(fm: Fm, body: string): ListenForCue[] {
  const keyClaim = str(fm.key_claim);
  // Use the first ~300 chars of the body (post-reconstruction-note) to
  // pull additional distinctive phrasing. [\s\S] is the ES2017-safe
  // equivalent of the `s` (dotAll) regex flag.
  const bodySample = body.replace(/⚠️[\s\S]*?(\n\n|$)/g, "").slice(0, 300);
  const text = `${keyClaim} ${bodySample}`.toLowerCase();

  const cues: ListenForCue[] = [];
  const seen = new Set<string>();

  // Strong cues: capitalized phrases or quoted phrases in the original key_claim.
  const original = `${str(fm.key_claim)} ${bodySample}`;
  for (const match of original.match(/"([^"]{6,80})"/g) ?? []) {
    const phrase = match.replace(/"/g, "").toLowerCase().trim();
    if (!seen.has(phrase)) {
      cues.push({ phrase, weight: "strong" });
      seen.add(phrase);
    }
  }
  // Strong cues: 3-5 word noun phrases starting with a capitalized word
  // or a year/duration.
  for (const match of original.match(/\b(?:\d{2,4}|[A-Z][a-z]+)\s+(?:\w+\s+){1,3}\w+/g) ?? []) {
    const phrase = match.toLowerCase().trim();
    if (phrase.length < 8 || phrase.length > 60) continue;
    if (!seen.has(phrase) && cues.length < 6) {
      cues.push({ phrase, weight: "strong" });
      seen.add(phrase);
    }
  }
  // Weak cues: distinctive single words from key_claim (no stopwords).
  for (const word of text.split(/[^a-z0-9'-]+/)) {
    if (!word || word.length < 5 || STOPWORDS.has(word)) continue;
    if (!seen.has(word) && cues.filter((c) => c.weight === "weak").length < 6) {
      cues.push({ phrase: word, weight: "weak" });
      seen.add(word);
    }
  }
  return cues;
}

/**
 * Ranks each chapter against the listen-for cues. A chapter that matches
 * a strong cue gets "high"; a single weak match gets "medium"; none gets
 * "low". The label-text match is a string-includes check (case-insensitive)
 * — we do NOT try to do semantic matching against an unverified transcript.
 */
function rankChapter(
  chapter: ChapterMarker,
  cues: ListenForCue[],
  nextChapterStart: number | null
): MomentCandidate {
  const lower = chapter.label.toLowerCase();
  const matched: string[] = [];
  let strong = 0;
  for (const cue of cues) {
    if (lower.includes(cue.phrase.toLowerCase())) {
      matched.push(cue.phrase);
      if (cue.weight === "strong") strong += 1;
    }
  }
  const rank: MomentCandidate["rank"] =
    strong >= 1 ? "high" : matched.length >= 2 ? "medium" : "low";
  return {
    rank,
    start_seconds: chapter.start_seconds,
    end_seconds: nextChapterStart,
    label: chapter.label,
    evidence: `Chapter marker "${chapter.label}" at ${
      formatTimestamp(chapter.start_seconds) ?? chapter.start_seconds + "s"
    } in the official video description.`,
    source: chapter.source,
    matched_cues: matched,
  };
}

// ─── Per-SIO processor ──────────────────────────────────────────────────

async function processSio(
  fm: Fm,
  body: string,
  fileName: string
): Promise<SioReport> {
  const insightId = str(fm.insight_id) || fileName;
  const speaker = str(fm.speaker);
  const sourceId = str(fm.source_id);
  const provider = str(fm.video_provider);
  const videoId = str(fm.video_id);
  const watchUrl = str(fm.video_url);
  const currentTsStart =
    typeof fm.timestamp_start_seconds === "number"
      ? fm.timestamp_start_seconds
      : null;
  const currentClipMatch = str(fm.clip_match_type) || null;

  const cues = extractListenForCues(fm, body);

  // Bail-out paths before any API call.
  if (provider !== "youtube") {
    return {
      insight_id: insightId,
      speaker,
      source_id: sourceId,
      video_id: videoId || null,
      watch_url: watchUrl || null,
      current_timestamp_start: currentTsStart,
      current_clip_match_type: currentClipMatch,
      api_status: "not_youtube",
      fetch_failure_reason: null,
      chapters_found: 0,
      candidates: [],
      listen_for_cues: cues,
      recommendation: "not_video_source",
      recommendation_reason: `video_provider is "${provider}" — this tool only auto-discovers YouTube chapters. TED has no per-moment timestamps. For audio/text sources, identify the moment by listening and edit the SIO manually.`,
    };
  }

  if (!videoId) {
    return {
      insight_id: insightId,
      speaker,
      source_id: sourceId,
      video_id: null,
      watch_url: watchUrl || null,
      current_timestamp_start: currentTsStart,
      current_clip_match_type: currentClipMatch,
      api_status: "no_video_id",
      fetch_failure_reason: null,
      chapters_found: 0,
      candidates: [],
      listen_for_cues: cues,
      recommendation: "manual_review_required",
      recommendation_reason:
        "video_id is empty — no anchor to fetch chapters against. Verify the video on the official channel first via npm run verify-youtube-channels + a human watch.",
    };
  }

  if (!hasYouTubeApiKey()) {
    return {
      insight_id: insightId,
      speaker,
      source_id: sourceId,
      video_id: videoId,
      watch_url: watchUrl || null,
      current_timestamp_start: currentTsStart,
      current_clip_match_type: currentClipMatch,
      api_status: "no_key",
      fetch_failure_reason: null,
      chapters_found: 0,
      candidates: [],
      listen_for_cues: cues,
      recommendation: "manual_review_required",
      recommendation_reason:
        "No YOUTUBE_API_KEY in .env — can't auto-fetch the official description. Use the listen-for cues to find the moment manually, then edit the SIO.",
    };
  }

  const result = await getVideoDetails(videoId);
  if (!result.ok || !result.data) {
    return {
      insight_id: insightId,
      speaker,
      source_id: sourceId,
      video_id: videoId,
      watch_url: watchUrl || null,
      current_timestamp_start: currentTsStart,
      current_clip_match_type: currentClipMatch,
      api_status: "fetch_failed",
      fetch_failure_reason: result.reason ?? "unknown",
      chapters_found: 0,
      candidates: [],
      listen_for_cues: cues,
      recommendation: "manual_review_required",
      recommendation_reason: `YouTube Data API videos.list failed (${
        result.reason ?? "unknown"
      }). Use the listen-for cues to find the moment manually.`,
    };
  }

  const description = (result.data as { description?: string }).description ?? "";
  const chapters = extractChapterMarkers(description);

  if (chapters.length === 0) {
    return {
      insight_id: insightId,
      speaker,
      source_id: sourceId,
      video_id: videoId,
      watch_url: watchUrl || null,
      current_timestamp_start: currentTsStart,
      current_clip_match_type: currentClipMatch,
      api_status: "fetched",
      fetch_failure_reason: null,
      chapters_found: 0,
      candidates: [],
      listen_for_cues: cues,
      recommendation: "manual_review_required",
      recommendation_reason:
        "No chapter markers found in the official video description. Use the listen-for cues and the manual workflow doc (aiDocs/video-moment-timestamp-workflow.md) to find the moment by listening, then edit the SIO.",
    };
  }

  // Rank each chapter against the SIO's listen-for cues, then sort by
  // descending rank (high → medium → low) and then by start time.
  const ranked: MomentCandidate[] = chapters
    .map((ch, i) => {
      const nextStart =
        i + 1 < chapters.length ? chapters[i + 1].start_seconds : null;
      return rankChapter(ch, cues, nextStart);
    })
    .sort((a, b) => {
      const rankOrder = { high: 0, medium: 1, low: 2 } as const;
      const r = rankOrder[a.rank] - rankOrder[b.rank];
      return r !== 0 ? r : a.start_seconds - b.start_seconds;
    });

  const hasHigh = ranked.some((c) => c.rank === "high");
  const recommendation: SioReport["recommendation"] = hasHigh
    ? "set_timestamp_with_review"
    : "manual_review_required";
  const reason = hasHigh
    ? `${ranked.filter((c) => c.rank === "high").length} chapter(s) match the SIO's listen-for cues. Confirm by listening, then set timestamp_start_seconds on the SIO with clip_match_type: close_paraphrase (or exact_quote_match if you verify verbatim text against the official source) and human_review_status remains prototype_only until a human listens.`
    : "Chapters exist but none directly match the listen-for cues. Skim the chapter list manually — the right moment may still be in one of them.";

  return {
    insight_id: insightId,
    speaker,
    source_id: sourceId,
    video_id: videoId,
    watch_url: watchUrl || null,
    current_timestamp_start: currentTsStart,
    current_clip_match_type: currentClipMatch,
    api_status: "fetched",
    fetch_failure_reason: null,
    chapters_found: chapters.length,
    candidates: ranked,
    listen_for_cues: cues,
    recommendation,
    recommendation_reason: reason,
  };
}

// ─── Markdown report ────────────────────────────────────────────────────

function renderMarkdown(reports: SioReport[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push("# Video Moment Candidates Report");
  lines.push("");
  lines.push(
    `_Generated by \`scripts/find-video-moments.ts\` on ${today}._`
  );
  lines.push("");
  lines.push(
    "This report surfaces candidate timestamps for SIOs with a verified video " +
      "embed. **All recommendations are honest about evidence.** If no official " +
      "chapter markers are available, the recommendation is `manual_review_required` " +
      "— follow the workflow in `aiDocs/video-moment-timestamp-workflow.md`."
  );
  lines.push("");
  lines.push(
    "**Nothing in this report is written to SIO files.** Edits happen by a human " +
      "after listening."
  );
  lines.push("");

  const set = reports.filter((r) => r.recommendation === "set_timestamp_with_review");
  const manual = reports.filter((r) => r.recommendation === "manual_review_required");
  const already = reports.filter((r) => r.recommendation === "already_has_timestamp");
  const notVideo = reports.filter((r) => r.recommendation === "not_video_source");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total processed: **${reports.length}**`);
  lines.push(`- Candidates ranked HIGH against cues: **${set.length}**`);
  lines.push(`- Needs manual listening review: **${manual.length}**`);
  lines.push(`- Already has timestamp: **${already.length}**`);
  lines.push(`- Not a YouTube source: **${notVideo.length}**`);
  lines.push("");

  const section = (title: string, items: SioReport[]) => {
    lines.push(`## ${title} (${items.length})`);
    lines.push("");
    if (items.length === 0) {
      lines.push("_None._");
      lines.push("");
      return;
    }
    for (const r of items) {
      lines.push(`### \`${r.insight_id}\` — ${r.speaker}`);
      lines.push("");
      lines.push(`- **video_id:** ${r.video_id ?? "(none)"}`);
      lines.push(`- **watch URL:** ${r.watch_url ?? "(none)"}`);
      lines.push(`- **current timestamp:** ${r.current_timestamp_start ?? "null"}`);
      lines.push(`- **current clip_match_type:** ${r.current_clip_match_type ?? "(unset)"}`);
      lines.push(`- **API status:** ${r.api_status}`);
      if (r.fetch_failure_reason) {
        lines.push(`- **fetch failure:** ${r.fetch_failure_reason}`);
      }
      lines.push(`- **chapter markers found:** ${r.chapters_found}`);
      if (r.candidates.length > 0) {
        lines.push("- **candidate moments:**");
        for (const c of r.candidates) {
          const label = formatTimestamp(c.start_seconds) ?? `${c.start_seconds}s`;
          const endLabel = c.end_seconds
            ? ` (window ends ~${formatTimestamp(c.end_seconds) ?? c.end_seconds + "s"})`
            : "";
          const cuesNote =
            c.matched_cues.length > 0
              ? ` · matches cue${c.matched_cues.length > 1 ? "s" : ""}: ${c.matched_cues.map((q) => `"${q}"`).join(", ")}`
              : "";
          lines.push(
            `  - **[${c.rank.toUpperCase()}]** \`${label}\` — "${c.label}"${endLabel}${cuesNote}`
          );
          lines.push(`    - evidence: ${c.evidence}`);
        }
      }
      if (r.listen_for_cues.length > 0) {
        lines.push("- **listen-for cues** (the distinctive phrases from the SIO):");
        const strong = r.listen_for_cues.filter((c) => c.weight === "strong");
        const weak = r.listen_for_cues.filter((c) => c.weight === "weak");
        if (strong.length > 0) {
          lines.push(`  - strong: ${strong.map((c) => `"${c.phrase}"`).join(", ")}`);
        }
        if (weak.length > 0) {
          lines.push(`  - weak: ${weak.map((c) => c.phrase).join(", ")}`);
        }
      }
      lines.push(`- **recommendation:** \`${r.recommendation}\``);
      lines.push(`  - ${r.recommendation_reason}`);
      lines.push("");
    }
  };

  section("Set timestamp (with human listening review)", set);
  section("Manual review required", manual);
  section("Already has timestamp", already);
  section("Not a YouTube source", notVideo);

  lines.push("---");
  lines.push("");
  lines.push("## How to act on this report");
  lines.push("");
  lines.push(
    "See `aiDocs/video-moment-timestamp-workflow.md` for the full manual workflow."
  );
  lines.push("");
  lines.push("**For a `set_timestamp_with_review` candidate:**");
  lines.push("");
  lines.push("1. Open the watch URL in a browser.");
  lines.push("2. Click to the candidate timestamp; listen for ~60 seconds.");
  lines.push("3. If the moment matches the SIO's key_claim, edit the SIO:");
  lines.push("   - `timestamp_start_seconds: <integer>`");
  lines.push("   - `timestamp_end_seconds: <integer or null>`");
  lines.push("   - `clip_match_type: close_paraphrase` (default) or `talking_point` if approximate");
  lines.push("   - `media_verification_notes: \"Confirmed by listening on YYYY-MM-DD; the moment matches the SIO's key_claim about <topic>.\"`");
  lines.push("4. Re-run `npm run validate-media` to confirm no rule violations.");
  lines.push("");
  lines.push("**For a `manual_review_required` candidate:**");
  lines.push("");
  lines.push("1. Use the listen-for cues to skim the video by ear.");
  lines.push("2. When you find the moment, follow the steps above.");
  lines.push("3. If the moment can't be pinpointed (which is fine for a `talking_point`):");
  lines.push("   - leave timestamp_start_seconds: null");
  lines.push("   - the UI will show \"Watch the source\" and play from the start.");
  lines.push("");

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const targetIdIdx = args.indexOf("--insight-id");
  const targetId =
    targetIdIdx !== -1 && args[targetIdIdx + 1] ? args[targetIdIdx + 1] : null;
  const allFlag = args.includes("--all");

  const sioFiles = readdirSync(SIOS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const reports: SioReport[] = [];

  for (const file of sioFiles) {
    const raw = readFileSync(join(SIOS_DIR, file), "utf-8");
    const { fm, body } = readFmAndBody(raw);
    const insightId = str(fm.insight_id);
    if (!insightId) continue;

    // Target filter:
    //   --insight-id <id> → only that SIO
    //   --all             → every SIO
    //   default           → SIOs with verified video embed + no current timestamp
    if (targetId) {
      if (insightId !== targetId) continue;
    } else if (!allFlag) {
      const hasEmbed = !!str(fm.embed_url);
      const hasTs = typeof fm.timestamp_start_seconds === "number";
      const verified = str(fm.media_verification_status) === "verified";
      if (!verified || !hasEmbed || hasTs) continue;
    }

    const report = await processSio(fm, body, file);
    reports.push(report);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    total: reports.length,
    by_recommendation: reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.recommendation] = (acc[r.recommendation] ?? 0) + 1;
      return acc;
    }, {}),
    reports,
  };

  console.log(JSON.stringify(summary, null, 2));

  writeFileSync(REPORT_PATH, renderMarkdown(reports) + "\n", "utf-8");
  console.error(
    `\n[find-video-moments] wrote markdown report → ${REPORT_PATH}`
  );
  console.error(
    `[find-video-moments] processed=${reports.length} ` +
      Object.entries(summary.by_recommendation)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
  );
}

main().catch((err) => {
  console.error("[find-video-moments] unexpected error:", err);
  process.exit(1);
});
