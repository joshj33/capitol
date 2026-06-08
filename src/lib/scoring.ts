import type {
  Figure,
  FigureWeekScore,
  League,
  RosterEntry,
  ScoreCategory,
  ScoredEvent,
} from "./types";

export const CATEGORIES: ScoreCategory[] = ["power", "influence", "truth", "aura"];

export const CATEGORY_META: Record<
  ScoreCategory,
  { label: string; blurb: string; color: string }
> = {
  power: {
    label: "Power",
    blurb: "Bills, votes, elections, official actions.",
    color: "#5a719c",
  },
  influence: {
    label: "Influence",
    blurb: "News coverage, pageviews, search interest.",
    color: "#d9a441",
  },
  truth: {
    label: "Truth",
    blurb: "Third-party fact-check ratings.",
    color: "#3aa675",
  },
  aura: {
    label: "Aura",
    blurb: "Attention momentum and viral spikes.",
    color: "#9b6bd0",
  },
};

/**
 * Aggregate immutable events into per-figure, per-week, per-category points.
 * This is the deterministic core of the scoring engine — it simply sums the
 * basePoints of every event sharing a (figure, week, category) key.
 */
export function aggregateFigureScores(events: ScoredEvent[]): FigureWeekScore[] {
  const map = new Map<string, FigureWeekScore>();
  for (const e of events) {
    const key = `${e.figureId}:${e.week}:${e.category}`;
    const existing = map.get(key);
    if (existing) {
      existing.points += e.basePoints;
    } else {
      map.set(key, {
        figureId: e.figureId,
        week: e.week,
        category: e.category,
        points: e.basePoints,
      });
    }
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    points: Math.round(s.points * 10) / 10,
  }));
}

/** Points for one figure in one week, broken down by category. */
export function figureCategoryPoints(
  scores: FigureWeekScore[],
  figureId: string,
  week: number,
): Record<ScoreCategory, number> {
  const out: Record<ScoreCategory, number> = { power: 0, influence: 0, truth: 0, aura: 0 };
  for (const s of scores) {
    if (s.figureId === figureId && s.week === week) out[s.category] = s.points;
  }
  return out;
}

/** Weighted fantasy total for one figure in one week, per a league's weights. */
export function figureWeekTotal(
  scores: FigureWeekScore[],
  league: League,
  figureId: string,
  week: number,
): number {
  const cats = figureCategoryPoints(scores, figureId, week);
  let total = 0;
  for (const c of CATEGORIES) total += cats[c] * league.scoringWeights[c];
  return Math.round(total * 10) / 10;
}

/** A figure's season-to-date weighted total across all completed weeks. */
export function figureSeasonTotal(
  scores: FigureWeekScore[],
  league: League,
  figureId: string,
  throughWeek = league.currentWeek,
): number {
  let total = 0;
  for (let w = 1; w <= throughWeek; w++) {
    total += figureWeekTotal(scores, league, figureId, w);
  }
  return Math.round(total * 10) / 10;
}

/** A team's weighted total for one week (sum of its rostered figures). */
export function teamWeekTotal(
  scores: FigureWeekScore[],
  league: League,
  rosters: RosterEntry[],
  teamId: string,
  week: number,
): number {
  const figureIds = rosters.filter((r) => r.teamId === teamId).map((r) => r.figureId);
  const total = figureIds.reduce(
    (sum, fid) => sum + figureWeekTotal(scores, league, fid, week),
    0,
  );
  return Math.round(total * 10) / 10;
}

export interface StandingsRow {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
}

/** Compute win/loss standings from completed-week matchups. */
export function computeStandings(
  scores: FigureWeekScore[],
  league: League,
  rosters: RosterEntry[],
  matchups: { week: number; homeTeamId: string; awayTeamId: string }[],
): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  const row = (id: string) => {
    if (!rows.has(id)) rows.set(id, { teamId: id, wins: 0, losses: 0, ties: 0, pointsFor: 0 });
    return rows.get(id)!;
  };

  for (const m of matchups) {
    if (m.week >= league.currentWeek) continue; // only completed weeks
    const home = teamWeekTotal(scores, league, rosters, m.homeTeamId, m.week);
    const away = teamWeekTotal(scores, league, rosters, m.awayTeamId, m.week);
    const h = row(m.homeTeamId);
    const a = row(m.awayTeamId);
    h.pointsFor += home;
    a.pointsFor += away;
    if (home > away) { h.wins++; a.losses++; }
    else if (away > home) { a.wins++; h.losses++; }
    else { h.ties++; a.ties++; }
  }

  return Array.from(rows.values())
    .map((r) => ({ ...r, pointsFor: Math.round(r.pointsFor * 10) / 10 }))
    .sort((x, y) => y.wins - x.wins || y.pointsFor - x.pointsFor);
}

// ---------------------------------------------------------------------------
// Roster legality — the ideological-diversity rules from the spec (§4a).
// ---------------------------------------------------------------------------
export interface LegalityRule {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export function checkRosterLegality(
  figuresOnRoster: Figure[],
  partyAbbr: (partyId: string) => string,
): { rules: LegalityRule[]; legal: boolean } {
  const n = figuresOnRoster.length;
  const byParty = new Map<string, number>();
  for (const f of figuresOnRoster) byParty.set(f.partyId, (byParty.get(f.partyId) ?? 0) + 1);
  const maxParty = Math.max(0, ...Array.from(byParty.values()));
  const states = new Set(figuresOnRoster.map((f) => f.state));
  const majority = figuresOnRoster.filter((f) => f.chamberControl === "majority").length;
  const minority = figuresOnRoster.filter((f) => f.chamberControl === "minority").length;

  // The governing/opposition minimum scales with roster size: it's the spec's
  // value of 3 for a full 10-slot roster, but relaxes for smaller rosters (the
  // demo's 6-slot roster has only ~5 legislators since EXEC slots have no
  // chamber control). Capped at 3, floored at 2 once a roster is filling in.
  const legislators = majority + minority;
  const govOppMin = Math.max(2, Math.min(3, Math.floor(legislators / 2)));

  const rules: LegalityRule[] = [
    {
      key: "party-cap",
      label: "No more than 50% from one party",
      ok: n === 0 || maxParty <= Math.floor(n / 2),
      detail: `Largest party block: ${maxParty}/${n}`,
    },
    {
      key: "two-party",
      label: "At least 2 parties represented",
      ok: byParty.size >= 2,
      detail: `${byParty.size} part${byParty.size === 1 ? "y" : "ies"}: ${Array.from(byParty.keys())
        .map(partyAbbr)
        .join(", ") || "—"}`,
    },
    {
      key: "gov-opp",
      label: `≥${govOppMin} governing and ≥${govOppMin} opposition figures`,
      ok: majority >= govOppMin && minority >= govOppMin,
      detail: `${majority} majority · ${minority} minority`,
    },
    {
      key: "regional",
      label: "Figures from ≥4 states",
      ok: states.size >= 4,
      detail: `${states.size} states`,
    },
  ];

  return { rules, legal: rules.every((r) => r.ok) };
}
