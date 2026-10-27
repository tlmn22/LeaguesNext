// Boxscore editor (client) ба server action хооронд дамжих өгөгдлийн төрлүүд

export const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'OT'] as const;
export type Period = (typeof PERIODS)[number];

export const TEAM_STAT_FIELDS = [
  ['points_from_turnovers', 'PTS/TO'],
  ['points_in_paint', 'Paint'],
  ['second_chance_points', '2nd Ch.'],
  ['fast_break_points', 'F.Break'],
  ['bench_points', 'Bench'],
] as const;
export type TeamStatField = (typeof TEAM_STAT_FIELDS)[number][0];

export const PLAYER_FIELDS = [
  'minutes', 'seconds',
  'two_made', 'two_attempts', 'three_made', 'three_attempts', 'ft_made', 'ft_attempts',
  'reb_off', 'reb_def', 'assists', 'turnovers', 'steals', 'blocks', 'fouls_committed', 'plus_minus',
] as const;
export type PlayerField = (typeof PLAYER_FIELDS)[number];

export type PlayerLine = { player_id: number; team_id: number; dnp: boolean } & Record<PlayerField, number | null>;

export type ScorePayload = {
  matchId: number;
  home_score: number;
  away_score: number;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  periods: Partial<Record<Period, { home: number | null; away: number | null }>>;
  teamStats: Partial<Record<'home' | 'away', Partial<Record<TeamStatField, number | null>>>>;
  players: PlayerLine[];
};

export type RosterPlayer = {
  player_id: number;
  season_team_id: number;
  jersey_no: string | null;
  position: string | null;
  last_name: string;
  first_name: string;
  photo_path: string | null;
};

export type SaveResult = { ok: boolean; message: string; savedAt?: string };
