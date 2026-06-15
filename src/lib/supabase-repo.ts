import { getSupabase } from "./supabase";
import type { Dataset } from "./dataset";
import type {
  ChamberControl,
  Figure,
  League,
  Matchup,
  OfficeType,
  Party,
  RosterEntry,
  RosterSlot,
  ScoreCategory,
  ScoredEvent,
  ScoringWeights,
  Team,
} from "./types";

// Maps Supabase rows (snake_case) into the same Dataset the seed produces, so
// the query + scoring layers are storage-agnostic. Reimplements src/lib/data.ts'
// previous static reads against live tables.

const num = (v: unknown) => Number(v ?? 0);

type Db = ReturnType<typeof getSupabase>;

// Picks which league to load for the viewer: a league they manage a team in,
// else one they own, else the most recently created (the public/demo default).
// Scoping the loaded league to the user is what makes "my league" theirs.
async function selectLeagueRow(db: Db, viewerUserId: string | null) {
  if (viewerUserId) {
    const { data: myTeam } = await db
      .from("teams")
      .select("league_id")
      .eq("user_id", viewerUserId)
      .limit(1)
      .maybeSingle();
    if (myTeam?.league_id) {
      const { data } = await db.from("leagues").select("*").eq("id", myTeam.league_id).single();
      if (data) return data;
    }

    const { data: owned } = await db
      .from("leagues")
      .select("*")
      .eq("owner_user_id", viewerUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (owned) return owned;
  }

  const { data, error } = await db
    .from("leagues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(`Supabase: failed to load league — ${error.message}`);
  return data;
}

export async function fetchDataset(viewerUserId: string | null = null): Promise<Dataset> {
  const db = getSupabase();

  const leagueRow = await selectLeagueRow(db, viewerUserId);
  const leagueId = leagueRow.id as string;

  const [parties, figures, teams, rosterRows, matchups, events] = await Promise.all([
    db.from("parties").select("id,name,abbr"),
    db.from("figures").select("*"),
    db.from("teams").select("*").eq("league_id", leagueId),
    db.from("roster_slots").select("team_id,figure_id,slot").eq("status", "active"),
    db.from("matchups").select("*").eq("league_id", leagueId).order("week"),
    db.from("events").select("*"),
  ]);

  const err = [parties, figures, teams, rosterRows, matchups, events].find((r) => r.error);
  if (err?.error) throw new Error(`Supabase query failed — ${err.error.message}`);

  const league: League = {
    id: leagueId,
    name: leagueRow.name,
    visibility: leagueRow.visibility,
    ownerUserId: leagueRow.owner_user_id ?? "",
    scoringWeights: leagueRow.scoring_weights as ScoringWeights,
    regularWeeks: leagueRow.regular_weeks,
    playoffTeams: leagueRow.playoff_teams,
    currentWeek: leagueRow.current_week,
  };

  return {
    league,
    parties: (parties.data ?? []).map(
      (p): Party => ({ id: p.id, name: p.name, abbr: p.abbr }),
    ),
    figures: (figures.data ?? []).map(
      (f): Figure => ({
        id: f.id,
        fullName: f.full_name,
        slug: f.slug,
        partyId: f.party_id,
        office: f.office as OfficeType,
        state: f.state,
        chamberControl: f.chamber_control as ChamberControl,
        prominence: num(f.prominence),
        photoUrl: f.photo_url ?? undefined,
        bioguideId: f.bioguide_id ?? undefined,
        wikidataId: f.wikidata_id ?? undefined,
      }),
    ),
    teams: (teams.data ?? []).map(
      (t): Team => ({
        id: t.id,
        leagueId: t.league_id,
        userId: t.user_id ?? "",
        name: t.name,
        ownerHandle: t.owner_handle ?? "",
        logoEmoji: t.logo_emoji ?? "🏛️",
      }),
    ),
    rosters: (rosterRows.data ?? []).map(
      (r): RosterEntry => ({
        teamId: r.team_id,
        figureId: r.figure_id,
        slot: r.slot as RosterSlot,
      }),
    ),
    matchups: (matchups.data ?? []).map(
      (m): Matchup => ({
        id: m.id,
        leagueId: m.league_id,
        week: m.week,
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
      }),
    ),
    events: (events.data ?? []).map(
      (e): ScoredEvent => ({
        id: e.id,
        figureId: e.figure_id,
        category: e.category as ScoreCategory,
        type: e.type,
        week: e.week,
        occurredAt: e.occurred_at,
        basePoints: num(e.base_points),
        source: e.source,
        sourceUrl: e.source_url ?? undefined,
        description: e.description,
      }),
    ),
    meta: { source: "supabase", realInfluence: true, realPower: true },
  };
}
