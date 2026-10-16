---
title: Registry records
description: "What the registry stores per path, why every boundary copies, and why a registered locator never changes."
---

## A record per path

The registry, `LocatorRegistryInternal` in `src/locators/locatorRegistry.ts`, keeps a `Map` from path to record. A
record holds the path, the locator's definition (its strategy and arguments, such as
`{ type: "role", role: "button", options: { name: "Save" } }`), its steps in order (`filter` and index steps), and a
description when one was set. The default description, the path, is not stored: it is applied when the chain is
resolved.

A path is registered by its locator method, not by `add(path)`: the registration builder calls `register` when the
locator method runs, and each later `filter`, `nth` or `describe` calls `replace` with the record so far. A registration
that never reaches a locator method registers nothing. `register` checks the path rules and throws for a path that
already has a record, printing the existing and the attempted record, with a Playwright `Locator` shown as Playwright
prints it and a RegExp as its source and flags.

## Copies at every boundary

A record never shares an object with code outside the registry:

- **At registration.** The builders copy the options object and each filter object a caller passes, one level deep,
  which is as deep as these objects go: their values are strings, numbers, booleans, RegExps and Locators. A caller
  that changes its object afterwards changes nothing registered.
- **On every read.** `getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify` and the resolution of a `has` path
  read a clone of the record. A query owns its copies and changes only them; every `getLocatorSchema` call starts a new
  set.
- **Seeds.** A seed copies its definition and steps when it is made, returns copies from `definition` and `steps`, and
  each of its methods returns a new seed.

The helpers are `cloneLocatorStrategyDefinition`, `copyFilter` and `normalizeSteps` in `src/locators/utils.ts`.

## Why

A registered locator is the contract between a page object and every test that uses it. If a test could change it,
through a query it changed or an options object it kept, a later test, or a later line of the same test, would act on
a different element than its path names, and the failure would point nowhere near the change. Copying at the boundary
and on every read makes that impossible at the cost of a few small objects per call, and lets a query be a plain
mutable object instead of an immutable structure.
