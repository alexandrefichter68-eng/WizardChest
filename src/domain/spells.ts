import type { PieceSymbol } from 'chess.js';

export type SpellId =
  | 'explosion'
  | 'teleport'
  | 'shield'
  | 'leap'
  | 'celeste'
  | 'entrave'
  | 'resurrection'
  | 'corruption'
  | 'oeil_pour_oeil'
  | 'prix_du_sang'
  | 'camouflage'
  | 'piege_invisible'
  | 'echo_du_passe'
  | 'silencium'
  | 'reflexion'
  | 'chasseur_de_prime'
  | 'liaison_funeste';

export interface SpellDef {
  id: SpellId;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  cost: number;
  /** How many squares the player must pick, in order, to fully cast this spell. 0 = casts instantly, no targeting. */
  targetCount: 0 | 1 | 2;
}

// Note: the "explosion" id is kept internally for minimal churn, but it's displayed to players
// as "Cataclysme" (see spell.explosionName in the locale files) — a pure naming/flavor change.
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
    id: 'oeil_pour_oeil',
    nameKey: 'spell.oeilPourOeilName',
    descriptionKey: 'spell.oeilPourOeilDescription',
    icon: '⚖️',
    cost: 2,
    targetCount: 0,
  },
  {
    id: 'prix_du_sang',
    nameKey: 'spell.prixDuSangName',
    descriptionKey: 'spell.prixDuSangDescription',
    icon: '🗡️',
    cost: 2,
    targetCount: 1,
  },
  {
    id: 'camouflage',
    nameKey: 'spell.camouflageName',
    descriptionKey: 'spell.camouflageDescription',
    icon: '🎭',
    cost: 2,
    targetCount: 0,
  },
  {
    id: 'leap',
    nameKey: 'spell.leapName',
    descriptionKey: 'spell.leapDescription',
    icon: '🐴',
    cost: 4,
    targetCount: 1,
  },
  {
    id: 'shield',
    nameKey: 'spell.shieldName',
    descriptionKey: 'spell.shieldDescription',
    icon: '🛡️',
    cost: 4,
    targetCount: 1,
  },
  {
    id: 'piege_invisible',
    nameKey: 'spell.piegeInvisibleName',
    descriptionKey: 'spell.piegeInvisibleDescription',
    icon: '🕳️',
    cost: 4,
    targetCount: 1,
  },
  {
    id: 'celeste',
    nameKey: 'spell.celesteName',
    descriptionKey: 'spell.celesteDescription',
    icon: '✨',
    cost: 5,
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
    id: 'silencium',
    nameKey: 'spell.silenciumName',
    descriptionKey: 'spell.silenciumDescription',
    icon: '🔇',
    cost: 5,
    targetCount: 0,
  },
  {
    id: 'echo_du_passe',
    nameKey: 'spell.echoDuPasseName',
    descriptionKey: 'spell.echoDuPasseDescription',
    icon: '⏳',
    cost: 6,
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
    id: 'reflexion',
    nameKey: 'spell.reflexionName',
    descriptionKey: 'spell.reflexionDescription',
    icon: '🪞',
    cost: 7,
    targetCount: 0,
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
    id: 'liaison_funeste',
    nameKey: 'spell.liaisonFunesteName',
    descriptionKey: 'spell.liaisonFunesteDescription',
    icon: '💀',
    cost: 9,
    targetCount: 2,
  },
  {
    id: 'corruption',
    nameKey: 'spell.corruptionName',
    descriptionKey: 'spell.corruptionDescription',
    icon: '🩸',
    cost: 10,
    targetCount: 1,
  },
  {
    id: 'chasseur_de_prime',
    nameKey: 'spell.chasseurDePrimeName',
    descriptionKey: 'spell.chasseurDePrimeDescription',
    icon: '🎯',
    cost: 10,
    targetCount: 1,
  },
];

/**
 * Caps the player's unspent spell inventory (`ownedSpells.length` in `app/game.tsx`) so the shop
 * can't be stacked into an unbounded scroll — 8 fills the inventory chip row (54px chips, 6px gap)
 * to exactly 2 full rows at the panel's widest desktop size, the largest count that never needs to
 * scroll to see every owned spell at once.
 */
export const MAX_OWNED_SPELLS = 8;

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
  instanceId: string;
  spellId: SpellId;
  /** True from the moment it's bought until the owner's next turn starts — can't be cast yet. */
  boughtThisTurn: boolean;
}
