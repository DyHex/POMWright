#!/bin/bash

# Decides which CI jobs a run needs. For each <base>, it looks at the files changed between it and <head>
# (git diff <base>...<head>, so from their merge base):
#   code: a file outside website/ that is not a *.md file changed; the unit tests, the build and the harness run.
#   site: code, or a file under website/ changed; the build and the site job (the documentation's checks and the site
#         build) run.
# An output is false when some base shows that its files did not change. The bases are commits it is safe to compare
# against: the last green commit of the branch (ci-last-green.sh) and, on a pull request, its base branch. <head> is the
# commit under test (on a pull request its head commit, not GitHub's merge commit). An empty base, an all-zero base, a
# base git cannot diff against and an empty diff never allow a skip.
# Writes code=<true|false> and site=<true|false> to $GITHUB_OUTPUT when set, and always to stdout.

set -euo pipefail

HEAD_SHA="${1:?usage: ci-changes.sh <head> [<base>...]}"
shift
code=true
site=true

for BASE in "$@"; do
	if [[ -n "$BASE" && ! "$BASE" =~ ^0+$ ]] && files="$(git diff --name-only "$BASE...$HEAD_SHA" 2>/dev/null)"; then
		printf 'Changed files since %s:\n%s\n' "$BASE" "${files:-(none)}"
		if [[ -z "$files" ]]; then
			continue
		fi
		# no pipe: under pipefail a grep -q that stops early would fail the grep feeding it
		outside="$(grep -v '^website/' <<<"$files" || true)"
		if [[ -z "$outside" ]] || ! grep -qv '\.md$' <<<"$outside"; then
			code=false
			if ! grep -q '^website/' <<<"$files"; then
				site=false
			fi
		fi
	else
		echo "No usable base commit ('$BASE')."
	fi
done

echo "code=$code"
echo "site=$site"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	{
		echo "code=$code"
		echo "site=$site"
	} >>"$GITHUB_OUTPUT"
fi
