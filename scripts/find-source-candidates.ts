/**
 * find-source-candidates.ts — SIO Discovery Agent: Source Scout (Component 1).
 *
 * DETERMINISTIC. No LLM, no network.
 *
 * 1. Loads the current SIO corpus via loadSioMetas().
 * 2. Computes per-state coverage gaps (state × insight_type, state × voice_register,
 *    intensity=intense, thinnest registers).
 * 3. Derives up to 6 top "target candidate profiles".
 * 4. For each top gap × a set of trusted source families, generates concrete ranked
 *    search-query strings that a human (or web-tool agent) can run.
 * 5. Optional YouTube enrichment: if YOUTUBE_API_KEY is configured AND a trusted
 *    source family has a known channel_id, calls searchOfficialChannel and appends
 *    any API candidates (clearly labeled "API candidates (verify before use)").
 *    When no key is present, falls back to manual queries + prints a one-line note.
 * 6. Outputs: console report + ai/guides/source_candidate_discovery_report.md.
 *
 * Does NOT create candidate files — emits queries only (avoids junk candidates).
 *
 * Run: npx tsx scripts/find-source-candidates.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import {
  GUIDES_DIR,
  INSIGHT_TYPES,
  INTENSITIES,
  MVP_STATES,
  VOICE_REGISTERS,
  loadSioMetas,
  tally,
  ensureDir,
} from "./lib/discovery";
import {
  hasYouTubeApiKey,
  searchOfficialChannel,
  type TrustedChannel,
} from "./lib/youtube";

const REPORT_PATH = join(GUIDES_DIR, "source_candidate_discovery_report.md");

// ── Trusted source families (hardcoded per spec) ──────────────────────────────
interface SourceFamily {
  name: string;
  handles: string[];          // YouTube / social handles
  domains: string[];          // primary website domains
  search_prefixes: string[];  // how to target via site: or quoted name
  strong_states: string[];    // MVP states this source commonly addresses
  strong_types: string[];     // insight_types this source typically delivers
  strong_registers: string[]; // voice_registers typical of this source
  channel_id?: string;        // YouTube channel ID (starts with "UC") — used for API enrichment
}

const SOURCE_FAMILIES: SourceFamily[] = [
  {
    name: "The School of Greatness",
    handles: ["@lewishowes"],
    domains: ["lewishowes.com"],
    search_prefixes: ['site:lewishowes.com', '"Lewis Howes" "School of Greatness"'],
    strong_states: ["direction-collapse", "engagement-drought", "inaction-loop"],
    strong_types: ["story", "permission", "reframe"],
    strong_registers: ["warm/affirming", "vulnerable/personal"],
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  {
    name: "Huberman Lab",
    handles: ["@hubermanlab"],
    domains: ["hubermanlab.com"],
    search_prefixes: ['site:hubermanlab.com', '"Huberman Lab" site:youtube.com'],
    strong_states: ["engagement-drought", "inaction-loop"],
    strong_types: ["mechanism"],
    strong_registers: ["expert/scientific"],
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  {
    name: "The Tim Ferriss Show",
    handles: ["@timferriss"],
    domains: ["tim.blog"],
    search_prefixes: ['site:tim.blog', '"Tim Ferriss" "The Tim Ferriss Show"'],
    strong_states: ["direction-collapse", "inaction-loop"],
    strong_types: ["story", "reframe", "mechanism"],
    strong_registers: ["intellectual/measured", "direct/challenging"],
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  {
    name: "Diary of a CEO",
    handles: ["@TheDiaryOfACEO"],
    domains: ["doac.com"],
    search_prefixes: ['"Diary of a CEO"', '"Diary of a CEO" site:youtube.com'],
    strong_states: ["direction-collapse", "engagement-drought"],
    strong_types: ["story", "reframe", "permission"],
    strong_registers: ["vulnerable/personal", "direct/challenging"],
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  {
    name: "Rich Roll Podcast",
    handles: ["@richroll"],
    domains: ["richroll.com"],
    search_prefixes: ['site:richroll.com', '"Rich Roll Podcast"'],
    strong_states: ["direction-collapse", "engagement-drought", "inaction-loop"],
    strong_types: ["story", "permission"],
    strong_registers: ["warm/affirming", "vulnerable/personal"],
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  {
    name: "Modern Wisdom",
    handles: ["@ChrisWillx"],
    domains: ["chriswillx.com"],
    search_prefixes: ['"Modern Wisdom" site:youtube.com', '"Chris Williamson" "Modern Wisdom"'],
    strong_states: ["inaction-loop", "direction-collapse"],
    strong_types: ["mechanism", "reframe"],
    strong_registers: ["direct/challenging", "intellectual/measured"],
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  {
    name: "Impact Theory",
    handles: ["@TomBilyeu"],
    domains: ["impacttheory.com"],
    search_prefixes: ['site:impacttheory.com', '"Impact Theory" site:youtube.com'],
    strong_states: ["inaction-loop", "direction-collapse"],
    strong_types: ["reframe", "mechanism"],
    strong_registers: ["direct/challenging"],
    channel_id: ""  /* blanked: do NOT ship unverified channel IDs — populate from verified trusted_youtube_channels.json */,
  },
  {
    name: "TED / TEDx",
    handles: ["@TED"],
    domains: ["ted.com"],
    search_prefixes: ['site:ted.com/talks', 'TED talk site:ted.com'],
    strong_states: ["direction-collapse", "engagement-drought", "inaction-loop"],
    strong_types: ["reframe", "mechanism", "story", "permission"],
    strong_registers: ["expert/scientific", "intellectual/measured", "warm/affirming"],
    // TED uses ted.com, not YouTube as primary — no channel_id for API search
  },
];

