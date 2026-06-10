import type {
  Figure,
  League,
  Matchup,
  Party,
  RosterEntry,
  ScoredEvent,
  Team,
} from "./types";
import * as seed from "./seed";

/**
 * A complete snapshot of everything a page needs, loaded once per request.
 * Both the seed and Supabase produce this identical shape, so the query layer
 * (createQueries) and the scoring engine never know or care where it came from.
 */
export interface Dataset {
  league: League;
  parties: Party[];
  figures: Figure[];
  teams: Team[];
  rosters: RosterEntry[];
  matchups: Matchup[];
  events: ScoredEvent[];
  meta: { source: "seed" | "supabase"; realInfluence: boolean; realPower: boolean };
}

/** Build the dataset from the in-memory seed (no external dependencies). */
export function seedDataset(): Dataset {
  return {
    league: seed.demoLeague,
    parties: seed.parties,
    figures: seed.figures,
    teams: seed.teams,
    rosters: seed.rosters,
    matchups: seed.matchups,
    events: seed.events,
    meta: {
      source: "seed",
      realInfluence: seed.usingRealInfluence,
      realPower: seed.usingRealPower,
    },
  };
}
