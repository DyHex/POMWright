#!/bin/bash

# Resolves the Playwright version a CI harness job runs on. Row "pin": the harness pin in test/package.json, as
# committed (version is empty, so pack-test.sh swaps nothing). Row "latest": the newest release in the peer range of
# package.json; when that equals the pin, skip=true, because the pin row already runs it.
# Writes version=<version or empty> and skip=<true|false> to $GITHUB_OUTPUT when set, and always to stdout.

set -euo pipefail

ROW="${1:?usage: ci-playwright-version.sh <pin|latest>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

pin="$(node -p 'require(process.argv[1]).devDependencies["@playwright/test"]' "$ROOT_DIR/test/package.json")"
version=""
skip=false

case "$ROW" in
pin) ;;
latest)
	range="$(node -p 'require(process.argv[1]).peerDependencies["@playwright/test"]' "$ROOT_DIR/package.json")"
	# npm view prints a string for one match and an ascending array for several
	version="$(npm view "@playwright/test@$range" version --json |
		node -e 'let d = ""; process.stdin.on("data", (c) => (d += c)).on("end", () => { const v = JSON.parse(d); console.log(Array.isArray(v) ? v.at(-1) : v); })')"
	echo "Newest @playwright/test in $range: $version (pin $pin)"
	if [[ "$version" == "$pin" ]]; then
		skip=true
	fi
	;;
*)
	echo "Unknown row: $ROW"
	exit 1
	;;
esac

echo "version=$version"
echo "skip=$skip"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	{
		echo "version=$version"
		echo "skip=$skip"
	} >>"$GITHUB_OUTPUT"
fi
