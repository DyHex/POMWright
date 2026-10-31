#!/bin/bash
# Checks that no page of the test server loads anything from another host (test/test-server/, with
# test/playwright.test-server.config.ts): every route test/server.js lists opened in chromium, and a scan of the
# server's source and test data. pack-test.sh runs it at its end outside CI; CI runs it in a job of its own ("Test
# server: no external requests"), since it depends on no browser, Playwright version or Node line.
# Arguments go to `playwright test`. Without the switch below it uses test/ as pack-test.sh left it installed.
#
# Switches, set by CI:
#   POMWRIGHT_TARBALL=<path>         extract this tarball and install test/ first (test/'s install needs the package)
#   PLAYWRIGHT_INSTALL_ARGS=<args>   arguments for `playwright install` with POMWRIGHT_TARBALL, e.g.
#                                    "--with-deps chromium" (default "chromium")
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/test"
if [[ -n "${POMWRIGHT_TARBALL:-}" ]]; then
	"$SCRIPT_DIR/pack-extract.sh" "$POMWRIGHT_TARBALL"
	pnpm -C "$TEST_DIR" install --frozen-lockfile
	# shellcheck disable=SC2086 # PLAYWRIGHT_INSTALL_ARGS is a word list on purpose
	pnpm -C "$TEST_DIR" exec playwright install ${PLAYWRIGHT_INSTALL_ARGS:-chromium}
fi
pnpm -C "$TEST_DIR" exec playwright test -c playwright.test-server.config.ts "$@"
