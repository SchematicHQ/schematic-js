#!/bin/bash
set -euo pipefail

# release-notes.sh - Generate per-module release notes for a tag.
#
# In this monorepo a single git tag (e.g. schematic-js@1.5.0) releases one
# module, but GitHub's auto-generated release notes and the compare view span
# the whole repo — they can't be filtered to a directory, so a schematic-js
# release ends up listing react/, components/, vue/ and angular/ commits too.
#
# This script lists ONLY the commits that touched the tagged module's directory
# since the previous release of THAT module, grouped by conventional-commit
# type, and prints markdown to stdout.
#
# Usage:
#   TAG="schematic-js@1.5.0" ./scripts/release-notes.sh
#   ./scripts/release-notes.sh schematic-js@1.5.0
#
# Requires full history + tags (in CI: actions/checkout with fetch-depth: 0 and
# fetch-tags: true). Portable to macOS bash 3.2 (no mapfile / associative
# arrays / sort -V).

TAG="${TAG:-${1:-}}"
if [[ -z "$TAG" ]]; then
  echo "Error: TAG required (env TAG=... or first arg)" >&2
  echo "Usage: TAG=schematic-js@1.5.0 $0" >&2
  exit 1
fi

PACKAGE="${TAG%@*}"
VERSION="${TAG#*@}"

# Map package -> working directory (mirrors scripts/publish-package.sh).
case "$PACKAGE" in
  schematic-js)         DIR="js" ;;
  schematic-react)      DIR="react" ;;
  schematic-components) DIR="components" ;;
  schematic-vue)        DIR="vue" ;;
  schematic-angular)    DIR="angular" ;;
  *)
    echo "Error: unknown package '$PACKAGE'" >&2
    echo "Valid: schematic-js, schematic-react, schematic-components, schematic-vue, schematic-angular" >&2
    exit 1
    ;;
esac

if [[ "$VERSION" =~ -rc\.[0-9]+$ ]]; then IS_RC=true; else IS_RC=false; fi

# Find the previous release tag for this module via git topology: the closest
# ancestor tag of the tagged commit's parent that matches this package. Stable
# releases skip RC tags so the changelog spans rc -> stable cleanly; RCs
# compare against whatever immediately preceded them.
DESCRIBE_ARGS=(--tags --abbrev=0 --match "${PACKAGE}@*")
if [[ "$IS_RC" == false ]]; then
  DESCRIBE_ARGS+=(--exclude "*-rc.*")
fi
PREV="$(git describe "${DESCRIBE_ARGS[@]}" "${TAG}^" 2>/dev/null || true)"

if [[ -n "$PREV" ]]; then
  RANGE="${PREV}..${TAG}"
else
  RANGE="$TAG" # first release for this module: everything up to the tag
fi

# Resolve the repo URL for the compare link (CI env first, else git remote).
if [[ -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  REPO_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}"
else
  ORIGIN="$(git remote get-url origin 2>/dev/null || echo '')"
  REPO_URL="$(echo "$ORIGIN" | sed -E 's#^git@([^:]+):#https://\1/#; s#\.git$##')"
fi

# Collect and classify commits touching the module directory.
FEATURES=""
FIXES=""
MAINT=""
OTHER=""
MAINT_COUNT=0

while IFS='|' read -r sha subject; do
  [[ -z "$sha" ]] && continue
  line="- ${subject} (${sha})"
  case "$subject" in
    feat*)                                      FEATURES+="${line}"$'\n' ;;
    fix*)                                       FIXES+="${line}"$'\n' ;;
    chore*|build*|ci*|docs*|test*|style*|refactor*)
                                                MAINT+="${line}"$'\n'; MAINT_COUNT=$((MAINT_COUNT + 1)) ;;
    *)                                          OTHER+="${line}"$'\n' ;;
  esac
done < <(git log --no-merges --pretty=format:'%h|%s' "$RANGE" -- "${DIR}/")

# Emit markdown.
printf '## %s@%s\n\n' "$PACKAGE" "$VERSION"
if [[ -n "$PREV" ]]; then
  printf 'Changes in `%s/` since `%s`.\n\n' "$DIR" "$PREV"
else
  printf 'Initial changes in `%s/`.\n\n' "$DIR"
fi

if [[ -n "$FEATURES" ]]; then printf '### Features\n%s\n' "$FEATURES"; fi
if [[ -n "$FIXES" ]];    then printf '### Fixes\n%s\n' "$FIXES"; fi
if [[ -n "$OTHER" ]];    then printf '### Other\n%s\n' "$OTHER"; fi
if [[ -n "$MAINT" ]]; then
  printf '<details><summary>Dependency &amp; maintenance updates (%s)</summary>\n\n%s\n</details>\n\n' "$MAINT_COUNT" "$MAINT"
fi

if [[ -z "$FEATURES$FIXES$OTHER$MAINT" ]]; then
  printf '_No commits touched `%s/` in this range._\n\n' "$DIR"
fi

if [[ -n "$PREV" && -n "$REPO_URL" ]]; then
  printf '**Full diff (all modules):** %s/compare/%s...%s\n' "$REPO_URL" "$PREV" "$TAG"
fi
