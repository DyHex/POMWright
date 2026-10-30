# Plan: locators (2B-1, 2B-4, 2C-3, 2R-1; docs: 2B-2, 2B-3, 2C-1, 2C-2)

- **Decisions**: [87, 88, 92, 93, 103](DECISIONS.md) (2026-10-29)
- **Findings**: [2B-1](B-registration-and-resolution/defect-2B-1-unicode-regexp-quote.md),
  [2B-4](B-registration-and-resolution/defect-2B-4-add-without-locator-method.md) (design),
  [2C-3](C-queries/defect-2C-3-replace-any-frame-terminal-compiles.md) (design),
  [2R-1](R-triage/defect-2R-1-query-default-path-test-gaps.md) (a test gap found in the triage),
  [2B-2](B-registration-and-resolution/defect-2B-2-string-registry-format-check.md),
  [2B-3](B-registration-and-resolution/defect-2B-3-template-value-with-dot.md),
  [2C-1](C-queries/defect-2C-1-replace-first-argument-required.md),
  [2C-2](C-queries/defect-2C-2-errors-page-getlocatorschema.md) (all Low)
- **Bump**: patch. Two new changesets (decisions 87 and 88); two pending ones corrected (decision 103)
- **Stop**: none planned (no CI change); built after the checks and session storage plans
- **Depends on**: nothing

## Contract

