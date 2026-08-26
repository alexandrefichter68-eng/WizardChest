export type DivisionId =
  | 'bois'
  | 'bronze'
  | 'argent'
  | 'or'
  | 'platine'
  | 'diamant'
  | 'maitre'
  | 'grand_maitre'
  | 'sorcier_supreme';

export type PlayStyle = 'agressif' | 'prudent' | 'tactique' | 'positionnel' | 'amateur';

export type PieceColor = 'w' | 'b';

export type GameResultKind = 'win' | 'loss' | 'draw';

export type GameEndReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'draw_agreement'
  | 'stalemate'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'insufficient_material';

export interface AvatarSpec {
  /** Deterministic seed used to render a generated monogram/geometric avatar. */
  seed: string;
  initials: string;
  hue: number;
  variant: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface OpponentProfile {
  id: string;
  username: string;
  countryCode: string;
  elo: number;
  division: DivisionId;
  winRate: number;
  gamesPlayed: number;
  style: PlayStyle;
  avatar: AvatarSpec;
  /** AI search parameters derived from elo/style, kept for transparency/debugging. */
  aiDepth: number;
  aiSkillNoise: number;
}

export interface PlayerProfile {
  id: string;
  username: string;
  avatar: AvatarSpec;
  countryCode: string;
  elo: number;
  division: DivisionId;
  xp: number;
  level: number;
  winStreak: number;
  bestWinStreak: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  lastDailyRewardAt: number | null;
  dailyRewardStreak: number;
  unlockedBoardThemes: string[];
  unlockedPieceThemes: string[];
  activeBoardTheme: string;
  activePieceTheme: string;
}

export interface GameHistoryEntry {
  id: string;
  playedAt: number;
  durationMs: number;
  result: GameResultKind;
  endReason: GameEndReason;
  playerColor: PieceColor;
  opponent: OpponentProfile;
  eloBefore: number;
  eloAfter: number;
  xpGained: number;
  pgn: string;
  finalFen: string;
  moveCount: number;
}

export interface Achievement {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  xpReward: number;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  countryCode: string;
  elo: number;
  division: DivisionId;
  avatar: AvatarSpec;
  isPlayer: boolean;
}

export type TimeControlPreset = 'blitz3' | 'rapid5' | 'rapid10' | 'classical15';

export interface TimeControl {
  preset: TimeControlPreset;
  initialSeconds: number;
  incrementSeconds: number;
}

export type BoardOrientation = 'white' | 'black' | 'auto';

export type AnimationQuality = 'low' | 'medium' | 'high';

export type AppLanguage = 'fr' | 'en';
export type MusicTrackId = 'taverne' | 'epique' | 'mystique';

export interface AppSettings {
  language: AppLanguage;
  musicEnabled: boolean;
  musicTrack: MusicTrackId;
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  animationQuality: AnimationQuality;
  boardOrientation: BoardOrientation;
  confirmBeforeResign: boolean;
  defaultTimeControl: TimeControlPreset;
}
