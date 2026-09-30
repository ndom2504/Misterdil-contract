// Synthesises the short Misterdil notification chime (two soft bell notes) as a 16-bit mono WAV.
// Run with `node scripts/generate-chime.mjs`; it writes the web and mobile copies.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RATE = 44100;
const DURATION = 0.62;
const notes = [
  { at: 0, freq: 1046.5, gain: 0.55 },
  { at: 0.11, freq: 1568, gain: 0.45 },
];

const samples = new Float32Array(Math.round(RATE * DURATION));
for (const note of notes) {
  const start = Math.round(note.at * RATE);
  for (let i = start; i < samples.length; i += 1) {
    const t = (i - start) / RATE;
    const attack = Math.min(1, t / 0.006);
    const decay = Math.exp(-t * 7.5);
    const tone =
      Math.sin(2 * Math.PI * note.freq * t) +
      0.35 * Math.sin(2 * Math.PI * note.freq * 2 * t) * Math.exp(-t * 14) +
      0.12 * Math.sin(2 * Math.PI * note.freq * 3.01 * t) * Math.exp(-t * 22);
    samples[i] += note.gain * attack * decay * tone;
  }
}

const fadeOut = Math.round(0.04 * RATE);
for (let i = 0; i < fadeOut; i += 1) samples[samples.length - 1 - i] *= i / fadeOut;

const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
const scale = (0.7 / peak) * 32767;
const data = Buffer.alloc(samples.length * 2);
samples.forEach((value, index) => data.writeInt16LE(Math.round(value * scale), index * 2));

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
const wav = Buffer.concat([header, data]);

for (const target of ["public/sounds/misterdil_pop.wav", "mobile/assets/sounds/misterdil_pop.wav"]) {
  const file = join(root, target);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, wav);
  console.log(`${target} (${wav.length} octets)`);
}
