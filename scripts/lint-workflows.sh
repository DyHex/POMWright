#!/bin/bash

# actionlint over .github/workflows, with ShellCheck over their run: scripts, then ShellCheck over the scripts the
# workflows run instead of a run: block. Both tools are pinned here, each version with its SHA-256 (ShellCheck's
# releases publish none: computed from the release archive), so CI and a local run use the same versions whatever the
# machine has; they move by hand, since Dependabot does not see them. Linux x86_64, as CI's runners.
#
#   bash scripts/lint-workflows.sh   # pnpm lint:workflows; CI's lint job
#
# The tools are downloaded once into $RUNNER_TEMP in CI, or node_modules/.cache/lint-workflows locally, and checked
# against their checksums before every use.

set -euo pipefail

ACTIONLINT_VERSION=1.7.12
ACTIONLINT_SHA256=8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8
SHELLCHECK_VERSION=0.11.0
SHELLCHECK_SHA256=8c3be12b05d5c177a04c29e3c78ce89ac86f1595681cab149b65b97c4e227198

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="${RUNNER_TEMP:-$ROOT_DIR/node_modules/.cache/lint-workflows}"
mkdir -p "$TOOLS"

# fetch <url> <archive> <sha256>: the archive in $TOOLS, downloaded unless it is there already, then checked
fetch() {
	[ -f "$TOOLS/$2" ] || curl -sSfL -o "$TOOLS/$2" "$1"
	echo "$3  $TOOLS/$2" | sha256sum --check --strict --quiet
}

archive="actionlint_${ACTIONLINT_VERSION}_linux_amd64.tar.gz"
fetch "https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/${archive}" \
	"$archive" "$ACTIONLINT_SHA256"
tar -xzf "$TOOLS/$archive" -C "$TOOLS" actionlint
archive="shellcheck-v${SHELLCHECK_VERSION}.linux.x86_64.tar.xz"
fetch "https://github.com/koalaman/shellcheck/releases/download/v${SHELLCHECK_VERSION}/${archive}" \
	"$archive" "$SHELLCHECK_SHA256"
tar -xJf "$TOOLS/$archive" -C "$TOOLS" --strip-components=1 "shellcheck-v${SHELLCHECK_VERSION}/shellcheck"

cd "$ROOT_DIR"
# actionlint runs the first shellcheck on PATH: the pinned one
PATH="$TOOLS:$PATH" "$TOOLS/actionlint" -color
# actionlint prints nothing when it finds nothing
echo "actionlint ${ACTIONLINT_VERSION}: no problems in $(cd .github/workflows && echo *.yaml)"
echo "run: scripts checked with ShellCheck $("$TOOLS/shellcheck" --version | sed -n 's/^version: //p')"
# the scripts the workflows run instead of a run: block (pr.yaml's release window, publish.yaml's guard, the lint job's
# test of them, and this one)
"$TOOLS/shellcheck" scripts/release-check.sh scripts/release-check.test.sh scripts/lint-workflows.sh
echo "scripts/release-check.sh, its test and scripts/lint-workflows.sh checked with ShellCheck"
