#!/bin/bash

# Builds and packs pomwright, installs the packed package into test/ with a frozen lockfile, type-checks the harness
# and the documentation's examples against the published declarations, checks that the API reference and the doc
# comments cover those declarations, downloads the browsers and runs Playwright.
# Arguments go to `playwright test`:
#   pnpm pack-test --project=chromium tests/testApp/testIds.spec.ts --reporter=line
# Never needs sudo. Playwright's system libraries are a once-per-machine step (`pnpm -C test exec playwright
# install-deps`, with sudo; `install-deps --dry-run` lists what is missing without it).
#
# Switches, set by CI:
#   POMWRIGHT_TARBALL=<path>         test this tarball instead of building one (installs the root for tsc only)
#   PLAYWRIGHT_VERSION=<version>     swap @playwright/test at the root and in test/ after the frozen install; rewrites
#                                    both package.json files and both lockfiles, so it is meant for CI checkouts
#   PLAYWRIGHT_INSTALL_ARGS=<args>   arguments for `playwright install`, e.g. "--with-deps firefox"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/test"

if [[ -n "${POMWRIGHT_TARBALL:-}" ]]; then
	pnpm -C "$SCRIPT_DIR" install --frozen-lockfile
	"$SCRIPT_DIR/pack-extract.sh" "$POMWRIGHT_TARBALL"
else
	"$SCRIPT_DIR/pack-build.sh" pomwright-test-build.tgz
fi

pnpm -C "$TEST_DIR" install --frozen-lockfile

if [[ -n "${PLAYWRIGHT_VERSION:-}" ]]; then
	pnpm -C "$SCRIPT_DIR" add -D -E "@playwright/test@$PLAYWRIGHT_VERSION"
	pnpm -C "$TEST_DIR" add -D -E "@playwright/test@$PLAYWRIGHT_VERSION"
fi

pnpm -C "$SCRIPT_DIR" exec tsc --noEmit -p test
pnpm -C "$SCRIPT_DIR" exec tsc -p test/tsconfig.declarations.json
node "$SCRIPT_DIR/scripts/check-doc-snippets.mjs"
node "$SCRIPT_DIR/scripts/check-api-coverage.mjs"
# shellcheck disable=SC2086 # PLAYWRIGHT_INSTALL_ARGS is a word list on purpose
pnpm -C "$TEST_DIR" exec playwright install ${PLAYWRIGHT_INSTALL_ARGS:-}
pnpm -C "$TEST_DIR" exec playwright test "$@"
