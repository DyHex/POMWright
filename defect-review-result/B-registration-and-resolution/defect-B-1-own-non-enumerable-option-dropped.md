# B-1: An options or filter object's own non-enumerable property is dropped, although Playwright reads it

- **Kind**: defect
- **Area**: Registration and resolution: copies of options and filter objects (`readFields`, `copyFields`, `mergeOptions`); inventory §2 "Registered locators do not change", §5 "options objects (prototypes, getters, class instances…)"
- **Severity**: Low (a rare input: an own property that is not enumerable, as `Object.defineProperty` makes one by default; the registered locator then silently matches more than Playwright's own call with the same object)
- **Semver of the fix**: patch (brings the copy in line with the stated contract that options are read as Playwright reads them)
- **Reviewed**: `54cdada`, 2026-10-23, scope B reviewer
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #15](../DECISIONS.md))
- **Merged with**: C-5 (see report.md)

## Contract

- AGENTS.md §5: builders "store copies of the options and filter objects callers pass, read as Playwright reads them
  (`readFields`: own properties, then those of each prototype up to `Object.prototype`, methods left out)".
- `website/src/content/docs/docs/registering-locators.md`, *Registered locators do not change*: "reads an options or
  filter object as Playwright does: a getter on a class or a value from the object's prototype is copied with the rest,
  a method is not."
- Changeset `.changeset/options-read-like-playwright.md` and commit `9dc8048`: "options are read as Playwright reads
  them".

Playwright reads every option by property access (`options.name`, `options.hasText`, …), which sees an own property
whether or not it is enumerable.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f1-nonenumerable.mjs` (needs `lib.mjs` beside it; it loads
`dist/index.js` and chromium from the worktree's root package):

```js
const options = Object.defineProperty({}, "name", { get: () => "Save" }); // not enumerable: defineProperty's default
const filter = Object.defineProperty({}, "hasText", { value: "Open" });
registry.add("button@save").getByRole("button", options);
registry.add("item@open").locator("li").filter(filter);
registry.add("button@seeded", { reuse: registry.createReusable.getByRole("button", options) });
```

Command, from the worktree root: `node ../POMWright-final-review-probes/B/f1-nonenumerable.mjs`. Exit code 0.

The wider probe `p04-copies.mjs` (output `p04-copies.out`) shows the same on every path: `add`'s options, a seed's
options, a seeded override's patch and a filter object; prototypes, class getters, frozen objects, symbol keys,
null-prototype objects and RegExps are read as Playwright reads them.

**Fix sketch.** With `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/sketch-B1-B5.diff` (one sketch for B-1 to B-5, applied to the worktree, built with `pnpm harness:install`, then reverted with `git checkout` and rebuilt; with it `pnpm test:unit`, `pnpm typecheck` and the in-scope harness specs on chromium, 349 tests, passed: logs `sketch-unit.log`, `sketch-typecheck.log`, `sketch-harness.log`), where `readFields` also reads the object's own non-enumerable names, the same
probe prints `getByRole('button', { name: 'Save' }) count 1` for `add` and the seed, and
`locator('li').filter({ hasText: 'Open' }) count 1` for the filter (`sketch-probes.out`).

## Observed / expected

Observed (page with buttons Save, Cancel and items Open, Closed):

```text
Playwright: getByRole('button', { name: 'Save' }) count 1
add:        getByRole('button') count 2
seed:       getByRole('button') count 2
Playwright: locator('li').filter({ hasText: 'Open' }) count 1
filter:     locator('li') count 2
```

Expected: the registered locators are `getByRole('button', { name: 'Save' })` and
`locator('li').filter({ hasText: 'Open' })`, one match each, as Playwright's own calls with the same objects.

## Cause

`src/locators/utils.ts:192-213`, `readFields`: the object's own properties come from `Object.entries(fields)` (line
193), which lists only enumerable string keys; the fast path for a plain or null-prototype object (lines 195-198)
returns them alone. The prototype walk (lines 200-211) uses `Object.getOwnPropertyNames`, so a non-enumerable
property is read on a prototype but not on the object itself. Every copy goes through it: `copyFields` (line 220-221,
for `add`, seeds, filters and clones) and `mergeOptions` (line 491, for a seeded override and `update`).

## Fix plan

- **Intended contract**: `readFields` returns every own string-keyed property, enumerable or not, then the prototype
  properties as now; functions on prototypes are still left out.
- **Options**:
  1. *(recommended)* Read the object's own names with `Object.getOwnPropertyNames(fields)` and read each value by
     property access, as the prototype walk already does; keep a fast path for a plain object whose own properties
     are all enumerable (`Object.keys(fields).length === Object.getOwnPropertyNames(fields).length`). Cost: one extra
     call per options object; `scripts/benchmark.mjs` should show no change.
  2. Document the limit (own enumerable properties only) on *Registered locators do not change* and in AGENTS.md §5.
     Leaves a silent difference from Playwright.
- **Implementation steps**: `src/locators/utils.ts` `readFields`; its doc comment ("the object's own enumerable
  properties" becomes "own properties").
- **Tests**: `src/locators/utils.test.ts` beside the 9dc8048 tests (an own non-enumerable value and an own
  non-enumerable getter, through `copyFields` and `mergeOptions`); a DOM assertion in
  `test/tests/locatorRegistry/add/add.get.clone.spec.ts` against the packed package, next to "options read through a
  prototype…" (chromium is enough: no browser behaviour is involved).
- **Docs**: `docs/registering-locators.md` *Registered locators do not change* may say "every property Playwright reads";
  `internal/registry-records.md` *Copies at every boundary* unchanged; the `readFields` doc comment.
- **Changeset**: patch. "An options or filter object's own property that is not enumerable, such as one made with
  `Object.defineProperty`, is now copied, as Playwright reads it."
- **Decisions to tick**:
  - [x] Read own non-enumerable properties (option 1) or document the limit (option 2): **option 1**.
  - [x] (added) Tests as above, plus a DOM assertion against the packed package for a query's `update` (C-5's paths,
    tested against source only today).
  - [x] (added) Docs: the `readFields` doc comment ("own properties"); *Registering locators* may say "every property
    Playwright reads". AGENTS.md §5 already says "own properties".
  - [x] (added) The pending `.changeset/options-read-like-playwright.md` is amended (own non-enumerable properties
    included) instead of a new changeset.
- **Execution order**: independent; touches the same function as nothing else in this scope.
