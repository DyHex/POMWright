# 2G-5: Two CI descriptions lag the jobs added on 2026-10-28: *Tests and checks* lists no test-server job, and `pr.yaml`'s header names Node 20 only

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 107 in [DECISIONS.md](../DECISIONS.md)
- **Area**: CI: the CI section of `website/src/content/docs/internal/tests-and-checks.md`; `pr.yaml`'s header comment
- **Severity**: Low (descriptions only; the guide's `.github/AGENTS.md` and `checks.yaml` describe both correctly)
- **Semver of the fix**: none (docs and a workflow comment)
- **Pass**: 1
- **First review**: new since 54cdada (0905892 added the test-server job without the Internal page; d850405 added
  Node 22 without `pr.yaml`'s header)
- **Reviewed**: `d850405`, 2026-10-28T18:09:20+01:00, Opus 5.5, second review, segment 2G

## Contract

- `website/src/content/docs/internal/tests-and-checks.md`, lines 6–8: "POMWright is checked in four layers: … and CI,
  which runs them for every change. This page explains what each layer covers and why it is there." Its *CI* section
  (lines 76–96) lists the jobs one by one: lint, package, harness, consumer, site, build.
- `.github/workflows/checks.yaml` has seven jobs: those six (build is the callers') and `test-server` (lines 188–220,
  "Test server: no external requests", once per run, on chromium), which `.github/AGENTS.md` (lines 20–21) and
  `test/AGENTS.md` (lines 73–79) describe, and which `main`'s required check covers through the gate.
- `.github/workflows/pr.yaml` lines 3–4: "The harness runs on chromium only, also on Node 20, the engines floor"; the
  same file's line 17 and `checks.yaml`'s `harness-node` matrix (line 158: `node: ["20", "22"]`) run Node 20 and 22, and
  PR #60's run on `d850405` shows both jobs ("Harness (chromium, Playwright pin, Node 20)" and "… Node 22", `G/api/
  jobs-40687553108.json`).

## Reproduction

```sh
grep -n "test-server\|test server\|external\|another host" website/src/content/docs/internal/tests-and-checks.md   # no match, exit 1
grep -n "^  [a-z-]*:$" .github/workflows/checks.yaml   # the job ids: lint, package, harness, harness-node, test-server, consumer, site
sed -n 3,4p .github/workflows/pr.yaml
git show d850405 -- .github/workflows/pr.yaml   # changes line 17 only
git show 0905892 --stat   # adds the job and updates .github/AGENTS.md, AGENTS.md, test/AGENTS.md, docs/repository.md, not the page
```

## Observed / expected

The Internal page, which says it explains what each layer covers, has no word about the job that checks that no page of
the test server loads anything from another host, nor about that check anywhere else on the page; a reader of the site
learns of it only from the contributor guide. `pr.yaml`'s header says Node 20 where the workflow runs 20 and 22.

Expected: the *CI* list names every job of `checks.yaml`, and the header says what the file runs.

## Cause

Commits 0905892 and d850405 updated the guide and the workflows' own lines but not these two descriptions.

## Fix plan

Intended contract: the Internal page's CI list and the workflow headers match `checks.yaml`.

Steps: `tests-and-checks.md` *CI*: add "**test-server**: once per run, on chromium, every page of the test server opened
and its source and test data scanned: nothing loads from another host (a slow host once made the harness flaky)", and,
under *The harness*, a sentence on `test-server-check.sh` at the end of `pnpm pack-test`; `pr.yaml` lines 3–4: "also on
Node 20 and 22, the older LTS lines from the `engines` floor". Tests: none (the API coverage and snippet checks do not
cover Internal prose; `check-api-coverage.mjs` is 2T's). Changeset: none. No decision needed.
