# Segment 2B: the first review's findings, claims and test gaps at `d850405`

Pass 2, 2026-10-28T15:14:12+01:00. Sources read: `defect-review-result/B-registration-and-resolution/` (brief.md, summary.md, defect-B-1 to
B-7), `report.md` (ledger rows B-1 to B-7 with the merged C-5 and C-2, §9 items), `DECISIONS.md` #15, #21, #22, #25, #27,
#36, #43, the plans `PLAN-B-1-C-5-…`, `PLAN-B-3-B-2-…`, `PLAN-B-4-…`, `PLAN-B-5-C-2-…`, `PLAN-B-6-C-3-…`,
`PLAN-B-7-…` (execution notes), `PLAN-release-gates-and-audit.md` (*for the second review*: nothing in this area), and
`inventory.md`'s `[B]` lines. Each reproduction was copied from `POMWright-final-review-probes/B/` into
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/run1/<ID>/`, its root pointed at the review worktree, and
run there against the build of `d850405` (chromium).

## Findings

| First-review ID | Kind, severity | Decision | What was run (from `run1/<ID>/`) | Printed at `d850405` | Outcome |
| --- | --- | --- | --- | --- | --- |
| B-1 (with C-5) | defect, Low | #15, fix (`b990969`) | `node f1-nonenumerable.mjs`, exit 0 | `add: getByRole('button', { name: 'Save' }) count 1`, `seed: … count 1`, `filter: locator('li').filter({ hasText: 'Open' }) count 1`, each as Playwright's own call (was `count 2` and the filter dropped). `sound/p04-copies.mjs`: the add, seed and seeded-override rows of `ownNonEnumerable` now print `{ name: 'Save', level: 2 }` like Playwright. The query half (C-5) is 2C's. | fixed |
| B-2 | defect, Low | #27 (persist first, `f46b982`); path half by #22 | `node f2-failed-persist.mjs`, exit 1 | `1st call: A locator schema with the path "main" already exists.` and `2nd call:` the same (was "has already been provided"). The second half, a run-time path `main..list`, now throws at `add` (`LocatorSchemaPath string cannot contain consecutive dots: main..list`), so no registration with a bad path exists to call twice; the probe stops there (exit 1), which is the decided behavior (#22). `sound/p07-misc-adapted.mjs` shows the same twice at `add`. | fixed (the duplicate half); fixed differently (the path half: the check moved to `add`, decision 22) |
| B-3 | defect, Low | #22 (`2d2c504`) | `bash f3-long-path.sh`, exit 0 | `tsc exit: 0` for literals of 998 and 999 characters (was TS2589 at 999); `runtime: registered and verified paths of 999 and 2001 characters`; worktree clean after | fixed |
| B-4 | defect, Low | #21 (`ff6495e`) | `bash f4-reuse-union.sh`, exit 0 | `tsc exit: 0` for a table of union-typed reuse pairs and for `<string>` variables (was TS2322 "the same as registration path"); the runtime reuse resolves both copies; worktree clean after. My `t03` adds: a literal self-reuse, and a literal of a template member reusing itself, are still compile errors. | fixed |
| B-5 (with C-2) | defect, Low | #25 (`890dbd8`) | `node f5-has-option.mjs`, exit 0 | the three `locator()` cases (`has`, `hasNot` with `getNestedLocator`, the seeded override) now give `… If that call is in this locator's options, which run first, resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading" }). …`; `filter` unchanged; `sound/p05-ended.mjs` shows the query hint for `getLocatorSchema` and a query's resolution on `filter` and `locator` (C-2's half) | fixed |
| B-6 | documentation, Low | #43, docs (`8f185be`) | `node p11-rename.cjs` (TS 6.0.3 language service), exit 0 | the same three groups as filed: the member alone; `add`, resolutions, `skip`, `update`, `getLocator`, query `filter` sub-path and `reuse` together; `has`/`hasNot` apart. *Locator paths* (*One path gets a new name*) and *Internal → Builders* now say exactly this (my `t02` agrees) | fixed (the docs now state the behavior; the behavior is decided) |
| B-7 (with A-6, C-4, D-3, H-2) | documentation, Low | #36 (`429f2c2`) | `node f7-errors-gaps.mjs`, exit 0 | the same five messages; each is now on `api/errors.md` (*Reusing*: the three `reuse requires …` lines and `nth() cannot apply to "frames": …`, prose covering `filter`/`nth`/`describe`); `add`'s `@throws` and its API **Throws** name the hand-made seed's check and the any-frame copy; `scripts/check-error-messages.mjs` now checks every thrown message against the page (baseline: 77 messages, 0 problems). A-6, C-4, D-3 and H-2 are other segments'. | fixed |

Outcome counts (B-1 to B-7, one outcome per finding): **fixed 7** (B-2's path half holds decision 22's contract, a
check at `add`, rather than the one the finding proposed: counted under fixed, noted as fixed differently), fixed
differently 0 as a whole finding, still present 0, not fixed 0, fixed incompletely 0, regressed 0, cannot re-run 0.

## Claims beyond the findings (summary.md, *What is sound*)

| Claim | Checked by | Result |
| --- | --- | --- |
| Docs chains and messages reproduce from the build | `run1/sound/p01-doc-chains.mjs` (no diff with its 54cdada output); the baseline's `docsChains.spec.ts` now rebuilds every chain; my `p01`, `p06`, `p06c` | holds |
| Copies (prototypes, getters, frozen, symbol keys, null prototype, `compile()`, `g`/`y`) | `run1/sound/p04-copies.mjs`: only the B-1 rows changed, to Playwright's values | holds, B-1 closed |
| Ended registrations: every ending call, the message names it; `createReusable` does not end one | `run1/sound/p05-ended.mjs`: identical but for the B-5/C-2 hints | holds |
| First-argument rules: 10 strategies × 3 builders × 6 values | `run1/sound/p06-primary.mjs`: no diff | holds |
| Paths: 26 whitespace characters, U+200B/U+180E/U+2060 accepted, dot rules agree | now unit-tested (`utils.test.ts` *path whitespace*, *path rules, at compile time and at run time*); my `t01` | holds; "except B-3's length" no longer applies |
| Resolution: terminal-only `has`, cycles, frames, nested frames, any-frame placement, `strictChains`, description, `nth` values, `verify` on a closed page and with a selector that does not parse | `run1/sound/p07-misc-adapted.mjs` (p07 with its invalid-path block adapted to decision 22): every other line identical; `run1/sound/p02-dom.mjs`: no diff | holds |
| `getById`: strings, RegExps "identical to `getByTestId`, including its limit with the `u` flag and `>>`", shadow DOM, quirks mode, `y` | `run1/sound/p15-shadow.mjs`, `p16-id-regex.mjs`, `p17-id-string.mjs` run clean; my `p02`, `p02b-e`, `p06b` | **does not fully hold**: `p16` tried `/^say "hi"$/u`, with two quotes, which happens to parse. With one quote, backtick or apostrophe (`/a"b/u`, `/it's/v`), Playwright's bare `getByTestId` finds the element and `getById` fails at every resolution, because POMWright's selector always continues after the RegExp (`>> internal:describe=…`). Filed as **2B-1** |
| db26390: an undefined first argument compiles on the ten seeded methods | my `t03` (`getByRole()`, `getByTestId()` on seeds) and `validation` typecheck in the baseline | holds |
| Code rules: no per-strategy `switch`, no thenables in `src/locators` | `grep -rn "switch\s*(" src` (none outside tests); `then` only in `src/helpers/thenable.ts`, the check itself | holds |
| *Outside the scope*: TS2883 with `seed.definition` under pnpm | not re-run: packaging is 2F's | — |

## Test gaps (summary.md, *Test gaps*)

| # | Gap at 54cdada | At `d850405` |
| --- | --- | --- |
| 1 | own non-enumerable options and filters | closed: `utils.test.ts` (*reads own properties that are not enumerable…*), `add.get.clone.spec.ts` (packed, three browsers) |
| 2 | failed persist, then a second call | closed: `locatorRegistrationBuilder.test.ts` (*leaves a registration as it was when its path is registered already…*, any-frame, seeded), `add.validation.spec.ts` |
| 3 | reuse with a union or wide path variable | closed: `validation.locatorSchemaPath.typecheck.ts`, `publicTypes.typecheck.ts` (R1-R11), `locatorRegistry.test.ts` (*throws for a path that reuses itself through a variable*) |
| 4 | type-level path rules (only the ASCII space; no long path) | closed: `utils.test.ts` (every listed character through a mapped type, 999 characters, 2,501 segments), three more characters in the typecheck file |
| 5 | `locator()`'s `has` option with a `getLocator` in the chain | closed: `add.registrationEnds.spec.ts` and the builder's unit tests |
| 6 | reuse, frames, `getById`, cycles, `verify`, `getLocator`, `getNestedLocator` specs ran against source | closed: packed twins (`6a8b408`, `9f47cae`, `28310c7`) and the source specs removed (`a7d5ba7`); no spec under `test/tests` imports `src/` or `LocatorRegistryInternal` (grep) |
| 7 | no test checks the rename claim | still open: no test or script runs TypeScript's rename (`grep -rn findRenameLocations test scripts`: none); the claim holds today (`t02`, `run1/B-6`) |
