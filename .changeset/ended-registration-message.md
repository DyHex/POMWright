---
"pomwright": patch
---

The error for a registration that has ended names the registry call that ended it. When that call may have run in the
arguments of `filter` or the options of `locator`, the two methods that take a `has` locator, the message also shows how
to write it.

A registration ends at the next call on its registry, and JavaScript runs a call's arguments before the call, so a
`getLocator` inside a filter's arguments ends the registration the filter belongs to:

```ts
add("list.item@open").getByRole("listitem").filter({ has: getLocator("badge") });
```

```text
filter() cannot apply to "list.item@open": its registration was ended by getLocator("badge"). If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "badge" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
```

In `locator()`'s options the path goes in a `filter` step, and a query in the arguments (`getLocatorSchema(…)`) gets
the advice to resolve it before `add(…)`, without the path, which would drop the query's changes:

```text
locator() cannot apply to "section@inline": its registration was ended by getLocator("heading@explorer"). If that call is in this locator's options, which run first, resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading@explorer" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
filter() cannot apply to "section@inline": its registration was ended by getLocatorSchema("heading@explorer"). If that query is in this filter's arguments, which run first, resolve it before add(…). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
```

Before, the message said only that the registration had ended and to give it all its steps in its `add(…)` chain,
which is what that line does. Every other ended registration now names its call too, for example
`its registration was ended by add("main.list.item")`. The rule itself is unchanged. *Filters and indices* has a new
section on passing a path, a locator or a chain to `has`.
