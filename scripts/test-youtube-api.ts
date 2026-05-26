/**
 * test-youtube-api.ts — Self-contained tests for scripts/lib/youtube.ts
 *
 * Runnable as: npx tsx scripts/test-youtube-api.ts
 * Requires NO real API key. All async tests use mock mode (useMock: true)
 * or verify the no-key fallback.
 *
 * Exits with code 0 on all pass, code 1 if any test fails.
 */

import {
  extractYouTubeVideoId,
  normalizeYouTubeUrl,
  buildYouTubeWatchUrl,
  buildYouTubeEmbedUrl,
  loadTrustedChannels,
  isLikelyOfficialChannel,
  hasYouTubeApiKey,
  searchYouTubeVideos,
  getVideoDetails,
  searchOfficialChannel,
} from "./lib/youtube.js";

// ── Simple test harness ────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function testAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ── All tests in a single async main ─────────────────────────────────────────

async function main(): Promise<void> {
  // ── extractYouTubeVideoId tests ─────────────────────────────────────────────

  test("extractYouTubeVideoId: watch?v= URL", () => {
    assertEqual(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
      "watch?v= URL"
    );
  });

  test("extractYouTubeVideoId: watch?v= URL with extra params", () => {
    assertEqual(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123"),
      "dQw4w9WgXcQ",
      "watch?v= with extra params"
    );
  });

  test("extractYouTubeVideoId: youtu.be short URL", () => {
    assertEqual(
      extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
      "youtu.be"
    );
  });

  test("extractYouTubeVideoId: youtu.be with query string", () => {
    assertEqual(
      extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=30"),
      "dQw4w9WgXcQ",
      "youtu.be with t param"
    );
  });

  test("extractYouTubeVideoId: /embed/ URL", () => {
    assertEqual(
      extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
      "/embed/"
    );
  });

  test("extractYouTubeVideoId: /embed/ URL with params on nocookie domain", () => {
    assertEqual(
      extractYouTubeVideoId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30"),
      "dQw4w9WgXcQ",
      "/embed/ with params"
    );
  });

  test("extractYouTubeVideoId: /shorts/ URL", () => {
    assertEqual(
      extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
      "/shorts/"
    );
  });

  test("extractYouTubeVideoId: bare 11-char ID", () => {
    assertEqual(
      extractYouTubeVideoId("dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
      "bare 11-char ID"
    );
  });

  test("extractYouTubeVideoId: invalid URL returns null", () => {
    assertEqual(extractYouTubeVideoId("https://example.com/not-youtube"), null, "non-YouTube URL");
  });

  test("extractYouTubeVideoId: empty string returns null", () => {
    assertEqual(extractYouTubeVideoId(""), null, "empty string");
  });

  test("extractYouTubeVideoId: too-short ID returns null", () => {
    assertEqual(extractYouTubeVideoId("abc"), null, "3-char string");
  });

  // ── normalizeYouTubeUrl tests ───────────────────────────────────────────────

  test("normalizeYouTubeUrl: produces canonical form from youtu.be", () => {
    assertEqual(
      normalizeYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "canonical from youtu.be"
    );
  });

  test("normalizeYouTubeUrl: idempotent on canonical URL", () => {
    assertEqual(
      normalizeYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "idempotent"
    );
  });

  test("normalizeYouTubeUrl: returns null for non-YouTube URL", () => {
    assertEqual(normalizeYouTubeUrl("https://vimeo.com/12345"), null, "vimeo");
  });

  // ── buildYouTubeWatchUrl tests ──────────────────────────────────────────────

  test("buildYouTubeWatchUrl: no timestamp", () => {
    assertEqual(
      buildYouTubeWatchUrl("dQw4w9WgXcQ"),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "no timestamp"
    );
  });

  test("buildYouTubeWatchUrl: with startSeconds", () => {
    assertEqual(
      buildYouTubeWatchUrl("dQw4w9WgXcQ", 120),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s",
      "with startSeconds"
    );
  });

  test("buildYouTubeWatchUrl: startSeconds=0 appended", () => {
    assertEqual(
      buildYouTubeWatchUrl("dQw4w9WgXcQ", 0),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=0s",
      "startSeconds=0"
    );
  });

  // ── buildYouTubeEmbedUrl tests ──────────────────────────────────────────────

  test("buildYouTubeEmbedUrl: no params uses youtube-nocookie.com", () => {
    assertEqual(
      buildYouTubeEmbedUrl("dQw4w9WgXcQ"),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "no params"
    );
  });

  test("buildYouTubeEmbedUrl: with start only", () => {
    assertEqual(
      buildYouTubeEmbedUrl("dQw4w9WgXcQ", 30),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30",
      "start only"
    );
  });

  test("buildYouTubeEmbedUrl: with start and end", () => {
    assertEqual(
      buildYouTubeEmbedUrl("dQw4w9WgXcQ", 30, 90),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30&end=90",
      "start and end"
    );
  });

  test("buildYouTubeEmbedUrl: end without start is ignored", () => {
    assertEqual(
      buildYouTubeEmbedUrl("dQw4w9WgXcQ", undefined, 90),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "end without start"
    );
  });

  test("buildYouTubeEmbedUrl: end == start is ignored", () => {
    assertEqual(
      buildYouTubeEmbedUrl("dQw4w9WgXcQ", 60, 60),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=60",
      "end == start"
    );
  });

  test("buildYouTubeEmbedUrl: start=0 with end is valid", () => {
    assertEqual(
      buildYouTubeEmbedUrl("dQw4w9WgXcQ", 0, 45),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=0&end=45",
      "start=0 with end"
    );
  });

  // ── loadTrustedChannels tests ───────────────────────────────────────────────

  test("loadTrustedChannels: returns an array", () => {
    const channels = loadTrustedChannels();
    assert(Array.isArray(channels), "should return an array");
    assert(channels.length >= 9, `expected at least 9 channels, got ${channels.length}`);
  });

  test("loadTrustedChannels: each entry has required fields", () => {
    const channels = loadTrustedChannels();
    for (const ch of channels) {
      assert(typeof ch.name === "string" && ch.name.length > 0, `name missing in entry: ${JSON.stringify(ch)}`);
      assert(typeof ch.channel_id === "string", `channel_id must be string: ${ch.name}`);
      assert(typeof ch.channel_url === "string", `channel_url must be string: ${ch.name}`);
      assert(typeof ch.source_family === "string", `source_family must be string: ${ch.name}`);
      assert(
        ["high", "medium", "needs_review"].includes(ch.trust_level),
        `trust_level invalid: ${ch.trust_level} in ${ch.name}`
      );
      assert(typeof ch.notes === "string", `notes must be string: ${ch.name}`);
    }
  });

  test("loadTrustedChannels: non-test real channels have blank channel_id (not guessed)", () => {
    const channels = loadTrustedChannels();
    const realChannels = channels.filter((ch) => ch.source_family !== "test-fixture");
    for (const ch of realChannels) {
      assertEqual(
        ch.channel_id,
        "",
        `channel_id for ${ch.name} should be "" until verified`
      );
      assertEqual(
        ch.trust_level,
        "needs_review",
        `trust_level for ${ch.name} should be needs_review until channel_id is verified`
      );
    }
  });

  test("loadTrustedChannels: test fixture entry has known synthetic channel_id", () => {
    const channels = loadTrustedChannels();
    const testFixture = channels.find((ch) => ch.source_family === "test-fixture");
    assert(testFixture !== undefined, "test fixture entry should exist");
    assertEqual(testFixture!.channel_id, "SAMPLEchan0000000000000", "test fixture channel_id");
    assertEqual(testFixture!.trust_level, "high", "test fixture trust_level");
  });

  // ── isLikelyOfficialChannel tests ───────────────────────────────────────────

  test("isLikelyOfficialChannel: matches trusted channel by exact channel_id", () => {
    const trusted = loadTrustedChannels();
    const result = isLikelyOfficialChannel("SAMPLEchan0000000000000", trusted);
    assertEqual(result.match, true, "should match");
    assertEqual(result.trustLevel, "high", "should be high trust");
    assertEqual(result.channelName, "SAMPLE_TRUSTED_FOR_TESTS_ONLY", "channel name");
  });

  test("isLikelyOfficialChannel: no match for unknown channel_id", () => {
    const trusted = loadTrustedChannels();
    const result = isLikelyOfficialChannel("UNKNOWNchan000000000000", trusted);
    assertEqual(result.match, false, "should not match");
    assertEqual(result.trustLevel, null, "trustLevel should be null");
    assertEqual(result.channelName, null, "channelName should be null");
  });

  test("isLikelyOfficialChannel: empty string does not match", () => {
    const result = isLikelyOfficialChannel("");
    assertEqual(result.match, false, "empty string should not match");
  });

  test("isLikelyOfficialChannel: blank channel_id in registry never matches", () => {
    const result = isLikelyOfficialChannel("", loadTrustedChannels());
    assertEqual(result.match, false, "blank channel_id never matches");
  });

  // ── hasYouTubeApiKey tests ──────────────────────────────────────────────────

  test("hasYouTubeApiKey: returns false when env var is not set", () => {
    const saved = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    const result = hasYouTubeApiKey();
    if (saved !== undefined) process.env.YOUTUBE_API_KEY = saved;
    assertEqual(result, false, "no key set");
  });

  test("hasYouTubeApiKey: returns false when env var is empty string", () => {
    const saved = process.env.YOUTUBE_API_KEY;
    process.env.YOUTUBE_API_KEY = "";
    const result = hasYouTubeApiKey();
    if (saved !== undefined) process.env.YOUTUBE_API_KEY = saved;
    else delete process.env.YOUTUBE_API_KEY;
    assertEqual(result, false, "empty string");
  });

  // ── Async: no-key fallback ──────────────────────────────────────────────────

  await testAsync("searchYouTubeVideos: no key + no mock → {ok:false, reason:'no_api_key'}", async () => {
    const saved = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    try {
      const result = await searchYouTubeVideos("test query");
      assertEqual(result.ok, false, "ok should be false");
      assertEqual(result.reason, "no_api_key", "reason should be no_api_key");
    } finally {
      if (saved !== undefined) process.env.YOUTUBE_API_KEY = saved;
    }
  });

  await testAsync("getVideoDetails: no key + no mock → {ok:false, reason:'no_api_key'}", async () => {
    const saved = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    try {
      const result = await getVideoDetails("SAMPLEvid01");
      assertEqual(result.ok, false, "ok should be false");
      assertEqual(result.reason, "no_api_key", "reason should be no_api_key");
    } finally {
      if (saved !== undefined) process.env.YOUTUBE_API_KEY = saved;
    }
  });

  // ── Async: mock mode ────────────────────────────────────────────────────────

  await testAsync("searchYouTubeVideos useMock: returns ok:true with array (no key required)", async () => {
    const saved = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    try {
      const result = await searchYouTubeVideos("inaction", { useMock: true });
      assertEqual(result.ok, true, "ok should be true");
      assert(Array.isArray(result.data), "data should be an array");
      assert((result.data?.length ?? 0) >= 1, "should have at least one video");
    } finally {
      if (saved !== undefined) process.env.YOUTUBE_API_KEY = saved;
    }
  });

  await testAsync("searchYouTubeVideos useMock: videos have correct watchUrl and embedUrl", async () => {
    const result = await searchYouTubeVideos("test", { useMock: true });
    assert(result.ok && Array.isArray(result.data), "expected ok result with data");
    for (const video of result.data!) {
      assert(
        video.watchUrl.startsWith("https://www.youtube.com/watch?v="),
        `watchUrl should be canonical: ${video.watchUrl}`
      );
      assert(
        video.embedUrl.startsWith("https://www.youtube-nocookie.com/embed/"),
        `embedUrl should use youtube-nocookie.com: ${video.embedUrl}`
      );
    }
  });

  await testAsync("searchYouTubeVideos useMock: trusted channel video has isOfficialChannelMatch=true", async () => {
    const result = await searchYouTubeVideos("test", { useMock: true });
    assert(result.ok && Array.isArray(result.data), "expected ok result");
    const official = result.data!.find((v) => v.channelId === "SAMPLEchan0000000000000");
    assert(official !== undefined, "should find video from SAMPLEchan0000000000000");
    assertEqual(official!.isOfficialChannelMatch, true, "isOfficialChannelMatch");
    assertEqual(official!.matchedTrustedChannel, "SAMPLE_TRUSTED_FOR_TESTS_ONLY", "matchedTrustedChannel");
    assertEqual(official!.confidence, "high", "confidence should be high for high trust_level channel");
  });

  await testAsync("searchYouTubeVideos useMock: untrusted channel video has isOfficialChannelMatch=false", async () => {
    const result = await searchYouTubeVideos("test", { useMock: true });
    assert(result.ok && Array.isArray(result.data), "expected ok result");
    const untrusted = result.data!.find((v) => v.channelId === "UNTRUSTEDchan00000000000");
    assert(untrusted !== undefined, "should find video from untrusted channel");
    assertEqual(untrusted!.isOfficialChannelMatch, false, "isOfficialChannelMatch");
    assertEqual(untrusted!.matchedTrustedChannel, null, "matchedTrustedChannel");
    assertEqual(untrusted!.confidence, "low", "confidence should be low for untrusted channel");
  });

  await testAsync("getVideoDetails useMock: returns ok:true with a single YouTubeVideo", async () => {
    const saved = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    try {
      const result = await getVideoDetails("SAMPLEvid01", { useMock: true });
      assertEqual(result.ok, true, "ok should be true");
      assert(result.data !== undefined, "data should be present");
      assertEqual(result.data!.videoId, "SAMPLEvid01", "videoId");
      assert(
        result.data!.watchUrl.startsWith("https://www.youtube.com/watch?v="),
        "watchUrl format"
      );
      assert(
        result.data!.embedUrl.startsWith("https://www.youtube-nocookie.com/embed/"),
        "embedUrl format"
      );
      assertEqual(result.data!.isOfficialChannelMatch, true, "isOfficialChannelMatch from fixture");
      assertEqual(result.data!.confidence, "high", "confidence from fixture");
    } finally {
      if (saved !== undefined) process.env.YOUTUBE_API_KEY = saved;
    }
  });

  await testAsync("searchOfficialChannel useMock: delegates to searchYouTubeVideos correctly", async () => {
    const result = await searchOfficialChannel("SAMPLEchan0000000000000", "test", { useMock: true });
    assertEqual(result.ok, true, "ok should be true");
    assert(Array.isArray(result.data), "data should be array");
  });

  // ── Results summary ───────────────────────────────────────────────────────────

  console.log("\n─────────────────────────────────────────────────────");
  console.log("YouTube API Helper — Test Results");
  console.log("─────────────────────────────────────────────────────");

  let passes = 0;
  let failures = 0;

  for (const r of results) {
    if (r.passed) {
      console.log(`  PASS  ${r.name}`);
      passes++;
    } else {
      console.log(`  FAIL  ${r.name}`);
      console.log(`        ${r.error}`);
      failures++;
    }
  }

  console.log("─────────────────────────────────────────────────────");
  console.log(`  Total: ${results.length}  |  Passed: ${passes}  |  Failed: ${failures}`);
  console.log("─────────────────────────────────────────────────────\n");

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[test-youtube-api] Unexpected error:", err);
  process.exit(1);
});
