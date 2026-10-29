# Plan: the checks (2T-1, 2T-2 with 2T-9, 2T-4, 2T-5, 2T-7; the doc comments' examples and 2Z-1)

- **Decisions**: [95, 96, 98, 99, 100, 104 (points 3 and 4), 112 (point 2)](DECISIONS.md) (2026-10-29)
- **Findings**: [2T-1](T-tests-and-checks/defect-2T-1-docs-checks-compare-copies.md),
  [2T-2](T-tests-and-checks/defect-2T-2-snippet-check-misses-spaced-fence.md),
  [2T-9](T-tests-and-checks/defect-2T-9-snippet-check-ignores-tsc-exit-code.md),
  [2T-4](T-tests-and-checks/defect-2T-4-steps-config-allows-only.md),
  [2T-5](T-tests-and-checks/defect-2T-5-api-coverage-skips-members.md),
  [2T-7](T-tests-and-checks/defect-2T-7-test-server-check-blind-spots.md) (all Low)
- **Bump**: none (tests, check scripts and configs; nothing published changes), so no changeset
- **Stop**: **yes**, after step 7's commit: it changes CI's `lint` job (a script instead of the inline step), so the
  maintainer pushes and checks PR #60's run before the next plan. Built first, before the code areas (*Building the
  plans* in [DECISIONS.md](DECISIONS.md)); 2T-3 (decision 97) is built in
  [PLAN-2A-session-storage.md](PLAN-2A-session-storage.md), in the spec it edits.
- **Depends on**: nothing

## Contract

1. **The docs checks read both sides (decision 95).** `test/tests/docs/docsChains.spec.ts` asserts that each test's page
   holds every chain it compares (the seven rendered at run time too), whitespace and comment markers normalised on both
   sides; Firefox's `"    ..."` line, which the page leaves out on purpose, is a named exception.
   `test/tests/pageObject/lifecycle.outcomes.spec.ts` parses the rows under *How a mistake is reported* on *Page
   objects* and compares them with what it asserts.
2. **The snippet check misses no TypeScript block and no failing `tsc` (decision 96).** `scripts/check-doc-snippets.mjs`
   reads a fence's language as CommonMark does (the first word after optional spaces); one that is `ts` or `typescript`
   lowercased but not written exactly so is rejected with "write it as ```ts"; a `tsc` that exits non-zero without type
   errors on stdout fails the check with its stderr, or the error's own message when it could not start.
3. **The step-location and outcomes runs forbid `test.only` in CI (decision 98)**: `forbidOnly: !!process.env.CI` in
   `test/playwright.steps.config.ts` and `test/lifecycle-outcomes/playwright.config.ts`.
4. **The API coverage check walks statics and refuses unresolved imports (decision 99).**
   `scripts/check-api-coverage.mjs` walks a class's static side (without `prototype`) under the same rules, and fails on
   TypeScript's unresolved-module diagnostics (TS2307) with "cannot resolve <module> from <path>; install the root
   first".
5. **The test-server check sees every way out (decision 100).** `test/test-server/externalRequests.spec.ts` listens to
   `page.on("websocket")`, scans for `wss?://` and for a `//` that starts a dotted host name with no word character or
   colon before it, and walks the routes of routers as well as the app's own.
6. **The doc comments' examples compile (decision 104, point 4).** `scripts/check-doc-snippets.mjs` also compiles every
   `@example` block of `src/`, with shared declarations for the context the examples assume (a page, a registry and its
   paths, a page object), and reports each that does not, with its file and line; an example that cannot stand alone
   carries an explicit opt-out marker, counted in the summary as `nocheck` blocks are. Started from the review's
   `H/examples` scripts. Its first run shows how many need the marker. `PageObjectTypeOptions`' example (2Z-1), which it
   fails, gets its empty `protected defineLocators(): void {}` in the same commit.
