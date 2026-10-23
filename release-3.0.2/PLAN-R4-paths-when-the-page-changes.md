# PLAN-R4 — when the page changes: maintaining paths

Raised by the user, 2026-10-22: the docs on paths and registration should show how little it takes to follow a change
of the page's structure.

## Goal

A section that shows, for the common structure changes, the smallest edit that makes every chain right again, and what
catches a missed spot. No marketing; each operation is a short before/after.

## Where

`docs/locator-paths.md`, a new section **When the page changes**, after *Segments without a locator* (which it builds
on) and before *The registry*. *Registering locators* and *Organising a project* link to it in one sentence each.

## The operations (each verified, see below)

The running example: `main.section@order.region@subscriptions.region@subscription.button@edit` and the other buttons and
fields under `region@subscriptions`.

1. **A wrapper is removed** (the page drops the Subscriptions region around the subscriptions). Every chain through it
   now finds nothing. Two ways back:
   - **Delete the segment's `add(…)`, nothing else.** A segment without a locator is left out of the chain, so every
     path under it resolves again, names unchanged. One line. With `strictChains: true`, `verify()` reports the now
     unregistered ancestor for every path under it, so this way is for registries without it.
   - **Rename the paths** so the names match the page again: replace `main.section@order.region@subscriptions.` (with the
     trailing dot) by `main.section@order.` everywhere, and delete the segment's own path from `Paths` and its `add(…)`.
     The trailing dot keeps the replace from touching a sibling such as `region@subscriptionsArchive`.
2. **A wrapper is added** (a Billing region now holds the subscriptions): replace `main.section@order.region@subscription`
   by `main.section@order.region@billing.region@subscription`, and register `main.section@order.region@billing`. Without
   the new segment the old chains still resolve, since a chain needs its ancestors inside each other, not directly
   inside each other; the new segment is what scopes them to Billing.
3. **An element moves** to another section: rename the paths under its old prefix to the new prefix, the same replace.
4. **An element's locator changes** (a new name, role or test id): edit its one `add(…)`. Every chain through it, and
   every `has` that names it, follows.
5. **A variant of the page for one test** (a feature flag that drops the wrapper): no change to the registry; the test
   queries the path with `skip(segment)`.

What catches a missed spot:

- **TypeScript**: once `Paths` is edited, every remaining use of an old path is a compile error, in `getNestedLocator`,
  `getLocatorSchema`, a `has` path, a sub-path of `skip`, `update` or `filter`.
- **`verify()`**: a `has` path or, with `strictChains`, an ancestor that is no longer registered fails the page object
  before the test body runs; a forgotten `add` of the removed segment, renamed into a duplicate, fails with the
  duplicate-path error.
- A path built at runtime (a template literal) is not found by the replace: TypeScript still checks it when its parts
  are literal types.

## Verified (2026-10-22, chromium, the packed build; `tsc` 6.0.3)

- Before/after DOM with the Subscriptions region removed: the old registry's `getNestedLocator` of the edit button
  counts 1 before, 0 after.
- Deleting only `add("main.section@order.region@subscriptions")`: count 1, chain
  `locator('main').getByRole('region', { name: 'Order' }).getByRole('region', { name: 'Mobile subscription' }).getByRole('button', { name: 'Edit' })`.
- The same with `strictChains: true`: `verify()` throws
  `Locator registry verification failed for 2 of 4 paths:` with, per path,
  `strictChains requires every ancestor to be registered; "main.section@order.region@subscriptions" is not.`
- Renamed paths (`main.section@order.region@subscription.button@edit`), `strictChains: true`: `verify()` passes, count 1.
- The segment's own `add` left behind by the replace, in a page object: `OrderPage: defineLocators() failed: A locator
  schema with the path "main.section@order" already exists.`
- A Billing wrapper added, prefix renamed and the segment registered: count 1.
- A Billing wrapper added and the registry left as it was: the old chain still counts 1, since each chained locator
  is looked for anywhere inside the previous one.
- The old registry on the changed page, `getLocatorSchema(edit).skip("main.section@order.region@subscriptions")`:
  count 1.
- A stale path after editing `Paths`: `TS2345: Argument of type '"main.section@order.region@subscriptions.region@subscription.button@edit"' is not assignable to parameter of type 'Paths'.`;
  a stale `skip` sub-path: `TS2345: Argument of type '"main.section@order.region@subscriptions"' is not assignable to parameter of type '"main" | "main.section@order"'.`

## Renaming one path with the editor

An editor's rename (F2, "Rename Symbol") asks the TypeScript language service for the places to change. Verified
2026-10-22 against the TypeScript 6.0.3 language service (`getRenameInfo`, `findRenameLocations`), with a page object
and a spec in two files, not through an editor's UI:

- **From a use**, it renames every use of that exact path across files: `add`, `getNestedLocator`, `getLocatorSchema`,
  `getLocator`, and sub-path arguments (`filter("main.section@order", …)`, `skip(…)`). It leaves a plain `string` with
  the same text alone. It does not rename the `Paths` member.
- **From the `Paths` member**, it renames that member only.
- **It renames exact literals only**: renaming `"main.section@order"` leaves `"main.section@order.button@edit"` as it
  is.

So the section adds a sixth operation: **one path gets a new name** (a field renamed, a leaf moved within its parent):
rename it from any use, then rename its `Paths` member; between the two, TypeScript flags every use, so nothing is
missed. A change of structure, which changes the prefix of many paths, stays a find and replace.

### Can one rename cover the member and its uses? No (verified)

The language service links two string literals when they have the same text and the same contextual type. A `Paths`
member's type is the union itself; a use's is the parameter type of the method. Models probed with the same language
service: a parameter typed exactly as the union (`get(path: T)`, or a plain overload before the generic one) links the
member and its uses in one rename; a generic parameter (`get<P extends T>(path: P)`, POMWright's
`LocatorSchemaPathArgument<P>`) does not. `getLocatorSchema` must stay generic (its path decides the sub-paths a query
accepts), and the sub-path arguments of `filter`, `skip` and `update` are narrowed unions. A plain overload on
`getNestedLocator` only, probed beside a generic `getLocatorSchema`: a rename from the member or from `getNestedLocator`
reaches `getNestedLocator` only, and one from `getLocatorSchema` reaches `getLocatorSchema` only. Today a rename from
any use reaches every use, so the overload would make it worse. Not pursued. What could do more, a prefix rename
included, is a TypeScript language service plugin that knows POMWright paths: a separate package, editor-only, a
candidate for a GitHub issue if wanted.

### The find and replace, made safe

Paths always start at the root and sit in quotes, so a regular expression (as editors' find in files take them)
anchored at the opening quote and ending at the segment's dot renames exactly the descendants, in any quote style, and
no sibling:

- find ``(["'`])main\.section@order\.region@subscriptions\.``, replace with `$1main.section@order.`

Do not include the removed segment's own path in the replace. Probed with Node 24's `String.prototype.replace`: a
variant that also matched the bare segment turned `skip('main.section@order.region@subscriptions')` into
`skip('main.section@order')`, which compiles and silently skips the wrong segment. Left alone, every reference to the
removed segment (its `add`, a `skip`, an `update` or `filter` sub-path, a `has`) becomes a compile error once it leaves
`Paths`, and each is decided on its own.

## Docs and tests

- The section's examples go through the snippet check; every chain and message is the one above.
- No code change, so no new tests and no changeset.

## Bump

None.

## Decisions

- [x] The section as outlined, in `docs/locator-paths.md` (2026-10-22)
- [x] Both ways for a removed wrapper, delete-only first, then rename (2026-10-22)
