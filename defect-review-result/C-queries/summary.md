# Scope C: Queries — summary

This is segment C of the final whole-project review of POMWright at `54cdada` (`fix/review-3-0-2`). It was reviewed as an area and, for the three commits below, as a change set. Reviewer: Claude Opus 5.5, 2026-10-23.

The Write tool refused this file, so it was delivered as text in the session's final message.

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").

## What I read

- **Briefing:** `scopes.md`, `inventory.md`, `baseline.md` and `C-queries/brief.md`, plus AGENTS.md in full (the copy at `54cdada`).
- **Source, in full with doc comments:**
  - `src/locators/locatorQueryBuilder.ts` and `src/locators/locatorUpdateBuilder.ts`.
  - The parts of `src/locators/utils.ts` they call: `readFields`, `copyValue`, `copyFields`, `copyFilter`, `mergeOptions`, `assembleDefinition`, `assertStrategyPrimary`, `assertPrimaryValue`, `assertDescription`, `cloneLocatorStrategyDefinition`, `STRATEGIES` and the any-frame messages.
  - `src/locators/types.ts`: the path, chain and update types.
  - In `locatorRegistry.ts`: `getLocatorSchema`, `getIfExists`, `endOpenRegistration`, `resolveFilter*` and `buildLocatorChain`.
  - In `locatorRegistrationBuilder.ts`: the end and any-frame checks.
- **Unit tests:** `locatorQueryBuilder.test.ts` and `locatorUpdateBuilder.test.ts` (test names, and the cases around the change set).
- **Harness:**
  - The ten specs of `test/tests/locatorRegistry/getLocatorSchema/`: test names and imports, and the `skip` spec in full.
  - The query cases of `add/add.frameLocator.spec.ts`.
  - The query and update lines of `packaging/publicTypes.typecheck.ts`.
- **Docs:**
  - `docs/queries.md`, `docs/filters-and-indices.md` and `docs/descriptions.md`.
  - `api/class-locatorquerybuilder.md`, `api/class-locatorupdatebuilder.md` and the *Queries* section of `api/errors.md`.
  - The query and update builder parts of `internal/builders.md`.
  - The *Locators* section of `docs/upgrading-from-2x.md`.
  - The query lines of `docs/frames.md`, plus `docs/typescript.md`, the relevant sections of `docs/locator-paths.md`, and `docs/registering-locators.md` (*Registered locators do not change*).
- **Change set since v3.0.1:**
  - In scope: `db26390`, `2accf34` and `b1ee8dc` (commit messages, diffs and changesets).
  - `9dc8048` (`readFields`, which belongs to scope B) was also probed through the query's `update`, `replace` and `filter`, since they read their inputs with it.

## Decisions taken without asking

- **v3.0.1 comparison worktree.** The brief points to scope A's brief for the commands, but the session rules forbid reading other scopes' folders, so I did not read it. I built the worktree myself: `git worktree add --detach <probes>/C/v301 v3.0.1`, `pnpm install --frozen-lockfile`, `pnpm build`. I used only its `dist/`, from Node scripts, and removed it with `git worktree remove`.
- **C-5 filed here, not in B.** `readFields` is on scope B's inventory line, but the defect reproduces through a query's `update`, `replace` and `filter`. Merge it with any scope B finding on `readFields`.
- **C-2 filed here, not in B.** It concerns a registration message (scope B), but the paths the `2accf34` fix misses are a query's. Merge it with any scope B finding on `2accf34`.
- **How I probed.**
  - Node scripts used the worktree's `dist/`, which is byte-identical to `.pack/pomwright/dist/`, with chromium loaded from the root package. Queries are synchronous and never inside `test.step`, so the runner was not needed.
  - Type probes ran with `pnpm exec tsc --noEmit -p test` against the packed declarations. For fix sketches they ran against source.
  - One temporary spec, with a custom step reporter, checked where Playwright shows a description.
- **Fix sketches.** C-1 and C-5 were sketched in source only, checked with a source-level type probe or a vitest probe, then restored with `git checkout`. Nothing was rebuilt, so no `harness:install` was needed.

## Inventory lines reviewed

