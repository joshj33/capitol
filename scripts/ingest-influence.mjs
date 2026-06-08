// Capitol — Influence ingestion (real data, no API key required).
//
// Fetches daily Wikipedia pageviews for every figure in src/lib/figures.json,
// buckets them into the season's weeks, normalizes each week into Influence
// points via a z-score across the figure pool, and writes src/lib/pageviews.json.
//
// This is a runnable prototype of the production ETL pipeline. In production the
// same shape would run on a schedule (Vercel Cron / GitHub Actions) and write to
// the `events` table instead of a JSON file.
//
// Usage:  npm run ingest

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIGURES_PATH = join(ROOT, "src/lib/figures.json");
const OUT_PATH = join(ROOT, "src/lib/pageviews.json");

// Season calendar — must match ISO() in src/lib/seed.ts.
const WEEK1_START = Date.UTC(2026, 2, 2); // 2026-03-02 (months are 0-indexed)
const WEEKS = 4;
const DAY_MS = 86_400_000;

const UA =
  "CapitolFantasy/0.1 (educational fantasy-politics project; jonathansimone37@gmail.com)";

const ymd = (ms) => {
  const d = new Date(ms);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
};

const START = ymd(WEEK1_START);
const END = ymd(WEEK1_START + (WEEKS * 7 - 1) * DAY_MS);

const titleFor = (f) => (f.wikiTitle ?? f.name).replace(/ /g, "_");

async function fetchDaily(title) {
  const url =
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/` +
    `en.wikipedia/all-access/all-agents/${encodeURIComponent(title)}/daily/${START}/${END}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const json = await res.json();
  return Array.isArray(json.items) ? json.items : null;
}

/** Map an API item (timestamp "YYYYMMDD00") to a 1-based season week, or 0. */
function weekOf(timestamp) {
  const y = +timestamp.slice(0, 4);
  const m = +timestamp.slice(4, 6) - 1;
  const d = +timestamp.slice(6, 8);
  const dayIndex = Math.floor((Date.UTC(y, m, d) - WEEK1_START) / DAY_MS);
  if (dayIndex < 0 || dayIndex >= WEEKS * 7) return 0;
  return Math.floor(dayIndex / 7) + 1;
}

async function main() {
  const figures = JSON.parse(readFileSync(FIGURES_PATH, "utf8"));
  console.log(`Fetching Wikipedia pageviews ${START}–${END} for ${figures.length} figures…\n`);

  // weeklyViews[figureId][week] = total views
  const weeklyViews = {};
  let resolved = 0;

  for (const f of figures) {
    const items = await fetchDaily(titleFor(f));
    if (!items) {
      console.log(`  ✗ ${f.name.padEnd(28)} no data (will fall back to synthetic)`);
      continue;
    }
    const byWeek = {};
    for (const it of items) {
      const w = weekOf(it.timestamp);
      if (w >= 1) byWeek[w] = (byWeek[w] ?? 0) + it.views;
    }
    weeklyViews[f.id] = byWeek;
    resolved++;
    const total = Object.values(byWeek).reduce((a, b) => a + b, 0);
    console.log(`  ✓ ${f.name.padEnd(28)} ${total.toLocaleString()} views`);
    await new Promise((r) => setTimeout(r, 80)); // be polite to the API
  }

  // Normalize each week into Influence points via a z-score of ln(views) across
  // the pool, scaled to a points band (mirrors the published methodology).
  const data = {};
  for (let w = 1; w <= WEEKS; w++) {
    const entries = Object.entries(weeklyViews)
      .map(([id, byWeek]) => [id, byWeek[w] ?? 0])
      .filter(([, v]) => v > 0);
    if (entries.length === 0) continue;

    const logs = entries.map(([, v]) => Math.log(v + 1));
    const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
    const variance = logs.reduce((a, x) => a + (x - mean) ** 2, 0) / logs.length;
    const std = Math.sqrt(variance) || 1;

    for (const [id, views] of entries) {
      const z = (Math.log(views + 1) - mean) / std;
      const points = Math.max(1, Math.round((14 + z * 7) * 10) / 10);
      (data[id] ??= {})[w] = { views, points };
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: "Wikipedia Pageviews API (en.wikipedia, all-access, all-agents)",
    range: { start: START, end: END },
    weeks: WEEKS,
    figuresResolved: resolved,
    figuresTotal: figures.length,
    data,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `\nWrote ${OUT_PATH}\nResolved ${resolved}/${figures.length} figures with real pageview data.`,
  );
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
