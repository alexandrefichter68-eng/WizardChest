/**
 * Standard Elo rating update (FIDE-style), used for player vs AI-opponent results.
 * K-factor is higher for new/low-rated players so early progression feels responsive,
 * and lower for high-rated players so top divisions stay meaningful.
 */
export function getKFactor(elo: number, gamesPlayed: number): number {
  if (gamesPlayed < 20) return 40;
  if (elo < 1300) return 32;
  if (elo < 2000) return 24;
  return 16;
}

export function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

export type MatchScore = 1 | 0.5 | 0;

export function computeEloDelta(
  playerElo: number,
  opponentElo: number,
  score: MatchScore,
  gamesPlayed: number,
): number {
  const k = getKFactor(playerElo, gamesPlayed);
  const expected = expectedScore(playerElo, opponentElo);
  const delta = k * (score - expected);
  return Math.round(delta);
}

export const STARTING_ELO = 800;
export const MIN_ELO = 100;

export function applyEloDelta(currentElo: number, delta: number): number {
  return Math.max(MIN_ELO, currentElo + delta);
}
