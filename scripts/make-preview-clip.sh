#!/usr/bin/env bash
# Generate a hover-preview clip for a project card straight from its YouTube
# source — no manual NLE export/trim step needed.
#
# Usage:
#   scripts/make-preview-clip.sh <youtube_url> <start_seconds> [duration_seconds] [slug] [max_width]
#
# Example:
#   scripts/make-preview-clip.sh https://youtu.be/zlLma3YBImc 14 6 sony-a7v-vs-a7iv
#
# Produces: Assets/Video/<slug>_preview.mp4
#   - muted (no audio track — the site always plays these with `muted`)
#   - scaled down to max_width (default 960px, preserving aspect ratio)
#   - h264/mp4, faststart, moderate CRF — much smaller than a raw NLE export

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <youtube_url> <start_seconds> [duration_seconds] [slug] [max_width]" >&2
  exit 1
fi

URL="$1"
START="$2"
DURATION="${3:-6}"
SLUG="${4:-}"
MAX_WIDTH="${5:-960}"

for bin in yt-dlp ffmpeg; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Error: $bin is not installed." >&2; exit 1; }
done

END=$((START + DURATION))

if [ -z "$SLUG" ]; then
  SLUG=$(yt-dlp --print "%(id)s" "$URL")
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$REPO_ROOT/Assets/Video"
OUT_FILE="$OUT_DIR/${SLUG}_preview.mp4"
TMP_RAW=$(mktemp -d)/raw.mp4

trap 'rm -rf "$(dirname "$TMP_RAW")"' EXIT

echo "Downloading ${START}s-${END}s from $URL ..."
yt-dlp \
  --download-sections "*${START}-${END}" \
  --force-keyframes-at-cuts \
  -f "bv*[ext=mp4]" \
  -o "$TMP_RAW" \
  "$URL"

echo "Compressing to $OUT_FILE ..."
ffmpeg -y -i "$TMP_RAW" \
  -an \
  -vf "scale='min(${MAX_WIDTH},iw)':-2" \
  -c:v libx264 -preset medium -crf 26 \
  -movflags +faststart \
  "$OUT_FILE"

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo "Done: $OUT_FILE ($SIZE)"
