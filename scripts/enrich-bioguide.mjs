// Capitol — one-time enrichment: attach real bioguide IDs to figures.
//
// Pulls the public unitedstates/congress-legislators dataset (no API key) and
// matches each seeded senator/representative by last name + state, writing the
// canonical `bioguideId` into src/lib/figures.json. Bioguide IDs are the keys
// used by the Congress.gov API (see scripts/ingest-power.mjs).
//
// Usage:  node scripts/enrich-bioguide.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIGURES_PATH = join(ROOT, "src/lib/figures.json");

const SRC =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml";

const lastName = (name) => name.trim().split(/\s+/).pop();
// Case-insensitive key. Uses the full surname (e.g. "De La Cruz") so it never
// collides with a different member who merely shares the trailing token ("Cruz").
const key = (last, state) => `${last.toLowerCase()}|${state.toUpperCase()}`;

async function main() {
  const figures = JSON.parse(readFileSync(FIGURES_PATH, "utf8"));

  console.log("Fetching current legislators…");
  const res = await fetch(SRC, {
    headers: { "User-Agent": "CapitolFantasy/0.1 (educational project)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch legislators: HTTP ${res.status}`);
  const legislators = yaml.load(await res.text());

  // Index by (surname, state) using each legislator's most recent term. We index
  // on the canonical `name.last` field (not a trailing-token guess) so distinct
  // members like "Cruz" and "De La Cruz" in the same state never collide.
  const index = new Map();
  for (const l of legislators) {
    const term = l.terms?.[l.terms.length - 1];
    if (!term?.state) continue;
    const k = key(l.name.last, term.state);
    if (index.has(k)) console.warn(`  ! ambiguous key ${k} (${l.name.official_full})`);
    index.set(k, l.id.bioguide);
  }

  let matched = 0;
  const unmatched = [];
  for (const f of figures) {
    if (f.office !== "senator" && f.office !== "representative") continue;
    const bioguide = index.get(key(lastName(f.name), f.state));
    if (bioguide) {
      f.bioguideId = bioguide;
      matched++;
      console.log(`  ✓ ${f.name.padEnd(28)} ${bioguide}`);
    } else {
      unmatched.push(f.name);
      console.log(`  ✗ ${f.name.padEnd(28)} no match (${f.state})`);
    }
  }

  writeFileSync(FIGURES_PATH, JSON.stringify(figures, null, 2) + "\n");
  console.log(`\nMatched ${matched} legislators. Wrote ${FIGURES_PATH}.`);
  if (unmatched.length) {
    console.log(`Unmatched (will fall back to synthetic Power): ${unmatched.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
