import { createAvatarForUsername } from '@/domain/avatar';
import type { OpponentProfile } from '@/types';

/**
 * Entraînement (training) mode opponent: the strongest bot in the game — depth 9, one ply above
 * ranked's own ceiling (`sorcier_supreme`, depth 8) and matching the adventure boss Edgar — with
 * `freeSpells: true` so every purchase in the shop costs no gold (see `handleBuySpell` in
 * `app/game.tsx`), letting players freely experiment with the full spell system against maximum
 * resistance. Still bound by `MAX_OWNED_SPELLS` like any other match.
 */
export const TRAINING_BOT: OpponentProfile = {
  id: 'training-bot',
  username: 'Golem d’Entraînement',
  countryCode: 'FR',
  elo: 2400,
  division: 'sorcier_supreme',
  winRate: 0.9,
  gamesPlayed: 1000,
  style: 'positionnel',
  avatar: createAvatarForUsername('Golem d’Entraînement', 'training-bot'),
  aiDepth: 9,
  aiSkillNoise: 0,
  freeSpells: true,
};
