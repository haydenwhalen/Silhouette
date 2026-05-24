import "dotenv/config";
import { loadSIODocuments } from "../src/rag/sioLoader";
import { getOrCreateVectorStore, scoredSearch } from "../src/rag/vectorStore";
import { classifyState, shouldApplyStateFilter } from "../src/agent/stateClassifier";
import type { MvpState } from "../src/rag/retrievalConfig";

interface Case {
  id: string;
  query: string;
  expected_state: MvpState | "ambiguous";
  expected_winner_id: string | null; // single canonical winner; null if multiple acceptable
  acceptable_winner_ids: string[]; // any of these count as a pass
  resonance_signal?: string;
  reason: string;
  category: "primary" | "resonance-discriminator" | "ambiguous";
}

const CASES: Case[] = [
  // ---- Direction Collapse ----
  {
    id: "dc-1-post-achievement",
    query:
      "I got the promotion I'd been working toward for two years. Champagne, dinner with family, all of it. And I just feel empty. I don't know what comes next.",
    expected_state: "direction-collapse",
    expected_winner_id: "sio-mcconaughey-go-to-zero-2020",
    acceptable_winner_ids: ["sio-mcconaughey-go-to-zero-2020"],
    resonance_signal:
      "personal-narrative; named milestone; emotional language → story/vulnerable",
    reason:
      "Post-achievement variant with specific milestone — McConaughey's story is the canonical match.",
    category: "primary",
  },
  {
    id: "dc-2-analytical-introspection",
    query:
      "I've spent the last six months trying to figure out what I actually want to do with my career. I've journaled, taken assessments, talked to people. I'm no closer to an answer than when I started.",
    expected_state: "direction-collapse",
    expected_winner_id: "sio-newport-skill-not-passion-2012",
    acceptable_winner_ids: [
      "sio-newport-skill-not-passion-2012",
      "sio-manson-no-singular-calling-2016",
    ],
    resonance_signal: "analytical posture; introspection failing → reframe/intellectual",
    reason:
      "User has been introspecting without result — Newport's reframe ('passion follows skill, stop searching inward') is the canonical move. Manson's permission is acceptable.",
    category: "primary",
  },
  {
    id: "dc-3-shame-about-not-knowing",
    query:
      "Everyone around me seems to know what they're doing with their life. I'm 28 and I still feel like I don't have a thing. Something must be wrong with me.",
    expected_state: "direction-collapse",
    expected_winner_id: "sio-manson-no-singular-calling-2016",
    acceptable_winner_ids: [
      "sio-manson-no-singular-calling-2016",
      "sio-newport-skill-not-passion-2012",
    ],
    resonance_signal: "shame/self-criticism → permission",
    reason:
      "Self-criticism layer is dominant — Manson's permission ('the question itself is wrong, the absence of a calling is normal') addresses it directly. Newport is acceptable but less targeted to the shame.",
    category: "resonance-discriminator",
  },

  // ---- Engagement Drought ----
  {
    id: "ed-1-mechanism-curious",
    query:
      "I used to love my job. The same work that used to energize me now just feels flat. I can do it, I just don't care anymore. Why does this happen?",
    expected_state: "engagement-drought",
    expected_winner_id: "sio-huberman-dopamine-baseline-2021",
    acceptable_winner_ids: ["sio-huberman-dopamine-baseline-2021"],
    resonance_signal:
      "explicit 'why does this happen' → mechanism/expert (default profile match)",
    reason: "User explicitly asks for a mechanism — Huberman's dopamine baseline is canonical.",
    category: "primary",
  },
  {
    id: "ed-2-naming-the-experience",
    query:
      "I'm not depressed. I want to be clear about that. It's something more like... static. The hours pass. I'm functional. But something about how I used to engage with things isn't there.",
    expected_state: "engagement-drought",
    expected_winner_id: "sio-grant-languishing-2021",
    acceptable_winner_ids: [
      "sio-grant-languishing-2021",
      "sio-brown-numbing-not-failing-2021",
    ],
    resonance_signal:
      "user is searching for the right name; analytical register → story/intellectual (Grant) or permission/warm (Brown)",
    reason:
      "User is reaching for a precise word — Grant's introduction of 'languishing' is the canonical naming intervention.",
    category: "resonance-discriminator",
  },
  {
    id: "ed-3-self-criticism-about-flatness",
    query:
      "I should still care about my work. I used to be the one who stayed late, the one who cared. Now I feel almost nothing about it and I'm furious with myself for being so checked out.",
    expected_state: "engagement-drought",
    expected_winner_id: "sio-brown-numbing-not-failing-2021",
    acceptable_winner_ids: [
      "sio-brown-numbing-not-failing-2021",
      "sio-huberman-dopamine-baseline-2021",
    ],
    resonance_signal:
      "self-criticism + flatness → permission/warm (Brown) over mechanism (Huberman)",
    reason:
      "Self-criticism is the dominant layer; Brown's permission/warm reframe is the right response over Huberman's clinical mechanism. Huberman is acceptable.",
    category: "resonance-discriminator",
  },

  // ---- Inaction Loop ----
  {
    id: "il-1-identity-level",
    query:
      "I know what I need to do. I've known for two years. I'm so tired of having the same conversation with myself. I just don't actually do anything.",
    expected_state: "inaction-loop",
    expected_winner_id: "sio-goggins-identity-of-inaction-2023",
    acceptable_winner_ids: ["sio-goggins-identity-of-inaction-2023"],
    resonance_signal:
      "two-year duration + self-frustration → story/direct (Goggins — default profile)",
    reason:
      "Long duration + active self-frustration is canonical Goggins territory. Default profile reinforces.",
    category: "primary",
  },
  {
    id: "il-2-reframe-seeking",
    query:
      "I read all the productivity books. I have the planners. I understand the frameworks. But something keeps stopping me from actually doing the work that matters most to me, and calling it laziness doesn't feel right anymore.",
    expected_state: "inaction-loop",
    expected_winner_id: "sio-pressfield-resistance-2015",
    acceptable_winner_ids: [
      "sio-pressfield-resistance-2015",
      "sio-goggins-identity-of-inaction-2023",
    ],
    resonance_signal:
      "intellectual posture, rejecting 'laziness' → reframe/intellectual (Pressfield's Resistance)",
    reason:
      "User has rejected easy explanations and wants a better frame — Pressfield's 'Resistance' reframe is the canonical move. Goggins is acceptable but less aligned with the rejection of self-blame.",
    category: "resonance-discriminator",
  },
  {
    id: "il-3-mechanism-action",
    query:
      "The pattern is the same every time. I think about doing it. Then I think of a reason not to. Then I find myself doing something else. By the time I notice, the moment's gone.",
    expected_state: "inaction-loop",
    expected_winner_id: "sio-robbins-5-second-rule-2011",
    acceptable_winner_ids: [
      "sio-robbins-5-second-rule-2011",
      "sio-pressfield-resistance-2015",
    ],
    resonance_signal:
      "describes a timing/mechanism pattern → mechanism/direct (Robbins)",
    reason:
      "User describes the timing pattern explicitly — Robbins' window/rationalization mechanism is the canonical mechanism-level answer.",
    category: "resonance-discriminator",
  },

  // ---- Cross-state and ambiguous ----
  {
    id: "ambiguous-sparse",
    query: "I just feel stuck and off lately.",
    expected_state: "ambiguous",
    expected_winner_id: null,
    acceptable_winner_ids: [],
    reason:
      "Sparse input — classifier should return unknown/low confidence and not force a state.",
    category: "ambiguous",
  },
  {
    id: "boundary-dc-vs-ed",
    query:
      "I have the job I always said I wanted, and I should be excited but I'm flat about all of it. Is the problem the job, or is it me?",
    expected_state: "engagement-drought",
    expected_winner_id: null,
    acceptable_winner_ids: [
      "sio-huberman-dopamine-baseline-2021",
      "sio-grant-languishing-2021",
      "sio-brown-numbing-not-failing-2021",
      "sio-mcconaughey-go-to-zero-2020",
    ],
    reason:
      "Boundary case — could be Engagement Drought (target exists, feeling gone) or post-achievement Direction Collapse. Any state-coherent SIO from either side is acceptable; the test is that the system doesn't return an Inaction Loop SIO.",
    category: "resonance-discriminator",
  },
];

