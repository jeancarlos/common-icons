#!/bin/bash
# update-catalog.sh — Trigger a catalog rebuild via GitHub Actions
#
# Checks if @zydon/common has a new version on npm, then triggers the
# GitHub Actions workflow to rebuild and deploy the icon catalog.
#
# Usage:
#   ./scripts/update-catalog.sh          # Check version + trigger if changed
#   ./scripts/update-catalog.sh --force  # Force trigger regardless of version

set -euo pipefail

REPO="jeancarlos/common-icons"
WORKFLOW="build-catalog.yml"
CACHE_FILE="${HOME}/.cache/common-icons-last-version"

mkdir -p "$(dirname "$CACHE_FILE")"

LATEST=$(npm view @zydon/common version 2>/dev/null || echo "unknown")
CACHED=$(cat "$CACHE_FILE" 2>/dev/null || echo "none")

echo "npm @zydon/common: $LATEST"
echo "Last triggered:    $CACHED"

if [ "${1:-}" = "--force" ]; then
  echo "Force trigger requested"
elif [ "$LATEST" = "$CACHED" ]; then
  echo "No version change — skipping"
  exit 0
elif [ "$LATEST" = "unknown" ]; then
  echo "Could not fetch npm version — skipping"
  exit 1
fi

echo "Triggering workflow..."
gh workflow run "$WORKFLOW" -R "$REPO"

echo "$LATEST" > "$CACHE_FILE"
echo "Done — workflow dispatched for v$LATEST"
