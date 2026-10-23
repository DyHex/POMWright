# PLAN-D15, D16 — the publish workflow and the `exports` map

## D15 — Publish runs on the newest commit, not the tested one (opus-S1)

### Intended contract

`internal/tests-and-checks.md`: nothing is published past a red run. `AGENTS.md` section 7: Publish starts after `CI`
succeeds on a push to `main`.

### Verified current behaviour

[../.github/workflows/publish.yaml](../.github/workflows/publish.yaml) checks out without a `ref`. For a `workflow_run`
event, the default ref and `GITHUB_SHA` are the newest commit on the default branch, not the commit the finished run
tested. `pages.yaml` pins `ref: ${{ github.event.workflow_run.head_sha || github.sha }}` for exactly this reason.
Scenario: `CI` for commit A succeeds while commit B is already on `main` and its own `CI` is still running or has
failed. Publish then runs the changesets action on B, and publishes B's code if B carries no changeset. This was
confirmed by reading; reproducing it needs two pushes to `main` and a release.

### Options

- **A. Skip when `main` has moved.** After the checkout, a step compares `git rev-parse HEAD` with
  `github.event.workflow_run.head_sha` and ends the job without publishing when they differ. The newer commit's own
  `CI` run triggers Publish later (`main.yaml` runs every push, in order). The changesets action keeps running on the
  branch it expects.
- **B. Check out `head_sha`.** The changesets action then works on a detached head. Whether its "Version Packages"
  branch logic still works cannot be tried without a release. Rejected for this patch.

**Recommendation: A.**

### Docs

`internal/tests-and-checks.md` (the publish guard) and `AGENTS.md` section 2 and 7 (R3).

### Bump

None: CI only, no changeset.

## D16 — no `default` export condition (opus-Q3)

### Verified current behaviour

`package.json` `exports["."]` has `import` and `require` only. `@playwright/test` 1.64.0 has
`{"types":"./index.d.ts","import":"./index.mjs","require":"./index.js","default":"./index.js"}`. Node always matches
one of the two, so nothing fails today; a resolver that matches neither has no fallback. `AGENTS.md` section 1 says the
packaging mirrors `@playwright/test`.

### Fix

Add `"default": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }` after `require`.

### Tests

`test/tests/packaging/esmEntry.spec.mts` reads the manifest: it asserts the new condition. Before the merge, the
packaging probes of `AGENTS.md` section 7 (attw, Node 20 and 24, the four TypeScript resolutions, both project types).

### Changeset

`patch`: "The `exports` map has a `default` condition, the CommonJS build, as `@playwright/test`'s has."

## Decisions

- [x] D15: option A (2026-10-22)
- [x] D16: add the condition (2026-10-22)
