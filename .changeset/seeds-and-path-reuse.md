---
"pomwright": major
---

### Breaking changes

- A seed from `createReusable` no longer changes: `filter`, `nth` and `describe` return a new seed and leave the seed
  they are called on as it was, as a Playwright `Locator` does, and `seed.definition` returns a copy. In 2.x they
  changed the seed and returned it, so variants derived from one base seed carried each other's steps and
  description (`row.nth("last")` after `row.nth(0)` resolved to the first row). Migration: use the result of a seed
  method, `add(path, { reuse: seed.filter(f) })` instead of `seed.filter(f);` followed by `add(path, { reuse: seed })`,
  which now registers the seed without the filter.
- `add(path, { reuse: "other" })` returns `filter`, `nth` and `describe`, which narrow the copy after the copied steps
  (the copy keeps the source's strategy, steps and explicit description, as before; the source never changes). There
  is no strategy override and no `clearSteps` after a path, and a copy of an any-frame `frameLocator()` path refuses
  all three. 2.x returned nothing (`void`). Migration: drop a `void` annotation on the result; a module compiled with
  `declaration: true` that returns it from an expression-bodied arrow uses a block body or `: void`, as for a seed
  reuse.

### Fixes

- Variants derived from one seed no longer share steps or a description (analysis 3.8).
- A reuse value that is neither a registered path nor a seed (`{ reuse: null }` from JavaScript) throws `reuse
  requires a registered path or a seed from createReusable for "<path>".` instead of a `TypeError`.
- A first argument Playwright cannot take, from JavaScript (`null`, a number, an object, a RegExp for a role,
  `locator` or `frameLocator`), throws `<method> requires a <field> value for "<path>".` on every builder instead of
  being stored and failing later with a `TypeError`, resolving to nonsense (`locator('null')`, `getByTestId('42')`) or
  doing nothing. With two arguments the first is the primary, so `getByRole(null, null)` is valid nowhere; a lone
  `null` on `update` or a seeded override is the options.
- A seeded override follows `update()`'s Merge Patch: a `null` option key is deleted instead of stored (a stored
  `name: null` failed at resolution), a lone `null` clears the seed's options (2.x ignored it), `(primary, null)` sets
  the primary and clears them, and a JavaScript `(undefined, options)` no longer drops the options. All of these forms
  now compile, typed as `update`'s.
- Steps or a description can no longer reach an any-frame `frameLocator()` definition, through a copy by path or a
  hand-made seed object: they throw at the call instead of at the first resolution below the path. A copy or seed
  without them registers as `add(path).frameLocator()` does.

### Internal

- The ten locator strategies are described once, in one table that locator creation, the clone, the seeded override,
  `update` and `replace` read; a strategy without its builder method is a compile error (analysis 3.1).
- The debug-step record of the chain builder, built and never read, is removed (analysis section 2).
