import { divisionColors } from '@/theme/colors';
import type { DivisionId } from '@/types';

export interface DivisionDef {
  id: DivisionId;
  order: number;
  nameKey: string;
  minElo: number;
  maxElo: number | null;
  color: string;
  emblem: string;
  /** Search depth ceiling used to scale AI difficulty for opponents of this division. */
  aiDepth: number;
  /** 0..1 chance the AI deliberately picks a slightly weaker move instead of the best one. */
  aiSkillNoise: number;
  promotionRewardXp: number;
}

export const DIVISIONS: DivisionDef[] = [
  {
    id: 'bois',
    order: 0,
    nameKey: 'division.bois',
    minElo: 0,
    maxElo: 899,
    color: divisionColors.bois,
    emblem: '🪵',
    aiDepth: 1,
    aiSkillNoise: 0.55,
    promotionRewardXp: 100,
  },
  {
    id: 'bronze',
    order: 1,
    nameKey: 'division.bronze',
    minElo: 900,
    maxElo: 1099,
    color: divisionColors.bronze,
    emblem: '🔶',
    aiDepth: 2,
    aiSkillNoise: 0.4,
    promotionRewardXp: 150,
  },
  {
    id: 'argent',
    order: 2,
    nameKey: 'division.argent',
    minElo: 1100,
    maxElo: 1299,
    color: divisionColors.argent,
    emblem: '⚪',
    aiDepth: 2,
    aiSkillNoise: 0.3,
    promotionRewardXp: 200,
  },
  {
    id: 'or',
    order: 3,
    nameKey: 'division.or',
    minElo: 1300,
    maxElo: 1499,
    color: divisionColors.or,
    emblem: '🟡',
    aiDepth: 3,
    aiSkillNoise: 0.22,
    promotionRewardXp: 300,
  },
  {
    id: 'platine',
    order: 4,
    nameKey: 'division.platine',
    minElo: 1500,
    maxElo: 1699,
    color: divisionColors.platine,
    emblem: '💠',
    aiDepth: 3,
    aiSkillNoise: 0.15,
    promotionRewardXp: 400,
  },
  {
    id: 'diamant',
    order: 5,
    nameKey: 'division.diamant',
    minElo: 1700,
    maxElo: 1899,
    color: divisionColors.diamant,
    emblem: '💎',
    aiDepth: 4,
    aiSkillNoise: 0.1,
    promotionRewardXp: 500,
  },
  {
    id: 'maitre',
    order: 6,
    nameKey: 'division.maitre',
    minElo: 1900,
    maxElo: 2099,
    color: divisionColors.maitre,
    emblem: '♞',
    aiDepth: 5,
    aiSkillNoise: 0.06,
    promotionRewardXp: 650,
  },
  {
    id: 'grand_maitre',
    order: 7,
    nameKey: 'division.grand_maitre',
    minElo: 2100,
    maxElo: 2299,
    color: divisionColors.grandMaitre,
    emblem: '♛',
    aiDepth: 6,
    aiSkillNoise: 0.03,
    promotionRewardXp: 850,
  },
  {
    id: 'sorcier_supreme',
    order: 8,
    nameKey: 'division.sorcier_supreme',
    minElo: 2300,
    maxElo: null,
    color: divisionColors.sorcierSupreme,
    emblem: '🔮',
    aiDepth: 8,
    aiSkillNoise: 0,
    promotionRewardXp: 1200,
  },
];

export function getDivisionForElo(elo: number): DivisionDef {
  const found = [...DIVISIONS].reverse().find((d) => elo >= d.minElo);
  return found ?? DIVISIONS[0]!;
}

export function getDivisionById(id: DivisionId): DivisionDef {
  const found = DIVISIONS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown division id: ${id}`);
  return found;
}

/** Progress (0..1) of `elo` through its current division's range, for progress bars. */
export function getDivisionProgress(elo: number): number {
  const division = getDivisionForElo(elo);
  const max = division.maxElo ?? division.minElo + 400;
  const span = max - division.minElo;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (elo - division.minElo) / span));
}

export function getNextDivision(division: DivisionDef): DivisionDef | null {
  return DIVISIONS.find((d) => d.order === division.order + 1) ?? null;
}
