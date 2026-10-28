# Plan 42: publish only from `main`; the harness on every LTS Node line

- **Decisions**: to be recorded as decisions 74 (the environment) and 75 (the Node lines) once this plan is agreed
- **Findings**: none (raised on 2026-10-28: the environment with the Trusted Publisher, decision 72; the Node lines from
  plan 41's Node 22 question)
- **Bump**: none (CI)
- **Stop**: **yes**, after the commits: the maintainer pushes; the PR run validates the lint and runs the Node matrix,
  and the environment's real run comes after the merge (`publish.yaml` runs only on `main`)
- **Depends on**: plan 41 part 2's commit (`01d1096`); the maintainer's guide step 1 before the merge

## Contract

**A. Publish only from `main`.** npm's Trusted Publisher matches the repository, the workflow file name and, when one
is set, an environment; it has no branch field. So without an environment, a `publish.yaml` on any branch, pushed by
anyone who can push to the repository, could exchange the workflow's OIDC token and publish. With the publish job in an
environment that only `main` may deploy to, and that environment named in the Trusted Publisher, GitHub refuses the job
on any other branch, and npm refuses a token that does not carry the environment. Runs for pull requests from forks were
never a risk: GitHub gives them no `id-token: write`. `pages.yaml` already works this way: its deploy job runs in the
`github-pages` environment, which allows `main` only, from the same `workflow_run` trigger.

**B. Every LTS Node line from the floor up.** CI runs the harness on each LTS line from the `engines` floor (20) up. The
newest line CI has moved to is the default (24 today): contributors use it, the unit tests, the package, the consumer
and site jobs run on it, and its harness runs the browsers the caller asks for (chromium on pull requests; chromium,
firefox and webkit on `main`), each at the Playwright pin and at the latest 1.x. Every other LTS line runs the chromium
harness at the pin, on pull requests and on `main`: today 20 and 22. The list moves with Node's schedule: a line joins
when it is LTS, the floor's line leaves when `engines` moves, and issue #55 makes 26 the default (LTS since
2026-10-28) and moves 24 into the matrix.

Node's schedule (`nodejs/Release`'s `schedule.json`, read 2026-10-28): 20 end of life 2026-04-30 (still Playwright
1.64's and POMWright's `engines` floor), 22 maintenance until 2027-04-30, 24 maintenance since 2026-10-20, 26 LTS from
2026-10-28.

## The guide: your steps for A

### 1. Create the environment (any time before the merge)

Create it before the workflow change reaches `main`: GitHub creates a missing environment, without any rule, the first
time a workflow names it.

1. Open `https://github.com/DyHex/POMWright`, click **Settings**, then **Environments** in the left sidebar.
2. Click **New environment**, enter the name `npm`, and click **Configure environment**.
3. Under **Deployment branches and tags**, choose **Selected branches and tags** in the dropdown.
4. Click **Add deployment branch or tag rule**. Set **Ref type** to **Branch**, enter the name pattern `main`, and click
   **Add rule**.
5. Leave **Required reviewers** and **Wait timer** unselected. Required reviewers would ask for your approval on every
   Publish run, and Publish runs after every push to `main`, not only for releases.
6. If **Allow administrators to bypass configured protection rules** is shown, deselect it and click **Save protection
   rules**. GitHub's docs do not say exactly which rules it covers, so deselecting it is the stricter choice.
7. Add no secrets or variables: the publish job needs none.

### 2. The workflow change (Claude, this plan's first commit)

`publish.yaml`'s `publish` job gets `environment: npm`. You push; the PR run checks it with actionlint.

### 3. The Trusted Publisher (right before merging PR #60)

On `https://www.npmjs.com/package/pomwright`, **Settings**, **Trusted Publisher**, **GitHub Actions**:

- **Organization or user**: `DyHex`
- **Repository**: `POMWright`
- **Workflow filename**: `publish.yaml`
- **Environment name**: `npm`
- **Allowed actions**: **Allow npm publish** checked (decision 72)

Every field is case-sensitive and must match exactly. npm checks nothing when you save; the first publish does, and it
must succeed within 2 days of saving, or the publisher expires. A publisher cannot be edited: to change a field, delete
it and add it again.

