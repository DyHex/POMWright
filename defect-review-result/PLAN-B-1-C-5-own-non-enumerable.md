# Plan 11: own non-enumerable options are read

- **Decisions**: [DECISIONS.md](DECISIONS.md) #15
- **Findings**: [B-1](B-registration-and-resolution/defect-B-1-own-non-enumerable-option-dropped.md), merged with
  [C-5](C-queries/defect-C-5-own-non-enumerable-option-dropped.md)
- **Bump**: patch (the pending `options-read-like-playwright.md` is amended)
- **Stop**: no
- **Depends on**: nothing in order (after plan 10 by the table)

## Contract

Every copy POMWright makes of an options, filter or patch object reads what Playwright reads by property access: own
properties, enumerable or not, then those of each prototype up to `Object.prototype`, methods left out. It holds for
`add`'s options, filters, seeds, seeded overrides, and a query's `update`, `replace` and `filter`.

## Current behaviour

`src/locators/utils.ts:192-212` `readFields` takes own properties with `Object.entries` (enumerable only) and walks the
prototypes with `Object.getOwnPropertyNames`; an own property made with `Object.defineProperty` (not enumerable) is
dropped, so the registered locator matches more than Playwright's own call with the same object
(`…-probes/B/` and `…-probes/C/` reproductions in the findings). A gap in `9dc8048`'s own promise.

## Steps

1. `readFields`: own names from `Object.getOwnPropertyNames(fields)`, each value by property access; an own enumerable
   value is kept as today (functions included, as `Object.entries` keeps them); an own non-enumerable function is left
   out, as on a prototype. The fast path stays for a plain object whose own names are all enumerable
   (`Object.getOwnPropertyNames(fields).length === entries.length`, prototype `Object.prototype` or `null`). Doc
   comment: "own properties, enumerable or not".
2. **Tests**:
   - unit (`src/locators/utils.test.ts`, beside `9dc8048`'s): an own non-enumerable value and an own non-enumerable
     getter, through `copyFields` and `mergeOptions`; an own non-enumerable function is left out;
   - packed (chromium, DOM assertions): `test/tests/locatorRegistry/add/add.get.clone.spec.ts` for `add`'s options, and a
     query's `update` (closing C's gap that those paths are tested against source only).
3. **Docs**: *Registering locators* may say "every property Playwright reads" where it describes the copy (grep for
   "own properties"); AGENTS.md §5 already says "own properties", made "own properties, enumerable or not" for clarity.
4. **Changeset**: amend `.changeset/options-read-like-playwright.md`: the copy also keeps an own property that is not
   enumerable (as `Object.defineProperty` makes one), with one line of example.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build` if a page changed.

## Commit

```text
fix: options keep their own non-enumerable properties

The copy of an options, filter or patch object read own properties with
Object.entries, so a property defined as non-enumerable, which Playwright
reads by property access, was dropped and the locator matched more than
Playwright's own call with the same object.

Plan: defect-review-result/PLAN-B-1-C-5-own-non-enumerable.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27. As planned.

- `readFields`: own names from `Object.getOwnPropertyNames`; an own non-enumerable value or getter is read by property
  access, an own non-enumerable method left out; the fast path holds for a plain object whose own names are all
  enumerable. Doc comment: "own properties, enumerable or not".
- Tests: unit (`utils.test.ts`), an own non-enumerable value and getter through `copyFields`, an own non-enumerable method
  left out, a non-enumerable patch through `mergeOptions`; DOM spec in `add.get.clone.spec.ts` (packed package, three
  browsers): a non-enumerable `name` through `add` matches Playwright's own `getByRole` (2 buttons), and a
  non-enumerable `exact` through a query's `update` narrows to 1.
- Docs: *Registering locators* (every property Playwright reads, an own non-enumerable one included); AGENTS.md §5
  (`readFields`: own properties, enumerable or not). The pending `options-read-like-playwright.md` amended (the
  non-enumerable case; "own enumerable properties" in its *Before*).
- Checks: `pnpm lint` 0; `pnpm test:unit` 820 passed; `pnpm pack-test --reporter=line` exit 0 (1,521 passed, 3
  skipped; doc snippets 217; api coverage 0 problems; step locations 7); `pnpm docs:build` 0.
