---
title: Builders
description: "The registration, the seeded builder, the query and its skip flags, the update builder's Mode, and why public types are aliases over internal classes."
---

Everything `add`, `getLocatorSchema`, `update`, `replace` and `createReusable` return is a builder: an object whose
methods record what you chain and return the next step. Builders are synchronous and not thenable: there is nothing
to `await`, as with Playwright's own locator methods.

## The registration

`add(path)` returns a `LocatorRegistrationBuilder` (`src/locators/locatorRegistrationBuilder.ts`) through a narrower
type, so TypeScript offers the right methods at each step:

- before a locator method, only the ten locator methods (`LocatorRegistrationPreDefinitionBuilder`);
- after one, only `filter`, `nth` and `describe`: the locator method returns a small view object with those three,
  whose methods record a step and return the view again.

The builder writes the registry on every call (the first call registers, later ones replace the record), so a
registration is complete whenever the chain stops. From JavaScript, a step before a locator method or a second locator
method throws, naming the path.

With `{ reuse: seed }` the builder starts from the seed's record and registers it at once. Its one optional call of the
seed's own locator method patches the record as `update` does. Another strategy's method throws, and so does a second
call on a registration kept in a variable; a call that throws leaves the record as it was. With
`{ reuse: "other.path" }` it starts from a copy of that record and returns only the view: a copy keeps the locator it
reused.

## The query

`getLocatorSchema(path)` returns a `LocatorQueryBuilderInternal` (`src/locators/locatorQueryBuilder.ts`). It holds
copies of the path's chain: a map of definitions, a map of steps and a map of descriptions by segment, plus the set of
segments `skip` has left out. Its methods change those maps and return the query itself, so a query chains and can be
kept in a variable; `getNestedLocator()` and `getLocator()` hand the maps to the registry's `buildLocatorChain`.

`skip` is a flag in the set, so `unskip` restores a segment exactly as it was. A change to a skipped segment throws
until `unskip`, because a change nobody would see in the resolved chain is more likely a mistake than an intent.

## The update builder

`update(subPath?)` and `replace(subPath?)` return a `LocatorUpdateBuilderInternal`
(`src/locators/locatorUpdateBuilder.ts`) with a type parameter `Mode`, `"update"` or `"replace"`. The same ten methods
take different argument lists per mode: in `replace` mode Playwright's own (the first argument required, Playwright's
option types), in `update` mode the patch shapes (the first argument optional, `null` deleting options). The builder
applies the call to the query through a callback and returns the query: `update` merges into the segment's definition
and requires its strategy, `replace` builds a complete definition of any strategy.

## Public types are aliases

A public builder type is a type alias over the internal class, declared under the public name:
`type LocatorQueryBuilder<…> = LocatorQueryBuilderInternal<…>`. A class re-exported as a type would be written into the
bundled declarations' export list as a value, so a consumer's `new` would compile and then fail at run time, since the
bundle exports nothing by that name. The alias keeps the class internal: hovers and errors show the public name, and the
internal one appears only in the error for a private member. The class's doc comments are the public documentation.
Every public method returns a type a consumer can import, except the registration views, which are used in one statement
and never named.
