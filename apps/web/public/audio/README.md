# tKids audio assets

Files served from `/audio/*` at runtime. In production these are hosted
on Cloudflare R2 (bucket `tkids-audio`) via the binding in
`packages/infra/alchemy.run.ts`; in local dev they're served from this
directory.

## Expected files at launch

- `ignite-teaser.m4a` — 30–60 sec teaser clip of "Ignite!" (AAC 128
  kbps, mono or stereo, -14 LUFS target for web streaming). Uploaded
  by the band's mastering engineer; committed here for local dev.
- `ignite-teaser.peaks.json` — pre-computed waveform peaks generated
  locally via `bun run peaks`. Committed alongside the AAC.

## Regenerating peaks

```bash
bun run peaks                                      # default input
bun run peaks apps/web/public/audio/some.m4a        # custom input
```

Requires `ffmpeg` on PATH. The peaks JSON lets wavesurfer.js draw the
waveform without decoding the full AAC file — critical for iOS Safari
performance.

## Why local, not CI?

Cloudflare's Worker build environment doesn't ship ffmpeg. Attempting
to compute peaks during `astro build` would fail. Committing the peaks
JSON is simpler than wiring a remote-ffmpeg worker or a GitHub Action.
