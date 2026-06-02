/**
 * test-sog-batch-retrieval.ts — Targeted smoke test for the 6 new SoG SIOs.
 *
 * For each, sends a query specifically tailored to the SIO's distinct angle
 * and reports whether the new SoG SIO wins, places, or is absent.
 *
 * Reports rank, score, and the actual winner. Honest: surfacing is the test;
 * this does NOT prove the SIO is the *best* answer — only that it's competitive
 * on its intended angle.
 */

import "dotenv/config";
import { loadSIODocuments } from "../src/rag/sioLoader";
import {
  getOrCreateVectorStore,
  scoredSearch,
} from "../src/rag/vectorStore";

interface Case {
  state:
    | "inaction-loop"
    | "engagement-drought"
    | "direction-collapse"
    | "possibility-paralysis"
    | "identity-transition"
    | "momentum-gap";
  query: string;
  target_sio: string;
  why: string;
}

const CASES: Case[] = [
  {
    state: "inaction-loop",
    query: "I have the discipline language down — I keep saying I'll start when I feel ready and I never do. The next decision is the thing I keep deferring.",
    target_sio: "sio-mylett-power-of-one-2022",
    why: "Mylett's 'next hour / one more' angle on inaction.",
  },
  {
    state: "engagement-drought",
    query: "I think I shut down emotionally over the last year and now nothing excites me. I'm not depressed, I'm just numb — and the good stuff is muted too.",
    target_sio: "sio-brown-numbness-as-disconnection-2017",
    why: "Brown's 'you can't selectively numb' mechanism.",
  },
  {
    state: "direction-collapse",
    query: "I hit the milestone I'd been working toward for years and instead of joy I feel hollow. Happiness was supposed to be at the finish line.",
    target_sio: "sio-mcconaughey-greenlights-direction-sog-2020",
    why: "McConaughey's happiness vs joy reframe.",
  },
  {
    state: "possibility-paralysis",
    query: "I've been sitting with three career paths for months. I keep researching and not committing — and I feel like I'm doing something wrong by not deciding.",
    target_sio: "sio-grant-procrastinate-then-commit-sog-2021",
    why: "Grant's productive procrastination defense.",
  },
  {
    state: "identity-transition",
    query: "I retired from competitive sport last year. For twenty years training was who I was — the structure that organized everything is just gone.",
    target_sio: "sio-ohno-after-the-finish-line-2017",
    why: "Ohno's post-Olympic structure-dissolved story.",
  },
  {
    state: "momentum-gap",
    query: "I had a great writing routine and missed two days last week. Now I keep telling myself the whole streak is shot — I can't shake the shame of the lapse.",
    target_sio: "sio-clear-never-miss-twice-sog-2023",
    why: "Clear's 'never miss twice' permission.",
  },
];

async function main() {
  const docs = await loadSIODocuments();
  await getOrCreateVectorStore(docs);

  console.log("=".repeat(72));
  console.log("SoG batch — targeted retrieval smoke");
  console.log("=".repeat(72));

  let landedAsWinner = 0;
  let inTop3 = 0;
  let absent = 0;

  for (const c of CASES) {
    const result = await scoredSearch({
      query: c.query,
      state: c.state,
      k: 5,
    });
    const results = result.candidates;
    const rankIdx = results.findIndex(
      (r) => String(r.doc.metadata.insight_id) === c.target_sio
    );
    const winner = results[0];
    const winnerId = String(winner?.doc.metadata.insight_id ?? "(none)");

    let verdict = "absent (not in top 5)";
    if (rankIdx === 0) {
      verdict = "WON";
      landedAsWinner += 1;
    } else if (rankIdx >= 0) {
      verdict = `placed (rank ${rankIdx + 1})`;
      inTop3 += 1;
    } else {
      absent += 1;
    }

    console.log(`\n[${c.state}] target: ${c.target_sio}`);
    console.log(`  query:   ${c.query.slice(0, 100)}...`);
    console.log(`  verdict: ${verdict}`);
    console.log(`  winner:  ${winnerId} (score ${winner?.final_score?.toFixed(3) ?? "n/a"})`);
    console.log(`  why:     ${c.why}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log(`Summary: ${landedAsWinner}/${CASES.length} won, ${inTop3}/${CASES.length} placed in top-5, ${absent}/${CASES.length} absent`);
  // No exit code on "didn't win" — surfacing is what we test here; quality
  // judgement is for the human reviewer.
  process.exit(0);
}

main().catch((e) => {
  console.error("test-sog-batch-retrieval error:", e);
  process.exit(1);
});