// ── Gap detection thresholds ──────────────────────────────────────────────────
const MIN_PER_STATE_TYPE = 1;
const MIN_PER_STATE_REGISTER = 1;
const MIN_INTENSE_GLOBAL = 2;
const TOP_N_PROFILES = 6;
const QUERIES_PER_PROFILE = 3;

// YouTube API candidate surface (never auto-verified — always "needs review")
interface ApiVideoCandidate {
  title: string;
  channelTitle: string;
  watchUrl: string;
  confidence: string;
  isOfficialChannelMatch: boolean;
  source_family: string;
  note: string;
}

interface TargetProfile {
  rank: number;
  priority: number;
  target_state: string;
  target_gap: string;
  insight_type?: string;
  voice_register?: string;
  intensity?: string;
  gap_kind: string;
  gap_detail: string;
  fitting_source_families: string[];
  ranked_queries: QueryEntry[];
  // Optional: populated when YouTube API is configured and a channel_id is known
  api_candidates?: ApiVideoCandidate[];
  api_note?: string;
}

interface QueryEntry {
  query: string;
  source_family: string;
  rationale: string;
}

// ── Topic seed phrases per gap type ──────────────────────────────────────────
// Used to generate realistic search queries. These are topic hints, not claims.
const STATE_TOPIC_SEEDS: Record<string, string[]> = {
  "direction-collapse": [
    "feeling lost career purpose",
    "lost direction what to do with life",
    "can't find passion meaning",
    "career crossroads identity",
    "post-achievement emptiness",
    "what do I really want life",
  ],
  "engagement-drought": [
    "burnout flatness going through the motions",
    "lost interest work motivation",
    "disconnected numb engagement",
    "nothing feels meaningful anymore",
    "dopamine reset motivation",
    "re-engaging after burnout",
  ],
  "inaction-loop": [
    "procrastination shame fear starting",
    "stuck paralysis can't take action",
    "self-sabotage resistance",
    "fear of failure perfectionism",
    "just start imperfect action",
    "accountability momentum",
  ],
};

const TYPE_SEEDS: Record<string, string[]> = {
  reframe:     ["reframe", "different way to think about", "isn't what you think"],
  permission:  ["permission", "it's okay", "give yourself permission", "you're allowed to"],
  mechanism:   ["how it works", "science of", "why you", "mechanism", "research shows"],
  story:       ["story", "my experience", "I used to", "how I", "personal journey"],
};

const REGISTER_SEEDS: Record<string, string[]> = {
  "direct/challenging":   ["challenge", "hard truth", "stop making excuses", "accountability"],
  "warm/affirming":       ["compassion", "self-compassion", "kindness", "validation", "gentle"],
  "intellectual/measured": ["analysis", "framework", "evidence", "strategy", "research-based"],
  "vulnerable/personal":  ["vulnerable", "personal story", "I struggled", "I failed", "honest"],
  "expert/scientific":    ["science", "research", "study", "data", "neuroscience", "psychology"],
};

