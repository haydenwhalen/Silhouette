/**
 * auto-commit-expansion.mjs
 * Watches the +10-per-state SIO expansion and commits each state the moment it
 * reaches its target count, with the files verified complete. One commit per state.
 *
 * - Commits ONLY that state's new SIO files + their referenced source JSONs.
 * - Stability + completeness checks avoid committing half-written files.
 * - Order-agnostic: commits whichever state finishes first.
 * - Local commits only (no push). Safe to run alongside the building CLI.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/haydenwhalen/Desktop/Silhouette";
process.chdir(ROOT);
const SIOS = path.join(ROOT, "corpus/sios");

const targets = {
  identity_transition: 18,
  engagement_drought: 20,
  inaction_loop: 20,
  direction_collapse: 20,
};
const done = {};

const sh = (cmd) => execSync(cmd, { encoding: "utf8" });
const log = (m) => console.log(`${new Date().toISOString()} ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const countState = (prefix) =>
  fs.readdirSync(SIOS).filter((f) => f.startsWith(prefix + "_") && f.endsWith(".md")).length;

function untrackedSios(prefix) {
  const out = sh(`git ls-files --others --exclude-standard "corpus/sios/${prefix}_*.md"`).trim();
  return out ? out.split("\n").filter(Boolean) : [];
}
function fileComplete(f) {
  const t = fs.readFileSync(path.join(ROOT, f), "utf8");
  const dashes = (t.match(/^---\s*$/gm) || []).length; // open + close of frontmatter
  return dashes >= 2 && t.length > 300;
}
function sourceIdOf(f) {
  const t = fs.readFileSync(path.join(ROOT, f), "utf8");
  const m = t.match(/^source_id:\s*["']?([^"'\n]+)["']?\s*$/m);
  return m ? m[1].trim() : null;
}

log("WATCH start — watching: " + Object.keys(targets).join(", "));
let loops = 0;
const MAX = 900; // ~ up to several hours at the poll cadence below

while (Object.keys(done).length < Object.keys(targets).length) {
  if (++loops > MAX) {
    log("WATCH timeout");
    break;
  }
  for (const [state, tgt] of Object.entries(targets)) {
    if (done[state]) continue;
    const cnt = countState(state);
    if (cnt < tgt) continue;

    await sleep(8000); // stability: let any in-flight writes settle
    if (countState(state) !== cnt) continue; // still changing — re-check next loop

    const sios = untrackedSios(state);
    if (sios.length === 0) {
      done[state] = 1;
      continue;
    }

    let ok = true;
    const srcs = new Set();
    for (const f of sios) {
      if (!fileComplete(f)) {
        ok = false;
        break;
      }
      const sid = sourceIdOf(f);
      if (sid) {
        const sp = `corpus/sources/${sid}.json`;
        if (fs.existsSync(path.join(ROOT, sp))) srcs.add(sp);
        else {
          ok = false; // referenced source not written yet
          break;
        }
      }
    }
    if (!ok) continue;

    try {
      const files = [...sios, ...srcs].map((x) => `"${x}"`).join(" ");
      sh(`git add ${files}`);
      const pretty = state.replace(/_/g, "-");
      sh(`git commit -q -m "Corpus expansion: ${pretty} -> ${tgt} (+${sios.length} verified SIOs)"`);
      log(`COMMITTED ${pretty} (${sios.length} SIOs, ${srcs.size} sources)`);
      done[state] = 1;
    } catch (e) {
      log(`COMMIT_ERROR ${state}: ${String(e?.message || e).split("\n")[0]} (will retry)`);
    }
  }
  await sleep(20000);
}
log(`WATCH done: committed ${Object.keys(done).length} of ${Object.keys(targets).length} states`);
