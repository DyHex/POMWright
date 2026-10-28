# Segment 2C inventory (blind, pass 1)

The query area at `d850405`, mapped before reading anything of the first review. One line per item: what it is, where
it is implemented (`src/locators/` unless named), where it is documented, and how pass 1 probed it (probe files are in
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/`). Q = `locatorQueryBuilder.ts`, U =
`locatorUpdateBuilder.ts`, R = `locatorRegistry.ts`, T = `types.ts`, X = `utils.ts`. Pages are under
`website/src/content/docs/`.

## Public exports and members

- `getLocatorSchema(path)` on the registry, the accessor and a page object: R:478-487 (`GetLocatorSchemaAccessor`
  R:710-712, `PageObject` facade `src/pageObject.ts:306-331`); `api/class-locatorregistry.md`, `docs/queries.md`. Probed
  P1, P3 (unregistered path), P5 (2), T1, T3.
- `LocatorQueryBuilder<Paths, Path>` (alias over `LocatorQueryBuilderInternal`): Q:45-48; `api/class-locatorquerybuilder.md`,
  `docs/typescript.md`. T1 (doc-comment example, named returns), T3.
- `update(subPath?)`: Q:111-131, `applyUpdate` Q:290-299, `mergeLocatorDefinition` U:74-92; P1, P3, P2 (patch copies).
- `replace(subPath?)`: Q:319-340, `applyReplacement` Q:342-359, `buildReplacementDefinition` U:99-114; P1, P3, P5.
- `filter(subPath?, filter)`: Q:155-185, `copyFilter` X:241; P1, P2 (DOM), P3.
- `nth(subPath?, index)`: Q:241-264, `applyIndexSelector` X:292-300; P1, P3.
- `clearSteps(subPath?)`: Q:204-219; P1, P3 (skipped).
- `describe(description)`: Q:283-288, `assertDescription` X:253-262; P1, P3, S1.
- `skip(subPath)`, `unskip(subPath)`: Q:378-418, `SkippablePaths` Q:501-504; P1, P3, T1, T4.
- `getLocator()`, `getNestedLocator()`: Q:433-467 over `buildLocatorChain` R:592-657; P1, P2, S1.
- `LocatorUpdateBuilder<Paths, Path, SubPath, Mode>` (alias over `LocatorUpdateBuilderInternal`): U:135-140; its ten
  methods U:176-443, `commitWithOptions`/`commitPrimary` U:446-466, `parseUpdateArguments` U:27-38, `ArgsFor` U:56-60;
  `api/class-locatorupdatebuilder.md`. P1, P2, P3, P5, T1.
- `FilterDefinition`, `IndexSelector`, `LocatorSchemaPathArgument` (the types the query takes): T:284-295, T:340, R:66-70;
  `api/types.md`. T1.

## Contracts

- A query is a private copy of the chain taken at `getLocatorSchema`; the registry never changes; each call is a new
  copy (Q:64-90 over `getIfExists` R:355-369; `docs/queries.md` *Introduction*, guide `src/locators/AGENTS.md`
  *Contracts*). P1 (resolved twice, kept query, later ancestor), P2 (values changed after the call).
- A kept query keeps working after the registry is called again; an ancestor registered later is not in it, and its
  sub-path error says so (Q:470-482, commit 9bcf72e; `docs/queries.md` *Keeping a query*, errors.md *Queries*). P1, P3.
- Sub-paths: the query's path or a registered ancestor, typed per member of the path union (literal, template, `string`),
  checked at run time (T:63-80, Q:470-482, commit 49454c6; `docs/queries.md` *Sub-paths*, `docs/locator-paths.md`). T1,
  T2, T3, P3.
- `update` keeps the strategy, JSON Merge Patch for options, `undefined` = not given, `null` deletes, lone `null` deletes
  all; another strategy throws naming `replace` (U:74-92, X:497-519; `docs/queries.md` table). P1, P3, P2.
- `replace` installs any strategy with Playwright's arguments; first argument required except `frameLocator` (any-frame);
  `null` options equal omission (U:99-114, U:456-466). P1, P3, P5 → 2C-1.
- `update`/`replace` never touch steps or description; `clearSteps`/`describe("")` take them away (Q:290-359). P1.
- Steps append after registered steps, in call order, per segment (Q:181-183, Q:260-262; `docs/filters-and-indices.md`
  *Steps in order*). P1.
- `skip` is a flag; `unskip` restores exactly; terminal cannot be skipped (types and runtime); changes to a skipped
  segment throw, also from a builder taken before the skip (Q:294-296, Q:346, commit b1ee8dc). P1, P3, T1, T4.
- `describe` on the terminal only; `""` removes; non-string throws; any-frame terminal throws (Q:283-288, commit 8bdcd35;
  `docs/descriptions.md`). P1, P3, S1.
- `has`/`hasNot` path references resolve to that path's own locator from the live registry at resolution, cycles
  detected (R:371-437; `docs/filters-and-indices.md`, `internal/resolution.md`). P1 (a query's change to that path is not
  seen; documented as "registered path"), P2, P3.
- Any-frame form in a query: `replace(sub).frameLocator()` on an ancestor; not the terminal, not with steps; first-segment
  rule at resolution; `filter`/`nth`/`describe` reject it (Q:342-359, Q:493-497, R:631-655; `docs/queries.md` *The
  any-frame form in a query*, commit 8f185be). P1, P3, P5, T4 → 2C-3.
- Frame segments in a query: steps apply to the `<iframe>` element before `contentFrame()` (R:645-647). P1.
- Copies: options, filters, patches and RegExps copied at the call, read as Playwright reads them (`readFields` X:197-230,
  commits 9dc8048, b990969). P2 (DOM comparison with Playwright's own call).
- A query in an `add` chain's arguments ends that registration, with a message for queries (R:161-175, commit 890dbd8).
  P4.
- Builders are synchronous, not thenable (guide `src/AGENTS.md`). Read only; no async in the area.

## Errors and messages (all compared character for character in P3 or P4)

- Sub-path: outside the chain; segment without a locator; segment registered after the query (Q:470-482).
- Skipped: `<method>() cannot apply … it is skipped …` for update, replace, filter, nth, clearSteps, and the kept builders;
  `skip()` twice; stray `unskip()`; `skip()` of the terminal (Q:378-418, Q:484-490).
- Strategy change in `update` (U:80-84). First argument missing or empty, both modes (X:155-182, X:457-476).
- Any-frame: replace of the terminal, replace of a segment with steps, filter/nth/describe on it, not-first at resolution
  (X:546-563).
- `describe` non-string (X:253-262). `No locator schema registered …` from `getLocatorSchema` and from a `has` path at
  resolution (Q:87-89, R:340-348) → 2C-2.
- Ended registration by a query or its resolution (`locatorRegistrationBuilder.ts` `ensureOpen`, 890dbd8). P4.
- Internal, unreachable from the public API: `Locator update/replace … requires a "type" property` (U:64-68),
  `Locator replace … requires a "…" value` (U:104-109, `commitPrimary` checks first), `Unknown locator strategy` (X:427-433).

## Inputs at the boundary

- Filter objects: plain, class instance with getters, non-enumerable own properties, `has: undefined`, `{}`, RegExp
  `hasText` with flags `i g y m u v s` and a set `lastIndex`, RegExps rewritten with `compile()` after the call: P2.
- Patches and options: RegExp `name` rewritten after the call, class-instance patch and options: P2. `null`/numbers/
  objects as a primary from JavaScript: P3. Empty strings where Playwright cannot use them: P3.
- JavaScript misuse not validated, mirroring Playwright: `filter("path")` (one string), `nth("path")`, `filter(null)`,
  `has: null` (throws "Unsupported filter reference" at resolution, documented). Types reject the first two (T1).

## Types

- Sub-path types per member (T:67-80), `SkippablePaths` (Q:501-504), `ArgsFor` per mode (U:56-60), `UpdateArgsWithOptions`
  (U:41-47), the query type through a generic base (issue #61's 3.x fix). T1, T3, T4; repository: `publicTypes.typecheck.ts`
  lines 76-186 and 357-435.

## Documentation

- `docs/queries.md`, `docs/filters-and-indices.md`, `docs/descriptions.md`, `api/class-locatorquerybuilder.md`,
  `api/class-locatorupdatebuilder.md`, `api/errors.md` (*Queries*, the first-argument and any-frame sections),
  `internal/builders.md` (*The query*, *The update builder*), `internal/resolution.md`. Read in full; messages P3; the
  descriptions table S1; chains are rebuilt by `test/tests/docs/docsChains.spec.ts` (baseline green). Query statements
  on other pages read: `docs/locator-paths.md` (T2), `docs/frames.md`, `docs/typescript.md` (T3),
  `docs/upgrading-from-2x.md`, README's example.
- Doc comments of Q and U: compared with the pages (2C-1 for the `LocatorUpdateBuilder` comment).

## Tests

- Unit: `locatorQueryBuilder.test.ts` (types, undefined first argument, skip/unskip, sub-path errors, describe,
  any-frame), `locatorUpdateBuilder.test.ts` (parse, merge, replacement, types, replace from JavaScript).
- Harness (packed package): `getLocatorSchema/*.spec.ts` (10 files), `add/add.filter.spec.ts`, `add/add.describe.spec.ts`,
  `add/add.get.clone.spec.ts` (query update copies), `add/add.registrationEnds.spec.ts`, `validation/validation.sub-path.spec.ts`,
  `testApp/testFilters.spec.ts`, `docs/docsChains.spec.ts`, `packaging/publicTypes.typecheck.ts`.

## The change set (v3.0.1..d850405, query commits)

- After 54cdada: 9bcf72e, 8bdcd35, b990969, 890dbd8, 49454c6, 8f185be (docs), 429f2c2 (errors page), 9f47cae/a7d5ba7
  (packed twins of the query specs). Before: 9dc8048, db26390, b1ee8dc, 2accf34. Changesets read:
  `kept-query-sub-path-message`, `query-describe-any-frame`, `sub-path-template-members`, `registry-requires-paths`,
  `builder-after-skip`, `undefined-first-argument` (→ 2C-1), `options-read-like-playwright`, `ended-registration-message`.
