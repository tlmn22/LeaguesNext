import 'server-only';
import { scalar } from './db';
import { canManageLeague, type User } from './auth';

// Commissioner-ийн эрхийг объектын лигээр шалгах туслахууд

export async function leagueOfSeason(seasonId: number): Promise<number | null> {
  return scalar<number>('SELECT league_id FROM seasons WHERE id=?', [seasonId]);
}

export async function leagueOfSeasonTeam(stid: number): Promise<number | null> {
  return scalar<number>('SELECT s.league_id FROM season_teams st JOIN seasons s ON s.id=st.season_id WHERE st.id=?', [stid]);
}

export async function leagueOfMatch(matchId: number): Promise<number | null> {
  return scalar<number>('SELECT s.league_id FROM matches m JOIN seasons s ON s.id=m.season_id WHERE m.id=?', [matchId]);
}

export async function canSeason(u: User, seasonId: number) {
  return canManageLeague(u, await leagueOfSeason(seasonId));
}
export async function canSeasonTeam(u: User, stid: number) {
  return canManageLeague(u, await leagueOfSeasonTeam(stid));
}
export async function canMatch(u: User, matchId: number) {
  return canManageLeague(u, await leagueOfMatch(matchId));
}
