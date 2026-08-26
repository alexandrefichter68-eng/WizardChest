/**
 * Generated pseudonym fragments for AI opponents. Combined at runtime (prefix + suffix + optional
 * number) to produce hundreds of distinct usernames without hardcoding a flat list of names that
 * could resemble real people. Purely invented fantasy/chess-flavoured fragments.
 */
export const USERNAME_PREFIXES = [
  'Shadow', 'Iron', 'Silent', 'Storm', 'Night', 'Frost', 'Ember', 'Crimson', 'Obsidian', 'Arcane',
  'Rogue', 'Grim', 'Silver', 'Golden', 'Wild', 'Lone', 'Swift', 'Ancient', 'Mystic', 'Rune',
  'Void', 'Astral', 'Crystal', 'Dusk', 'Dawn', 'Wandering', 'Thorn', 'Raven', 'Wolf', 'Hollow',
  'Pale', 'Bright', 'Dark', 'Feral', 'Noble', 'Savage', 'Quiet', 'Fierce', 'Radiant', 'Sable',
] as const;

export const USERNAME_SUFFIXES = [
  'Knight', 'Bishop', 'Rook', 'Pawn', 'Wizard', 'Sorcerer', 'Warden', 'Hunter', 'Wanderer', 'Sage',
  'Blade', 'Fang', 'Ghost', 'Phoenix', 'Serpent', 'Falcon', 'Golem', 'Oracle', 'Ranger', 'Templar',
  'Gambit', 'Tactician', 'Strategist', 'Vagabond', 'Hermit', 'Alchemist', 'Cipher', 'Sentinel', 'Nomad', 'Weaver',
  'Crown', 'Herald', 'Marshal', 'Reaper', 'Warlock', 'Druid', 'Paladin', 'Vandal', 'Mage', 'Scribe',
] as const;

/** ISO 3166-1 alpha-2 codes, used to render flag emoji and give opponents a plausible origin. */
export const COUNTRY_CODES = [
  'FR', 'BE', 'CH', 'CA', 'US', 'GB', 'DE', 'ES', 'IT', 'PT',
  'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'AT', 'IE', 'GR',
  'RU', 'UA', 'TR', 'IN', 'CN', 'JP', 'KR', 'BR', 'AR', 'MX',
  'AU', 'NZ', 'ZA', 'MA', 'EG', 'NG', 'SN', 'AE', 'IL', 'RO',
  'HU', 'RS', 'HR', 'IS', 'AM', 'GE', 'KZ', 'VN', 'ID', 'PH',
] as const;
