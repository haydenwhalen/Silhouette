/**
 * fetch-sog-details.ts — Pulls full video details (description, stats, dates)
 * for the SoG harvest batch via YouTube Data API videos.list. 1 unit/video.
 *
 * For each video, prints:
 *   - canonical title, channel match
 *   - published date
 *   - any timestamp markers found in the description (chapter cues)
 *   - the first ~500 chars of description for human review
 *
 * Honest: this fetches OFFICIAL channel video metadata. Timestamps surfaced
 * here are CANDIDATE markers from the description — they still need human
 * confirmation by listening before being set on an SIO.
 */

import "dotenv/config";
import { getVideoDetails, isLikelyOfficialChannel, loadTrustedChannels } from "./lib/youtube";

// Lock-in picks from the SoG harvest plan.
const PICKS: { state: string; speaker: string; videoId: string; reason: string }[] = [
  { state: "inaction-loop", speaker: "Ed Mylett", videoId: "RrSBoHAfZiA", reason: "Direct register on action; not duplicating existing Goggins/Jocko inaction-loop SIOs." },
  { state: "engagement-drought", speaker: "Brené Brown", videoId: "TbsRU-crgsc", reason: "Title aligns with engagement-drought; warm/affirming register." },
  { state: "direction-collapse", speaker: "Matthew McConaughey", videoId: "z_VxOyBCjsM", reason: "Greenlights-era; post-achievement themes; vulnerable register." },
  { state: "possibility-paralysis", speaker: "Adam Grant", videoId: "jOIYF_BQUgo", reason: "Original Thinkers / decision under uncertainty; intellectual register." },
  { state: "identity-transition", speaker: "Apolo Ohno", videoId: "ZpQX4bhRXWY", reason: "Post-Olympic transition; non-Howes identity arc." },
  { state: "momentum-gap", speaker: "James Clear", videoId: "kD2IQWP25Yc", reason: "Habit restart / lost year angle; different episode than existing Clear-on-TFS SIO." },
];

// Extracts patterns like "00:00", "0:00", "1:23:45", "(00:00)" — but only when
// they look like a chapter marker (line-start or after parenthesis), not random
// numbers in the body.
const TS_RE = /(^|\n|[\(\[])\s*(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

function findTimestamps(description: string): { ts: string; line: string }[] {
  const lines = description.split("\n");
  const found: { ts: string; line: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\s*[-–—]?\s*(.+)$/);
    if (m) {
      const ts = m[1];
      const rest = m[2].trim();
      if (rest.length > 2 && rest.length < 200) {
        found.push({ ts, line: rest });
      }
    }
  }
  return found;
}

async function main() {
  const trusted = loadTrustedChannels();
  const sog = trusted.find((t) => t.source_family === "school-of-greatness");
  if (!sog?.channel_id) {
    console.error("SoG channel_id missing. Run verify-youtube-channels first.");
    process.exit(1);
  }

  for (const pick of PICKS) {
    console.log("\n" + "=".repeat(72));
    console.log(`${pick.state}  —  ${pick.speaker}  (${pick.videoId})`);
    console.log(`Reason: ${pick.reason}`);
    console.log("=".repeat(72));

    const result = await getVideoDetails(pick.videoId);
    if (!result.ok || !result.data) {
      console.log(`  FETCH FAILED: ${result.reason ?? "unknown"}`);
      continue;
    }
    const v = result.data;
    const officialMatch = isLikelyOfficialChannel(v.channelId, trusted);
    console.log(`  Title:      ${v.title}`);
    console.log(`  Channel:    ${v.channelTitle}  (${v.channelId})`);
    console.log(`  Official:   ${officialMatch.match ? "✓ matched trusted channel " + officialMatch.channelName : "✗ NOT matched"}`);
    console.log(`  Published:  ${v.publishedAt}`);
    console.log(`  Watch URL:  ${v.watchUrl}`);
    console.log(`  Embed URL:  ${v.embedUrl}`);

    const tsMatches = findTimestamps(v.description);
    if (tsMatches.length > 0) {
      console.log(`  Chapter markers found in description (${tsMatches.length}):`);
      for (const t of tsMatches) {
        console.log(`    ${t.ts}  — ${t.line}`);
      }
    } else {
      console.log(`  No chapter markers detected in description.`);
    }

    console.log(`  Description preview (first 600 chars):`);
    console.log("  " + v.description.slice(0, 600).replace(/\n/g, "\n  "));
  }
}

main().catch((e) => {
  console.error("fetch-sog-details error:", e);
  process.exit(1);
});
