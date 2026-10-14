#!/bin/bash

# Extracts a packed pomwright tarball into .pack/pomwright, the directory the harness in test/ depends on.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARBALL="${1:?usage: pack-extract.sh <tarball>}"
TARGET_DIR="$SCRIPT_DIR/.pack/pomwright"

[[ -f "$TARBALL" ]] || { echo "No such tarball: $TARBALL"; exit 1; }

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
tar -xzf "$TARBALL" -C "$TARGET_DIR" --strip-components=1
