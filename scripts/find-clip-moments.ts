/**
 * find-clip-moments.ts — Clip moment discovery (Stage D).
 *
 * For each SIO with a fetchable transcript, locates the moment in the
 * transcript that matches the SIO's key_claim/excerpt and emits a candidate
 * "clip moment" record with:
 *   - clip_match_type recommendation (exact_quote_match | close_paraphrase |
 *     talking_point)
 *   - evidence: the matched transcript paragraph + surrounding context
 *   - confidence label
 *   - explicit needs_human_review flag
 *
 * HONESTY INVARIANTS:
 *   - NEVER writes to SIO files. The output is a candidate report; a human
 *     applies the timestamps + clip_match_type to the SIO after reviewing
 *     the evidence and (when needed) scrubbing the audio/video.
 *   - NEVER fabricates a timestamp. Most podcast transcripts (e.g. tim.blog,
 *     artofmanliness.com) do NOT carry per-moment timestamps — those require
 *     a human to identify by listening. The script flags this explicitly per
 *     candidate.
 *   - NEVER claims exact_quote_match without finding the excerpt verbatim in
 *     the fetched transcript. close_paraphrase / talking_point are honest
 *     fallbacks.
 *
 * Run:
 *     npm run find-clip-moments                  # all SIOs with embed_url
 *     npm run find-clip-moments -- --insight-id sio-xxx
 *     npm run find-clip-moments -- --all          # all SIOs
 *
 * Outputs:
 *     stdout — JSON report
 *     ai/guides/clip_moment_discovery_report.md — markdown report
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";

const ROOT = process.cwd();
const SIOS_DIR = join(ROOT, "corpus", "sios");
const SOURCES_DIR = join(ROOT, "corpus", "sources");
const REPORT_PATH = join(
  ROOT,
  "ai",
  "guides",
  "clip_moment_discovery_report.md"
);

type Fm = Record<string, unknown>;

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function readFrontmatter(raw: string): { fm: Fm; body: string } {
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

// Strip HTML tags + collapse whitespace. NOT a full HTML parser — this is for
// rough transcript text extraction from podcast pages.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\w\s'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Generates progressively shorter sub-phrases to probe for in the transcript.
// Used when the full excerpt isn't found verbatim — we try mid-length spans
// before giving up and falling back to talking_point.
function* phraseProbes(text: string): Generator<string> {
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length >= 40) yield trimmed;
  }
  // Word-window probes for cases where excerpts are stitched together.
  const words = text.split(/\s+/);
  for (const span of [25, 18, 12]) {
    if (words.length < span) continue;
    for (let i = 0; i + span <= words.length; i += Math.max(1, Math.floor(span / 2))) {
      yield words.slice(i, i + span).join(" ");
    }
  }
}

interface CandidateMoment {
  insight_id: string;
  speaker: string;
  source_id: string;
  transcript_url: string | null;
  transcript_source: string | null;
  fetched: boolean;
  fetch_reason_if_skipped: string | null;
  recommended_clip_match_type:
    | "exact_quote_match"
    | "close_paraphrase"
    | "talking_point"
    | null;
  evidence_excerpt: string | null;
  evidence_context: string | null;
  longest_matched_span_words: number;
  timestamp_recommendation: string;
  needs_human_review: string[];
}

interface SourceRecord {
  source_id?: string;
  transcript_url?: string;
  transcript_source?: string;
  transcript_available?: boolean;
  transcript_verified?: boolean;
}

function indexSources(): Map<string, SourceRecord> {
  const idx = new Map<string, SourceRecord>();
  for (const f of readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const obj = JSON.parse(
        readFileSync(join(SOURCES_DIR, f), "utf-8")
      ) as SourceRecord;
      if (obj.source_id) idx.set(obj.source_id, obj);
    } catch {
      /* skip unparseable */
    }
  }
  return idx;
}

// Cache transcripts in-memory so multiple SIOs sharing a source only fetch once.
const transcriptCache = new Map<string, { text: string; error: string | null }>();

