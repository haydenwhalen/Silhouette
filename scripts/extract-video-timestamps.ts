/**
 * extract-video-timestamps.ts — Transcript-grounded timestamp extractor.
 *
 * The companion to find-video-moments.ts. Where that tool only reads
 * channel-owner chapter markers (which almost no podcast upload has), THIS
 * tool reads the video's actual spoken words — the auto-generated (ASR)
 * caption track — and locates the SIO's verbatim excerpt inside it, returning
 * a real per-moment start/end timestamp.
 *
 * Why a separate tool / why yt-dlp:
 *   YouTube gates its caption tracks behind a "poToken" (proof-of-origin)
 *   browser attestation since ~2024, so a plain HTTP GET of the timedtext URL
 *   returns 0 bytes. yt-dlp's android-client path bypasses that wall, which is
 *   the only reason this works headlessly. yt-dlp must be installed:
 *       python3 -m pip install --user yt-dlp     (or: brew install yt-dlp)
 *
 * Honesty invariants (mirrors the rest of the corpus tooling):
 *   - The caption track is ASR (machine-transcribed). A contiguous match of a
 *     multi-word VERBATIM phrase is strong evidence the moment is real, but the
 *     ASR text itself is not ground truth — so we only ever AUTO-WRITE when the
 *     SIO is already clip_match_type: exact_quote_match (its body was human-
 *     verified verbatim against the official transcript) AND we found a HIGH-
 *     confidence contiguous match. Everything else goes to the report for a
 *     human to confirm by listening.
 *   - We NEVER fabricate a timestamp. No match → no timestamp.
 *   - We NEVER upgrade clip_match_type. A talking_point stays a talking_point;
 *     auto-apply refuses to touch it (paraphrase bodies don't appear verbatim
 *     in the audio, so any "match" would be coincidental).
 *   - Default run is DRY (report only). Writing requires the explicit --apply
 *     flag, and even then only the gated exact_quote_match HIGH matches.
 *
 * Run:
 *     npm run extract-video-timestamps                      # dry run, all eligible SIOs
 *     npm run extract-video-timestamps -- --insight-id sio-xxx
 *     npm run extract-video-timestamps -- --apply           # write the gated HIGH/exact matches
 *
 * Output: ai/guides/video_timestamp_extraction_report.md (+ JSON to stdout).
 */

import "dotenv/config";
import { execFileSync } from "child_process";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { load as parseYaml } from "js-yaml";
import { formatTimestamp } from "../src/lib/media";

// ─── Types ──────────────────────────────────────────────────────────────

type Fm = Record<string, unknown>;

type Confidence = "high" | "medium" | "low" | "none";

interface Timeline {
  /** Normalized lowercase word tokens in spoken order. */
  tokens: string[];
  /** times[i] = start time (seconds) of the cue token i was first spoken in. */
  times: number[];
}

interface MatchResult {
  confidence: Confidence;
  /** Number of contiguous verbatim words matched. */
  matched_words: number;
  start_seconds: number | null;
  end_seconds: number | null;
  /** The transcript text we matched, for human eyeballing. */
  matched_snippet: string;
  /** The SIO query text we searched for. */
  query_snippet: string;
}

interface SioReport {
  insight_id: string;
  speaker: string;
  video_id: string | null;
  watch_url: string | null;
  clip_match_type: string | null;
  current_timestamp_start: number | null;
  status:
    | "matched"
    | "no_match"
    | "no_captions"
    | "ytdlp_missing"
    | "skipped_not_youtube"
    | "skipped_has_timestamp"
    | "skipped_no_video_id";
  detail: string;
  match: MatchResult | null;
  /** What the tool did / would do. */
  action: "applied" | "would_apply" | "report_for_review" | "none";
}

// ─── Constants ──────────────────────────────────────────────────────────

