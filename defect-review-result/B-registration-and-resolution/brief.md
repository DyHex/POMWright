# Scope B: Registration and resolution

Segment B of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (lines tagged B) and
[../baseline.md](../baseline.md). Probes go to `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/`.

Review it as an *area* in the skill's terms. Also treat the commits since `v3.0.1` listed below as a *change set*: for
each one, list every path its promise applies to, including the paths it did not touch, and probe them through the
public API. Where a regression is possible, run the same probe on `v3.0.1` too, in a second worktree in your probes
folder (see scope A's brief for the commands; never run it at the same time as the main one).

## What is in scope

- **Source**: `src/locators/locatorRegistry.ts`, `locatorRegistrationBuilder.ts`, `reusableLocatorBuilder.ts`,
  `utils.ts`, `types.ts`, `index.ts`. Read all of it, with its doc comments. `fakePage.ts` is test support.
- **Unit tests**: `src/locators/utils.test.ts`, `locatorRegistry.test.ts`, `locatorRegistrationBuilder.test.ts`,
  `reusableLocatorBuilder.test.ts`.
- **Harness**: `test/tests/locatorRegistry/add/`, `getLocator/`, `getNestedLocator/`, `registry/`, `validation/`
  (including the compile-only `validation.locatorSchemaPath.typecheck.ts`), `filter.cycle.spec.ts`;
  `test/tests/testApp/iframe.spec.ts`, `testIds.spec.ts`, `testFilters.spec.ts`, `testPage.spec.ts`; the page objects
  `iframe/`, `testids/`, `testfilters/`; the `/iframe*`, `/testids` and `/testfilters` routes and the static page.
  Most `locatorRegistry/` specs import the source (AGENTS.md §4): note which contracts are tested only against source.
- **Docs**: `docs/registering-locators.md`, `locator-paths.md`, `locating-by-id.md`, `frames.md`,
  `reusing-locators.md`, `verifying-registries.md`, `resolving-locators.md`; `api/class-locatorregistry.md`,
  `class-registrationbuilder.md`, `class-reusablelocator.md`, and in `api/types.md` the sections `FilterDefinition`,
  `IndexSelector`, `LocatorSchemaPathFormat` and `LocatorSchemaPathArgument`; the *Paths*, *Registering*, *Reusing*
  and *Resolving and verifying* sections of `api/errors.md`; `internal/registry-records.md`, `resolution.md`,
  `strategies-table.md`, the registration part of `builders.md`, and *From `add(path)` to a `Locator`* in
  `internal/index.md`; the registration and resolution parts of the *Locators* section of
  `docs/upgrading-from-2x.md`; the registry lines of AGENTS.md §5 and §8.

## Changes since v3.0.1 in this scope

```
13017b7 docs: two design reasons from the 3.0.2 work on the Internal pages
bb03471 docs: when the page changes, following it in the paths
ffcc23f docs: correct six statements found by the 3.0.1 reviews
61e266c perf: describe an ending registration only when one is open
9dc8048 fix: options are read as Playwright reads them, prototype values included
db26390 fix: undefined as update's and a seed override's first argument compiles
2accf34 fix: an ended registration's error names the call that ended it
```

## Known and decided

- Decided, not planned (AGENTS.md §7): ending a registration only at calls that could read it.
- AGENTS.md §8: no `#` or `id=` prefix handling in `getById`; no dropped steps on frame segments; no reference kept to a
  caller's object; no per-strategy `switch` outside `STRATEGIES`; `strictChains` is never the default; no `null` stored
  as a primary or as a seeded option key; no steps on an any-frame definition; no seed method that changes the seed;
  no `void` path reuse.

## Questions to answer

- **Copies.** Can a caller's object reach a record by any path without being copied? Cover `add`'s options, filter
  options, `has` as a `Locator`, a seed's definition, a seeded override and `createReusable`'s options. Try
  prototypes, getters, class instances, frozen objects, RegExps with `lastIndex` and `g`/`y`, and mutation after the
  call. Does `9dc8048`'s reading as Playwright reads hold on each of these paths, and agree with what Playwright itself
  reads?
- **Ended registrations.** Check every method of every builder kind (before the locator method, after it, reuse by
  path, reuse by seed) against every ending call. Does the list of ending calls in the code match AGENTS.md §5 and the
  docs (is `createReusable` one)? Does the message always name the call that ended it?
- **Primary rules.** Check the ten strategies × the registration builder, a seed and a seeded override with `null`, a
  number, an object, a RegExp, `""`, `undefined`, and one argument against two. Is the message the documented one each
  time, and does a throwing call change nothing?
- **Paths.** Do the runtime and the type-level validation agree on whitespace (every character of
  `LOCATOR_SCHEMA_PATH_WHITESPACE` and the Unicode spaces outside it), empty segments, leading and trailing dots, and
  very long paths?
- **Resolution.** Check `has`/`hasNot` paths that are not terminal, cycles through `has`, `hasNot` and reuse, frames
  with steps, nested frames, the any-frame `frameLocator()` in every other position, `strictChains` with unregistered
  middle segments, and the default description. Assert against the DOM where the docs promise behaviour, not only
  against rendered strings.
- **Docs.** Is every chain, description and message a page shows the one the build produces now (AGENTS.md §9 says
  they are copied from probes)?

## Neighbours

`getLocatorSchema` and its builders (`update`, `replace`, `skip`) are scope C. A page object's registry facade and its
lifecycle are scope D. `locator-modules.md` is scope H. Report what you meet there under *outside the scope* in
`summary.md`.