async function fetchTranscript(
  url: string
): Promise<{ text: string; error: string | null }> {
  const cached = transcriptCache.get(url);
  if (cached) return cached;
  try {
    const resp = await fetch(url, {
      headers: {
        // Generous UA — some podcast hosts block default fetch UA. We're
        // requesting publicly-available transcript pages.
        "User-Agent":
          "Mozilla/5.0 (compatible; SilhouetteClipFinder/1.0; +discovery-script)",
      },
    });
    if (!resp.ok) {
      const result = { text: "", error: `HTTP ${resp.status}` };
      transcriptCache.set(url, result);
      return result;
    }
    const html = await resp.text();
    const result = { text: htmlToText(html), error: null };
    transcriptCache.set(url, result);
    return result;
  } catch (e) {
    const result = {
      text: "",
      error: e instanceof Error ? e.message : String(e),
    };
    transcriptCache.set(url, result);
    return result;
  }
}

async function findMomentForSio(
  fm: Fm,
  body: string,
  source: SourceRecord | undefined
): Promise<CandidateMoment> {
  const insightId = str(fm.insight_id);
  const speaker = str(fm.speaker);
  const sourceId = str(fm.source_id);
  const transcriptUrl = source?.transcript_url ?? null;
  const transcriptSource = source?.transcript_source ?? null;

  const base: CandidateMoment = {
    insight_id: insightId,
    speaker,
    source_id: sourceId,
    transcript_url: transcriptUrl,
    transcript_source: transcriptSource,
    fetched: false,
    fetch_reason_if_skipped: null,
    recommended_clip_match_type: null,
    evidence_excerpt: null,
    evidence_context: null,
    longest_matched_span_words: 0,
    timestamp_recommendation:
      "No timestamp recommended — most podcast transcripts (tim.blog, " +
      "artofmanliness.com) do NOT carry per-moment timestamps. Watch/listen " +
      "to the source and identify timestamp_start_seconds manually.",
    needs_human_review: [],
  };

  if (!transcriptUrl) {
    base.fetch_reason_if_skipped = "source record has no transcript_url";
    base.needs_human_review.push(
      "No transcript URL — human must transcribe a target moment or skip"
    );
    return base;
  }

  // Only fetch sources we know are public transcript pages. Anything else
  // gets skipped to avoid accidentally fetching paywalled / non-transcript URLs.
  const fetchable =
    /tim\.blog|artofmanliness\.com|ted\.com|grant\.nyt\.com|nytimes\.com/i.test(
      transcriptUrl
    );
  if (!fetchable) {
    base.fetch_reason_if_skipped = `transcript_url host not on fetchable list: ${transcriptUrl}`;
    base.needs_human_review.push(
      "transcript_url host not auto-fetchable — review manually"
    );
    return base;
  }

  const fetched = await fetchTranscript(transcriptUrl);
  base.fetched = true;
  if (fetched.error || !fetched.text) {
    base.fetch_reason_if_skipped =
      fetched.error ?? "transcript fetch returned empty body";
    base.needs_human_review.push(
      `Transcript fetch failed: ${base.fetch_reason_if_skipped}`
    );
    return base;
  }

  const haystack = normalizeForSearch(fetched.text);
  const keyClaim = str(fm.key_claim);
  const excerpt = body;

  // Stage 1 — try the SIO excerpt verbatim (longest probe).
  const probes: { text: string; provenance: "excerpt" | "key_claim" | "phrase" }[] = [];
  if (excerpt) probes.push({ text: excerpt, provenance: "excerpt" });
  if (keyClaim) probes.push({ text: keyClaim, provenance: "key_claim" });

  let bestMatch: {
    needle: string;
    provenance: string;
    span: number;
    pos: number;
  } | null = null;

  for (const probe of probes) {
    const needle = normalizeForSearch(probe.text);
    if (needle.length < 40) continue;
    const pos = haystack.indexOf(needle);
    if (pos !== -1) {
      const span = needle.split(/\s+/).length;
      if (!bestMatch || span > bestMatch.span) {
        bestMatch = { needle, provenance: probe.provenance, span, pos };
      }
    }
  }

  // Stage 2 — if no full-probe match, try sub-phrase probes from excerpt + key_claim.
  if (!bestMatch) {
    const sub: string[] = [];
    if (excerpt) for (const p of phraseProbes(excerpt)) sub.push(p);
    if (keyClaim) for (const p of phraseProbes(keyClaim)) sub.push(p);
    for (const probe of sub) {
      const needle = normalizeForSearch(probe);
      if (needle.length < 30) continue;
      const pos = haystack.indexOf(needle);
      if (pos !== -1) {
        const span = needle.split(/\s+/).length;
        if (!bestMatch || span > bestMatch.span) {
          bestMatch = { needle, provenance: "phrase", span, pos };
        }
      }
    }
  }

  if (!bestMatch) {
    base.recommended_clip_match_type = "talking_point";
    base.needs_human_review.push(
      "No verbatim or near-verbatim phrase from the SIO was found in the " +
        "fetched transcript. Either (a) the excerpt is a reconstruction and " +
        "should be reframed as a talking point, or (b) the transcript on file " +
        "is for a different episode. Verify before promoting."
    );
    return base;
  }

  // Build the evidence context — ±200 chars around the match in the ORIGINAL
  // (un-normalized) transcript text, so the human can read it as it appeared.
  // Find the match position in the original by re-normalizing in segments
  // (cheap & approximate is fine here — we're showing context to a human).
  const origIdx = approximateOriginalIndex(fetched.text, bestMatch.needle);
  const evidenceContext =
    origIdx >= 0
      ? fetched.text
          .slice(Math.max(0, origIdx - 200), origIdx + bestMatch.needle.length + 200)
          .trim()
      : null;

  const matchedSpanWords = bestMatch.span;
  base.longest_matched_span_words = matchedSpanWords;
  base.evidence_excerpt = bestMatch.needle.slice(0, 220);
  base.evidence_context = evidenceContext;

  // Honest classification rule:
  //   matched the full excerpt or key_claim (≥40 words) → exact_quote_match
  //     candidate. Still needs human transcript_verified flag.
  //   matched a sub-phrase (≥15 words) → close_paraphrase candidate.
  //   matched < 15 words → talking_point (the idea is attributable, the
  //     exact moment is not pinpointed).
  if (
    matchedSpanWords >= 40 &&
    (bestMatch.provenance === "excerpt" ||
      bestMatch.provenance === "key_claim")
  ) {
    base.recommended_clip_match_type = "exact_quote_match";
    base.needs_human_review.push(
      "Confirm the matched span is the actual SIO excerpt (not a near-duplicate " +
        "elsewhere in the transcript) before setting clip_match_type and " +
        "transcript_verified: true on the SIO."
    );
  } else if (matchedSpanWords >= 15) {
    base.recommended_clip_match_type = "close_paraphrase";
    base.needs_human_review.push(
      "Sub-phrase match found. Decide whether the SIO excerpt is faithful to " +
        "this passage (close_paraphrase) or should be tightened toward verbatim."
    );
  } else {
    base.recommended_clip_match_type = "talking_point";
    base.needs_human_review.push(
      "Only a short fragment matched. Likely the SIO captures the broader idea " +
        "rather than the specific moment — keep as talking_point."
    );
  }

  return base;
}

