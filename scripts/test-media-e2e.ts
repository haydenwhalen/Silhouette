/**
 * test-media-e2e.ts — End-to-end smoke test for the media layer against
 * REAL SIO files in corpus/sios/.
 *
 * Does NOT require OpenAI or YouTube API keys. Loads SIO frontmatter,
 * normalizes via src/lib/media.ts, and asserts the resulting InsightMedia is
 * what the UI will receive when that SIO is presented.
 *
 * Verifies the production pipeline against real data:
 *   - The 11 verified TED SIOs all produce has_verified_embed: true.
 *   - Their embed_urls are on the allowlist.
 *   - SIOs without media don't blow up.
 *
 * Run: npm run test-media-e2e
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";
import {
  normalizeMediaMetadata,
  hasVerifiedEmbed,
  isAllowedEmbedHost,
} from "../src/lib/media";

const SIOS_DIR = join(process.cwd(), "corpus", "sios");

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

interface FailReport {
  file: string;
  why: string;
}

function main() {
  const files = readdirSync(SIOS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const failures: FailReport[] = [];
  const verified: string[] = [];
  const fallbackOnly: string[] = [];
  const noMedia: string[] = [];

  for (const f of files) {
    const raw = readFileSync(join(SIOS_DIR, f), "utf-8");
    const fm = readFm(raw);
    let media;
    try {
      media = normalizeMediaMetadata(fm);
    } catch (e) {
      failures.push({
        file: f,
        why: `normalizeMediaMetadata threw: ${e instanceof Error ? e.message : String(e)}`,
      });
      continue;
    }

    const declaredVerified =
      String(fm.media_verification_status ?? "").trim() === "verified";
    const declaredVideoPrimary =
      String(fm.display_mode ?? "").trim() === "video-primary";

    // Cross-check: a frontmatter that declares verified + video-primary +
    // embed_url must produce a renderable media card.
    if (declaredVerified && declaredVideoPrimary) {
      if (!hasVerifiedEmbed(media)) {
        failures.push({
          file: f,
          why: `frontmatter declares verified + video-primary but hasVerifiedEmbed=false (embed_url=${media.embed_url ?? "null"})`,
        });
        continue;
      }
      if (!isAllowedEmbedHost(media.embed_url)) {
        failures.push({
          file: f,
          why: `embed_url is not on render-time allowlist: ${media.embed_url ?? "null"}`,
        });
        continue;
      }
      verified.push(f);
    } else if (media.fallback_url) {
      fallbackOnly.push(f);
    } else {
      noMedia.push(f);
    }
  }

  console.log("=".repeat(72));
  console.log("Media e2e smoke test");
  console.log("=".repeat(72));
  console.log(`Total SIOs: ${files.length}`);
  console.log(`Verified embed (will render card): ${verified.length}`);
  console.log(`Source link fallback only:         ${fallbackOnly.length}`);
  console.log(`No media (text-only):              ${noMedia.length}`);
  console.log("");

  if (verified.length > 0) {
    console.log("Card-rendering SIOs:");
    for (const v of verified) console.log(`  ✓ ${v}`);
    console.log("");
  }

  if (failures.length > 0) {
    console.log(`FAIL — ${failures.length} SIO(s) failed the smoke test:`);
    for (const f of failures) console.log(`  ✗ ${f.file} — ${f.why}`);
    process.exit(1);
  }

  console.log(
    `PASS — all ${files.length} SIOs normalize cleanly; verified SIOs all render-ready.`
  );
  process.exit(0);
}

main();
