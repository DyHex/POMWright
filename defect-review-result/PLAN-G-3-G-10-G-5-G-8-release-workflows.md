# Plan 4: release tooling: changesets 3, action v2, Trusted Publishing, the publish and Pages guards, Dependabot

- **Decisions**: [DECISIONS.md](DECISIONS.md) #1 (without Mermaid, which is plan 6), #3, #4, #53
- **Findings**: [G-3](G-ci-and-tooling/defect-G-3-dependabot-proposes-deferred-majors.md),
  [G-10](G-ci-and-tooling/defect-G-10-no-provenance-on-3x-releases.md),
  [G-5](G-ci-and-tooling/defect-G-5-release-skipped-when-main-moves.md),
  [G-8](G-ci-and-tooling/defect-G-8-pages-rerun-deploys-older-site.md); backlog issue #53 (done here)
- **Bump**: `patch` for the provenance note (no code change)
- **Stop**: **yes**, after the commit. The PR run checks lint (actionlint) and the root install with changesets 3;
  `publish.yaml` and `pages.yaml` run only on `main`, so their real run comes after the merge (decision 8, point 6)
- **Depends on**: plan 3 (actionlint in CI)

## Contract

- Releases are published by `changesets/action` v2 with `@changesets/cli` 3 and `@changesets/changelog-github` 1, and
  authenticate to npm with Trusted Publishing (OIDC), so no npm token is stored and provenance comes from the workflow's
  identity. A failed publish fails the run (v2 does; v1.9.0 ignored the exit code).
- After publishing, the run polls the attestation endpoint of each published version and **warns** when there is none
  (manual 2FA approval on npmjs.com stays on, and its wait can outlast any polling window).
- When Publish's guard stops because `main` moved past the tested commit, that commit is a release commit (its version
  differs from its first parent's), and its version is not on npm (a release skipped), the run **fails** with the
  version, the commit and the recovery: revert that commit before merging the next Version Packages pull request. Every
  other commit stops quietly, as today. A release commit whose `CI` run GitHub dropped for a newer push gets no Publish
  run; the AGENTS.md §7 rule covers that case.
- Pages deploys a commit only while it is `main`'s tip, so a re-run of an older green `CI` run never deploys an older
  site; a manual run builds the commit it was started on.
- Dependabot groups take minor and patch updates only, so every major arrives as a pull request of its own; the majors
  of `typescript` (issue #54) and `@types/node` (issue #55) are ignored, each with a comment naming its issue.

## Current behaviour

- `publish.yaml:53-60`: `changesets/action@a45c4d5… # v1.9.0`, `publish: pnpm run release`, `NPM_TOKEN` and
  `NPM_CONFIG_PROVENANCE: "true"` in `env`; no 3.x version has an attestation (the endpoint answers 404 for 3.0.0 and
  3.0.1). The guard (`publish.yaml:27-37`) stops quietly whenever `main` moved, a skipped release commit included; its
  message says "that commit's own CI run publishes", which is untrue when changesets are pending (G-5).
- `pages.yaml:21-49` builds `workflow_run.head_sha` with no tip check; a re-run keeps the original commit, so a passing
  re-run of an older run deploys that older site (G-8, suspected: needs GitHub).
- Root `package.json`: `@changesets/cli` `^2.29.7`, `@changesets/changelog-github` `^0.7.0`; `.changeset/config.json`'s
  `$schema` points at `@changesets/config@3.0.0`.
- `.github/dependabot.yml`: every group takes every update type, so a failing major holds the whole group (#49).

## Steps

1. **Packages.** `pnpm add -D @changesets/cli@3 @changesets/changelog-github@1` at the root (exact versions as the
   lockfile resolves them; the `^` ranges stay as the file writes them); `.changeset/config.json`'s `$schema` to the
   config schema the installed CLI 3 ships (read its version from `node_modules/@changesets/config/package.json`). Run
   `pnpm changeset status --verbose`: the 29 pending changesets parse and are all `patch`. A full `changeset version` is
   not run locally: `changelog-github` asks GitHub for each changeset's pull request and needs a token; the entries'
   shape (`disableThanks` still applies) is what decision 1 read from `changelog-github` 1.0.1's source
   (`…-probes/R/walkthrough/changelog-github-1.0.1.mjs`), and the release itself shows it.
2. **`publish.yaml`**:
   - `changesets/action@ae32849d5ba541f9ae29e40e22a623bc13562f51 # v2.1.2` (the pin PR #47 proposed), with
     `publish-script: pnpm run release` and `github-token: ${{ secrets.GITHUB_TOKEN }}`; no `NPM_TOKEN`, no
     `NPM_CONFIG_PROVENANCE`, no `env` block; `id-token: write` stays, its comment now "npm Trusted Publishing (OIDC):
     npm authenticates this workflow and records provenance".
   - **Before writing it, confirm that `pnpm publish` (pnpm 12.14.0, which `changeset publish` calls for a pnpm project)
     authenticates with npm's Trusted Publishing**, from pnpm's documentation or changelog, and which npm CLI version
     it needs (npm's Trusted Publishing needs npm 11.5.1 or later; Node 24's bundled npm). If it does not, stop and
     report (the publish command would change, which no decision covers). If the runner's npm is older than what
     Trusted Publishing needs, add a step that installs a pinned npm version that has it, and record it as an
     execution-time decision.
   - **The guard** (`Continue only on the commit CI tested`): checkout with `fetch-depth: 0` (or fetch the tested
     commit and its parent); when `main` moved on, read the tested commit's `package.json` version (`git show
     "$TESTED_SHA":package.json`) and its first parent's (`"$TESTED_SHA"^`). The tested commit is a release commit when
     the two differ (decision 4, point 2, as refined: an ordinary commit merged while a release waits for approval on
     npm, or after a skipped release, also has an unpublished version, and must not fail). For a release commit, look the
     version up on npm (`npm view pomwright versions --json`, membership, not exit code); if it is missing, print
     `::error::` with "Version X of commit SHA was not published: main moved past it before its Publish run. Revert SHA
     before merging the next Version Packages pull request." and exit 1. Otherwise print the moved-on notice, worded
     truthfully ("the newer commit's own run continues the release; it publishes only when no changeset is pending"),
     and stop quietly.
   - **The attestation check**, after the action, when `steps.changesets.outputs.published == 'true'`: for each entry
     of `published-packages`, poll `https://registry.npmjs.org/-/npm/v1/attestations/pomwright@<version>` (for example
     every 30 s for 10 minutes); when none appears, `::warning::` naming the version and the commands to check it by
     hand (that URL, `npm view pomwright@<version> dist --json`). Never fails the run.
   - Comments: the file's header and each step say what they do and why (Trusted Publishing, the guard's two outcomes,
     the warning and why it does not fail).
3. **`pages.yaml`**: the build job gets an output `deploy`; its first step (after checkout), for a `workflow_run`
   only, compares `git ls-remote origin refs/heads/main` with `github.event.workflow_run.head_sha`, and when they
   differ prints that `main` moved past the commit (its own run deploys a site that already holds this one) and sets
   `deploy=false`; every later step and the `deploy` job run only when `deploy` is `true`. A `workflow_dispatch` always
   deploys. Header comment updated.
4. **`main.yaml`**: the concurrency comment says deployments follow commit order, re-runs included, because Pages skips
   a commit `main` has moved past.
5. **`.github/dependabot.yml`**: each group gets `update-types: [minor, patch]`; in every npm entry that has the package
   (root, `test/`, `website/`; check each `package.json`), `ignore` `typescript` and `@types/node` with
   `update-types: ["version-update:semver-major"]`, each with a comment naming issue #54 or #55; the header comment says
   majors come one per pull request and which are held, and where they are tracked.
6. **Changeset `trusted-publishing.md`** (`patch`): "Releases are published with npm Trusted Publishing, which records
   provenance for each version from the workflow that published it. 3.0.0 and 3.0.1 were published without a
   provenance attestation, although the 3.0.0 entry said they would have one." (Plan 41 re-reads it; whether the
   attestation survives the manual approval is known only after the release.)
