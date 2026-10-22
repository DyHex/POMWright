---
"pomwright": patch
---

The error for a registration that has ended names the registry call that ended it. When that call was a `getLocator` or
`getNestedLocator` before a `filter`, the message also shows the two ways to write the filter.

A registration ends at the next call on its registry, and JavaScript runs a call's arguments before the call, so a
`getLocator` inside a filter's arguments ends the registration the filter belongs to:

```ts
add("list.item@open").getByRole("listitem").filter({ has: getLocator("badge") });
```

```text
filter() cannot apply to "list.item@open": its registration was ended by getLocator("badge"). If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "badge" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
```

Before, the message said only that the registration had ended and to give it all its steps in its `add(…)` chain,
which is what that line does. Every other ended registration now names its call too, for example
`its registration was ended by add("main.list.item")`. The rule itself is unchanged. *Filters and indices* has a new
section on passing a path, a locator or a chain to `has`.
