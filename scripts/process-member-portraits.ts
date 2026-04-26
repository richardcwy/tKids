// One-off: take the four character illustrations from /Profile Pic/, remove
// the solid-color background by sampling corners, resize to 1024x1024 max,
// and save as transparent PNGs into apps/web/src/assets/members/.
//
//   bun run scripts/process-member-portraits.ts
//
// Source backgrounds vary (mint green, lavender, grey). We sample the top-left
// + top-right corner pixels and flood any pixel within a perceptual distance
// to alpha 0. Edges get a soft feather so the cutout doesn't look like a hard
// magic-wand selection.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Set WHICH=alt to read from /ProfilePic_Alt instead of /Profile Pic.
// Output filenames stay the same (ethan.png / alan.png / albert.png / mst.png)
// so we just overwrite in place — no Astro import paths to update.
//
// Set KEEP_TRANSPARENT=true when the source PNGs ALREADY have a transparent
// background (e.g. user-prepared cutouts). Skips the corner-sampled bg
// removal which would otherwise misread an opaque corner pixel of the
// figure as the bg color and chew holes through the artwork.
const USE_ALT = process.env.WHICH === "alt";
const KEEP_TRANSPARENT = process.env.KEEP_TRANSPARENT === "true";
const SRC_DIR = path.resolve(
  import.meta.dir,
  USE_ALT ? "../../ProfilePic_Alt" : "../../Profile Pic",
);
const OUT_DIR = path.resolve(
  import.meta.dir,
  "../apps/web/src/assets/members",
);

const FILES = USE_ALT
  ? ([
      { src: "ethan_v2.png", out: "ethan.webp" },
      { src: "alan_v2.png", out: "alan.webp" },
      { src: "albert_v2.png", out: "albert.webp" },
      { src: "t_v2.png", out: "mst.webp" },
    ] as const)
  : ([
      { src: "Ethan.png", out: "ethan.webp" },
      { src: "Alan.png", out: "alan.webp" },
      { src: "Albert.png", out: "albert.webp" },
      { src: "Ms.T.png", out: "mst.webp" },
    ] as const);

// pixel distance threshold for "this is the background" — tuned for the four
// source PNGs which all have flat, near-uniform single-color backgrounds.
const COLOR_THRESHOLD = 40;
// outer feather radius (px in working space) so the alpha mask doesn't have a
// jagged 1-px boundary
const FEATHER = 1.5;
// max output size — cards render at ~400px tall, so 1024 leaves headroom for
// retina without paying for the full 2k+ source
const MAX_SIDE = 1024;

await mkdir(OUT_DIR, { recursive: true });

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

for (const { src, out } of FILES) {
  const srcPath = path.join(SRC_DIR, src);
  const outPath = path.join(OUT_DIR, out);

  console.log(`processing ${src} → ${out}`);

  if (KEEP_TRANSPARENT) {
    // Source already has a transparent bg — just resize + re-encode as WebP
    // with alpha preserved. WebP shrinks transfer size 60-80% vs PNG with
    // no perceptible quality loss at q=88 for illustrated artwork.
    await sharp(srcPath)
      .resize(MAX_SIDE, MAX_SIDE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, alphaQuality: 95, effort: 6 })
      .toFile(outPath);
    const stats = await sharp(outPath).metadata();
    console.log(
      `  (kept source alpha) wrote ${outPath} (${stats.width}x${stats.height})`,
    );
    continue;
  }

  // first resize to working size, then read raw pixels
  const img = sharp(srcPath).resize(MAX_SIDE, MAX_SIDE, {
    fit: "inside",
    withoutEnlargement: true,
  });
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error(`expected 4 channels, got ${channels} for ${src}`);
  }

  // sample 8 corner-region pixels (4 corners × 2 inset variants) to estimate
  // the background color robustly, even if a sparkle / signature touches a corner
  const samples: [number, number][] = [
    [4, 4],
    [width - 5, 4],
    [4, height - 5],
    [width - 5, height - 5],
    [16, 16],
    [width - 17, 16],
    [16, height - 17],
    [width - 17, height - 17],
  ];

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const [x, y] of samples) {
    const i = (y * width + x) * 4;
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
  }
  const bgR = sumR / samples.length;
  const bgG = sumG / samples.length;
  const bgB = sumB / samples.length;
  console.log(
    `  bg color rgb(${bgR.toFixed(0)}, ${bgG.toFixed(0)}, ${bgB.toFixed(0)})`,
  );

  // build a mask: alpha = 255 where pixel is far from bg, ramping to 0 within
  // [threshold, threshold + feather*threshold/4]
  const mask = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const d = colorDistance(r, g, b, bgR, bgG, bgB);

      let a: number;
      if (d <= COLOR_THRESHOLD) {
        a = 0;
      } else if (d <= COLOR_THRESHOLD + FEATHER * 8) {
        a = Math.round(((d - COLOR_THRESHOLD) / (FEATHER * 8)) * 255);
      } else {
        a = 255;
      }

      mask[i] = r;
      mask[i + 1] = g;
      mask[i + 2] = b;
      mask[i + 3] = a;
    }
  }

  await sharp(mask, { raw: { width, height, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(outPath);

  const stats = await sharp(outPath).metadata();
  console.log(
    `  wrote ${outPath} (${stats.width}x${stats.height})`,
  );
}

console.log("\ndone. four portraits in apps/web/src/assets/members/");
