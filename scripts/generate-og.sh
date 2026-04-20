#!/usr/bin/env bash
# Generate the OG share image + Apple touch icon from the templates in this dir.
# Uses the gstack browse binary (headless Chrome) — no Playwright install needed.
#
# Run: bun run og

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B="$HOME/.claude/skills/gstack/browse/dist/browse"

if [ ! -x "$B" ]; then
  echo "error: gstack browse binary not found at $B" >&2
  exit 1
fi

cd "$ROOT/scripts"
python3 -m http.server 9876 > /tmp/og-server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null || true" EXIT
sleep 1

cd "$ROOT"
mkdir -p apps/web/public/og

# OG card 1200x630 (og:image + twitter:image)
"$B" viewport 1200x630
"$B" goto "http://localhost:9876/og-template.html"
sleep 3  # fonts settle
"$B" screenshot --clip 0,0,1200,630 apps/web/public/og/default.png
echo "  wrote apps/web/public/og/default.png (1200x630)"

# Apple touch icon 180x180
"$B" viewport 180x180
"$B" goto "http://localhost:9876/touch-icon-template.html"
sleep 2
"$B" screenshot --clip 0,0,180,180 apps/web/public/apple-touch-icon.png
echo "  wrote apps/web/public/apple-touch-icon.png (180x180)"

echo "done"
