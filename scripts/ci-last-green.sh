#!/bin/bash

# Finds the last green commit of a branch: the head commit of the newest successful run of <workflow> (pr.yaml or
# main.yaml) for <event> on <branch> from <head-repo> that is a proper ancestor of <head-sha> and present in the clone.
# A run that succeeded by skipping counts: its skip was justified by an earlier green commit. Prints the commit, or
# nothing when there is none or the runs cannot be read; it never fails the job, so anything uncertain makes
# ci-changes.sh run everything. Needs GH_TOKEN with actions: read in CI.

set -uo pipefail

if [[ $# -ne 6 ]]; then
	echo "usage: ci-last-green.sh <repo> <workflow> <event> <branch> <head-repo> <head-sha>" >&2
	exit 2
fi
REPO="$1" WORKFLOW="$2" EVENT="$3" BRANCH="$4" HEAD_REPO="$5" HEAD_SHA="$6"

if ! runs="$(gh api --method GET "repos/$REPO/actions/workflows/$WORKFLOW/runs" -f event="$EVENT" -f branch="$BRANCH" \
	-f status=success -f per_page=50 2>&1)"; then
	echo "Could not list the successful $WORKFLOW runs: $runs" >&2
	exit 0
fi
if ! candidates="$(jq -r --arg repo "$HEAD_REPO" \
	'.workflow_runs[] | select(.head_repository.full_name == $repo) | .head_sha' <<<"$runs")"; then
	echo "Could not read the list of $WORKFLOW runs." >&2
	exit 0
fi

while read -r sha; do
	[[ -z "$sha" || "$sha" == "$HEAD_SHA" ]] && continue
	if git cat-file -e "$sha^{commit}" 2>/dev/null && git merge-base --is-ancestor "$sha" "$HEAD_SHA" 2>/dev/null; then
		echo "Last green commit: $sha" >&2
		echo "$sha"
		exit 0
	fi
done <<<"$candidates"
echo "No successful $WORKFLOW run on an ancestor of $HEAD_SHA." >&2
