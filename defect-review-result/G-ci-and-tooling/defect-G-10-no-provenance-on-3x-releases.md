# G-10: Neither 3.0.0 nor 3.0.1 carries an npm provenance attestation, although `publish.yaml` sets it up and the 3.0.0 changelog tells consumers that `npm audit signatures` verifies it

- **Kind**: defect
- **Area**: release, `publish.yaml` (`id-token: write`, `NPM_CONFIG_PROVENANCE`); the 3.0.0 changelog entry
- **Severity**: Medium (a consumer-facing promise of the 3.0.0 release, supply-chain verification, holds for no 3.x
  version; the package itself works)
- **Semver of the fix**: none (workflow; the next release is the first one the fix can cover)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: fix (2026-10-26, [DECISIONS.md #3](../DECISIONS.md)): Trusted Publishing (decision 1), manual 2FA
  approval kept, a verification step that warns, a changeset note correcting the record

## Contract

- `CHANGELOG.md` lines 91-94 (3.0.0, written from a changeset, so this is what consumers read): "### Publishing -
  Releases are published with npm provenance: npm shows, for each published version, the GitHub Actions run and the
  commit that built it, and `npm audit signatures` verifies it."
- `.github/workflows/publish.yaml` line 13: "id-token: write # npm provenance: the published tarball names this
  workflow run and its commit"; lines 59-60: "changeset publish runs pnpm publish, which hands the upload to npm with
  this environment", `NPM_CONFIG_PROVENANCE: "true"`.
- AGENTS.md §2: `publish.yaml` "publishes with npm provenance (`id-token: write`, `NPM_CONFIG_PROVENANCE`)".

## Reproduction

Read-only, against the public registry and GitHub API; everything saved under
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/provenance/`, `.../G/npm/` and `.../G/github/`.

```sh
curl -sS -o /dev/null -w "%{http_code}\n" https://registry.npmjs.org/-/npm/v1/attestations/pomwright@3.0.1   # 404
curl -sS -o /dev/null -w "%{http_code}\n" https://registry.npmjs.org/-/npm/v1/attestations/sigstore@3.0.0    # 200 (control)
npm view pomwright@3.0.0 dist --json | jq .attestations                                                        # null
npm view pomwright@3.0.1 dist --json | jq .attestations                                                        # null
```

`npm audit signatures` in a scratch project (`provenance/audit/`):

```sh
cd /home/magdys/workspace/dyhex/POMWright-final-review-probes/G/provenance/audit
npm install --no-audit --no-fund --legacy-peer-deps --ignore-scripts pomwright@3.0.1 sigstore@3.0.0
npm audit signatures                       # exit 0: "102 packages have verified registry signatures / 27 packages have verified attestations"
npm audit signatures --json --include-attestations | jq '[.verified[] | .name] | index("pomwright")'   # null
```

`sigstore@3.0.0` is among the 27 with an attestation; `pomwright@3.0.1` is not.

Both versions were released from commits whose `publish.yaml` had the provenance setup (`git show
9e5c43ed:.github/workflows/publish.yaml` and `8daa652c:...`: `id-token: write`, `NPM_CONFIG_PROVENANCE: "true"`,
`packageManager` pnpm 12.14.0; added in `e296675`).

## Observed / expected

Observed: no attestation for 3.0.0 or 3.0.1; npm shows neither the run nor the commit, and `npm audit signatures` has
nothing to verify. Expected, by the changelog and AGENTS.md: an attestation naming the Publish run and its commit.

## Cause

Not determined: the run logs need a token (`gh` is logged out here). What the public data shows
(`github/ci-runs.json`, the jobs of runs 39451244770 and 39588664835, the releases list, `npm view pomwright time`):

| version | Publish step ran | GitHub release by the action | npm `time` |
| --- | --- | --- | --- |
| 2.1.0 | 12:18:48-12:18:57 | 12:18:56 | 12:18:55.7 (inside the step) |
| 3.0.0 | 15:44:57-15:45:08 | 15:45:06 | 15:51:17.7 (six minutes after the run ended) |
| 3.0.1 | 11:00:10-11:00:19 | 11:00:16 | 11:01:31.99 (72 s after the run ended) |

The action created the GitHub release, so `changeset publish` printed "New tag: pomwright@3.0.x" (it does only for a
package whose publish succeeded; changesets/action v1.9.0 `src/run.ts` lines 91-118), yet the version went live on npm
minutes after the run had ended. Two explanations fit and neither is verified: the registry held the upload until a
maintainer approved it (a staged, approval-gated publish) and the attestation did not survive that path; or the pnpm 12
publish did not pass `NPM_CONFIG_PROVENANCE` on to the upload, so none was made. A local `pnpm publish --dry-run`
against a dead registry (`provenance/dry-run.out`) shows that pnpm 12.14.0 still hands the upload to npm (the output
is npm's: "npm warn publish ... (dry-run)", "npm notice Publishing to http://127.0.0.1:9/ ..."), which makes the second
explanation less likely, but a dry run outside CI does not exercise provenance and settles neither.

Related: changesets/action v1.9.0 runs the publish script with `ignoreReturnCode: true` (`src/run.ts` line 93), so a
failing `pnpm run release` leaves the Publish run green; the run's success says nothing about what reached npm.

## Fix plan

- **Intended contract**: every release from `publish.yaml` carries a provenance attestation, or the changelog and
  AGENTS.md stop promising one.
- **Options**:
  - **(recommended)** Read the logs of Publish runs 39451244770 and 39588664835 (a maintainer can) to find which path
    lost it, then fix that path: with npm Trusted Publishing (backlog issue 01) npm generates provenance itself, which
    removes the dependency on pnpm forwarding `NPM_CONFIG_PROVENANCE`; until then `pnpm publish --provenance` (as the
    publish command of `changeset publish`, or `PNPM_CONFIG_PROVENANCE`), checked on the next patch release with the
    attestation endpoint above.
  - Add a step after the action that fails the run when `steps.changesets.outputs.published == 'true'` and the
    attestation endpoint of each published version answers 404 (a check that the promise held).
  - If provenance is dropped: a changeset that says so (the 3.0.0 entry cannot be edited, AGENTS.md §8), and AGENTS.md
    §2 and the `publish.yaml` comments corrected.
- **Implementation steps**: `publish.yaml` (publish command or environment, the verification step); AGENTS.md §2.
- **Tests**: the attestation endpoint and `npm audit signatures` after the next release.
- **Docs**: AGENTS.md §2; `publish.yaml` comments; a changeset if the consumer-facing promise changes.
- **Changeset**: none for the workflow; a patch changeset with a note only if the promise is withdrawn.
- **Decisions to tick**:
  - [x] read the two run logs: not read. The maintainer approved both publishes on npmjs.com after the runs (an
    approval-gated, 2FA publish), which explains the npm times; the attestation was most likely lost on that path.
  - [x] fix path: Trusted Publishing now (decision 1, backlog issue 01 done in this branch).
  - [x] a verification step after publishing: yes, and it **warns** rather than fails, because manual 2FA approval on
    npmjs.com stays on with Trusted Publishing and the wait for it can outlast any polling window.
  - [x] (added) a changeset note in this release correcting the provenance record for 3.0.0 and 3.0.1.
  - [x] (added) after approving a release, the maintainer checks its attestation by hand (the warning names the
    command).
- **Execution order**: with issue 01 (release tooling), which changes how `publish.yaml` authenticates.
