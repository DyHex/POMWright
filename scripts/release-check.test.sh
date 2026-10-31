#!/bin/bash

# Tests scripts/release-check.sh on every path a release can take, in throwaway git repositories, with a fake npm and
# sleep first on PATH (no network, no waiting). Publish runs in a clone of a bare origin, checked out where its run's
# GITHUB_SHA would be; a pull request runs on a merge commit built as GitHub builds refs/pull/N/merge (first parent:
# main's tip). Each path compares the exit code, the current= output and a part of the message with what it should be,
# and the test exits 1 on any difference. The lint job runs it; it runs locally as it is.

set -euo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/release-check.sh"
CONFIG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.changeset"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK:?}"' EXIT
export FAKE_NPM="$WORK/npm"
mkdir -p "$WORK/bin" "$FAKE_NPM"

# The fake npm answers `npm view pomwright versions --json` from $FAKE_NPM/versions; with a count in $FAKE_NPM/stale it
# answers $FAKE_NPM/old that many times first (npm's list before a publish shows); $FAKE_NPM/down makes it fail.
cat >"$WORK/bin/npm" <<'EOF'
#!/bin/bash
echo x >>"$FAKE_NPM/reads"
[ -e "$FAKE_NPM/down" ] && { echo "npm error code ECONNRESET" >&2; exit 1; }
if [ -s "$FAKE_NPM/stale" ] && [ "$(cat "$FAKE_NPM/stale")" -gt 0 ]; then
	echo $(($(cat "$FAKE_NPM/stale") - 1)) >"$FAKE_NPM/stale"
	cat "$FAKE_NPM/old"
	exit 0
fi
cat "$FAKE_NPM/versions"
EOF
printf '#!/bin/bash\n' >"$WORK/bin/sleep"
chmod +x "$WORK/bin/npm" "$WORK/bin/sleep"

OLD='["3.0.0","3.0.1"]'
NEW='["3.0.0","3.0.1","3.0.2"]'
npm_lists() { printf '%s\n' "$1" >"$FAKE_NPM/versions"; rm -f "$FAKE_NPM/stale" "$FAKE_NPM/down"; }
npm_publishes_after() { npm_lists "$NEW"; echo "$OLD" >"$FAKE_NPM/old"; echo "$1" >"$FAKE_NPM/stale"; }
npm_down() { touch "$FAKE_NPM/down"; }

failures=0
# expect <label> <exit code> <current output, or - for none> <part of the output>
expect() {
	local got_current
	got_current="$(sed -n 's/^current=//p' "$WORK/output" | tail -1)"
	if [ "$RC" = "$2" ] && [ "${got_current:--}" = "$3" ] && { [ -z "$4" ] || grep -qF -- "$4" "$WORK/log"; }; then
		echo "ok    $1"
	else
		echo "FAIL  $1: exit $RC (expected $2), current=${got_current:--} (expected $3), output:"
		sed 's/^/        /' "$WORK/log"
		failures=$((failures + 1))
	fi
}

# The repositories: main in $WORK/dev, pushed to $WORK/origin.git
version() { printf '{\n  "name": "pomwright",\n  "version": "%s"\n}\n' "$1" >package.json; }
changeset() { printf -- '---\n"pomwright": patch\n---\n\n%s\n' "$2" >".changeset/$1.md"; }
fresh() {
	rm -rf "${WORK:?}/origin.git" "${WORK:?}/dev"
	git init -q --bare -b main "$WORK/origin.git"
	git init -q -b main "$WORK/dev"
	cd "$WORK/dev"
	git config user.email test@example.com
	git config user.name test
	git remote add origin "$WORK/origin.git"
	mkdir .changeset
	cp "$CONFIG/config.json" "$CONFIG/README.md" .changeset/
	version 3.0.1
	commit "O: 3.0.1, released"
}
commit() { git add -A && git commit -qm "$1" && git push -q origin HEAD:main; }
branch() { git switch -q -c "$1" main; }
land() { git switch -q main && git merge -q --no-ff "$1" -m "Merge $1" && git push -q origin main; }

