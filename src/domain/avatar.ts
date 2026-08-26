import { createSeededRng, randomInt } from '@/utils/random';
import type { AvatarSpec } from '@/types';

function extractInitials(username: string): string {
  const letters = username.replace(/[0-9]/g, '').match(/[A-Za-z]/g);
  if (letters && letters.length > 0) {
    return letters.slice(0, 2).join('').toUpperCase();
  }
  return username.slice(0, 2).toUpperCase() || 'WC';
}

export function createAvatarForUsername(username: string, seed: string | number = username): AvatarSpec {
  const rng = createSeededRng(`avatar:${seed}`);
  return {
    seed: username,
    initials: extractInitials(username),
    hue: randomInt(rng, 0, 359),
    variant: randomInt(rng, 0, 5) as AvatarSpec['variant'],
  };
}
