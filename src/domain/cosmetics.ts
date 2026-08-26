export interface BoardThemeDef {
  id: string;
  nameKey: string;
  darkSquare: string;
  lightSquare: string;
  requiredDivisionOrder: number;
}

export interface PieceThemeDef {
  id: string;
  nameKey: string;
  whiteColor: string;
  blackColor: string;
  glow: string;
  requiredDivisionOrder: number;
}

export const BOARD_THEMES: BoardThemeDef[] = [
  {
    id: 'pierre_ivoire',
    nameKey: 'cosmetic.board.pierre_ivoire',
    darkSquare: '#3D3560',
    lightSquare: '#D9CBB0',
    requiredDivisionOrder: 0,
  },
  {
    id: 'obsidienne_or',
    nameKey: 'cosmetic.board.obsidienne_or',
    darkSquare: '#2C2640',
    lightSquare: '#E8C15C',
    requiredDivisionOrder: 3,
  },
  {
    id: 'marbre_arcane',
    nameKey: 'cosmetic.board.marbre_arcane',
    darkSquare: '#352D54',
    lightSquare: '#7FE6FA',
    requiredDivisionOrder: 5,
  },
  {
    id: 'flamme_sorciere',
    nameKey: 'cosmetic.board.flamme_sorciere',
    darkSquare: '#3B1D31',
    lightSquare: '#FF8B6B',
    requiredDivisionOrder: 8,
  },
];

export const PIECE_THEMES: PieceThemeDef[] = [
  {
    id: 'classique',
    nameKey: 'cosmetic.piece.classique',
    whiteColor: '#F6F1E4',
    // Deliberately far from `pierre_ivoire.darkSquare` (#3D3560) so black pieces never blend
    // into dark squares — see ChessBoard's contrast glow for the rest of the fix.
    blackColor: '#1E1A30',
    glow: 'transparent',
    requiredDivisionOrder: 0,
  },
  {
    id: 'runique',
    nameKey: 'cosmetic.piece.runique',
    whiteColor: '#FFD97A',
    blackColor: '#8B6BFF',
    glow: '#8B6BFF',
    requiredDivisionOrder: 2,
  },
  {
    id: 'spectral',
    nameKey: 'cosmetic.piece.spectral',
    whiteColor: '#7FE6FA',
    blackColor: '#FF6BD8',
    glow: '#5AD1E8',
    requiredDivisionOrder: 6,
  },
];

export function getUnlockedBoardThemes(divisionOrder: number): BoardThemeDef[] {
  return BOARD_THEMES.filter((theme) => theme.requiredDivisionOrder <= divisionOrder);
}

export function getUnlockedPieceThemes(divisionOrder: number): PieceThemeDef[] {
  return PIECE_THEMES.filter((theme) => theme.requiredDivisionOrder <= divisionOrder);
}

export function getBoardTheme(id: string): BoardThemeDef {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0]!;
}

export function getPieceTheme(id: string): PieceThemeDef {
  return PIECE_THEMES.find((t) => t.id === id) ?? PIECE_THEMES[0]!;
}
