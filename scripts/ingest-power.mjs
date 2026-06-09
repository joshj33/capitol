// Capitol — Power ingestion from the official Congress.gov API.
//
// For every figure with a bioguideId (see scripts/enrich-bioguide.mjs), fetches
// real sponsored + cosponsored legislation, keeps the items introduced within
// the season window, buckets them into weeks, and writes src/lib/power.json as
// real Power events (sponsor +3, cosponsor +1, passed-chamber +8, enacted +20).
// The app reads that file automatically and falls back to synthetic Power for
// any figure not ingested (e.g. governors, or members without a bioguide).
//
// Requires a FREE Congress.gov API key (instant signup, no cost):
//   https://api.congress.gov/sign-up/
// Then either:  set CONGRESS_API_KEY=...   or put it in .env.local
//
// Usage:  npm run ingest:power

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIGURES_PATH = join(ROOT, "src/lib/figures.json");
const OUT_PATH = join(ROOT, "src/lib/power.json");

// Season calendar — must match ISO() in src/lib/seed.ts.
const WEEK1_START = Date.UTC(2026, 2, 2); // 2026-03-02
const WEEKS = 4;
const DAY_MS = 86_400_000;
const RANGE_START = WEEK1_START;
const RANGE_END = WEEK1_START + (WEEKS * 7 - 1) * DAY_MS;

const BASE = "https://api.congress.gov/v3";
const UA = "CapitolFantasy/0.1 (educational project; jonathansimone37@gmail.com)";

function readKey() {
  if (process.env.CONGRESS_API_KEY) return process.env.CONGRESS_API_KEY.trim();
  const envFile = join(ROOT, ".env.local");
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, "utf8").match(/^\s*CONGRESS_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return null;
}

const KEY = readKey();
if (!KEY) {
  console.error(
    [
      "",
      "  No Congress.gov API key found.",
      "",
      "  1. Get a free key (instant): https://api.congress.gov/sign-up/",
      "  2. Add it to .env.local:      CONGRESS_API_KEY=your_key_here",
      "     (or set the CONGRESS_API_KEY environment variable)",
      "  3. Re-run:                    npm run ingest:power",
      "",
      "  The app runs fine without this — Power just stays synthetic until you do.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const weekOf = (isoDate) => {
  if (!isoDate) return 0;
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y) return 0;
  const t = Date.UTC(y, m - 1, d);
  if (t < RANGE_START || t > RANGE_END) return 0;
  return Math.floor((t - WEEK1_START) / DAY_MS / 7) + 1;
};

// Public congress.gov URL for a bill (best effort).
const TYPE_LONG = {
  hr: "house-bill", s: "senate-bill",
  hjres: "house-joint-resolution", sjres: "senate-joint-resolution",
  hconres: "house-concurrent-resolution", sconres: "senate-concurrent-resolution",
  hres: "house-resolution", sres: "senate-resolution",
};
const billUrl = (it) => {
  const t = TYPE_LONG[(it.type || "").toLowerCase()];
  if (!t || !it.congress || !it.number) return "https://www.congress.gov";
  return `https://www.congress.gov/bill/${it.congress}th-congress/${t}/${it.number}`;
};

async function fetchList(bioguide, kind) {
  const url = `${BASE}/member/${bioguide}/${kind}?format=json&limit=250&api_key=${KEY}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.warn(`    ! ${kind} HTTP ${res.status} for ${bioguide}`);
    return [];
  }
  const json = await res.json();
  return json.sponsoredLegislation || json.cosponsoredLegislation || [];
}

function classify(it, isSponsor) {
  const action = (it.latestAction?.text || "").toLowerCase();
  const actionWeek = weekOf(it.latestAction?.actionDate || "");
  // Passage / enactment scored in the week the action occurred.
  if (actionWeek >= 1 && /became public law|enacted/.test(action))
    return { type: "enacted", basePoints: 20, week: actionWeek, label: "Enacted into law" };
  if (actionWeek >= 1 && /passed|agreed to in/.test(action) && isSponsor)
    return { type: "bill_passed_chamber", basePoints: 8, week: actionWeek, label: "Passed its chamber" };
  // Otherwise score the introduction (sponsor/cosponsor) in its introduced week.
  const introWeek = weekOf(it.introducedDate || "");
  if (introWeek >= 1)
    return isSponsor
      ? { type: "sponsor", basePoints: 3, week: introWeek, label: "Sponsored a bill" }
      : { type: "cosponsor", basePoints: 1, week: introWeek, label: "Co-sponsored a bill" };
  return null;
}

async function main() {
  const figures = JSON.parse(readFileSync(FIGURES_PATH, "utf8"));
  const members = figures.filter((f) => f.bioguideId);
  console.log(`Fetching Congress.gov legislation for ${members.length} members…\n`);

  const data = {};
  const ingested = [];

  for (const f of members) {
    const events = {};
    let count = 0;
    for (const [kind, isSponsor] of [
      ["sponsored-legislation", true],
      ["cosponsored-legislation", false],
    ]) {
      const items = await fetchList(f.bioguideId, kind);
      for (const it of items) {
        const c = classify(it, isSponsor);
        if (!c) continue;
        const bucket = (events[c.week] ??= { points: 0, events: [] });
        bucket.points = Math.round((bucket.points + c.basePoints) * 10) / 10;
        bucket.events.push({
          type: c.type,
          basePoints: c.basePoints,
          description: `${c.label}: ${it.type} ${it.number} — ${(it.title || "").slice(0, 90)}`,
          url: billUrl(it),
        });
        count++;
      }
      await new Promise((r) => setTimeout(r, 120)); // be polite
    }
    data[f.id] = events;
    ingested.push(f.id);
    const total = Object.values(events).reduce((a, b) => a + b.points, 0);
    console.log(`  ✓ ${f.name.padEnd(28)} ${count} actions, ${Math.round(total)} pts`);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: "Congress.gov API v3 (sponsored + cosponsored legislation)",
    range: { start: "2026-03-02", end: "2026-03-29" },
    weeks: WEEKS,
    figuresIngested: ingested,
    data,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${OUT_PATH} (${ingested.length} members).`);
}

main().catch((err) => {
  console.error("Power ingestion failed:", err);
  process.exit(1);
});
