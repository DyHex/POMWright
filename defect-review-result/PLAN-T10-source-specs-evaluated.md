# Plan 39: the source-level specs evaluated against their twins

- **Decisions**: [DECISIONS.md](DECISIONS.md) #55 (phase 2)
- **Findings**: none (test gap #10)
- **Bump**: none
- **Stop**: **yes**, before anything is removed: each removal is a decision of the maintainer
- **Depends on**: plan 27 (every twin in place), plan 31 (the same spec style)

## Contract

Each of the 26 source-level specs is compared with its packed twin. One whose twin covers the same scenarios and
assertions with equal or greater value may be removed; one that adds value (for example precision on what is stored)
stays. Nothing is removed before full packed coverage exists, and each removal is a recorded decision.

## Steps

1. For each source spec, a row in *Execution notes*: its scenarios; which the twin covers and how (DOM, chain, error);
   the source-only assertions from plan 27's table and what they add; a recommendation (remove, keep, or keep part).
2. **Stop and report** the table to the maintainer; no file is removed in this step.
3. After the maintainer's decisions (recorded in DECISIONS.md as new entries), remove the agreed specs (or parts), and
   update AGENTS.md §4 ("Know what each spec exercises") to say which source specs stay and why.

## Verify

The standard checks (PLANS.md, rule 5) after the removals.

## Commit

Only after the decisions:

```text
test: source-level locator specs whose packed twins cover them are removed

Plan: defect-review-result/PLAN-T10-source-specs-evaluated.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28. Step 1, the evaluation; step 2, the stop. Nothing removed.

Every source spec has a twin with the same number of tests under the same titles (227 in all, 26 files, about 4,200
lines against the twins' 4,100). "Record reads" counts `registry.get(…)`, `getIfExists`, `.definition` and `.steps`
on stored records; "unit" names the vitest test in `src/locators/` that already reads the same thing.

| Source spec | Tests | Record reads | What only the source spec checks | Where else it is checked | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `add/add.filter` | 7 | none | nothing: the same calls as the twin | twin | remove |
| `filter.cycle` | 3 | none | nothing | twin | remove |
| `getLocator/getLocator` | 15 | none | nothing | twin | remove |
| `getLocatorSchema/getLocatorSchema.filter` | 21 | none | nothing | twin | remove |
| `getLocatorSchema/getLocatorSchema.nth` | 7 | none | nothing | twin | remove |
| `getLocatorSchema/getLocatorSchema.update` | 17 | none | nothing | twin | remove |
| `getNestedLocator/getNestedLocator` | 16 | none | nothing | twin | remove |
| `registry/registry.strictChains` | 6 | none | nothing | twin | remove |
| `add/add.getByAltText`, `getByLabel`, `getByPlaceholder`, `getByRole`, `getByTestId`, `getByText`, `getByTitle`, `add.locator` | 1 each | the stored definition | the record's shape per strategy | unit: every strategy's stored definition (`locatorRegistry.test.ts`, "a seeded override stores what update stores", and the builders' tests); twin: Playwright's rendering of the same call | remove |
| `add/add.getById` | 3 | the stored id, string and RegExp | the id stored verbatim | unit: `id` records (13 assertions) and the id selector helpers in `utils.test.ts`; twin: rendering and the DOM | remove |
| `add/add.frameLocator` | 11 | definitions and steps of frame segments | `steps: [{ kind: "index", index: 1 }]` on a frame record | twin: `locator('iframe').nth(1).contentFrame()`, which shows the step applied, a stronger check | remove |
| `add/add.describe` | 10 | `description` on records | no description stored until a resolution | unit: `locatorRegistrationBuilder.test.ts` ("`registry.get("a").description` is undefined"); twin: the copy's default after a resolution | remove |
| `add/add.spec` | 16 | records | `options: { exact: true }` stored with a RegExp text | unit: "a seeded override stores what update stores" (every strategy, a RegExp primary with options) | remove |
| `add/add.reuseExisting` | 15 | the copy's record | the registry's internal `replace` of a copy leaves the source | twin: steps after a reuse narrow the copy and leave the source (the path through that `replace`); unit: reuse by path in `locatorRegistry.test.ts` | remove |
| `add/add.reuseReusable` | 32 | records, between a refused and an allowed override | the record after a refused override | unit: "a throwing DSL call changes nothing" (`keeps the seed after a wrong-type override`, `keeps the first override after a second one`); twin: the later override succeeds | remove |
| `getLocatorSchema/getLocatorSchema.describe` | 6 | one record after a query's `describe` | the stored record unchanged | twin: the registry's `description()` unchanged | remove |
| `validation/validation.locatorSchemaPath` | 1 | none; imports `formatLocatorSchemaPathForError` | the escaping of whitespace in messages through the real function | unit: `utils.test.ts` (`formatLocatorSchemaPathForError("a\u00A0b")`); twin: the messages through a local copy of the rule | remove |
| `add/add.get.clone` | 5 | `get`, `getIfExists` | **`get` and `getIfExists` return copies: changing one leaves the stored record** | twin: a query is a copy (public side only); **no unit test** | keep part: move this into `locatorRegistry.test.ts`, then remove |
| `registry/registry.verify` | 14 | one: the record before and after `verify()` | **`verify()` changes no record** | twin: the same result twice; **no unit test** for the records | keep part: move this into `locatorRegistry.test.ts`, then remove |

Recommendation: remove all 26 source specs, after moving the two assertions above into `src/locators/locatorRegistry.test.ts`
(the option raised with the maintainer on 2026-10-28: a source-only check that is about internals belongs in the unit
tests, which read records directly, not in a Playwright spec). What it saves: 26 files and about 4,200 lines kept in step
with their twins, and 681 test runs per full `pack-test` (227 on each of three browsers). What it loses: the diagnosis
"source spec green, twin red, so the build is at fault", which the unit tests give as well (they run on the source).

Follow-ups for the decision:

- The twins keep their `.packed` suffix or take the plain names (`add.spec.ts`, …) once their source specs are gone.
  Recommended: the plain names, since nothing is left to tell them apart from, and AGENTS.md §4's "one spec file per DSL
  method" reads as before.
- AGENTS.md §2 and §4 (the 26 source specs, the `src/locators` files `tsc -p test` compiles through them), §3 (`pnpm
  typecheck`'s list), and *Internal → Tests and checks* say what stays and why.

Step 3, after the maintainer's decisions (all three recommendations; DECISIONS.md #71):

- `src/locators/locatorRegistry.test.ts`, *a registered locator cannot change after registration*: "hands out copies:
  changing what get or getIfExists returns leaves the stored record" (the definition's selector, a filter step's
  object, the description, the steps array) and "verify() changes no record, when it passes and when it fails". Each
  failed against a temporary break, restored after: `getIfExists` returning the stored record itself, and `verify()`
  writing a description into each stored record.
- `git rm` of the 26 source specs; `git mv` of each twin to the plain name. Their header comments no longer call them
  twins: a one-line header went, a two-line one kept its second line as "Checked on a page, and against Playwright's own
  locator built with the same arguments." (or "… in the rendered chain.", "… through descriptions, rendered chains and
  reuse."); three comments that named the source spec now name what they do. No file under `test/tests` imports `src/`.
- AGENTS.md §3 (what `tsc -p test` compiles: no `src/locators` files any more), §4 (every spec imports `pomwright`; a
  check of a record belongs in the unit tests; 60 spec files, about 9,900 lines); *Internal → Tests and checks*, *The
  harness*, says the same and why a source-level spec is not kept beside them.
- Checks: `pnpm lint` 0 (176 files, the 26 removed; one fix, an optional chain biome rejects in the new test);
  `pnpm test:unit` 904 passed; `pnpm pack-test --reporter=line` exit 0 (1,746 passed, 681 fewer runs, 3 skipped; doc
  snippets 226; api coverage 0 problems; error messages 0 problems; step locations 31); `pnpm docs:build` 0.