# publish <label> <checkout> <tested>: the guard in a runner clone at <checkout>
publish() {
	rm -rf "${WORK:?}/runner" && git clone -q "$WORK/origin.git" "$WORK/runner" && git -C "$WORK/runner" checkout -q "$1"
	: >"$WORK/output"
	set +e
	(cd "$WORK/runner" && PATH="$WORK/bin:$PATH" GITHUB_OUTPUT="$WORK/output" TESTED_SHA="$2" bash "$SCRIPT" publish) >"$WORK/log" 2>&1
	RC=$?
	set -e
}
# pull_request <branch>: the check on the merge commit of <branch> into main
pull_request() {
	git switch -q --detach main && git merge -q --no-ff "$1" -m "refs/pull/N/merge"
	: >"$WORK/output"
	set +e
	PATH="$WORK/bin:$PATH" bash "$SCRIPT" pull-request >"$WORK/log" 2>&1
	RC=$?
	set -e
	git switch -q main
}

NEVER="would never be published"

echo "publish.yaml's guard"
fresh && npm_lists "$OLD"
changeset fix "A fix." && commit "P: a fix" && P="$(git rev-parse HEAD)"
publish "$P" "$P" && expect "a changeset pending, 3.0.1 on npm: goes on" 0 true ""
git rm -q .changeset/fix.md && version 3.0.2 && commit "B: Version Packages" && B="$(git rev-parse HEAD)"
publish "$B" "$B" && expect "the release commit, main's tip: goes on" 0 true ""
echo page >page.md && commit "D: docs" && D="$(git rev-parse HEAD)"
publish "$D" "$B" && expect "the release commit's run after a docs commit: stops" 0 false "main has moved past"
publish "$B" "$B" && expect "the same, the docs commit pushed after the run started: stops" 0 false "main has moved past"
publish "$D" "$D" && expect "the docs commit's run: goes on, and publishes 3.0.2" 0 true ""

fresh && npm_lists "$OLD"
changeset fix "A fix." && commit "P" && git rm -q .changeset/fix.md && version 3.0.2 && commit "B" && B="$(git rev-parse HEAD)"
changeset fix2 "Another." && commit "C: a changeset after the release" && C="$(git rev-parse HEAD)"
publish "$C" "$B" && expect "the release commit's run after a changeset: fails" 1 - "$NEVER"
publish "$C" "$C" && expect "the changeset's run: fails" 1 - "Revert the Version Packages pull request that set 3.0.2"
npm_publishes_after 1
publish "$C" "$C" && expect "3.0.2 published, npm's list one read old: goes on" 0 true ""
npm_lists "$NEW" && npm_down
publish "$C" "$C" && expect "npm down: fails with npm's error" 1 - "npm error"
if grep -qF "::error::" "$WORK/log"; then echo "FAIL  npm down: printed a revert instruction" && failures=$((failures + 1)); fi
npm_lists "$OLD" && git revert --no-edit "$B" >/dev/null && git push -q origin main && R="$(git rev-parse HEAD)"
publish "$R" "$R" && expect "after reverting the release commit: goes on" 0 true ""

fresh && npm_lists "$OLD"
changeset fix "A fix." && commit "P" && P="$(git rev-parse HEAD)"
git switch -q -c changeset-release/main && git rm -q .changeset/fix.md && version 3.0.2 && git add -A && git commit -qm "Version Packages"
git switch -q main && branch fix2 && changeset fix2 "Another." && git add -A && git commit -qm "fix2" && land fix2
C="$(git rev-parse HEAD)" && land changeset-release/main && V="$(git rev-parse HEAD)"
publish "$V" "$C" && expect "a stale Version Packages pull request merged, the changeset's run: fails" 1 - "$NEVER"
publish "$V" "$V" && expect "its own run: fails" 1 - "$NEVER"

