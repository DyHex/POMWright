# 2C-1: The docs say `replace`'s first argument is always required, and that every update-builder method throws without it, but `replace(…).frameLocator()` takes none

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 103 in [DECISIONS.md](../DECISIONS.md); planned in the locators plan (docs); done 2026-10-30 in `a05f533`
- **Area**: `LocatorUpdateBuilder` in `replace` mode; the any-frame form in a query
- **Severity**: Low (two statements on the same page, and three on other pages, contradict the `frameLocator()`
  section; nothing behaves wrongly, and the any-frame section of each page gives the right rule)
- **Semver of the fix**: none (docs and doc comments only)
- **Pass**: 1
- **First review**: missed by the first review. Every statement but the new `queries.md` any-frame section existed at
  `54cdada` (`class-locatorupdatebuilder.md:15-16, 63`, `queries.md:132-133`, `internal/builders.md:76`,
  `locatorUpdateBuilder.ts:125`, `.changeset/undefined-first-argument.md:14`). The first review's C-4 quoted the
  page's "Every method throws … when the first argument is missing" and checked only its missing skip clause, and its
  `inventory.md` (*Queries [C]*) repeats "`replace(sub?)` … first argument required".
- **Reviewed**: `d850405`, 2026-10-28 15:43 +0100, Opus 5.5, second review, segment 2C

## Contract

The rule the code keeps, stated where `frameLocator()` is documented:

- `api/class-locatorupdatebuilder.md`, *frameLocator()*: "In `replace` mode an omitted selector installs Playwright's
  any-frame `frameLocator()` …"; *Arguments*: "`selector` string *(optional in `update`, and in `replace` for the
  any-frame form)*".
- `docs/queries.md`, *The any-frame form in a query*: "`replace(subPath).frameLocator()` without a selector installs
  Playwright's any-frame `frameLocator()` on an ancestor".
- `src/locators/locatorUpdateBuilder.ts:367-370`, the doc comment of `frameLocator`.

The statements that contradict it:

- `api/class-locatorupdatebuilder.md:63-64`, *Methods*: "Every method throws, in `update` mode, for a segment
  registered with another strategy, and in `replace` mode, from JavaScript, when the first argument is missing".
- `api/class-locatorupdatebuilder.md:15-16`: "**`replace`** installs a locator of any strategy, with the arguments of
  Playwright's own method: the first argument required, Playwright's options."
- `docs/queries.md:135-136`, *A new definition: `replace`*: "with Playwright's own arguments: the first argument is
  required".
- `internal/builders.md:89-90`, *The update builder*: "in `replace` mode Playwright's own (the first argument required,
  Playwright's option types)".
- `src/locators/locatorUpdateBuilder.ts:124-125`, the doc comment of the public type `LocatorUpdateBuilder` (what an
  editor shows on hover): "`replace` … with the arguments of Playwright's own method: the first argument required".
- `.changeset/undefined-first-argument.md`, the release note: "A registration and `replace()` still require the first
  argument, as Playwright's methods do." (`replace().frameLocator(undefined)` compiles and installs the any-frame form.)

(The contributor guide says the same in `src/locators/AGENTS.md`, *Contracts*: "`replace` changes the strategy and takes
Playwright's argument lists (the first argument required, …)"; that file is segment 2I's.)

Since Playwright 1.63, `page.frameLocator()`'s selector is optional, so "Playwright's own arguments" is right for every
method; "the first argument required" is not, for `frameLocator`.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/p5-broad-claims.mjs`, part (1): each of the ten methods
of `getLocatorSchema("main.list.item").replace("main")`, called without a first argument from JavaScript, on an
ancestor without steps.

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/C/p5-broad-claims.mjs
```

Exit 0. Output (`p5-broad-claims.out` beside it), part (1):

```text
  getByRole        throws: getByRole requires a role value for "main".
  …
  locator          throws: locator requires a selector value for "main".
  frameLocator     no throw; resolves to frameLocator().locator('ul').locator('li')
  getByTestId      throws: getByTestId requires a testId value for "main".
  getById          throws: getById requires a non-empty id for "main".
```

The types agree with the runtime: `frameLocator(...args: UpdateArgsWithoutOptions<…>)` takes `[]` in both modes
(`locatorUpdateBuilder.ts:389`), and `test/tests/packaging/publicTypes.typecheck.ts:91` compiles
`getLocatorSchema("list").replace().frameLocator();`.

## Observed / expected

Observed: nine of the ten methods throw without a first argument in `replace` mode; `frameLocator()` installs the
any-frame form. Expected by the five statements above: all ten throw, or "the first argument required" for every
`replace` method. The code is right; the broad statements leave out the one exception their own pages document.

## Cause

The broad sentences predate, or were not updated with, the any-frame form in `replace` mode (`optionalPrimary` in the
`STRATEGIES` row of `frameLocator`, `utils.ts:379`, read by `commitPrimary`, `locatorUpdateBuilder.ts:458`).

## Fix plan

- **Intended contract**: unchanged. `replace` takes Playwright's own argument lists: the first argument is required
  except `frameLocator`'s, whose absence installs the any-frame form.
- **Options**: (a, recommended) name the exception in each broad sentence; (b) drop "the first argument required" and
  say only "Playwright's own arguments", which is exact but less helpful.
- **Steps (docs only)**:
  - `api/class-locatorupdatebuilder.md:15-16` and `:63-64`: "the first argument required (but `frameLocator`'s, whose
    absence is the any-frame form)"; "Every method but `frameLocator` throws … when the first argument is missing".
  - `docs/queries.md:135-136`: the same exception, with a link to *The any-frame form in a query*.
  - `internal/builders.md:89-90`: the same.
  - `src/locators/locatorUpdateBuilder.ts:124-125`: the same in the type's doc comment.
  - `src/locators/AGENTS.md`, *Contracts* (with 2I).
  - `.changeset/undefined-first-argument.md`: "A registration and `replace()` (but its `frameLocator()`) still require
    the first argument". The changeset is unreleased, so its text can still change.
- **Tests**: none needed; `check-doc-snippets` and `docsChains.spec.ts` are unaffected. `check-api-coverage.mjs` reads
  doc comments; re-run `pnpm typecheck` after the doc-comment edit.
- **Changeset**: none (no consumer-facing change).
- **Decisions to tick**: none.
- **Related**: 2C-3 (whether `replace().frameLocator()` on the query's own path should compile).
