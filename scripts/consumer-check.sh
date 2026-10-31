#!/bin/bash

# Checks a packed pomwright tarball the way consumers install it: with npm, into projects of their own, beside
# @playwright/test at the peer floor.
#   - TypeScript (the repository's version) compiles scripts/consumer/consumer.ts under each module resolution: node10,
#     node16 and nodenext (CommonJS and ESM), and bundler (esnext and preserve), each reading the declarations it should;
#   - attw (@arethetypeswrong/cli, downloaded at a pinned version, never a dependency) reports no problem;
#   - Playwright's runner runs scripts/consumer/runner in a CommonJS and a "type": "module" project;
#   - TypeScript 5.0 and 5.1 (with skipLibCheck: below 5.2, Playwright's declarations and, with the @types/node the
#     repository uses, Node's report errors; POMWright's never do), the latest 5.x, the latest 6.x and the latest release
#     compile the consumer with standard decorators and with experimentalDecorators. The oldest of these is the floor
#     the README badge and the Installation page state; the three move together.
# With --node-floor, only the loading check: import and require give one copy, on the Node that runs it (CI: Node 20, the
# engines floor). Run by the consumer job of .github/workflows/checks.yaml, and by hand:
#   bash scripts/consumer-check.sh [--node-floor] <tarball>

set -euo pipefail

NODE_FLOOR=false
if [[ "${1:-}" == "--node-floor" ]]; then
	NODE_FLOOR=true
	shift
fi
TARBALL="$(realpath "${1:?usage: consumer-check.sh [--node-floor] <tarball>}")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FIXTURES="$SCRIPT_DIR/consumer"

ATTW_VERSION=0.18.5
TYPESCRIPT_VERSIONS=(5.0 5.1 5 6 latest)

dev_dependency() {
	node -p 'require(process.argv[1]).devDependencies[process.argv[2]]' "$ROOT_DIR/package.json" "$1"
}
PLAYWRIGHT="$(dev_dependency @playwright/test)"
TYPES_NODE="$(dev_dependency @types/node)"
TYPESCRIPT="$(dev_dependency typescript)"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# A project of its own with the tarball and @playwright/test at the peer floor, plus any packages given.
project() {
	local dir="$WORK/$1"
	shift
	mkdir -p "$dir"
	(cd "$dir" && npm init -y >/dev/null && npm install --no-audit --no-fund --silent "$TARBALL" \
		"@playwright/test@$PLAYWRIGHT" "$@" >/dev/null)
	echo "$dir"
}

if [[ "$NODE_FLOOR" == true ]]; then
	dir="$(project floor)"
	cp "$FIXTURES/shared.mjs" "$dir/"
	(cd "$dir" && node shared.mjs)
	exit 0
fi

failed() {
	echo "FAILED: $1" >&2
	exit 1
}

# TypeScript under each module resolution, the repository's version; the versions of the loop beside it, aliased
aliases=()
for v in "${TYPESCRIPT_VERSIONS[@]}"; do
	aliases+=("ts-$v@npm:typescript@$v")
done
dir="$(project types "@types/node@$TYPES_NODE" "typescript@$TYPESCRIPT" "${aliases[@]}")"
for extension in ts mts cts; do
	cp "$FIXTURES/consumer.ts" "$dir/consumer.$extension"
done
compile() {
	local name="$1" tsc="$2" file="$3" declarations="$4"
	shift 4
	local listed
	if ! listed="$(cd "$dir" && node "$tsc" --noEmit --strict --target es2022 --types node --listFiles "$@" "$file" 2>&1)"; then
		echo "$listed" >&2
		failed "$name"
	fi
	grep -q "node_modules/pomwright/dist/$declarations\$" <<<"$listed" || failed "$name: $declarations was not read"
	echo "ok: $name"
}
ts="node_modules/typescript/bin/tsc"
version="$(node -p 'require(process.argv[1]).version' "$dir/node_modules/typescript/package.json")"
# node10 is deprecated from TypeScript 6 on, so its warning is silenced; the repository's TypeScript is 6
compile "TypeScript $version, node10" "$ts" consumer.ts index.d.ts --module commonjs --moduleResolution node10 \
	--ignoreDeprecations 6.0
compile "TypeScript $version, node16 CommonJS" "$ts" consumer.cts index.d.ts --module node16
compile "TypeScript $version, node16 ESM" "$ts" consumer.mts index.d.mts --module node16
compile "TypeScript $version, nodenext CommonJS" "$ts" consumer.cts index.d.ts --module nodenext
compile "TypeScript $version, nodenext ESM" "$ts" consumer.mts index.d.mts --module nodenext
compile "TypeScript $version, bundler (esnext)" "$ts" consumer.ts index.d.mts --module esnext --moduleResolution bundler
compile "TypeScript $version, bundler (preserve)" "$ts" consumer.ts index.d.mts --module preserve

# TypeScript 5.0 to the latest release, both decorator modes
for v in "${TYPESCRIPT_VERSIONS[@]}"; do
	tsc="node_modules/ts-$v/bin/tsc"
	version="$(node -p 'require(process.argv[1]).version' "$dir/node_modules/ts-$v/package.json")"
	extra=()
	[[ "$v" == "5.0" || "$v" == "5.1" ]] && extra=(--skipLibCheck)
	compile "TypeScript $version, standard decorators" "$tsc" consumer.ts index.d.mts --module esnext \
		--moduleResolution bundler "${extra[@]}"
	compile "TypeScript $version, experimentalDecorators" "$tsc" consumer.ts index.d.mts --module esnext \
		--moduleResolution bundler --experimentalDecorators "${extra[@]}"
done

# attw
(cd "$dir" && npx --yes "@arethetypeswrong/cli@$ATTW_VERSION" "$TARBALL") || failed "attw $ATTW_VERSION"
echo "ok: attw $ATTW_VERSION"

# Playwright's runner, in a CommonJS and an ESM project
for kind in commonjs module; do
	dir="$(project "runner-$kind")"
	cp "$FIXTURES/runner/"* "$dir/"
	node -e 'const f=process.argv[1]; const p=require(f); p.type=process.argv[2]; require("fs").writeFileSync(f, JSON.stringify(p, null, 2))' \
		"$dir/package.json" "$kind"
	(cd "$dir" && npx playwright test) || failed "Playwright's runner, \"type\": \"$kind\""
	echo "ok: Playwright's runner, \"type\": \"$kind\""
done
