// Data-access layer.
//
// Every page reads through these functions instead of touching the seed data
// directly. To go live, reimplement this module against Supabase (the function
// signatures and return types stay the same) — the UI won't need to change.

import {
  demoLeague,
  events,
  figureById,
  figureBySlug,
  figures,
  freeAgentFigures,
  matchups,
  parties,
  partyById,
  rosters,
  teams,
} from "./seed";
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
import type { Figure, League, ScoreCategory, ScoredEvent, Team } from "./types";

// Aggregate once at module load (seed data is static).
const figureScores = aggregateFigureScores(events);

export function getLeague(): League {
  return demoLeague;
}

export function getTeams(): Team[] {
  return teams;
}

export function getTeam(teamId: string): Team | undefined {
  return teams.find((t) => t.id === teamId);
}

export function getAllFigures(): Figure[] {
  return figures;
}

export function getFigureBySlug(slug: string): Figure | undefined {
  return figureBySlug(slug);
}

export function getPartyAbbr(partyId: string): string {
  return partyById(partyId).abbr;
}

export function getPartyName(partyId: string): string {
  return partyById(partyId).name;
}

export const allParties = parties;

export function getFreeAgents(): Figure[] {
  return freeAgentFigures();
}

export function getRosterFigures(teamId: string): { figure: Figure; slot: string }[] {
  return rosters
    .filter((r) => r.teamId === teamId)
    .map((r) => ({ figure: figureById(r.figureId)!, slot: r.slot }))
    .filter((x) => x.figure);
}

export function teamOf(figureId: string): Team | undefined {
  const entry = rosters.find((r) => r.figureId === figureId);
  return entry ? getTeam(entry.teamId) : undefined;
}

export function getStandings(): (StandingsRow & { team: Team })[] {
  return computeStandings(figureScores, demoLeague, rosters, matchups).map((row) => ({
    ...row,
    team: getTeam(row.teamId)!,
  }));
}

export interface MatchupView {
  id: string;
  week: number;
  home: { team: Team; points: number };
  away: { team: Team; points: number };
}

export function getMatchups(week: number): MatchupView[] {
  return matchups
    .filter((m) => m.week === week)
    .map((m) => ({
      id: m.id,
      week: m.week,
      home: {
        team: getTeam(m.homeTeamId)!,
        points: teamWeekTotal(figureScores, demoLeague, rosters, m.homeTeamId, week),
      },
      away: {
        team: getTeam(m.awayTeamId)!,
        points: teamWeekTotal(figureScores, demoLeague, rosters, m.awayTeamId, week),
      },
    }));
}

export function getFigureSeasonTotal(figureId: string): number {
  return figureSeasonTotal(figureScores, demoLeague, figureId);
}

export function getFigureWeekTotal(figureId: string, week: number): number {
  return figureWeekTotal(figureScores, demoLeague, figureId, week);
}

export function getFigureCategoryPoints(
  figureId: string,
  week: number,
): Record<ScoreCategory, number> {
  return figureCategoryPoints(figureScores, figureId, week);
}

/** Season points per category for a figure (for the profile breakdown chart). */
export function getFigureSeasonByCategory(
  figureId: string,
): Record<ScoreCategory, number> {
  const out: Record<ScoreCategory, number> = { power: 0, influence: 0, truth: 0, aura: 0 };
  for (let w = 1; w <= demoLeague.currentWeek; w++) {
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
}

/** Weekly weighted totals for a figure (for the trend sparkline). */
export function getFigureWeeklySeries(figureId: string): { week: number; points: number }[] {
  const series: { week: number; points: number }[] = [];
  for (let w = 1; w <= demoLeague.currentWeek; w++) {
    series.push({ week: w, points: figureWeekTotal(figureScores, demoLeague, figureId, w) });
  }
  return series;
}

export function getFigureEvents(figureId: string): ScoredEvent[] {
  return events
    .filter((e) => e.figureId === figureId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/** Figures ranked by season total — powers leaderboards and "trending". */
export function getFiguresRanked(): { figure: Figure; total: number }[] {
  return figures
    .map((f) => ({ figure: f, total: getFigureSeasonTotal(f.id) }))
    .sort((a, b) => b.total - a.total);
}

export function getRosterLegality(teamId: string) {
  const figs = getRosterFigures(teamId).map((r) => r.figure);
  return checkRosterLegality(figs, getPartyAbbr);
}
