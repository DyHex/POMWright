# Plan: Node 26 for contributors and CI (issue #55)

Status: **executed** 2026-11-09 (one commit, not pushed), on the branch `test/daily-workflow`, after
[PLAN-daily-release-run.md](PLAN-daily-release-run.md)'s steps 0 to 4 and before its step 5. CI, the toolchain and the
docs: the package does not change (P6), so no changeset and no release. Closes #55. See *Execution notes* at the end.

## Intent

Issue #55: "Once Node 26 is LTS, contributors and CI move from Node 24 to 26. The `harness-node-floor` job stays on the
`engines` floor (Node 20)." Node 26 has been LTS since 2026-10-28. Afterwards: Node 26 is the default of every CI job
and of contributors, `@types/node` follows it to 26, and the chromium harness at the pin also runs on every older line
the `engines` floor still covers: 20, 22 and 24. `engines` stays `>=20`.

## The contract

- **Node lines** (your decision): 26 the default (`lint`, `package`, `harness`, `test-server`, `consumer`, `site`,
  `publish.yaml`, `pages.yaml`); `harness-node` on 20, 22 and 24 (chromium at the pin, pull requests and `main`
  alike); the `consumer` job's loading check stays on 20, the `engines` floor. `Daily` runs on the default, so on 26
  (its D14 makes that the newest 26 patch).
- **`@types/node` ^26** in the root and `test/`, as it follows the Node of contributors and CI. Dependabot keeps
  holding its majors.
- **`engines` unchanged** (`>=20`): Playwright 1.64.0, 1.65.0 and its `next` all declare `node >=20`, and the floor
  moves when Playwright's does ([docs/versioning.md](../docs/versioning.md#supported-versions)). Playwright 1.65 "no
  longer tests on Node.js 20" (its release notes, 2026-11-05) but still declares it; `harness-node` runs Node 20 at the
  pin, 1.64.0, which Playwright still tested there.

## Verified current behavior