const ROOT = process.cwd();
const SIOS_DIR = join(ROOT, "corpus", "sios");
const REPORT_PATH = join(
  ROOT,
  "ai",
  "guides",
  "video_timestamp_extraction_report.md"
);

// The longest contiguous verbatim run drives confidence. Tuned so a clean
// exact-quote body lands HIGH.
const HIGH_MIN_WORDS = 10; // ≥10 contiguous verbatim words → HIGH
const MEDIUM_MIN_WORDS = 6; // 6–9 → MEDIUM

// ─── Frontmatter helpers (match find-video-moments.ts) ───────────────────

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
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

// ─── Text normalization ─────────────────────────────────────────────────

/** Lowercase, strip punctuation to spaces, collapse whitespace → word array. */
function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'") // smart → straight apostrophes
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Pulls the verbatim query text from the SIO body. Strips any reconstruction
 * warning block (⚠️ … blank line) the way find-video-moments.ts does, so we
 * search only the real excerpt.
 */
function bodyQueryText(body: string): string {
  return body.replace(/⚠️[\s\S]*?(\n\n|$)/g, "").trim();
}

// ─── VTT parsing → word timeline ─────────────────────────────────────────

function vttTimeToSeconds(t: string): number {
  // HH:MM:SS.mmm
  const m = t.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!m) return NaN;
  return (
    parseInt(m[1], 10) * 3600 +
    parseInt(m[2], 10) * 60 +
    parseInt(m[3], 10) +
    parseInt(m[4], 10) / 1000
  );
}

/** Removes inline <...> tags (word-timing + <c> styling) from a payload line. */
function stripVttTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

/**
 * Builds a deduplicated spoken-word timeline from a YouTube auto-caption VTT.
 *
 * YouTube ASR captions scroll: consecutive cues repeat the previous line and
 * append a few new words. We collapse that by, for each cue, appending only the
 * words not already covered by the overlap between the running token tail and
 * the cue's leading words. Each appended word inherits its cue's start time.
 */
