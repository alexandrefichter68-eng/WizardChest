import { create } from 'zustand';
import type { XpBreakdown } from '@/domain/xp';
import type { Achievement, GameEndReason, GameResultKind, OpponentProfile, PieceColor, TimeControl } from '@/types';

export interface MatchResultSummary {
  result: GameResultKind;
  endReason: GameEndReason;
  opponent: OpponentProfile;
  playerColor: PieceColor;
  eloBefore: number;
  eloAfter: number;
  xp: XpBreakdown;
  divisionChanged: boolean;
  leveledUp: boolean;
  newAchievements: Achievement[];
  pgn: string;
  finalFen: string;
  moveCount: number;
  durationMs: number;
  historyEntryId: string;
}

interface MatchState {
  opponent: OpponentProfile | null;
  timeControl: TimeControl | null;
  playerColor: PieceColor | null;
  /** Adventure-mode matches (e.g. the boss fight) have no clock at all. */
  isUntimed: boolean;
  lastResult: MatchResultSummary | null;
  startMatch: (opponent: OpponentProfile, timeControl: TimeControl, playerColor: PieceColor, options?: { isUntimed?: boolean }) => void;
  setLastResult: (result: MatchResultSummary) => void;
  clearMatch: () => void;
}

export const useMatchStore = create<MatchState>()((set) => ({
  opponent: null,
  timeControl: null,
  playerColor: null,
  isUntimed: false,
  lastResult: null,

  startMatch: (opponent, timeControl, playerColor, options) =>
    set({ opponent, timeControl, playerColor, isUntimed: options?.isUntimed ?? false }),
  setLastResult: (result) => set({ lastResult: result }),
  clearMatch: () => set({ opponent: null, timeControl: null, playerColor: null, isUntimed: false }),
}));
