# G-3: Dependabot proposes the majors the backlog defers, grouped with everything else; its open `changesets/action` v2 pull request is green in every check and would make every Publish run fail

- **Kind**: defect
- **Area**: CI, `.github/dependabot.yml`; release (`publish.yaml`)
- **Severity**: Medium (merging a Dependabot pull request whose checks are all green, the normal monthly flow, stops
  every release until it is reverted; the failure is loud, a red Publish run, not silent)
- **Semver of the fix**: none (repository configuration only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: fix (2026-10-26, [DECISIONS.md #1](../DECISIONS.md)): backlog issue 01's move in this branch,
  Dependabot groups by update type, TypeScript and `@types/node` majors held, PRs #47 and #49 closed, #48 in this branch and closed

## Contract

`.github/dependabot.yml` lines 1-3: "Keeps the commit pins of the GitHub Actions ... and the npm dev dependencies of the
root, test/ and website/ current: one grouped pull request a month each, which CI checks like any other." AGENTS.md §2
says the same. The backlog decides that some majors move only together and only by a plan: issue 01 (filed; draft
`git show 2f06702:release-3.0.2/issues/01-release-tooling.md`): "`@changesets/cli` 3, `@changesets/changelog-github` 1
and `changesets/action` v2 move together: action v2 refuses CLI 2 ... Action v2 renames `publish` to
`publish-script` ... The move cannot be tried without publishing, so it is proven on a patch release." Issue 02:
TypeScript 7 only once it has a compiler API (tsup's declaration build and both doc checks use it, AGENTS.md §3).

`publish.yaml` never runs on a pull request (AGENTS.md §8), so "CI checks like any other" cannot cover a change to it.

## Reproduction

The live repository, read through GitHub's public API (no token; responses saved in
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/github/`):

```sh
curl -sS "https://api.github.com/repos/DyHex/POMWright/pulls/47/files" | jq -r '.[] | .filename, .patch'
curl -sS "https://api.github.com/repos/DyHex/POMWright/commits/1a1222b6107785eaa096f9bddf1fe147b7780939/check-runs" \
  | jq -r '.check_runs[] | [.name, .conclusion] | @tsv'
```

Pull request #47, "chore(deps): bump changesets/action from 1.9.0 to 2.1.2 in the github-actions group", changes one
line of `publish.yaml`:

```text
-        uses: changesets/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d # v1.9.0
+        uses: changesets/action@ae32849d5ba541f9ae29e40e22a623bc13562f51 # v2.1.2
         with:
           publish: pnpm run release
```

and every check, the required `build` included, passed:

```text
build	success
checks / Documentation and site	success
checks / Harness (chromium, Playwright latest)	success
checks / Harness (chromium, Playwright pin)	success
checks / Harness (chromium, Playwright pin, Node 20)	success
checks / Unit tests and package	success
checks / Lint	success
checks / Changes	success
```

What v2.1.2 does with this workflow, from its source at the pinned commit (`github/v2-index.ts`, `github/v2-utils.ts`,
fetched from `raw.githubusercontent.com/changesets/action/ae32849d.../src/`): `main()` first runs
`validateChangesetsCliVersion`, which throws "This version of the Changesets action is designed to work with Changesets
CLI v3. ..." when the root declares `@changesets/cli` in `>=2.0.0-0 <3.0.0-0` (the root has `^2.29.7`), then
`throwOnRenamedInputs({ publish: "publish-script", ... })`, which throws "The following inputs have been renamed: -
"publish" -> "publish-script"". Either error goes to `core.setFailed`, so every Publish run after the merge fails, the
version pull request is no longer opened, and nothing is published.

Pull request #49, the root npm group, bundles `@changesets/cli` 3, `@changesets/changelog-github` 1, TypeScript 7 and
`@types/node` 26; its "Unit tests and package" check failed (`checks-pr49.json`). Because the group takes every update
type, any later minor or patch of the root's dev dependencies joins this red pull request and cannot be merged either.

## Observed / expected

Observed: the configuration groups every update, majors included, with no `ignore` for the majors issues 01 and 02
defer; one deferred major arrives as a green, mergeable pull request that breaks releasing, another holds the root
group red. Expected: Dependabot proposes what can be merged on a green run, and leaves the deferred majors to their
issues.

## Cause

`.github/dependabot.yml`: the `github-actions` group (lines 10-13) and the `root` group (lines 28-31) match `"*"` for all
update types; `ignore` lists only `@playwright/test` (and `pomwright` in `test/`).

## Fix plan

- **Intended contract**: Dependabot's grouped pull requests contain only updates CI can vouch for; majors that the
  backlog defers are not proposed until their issue is done.
- **Options**:
  - **(recommended)** `ignore` entries with `update-types: ["version-update:semver-major"]` for `changesets/action`
    (github-actions), and for `@changesets/cli`, `@changesets/changelog-github` and `typescript` (root), each with a
    comment naming its issue; and decide whether `@types/node` follows the contributors' Node (24, issue 03) the same
    way. Close #47 and let #49 be recreated without them.
  - Split each group by update type (`update-types: ["minor", "patch"]` in the group), so majors come as single pull
    requests: the deferred ones still appear and #47 would still be green.
- **Implementation steps**: `.github/dependabot.yml`; close pull request #47 (a repository action, outside the review).
- **Tests**: none possible locally; the next Dependabot run shows the result.
- **Docs**: the comment at the top of `dependabot.yml`; AGENTS.md §2 (`.github/dependabot.yml` "also proposes the npm
  versions ..."): say which majors are held back and where they are tracked.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] ignore the deferred majors (which packages): `typescript` (issue 02) and `@types/node` (issue 03). The changesets
    packages need no entry, because issue 01's move is done in this branch (below).
  - [x] `@types/node`: follow Node 24; its majors move with issue 03.
  - [x] close #47 (replaced by issue 01's move in this branch); close #49 too.
  - [x] (added) the groups take minor and patch updates only, so every other major arrives as a pull request of its own.
- **Execution order**: before the next merge of a Dependabot pull request.

## Decision (2026-10-26)

See [DECISIONS.md #1](../DECISIONS.md). In short:

- Backlog issue 01 is done in this branch: `@changesets/cli` 3, `@changesets/changelog-github` 1, `changesets/action` v2
  and npm Trusted Publishing. Checked on 2026-10-26: v2 renames `publish` to `publish-script`, takes the token as
  `github-token`, no longer writes `.npmrc` from `NPM_TOKEN`, and fails the run when the publish command fails; CLI 3
  needs Node `^22.11 || ^24 || >=26` and pnpm >=10; the changeset files keep their format and `config.json` changes only
  its `$schema` (`disableThanks` is still an option of `changelog-github` 1.0.1); pnpm 12 supports trusted publishing.
  Sources in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/` and `…/G/github/`.
- `.github/dependabot.yml`: groups for minor and patch only; `ignore` the majors of `typescript` (issue 02: 7.0.2's
  `require("typescript")` is `{ version, versionMajorMinor }`, the API is `typescript/unstable/*`, so tsup's declaration
  build and both doc checks cannot use it) and of `@types/node` (issue 03).
- PRs #47, #48 and #49 closed (#48 added 2026-10-27). #48 (Mermaid 12) is done in this branch together with `astro-mermaid` 2.2.0 (2.1.0's peer
  range is `^10 || ^11`; 2.2.0, released 2026-10-24, adds `^12`); the maintainer checks every Mermaid diagram on the
  built site by hand.
- Test gap #3's actionlint part: actionlint runs in CI's `lint` job, pinned ([DECISIONS.md #8](../DECISIONS.md)).
