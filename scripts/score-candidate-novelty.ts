/**
 * score-candidate-novelty.ts — Embedding-based dedup vs. existing SIO corpus
 *
 * Computes how novel a candidate is relative to the existing SIO corpus by
 * embedding the candidate text and measuring cosine similarity to all SIOs.
 * High max-similarity = low novelty. Flags duplicates, similar-but-useful, and novel.
 *
 * Usage:
 *   npx tsx scripts/score-candidate-novelty.ts <path/to/candidate.yaml>
 *   npx tsx scripts/score-candidate-novelty.ts <path> --no-write
 */

import "dotenv/config";
import {
  loadCandidateFromPath,
  saveCandidate,
  str,
  type Candidate,
} from "./lib/discovery";
import { loadSIODocuments } from "../src/rag/sioLoader";
import { getOrCreateVectorStore } from "../src/rag/vectorStore";

// ── Novelty thresholds (cosine similarity on text-embedding-3-small) ──────────
//
// Calibrated against Silhouette's SIO corpus (19 SIOs, observed range 0.40–0.77):
//   - MemoryVectorStore (@langchain/classic) .similaritySearchWithScore() returns
//     raw cosine similarity directly (0–1, higher = more similar). NOT L2 distance.
//   - Same speaker, same thesis (Newport dup → Newport SIO): ~0.765
//   - Related theme, different author: ~0.55–0.65
//   - Different state/speaker: ~0.40–0.55
//
// Thresholds (tuned to catch the Newport dup as similar_but_useful):
//   >= 0.85 → "duplicate"          (almost certainly re-stating an existing SIO)
//   >= 0.72 → "similar_but_useful" (overlapping territory; evaluate carefully)
//   <  0.72 → "novel"              (meaningfully distinct from corpus)

const DUPLICATE_THRESHOLD = 0.85;
const SIMILAR_THRESHOLD = 0.72;

// For the novelty_score (0–100), higher = more novel = lower max similarity.
// Formula: novelty_score = clamp(round((1 - maxSimilarity) * 100), 0, 100)
// So: similarity 0.95 → novelty 5; similarity 0.80 → novelty 20; similarity 0.50 → novelty 50.

function similarityToNoveltyScore(maxSimilarity: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - maxSimilarity) * 100)));
}

function noveltyRating(
  maxSimilarity: number
): "duplicate" | "similar_but_useful" | "novel" {
  if (maxSimilarity >= DUPLICATE_THRESHOLD) return "duplicate";
  if (maxSimilarity >= SIMILAR_THRESHOLD) return "similar_but_useful";
  return "novel";
}


// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const noWrite = args.includes("--no-write");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath) {
    console.error(
      "Usage: npx tsx scripts/score-candidate-novelty.ts <path/to/candidate.yaml> [--no-write]"
    );
    process.exit(1);
  }

  const candidate: Candidate = loadCandidateFromPath(filePath);
  const candidateId = str(candidate.candidate_id) || filePath;

  // Build query text
  const queryParts = [
    str(candidate.key_claim),
    str(candidate.candidate_moment_summary),
    str(candidate.transcript_excerpt),
  ].filter(Boolean);

  if (queryParts.length === 0) {
    console.error("Candidate has no key_claim, candidate_moment_summary, or transcript_excerpt.");
    process.exit(1);
  }

  const queryText = queryParts.join(". ");

  console.log(`\nScoring novelty for: ${candidateId}`);
  console.log(`Query text preview: ${queryText.slice(0, 120)}…\n`);

  // Load SIO corpus and build vector store
  console.log("Loading SIO corpus…");
  const docs = await loadSIODocuments();
  if (docs.length === 0) {
    console.error("No SIO documents loaded. Check corpus/sios/ directory.");
    process.exit(1);
  }
  console.log(`Loaded ${docs.length} SIOs.\n`);

  const vectorStore = await getOrCreateVectorStore(docs);

  // Similarity search (top 5)
  // MemoryVectorStore (@langchain/classic) .similaritySearchWithScore() returns
  // [Document, cosine_similarity] pairs — higher score = more similar.
  const k = 5;
  const rawResults = await vectorStore.similaritySearchWithScore(queryText, k);

  // MemoryVectorStore (@langchain/classic) returns raw cosine similarity (0–1, higher = more similar).
  const nearest = rawResults.map(([doc, similarity]) => ({
    insight_id: str(doc.metadata.insight_id) || str(doc.metadata.source_file),
    similarity,
    primary_state_tag: str(doc.metadata.primary_state_tag),
    insight_type: str(doc.metadata.insight_type),
    voice_register: str(doc.metadata.voice_register),
    key_claim_preview: str(doc.metadata.key_claim).slice(0, 80),
  }));

  const maxSimilarity = nearest.length > 0 ? nearest[0].similarity : 0;
  const noveltyScore = similarityToNoveltyScore(maxSimilarity);
  const rating = noveltyRating(maxSimilarity);

  // Gap-fit note: does this candidate fill a state/register the nearest neighbors don't cover?
  const candidateState = str(candidate.target_state);
  const candidateRegister = str(candidate.proposed_voice_register);
  const neighborStates = nearest.map((n) => n.primary_state_tag);
  const neighborRegisters = nearest.map((n) => n.voice_register);
  const stateGap = !neighborStates.includes(candidateState)
    ? `fills a state gap (${candidateState} not in top-${k} neighbors)`
    : `nearest neighbors share state (${candidateState})`;
  const registerGap = !neighborRegisters.includes(candidateRegister)
    ? `fills a register gap (${candidateRegister} not in top-${k} neighbors)`
    : `nearest neighbors share register (${candidateRegister})`;

  // ── Report ──────────────────────────────────────────────────────────────────

  console.log("═".repeat(70));
  console.log(`NOVELTY REPORT — ${candidateId}`);
  console.log("═".repeat(70));
  console.log(`\nNovelty score:  ${noveltyScore}/100  (higher = more novel)`);
  console.log(`Novelty rating: ${rating.toUpperCase()}`);
  console.log(`Max similarity: ${maxSimilarity.toFixed(4)} (threshold: dup≥${DUPLICATE_THRESHOLD}, similar≥${SIMILAR_THRESHOLD})\n`);

  console.log(`TOP ${k} NEAREST SIOs`);
  console.log("─".repeat(70));
  for (let i = 0; i < nearest.length; i++) {
    const n = nearest[i];
    console.log(
      `  #${i + 1}  ${n.insight_id.padEnd(44)} sim=${n.similarity.toFixed(4)}`
    );
    console.log(
      `       state=${n.primary_state_tag}  type=${n.insight_type}  register=${n.voice_register}`
    );
    console.log(`       "${n.key_claim_preview}…"`);
  }

  console.log(`\nGAP-FIT NOTE`);
  console.log("─".repeat(70));
  console.log(`  ${stateGap}`);
  console.log(`  ${registerGap}`);

  console.log(`\nRECOMMENDED ACTION`);
  console.log("─".repeat(70));
  if (rating === "duplicate") {
    console.log(
      `  MERGE OR REJECT — this candidate closely duplicates ${nearest[0]?.insight_id}.\n` +
        `  Before rejecting, check: does it offer a meaningfully better quote, source, or register?`
    );
  } else if (rating === "similar_but_useful") {
    console.log(
      `  EVALUATE CAREFULLY — overlaps with ${nearest[0]?.insight_id} (sim ${maxSimilarity.toFixed(3)}).\n` +
        `  Keep only if it offers a meaningfully different register, source, or emotional angle.`
    );
  } else {
    console.log(`  KEEP — candidate is novel vs. the existing corpus. Proceed with full evaluation.`);
  }
  console.log("═".repeat(70));

  // ── JSON output ─────────────────────────────────────────────────────────────

  const noveltyNearest = nearest.map(({ insight_id, similarity }) => ({ insight_id, similarity }));

  const jsonOutput = {
    candidate_id: candidateId,
    novelty_score: noveltyScore,
    novelty_rating: rating,
    max_similarity: maxSimilarity,
    top_nearest: nearest.map((n) => ({
      insight_id: n.insight_id,
      similarity: n.similarity,
      state: n.primary_state_tag,
      type: n.insight_type,
      register: n.voice_register,
    })),
    gap_fit: { state: stateGap, register: registerGap },
  };

  console.log("\nJSON:\n" + JSON.stringify(jsonOutput, null, 2));

  // ── Write back ──────────────────────────────────────────────────────────────

  if (!noWrite) {
    candidate.novelty_score = noveltyScore;
    candidate.novelty_nearest = noveltyNearest;
    candidate.novelty_rating = rating;
    saveCandidate(filePath, candidate);
    console.log(`\nNovelty scores written to: ${filePath}`);
  } else {
    console.log("\n--no-write: scores NOT persisted.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
