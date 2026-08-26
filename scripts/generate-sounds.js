/**
 * Generates small placeholder WAV sound effects and an ambient loop entirely in code (simple
 * synthesized sine/triangle tones with an envelope) — no external audio files, no internet
 * download, no copyrighted material. These are intentionally minimal "programmer art" sounds;
 * see docs/ASSETS_TODO.md for the real sound-design pass a future update should do.
 *
 * Run with: npm run generate:sounds
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

function writeWavFile(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2;
  const blockAlign = 2;
  const dataSize = numSamples * 2;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log(`  wrote ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

function silence(durationSec) {
  return new Array(Math.round(SAMPLE_RATE * durationSec)).fill(0);
}

/** A single tone with an exponential decay envelope (a soft "pluck"/"tock"). */
function tone(freqHz, durationSec, { wave = 'sine', amplitude = 0.5, attack = 0.004, decay = 'exp' } = {}) {
  const n = Math.round(SAMPLE_RATE * durationSec);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const phase = 2 * Math.PI * freqHz * t;
    let raw;
    if (wave === 'sine') raw = Math.sin(phase);
    else if (wave === 'triangle') raw = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else raw = Math.sign(Math.sin(phase)); // square

    let env;
    if (decay === 'exp') {
      env = Math.exp(-4 * (t / durationSec));
    } else {
      env = 1 - t / durationSec;
    }
    const attackEnv = Math.min(1, t / attack);
    out[i] = raw * amplitude * env * attackEnv;
  }
  return out;
}

function concat(...parts) {
  return parts.flat();
}

function mix(...parts) {
  const length = Math.max(...parts.map((p) => p.length));
  const out = new Array(length).fill(0);
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) out[i] += part[i];
  }
  return out;
}

function noiseBurst(durationSec, amplitude = 0.35) {
  const n = Math.round(SAMPLE_RATE * durationSec);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-18 * t);
    out[i] = (Math.random() * 2 - 1) * amplitude * env;
  }
  return out;
}

/** A tone whose frequency slides linearly from `freqStart` to `freqEnd` — a "whoosh"/"boing". */
function sweepTone(freqStart, freqEnd, durationSec, { wave = 'sine', amplitude = 0.4, decay = 'exp' } = {}) {
  const n = Math.round(SAMPLE_RATE * durationSec);
  const out = new Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = freqStart + (freqEnd - freqStart) * (t / durationSec);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    let raw;
    if (wave === 'sine') raw = Math.sin(phase);
    else if (wave === 'triangle') raw = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else raw = Math.sign(Math.sin(phase));
    const env = decay === 'exp' ? Math.exp(-3 * (t / durationSec)) : 1 - t / durationSec;
    out[i] = raw * amplitude * env;
  }
  return out;
}

/** Equal-tempered frequency for a note `semitones` half-steps away from middle C (C4 ≈ 261.63Hz). */
console.log('Generating placeholder SFX into assets/sounds/ …');

// A soft wooden "tock" for regular moves.
writeWavFile('move.wav', tone(220, 0.09, { wave: 'triangle', amplitude: 0.45 }));

// A sharper double-tock + light noise transient for captures.
writeWavFile(
  'capture.wav',
  mix(
    concat(tone(160, 0.1, { wave: 'triangle', amplitude: 0.5 }), silence(0.02)),
    noiseBurst(0.06, 0.3),
  ),
);

// A bright two-note alert for check.
writeWavFile(
  'check.wav',
  concat(tone(660, 0.09, { amplitude: 0.4 }), tone(880, 0.12, { amplitude: 0.42 })),
);

// A descending three-tone dramatic chime for checkmate.
writeWavFile(
  'checkmate.wav',
  concat(
    tone(520, 0.16, { amplitude: 0.45 }),
    tone(390, 0.18, { amplitude: 0.45 }),
    tone(260, 0.32, { amplitude: 0.5, decay: 'exp' }),
  ),
);

// An ascending sparkly arpeggio for promotion.
writeWavFile(
  'promote.wav',
  concat(
    tone(523, 0.07, { amplitude: 0.35 }),
    tone(659, 0.07, { amplitude: 0.35 }),
    tone(784, 0.07, { amplitude: 0.35 }),
    tone(1046, 0.14, { amplitude: 0.4 }),
  ),
);

// A very short high tick for UI buttons.
writeWavFile('click.wav', tone(1200, 0.03, { amplitude: 0.25, attack: 0.001 }));

// A short rising two-tone fanfare for match start.
writeWavFile(
  'game_start.wav',
  concat(tone(392, 0.1, { amplitude: 0.4 }), tone(523, 0.16, { amplitude: 0.45 })),
);

// A neutral flat tone pair for a drawn game.
writeWavFile('draw.wav', concat(tone(440, 0.14, { amplitude: 0.35 }), tone(440, 0.14, { amplitude: 0.3 })));

// Gold/spell SFX ------------------------------------------------------------------------------

// A bright two-blip coin clink for earning gold.
writeWavFile(
  'gold.wav',
  concat(tone(1568, 0.05, { amplitude: 0.3, decay: 'exp' }), tone(2093, 0.09, { amplitude: 0.32, decay: 'exp' })),
);

// A soft page-flip / chime for opening the spell shop.
writeWavFile(
  'shop_open.wav',
  concat(tone(784, 0.05, { wave: 'triangle', amplitude: 0.25 }), tone(988, 0.08, { wave: 'triangle', amplitude: 0.28 })),
);

// A satisfying ascending arpeggio for buying a spell.
writeWavFile(
  'spell_buy.wav',
  concat(
    tone(523, 0.06, { amplitude: 0.3 }),
    tone(659, 0.06, { amplitude: 0.3 }),
    tone(784, 0.06, { amplitude: 0.32 }),
    tone(1046, 0.12, { amplitude: 0.36 }),
  ),
);

// A low boom + noise crack for the Explosion spell.
writeWavFile(
  'spell_explosion.wav',
  mix(
    tone(90, 0.35, { wave: 'triangle', amplitude: 0.55, decay: 'exp' }),
    noiseBurst(0.22, 0.5),
  ),
);

// A quick upward-then-downward pitch sweep — a magical "whoosh" for teleportation.
writeWavFile(
  'spell_teleport.wav',
  concat(sweepTone(300, 1200, 0.14, { wave: 'sine', amplitude: 0.35 }), sweepTone(1200, 500, 0.12, { wave: 'sine', amplitude: 0.3 })),
);

// A soft rising, shimmering ward chime for the Shield spell.
writeWavFile(
  'spell_shield.wav',
  concat(
    tone(392, 0.08, { wave: 'triangle', amplitude: 0.28 }),
    tone(523, 0.08, { wave: 'triangle', amplitude: 0.3 }),
    tone(659, 0.18, { wave: 'triangle', amplitude: 0.32 }),
  ),
);

// A playful "hop" pitch bounce for the Leap spell.
writeWavFile('spell_leap.wav', sweepTone(440, 880, 0.1, { wave: 'triangle', amplitude: 0.32 }));

// Music is no longer generated here — real tracks live in assets/music/ (see src/audio/sounds.ts).

console.log('Done.');