1. **Node 24 is the default everywhere.** `node-version: 24.x` in `checks.yaml`'s `lint`, `package`, `harness`,
   `test-server`, `consumer` and `site` ([checks.yaml:41](../.github/workflows/checks.yaml#L41),
   [66](../.github/workflows/checks.yaml#L66), [107](../.github/workflows/checks.yaml#L107),
   [186](../.github/workflows/checks.yaml#L186), [218](../.github/workflows/checks.yaml#L218),
   [247](../.github/workflows/checks.yaml#L247)), in [publish.yaml:60](../.github/workflows/publish.yaml#L60) and
   [pages.yaml:70](../.github/workflows/pages.yaml#L70); `harness-node`'s matrix is `["20", "22"]`
   ([checks.yaml:142](../.github/workflows/checks.yaml#L142)); the consumer's loading check runs on `20.x`
   ([checks.yaml:228](../.github/workflows/checks.yaml#L228)). The header already states the rule: "a line joins when
   it is LTS, the floor's line leaves when engines moves, and issue #55 makes 26 the default and moves 24 here"
   ([checks.yaml:9-10](../.github/workflows/checks.yaml#L9-L10)).
2. **Node's schedule** (`nodejs/Release`'s `schedule.json`, 2026-11-09): 20 ended 2026-04-30; 22 in maintenance,
   ending 2027-04-30; 24 in maintenance since 2026-10-20, ending 2028-04-30; 26 LTS since 2026-10-28, ending
   2029-04-30. Newest patches (`nodejs.org/dist/index.json`): 20.20.2, 22.23.4, 24.22.2, 26.13.0.
3. **The runners.** The images of 2026-11-01 (`ubuntu-24.04` 20261101.360.1, `ubuntu-26.04` 20261101.186.1) cache
   Node 22.23.4 and 24.22.2, no 20 and no 26; `actions/setup-node` downloads a line it does not find cached
   ([daily plan, D14](PLAN-daily-release-run.md)), so `26.x` and `20.x` are downloaded at their newest, as `20.x` is
   today.
4. **`@types/node`** is `^24.19.2` in [package.json:87](../package.json#L87) and
   [test/package.json:13](../test/package.json#L13); Dependabot holds its majors for #55
   ([dependabot.yml:5-7](../.github/dependabot.yml#L5-L7), [40](../.github/dependabot.yml#L40),
   [56](../.github/dependabot.yml#L56)). npm's `latest` is 26.6.6. `website/` has none.
5. **Where the docs say 24.** The toolchain ([docs/repository.md:66-68](../docs/repository.md#toolchain)); the site's
   build ([website/AGENTS.md:130-131](../website/AGENTS.md#the-sites-scripts)); the workflows
   ([.github/AGENTS.md](../.github/AGENTS.md#the-workflows): "on Node 24, the default", "a matrix of 20 and 22 …
   issue #55 makes 26 the default", "`@types/node` (issue #55)", "build on Node 24");
   [*Internal → Tests and checks*](../website/src/content/docs/internal/tests-and-checks.md) ("on Node 24; one more
   job per older LTS Node line, from the `engines` floor (20 and 22)"); `checks.yaml`'s header and `harness-node`'s
   comment ([checks.yaml:7-11](../.github/workflows/checks.yaml#L7-L11), [133](../.github/workflows/checks.yaml#L133));
   the comments of [pr.yaml:3](../.github/workflows/pr.yaml#L3), [pr.yaml:18](../.github/workflows/pr.yaml#L18) and
   [main.yaml:27](../.github/workflows/main.yaml#L27) ("Node 20 and 22"); [tsconfig.vitest.json:4-5](../tsconfig.vitest.json#L4-L5)
   ("Node 24 supports"); [consumer-check.sh:9-10](../scripts/consumer-check.sh#L9-L10) ("below 5.2 … with the
   @types/node the repository uses, Node's report errors").
6. **Pages that describe Node's own behavior.** *URLs and navigation*
   ([urls-and-navigation.md:65](../website/src/content/docs/docs/urls-and-navigation.md)): "as `new URL` does on
   Node 24 while Node 20 and 22 keep it"; *Internal → URL matching*
   ([url-matching.md:61](../website/src/content/docs/internal/url-matching.md)): "which `new URL` writes too on Node 24
   (its URL parser, ada 4 …) but keeps on Node 20 and 22". *Installation*
   ([installation.md:57-60](../website/src/content/docs/docs/installation.md#typescript-settings)): "Below TypeScript
   5.2, Playwright's declarations and Node's may need it, depending on `@types/node`: with `@types/node` 24, 5.0 and 5.1
   report errors in both, and with 22, 5.0 reports them in Node's." The other mentions stay true as written ("before
   Node 24" in [src/helpers/AGENTS.md:94](../src/helpers/AGENTS.md), "on Node 20 and 22" in
   [test/AGENTS.md:156](../test/AGENTS.md) and *URL matching*'s line 31).

## Probes

On this machine (32 threads, Ubuntu 26.04), Node 26.13.0 unless named, pnpm 12.14.0, `CI=true` where `pack-test.sh`
ran, in a scratch worktree of `8214027` (3.0.2) with `@types/node` raised to ^26.6.6 in the root and `test/` (P2, P3),
since removed.

- **P1, `new URL` on each line.** Every printable ASCII character in the path, the query and the fragment through
  `new URL`: Node 26.13.0 (ada 4.0.0) gives exactly what 24.22.0 (ada 4.0.0) gives; 22.18.0 and 20.20.2 (ada 2.9.2)
  differ from them in one place, a `^` in the path (`/p^q` against `/p%5Eq`), as the pages say.
- **P2, the whole repository on 26 with `@types/node` 26.** Frozen install, then `pnpm add -D @types/node@^26.6.6`
  (26.6.6; 36 changed lines in the lockfile); `pnpm build`; `dist/` byte-identical to the build with `@types/node` 24 (`diff -r`,
  4 files); `pnpm test:unit` 1014 passed, no type errors; `test/`'s `@types/node` raised the same way; `pack-test.sh
  --project=chromium`: all type checks (the harness, the declaration emit, the decorator modes, the doc snippets, the
  API coverage, the error messages, Playwright's retries), 631 passed, the step locations 12, the test server 29;
  `consumer-check.sh`: every check (TypeScript 6.0.3 under each resolution; 5.0.4 and 5.1.6 with `skipLibCheck`,
  5.9.3, 6.0.3, 7.0.2 in both decorator modes; attw; the runner in both module types); `pnpm docs:diagrams` after the
  site's frozen install: the site built, 17 diagrams on 13 pages, light and dark, 0 problems.
- **P3, the older lines with `@types/node` 26.** The same worktree, `pack-test.sh --project=chromium`: Node 20.20.2,
  631 passed; Node 22.18.0, 631 passed.
- **P4, TypeScript against each `@types/node`**, without `skipLibCheck` (`consumer.ts`, `--strict --target es2022
  --types node --module esnext --moduleResolution bundler`, with `@playwright/test` 1.64.0 and the packed 3.0.2):

  | `@types/node` | TS 5.0.4 | TS 5.1.6 | TS 5.2.2 to 5.5.4 | TS 5.6.3, 5.7.3 |
  | --- | --- | --- | --- | --- |
  | 22.20.5 | 2 in Node's | none | none | not run |
  | 24.19.2 | 24 in Playwright's, 59 in Node's | 24 and 57 | none (5.2.2; 5.3 to 5.5 not run) | not run |
  | 26.6.6 | 24 in Playwright's, 93 in Node's, 1 in `lib.dom.d.ts` (`TextEncoder` against `node:util`'s) | 24, 91 and 1 | 7 in Node's (`IteratorObject`, `BuiltinIteratorReturn`, …) | none |

  With `skipLibCheck`, `@types/node` 26 and TypeScript 5.0.4 to 5.5.4: none. POMWright's declarations report none in
  any cell. `@types/node` 26.6.6 and 24.19.2 both declare `typeScriptVersion` 5.6, DefinitelyTyped's oldest supported.
- **P5, the lint job on 26.** `pnpm lint`, `pnpm lint:guide` and `scripts/release-check.test.sh` passed.
  (`pnpm lint:workflows` runs two binaries, no Node.)
- **P6, the build does not depend on the Node line.** `pnpm build` on Node 24.22.0 and on 26.13.0 (with `@types/node`
  24): byte-identical `dist/`. With P2, the package built on 26 with `@types/node` 26 is the one 3.0.2 ships.
- **P7, what `skipLibCheck` hides.** P4's project, TypeScript 5.0.4, `@types/node` 26.6.6: no error in
  `node_modules/pomwright/` or `consumer.ts`, without `skipLibCheck`. With `declare const probeBroken: NotAType;`
  appended to the installed `dist/index.d.mts`: without `skipLibCheck`, `node_modules/pomwright/dist/index.d.mts(3,28):
  error TS2304: Cannot find name 'NotAType'`; with it, no error at all. So the consumer check's 5.0 and 5.1 runs, which
  pass `--skipLibCheck` ([consumer-check.sh:101](../scripts/consumer-check.sh#L101)), would pass a broken POMWright
  declaration, while *Installation* promises "Its declarations compile with TypeScript 5.0 and later, without
  `skipLibCheck`". The harness compiles them without it on TypeScript 6 only (`test/` sets no `skipLibCheck`); the
  consumer check's 5.9, 6 and 7 runs too.
- From the daily plan (its P1 and P6), on Node 26.13.0 with `@types/node` 24: the harness at the pin on chromium (631),
  firefox (631) and webkit (630, 1 skipped); the consumer check; `--node-floor` ("import and require share one copy").

**Stand-ins.** This machine stands in for the runner: its Node 22 is 22.18.0 and its 24 is 24.22.0, where CI gets
22.23.4 and 24.22.2, and its OS is 26.04, which `ubuntu-latest` becomes by 19 November (the daily plan's item 9). It
could hide a difference of those patches or of the runner image; the pull request's `PR` and `Daily` runs are the real
check. Firefox and WebKit ran on 26 with `@types/node` 24, not 26: the types do not reach the browsers, and the type
checks that read them ran (P2). `publish.yaml` on 26 cannot be run without a release: the build it publishes is
identical (P6), and `pnpm publish` with provenance on 26 is first shown by the next release.

## Options and recommendations

- **N1, the Node lines.** Your decision: 26 the default, `harness-node` on 20, 22 and 24, the loading check on 20.
  Rejected: dropping 20 while `engines` says `>=20` (a promise left untested; moving `engines` is a consumer-facing
  decision of its own, when the peer floor moves).
- **N2, which jobs move.** Recommended: every one on 24 today, `publish.yaml` and `pages.yaml` included, as #55 says.
  Rejected: keeping Publish and Pages on 24, two defaults to keep apart for an identical build (P6).
- **N3, one place for the default.** Recommended: a workflow-level `env: NODE_VERSION: 26.x` in `checks.yaml`, used by
  its six setup-node steps (`node-version: ${{ env.NODE_VERSION }}`), so the next line moves in one place there;
  `publish.yaml` and `pages.yaml` keep their own line, as they are separate workflows. actionlint and the pull request's
  runs check that the `env` context resolves there. Rejected: six literals, as today.
- **N4, `@types/node`.** Recommended: ^26.6.6 in the root and `test/`. Rejected: staying on 24, types that lag the Node
  CI and contributors run, which the hold existed to avoid.
- **N5, Dependabot.** Recommended: keep holding `@types/node`'s majors (a major follows a Node line, by hand); the
  comment says it follows the Node of contributors and CI, 26, without the issue number.
- **N6, *Installation*.** Recommended: replace the facts per `@types/node` major with the rule they come from, which
  `@types/node` states itself: "POMWright's declarations compile with TypeScript 5.0 and later, without
  `skipLibCheck`. Node's (`@types/node`) declare TypeScript 5.6 as the oldest they support, and Playwright's build on
  them: with an older TypeScript, either may report errors, depending on your `@types/node`. Turn on `skipLibCheck`
  there, or use TypeScript 5.6 or later." The first sentence is what CI checks (N8); the second is `@types/node`'s own
  `typeScriptVersion` (5.6 in 24.19.2 and 26.6.6, P4). Rejected: adding 26's row to the facts per major (P4's table),
  which describe other packages, change with any `@types/node` release, and nothing here re-checks; a manual script
  that re-checks them (it goes stale as the text does, unless someone remembers to run it); a CI job that does (a
  `@types/node` release would fail CI with nothing changed here).
- **N7, the URL pages.** Recommended: "on Node 24 and 26" where they say "on Node 24" (P1). Rejected: "24 and later",
  which no probe covers.
- **N8, the consumer check proves the promise.** Recommended: TypeScript 5.0 and 5.1 compile without `skipLibCheck`,
  and the check fails on any error that is not in another package's declarations: one in `node_modules/pomwright/`,
  in the consumer's file, or without a file fails it; one elsewhere under `node_modules/` (`@types/node`,
  `playwright-core`, TypeScript's own `lib.dom.d.ts`, P4) is expected and not counted. Then every CI run backs "compile
  with TypeScript 5.0 and later, without `skipLibCheck`" (P7 shows today's runs do not). Its `@types/node` stays the
  repository's (now 26); its comment says what it checks. `Daily` runs the release's copy, so it gets this from the
  next release. Rejected: as it is (P7).

## Implementation

1. **`@types/node` 26**: `pnpm add -D @types/node@^26.6.6` at the root; `test/`'s the same (after `pack-build.sh`,
   which `test/`'s install needs); [dependabot.yml](../.github/dependabot.yml)'s comment (N5).
2. **CI**: `checks.yaml`: `env: NODE_VERSION: 26.x` and the six setup-node steps (N3); `harness-node`'s matrix
   `["20", "22", "24"]` and its comment; the header (the default 26, the older lines 20, 22 and 24, no #55);
   [publish.yaml:60](../.github/workflows/publish.yaml#L60) and [pages.yaml:70](../.github/workflows/pages.yaml#L70)
   `26.x`; the comments of [pr.yaml](../.github/workflows/pr.yaml) and [main.yaml](../.github/workflows/main.yaml)
   ("Node 20, 22 and 24"). [consumer-check.sh](../scripts/consumer-check.sh): 5.0 and 5.1 without `skipLibCheck`.
   Its `compile()` fails on any non-zero `tsc` exit, so for these two it takes the output, removes the error lines
   whose file is under `node_modules/` but not `node_modules/pomwright/` (with the indented lines that continue them),
   and fails when an error line is left; the `--listFiles` check that the right declarations were read stays. Its
   comment says so. Checked by planting an error in the installed declarations, as P7 did, which must fail it, and in
   the consumer's file, which must too.
3. **Docs**: [docs/repository.md](../docs/repository.md#toolchain) (Node 26 for contributors);
   [website/AGENTS.md](../website/AGENTS.md#the-sites-scripts) (the site builds on Node 26);
   [.github/AGENTS.md](../.github/AGENTS.md#the-workflows) (the default 26, the matrix 20, 22 and 24, the site on 26,
   `@types/node`'s hold); [*Internal → Tests and checks*](../website/src/content/docs/internal/tests-and-checks.md)
   (on Node 26; the older lines 20, 22 and 24); [*Installation*](../website/src/content/docs/docs/installation.md)
   (N6); [*URLs and navigation*](../website/src/content/docs/docs/urls-and-navigation.md) and
   [*Internal → URL matching*](../website/src/content/docs/internal/url-matching.md) (N7);
   [*Internal → Packaging*](../website/src/content/docs/internal/packaging.md) and *Tests and checks*' `consumer`
   entry (POMWright's declarations without `skipLibCheck` from 5.0, N8); [tsconfig.vitest.json](../tsconfig.vitest.json)'s
   comment (Node 26). Then `git grep -n "Node 24\|24\.x\|#55"` outside `CHANGELOG.md`, each hit read.

## Tests

No spec or unit test changes. Locally on 26: `pnpm lint`, `pnpm lint:workflows`, `pnpm lint:guide`, `pnpm test`
(the unit tests, then `pack-test` on every browser), `pnpm docs:diagrams`, `bash scripts/consumer-check.sh` with the
packed tarball, with N8's two planted errors; on 20, 22 and 24, `pack-test.sh --project=chromium`. In CI: the pull request's `PR` run (chromium on 26, `harness-node` on 20, 22 and 24, every other job on
26) and its `Daily` run (3.0.2 on 26); after the merge, `CI` on `main` (three browsers on 26) and `pages.yaml`'s
deploy; the next release shows Publish on 26.

## Changeset and versioning

None: `dist/` does not change (P2, P6), `engines` does not move, `@types/node` is a dev dependency, and the pages that
change describe Node and `@types/node`, not the package; the site deploys them from `main`
([docs/versioning.md](../docs/versioning.md)).

## Risks

- **Publish on 26** is first run by the next release (stand-in above); a failure there fails Publish, not the package,
  and a re-run on 24 is one line.
- **The runner's Node 26** is downloaded until the images cache it (item 3): a few seconds per job.
- **TypeScript 5.2 to 5.5 users with `@types/node` 26** need `skipLibCheck`; that is `@types/node`'s, which N6 says.
- **N8's filter** could hide an error a TypeScript release starts reporting in another package's declarations because
  of POMWright's; P4 found none such, and the harness and the 5.9, 6 and 7 runs still compile everything unfiltered.

## Decisions

- [x] N1 26 the default; `harness-node` on 20, 22 and 24; the loading check on 20 (your decision)
- [x] N2 every job on 24 moves, Publish and Pages included
- [x] N3 one `NODE_VERSION` in `checks.yaml`
- [x] N4 `@types/node` ^26 in the root and `test/`
- [x] N5 Dependabot keeps holding `@types/node`'s majors, the comment without #55
- [x] N6 *Installation* states `@types/node`'s own TypeScript floor instead of facts per major
- [x] N7 the URL pages say "on Node 24 and 26"
- [x] N8 the consumer check compiles 5.0 and 5.1 without `skipLibCheck`, failing on POMWright's errors only

## Execution order

One commit, as asked (2026-11-09), after the daily plan's: steps 1 to 3 with this file, not pushed. The pull request
says "Closes #55". Then the daily plan's step 5, once `PR` and `Daily` are green on the last commit, and this folder's
audit and deletion before the merge.

## Noticed, not in this plan

Nothing open: the facts per `@types/node` major and the unchecked promise became N6 and N8.

## Execution notes

2026-11-09, steps 1 to 3, one commit with this file, on Node 26.13.0.

- **Step 1.** `@types/node` 26.6.6 in the root and `test/`; the lockfiles change only it and its `undici-types` (7.24.6
  to 8.9.0). Dependabot's comment and both holds name the reason, not #55.
- **Step 2.** `checks.yaml`'s `env: NODE_VERSION: 26.x` serves seven setup-node steps (the daily plan added the
  `package` job's download step); actionlint accepts the `env` context there. `harness-node` on 20, 22 and 24;
  `publish.yaml` and `pages.yaml` on `26.x`. `consumer-check.sh`: no `--skipLibCheck`; for 5.0 and 5.1, `own_errors`
  (an awk filter) leaves out a diagnostic in `node_modules/` other than `node_modules/pomwright/`, with its indented
  lines, and the `--listFiles` list; an `ok` line says how many errors it left out (118 on 5.0.4, 116 on 5.1.6, as P4).
  Checked that it fails: a scratch copy of the script with only the 5.0 and 5.1 loop, against a tarball with
  `declare const probeBroken: NotAType;` in `dist/index.d.mts` (fails on 5.0.4, showing only that error) and with an
  error in the consumer's file (fails on 5.0.4); the full script against the broken tarball fails earlier, on
  TypeScript 6.0.3's node16 ESM compile, unfiltered. The filter itself on a made-up `tsc` output: an error without a
  file, POMWright's with its indented line and the consumer's kept; `@types/node`'s and `lib.dom.d.ts`'s, and the file
  list, left out.
- **Step 3.** The docs as planned. *Installation*: "Node's declarations (`@types/node`) support TypeScript 5.6 and
  later, and Playwright's build on them: with an older TypeScript, either may report errors, depending on your
  `@types/node`. Turn on `skipLibCheck` there, or use TypeScript 5.6 or later." (`typeScriptVersion` is 5.6 in
  `@types/node` 22.20.5, 24.19.2 and 26.6.6; 20.19.43 says 5.3.) The `git grep` for "Node 24", "24.x", "#55" and
  "Node 20 and 22" left hits that stay true with 26 added (P1): "before Node 24" in `src/helpers/AGENTS.md`, "from
  Node 24" and "Node 24's writes it" in `src/helpers/url.ts`'s comments, "on Node 24" in `url.test.ts`'s and
  `urlForms.spec.ts`'s comments, and the "Node 20 and 22 keep it" sentences. Those in `src/` are left as they are, so
  the build stays identical.
- **Checks run**, on Node 26.13.0: `pnpm lint`; `pnpm lint:workflows` (six workflows, 11 scripts); `pnpm lint:guide` (78
  links); `pnpm test`: the unit tests 1014 passed, then `pack-test` on chromium, firefox and webkit 1892 passed and 1
  skipped, the step locations 12, the test server 29; `pnpm docs:diagrams`: the site built, 17 diagrams on 13 pages, 0
  problems; `consumer-check.sh` with the packed tarball: 20 checks ok. On 20.20.2, 22.18.0 and 24.22.0:
  `pack-test.sh --project=chromium`, 631 passed each. `dist/` byte-identical to the build before the change.
- **Left:** the pull request's runs (`PR`: chromium on 26, `harness-node` on 20, 22 and 24; `Daily`: 3.0.2 on 26);
  after the merge, `CI` on `main` and `pages.yaml`'s deploy; Publish on 26 at the next release.
