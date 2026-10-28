# Plan 30: complete error lists and the message-coverage check

- **Decisions**: [DECISIONS.md](DECISIONS.md) #36 (points 1, 3, 4), #59 (point 2)
- **Findings**: [B-7](B-registration-and-resolution/defect-B-7-errors-page-gaps.md) with
  [A-6](A-session-storage/defect-A-6-on-origin-seed-errors-unlisted.md), [C-4](C-queries/defect-C-4-api-throws-incomplete.md),
  [D-3](D-page-objects-urls-navigation/defect-D-3-navigation-messages-docs.md) (its docs items) and
  [H-2](H-docs-readme-agents/defect-H-2-errors-page-misses-two-messages.md); test gap #7
- **Bump**: none (docs and a check; D-3's code change was plan 26)
- **Stop**: no (the check runs in `pnpm typecheck`)
- **Depends on**: every plan that changes or adds a message: 9, 10, 12, 16, 17, 18, 19, 20, 21, 22, 24 (its compile
  error), 26

## Contract

*Error messages* (`api/errors.md`) lists every message POMWright throws and every compile-error message it defines, the
API pages' **Throws** and the doc comments' `@throws` list each member's, and a check keeps them so in both directions:
every throw site's message matches a line of `api/errors.md`'s message blocks, and every message line there matches
something the code throws or a message type it defines. Internal invariant errors no user can reach are listed in the
script, each with its reason.

## Current behaviour

Five scopes found messages missing from the lists (`…-probes/B/f7-errors-gaps.mjs` and the merged findings' probes):

- B-7, *Reusing*: the hand-made seed's `reuse requires a role value / non-empty selector / non-empty id for "…".` and the
  any-frame step message after reuse by path; `add`'s `@throws` and API **Throws** lack them;
- A-6: `seed`'s on-origin write failures (two) are missing from its doc comment, `api/class-sessionstorage.md`,
  `api/errors.md` *seed* and *Seeding session storage* (whose count sentence is wrong); the opaque-origin message is
  missing from `get`'s and `clear`'s;
- C-4: the query's `describe()` **Throws**; the skipped-segment clause on `api/class-locatorupdatebuilder.md` and the ten
  `@throws` of `LocatorUpdateBuilderInternal`;
- D-3: `goto()`'s URL-object message on `errors.md` *Navigation*; `Cannot resolve …` (now labelled, plan 26) on `goto()`'s
  **Throws** and `@throws`; `UrlMatcher.toString()` is "used in error messages" (not step titles); the three `@param
  options` saying `waitUntil` and `timeout` default to `navOptions` and `runPostNavigationActions` to `true`;
- H-2: the two messages above that other pages document but `errors.md` does not: `goto()` with a URL object (D-3)
  and the hand-made seed without its first argument (B-7).
Nothing checks the lists (81 `new …Error(` sites in 12 files at `54cdada`).

## Steps

1. **The lists**, against the final texts (a probe prints every reachable message from the build; copy from it):
   every item above, plus every message plans 9–26 added or changed, on `api/errors.md`, the API pages' **Throws** and the
   doc comments' `@throws`. *Seeding session storage*'s count sentence corrected.
2. **`scripts/check-error-messages.mjs`** (new), run by `pnpm typecheck` after `check-api-coverage.mjs`:
   - reads every `new Error(…)`, `new TypeError(…)` and `new RangeError(…)` in `src/` (not tests or `fakePage.ts`) with
     the TypeScript compiler API (as the other two checks do), turns each message (string, template, concatenation) into
     a pattern: `${…}` parts as wildcards, a ternary's branches as alternatives;
   - reads the message-type literals the code defines for compile errors (`StepRequiresPromise`, the `NeedsPaths`
     message, the schema message of plan 24, `InvalidReusePath`'s template);
   - reads `api/errors.md`'s message blocks (`text` fences);
   - fails when a throw site matches no line (forward), and when a line matches no throw site or message type
     (reverse), naming file and line;
   - an `INTERNAL` list in the script for invariant errors no user can reach (for example `neverAppliedError needs at
     least one pending seed`), each with its reason.
3. `package.json`'s `typecheck` script gains `&& node scripts/check-error-messages.mjs`, so it runs in every harness job
   (decision 36 names `pnpm typecheck` only). The `site` job is not changed: it would add nothing the harness jobs do
   not run, and changing `checks.yaml` would make this plan stop (PLANS.md, rule 4).
4. **Tests**: plant a throw site with a new message (a temporary edit): the check fails forward; remove a message line
   from `errors.md`: fails forward; add a stale line: fails reverse; all reverted. Recorded in *Execution notes*.
5. **Docs**: AGENTS.md §3 (what `pnpm typecheck` runs) and §9 (the check beside the API coverage check); *Internal → Tests
   and checks*.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
docs: every error message listed, and a check that keeps the lists complete

Error messages, the API pages and the doc comments now list every message
each member throws. A new check compares the throw sites with the Error
messages page in both directions, so a message cannot be added, changed or
removed without the page.

Plan: defect-review-result/PLAN-B-7-error-lists.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- Order: the check first (step 2), so it found the gaps of `api/errors.md` itself; then the lists.
- Step 2, `scripts/check-error-messages.mjs`: a program over `src/` (tests and `fakePage.ts` aside) with the compiler
  API. A message's literal text is kept, a `${…}` part is a wildcard, a ternary inside a message is an alternation (the
  page shows one branch: a singular or a plural, a part present or not; cartesian expansion first required every branch
  on the page, which flagged "key was" beside "keys were" and every a/an), a ternary of whole messages is two
  messages, and a `const` or a call of a helper of `src/` is followed to its text (the any-frame messages). A message of
  several lines is checked line by line. A page line must end as a message does (`pattern$`, any start), so a page
  object's label and verify()'s `"path": ` prefix are allowed; an indented page line continues the one above and is
  not checked (verify()'s paths, the never-applied list). Three lists in the script: `INTERNAL` (9 entries, each with
  its reason, each probed from JavaScript through the build: the boundary rejects the same input first with a listed
  message, for example a hand-made seed of type `"id"` without an id gets `reuse requires a non-empty id for "a".`),
  `PASS_THROUGH` (3: a page object's label and the two session storage titles in front of another error's message,
  `…: …`), and `PARTS` (`strictChainsMessage`, which verify() reports inside its list). A message with fewer than 5
  fixed characters that neither list names fails, and so does an entry the code no longer has.
- **Beyond the plan's four message types**: the audit below found the path rules' compile errors
  (`LocatorSchemaPathError<"main..list", "String can't contain consecutive '.'">`) on *Types* and *Locator paths* but not on
  *Error messages*, whose contract covers "every compile-error message it defines". `MESSAGE_TYPES` names the alias,
  and every string literal type in it is a message (a conditional's `extends` side, a pattern, is skipped):
  `StepRequiresPromise` (through `typeof STEP_REQUIRES_PROMISE`), `NeedsPaths`, `SchemaNeedsStorageType`,
  `InvalidReusePath`, `LocatorSchemaPathFormat` (`String can't be empty`) and `BrokenRules` (the four rules): 9
  messages. *Paths* shows tsc's six errors (probed: `Argument of type 'string' is not assignable to parameter of type
  'LocatorSchemaPathError<…>'`).
- Step 3, **beyond the plan**: `pack-test.sh` lists the type-check commands itself rather than calling `pnpm typecheck`,
  so the check is also a line there, after `check-api-coverage.mjs`; otherwise no harness job would run it.
  `checks.yaml` is unchanged (the `site` job runs the snippet and coverage checks by name).
- Step 1, the lists, copied from probes against the build:
  - *Error messages*: *Paths*, the `NeedsPaths` compile error and the six path-rule compile errors; *Reusing*, the hand-made
    seed's three `reuse requires …` messages and `nth() cannot apply to "frames": …` for a step on a copy of an any-frame
    path; *Navigation*, `LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"` in place
    of the unlabelled `Cannot resolve …` (plan 26's deferred docs), and the URL-object message with `received null` and
    `received a number` named; *seed*, the on-origin opaque-document and navigation messages, the count in its prose.
  - API pages: `add`'s **Throws** (the hand-made seed, the any-frame copy); `SessionStorage`'s *Methods* (the
    opaque-document message for `set`, `get` and `clear`) and `seed()`'s list and prose; the update builder's *Methods*
    (a builder taken before `skip()`); `goto()`'s **Throws** (the labelled resolution message); `UrlMatcher.toString()`
    "used in error messages". The query's `describe()` **Throws** was already complete (plan 12).
  - Doc comments: `add`; `get`, `clear` and `seed`; the ten methods of the update builder (the skip clause, and
    `frameLocator`'s strategy error, probed: `update("main.button@save") cannot change the strategy from "role" to
    "frameLocator"; use replace("main.button@save").frameLocator(…) instead.`); the three `@param options` of the
    navigation helper (`waitUntil` and `timeout` from `navOptions`, `runPostNavigationActions` `true`); `UrlMatcher`'s
    `toString`.
  - *Seeding session storage*: the two on-origin messages and the count ("The first nine are thrown by the `seed` call").
- Audits, one-off (scratch copies of the check): every `text` line of every page of the site against the code's
  messages found no stale message (only the path-rule compile errors above); every code span of a doc comment's
  `@throws` found none either (three deliberate `(…)` shortenings).
- Step 4, tests: a planted throw site (`planted: a message the page does not list for x`), a message line removed
  (`Detected cyclic filter reference …`), a stale line added (`No locator schema is registered at "main.list.item".`),
  a compile error removed (`NeedsPaths`, then `String can't contain consecutive '.'`), and a stale `INTERNAL` entry each
  failed the check with exit 1 and the problem named; all reverted, 0 problems.
- Step 5: AGENTS.md §2 (`scripts/`), §3 (`pnpm typecheck`, "all seven"), §9 (the check's paragraph); *Internal → Tests
  and checks* (item 7) and *Internal → Documentation* (*Every message is listed*).
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,367 passed, 3
  skipped; doc snippets 223; api coverage 0 problems; error messages 77 thrown and 9 compile-error messages, 108 page
  lines; step locations 31); `pnpm docs:build` 0.