**Fully:**
- §2 *Queries*, all four bullets: independent clone; `filter`, `nth`, `clearSteps` and `describe`; `update` and `replace`; `replace(sub).frameLocator()`; `skip` and `unskip`, including b1ee8dc.
- §1 `LocatorQueryBuilder` and `LocatorUpdateBuilder`.
- §3 `errors.md` *Queries*, checked against all 9 throw sites in `locatorQueryBuilder.ts` and all 3 in `locatorUpdateBuilder.ts`.
- §6 sub-path types, `SkippablePaths`, `Mode` and `OptionsPatch`.
- §5 inputs as a query takes them: sub-paths, `IndexSelector` values, descriptions, and options, patch and filter objects (plain objects, class instances, RegExps, mutation after the call).

**Partly:**
- §2 *Registration*: "registered locators do not change" (`readFields`, through query paths only) and "a registration ends at the next call" (query paths only).
- §8: my pages only.
- §9: the coverage map of my specs, without reading every assertion.
- §10: the AGENTS.md lines of my area. All are accurate, except the any-frame "checked at the call" rule (C-6).

**Not reviewed:** everything outside scope C.

## Not run

- Firefox and WebKit. Nothing in scope is browser behaviour; rendered chains depend on the Playwright version only.
- Node 20 and 22 (no `new URL` in scope).
- The harness at the latest Playwright 1.x.
- `pnpm typecheck`'s doc-snippet and API-coverage checks. They were green in the baseline, and I changed no page.
- The db26390 type probe on v3.0.1. The change only widens tuples, so I reasoned about it rather than running it.

## Test gaps, most important first

1. **Sub-path types on non-literal path types** (wide `string`, template-literal members) have no type test. See C-1.
2. **The registration-end message** when a query's resolution or `getLocatorSchema` ends a registration inside filter arguments is not tested. See C-2.
3. **`update`'s JSON Merge Patch and the query's `describe` are tested against source only.** Unit tests and the source-level specs (`getLocatorSchema.update.spec.ts`, `getLocatorSchema.describe.spec.ts`) cover `null` deleting one key, a lone `null` deleting all, and `describe` / `describe("")`. No spec against the packed package exercises them; only `publicTypes.typecheck.ts` covers their types.
4. **The any-frame form in a query is tested against source only.** This covers `replace(sub).frameLocator()`, the terminal and steps rejections, and `filter`/`nth` rejection afterwards. `add.frameLocator.spec.ts` imports source, and the unit tests use the fake page.
5. **`readFields` through a query** (a class instance as an `update` patch, as `replace` options or as a filter) is tested only at the utils level against source. An own non-enumerable property is not tested at all. See C-5.
6. **A query kept across later registrations** (snapshot semantics, and its sub-path message) is untested. See C-7.

## What is sound

