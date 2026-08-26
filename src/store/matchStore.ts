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
  lastResult: MatchResultSummary | null;
  startMatch: (opponent: OpponentProfile, timeControl: TimeControl, playerColor: PieceColor) => void;
  setLastResult: (result: MatchResultSummary) => void;
  clearMatch: () => void;
}

export const useMatchStore = create<MatchState>()((set) => ({
  opponent: null,
  timeControl: null,
  playerColor: null,
  lastResult: null,

  startMatch: (opponent, timeControl, playerColor) => set({ opponent, timeControl, playerColor }),
  setLastResult: (result) => set({ lastResult: result }),
  clearMatch: () => set({ opponent: null, timeControl: null, playerColor: null }),
}));