interface RowReport {
  case_id: string;
  category: Case["category"];
  expected_state: string;
  detected_state: string;
  confidence: string;
  state_passed: boolean;
  top_3: Array<{
    id: string;
    semantic: number;
    final: number;
    label: string;
    boosts: number;
  }>;
  winner_id: string | null;
  winner_state: string | null;
  expected_winner: string | null;
  pass: boolean;
  fail_reason: string | null;
}

function header(s: string) {
  console.log("\n" + "=".repeat(80));
  console.log(s);
  console.log("=".repeat(80));
}

async function main() {
  header("Phase 4 Retrieval Calibration");

  const docs = await loadSIODocuments();
  console.log(`Loaded ${docs.length} SIOs.`);
  await getOrCreateVectorStore(docs);

  const rows: RowReport[] = [];

  for (const c of CASES) {
    header(`Case ${c.id}`);
    console.log(`Query: ${c.query}`);
    console.log(`Expected state: ${c.expected_state}`);
    if (c.resonance_signal) console.log(`Resonance signal: ${c.resonance_signal}`);
    console.log(`Expected winner: ${c.expected_winner_id ?? "(any acceptable)"}`);

    const classification = await classifyState(c.query);
    const apply = shouldApplyStateFilter(classification);
    const stateForRetrieval = apply
      ? (classification.detected_state as MvpState)
      : undefined;

    console.log(
      `\n[classification] ${classification.detected_state} (${classification.state_confidence}) — ` +
        `${apply ? "applying state filter" : "broad search (no state filter)"}`
    );
    if (apply) {
      console.log(
        `[intake hints] insight_type=${classification.inferred_resonance_insight_type ?? "(none)"}, ` +
          `voice_register=${classification.inferred_resonance_voice_register ?? "(none)"}, ` +
          `variant=${classification.direction_collapse_variant ?? "(none)"}`
      );
    }

    const result = await scoredSearch({
      query: c.query,
      state: stateForRetrieval,
      k: 3,
      intakeHint: apply
        ? {
            insight_type: classification.inferred_resonance_insight_type,
            voice_register: classification.inferred_resonance_voice_register,
            direction_collapse_variant: classification.direction_collapse_variant,
          }
        : null,
    });

    if (result.resonance_profile_used) {
      console.log(
        `[resonance default] insight_type=${result.resonance_profile_used.insight_type}, voice_register=${result.resonance_profile_used.voice_register}`
      );
    }

    console.log("\n[top 3 candidates]");
    result.candidates.forEach((cand, i) => {
      const m = cand.doc.metadata;
      console.log(
        `  ${i + 1}. ${m.insight_id} [state=${m.primary_state_tag}, type=${m.insight_type}, reg=${m.voice_register}]`
      );
      console.log(
        `     semantic=${cand.semantic_score.toFixed(3)} → final=${cand.final_score.toFixed(3)} (${cand.label})`
      );
      if (cand.boosts.length) {
        console.log(
          `     boosts: ${cand.boosts.map((b) => `+${b.amount.toFixed(2)} ${b.reason}`).join("; ")}`
        );
      }
    });

    const winner = result.candidates[0];
    const winnerId = winner ? String(winner.doc.metadata.insight_id) : null;
    const winnerState = winner ? String(winner.doc.metadata.primary_state_tag) : null;

    let pass = false;
    let failReason: string | null = null;

    if (c.category === "ambiguous") {
      // Pass condition: classifier marks unknown/low and does NOT apply state filter.
      pass = classification.detected_state === "unknown" || !apply;
      if (!pass) {
        failReason = `Sparse input forced into state ${classification.detected_state} at ${classification.state_confidence} confidence.`;
      }
    } else if (c.expected_state !== "ambiguous") {
      const stateMatch = classification.detected_state === c.expected_state;
      const winnerOk = winnerId
        ? c.acceptable_winner_ids.length === 0
          ? false
          : c.acceptable_winner_ids.includes(winnerId)
        : false;
      // For boundary cases where acceptable_winner_ids is populated but expected_winner_id is null,
      // we only require the winner to be in the acceptable set (state may diverge per case design).
      if (c.expected_winner_id === null && c.acceptable_winner_ids.length > 0) {
        pass = winnerOk;
        if (!pass) {
          failReason = `Winner ${winnerId} not in acceptable set: ${c.acceptable_winner_ids.join(", ")}`;
        }
      } else {
        pass = stateMatch && winnerOk;
        if (!stateMatch) {
          failReason = `Detected ${classification.detected_state}, expected ${c.expected_state}.`;
        } else if (!winnerOk) {
          failReason = `Winner ${winnerId} not in acceptable set: ${c.acceptable_winner_ids.join(", ")}.`;
        }
      }
    }

    console.log(`\n[verdict] ${pass ? "PASS" : "FAIL"}${failReason ? ` — ${failReason}` : ""}`);

    rows.push({
      case_id: c.id,
      category: c.category,
      expected_state: c.expected_state,
      detected_state: classification.detected_state,
      confidence: classification.state_confidence,
      state_passed: apply,
      top_3: result.candidates.map((cand) => ({
        id: String(cand.doc.metadata.insight_id),
        semantic: Number(cand.semantic_score.toFixed(3)),
        final: Number(cand.final_score.toFixed(3)),
        label: cand.label,
        boosts: Number(cand.applied_boost_total.toFixed(3)),
      })),
      winner_id: winnerId,
      winner_state: winnerState,
      expected_winner: c.expected_winner_id,
      pass,
      fail_reason: failReason,
    });
  }

  header("Summary");
  console.log(
    [
      "case".padEnd(28),
      "expected".padEnd(20),
      "detected".padEnd(22),
      "winner".padEnd(42),
      "verdict",
    ].join(" | ")
  );
  console.log("-".repeat(128));
  for (const r of rows) {
    console.log(
      [
        r.case_id.padEnd(28),
        r.expected_state.padEnd(20),
        `${r.detected_state} (${r.confidence})`.padEnd(22),
        (r.winner_id ?? "-").padEnd(42),
        r.pass ? "PASS" : `FAIL — ${r.fail_reason}`,
      ].join(" | ")
    );
  }

  const pass = rows.filter((r) => r.pass).length;
  const passRate = pass / rows.length;
  console.log(
    `\nPass rate: ${pass}/${rows.length} = ${(passRate * 100).toFixed(0)}%`
  );
  console.log(`Phase 4 target: ≥70%`);
  console.log(passRate >= 0.7 ? "✓ Target met" : "✗ Below target");
  process.exit(passRate >= 0.7 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