Each line names the path probed. Probe files are in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/`.

- **Independence:** two queries from one path share no steps, the registry is unchanged after query changes, and every `getLocatorSchema` starts from the registry (p05, p10). A `Locator` resolved before a change keeps its old chain (p10).
- **Copies:** a filter object, an update patch, `replace` options, and a RegExp mutated or `compile()`d after the call change nothing (p05; DOM count 2).
- **Steps:**
  - `filter` and `nth` on the path and on sub-paths come after the registered steps, in call order (p01, p07 DOM).
  - `clearSteps` works on the path and on a sub-path (p01, p07).
  - `nth("first")` and `nth("last")` become `first()` and `last()`; `-1`, `1.5`, `NaN`, `undefined` and `null` go to Playwright as given (p07, p12).
- **describe:**
  - Sets the terminal's description for `getNestedLocator` and `getLocator`.
  - `describe("")` removes it as Playwright's own `describe("")` does: `description()` is `null` and `toString()` is the chain (p01, p10).
  - A non-string throws the documented message (p10).
  - Where Playwright shows a description, checked through the runner (p18): the step title plus subtitle (`Click`, `main.button@login`), the assertion's `Locator:` line, the call log's chain, and the strict mode error's chain.
- **update:**
  - Every row of the `queries.md` table is correct (stored records read in p02, renderings in p01).
  - JSON Merge Patch over the options of every strategy that has options, with RegExp primaries and options copied (p02).
  - An empty string is rejected exactly for `locator`, `frameLocator`, `getByRole` and `getById`, and kept for `getByTestId` and the text strategies (p02, p04).
  - A strategy change names `replace`, including `update().frameLocator()` on a non-frame segment (p01, p04, p12).
  - An `undefined` first argument keeps the registered value (p01, p16).
- **replace:**
  - Playwright 1.64's parameter lists compile for all ten methods; the options-only form and a missing first argument are rejected in types and at run time (type probe C2, p01).
  - `null` options or keys equal omission (p02).
  - `replace` then `update` merges into the replaced strategy, and names it on a mismatch (p17).
  - `frameLocator(selector)` on an ancestor with steps keeps the steps on the `<iframe>` element (p17, DOM text "One" and "Two").
- **The any-frame form in a query** (p03, p04):
  - `replace(sub).frameLocator()` with skipped ancestors resolves to `frameLocator().getByRole(…)`.
  - On the terminal, or on a segment with steps, it throws at the call.
  - When it is not the first segment, it throws at resolution.
  - `filter` and `nth` on it afterwards throw.
  - A kept `replace` builder checks the segment's steps when it applies.
- **skip and unskip** (p01, p16, type probe C2):
  - Every changing method throws on a skipped segment.
  - A second `skip`, a stray `unskip`, and skipping the terminal from JavaScript all throw.
  - A builder taken before `skip` throws while the segment is skipped and applies after `unskip`; a builder for another segment is unaffected.
  - `getLocator` ignores skips.
  - Skipping an unregistered segment, or one outside the chain, throws the sub-path error.
- **Types on a literal path union** (type probe C2):
  - `skip` and `unskip` exclude the terminal and paths outside the chain.
  - Sub-paths are restricted to the chain.
  - Update patch shapes (`null`, `undefined`, options-only) compile, and a misspelt option is rejected.
  - `replace`'s argument lists are Playwright's.
  - Generic base-class helpers with `getLocatorSchema(path).nth(…)` or `.filter(…)` compile.
- **Public declarations:** query steps return the `LocatorQueryBuilder` alias, never `this` (`dist/index.d.ts`).
- **Change set against v3.0.1** (p16 run on both builds): the only differences are the intended ones — b1ee8dc's throw while skipped, 2accf34's messages, and 9dc8048's reading of class-instance patches. No other path changed.
- **Docs:** every rendered chain and message on `queries.md`, `api/class-locatorquerybuilder.md`, `api/class-locatorupdatebuilder.md` and `descriptions.md`, and in the *Queries* section of `errors.md`, matches the build (p01, p03, p04, p10, p18). `internal/builders.md` (*The query*, *The update builder*) matches the code.
- **errors.md against the throw sites:** all 9 throw sites of `locatorQueryBuilder.ts` are documented. Of the 3 in `locatorUpdateBuilder.ts`, two are unreachable through the public API: `requireType`, and `replace`'s "requires a … value", because `commitPrimary` checks first. They are defensive only.

## Outside the scope

Brief notes for the consolidation:

- **C-2 and C-5 touch scope B's code** (the registration-end message, and `readFields`); see the decisions above.
- **`docs/upgrading-from-2x.md`, *Every strategy method needs its first argument* (for scope H):** it says the builders reject an empty string "for `locator`, `frameLocator` and `getByRole`". The runtime also rejects `getById("")` (`getById requires a non-empty id for "main.panel@summary".`, p04), and AGENTS.md §5 lists all four. I did not check whether 2.x accepted `getById("")`, which decides whether the upgrade page should list it.

## Findings index

All findings were reviewed at `54cdada` on 2026-10-23 and are open.

- **C-1** (defect, Low, patch): sub-path parameters are `never` on a `string`-typed registry, and the query's own path is rejected when it matches a template-literal member. A fix was sketched in `LocatorChainPaths` and checked: the probe passes and the 501 unit tests stay green.
- **C-2** (defect, Low, patch): a query in an `add` chain's filter arguments ends the registration with the pre-2accf34, self-contradicting message.
- **C-3** (documentation, Low, none): *Frames* links to *Queries* for the any-frame `replace`, and *Queries* never mentions frames.
- **C-4** (documentation, Low, none): the query's `describe()` API entry has no Throws section, and the update builder's page and its ten `@throws` omit the skipped-segment error that b1ee8dc made them throw (and `frameLocator`'s omits the strategy error).
- **C-5** (defect, Low, patch): an own non-enumerable option, patch or filter key is dropped where Playwright reads it. A fix was sketched in `readFields`: the unit probe passes and the 501 unit tests stay green.
- **C-6** (defect, Low, patch): a query's `describe()` on an any-frame terminal is not rejected at the call, unlike `filter()`, `nth()` and the registration's `describe()`.
- **C-7** (defect, Low, patch): a query kept across an ancestor's registration says the ancestor has "no locator schema registered for it".
