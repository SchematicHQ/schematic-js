#!/bin/bash
set -euo pipefail

# commits-touching-dir.sh - List commits between two refs that touch a directory
#
# Usage:
#   ./scripts/commits-touching-dir.sh <dir> <commit1> <commit2>
#
# Example:
#   ./scripts/commits-touching-dir.sh react/ schematic-react@1.4.0 schematic-react@1.4.1

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <dir> <commit1> <commit2>" >&2
  exit 1
fi

dir="$1"
commit1="$2"
commit2="$3"

git log --oneline "${commit1}..${commit2}" -- "${dir}"