7. **Docs**:
   - AGENTS.md §2, the `.github/workflows/` and `.github/dependabot.yml` statements: `publish.yaml` runs
     `changesets/action` v2 and publishes with Trusted Publishing (no npm token), fails when it skips an unpublished
     release commit, and warns when a published version has no attestation; `pages.yaml` deploys a commit only while it
     is `main`'s tip; Dependabot groups minor and patch, majors one by one, `typescript` and `@types/node` majors held
     (#54, #55).
   - AGENTS.md §7: the publish guard's truthful description; the rule "after merging the Version Packages pull request,
     merge nothing with a changeset until that version is on npm (with manual approval, until it is approved there)",
     with the recovery (revert the release commit); Trusted Publishing instead of `NPM_TOKEN`/`NPM_CONFIG_PROVENANCE`;
     after approving a release, check its attestation. AGENTS.md §3 if it names the action, the token or
     `NPM_CONFIG_PROVENANCE` (grep at implementation).
   - *Internal → Tests and checks*, *CI*: the guard's two outcomes, corrected ("the newer commit's own run continues the
     release, and publishes only when no changeset is pending"); the attestation warning.
   - *Internal → Documentation*, *Building and publishing*: Pages skips a commit `main` has moved past, so deployments
     follow commit order, re-runs included.

## Tests

- actionlint over all workflows (local and in the PR run).
- A local dry run of the guard's shell in a scratch clone, against the real registry: an ordinary commit stops
  quietly; a commit that bumps to a released version stops quietly; a commit that bumps to an unreleased version (a
  scratch commit, never pushed) fails with the message. Recorded in *Execution notes*.
- Not testable before the merge (accepted, decision 8): a real publish, the attestation, a Pages re-run. After the
  merge the maintainer re-runs an older green `CI` run once and sees Pages skip it (PLANS.md, the maintainer's
  actions).

## Verify

The standard checks (PLANS.md, rule 5), actionlint, `pnpm docs:build`. Then **stop**: report, the maintainer pushes,
and the PR run must be green (lint with actionlint; the package job installs with changesets 3).

## Commit

One commit per step group is fine; for example:

```text
ci: publish with changesets/action v2 and npm Trusted Publishing

@changesets/cli 3 and changelog-github 1 with changesets/action v2, which
fails the run when publishing fails. npm authenticates the workflow by OIDC,
so no npm token is stored and provenance comes from the same identity. After
publishing, a step warns when a version has no attestation. The guard fails
when main moved past an unpublished release commit, and says how to recover.

Plan: defect-review-result/PLAN-G-3-G-10-G-5-G-8-release-workflows.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
ci: Pages deploys a commit only while it is main's tip; Dependabot majors one by one

Plan: defect-review-result/PLAN-G-3-G-10-G-5-G-8-release-workflows.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
