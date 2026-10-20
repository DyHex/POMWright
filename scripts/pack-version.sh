#!/bin/bash

# Packs pomwright with a version of your choosing, for testing a build in another project before it is released:
#   pnpm pack:version 3.0.0-rc.1   ->   pomwright-3.0.0-rc.1.tgz at the repository root (gitignored)
# Only the packed package.json carries the version. The repository's package.json, the harness's tarball and .pack/
# are left alone; the release version still comes from changesets. Nothing else calls this script.

set -euo pipefail

VERSION="${1:-}"
SEMVER='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'
if [[ ! "$VERSION" =~ $SEMVER ]]; then
	echo "usage: pnpm pack:version <version>, a semver version such as 3.0.0-rc.1; received \"$VERSION\"" >&2
	exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="$ROOT_DIR/pomwright-$VERSION.tgz"
WORK_DIR="$(mktemp -d)"

cleanup() {
	rm -rf "$WORK_DIR"
}

trap cleanup EXIT

cd "$ROOT_DIR"

pnpm install --frozen-lockfile
pnpm build

# Pack as npm would publish, then set the version in the packed manifest only and pack the same files again.
PACKED_FILE="$(pnpm pack --pack-destination "$WORK_DIR" | tail -n 1)"
tar -xzf "$PACKED_FILE" -C "$WORK_DIR"
node -e '
	const fs = require("node:fs");
	const [file, version] = process.argv.slice(1);
	const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
	manifest.version = version;
	fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
' "$WORK_DIR/package/package.json" "$VERSION"

rm -f "$OUTPUT"
tar -czf "$OUTPUT" -C "$WORK_DIR" package

echo "Packed $(basename "$OUTPUT") (version $VERSION) from $(git rev-parse --short HEAD)$(git diff --quiet HEAD -- || echo ', with uncommitted changes')"
