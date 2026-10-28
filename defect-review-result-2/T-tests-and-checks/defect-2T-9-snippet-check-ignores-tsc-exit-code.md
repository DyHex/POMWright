# 2T-9: The snippet check judges `tsc` by its stdout, so a `tsc` that fails with its message on stderr (a crash, an out-of-memory abort) passes the check

- **Kind**: defect
- **Area**: documentation checks: `scripts/check-doc-snippets.mjs`
- **Severity**: Low (needs `tsc` itself to fail rather than report; then every example is reported as checked and none
  was)
- **Semver of the fix**: none (tooling only)
- **Pass**: 4
- **First review**: missed by the first review (the `try`/`catch` around `execFileSync` reads only `error.stdout` at
  54cdada too)
- **Reviewed**: `d850405`, 2026-10-28T18:56+01:00, Opus 5.5, second review, segment 2T

## Contract

- `scripts/check-doc-snippets.mjs:1-3`: "Type-checks every TypeScript code block of the documentation and the README
  against the packed package".
- `internal/documentation.md`, *What keeps it true*: "**Examples compile.** ... compiles it against the installed
  package"; "**Nothing is skipped silently.**"
- The repository's own way of judging a run (root `AGENTS.md`, *Commands*, and the skill's ground rule this review
  follows): a run is judged by its exit code.

## Reproduction

A mirror root outside the worktree: the script unchanged, the two tsconfigs, the example app, a README stub, one page
with one block that does not compile, and `node_modules/.bin/tsc` replaced by a stand-in that does what V8 does when the
heap runs out (a message on stderr, exit 134, nothing on stdout). Folder:
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/snippets-stderr/` (setup in `log.md`, 18:56).

```sh
cd /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/snippets-stderr && node scripts/check-doc-snippets.mjs
```

exit 0:

```text
doc snippets: 1 checked, 0 skipped (nocheck), example app: 5 files
```

The same page with the real `tsc` (the mirror of 2T-2) fails with the block's error, exit 1.

## Observed / expected

Observed: `execFileSync` throws for the non-zero exit; the `catch` keeps `String(error.stdout)`, which is empty, so
`typeErrors` is `""`, nothing is printed, and the script reports the blocks as checked and exits 0.

Expected: a non-zero exit of `tsc` fails the check, with its stderr shown when stdout has nothing.

## Cause

`scripts/check-doc-snippets.mjs:119-134`: the catch reads only `error.stdout`; `error.status`, `error.signal` and
`error.stderr` are ignored. (A missing `tsc` makes `error.stdout` `undefined`, so the check fails with the text
"undefined", by accident.) The coverage and error-message checks use the compiler API in-process, where an exception
ends the script with a non-zero exit.

## Fix plan

- **Intended contract**: the check passes only when `tsc` exits 0.
- **Options**: (recommended) in the `catch`, set `typeErrors` to `error.stdout` when it has text, otherwise to
  `` `tsc exited ${error.status ?? error.signal}: ${error.stderr}` ``, and fail. Cost: a few lines; no change for a real
  type error (stdout is mapped to page lines as now).
- **Implementation steps**: `scripts/check-doc-snippets.mjs`, the `catch` after `execFileSync`.
- **Tests**: the mirror above must exit 1 and print the stand-in's message; the 2T-2 mirror's control still maps its
  error to the page line.
- **Docs**: none.
- **Changeset**: none.
- **Decisions to tick**: none.
- **Related**: 2T-2 (the same script's fence parsing).
