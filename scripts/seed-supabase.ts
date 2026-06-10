// Capitol — upload the seed dataset into Supabase.
//
// Reuses the exact same seedDataset() the app uses (so events, scores, rosters
// match the local demo), and writes it into the schema from supabase/schema.sql
// using the SERVICE-ROLE key (bypasses RLS). Seed/team/league string ids are
// mapped to real UUIDs on insert.
//
// Prereqs:
//   1. Create a Supabase project and run supabase/schema.sql in the SQL editor.
//   2. In .env.local set:
//        NEXT_PUBLIC_SUPABASE_URL=...
//        SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings -> API -> service_role)
//
// Usage:  npm run db:seed

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { seedDataset } from "../src/lib/dataset";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const f = join(ROOT, ".env.local");
  if (existsSync(f)) {
    const m = readFileSync(f, "utf8").match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`, "m"));
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return undefined;
}

const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
if (!URL || !SERVICE_KEY) {
  console.error(
    [
      "",
      "  Missing Supabase credentials.",
      "  Set these in .env.local (see .env.local.example):",
      "    NEXT_PUBLIC_SUPABASE_URL=...",
      "    SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings -> API -> service_role)",
      "",
      "  And run supabase/schema.sql in the SQL editor first.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const db = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

async function insert(table: string, rows: unknown[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db.from(table).insert(chunk);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
  console.log(`  ✓ ${table.padEnd(16)} ${rows.length} rows`);
}

async function main() {
  const ds = seedDataset();
  console.log(`Uploading seed dataset to ${URL}\n`);

  // Reference data (stable string ids).
  await insert("parties", ds.parties.map((p) => ({ id: p.id, name: p.name, abbr: p.abbr })));
  await insert(
    "figures",
    ds.figures.map((f) => ({
      id: f.id,
      full_name: f.fullName,
      slug: f.slug,
      party_id: f.partyId,
      office: f.office,
      state: f.state,
      chamber_control: f.chamberControl,
      prominence: f.prominence,
      bioguide_id: f.bioguideId ?? null,
    })),
  );

  // League — map the owner's seed user id to a generated uuid.
  const teamUuid = new Map<string, string>(ds.teams.map((t) => [t.id, randomUUID()]));
  const userUuid = new Map<string, string>();
  for (const t of ds.teams) userUuid.set(t.userId, userUuid.get(t.userId) ?? randomUUID());
  const leagueId = randomUUID();

  await insert("leagues", [
    {
      id: leagueId,
      name: ds.league.name,
      owner_user_id: userUuid.get(ds.league.ownerUserId) ?? null,
      visibility: ds.league.visibility,
      scoring_weights: ds.league.scoringWeights,
      regular_weeks: ds.league.regularWeeks,
      playoff_teams: ds.league.playoffTeams,
      current_week: ds.league.currentWeek,
    },
  ]);

  await insert(
    "teams",
    ds.teams.map((t) => ({
      id: teamUuid.get(t.id),
      league_id: leagueId,
      user_id: userUuid.get(t.userId),
      owner_handle: t.ownerHandle,
      name: t.name,
      logo_emoji: t.logoEmoji,
    })),
  );

  await insert(
    "roster_slots",
    ds.rosters.map((r) => ({
      team_id: teamUuid.get(r.teamId),
      figure_id: r.figureId,
      slot: r.slot,
      status: "active",
    })),
  );

  await insert(
    "matchups",
    ds.matchups.map((m) => ({
      league_id: leagueId,
      week: m.week,
      home_team_id: teamUuid.get(m.homeTeamId),
      away_team_id: teamUuid.get(m.awayTeamId),
      status: m.week < ds.league.currentWeek ? "final" : "live",
    })),
  );

  await insert(
    "events",
    ds.events.map((e) => ({
      figure_id: e.figureId,
      category: e.category,
      type: e.type,
      week: e.week,
      occurred_at: e.occurredAt,
      base_points: e.basePoints,
      source: e.source,
      source_url: e.sourceUrl ?? null,
      description: e.description,
    })),
  );

  console.log(`\nDone. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY and run \`npm run dev\` to read live data.`);
}

main().catch((err) => {
  console.error("\nSeed upload failed:", err.message);
  process.exit(1);
});