function parseVttToTimeline(vtt: string): Timeline {
  const lines = vtt.split(/\r?\n/);
  const cues: { start: number; words: string[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(
      /(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/
    );
    if (!m) continue;
    const start = vttTimeToSeconds(m[1]);
    // Gather payload lines until a blank line.
    const payload: string[] = [];
    let j = i + 1;
    for (; j < lines.length && lines[j].trim() !== ""; j++) {
      payload.push(lines[j]);
    }
    i = j;
    const text = stripVttTags(payload.join(" "));
    const words = normalizeWords(text);
    if (words.length > 0) cues.push({ start, words });
  }

  const tokens: string[] = [];
  const times: number[] = [];

  for (const cue of cues) {
    const w = cue.words;
    // Largest k (≤30) where the running tail equals the cue's leading k words.
    const maxK = Math.min(tokens.length, w.length, 30);
    let overlap = 0;
    for (let k = maxK; k > 0; k--) {
      let ok = true;
      for (let n = 0; n < k; n++) {
        if (tokens[tokens.length - k + n] !== w[n]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        overlap = k;
        break;
      }
    }
    for (let idx = overlap; idx < w.length; idx++) {
      tokens.push(w[idx]);
      times.push(cue.start);
    }
  }

  return { tokens, times };
}

// ─── Phrase search ───────────────────────────────────────────────────────

/** Finds the first contiguous occurrence of `needle` in `hay`. -1 if absent. */
function findContiguous(hay: string[], needle: string[]): number {
  if (needle.length === 0 || needle.length > hay.length) return -1;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let n = 0; n < needle.length; n++) {
      if (hay[i + n] !== needle[n]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

/**
 * Locates the SIO's verbatim excerpt in the timeline by finding the LONGEST
 * contiguous run of body words that also appears contiguously in the ASR
 * transcript — anchored anywhere, not just at the body's opening.
 *
 * Why not anchor on the opening: ASR routinely mistranscribes the first words
 * of a thought (filler, false starts, "this/so" swaps), which would sink an
 * opening-prefix match even when the heart of the quote is transcribed cleanly.
 * The longest-common-window is robust to that — it locks onto whatever stretch
 * of the verbatim quote the ASR got right, and reads the timestamp off its
 * first matched word.
 */
function matchSioInTimeline(query: string, tl: Timeline): MatchResult {
  const qWords = normalizeWords(query);
  const empty: MatchResult = {
    confidence: "none",
    matched_words: 0,
    start_seconds: null,
    end_seconds: null,
    matched_snippet: "",
    query_snippet: qWords.slice(0, 16).join(" "),
  };
  if (qWords.length < 5 || tl.tokens.length === 0) return empty;

  // For each body start position, greedily extend the longest contiguous window
  // (capped) that occurs in the transcript. Track the global best.
  const MAX_WINDOW = 24;
  let best = { len: 0, qStart: -1, tStart: -1 };
  for (let i = 0; i < qWords.length; i++) {
    const remaining = Math.min(MAX_WINDOW, qWords.length - i);
    // Only worth extending past the current best.
    for (let len = remaining; len > best.len; len--) {
      const at = findContiguous(tl.tokens, qWords.slice(i, i + len));
      if (at !== -1) {
        best = { len, qStart: i, tStart: at };
        break; // longest for this i
      }
    }
  }
  if (best.len < 5) return empty;

  const startSeconds = Math.floor(tl.times[best.tStart]);
  const endTokenIdx = best.tStart + best.len - 1;
  const endSecondsRaw = Math.ceil(tl.times[endTokenIdx]) + 1;
  const end_seconds = endSecondsRaw > startSeconds ? endSecondsRaw : null;

  const confidence: Confidence =
    best.len >= HIGH_MIN_WORDS
      ? "high"
      : best.len >= MEDIUM_MIN_WORDS
      ? "medium"
      : "low";

  const matched_snippet = tl.tokens
    .slice(best.tStart, best.tStart + best.len)
    .join(" ");

  return {
    confidence,
    matched_words: best.len,
    start_seconds: startSeconds,
    end_seconds,
    matched_snippet,
    query_snippet: qWords.slice(best.qStart, best.qStart + best.len).join(" "),
  };
}

// ─── yt-dlp caption fetch ────────────────────────────────────────────────

let ytdlpChecked = false;
let ytdlpOk = false;

function ytdlpAvailable(): boolean {
  if (ytdlpChecked) return ytdlpOk;
  ytdlpChecked = true;
  try {
    execFileSync("python3", ["-m", "yt_dlp", "--version"], {
      stdio: "ignore",
    });
    ytdlpOk = true;
  } catch {
    ytdlpOk = false;
  }
  return ytdlpOk;
}

/**
 * Downloads the English auto-caption VTT for a video via yt-dlp's android
 * client (the path that bypasses YouTube's poToken wall). Returns the VTT text
 * or null if no captions / fetch failed. Cleans up its temp dir.
 */
function fetchAutoCaptionVtt(videoId: string): string | null {
  const dir = mkdtempSync(join(tmpdir(), "sio-cap-"));
  try {
    execFileSync(
      "python3",
      [
        "-m",
        "yt_dlp",
        "--skip-download",
        "--write-auto-subs",
        "--sub-langs",
        "en",
        "--sub-format",
        "vtt",
        "--no-warnings",
        "-o",
        join(dir, "cap.%(ext)s"),
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { stdio: "ignore", timeout: 120000 }
    );
    const file = readdirSync(dir).find((f) => f.endsWith(".vtt"));
    if (!file) return null;
    return readFileSync(join(dir, file), "utf-8");
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Apply (gated write) ─────────────────────────────────────────────────

/**
 * Writes the start/end timestamps into the SIO file and appends an evidence
 * line to media_verification_notes. Only ever called for gated HIGH-confidence
 * exact_quote_match SIOs. Returns true on success.
 */
function applyTimestamp(
  fileName: string,
  match: MatchResult,
  today: string
): boolean {
  const path = join(SIOS_DIR, fileName);
  let raw = readFileSync(path, "utf-8");

  if (!/timestamp_start_seconds:\s*null/.test(raw)) return false; // safety: don't clobber

  raw = raw.replace(
    /timestamp_start_seconds:\s*null/,
    `timestamp_start_seconds: ${match.start_seconds}`
  );
  raw = raw.replace(
    /timestamp_end_seconds:\s*null/,
    `timestamp_end_seconds: ${match.end_seconds ?? "null"}`
  );

  const startLabel = formatTimestamp(match.start_seconds!) ?? match.start_seconds + "s";
  const endLabel = match.end_seconds
    ? `–${formatTimestamp(match.end_seconds) ?? match.end_seconds + "s"}`
    : "";
  // Single line, no raw double-quotes/newlines — use single quotes around the
  // matched snippet so the value stays a clean YAML double-quoted scalar after
  // escaping. (See escapeForYamlDq below.)
  const note =
    ` TIMESTAMP ADDED ${today} by extract-video-timestamps: located the verbatim ` +
    `SIO body in the official YouTube upload's auto-caption (ASR) transcript ` +
    `(pulled via yt-dlp android-client path). Matched ${match.matched_words} ` +
    `contiguous words ('${match.matched_snippet}') -> ${startLabel}${endLabel}. ` +
    `clip_match_type unchanged (exact_quote_match); ASR timestamps accurate to ~1-2s.`;

  // The media_verification_notes value is a single-line YAML double-quoted
  // scalar that itself contains escaped \" sequences. Anchor on the line and
  // match GREEDILY to the final closing quote (`.*` won't cross the newline),
  // so we append before the real string terminator — not the first inner \".
  const notesRe = /^(media_verification_notes:\s*")(.*)("\s*)$/m;
  if (notesRe.test(raw)) {
    raw = raw.replace(
      notesRe,
      (_m, p1, p2, p3) => `${p1}${p2}${escapeForYamlDq(note)}${p3}`
    );
  }

  writeFileSync(path, raw, "utf-8");
  return true;
}

/** Escapes a string for safe insertion inside a YAML double-quoted scalar. */
function escapeForYamlDq(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ─── Per-SIO processor ──────────────────────────────────────────────────

function processSio(
  fm: Fm,
  body: string,
  fileName: string,
  apply: boolean,
  today: string
): SioReport {
  const insightId = str(fm.insight_id) || fileName;
  const base: SioReport = {
    insight_id: insightId,
    speaker: str(fm.speaker),
    video_id: str(fm.video_id) || null,
    watch_url: str(fm.video_url) || null,
    clip_match_type: str(fm.clip_match_type) || null,
    current_timestamp_start:
      typeof fm.timestamp_start_seconds === "number"
        ? fm.timestamp_start_seconds
        : null,
    status: "no_match",
    detail: "",
    match: null,
    action: "none",
  };

  if (str(fm.video_provider) !== "youtube") {
    return {
      ...base,
      status: "skipped_not_youtube",
      detail:
        "Not a YouTube source. TED embeds can't deep-link and have no ASR track to mine; leave timestamp null.",
    };
  }
  if (base.current_timestamp_start !== null) {
    return {
      ...base,
      status: "skipped_has_timestamp",
      detail: `Already timestamped at ${base.current_timestamp_start}s.`,
    };
  }
  const videoId = str(fm.video_id);
  if (!videoId) {
    return {
      ...base,
      status: "skipped_no_video_id",
      detail: "No video_id to fetch captions against.",
    };
  }
  if (!ytdlpAvailable()) {
    return {
      ...base,
      status: "ytdlp_missing",
      detail:
        "yt-dlp not installed. Run: python3 -m pip install --user yt-dlp (or brew install yt-dlp).",
    };
  }

  const vtt = fetchAutoCaptionVtt(videoId);
  if (!vtt) {
    return {
      ...base,
      status: "no_captions",
      detail:
        "No English auto-caption track available (or fetch failed). Pin this one by listening.",
    };
  }

  const tl = parseVttToTimeline(vtt);
  const match = matchSioInTimeline(bodyQueryText(body), tl);

  if (match.confidence === "none" || match.start_seconds === null) {
    return {
      ...base,
      status: "no_match",
      detail:
        "The SIO body did not appear verbatim in the ASR transcript. Expected for talking_point (paraphrase) SIOs — confirm by listening if you want a timestamp.",
      match,
    };
  }

  const isExact = base.clip_match_type === "exact_quote_match";
  const gated = isExact && match.confidence === "high";

  let action: SioReport["action"] = "report_for_review";
  let detail =
    `Matched ${match.matched_words} contiguous words at ` +
    `${formatTimestamp(match.start_seconds) ?? match.start_seconds + "s"}` +
    (match.end_seconds
      ? `–${formatTimestamp(match.end_seconds) ?? match.end_seconds + "s"}`
      : "") +
    `. confidence=${match.confidence}.`;

  if (gated) {
    if (apply) {
      const ok = applyTimestamp(fileName, match, today);
      action = ok ? "applied" : "report_for_review";
      detail += ok
        ? " ✅ Auto-applied (exact_quote_match + HIGH)."
        : " ⚠️ Apply skipped — timestamp fields not in expected null state.";
    } else {
      action = "would_apply";
      detail += " Would auto-apply with --apply (exact_quote_match + HIGH).";
    }
  } else if (isExact) {
    detail += " Below HIGH threshold — human listen recommended before setting.";
  } else {
    detail +=
      " clip_match_type is not exact_quote_match, so this stays human-gated even at HIGH (paraphrase body — match may be coincidental).";
  }

  return { ...base, status: "matched", detail, match, action };
}

// ─── Markdown report ────────────────────────────────────────────────────

function renderMarkdown(reports: SioReport[], apply: boolean, today: string): string {
  const L: string[] = [];
  L.push("# Video Timestamp Extraction Report");
  L.push("");
  L.push(
    `_Generated by \`scripts/extract-video-timestamps.ts\` on ${today} (${apply ? "APPLY" : "dry-run"} mode)._`
  );
  L.push("");
  L.push(
    "This tool mines each YouTube SIO's **auto-caption (ASR) transcript** (via " +
      "yt-dlp) for the SIO's verbatim body and reads back a real per-moment " +
      "timestamp. Auto-apply is gated to `exact_quote_match` SIOs with a HIGH " +
      "(≥10 contiguous verbatim words) match; everything else is surfaced for a " +
      "human to confirm by listening."
  );
  L.push("");

  const applied = reports.filter((r) => r.action === "applied");
  const wouldApply = reports.filter((r) => r.action === "would_apply");
  const review = reports.filter((r) => r.action === "report_for_review");
  const noMatch = reports.filter((r) => r.status === "no_match");
  const noCaps = reports.filter((r) => r.status === "no_captions");
  const skipped = reports.filter((r) => r.status.startsWith("skipped"));
  const infra = reports.filter((r) => r.status === "ytdlp_missing");

  L.push("## Summary");
  L.push("");
  L.push(`- Processed: **${reports.length}**`);
  L.push(`- ✅ Auto-applied: **${applied.length}**`);
  L.push(`- Would auto-apply (run with \`--apply\`): **${wouldApply.length}**`);
  L.push(`- Matched, needs human confirm: **${review.length}**`);
  L.push(`- No verbatim match (expected for paraphrase SIOs): **${noMatch.length}**`);
  L.push(`- No caption track: **${noCaps.length}**`);
  L.push(`- Skipped (not YouTube / already timestamped / no video_id): **${skipped.length}**`);
  if (infra.length > 0) L.push(`- ⚠️ yt-dlp missing: **${infra.length}**`);
  L.push("");

  const section = (title: string, items: SioReport[]) => {
    L.push(`## ${title} (${items.length})`);
    L.push("");
    if (items.length === 0) {
      L.push("_None._");
      L.push("");
      return;
    }
    for (const r of items) {
      L.push(`### \`${r.insight_id}\` — ${r.speaker}`);
      L.push("");
      if (r.watch_url) L.push(`- **watch:** ${r.watch_url}`);
      L.push(`- **clip_match_type:** ${r.clip_match_type ?? "(unset)"}`);
      if (r.match && r.match.start_seconds !== null) {
        const s = formatTimestamp(r.match.start_seconds) ?? r.match.start_seconds + "s";
        const e = r.match.end_seconds
          ? formatTimestamp(r.match.end_seconds) ?? r.match.end_seconds + "s"
          : null;
        L.push(
          `- **proposed timestamp:** \`${s}\`${e ? `–\`${e}\`` : ""} ` +
            `(${r.match.start_seconds}${r.match.end_seconds ? `–${r.match.end_seconds}` : ""}s)`
        );
        L.push(`- **confidence:** ${r.match.confidence} (${r.match.matched_words} contiguous words)`);
        L.push(`- **matched transcript:** "${r.match.matched_snippet}…"`);
      }
      L.push(`- **status / action:** ${r.detail}`);
      L.push("");
    }
  };

  if (apply) section("✅ Auto-applied", applied);
  else section("Would auto-apply with --apply", wouldApply);
  section("Matched — human confirm recommended", review);
  section("No verbatim match (listen to pin, or leave null)", noMatch);
  section("No caption track available", noCaps);
  if (infra.length > 0) section("⚠️ Infrastructure", infra);

  L.push("---");
  L.push("");
  L.push(
    "**Next step after an apply:** run `npm run validate-media` to confirm no rule " +
      "violations, then spot-check one or two timestamps in the browser."
  );
  L.push("");
  return L.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const idIdx = args.indexOf("--insight-id");
  const targetId = idIdx !== -1 && args[idIdx + 1] ? args[idIdx + 1] : null;
  const today = new Date().toISOString().slice(0, 10);

  const files = readdirSync(SIOS_DIR).filter((f) => f.endsWith(".md")).sort();
  const reports: SioReport[] = [];

  for (const file of files) {
    const raw = readFileSync(join(SIOS_DIR, file), "utf-8");
    const { fm, body } = readFmAndBody(raw);
    const insightId = str(fm.insight_id);
    if (!insightId) continue;
    if (targetId && insightId !== targetId) continue;
    // Default scope: verified YouTube embeds without a timestamp. (Filtering
    // happens inside processSio via the skipped_* statuses, but we cut the
    // obvious non-candidates here to avoid pointless yt-dlp calls unless the
    // user explicitly targeted one with --insight-id.)
    if (!targetId) {
      const verified = str(fm.media_verification_status) === "verified";
      const youtube = str(fm.video_provider) === "youtube";
      if (!verified || !youtube) continue;
    }
    reports.push(processSio(fm, body, file, apply, today));
  }

  console.log(JSON.stringify({ generated_at: today, apply, reports }, null, 2));
  writeFileSync(REPORT_PATH, renderMarkdown(reports, apply, today) + "\n", "utf-8");

  const applied = reports.filter((r) => r.action === "applied").length;
  const would = reports.filter((r) => r.action === "would_apply").length;
  const review = reports.filter((r) => r.action === "report_for_review").length;
  console.error(
    `\n[extract-video-timestamps] wrote report → ${REPORT_PATH}`
  );
  console.error(
    `[extract-video-timestamps] processed=${reports.length} applied=${applied} would_apply=${would} needs_review=${review} (${apply ? "APPLY" : "dry-run"})`
  );
}

main();