function buildQueriesForProfile(profile: {
  target_state: string;
  insight_type?: string;
  voice_register?: string;
  intensity?: string;
}, sourceFamily: SourceFamily): QueryEntry[] {
  const queries: QueryEntry[] = [];
  const topicSeeds = STATE_TOPIC_SEEDS[profile.target_state] ?? ["stuck", "direction", "purpose"];
  const typeSeeds = profile.insight_type ? (TYPE_SEEDS[profile.insight_type] ?? []) : [];
  const registerSeeds = profile.voice_register ? (REGISTER_SEEDS[profile.voice_register] ?? []) : [];
  const intensityHint = profile.intensity === "intense" ? " confrontational direct challenge" : "";

  // Query 1: site-targeted with topic + type seed
  const topicPhrase = topicSeeds[0] ?? "purpose";
  const typePhrase  = typeSeeds[0] ?? "";
  const searchPrefix = sourceFamily.search_prefixes[0] ?? `"${sourceFamily.name}"`;
  queries.push({
    query: `${searchPrefix} "${topicPhrase}" ${typePhrase}${intensityHint}`.trim().replace(/\s+/g, " "),
    source_family: sourceFamily.name,
    rationale: `Targets ${profile.target_state} + ${profile.insight_type ?? "any type"} on official ${sourceFamily.name} domain/channel.`,
  });

  // Query 2: second site prefix + register seed
  if (sourceFamily.search_prefixes.length > 1 || registerSeeds.length > 0) {
    const regPhrase   = registerSeeds[0] ?? typeSeeds[1] ?? topicSeeds[1] ?? "meaning";
    const searchPrefix2 = sourceFamily.search_prefixes[1] ?? sourceFamily.search_prefixes[0];
    queries.push({
      query: `${searchPrefix2} "${topicSeeds[1] ?? topicPhrase}" ${regPhrase} official`.trim().replace(/\s+/g, " "),
      source_family: sourceFamily.name,
      rationale: `Register-aware query (${profile.voice_register ?? "any register"}) via second access path for ${sourceFamily.name}.`,
    });
  }

  // Query 3: broad TED-style or platform-specific fallback
  const alt = topicSeeds[2] ?? topicSeeds[0];
  queries.push({
    query: `"${sourceFamily.name}" ${alt} ${typeSeeds[0] ?? "insight"} official`.trim().replace(/\s+/g, " "),
    source_family: sourceFamily.name,
    rationale: `Broader fallback to surface any matching content from ${sourceFamily.name}.`,
  });

  return queries.slice(0, QUERIES_PER_PROFILE);
}

function findFittingFamilies(
  target_state: string,
  insight_type?: string,
  voice_register?: string
): SourceFamily[] {
  return SOURCE_FAMILIES.filter((sf) => {
    const stateMatch = sf.strong_states.includes(target_state);
    const typeMatch  = !insight_type  || sf.strong_types.includes(insight_type);
    const regMatch   = !voice_register || sf.strong_registers.includes(voice_register);
    // Must match state; bonus for type+register
    return stateMatch && (typeMatch || regMatch);
  });
}

