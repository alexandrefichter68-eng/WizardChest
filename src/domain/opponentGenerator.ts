import { createAvatarForUsername } from '@/domain/avatar';
import { getDivisionForElo } from '@/domain/divisions';
import { COUNTRY_CODES, USERNAME_PREFIXES, USERNAME_SUFFIXES } from '@/domain/opponentNames';
import { createSeededRng, pick, randomFloat, randomInt } from '@/utils/random';
import type { OpponentProfile, PlayStyle } from '@/types';

const PLAY_STYLES: PlayStyle[] = ['agressif', 'prudent', 'tactique', 'positionnel', 'amateur'];

function generateUsername(rng: () => number): string {
  const prefix = pick(rng, USERNAME_PREFIXES);
  const suffix = pick(rng, USERNAME_SUFFIXES);
  const withNumber = rng() < 0.4;
  const number = withNumber ? randomInt(rng, 1, 999) : null;
  return `${prefix}${suffix}${number ?? ''}`;
}

/**
 * Elo used to pick the opponent's win rate/games-played "backstory" — kept close to the
 * player's own rating so the matchup always looks credible, with a small random spread.
 */
function generateOpponentElo(rng: () => number, playerElo: number): number {
  const spread = randomInt(rng, -80, 80);
  return Math.max(100, playerElo + spread);
}

export function generateOpponentProfile(playerElo: number, seedSuffix: string | number = Date.now()): OpponentProfile {
  const rng = createSeededRng(`opponent:${seedSuffix}`);
  const elo = generateOpponentElo(rng, playerElo);
  const division = getDivisionForElo(elo);
  const username = generateUsername(rng);
  const style = pick(rng, PLAY_STYLES);
  const gamesPlayed = randomInt(rng, 12, 640);
  const baseWinRate = 0.5 + (elo - 1200) / 4000;
  const winRate = Math.max(0.32, Math.min(0.78, baseWinRate + randomFloat(rng, -0.08, 0.08)));

  const depthJitter = rng() < 0.2 ? 1 : 0;
  const aiDepth = Math.max(1, division.aiDepth - (style === 'amateur' ? 1 : 0) + depthJitter);
  const noiseAdjust = style === 'amateur' ? 0.15 : style === 'tactique' ? -0.05 : 0;
  const aiSkillNoise = Math.max(0, Math.min(0.9, division.aiSkillNoise + noiseAdjust + randomFloat(rng, -0.05, 0.05)));

  return {
    id: `${username}-${Math.floor(rng() * 1e9)}`,
    username,
    countryCode: pick(rng, COUNTRY_CODES),
    elo,
    division: division.id,
    winRate,
    gamesPlayed,
    style,
    avatar: createAvatarForUsername(username, rng()),
    aiDepth,
    aiSkillNoise,
  };
}

/**
 * Keeps a rolling window of recently-seen opponent usernames so matchmaking doesn't repeat the
 * same face twice in a row. A very rare (~4%) chance intentionally re-serves a recent opponent to
 * simulate "running into someone again", per spec.
 */
export class OpponentRotation {
  private recent: OpponentProfile[] = [];
  private readonly maxHistory = 30;
  private readonly rematchChance = 0.04;

  next(playerElo: number): { opponent: OpponentProfile; isRematch: boolean } {
    const rng = createSeededRng(`rotation:${Date.now()}:${Math.random()}`);
    if (this.recent.length > 5 && rng() < this.rematchChance) {
      return { opponent: pick(rng, this.recent), isRematch: true };
    }
    let candidate = generateOpponentProfile(playerElo, `${Date.now()}:${Math.random()}`);
    let attempts = 0;
    while (this.recent.some((p) => p.username === candidate.username) && attempts < 5) {
      candidate = generateOpponentProfile(playerElo, `${Date.now()}:${Math.random()}:${attempts}`);
      attempts += 1;
    }
    this.recent.push(candidate);
    if (this.recent.length > this.maxHistory) this.recent.shift();
    return { opponent: candidate, isRematch: false };
  }
}

/** App-lifetime singleton: keeps opponent variety consistent across matchmaking calls. */
export const opponentRotation = new OpponentRotation();
