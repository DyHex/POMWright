# Plan 42: publish only from `main`, through a GitHub environment

- **Decisions**: to be recorded as decision 74 once this plan is agreed
- **Findings**: none (raised on 2026-10-28, with the Trusted Publisher; decision 72)
- **Bump**: none (CI)
- **Stop**: **yes**, after the commit: the maintainer pushes; the PR run validates the workflow's lint, and the
  environment's real run comes after the merge (`publish.yaml` runs only on `main`)
- **Depends on**: plan 41 part 2's commit; the maintainer's step 1 below before the merge

## Contract

Only `main`'s Publish job can publish `pomwright`. npm's Trusted Publisher matches the repository, the workflow file
name and, when one is set, an environment; it has no branch field. So without an environment, a `publish.yaml` on any
branch, pushed by anyone who can push to the repository, could exchange the workflow's OIDC token and publish. With the
publish job in an environment that only `main` may deploy to, and that environment named in the Trusted Publisher,
GitHub refuses the job on any other branch, and npm refuses a token that does not carry the environment. Runs for pull
requests from forks were never a risk: GitHub gives them no `id-token: write`.

`pages.yaml` already works this way: its deploy job runs in the `github-pages` environment, which allows `main` only,
from the same `workflow_run` trigger.

## The guide: your steps

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

### 2. The workflow change (Claude, this plan's commit)

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

1. `.github/workflows/publish.yaml`: `environment: npm` on the `publish` job, after `runs-on`, with a comment: only
   `main` may deploy to `npm` (its branch rule), and the Trusted Publisher names the environment, so a `publish.yaml`
   on another branch cannot publish. The header comment says the same in one sentence.
2. AGENTS.md: §2's `publish.yaml` description (the job runs in the `npm` environment, which allows `main` only, and the
   Trusted Publisher names it); §7's Trusted Publishing bullet (the environment, and that it is set up before the
   publisher); §8, beside "remove the publish guard": remove the publish job's environment or its branch rule.
3. *Internal → Tests and checks*: one sentence beside Trusted Publishing.
4. DECISIONS.md 74; PLANS.md row 42 and the maintainer's actions (step 1 before the merge; the environment name in step
   3).

## Verify

`pnpm lint`; `pnpm test:unit`; `pnpm pack-test --reporter=line` (PLANS.md rule 5); `pnpm docs:build`; actionlint 1.7.12
with ShellCheck 0.11.0, the versions `checks.yaml` pins, downloaded to the scratchpad and checked against its SHA-256
values.

## Commit

```text
ci: publish only from main, through the npm environment

The publish job runs in the npm environment, which only main may deploy
to, and the Trusted Publisher names it, so a publish.yaml on any other
branch cannot publish.

Plan: defect-review-result/PLAN-publish-environment.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes
