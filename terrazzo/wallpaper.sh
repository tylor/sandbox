#!/bin/bash
# Renders a fresh terrazzo tile with headless Chrome and sets it as the
# desktop wallpaper. Run hourly by com.tylor.terrazzo-wallpaper (launchd).
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE="file:///Users/tylor/Projects/sandbox/terrazzo/index.html?ui=0&preset=random&seed=random&tile=2048"
DIR="$HOME/Pictures/Terrazzo Wallpapers"
KEEP=24

mkdir -p "$DIR"

# native panel resolution, falling back to the M1 13" default
RES=$(system_profiler SPDisplaysDataType 2>/dev/null | awk '/Resolution/ {print $2 "x" $4; exit}')
[[ "$RES" =~ ^[0-9]+x[0-9]+$ ]] || RES="2560x1600"
W="${RES%x*}"
H="${RES#*x}"

OUT="$DIR/terrazzo-$(date +%Y%m%d-%H%M%S).png"

"$CHROME" --headless --disable-gpu \
  --screenshot="$OUT" \
  --window-size="$W,$H" \
  --virtual-time-budget=10000 \
  "$PAGE" >/dev/null 2>&1

[[ -s "$OUT" ]] || { echo "render failed" >&2; exit 1; }

osascript -e "tell application \"System Events\" to set picture of every desktop to POSIX file \"$OUT\""

# keep only the most recent casts
ls -t "$DIR"/terrazzo-*.png 2>/dev/null | tail -n +$((KEEP + 1)) | while IFS= read -r f; do
  rm -f "$f"
done