### 4. After the merge

- The first Publish run on `main` (it opens the Version Packages pull request) shows a deployment to `npm` in its
  summary, and the repository's **Environments** lists it. It must succeed.
- Merge the Version Packages pull request within the 2 days of step 3. Publish then publishes 3.0.2; check its
  attestation (`npm view pomwright@3.0.2 dist --json`).

### Later

- Renaming the environment means changing `publish.yaml` and deleting and re-adding the Trusted Publisher, within 2 days
  of the next publish.
- Branch protection on `main` stays the gate for what reaches `main`; the environment only keeps other branches out.

## Implementation steps (Claude)

### Commit 1, A

1. `.github/workflows/publish.yaml`: `environment: npm` on the `publish` job, after `runs-on`, with a comment: only
   `main` may deploy to `npm` (its branch rule), and the Trusted Publisher names the environment, so a `publish.yaml`
   on another branch cannot publish. The header comment says the same in one sentence.
2. AGENTS.md: §2's `publish.yaml` description (the job runs in the `npm` environment, which allows `main` only, and the
   Trusted Publisher names it); §7's Trusted Publishing bullet (the environment, set up before the publisher); §8,
   beside "remove the publish guard": remove the publish job's environment or its branch rule.
3. *Internal → Tests and checks*: one sentence beside Trusted Publishing.

### Commit 2, B

1. `.github/workflows/checks.yaml`: the job `harness-node-floor` becomes `harness-node`, a matrix over
   `node: ["20", "22"]` with `fail-fast: false`, named `Harness (chromium, Playwright pin, Node ${{ matrix.node }})`;
   `setup-node` takes `${{ matrix.node }}.x`; the run step's name and the failure report's artifact name carry the
   version (`playwright-report-chromium-node${{ matrix.node }}-…`). The input `node-floor` becomes `older-node-lines`,
   described as "Also run the chromium harness at the Playwright pin on every LTS Node line below the default, from the
   engines floor"; `pr.yaml` and `main.yaml` pass it with their comments updated. The header comment says which lines
   run and that the list moves with Node's schedule (#55). The `consumer` job's Node 20 loading probe stays: it checks
   the floor.
2. AGENTS.md: §2's `.github/workflows/` row (the matrix, which lines, where the list lives), §3 where it names the
   floor job, §4's harness bullet ("Node 20 runs chromium only" and the browsers per line), §7 if it names the job;
   *Internal → Tests and checks* where it describes the floor job; the `urlForms.spec.ts` sentence in AGENTS.md §4 stays
   true (it names Node 20 and 22, which now both run it).
3. DECISIONS.md 74 and 75; PLANS.md row 42 and the maintainer's actions (guide step 1 before the merge; the
   environment name in step 3; #55's body: CI runs every LTS line from the floor, and 24 joins the matrix when 26
   becomes the default).

## Verify

- `pnpm lint`; `pnpm test:unit`; `pnpm docs:build`; actionlint 1.7.12 with ShellCheck 0.11.0 (the versions and SHA-256
  values `checks.yaml` pins, in the scratchpad).
- The harness on Node 22, as the new matrix row runs it: Node 22.18.0 (installed),
  `POMWRIGHT_TARBALL=pomwright-test-build.tgz bash pack-test.sh --project=chromium --reporter=line`, after a build on
  Node 24 as CI's `package` job does.
- `pnpm pack-test --reporter=line` on the three browsers (PLANS.md rule 5), once, before the second commit.
- After the push: the PR run shows two Node rows, 20 and 22, both green.

## Commits

```text
ci: publish only from main, through the npm environment

The publish job runs in the npm environment, which only main may deploy
to, and the Trusted Publisher names it, so a publish.yaml on any other
branch cannot publish.

Plan: defect-review-result/PLAN-publish-environment-node-lines.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
ci: the chromium harness on every LTS Node line below the default

Node 20, the engines floor, and Node 22 each run the chromium harness at
the Playwright pin, on pull requests and on main; Node 24 stays the
default, with every browser on main.

Plan: defect-review-result/PLAN-publish-environment-node-lines.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes
