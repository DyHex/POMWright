# Plan 10: an ended registration's hint for `locator()` options and for queries

- **Decisions**: [DECISIONS.md](DECISIONS.md) #25
- **Findings**: [B-5](B-registration-and-resolution/defect-B-5-has-option-ended-message.md),
  [C-2](C-queries/defect-C-2-ended-by-query-message.md); test gap #9's ended-registration part
- **Bump**: patch (the pending `ended-registration-message.md` is extended)
- **Stop**: no
- **Depends on**: plan 9 (the same file, `locatorRegistrationBuilder.ts`)

## Contract

The rule is unchanged: a registration ends at the next call on its registry. When `filter` or `locator` (the seeded
override included), the two methods whose arguments can hold a `Locator`, find their registration ended by a call that
may have run in their own arguments, the message says so and shows how to write it:

- `filter`, ended by `getLocator`/`getNestedLocator` of another path: today's hint, unchanged;
- `locator`, ended by `getLocator`/`getNestedLocator` of another path: "If that call is in this locator's options, which
  run first, resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading" }). Otherwise,
  …" (`locator()`'s `has` takes only a `Locator`; Playwright treats `locator(selector, { has })` and
  `locator(selector).filter({ has })` alike);
- `filter` or `locator`, ended by a query (`getLocatorSchema(…)` or a query's resolution): "If that query is in this
  filter's arguments (this locator's options), which run first, resolve it before add(…). Otherwise, …", without the
  "pass a path" alternative, which would drop the query's changes.

Every other method keeps the plain message. Final texts from a probe.

## Current behaviour

- `src/locators/locatorRegistrationBuilder.ts:133-148` `ensureOpen` hints only for `method === "filter"` with a
  `resolvedPath`.
- `src/locators/locatorRegistry.ts:120-133` `endOpenRegistration` records `resolvedPath` only for `getLocator` and
  `getNestedLocator` (`resolves`); `getLocatorSchema` (`:454`) and a query's resolution (`:578`) record no mark.
- So `locator("x", { has: getLocator("y") })` (B-5, `…-probes/B/f5-has-option.out`) and `filter({ has:
  getLocatorSchema(p).getLocator() })` (C-2, `…-probes/C/p09-ended-by-query.mjs`) get "give a registration all its steps
  in its add(…) chain, or query the path for one use", which those lines already do.

## Steps

1. `RegistrationEnd` gains a `query: true` mark; `endOpenRegistration` sets it for `getLocatorSchema` and for
   `"resolution"` (keeping each call's text as today).
2. `ensureOpen`: the hint for `filter` and `locator` in the three forms above; the seeded override's `locator` goes
   through the same check (confirm it calls `ensureOpen("locator")`; `commitSeededOverride` → `ensureOpen(method)` at
   `:736`). The doc comment above it says which methods get which hint and why.
3. **Tests**: unit cases in `src/locators/locatorRegistrationBuilder.test.ts` for the four combinations
   (`filter`/`locator` × resolving call/query) and the double case `locator("x", { has:
   getLocatorSchema(p).getLocator() })`; a harness case in `test/tests/locatorRegistry/add/add.registrationEnds.spec.ts`
   against the packed package (the `locator` form).
4. **Docs**:
   - *Registering locators*, the paragraph "A registry call in a step's own arguments counts too": also `locator()`'s
     options, and queries.
   - *Filters and indices*, *A path, a locator or a chain*: one sentence that a query in the arguments ends the
     registration too.
   - `api/errors.md`, *A registration that has ended*: the new texts, copied from the probe.
   - `api/class-registrationbuilder.md`: the `locator` and `filter` **Throws**.
   - AGENTS.md §5: "a `getLocator` in an `add` chain's filter arguments" becomes "a resolving call or a query in an
     `add` chain's `filter` arguments or `locator` options".
5. **Changeset**: extend `.changeset/ended-registration-message.md` (unreleased) to cover `locator()`'s options and
   queries, with the `locator` example and its message, instead of a new changeset.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
fix: an ended registration's hint for locator() options and for queries

A registry call in a registration's own arguments runs first and ends that
registration. The hint that shows how to write it now also covers a
resolving call in locator()'s options and a query in filter() or locator()
arguments, where it leaves out passing a path, which would drop the query's
changes.

Plan: defect-review-result/PLAN-B-5-C-2-ended-registration.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27. As planned.

- `RegistrationEnd` gains `query?: true`; `endOpenRegistration` sets it for `getLocatorSchema` and a query's resolution.
  `ensureOpen` builds the message from three parts and gives `filter` and `locator` the query hint, `filter` the
  existing resolving-call hint, `locator` the new one (`.filter({ has: "<path>" })`); every other method keeps the plain
  message. The seeded override's `locator()` goes through the same check. Doc comment rewritten.
- Messages, from the packed build (harness) and a probe in Chromium: `locator() cannot apply to "section@inline": its
  registration was ended by getLocator("heading@explorer"). If that call is in this locator's options, which run first,
  resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading@explorer" }). Otherwise, …`;
  `filter() … ended by getLocatorSchema("heading@explorer"). If that query is in this filter's arguments, which run
  first, resolve it before add(…). Otherwise, …`; `locator() … ended by a query's resolution of "heading@explorer". If
  that query is in this locator's options, …`.
- Tests: `locatorRegistrationBuilder.test.ts`, the four combinations, a query resolved after it was taken, and the
  plain message for another method; `locatorRegistry.test.ts`'s table of enders now expects the query hint for `filter`
  after `getLocatorSchema` (the existing expectation pinned the behaviour this plan changes); two harness cases in
  `add.registrationEnds.spec.ts` (the `locator` form with the path filter that works instead, and a query in a filter).
- Docs: *Registering locators* (the `locator` form and queries, with both messages), *Filters and indices* (a query
  ends it too), `api/errors.md` (the three new forms), `api/class-registrationbuilder.md` (`locator()` and `filter()`
  **Throws**), AGENTS.md §5. The pending `ended-registration-message.md` extended.
- Checks: `pnpm lint` 0; `pnpm test:unit` 818 passed; `pnpm pack-test --reporter=line` exit 0 (1,518 passed, 3
  skipped; doc snippets 217; api coverage 0 problems; step locations 7); `pnpm docs:build` 0.
