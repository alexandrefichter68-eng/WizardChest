import { createAvatarForUsername } from '@/domain/avatar';
import { getDivisionForElo } from '@/domain/divisions';
import { COUNTRY_CODES, USERNAME_PREFIXES, USERNAME_SUFFIXES } from '@/domain/opponentNames';
import { createSeededRng, pick, randomInt, shuffle } from '@/utils/random';
import type { AvatarSpec, DivisionId, LeaderboardEntry, PlayerProfile } from '@/types';

export interface LeaderboardBot {
  id: string;
  username: string;
  countryCode: string;
  elo: number;
  anchorElo: number;
  seasonStartElo: number;
  avatar: AvatarSpec;
}

const POOL_SIZE = 100;
const DRIFT_WINDOW = 150;
const MAX_DAILY_DRIFT = 14;

/**
 * Builds a spread of Elo anchors around the player's current rating so the leaderboard always
 * looks locally meaningful (some above, some below) while still covering the full division range.
 */
function buildEloAnchors(rng: () => number, playerElo: number): number[] {
  const anchors: number[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const band = i % 5;
    const spread = [-500, -220, 0, 260, 600][band]!;
    const jitter = randomInt(rng, -120, 120);
    anchors.push(Math.max(150, playerElo + spread + jitter));
  }
  return anchors;
}

export function generateLeaderboardPool(playerElo: number, seed: string | number = 'wizardchest-leaderboard'): LeaderboardBot[] {
  const rng = createSeededRng(seed);
  const anchors = buildEloAnchors(rng, playerElo);
  const usedNames = new Set<string>();
  const bots: LeaderboardBot[] = anchors.map((elo, index) => {
    let username = '';
    let attempts = 0;
    do {
      username = `${pick(rng, USERNAME_PREFIXES)}${pick(rng, USERNAME_SUFFIXES)}${randomInt(rng, 1, 9999)}`;
      attempts += 1;
    } while (usedNames.has(username) && attempts < 10);
    usedNames.add(username);
    return {
      id: `bot-${index}-${username}`,
      username,
      countryCode: pick(rng, COUNTRY_CODES),
      elo,
      anchorElo: elo,
      seasonStartElo: elo,
      avatar: createAvatarForUsername(username, rng()),
    };
  });
  return bots;
}

/**
 * Applies one bounded random-walk step per bot, clamped to a window around its original anchor so
 * the leaderboard evolves gradually across sessions without ever producing absurd jumps.
 */
export function driftLeaderboard(bots: LeaderboardBot[], seed: string | number = Date.now()): LeaderboardBot[] {
  const rng = createSeededRng(seed);
  return bots.map((bot) => {
    const delta = randomInt(rng, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT);
    const min = bot.anchorElo - DRIFT_WINDOW;
    const max = bot.anchorElo + DRIFT_WINDOW;
    const elo = Math.max(150, Math.min(max, Math.max(min, bot.elo + delta)));
    return { ...bot, elo };
  });
}

export function resetSeasonAnchors(bots: LeaderboardBot[]): LeaderboardBot[] {
  return bots.map((bot) => ({ ...bot, seasonStartElo: bot.elo }));
}

export type LeaderboardScope = 'global' | 'division' | 'season';

export function buildRankedEntries(
  bots: LeaderboardBot[],
  player: PlayerProfile,
  scope: LeaderboardScope,
): LeaderboardEntry[] {
  const playerEntry: LeaderboardEntry = {
    id: player.id,
    username: player.username,
    countryCode: player.countryCode,
    elo: player.elo,
    division: player.division,
    avatar: player.avatar,
    isPlayer: true,
  };

  const botEntries: LeaderboardEntry[] = bots.map((bot) => ({
    id: bot.id,
    username: bot.username,
    countryCode: bot.countryCode,
    elo: bot.elo,
    division: getDivisionForElo(bot.elo).id,
    avatar: bot.avatar,
    isPlayer: false,
  }));

  let combined = [...botEntries, playerEntry];

  if (scope === 'division') {
    combined = combined.filter((entry) => entry.division === player.division);
  }

  if (scope === 'season') {
    const seasonGains = new Map<string, number>();
    bots.forEach((bot) => seasonGains.set(bot.id, bot.elo - bot.seasonStartElo));
    seasonGains.set(player.id, player.elo - player.elo);
    combined = combined
      .map((entry) => ({ ...entry, elo: seasonGains.get(entry.id) ?? 0 }))
      .sort((a, b) => b.elo - a.elo);
    return combined;
  }

  return combined.sort((a, b) => b.elo - a.elo);
}

export function findPlayerRank(entries: LeaderboardEntry[], playerId: string): number {
  const index = entries.findIndex((entry) => entry.id === playerId);
  return index === -1 ? -1 : index + 1;
}

export function shuffleForDisplay(entries: LeaderboardEntry[], seed: string | number): LeaderboardEntry[] {
  return shuffle(createSeededRng(seed), entries);
}

export const LEADERBOARD_DIVISIONS_ALL: DivisionId[] = [
  'bois', 'bronze', 'argent', 'or', 'platine', 'diamant', 'maitre', 'grand_maitre', 'sorcier_supreme',
];