1. **`getById` with a unicode-mode RegExp (decision 87).** In `u` or `v` mode, `escapeRegExpForSelector`
   (`src/locators/utils.ts`) writes `"`, `'` and `` ` `` as `\x22`, `\x27`, `\x60` and the second `>` of `>>` as
   `\x3e`; only the selector text changes, never the RegExp. The strategies Playwright builds keep Playwright's
   limitation, which *Registering locators* documents: it applies where a bare Playwright locator works, because
   POMWright chains (`describe`); the workaround (the character written as `\x27` and the like, or no `u`); a link to
   [microsoft/playwright#40446](https://github.com/microsoft/playwright/issues/40446), closed as not planned.
2. **`verify()` reports a stray `add(path)` (decision 88).** The registry remembers each registration that ended without
   a locator method (in `endOpenRegistration`, which records the call that ended it), forgets one whose path is
   registered later, and `verify()` ends the open registration first and reports each: `"main.form@login":
   add("main.form@login") ended without a locator method (at add("main.form@login.button@login")); give it one or remove
   it`. In a page object, at the first use, labeled, as every registry mistake.
3. **The query builder's tests (decision 93).** `update()`, `replace()` and `clearSteps()` compared side by side with
   their explicit-path form; `unskip()` and `unskip(ownPath)` shown not to compile.
4. **The docs (decisions 92 and 103).** *Queries*, *The any-frame form in a query*: the query's own path cannot take it,
   the types do not catch it, and it throws at the call (unlike `skip`), and `replace(…).frameLocator()` is the one
   method that takes no first argument (with 2C-1's other places); a comment at `publicTypes.typecheck.ts:91`; 2B-2's
   `<string>` sentence in its seven places and a `@ts-expect-error` line; 2B-3's sentence on dots in an open part;
   `getLocatorSchema` on *Error messages*' list.

## Current behavior (re-checked 2026-10-29 at the branch)

- `escapeRegExpForSelector` returns a unicode-mode RegExp as `String(re)`, as Playwright 1.64.0's own escaper does; the
  review's probe, re-run on chromium: `getById(/a"b/u)`, `/it's/v`, `/a>>b/u` fail to parse; Playwright's bare
  `getByRole(…, { name: /don't save/iu })` works, its `.first()` and POMWright's resolution fail.
- `endOpenRegistration` (`src/locators/locatorRegistry.ts:161-178`) drops a registration without a definition; the
  review's probe: `verify passed`, the chain without the form. The two external consumer projects hold no such `add`.
- The path-less query forms resolve `subPath ?? this.path` or, for one-argument `nth` and `filter`, `this.path`
  (`src/locators/locatorQueryBuilder.ts`); the tests as 2R-1 lists.
- The docs' sentences as the findings quote them, each found at the branch.

## Implementation (one commit per step)

1. **`getById`** (decision 87): the escaper and its doc comment; *Locating by id* (*Flags*: unicode mode works, quotes
   included); *Registering locators* (the limitation, the workaround, the link); `src/locators/AGENTS.md` if it
   describes the escaper; a new changeset.
2. **`verify()`** (decision 88): `LocatorRegistryInternal` (`endOpenRegistration`, `verify`) and a "has a definition"
   getter on the registration builder; the message on *Error messages* (*Resolving and verifying*), in `verify()`'s
   `@throws`, on *Verifying a registry* (*What it finds*) and *Internal → Resolution* (*What it reports*); a new
   changeset.
3. **The query builder's tests** (decision 93).
4. **The locator pages** (decisions 92, 103): the sentences, the probe comment, the `@ts-expect-error` line, the two
   changesets corrected (`registry-requires-paths.md`, `undefined-first-argument.md`).

## Tests

Each fails before its step and passes after it.

- Unit, `src/locators/utils.test.ts`, *escapeRegExpForSelector*: the case that pins the unescaped output replaced; a
  quote in a character class, in a `v`-mode `\q{…}`, a named group before `>>`, `>>>`.
- Harness, `test/tests/locatorRegistry/add/add.getById.spec.ts` and `test/tests/testApp/testIds.spec.ts`:
  `getById(/…"…/u)`, `/…'…/v`, `/…>>…/u` found through `getNestedLocator` and `getLocator`, on three browsers.
- Unit, `src/locators/locatorRegistry.test.ts`: a stray ancestor, a stray leaf, one ended by `verify()`, one whose path
  is registered later (not reported). Harness, `registry.verify.spec.ts`: the review's probe as a spec.
- Harness, `getLocatorSchema.clearSteps.spec.ts`: `update()`, `replace()`, `clearSteps()` equal to their explicit form;
  `getLocatorSchema.skip.spec.ts`: `@ts-expect-error` for `unskip()` and `unskip(ownPath)`.
- The docs: the review's path type probe (`add("main..list")` on a `<string>` registry is TS2345), dotted-value probe
  and broad-claims probe, re-run against the build; the docs-chains spec covers a chain a page shows.

## Changesets

- New, `getbyid-unicode-regexp.md` (patch): "`getById` with a `u` or `v` RegExp that holds a quote, a backtick or `>>`
  finds its element; it failed with a selector parse error. The locators Playwright builds itself
  (`getByRole`'s `name`, the text strategies, `getByTestId`) keep Playwright's limitation, which POMWright's chain
  exposes: write the character as `\x27` and the like, or drop `u`
  ([microsoft/playwright#40446](https://github.com/microsoft/playwright/issues/40446))."
- New, `verify-stray-add.md` (patch): "`verify()` reports an `add(path)` that was never given a locator method; before,
  it registered nothing, and every chain below the path left the segment out. A registry with such an `add` now fails
  its check: give the `add` its locator method, or remove it."
- Corrected: `registry-requires-paths.md` (2B-2), `undefined-first-argument.md` (2C-1).

## Verification

Per step: `pnpm lint`, `pnpm test:unit`, the registry specs on chromium. At the end: `pnpm typecheck`, `pnpm
docs:build`, the full `pnpm pack-test --reporter=line`, the grep for the external consumer projects' names, the review's
probes (2B-1 on three browsers, 2B-4) against the build.

## Decisions checklist

- [x] Decision 87: hex escapes in `getById`; the rest documented with #40446; a changeset
- [x] Decision 88: `verify()` reports a stray `add(path)`; a changeset
- [x] Decision 92: no type change; the *Queries* clause; the probe comment
- [x] Decision 93: the side-by-side tests and `unskip`'s type tests
- [x] Decision 103: the four corrections of the locator pages

## Execution

Four commits, one per step, `fix(locators): …`, `test(locators): …` or `docs: …`, each with `Plan:
defect-review-result-2/PLAN-2B-locators.md` and the `Co-Authored-By:` trailer. The maintainer pushes.

## Execution notes

- 2026-10-30. The commits, one per step:
  - `4e3a361` (1, decision 87), corrected by `935de09`;
  - `1dc488f` (2, decision 88);
  - `6925541` (3, decision 93);
  - `a05f533` (4, decisions 92 and 103);
  - and this record.
- **Verification:**
  - the full `pnpm pack-test --reporter=line`: 1860 passed and 3 skipped on three browsers; 33 step locations; 27
    test-server tests;
  - the checks inside it: 227 page blocks and 96 doc examples compiled; API coverage 40 exports and 108 members; error
    messages 79 and 9; the retry-pauses check;
  - 996 unit tests; `pnpm lint` and `pnpm docs:build` pass; no name of the external consumer projects on the branch.
- **The new tests:** each failed before its step and passes after it.
  - The unit cases of steps 1 and 2: 2 harness tests and 3 unit tests of 4, run against the old code. The fourth unit
    test checks that nothing is reported, and passes both ways, as intended.
  - Step 3: each `@ts-expect-error` was removed once and gave a compile error.
- **The review's probes, against this build:**
  - 2B-1 (`B/p02/2B-1.mjs` with `POMWRIGHT_ROOT` set to this repository) exits 0 on three browsers: every `getById`
    case finds its element, and the `getByRole` limitation remains as documented.
  - 2B-4 (`B/p10/dangling-add.mjs`, a scratch copy pointed at this build): the page object now fails at its first
    use, labeled `LoginPage:`, with the new message.
- Unexpected, for the maintainer:
  1. **Step 1's commit broke `pnpm typecheck`.** It wrote `/^it's$/v` in the test-id page object and the `getById`
     spec, and `tsc` over `test/` targets below ES2024, which rejects the `v` flag in a literal (TS1501). The step's
     gates were lint, the unit tests and the specs, and Playwright runs specs without a type check. `935de09` builds
     both with `new RegExp(…, "v")`, with a `biome-ignore` of `useRegexLiterals`, whose fix otherwise turns them back
     into literals.
     - Suggested remedy: a step that touches `test/` also runs `pnpm exec tsc --noEmit -p test`; I do so from now on.
  2. **An orphaned test server served every local run an old `server.js`.** A `node ./server.js` from a harness run
     at 20:03 on 29 October was still listening on port 9000, reparented to systemd: the run that started it ended
     without stopping it. The local config reuses a server it finds (`reuseExistingServer: true`), so it was
     reused.
     - `server.js` had not changed since 03:27 that day, so no earlier result is affected. It showed only when step
       1 added two ids, and it was stopped.
     - Debt, not fixed: a stale local test server silently serves old routes. Suggested remedy: the server answers
       a route with a hash of its own source, and the harness compares it with `server.js` before running; or
       `reuseExistingServer: false` locally, which fails loudly on a server already running.
     - The maintainer chose `reuseExistingServer: false` locally (2026-10-30), built in `a399897`. Both configs that
       start the server have it; a server started by hand made a run fail at once with Playwright's "already used";
       the full harness passed after it.
  3. **The limitation decision 87 documents is narrower than its wording.** A probe of every strategy Playwright
     builds:
     - Playwright's own `getByRole("button", { name: /don't save/iu })` works bare and under a parent locator, and
       fails once something follows it (`.first()`, POMWright's description). Every text method, `getByTestId` and
       `filter`'s `hasText` fail through POMWright.
     - The docs and the changeset say "once anything follows them".
  4. **Decision 88 was built on the builder's existing `registered` flag,** exposed as `stored`, rather than a new
     getter. A duplicate `add(path)`, whose locator method already threw, is not reported again. The message's
     helper joins the error-message check's `PARTS`, beside `strictChainsMessage`.
