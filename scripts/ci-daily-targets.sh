#!/bin/bash

# Resolves what the Daily workflow (.github/workflows/daily.yaml) tests:
#   release           the pomwright version npm's latest dist-tag names, the tarball users install today;
#   commit            the commit that release was published from, read from its npm provenance attestation (SLSA v1),
#                     whose tests, harness and scripts run against it: npm records no gitHead for it, and the changesets
#                     action pushes the v<version> tag only after the publish, so a tag can be missing;
#   playwright-extra  the second Playwright version of the harness, beside the newest 1.x: the one PLAYWRIGHT_REQUEST
#                     names (the workflow's playwright input: a version, a range or a dist-tag such as beta, the newest
#                     when it names several), run whatever it is; else @playwright/test's next, when its release (the
#                     part before "-") is newer than @playwright/test's latest; else empty, and no second row.
# Prints the release's tag and Playwright's next-pending beside them, for the log. Writes release=, commit= and
# playwright-extra= to $GITHUB_OUTPUT when set, and always to stdout. Runs locally as it is:
#   bash scripts/ci-daily-targets.sh
#   PLAYWRIGHT_REQUEST=beta bash scripts/ci-daily-targets.sh

set -euo pipefail

REPOSITORY="${GITHUB_REPOSITORY:-DyHex/POMWright}"
REQUEST="${PLAYWRIGHT_REQUEST:-}"
SEMVER='^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'

fail() {
	echo "ci-daily-targets.sh: $1" >&2
	exit 1
}

# newest <spec>: the newest version npm has for a package spec (npm view prints a string for one match and an
# ascending array for several), or a failure naming the spec
newest() {
	local json
	json="$(npm view "$1" version --json 2>/dev/null)" || fail "npm has no version for $1"
	node -e 'const v = JSON.parse(process.argv[1]); console.log(Array.isArray(v) ? v.at(-1) : v);' "$json"
}

release="$(newest pomwright@latest)"
[[ "$release" =~ $SEMVER ]] || fail "npm's latest pomwright is not a version: \"$release\""

attestations="$(curl -sSf "https://registry.npmjs.org/-/npm/v1/attestations/pomwright@$release")" ||
	fail "pomwright $release has no provenance attestation on npm, so its commit is unknown"
# The single-quoted text is the JavaScript program node runs; its ${…} are template literals, not shell expansions.
# shellcheck disable=SC2016
commit="$(node -e '
	const [json, repository] = process.argv.slice(1);
	const reject = (reason) => {
		console.error(reason);
		process.exit(1);
	};
	const statements = JSON.parse(json).attestations.map((a) =>
		JSON.parse(Buffer.from(a.bundle.dsseEnvelope.payload, "base64").toString("utf8")),
	);
	const provenance = statements.find((s) => s.predicateType === "https://slsa.dev/provenance/v1");
	if (!provenance) reject("no SLSA v1 provenance among the attestations");
	const [source] = provenance.predicate.buildDefinition.resolvedDependencies ?? [];
	const prefix = `git+https://github.com/${repository}@`;
	if (!source?.uri?.startsWith(prefix)) reject(`built from ${source?.uri}, not ${prefix}…`);
	const commit = source.digest?.gitCommit ?? "";
	if (!/^[0-9a-f]{40}$/.test(commit)) reject(`no commit in ${JSON.stringify(source)}`);
	console.log(commit);
' "$attestations" "$REPOSITORY")" || fail "pomwright $release: its provenance attestation names no commit of $REPOSITORY"

# For the log only: the tag, which can be missing or, if moved by hand, name another commit.
tag="$(git ls-remote --tags "https://github.com/$REPOSITORY.git" "refs/tags/v$release" "refs/tags/v$release^{}" |
	tail -n 1 | cut -f 1)" || tag=""
echo "pomwright $release, published from $commit (tag v$release: ${tag:-none})"

latest="$(newest @playwright/test@latest)"
next="$(newest @playwright/test@next)"
pending="$(newest @playwright/test@next-pending 2>/dev/null)" || pending="none"
echo "@playwright/test: latest $latest, next $next, next-pending $pending"

if [[ -n "$REQUEST" ]]; then
	extra="$(newest "@playwright/test@$REQUEST")"
	echo "Requested @playwright/test@$REQUEST: $extra"
elif [[ "${next%%-*}" != "$latest" && "$(printf '%s\n%s\n' "$latest" "${next%%-*}" | sort -V | tail -n 1)" == "${next%%-*}" ]]; then
	extra="$next"
	echo "next ($next) is ahead of latest ($latest): a second row runs it"
else
	extra=""
	echo "next ($next) is not ahead of latest ($latest): no second row"
fi
[[ -z "$extra" || "$extra" =~ $SEMVER ]] || fail "not a version: \"$extra\""

echo "release=$release"
echo "commit=$commit"
echo "playwright-extra=$extra"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	{
		echo "release=$release"
		echo "commit=$commit"
		echo "playwright-extra=$extra"
	} >>"$GITHUB_OUTPUT"
fi
