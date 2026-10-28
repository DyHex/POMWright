#!/bin/bash

# The release checks of pr.yaml and publish.yaml. A version on main that npm does not have while changesets are pending
# is never published: changesets/action publishes only when no changeset is pending, and its next Version Packages pull
# request bumps past that version. These checks keep main out of that state, and report it when it gets there anyway.
#
#   release-check.sh pull-request   On a pull request's merge commit, whose first parent is main's tip (pr.yaml's
#                                   "Release window" job). Passes when the merged version is on npm, or when the pull
#                                   request sets the version with no changeset pending (the Version Packages pull
#                                   request). Fails at once when it sets the version while changesets are pending (a
#                                   Version Packages pull request brought up to date with main after a changeset
#                                   landed). Otherwise main's version is being published: waits until npm has it.
#   release-check.sh publish        In publish.yaml before changesets/action, with TESTED_SHA (the commit CI tested)
#                                   and GITHUB_OUTPUT. Fails while main's tip has a version npm does not have and
#                                   changesets are pending. Writes current=true only when the tested commit is main's
#                                   tip and the checkout; otherwise current=false, and the newer commit's run goes on.
#
# npm is read in assignments, so a failed `npm view` fails the script with npm's error. Tested by
# scripts/release-check.test.sh, with a fake npm and sleep first on PATH.

set -euo pipefail

MODE="${1:?usage: release-check.sh <pull-request|publish>}"

# The changesets in a commit, counted as @changesets/read counts them: .changeset/*.md but dotfiles, README.md (any
# case), AGENTS.md, CLAUDE.md and GEMINI.md. Empty changesets count: changesets/action does not publish beside them.
pending() {
	git ls-tree --name-only "$1" .changeset/ |
		awk -F/ '$2 ~ /\.md$/ && $2 !~ /^\./ && tolower($2) != "readme.md" && $2 !~ /^(AGENTS|CLAUDE|GEMINI)\.md$/' |
		wc -l
}

version_at() {
	git show "$1:package.json" | jq -r .version
}

# on_npm <version> <npm view pomwright versions --json>; npm answers a string when one version exists
on_npm() {
	jq -e --arg v "$1" 'if type == "array" then any(.[]; . == $v) else . == $v end' <<<"$2" >/dev/null
}

case "$MODE" in
pull-request)
	version="$(version_at HEAD)"
	base="$(version_at HEAD^1)"
	count="$(pending HEAD)"
	versions="$(npm view pomwright versions --json)"
	if on_npm "$version" "$versions"; then
		echo "$version is on npm"
		exit 0
	fi
	if [ "$version" != "$base" ]; then
		if [ "$count" -eq 0 ]; then
			echo "this pull request releases $version"
			exit 0
		fi
		echo "::error::This pull request sets version $version while $count changeset(s) are pending, so $version would never be published: it was brought up to date with main after Publish made it. Wait for Publish to rebuild it."
		exit 1
	fi
	echo "main's version $version is not on npm yet: a release is publishing; waiting for it"
	for _ in $(seq 1 60); do
		sleep 30
		versions="$(npm view pomwright versions --json)"
		if on_npm "$version" "$versions"; then
			echo "$version is on npm now"
			exit 0
		fi
	done
	echo "::error::main's version $version is still not on npm after 30 minutes. Check its Publish run; if it cannot publish, revert the Version Packages pull request that set $version."
	exit 1
	;;
publish)
	: "${TESTED_SHA:?TESTED_SHA must name the commit CI tested}" "${GITHUB_OUTPUT:?}"
	# main's tip now, from GitHub: a re-run keeps the checkout of its first start
	git fetch --quiet --no-tags origin refs/heads/main
	tip="$(git rev-parse FETCH_HEAD)"
	version="$(version_at "$tip")"
	count="$(pending "$tip")"
	if [ "$count" -gt 0 ]; then
		versions="$(npm view pomwright versions --json)"
		if ! on_npm "$version" "$versions"; then
			sleep 330 # npm's list of versions can be five minutes old right after a publish (max-age=300)
			versions="$(npm view pomwright versions --json)"
			if ! on_npm "$version" "$versions"; then
				echo "::error::Version $version on main is not on npm, and $count changeset(s) are pending, so it would never be published. Revert the Version Packages pull request that set $version before merging anything else."
				exit 1
			fi
		fi
	fi
	if [ "$tip" = "$TESTED_SHA" ] && [ "$(git rev-parse HEAD)" = "$TESTED_SHA" ]; then
		echo "current=true" >>"$GITHUB_OUTPUT"
	else
		echo "current=false" >>"$GITHUB_OUTPUT"
		echo "main has moved past $TESTED_SHA to $tip; the newer commit's own run continues the release"
	fi
	;;
*)
	echo "usage: release-check.sh <pull-request|publish>" >&2
	exit 2
	;;
esac
