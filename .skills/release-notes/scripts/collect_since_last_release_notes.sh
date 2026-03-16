#!/usr/bin/env bash
set -euo pipefail

# Collects commits and touched files since RELEASE_NOTES.md was last modified.
# Also outputs the version range (from-version and to-version) for the header.

RELEASE_FILE="RELEASE_NOTES.md"

# Find the last commit that touched RELEASE_NOTES.md
anchor_commit="$(git log -1 --format="%H" -- "$RELEASE_FILE" 2>/dev/null || true)"

if [[ -z "$anchor_commit" ]]; then
    echo "ERROR: No commit found that modified $RELEASE_FILE"
    exit 1
fi

anchor_short="$(git log -1 --format="%h" "$anchor_commit")"
anchor_subject="$(git log -1 --format="%s" "$anchor_commit")"

# Determine the "from" version: nearest tag at or before the anchor commit
from_version="$(git describe --tags --abbrev=0 "$anchor_commit" 2>/dev/null || echo "unknown")"

# Determine the "to" version: current version from package.json
to_version="v$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")"

# Production URL from package.json
prod_url="$(node -e "console.log(require('./package.json').app?.productionUrl || '')" 2>/dev/null || true)"

range="${anchor_commit}..HEAD"

# Check if there are any commits in this range
commit_count="$(git rev-list --count "$range" 2>/dev/null || echo "0")"
if [[ "$commit_count" -eq 0 ]]; then
    echo "No new commits since $RELEASE_FILE was last modified ($anchor_short: $anchor_subject)"
    exit 0
fi

printf "== Meta ==\n"
printf "Anchor commit: %s (%s)\n" "$anchor_short" "$anchor_subject"
printf "From version: %s\n" "$from_version"
printf "To version: %s\n" "$to_version"
printf "Production URL: %s\n" "$prod_url"
printf "Commits in range: %s\n" "$commit_count"

printf "\n== Commits ==\n"
git log --reverse --date=short --pretty=format:'%h|%ad|%s' "$range"

printf "\n\n== Files Touched ==\n"
git log --reverse --name-only --pretty=format:'--- %h %s' "$range" | sed '/^$/d'

printf "\n\n== Previous Release Notes ==\n"
cat "$RELEASE_FILE"
