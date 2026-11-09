# Plan: Dependabot without `test/`

Status: **executed** 2026-11-09 (one commit, not pushed), on the branch `ci/dependabot-test` (from `main` at
`ee2df92`). CI and the guide only: no consumer-facing change, no changeset, no release. See *Execution notes* at the
end; this folder's audit and deletion are left for before the merge.

## Intent

Stop the Dependabot update of `test/`, which has failed on every run since it was added, and keep `test/`'s
dependencies current by hand instead, with the reason and the steps written where a contributor finds them.

## Verified current behavior

1. **The entry.** [dependabot.yml:49-64](../.github/dependabot.yml#L49-L64) updates `test/` monthly, ignoring
   `@playwright/test`, `pomwright` and the majors of `@types/node`, grouped as `harness`. It was added in `ad98afd`
   ("Dependabot for every npm project", 2026-10-20).
2. **It has never passed.** Dependabot's `npm_and_yarn in /test` job failed on every run since, in its "Run Dependabot"
   step, while the others passed: 2026-10-20 (`4583a65`), 2026-10-31 (`7a6a561`), 2026-11-01 (`8214027`, the monthly
   run) and 2026-11-09 (`ee2df92`, started eight seconds after #67's merge changed `dependabot.yml`), read from the
   Actions API's runs with event `dynamic`.
3. **Why.** `test/package.json` has `"pomwright": "file:../.pack/pomwright"` ([test/package.json](../test/package.json)),
   the packed tarball extracted by `pack-build.sh` ([test/AGENTS.md:11-13](../test/AGENTS.md#commands)); `.pack/` is
   ignored ([.gitignore:94](../.gitignore#L94)), so a checkout has none, and `pnpm` cannot resolve `test/` without it.
   Probe P1.
4. **What the entry would update.** `test/`'s dependencies: `@playwright/test` (the peer floor, moves by decision,
   ignored), `pomwright` (the build, ignored), `@types/node` (its majors move by hand with the Node line), `express`,
   `@types/express` and `dotenv`. None has had a Dependabot update since the entry exists.
5. **What the guide says.** `dependabot.yml`'s header ("the npm dev dependencies of the root, test/ and website/"),
   [.github/AGENTS.md](../.github/AGENTS.md#the-workflows) ("proposes the npm versions of the root, `test/` and
   `website/`") and [*Internal → Tests and checks*](../website/src/content/docs/internal/tests-and-checks.md) ("the npm
   versions of the root, `test/` and `website/` once a month").

## Probes

On this machine, Node 26.13.0, pnpm 12.14.0.

- **P1, a checkout without `.pack/`.** A fresh worktree of `ee2df92`: `pnpm -C test install --lockfile-only` and
  `pnpm -C test update express --lockfile-only` both fail with "Failed to resolve dependency: Could not install from
  …/.pack/pomwright as it does not exist." **Stand-in:** this is pnpm on this machine, not Dependabot's updater, whose
  log (`GET …/actions/jobs/129238848424/logs`) the API refuses without a token (403); what it could hide is a second,
  different error after this one. The log's "Run Dependabot" step shows Dependabot's own message to anyone signed in.
- **P2, a hand update.** With `.pack/` present (after `pnpm pack-test` or `pnpm harness:install`), `pnpm -C test
  outdated` lists `dotenv` 18.0.8 → 18.0.9 and `@playwright/test` 1.64.0 → 1.65.0 (the pin, not to be moved); `pnpm -C
  test update dotenv` changes `test/package.json` (`^18.0.9`) and `test/pnpm-lock.yaml` only. Reverted after.
- **P3, `pomwright` from npm.** A fresh worktree of `ee2df92` without `.pack/`, `test/package.json`'s `pomwright` set
  to `"3.0.2"`: `pnpm -C test install --lockfile-only` and `pnpm -C test update express dotenv --lockfile-only` both
  pass. Removed after. (pnpm as P1's stand-in for Dependabot.)
- **P4, `.pack/` when it exists, else npm's.** The same worktree with a `test/.pnpmfile.cjs` whose `readPackage` sets
  `test/`'s `pomwright` to `file:../.pack/pomwright` when `.pack/pomwright` exists and to `"3.0.2"` otherwise. Without
  `.pack/`, `pnpm -C test install --lockfile-only` writes `pomwright@3.0.2` from the registry into the lockfile; after
  `pack-build.sh`, `pnpm -C test install --frozen-lockfile` fails ("… pnpm-lock.yaml reflects the current
  package.json, then re-run `pnpm install --frozen-lockfile`"): one committed lockfile matches only one of the two
  answers. Removed after.

## Options and recommendations

- **D1, the entry.** Recommended: remove it, and keep `test/`'s dependencies by hand (D2). The packages it would
  update (`express`, `@types/express`, `dotenv`, `@types/node` within its major) could move like any other; what
  fails is resolving `test/` at all without `.pack/` (P1). The other ways, and why not:
  - **Keep it as it is**: a red run every month and on every change to `dependabot.yml`, and nothing updated.
  - **Dependabot runs the pack build first**: not possible. *Dependabot options reference* (read 2026-11-09) lists no
    option for a command, script or build step; its one code-execution option, `insecure-external-code-execution`
    ("Allow Dependabot to execute external code in the manifest during updates"), is "Supported by: `bundler`, `mix`,
    and `pip`", not npm, under which pnpm falls.
  - **`.pack/` when it exists, npm's release otherwise**, through a `.pnpmfile.cjs` hook (P4): the committed lockfile
    can match only one answer, so either CI's frozen installs fail (a lockfile from a checkout without `.pack/`, as
    Dependabot's pull requests would bring) or every install of `test/` is non-frozen and rewrites the lockfile; and a
    run without `.pack/` would quietly test npm's release where today it stops. Whether Dependabot runs a pnpmfile at
    all is not documented.
  - **npm's release committed, `.pack/` swapped in at install** (P3), as `pack-test.sh` swaps `@playwright/test` for
    `PLAYWRIGHT_VERSION` today (`pnpm add -D -E`): Dependabot could resolve it, but the four places that install
    `test/` (`pack-test.sh`, `test-server-check.sh`, `pnpm harness:install`, the `site` job) would each rewrite
    `test/package.json` and its lockfile on every run (a dirty tree locally, a non-frozen install in CI), and one that
    missed the swap would test npm's release and pass, so a guard would be needed too: a harness change in five places
    to automate three small packages.
  - **`"pomwright": "link:…"`**: a symlink in place of the installed copy, so the harness would stop testing the
    package as a consumer installs it (not probed whether Dependabot could then resolve `test/`).
  - **A stand-in `.pack/` committed**: the root AGENTS.md forbids committing `.pack/`.
  - **`express`, `@types/express` and `dotenv` moved to the root**: `test/` is a project of its own, as a consumer's is.
- **D2, by hand, when.** Recommended: with each month's Dependabot pull request for the root, which is the reminder:
  `pnpm harness:install`, then `pnpm -C test outdated`, then `pnpm -C test update <name>` for each but
  `@playwright/test` (by decision) and `pomwright`, `@types/node` within its major. Written in
  [test/AGENTS.md](../test/AGENTS.md#commands). Alternatives, if the hand step should be automated:
  - **A workflow of our own that does Dependabot's job**: monthly, `pack-build.sh`, then `pnpm -C test update` for
    the same packages, then a pull request. It needs `contents: write` and `pull-requests: write`, and a pull request
    a workflow opens with `GITHUB_TOKEN` gets its CI runs "in an **approval-required** state" (*GITHUB_TOKEN*, read
    2026-11-09), so each needs a click before `build` can pass; a GitHub App or a personal token avoids the click and
    is one more secret. Whether the repository allows Actions to open pull requests (a setting) is not checked.
  - **A reminder only**: a monthly job with read permissions that runs `pnpm harness:install` and
    `pnpm -C test outdated`, and fails, so GitHub mails it, when anything but the pins is behind.
- **D3, the first hand update.** Recommended: `dotenv` 18.0.9 in this change (P2), with `pnpm pack-test` after it.
  Rejected: leaving it for the next month.

## Implementation

1. [dependabot.yml](../.github/dependabot.yml): the `/test` entry removed; the header says the root and `website/`,
   and why not `test/`, in one sentence.
2. The guide: [.github/AGENTS.md](../.github/AGENTS.md#the-workflows) and *Tests and checks* say the root and
   `website/`, and that `test/`'s dependencies move by hand, since its `pomwright` is the packed build a checkout does
   not have; [test/AGENTS.md](../test/AGENTS.md#commands), under *Commands*, the steps of D2.
3. `dotenv` 18.0.9 in `test/` (D3).

## Tests

No spec or unit test changes. Locally: `pnpm lint`, `pnpm lint:workflows`, `pnpm lint:guide`, `pnpm docs:build`, and
`pnpm pack-test` on every browser with `dotenv` 18.0.9. After the merge: the change to `dependabot.yml` starts
Dependabot's checks at once (item 2), with no `/test` job among them.

## Changeset and versioning

None: no consumer-facing change ([docs/versioning.md](../docs/versioning.md)).

## Risks

- **`test/`'s dependencies lag** when the monthly hand update is forgotten; they lag today too, since the entry has
  never passed.
- **Dependabot's security updates** are set in the repository's settings, not in `dependabot.yml`, and may try `test/`
  too; whether they are on is not readable without a token. Not changed here.

## Decisions

- [x] D1 remove the `/test` entry; `test/`'s dependencies by hand
- [x] D2 by hand with each month's Dependabot pull request for the root, the steps in `test/AGENTS.md` (or: a
  workflow that opens the pull request; or: a monthly reminder job)
- [x] D3 `dotenv` 18.0.9 now

## Execution order

One commit with this file, if asked, not pushed. Before the merge, this folder's audit and deletion
([docs/releases.md](../docs/releases.md), rule 7).

## Execution notes

2026-11-09, D1 to D3, one commit with this file, on Node 26.13.0.

- **Step 1.** `dependabot.yml`: the `/test` entry removed (three entries left: GitHub Actions, `/website`, `/`, which
  Python's YAML parser reads back); its header says why `test/` has none and where its hand update is written.
- **Step 2.** `.github/AGENTS.md` (*The workflows*) and *Tests and checks* say the root and `website/`, and why not
  `test/`; *Tests and checks* also names P4's rejected alternative. `test/AGENTS.md`, *Commands*: the hand update, as
  D2 says, ending with `pnpm pack-test`.
- **Step 3.** `pnpm -C test update dotenv`: 18.0.8 to 18.0.9 (`^18.0.9`), `test/pnpm-lock.yaml` with it.
- **Checks run.** `pnpm lint`; `pnpm lint:workflows`; `pnpm lint:guide` (80 links); `pnpm docs:build` (every internal
  link valid); `pnpm pack-test` on chromium, firefox and webkit with `dotenv` 18.0.9: 1892 passed and 1 skipped, the
  step locations 12, the test server 29.
- **Left:** after the merge, the change to `dependabot.yml` starts Dependabot's checks at once, with no `/test` job;
  this folder's audit and deletion before the merge.
