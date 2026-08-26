import type { PieceSymbol } from 'chess.js';

export type SpellId = 'explosion' | 'teleport' | 'shield' | 'leap';

export interface SpellDef {
  id: SpellId;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  cost: number;
  /** How many allied squares the player must pick, in order, to fully cast this spell. */
  targetCount: 1 | 2;
}

export const SPELLS: SpellDef[] = [
  {
    id: 'explosion',
    nameKey: 'spell.explosionName',
    descriptionKey: 'spell.explosionDescription',
    icon: '💥',
    cost: 2,
    targetCount: 1,
  },
  {
    id: 'teleport',
    nameKey: 'spell.teleportName',
    descriptionKey: 'spell.teleportDescription',
    icon: '🌀',
    cost: 4,
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
    cost: 3,
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
  q: 9,
  k: 0,
};

/** Gold earned for delivering check (not checkmate) with a normal move. */
export const CHECK_GOLD_REWARD = 5;

export interface OwnedSpell {
  /** Unique per copy, since the player can own several of the same spell at once. */
  instanceId: string;
  spellId: SpellId;
}
