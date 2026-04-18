#!/usr/bin/env bun
/**
 * Generate pre-computed waveform peaks JSON for tKids audio teasers.
 *
 * Runs LOCALLY (not in CI/build) because Cloudflare's build environment
 * has no ffmpeg. The output JSON is committed to apps/web/public/audio/
 * alongside the AAC file, so the player loads peaks instantly and
 * wavesurfer renders the waveform without decoding.
 *
 * Usage:
 *   bun run peaks                    # uses default ignite-teaser.m4a
 *   bun run peaks path/to/file.m4a   # custom input
 *
 * Requires ffmpeg on PATH.
 */
import { spawn } from "bun";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_INPUT = "apps/web/public/audio/ignite-teaser.m4a";
const SAMPLES_PER_PIXEL = 512; // ~100-300 samples per track is plenty visually
const TARGET_POINTS = 1000;

async function main() {
  const input = process.argv[2] ?? DEFAULT_INPUT;
  const base = path.basename(input, path.extname(input));
  const outDir = path.dirname(input);
  const outPath = path.join(outDir, `${base}.peaks.json`);

  console.log(`[peaks] input:  ${input}`);
  console.log(`[peaks] output: ${outPath}`);

  // Use ffmpeg to decode to raw 16-bit signed little-endian mono PCM at a
  // low sample rate, then sample N buckets.
  const proc = spawn({
    cmd: [
      "ffmpeg",
      "-loglevel", "error",
      "-i", input,
      "-ac", "1",
      "-ar", "8000",
      "-f", "s16le",
      "-",
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  const raw = await new Response(proc.stdout).arrayBuffer();
  const exit = await proc.exited;
  if (exit !== 0) {
    const err = await new Response(proc.stderr).text();
    console.error(`[peaks] ffmpeg failed:\n${err}`);
    process.exit(1);
  }

  const samples = new Int16Array(raw);
  const totalSamples = samples.length;
  const bucketSize = Math.floor(totalSamples / TARGET_POINTS);
  const peaks: number[] = [];

  for (let i = 0; i < TARGET_POINTS; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, totalSamples);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j]!);
      if (v > max) max = v;
    }
    peaks.push(max / 32768);
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, JSON.stringify([peaks]));
  console.log(`[peaks] wrote ${peaks.length} points`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
