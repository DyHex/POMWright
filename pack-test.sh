#!/bin/bash

# Builds and packs pomwright, installs the packed package into test/ with a frozen lockfile, type-checks the harness
# and the examples of the documentation and the README against the published declarations, checks that the API
# reference and the doc comments cover those declarations and that the Error messages page lists every message the
# code throws, downloads the browsers and runs Playwright, then checks where the report places steps
# (test/playwright.steps.config.ts) and, outside CI, that no page of the test server loads anything from another host
# (test-server-check.sh).
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
pnpm -C "$SCRIPT_DIR" exec tsc -p test/tsconfig.legacyDecorators.json
# emits @step's legacy decorator calls as tsc writes them, for the step-location run below
pnpm -C "$SCRIPT_DIR" exec tsc -p test/tsconfig.legacyDecorators.emit.json
node "$SCRIPT_DIR/scripts/check-doc-snippets.mjs"
node "$SCRIPT_DIR/scripts/check-api-coverage.mjs"
node "$SCRIPT_DIR/scripts/check-error-messages.mjs"
# shellcheck disable=SC2086 # PLAYWRIGHT_INSTALL_ARGS is a word list on purpose
pnpm -C "$TEST_DIR" exec playwright install ${PLAYWRIGHT_INSTALL_ARGS:-}
pnpm -C "$TEST_DIR" exec playwright test "$@"
# where the report places steps and their errors: no browser, and a reporter of its own, which no --reporter replaces
pnpm -C "$TEST_DIR" exec playwright test -c playwright.steps.config.ts
# no page of the test server loads anything from another host; CI runs this in a job of its own
if [[ -z "${CI:-}" ]]; then
	"$SCRIPT_DIR/test-server-check.sh"
fi
