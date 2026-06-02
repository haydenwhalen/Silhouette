/**
 * explore-sog-episodes.ts — Ad-hoc exploration tool for the SoG harvest batch.
 *
 * For each guest term passed on the command line, searches the verified Lewis
 * Howes / School of Greatness YouTube channel (UCKsP3v2JeT2hWI_HzkxWiMA) and
 * lists the top candidate full-episode videos with confidence flags.
 *
 * Honest about what it does: surfaces candidates only. NEVER writes anything
 * to SIOs. Output is for human review.
 *
 * Run:
 *   tsx scripts/explore-sog-episodes.ts "Mel Robbins" "Jay Shetty" "Matthew McConaughey"
 */

import "dotenv/config";
import { searchOfficialChannel, loadTrustedChannels } from "./lib/youtube";

const SOG_FAMILY = "school-of-greatness";

function getSoGChannelId(): string | null {
  const trusted = loadTrustedChannels();
  const sog = trusted.find((t) => t.source_family === SOG_FAMILY);
  return sog?.channel_id || null;
}

async function exploreGuest(channelId: string, term: string) {
  console.log(`\n=== ${term} ===`);
  const result = await searchOfficialChannel(channelId, term, { maxResults: 5 });
  if (!result.ok) {
    console.log(`  (search failed: ${result.reason})`);
    return;
  }
  if (!result.data || result.data.length === 0) {
    console.log(`  (no results)`);
    return;
  }
  for (const v of result.data) {
    const match = v.isOfficialChannelMatch ? "✓ official" : "✗ NOT official";
    console.log(`  [${match}] ${v.title}`);
    console.log(`    videoId: ${v.videoId}  published: ${v.publishedAt.slice(0, 10)}`);
    console.log(`    watch:   ${v.watchUrl}`);
    console.log("");
  }
}

async function main() {
  const terms = process.argv.slice(2);
  if (terms.length === 0) {
    console.error("Usage: tsx scripts/explore-sog-episodes.ts <guest> [<guest> ...]");
    process.exit(1);
  }
  const channelId = getSoGChannelId();
  if (!channelId) {
    console.error("Lewis Howes / SoG channel_id not in registry. Run `npm run verify-youtube-channels` first.");
    process.exit(1);
  }
  console.log(`Searching Lewis Howes / SoG channel: ${channelId}`);
  for (const term of terms) {
    await exploreGuest(channelId, term);
  }
}

main().catch((e) => {
  console.error("explore-sog-episodes error:", e);
  process.exit(1);
});
