#!/bin/bash

# Decides whether a CI run needs the unit tests, the build and the harness: code=false when, for any <base>, the files
# changed between it and <head> (git diff <base>...<head>, so from their merge base) are all *.md files; code=true
# otherwise. The bases are commits it is safe to compare against: the last green commit of the branch
# (ci-last-green.sh) and, on a pull request, its base branch. <head> is the commit under test (on a pull request its
# head commit, not GitHub's merge commit). An empty base, an all-zero base, a base git cannot diff against and an empty
# diff never allow a skip.
# Writes code=<true|false> to $GITHUB_OUTPUT when set, and always to stdout.

set -euo pipefail

HEAD_SHA="${1:?usage: ci-changes.sh <head> [<base>...]}"
shift
code=true

for BASE in "$@"; do
	if [[ -n "$BASE" && ! "$BASE" =~ ^0+$ ]] && files="$(git diff --name-only "$BASE...$HEAD_SHA" 2>/dev/null)"; then
		printf 'Changed files since %s:\n%s\n' "$BASE" "${files:-(none)}"
		if [[ -n "$files" ]] && ! grep -qv '\.md$' <<<"$files"; then
			code=false
			break
		fi
	else
		echo "No usable base commit ('$BASE')."
	fi
done

echo "code=$code"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "code=$code" >>"$GITHUB_OUTPUT"
fi