fresh && npm_lists "$OLD"
changeset fix "A fix." && commit "P" && P="$(git rev-parse HEAD)"
changeset fix2 "Another." && commit "C" && C="$(git rev-parse HEAD)"
publish "$P" "$P" && expect "a re-run after main moved on: stops" 0 false "main has moved past"

fresh && npm_lists "$OLD"
changeset fix "A fix." && commit "P" && git rm -q .changeset/fix.md && version 3.0.2 && commit "B"
printf -- '---\n---\n' >.changeset/empty.md && commit "E: an empty changeset" && E="$(git rev-parse HEAD)"
publish "$E" "$E" && expect "an empty changeset after the release: fails" 1 - "$NEVER"

echo "pr.yaml's release window"
fresh && npm_lists "$OLD"
branch fix && changeset fix "A fix." && git add -A && git commit -qm "fix"
pull_request fix && expect "a changeset, 3.0.1 on npm: passes" 0 - "3.0.1 is on npm"
branch docs && echo page >page.md && git add -A && git commit -qm "docs"
pull_request docs && expect "no changeset: passes" 0 - "3.0.1 is on npm"
land fix && branch changeset-release/main && git rm -q .changeset/fix.md && version 3.0.2 && git add -A && git commit -qm "Version Packages"
pull_request changeset-release/main && expect "the Version Packages pull request: passes" 0 - "releases 3.0.2"
land changeset-release/main && branch fix2 && changeset fix2 "Another." && git add -A && git commit -qm "fix2"
npm_publishes_after 4
pull_request fix2 && expect "a changeset while 3.0.2 publishes: waits, then passes" 0 - "3.0.2 is on npm now"
branch deps && echo deps >deps.txt && git add -A && git commit -qm "deps"
npm_publishes_after 2
pull_request deps && expect "no changeset while 3.0.2 publishes: waits, then passes" 0 - "3.0.2 is on npm now"
npm_lists "$OLD"
pull_request fix2 && expect "a release that never publishes: fails after the wait" 1 - "still not on npm after 30 minutes"
git switch -q -c revert main && git revert --no-edit -m 1 HEAD >/dev/null && git switch -q main
pull_request revert && expect "its revert: passes" 0 - "3.0.1 is on npm"

fresh && npm_lists "$OLD"
branch fix && changeset fix "A fix." && git add -A && git commit -qm "fix" && land fix
branch changeset-release/main && git rm -q .changeset/fix.md && version 3.0.2 && git add -A && git commit -qm "Version Packages"
branch fix2 && changeset fix2 "Another." && git add -A && git commit -qm "fix2" && land fix2
git switch -q changeset-release/main && git merge -q --no-ff main -m "Update branch" && git switch -q main
pull_request changeset-release/main && expect "a Version Packages pull request updated after a changeset landed: fails" 1 - "Wait for Publish to rebuild it"

fresh && npm_lists "$OLD"
branch fix && changeset fix "A fix." && git add -A && git commit -qm "fix" && land fix
branch changeset-release/main && git rm -q .changeset/fix.md && version 3.0.2 && git add -A && git commit -qm "Version Packages"
branch docs && echo page >page.md && git add -A && git commit -qm "docs" && land docs
git switch -q changeset-release/main && git merge -q --no-ff main -m "Update branch" && git switch -q main
pull_request changeset-release/main && expect "a Version Packages pull request updated after a docs merge: passes" 0 - "releases 3.0.2"

fresh && npm_lists "$OLD" && npm_down
branch fix && changeset fix "A fix." && git add -A && git commit -qm "fix"
pull_request fix && expect "npm down: fails with npm's error" 1 - "npm error"
if grep -qF "::error::" "$WORK/log"; then echo "FAIL  npm down: printed an error of the check's own" && failures=$((failures + 1)); fi

if [ "$failures" -gt 0 ]; then
	echo "$failures path(s) failed"
	exit 1
fi
echo "every path as expected"
