import { createAvatarForUsername } from '@/domain/avatar';
import type { OpponentProfile } from '@/types';

/**
 * First Adventure-mode opponent: a scripted "tutorial" fight that teaches Cataclysme (the only
 * spell available in this match — see `availableSpellIds`). Gartin plays the same 4-move knight
 * shuffle (his own knights hopping out and back, per his lore — "ordonnait à ses propres cavaliers
 * de faire n'importe quoi") twice in a row — 8 scripted moves total — before switching to
 * full-strength search, ignoring the search engine entirely for those (`app/game.tsx`'s AI-turn
 * effect consumes `scriptedOpeningMoves` in order before ever calling `computeAiMove`). It also
 * bails out of the script early — permanently, for the rest of the match — the moment a scripted
 * move stops being sound: the expected knight was captured (the move is no longer legal), or
 * moving it there would hang it to a pawn specifically (any other attacker is fine, see the
 * bailout check itself in `game.tsx`). He always plays white (the scripted knight moves only make
 * sense from the starting squares) — `app/adventure.tsx` forces the player to black for this fight.
 */
export const GARTIN_BOSS: OpponentProfile = {
  id: 'adventure-boss-gartin',
  username: 'Gartin le Malicieux',
  countryCode: 'FR',
  elo: 2100,
  division: 'grand_maitre',
  winRate: 0.85,
  gamesPlayed: 1000,
  style: 'tactique',
  avatar: createAvatarForUsername('Gartin le Malicieux', 'adventure-boss-gartin'),
  aiDepth: 8,
  aiSkillNoise: 0,
  usesSpells: false,
  availableSpellIds: ['explosion'],
  scriptedOpeningMoves: [
    { from: 'g1', to: 'f3' },
    { from: 'f3', to: 'g1' },
    { from: 'b1', to: 'c3' },
    { from: 'c3', to: 'b1' },
    { from: 'g1', to: 'f3' },
    { from: 'f3', to: 'g1' },
    { from: 'b1', to: 'c3' },
    { from: 'c3', to: 'b1' },
  ],
};

/**
 * Second Adventure-mode opponent: a pure-strategy boss who never owns or casts a single spell
 * (see `usesSpells: false` — `app/game.tsx` guards the AI's cosmetic gold/spell-purchase loop on
 * this flag). `aiDepth` sits one above the strongest ranked division (`sorcier_supreme`, depth 8,
 * the deepest search this app has actually been played at) — depth 12 was tried first and hung
 * the whole tab for 10+ seconds mid-game (the search runs synchronously; a slow position at that
 * depth blocks everything, including clicks, until it returns). 9 keeps a real edge over ranked
 * play without leaving proven-safe territory.
 */
export const EDGAR_BOSS: OpponentProfile = {
  id: 'adventure-boss-edgar',
  username: 'Edgar le Moustachu',
  countryCode: 'FR',
  elo: 2400,
  division: 'sorcier_supreme',
  winRate: 0.9,
  gamesPlayed: 1000,
  style: 'positionnel',
  avatar: createAvatarForUsername('Edgar le Moustachu', 'adventure-boss'),
  aiDepth: 9,
  aiSkillNoise: 0,
  usesSpells: false,
};
