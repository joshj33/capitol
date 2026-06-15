// Query layer: pure, synchronous accessors bound to a single Dataset.
//
// createQueries(ds) returns the same API the pages have always used; the only
// change for callers is they now obtain it via `await getQueries()` (see
// data.ts) so the dataset can come from Supabase or the seed. Loading once and
// computing in-memory avoids per-call N+1 database round-trips.

import type { Dataset } from "./dataset";
import {
  aggregateFigureScores,
  checkRosterLegality,
  computeStandings,
  figureCategoryPoints,
  figureSeasonTotal,
  figureWeekTotal,
  teamWeekTotal,
  type StandingsRow,
} from "./scoring";
import type { Figure, Party, ScoreCategory, ScoredEvent, Team } from "./types";

export interface MatchupView {
  id: string;
  week: number;
  home: { team: Team; points: number };
  away: { team: Team; points: number };
}

export function createQueries(ds: Dataset, viewerUserId?: string | null) {
  const { league, parties, figures, teams, rosters, matchups, events } = ds;

  // Aggregate events into per-figure/week/category scores once per dataset.
  const figureScores = aggregateFigureScores(events);

  const partyById = (id: string): Party | undefined => parties.find((p) => p.id === id);
  const figureById = (id: string): Figure | undefined => figures.find((f) => f.id === id);
  const getTeam = (teamId: string): Team | undefined => teams.find((t) => t.id === teamId);

  const getFigureSeasonTotal = (figureId: string): number =>
    figureSeasonTotal(figureScores, league, figureId);

  // --- Viewer scoping -------------------------------------------------------
  // `viewer` is the signed-in user's id, or null when signed out / in seed
  // mode. `demo` is true when there's no real backing store, in which case the
  // app stays fully open so it works with zero config.
  const viewer = viewerUserId || null;
  const demo = ds.meta.source === "seed";
  const viewerTeam = viewer ? teams.find((t) => t.userId === viewer) : undefined;
  const isLeagueOwner = Boolean(viewer && league.ownerUserId && viewer === league.ownerUserId);
  const isLeagueMember = Boolean(viewerTeam) || isLeagueOwner;

  return {
    meta: ds.meta,
    getLeague: () => league,
    getParties: () => parties,
    getTeams: () => teams,
    getTeam,

    /** The signed-in user's id, or null. */
    getViewerUserId: (): string | null => viewer,
    /** The team the signed-in user manages in this league, or undefined. Strict:
     *  never falls back to another user's team. Use this for gating. */
    getViewerTeam: (): Team | undefined => viewerTeam,
    /** True when the viewer owns a team in — or owns — this league. */
    isLeagueMember: (): boolean => isLeagueMember,
    isLeagueOwner: (): boolean => isLeagueOwner,
    /** Whether the viewer may make league moves (enter the draft, edit rosters).
     *  Open in demo mode so the zero-config experience is unchanged. */
    canManageLeague: (): boolean => demo || isLeagueMember,
    /** Whether the viewer may manage a specific team. */
    canManageTeam: (teamId: string): boolean =>
      demo || Boolean(viewer && (getTeam(teamId)?.userId === viewer || isLeagueOwner)),

    /** The team whose widgets ("your record") we show. When signed in, strictly
     *  the viewer's team. In demo mode (no auth) we fall back to the league
     *  owner's team so the zero-config experience still populates. */
    getMyTeam: (): Team | undefined => {
      if (viewer) return viewerTeam;
      if (!demo) return undefined;
      return teams.find((t) => t.userId && t.userId === league.ownerUserId) ?? teams[0];
    },

    getAllFigures: () => figures,
    getFigureBySlug: (slug: string) => figures.find((f) => f.slug === slug),
    getPartyAbbr: (partyId: string) => partyById(partyId)?.abbr ?? "?",
    getPartyName: (partyId: string) => partyById(partyId)?.name ?? "Unknown",

    getFreeAgents: (): Figure[] => {
      const owned = new Set(rosters.map((r) => r.figureId));
      return figures.filter((f) => !owned.has(f.id));
    },

    getRosterFigures: (teamId: string): { figure: Figure; slot: string }[] =>
      rosters
        .filter((r) => r.teamId === teamId)
        .map((r) => ({ figure: figureById(r.figureId)!, slot: r.slot }))
        .filter((x) => x.figure),

    teamOf: (figureId: string): Team | undefined => {
      const entry = rosters.find((r) => r.figureId === figureId);
      return entry ? getTeam(entry.teamId) : undefined;
    },

    getStandings: (): (StandingsRow & { team: Team })[] =>
      computeStandings(figureScores, league, rosters, matchups).map((row) => ({
        ...row,
        team: getTeam(row.teamId)!,
      })),

    getMatchups: (week: number): MatchupView[] =>
      matchups
        .filter((m) => m.week === week)
        .map((m) => ({
          id: m.id,
          week: m.week,
          home: {
            team: getTeam(m.homeTeamId)!,
            points: teamWeekTotal(figureScores, league, rosters, m.homeTeamId, week),
          },
          away: {
            team: getTeam(m.awayTeamId)!,
            points: teamWeekTotal(figureScores, league, rosters, m.awayTeamId, week),
          },
        })),

    getFigureSeasonTotal,
    getFigureWeekTotal: (figureId: string, week: number) =>
      figureWeekTotal(figureScores, league, figureId, week),
    getFigureCategoryPoints: (figureId: string, week: number) =>
      figureCategoryPoints(figureScores, figureId, week),

    getFigureSeasonByCategory: (figureId: string): Record<ScoreCategory, number> => {
      const out: Record<ScoreCategory, number> = { power: 0, influence: 0, truth: 0, aura: 0 };
      for (let w = 1; w <= league.currentWeek; w++) {
        const c = figureCategoryPoints(figureScores, figureId, w);
        out.power += c.power;
        out.influence += c.influence;
        out.truth += c.truth;
        out.aura += c.aura;
      }
      (Object.keys(out) as ScoreCategory[]).forEach(
        (k) => (out[k] = Math.round(out[k] * 10) / 10),
      );
      return out;
    },

    getFigureWeeklySeries: (figureId: string): { week: number; points: number }[] => {
      const series: { week: number; points: number }[] = [];
      for (let w = 1; w <= league.currentWeek; w++) {
        series.push({ week: w, points: figureWeekTotal(figureScores, league, figureId, w) });
      }
      return series;
    },

    getFigureEvents: (figureId: string): ScoredEvent[] =>
      events
        .filter((e) => e.figureId === figureId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),

    getFiguresRanked: (): { figure: Figure; total: number }[] =>
      figures
        .map((f) => ({ figure: f, total: getFigureSeasonTotal(f.id) }))
        .sort((a, b) => b.total - a.total),

    getRosterLegality: (teamId: string) => {
      const figs = rosters
        .filter((r) => r.teamId === teamId)
        .map((r) => figureById(r.figureId)!)
        .filter(Boolean);
      return checkRosterLegality(figs, (id) => partyById(id)?.abbr ?? "?");
    },
  };
}

export type Queries = ReturnType<typeof createQueries>;