7. **The guide's links resolve (decision 112).** A script checks every relative link and anchor of `AGENTS.md`, the
   folder `AGENTS.md` files and `docs/*.md` (GitHub's heading slugs), run in CI's `lint` job and by `pnpm lint`'s
   companion command; it fails with the file, the line and the target.
8. **The workflow lint runs locally (decision 112).** The `lint` job's download, checksum and run of actionlint and
   ShellCheck move into a script that the job runs and `pnpm lint:workflows` runs, with the same pinned versions; the
   release-check scripts' ShellCheck goes with them.

## Current behavior

As the findings describe, each re-checked in the triage (2026-10-29) by reading the code at the branch, whose `src/`,
`test/` and `scripts/` equal `d850405`: the docs specs hold copies; the fence regex is
`` /^(\s*)(`{3,}|~{3,})(\w*)(.*)$/ `` and the `catch` reads `error.stdout` only; neither config sets `forbidOnly`; the
coverage walk takes the instance side only and ignores diagnostics; the test-server spec listens to requests only, scans
`https?://`, and reads `app.router.stack`'s own routes. No page uses a spaced or variant TypeScript fence (`ts` 238,
`text`, `mermaid`, `sh`, `html`, `bash`, `js`); no `.only` is committed; no public static exists.

## Implementation (one commit per decision)

1. Decision 95: the two specs.
2. Decision 96: the snippet check; its header and `website/AGENTS.md` (the docs checks) name the rejection.
3. Decision 98: the two configs.
4. Decision 99: the coverage check; its header.
5. Decision 100: the test-server spec, after running the widened scan over the current files (they must stay clean);
   `test/AGENTS.md`'s sentence on what the scan covers.
6. Decision 104, point 4: the doc-example check; the script's header and `website/AGENTS.md` (the docs checks and the
   doc comments' rules) say that the examples compile and how to mark one that cannot stand alone.
7. Decision 112: the guide's link check; the workflow lint as a script and `pnpm lint:workflows`; `test/AGENTS.md`,
   `.github/AGENTS.md` and the root's *Commands* name them.

## Verification

Each fix is shown to catch what it is for, once, and then reverted where it plants something:

- 95: the review's demonstration inverted (`$P/T/sketch/2T-1.diff`, with `$P` the second review's probes folder): a
  chain
  on *Queries* changed from `.first()` to `.last()` and an outcomes row edited, both specs fail; reverted, both pass.
- 96: the review's mirrors: `$P/T/snippets-mirror` (the spaced and the upper-case block reported) and
  `$P/T/snippets-stderr` (the stand-in `tsc` failing on stderr fails the check).
- 98: the review's probe `$P/T/steps/zz-probe-T-only.spec.ts` with `CI=1`: exit 1 with Playwright's `forbidOnly` error.
- 99: `$P/T/api-coverage/mutate.mjs` (the static rows fail) and the unresolved copy (fails with the message); the real
  run stays at 40 exports, 108 members, no problem.
- 100: `$P/T/sketch/2T-7.diff` applied (a `wss://` WebSocket and a `//cdn.example` fetch): the check fails; reverted, 26
  pass.
- 104: `PageObjectTypeOptions`' example fails the new check before its fix (TS2515) and compiles after it; every other
  example compiles or carries the marker.
- 112: a planted broken link and a planted broken anchor in a scratch copy of a guide file fail the link check; the 55
  links of today pass; `pnpm lint:workflows` runs locally with the pinned versions and matches CI's step.

Then: `pnpm lint`, `pnpm test:unit`, `pnpm typecheck` (the snippet, API and error-message checks over the real pages),
`pnpm docs:build`, the full `pnpm pack-test --reporter=line` (its step-location run and, outside CI, the test-server
check included), the grep for the external consumer projects' names.

## Decisions checklist

- [x] Decision 95: both specs read their pages; the named exception; the inverted demonstration must fail
- [x] Decision 96: the fence's language as CommonMark reads it; odd spellings rejected; `tsc` by its exit code
- [x] Decision 98: `forbidOnly` in the steps and outcomes configs
- [x] Decision 99: statics walked; an unresolved import fails
- [x] Decision 100: WebSockets, `wss`, `//host`, routers' routes
- [x] Decision 104, point 4: the doc comments' examples compiled, with an explicit opt-out marker
- [x] Decision 112, point 2: the guide's link check; the workflow lint as a script, run locally too

## Execution

Seven commits, one per decision, named `test: …` or `chore(checks): …` with `Plan:
defect-review-result-2/PLAN-2T-checks.md` and the `Co-Authored-By:` trailer. The maintainer pushes; CI runs every check
on the real pages.
