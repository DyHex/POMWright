#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTIFACT_NAME="${1:-pomwright-test-build.tgz}"
TEMP_PACK_DIR="$(mktemp -d)"

cleanup() {
	rm -rf "$TEMP_PACK_DIR"
}

trap cleanup EXIT

cd "$SCRIPT_DIR"

pnpm install --frozen-lockfile || { echo "Installation failed"; exit 1; }
pnpm build || { echo "Build failed"; exit 1; }

PACKED_FILE="$(pnpm pack --pack-destination "$TEMP_PACK_DIR" | tail -n 1)" || {
	echo "Packaging failed"
	exit 1
}

rm -f "$SCRIPT_DIR/$ARTIFACT_NAME"
mv "$PACKED_FILE" "$SCRIPT_DIR/$ARTIFACT_NAME" || { echo "Failed to move packed artifact"; exit 1; }

echo "Built $ARTIFACT_NAME"
