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
    dataset.ts             Dataset shape + seedDataset() (storage-agnostic snapshot)
    supabase.ts            Anon client + isSupabaseConfigured()
    supabase-repo.ts       fetchDataset() — builds the Dataset from Supabase
    queries.ts             createQueries(ds) — all page accessors, bound to a dataset
    data.ts                getQueries() — loads Supabase-or-seed dataset (the entry point)
scripts/
  ingest-influence.mjs     Real Wikipedia Pageviews ETL prototype
  ingest-power.mjs         Real Congress.gov legislation ETL (needs free key)
  enrich-bioguide.mjs      One-time: attach canonical bioguide IDs to figures
  seed-supabase.ts         Upload the seed dataset into Supabase (npm run db:seed)
supabase/
  schema.sql               Full Postgres schema + RLS policies
```

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling (no component library dependency)
- **Supabase** (Postgres + Auth + Realtime + RLS) — client wired in; reads activate on config
- Designed to deploy free on **Vercel** + **Supabase Cloud**

## Supabase data layer

The data layer is **already wired**: the app reads from Supabase when credentials are
present and falls back to the in-memory seed otherwise — so `npm run dev` works with zero
setup, and going live is just adding env vars + uploading data. Pages call
`await getQueries()` (`src/lib/data.ts`), which loads a `Dataset` from either source and
returns the same synchronous accessors; the scoring engine and UI are storage-agnostic.

To switch the running app onto Supabase:

```bash
# 1. Create a project at https://supabase.com, then run supabase/schema.sql
#    in the SQL editor.

# 2. Put your keys in .env.local (see .env.local.example):
#    NEXT_PUBLIC_SUPABASE_URL=...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#    SUPABASE_SERVICE_ROLE_KEY=...        (used only by the upload script)

# 3. Upload the same seed dataset the demo uses (figures, league, rosters,
#    matchups, and all scored events) — reuses seedDataset() so it matches 1:1:
npm run db:seed

# 4. Run the app; with the two NEXT_PUBLIC_* vars set it now reads live data.
npm run dev
```

RLS is enabled on every table: the data the app renders is public-read, the anon key
cannot write, and writes (the upload script + ETL) go through the service-role key.
For a real multi-tenant launch, swap the permissive league-read policies for the
membership-scoped template included in `schema.sql`.

### Remaining steps after this

1. Point the ETL pipeline (`scripts/ingest-*`) at the `events` table instead of JSON, on
   a schedule (Vercel Cron / GitHub Actions).
2. Add Supabase **Auth** so real users own teams (re-link `owner_user_id` / `user_id` to
   `auth.users` and restore the membership-scoped RLS policies).
3. Add **real-time** draft + league chat (Supabase Realtime channels), then waivers and trades.

See the full product specification (vision, personas, roadmap, monetization, legal risks)
in the plan document that generated this build.

---

*Capitol is a politically neutral game. Points come from measurable, sourced events —
never ideological positions.*
