# Locators

The registry, registration, query, reuse and resolution rules: what a locator path, a registration, a query and a seed
promise. Claude Code loads this file when it reads a file under `src/locators/`; with another client, read it before
working there. Read it before changing a locator spec or a locator page too. Part of the contributor guide that the root
[AGENTS.md](../../AGENTS.md) indexes; its rules apply here too.

## Files

`locatorRegistry.ts` (registry, the open registration it ends at its next call, resolution with frames as `locator` plus
`contentFrame()` and the any-frame segment, cycle detection, `verify()` with the opt-in `strictChains`, reuse by path
and by seed through one seeded builder), `locatorRegistrationBuilder.ts` (`add(path).getByRole(...)` DSL, seeded
registrations with `update`'s argument shapes, the boundary checks, no steps on an any-frame definition),
`locatorUpdateBuilder.ts` (`update` as a same-strategy JSON Merge Patch, `replace` with Playwright's argument lists
through a `Mode` type parameter; the class `LocatorUpdateBuilderInternal`, the public alias `LocatorUpdateBuilder`),
`locatorQueryBuilder.ts` (`getLocatorSchema(path)` chain: `filter`, `nth`, `clearSteps`, `skip`/`unskip`, `describe`,
`update`, `replace`, `getLocator`, `getNestedLocator`; the class `LocatorQueryBuilderInternal`, the public alias
`LocatorQueryBuilder`), `reusableLocatorBuilder.ts` (`createReusable`; a seed is a value whose methods return new seeds;
the class `ReusableLocatorFactoryInternal`, the public alias `ReusableLocatorFactory`), `types.ts` (definitions,
`ReusableLocator`, `FilterDefinition`, `IndexSelector`, `OptionsPatch`, compile-time path validation), `utils.ts` (the
`STRATEGIES` table, one row per strategy, that creation, cloning, the seeded patch, `update` and `replace` read; path
validation with `LOCATOR_SCHEMA_PATH_WHITESPACE`, `assertStrategyPrimary` over `assertPrimaryValue` and `assertIdValue`,
`assertDescription`, the id selector helpers, `createLocator`, `applyIndexSelector`, `isAnyFrameDefinition`,
`isLocatorInstance`, `isReusableLocator`, `methodForStrategy`, `mergeOptions`, cloning and copying (`copyValue`,
`copyFields`, `copyFilter`, `normalizeSteps`), patching).

## Contracts

- Preserve the fluent registry API and its semantics: `add(path).getByRole(...)`, seeded registrations,
  `getLocatorSchema(path)` followed by `update()`, `replace()`, `filter()`, `nth()`, `clearSteps()`, `skip()`,
  `unskip()`, `describe()`, `getLocator()`, `getNestedLocator()`; `createReusable`; clone-on-read; cycle detection;
  terminal-only `has:` path references. Builders are synchronous.
- A registered locator cannot change after registration: builders store copies of the options and filter objects
  callers pass, read as Playwright reads them (`readFields`: own properties, enumerable or not, then those of each
  prototype up to `Object.prototype`, methods left out), and of every value in them, a RegExp included (`copyValue`: `RegExp.prototype.compile()` rewrites one
  in place; a `Locator` is kept, since its methods return new ones), the registration builder keeps its own copy of
  the definition it re-registers from, and every read (`getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`,
  `has` paths) works on a clone of the record; each `getLocatorSchema` call is a new, independent clone. A
  registration ends at the next call on its registry (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`,
  `verify`, a resolution): the registry ends the open one, and every method of an ended registration throws first,
  naming the call that ended it, so a registration kept in a variable cannot change its path once anything else has
  happened. A resolving call or a query in an `add` chain's `filter` arguments or `locator` options runs first and ends
  that registration; the message shows how to write it (a path, in a `filter` step after `locator`, or a locator
  resolved before `add`; for a query, resolving it first, since a path would drop its changes). The rule stays "the next call", not "the next
  call that could read it" (considered and not adopted).
- `skip(subPath)` is a flag on the query: it leaves an ancestor out of the chain and deletes nothing, and
  `unskip(subPath)` restores it exactly as it was. The terminal path cannot be skipped (types and runtime);
  `update`, `replace`, `filter`, `nth` and `clearSteps` on a skipped segment throw, as do a second `skip` and a
  stray `unskip`; an `update()` or `replace()` builder taken before the `skip` throws when it applies its change. `update` and `replace` never touch steps or the description; `clearSteps()` and `describe("")`
  take those away.
- `describe` takes a string on every builder; `describe("")` removes the description (Playwright's meaning), and
  the default stays the path. `nth` hands every index but `"first"`/`"last"` to Playwright's `nth` as given.
- Keep the dot-delimited path guarantees. The runtime `validateLocatorSchemaPath` and the type-level
  `LocatorSchemaPathFormat` family in `types.ts` must stay in agreement; the whitespace both reject comes from one
  list, `LOCATOR_SCHEMA_PATH_WHITESPACE` in `utils.ts`.
- `getById` stores values verbatim: strings resolve as `[id="…"]` (exact, case-sensitive, no prefix handling),
  RegExps as `internal:attr=[id=/source/flags]` with every flag passed through; in unicode mode (`u`, `v`) the selector
  writes a quote, an apostrophe, a backtick and the second `>` of `>>` by their code (`\x22` and the like), since
  unicode mode rejects the backslash escapes Playwright's parser needs, and the pattern stays the same. POMWright adds
  no regex semantics of its own. The strategies Playwright builds keep Playwright's limitation (#40446), documented on
  *Registering locators*.
- Per-strategy rules live in one place, the `STRATEGIES` table in `utils.ts`; a new strategy is a row plus its method
  on each builder, and the type tests fail until both exist. No per-strategy `switch` elsewhere.
- Every builder requires the strategy's first argument through `assertStrategyPrimary`; an empty string is rejected
  only where Playwright cannot use it (`locator`, `frameLocator`, `getByRole`, `getById`) and stored verbatim
  otherwise; `undefined` means "not provided" (it inherits on seeded and update builders). A primary is always a
  value: `null`, a number, an object or a RegExp where Playwright takes a string gets the missing-value message on
  every builder; with two arguments the first is the primary, and a lone `null` where options may stand is the
  options. A throwing DSL call changes nothing. `update` keeps the registered strategy and follows JSON Merge Patch
  (`null` deletes); a seeded override parses and merges exactly as `update` does; `replace` changes the strategy and
  takes Playwright's argument lists (the first argument required but `frameLocator`'s, whose absence is the any-frame
  form; Playwright's option types); none touches steps.
  Roles are Playwright's compile-time type; there is no runtime role list.
- A seed never changes: `filter`, `nth` and `describe` return a new seed, `definition` and `steps` are copies. Reuse
  by path copies the record (strategy, steps, an explicit description) and returns `filter`, `nth` and `describe`;
  no strategy override and no `clearSteps` after a path. An any-frame `frameLocator()` definition takes no steps or
  description from any source (checked at the call); its position is `verify()`'s first-segment check. A hand-made
  seed object gets the primary check every builder applies (method `reuse`). `replace(sub).frameLocator()` throws at
  the call on the query's own path and on a segment with steps in the query (`clearSteps` first).
- An unregistered path segment is a name that groups paths and is left out of the chain; `strictChains: true` (an
  option of the registry and of `PageObject`) makes `verify()` require every ancestor to be registered. It is never
  the default. The default description of a resolved locator is its path.
- A `frameLocator(selector)` segment is `locator(selector)` plus its steps, then `contentFrame()` for the descendants
  and the `<iframe>` element as a terminal; `frameLocator()` is Playwright's any-frame locator, first segment only, no
  steps, no terminal form. Never reintroduce `target.frameLocator(selector)` with dropped steps.
- A locator change is tested as [test/AGENTS.md](../../test/AGENTS.md#the-harness-test) says for locator behavior.
- Considered and not planned: validating `nth`'s index, which Playwright's `locator.nth` takes as given (rejecting
  `nth(undefined)`, documented as matching nothing, would be breaking).

## Do not

- Reintroduce behavior that 3.0.0 removed: `#` and `id=` prefix handling in `getById`, dropping steps on frame
  segments, a cross-strategy `update` with a per-type cache, explicit `undefined` as the option-clearing value, the
  rollback of a failed seeded override, `update()`'s optional patch arguments on `replace()`, a query `remove()` that
  deletes a segment's definition, steps or description, a seed method that changes the seed, a `void` path reuse, a
  `null` stored as a primary or as a seeded option key, or steps on an any-frame definition.
- Add a per-strategy `switch` outside the `STRATEGIES` table, or make `strictChains` the default.
- Keep a reference to an object a caller passed to a builder, a RegExp included, or let a registration take a call
  after its registry was called again.
