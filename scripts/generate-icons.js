/**
 * Generates the app icon, splash mark, Android adaptive icon layers and web favicon entirely
 * from an in-code SVG mark (no external image assets, no font dependency — every shape is a
 * primitive so it renders identically on any machine that runs this script). See
 * docs/ASSETS_TODO.md for the higher-fidelity illustrated icon a future update should
 * commission instead of this programmatic placeholder.
 *
 * Run with: npm run generate:icons
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(OUT_DIR, { recursive: true });

const VOID_BLACK = '#0B0A14';
const STONE_DARK = '#141225';
const GOLD = '#E8C15C';
const GOLD_BRIGHT = '#FFD97A';
const VIOLET = '#8B6BFF';

/**
 * A stylized fortress/rook silhouette inside a magic ring — reads clearly at small sizes and
 * needs no font. `bg` toggles the background square (off for the transparent adaptive-icon
 * foreground layer). `mono` forces a single flat color (for the Android monochrome layer).
 */
function buildMarkSvg({ size, bg = true, mono = false }) {
  const towerFill = mono ? '#FFFFFF' : `url(#goldGrad)`;
  const ringStroke = mono ? '#FFFFFF' : GOLD;
  const cx = size / 2;
  const cy = size / 2;
  const towerScale = size / 1024;

  const defs = mono
    ? ''
    : `
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${VIOLET}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${STONE_DARK}" stop-opacity="1" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${GOLD_BRIGHT}" />
        <stop offset="100%" stop-color="${GOLD}" />
      </linearGradient>
    </defs>`;

  const background = bg
    ? `<rect width="${size}" height="${size}" fill="${VOID_BLACK}" />
       <rect width="${size}" height="${size}" fill="${mono ? 'transparent' : 'url(#bgGrad)'}" />`
    : '';

  // Rook/fortress silhouette drawn from primitives, centered around (512,512) at 1024 scale.
  const towerPath = `
    M 372,700 L 372,460 L 652,460 L 652,700 Z
    M 372,460 L 340,380 L 420,380 L 420,320 L 460,320 L 460,380
      L 564,380 L 564,320 L 604,320 L 604,380 L 684,380 L 652,460 Z
    M 340,700 L 684,700 L 700,760 L 324,760 Z
  `;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  ${background}
  <circle cx="${cx}" cy="${cy}" r="${420 * towerScale}" fill="none" stroke="${ringStroke}" stroke-width="${10 * towerScale}" stroke-dasharray="${14 * towerScale} ${26 * towerScale}" opacity="0.85" />
  <circle cx="${cx}" cy="${cy}" r="${360 * towerScale}" fill="none" stroke="${mono ? '#FFFFFF' : VIOLET}" stroke-width="${4 * towerScale}" opacity="0.5" />
  <g transform="scale(${towerScale})">
    <path d="${towerPath}" fill="${towerFill}" />
  </g>
</svg>`;
}

async function renderPng(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log(`  wrote ${path.basename(outPath)} (${size}x${size})`);
}

async function main() {
  console.log('Generating placeholder app icons into assets/images/ …');

  await renderPng(buildMarkSvg({ size: 1024, bg: true }), 1024, path.join(OUT_DIR, 'icon.png'));
  await renderPng(buildMarkSvg({ size: 1024, bg: false }), 1024, path.join(OUT_DIR, 'android-icon-foreground.png'));
  await renderPng(buildMarkSvg({ size: 1024, bg: false, mono: true }), 1024, path.join(OUT_DIR, 'android-icon-monochrome.png'));
  await renderPng(buildMarkSvg({ size: 512, bg: false }), 512, path.join(OUT_DIR, 'splash-icon.png'));
  await renderPng(buildMarkSvg({ size: 196, bg: true }), 196, path.join(OUT_DIR, 'favicon.png'));

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
