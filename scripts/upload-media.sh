#!/usr/bin/env bash
# Upload media files to Backblaze B2 bucket
# Usage: bash scripts/upload-media.sh
#
# Prerequisites:
#   pip install b2
#   b2 authorize-account <applicationKeyId> <applicationKey>
#
# Bucket: prawko-media (must be created first as public)

set -euo pipefail

BUCKET="prawko"
MEDIA_DIR="src/media"
B2="${HOME}/Library/Python/3.14/bin/b2"

if ! "$B2" version >/dev/null 2>&1; then
  echo "Error: b2 CLI not found. Install with: pip install b2"
  exit 1
fi

echo "Uploading images..."
"$B2" sync --threads 10 --skip-newer "$MEDIA_DIR/img/" "b2://$BUCKET/img/"

echo ""
echo "Uploading videos..."
"$B2" sync --threads 4 --skip-newer "$MEDIA_DIR/vid/" "b2://$BUCKET/vid/"

echo ""
echo "Done! Media available at:"
echo "  https://f003.backblazeb2.com/file/$BUCKET/"
