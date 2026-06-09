# 🏛️ Capitol — Fantasy Politics

**Draft Congress. Score the news.** Capitol is a fantasy-sports-style web app where
you draft real politicians and public figures instead of athletes, then earn points
from **measurable, third-party-sourced events** — bills passed, news coverage,
fact-checks, viral moments. It is **politically neutral by design**: every scoring
rule is sourced, published, and applied identically to all figures regardless of party.

> This is the **V1 MVP**. It runs entirely on seeded data so you can click through the
> whole product locally with no accounts or API keys. The data layer is isolated behind
> `src/lib/data.ts` so it can be swapped for Supabase without touching the UI.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Real data: the Influence pipeline

The **Influence** category is powered by **real public-attention data**, not mock
numbers. A runnable prototype of the production ETL pipeline lives in
`scripts/ingest-influence.mjs`:

```bash
npm run ingest      # no API key required
```

It fetches daily **Wikipedia pageviews** (the free, no-key Wikimedia REST API) for
every figure in `src/lib/figures.json`, buckets them into the season's weeks,
normalizes each week into Influence points via a **z-score across the figure pool**
(exactly as described on the Methodology page), and writes `src/lib/pageviews.json`.
The app reads that file automatically; figure profiles then show real view counts
linked to each Wikipedia article. If a figure or week can't be resolved, the app
falls back to a synthetic value so the board is never empty.

> **Data-quality note:** Wikipedia counts pageviews per *exact* title, and redirects
> are counted separately. A figure whose readers mostly arrive via a redirect (e.g.
> the Speaker's canonical article title vs. the common name) can under-count. The
> production pipeline should resolve canonical titles + sum redirects (via the
> Wikidata/Wikipedia APIs) — this is the kind of normalization the real ETL handles.

### Power — official Congress.gov legislation

The **Power** category can be driven by real legislative activity from the official
**Congress.gov API**. This one needs a free key (instant signup, no cost):

```bash
# 1. one-time: attach real bioguide IDs to senators/representatives (no key)
npm run enrich:bioguide

# 2. get a free key at https://api.congress.gov/sign-up/ and put it in .env.local:
#    CONGRESS_API_KEY=your_key_here   (copy from .env.local.example)

# 3. pull real sponsored/cosponsored legislation -> Power events
npm run ingest:power
```

`scripts/enrich-bioguide.mjs` matches each seeded legislator to their canonical
**bioguide ID** (from the public unitedstates/congress-legislators dataset, matched
by surname + state so e.g. "Cruz" and "De La Cruz" never collide).
`scripts/ingest-power.mjs` then fetches each member's real sponsored + cosponsored
bills in the season window and scores them (sponsor +3, cosponsor +1,
passed-chamber +8, enacted +20), writing `src/lib/power.json`.

Figures without a bioguide ID (governors, or anyone not in the current-Congress
dataset) **fall back to synthetic Power** automatically — the app works with or
without the key. Truth and Aura remain seeded; wiring them to the Google Fact Check
Tools API and pageview-spike detection is the next pipeline step.

## What's built (V1)

- **Home dashboard** — this week's matchups, trending figures, standings, AI-recap stub.
- **League home** (`/league/lg-beltway`) — standings table, matchups by week, and every
  team's roster with a live **legality meter** showing the ideological-diversity rules.
- **Draft room** (`/league/lg-beltway/draft`) — interactive board with filters; draft a
  6-slot roster (2 SEN, 2 REP, 1 EXEC, 1 FLEX) and watch the legality rules check in real
  time.
- **Players** (`/players`) — full figure pool ranked by season points; free agents flagged.
- **Figure profile** (`/players/[slug]`) — per-category breakdown, weekly trend sparkline,
  and a feed of **scored events with links to their sources**.
- **Methodology** (`/methodology`) — the full public rulebook for all four scoring
  categories and the roster rules. This page is the product's neutrality moat.

**Scoring engine** (`src/lib/scoring.ts`) aggregates immutable events into per-figure /
per-week / per-category points, applies league weights, rolls up to team and matchup
totals, computes standings, and validates roster legality. V1 leagues weight **Power
(60%) + Influence (40%)**; Truth and Aura events are seeded and visible but weighted 0
until V2.

## Project structure

```
src/
  app/                     Next.js App Router pages
    page.tsx               Home dashboard
    league/[leagueId]/     League home + draft room
    players/               Players list + [slug] profile
    methodology/           Public scoring rulebook
  components/              SiteNav, DraftRoom (client), shared UI primitives
  lib/
    types.ts               Domain types (mirror the SQL schema)
    figures.json           Single source of truth for the figure pool (+ bioguide IDs)
    pageviews.json         Real Influence data (generated by npm run ingest)
    power.json             Real Power data (generated by npm run ingest:power)
    seed.ts                League, rosters, events (real data + synthetic fallback)
    scoring.ts             Pure scoring engine + roster-legality rules
    data.ts                Data-access layer (swap this for Supabase)
scripts/
  ingest-influence.mjs     Real Wikipedia Pageviews ETL prototype
  ingest-power.mjs         Real Congress.gov legislation ETL (needs free key)
  enrich-bioguide.mjs      One-time: attach canonical bioguide IDs to figures
supabase/
  schema.sql               Full Postgres schema + RLS sketch
```

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling (no component library dependency)
- **Supabase** (Postgres + Auth + Realtime + RLS) — schema included, wiring is the next step
- Designed to deploy free on **Vercel** + **Supabase Cloud**

## Going live (next steps)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Add `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Reimplement `src/lib/data.ts` against `@supabase/supabase-js` — keep the same function
   signatures and the pages won't change.
4. Build the ETL pipeline (Vercel Cron / GitHub Actions) to populate `events` from
   Congress.gov, OpenStates, GDELT, Wikipedia Pageviews, and the Google Fact Check Tools API.
5. Add Supabase Auth, real-time draft + chat channels, waivers, and trades.

See the full product specification (vision, personas, roadmap, monetization, legal risks)
in the plan document that generated this build.

---

*Capitol is a politically neutral game. Points come from measurable, sourced events —
never ideological positions.*
