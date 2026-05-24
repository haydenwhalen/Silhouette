import "dotenv/config";
import { loadSIODocuments } from "../src/rag/sioLoader";
import { getOrCreateVectorStore } from "../src/rag/vectorStore";
import { presentInsight } from "../src/presentation/presentInsight";
import { classifyState } from "../src/agent/stateClassifier";

interface Case {
  label: string;
  insight_id: string;
  user_query: string;
}

const CASES: Case[] = [
  {
    label: "Direction Collapse — McConaughey",
    insight_id: "sio-mcconaughey-go-to-zero-2020",
    user_query:
      "I got the promotion I'd been working toward for two years. I should feel great. I just feel empty. I don't know what comes next.",
  },
  {
    label: "Engagement Drought — Huberman",
    insight_id: "sio-huberman-dopamine-baseline-2021",
    user_query:
      "I used to love this work. Now I open my laptop and feel nothing. Not bad, just flat. It's been like this for months.",
  },
  {
    label: "Inaction Loop — Goggins",
    insight_id: "sio-goggins-identity-of-inaction-2023",
    user_query:
      "I know exactly what I need to do — I've known for months. I just keep not starting. I'm so tired of having this same conversation with myself.",
  },
];

const BANNED_PHRASES = [
  "journey",
  "based on what you",
  "powerful quote",
  "as an ai",
  "i can see you",
  "exactly what you need",
  "you seem to be",
  "this will help you",
  "many people feel",
  "you are not alone",
];

function header(s: string) {
  console.log("\n" + "=".repeat(72));
  console.log(s);
  console.log("=".repeat(72));
}

interface Score {
  attribution_complete: boolean;
  excerpt_nonempty: boolean;
  why_present: boolean;
  no_banned_in_why: boolean;
  no_banned_in_bridge: boolean;
  state_not_named: boolean;
  why_length_ok: boolean;
  media_resolved: boolean;
}

async function main() {
  header("Phase 3 Presentation Test");

  const docs = await loadSIODocuments();
  console.log(`Loaded ${docs.length} SIOs.`);
  await getOrCreateVectorStore(docs);

  let pass = 0;
  let fail = 0;

  for (const c of CASES) {
    header(`Case: ${c.label}`);
    console.log(`Query: ${c.user_query}\n`);

    const classification = await classifyState(c.user_query);
    console.log(
      `[classification] ${classification.detected_state} (${classification.state_confidence})`
    );

    const result = await presentInsight(
      c.insight_id,
      classification,
      c.user_query
    );

    if (!result.ok) {
      console.log(`FAIL — ${result.reason}`);
      fail++;
      continue;
    }

    const p = result.presentation;
    console.log("\n[structured]");
    console.log(`  insight_id:        ${p.insight_id}`);
    console.log(`  speaker:           ${p.speaker}`);
    console.log(`  display_mode:      ${p.media.display_mode}`);
    console.log(`  source_url:        ${p.media.source_url ?? "(none)"}`);
    console.log(`  embed_url:         ${p.media.embed_url ?? "(none)"}`);
    console.log(`  video_id:          ${p.media.video_id ?? "(none)"}`);
    console.log(`  timestamp_range:   ${p.media.timestamp_range ?? "(none)"}`);
    console.log(`  source_confidence: ${p.source_confidence}`);
    console.log(`  bridge_sentence:   ${p.bridge_sentence ?? "(none)"}`);
    console.log(`  why_this_applies:  ${p.why_this_applies}`);
    console.log(`  presentation_notes:${p.presentation_notes.length ? " " + p.presentation_notes.join(" | ") : " (none)"}`);

    console.log("\n[rendered markdown]");
    console.log(p.rendered_markdown.split("\n").map((l) => "  " + l).join("\n"));

    // Quality checks
    const why = p.why_this_applies.toLowerCase();
    const bridge = (p.bridge_sentence ?? "").toLowerCase();
    const state = classification.detected_state.replace(/-/g, " ").toLowerCase();
    const stateNoSpaces = classification.detected_state.toLowerCase();
    const score: Score = {
      attribution_complete: p.attribution.split(",").length >= 3,
      excerpt_nonempty: p.excerpt.length > 20,
      why_present: p.why_this_applies.length > 0,
      no_banned_in_why: !BANNED_PHRASES.some((b) => why.includes(b)),
      no_banned_in_bridge: !BANNED_PHRASES.some((b) => bridge.includes(b)),
      state_not_named:
        !why.includes(state) && !why.includes(stateNoSpaces),
      why_length_ok: p.why_this_applies.split(/\s+/).length <= 40,
      media_resolved: p.media.display_mode !== "unknown",
    };

    console.log("\n[checks]");
    for (const [k, v] of Object.entries(score)) {
      console.log(`  ${v ? "✓" : "✗"}  ${k}`);
    }

    const allOk = Object.values(score).every(Boolean);
    console.log(`\n[verdict] ${allOk ? "PASS" : "FAIL"}`);
    if (allOk) pass++;
    else fail++;
  }

  header("Summary");
  console.log(`Passed: ${pass}/${CASES.length}`);
  console.log(`Failed: ${fail}/${CASES.length}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
