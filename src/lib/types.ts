export type PoolStatus = 'draft' | 'open' | 'full' | 'locked' | 'in_progress' | 'final' | 'completed' | 'canceled';
export type SelectionMode = 'pick' | 'random' | 'host';
export type LockMode = 'full' | 'scheduled' | 'either';
export type UnclaimedBehavior = 'open' | 'host_assigns' | 'void';
export type MemberRole = 'host' | 'player';
export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled';

export interface Profile {
  id: string;
  username: string;
  coins: number;
  coins_won: number;
  created_at: string;
}

export interface NFLGame {
  id: string;
  season: number;
  week: number;
  season_type: string;
  away_team: string;
  away_abbr: string;
  home_team: string;
  home_abbr: string;
  kickoff_utc: string;
  status: GameStatus;
}

export interface Pool {
  id: string;
  creator_id: string;
  name: string;
  team_home: string;
  team_away: string;
  cost_per_square: number;
  payout_first: number;
  payout_second: number;
  payout_third: number;
  payout_fourth: number;
  game_id: string | null;
  host_message: string | null;
  square_value: number | null;
  selection_mode: SelectionMode;
  max_squares_per_user: number;
  lock_mode: LockMode;
  lock_at: string | null;
  unclaimed_behavior: UnclaimedBehavior;
  payout_first_pct: number;
  payout_second_pct: number;
  payout_third_pct: number;
  payout_fourth_pct: number;
  status: PoolStatus;
  published_at: string | null;
  created_at: string;
}

export interface PoolDraft {
  id: string;
  user_id: string;
  step: number;
  data: WizardData;
  updated_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

export interface PoolInvite {
  id: string;
  pool_id: string;
  code: string;
  secret: string;
  created_at: string;
  expires_at: string | null;
}

export interface InvitePreview {
  pool_name: string;
  matchup: string;
  kickoff: string | null;
  host_name: string | null;
  pool_id: string;
}

export interface PublishResult {
  pool_id: string;
  invite_code: string;
  invite_secret: string;
}

export interface WizardData {
  gameId: string | null;
  poolName: string;
  hostMessage: string;
  squareValue: string;
  selectionMode: SelectionMode;
  maxSquaresPerUser: number;
  lockMode: LockMode;
  lockAt: string;
  unclaimedBehavior: UnclaimedBehavior;
  payoutFirst: number;
  payoutSecond: number;
  payoutThird: number;
  payoutFourth: number;
  confirmRules: boolean;
  confirmNoMoney: boolean;
}

export const defaultWizardData: WizardData = {
  gameId: null,
  poolName: '',
  hostMessage: '',
  squareValue: '',
  selectionMode: 'pick',
  maxSquaresPerUser: 10,
  lockMode: 'full',
  lockAt: '',
  unclaimedBehavior: 'open',
  payoutFirst: 25,
  payoutSecond: 25,
  payoutThird: 25,
  payoutFourth: 25,
  confirmRules: false,
  confirmNoMoney: false,
};

export type AuthIntent =
  | { type: 'create_pool' }
  | { type: 'join_pool'; poolId: string }
  | { type: 'open_pool'; poolId: string }
  | null;

export const PRIZE_PRESETS = [
  { label: '20 / 20 / 20 / 40', values: [20, 20, 20, 40] },
  { label: '25 / 25 / 25 / 25', values: [25, 25, 25, 25] },
  { label: '10 / 20 / 20 / 50', values: [10, 20, 20, 50] },
];
