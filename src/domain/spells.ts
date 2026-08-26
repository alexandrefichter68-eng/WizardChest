import type { PieceSymbol } from 'chess.js';

export type SpellId = 'explosion' | 'teleport' | 'shield' | 'leap' | 'celeste' | 'entrave' | 'resurrection' | 'corruption';

export interface SpellDef {
  id: SpellId;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  cost: number;
  /** How many squares the player must pick, in order, to fully cast this spell. */
  targetCount: 1 | 2;
}

// Note: the "explosion" id is kept internally for minimal churn, but it's displayed to players
// as "Cataclysme" (see spell.explosionName in the locale files) — a pure naming/flavor change.
export const SPELLS: SpellDef[] = [
  {
    id: 'explosion',
    nameKey: 'spell.explosionName',
    descriptionKey: 'spell.explosionDescription',
    icon: '💥',
    cost: 3,
    targetCount: 1,
  },
  {
    id: 'teleport',
    nameKey: 'spell.teleportName',
    descriptionKey: 'spell.teleportDescription',
    icon: '🌀',
    cost: 7,
    targetCount: 2,
  },
  {
    id: 'shield',
    nameKey: 'spell.shieldName',
    descriptionKey: 'spell.shieldDescription',
    icon: '🛡️',
    cost: 6,
    targetCount: 1,
  },
  {
    id: 'leap',
    nameKey: 'spell.leapName',
    descriptionKey: 'spell.leapDescription',
    icon: '🐴',
    cost: 5,
    targetCount: 1,
  },
  {
    id: 'celeste',
    nameKey: 'spell.celesteName',
    descriptionKey: 'spell.celesteDescription',
    icon: '✨',
    cost: 6,
    targetCount: 1,
  },
  {
    id: 'entrave',
    nameKey: 'spell.entraveName',
    descriptionKey: 'spell.entraveDescription',
    icon: '⛓️',
    cost: 5,
    targetCount: 1,
  },
  {
    id: 'resurrection',
    nameKey: 'spell.resurrectionName',
    descriptionKey: 'spell.resurrectionDescription',
    icon: '⚰️',
    cost: 9,
    targetCount: 1,
  },
  {
    id: 'corruption',
    nameKey: 'spell.corruptionName',
    descriptionKey: 'spell.corruptionDescription',
    icon: '🩸',
    cost: 8,
    targetCount: 1,
  },
];

export function getSpellDef(id: SpellId): SpellDef {
  const found = SPELLS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown spell id: ${id}`);
  return found;
}

/** Gold earned for capturing a piece of this type via a normal chess move. King is never captured. */
export const CAPTURE_GOLD_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 7,
  k: 0,
};

/**
 * Gold earned for delivering check (not checkmate) — scales with how many checks (real or
 * "échec fantôme") that side has already delivered this match: the 1st is worth 1 gold, the 2nd
 * worth 2, the 3rd worth 3, and so on. `checksDeliveredSoFar` is the count *before* this one.
 */
export function nextCheckGoldReward(checksDeliveredSoFar: number): number {
  return checksDeliveredSoFar + 1;
}

export interface OwnedSpell {
  /** Unique per copy, since the player can own several of the same spell at once. */
  instanceId: string;
  spellId: SpellId;
}