// Approximate finder: given the normalized needle, scan the original text for
// the same words in order. Returns the original-text index of the first match
// or -1. This isn't perfect (it ignores casing/punctuation differences), but
// it's good enough to pull ±200 chars of context for a human reader.
function approximateOriginalIndex(originalText: string, needle: string): number {
  const firstWords = needle.split(" ").slice(0, 6).join(" ");
  if (!firstWords) return -1;
  const re = new RegExp(
    firstWords
      .split(" ")
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+"),
    "i"
  );
  const m = originalText.match(re);
  if (!m || m.index === undefined) return -1;
  return m.index;
}

function renderMarkdown(candidates: CandidateMoment[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push("# Clip Moment Discovery Report");
  lines.push("");
  lines.push(`_Generated by \`scripts/find-clip-moments.ts\` on ${today}._`);
  lines.push("");
  lines.push(
    "This report identifies candidate clip moments by searching the SIO's " +
      "excerpt/key_claim against fetched transcripts. **All candidates are " +
      "`needs_human_review`.** Timestamps are NEVER recommended — most podcast " +
      "transcripts don't carry them; a human must identify the timestamp by " +
      "listening to the source."
  );
  lines.push("");

  const byType = (t: string) =>
    candidates.filter((c) => c.recommended_clip_match_type === t);

  const exact = byType("exact_quote_match");
  const close = byType("close_paraphrase");
  const talking = byType("talking_point");
  const skipped = candidates.filter((c) => !c.fetched);

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total SIOs processed: **${candidates.length}**`);
  lines.push(`- exact_quote_match candidates: **${exact.length}**`);
  lines.push(`- close_paraphrase candidates: **${close.length}**`);
  lines.push(`- talking_point candidates: **${talking.length}**`);
  lines.push(`- Skipped (no fetchable transcript): **${skipped.length}**`);
  lines.push("");

  const section = (title: string, items: CandidateMoment[]) => {
    lines.push(`## ${title} (${items.length})`);
    lines.push("");
    if (items.length === 0) {
      lines.push("_None._");
      lines.push("");
      return;
    }
    for (const c of items) {
      lines.push(`### \`${c.insight_id}\` — ${c.speaker}`);
      lines.push("");
      lines.push(`- **source_id:** \`${c.source_id}\``);
      lines.push(`- **transcript_url:** ${c.transcript_url ?? "(none)"}`);
      lines.push(`- **transcript_source:** ${c.transcript_source ?? "(none)"}`);
      lines.push(`- **fetched:** ${c.fetched ? "yes" : "no"}`);
      if (c.fetch_reason_if_skipped) {
        lines.push(`- **skipped reason:** ${c.fetch_reason_if_skipped}`);
      }
      lines.push(
        `- **recommended clip_match_type:** \`${
          c.recommended_clip_match_type ?? "(none)"
        }\``
      );
      if (c.longest_matched_span_words > 0) {
        lines.push(
          `- **longest matched span:** ${c.longest_matched_span_words} words`
        );
      }
      if (c.evidence_context) {
        lines.push("- **evidence context (±200 chars from transcript):**");
        lines.push("");
        lines.push("  > " + c.evidence_context.replace(/\n/g, " "));
        lines.push("");
      }
      lines.push(`- **timestamp:** ${c.timestamp_recommendation}`);
      if (c.needs_human_review.length > 0) {
        lines.push("- **needs human review:**");
        for (const n of c.needs_human_review) lines.push(`  - ${n}`);
      }
      lines.push("");
    }
  };

  section("exact_quote_match candidates", exact);
  section("close_paraphrase candidates", close);
  section("talking_point candidates", talking);
  section("Skipped — transcript not fetchable", skipped);

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf("--insight-id");
  const targetId =
    targetIndex !== -1 && args[targetIndex + 1] ? args[targetIndex + 1] : null;
  const allFlag = args.includes("--all");

  const sources = indexSources();

  const sioFiles = readdirSync(SIOS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const candidates: CandidateMoment[] = [];

  for (const file of sioFiles) {
    const raw = readFileSync(join(SIOS_DIR, file), "utf-8");
    const { fm, body } = readFrontmatter(raw);
    const insightId = str(fm.insight_id);
    if (!insightId) continue;

    // Target filter:
    //   --insight-id <id>   → only that SIO
    //   --all               → every SIO
    //   default             → SIOs that already have an embed_url (the ones the
    //                         video card will actually render — biggest leverage)
    if (targetId) {
      if (insightId !== targetId) continue;
    } else if (!allFlag) {
      if (!str(fm.embed_url)) continue;
    }

    const source = sources.get(str(fm.source_id));
    const candidate = await findMomentForSio(fm, body, source);
    candidates.push(candidate);
  }

  const report = {
    generated_at: new Date().toISOString(),
    total: candidates.length,
    candidates,
  };

  console.log(JSON.stringify(report, null, 2));

  if (existsSync(join(ROOT, "ai", "guides"))) {
    writeFileSync(REPORT_PATH, renderMarkdown(candidates) + "\n", "utf-8");
    console.error(`\n[find-clip-moments] wrote markdown report → ${REPORT_PATH}`);
  }
  console.error(
    `[find-clip-moments] processed=${candidates.length} ` +
      `fetched=${candidates.filter((c) => c.fetched).length} ` +
      `skipped=${candidates.filter((c) => !c.fetched).length}`
  );
}

main().catch((err) => {
  console.error("[find-clip-moments] unexpected error:", err);
  process.exit(1);
});
