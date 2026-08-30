/**
 * Wizard Chess — dark fantasy palette.
 * Stone/ivory board, gold/violet/arcane-blue accents.
 */
export const palette = {
  // Backgrounds
  voidBlack: '#0B0A14',
  stoneDark: '#141225',
  stonePanel: '#1B1830',
  stonePanelRaised: '#241F3D',
  stoneBorder: '#332C55',

  // Board
  boardDark: '#2B2440',
  boardLight: '#D9CBB0',
  boardDarkAlt: '#3A3260',
  boardLightAlt: '#EDE2C9',

  // Ink / text
  ivory: '#F3EFE6',
  ivoryMuted: '#C9C3D8',
  ivoryFaint: '#8B84A6',

  // Accents
  gold: '#E8C15C',
  goldBright: '#FFD97A',
  violet: '#8B6BFF',
  violetBright: '#A88BFF',
  arcaneBlue: '#5AD1E8',
  arcaneBlueBright: '#7FE6FA',

  // Semantic
  success: '#5FD98A',
  danger: '#E8615C',
  warning: '#E8A15C',

  // Overlays
  overlayScrim: 'rgba(8,7,16,0.72)',
  highlightSelected: 'rgba(232,193,92,0.55)',
  highlightLegal: 'rgba(139,107,255,0.45)',
  highlightLastMove: 'rgba(90,209,232,0.28)',
  highlightCheck: 'rgba(232,97,92,0.55)',
} as const;

export const divisionColors = {
  bois: '#8A6A4B',
  bronze: '#B87A3D',
  argent: '#C7CBD1',
  or: '#E8C15C',
  platine: '#8FD9C4',
  diamant: '#7FC7FA',
  maitre: '#B98BFF',
  grandMaitre: '#FF8B6B',
  sorcierSupreme: '#FF6BD8',
} as const;

export const theme = {
  colors: palette,
  divisionColors,
};

export type Theme = typeof theme;