async function main() {
  const sios = loadSioMetas();
  const n = sios.length;
  const now = new Date().toISOString();

  // ── Compute gap matrices ──────────────────────────────────────────
  const stateTypeCount: Record<string, number> = {};
  for (const st of MVP_STATES)
    for (const ty of INSIGHT_TYPES)
      stateTypeCount[`${st}|${ty}`] = 0;
  for (const s of sios) {
    const k = `${s.primary_state_tag}|${s.insight_type}`;
    if (k in stateTypeCount) stateTypeCount[k]++;
  }

  const stateRegCount: Record<string, number> = {};
  for (const st of MVP_STATES)
    for (const r of VOICE_REGISTERS)
      stateRegCount[`${st}|${r}`] = 0;
  for (const s of sios) {
    const k = `${s.primary_state_tag}|${s.voice_register}`;
    if (k in stateRegCount) stateRegCount[k]++;
  }

  const byIntensity = tally(sios, (s) => s.intensity_level);
  const byState     = tally(sios, (s) => s.primary_state_tag);

  // ── Collect gaps in priority order ───────────────────────────────
  interface RawGap {
    priority: number;
    kind: string;
    detail: string;
    target_state: string;
    insight_type?: string;
    voice_register?: string;
    intensity?: string;
    target_gap: string;
  }

  const rawGaps: RawGap[] = [];

  // Missing state × insight_type (priority 100)
  for (const st of MVP_STATES) {
    for (const ty of INSIGHT_TYPES) {
      const c = stateTypeCount[`${st}|${ty}`] ?? 0;
      if (c < MIN_PER_STATE_TYPE) {
        rawGaps.push({
          priority: 100,
          kind: "missing_state_type",
          detail: `${st} has 0 ${ty} SIOs`,
          target_state: st,
          insight_type: ty,
          target_gap: `${st} + ${ty}`,
        });
      }
    }
  }

  // Empty state × voice_register (priority 80)
  for (const st of MVP_STATES) {
    for (const r of VOICE_REGISTERS) {
      const c = stateRegCount[`${st}|${r}`] ?? 0;
      if (c < MIN_PER_STATE_REGISTER) {
        rawGaps.push({
          priority: 80,
          kind: "empty_state_register",
          detail: `${st} has no ${r} SIO`,
          target_state: st,
          voice_register: r,
          target_gap: `${st} + ${r}`,
        });
      }
    }
  }

  // Thin states (priority 70)
  for (const st of MVP_STATES) {
    const c = byState[st] ?? 0;
    if (c < 5) {
      rawGaps.push({
        priority: 70,
        kind: "thin_state",
        detail: `${st} has only ${c} SIOs`,
        target_state: st,
        target_gap: `${st} + (any under-covered type/register)`,
      });
    }
  }

  // Thin 'intense' globally (priority 55)
  const intenseC = byIntensity["intense"] ?? 0;
  if (intenseC < MIN_INTENSE_GLOBAL) {
    rawGaps.push({
      priority: 55,
      kind: "thin_intensity_intense",
      detail: `Only ${intenseC} 'intense' SIO(s) across the full corpus`,
      target_state: "inaction-loop",
      intensity: "intense",
      voice_register: "direct/challenging",
      target_gap: `inaction-loop + direct/challenging + intense`,
    });
  }

  rawGaps.sort((a, b) => b.priority - a.priority);

  // ── Build top target profiles ─────────────────────────────────────
  // Deduplicate: take the top-N unique target_gap strings
  const seenGaps = new Set<string>();
  const topGaps: RawGap[] = [];
  for (const g of rawGaps) {
    if (!seenGaps.has(g.target_gap)) {
      seenGaps.add(g.target_gap);
      topGaps.push(g);
      if (topGaps.length >= TOP_N_PROFILES) break;
    }
  }

  const profiles: TargetProfile[] = topGaps.map((g, i) => {
    const families = findFittingFamilies(g.target_state, g.insight_type, g.voice_register);
    // If no family matches all criteria, fall back to state-match only
    const fittingFamilies = families.length > 0
      ? families
      : SOURCE_FAMILIES.filter((sf) => sf.strong_states.includes(g.target_state));
    // Pick up to 2 best-fitting families
    const topFamilies = fittingFamilies.slice(0, 2);
    const allQueries: QueryEntry[] = [];
    for (const sf of topFamilies) {
      allQueries.push(...buildQueriesForProfile(g, sf));
    }
    return {
      rank: i + 1,
      priority: g.priority,
      target_state: g.target_state,
      target_gap: g.target_gap,
      insight_type: g.insight_type,
      voice_register: g.voice_register,
      intensity: g.intensity,
      gap_kind: g.kind,
      gap_detail: g.detail,
      fitting_source_families: topFamilies.map((sf) => sf.name),
      ranked_queries: allQueries,
    };
  });

  // ── Optional YouTube API enrichment ──────────────────────────────
  // Runs only when YOUTUBE_API_KEY is configured. Results are labeled
  // "API candidates (verify before use)" — NEVER treated as verified.
  const apiEnabled = hasYouTubeApiKey();
  if (!apiEnabled) {
    console.log("(YouTube API not configured — using manual queries)");
  }

  if (apiEnabled) {
    // Build a lookup from source family name → family object for quick access
    const familyByName = new Map<string, SourceFamily>(
      SOURCE_FAMILIES.map((sf) => [sf.name, sf])
    );
    for (const profile of profiles) {
      const apiCandidates: ApiVideoCandidate[] = [];
      for (const familyName of profile.fitting_source_families) {
        const sf = familyByName.get(familyName);
        // Only call API when a real channel_id is known for this family
        if (!sf?.channel_id) continue;
        // Use the first ranked query's topic as the search term
        const firstQuery = profile.ranked_queries.find((q) => q.source_family === familyName);
        const searchTerm = firstQuery?.query ?? profile.target_gap;
        try {
          const result = await searchOfficialChannel(sf.channel_id, searchTerm, { maxResults: 3 });
          if (result.ok && result.data) {
            for (const video of result.data) {
              apiCandidates.push({
                title: video.title,
                channelTitle: video.channelTitle,
                watchUrl: video.watchUrl,
                confidence: video.confidence,
                isOfficialChannelMatch: video.isOfficialChannelMatch,
                source_family: familyName,
                note: "API candidates (verify before use) — not verified, needs human review before any use as SIO source.",
              });
            }
          } else if (!result.ok) {
            console.warn(`[find-source-candidates] YouTube API search failed for ${familyName}: ${result.reason ?? "unknown reason"}`);
          }
        } catch (err) {
          console.warn(`[find-source-candidates] YouTube API error for ${familyName}: ${String(err)}`);
        }
      }
      if (apiCandidates.length > 0) {
        profile.api_candidates = apiCandidates;
        profile.api_note = "API candidates surfaced via searchOfficialChannel — these are CANDIDATES ONLY. Verify official channel, content accuracy, and timestamps before any use. Do NOT write video_id or set status=verified without human confirmation.";
      }
    }
  }

  // ── Console output ────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  SILHOUETTE — Source Scout: Candidate Discovery Queries          ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");
  console.log(`Corpus: ${n} SIOs loaded.`);
  console.log(`Top ${profiles.length} target candidate profiles derived from coverage gaps.\n`);
  console.log("⚠️  NOTE: These are SEARCH QUERIES, not verified candidates.");
  console.log("    Run them via web tools or manually. Prefer official URLs.");
  console.log("    Never treat re-uploads as verified sources.\n");

  for (const p of profiles) {
    console.log(`${"─".repeat(68)}`);
    console.log(`PROFILE #${p.rank} (priority ${p.priority}) — ${p.target_gap}`);
    console.log(`  Gap kind:   ${p.gap_kind}`);
    console.log(`  Detail:     ${p.gap_detail}`);
    if (p.insight_type)    console.log(`  Type:       ${p.insight_type}`);
    if (p.voice_register)  console.log(`  Register:   ${p.voice_register}`);
    if (p.intensity)       console.log(`  Intensity:  ${p.intensity}`);
    console.log(`  Sources:    ${p.fitting_source_families.join(", ") || "(any trusted family)"}`);
    console.log(`  Queries:`);
    p.ranked_queries.forEach((q, qi) => {
      console.log(`    [${qi + 1}] ${q.query}`);
      console.log(`        → ${q.source_family} | ${q.rationale}`);
    });
    // Print any API candidates (only present when YouTube API is configured)
    if (p.api_candidates && p.api_candidates.length > 0) {
      console.log(`  API candidates (verify before use):`);
      p.api_candidates.forEach((ac, ai) => {
        const matchLabel = ac.isOfficialChannelMatch ? "[official channel match]" : "[channel unconfirmed]";
        console.log(`    [A${ai + 1}] ${ac.title}`);
        console.log(`         Channel: ${ac.channelTitle} ${matchLabel} | confidence: ${ac.confidence}`);
        console.log(`         URL:     ${ac.watchUrl}`);
        console.log(`         Note:    ${ac.note}`);
      });
    }
    console.log();
  }

  // ── Write markdown report ─────────────────────────────────────────
  ensureDir(GUIDES_DIR);
  writeFileSync(REPORT_PATH, buildMarkdown(profiles, n, now), "utf-8");
  console.log(`\n[find-source-candidates] Wrote report → ${REPORT_PATH}`);
  console.log(`[find-source-candidates] ${profiles.length} target profiles, ${profiles.reduce((a, p) => a + p.ranked_queries.length, 0)} queries generated.`);
}

