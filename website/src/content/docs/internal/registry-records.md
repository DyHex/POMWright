---
title: Registry records
description: "What the registry stores per path, when a record is written and when it is final, why every boundary copies, and why a registered locator never changes."
---

The registry is the store behind every locator call. This page explains what it stores, when what it stores is final,
and how it keeps it from changing. How to register is on [Registering locators](/POMWright/docs/registering-locators/).

## A record per path

The registry, `LocatorRegistryInternal` in `src/locators/locatorRegistry.ts`, keeps a `Map` from path to record. The
record of

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.list.item@lastOpen">;
// ---cut---
registry
  .add("main.list.item@lastOpen")
  .getByRole("listitem", { name: /Order/ })
  .filter({ hasText: "Open" })
  .nth("last")
  .describe("Last open order");
```

is:

```text
{
  locatorSchemaPath: "main.list.item@lastOpen",
  definition: { type: "role", role: "listitem", options: { name: /Order/ } },
  steps: [
    { kind: "filter", filter: { hasText: "Open" } },
    { kind: "index", index: "last" },
  ],
  description: "Last open order",
}
```

- **The definition** is the strategy and its arguments, one field per argument of the Playwright method; its shape per
  strategy is a row of [the strategy table](/POMWright/internal/strategies-table/).
- **The steps** are kept in the order they were chained, each a `filter` or an `index`, and applied in that order.
- **The description** is stored only when one was set. The default, the path, is not stored: it is applied when the
  chain is resolved, so a copy of the record at another path describes itself.

The record holds no ancestors and no `Locator`: it is data, and every resolution builds a new chain from it.

## When a record is written

A path is registered by its locator method, not by `add(path)`. The registration builder calls `register` when the
locator method runs, and each later `filter`, `nth` or `describe` calls `replace` with the record so far. A
registration that never reaches a locator method registers nothing. `register` checks the path rules and throws for a
path that already has a record, printing the existing and the attempted record, with a Playwright `Locator` shown as
Playwright prints it and a RegExp as its source and flags.

Because the builder writes on every call, the registry decides when a record is final. It keeps the registration the
latest `add` started and ends it at its next call: `add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`,
`verify`, or a resolution. From then on every method of that registration throws (see
[builders](/POMWright/internal/builders/#the-registration)). So every read of the registry sees a final record, and a
registration kept in a variable cannot change its path once anything else has happened. In a page object, the
`verify()` after `defineLocators()` ends the last registration.

## Copies at every boundary

A record never shares an object with code outside the registry:

- **At registration.** The builders copy the options object and each filter object a caller passes, and every value
  in them. The values are strings, numbers, booleans, RegExps and Locators, so nothing lies deeper. A RegExp, in an
  object or as a first argument, is copied with its source and flags, because `RegExp.prototype.compile()` rewrites one
  in place. A Locator is kept: every method of a Locator returns a new one. A later `filter`, `nth` or `describe` on
  the same registration registers again from the builder's own copy of the definition, never from what the caller
  passed.
- **On every read.** `getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify` and the resolution of a `has` path
  read a clone of the record. A query owns its copies and changes only them; every `getLocatorSchema` call starts a new
  set.
- **Seeds.** A seed copies its definition and steps when it is made, returns copies from `definition` and `steps`, and
  each of its methods returns a new seed. Reusing a path or a seed registers a copy of its record.

The helpers are `cloneLocatorStrategyDefinition`, `copyFilter` and `normalizeSteps`, and under them `copyFields` and
`copyValue`, in `src/locators/utils.ts`.

## Why

A registered locator is the contract between a page object and every test that uses it. If a test could change it,
through a query it changed, an options object or a RegExp it kept, or a registration it held, a later test, or a later
line of the same test, would act on a different element than its path names, and the failure would point nowhere near
the change. Copying at the boundary and on every read, and ending a registration before anything reads the registry,
makes that impossible at the cost of a few small objects per call. It also lets a query be a plain mutable object
instead of an immutable structure.

Three alternatives were weighed and rejected:

- **`structuredClone`** throws on a `Locator`, which a filter may hold.
- **Reads without a clone** would let a query's change reach the registry.
- **A terminal `.register()`** to end a registration cannot be required by TypeScript, and a forgotten one would
  register nothing. Ending in a microtask would end nothing inside `defineLocators()`, which is synchronous.
