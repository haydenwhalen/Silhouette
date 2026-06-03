/**
 * discover-backfill-candidates.ts — Ad-hoc discovery for the media backfill
 * batch. For each candidate SIO that may have an official video on a
 * verified channel, search that channel and surface the top hit with the
 * API-confirmed channel-match flag.
 *
 * Reads sparingly — caps at one search.list per SIO (100 quota units each).
 *
 * Output: ai/guides/media_backfill_discovery.md + JSON to stdout.
 * Pure read; never writes to SIOs.
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { join } from "path";
import {
  searchOfficialChannel,
  loadTrustedChannels,
  hasYouTubeApiKey,
  type YouTubeVideo,
} from "./lib/youtube";

interface Target {
  insight_id: string;
  speaker: string;
  source_family:
    | "tim-ferriss"
    | "huberman-lab"
    | "school-of-greatness"
    | "rich-roll"
    | "diary-of-a-ceo"
    | "modern-wisdom"
    | "impact-theory"
    | "ted"
    | "tedx";
  // Search term that's most likely to match the canonical episode upload.
  // Keep it short — channel filter does the heavy lifting.
  search_term: string;
  // For human readers in the report.
  episode_hint: string;
}

// ─── Targets ────────────────────────────────────────────────────────────
// SIOs in the inventory that map cleanly to a podcast appearance on a
// verified channel. Manually curated from the inventory so we don't burn
// API quota on speculative searches.

const TARGETS: Target[] = [
  // Tim Ferriss channel (UCznv7Vf9nBdJYvBagFdAHWw)
  {
    insight_id: "sio-jocko-discipline-not-motivation-2016",
    speaker: "Jocko Willink",
    source_family: "tim-ferriss",
    search_term: "Jocko Willink",
    episode_hint: "TFS #187 — Jocko Willink on Discipline, Leadership, and Overcoming Doubt (2016)",
  },
  {
    insight_id: "sio-bj-miller-attend-to-death-2016",
    speaker: "BJ Miller",
    source_family: "tim-ferriss",
    search_term: "BJ Miller",
    episode_hint: "TFS #153 — BJ Miller on death, dying, end-of-life care",
  },
  {
    insight_id: "sio-millman-busy-is-a-decision-2018",
    speaker: "Debbie Millman",
    source_family: "tim-ferriss",
    search_term: "Debbie Millman",
    episode_hint: "TFS #304 — Debbie Millman on busy is a decision",
  },
  {
    insight_id: "sio-perel-survival-vs-revival-2017",
    speaker: "Esther Perel",
    source_family: "tim-ferriss",
    search_term: "Esther Perel",
    episode_hint: "TFS #241 — Esther Perel on relationships, survival vs revival",
  },
  {
    insight_id: "sio-pressfield-resistance-2015",
    speaker: "Steven Pressfield",
    source_family: "tim-ferriss",
    search_term: "Steven Pressfield",
    episode_hint: "TFS — Steven Pressfield on the War of Art / Resistance",
  },
  {
    insight_id: "sio-colonna-complicit-conditions-2019",
    speaker: "Jerry Colonna",
    source_family: "tim-ferriss",
    search_term: "Jerry Colonna",
    episode_hint: "TFS #373 — Jerry Colonna on Reboot, complicit conditions",
  },
  {
    insight_id: "sio-derek-sivers-hell-yeah-or-no-2015",
    speaker: "Derek Sivers",
    source_family: "tim-ferriss",
    search_term: "Derek Sivers",
    episode_hint: "TFS — Derek Sivers on developing confidence, hell yeah or no",
  },
  {
    insight_id: "sio-clear-habits-trajectory-2023",
    speaker: "James Clear",
    source_family: "tim-ferriss",
    search_term: "James Clear",
    episode_hint: "TFS #648 — James Clear on habits, trajectory of becoming",
  },
  // Huberman Lab channel (UC2D2CMWXMOVWx7giW1n3LIg)
  {
    insight_id: "sio-goggins-identity-of-inaction-2023",
    speaker: "David Goggins",
    source_family: "huberman-lab",
    search_term: "David Goggins",
    episode_hint: "Huberman Lab — David Goggins on the identity of inaction",
  },
  {
    insight_id: "sio-andrew-huberman-limbic-friction-reentry-2020",
    speaker: "Andrew Huberman",
    source_family: "huberman-lab",
    search_term: "limbic friction",
    episode_hint: "Huberman Lab — limbic friction / habit re-entry mechanism",
  },
  {
    insight_id: "sio-huberman-dopamine-baseline-2021",
    speaker: "Andrew Huberman",
    source_family: "huberman-lab",
    search_term: "dopamine baseline motivation",
    episode_hint: "Huberman Lab — controlling your dopamine for motivation",
  },
  // Rich Roll
  {
    insight_id: "sio-rich-roll-roll-recovery-reinvention-2022",
    speaker: "Rich Roll",
    source_family: "rich-roll",
    search_term: "Rich Roll story recovery",
    episode_hint: "Rich Roll podcast — Rich's own recovery/reinvention story",
  },
];

// ─── Main ───────────────────────────────────────────────────────────────

interface DiscoveryResult {
  target: Target;
  api_status: "ok" | "no_key" | "no_results" | "api_error";
  api_reason?: string;
  top_hit?: {
    videoId: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
    watchUrl: string;
    embedUrl: string;
    confidence: "high" | "medium" | "low";
    isOfficialChannelMatch: boolean;
  };
  all_results?: number;
}

function findChannelId(family: Target["source_family"]): string | null {
  const reg = loadTrustedChannels();
  const entry = reg.find((c) => c.source_family === family);
  return entry?.channel_id || null;
}

async function discover(target: Target): Promise<DiscoveryResult> {
  if (!hasYouTubeApiKey()) {
    return { target, api_status: "no_key" };
  }
  const channelId = findChannelId(target.source_family);
  if (!channelId) {
    return {
      target,
      api_status: "api_error",
      api_reason: `no verified channel_id for source_family "${target.source_family}" — run verify-youtube-channels`,
    };
  }
  const result = await searchOfficialChannel(channelId, target.search_term, {
    maxResults: 5,
  });
  if (!result.ok) {
    return {
      target,
      api_status: "api_error",
      api_reason: result.reason ?? "unknown",
    };
  }
  const items = result.data ?? [];
  if (items.length === 0) {
    return { target, api_status: "no_results" };
  }
  // Pick the longest title that mentions the speaker name; this filters out
  // short "shorts" / clips and prefers the full-episode upload.
  const speakerLower = target.speaker.toLowerCase();
  const nameMatches = items.filter((v) =>
    v.title.toLowerCase().includes(speakerLower.split(" ")[0])
  );
  const candidates = nameMatches.length > 0 ? nameMatches : items;
  // Prefer "full" / "episode" / "interview" titles, then longest title (proxy
  // for a full upload rather than a clip).
  candidates.sort((a, b) => {
    const aFull =
      /full|episode|interview|podcast/i.test(a.title) && !/short|clip|reel/i.test(a.title) ? 1 : 0;
    const bFull =
      /full|episode|interview|podcast/i.test(b.title) && !/short|clip|reel/i.test(b.title) ? 1 : 0;
    if (aFull !== bFull) return bFull - aFull;
    return b.title.length - a.title.length;
  });
  const top = candidates[0] as YouTubeVideo;
  return {
    target,
    api_status: "ok",
    all_results: items.length,
    top_hit: {
      videoId: top.videoId,
      title: top.title,
      channelTitle: top.channelTitle,
      publishedAt: top.publishedAt,
      watchUrl: top.watchUrl,
      embedUrl: top.embedUrl,
      confidence: top.confidence,
      isOfficialChannelMatch: top.isOfficialChannelMatch,
    },
  };
}

function renderMarkdown(results: DiscoveryResult[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push("# Media Backfill — Podcast Discovery");
  lines.push("");
  lines.push(
    `_Generated by \`scripts/discover-backfill-candidates.ts\` on ${today}._`
  );
  lines.push("");
  lines.push(
    "Top candidate video per SIO, found by searching the SIO's source-family channel on the YouTube Data API. All channels are pre-verified in `corpus/sources/trusted_youtube_channels.json`."
  );
  lines.push("");
  lines.push(
    "**Human review still required before promotion.** A title match does not guarantee the right episode; the human confirms the video is the actual full episode and not a short / clip / re-upload."
  );
  lines.push("");

  for (const r of results) {
    lines.push(`## \`${r.target.insight_id}\``);
    lines.push("");
    lines.push(`- Speaker: ${r.target.speaker}`);
    lines.push(`- Source family: ${r.target.source_family}`);
    lines.push(`- Episode hint: ${r.target.episode_hint}`);
    lines.push(`- API status: \`${r.api_status}\``);
    if (r.api_reason) lines.push(`- Reason: ${r.api_reason}`);
    if (r.top_hit) {
      lines.push(`- Top hit:`);
      lines.push(`  - Title: "${r.top_hit.title}"`);
      lines.push(`  - Channel: ${r.top_hit.channelTitle}`);
      lines.push(`  - Channel match: ${r.top_hit.isOfficialChannelMatch ? "✓ verified" : "✗ NOT verified"}`);
      lines.push(`  - Confidence: ${r.top_hit.confidence}`);
      lines.push(`  - Published: ${r.top_hit.publishedAt.slice(0, 10)}`);
      lines.push(`  - watch: ${r.top_hit.watchUrl}`);
      lines.push(`  - embed: ${r.top_hit.embedUrl}`);
      lines.push(`  - All results returned: ${r.all_results}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const results: DiscoveryResult[] = [];
  for (const target of TARGETS) {
    const r = await discover(target);
    results.push(r);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    total: results.length,
    by_status: results.reduce<Record<string, number>>((acc, r) => {
      acc[r.api_status] = (acc[r.api_status] ?? 0) + 1;
      return acc;
    }, {}),
    results,
  };
  console.log(JSON.stringify(summary, null, 2));

  writeFileSync(
    join(process.cwd(), "ai", "guides", "media_backfill_discovery.md"),
    renderMarkdown(results) + "\n",
    "utf-8"
  );
  console.error(
    `\n[discover-backfill-candidates] processed=${results.length} ` +
      Object.entries(summary.by_status)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
  );
}

main().catch((e) => {
  console.error("discover-backfill-candidates error:", e);
  process.exit(1);
});