function buildMarkdown(profiles: TargetProfile[], totalSios: number, now: string): string {
  const L: string[] = [];
  L.push("# Source Candidate Discovery Report");
  L.push("");
  L.push(`_Generated by \`scripts/find-source-candidates.ts\` on ${now.slice(0, 10)}. Deterministic — no LLM, no network._`);
  L.push("");
  L.push(`**Corpus size at generation time:** ${totalSios} SIOs`);
  L.push("");
  L.push("## Honesty notice");
  L.push("");
  L.push("> These are **search queries only**. They are not verified candidates and they do not");
  L.push("> constitute claims about what any source has said. Run each query via web tools or");
  L.push("> manually. Always prefer official channel / domain URLs. Never treat re-uploads,");
  L.push("> compilation channels, or unofficial mirrors as verified sources.");
  L.push("");
  L.push("## Trusted source families");
  L.push("");
  L.push("The following families are the preferred search targets (official channels/pages only):");
  L.push("");
  for (const sf of SOURCE_FAMILIES) {
    L.push(`- **${sf.name}** — ${sf.handles.join(", ")} | ${sf.domains.join(", ")}`);
  }
  L.push("");
  L.push("## Top target candidate profiles");
  L.push("");
  L.push("Derived from coverage gaps in the current corpus. Sorted by priority (highest first).");
  L.push("");

  for (const p of profiles) {
    L.push(`### Profile #${p.rank}: \`${p.target_gap}\``);
    L.push("");
    L.push(`| Field | Value |`);
    L.push(`|---|---|`);
    L.push(`| Priority | ${p.priority} |`);
    L.push(`| Gap kind | ${p.gap_kind} |`);
    L.push(`| Detail | ${p.gap_detail} |`);
    if (p.insight_type)   L.push(`| Insight type | ${p.insight_type} |`);
    if (p.voice_register) L.push(`| Voice register | ${p.voice_register} |`);
    if (p.intensity)      L.push(`| Intensity | ${p.intensity} |`);
    L.push(`| Fitting source families | ${p.fitting_source_families.join(", ") || "(any)"} |`);
    L.push("");
    L.push("**Ranked search queries** (run via web tools or manually; prefer official URLs):");
    L.push("");
    p.ranked_queries.forEach((q, qi) => {
      L.push(`${qi + 1}. \`${q.query}\``);
      L.push(`   - Source family: ${q.source_family}`);
      L.push(`   - Rationale: ${q.rationale}`);
      L.push(`   - Confidence: N/A — these are queries, not findings`);
      L.push(`   - Note: run via web tools / manually; prefer official URLs; never treat re-uploads as verified`);
    });

    // Optional: API candidates section (only present when YouTube API was configured at run time)
    if (p.api_candidates && p.api_candidates.length > 0) {
      L.push("");
      L.push("**API candidates (verify before use)** — surfaced via YouTube Data API from official channels:");
      L.push("");
      L.push("> IMPORTANT: These are surface-level search results from official channel IDs. They are");
      L.push("> NOT verified SIO sources. Do NOT write a video_id or set media_verification_status: verified");
      L.push("> without human confirmation of the official channel, timestamps, and transcript accuracy.");
      L.push("");
      if (p.api_note) L.push(`> ${p.api_note}`);
      L.push("");
      p.api_candidates.forEach((ac, ai) => {
        const matchLabel = ac.isOfficialChannelMatch ? "official channel match" : "channel unconfirmed";
        L.push(`${ai + 1}. **${ac.title}**`);
        L.push(`   - Channel: ${ac.channelTitle} (${matchLabel})`);
        L.push(`   - Watch URL: ${ac.watchUrl}`);
        L.push(`   - Confidence: ${ac.confidence}`);
        L.push(`   - Source family: ${ac.source_family}`);
        L.push(`   - Status: CANDIDATE — needs human review before any use`);
      });
    }
    L.push("");
  }

  L.push("## Full gap list (raw)");
  L.push("");
  L.push("All detected gaps before deduplication, sorted by priority:");
  L.push("");
  L.push("| priority | kind | target_gap |");
  L.push("|---|---|---|");
  for (const p of profiles) {
    L.push(`| ${p.priority} | ${p.gap_kind} | ${p.target_gap} |`);
  }
  L.push("");
  L.push("---");
  L.push("_End of report. This file is auto-generated; do not edit manually._");
  L.push("");
  return L.join("\n");
}

main().catch((err) => {
  console.error("[find-source-candidates] Unexpected error:", err);
  process.exit(1);
});
