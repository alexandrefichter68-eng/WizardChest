import { Platform } from 'react-native';

/**
 * Uses system serif for display text (medieval/fantasy feel without shipping a custom font
 * file) and system default for body text, which keeps bundle size down and guarantees
 * legibility across devices. See docs/ASSETS_TODO.md for the optional custom display font.
 */
export const fontFamily = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
  hero: 44,
};

export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 22,
  lg: 26,
  xl: 28,
  xxl: 34,
  display: 42,
  hero: 50,
};
