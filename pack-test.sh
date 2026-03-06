#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/test"
PACKAGE_FILE="pomwright-test-build.tgz"

if [[ ! -d "$TEST_DIR" ]]; then
	echo "The ./test directory does not exist."
	exit 1
fi

"$SCRIPT_DIR/pack-build.sh" "$PACKAGE_FILE"

cd "$TEST_DIR" || { echo "Changing directory to ./test failed"; exit 1; }

pnpm install --no-frozen-lockfile || { echo "Installation failed"; exit 1; }
pnpm playwright install --with-deps || { echo "Playwright dependencies installation failed"; exit 1; }
pnpm playwright test --project=chromium || { echo "Tests failed"; exit 1; }

echo "Testing completed successfully."
