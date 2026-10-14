#!/bin/bash

# Decides whether a CI run needs the unit tests, the build and the harness: code=true unless every file changed since
# <base> is a *.md file. <base> is the pull request's base commit or the push's previous commit. Anything uncertain
# (no base, an all-zero base for a new ref, a base git cannot diff against, an empty diff) runs everything.
# Writes code=<true|false> to $GITHUB_OUTPUT when set, and always to stdout.

set -euo pipefail

BASE="${1:-}"
code=true

if [[ -n "$BASE" && ! "$BASE" =~ ^0+$ ]] && files="$(git diff --name-only "$BASE" HEAD)"; then
	printf 'Changed files since %s:\n%s\n' "$BASE" "${files:-(none)}"
	if [[ -n "$files" ]] && ! grep -qv '\.md$' <<<"$files"; then
		code=false
	fi
else
	echo "No usable base commit ('$BASE'); running everything."
fi

echo "code=$code"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "code=$code" >>"$GITHUB_OUTPUT"
fi
